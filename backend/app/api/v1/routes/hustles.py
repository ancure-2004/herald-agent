from typing import Any, Dict, List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.controllers.hustle_controller import HustleController
from app.schemas.hustle import AvailabilitySetRequest, HustleCreate, HustleOut, HustleUpdate

router = APIRouter(tags=["Hustles"])


@router.get("/hustles", response_model=List[HustleOut])
def list_hustles(db: Session = Depends(get_db)):
    return HustleController.list_hustles(db)


@router.post("/hustles", response_model=HustleOut, status_code=201)
def create_hustle(payload: HustleCreate, db: Session = Depends(get_db)):
    return HustleController.create_hustle(db, payload)


@router.patch("/hustles/{hustle_id}", response_model=HustleOut)
def update_hustle(hustle_id: int, payload: HustleUpdate, db: Session = Depends(get_db)):
    return HustleController.update_hustle(db, hustle_id, payload)


@router.get("/sprint")
def get_evening_sprint(
    hustle_id: int = Query(1),
    budget_minutes: int = Query(75),
    db: Session = Depends(get_db),
):
    return HustleController.get_evening_sprint(db, hustle_id, budget_minutes)


@router.get("/stock-plan")
def get_stock_plan(hustle_id: int = Query(1), db: Session = Depends(get_db)):
    return HustleController.get_stock_plan(db, hustle_id)


@router.post("/availability")
def set_availability(payload: AvailabilitySetRequest, db: Session = Depends(get_db)):
    return HustleController.set_availability(db, payload)


@router.post("/schedule/day-mode")
def set_day_mode(payload: Dict[str, Any], db: Session = Depends(get_db)):
    mode = payload.get("mode", "normal")
    return HustleController.set_day_mode(db, mode)
