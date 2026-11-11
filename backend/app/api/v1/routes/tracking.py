import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.controllers.tracking_controller import TrackingController
from app.models.entities import Lead, Package
from app.schemas.tracking import TrackingEventCreate

router = APIRouter(tags=["Tracking & Public Demo"])


@router.get("/public/demo/{slug}")
def get_public_demo_package(slug: str, db: Session = Depends(get_db)):
    return TrackingController.get_public_demo(db, slug)


@router.get("/public/clinic/{slug}")
def get_public_clinic_package(slug: str, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.slug == slug).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Clinic package not found")

    pkg = (
        db.query(Package)
        .filter(Package.lead_id == lead.id)
        .order_by(Package.id.desc())
        .first()
    )
    if not pkg:
        raise HTTPException(status_code=404, detail="Clinic package not found")

    return {
        "lead_id": lead.id,
        "slug": lead.slug,
        "name": lead.name,
        "doctor_name": lead.doctor_name,
        "primary_phone": lead.primary_phone,
        "package_id": pkg.id,
        "clinic_payload": json.loads(pkg.clinic_payload) if isinstance(pkg.clinic_payload, str) else pkg.clinic_payload,
        "status": pkg.status,
        "expires_at": pkg.expires_at.isoformat() if getattr(pkg, "expires_at", None) else None,
    }


@router.post("/public/track")
@router.post("/tracking/event")
def track_demo_event(payload: TrackingEventCreate, db: Session = Depends(get_db)):
    return TrackingController.track_demo_event(db, payload)
