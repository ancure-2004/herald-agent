from typing import Any, Dict, List, Tuple

from app.autopilot.recording.link_verifier import sync_verified_links_to_batch_json
from app.autopilot.recording.walkthrough import record_walkthrough_batch
from app.autopilot.runs.context import RunContext
from app.models.entities import Lead
from app.services.event_bus import emit_pipeline_step


def stage_recording(
    ctx: RunContext,
    created_leads: List[Lead],
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    if not created_leads:
        ctx.emit("Step 5/7 [WALKTHROUGH RECORDINGS]: No new leads created to record. Skipping.")
        emit_pipeline_step(
            node_id="node-5",
            step_name="WALKTHROUGH",
            status="SUCCESS",
            clinic_name="0 Walkthroughs (No new leads)",
            metrics={"processed": 0, "total": 0, "badge_text": "Skipped"},
            payload=[],
        )
        return {"verified_count": 0}, {"recorded_count": 0, "items": []}

    ctx.emit("Step 5/7 [WALKTHROUGH RECORDINGS]: Syncing batch.json and recording walkthroughs...")
    emit_pipeline_step(
        node_id="node-5",
        step_name="WALKTHROUGH",
        status="RUNNING",
        clinic_name="Preparing batch.json & recorder...",
        metrics={"processed": 0, "total": len(created_leads), "badge_text": "Verifying & Recording"},
    )
    new_lead_ids = [l.id for l in created_leads]
    sync_report = sync_verified_links_to_batch_json(
        db=ctx.db,
        base_url=ctx.options.base_url,
        log_cb=ctx.emit,
        only_lead_ids=new_lead_ids,
        cancel_check=ctx.check_cancelled,
    )
    recording_report = record_walkthrough_batch(
        db=ctx.db,
        leads=created_leads,
        base_url=ctx.options.base_url,
        log_cb=ctx.emit,
        testing_mode=ctx.options.testing_mode,
    )
    ctx.emit(
        f"Walkthrough recordings complete: {recording_report['recorded_count']}/{len(created_leads)} recordings verified."
    )
    emit_pipeline_step(
        node_id="node-5",
        step_name="WALKTHROUGH",
        status="SUCCESS",
        clinic_name=f"{recording_report['recorded_count']} Walkthroughs Ready",
        metrics={
            "processed": recording_report["recorded_count"],
            "total": len(created_leads),
            "badge_text": f"✓ {recording_report['recorded_count']} Recorded",
        },
        payload=recording_report["items"][:15],
    )
    return sync_report, recording_report
