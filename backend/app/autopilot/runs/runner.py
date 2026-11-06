import logging
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.autopilot.discovery.localities import resolve_locality
from app.autopilot.quota import QuotaGuard
from app.autopilot.runs.context import RunContext
from app.autopilot.runs.job_manager import JobManager
from app.autopilot.runs.stages import (
    stage_build,
    stage_discovery,
    stage_recording,
    stage_research,
    stage_verification,
)
from app.autopilot.search.ddgs_provider import DDGSSearchProvider
from app.autopilot.settings import get_autopilot_settings
from app.autopilot.types import RunOptions
from app.models.entities import Hustle, Lead, RunLog, Stage
from app.services.event_bus import emit_pipeline_step, set_autopilot_running

logger = logging.getLogger("personal_os.autopilot.runner")


def ensure_lead_schema(db: Session) -> None:
    """Idempotently ensures is_test and test_run_id columns exist on the leads table."""
    for col_def in ("is_test BOOLEAN DEFAULT 0", "test_run_id INTEGER"):
        try:
            db.execute(text(f"ALTER TABLE leads ADD COLUMN {col_def}"))
            db.commit()
        except Exception:
            db.rollback()


def execute_autopilot_run(
    db: Session,
    options: RunOptions,
    hustle: Hustle,
    log_cb: Optional[Callable[[str], None]] = None,
) -> Dict[str, Any]:
    """Thin master coordinator executing Autopilot stages with lifecycle and single-flight guards."""
    settings = get_autopilot_settings()
    ensure_lead_schema(db)
    QuotaGuard.ensure_schema(db)

    # 1. Clamp target in testing mode
    if options.testing_mode and options.target_count > settings.test_mode_max_target:
        msg = f"[TEST] Clamping target_count from {options.target_count} to {settings.test_mode_max_target}"
        if log_cb:
            log_cb(msg)
        options.target_count = settings.test_mode_max_target

    # 2. Create RunLog at START with status 'running'
    run_log = RunLog(
        hustle_id=hustle.id,
        job_type="autopilot_discovery_and_link_check",
        status="running",
        count_found=0,
        count_passed=0,
        count_dropped=0,
        drop_reasons={},
        errors=[],
        trace_logs=[],
        started_at=datetime.now(timezone.utc),
    )
    db.add(run_log)
    db.commit()
    db.refresh(run_log)

    # 3. Single flight lock
    cancel_token = JobManager.acquire_single_flight(run_log.id)
    ctx = RunContext(options=options, db=db, log_cb=log_cb, cancel_token=cancel_token, run_id=run_log.id)
    set_autopilot_running(True, run_id=run_log.id)

    status_str = "succeeded"
    found_count = 0
    passed_count = 0
    drop_counts: Dict[str, int] = {}
    dropped_items: List[Dict[str, Any]] = []
    built_leads_summary: List[Dict[str, Any]] = []
    sync_report: Dict[str, Any] = {"verified_count": 0}
    recording_report: Dict[str, Any] = {"recorded_count": 0, "items": []}

    try:
        locality = resolve_locality(options.locality)
        query = hustle.search_query or f"dental clinic in {locality.city}"

        # Stage 1: Discovery
        candidates = stage_discovery(ctx, locality, query)
        found_count = len(candidates)
        if options.stop_after == "discovery" or ctx.check_cancelled():
            status_str = "cancelled" if ctx.check_cancelled() else "succeeded"
            return _finalize_run(db, run_log, ctx, status_str, found_count, 0, {}, [], [], {}, {})

        # Stage 2: Verification
        search_prov = DDGSSearchProvider()
        verified, drop_counts, dropped_items = stage_verification(ctx, candidates, locality, search_prov)
        if options.stop_after == "verification" or ctx.check_cancelled():
            status_str = "cancelled" if ctx.check_cancelled() else "succeeded"
            return _finalize_run(
                db, run_log, ctx, status_str, found_count, len(verified), drop_counts, dropped_items, [], {}, {}
            )

        # Stage 3: Deep Research
        researched = stage_research(ctx, verified)
        if options.stop_after == "research" or ctx.check_cancelled():
            status_str = "cancelled" if ctx.check_cancelled() else "succeeded"
            return _finalize_run(
                db, run_log, ctx, status_str, found_count, len(researched), drop_counts, dropped_items, [], {}, {}
            )

        # Stage 4: Next.js Build
        created_leads, built_leads_summary, b_drops, b_dropped = stage_build(ctx, researched, locality, set())
        drop_counts.update(b_drops)
        dropped_items.extend(b_dropped)
        passed_count = len(created_leads)
        if options.stop_after == "build" or ctx.check_cancelled():
            status_str = "cancelled" if ctx.check_cancelled() else "succeeded"
            return _finalize_run(
                db,
                run_log,
                ctx,
                status_str,
                found_count,
                passed_count,
                drop_counts,
                dropped_items,
                built_leads_summary,
                {},
                {},
            )

        # Stage 5: Walkthrough Recordings
        sync_report, recording_report = stage_recording(ctx, created_leads)

        # Stage 6: Review Tray Buffer
        pkg_stage = db.query(Stage).filter(Stage.hustle_id == hustle.id, Stage.slug == "package_ready").first()
        total_tray = db.query(Lead).filter(Lead.stage_id == (pkg_stage.id if pkg_stage else 2)).count()
        emit_pipeline_step(
            node_id="node-6",
            step_name="REVIEW_TRAY",
            status="WAITING_FOR_REVIEW",
            clinic_name="Review Tray Ready",
            metrics={"processed": total_tray, "total": total_tray, "badge_text": f"{total_tray} in Buffer"},
            payload=[
                {"lead_id": l["id"], "clinic_name": l["name"], "phone": l.get("phone")} for l in built_leads_summary
            ],
        )

    except Exception as e:
        status_str = "failed"
        ctx.errors.append(str(e))
        ctx.emit(f"[FAIL] Pipeline error: {e}")
        emit_pipeline_step(
            node_id="node-6",
            step_name="PIPELINE_ERROR",
            status="FAILED",
            clinic_name="Pipeline Error",
            error={"hasError": True, "message": str(e), "exceptionName": type(e).__name__},
        )
        raise
    finally:
        set_autopilot_running(False, run_id=run_log.id)
        JobManager.release_single_flight(run_log.id)
        _finalize_run(
            db,
            run_log,
            ctx,
            status_str,
            found_count,
            passed_count,
            drop_counts,
            dropped_items,
            built_leads_summary,
            sync_report,
            recording_report,
        )

    return {
        "run_id": run_log.id,
        "found": found_count,
        "passed": passed_count,
        "dropped": drop_counts,
        "structured": (run_log.drop_reasons or {}).get("_structured", {}),
        "batch_sync": sync_report,
        "recording_report": recording_report,
        "trace_logs": ctx.trace_logs,
    }


