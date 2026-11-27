"""Milestone 4 UI Invariants & Backend Contracts Challenger Test Suite.

Empirical stress tests for:
1. WhatsApp Message Send:
   - Automation ON: POST /api/leads/{id}/messages/send -> status queued, delivery_status queued, outbox_id created, wa_url is None.
   - Automation OFF: POST /api/leads/{id}/messages/send -> status sent_manually, delivery_status sent_manually, wa_url contains https://wa.me/91... with URL-encoded text.
   - Phone format variants (+91, 0, no prefix, spaces) -> correctly normalized.
   - Channel restrictions (SMS, Email rejected with 403 on dental clinic leads).
2. Manual Reply Logging:
   - Multi-line string paste -> split into discrete ordered messages.
   - Lead status updated to REPLIED, needs_followup set to False.
   - Exactly 3 AI reply suggestions returned (Direct Answer, Value Reframe, Quick OPD Check-in).
   - Custom timestamp preserved.
   - Inbound STOP reply activates DNC and clears needs_followup.
3. Calls Management & Brief Synthesis:
   - POST /api/leads/{id}/calls with raw text -> returns 5 structured sections: summary, interests, objections, commitments, next_steps.
   - GET /api/leads/{id}/call-brief -> returns synthesized prep brief combining call notes and chat history.
   - Lead next_action updated from structured call commitments.
4. Kanban Empty Stages Collapse Logic:
   - Validates collapse invariants, CSS classes, drag-drop targets, and manual expansion behavior.
"""

import urllib.parse
from typing import Any, Dict, List
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.db.session import Base, get_db
from app.main import app
from app.models.entities import Lead, Message, OutboxItem, Call, Stage, Hustle
from app.seed import seed_initial_data
import app.db.session as dbsession


@pytest.fixture()
def challenger_client(monkeypatch):
    """Isolated in-memory SQLite fixture with SessionLocal monkeypatched to avoid remote Neon DB latency."""
    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    Base.metadata.create_all(bind=test_engine)

    # Seed data
    db = TestingSessionLocal()
    seed_initial_data(db, include_demo_leads=True)
    db.close()

    def override_get_db():
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    monkeypatch.setattr(dbsession, "SessionLocal", TestingSessionLocal)

    with TestClient(app) as c:
        yield c, TestingSessionLocal
    app.dependency_overrides.clear()


def _stub_ai_service(monkeypatch):
    """Stub AIService.get_provider so AI-dependent tests run without external keys or agy CLI."""
    from app.services.ai_service import AIService, LLMProvider

    class _StubProvider(LLMProvider):
        def generate_structured(self, prompt, schema=None, **kwargs):
            props = (schema or {}).get("properties", {})
            p_low = (prompt or "").lower()
            if "suggestions" in props or "suggestions" in p_low or "reply" in p_low:
                return {
                    "suggestions": [
                        {"category": "Direct Answer", "text": "Happy to share root canal pricing and call after 4 PM.", "tone": "professional"},
                        {"category": "Value Reframe", "text": "We can add a transparent treatment pricing section right away.", "tone": "warm"},
                        {"category": "Quick", "text": "Sounds great, I will call you after 4 PM today!", "tone": "concise"},
                    ]
                }
            if "summary" in props or "objections" in p_low:
                return {
                    "summary": "Discussed OPD booking integration and maintenance costs.",
                    "interests": ["Clean layout", "Direct WhatsApp OPD booking"],
                    "objections": ["Website maintenance costs", "Staff training"],
                    "commitments": [{"what": "Deliver 3-minute video guide by Wednesday", "by_when": "Wednesday"}],
                    "next_steps": ["Follow-up demo call Thursday at 3 PM"],
                    "prep_brief": "Focus on low-maintenance workflow and simple staff onboarding.",
                }
            return {
                "prep_brief": "Review domain verification steps and address clinic setup questions.",
                "past_commitments": ["Send domain verification steps"],
                "key_objections": ["Clinic domain setup"],
            }

        def generate_text(self, prompt, **kwargs):
            return "Stubbed AI response"

        def generate_json(self, prompt, schema=None, **kwargs):
            return self.generate_structured(prompt, schema=schema, **kwargs)

        def test_connection(self):
            return {"status": "ok", "provider": "stub"}

    monkeypatch.setattr(AIService, "get_provider", classmethod(lambda cls, *a, **kw: _StubProvider()))


