"""Tier 2: Boundary & Corner Cases - Channel Invariant Enforcement (F5, R2)."""

from typing import Any, Dict
from e2e.conftest import E2EClientWrapper


def test_boundary_reject_sms_channel_for_dental_clinic(client: E2EClientWrapper, dental_lead: Dict[str, Any]):
    """Verifies that non-allowed channel 'sms' is strictly rejected for dental clinics (HTTP 403 or 422)."""
    lead_id = dental_lead["id"]
    payload = {
        "channel": "sms",
        "direction": "outbound",
        "text": "Hello Dr. Sharma, this is an unauthorized SMS channel attempt.",
    }
    res = client.post(f"/api/leads/{lead_id}/messages", json=payload)
    # Channel invariant enforcement returns 403 Forbidden or 422 Unprocessable Content
    assert res.status_code in (403, 422), (
        f"Expected 403/422 for unauthorized 'sms' channel, got {res.status_code}: {res.text}"
    )


def test_boundary_reject_email_channel_for_dental_clinic(client: E2EClientWrapper, dental_lead: Dict[str, Any]):
    """Verifies that non-allowed channel 'email' is strictly rejected for dental clinics."""
    lead_id = dental_lead["id"]
    payload = {
        "channel": "email",
        "direction": "outbound",
        "text": "Doctor, pitch sent to your email address.",
    }
    res = client.post(f"/api/leads/{lead_id}/messages", json=payload)
    assert res.status_code in (403, 422), (
        f"Expected 403/422 for unauthorized 'email' channel, got {res.status_code}: {res.text}"
    )


def test_boundary_reject_instagram_channel_for_dental_clinic(client: E2EClientWrapper, dental_lead: Dict[str, Any]):
    """Verifies that non-allowed channel 'instagram' is strictly rejected for dental clinics."""
    lead_id = dental_lead["id"]
    payload = {
        "channel": "instagram",
        "direction": "outbound",
        "text": "Sent direct message on Instagram handle.",
    }
    res = client.post(f"/api/leads/{lead_id}/messages", json=payload)
    assert res.status_code in (403, 422), (
        f"Expected 403/422 for unauthorized 'instagram' channel, got {res.status_code}: {res.text}"
    )


def test_boundary_empty_channel_rejected(client: E2EClientWrapper, dental_lead: Dict[str, Any]):
    """Verifies that empty string channel is rejected by API validation."""
    lead_id = dental_lead["id"]
    payload = {
        "channel": "",
        "direction": "outbound",
        "text": "Message with empty channel identifier.",
    }
    res = client.post(f"/api/leads/{lead_id}/messages", json=payload)
    assert res.status_code in (400, 403, 422), f"Expected validation failure for empty channel, got {res.status_code}"


def test_boundary_channel_case_sensitivity_and_whitespace(client: E2EClientWrapper, dental_lead: Dict[str, Any]):
    """Verifies handling of uppercase or whitespace-padded channels."""
    lead_id = dental_lead["id"]
    payload = {
        "channel": "  WHATSAPP  ",
        "direction": "outbound",
        "text": "Whitespace padded channel test.",
    }
    res = client.post(f"/api/leads/{lead_id}/messages", json=payload)
    # Either normalized to 'whatsapp' (200/201) or rejected as invalid token (403/422)
    assert res.status_code in (200, 201, 403, 422)
