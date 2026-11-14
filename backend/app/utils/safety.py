import re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

IST = ZoneInfo("Asia/Kolkata")

from app.models.entities import (
    AvailabilityDay,
    Commitment,
    Hustle,
    Lead,
    Message,
    OutboxItem,
    Package,
    Stage,
    TrackingEvent,
)
# Lead and Message are used in get_today_channel_send_count for cross-path counting

STOP_KEYWORDS = [
    r"\bunsubscribe\b",
    r"\bdon'?t message\b",
    r"\bdo not contact\b",
    r"\bdo not message\b",
    r"\bremove me\b",
    r"\bnot interested\s+please\s+stop\b",
    r"\bspam\b",
    # Hinglish opt-out phrases
    r"\bmat\s+bhejo\b",
    r"\bmt\s+bhejo\b",
    r"\bband\s+karo\b",
    r"\bbnd\s+karo\b",
    r"\bmessage\s+mat\s+karo\b",
    r"\bmsg\s+mat\s+karo\b",
    r"\bbhejna\s+band\b",
]

# Negative-context phrases containing "stop" that are NOT opt-outs
# (e.g. "don't stop", "stop by tomorrow").
_STOP_NEGATIVE_CONTEXT = re.compile(
    r"don'?t\s+stop|do\s+not\s+stop|never\s+stop|stop\s+by|stop\s+over",
    re.IGNORECASE,
)


def normalize_phone(raw: Optional[str]) -> Optional[str]:
    """Normalizes Indian mobile and landline numbers to E.164 (+91XXXXXXXXXX).

    Handles:
    - 10-digit mobile  [6-9]XXXXXXXXX           → +91XXXXXXXXXX
    - 11-digit  0 + mobile  (0[6-9]XXXXXXXXX)   → +91XXXXXXXXXX
    - 12-digit  91XXXXXXXXXX                     → +91XXXXXXXXXX
    - 13-digit  091XXXXXXXXXX                    → +91XXXXXXXXXX
    - Indian STD landlines with trunk prefix 0:
        011-XXXXXXXX (Delhi 8-digit, 11 total)   → +9111XXXXXXXX
        0XX-XXXXXXX / 0XXX-XXXXXX (10–12 digits) → +91{digits[1:]}
    """
    if not raw:
        return None
    digits = re.sub(r"\D", "", str(raw))
    if not digits:
        return None
    # 10-digit mobile: [6-9]XXXXXXXXX
    if len(digits) == 10 and digits[0] in "6789":
        return f"+91{digits}"
    # 11-digit: trunk-0 + 10-digit mobile (0[6-9]XXXXXXXXX)
    if len(digits) == 11 and digits[0] == "0" and digits[1] in "6789":
        return f"+91{digits[1:]}"
    # 12-digit: 91 + 10 digits (already country-prefixed, mobile or landline)
    if len(digits) == 12 and digits.startswith("91"):
        return f"+{digits}"
    # 13-digit: 091 + 10 digits (rare prefix variant)
    if len(digits) == 13 and digits.startswith("091"):
        return f"+91{digits[3:]}"
    # Indian STD landlines with leading trunk-0: strip the 0 and prepend +91.
    # Covers: 011-XXXXXXXX (Delhi, 11 digits), 044-XXXXXXX, 022-XXXXXXXX, etc.
    if digits[0] == "0" and 9 <= len(digits) <= 12:
        return f"+91{digits[1:]}"
    # Already +91-prefixed without country-code digit (len >= 11 starting with 91)
    if digits.startswith("91") and len(digits) >= 11:
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
                detail="Active leads must always have a scheduled 'next_action' (cannot be empty).",
            )
        if not next_action_due_at:
            raise HTTPException(
                status_code=422,
                detail="Active leads must always have a 'next_action_due_at' datetime.",
            )