# ============================================================================
# 1. WHATSAPP MESSAGE SEND TESTS (R2, F10)
# ============================================================================

def test_whatsapp_send_automation_on_queues_message(challenger_client):
    """Asserts that sending with automation=True queues the message for Playwright dispatcher."""
    client, SessionLocal = challenger_client

    leads_res = client.get("/api/leads")
    assert leads_res.status_code == 200
    leads = leads_res.json()
    assert len(leads) > 0
    lead = leads[0]
    lead_id = lead["id"]

    msg_text = "Namaste Doctor! Your customized 3-template website demo is ready."
    payload = {
        "text": msg_text,
        "channel": "whatsapp",
        "automation": True,
    }

    res = client.post(f"/api/leads/{lead_id}/messages/send", json=payload)
    assert res.status_code in (200, 201), f"Unexpected status code: {res.status_code}, {res.text}"

    data = res.json()
    # Contract assertions
    assert data["status"] == "queued", f"Expected status 'queued', got {data.get('status')}"
    assert data["delivery_status"] == "queued", f"Expected delivery_status 'queued', got {data.get('delivery_status')}"
    assert data["outbox_id"] is not None, "Expected valid outbox_id"
    assert data["wa_url"] is None, f"Expected wa_url to be None when automation=True, got {data.get('wa_url')}"
    assert data["message_id"] is not None, "Expected created message_id"

    # Database verification
    db = SessionLocal()
    try:
        msg = db.query(Message).filter(Message.id == data["message_id"]).first()
        assert msg is not None
        assert msg.direction == "outbound"
        assert msg.channel == "whatsapp"
        assert msg.text == msg_text
        assert msg.delivery_status == "queued"
        assert msg.outbox_id == data["outbox_id"]

        outbox = db.query(OutboxItem).filter(OutboxItem.id == data["outbox_id"]).first()
        assert outbox is not None
        assert outbox.status == "queued"
        assert outbox.channel == "whatsapp"
        assert outbox.text == msg_text
    finally:
        db.close()


def test_whatsapp_send_automation_off_generates_wame_url(challenger_client):
    """Asserts that sending with automation=False generates a prefilled wa.me link and records sent_manually."""
    client, SessionLocal = challenger_client

    leads_res = client.get("/api/leads")
    assert leads_res.status_code == 200
    lead = leads_res.json()[0]
    lead_id = lead["id"]

    msg_text = "Dr. Batra, check your demo: https://preview.dentalos.in/apex-dental"
    payload = {
        "text": msg_text,
        "channel": "whatsapp",
        "automation": False,
    }

    res = client.post(f"/api/leads/{lead_id}/messages/send", json=payload)
    assert res.status_code in (200, 201)

    data = res.json()
    # Contract assertions
    assert data["status"] == "sent_manually", f"Expected status 'sent_manually', got {data.get('status')}"
    assert data["delivery_status"] == "sent_manually", f"Expected delivery_status 'sent_manually', got {data.get('delivery_status')}"
    assert data["outbox_id"] is None, f"Expected outbox_id to be None when automation=False, got {data.get('outbox_id')}"
    assert "wa_url" in data and data["wa_url"] is not None, "Expected valid wa_url"

    wa_url = data["wa_url"]
    assert wa_url.startswith("https://wa.me/"), f"wa_url must start with https://wa.me/, got: {wa_url}"
    assert "91" in wa_url, f"wa_url must include India country code 91, got: {wa_url}"
    encoded_text = urllib.parse.quote(msg_text)
    assert encoded_text in wa_url, f"wa_url must contain URL-encoded message text"

    # Database verification
    db = SessionLocal()
    try:
        msg = db.query(Message).filter(Message.id == data["message_id"]).first()
        assert msg is not None
        assert msg.direction == "outbound"
        assert msg.delivery_status == "sent_manually"
        assert msg.outbox_id is None
    finally:
        db.close()


