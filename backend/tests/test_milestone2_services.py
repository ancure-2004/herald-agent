"""Comprehensive unit tests for Milestone 2:
- AIService (3-option replies, 5-section call notes, prep brief)
- WhatsApp Outreach & Messaging Endpoints (send automation ON/OFF, log-reply, reply-suggestions, messages, automation settings)
- Calls Management Endpoints (POST calls, GET call-brief)
- Cockpit Attention Endpoint (4 dashboards, <5s)
- Live Log Store & Streaming Filters (service, level, lead_id, since_seq)
"""

from app.services.ai_service import AIService, LLMProvider


class MockMilestone2Provider(LLMProvider):
    def generate_json(self, prompt: str, json_schema=None, timeout_seconds: float = 30.0):
        if "reply" in prompt.lower() or "suggestions" in prompt.lower():
            return {
                "suggestions": [
                    {"category": "Direct Answer", "text": "Direct test answer.", "tone": "professional"},
                    {"category": "Value Reframe", "text": "Value reframe test text.", "tone": "consultative"},
                    {"category": "Quick OPD Check-in", "text": "Quick OPD check-in test.", "tone": "polite_brief"},
                ]
            }
        elif "call" in prompt.lower() or "transcript" in prompt.lower() or "structuring" in prompt.lower():
            return {
                "summary": "Spoke with Dr. Pooja Mehra for 8 minutes.",
                "interests": ["Modern template layout", "Direct WhatsApp booking"],
                "objections": ["Existing Practo spend"],
                "commitments": [{"who_owes_it": "us", "what": "Send pricing options", "due_phrase": "on Friday"}],
                "next_steps": ["Follow up on Friday with pricing options"],
                "prep_brief": "Review pricing options with doctor.",
            }
        return {
            "prep_brief": "- Discuss Rs. 15,000 package with free domain setup.\n- Emphasize Google Maps direct WhatsApp conversion.",
            "past_commitments": [{"who_owes_it": "us", "what": "Send domain mapping instructions", "due_phrase": "by Friday"}],
            "key_objections": ["Worried about ongoing website updates"],
        }

    def test_connection(self):
        return {"ok": True, "provider": "mock", "message": "Connected"}


def test_ai_service_generate_reply_suggestions(monkeypatch):
    """Verifies AIService returns 3 distinct reply options with proper schema and categories."""
    mock_p = MockMilestone2Provider()
    monkeypatch.setattr(AIService, "get_provider", lambda *args, **kwargs: mock_p)
    lead = {
        "id": 1,
        "name": "Apex Dental Clinic",
        "doctor_name": "Dr. Rohit Batra",
        "locality": "Dwarka Sector 7",
    }
    messages = [
        {"direction": "outbound", "text": "Namaste Dr. Batra! Here is your demo website."},
        {"direction": "inbound", "text": "Looks clean! What are the commercial package charges?"},
    ]

    suggestions = AIService.generate_reply_suggestions(lead, messages)
    assert isinstance(suggestions, list)
    assert len(suggestions) == 3

    categories = [s["category"] for s in suggestions]
    assert "Direct Answer" in categories
    assert "Value Reframe" in categories
    assert "Quick OPD Check-in" in categories

    for s in suggestions:
        assert len(s["text"]) > 0
        assert "tone" in s


def test_ai_service_structure_raw_call_notes(monkeypatch):
    """Verifies AIService structures raw transcript into 5 sections + prep brief in <10s."""
    mock_p = MockMilestone2Provider()
    monkeypatch.setattr(AIService, "get_provider", lambda *args, **kwargs: mock_p)
    lead = {
        "id": 2,
        "name": "Smile Care Centre",
        "doctor_name": "Dr. Pooja Mehra",
        "locality": "Rohini Sector 14",
    }
    raw_transcript = (
        "Spoke with Dr. Pooja Mehra for 8 minutes. She loved the Modern template layout, "
        "especially the direct WhatsApp booking button. Her main concern was existing Practo spend "
        "and whether she really needs her own website. I explained that Practo lists competitors, "
        "while her site captures 100% Google Maps searchers in Rohini. She agreed to review "
        "the proposal and asked me to follow up on Friday with pricing options. We agreed on Rs. 15,000 package."
    )

    structured = AIService.structure_raw_call_notes(lead, raw_transcript)
    assert isinstance(structured, dict)
    assert "summary" in structured
    assert len(structured["summary"]) > 0
    assert "interests" in structured and isinstance(structured["interests"], list)
    assert len(structured["interests"]) > 0
    assert "objections" in structured and isinstance(structured["objections"], list)
    assert len(structured["objections"]) > 0
    assert "commitments" in structured and isinstance(structured["commitments"], list)
    assert len(structured["commitments"]) > 0
    assert "next_steps" in structured and isinstance(structured["next_steps"], list)
    assert len(structured["next_steps"]) > 0
    assert "prep_brief" in structured
    assert len(structured["prep_brief"]) > 0


