from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.models.entities import RunLog
from app.services.pipeline_service import PipelineService


class PipelineController:
    @staticmethod
    def list_runs(db: Session, hustle_id: Optional[int] = None) -> List[RunLog]:
        return PipelineService.list_runs(db, hustle_id)

    @staticmethod
    def trigger_refill(db: Session, hustle_id: int = 1, batch_size: int = 3) -> Dict[str, Any]:
        return PipelineService.trigger_refill(db, hustle_id, batch_size)

    @staticmethod
    def verify_links(db: Session) -> Dict[str, Any]:
        return PipelineService.verify_links(db)

    @staticmethod
    def get_cockpit_batch(db: Session, hustle_id: int = 1) -> List[Dict[str, Any]]:
        return PipelineService.get_cockpit_batch(db, hustle_id)
