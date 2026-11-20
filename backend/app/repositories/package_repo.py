from typing import Dict, List, Optional
from sqlalchemy.orm import Session
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

    @staticmethod
    def get_latest_by_lead_ids(db: Session, lead_ids: List[int]) -> Dict[int, Package]:
        """Batched IN (...) query returning {lead_id: latest_package} mapped into O(1) lookup dictionary."""
        if not lead_ids:
            return {}
        packages = (
            db.query(Package)
            .filter(Package.lead_id.in_(lead_ids))
            .order_by(Package.id.desc())
            .all()
        )
        res: Dict[int, Package] = {}
        for p in packages:
            if p.lead_id not in res:
                res[p.lead_id] = p
        return res
