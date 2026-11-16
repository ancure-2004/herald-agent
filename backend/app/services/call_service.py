from datetime import datetime, timezone
from typing import Any, Dict, List

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.entities import Call
from app.repositories.lead_repo import LeadRepository
from app.schemas.call import CallCreate
from app.services.ai_service import AIService
from app.services.event_bus import emit_terminal_log


class CallService:
    @staticmethod
    def list_calls(db: Session, lead_id: int) -> List[Call]:
        lead = LeadRepository.get_by_id(db, lead_id)
        if not lead:
            raise NotFoundError("Lead not found.")
        return db.query(Call).filter(Call.lead_id == lead.id).order_by(Call.created_at.desc()).all()

    @staticmethod
    def log_call(db: Session, lead_id: int, payload: CallCreate) -> Dict[str, Any]:
        lead = LeadRepository.get_by_id(db, lead_id)
        if not lead:
            raise NotFoundError("Lead not found.")

        # AI structuring into 5 sections + prep brief (<10s)
        structured = AIService.structure_raw_call_notes(lead, payload.raw_text, db=db)

        call = Call(
            lead_id=lead.id,
            raw_text=payload.raw_text.strip(),
            summary=structured.get("summary", ""),
            interests=structured.get("interests", []),
            objections=structured.get("objections", []),
            commitments=structured.get("commitments", []),
            next_steps=structured.get("next_steps", []),
            prep_brief=structured.get("prep_brief", ""),
            duration_seconds=payload.duration_seconds,
            outcome=payload.outcome,
            created_at=datetime.now(timezone.utc),
        )
        db.add(call)

        # Update lead next action if commitments or next steps exist
        if structured.get("commitments"):
            first_comm = structured["commitments"][0]
            lead.next_action = str(first_comm.get("what", "Follow up with doctor"))
            lead.what_changed_summary = f"Call logged: {structured.get('summary', '')[:80]}"
        elif structured.get("next_steps"):
            lead.next_action = str(structured["next_steps"][0])
            lead.what_changed_summary = f"Call logged: {structured.get('summary', '')[:80]}"

        # Invalidate any cached call brief on lead
        cf = dict(lead.custom_fields or {})
        if "cached_call_brief" in cf:
            cf.pop("cached_call_brief", None)
            lead.custom_fields = cf

        db.commit()
        db.refresh(call)

        emit_terminal_log(
            "OUTREACH",
            f"Call logged for {lead.name} ({payload.duration_seconds}s, outcome: {payload.outcome})",
            level="info",
            lead_id=lead.id,
            hustle_id=lead.hustle_id,
        )

        return {
            "id": call.id,
            "call_id": call.id,
            "lead_id": lead.id,
            "raw_text": call.raw_text,
            "summary": call.summary,
            "interests": call.interests or [],
            "objections": call.objections or [],
            "commitments": call.commitments or [],
            "next_steps": call.next_steps or [],
            "prep_brief": call.prep_brief or "",
            "duration_seconds": call.duration_seconds,
            "outcome": call.outcome,
            "created_at": call.created_at,
        }

    @staticmethod
    def get_call_brief(db: Session, lead_id: int, force_regenerate: bool = False) -> Dict[str, Any]:
        lead = LeadRepository.get_by_id(db, lead_id)
        if not lead:
            raise NotFoundError("Lead not found.")

        cf = dict(lead.custom_fields or {})
        cached = cf.get("cached_call_brief")
        if not force_regenerate and cached and isinstance(cached, dict) and cached.get("prep_brief"):
            return {
                "lead_id": lead.id,
                "clinic_name": lead.name,
                "doctor_name": lead.doctor_name,
                "prep_brief": cached.get("prep_brief", ""),
                "past_commitments": cached.get("past_commitments", []),
                "key_objections": cached.get("key_objections", []),
            }

        brief_data = AIService.generate_call_prep_brief(lead, lead.calls, lead.messages, db=db)
        result = {
            "lead_id": lead.id,
            "clinic_name": lead.name,
            "doctor_name": lead.doctor_name,
            "prep_brief": brief_data.get("prep_brief", ""),
            "past_commitments": brief_data.get("past_commitments", []),
            "key_objections": brief_data.get("key_objections", []),
        }

        # Cache in DB custom_fields
        cf["cached_call_brief"] = {
            "prep_brief": result["prep_brief"],
            "past_commitments": result["past_commitments"],
            "key_objections": result["key_objections"],
        }
        lead.custom_fields = cf
        db.commit()

        return result
