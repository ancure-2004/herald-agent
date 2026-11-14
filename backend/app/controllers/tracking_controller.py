from typing import Any, Dict

from sqlalchemy.orm import Session

from app.schemas.tracking import TrackingEventCreate
from app.services.clinic_package_service import ClinicPackageService
from app.services.tracking_service import TrackingService


class TrackingController:
    @staticmethod
    def get_public_demo(db: Session, slug: str) -> Dict[str, Any]:
        return ClinicPackageService.get_public_demo(db, slug)

    @staticmethod
    def get_public_clinic_package(db: Session, slug: str) -> Dict[str, Any]:
        return ClinicPackageService.get_public_clinic_package(db, slug)

    @staticmethod
    def track_demo_event(db: Session, payload: TrackingEventCreate) -> Dict[str, Any]:
        return TrackingService.track_demo_event(db, payload)
