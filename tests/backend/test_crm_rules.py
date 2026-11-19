from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.seed import seed_initial_data


@pytest.fixture()
def client():
    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    Base.metadata.create_all(bind=test_engine)

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
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def test_active_lead_requires_next_action(client: TestClient):
    """Rule: Every active lead must have a next action and due date."""
    res = client.post(
        "/api/leads",
        json={
            "hustle_id": 1,
            "name": "Apex Dental Clinic",
            "locality": "Dwarka",
            "primary_phone": "9810001111",
            # Missing next_action and next_action_due_at!
        },
    )
    assert res.status_code == 422
    assert "next_action" in res.json()["detail"]


def test_duplicate_phone_and_instagram_blocked(client: TestClient):
    """Rule: One phone number or Instagram handle belongs to one lead, so duplicates are blocked."""
    due = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    res1 = client.post(
        "/api/leads",
        json={
            "hustle_id": 1,
            "name": "First Clinic",
            "locality": "Rohini",
            "primary_phone": "9899887766",
            "instagram_handle": "@rohini_dental_1",
            "next_action": "Send WhatsApp pitch",
            "next_action_due_at": due,
        },
    )
    assert res1.status_code == 201

    # Attempt duplicate phone in different format (+91-98998-87766)
    res_dup_phone = client.post(
        "/api/leads",
        json={
            "hustle_id": 1,
            "name": "Second Clinic Same Phone",
            "locality": "Pitampura",
            "primary_phone": "+91-98998-87766",
            "next_action": "Send WhatsApp pitch",
            "next_action_due_at": due,
        },
    )
    assert res_dup_phone.status_code == 409
    assert "Duplicate blocked" in res_dup_phone.json()["detail"]

    # Attempt duplicate Instagram handle
    res_dup_ig = client.post(
        "/api/leads",
        json={
            "hustle_id": 1,
            "name": "Third Clinic Same IG",
            "locality": "Pitampura",
            "instagram_handle": "https://instagram.com/rohini_dental_1/",
            "next_action": "Send IG pitch",
            "next_action_due_at": due,
        },
    )
    assert res_dup_ig.status_code == 409
    assert "Duplicate blocked" in res_dup_ig.json()["detail"]


def test_completing_task_requires_next_step(client: TestClient):
    """Rule: Completing a task asks you to add the next step, so no lead is left without one."""
    leads = client.get("/api/leads").json()
    lead_id = leads[0]["id"]

    # Completing without a next_action on an active stage fails
    bad = client.post(
        f"/api/leads/{lead_id}/complete-task",
        json={"completed_note": "Called receptionist"},
    )
    assert bad.status_code == 422

    # Completing with a new next_action and due date succeeds
    due = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    good = client.post(
        f"/api/leads/{lead_id}/complete-task",
        json={
            "completed_note": "Spoke with Dr., wants to review tomorrow evening",
            "next_action": "Follow up on WhatsApp after evening OPD",
            "next_action_due_at": due,
        },
    )
    assert good.status_code == 200
    assert good.json()["next_action"] == "Follow up on WhatsApp after evening OPD"


def test_messages_never_edited_or_deleted_and_leads_never_deleted(client: TestClient):
    """Rule: Messages are never edited or deleted; leads are archived, never deleted."""
    assert client.delete("/api/messages/1").status_code == 405
    assert client.patch("/api/messages/1").status_code == 405
    assert client.delete("/api/leads/1").status_code == 405

    arch = client.post("/api/leads/1/archive?reason=Doctor+retired")
    assert arch.status_code == 200
    assert arch.json()["is_archived"] is True

    csv_res = client.get("/api/leads/export/csv")
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]


def test_outbox_safety_no_double_send_and_stop_reply_dnc(client: TestClient):
    """Rule: Unique key prevents double-send; STOP reply sets do-not-contact and blocks sends."""
    leads = client.get("/api/leads").json()
    target = leads[0]
    lead_id = target["id"]

    send1 = client.post(
        "/api/outbox/approve",
        json={
            "lead_id": lead_id,
            "channel": "whatsapp",
            "text": "Hi Doctor, here are your 3 clinic website demos!",
            "step_tag": "initial_pitch",
            "send_immediately": True,
        },
    )
    assert send1.status_code == 200

    # Retrying the exact same step_tag on the same lead + channel is blocked by unique_key
    send_dup = client.post(
        "/api/outbox/approve",
        json={
            "lead_id": lead_id,
            "channel": "whatsapp",
            "text": "Hi Doctor, here are your 3 clinic website demos!",
            "step_tag": "initial_pitch",
            "send_immediately": True,
        },
    )
    assert send_dup.status_code == 409
    assert "No-double-send" in send_dup.json()["detail"]

    # Inbound reply asking to stop automatically sets do_not_contact
    stop_msg = client.post(
        f"/api/leads/{lead_id}/messages",
        json={
            "channel": "whatsapp",
            "direction": "inbound",
            "text": "Please stop messaging me, not interested",
        },
    )
    assert stop_msg.status_code == 201
    assert stop_msg.json()["ai_label"] == "stop"

    # Subsequent follow-up send is now blocked by the Do-Not-Contact safety brake
    send_blocked = client.post(
        "/api/outbox/approve",
        json={
            "lead_id": lead_id,
            "channel": "whatsapp",
            "text": "Following up!",
            "step_tag": "followup_1",
            "send_immediately": True,
        },
    )
    assert send_blocked.status_code == 403
    assert "Do-Not-Contact" in send_blocked.json()["detail"]


def test_promise_parsing_and_bot_filtered_view_tracking(client: TestClient):
    """Verifies promise/snooze parsing and bot-ignored view tracking."""
    leads = client.get("/api/leads").json()
    lead = [l for l in leads if l["intent_score"] == 0][0]
    lead_id = lead["id"]
    slug = lead["slug"]

    # 1. Bot preview should be marked is_bot=True and not inflate intent score
    initial_intent = lead["intent_score"]
    bot_res = client.post(
        "/api/public/track",
        json={
            "lead_slug": slug,
            "event_type": "page_view",
            "section": "hero",
            "user_agent": "WhatsApp/2.24.12.78 iOS",
        },
    )
    assert bot_res.status_code == 200
    assert bot_res.json()["is_bot"] is True
    assert bot_res.json()["intent_score"] == initial_intent

    # 2. Real doctor view + choosing 'warm' design increases intent score
    human_res = client.post(
        "/api/public/track",
        json={
            "lead_slug": slug,
            "event_type": "design_choice",
            "section": "switcher",
            "design_chosen": "warm",
            "duration_seconds": 42,
            "user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
        },
    )
    assert human_res.status_code == 200
    assert human_res.json()["is_bot"] is False
    assert human_res.json()["intent_score"] > initial_intent

    # 3. Inbound message saying 'call next Monday' proposes a Commitment
    msg_res = client.post(
        f"/api/leads/{lead_id}/messages",
        json={
            "channel": "whatsapp",
            "direction": "inbound",
            "text": "Warm design looks nice, busy in clinic today, let's connect next Monday.",
        },
    )
    assert msg_res.status_code == 201
    updated_lead = [l for l in client.get("/api/leads").json() if l["id"] == lead_id][0]
    assert len(updated_lead["commitments"]) >= 1
    commitment_id = updated_lead["commitments"][0]["id"]

    # Confirm commitment with one tap
    conf = client.post(f"/api/commitments/{commitment_id}/confirm")
    assert conf.status_code == 200
    assert "Monday" in conf.json()["next_action"]
