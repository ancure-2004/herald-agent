from typing import Any, Dict, List

from sqlalchemy.orm import Session

from app.models.entities import Hustle
from app.schemas.hustle import AvailabilitySetRequest, HustleCreate, HustleUpdate
from app.services.hustle_service import HustleService


class HustleController:
    @staticmethod
    def list_hustles(db: Session) -> List[Hustle]:
        return HustleService.list_hustles(db)

    @staticmethod
    def create_hustle(db: Session, payload: HustleCreate) -> Hustle:
        return HustleService.create_hustle(db, payload)

    @staticmethod
    def update_hustle(db: Session, hustle_id: int, payload: HustleUpdate) -> Hustle:
        return HustleService.update_hustle(db, hustle_id, payload)

    @staticmethod
    def get_evening_sprint(db: Session, hustle_id: int = 1, budget_minutes: int = 75) -> Dict[str, Any]:
        return HustleService.get_evening_sprint(db, hustle_id, budget_minutes)

    @staticmethod
    def get_stock_plan(db: Session, hustle_id: int = 1) -> Dict[str, Any]:
        return HustleService.get_stock_plan(db, hustle_id)

    @staticmethod
    def set_availability(db: Session, payload: AvailabilitySetRequest) -> Dict[str, Any]:
        return HustleService.set_availability(db, payload)

    @staticmethod
    def set_day_mode(db: Session, mode: str) -> Dict[str, Any]:
        return HustleService.set_day_mode(db, mode)