def detect_stop_intent(text: str) -> bool:
    """Scans text for stop/unsubscribe intent keywords.

    Guards against false positives:
    - "Don't stop by tomorrow" or "never stop" do NOT trigger DNC.
    - Bare \\bstop\\b only fires when no negative-context phrase is present.
    - Hinglish opt-out phrases (mat bhejo, band karo, etc.) always trigger.
    """
    if not text:
        return False
    lowered = text.lower()
    # Always-opt-out keywords (never false-positive).
    if any(re.search(pat, lowered) for pat in STOP_KEYWORDS):
        return True
    # Bare \bstop\b — only fire when no negative-context phrase is present.
    if re.search(r"\bstop\b", lowered) and not _STOP_NEGATIVE_CONTEXT.search(lowered):
        return True
    return False


def get_today_channel_send_count(db: Session, hustle_id: int, channel: str) -> int:
    """Counts outbound messages sent TODAY (IST midnight-to-midnight) for this hustle+channel.

    Counts both OutboxItem rows (status='sent') AND direct Message rows (direction='outbound',
    delivery_status in sent/sent_manually/queued) so the daily cap covers all send paths.
    """
    # IST midnight for today
    now_ist = datetime.now(IST)
    today_ist_start = now_ist.replace(hour=0, minute=0, second=0, microsecond=0)
    # Convert to UTC for DB comparison (DB stores UTC)
    today_start_utc = today_ist_start.astimezone(timezone.utc)

    outbox_count = (
        db.query(func.count(OutboxItem.id))
        .filter(
            OutboxItem.hustle_id == hustle_id,
            OutboxItem.channel == channel,
            OutboxItem.status == "sent",
            OutboxItem.sent_at >= today_start_utc,
        )
        .scalar()
        or 0
    )

    # Also count direct chat sends (not linked to an OutboxItem) so send_message path is covered
    direct_chat_count = (
        db.query(func.count(Message.id))
        .join(Lead, Message.lead_id == Lead.id)
        .filter(
            Lead.hustle_id == hustle_id,
            Message.channel == channel,
            Message.direction == "outbound",
            Message.outbox_id == None,  # noqa: E711 — only direct (non-outbox) messages
            Message.delivery_status.in_(["sent", "sent_manually", "queued"]),
            Message.created_at >= today_start_utc,
        )
        .scalar()
        or 0
    )

    return outbox_count + direct_chat_count


def can_send_to_lead(
    db: Session,
    lead: Lead,
    hustle: Hustle,
    channel: str,
) -> Tuple[bool, str]:
    """Shared pre-send guard used by BOTH pitch approval and chat send.

    Returns (True, "") when the send is allowed, or (False, reason) when blocked.
    Call this BEFORE dispatching any message to WhatsApp/external script.
    """
    if lead.do_not_contact or lead.is_archived:
        reason = (
            f"Lead '{lead.name}' is marked Do-Not-Contact "
            f"({lead.do_not_contact_reason or 'opted out'})."
        )
        return False, reason

    allowed = [c.lower() for c in (hustle.allowed_channels or [])]
    if allowed and channel.lower() not in allowed:
        return False, f"Channel '{channel}' is not enabled for hustle '{hustle.name}'. Allowed: {allowed}."

    limits = hustle.channel_limits or {}
    daily_limit = int(limits.get(channel.lower(), 0))
    if daily_limit > 0:
        sent_today = get_today_channel_send_count(db, hustle.id, channel)
        if sent_today >= daily_limit:
            return (
                False,
                f"Daily limit reached: hustle '{hustle.name}' allows {daily_limit} "
                f"'{channel}' sends/day (already sent {sent_today} today in IST).",
            )

    return True, ""


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

    # Reuse the shared can_send_to_lead guard for DNC + channel + daily-limit checks
    allowed_to_send, block_reason = can_send_to_lead(db, lead, hustle, ch)
    if not allowed_to_send:
        status_code = 429 if "Daily limit" in block_reason else 403
        raise HTTPException(status_code=status_code, detail=f"Safety brake: {block_reason}")

    existing_key = db.query(OutboxItem).filter(OutboxItem.unique_key == unique_key).first()
    if existing_key:
        raise HTTPException(
            status_code=409,
            detail=f"No-double-send brake: Outbox item with unique_key '{unique_key}' already exists (status: {existing_key.status}).",
        )