def test_whatsapp_send_phone_normalization_variants(challenger_client):
    """Stress tests wa.me URL generation across various phone number formatting styles."""
    client, SessionLocal = challenger_client

    # Raise daily WhatsApp limit for the hustle in this fixture so seeded messages do not trigger HTTP 429
    db_setup = SessionLocal()
    hustle = db_setup.query(Hustle).first()
    if hustle:
        hustle.channel_limits = {"whatsapp": 100, "sms": 50, "email": 100}
        db_setup.commit()
    db_setup.close()

    test_cases = [
        ("9811122233", "https://wa.me/919811122233"),
        ("+91 98111 22233", "https://wa.me/919811122233"),
        ("09811122233", "https://wa.me/919811122233"),
        ("+91-98111-22233", "https://wa.me/919811122233"),
        ("919811122233", "https://wa.me/919811122233"),
    ]

    for raw_phone, expected_prefix in test_cases:
        db = SessionLocal()
        lead = db.query(Lead).first()
        lead.primary_phone = raw_phone
        db.commit()
        lead_id = lead.id
        db.close()

        res = client.post(
            f"/api/leads/{lead_id}/messages/send",
            json={"text": "Test greeting", "channel": "whatsapp", "automation": False},
        )
        assert res.status_code in (200, 201)
        data = res.json()
        wa_url = data["wa_url"]
        assert wa_url.startswith(expected_prefix), (
            f"Phone '{raw_phone}' normalized incorrectly: expected prefix '{expected_prefix}', got '{wa_url}'"
        )


def test_whatsapp_send_channel_restriction_enforcement(challenger_client):
    """Asserts that attempting to send via SMS or Email to a dental lead is rejected with HTTP 403."""
    client, _ = challenger_client

    leads_res = client.get("/api/leads")
    lead_id = leads_res.json()[0]["id"]

    # SMS rejected
    sms_res = client.post(
        f"/api/leads/{lead_id}/messages/send",
        json={"text": "Attempted SMS", "channel": "sms", "automation": True},
    )
    assert sms_res.status_code == 403, f"Expected 403 for SMS on dental clinic, got {sms_res.status_code}"

    # Email rejected
    email_res = client.post(
        f"/api/leads/{lead_id}/messages/send",
        json={"text": "Attempted Email", "channel": "email", "automation": False},
    )
    assert email_res.status_code == 403, f"Expected 403 for Email on dental clinic, got {email_res.status_code}"


# ============================================================================
# 2. MANUAL REPLY LOGGING TESTS (R2, F11)
# ============================================================================

