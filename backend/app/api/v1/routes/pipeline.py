from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.controllers.pipeline_controller import PipelineController

router = APIRouter(tags=["Pipeline & Autopilot"])


@router.get("/runs")
def list_runs(hustle_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    return PipelineController.list_runs(db, hustle_id)


@router.post("/autopilot/trigger-refill")
@router.post("/autopilot/run-refill")
def trigger_autopilot_refill(
    hustle_id: int = Query(1),
    batch_size: int = Query(3),
    db: Session = Depends(get_db),
):
    return PipelineController.trigger_refill(db, hustle_id, batch_size)


@router.post("/autopilot/verify-links")
@router.post("/packages/sync-batch-json")
@router.post("/autopilot/sync-batch-links")
def verify_and_sync_links(db: Session = Depends(get_db)):
    return PipelineController.verify_links(db)


@router.get("/batch")
def get_dispatch_cockpit_batch(hustle_id: int = Query(1), db: Session = Depends(get_db)):
    return PipelineController.get_cockpit_batch(db, hustle_id)
