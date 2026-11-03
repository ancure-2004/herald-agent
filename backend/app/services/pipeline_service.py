import os
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.agents import build_cockpit_batch_payload
from app.autopilot import run_live_autopilot_discovery, sync_verified_links_to_batch_json
from app.core.exceptions import NotFoundError
from app.models.entities import RunLog
from app.repositories.hustle_repo import HustleRepository
from app.services.event_bus import broadcast_sse, emit_terminal_log


class PipelineService:
    @staticmethod
    def list_runs(db: Session, hustle_id: Optional[int] = None) -> List[RunLog]:
        q = db.query(RunLog)
        if hustle_id is not None:
            q = q.filter(RunLog.hustle_id == hustle_id)
        return q.order_by(RunLog.id.desc()).limit(30).all()

    @staticmethod
    def trigger_refill(db: Session, hustle_id: int = 1, batch_size: int = 3) -> Dict[str, Any]:
        hustle = HustleRepository.get_by_id(db, hustle_id)
        if not hustle:
            raise NotFoundError("Hustle not found.")

        base_url = os.getenv("DEMO_ENGINE_BASE_URL", "http://localhost:3001")
        emit_terminal_log("REFILL-BATCH", f"Starting 7-Step Autopilot Refill Batch (target_count={batch_size})...")
        result = run_live_autopilot_discovery(
            db=db,
            hustle=hustle,
            target_count=batch_size,
            base_url=base_url,
            log_cb=lambda msg: emit_terminal_log("REFILL-BATCH", msg),
        )
        emit_terminal_log(
            "REFILL-BATCH",
            f"Run #{result['run_id']} finished: {result['passed']} built, {result['batch_sync']['verified_count']} live URLs synced to batch.json.",
        )
        broadcast_sse(
            "autopilot_run",
            {
                "run_id": result["run_id"],
                "passed": result["passed"],
                "verified_in_batch_json": result["batch_sync"]["verified_count"],
                "title": f"Refill Run #{result['run_id']} finished ({result['passed']} built)",
            },
        )
        return result

    @staticmethod
    def verify_links(db: Session) -> Dict[str, Any]:
        base_url = os.getenv("DEMO_ENGINE_BASE_URL", "http://localhost:3001")
        emit_terminal_log("VERIFY-LINKS", f"Starting HTTP 200 verification on {base_url}...")
        report = sync_verified_links_to_batch_json(
            db=db,
            base_url=base_url,
            log_cb=lambda msg: emit_terminal_log("VERIFY-LINKS", msg),
        )
        emit_terminal_log(
            "VERIFY-LINKS",
            f"Completed: {report['verified_count']} passed HTTP 200, {report['failed_count']} failed.",
        )
        broadcast_sse(
            "links_verified",
            {"verified_count": report["verified_count"], "title": f"Verified {report['verified_count']} live links"},
        )
        return report

    @staticmethod
    def get_cockpit_batch(db: Session, hustle_id: int = 1) -> List[Dict[str, Any]]:
        return build_cockpit_batch_payload(db=db, hustle_id=hustle_id)
