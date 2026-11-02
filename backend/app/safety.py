"""
Protected Safety Rules & CRM Invariants (`safety.py`)
-----------------------------------------------------
Per AGENTS.md:
1. Daily limits, do-not-contact, and no-double-send are protected rules.
2. Every active lead must have a next_action and next_action_due_at.
3. Phone numbers and Instagram handles are normalized and unique across leads.
"""

import re
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple, List, Dict, Any
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from .models import Lead, Stage, Hustle, OutboxItem, AvailabilityDay, Package, TrackingEvent, Message


STOP_KEYWORDS = [
    r"\bstop\b",
    r"\bunsubscribe\b",
    r"\bdon'?t message\b",
    r"\bdo not contact\b",
    r"\bdo not message\b",
    r"\bremove me\b",
    r"\bnot interested\s+please\s+stop\b",
    r"\bspam\b",
]


def normalize_phone(raw: Optional[str]) -> Optional[str]:
    """Normalizes Indian and international phone numbers to digits-only (+91XXXXXXXXXX)."""
    if not raw:
        return None
    digits = re.sub(r"\D", "", str(raw))
    if not digits:
        return None
    if len(digits) == 10 and digits[0] in "6789":
        return f"+91{digits}"
    if len(digits) == 11 and digits.startswith("0") and digits[1] in "6789":
        return f"+91{digits[1:]}"
    if len(digits) == 12 and digits.startswith("91"):
        return f"+{digits}"
    return f"+{digits}"


def normalize_ig_handle(raw: Optional[str]) -> Optional[str]:
    """Normalizes an Instagram handle or URL to lowercase @handle without the leading @."""
    if not raw:
        return None
    val = str(raw).strip().lower()
    if "instagram.com/" in val:
        val = val.split("instagram.com/", 1)[1].split("/")[0].split("?")[0]
    val = val.lstrip("@").strip()
    return val if val else None


def assert_no_duplicate_contact(
    db: Session,
    primary_phone: Optional[str],
    instagram_handle: Optional[str],
    exclude_lead_id: Optional[int] = None,
) -> Tuple[Optional[str], Optional[str]]:
    """
    Blocks duplicate leads sharing a phone number or Instagram handle.
    Returns (normalized_phone, normalized_ig).
    """
    norm_phone = normalize_phone(primary_phone)
    norm_ig = normalize_ig_handle(instagram_handle)

    if norm_phone:
        q = db.query(Lead).filter(Lead.primary_phone == norm_phone)
        if exclude_lead_id is not None:
            q = q.filter(Lead.id != exclude_lead_id)
        existing = q.first()
        if existing:
            raise HTTPException(
                status_code=409,
                detail=f"Duplicate blocked: phone {norm_phone} already belongs to lead '{existing.name}' (ID #{existing.id}).",
            )

    if norm_ig:
        q = db.query(Lead).filter(Lead.instagram_handle == norm_ig)
        if exclude_lead_id is not None:
            q = q.filter(Lead.id != exclude_lead_id)
        existing = q.first()
        if existing:
            raise HTTPException(
                status_code=409,
                detail=f"Duplicate blocked: Instagram @{norm_ig} already belongs to lead '{existing.name}' (ID #{existing.id}).",
            )

    return norm_phone, norm_ig


def assert_active_lead_has_next_step(
    stage: Stage,
    is_archived: bool,
    next_action: Optional[str],
    next_action_due_at: Optional[datetime],
) -> None:
    """
    Enforces the core Excel-replacement invariant:
    Every active lead (not archived and not in a Won/Lost stage) MUST have a next_action and next_action_due_at.
    """
    is_terminal = bool(stage.is_won or stage.is_lost or is_archived)
    if not is_terminal:
        if not next_action or not str(next_action).strip():
            raise HTTPException(
                status_code=422,
                detail="Active leads must always have a next_action. Set a next step or move the lead to Won/Lost/Archived.",
            )
        if next_action_due_at is None:
            raise HTTPException(
                status_code=422,
                detail="Active leads must always have a next_action_due_at timestamp.",
            )


def detect_stop_intent(text: str) -> bool:
    """Returns True if an inbound reply asks to stop or unsubscribe."""
    if not text:
        return False
    lowered = text.lower()
    return any(re.search(pattern, lowered) for pattern in STOP_KEYWORDS)


