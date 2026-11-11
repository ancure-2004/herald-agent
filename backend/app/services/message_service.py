import json
import urllib.parse
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.exceptions import MethodNotAllowedError, NotFoundError
from app.core.logging import logger
from app.models.entities import AppSetting, Message, OutboxItem, Stage
from app.repositories.hustle_repo import HustleRepository
from app.repositories.lead_repo import LeadRepository
from app.repositories.message_repo import MessageRepository
from app.schemas.message import (
    ManualReplyRequest,
    MessageCreate,
    MessageOut,
    MessageSendRequest,
    OutboxApproveRequest,
)
from app.services.ai_service import AIService
from app.services.event_bus import broadcast_sse, emit_terminal_log
from app.utils.reply import classify_inbound_reply
from app.utils.safety import (
    can_send_to_lead,
    check_outbox_safety,
    compute_intent_score,
    detect_stop_intent,
    get_today_channel_send_count,
    parse_promises_and_snoozes,
)

# ---------------------------------------------------------------------------
# Automation settings helpers — DB-persisted so --reload doesn't reset them
# ---------------------------------------------------------------------------
_AUTOMATION_DEFAULTS: Dict[str, Any] = {
    "automation_enabled": True,
    "whatsapp_sender_mode": "playwright",
    "auto_reply_analysis": True,
}


def _load_automation_settings(db: Session) -> Dict[str, Any]:
    """Reads automation settings from app_settings table, falling back to defaults."""
    settings = dict(_AUTOMATION_DEFAULTS)
    rows = db.query(AppSetting).filter(AppSetting.key.like("automation.%")).all()
    for row in rows:
        field = row.key[len("automation."):]
        try:
            settings[field] = json.loads(row.value)
        except (json.JSONDecodeError, ValueError):
            settings[field] = row.value
    return settings


def _save_automation_settings(db: Session, updates: Dict[str, Any]) -> None:
    """Persists automation setting changes to app_settings table."""
    for field, value in updates.items():
        key = f"automation.{field}"
        row = db.query(AppSetting).filter(AppSetting.key == key).first()
        serialized = json.dumps(value)
        if row:
            row.value = serialized
        else:
            db.add(AppSetting(key=key, value=serialized))
    db.commit()



