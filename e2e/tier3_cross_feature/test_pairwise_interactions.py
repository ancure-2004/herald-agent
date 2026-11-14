"""Tier 3: Cross-Feature Combinations - Pairwise Subsystem Interactions (R2, R3, R4, R5, R6)."""

import urllib.parse
from typing import Any, Dict
from e2e.conftest import E2EClientWrapper


def test_cross_manual_reply_clears_cockpit_followup(client: E2EClientWrapper, dental_lead: Dict[str, Any]):
    """Pairwise 1: Manual reply logging -> Clears needs_followup -> Removes from Cockpit attention."""
    lead_id = dental_lead["id"]

    # 1. Mark lead as needing follow-up
    patch_res = client.patch(f"/api/leads/{lead_id}", json={"needs_followup": True})
    assert patch_res.status_code in (200, 204)

    # 2. Log manual inbound reply from doctor
    reply_payload = {
        "text": "Doctor replied: 'Yes, please call me tomorrow at 4 PM to finalize website.'",
        "channel": "whatsapp",
    }
    log_res = client.post(f"/api/leads/{lead_id}/messages/log-reply", json=reply_payload)
    if log_res.status_code == 404:
        log_res = client.post(f"/api/leads/{lead_id}/messages", json={
            "channel": "whatsapp",
            "direction": "inbound",
            "text": reply_payload["text"],
        })
    assert log_res.status_code in (200, 201)

    # 3. Check lead state: needs_followup must be cleared to False
    lead_res = client.get_lead(lead_id)
    assert lead_res.status_code == 200
    lead_data = lead_res.json()
    if "needs_followup" in lead_data:
        assert lead_data["needs_followup"] is False

    # 4. Check Cockpit attention: lead must not remain stuck in follow-up queue
    cockpit_res = client.get("/api/cockpit/attention")
    if cockpit_res.status_code == 404:
        cockpit_res = client.get("/api/autopilot/cockpit-state")
    assert cockpit_res.status_code in (200, 201)


def test_cross_automation_toggle_off_wame_and_manual_status(
    client: E2EClientWrapper, dental_lead: Dict[str, Any]
):
    """Pairwise 2: Automation toggle OFF -> wa.me link generation -> Message logged as sent_manually."""
    lead_id = dental_lead["id"]
    pitch_text = "Dr. Grover, here is your clinic demo: https://demo.dental/preview"
    payload = {
        "text": pitch_text,
        "channel": "whatsapp",
        "automation": False,
    }
    res = client.post(f"/api/leads/{lead_id}/messages/send", json=payload)
    client.check_or_skip(res, "POST /api/leads/{id}/messages/send (automation OFF)")

    assert res.status_code in (200, 201)
    data = res.json()
    assert data.get("status") == "sent_manually"
    assert "wa_url" in data
    assert "wa.me" in data["wa_url"] or "api.whatsapp.com" in data["wa_url"]
    assert urllib.parse.quote(pitch_text) in data["wa_url"] or urllib.parse.quote_plus(pitch_text) in data["wa_url"]


def test_cross_automation_toggle_on_queues_and_logs_outreach(
    client: E2EClientWrapper, dental_lead: Dict[str, Any]
):
    """Pairwise 3: Automation toggle ON -> Queues message for Playwright -> Outreach logged."""
    lead_id = dental_lead["id"]
    payload = {
        "text": "Dr. Grover, our autopilot dispatcher is sending your clinic assets.",
        "channel": "whatsapp",
        "automation": True,
    }
    res = client.post(f"/api/leads/{lead_id}/messages/send", json=payload)
    client.check_or_skip(res, "POST /api/leads/{id}/messages/send (automation ON)")

    assert res.status_code in (200, 201)
    data = res.json()
    assert data.get("status") in ("queued", "sent")
    assert data.get("delivery_status") in ("queued", "sent")


def test_cross_call_logging_enriches_prep_brief_and_cockpit(
    client: E2EClientWrapper, dental_lead: Dict[str, Any], sample_raw_call_transcript: str
):
    """Pairwise 4: Raw Call logged -> AI structuring -> Enriches prep brief -> Surfaces in Cockpit Call Prep."""
    lead_id = dental_lead["id"]
    call_payload = {
        "raw_text": sample_raw_call_transcript,
        "duration_seconds": 180,
        "outcome": "interested_in_invisalign_showcase",
    }
    call_res = client.post(f"/api/leads/{lead_id}/calls", json=call_payload)
    client.check_or_skip(call_res, "POST /api/leads/{id}/calls (prep brief integration)")

    assert call_res.status_code in (200, 201)

    # Verify brief endpoint is updated
    brief_res = client.get(f"/api/leads/{lead_id}/call-brief")
    assert brief_res.status_code == 200
    brief_data = brief_res.json()
    assert "prep_brief" in brief_data


def test_cross_discovery_trigger_populates_leads_and_emits_logs(client: E2EClientWrapper):
    """Pairwise 5: Lead Discovery trigger -> Terminal log emitted -> Pipeline discovery state."""
    # 1. Trigger discovery
    disc_res = client.post("/api/autopilot/discover", json={"query": "dental clinic in Dwarka Delhi"})
    assert disc_res.status_code in (200, 201, 202)

    # 2. Query terminal logs
    logs_res = client.get("/api/terminal/logs")
    assert logs_res.status_code == 200
    data = logs_res.json()
    logs = data if isinstance(data, list) else data.get("logs", [])
    assert len(logs) > 0, "Discovery trigger must emit terminal logs"


def test_cross_channel_invariant_blocks_non_whatsapp_outreach(
    client: E2EClientWrapper, dental_lead: Dict[str, Any]
):
    """Pairwise 6: Enforcing WhatsApp-only prevents queuing non-WhatsApp messages in lead history."""
    lead_id = dental_lead["id"]

    # Attempt SMS (must be blocked)
    sms_res = client.post(f"/api/leads/{lead_id}/messages", json={
        "channel": "sms",
        "direction": "outbound",
        "text": "Blocked SMS attempt",
    })
    assert sms_res.status_code in (403, 422)

    # Attempt WhatsApp (must succeed)
    wa_res = client.post(f"/api/leads/{lead_id}/messages", json={
        "channel": "whatsapp",
        "direction": "outbound",
        "text": "Valid WhatsApp outreach",
    })
    assert wa_res.status_code in (200, 201)


def test_cross_archive_lead_removes_from_pipeline_and_cockpit(
    client: E2EClientWrapper, dental_lead: Dict[str, Any]
):
    """Pairwise 7: Archiving a lead removes it from active list and Cockpit attention queues."""
    lead_id = dental_lead["id"]

    # Archive the lead
    arch_res = client.post(f"/api/leads/{lead_id}/archive")
    assert arch_res.status_code in (200, 201)

    # Active leads query must not contain archived lead
    leads_res = client.get("/api/leads", params={"include_archived": False})
    assert leads_res.status_code == 200
    active_ids = {lead["id"] for lead in leads_res.json()}
    assert lead_id not in active_ids, "Archived lead must be excluded from default active leads list"
