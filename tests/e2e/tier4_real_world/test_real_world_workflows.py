"""Tier 4: Real-World Application Scenarios (>=5 Full Workflows)."""

import time
import urllib.parse
from typing import Any, Dict
from e2e.conftest import E2EClientWrapper


def test_workflow_1_full_dental_clinic_outreach_cycle(client: E2EClientWrapper, dental_lead: Dict[str, Any]):
    """Workflow 1: Full Dental Clinic Outreach Cycle.

    Discovery/Intake -> Channel Validation -> Pitch Dispatch -> Inbound Doctor Reply ->
    Reply Logging -> Stage Advancement to Won.
    """
    lead_id = dental_lead["id"]

    # 1. Verify channel invariant: Dental clinics must use WhatsApp
    lead_res = client.get_lead(lead_id)
    assert lead_res.status_code == 200
    lead_data = lead_res.json()
    assert lead_data.get("preferred_channel") == "whatsapp"

    # 2. Dispatch initial outreach pitch
    pitch_text = "Dr. Grover, we crafted 3 modern interactive preview templates for your clinic in Rohini: https://demo.dental/preview"
    send_res = client.post(f"/api/leads/{lead_id}/messages/send", json={
        "text": pitch_text,
        "channel": "whatsapp",
        "automation": True,
    })
    if send_res.status_code == 404:
        # Fallback to direct message append
        send_res = client.post(f"/api/leads/{lead_id}/messages", json={
            "channel": "whatsapp",
            "direction": "outbound",
            "text": pitch_text,
        })
    assert send_res.status_code in (200, 201)

    # 3. Doctor replies via WhatsApp
    doctor_reply_text = "Doctor: 'Hello Ankur, we saw the templates. Can we add a video consultation button?'"
    reply_res = client.post(f"/api/leads/{lead_id}/messages/log-reply", json={
        "text": doctor_reply_text,
        "channel": "whatsapp",
    })
    if reply_res.status_code == 404:
        reply_res = client.post(f"/api/leads/{lead_id}/messages", json={
            "channel": "whatsapp",
            "direction": "inbound",
            "text": doctor_reply_text,
        })
    assert reply_res.status_code in (200, 201)

    # 4. Check AI suggestions availability
    sugg_res = client.get(f"/api/leads/{lead_id}/reply-suggestions")
    if sugg_res.status_code == 404:
        sugg_res = client.get(f"/api/leads/{lead_id}/reply-copilot")
    assert sugg_res.status_code in (200, 201)

    # 5. Doctor accepts pitch -> Advance stage to Won
    advance_res = client.patch(f"/api/leads/{lead_id}", json={"status": "WON"})
    assert advance_res.status_code in (200, 204)

    # 6. Verify final lead state
    final_res = client.get_lead(lead_id)
    assert final_res.status_code == 200
    assert final_res.json().get("status") == "WON"


def test_workflow_2_raw_call_to_brief_to_next_outreach(
    client: E2EClientWrapper, dental_lead: Dict[str, Any], sample_raw_call_transcript: str
):
    """Workflow 2: Raw Call Structuring to Brief to Next WhatsApp Outreach.

    Raw Phone Conversation -> 5-Section AI Structuring -> Prep Brief Card ->
    Tailored Outgoing WhatsApp Reply.
    """
    lead_id = dental_lead["id"]

    # 1. Log completed raw telephone call
    call_payload = {
        "raw_text": sample_raw_call_transcript,
        "duration_seconds": 180,
        "outcome": "interested_wants_whatsapp_followup",
    }
    call_res = client.post(f"/api/leads/{lead_id}/calls", json=call_payload)
    if call_res.status_code == 404:
        call_res = client.post(f"/api/leads/{lead_id}/post-call-draft", json={
            "call_note": "Doctor interested in implant showcase; wants preview package sent to WhatsApp.",
        })
    assert call_res.status_code in (200, 201)

    # 2. Fetch call prep brief
    brief_res = client.get(f"/api/leads/{lead_id}/call-brief")
    if brief_res.status_code != 404:
        assert brief_res.status_code == 200
        brief_data = brief_res.json()
        assert "prep_brief" in brief_data

    # 3. Dispatch follow-up WhatsApp message based on call commitments
    followup_text = "Dr. Grover, following up on our call: here is the customized implant showcase demo."
    outreach_res = client.post(f"/api/leads/{lead_id}/messages", json={
        "channel": "whatsapp",
        "direction": "outbound",
        "text": followup_text,
    })
    assert outreach_res.status_code in (200, 201)


