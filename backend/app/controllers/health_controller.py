from typing import Any, Dict

from sqlalchemy.orm import Session

from app.services.health_service import HealthService


class HealthController:
    @staticmethod
    def get_health(db: Session) -> Dict[str, Any]:
        return HealthService.get_health_status(db)