class MessageService:
    @staticmethod
    def append_message(db: Session, lead_id: int, payload: MessageCreate) -> Message:
        lead = LeadRepository.get_by_id(db, lead_id)
        if not lead:
            raise NotFoundError("Lead not found.")

        # Enforce Channel Restriction Invariant: inbound/outbound messages must adhere to hustle.allowed_channels
        clean_channel = payload.channel.strip().lower()
        if payload.direction in ("inbound", "outbound"):
            hustle = HustleRepository.get_by_id(db, lead.hustle_id)
            if hustle:
                allowed = [c.lower() for c in (hustle.allowed_channels or ["whatsapp"])]
                if clean_channel not in allowed:
                    raise HTTPException(
                        status_code=403,
                        detail=f"Channel restriction: '{payload.channel}' is not permitted for {hustle.name}. Allowed: {allowed}",
                    )

        now = datetime.now(timezone.utc)
        ai_label = payload.ai_label
        if payload.direction == "inbound" and not ai_label:
            ai_label = classify_inbound_reply(payload.text)

        delivery_status = getattr(payload, "delivery_status", None) or "sent"
        outbox_id = getattr(payload, "outbox_id", None)

        msg = Message(
            lead_id=lead.id,
            channel=clean_channel,
            direction=payload.direction,
            text=payload.text.strip(),
            template_used=payload.template_used,
            ai_label=ai_label,
            delivery_status=delivery_status,
            outbox_id=outbox_id,
            created_at=now,
        )
        MessageRepository.create_message(db, msg)

        # Safety Rule: Any reply asking to stop immediately sets do_not_contact
        if payload.direction == "inbound" and (ai_label == "stop" or detect_stop_intent(payload.text)):
            lead.do_not_contact = True
            lead.do_not_contact_reason = f"Auto-flagged from inbound reply: '{payload.text[:80]}'"
            lead.needs_followup = False
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
            lead.status = "REPLIED"
            lead.needs_followup = False
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
                    delivery_status="sent",
                    outbox_id=outbox_item.id,
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
        """Records that the external WhatsApp script already sent a message.

        Item 6: We ALWAYS write the Message row first so we never lose track of
        a send that already happened. DNC / daily-limit violations are logged as
        warnings instead of refusing the DB write.
        """
        lead_id = int(payload.get("id") or 0)
        channel = str(payload.get("channel") or "whatsapp").lower()
        lead = LeadRepository.get_by_id(db, lead_id)
        if not lead:
            raise NotFoundError("Lead not found.")

        hustle = HustleRepository.get_by_id(db, lead.hustle_id)

        # Determine the demo URL for the message text
        from app.core.config import get_settings
        demo_base = get_settings().DEMO_ENGINE_BASE_URL
        demo_url = f"{demo_base}/demo/{lead.slug}"
        if lead.packages and lead.packages[-1].asset_links:
            demo_url = lead.packages[-1].asset_links.get("choice_page") or demo_url

        msg_text = f"Dispatched 3-template dental studio pitch + video via {channel.upper()} Autopilot: {demo_url}"
        now = datetime.now(timezone.utc)
        unique_key = f"lead:{lead.id}:ch:{channel}:step:initial_pitch"

        # Check if already recorded (idempotent)
        existing_outbox = db.query(OutboxItem).filter(OutboxItem.unique_key == unique_key).first()
        if existing_outbox:
            return {"status": "already_recorded", "lead_id": lead.id}

        # --- Item 6 core: check safety AFTER the external send, log warnings, but ALWAYS record ---
        if hustle:
            allowed_to_send, block_reason = can_send_to_lead(db, lead, hustle, channel)
            if not allowed_to_send:
                logger.warning(
                    f"mark_sent: message already dispatched to lead #{lead.id} but safety check failed: {block_reason}. "
                    "Recording the send anyway to maintain an accurate audit trail."
                )

        outbox_item = OutboxItem(
            lead_id=lead.id,
            hustle_id=lead.hustle_id if lead.hustle_id else (hustle.id if hustle else 1),
            channel=channel,
            text=msg_text,
            unique_key=unique_key,
            status="sent",
            sent_at=now,
        )
        db.add(outbox_item)
        db.flush()

        db.add(
            Message(
                lead_id=lead.id,
                channel=channel,
                direction="outbound",
                text=msg_text,
                template_used="initial_pitch",
                delivery_status="sent",
                outbox_id=outbox_item.id,
                created_at=now,
            )
        )

        from app.models.entities import Stage as StageModel
        for pkg in lead.packages:
            pkg.status = "sent"
            pkg.sent_at = now
            pkg.expires_at = now + timedelta(days=7)

        contacted_stage = (
            db.query(StageModel)
            .filter(StageModel.hustle_id == lead.hustle_id, StageModel.slug == "contacted")
            .first()
        )
        if contacted_stage:
            lead.stage_id = contacted_stage.id
        lead.next_action = "Check demo view telemetry & follow up in 3 days"
        lead.next_action_due_at = now + timedelta(days=3)
        lead.what_changed_summary = f"Approved & sent {channel} pitch. Demo link expires in 7 days."

        db.commit()
        broadcast_sse("outbox_sent", {"lead_id": lead.id, "channel": channel, "unique_key": unique_key})
        return {
            "status": "sent",
            "unique_key": unique_key,
            "lead_id": lead.id,
            "today_channel_sends": get_today_channel_send_count(db, lead.hustle_id or 1, channel),
        }

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

    @staticmethod
    def send_message(db: Session, lead_id: int, payload: MessageSendRequest) -> Dict[str, Any]:
        lead = LeadRepository.get_by_id(db, lead_id)
        if not lead:
            raise NotFoundError("Lead not found.")

        clean_channel = payload.channel.strip().lower()
        hustle = HustleRepository.get_by_id(db, lead.hustle_id)

        # ---- Item 2: Run shared can_send_to_lead guard BEFORE any send path ----
        if hustle:
            allowed_to_send, block_reason = can_send_to_lead(db, lead, hustle, clean_channel)
            if not allowed_to_send:
                status_code = 429 if "Daily limit" in block_reason else 403
                raise HTTPException(status_code=status_code, detail=f"Send blocked: {block_reason}")
        else:
            # Fallback: at minimum enforce DNC even without a hustle row
            if lead.do_not_contact or lead.is_archived:
                raise HTTPException(status_code=403, detail=f"Lead '{lead.name}' is Do-Not-Contact.")

        now = datetime.now(timezone.utc)

        # ---- Item 4: Read automation toggle from DB, not an in-process global ----
        automation_settings = _load_automation_settings(db)
        use_automation = payload.automation
        if use_automation is None:
            use_automation = lead.automation_enabled and automation_settings.get("automation_enabled", True)

        if use_automation:
            # ---- Item 3: Idempotency key bucketed to 60s to block double-clicks ----
            ts_bucket = int(now.timestamp()) // 60  # same bucket for all clicks within 60s
            unique_key = f"outbox:lead:{lead.id}:ch:{clean_channel}:bucket:{ts_bucket}"

            # Also check the recent Message table for identical text in the last 60s
            cutoff = now - timedelta(seconds=60)
            recent_duplicate = (
                db.query(Message)
                .filter(
                    Message.lead_id == lead.id,
                    Message.direction == "outbound",
                    Message.text == payload.text.strip(),
                    Message.created_at >= cutoff,
                )
                .first()
            )
            if recent_duplicate:
                raise HTTPException(
                    status_code=409,
                    detail="Duplicate send blocked: identical message already sent to this lead within the last 60 seconds.",
                )

            # Check for existing outbox item with the same 60s-bucket key
            existing_outbox = db.query(OutboxItem).filter(OutboxItem.unique_key == unique_key).first()
            if existing_outbox:
                raise HTTPException(
                    status_code=409,
                    detail=f"Duplicate send blocked: outbox item '{unique_key}' already queued (status: {existing_outbox.status}).",
                )

            outbox_item = OutboxItem(
                lead_id=lead.id,
                hustle_id=lead.hustle_id,
                channel=clean_channel,
                text=payload.text.strip(),
                unique_key=unique_key,
                status="queued",
                scheduled_for=now,
            )
            db.add(outbox_item)
            db.flush()

            msg = Message(
                lead_id=lead.id,
                channel=clean_channel,
                direction="outbound",
                text=payload.text.strip(),
                delivery_status="queued",
                outbox_id=outbox_item.id,
                created_at=now,
            )
            MessageRepository.create_message(db, msg)
            db.commit()
            db.refresh(outbox_item)
            db.refresh(msg)

            broadcast_sse("message_queued", {"lead_id": lead.id, "outbox_id": outbox_item.id, "text": msg.text})
            emit_terminal_log("OUTREACH", f"Queued WhatsApp message for {lead.name}: {msg.text[:60]}")
            return {
                "status": "queued",
                "outbox_id": outbox_item.id,
                "wa_url": None,
                "delivery_status": "queued",
                "message_id": msg.id,
            }
        else:
            phone_raw = lead.primary_phone or ""
            digits = "".join(ch for ch in phone_raw if ch.isdigit()).lstrip("0")
            if len(digits) == 10:
                digits = "91" + digits
            elif len(digits) == 12 and digits.startswith("91"):
                pass
            encoded_text = urllib.parse.quote(payload.text.strip())
            wa_url = f"https://wa.me/{digits}?text={encoded_text}" if digits else f"https://wa.me/?text={encoded_text}"

            msg = Message(
                lead_id=lead.id,
                channel=clean_channel,
                direction="outbound",
                text=payload.text.strip(),
                delivery_status="sent_manually",
                outbox_id=None,
                created_at=now,
            )
            MessageRepository.create_message(db, msg)
            db.commit()
            db.refresh(msg)

            emit_terminal_log("OUTREACH", f"Generated manual wa.me link for {lead.name}")
            return {
                "status": "sent_manually",
                "outbox_id": None,
                "wa_url": wa_url,
                "delivery_status": "sent_manually",
                "message_id": msg.id,
            }

    @staticmethod
    def log_reply(db: Session, lead_id: int, payload: ManualReplyRequest) -> Dict[str, Any]:
        lead = LeadRepository.get_by_id(db, lead_id)
        if not lead:
            raise NotFoundError("Lead not found.")

        clean_channel = payload.channel.strip().lower()
        hustle = HustleRepository.get_by_id(db, lead.hustle_id)
        if hustle:
            allowed = [c.lower() for c in (hustle.allowed_channels or ["whatsapp"])]
            if clean_channel not in allowed:
                raise HTTPException(
                    status_code=403,
                    detail=f"Channel restriction: '{payload.channel}' is not permitted for {hustle.name}. Allowed: {allowed}",
                )

        msg_ts = payload.created_at or datetime.now(timezone.utc)
        raw_lines = [l.strip() for l in payload.text.split("\n") if l.strip()]
        if not raw_lines:
            raw_lines = [payload.text.strip()]

        created_messages = []
        is_stop = False
        for line in raw_lines:
            ai_label = classify_inbound_reply(line)
            if ai_label == "stop" or detect_stop_intent(line):
                is_stop = True
            msg = Message(
                lead_id=lead.id,
                channel=clean_channel,
                direction="inbound",
                text=line,
                ai_label=ai_label,
                delivery_status="delivered",
                created_at=msg_ts,
            )
            MessageRepository.create_message(db, msg)
            created_messages.append(msg)

        if is_stop:
            lead.do_not_contact = True
            lead.do_not_contact_reason = f"Logged STOP reply: '{raw_lines[0][:80]}'"
            lead.needs_followup = False
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
        else:
            replied_stage = db.query(Stage).filter(Stage.hustle_id == lead.hustle_id, Stage.slug == "replied").first()
            if replied_stage and not (lead.stage_rel and lead.stage_rel.is_won):
                lead.stage_id = replied_stage.id
            lead.status = "REPLIED"
            lead.needs_followup = False
            lead.what_changed_summary = f"Logged inbound reply: {raw_lines[0][:100]}"

        db.commit()
        for m in created_messages:
            db.refresh(m)
        db.refresh(lead)

        suggestions = AIService.generate_reply_suggestions(lead, lead.messages)
        emit_terminal_log("OUTREACH", f"Inbound reply logged for {lead.name} ({len(created_messages)} msgs) -> AI suggestions ready")

        return {
            "messages": [MessageOut.model_validate(m).model_dump() for m in created_messages],
            "lead_status": lead.status,
            "needs_followup": lead.needs_followup,
            "ai_suggestions": suggestions,
        }

    @staticmethod
    def get_reply_suggestions(db: Session, lead_id: int) -> Dict[str, Any]:
        lead = LeadRepository.get_by_id(db, lead_id)
        if not lead:
            raise NotFoundError("Lead not found.")
        suggestions = AIService.generate_reply_suggestions(lead, lead.messages)
        return {
            "lead_id": lead.id,
            "suggestions": suggestions,
        }

    @staticmethod
    def get_lead_messages(db: Session, lead_id: int) -> List[Message]:
        lead = LeadRepository.get_by_id(db, lead_id)
        if not lead:
            raise NotFoundError("Lead not found.")
        return db.query(Message).filter(Message.lead_id == lead.id).order_by(Message.created_at.asc()).all()

    @staticmethod
    def get_automation_settings(db: Optional[Session] = None) -> Dict[str, Any]:  # type: ignore[name-defined]
        """Returns automation settings. Reads from DB when a session is provided."""
        if db is not None:
            return _load_automation_settings(db)
        return dict(_AUTOMATION_DEFAULTS)

    @staticmethod
    def update_automation_settings(payload: Dict[str, Any], db: Optional[Session] = None) -> Dict[str, Any]:  # type: ignore[name-defined]
        """Persists automation setting changes to DB so restarts respect the toggle."""
        filtered = {k: v for k, v in payload.items() if v is not None and k in _AUTOMATION_DEFAULTS}
        if db is not None and filtered:
            _save_automation_settings(db, filtered)
        # Return the merged current state
        if db is not None:
            return _load_automation_settings(db)
        merged = dict(_AUTOMATION_DEFAULTS)
        merged.update(filtered)
        return merged

