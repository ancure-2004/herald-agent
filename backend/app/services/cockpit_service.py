from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.entities import Lead
from app.services.cache_manager import get_cache_manager


def _to_utc(dt: Any) -> Any:
    if dt is None:
        return None
    if getattr(dt, "tzinfo", None) is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


class CockpitService:
    @classmethod
    def _serialize_card(cls, lead: Lead, reason: str = "", urgency: str = "medium") -> Dict[str, Any]:
        prep_brief = ""
        last_call_summary = ""
        if lead.calls:
            latest_call = lead.calls[0]
            prep_brief = latest_call.prep_brief or ""
            last_call_summary = latest_call.summary or ""

        last_message_text = ""
        last_message_direction = ""
        if lead.messages:
            last_msg = lead.messages[-1]
            last_message_text = last_msg.text
            last_message_direction = last_msg.direction

        return {
            "id": lead.id,
            "lead_id": lead.id,
            "name": lead.name,
            "doctor_name": lead.doctor_name or "Doctor",
            "locality": lead.locality or "",
            "city": lead.city or "Delhi NCR",
            "primary_phone": lead.primary_phone or "",
            "preferred_channel": lead.preferred_channel or "whatsapp",
            "status": lead.status or "ACTIVE",
            "stage": lead.stage_rel.name if lead.stage_rel else "",
            "stage_slug": lead.stage_rel.slug if lead.stage_rel else "",
            "next_action": lead.next_action or "",
            "next_action_due_at": lead.next_action_due_at.isoformat() if lead.next_action_due_at else None,
            "needs_followup": bool(lead.needs_followup),
            "fit_score": lead.fit_score or 0,
            "intent_score": lead.intent_score or 0,
            "prep_brief": prep_brief,
            "last_call_summary": last_call_summary,
            "last_message_text": last_message_text,
            "last_message_direction": last_message_direction,
            "attention_reason": reason,
            "urgency": urgency,
        }

    @classmethod
    def get_attention_dashboards(cls, db: Session, hustle_id: int = 1) -> Dict[str, List[Dict[str, Any]]]:
        """
        Computes the 4 distinct attention dashboards within <5s latency:
          1. followup_required: leads needing follow-up (pitch sent >=3d ago, snooze expiring, or needs_followup=True)
          2. unreplied_messages: leads whose last message is inbound with no outbound reply
          3. todays_actions: leads with next_action_due_at <= end of today
          4. call_preparation: leads with scheduled calls or recent call logs showing prep briefs
        """
        now = datetime.now(timezone.utc)
        end_of_today = now.replace(hour=23, minute=59, second=59, microsecond=999999)
        three_days_ago = now - timedelta(days=3)

        cache = get_cache_manager()
        cache_key = f"cockpit:attention_dashboards:{hustle_id}"
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        # Query all active non-archived, non-DNC leads for hustle
        leads = (
            db.query(Lead)
            .options(
                joinedload(Lead.stage_rel),
                selectinload(Lead.calls),
                selectinload(Lead.messages),
                selectinload(Lead.packages),
            )
            .filter(
                Lead.hustle_id == hustle_id,
                Lead.is_archived == False,  # noqa: E712
                Lead.do_not_contact == False,  # noqa: E712
                Lead.status.notin_(["CLOSED_LOST", "LOST"]),
            )
            .all()
        )

        followup_required: List[Dict[str, Any]] = []
        unreplied_messages: List[Dict[str, Any]] = []
        todays_actions: List[Dict[str, Any]] = []
        call_preparation: List[Dict[str, Any]] = []

        for lead in leads:
            is_won = bool(lead.stage_rel and lead.stage_rel.is_won) or (lead.status or "").upper() in ("WON", "CLOSED_WON") or lead.stage_id == 7
            is_lost = bool(lead.stage_rel and lead.stage_rel.is_lost) or (lead.status or "").upper() in ("CLOSED_LOST", "LOST") or lead.stage_id == 8
            if is_won or is_lost:
                continue

            stage_slug = lead.stage_rel.slug.lower() if lead.stage_rel else ""

            # 1. Unreplied messages check: last message is inbound
            if lead.messages:
                last_m = lead.messages[-1]
                if last_m.direction == "inbound":
                    unreplied_messages.append(
                        cls._serialize_card(
                            lead,
                            reason=f"Inbound reply waiting: '{last_m.text[:60]}'",
                            urgency="high",
                        )
                    )

            # 2. Today's actions: next_action_due_at <= end_of_today
            due_at_utc = _to_utc(lead.next_action_due_at)
            if due_at_utc and due_at_utc <= end_of_today:
                urgency = "high" if due_at_utc < now else "medium"
                todays_actions.append(
                    cls._serialize_card(
                        lead,
                        reason=f"Action due: {lead.next_action or 'Task due today'}",
                        urgency=urgency,
                    )
                )

            # 3. Follow-up required:
            # - lead.needs_followup is True, OR
            # - contacted/pitch_sent and last message was sent >= 3 days ago, OR
            # - has commitments due soon
            needs_fup = False
            fup_reason = ""
            if lead.needs_followup:
                needs_fup = True
                fup_reason = "Flagged: Follow-up required"
            elif stage_slug in ("contacted", "pitch_sent", "viewed_demo"):
                if lead.messages:
                    last_outbound = next((m for m in reversed(lead.messages) if m.direction == "outbound"), None)
                    if last_outbound and last_outbound.created_at:
                        out_created_at = _to_utc(last_outbound.created_at)
                        if out_created_at and out_created_at <= three_days_ago:
                            needs_fup = True
                            days = (now - out_created_at).days
                            fup_reason = f"Pitch sent {days} days ago without reply"
                elif lead.packages and lead.packages[-1].sent_at:
                    pkg_sent_at = _to_utc(lead.packages[-1].sent_at)
                    if pkg_sent_at and pkg_sent_at <= three_days_ago:
                        needs_fup = True
                        fup_reason = "Demo sent >= 3 days ago"

            if needs_fup:
                followup_required.append(
                    cls._serialize_card(lead, reason=fup_reason, urgency="medium")
                )

            # 4. Call preparation:
            # Leads that have logged calls with prep briefs, or in replied / warm / scheduled stages
            has_calls = len(lead.calls) > 0
            is_call_stage = stage_slug in ("replied", "warm", "call_scheduled", "demo_scheduled")
            if has_calls or is_call_stage:
                prep_reason = "Past call notes ready" if has_calls else "Hot lead: Call prep ready"
                call_preparation.append(
                    cls._serialize_card(lead, reason=prep_reason, urgency="medium")
                )


        res = {
            "followup_required": followup_required,
            "unreplied_messages": unreplied_messages,
            "todays_actions": todays_actions,
            "call_preparation": call_preparation,
        }
        cache.set(cache_key, res, ttl=30)
        return res
