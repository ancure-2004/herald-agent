import json
import os
import urllib.request
from datetime import datetime, timezone
from typing import Any, Dict

from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import GoneError, NotFoundError
from app.models.entities import Lead, Stage, TrackingEvent
from app.repositories.tracking_repo import TrackingRepository
from app.schemas.tracking import TrackingEventCreate
from app.services.event_bus import broadcast_sse, emit_terminal_log
from app.utils.safety import compute_intent_score

BOT_USER_AGENTS = [
    "whatsapp",
    "telegrambot",
    "facebookexternalhit",
    "twitterbot",
    "slackbot",
    "discordbot",
    "linkedinbot",
]


class TrackingService:
    @staticmethod
    def get_public_demo(db: Session, slug: str) -> Dict[str, Any]:
        lead = db.query(Lead).options(joinedload(Lead.packages)).filter(Lead.slug == slug).first()
        if not lead or not lead.packages:
            raise NotFoundError("Demo package not found.")

        pkg = lead.packages[-1]
        now = datetime.now(timezone.utc)
        if pkg.expires_at:
            exp = pkg.expires_at if pkg.expires_at.tzinfo else pkg.expires_at.replace(tzinfo=timezone.utc)
            if now > exp:
                pkg.status = "expired"
                db.commit()
                raise GoneError("This clinic preview link has expired. Reply on WhatsApp to re-open it.")

        return {
            "lead_id": lead.id,
            "slug": lead.slug,
            "clinic_name": lead.name,
            "doctor_name": lead.doctor_name,
            "phone": lead.primary_phone,
            "locality": lead.locality,
            "city": lead.city,
            "asset_links": pkg.asset_links,
            "clinic_payload": pkg.clinic_payload,
            "expires_at": pkg.expires_at,
        }

    @staticmethod
    def track_demo_event(db: Session, payload: TrackingEventCreate) -> Dict[str, Any]:
        lead = None
        if payload.lead_id:
            lead = db.query(Lead).filter(Lead.id == payload.lead_id).first()
        elif payload.lead_slug:
            lead = db.query(Lead).filter(Lead.slug == payload.lead_slug).first()

        if not lead:
            raise NotFoundError("Lead not found for tracking.")

        ua_lower = (payload.user_agent or "").lower()
        is_bot = any(b in ua_lower for b in BOT_USER_AGENTS)

        ev = TrackingEvent(
            lead_id=lead.id,
            package_id=payload.package_id or (lead.packages[-1].id if lead.packages else None),
            event_type=payload.event_type,
            section=payload.section,
            design_chosen=payload.design_chosen,
            duration_seconds=payload.duration_seconds,
            user_agent=payload.user_agent,
            is_bot=is_bot,
        )
        TrackingRepository.record_event(db, ev)

        if not is_bot:
            intent, reasons = compute_intent_score(lead.events, lead.messages)
            lead.intent_score = intent
            lead.intent_reasons = reasons

            if payload.event_type == "design_choice" and payload.design_chosen:
                lead.what_changed_summary = (
                    f"Doctor chose the '{payload.design_chosen.title()}' layout on the demo page!"
                )
            elif payload.event_type == "whatsapp_tap":
                lead.what_changed_summary = "Doctor tapped the WhatsApp CTA button inside the live demo!"
            else:
                lead.what_changed_summary = (
                    f"Hot view detected on /demo/{lead.slug} ({payload.section or 'hero'}) - Intent Score: {intent}"
                )

            viewed_stage = (
                db.query(Stage).filter(Stage.hustle_id == lead.hustle_id, Stage.slug == "viewed_demo").first()
            )
            if viewed_stage and lead.stage_rel and lead.stage_rel.slug in ("package_ready", "queued", "contacted"):
                lead.stage_id = viewed_stage.id

        db.commit()

        alert_title = f"HOT VIEW: {lead.name} ({payload.event_type}{': ' + payload.design_chosen if payload.design_chosen else ''}) • Intent {lead.intent_score}"
        if not is_bot:
            emit_terminal_log("HOT-LEAD-ALERT", alert_title)
            tg_token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
            tg_chat = os.getenv("TELEGRAM_CHAT_ID", "").strip()
            if tg_token and tg_chat:
                try:
                    tg_url = f"https://api.telegram.org/bot{tg_token}/sendMessage"
                    tg_body = json.dumps(
                        {
                            "chat_id": tg_chat,
                            "text": f"🔥 {alert_title}\nClinic: {lead.name} ({lead.locality})\nPhone: {lead.primary_phone or 'N/A'}",
                        }
                    ).encode("utf-8")
                    req = urllib.request.Request(
                        tg_url,
                        data=tg_body,
                        headers={"Content-Type": "application/json"},
                        method="POST",
                    )
                    urllib.request.urlopen(req, timeout=5)
                except Exception:
                    pass

        broadcast_sse(
            "tracking_view",
            {
                "lead_id": lead.id,
                "lead_name": lead.name,
                "event_type": payload.event_type,
                "design_chosen": payload.design_chosen,
                "intent_score": lead.intent_score,
                "is_bot": is_bot,
                "title": alert_title,
            },
        )
        return {
            "status": "tracked",
            "is_bot": is_bot,
            "intent_score": lead.intent_score,
            "lead_id": lead.id,
            "event_type": payload.event_type,
        }
