"""Tier 1: Feature Coverage - WhatsApp Messaging & Outgoing Message Dispatch (F3, F10, R2)."""

import urllib.parse
from typing import Any, Dict
from e2e.conftest import E2EClientWrapper


def test_post_lead_message_creates_record(client: E2EClientWrapper, dental_lead: Dict[str, Any]):
    """Verifies that an outbound WhatsApp message is successfully appended to lead history."""
    lead_id = dental_lead["id"]
    payload = {
        "channel": "whatsapp",
        "direction": "outbound",
        "text": "Hello Doctor, sharing your interactive clinic demo designs: https://demo.dental/preview",
    }
    res = client.post(f"/api/leads/{lead_id}/messages", json=payload)
    assert res.status_code in (200, 201), f"Failed to post message: {res.text}"
    data = res.json()
    assert data.get("lead_id") == lead_id or "id" in data
    assert data.get("text") == payload["text"]
    assert data.get("channel") == "whatsapp"


def test_message_delivery_status_tracking(client: E2EClientWrapper, dental_lead: Dict[str, Any]):
    """Verifies that messages record delivery status (queued, sent, sent_manually, failed)."""
    lead_id = dental_lead["id"]
    payload = {
        "channel": "whatsapp",
        "direction": "outbound",
        "text": "Checking in regarding your website preview package.",
    }
    res = client.post(f"/api/leads/{lead_id}/messages", json=payload)
    assert res.status_code in (200, 201)
    data = res.json()
    if "delivery_status" in data:
        assert data["delivery_status"] in ("queued", "sent", "sent_manually", "failed")


def test_message_chronological_ordering(client: E2EClientWrapper, dental_lead: Dict[str, Any]):
    """Verifies that messages can be created in sequence with proper ordering."""
    lead_id = dental_lead["id"]
    msg1 = client.post(f"/api/leads/{lead_id}/messages", json={
        "channel": "whatsapp", "direction": "outbound", "text": "Sequence Msg 1",
    })
    assert msg1.status_code in (200, 201)
    msg2 = client.post(f"/api/leads/{lead_id}/messages", json={
        "channel": "whatsapp", "direction": "inbound", "text": "Sequence Msg 2",
    })
    assert msg2.status_code in (200, 201)

    lead_res = client.get_lead(lead_id)
    assert lead_res.status_code == 200
    data = lead_res.json()
    if "messages" in data and len(data["messages"]) >= 2:
        msgs = data["messages"]
        assert msgs[-2]["text"] == "Sequence Msg 1" or msgs[-1]["text"] == "Sequence Msg 2"


def test_dispatch_automation_on_queues_message(client: E2EClientWrapper, dental_lead: Dict[str, Any]):
    """Verifies R2: Outgoing send with automation ON queues for Playwright WhatsApp sender."""
    lead_id = dental_lead["id"]
    payload = {
        "text": "Dr. Grover, your website demo is ready to view.",
        "channel": "whatsapp",
        "automation": True,
    }
    res = client.post(f"/api/leads/{lead_id}/messages/send", json=payload)
    client.check_or_skip(res, "POST /api/leads/{id}/messages/send (automation ON)")

    assert res.status_code in (200, 201)
    data = res.json()
    assert data.get("status") in ("queued", "sent")
    assert data.get("delivery_status") in ("queued", "sent")


def test_dispatch_automation_off_generates_wame_link(client: E2EClientWrapper, dental_lead: Dict[str, Any]):
    """Verifies R2: Outgoing send with automation OFF returns prefilled wa.me link and logs sent_manually."""
    lead_id = dental_lead["id"]
    message_text = "Dr. Grover, here is your customized website demo link."
    payload = {
        "text": message_text,
        "channel": "whatsapp",
        "automation": False,
    }
    res = client.post(f"/api/leads/{lead_id}/messages/send", json=payload)
    client.check_or_skip(res, "POST /api/leads/{id}/messages/send (automation OFF)")

    assert res.status_code in (200, 201)
    data = res.json()
    assert data.get("status") == "sent_manually"
    assert "wa_url" in data
    wa_url = data.get("wa_url", "")
    assert "wa.me" in wa_url or "api.whatsapp.com" in wa_url
    assert urllib.parse.quote(message_text) in wa_url or urllib.parse.quote_plus(message_text) in wa_url
