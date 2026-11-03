from typing import Any, Dict

from sqlalchemy.orm import Session

from app.schemas.tracking import TrackingEventCreate
from app.services.tracking_service import TrackingService


class TrackingController:
    @staticmethod
    def get_public_demo(db: Session, slug: str) -> Dict[str, Any]:
        return TrackingService.get_public_demo(db, slug)

    @staticmethod
    def track_demo_event(db: Session, payload: TrackingEventCreate) -> Dict[str, Any]:
        return TrackingService.track_demo_event(db, payload)
