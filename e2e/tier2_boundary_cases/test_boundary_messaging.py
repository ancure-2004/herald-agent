"""Tier 2: Boundary & Corner Cases - WhatsApp Messaging (F3, F10, R2)."""

from typing import Any, Dict
from e2e.conftest import E2EClientWrapper


def test_boundary_empty_message_text_rejected(client: E2EClientWrapper, dental_lead: Dict[str, Any]):
    """Verifies that attempting to send a message without required text payload is rejected (HTTP 422)."""
    lead_id = dental_lead["id"]
    payload = {
        "channel": "whatsapp",
        "direction": "outbound",
        # 'text' field intentionally omitted
    }
    res = client.post(f"/api/leads/{lead_id}/messages", json=payload)
    assert res.status_code == 422, f"Expected 422 validation failure for missing text, got {res.status_code}"


def test_boundary_excessively_long_message_payload(client: E2EClientWrapper, dental_lead: Dict[str, Any]):
    """Verifies system boundary handling when a massive 20KB message is posted."""
    lead_id = dental_lead["id"]
    long_text = "Dr. Grover Dental Outreach Pitch. " * 600  # ~20KB text
    payload = {
        "channel": "whatsapp",
        "direction": "outbound",
        "text": long_text,
    }
    res = client.post(f"/api/leads/{lead_id}/messages", json=payload)
    assert res.status_code in (200, 201, 413, 422), f"Unexpected server response: {res.status_code}"


def test_boundary_special_characters_emojis_unicode(client: E2EClientWrapper, dental_lead: Dict[str, Any]):
    """Verifies encoding fidelity for dental emojis, hindi script, and HTML/script meta-characters."""
    lead_id = dental_lead["id"]
    complex_text = (
        "🦷 डॉ ग्रोवर डेंटल क्लीनिक - Dental Surgery! ✨ "
        "<script>alert('xss')</script> & 'quotes' \"double\" \n\t "
        "Price: ₹15,000/- one time; wa.me link: https://wa.me/919811002233?text=Demo%20Ready"
    )
    payload = {
        "channel": "whatsapp",
        "direction": "outbound",
        "text": complex_text,
    }
    res = client.post(f"/api/leads/{lead_id}/messages", json=payload)
    assert res.status_code in (200, 201), f"Failed to store unicode/meta-character message: {res.text}"
    data = res.json()
    assert data.get("text") == complex_text, "Message text must preserve exact unicode and meta-characters"


def test_boundary_message_nonexistent_lead_404(client: E2EClientWrapper):
    """Verifies that posting a message for a non-existent lead ID returns HTTP 404 Not Found."""
    non_existent_id = 99999999
    payload = {
        "channel": "whatsapp",
        "direction": "outbound",
        "text": "Message to phantom lead.",
    }
    res = client.post(f"/api/leads/{non_existent_id}/messages", json=payload)
    assert res.status_code == 404, f"Expected 404 for non-existent lead, got {res.status_code}"


def test_boundary_multi_line_pasted_messages(client: E2EClientWrapper, dental_lead: Dict[str, Any]):
    """Verifies R2: Supports pasting multiple messages at once (multi-line string)."""
    lead_id = dental_lead["id"]
    multiline_text = (
        "Doctor: Hello, we received your WhatsApp message.\n"
        "Doctor: Can we see the demo today?\n"
        "Me: Absolutely doctor, here are the 3 templates.\n"
        "Doctor: Thank you, reviewing with partner."
    )
    payload = {
        "channel": "whatsapp",
        "direction": "inbound",
        "text": multiline_text,
    }
    res = client.post(f"/api/leads/{lead_id}/messages", json=payload)
    assert res.status_code in (200, 201), f"Multi-line paste failed: {res.text}"
    data = res.json()
    assert "\n" in data.get("text", ""), "Newlines must be preserved in stored text"