def _finalize_run(
    db: Session,
    run_log: RunLog,
    ctx: RunContext,
    status: str,
    found: int,
    passed: int,
    drop_counts: Dict[str, int],
    dropped_items: List[Dict[str, Any]],
    built_leads: List[Dict[str, Any]],
    sync_report: Dict[str, Any],
    recording_report: Dict[str, Any],
) -> Dict[str, Any]:
    run_log.status = status
    run_log.count_found = found
    run_log.count_passed = passed
    run_log.count_dropped = sum(drop_counts.values())
    run_log.errors = ctx.errors
    run_log.trace_logs = ctx.trace_logs
    run_log.finished_at = datetime.now(timezone.utc)
    run_log.drop_reasons = {
        **drop_counts,
        "_structured": {
            "target_count": ctx.options.target_count,
            "viewport": "1080x1920 (Mobile)",
            "built_leads": built_leads,
            "dropped_items": dropped_items[:25],
            "drop_counts": drop_counts,
            "verified_in_batch_json": sync_report.get("verified_count", 0),
            "provenance": {k: v.__dict__ for k, v in ctx.provenance.items()},
        },
    }
    db.commit()
    JobManager.update_run_progress(
        run_log.id,
        {
            "status": status,
            "found": found,
            "passed": passed,
            "trace_logs": ctx.trace_logs[-100:],
        },
    )
    return {
        "run_id": run_log.id,
        "found": found,
        "passed": passed,
        "status": status,
        "dropped": drop_counts,
        "batch_sync": sync_report,
        "recording_report": recording_report,
        "trace_logs": ctx.trace_logs,
    }