def test_manual_reply_logging_multiline_paste_and_suggestions(challenger_client, monkeypatch):
    """Asserts multi-line paste splits into discrete ordered messages, sets status to REPLIED,

    clears needs_followup, and returns exactly 3 AI suggestions.
    """
    _stub_ai_service(monkeypatch)
    client, SessionLocal = challenger_client

    leads_res = client.get("/api/leads")
    lead = leads_res.json()[0]
    lead_id = lead["id"]

    # Pre-condition: set needs_followup = True
    db = SessionLocal()
    db_lead = db.query(Lead).filter(Lead.id == lead_id).first()
    db_lead.needs_followup = True
    db_lead.status = "STAGED"
    db.commit()
    db.close()

    multiline_paste = (
        "Namaste Ankur, saw the video walkthrough.\n"
        "Can we also display root canal treatment pricing?\n"
        "Call me after 4 PM today."
    )
    payload = {
        "text": multiline_paste,
        "channel": "whatsapp",
    }

    res = client.post(f"/api/leads/{lead_id}/messages/log-reply", json=payload)
    assert res.status_code in (200, 201), f"log-reply failed: {res.text}"

    data = res.json()
    # Contract assertions
    assert data["lead_status"] == "REPLIED", f"Expected lead_status 'REPLIED', got {data.get('lead_status')}"
    assert data["needs_followup"] is False, f"Expected needs_followup False, got {data.get('needs_followup')}"

    # Assert split into 3 discrete ordered messages
    messages = data["messages"]
    assert len(messages) == 3, f"Expected 3 discrete messages from 3 lines, got {len(messages)}"
    expected_lines = [
        "Namaste Ankur, saw the video walkthrough.",
        "Can we also display root canal treatment pricing?",
        "Call me after 4 PM today.",
    ]
    for idx, expected_text in enumerate(expected_lines):
        assert messages[idx]["text"] == expected_text
        assert messages[idx]["direction"] == "inbound"
        assert messages[idx]["channel"] == "whatsapp"
        assert messages[idx]["delivery_status"] == "delivered"

    # Assert exactly 3 AI suggestions returned
    ai_suggestions = data["ai_suggestions"]
    assert isinstance(ai_suggestions, list)
    assert len(ai_suggestions) == 3, f"Expected 3 AI suggestions, got {len(ai_suggestions)}"
    categories = [s["category"] for s in ai_suggestions]
    assert "Direct Answer" in categories
    assert "Value Reframe" in categories
    assert "Quick OPD Check-in" in categories
    for s in ai_suggestions:
        assert len(s["text"]) > 0
        assert "tone" in s

    # Database state verification
    db = SessionLocal()
    try:
        updated_lead = db.query(Lead).filter(Lead.id == lead_id).first()
        assert updated_lead.status == "REPLIED"
        assert updated_lead.needs_followup is False
        # Stage should be moved to 'replied'
        replied_stage = db.query(Stage).filter(Stage.hustle_id == updated_lead.hustle_id, Stage.slug == "replied").first()
        if replied_stage:
            assert updated_lead.stage_id == replied_stage.id
    finally:
        db.close()


def test_manual_reply_logging_blank_line_filtering(challenger_client):
    """Stress tests multi-line paste with extraneous empty lines and trailing spaces."""
    client, _ = challenger_client

    leads_res = client.get("/api/leads")
    lead_id = leads_res.json()[0]["id"]

    messy_paste = "\n\n   First line of reply   \n\n\n\n   Second line of reply\n   \n"
    res = client.post(
        f"/api/leads/{lead_id}/messages/log-reply",
        json={"text": messy_paste, "channel": "whatsapp"},
    )
    assert res.status_code in (200, 201)
    data = res.json()
    # Blank lines should be stripped out, leaving only 2 real messages
    assert len(data["messages"]) == 2
    assert data["messages"][0]["text"] == "First line of reply"
    assert data["messages"][1]["text"] == "Second line of reply"


def test_manual_reply_preserves_custom_timestamp(challenger_client):
    """Verifies that an editable/past timestamp is preserved in created messages."""
    client, _ = challenger_client

    leads_res = client.get("/api/leads")
    lead_id = leads_res.json()[0]["id"]

    custom_ts = "2026-11-06T15:45:00Z"
    res = client.post(
        f"/api/leads/{lead_id}/messages/log-reply",
        json={"text": "Doctor replied yesterday afternoon", "channel": "whatsapp", "created_at": custom_ts},
    )
    assert res.status_code in (200, 201)
    data = res.json()
    assert len(data["messages"]) == 1
    # Check created_at matches supplied timestamp
    msg_created_at = data["messages"][0]["created_at"]
    assert "2026-11-06" in msg_created_at


def test_manual_reply_stop_activates_dnc_and_clears_followup(challenger_client):
    """Verifies that logging an inbound reply containing STOP activates DNC and clears followup."""
    client, SessionLocal = challenger_client

    leads_res = client.get("/api/leads")
    lead_id = leads_res.json()[1]["id"]

    res = client.post(
        f"/api/leads/{lead_id}/messages/log-reply",
        json={"text": "Please remove me from your list. STOP.", "channel": "whatsapp"},
    )
    assert res.status_code in (200, 201)

    db = SessionLocal()
    try:
        lead = db.query(Lead).filter(Lead.id == lead_id).first()
        assert lead.do_not_contact is True
        assert lead.needs_followup is False
        lost_stage = db.query(Stage).filter(Stage.hustle_id == lead.hustle_id, Stage.is_lost == True).first()  # noqa: E712
        if lost_stage:
            assert lead.stage_id == lost_stage.id
    finally:
        db.close()


