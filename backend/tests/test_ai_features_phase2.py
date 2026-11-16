import pytest
from app.models.entities import Lead, Message, Call
from app.services.ai_service import AIService, LLMProvider
from app.services.call_service import CallService


class MockPhase2Provider(LLMProvider):
    def __init__(self):
        self.last_prompt = ""

    def generate_json(self, prompt: str, json_schema=None, timeout_seconds: float = 30.0):
        self.last_prompt = prompt
        if "tailored first-time discovery call script" in prompt:
            return {
                "prep_brief": "1) Warm discovery opener acknowledging OPD hours.\n2) Hook on patient acquisition.\n3) 2-minute demo offer.",
                "past_commitments": [],
                "key_objections": ["Already on Practo", "Busy in OPD"],
            }
        elif "ongoing pre-call follow-up brief" in prompt:
            return {
                "prep_brief": "1) Follow up on demo feedback.\n2) Clarify Rs. 15k payment terms.",
                "past_commitments": [{"who_owes_it": "us", "what": "Send brochure", "due_phrase": "tomorrow"}],
                "key_objections": ["Pricing concern"],
            }
        elif "suggestions" in prompt.lower() or "reply" in prompt.lower():
            return {
                "suggestions": [
                    {"category": "Direct Answer", "text": "We handle all domain setup directly.", "tone": "professional"},
                    {"category": "Value Reframe", "text": "Own your patients with zero commissions.", "tone": "consultative"},
                    {"category": "Quick OPD Check-in", "text": "Sending a 60-second video demo.", "tone": "polite_brief"},
                ]
            }
        return {}

    def test_connection(self):
        return {"status": "ok", "provider": "mock_phase2"}


def test_reply_suggestions_includes_chronological_thread_context():
    """Verifies generate_reply_suggestions formats recent messages chronologically with role/timestamp."""
    lead = {
        "id": 101,
        "name": "Apex Dental Clinic",
        "doctor_name": "Dr. Sharma",
        "locality": "Rohini",
    }
    messages = [
        {"created_at": "2026-11-15T10:00:00Z", "direction": "outbound", "text": "Hello Dr. Sharma, shared your demo."},
        {"created_at": "2026-11-15T12:00:00Z", "direction": "inbound", "text": "Looks good, does it support WhatsApp bookings?"},
        {"created_at": "2026-11-15T12:05:00Z", "direction": "outbound", "text": "Yes, instant WhatsApp OPD integration."},
        {"created_at": "2026-11-15T14:30:00Z", "direction": "inbound", "text": "What is the total setup cost?"},
    ]

    mock_p = MockPhase2Provider()
    suggestions = AIService.generate_reply_suggestions(lead, messages, provider=mock_p)

    assert len(suggestions) == 3
    assert "Apex Dental Clinic" in mock_p.last_prompt
    assert "Dr. Sharma" in mock_p.last_prompt
    # Verify chronological messages rendered
    assert "[2026-11-15T10:00:00Z] Firstmate/Outreach: Hello Dr. Sharma" in mock_p.last_prompt
    assert "[2026-11-15T14:30:00Z] Lead/Doctor: What is the total setup cost?" in mock_p.last_prompt
    assert "Latest Inbound Reply From Doctor: 'What is the total setup cost?'" in mock_p.last_prompt


def test_call_brief_first_time_discovery_script_when_no_calls():
    """Verifies generate_call_prep_brief generates a tailored discovery script when 0 past calls exist."""
    lead = {
        "id": 102,
        "name": "Clove Dental Care",
        "doctor_name": "Dr. Verma",
        "locality": "Dwarka",
    }
    mock_p = MockPhase2Provider()
    brief = AIService.generate_call_prep_brief(lead, calls=[], messages=[], provider=mock_p)

    assert brief["lead_id"] == 102
    assert "Warm discovery opener" in brief["prep_brief"]
    assert "tailored first-time discovery call script" in mock_p.last_prompt
    assert "There are no prior phone calls logged" in mock_p.last_prompt


def test_call_brief_ongoing_history_when_calls_exist():
    """Verifies generate_call_prep_brief summarizes past calls chronologically for ongoing follow-up."""
    lead = {
        "id": 103,
        "name": "Smile Studio",
        "doctor_name": "Dr. Kapoor",
        "locality": "Saket",
    }
    calls = [
        {
            "created_at": "2026-11-10T11:00:00Z",
            "outcome": "connected",
            "summary": "Doctor requested pricing details and walkthrough.",
            "commitments": [{"who_owes_it": "us", "what": "Send brochure", "due_phrase": "tomorrow"}],
            "objections": ["Pricing concern"],
        },
        {
            "created_at": "2026-11-12T15:00:00Z",
            "outcome": "connected",
            "summary": "Doctor reviewed demo, asked about timeline.",
            "commitments": [],
            "objections": [],
        },
    ]
    mock_p = MockPhase2Provider()
    brief = AIService.generate_call_prep_brief(lead, calls=calls, messages=[], provider=mock_p)

    assert brief["lead_id"] == 103
    assert "ongoing pre-call follow-up brief" in mock_p.last_prompt
    assert "Call #1 (2026-11-10T11:00:00Z, outcome: connected)" in mock_p.last_prompt
    assert "Call #2 (2026-11-12T15:00:00Z, outcome: connected)" in mock_p.last_prompt
    assert "Pricing concern" in mock_p.last_prompt


