from typing import Any, Dict, Optional

from fastapi import APIRouter, Body, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.autopilot.runs.job_manager import JobManager
from app.controllers.pipeline_controller import PipelineController
from app.services.event_bus import emit_terminal_log, is_autopilot_running

router = APIRouter(tags=["Pipeline & Autopilot"])


@router.get("/runs")
def list_runs(
    hustle_id: Optional[int] = Query(None),
    job_type: Optional[str] = Query(None),
    limit: Optional[int] = Query(None, ge=1, le=500),
    offset: Optional[int] = Query(None, ge=0),
    cursor: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    return PipelineController.list_runs(
        db,
        hustle_id=hustle_id,
        job_type=job_type,
        limit=limit,
        offset=offset,
        cursor=cursor,
    )


@router.get("/autopilot/discovery/runs")
def list_discovery_runs(
    hustle_id: Optional[int] = Query(None),
    limit: Optional[int] = Query(None, ge=1, le=500),
    offset: Optional[int] = Query(None, ge=0),
    cursor: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    return PipelineController.list_discovery_runs(
        db=db,
        hustle_id=hustle_id,
        limit=limit,
        offset=offset,
        cursor=cursor,
    )


@router.get("/autopilot/discovery/candidates")
def list_discovery_candidates(
    hustle_id: Optional[int] = Query(None),
    limit: Optional[int] = Query(None, ge=1, le=500),
    offset: Optional[int] = Query(None, ge=0),
    cursor: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    return PipelineController.list_discovery_candidates(
        db=db,
        hustle_id=hustle_id,
        limit=limit,
        offset=offset,
        cursor=cursor,
    )


@router.get("/autopilot/runs/{run_id}")
def get_run_details(run_id: int, db: Session = Depends(get_db)):
    return PipelineController.get_run(db, run_id)


@router.post("/autopilot/runs/{run_id}/cancel")
@router.post("/autopilot/stop")
def cancel_autopilot_run(run_id: Optional[int] = None, db: Session = Depends(get_db)):
    return PipelineController.cancel_run(run_id)


@router.post("/autopilot/discover")
def discover_leads(
    response: Response,
    payload: Optional[Dict[str, Any]] = Body(None),
    hustle_id: Optional[int] = Query(None),
    target_count: Optional[int] = Query(None),
    testing_mode: Optional[bool] = Query(None),
    locality: Optional[str] = Query(None),
    async_mode: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
):
    h_id = 1
    if payload and "hustle_id" in payload:
        h_id = int(payload["hustle_id"])
    elif hustle_id is not None:
        h_id = hustle_id

    t_count = 30
    if payload and "target_count" in payload:
        t_count = int(payload["target_count"])
    elif payload and "batch_size" in payload:
        t_count = int(payload["batch_size"])
    elif target_count is not None:
        t_count = target_count

    t_mode = False
    if payload and "testing_mode" in payload:
        t_mode = bool(payload["testing_mode"])
    elif testing_mode is not None:
        t_mode = testing_mode

    if t_mode:
        t_count = min(t_count, 2) if t_count else 2

    loc = None
    if payload and "locality" in payload:
        loc = str(payload["locality"])
    elif payload and "query" in payload:
        loc = str(payload["query"])
    elif locality is not None:
        loc = locality

    emit_terminal_log("DISCOVERY", f"Starting lead discovery for '{loc or 'Delhi NCR'}' (target: {t_count})", level="info")

    is_async = False
    if payload and "async_mode" in payload:
        is_async = bool(payload["async_mode"])
    elif async_mode is not None:
        is_async = async_mode

    res = PipelineController.discover_leads(
        db=db,
        hustle_id=h_id,
        target_count=t_count,
        locality=loc,
        testing_mode=t_mode,
        async_mode=is_async,
    )
    if is_async:
        response.status_code = status.HTTP_202_ACCEPTED
    return res


@router.post("/autopilot/build-batch")
def build_batch(
    response: Response,
    payload: Optional[Dict[str, Any]] = Body(None),
    hustle_id: Optional[int] = Query(None),
    batch_id: Optional[str] = Query(None),
    batch_size: Optional[int] = Query(None),
    testing_mode: Optional[bool] = Query(None),
    async_mode: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
):
    h_id = 1
    if payload and "hustle_id" in payload:
        h_id = int(payload["hustle_id"])
    elif hustle_id is not None:
        h_id = hustle_id

    b_id = None
    if payload and "batch_id" in payload:
        b_id = str(payload["batch_id"]).strip() or None
    elif batch_id is not None:
        b_id = str(batch_id).strip() or None

    b_size = None
    if payload and "batch_size" in payload and payload["batch_size"] is not None:
        b_size = int(payload["batch_size"])
    elif batch_size is not None:
        b_size = batch_size

    t_mode = False
    if payload and "testing_mode" in payload:
        t_mode = bool(payload["testing_mode"])
    elif testing_mode is not None:
        t_mode = testing_mode

    is_async = False
    if payload and "async_mode" in payload:
        is_async = bool(payload["async_mode"])
    elif async_mode is not None:
        is_async = async_mode

    res = PipelineController.build_batch(
        db=db,
        hustle_id=h_id,
        batch_id=b_id,
        batch_size=b_size,
        testing_mode=t_mode,
        async_mode=is_async,
    )
    if is_async:
        response.status_code = status.HTTP_202_ACCEPTED
    return res


@router.post("/autopilot/trigger-refill")
@router.post("/autopilot/run-refill")
def trigger_autopilot_refill(
    response: Response,
    payload: Optional[Dict[str, Any]] = Body(None),
    hustle_id: Optional[int] = Query(None),
    batch_size: Optional[int] = Query(None),
    testing_mode: Optional[bool] = Query(None),
    locality: Optional[str] = Query(None),
    async_mode: Optional[bool] = Query(None),
    stop_after: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    h_id = 1
    if payload and "hustle_id" in payload:
        h_id = int(payload["hustle_id"])
    elif hustle_id is not None:
        h_id = hustle_id

    b_size = 3
    if payload and "batch_size" in payload:
        b_size = int(payload["batch_size"])
    elif batch_size is not None:
        b_size = batch_size

    t_mode = False
    if payload and "testing_mode" in payload:
        t_mode = bool(payload["testing_mode"])
    elif testing_mode is not None:
        t_mode = testing_mode

    if t_mode:
        b_size = min(b_size, 2) if b_size else 2

    loc = None
    if payload and "locality" in payload:
        loc = str(payload["locality"])
    elif payload and "query" in payload:
        loc = str(payload["query"])
    elif locality is not None:
        loc = locality

    emit_terminal_log("DISCOVERY", f"Starting lead discovery for '{loc or 'Delhi NCR'}' (target: {b_size})", level="info")

    is_async = False
    if payload and "async_mode" in payload:
        is_async = bool(payload["async_mode"])
    elif async_mode is not None:
        is_async = async_mode

    stop = None
    if payload and "stop_after" in payload:
        stop = str(payload["stop_after"])
    elif stop_after is not None:
        stop = stop_after

    res = PipelineController.trigger_refill(
        db,
        h_id,
        b_size,
        testing_mode=t_mode,
        locality=loc,
        async_mode=is_async,
        stop_after=stop,
    )
    if is_async:
        response.status_code = status.HTTP_202_ACCEPTED
    return res


@router.post("/autopilot/test-runs/cleanup")
def cleanup_test_runs(payload: Dict[str, str] = Body(...), db: Session = Depends(get_db)):
    confirm_str = payload.get("confirm", "")
    return PipelineController.cleanup_test_data(db, confirm_str)


@router.post("/autopilot/verify-links")
@router.post("/packages/sync-batch-json")
@router.post("/autopilot/sync-batch-links")
def verify_and_sync_links(db: Session = Depends(get_db)):
    return PipelineController.verify_links(db)


@router.post("/autopilot/retry-recordings")
def retry_failed_or_pending_recordings(
    response: Response,
    payload: Optional[Dict[str, Any]] = Body(None),
    hustle_id: Optional[int] = Query(None),
    batch_id: Optional[str] = Query(None),
    testing_mode: Optional[bool] = Query(None),
    async_mode: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
):
    h_id = 1
    if payload and "hustle_id" in payload:
        h_id = int(payload["hustle_id"])
    elif hustle_id is not None:
        h_id = hustle_id

    b_id = None
    if payload and "batch_id" in payload:
        b_id = str(payload["batch_id"]).strip() or None
    elif batch_id is not None:
        b_id = str(batch_id).strip() or None

    t_mode = False
    if payload and "testing_mode" in payload:
        t_mode = bool(payload["testing_mode"])
    elif testing_mode is not None:
        t_mode = testing_mode

    is_async = False
    if payload and "async_mode" in payload:
        is_async = bool(payload["async_mode"])
    elif async_mode is not None:
        is_async = async_mode

    res = PipelineController.retry_recordings(
        db=db,
        hustle_id=h_id,
        batch_id=b_id,
        testing_mode=t_mode,
        async_mode=is_async,
    )
    if is_async:
        response.status_code = status.HTTP_202_ACCEPTED
    return res


@router.get("/batch")
def get_dispatch_cockpit_batch(
    hustle_id: int = Query(1),
    batch_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Returns the dispatch cockpit payload, optionally filtered to a specific batch."""
    return PipelineController.get_cockpit_batch(db, hustle_id, batch_id=batch_id)


@router.post("/batch/rebalance")
def rebalance_batches(
    hustle_id: int = Query(1),
    force_rebatch: bool = Query(True),
    db: Session = Depends(get_db),
):
    """Re-slice uncontacted leads into batch_size chunks. Use after changing batch_size in settings."""
    from app.agents import ensure_hustle_lead_batches

    result = ensure_hustle_lead_batches(db, hustle_id=hustle_id, force_rebatch=force_rebatch)
    return {"ok": True, **result}


@router.get("/autopilot/cockpit-state")
@router.get("/autopilot/status")
def get_cockpit_state(hustle_id: int = Query(1), db: Session = Depends(get_db)):
    state = PipelineController.get_cockpit_state(db, hustle_id)
    # Unified live-running flag: covers token-based runs, subprocess-only agents, and the flag
    composite_running = bool(
        is_autopilot_running()
        or JobManager.get_active_run_id() is not None
        or JobManager.has_active_processes()
    )
    state["is_running"] = composite_running
    state["active_task"] = JobManager.get_active_task_type()
    return state


@router.get("/cockpit/attention")
def get_cockpit_attention(hustle_id: int = Query(1), db: Session = Depends(get_db)):
    """Surfaces items requiring immediate attention across 4 distinct dashboards in <5s."""
    from app.services.cockpit_service import CockpitService

    return CockpitService.get_attention_dashboards(db, hustle_id=hustle_id)


@router.post("/autopilot/auto-close-unreplied")
def auto_close_unreplied(hustle_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    """Explicitly transition unreplied leads (>7 days) to CLOSED_LOST."""
    from app.services.lead_service import LeadService

    transitioned = LeadService.auto_transition_unreplied_to_closed_lost(db, hustle_id=hustle_id)
    return {"transitioned": len(transitioned), "lead_ids": [lead.id for lead in transitioned]}