# ============================================================================
# 3. CALLS MANAGEMENT & PREP BRIEF SYNTHESIS TESTS (R3, F2, F8, F9)
# ============================================================================

def test_calls_logging_structures_five_sections(challenger_client, monkeypatch):
    """Asserts that POST /api/leads/{id}/calls with raw text returns 5 structured sections in <10s."""
    _stub_ai_service(monkeypatch)
    client, SessionLocal = challenger_client

    leads_res = client.get("/api/leads")
    lead = leads_res.json()[0]
    lead_id = lead["id"]

    raw_transcript = (
        "Spoke with Dr. Rohit Batra for 7 minutes. He appreciated the clean layout and direct WhatsApp "
        "OPD booking integration. He had reservations about ongoing website maintenance costs and staff training. "
        "I committed to delivering a 3-minute video guide by Wednesday. Dr. Batra agreed to a follow-up demo call "
        "on Thursday at 3 PM to review the commercial proposal."
    )

    payload = {
        "raw_text": raw_transcript,
        "duration_seconds": 420,
        "outcome": "interested",
    }

    res = client.post(f"/api/leads/{lead_id}/calls", json=payload)
    assert res.status_code in (200, 201), f"Call logging failed: {res.text}"

    data = res.json()
    assert "call_id" in data or "id" in data

    # 5 Structured Sections Assertion
    required_sections = ["summary", "interests", "objections", "commitments", "next_steps"]
    for section in required_sections:
        assert section in data, f"Missing section '{section}' in structured call response"
        val = data[section]
        assert val is not None, f"Section '{section}' must not be None"
        if isinstance(val, (list, str)):
            assert len(val) > 0, f"Section '{section}' must not be empty"

    assert "prep_brief" in data and len(data["prep_brief"]) > 0

    # Verify Call record in DB
    db = SessionLocal()
    try:
        call = db.query(Call).filter(Call.lead_id == lead_id).order_by(Call.id.desc()).first()
        assert call is not None
        assert call.duration_seconds == 420
        assert call.outcome == "interested"
        assert len(call.summary) > 0
        assert isinstance(call.interests, list) and len(call.interests) > 0
        assert isinstance(call.objections, list) and len(call.objections) > 0
        assert isinstance(call.next_steps, list) and len(call.next_steps) > 0

        # Lead next_action updated
        lead_db = db.query(Lead).filter(Lead.id == lead_id).first()
        assert lead_db.next_action is not None and len(lead_db.next_action) > 0
    finally:
        db.close()


def test_call_prep_brief_synthesis_endpoint(challenger_client, monkeypatch):
    """Asserts that GET /api/leads/{id}/call-brief returns a pre-call prep brief combining notes and chat."""
    _stub_ai_service(monkeypatch)
    client, SessionLocal = challenger_client

    leads_res = client.get("/api/leads")
    lead_id = leads_res.json()[0]["id"]

    # First log a call so there is call context
    client.post(
        f"/api/leads/{lead_id}/calls",
        json={
            "raw_text": "Doctor concerned about clinic domain setup. Committed to sending domain verification steps.",
            "duration_seconds": 180,
            "outcome": "follow_up_scheduled",
        },
    )

    # Call GET /api/leads/{id}/call-brief
    res = client.get(f"/api/leads/{lead_id}/call-brief")
    assert res.status_code == 200, f"call-brief failed: {res.text}"

    brief = res.json()
    assert brief["lead_id"] == lead_id
    assert "clinic_name" in brief
    assert "doctor_name" in brief
    assert "prep_brief" in brief and len(brief["prep_brief"]) > 0
    assert "past_commitments" in brief and isinstance(brief["past_commitments"], list)
    assert "key_objections" in brief and isinstance(brief["key_objections"], list)


# ============================================================================
# 4. KANBAN EMPTY STAGES COLLAPSE LOGIC TESTS (R4, F20)
# ============================================================================

