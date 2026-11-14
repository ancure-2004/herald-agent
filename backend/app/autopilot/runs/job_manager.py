import logging
import subprocess
import threading
from typing import Any, Dict, Optional

from fastapi import HTTPException

from app.autopilot.runs.context import CancelToken

logger = logging.getLogger("personal_os.autopilot.job_manager")

_MANAGER_LOCK = threading.Lock()
_ACTIVE_RUN_ID: Optional[int] = None
_ACTIVE_CANCEL_TOKEN: Optional[CancelToken] = None
_RUN_STATUS_REGISTRY: Dict[int, Dict[str, Any]] = {}

# Subprocess & task-type tracking (class-level, protected by _MANAGER_LOCK)
_ACTIVE_PROCS: Dict[str, subprocess.Popen] = {}
_ACTIVE_TASK_TYPE: Optional[str] = None


class JobManager:
    """Manages single-flight execution, cooperative cancel tokens, subprocess tracking, and run status queries."""

    # ------------------------------------------------------------------
    # Single-flight helpers (unchanged)
    # ------------------------------------------------------------------

    @classmethod
    def acquire_single_flight(cls, prospective_run_id: int) -> CancelToken:
        global _ACTIVE_RUN_ID, _ACTIVE_CANCEL_TOKEN
        with _MANAGER_LOCK:
            if _ACTIVE_RUN_ID is not None:
                raise HTTPException(
                    status_code=409,
                    detail=f"Run #{_ACTIVE_RUN_ID} already in progress",
                )
            _ACTIVE_RUN_ID = prospective_run_id
            _ACTIVE_CANCEL_TOKEN = CancelToken()
            cls._ACTIVE_CANCEL_TOKEN = _ACTIVE_CANCEL_TOKEN
            return _ACTIVE_CANCEL_TOKEN

    @classmethod
    def release_single_flight(cls, run_id: int) -> None:
        global _ACTIVE_RUN_ID, _ACTIVE_CANCEL_TOKEN
        with _MANAGER_LOCK:
            if _ACTIVE_RUN_ID == run_id:
                _ACTIVE_RUN_ID = None
                _ACTIVE_CANCEL_TOKEN = None
                if hasattr(cls, "_ACTIVE_CANCEL_TOKEN"):
                    delattr(cls, "_ACTIVE_CANCEL_TOKEN")

    @classmethod
    def get_active_cancel_token(cls) -> Optional[CancelToken]:
        with _MANAGER_LOCK:
            return getattr(cls, "_ACTIVE_CANCEL_TOKEN", None) or _ACTIVE_CANCEL_TOKEN

    @classmethod
    def get_active_run_id(cls) -> Optional[int]:
        with _MANAGER_LOCK:
            return _ACTIVE_RUN_ID

    # ------------------------------------------------------------------
    # Subprocess registration
    # ------------------------------------------------------------------

    @classmethod
    def register_process(cls, key: str, proc: "subprocess.Popen[str]", task_type: str = "agent") -> None:
        """Register a live child subprocess so cancel_active_run can terminate it."""
        global _ACTIVE_PROCS, _ACTIVE_TASK_TYPE
        with _MANAGER_LOCK:
            _ACTIVE_PROCS[key] = proc
            _ACTIVE_TASK_TYPE = task_type
            logger.debug("[JobManager] Registered process key=%s task_type=%s pid=%s", key, task_type, proc.pid)

    @classmethod
    def unregister_process(cls, key: str) -> None:
        """Remove a process from tracking (call in finally blocks)."""
        global _ACTIVE_PROCS, _ACTIVE_TASK_TYPE
        with _MANAGER_LOCK:
            _ACTIVE_PROCS.pop(key, None)
            if not _ACTIVE_PROCS:
                _ACTIVE_TASK_TYPE = None
            logger.debug("[JobManager] Unregistered process key=%s", key)

    @classmethod
    def has_active_processes(cls) -> bool:
        """Return True if any child subprocesses are currently registered."""
        with _MANAGER_LOCK:
            return bool(_ACTIVE_PROCS)

    @classmethod
    def get_active_task_type(cls) -> Optional[str]:
        """Return the task-type string of the currently running agent, or None."""
        with _MANAGER_LOCK:
            return _ACTIVE_TASK_TYPE

    # ------------------------------------------------------------------
    # Cancellation (now also kills subprocesses)
    # ------------------------------------------------------------------

    @classmethod
    def cancel_active_run(cls, run_id: Optional[int] = None) -> bool:
        """
        Cancel the active run:
        1. Signal the cooperative CancelToken (if any).
        2. Terminate / kill every registered subprocess.
        3. Broadcast an SSE autopilot_stopped event.
        4. Reset the autopilot-running flag.

        Returns True if anything was actually stopped.
        """
        # Import here to avoid circular imports at module load time
        from app.services.event_bus import broadcast_sse, set_autopilot_running  # noqa: PLC0415

        stopped_something = False

        with _MANAGER_LOCK:
            # --- cancel cooperative token ---
            if _ACTIVE_CANCEL_TOKEN:
                _ACTIVE_CANCEL_TOKEN.cancel()
                stopped_something = True
                logger.info("[JobManager] CancelToken signalled for run_id=%s", run_id)

            # --- kill subprocesses ---
            global _ACTIVE_PROCS, _ACTIVE_TASK_TYPE
            for key, proc in list(_ACTIVE_PROCS.items()):
                try:
                    if proc.poll() is None:          # still running
                        proc.terminate()
                        try:
                            proc.wait(timeout=5)
                        except Exception:
                            proc.kill()              # SIGKILL fallback
                        stopped_something = True
                        logger.info("[JobManager] Terminated subprocess key=%s pid=%s", key, proc.pid)
                except Exception as exc:
                    logger.warning("[JobManager] Could not terminate proc key=%s: %s", key, exc)
            _ACTIVE_PROCS.clear()
            _ACTIVE_TASK_TYPE = None

        # Reset the shared autopilot-running flag and broadcast SSE outside the lock
        set_autopilot_running(False, None)
        broadcast_sse("autopilot_stopped", {"run_id": run_id, "status": "stopped"})

        if not stopped_something:
            logger.debug("[JobManager] cancel_active_run called but nothing was running (run_id=%s)", run_id)

        return stopped_something

    # ------------------------------------------------------------------
    # Run-status registry
    # ------------------------------------------------------------------

    @classmethod
    def update_run_progress(cls, run_id: int, info: Dict[str, Any]) -> None:
        with _MANAGER_LOCK:
            if run_id not in _RUN_STATUS_REGISTRY:
                _RUN_STATUS_REGISTRY[run_id] = {}
            _RUN_STATUS_REGISTRY[run_id].update(info)

    @classmethod
    def get_run_status(cls, run_id: int) -> Optional[Dict[str, Any]]:
        with _MANAGER_LOCK:
            return _RUN_STATUS_REGISTRY.get(run_id)