def get_today_channel_send_count(db: Session, hustle_id: int, channel: str) -> int:
    """Counts messages sent or currently sending today (UTC) for a hustle + channel."""
    now = datetime.now(timezone.utc)
    start_of_day = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    return (
        db.query(func.count(OutboxItem.id))
        .filter(
            OutboxItem.hustle_id == hustle_id,
            OutboxItem.channel == channel.lower(),
            OutboxItem.status.in_(["sent", "sending"]),
            OutboxItem.sent_at >= start_of_day,
        )
        .scalar()
        or 0
    )


def check_outbox_safety(
    db: Session,
    lead: Lead,
    hustle: Hustle,
    channel: str,
    unique_key: str,
) -> None:
    """
    Enforces all outreach safety rules before queuing or sending a message:
    1. Lead must not have do_not_contact == True.
    2. Channel must be allowed by the hustle.
    3. Unique idempotency key must not already exist (no-double-send).
    4. Daily limit for that hustle + channel must not be exceeded.
    """
    ch = channel.lower().strip()

    if lead.do_not_contact:
        raise HTTPException(
            status_code=403,
            detail=f"Safety brake: Lead '{lead.name}' is marked Do-Not-Contact ({lead.do_not_contact_reason or 'opted out'}).",
        )

    allowed = [c.lower() for c in (hustle.allowed_channels or [])]
    if allowed and ch not in allowed:
        raise HTTPException(
            status_code=403,
            detail=f"Safety brake: Channel '{ch}' is not enabled for hustle '{hustle.name}'. Allowed: {allowed}.",
        )

    existing_key = db.query(OutboxItem).filter(OutboxItem.unique_key == unique_key).first()
    if existing_key:
        raise HTTPException(
            status_code=409,
            detail=f"No-double-send brake: Outbox item with unique_key '{unique_key}' already exists (status: {existing_key.status}).",
        )

    limits = hustle.channel_limits or {}
    daily_limit = int(limits.get(ch, 0))
    if daily_limit > 0:
        sent_today = get_today_channel_send_count(db, hustle.id, ch)
        if sent_today >= daily_limit:
            raise HTTPException(
                status_code=429,
                detail=f"Daily limit reached: Hustle '{hustle.name}' allows {daily_limit} '{ch}' sends/day (already sent {sent_today} today).",
            )


def compute_fit_score(
    facts: List[Any],
    has_doctor_name: bool,
    has_phone: bool,
    has_instagram: bool,
    ai_fields: Dict[str, Any],
) -> Tuple[int, List[str]]:
    """
    Rule-based Fit score (0-100) with transparent reasons.
    """
    score = 20
    reasons = ["Verified no official website (+20)"]

    if has_phone:
        score += 20
        reasons.append("Verified WhatsApp/mobile contact (+20)")

    if has_doctor_name:
        score += 20
        reasons.append("Doctor identity verified across sources (+20)")

    if has_instagram:
        score += 10
        reasons.append("Active Instagram handle linked (+10)")

    for f in facts:
        field_name = getattr(f, "field", "")
        val = str(getattr(f, "value", ""))
        if field_name == "google_rating":
            try:
                rating = float(val.split()[0].replace("★", ""))
                if rating >= 4.7:
                    score += 15
                    reasons.append(f"High Google rating {rating}★ (+15)")
            except Exception:
                pass
        elif field_name == "review_count":
            digits = re.sub(r"\D", "", val)
            if digits and int(digits) >= 50:
                score += 15
                reasons.append(f"Strong patient volume ({val} reviews) (+15)")

    if ai_fields.get("multi_doctor_or_implant_center"):
        score = min(100, score + 10)
        reasons.append("Implant / multi-chair specialist practice (+10)")

    return min(100, score), reasons


