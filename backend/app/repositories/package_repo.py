from typing import Optional
from sqlalchemy.orm import Session, joinedload
from app.models.entities import Package

class PackageRepository:
    @staticmethod
    def get_latest_by_lead_id(db: Session, lead_id: int) -> Optional[Package]:
        return (
            db.query(Package)
            .filter(Package.lead_id == lead_id)
            .order_by(Package.id.desc())
            .first()
        )
