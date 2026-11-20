"""Job queue routes for inspecting background job status and progress."""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Query

from app.core.exceptions import NotFoundError
from app.services.job_queue import get_job_queue

router = APIRouter(tags=["Jobs"])


@router.get("/jobs/{job_id}")
def get_job_status(job_id: str) -> Dict[str, Any]:
    """Retrieve status, progress, and result of a background job."""
    queue = get_job_queue()
    job = queue.get_job(job_id)
    if not job:
        raise NotFoundError(f"Job '{job_id}' not found")
    return job


@router.get("/jobs")
def list_jobs(
    limit: int = Query(50, ge=1, le=500),
    hustle_id: Optional[int] = Query(None),
) -> List[Dict[str, Any]]:
    """List recent background jobs."""
    queue = get_job_queue()
    return queue.list_jobs(limit=limit, hustle_id=hustle_id)


@router.post("/jobs/{job_id}/cancel")
def cancel_job(job_id: str) -> Dict[str, Any]:
    """Request cancellation of an active or queued background job."""
    queue = get_job_queue()
    success = queue.cancel_job(job_id)
    if not success:
        raise NotFoundError(f"Job '{job_id}' not found")
    return {"job_id": job_id, "status": "cancelled"}
