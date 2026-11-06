from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.models.entities import RunLog
from app.services.pipeline_service import PipelineService


class PipelineController:
    @staticmethod
    def list_runs(db: Session, hustle_id: Optional[int] = None) -> List[RunLog]:
        return PipelineService.list_runs(db, hustle_id)

    @staticmethod
    def get_run(db: Session, run_id: int) -> Dict[str, Any]:
        return PipelineService.get_run_by_id(db, run_id)

    @staticmethod
    def cancel_run(run_id: Optional[int] = None) -> Dict[str, Any]:
        return PipelineService.cancel_run(run_id)

    @staticmethod
    def trigger_refill(
        db: Session,
        hustle_id: int = 1,
        batch_size: int = 3,
        testing_mode: bool = False,
        locality: Optional[str] = None,
        async_mode: bool = False,
        stop_after: Optional[str] = None,
    ) -> Dict[str, Any]:
        return PipelineService.trigger_refill(
            db,
            hustle_id,
            batch_size,
            testing_mode=testing_mode,
            locality=locality,
            async_mode=async_mode,
            stop_after=stop_after,
        )

    @staticmethod
    def cleanup_test_data(db: Session, confirmation: str) -> Dict[str, Any]:
        return PipelineService.cleanup_test_data(db, confirmation)

    @staticmethod
    def verify_links(db: Session) -> Dict[str, Any]:
        return PipelineService.verify_links(db)

    @staticmethod
    def get_cockpit_batch(db: Session, hustle_id: int = 1) -> List[Dict[str, Any]]:
        return PipelineService.get_cockpit_batch(db, hustle_id)

    @staticmethod
    def get_cockpit_state(db: Session, hustle_id: int = 1) -> Dict[str, Any]:
        return PipelineService.get_cockpit_state(db, hustle_id)
