import pytest
from app.core.exceptions import AINotConfiguredError
from app.models.entities import Lead, Stage
from app.services.agent_tools import AgentTools
from app.services.ai_service import AIService, LLMProvider


class MockAskDoProvider(LLMProvider):
    def __init__(self, answer="Grounded answer", tool_calls=None, synthesis_answer=None):
        self.answer = answer
        self.tool_calls = tool_calls or []
        self.synthesis_answer = synthesis_answer
        self.prompts = []

    def generate_json(self, prompt: str, json_schema=None, timeout_seconds: float = 30.0):
        self.prompts.append(prompt)
        # If this is Turn 2 synthesis call
        if "The following tools were executed with real CRM data:" in prompt and self.synthesis_answer:
            return {"answer": self.synthesis_answer}
        return {
            "answer": self.answer,
            "tool_calls": self.tool_calls,
        }

    def test_connection(self):
        return {"status": "ok", "provider": "mock_ask_do"}


def test_agent_tools_search_and_crm_stats(client):
    """Verifies typed tools search_leads and query_crm_stats."""
    db = client.get_db_session()
    try:
        found = AgentTools.search_leads(db, query="Dental", limit=3)
        assert isinstance(found, list)

        # 2. Test query_crm_stats
        stats = AgentTools.query_crm_stats(db, hustle_id=1)
        assert "total_active_leads" in stats
        assert "stage_breakdown" in stats
        assert "ready_packages" in stats
    finally:
        db.close()


def test_agent_tools_move_lead_stage(client):
    """Verifies typed tool move_lead_stage changes stage and status."""
    db = client.get_db_session()
    try:
        lead = db.query(Lead).filter(Lead.is_archived == False).first()
        if not lead:
            pytest.skip("No leads in DB")
        lead_id = lead.id

        stages = db.query(Stage).filter(Stage.hustle_id == lead.hustle_id).all()
        target_stage = stages[0].name if stages else "Contacted"

        # Test normal name
        res = AgentTools.move_lead_stage(db, lead_id=lead_id, target_stage=target_stage)
        assert res["success"] is True
        assert res["lead_id"] == lead_id

        # Test alias and normalization (e.g. '7. Won (Client)', 'WON_CLIENT')
        res_won = AgentTools.move_lead_stage(db, lead_id=lead_id, target_stage="WON_CLIENT")
        assert res_won["success"] is True
        assert "Won" in res_won["new_stage"]

        db.refresh(lead)
        assert "Won" in lead.stage_rel.name
    finally:
        db.close()


def test_agent_tools_draft_or_send_message_confirmation_gate(client):
    """Verifies external send requires confirmation (draft first, send on confirmed=True)."""
    db = client.get_db_session()
    try:
        lead = db.query(Lead).filter(Lead.do_not_contact == False, Lead.is_archived == False).first()
        if not lead:
            pytest.skip("No contactable leads in DB")
        lead_id = lead.id

        # 1. Unconfirmed -> returns pending confirmation payload, DOES NOT SEND
        draft = AgentTools.draft_or_send_message(
            db,
            lead_id=lead_id,
            text="Hello Doctor, sharing custom website preview.",
            channel="whatsapp",
            confirmed=False,
        )
        assert draft["requires_confirmation"] is True
        assert draft["status"] == "pending_confirmation"
        assert draft["draft_text"] == "Hello Doctor, sharing custom website preview."

        # 2. Confirmed -> sends immediately via outbox
        sent = AgentTools.draft_or_send_message(
            db,
            lead_id=lead_id,
            text="Hello Doctor, sharing custom website preview.",
            channel="whatsapp",
            confirmed=True,
        )
        assert sent["requires_confirmation"] is False
        assert sent["status"] == "sent"
    finally:
        db.close()


def test_ask_do_endpoint_agentic_loop_and_citations(client, monkeypatch):
    """Verifies /api/assistant/ask-do retrieves context and executes tool calls."""
    leads_res = client.get("/api/leads")
    leads = leads_res.json()
    if not leads:
        pytest.skip("No leads in DB")
    lead_id = leads[0]["id"]

    mock_provider = MockAskDoProvider(
        answer="I will retrieve the current count of leads and their distribution across stages from the CRM.",
        tool_calls=[
            {"name": "move_lead_stage", "arguments": {"lead_id": lead_id, "target_stage": "replied"}},
            {"name": "query_crm_stats", "arguments": {}},
        ],
        synthesis_answer="You currently have 15 active leads across all stages, including 4 contacted and 2 replied.",
    )
    monkeypatch.setattr(AIService, "get_provider", lambda db=None: mock_provider)

    res = client.post(
        "/api/assistant/ask-do",
        json={"mode": "do", "prompt": f"Move lead #{lead_id} to replied", "hustle_id": 1},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["mode"] == "do"
    assert "15 active leads" in data["reply"]
    assert "I will retrieve" not in data["reply"]
    assert "citations" in data
    assert len(data["executed_actions"]) >= 2
    assert any(act.get("tool") == "move_lead_stage" for act in data["executed_actions"])


def test_ask_do_plain_text_synthesis_and_tool_confirmation(client, monkeypatch):
    """Verifies Turn 2 extracts plain text (never raw JSON string) and confirms actions."""
    leads_res = client.get("/api/leads")
    leads = leads_res.json()
    if not leads:
        pytest.skip("No leads in DB")
    lead_id = leads[0]["id"]

    # Test raw JSON string returned by LLM in Turn 2
    mock_provider = MockAskDoProvider(
        answer='{"answer": "Logged the call successfully."}',
        tool_calls=[
            {"name": "log_call", "arguments": {"lead_id": lead_id, "raw_text": "Doctor interested in pricing", "outcome": "interested"}},
        ],
        synthesis_answer='{"answer": "Successfully logged call for Dr. Sharma noting interest in pricing."}',
    )
    monkeypatch.setattr(AIService, "get_provider", lambda db=None: mock_provider)

    res = client.post(
        "/api/assistant/ask-do",
        json={"prompt": f"Log call for lead #{lead_id}", "hustle_id": 1},
    )
    assert res.status_code == 200
    data = res.json()
    assert not data["reply"].startswith("{")
    assert not data["reply"].endswith("}")
    assert "Successfully logged call" in data["reply"]
    assert any(act.get("tool") == "log_call" for act in data["executed_actions"])


def test_ask_do_endpoint_zero_fallback_503(client, monkeypatch):
    """Verifies /api/assistant/ask-do returns 503 ai_not_configured when unconfigured."""
    def mock_raise(*args, **kwargs):
        raise AINotConfiguredError("No AI provider configured.")

    monkeypatch.setattr(AIService, "get_provider", mock_raise)

    res = client.post(
        "/api/assistant/ask-do",
        json={"mode": "ask", "prompt": "Who are my hottest leads?", "hustle_id": 1},
    )
    assert res.status_code == 503
    err_data = res.json()
    assert err_data["error"]["code"] == "ai_not_configured"
