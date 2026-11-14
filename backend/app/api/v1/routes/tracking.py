from typing import Any, Dict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.controllers.tracking_controller import TrackingController
from app.schemas.tracking import TrackingEventCreate

router = APIRouter(tags=["Tracking & Public Demo"])


@router.get("/public/demo/{slug}")
def get_public_demo_package(slug: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    return TrackingController.get_public_demo(db, slug)


@router.get("/public/clinic/{slug}")
def get_public_clinic_package(slug: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    return TrackingController.get_public_clinic_package(db, slug)


@router.post("/public/track")
@router.post("/tracking/event")
def track_demo_event(payload: TrackingEventCreate, db: Session = Depends(get_db)) -> Dict[str, Any]:
    return TrackingController.track_demo_event(db, payload)
