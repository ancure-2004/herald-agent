from datetime import datetime, timezone
from typing import Any, Dict

from sqlalchemy.orm import Session

from app.repositories.hustle_repo import HustleRepository
from app.repositories.lead_repo import LeadRepository


class HealthService:
    @staticmethod
    def get_health_status(db: Session) -> Dict[str, Any]:
        hustles = HustleRepository.list_all(db)
        active_leads = LeadRepository.count_active(db)
        return {
            "status": "ok",
            "hustles": len(hustles),
            "active_leads": active_leads,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