def test_call_brief_caching_and_invalidation(client, monkeypatch):
    """Verifies call brief is cached per lead in DB and invalidated when a new call is logged."""
    # Find test lead via client
    leads_res = client.get("/api/leads")
    assert leads_res.status_code == 200
    leads = leads_res.json()
    if not leads:
        pytest.skip("No leads in test DB")
    lead_id = leads[0]["id"]

    mock_p = MockPhase2Provider()
    monkeypatch.setattr(AIService, "get_provider", lambda db=None: mock_p)
    monkeypatch.setattr(
        AIService,
        "structure_raw_call_notes",
        lambda l, raw, db=None, provider=None: {
            "summary": "Structured call note test",
            "interests": ["WhatsApp booking"],
            "objections": [],
            "commitments": [],
            "next_steps": ["Follow up next week"],
            "prep_brief": "Review contract",
        },
    )

    # 1. Fetch initial brief (should compute and cache in custom_fields)
    res1 = client.get(f"/api/leads/{lead_id}/call-brief?force_regenerate=true")
    assert res1.status_code == 200
    brief1 = res1.json()
    assert brief1["prep_brief"] != ""

    # 2. Subsequent call without force_regenerate returns cached without invoking LLM
    mock_p.last_prompt = ""
    res2 = client.get(f"/api/leads/{lead_id}/call-brief")
    assert res2.status_code == 200
    brief2 = res2.json()
    assert brief2["prep_brief"] == brief1["prep_brief"]
    assert mock_p.last_prompt == ""  # No AI prompt was fired!

    # 3. Logging a new call invalidates cached_call_brief
    call_payload = {
        "raw_text": "Spoke with doctor. Agreed to proceed with demo.",
        "duration_seconds": 120,
        "outcome": "connected"
    }
    log_res = client.post(f"/api/leads/{lead_id}/calls", json=call_payload)
    assert log_res.status_code == 201

    # 4. Next brief fetch should re-trigger LLM (prompt fired) because cache was invalidated
    mock_p.last_prompt = ""
    res3 = client.get(f"/api/leads/{lead_id}/call-brief")
    assert res3.status_code == 200
    assert mock_p.last_prompt != ""  # Prompt was fired again!


def test_get_lead_calls_endpoint(client, monkeypatch):
    """Verifies GET /api/leads/{lead_id}/calls returns list of calls in expected order, and 404 for unknown lead."""
    leads_res = client.get("/api/leads")
    assert leads_res.status_code == 200
    leads = leads_res.json()
    if not leads:
        pytest.skip("No leads in test DB")
    lead_id = leads[0]["id"]

    # 1. 404 for non-existent lead
    res_404 = client.get("/api/leads/999999/calls")
    assert res_404.status_code == 404

    # 2. Mock AI call structuring for posting calls
    monkeypatch.setattr(
        AIService,
        "structure_raw_call_notes",
        lambda l, raw, db=None, provider=None: {
            "summary": "Call summary for testing",
            "interests": [],
            "objections": [],
            "commitments": [],
            "next_steps": [],
            "prep_brief": "Prep brief",
        },
    )

    # 3. Log two calls
    client.post(
        f"/api/leads/{lead_id}/calls",
        json={"raw_text": "First test call", "duration_seconds": 60, "outcome": "completed"},
    )
    client.post(
        f"/api/leads/{lead_id}/calls",
        json={"raw_text": "Second test call", "duration_seconds": 90, "outcome": "completed"},
    )

    # 4. GET /api/leads/{lead_id}/calls
    res = client.get(f"/api/leads/{lead_id}/calls")
    assert res.status_code == 200
    calls_data = res.json()
    assert isinstance(calls_data, list)
    assert len(calls_data) >= 2
    # Verify shape
    first_call = calls_data[0]
    assert "id" in first_call
    assert "call_id" in first_call
    assert "raw_text" in first_call
    assert "summary" in first_call
    assert "duration_seconds" in first_call
    assert "outcome" in first_call
    assert "created_at" in first_call
    # Most recent call first (Second test call)
    assert calls_data[0]["raw_text"] == "Second test call"


