import os
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.agents import run_auditor_agent, run_closer_agent, run_scout_agent
from app.core.exceptions import NotFoundError
from app.repositories.hustle_repo import HustleRepository
from app.services.event_bus import broadcast_sse, emit_terminal_log


class AgentService:
    @staticmethod
    def run_scout(db: Session, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        body = payload or {}
        hustle_id = int(body.get("hustle_id", 1))
        batch_size = int(body.get("batch_size", 2))
        hustle = HustleRepository.get_by_id(db, hustle_id)
        if not hustle:
            raise NotFoundError("Hustle not found.")
        base_url = os.getenv("DEMO_ENGINE_BASE_URL", "http://localhost:3001")
        res = run_scout_agent(
            db=db,
            hustle=hustle,
            batch_size=batch_size,
            base_url=base_url,
            log_cb=lambda msg: emit_terminal_log("1.SCOUT-AGENT", msg),
        )
        broadcast_sse(
            "scout_complete",
            {
                "discovered_new": res["discovered_new"],
                "enriched_leads": res["enriched_leads"],
                "title": f"Scout finished ({res['discovered_new']} new, {res['enriched_leads']} enriched)",
            },
        )
        return res

    @staticmethod
    def run_auditor(db: Session, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        body = payload or {}
        hustle_id = int(body.get("hustle_id", 1))
        record_video = bool(body.get("record_video", False))
        clinic_id = body.get("clinic_id")
        hustle = HustleRepository.get_by_id(db, hustle_id)
        if not hustle:
            raise NotFoundError("Hustle not found.")
        base_url = os.getenv("DEMO_ENGINE_BASE_URL", "http://localhost:3001")
        res = run_auditor_agent(
            db=db,
            hustle=hustle,
            base_url=base_url,
            record_video=record_video,
            clinic_id=int(clinic_id) if clinic_id is not None else None,
            log_cb=lambda msg: emit_terminal_log("2.AUDITOR-AGENT", msg),
        )
        broadcast_sse(
            "auditor_complete",
            {
                "verified": res["verified_links_count"],
                "videos": res["attached_videos_count"],
                "title": f"Auditor finished ({res['verified_links_count']} verified, {res['attached_videos_count']} MP4s)",
            },
        )
        return res

    @staticmethod
    def run_closer(db: Session, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        body = payload or {}
        hustle_id = int(body.get("hustle_id", 1))
        channel = str(body.get("channel", "whatsapp"))
        clinic_id = body.get("clinic_id")
        batch_id = body.get("batch_id") or None
        hustle = HustleRepository.get_by_id(db, hustle_id)
        if not hustle:
            raise NotFoundError("Hustle not found.")

        # Determine dry_run: if explicitly passed in payload, respect it; otherwise fallback to hustle settings/channel_limits
        if "dry_run" in body:
            dry_run = bool(body["dry_run"])
        else:
            channel_limits = hustle.channel_limits or {}
            dry_run = bool(channel_limits.get("dry_run", True))
        res = run_closer_agent(
            db=db,
            hustle=hustle,
            channel=channel,
            dry_run=dry_run,
            clinic_id=int(clinic_id) if clinic_id is not None else None,
            batch_id=batch_id,
            log_cb=lambda msg: emit_terminal_log(f"3.CLOSER-{channel.upper()}", msg),
        )
        broadcast_sse(
            "closer_complete",
            {
                "channel": channel,
                "dry_run": dry_run,
                "followups": res["drafted_hot_followups"],
                "title": f"Closer ({channel.upper()}) finished",
            },
        )
        return res
