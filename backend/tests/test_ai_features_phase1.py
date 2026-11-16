import pytest
from app.core.exceptions import AINotConfiguredError, AIProviderError
from app.services.ai_service import AIService, LocalCLIProvider, GeminiProvider, GroqProvider, LLMProvider


class MockTestProvider(LLMProvider):
    """Mock LLMProvider for fast, deterministic unit test verification."""

    def generate_json(self, prompt: str, json_schema=None, timeout_seconds: float = 30.0):
        if "reply" in prompt.lower() or "suggestions" in prompt.lower():
            return {
                "suggestions": [
                    {"category": "Direct Answer", "text": "Direct test answer.", "tone": "professional"},
                    {"category": "Value Reframe", "text": "Value reframe test text.", "tone": "consultative"},
                    {"category": "Quick OPD Check-in", "text": "Quick OPD check-in test.", "tone": "polite_brief"},
                ]
            }
        elif "transcript" in prompt.lower() or "structuring" in prompt.lower():
            return {
                "summary": "Doctor interested in website demo.",
                "interests": ["Direct WhatsApp booking"],
                "objections": ["Existing Practo subscription"],
                "commitments": [{"who_owes_it": "us", "what": "Send proposal", "due_phrase": "by Friday"}],
                "next_steps": ["Send WhatsApp proposal"],
                "prep_brief": "Review proposal with doctor.",
            }
        elif "prep brief" in prompt.lower():
            return {
                "prep_brief": "Focus on Google Maps conversion and direct booking.",
                "past_commitments": [{"who_owes_it": "us", "what": "Send proposal", "due_phrase": "by Friday"}],
                "key_objections": ["Worried about updates"],
            }
        return {"status": "ok"}

    def test_connection(self):
        return {"ok": True, "provider": "mock", "message": "Mock provider connected."}


def test_ai_service_zero_fallback_when_not_configured(monkeypatch):
    """Verifies that AIService raises AINotConfiguredError when no key/provider exists."""
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    # Force provider mode to gemini without a key
    with pytest.raises(AINotConfiguredError) as exc_info:
        AIService.get_provider(force_provider="gemini")
    assert exc_info.value.status_code == 503
    assert exc_info.value.error_code == "ai_not_configured"


def test_ai_service_generate_reply_suggestions_with_provider():
    """Verifies AIService returns structured reply suggestions without silent fallback."""
    mock_p = MockTestProvider()
    lead = {"id": 1, "name": "Apex Dental", "doctor_name": "Dr. Rohit Batra", "locality": "Dwarka"}
    messages = [{"direction": "inbound", "text": "Pricing?"}]

    suggestions = AIService.generate_reply_suggestions(lead, messages, provider=mock_p)
    assert len(suggestions) == 3
    assert suggestions[0]["category"] == "Direct Answer"
    assert suggestions[1]["category"] == "Value Reframe"
    assert suggestions[2]["category"] == "Quick OPD Check-in"


def test_ai_service_structure_raw_call_notes_with_provider():
    """Verifies call notes structuring returns the 5 required sections + prep brief."""
    mock_p = MockTestProvider()
    lead = {"id": 2, "name": "Smile Clinic", "doctor_name": "Dr. Mehra", "locality": "Rohini"}
    structured = AIService.structure_raw_call_notes(lead, "Spoke with Dr. Mehra.", provider=mock_p)
    assert "summary" in structured
    assert "interests" in structured
    assert "objections" in structured
    assert "commitments" in structured
    assert "next_steps" in structured
    assert "prep_brief" in structured


def test_ai_settings_endpoints(client):
    """Verifies GET /api/settings/ai, PATCH /api/settings/ai, and POST /api/ai/test."""
    # 1. GET settings returns masked keys
    res = client.get("/api/settings/ai")
    assert res.status_code == 200
    data = res.json()
    assert "provider" in data
    assert "has_gemini_key" in data
    assert "has_groq_key" in data
    assert "has_local_cli" in data

    # 2. PATCH settings updates provider and masked key
    patch_res = client.patch(
        "/api/settings/ai",
        json={"provider": "gemini", "gemini_api_key": "AIzaSyTestKey1234567890"},
    )
    assert patch_res.status_code == 200
    pdata = patch_res.json()
    assert pdata["provider"] == "gemini"
    assert pdata["has_gemini_key"] is True
    assert pdata["gemini_api_key"].startswith("AIza")
    assert "••••" in pdata["gemini_api_key"]

    # 3. Test connection endpoint with invalid key returns structured error (503)
    test_res = client.post("/api/ai/test", json={"provider": "gemini", "api_key": "invalid_key"})
    assert test_res.status_code == 503
    tdata = test_res.json()
    assert tdata["error"]["code"] in ("ai_provider_error", "ai_not_configured")


def test_reply_suggestions_endpoint_no_fallback(client, monkeypatch):
    """Verifies /api/leads/{id}/reply-suggestions returns 503 ai_not_configured when unconfigured."""
    leads_res = client.get("/api/leads")
    assert leads_res.status_code == 200
    leads = leads_res.json()
    if not leads:
        pytest.skip("No leads available in test DB")
    lead_id = leads[0]["id"]

    # Mock AIService.get_provider to raise AINotConfiguredError
    def mock_raise(*args, **kwargs):
        raise AINotConfiguredError("No AI provider configured.")

    monkeypatch.setattr(AIService, "get_provider", mock_raise)

    res = client.get(f"/api/leads/{lead_id}/reply-suggestions")
    assert res.status_code == 503
    err_data = res.json()
    assert err_data["error"]["code"] == "ai_not_configured"


def test_call_brief_endpoint_no_fallback(client, monkeypatch):
    """Verifies /api/leads/{id}/call-brief returns 503 ai_not_configured when unconfigured."""
    leads_res = client.get("/api/leads")
    assert leads_res.status_code == 200
    leads = leads_res.json()
    if not leads:
        pytest.skip("No leads available in test DB")
    lead_id = leads[0]["id"]

    def mock_raise(*args, **kwargs):
        raise AINotConfiguredError("No AI provider configured.")

    monkeypatch.setattr(AIService, "get_provider", mock_raise)

    res = client.get(f"/api/leads/{lead_id}/call-brief")
    assert res.status_code == 503
    err_data = res.json()
    assert err_data["error"]["code"] == "ai_not_configured"
