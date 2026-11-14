"""
Legacy Safety Shim (`app/safety.py`)
Re-exports all safety functions and invariants from `app.utils.safety` for backward compatibility.
"""

from app.utils.safety import (
    STOP_KEYWORDS,
    assert_active_lead_has_next_step,
    assert_no_duplicate_contact,
    can_send_to_lead,
    check_daily_channel_limit,
    check_do_not_contact,
    check_outbox_safety,
    compute_fit_score,
    compute_intent_score,
    compute_stock_plan,
    detect_stop_intent,
    get_today_channel_send_count,
    normalize_ig_handle,
    normalize_phone,
    parse_promises_and_snoozes,
)

__all__ = [
    "STOP_KEYWORDS",
    "assert_active_lead_has_next_step",
    "assert_no_duplicate_contact",
    "can_send_to_lead",
    "check_daily_channel_limit",
    "check_do_not_contact",
    "check_outbox_safety",
    "compute_fit_score",
    "compute_intent_score",
    "compute_stock_plan",
    "detect_stop_intent",
    "get_today_channel_send_count",
    "normalize_ig_handle",
    "normalize_phone",
    "parse_promises_and_snoozes",
]