def compute_fit_score(
    facts: List[Any],
    has_doctor_name: bool,
    has_phone: bool,
    has_ig: bool,
    ai_fields: Dict[str, Any],
) -> Tuple[int, List[str]]:
    """Calculates acquisition fit score (0-100) and rationale."""
    score = 0
    reasons: List[str] = []

    if has_doctor_name:
        score += 25
        reasons.append("Identified lead doctor name (+25)")
    if has_phone:
        score += 25
        reasons.append("Verified direct phone number (+25)")
    if has_ig:
        score += 15
        reasons.append("Active Instagram presence found (+15)")

    verified_facts = [f for f in facts if getattr(f, "verified_by_two_sources", False)]
    if len(verified_facts) >= 2:
        score += 20
        reasons.append(f"{len(verified_facts)} facts cross-verified across 2+ sources (+20)")
    elif facts:
        score += 10
        reasons.append(f"{len(facts)} facts researched (+10)")

    if ai_fields.get("multi_doctor_or_implant_center") is True:
        score += 15
        reasons.append("Multi-doctor / implant center identified (+15)")

    return min(100, score), reasons


def compute_intent_score(events: List[TrackingEvent], messages: List[Message]) -> Tuple[int, List[str]]:
    """Rule-based Intent score (0-100) with time decay and transparent reasons."""
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


def _make_due_at_ist(base_utc: datetime, days_offset: int, hour_ist: int = 18) -> datetime:
    """Returns a timezone-aware UTC datetime = base_utc + days_offset days at hour_ist:00 IST."""
    base_ist = base_utc.astimezone(IST)
    target_ist = (base_ist + timedelta(days=days_offset)).replace(
        hour=hour_ist, minute=0, second=0, microsecond=0
    )
    return target_ist.astimezone(timezone.utc)


def parse_promises_and_snoozes(
    lead_id: int,
    text: str,
    direction: str,
    ref_time: datetime,
) -> List[Commitment]:
    """Promise and snooze parser. All due_at timestamps are computed in IST (item 23)."""
    proposals: List[Commitment] = []
    lowered = text.lower()
    who = "lead" if direction == "inbound" else "us"

    # Ensure ref_time is timezone-aware
    if ref_time.tzinfo is None:
        ref_time = ref_time.replace(tzinfo=timezone.utc)

    if "next monday" in lowered:
        days_ahead = (0 - ref_time.astimezone(IST).weekday() + 7) % 7 or 7
        proposals.append(
            Commitment(
                lead_id=lead_id,
                who_owes_it=who,
                what="Follow up next Monday",
                raw_phrase="next Monday",
                due_at=_make_due_at_ist(ref_time, days_ahead),
                status="proposed",
            )
        )
    elif "after diwali" in lowered:
        proposals.append(
            Commitment(
                lead_id=lead_id,
                who_owes_it="us",
                what="Follow up after Diwali break",
                raw_phrase="after Diwali",
                due_at=_make_due_at_ist(ref_time, 5),
                status="proposed",
            )
        )
    elif "next week" in lowered:
        proposals.append(
            Commitment(
                lead_id=lead_id,
                who_owes_it="us",
                what="Check back next week",
                raw_phrase="next week",
                due_at=_make_due_at_ist(ref_time, 7),
                status="proposed",
            )
        )
    elif "tomorrow" in lowered or "kal" in lowered.split():
        proposals.append(
            Commitment(
                lead_id=lead_id,
                who_owes_it=who,
                what="Follow up tomorrow",
                raw_phrase="tomorrow",
                due_at=_make_due_at_ist(ref_time, 1),
                status="proposed",
            )
        )
    return proposals


def check_daily_channel_limit(db: Session, hustle: Hustle, channel: str) -> Tuple[bool, int, int]:
    """Safety Check 1: Verifies daily outreach cap for a channel (IST-based count)."""
    limits = hustle.channel_limits or {}
    max_allowed = int(limits.get(channel.lower(), 20))
    sent_today = get_today_channel_send_count(db, hustle.id, channel)
    return (sent_today < max_allowed), sent_today, max_allowed


def check_do_not_contact(lead: Lead) -> bool:
    """Safety Check 2: Returns True if contact is strictly forbidden."""
    return bool(lead.do_not_contact or lead.is_archived)
