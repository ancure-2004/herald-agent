import logging
import threading
from typing import Any, Dict, Optional

from fastapi import HTTPException

from app.autopilot.runs.context import CancelToken

logger = logging.getLogger("personal_os.autopilot.job_manager")

_MANAGER_LOCK = threading.Lock()
_ACTIVE_RUN_ID: Optional[int] = None
_ACTIVE_CANCEL_TOKEN: Optional[CancelToken] = None
_RUN_STATUS_REGISTRY: Dict[int, Dict[str, Any]] = {}


class JobManager:
    """Manages single-flight execution, cooperative cancel tokens, and run status queries."""

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
            return _ACTIVE_CANCEL_TOKEN

    @classmethod
    def release_single_flight(cls, run_id: int) -> None:
        global _ACTIVE_RUN_ID, _ACTIVE_CANCEL_TOKEN
        with _MANAGER_LOCK:
            if _ACTIVE_RUN_ID == run_id:
                _ACTIVE_RUN_ID = None
                _ACTIVE_CANCEL_TOKEN = None

    @classmethod
    def get_active_run_id(cls) -> Optional[int]:
        with _MANAGER_LOCK:
            return _ACTIVE_RUN_ID

    @classmethod
    def cancel_active_run(cls, run_id: Optional[int] = None) -> bool:
        with _MANAGER_LOCK:
            if _ACTIVE_RUN_ID is None:
                return False
            if run_id is not None and _ACTIVE_RUN_ID != run_id:
                return False
            if _ACTIVE_CANCEL_TOKEN:
                _ACTIVE_CANCEL_TOKEN.cancel()
                return True
        return False

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