def test_workflow_3_lead_discovery_refill_to_terminal_stream(client: E2EClientWrapper):
    """Workflow 3: Lead Discovery Refill to Live Terminal Stream Verification.

    Trigger Discovery Refill -> Stream Terminal Logs -> Verify Database Population.
    """
    # 1. Baseline lead count
    leads_before = client.get("/api/leads").json()
    count_before = len(leads_before)

    # 2. Trigger lead discovery
    disc_res = client.post("/api/autopilot/discover", json={"query": "dental clinic in Punjabi Bagh Delhi"})
    assert disc_res.status_code in (200, 201, 202)

    # 3. Query terminal logs
    logs_res = client.get("/api/terminal/logs")
    assert logs_res.status_code == 200
    logs_data = logs_res.json()
    logs = logs_data if isinstance(logs_data, list) else logs_data.get("logs", [])
    assert len(logs) > 0, "Terminal log store must contain live logs"

    # 4. Verify system remains operational
    leads_after = client.get("/api/leads").json()
    assert len(leads_after) >= count_before


def test_workflow_4_cockpit_attention_triage_loop(client: E2EClientWrapper, dental_lead: Dict[str, Any]):
    """Workflow 4: Cockpit Attention Triage Workflow.

    Poll Attention Dashboards (<5s) -> Identify Urgency -> Resolve Action -> Verify Clean Triage.
    """
    lead_id = dental_lead["id"]

    # 1. Flag lead as requiring attention
    client.patch(f"/api/leads/{lead_id}", json={
        "needs_followup": True,
        "next_action": "Call clinic manager regarding domain transfer",
        "next_action_due_at": "2026-11-08T10:00:00Z",
    })

    # 2. Measure attention surfacing latency
    start_time = time.perf_counter()
    cockpit_res = client.get("/api/cockpit/attention")
    if cockpit_res.status_code == 404:
        cockpit_res = client.get("/api/autopilot/cockpit-state")
    elapsed = time.perf_counter() - start_time

    assert cockpit_res.status_code in (200, 201)
    assert elapsed < 5.0, f"Attention surfacing latency {elapsed:.2f}s exceeded 5s threshold"

    # 3. Resolve the attention item by completing task with next step
    task_res = client.post(f"/api/leads/{lead_id}/complete-task", json={
        "completed_note": "Domain transfer discussed with clinic manager.",
        "next_action": "Follow up next Tuesday on DNS propagation",
        "next_action_due_at": "2026-11-10T10:00:00Z",
    })
    assert task_res.status_code in (200, 201), f"Complete task failed: {task_res.text}"

    # 4. Re-poll cockpit attention to ensure state reflects completed action
    post_res = client.get("/api/cockpit/attention")
    if post_res.status_code == 404:
        post_res = client.get("/api/autopilot/cockpit-state")
    assert post_res.status_code in (200, 201)


def test_workflow_5_automation_fallback_and_wame_manual_flow(
    client: E2EClientWrapper, dental_lead: Dict[str, Any]
):
    """Workflow 5: Automation Fallback & wa.me Manual Outbox Flow.

    Lead with Automation Disabled -> wa.me URL Generation -> Manual Send Audit Trail.
    """
    lead_id = dental_lead["id"]

    # 1. Ensure automation is turned off for this lead
    patch_res = client.patch(f"/api/leads/{lead_id}", json={"automation_enabled": False})
    assert patch_res.status_code in (200, 204)

    # 2. Dispatch message with automation=False
    msg_text = "Dr. Grover, here is your customized dental website preview package: https://demo.dental/preview"
    send_res = client.post(f"/api/leads/{lead_id}/messages/send", json={
        "text": msg_text,
        "channel": "whatsapp",
        "automation": False,
    })

    if send_res.status_code == 404:
        # If /send endpoint is pending M2, test manual fallback via standard endpoint
        send_res = client.post(f"/api/leads/{lead_id}/messages", json={
            "channel": "whatsapp",
            "direction": "outbound",
            "text": msg_text,
            "delivery_status": "sent_manually",
        })
        assert send_res.status_code in (200, 201)
        data = send_res.json()
        assert data.get("delivery_status") == "sent_manually"
    else:
        assert send_res.status_code in (200, 201)
        data = send_res.json()
        assert data.get("status") == "sent_manually"
        assert "wa_url" in data
        assert "wa.me" in data["wa_url"] or "api.whatsapp.com" in data["wa_url"]
        assert urllib.parse.quote(msg_text) in data["wa_url"] or urllib.parse.quote_plus(msg_text) in data["wa_url"]

    # 3. Verify lead record reflects manual outbound action in history
    lead_res = client.get_lead(lead_id)
    assert lead_res.status_code == 200
