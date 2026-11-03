from typing import Optional

from sqlalchemy.orm import Session

from app.models.entities import Lead, Package, TrackingEvent


class TrackingRepository:
    @staticmethod
    def get_package_by_slug(db: Session, slug: str) -> Optional[Package]:
        return db.query(Package).join(Lead, Package.lead_id == Lead.id).filter(Lead.slug == slug).first()

    @staticmethod
    def get_lead_by_slug(db: Session, slug: str) -> Optional[Lead]:
        return db.query(Lead).filter(Lead.slug == slug).first()

    @staticmethod
    def record_event(db: Session, event: TrackingEvent) -> TrackingEvent:
        db.add(event)
        db.flush()
        return event
