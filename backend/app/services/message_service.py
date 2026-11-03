from datetime import datetime, timedelta, timezone
from typing import Any, Dict

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.exceptions import MethodNotAllowedError, NotFoundError
from app.models.entities import Message, OutboxItem, Stage
from app.repositories.hustle_repo import HustleRepository
from app.repositories.lead_repo import LeadRepository
from app.repositories.message_repo import MessageRepository
from app.schemas.message import MessageCreate, OutboxApproveRequest
from app.services.event_bus import broadcast_sse
from app.utils.reply import classify_inbound_reply
from app.utils.safety import (
    check_outbox_safety,
    compute_intent_score,
    detect_stop_intent,
    get_today_channel_send_count,
    parse_promises_and_snoozes,
)


class MessageService:
    @staticmethod
    def append_message(db: Session, lead_id: int, payload: MessageCreate) -> Message:
        lead = LeadRepository.get_by_id(db, lead_id)
        if not lead:
            raise NotFoundError("Lead not found.")

        now = datetime.now(timezone.utc)
        ai_label = payload.ai_label
        if payload.direction == "inbound" and not ai_label:
            ai_label = classify_inbound_reply(payload.text)

        msg = Message(
            lead_id=lead.id,
            channel=payload.channel,
            direction=payload.direction,
            text=payload.text.strip(),
            template_used=payload.template_used,
            ai_label=ai_label,
            created_at=now,
        )
        MessageRepository.create_message(db, msg)

        # Safety Rule: Any reply asking to stop immediately sets do_not_contact
        if payload.direction == "inbound" and (ai_label == "stop" or detect_stop_intent(payload.text)):
            lead.do_not_contact = True
            lead.do_not_contact_reason = f"Auto-flagged from inbound reply: '{payload.text[:80]}'"
            lost_stage = (
                db.query(Stage)
                .filter(Stage.hustle_id == lead.hustle_id, Stage.is_lost == True)  # noqa: E712
                .first()
            )
            if lost_stage:
                lead.stage_id = lost_stage.id
            for ob in lead.outbox_items:
                if ob.status in ("pending_approval", "queued"):
                    ob.status = "blocked"
                    ob.error_message = "Blocked by inbound STOP reply."
        elif payload.direction == "inbound":
            replied_stage = db.query(Stage).filter(Stage.hustle_id == lead.hustle_id, Stage.slug == "replied").first()
            if replied_stage and not (lead.stage_rel and lead.stage_rel.is_won):
                lead.stage_id = replied_stage.id
            lead.what_changed_summary = f"Inbound {payload.channel} reply ({ai_label}): {payload.text[:100]}"

        # Parse promises and snoozes ("next Monday", "after Diwali", etc.)
        commitments = parse_promises_and_snoozes(lead.id, payload.text, payload.direction, now)
        for c in commitments:
            db.add(c)

        db.flush()
        intent, intent_reasons = compute_intent_score(lead.events, lead.messages)
        lead.intent_score = intent
        lead.intent_reasons = intent_reasons

        db.commit()
        db.refresh(msg)
        broadcast_sse("message_appended", {"lead_id": lead.id, "direction": msg.direction, "ai_label": msg.ai_label})
        return msg

    @staticmethod
    def modify_message_blocked() -> None:
        raise MethodNotAllowedError("Messages are immutable in Personal OS and can never be edited or deleted.")

    @staticmethod
    def confirm_commitment(db: Session, commitment_id: int) -> Dict[str, Any]:
        c = MessageRepository.get_commitment_by_id(db, commitment_id)
        if not c:
            raise NotFoundError("Commitment not found.")
        c.status = "confirmed"
        lead = LeadRepository.get_by_id(db, c.lead_id)
        if lead:
            lead.next_action = c.what
            lead.next_action_due_at = c.due_at
            lead.what_changed_summary = f"Confirmed snooze/promise ({c.raw_phrase}): {c.what}"
        db.commit()
        return {"status": "confirmed", "lead_id": c.lead_id, "next_action": c.what, "due_at": c.due_at}

    @staticmethod
    def approve_and_send_pitch(db: Session, payload: OutboxApproveRequest) -> Dict[str, Any]:
        lead = LeadRepository.get_by_id(db, payload.lead_id)
        if not lead:
            raise NotFoundError("Lead not found.")
        hustle = HustleRepository.get_by_id(db, lead.hustle_id)
        if not hustle:
            raise NotFoundError("Hustle not found.")

        unique_key = f"lead:{lead.id}:ch:{payload.channel.lower()}:step:{payload.step_tag}"

        check_outbox_safety(
            db=db,
            lead=lead,
            hustle=hustle,
            channel=payload.channel,
            unique_key=unique_key,
        )

        now = datetime.now(timezone.utc)
        status = "sent" if payload.send_immediately else "queued"
        sent_at = now if payload.send_immediately else None

        outbox_item = OutboxItem(
            lead_id=lead.id,
            hustle_id=hustle.id,
            channel=payload.channel.lower(),
            text=payload.text,
            media_path=payload.media_path,
            unique_key=unique_key,
            status=status,
            sent_at=sent_at,
        )
        MessageRepository.create_outbox_item(db, outbox_item)

        if payload.send_immediately:
            db.add(
                Message(
                    lead_id=lead.id,
                    channel=payload.channel.lower(),
                    direction="outbound",
                    text=payload.text,
                    template_used=payload.step_tag,
                    created_at=now,
                )
            )
            for pkg in lead.packages:
                pkg.status = "sent"
                pkg.sent_at = now
                pkg.expires_at = now + timedelta(days=7)

            contacted_stage = db.query(Stage).filter(Stage.hustle_id == hustle.id, Stage.slug == "contacted").first()
            if contacted_stage:
                lead.stage_id = contacted_stage.id
            lead.next_action = "Check demo view telemetry & follow up in 3 days"
            lead.next_action_due_at = now + timedelta(days=3)
            lead.what_changed_summary = f"Approved & sent {payload.channel} pitch. Demo link expires in 7 days."

        db.commit()
        broadcast_sse("outbox_sent", {"lead_id": lead.id, "channel": payload.channel, "unique_key": unique_key})
        return {
            "status": status,
            "unique_key": unique_key,
            "lead_id": lead.id,
            "today_channel_sends": get_today_channel_send_count(db, hustle.id, payload.channel),
        }

    @staticmethod
    def mark_sent(db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
        lead_id = int(payload.get("id") or 0)
        channel = str(payload.get("channel") or "whatsapp").lower()
        lead = LeadRepository.get_by_id(db, lead_id)
        if not lead:
            raise NotFoundError("Lead not found.")

        demo_url = f"http://localhost:3001/demo/{lead.slug}"
        if lead.packages and lead.packages[-1].asset_links:
            demo_url = lead.packages[-1].asset_links.get("choice_page") or demo_url

        req = OutboxApproveRequest(
            lead_id=lead.id,
            channel=channel,
            text=f"Dispatched 3-template dental studio pitch + video via {channel.upper()} Autopilot: {demo_url}",
            step_tag="initial_pitch",
            send_immediately=True,
        )
        try:
            return MessageService.approve_and_send_pitch(db=db, payload=req)
        except HTTPException as exc:
            if exc.status_code == 409:
                return {"status": "already_recorded", "lead_id": lead.id}
            raise

    @staticmethod
    def mark_unreachable(db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
        lead_id = int(payload.get("id") or 0)
        reason = str(payload.get("reason") or "Channel unreachable")
        lead = LeadRepository.get_by_id(db, lead_id)
        if not lead:
            raise NotFoundError("Lead not found.")

        if lead.preferred_channel == "whatsapp" and lead.instagram_handle:
            lead.preferred_channel = "instagram"
        elif lead.email:
            lead.preferred_channel = "email"

        lead.what_changed_summary = (
            f"Channel fallback triggered ({reason}) -> switched preferred channel to {lead.preferred_channel}."
        )
        MessageRepository.create_message(
            db,
            Message(
                lead_id=lead.id,
                channel="system",
                direction="internal_note",
                text=lead.what_changed_summary,
            ),
        )
        db.commit()
        return {"status": "fallback_applied", "lead_id": lead.id, "preferred_channel": lead.preferred_channel}