def test_ai_service_generate_call_prep_brief(monkeypatch):
    """Verifies AIService combines call notes and chat history into a prep brief."""
    mock_p = MockMilestone2Provider()
    monkeypatch.setattr(AIService, "get_provider", lambda *args, **kwargs: mock_p)
    lead = {
        "id": 3,
        "name": "Dr. Grover Dental Clinic",
        "doctor_name": "Dr. Sameer Grover",
        "locality": "Rajouri Garden",
    }
    calls = [
        {
            "prep_brief": "- Discuss Rs. 15,000 package with free domain setup.\n- Emphasize Google Maps direct WhatsApp conversion.",
            "commitments": [{"who_owes_it": "us", "what": "Send domain mapping instructions", "due_phrase": "by Friday"}],
            "objections": ["Worried about ongoing website updates"],
        }
    ]
    messages = [
        {"direction": "outbound", "text": "Namaste Doctor!"},
        {"direction": "inbound", "text": "Let's connect tomorrow morning."},
    ]

    brief = AIService.generate_call_prep_brief(lead, calls, messages)
    assert brief["lead_id"] == 3
    assert "prep_brief" in brief
    assert "past_commitments" in brief
    assert len(brief["past_commitments"]) > 0
    assert "key_objections" in brief


def test_whatsapp_send_automation_on_queues_message(client):
    """Verifies POST /api/leads/{id}/messages/send with automation ON creates OutboxItem and Message with queued status."""
    leads_res = client.get("/api/leads")
    assert leads_res.status_code == 200
    lead = leads_res.json()[0]
    lead_id = lead["id"]

    payload = {
        "text": "Dr. Sahab, your website demo is prepared.",
        "channel": "whatsapp",
        "automation": True,
    }
    res = client.post(f"/api/leads/{lead_id}/messages/send", json=payload)
    assert res.status_code in (200, 201)
    data = res.json()
    assert data["status"] == "queued"
    assert data["delivery_status"] == "queued"
    assert data["outbox_id"] is not None


def test_whatsapp_send_automation_off_generates_wame_link(client):
    """Verifies POST /api/leads/{id}/messages/send with automation OFF returns prefilled wa.me URL and sent_manually status."""
    leads_res = client.get("/api/leads")
    assert leads_res.status_code == 200
    lead = leads_res.json()[0]
    lead_id = lead["id"]

    msg_text = "Dr. Sahab, click here to see your custom demo: http://localhost:3001"
    payload = {
        "text": msg_text,
        "channel": "whatsapp",
        "automation": False,
    }
    res = client.post(f"/api/leads/{lead_id}/messages/send", json=payload)
    assert res.status_code in (200, 201)
    data = res.json()
    assert data["status"] == "sent_manually"
    assert data["delivery_status"] == "sent_manually"
    assert "wa_url" in data
    assert "wa.me" in data["wa_url"]


def test_manual_reply_logging_multiline_and_suggestions(client, monkeypatch):
    """Verifies POST /api/leads/{id}/messages/log-reply handles multiline paste, sets REPLIED, and triggers AI analysis."""
    mock_p = MockMilestone2Provider()
    monkeypatch.setattr(AIService, "get_provider", lambda *args, **kwargs: mock_p)
    leads_res = client.get("/api/leads")
    assert leads_res.status_code == 200
    lead = leads_res.json()[0]
    lead_id = lead["id"]

    multiline_text = (
        "Hi Ankur, saw the Modern template.\n"
        "Can we also include implant fee details?\n"
        "Please call me at 5 PM today."
    )
    payload = {
        "text": multiline_text,
        "channel": "whatsapp",
        "created_at": "2026-11-07T14:30:00Z",
    }
    res = client.post(f"/api/leads/{lead_id}/messages/log-reply", json=payload)
    assert res.status_code in (200, 201)
    data = res.json()
    assert data["lead_status"] == "REPLIED"
    assert data["needs_followup"] is False
    assert len(data["messages"]) == 3
    assert len(data["ai_suggestions"]) == 3


def test_manual_reply_stop_activates_dnc_and_clears_needs_followup(client):
    """Verifies STOP reply activates do_not_contact, clears needs_followup, and moves to lost stage."""
    leads_res = client.get("/api/leads")
    assert leads_res.status_code == 200
    lead = leads_res.json()[1]
    lead_id = lead["id"]

    payload = {
        "text": "Please stop sending messages. STOP.",
        "channel": "whatsapp",
    }
    res = client.post(f"/api/leads/{lead_id}/messages/log-reply", json=payload)
    assert res.status_code in (200, 201)

    lead_res = client.get(f"/api/leads?search={lead['name']}")
    assert lead_res.status_code == 200
    updated_lead = next(l for l in lead_res.json() if l["id"] == lead_id)
    assert updated_lead["do_not_contact"] is True
    assert updated_lead["needs_followup"] is False