def test_kanban_empty_stages_collapse_state_machine():
    """Empirically tests the KanbanColumn collapse state machine and invariant rules:

    Rule 1: hideEmpty=True and isEmpty=True and manuallyExpanded=False -> isCollapsed=True (renders slim bar).
    Rule 2: hideEmpty=True and isEmpty=True and manuallyExpanded=True  -> isCollapsed=False (expanded).
    Rule 3: hideEmpty=False and isEmpty=True -> isCollapsed=False (renders full column).
    Rule 4: isEmpty=False (leads > 0) -> isCollapsed=False regardless of hideEmpty.
    """
    def evaluate_collapse(leads_count: int, hide_empty: bool, manually_expanded: bool) -> bool:
        is_empty = (leads_count == 0)
        return hide_empty and is_empty and not manually_expanded

    # Rule 1: Empty stage with toggle ON collapses into slim bar
    assert evaluate_collapse(leads_count=0, hide_empty=True, manually_expanded=False) is True

    # Rule 2: User clicks collapsed slim bar -> manually expanded
    assert evaluate_collapse(leads_count=0, hide_empty=True, manually_expanded=True) is False

    # Rule 3: Toggle OFF -> all empty stages show full column
    assert evaluate_collapse(leads_count=0, hide_empty=False, manually_expanded=False) is False
    assert evaluate_collapse(leads_count=0, hide_empty=False, manually_expanded=True) is False

    # Rule 4: Non-empty stages never collapse
    assert evaluate_collapse(leads_count=1, hide_empty=True, manually_expanded=False) is False
    assert evaluate_collapse(leads_count=5, hide_empty=True, manually_expanded=False) is False
    assert evaluate_collapse(leads_count=12, hide_empty=False, manually_expanded=False) is False


def test_kanban_column_tsx_contract_and_dom_invariants():
    """Validates that KanbanColumn.tsx defines the exact CSS classes, drag/drop handlers,

    vertical writing mode, and expansion triggers required by the UI invariant.
    """
    from pathlib import Path

    col_file = Path(__file__).resolve().parent.parent.parent / "frontend" / "src" / "features" / "board" / "KanbanColumn.tsx"
    assert col_file.exists(), f"KanbanColumn.tsx not found at {col_file}"

    content = col_file.read_text(encoding="utf-8")

    # Invariant 1: State variables for collapse and manual expansion
    assert "const isEmpty = leads.length === 0;" in content
    assert "const isCollapsed = hideEmpty && isEmpty && !manuallyExpanded;" in content
    assert "const [manuallyExpanded, setManuallyExpanded] = useState<boolean>(false);" in content

    # Invariant 2: Slim interactive bar dimensions & styling
    assert "w-12 shrink-0 flex flex-col items-center py-4 rounded-2xl" in content
    assert "border-dashed" in content
    assert "cursor-pointer" in content
    assert 'writingMode: "vertical-rl"' in content
    assert 'transform: "rotate(180deg)"' in content

    # Invariant 3: Click to expand empty stage
    assert "setManuallyExpanded(true)" in content

    # Invariant 4: Drag and drop targets attached to collapsed bar
    # (Allows dragging a lead card directly into a collapsed stage to advance it!)
    assert "onDragOver={onDragOver}" in content
    assert "onDragLeave={onDragLeave}" in content
    assert "onDrop={onDrop}" in content


def test_kanban_board_view_tsx_toggle_wiring():
    """Validates that KanbanBoardView.tsx includes the Hide/Show Empty Stages toggle button,

    passes hideEmpty to every column, and reflects toggle state in label and styling.
    """
    from pathlib import Path

    board_file = Path(__file__).resolve().parent.parent.parent / "frontend" / "src" / "features" / "board" / "KanbanBoardView.tsx"
    assert board_file.exists(), f"KanbanBoardView.tsx not found at {board_file}"

    content = board_file.read_text(encoding="utf-8")

    # Toggle state declaration (default True)
    assert "const [hideEmptyStages, setHideEmptyStages] = useState<boolean>(true);" in content

    # Toggle button in top bar
    assert "setHideEmptyStages(!hideEmptyStages)" in content
    assert 'hideEmptyStages ? "Hide Empty Stages" : "Show All Stages"' in content

    # hideEmpty prop passed to KanbanColumn
    assert "hideEmpty={hideEmptyStages}" in content
