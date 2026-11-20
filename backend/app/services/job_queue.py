"""Lightweight asynchronous background job queue.

Provides non-blocking submission, tracking, cancellation, and SSE progress
broadcasting for heavy long-running operations (e.g. demo builds, lead
discovery, video recordings).
"""

import asyncio
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import inspect
import logging
import threading
from typing import Any, Callable, Dict, List, Optional
import uuid

from app.db.session import SessionLocal
from app.models.entities import Job
from app.services.sse_publisher import EventPublisher

logger = logging.getLogger("personal_os.job_queue")


class JobQueue:
    """Thread-safe background job queue manager."""

    _instance: Optional["JobQueue"] = None
    _singleton_lock = threading.Lock()

    def __init__(self, max_workers: int = 4) -> None:
        self._lock = threading.Lock()
        self._jobs: Dict[str, Dict[str, Any]] = {}
        self._db_id_map: Dict[int, str] = {}
        self._cancel_flags: Dict[str, bool] = {}
        self._executor = ThreadPoolExecutor(
            max_workers=max_workers,
            thread_name_prefix="JobQueueWorker",
        )

    @classmethod
    def get_instance(cls) -> "JobQueue":
        with cls._singleton_lock:
            if cls._instance is None:
                cls._instance = cls()
            return cls._instance

    def submit_job(
        self,
        job_type: str,
        func: Callable[..., Any],
        *args: Any,
        hustle_id: Optional[int] = None,
        input_payload: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        """Submit a background job for asynchronous execution."""
        job_id = f"job_{uuid.uuid4().hex[:12]}"
        created_at_dt = datetime.now(timezone.utc)
        created_at_iso = created_at_dt.isoformat()

        db_job_id: Optional[int] = None
        try:
            with SessionLocal() as db:
                db_job = Job(
                    hustle_id=hustle_id,
                    job_type=job_type,
                    input_payload=input_payload or {},
                    status="queued",
                    attempts=0,
                    created_at=created_at_dt,
                )
                db.add(db_job)
                db.commit()
                db.refresh(db_job)
                db_job_id = db_job.id
        except Exception as e:
            logger.debug("Job %s could not be saved to DB: %s", job_id, e)

        job_record: Dict[str, Any] = {
            "job_id": job_id,
            "db_id": db_job_id,
            "hustle_id": hustle_id,
            "job_type": job_type,
            "status": "queued",
            "progress": 0,
            "message": f"Job {job_type} queued",
            "result": None,
            "error": None,
            "created_at": created_at_iso,
            "started_at": None,
            "completed_at": None,
            "metadata": metadata or {},
        }

        with self._lock:
            self._jobs[job_id] = job_record
            self._cancel_flags[job_id] = False
            if db_job_id is not None:
                self._db_id_map[db_job_id] = job_id

        # Publish initial SSE queued event
        EventPublisher.publish_job_progress(
            job_id=job_id,
            status="queued",
            progress=0,
            message=job_record["message"],
            job_type=job_type,
            hustle_id=hustle_id,
        )

        def _worker_wrapper() -> None:
            with self._lock:
                if self._cancel_flags.get(job_id, False):
                    job_record["status"] = "cancelled"
                    job_record["message"] = "Job cancelled before starting"
                    job_record["completed_at"] = datetime.now(timezone.utc).isoformat()
                    return

                job_record["status"] = "running"
                job_record["progress"] = 10
                job_record["started_at"] = datetime.now(timezone.utc).isoformat()
                job_record["message"] = f"Job {job_type} started"

            self._update_db_status(db_job_id, "running")
            EventPublisher.publish_job_progress(
                job_id=job_id,
                status="running",
                progress=10,
                message=job_record["message"],
                job_type=job_type,
                hustle_id=hustle_id,
            )

            try:
                if inspect.iscoroutinefunction(func):
                    result = asyncio.run(func(*args, **kwargs))
                else:
                    result = func(*args, **kwargs)

                with self._lock:
                    if self._cancel_flags.get(job_id, False):
                        job_record["status"] = "cancelled"
                        job_record["message"] = "Job was cancelled during execution"
                        job_record["completed_at"] = datetime.now(timezone.utc).isoformat()
                        self._update_db_status(db_job_id, "cancelled")
                        EventPublisher.publish_job_progress(
                            job_id=job_id,
                            status="cancelled",
                            progress=job_record.get("progress", 0),
                            message=job_record["message"],
                            job_type=job_type,
                            hustle_id=hustle_id,
                        )
                        return

                    job_record["status"] = "completed"
                    job_record["progress"] = 100
                    job_record["message"] = "Job completed successfully"
                    job_record["completed_at"] = datetime.now(timezone.utc).isoformat()
                    job_record["result"] = (
                        result
                        if isinstance(result, (dict, list, str, int, float, bool)) or result is None
                        else str(result)
                    )

                self._update_db_status(
                    db_job_id,
                    "completed",
                    completed_at=datetime.now(timezone.utc),
                )
                EventPublisher.publish_job_progress(
                    job_id=job_id,
                    status="completed",
                    progress=100,
                    message="Job completed successfully",
                    job_type=job_type,
                    hustle_id=hustle_id,
                    result=job_record["result"],
                )
            except Exception as ex:
                logger.exception("Error executing background job %s: %s", job_id, ex)
                err_str = str(ex)
                with self._lock:
                    job_record["status"] = "failed"
                    job_record["error"] = err_str
                    job_record["message"] = f"Job failed: {err_str}"
                    job_record["completed_at"] = datetime.now(timezone.utc).isoformat()

                self._update_db_status(
                    db_job_id,
                    "failed",
                    error_message=err_str,
                    completed_at=datetime.now(timezone.utc),
                )
                EventPublisher.publish_job_progress(
                    job_id=job_id,
                    status="failed",
                    progress=job_record.get("progress", 0),
                    message=f"Job failed: {err_str}",
                    error=err_str,
                    job_type=job_type,
                    hustle_id=hustle_id,
                )

        self._executor.submit(_worker_wrapper)

        return {
            "job_id": job_id,
            "status": "queued",
            "job_type": job_type,
            "created_at": created_at_iso,
        }

    def update_progress(self, job_id: str, progress: int, message: str = "", **extra: Any) -> None:
        """Update progress percentage and message for an active job."""
        with self._lock:
            if job_id not in self._jobs:
                return
            rec = self._jobs[job_id]
            rec["progress"] = max(0, min(100, progress))
            if message:
                rec["message"] = message

        EventPublisher.publish_job_progress(
            job_id=job_id,
            status=rec["status"],
            progress=rec["progress"],
            message=rec["message"],
            job_type=rec.get("job_type", "unknown"),
            **extra,
        )

    def cancel_job(self, job_id: str) -> bool:
        """Mark a job as cancelled."""
        with self._lock:
            if job_id not in self._jobs:
                return False
            self._cancel_flags[job_id] = True
            rec = self._jobs[job_id]
            if rec["status"] == "queued":
                rec["status"] = "cancelled"
                rec["message"] = "Job cancelled by request"
                rec["completed_at"] = datetime.now(timezone.utc).isoformat()
                self._update_db_status(rec.get("db_id"), "cancelled")
                EventPublisher.publish_job_progress(
                    job_id=job_id,
                    status="cancelled",
                    progress=rec["progress"],
                    message=rec["message"],
                    job_type=rec.get("job_type", "unknown"),
                )
            return True

    def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve the status and metadata for a job by job_id or DB id."""
        with self._lock:
            if job_id in self._jobs:
                return dict(self._jobs[job_id])

            # Check if job_id maps to a db_id
            if job_id.isdigit():
                db_id_int = int(job_id)
                if db_id_int in self._db_id_map:
                    mapped_job_id = self._db_id_map[db_id_int]
                    if mapped_job_id in self._jobs:
                        return dict(self._jobs[mapped_job_id])

        # Fallback to DB query
        try:
            with SessionLocal() as db:
                db_row: Optional[Job] = None
                if job_id.isdigit():
                    db_row = db.query(Job).filter(Job.id == int(job_id)).first()
                if db_row is not None:
                    return {
                        "job_id": str(db_row.id),
                        "db_id": db_row.id,
                        "hustle_id": db_row.hustle_id,
                        "job_type": db_row.job_type,
                        "status": db_row.status,
                        "progress": 100 if db_row.status == "completed" else (0 if db_row.status == "queued" else 50),
                        "message": db_row.error_message if db_row.status == "failed" else f"Job {db_row.status}",
                        "result": None,
                        "error": db_row.error_message or None,
                        "created_at": db_row.created_at.isoformat() if db_row.created_at else None,
                        "completed_at": db_row.completed_at.isoformat() if db_row.completed_at else None,
                        "input_payload": db_row.input_payload,
                    }
        except Exception as e:
            logger.debug("Error looking up DB job for %s: %s", job_id, e)

        return None

    def list_jobs(self, limit: int = 50, hustle_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """List recently submitted jobs."""
        with self._lock:
            all_jobs = list(self._jobs.values())

        if hustle_id is not None:
            all_jobs = [j for j in all_jobs if j.get("hustle_id") == hustle_id]

        all_jobs.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return [dict(j) for j in all_jobs[:limit]]

    def _update_db_status(
        self,
        db_job_id: Optional[int],
        status: str,
        error_message: Optional[str] = None,
        completed_at: Optional[datetime] = None,
    ) -> None:
        if db_job_id is None:
            return
        try:
            with SessionLocal() as db:
                row = db.query(Job).filter(Job.id == db_job_id).first()
                if row:
                    row.status = status
                    if error_message is not None:
                        row.error_message = error_message
                    if completed_at is not None:
                        row.completed_at = completed_at
                    db.commit()
        except Exception as e:
            logger.debug("Failed updating DB job %s: %s", db_job_id, e)


def get_job_queue() -> JobQueue:
    """Return the global JobQueue singleton instance."""
    return JobQueue.get_instance()