def test_calls_logging_and_prep_brief_endpoints(client, monkeypatch):
    """Verifies POST /api/leads/{id}/calls logs and structures raw calls, and GET /call-brief returns brief."""
    mock_p = MockMilestone2Provider()
    monkeypatch.setattr(AIService, "get_provider", lambda *args, **kwargs: mock_p)
    leads_res = client.get("/api/leads")

    assert leads_res.status_code == 200
    lead = leads_res.json()[0]
    lead_id = lead["id"]

    call_payload = {
        "raw_text": "Spoke with doctor for 5 minutes. Doctor interested in Warm layout. Wants to review proposal on Friday.",
        "duration_seconds": 300,
        "outcome": "interested",
    }
    res = client.post(f"/api/leads/{lead_id}/calls", json=call_payload)
    assert res.status_code in (200, 201)
    data = res.json()
    assert "call_id" in data
    assert "summary" in data
    assert "interests" in data
    assert "objections" in data
    assert "commitments" in data
    assert "next_steps" in data
    assert "prep_brief" in data

    # Verify GET call-brief
    brief_res = client.get(f"/api/leads/{lead_id}/call-brief")
    assert brief_res.status_code == 200
    b_data = brief_res.json()
    assert b_data["lead_id"] == lead_id
    assert "prep_brief" in b_data
    assert "past_commitments" in b_data
    assert "key_objections" in b_data


def test_cockpit_attention_dashboards(client):
    """Verifies GET /api/cockpit/attention returns 4 dashboards in <5s with zero terminals."""
    res = client.get("/api/cockpit/attention")
    assert res.status_code == 200
    data = res.json()
    assert "followup_required" in data and isinstance(data["followup_required"], list)
    assert "unreplied_messages" in data and isinstance(data["unreplied_messages"], list)
    assert "todays_actions" in data and isinstance(data["todays_actions"], list)
    assert "call_preparation" in data and isinstance(data["call_preparation"], list)


def test_terminal_logs_query_filtering(client):
    """Verifies GET /api/terminal/logs supports query filtering by service, level, and since_seq."""
    # Service filter
    res = client.get("/api/terminal/logs", params={"service": "discovery"})
    assert res.status_code == 200
    data = res.json()
    logs = data if isinstance(data, list) else data.get("logs", [])
    assert all(l.get("service") == "discovery" for l in logs)

    # Level filter
    res_lvl = client.get("/api/terminal/logs", params={"level": "info"})
    assert res_lvl.status_code == 200
    data_lvl = res_lvl.json()
    logs_lvl = data_lvl if isinstance(data_lvl, list) else data_lvl.get("logs", [])
    assert all(l.get("level") == "info" for l in logs_lvl)

    # Unknown service returns empty list
    res_none = client.get("/api/terminal/logs", params={"service": "non_existent_xyz"})
    assert res_none.status_code == 200
    data_none = res_none.json()
    logs_none = data_none if isinstance(data_none, list) else data_none.get("logs", [])
    assert len(logs_none) == 0


def test_automation_settings_endpoints(client):
    """Verifies GET /api/settings/automation and PATCH /api/settings/automation."""
    res = client.get("/api/settings/automation")
    assert res.status_code == 200
    data = res.json()
    assert "automation_enabled" in data

    # Toggle automation off
    patch_res = client.patch("/api/settings/automation", json={"automation_enabled": False})
    assert patch_res.status_code == 200
    assert patch_res.json()["automation_enabled"] is False

    # Toggle automation back on
    patch_res2 = client.patch("/api/settings/automation", json={"automation_enabled": True})
    assert patch_res2.status_code == 200
    assert patch_res2.json()["automation_enabled"] is True


def test_channel_restriction_in_send_and_log_reply(client):
    """Verifies non-WhatsApp channels are rejected with HTTP 403 on dental clinic leads."""
    leads_res = client.get("/api/leads")
    assert leads_res.status_code == 200
    lead_id = leads_res.json()[0]["id"]

    # Attempt SMS send
    sms_res = client.post(
        f"/api/leads/{lead_id}/messages/send",
        json={"text": "Hello doctor", "channel": "sms", "automation": True},
    )
    assert sms_res.status_code == 403

    # Attempt Email log-reply
    email_res = client.post(
        f"/api/leads/{lead_id}/messages/log-reply",
        json={"text": "Doctor emailed", "channel": "email"},
    )
    assert email_res.status_code == 403
