import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError, UnprocessableEntityError
from app.models.entities import Call, Hustle, Lead, Message, OutboxItem, Stage
from app.repositories.hustle_repo import HustleRepository
from app.repositories.lead_repo import LeadRepository
from app.repositories.message_repo import MessageRepository
from app.schemas.call import CallCreate
from app.services.call_service import CallService
from app.services.lead_service import sync_lead_stage_and_status
from app.services.message_service import MessageService
from app.services.rag_service import HybridRetriever

logger = logging.getLogger("personal_os.agent_tools")


class AgentTools:
    """Typed V1 Agentic Tools for Ask & Do CRM Assistant."""

    @staticmethod
    def search_leads(
        db: Session,
        query: str = "",
        stage: Optional[str] = None,
        locality: Optional[str] = None,
        hustle_id: int = 1,
        limit: int = 5,
    ) -> List[Dict[str, Any]]:
        """Searches leads via hybrid RAG and DB filters."""
        # 1. If query is provided, use HybridRetriever
        matched_lead_ids = []
        if query:
            try:
                retriever = HybridRetriever()
                rag_results = retriever.retrieve(query, doc_type="lead", top_k=limit * 2)
                for doc in rag_results:
                    if doc.get("lead_id"):
                        matched_lead_ids.append(doc["lead_id"])
            except Exception as e:
                logger.warning(f"RAG search_leads fallback to DB: {e}")

        q = db.query(Lead).filter(Lead.hustle_id == hustle_id, Lead.is_archived == False)  # noqa: E712

        if matched_lead_ids:
            q = q.filter(Lead.id.in_(matched_lead_ids))
        elif query:
            like_pat = f"%{query}%"
            q = q.filter(
                (Lead.name.ilike(like_pat))
                | (Lead.doctor_name.ilike(like_pat))
                | (Lead.locality.ilike(like_pat))
            )

        if locality:
            q = q.filter(Lead.locality.ilike(f"%{locality}%"))

        leads = q.limit(limit).all()

        results = []
        for l in leads:
            stage_name = l.stage_rel.name if l.stage_rel else (l.status or "STAGED")
            if stage and stage.lower() not in stage_name.lower():
                continue
            results.append(
                {
                    "id": l.id,
                    "name": l.name,
                    "doctor_name": l.doctor_name,
                    "locality": l.locality,
                    "stage": stage_name,
                    "fit_score": l.fit_score,
                    "intent_score": l.intent_score,
                    "phone": l.primary_phone,
                    "next_action": l.next_action,
                }
            )
        return results

    @staticmethod
    def query_crm_stats(db: Session, hustle_id: int = 1) -> Dict[str, Any]:
        """Queries live CRM pipeline and stock metrics."""
        from app.utils.safety import compute_stock_plan

        hustle = HustleRepository.get_by_id(db, hustle_id) or db.query(Hustle).first()
        hustle_name = hustle.name if hustle else "Pipeline"

        all_leads = db.query(Lead).filter(Lead.hustle_id == hustle_id, Lead.is_archived == False).all()  # noqa: E712
        total_active = len(all_leads)

        stage_counts: Dict[str, int] = {}
        for l in all_leads:
            s_name = l.stage_rel.name if l.stage_rel else (l.status or "Unknown")
            stage_counts[s_name] = stage_counts.get(s_name, 0) + 1

        plan = compute_stock_plan(db, hustle) if hustle else {}
        return {
            "hustle_name": hustle_name,
            "total_active_leads": total_active,
            "stage_breakdown": stage_counts,
            "ready_packages": plan.get("current_ready_packages", 0),
            "required_packages": plan.get("required_ready_packages", 0),
            "shortfall": plan.get("shortfall", 0),
        }

    @staticmethod
    def move_lead_stage(
        db: Session,
        lead_id: int,
        target_stage: str,
    ) -> Dict[str, Any]:
        """Moves a lead to a new pipeline stage and updates status."""
        lead = LeadRepository.get_by_id(db, lead_id)
        if not lead:
            raise NotFoundError(f"Lead #{lead_id} not found.")

        stages = db.query(Stage).filter(Stage.hustle_id == lead.hustle_id).all()
        matched: Optional[Stage] = None
        low = target_stage.lower().strip()
        for s in stages:
            if s.slug.lower() == low or s.name.lower() == low or low in s.name.lower():
                matched = s
                break
        if not matched:
            raise UnprocessableEntityError(f"Target stage '{target_stage}' not found for lead #{lead_id}.")

        old_stage = lead.stage_rel.name if lead.stage_rel else lead.status
        sync_lead_stage_and_status(db, lead, matched)
        lead.what_changed_summary = f"Stage moved: {old_stage} -> {matched.name}"
        db.commit()
        db.refresh(lead)

        return {
            "success": True,
            "lead_id": lead.id,
            "lead_name": lead.name,
            "old_stage": old_stage,
            "new_stage": matched.name,
        }

    @staticmethod
    def log_call(
        db: Session,
        lead_id: int,
        raw_text: str,
        duration_seconds: int = 120,
        outcome: str = "connected",
    ) -> Dict[str, Any]:
        """Structures and logs a call note for a lead."""
        payload = CallCreate(raw_text=raw_text, duration_seconds=duration_seconds, outcome=outcome)
        res = CallService.log_call(db, lead_id, payload)
        return {
            "success": True,
            "call_id": res.get("id"),
            "lead_id": lead_id,
            "summary": res.get("summary"),
            "prep_brief": res.get("prep_brief"),
        }

    @staticmethod
    def draft_or_send_message(
        db: Session,
        lead_id: int,
        text: str,
        channel: str = "whatsapp",
        confirmed: bool = False,
    ) -> Dict[str, Any]:
        """Drafts or sends an external message.
        CRITICAL SAFETY RULE: When confirmed=False, returns a pending confirmation payload.
        External messages are NEVER sent without confirmed=True.
        """
        lead = LeadRepository.get_by_id(db, lead_id)
        if not lead:
            raise NotFoundError(f"Lead #{lead_id} not found.")

        clean_channel = channel.lower().strip()

        if not confirmed:
            return {
                "requires_confirmation": True,
                "status": "pending_confirmation",
                "lead_id": lead.id,
                "lead_name": lead.name,
                "doctor_name": lead.doctor_name,
                "channel": clean_channel,
                "recipient": lead.primary_phone if clean_channel == "whatsapp" else lead.email,
                "draft_text": text,
                "message": f"Please confirm sending {clean_channel.upper()} message to {lead.name} ({lead.doctor_name}).",
            }

        # Confirmed: execute real send via outbox / message creation
        from app.schemas.message import OutboxApproveRequest

        req = OutboxApproveRequest(
            lead_id=lead.id,
            channel=clean_channel,
            text=text,
            step_tag="ask_do_agent",
            send_immediately=True,
        )
        res = MessageService.approve_and_send_pitch(db, req)
        return {
            "requires_confirmation": False,
            "status": "sent",
            "lead_id": lead.id,
            "lead_name": lead.name,
            "channel": clean_channel,
            "details": res,
            "message": f"Message sent to {lead.name} via {clean_channel.upper()}.",
        }
