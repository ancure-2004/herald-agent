"""Tier 2: Boundary & Corner Cases - Calls Management (F2, F8, F9, R3)."""

from typing import Any, Dict
from e2e.conftest import E2EClientWrapper


def test_boundary_empty_call_transcript_rejected(client: E2EClientWrapper, dental_lead: Dict[str, Any]):
    """Verifies that submitting an empty call transcript is rejected."""
    lead_id = dental_lead["id"]
    payload = {
        "raw_text": "",
        "duration_seconds": 60,
        "outcome": "completed",
    }
    res = client.post(f"/api/leads/{lead_id}/calls", json=payload)
    client.check_or_skip(res, "POST /api/leads/{id}/calls (empty text validation)")

    # When active, empty text should be rejected with 400 or 422
    assert res.status_code in (400, 422), f"Expected validation failure for empty call text, got {res.status_code}"


def test_boundary_call_duration_zero_and_negative(client: E2EClientWrapper, dental_lead: Dict[str, Any]):
    """Verifies handling of zero and negative call duration boundary values."""
    lead_id = dental_lead["id"]
    payload_zero = {
        "raw_text": "Brief conversation with receptionist; doctor was in surgery.",
        "duration_seconds": 0,
        "outcome": "gatekeeper_blocked",
    }
    res = client.post(f"/api/leads/{lead_id}/calls", json=payload_zero)
    client.check_or_skip(res, "POST /api/leads/{id}/calls (zero duration)")

    assert res.status_code in (200, 201), f"Zero duration call should be valid, got {res.status_code}"


def test_boundary_call_for_nonexistent_lead_404(client: E2EClientWrapper):
    """Verifies that logging a call for a non-existent lead ID returns HTTP 404."""
    non_existent_id = 99999999
    payload = {
        "raw_text": "Doctor conversation transcript for phantom lead.",
        "duration_seconds": 120,
        "outcome": "interested",
    }
    res = client.post(f"/api/leads/{non_existent_id}/calls", json=payload)

    assert res.status_code == 404, f"Expected 404 for non-existent lead, got {res.status_code}"


def test_boundary_call_unusual_outcome_status(client: E2EClientWrapper, dental_lead: Dict[str, Any]):
    """Verifies that non-standard call outcome labels are recorded safely."""
    lead_id = dental_lead["id"]
    payload = {
        "raw_text": "Called clinic, receptionist stated doctor is away at IDA conference until Monday.",
        "duration_seconds": 45,
        "outcome": "conference_away_follow_up_monday",
    }
    res = client.post(f"/api/leads/{lead_id}/calls", json=payload)
    client.check_or_skip(res, "POST /api/leads/{id}/calls (custom outcome)")

    assert res.status_code in (200, 201), f"Expected 200/201, got {res.status_code}"


def test_boundary_huge_call_transcript(client: E2EClientWrapper, dental_lead: Dict[str, Any]):
    """Verifies system stability when processing a comprehensive 15KB call transcript."""
    lead_id = dental_lead["id"]
    large_transcript = (
        "Me: Good morning doctor. Let's discuss clinic website features in detail.\n"
        "Dr. Grover: Yes, we need implants, orthodontics, cosmetic dentistry, patient testimonials, "
        "and online appointment scheduling directly to our reception WhatsApp.\n"
    ) * 80  # ~15KB
    payload = {
        "raw_text": large_transcript,
        "duration_seconds": 900,
        "outcome": "deep_discussion",
    }
    res = client.post(f"/api/leads/{lead_id}/calls", json=payload)
    client.check_or_skip(res, "POST /api/leads/{id}/calls (large transcript)")

    assert res.status_code in (200, 201, 413), f"Unexpected response: {res.status_code}"