def compute_intent_score(events: List[TrackingEvent], messages: List[Message]) -> Tuple[int, List[str]]:
    """
    Rule-based Intent score (0-100) with time decay and transparent reasons.
    """
    now = datetime.now(timezone.utc)
    score = 0
    reasons: List[str] = []

    non_bot_events = [e for e in events if not e.is_bot]
    page_views = [e for e in non_bot_events if e.event_type == "page_view"]
    design_choices = [e for e in non_bot_events if e.event_type == "design_choice"]
    wa_taps = [e for e in non_bot_events if e.event_type == "whatsapp_tap"]
    total_dwell = sum((e.duration_seconds or 0) for e in non_bot_events)

    if page_views:
        score += 25
        reasons.append(f"Opened demo link ({len(page_views)}x) (+25)")
        if len(page_views) >= 2:
            score += 15
            reasons.append("Repeat demo visits (+15)")

    if total_dwell >= 30:
        score += 15
        reasons.append(f"Spent {total_dwell}s exploring sections (+15)")

    if design_choices:
        chosen = design_choices[0].design_chosen
        score += 25
        reasons.append(f"Selected '{chosen.title()}' design on choice page (+25)")

    if wa_taps:
        score += 25
        reasons.append("Tapped WhatsApp CTA button on demo (+25)")

    inbound_msgs = [m for m in messages if m.direction == "inbound"]
    if inbound_msgs:
        latest_inbound = inbound_msgs[-1]
        if latest_inbound.ai_label == "interested":
            score += 35
            reasons.append("Replied with positive interest (+35)")
        elif latest_inbound.ai_label == "price_question":
            score += 30
            reasons.append("Asked about pricing/packages (+30)")
        elif latest_inbound.ai_label == "stop":
            return 0, ["Requested Do-Not-Contact (0)"]
        else:
            score += 20
            reasons.append("Replied to outreach (+20)")

    # Apply time decay if last event/reply is older than 5 days
    latest_ts = None
    for e in non_bot_events:
        ts = e.created_at
        if ts:
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            if latest_ts is None or ts > latest_ts:
                latest_ts = ts
    if latest_ts:
        days_idle = (now - latest_ts).days
        if days_idle >= 5 and score > 0:
            decay = min(score - 5, days_idle * 3)
            if decay > 0:
                score -= decay
                reasons.append(f"Time fade ({days_idle}d since last activity) (-{decay})")

    return max(0, min(100, score)), reasons


def compute_stock_plan(db: Session, hustle: Hustle) -> Dict[str, Any]:
    """
    Stock planner rule (Page 6):
    Ready packages must cover the planned sends until the system can next refill,
    plus a buffer that is larger on away/off days. If stock is short, a refill is triggered.
    """
    today = datetime.now(timezone.utc).date()
    upcoming_days = []
    away_or_off_days = 0

    for offset in range(7):
        d = today + timedelta(days=offset)
        d_str = d.isoformat()
        row = db.query(AvailabilityDay).filter(AvailabilityDay.date_str == d_str).first()
        mode = row.mode if row else "normal"
        upcoming_days.append({"date": d_str, "mode": mode})
        if mode in ("away", "off"):
            away_or_off_days += 1

    goals = hustle.channel_goals or {}
    daily_send_goal = sum(int(v) for v in goals.values()) or 15
    min_stock_days = max(1, hustle.minimum_stock_days or 3)
    effective_buffer_days = min_stock_days + away_or_off_days
    required_ready_packages = daily_send_goal * effective_buffer_days

    ready_packages_count = (
        db.query(func.count(Package.id))
        .join(Lead, Package.lead_id == Lead.id)
        .filter(
            Lead.hustle_id == hustle.id,
            Lead.is_archived == False,  # noqa: E712
            Lead.do_not_contact == False,  # noqa: E712
            Package.status.in_(["ready_for_review", "approved"]),
            Package.self_check_passed == True,  # noqa: E712
        )
        .scalar()
        or 0
    )

    shortfall = max(0, required_ready_packages - ready_packages_count)
    return {
        "hustle_id": hustle.id,
        "hustle_name": hustle.name,
        "daily_send_goal": daily_send_goal,
        "minimum_stock_days": min_stock_days,
        "upcoming_away_or_off_days": away_or_off_days,
        "effective_buffer_days": effective_buffer_days,
        "required_ready_packages": required_ready_packages,
        "current_ready_packages": ready_packages_count,
        "shortfall": shortfall,
        "needs_refill": shortfall > 0,
        "upcoming_schedule": upcoming_days,
    }
