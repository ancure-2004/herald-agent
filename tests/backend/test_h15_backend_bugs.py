import time
import uuid
from datetime import datetime, timedelta, timezone

import pytest

from app.core.config import Settings
from app.db.session import SessionLocal
from app.models.entities import Lead, Stage


def test_cors_origins_comma_separated_and_json_list(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:3000,https://example.com")
    s1 = Settings()
    assert s1.CORS_ORIGINS == ["http://localhost:3000", "https://example.com"]

    monkeypatch.setenv("CORS_ORIGINS", '["http://localhost:3000","https://example.com"]')
    s2 = Settings()
    assert s2.CORS_ORIGINS == ["http://localhost:3000", "https://example.com"]


def test_add_lead_modal_exact_payload_returns_201(client):
    default_due = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    payload = {
        "hustle_id": 1,
        "stage_id": 1,
        "name": "Apex Dental Studio",
        "doctor_name": "Dr. Sharma",
        "locality": "Indiranagar, BLR",
        "primary_phone": "+919876543210",
        "instagram_handle": "apexdental_blr",
        "next_action": "Verify website status & build 3 demo previews",
        "next_action_due_at": default_due,
        "fit_score": 85,
        "fit_reasons": ["Manual intake lead", "Targeted dental clinic"],
        "intent_score": 50,
    }
    resp = client.post("/api/leads", json=payload)
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["name"] == "Apex Dental Studio"


def test_replied_stage_is_not_won_and_won_lost_use_stage_flags(client):
    db_session = SessionLocal()
    replied_stage = db_session.query(Stage).filter(Stage.slug == "replied").first()
    won_stage = db_session.query(Stage).filter(Stage.slug == "won").first()
    lost_stage = db_session.query(Stage).filter(Stage.slug == "lost").first()
    assert replied_stage is not None
    assert won_stage is not None
    assert lost_stage is not None

    lead = Lead(
        hustle_id=1,
        stage_id=replied_stage.id,
        slug=f"replied-clinic-test-{uuid.uuid4().hex[:8]}",
        name="Replied Clinic",
        status="REPLIED",
        next_action="Follow up",
        next_action_due_at=datetime.now(timezone.utc) + timedelta(days=1),
    )
    db_session.add(lead)
    db_session.commit()
    db_session.refresh(lead)

    assert lead.is_won is False
    assert lead.is_lost is False

    lead.stage_id = won_stage.id
    lead.status = "ACTIVE"
    db_session.commit()
    db_session.refresh(lead)
    assert lead.is_won is True
    assert lead.is_lost is False

    lead.stage_id = lost_stage.id
    db_session.commit()
    db_session.refresh(lead)
    assert lead.is_won is False
    assert lead.is_lost is True
    db_session.close()


def test_cockpit_state_get_does_not_write(client):
    from app.db.session import get_db
    from app.models.entities import Message

    db_session = next(client.app.dependency_overrides[get_db]())
    # Create an old contacted lead with an outbound message > 7 days ago that would be auto-closed by write-on-read
    contacted_stage = db_session.query(Stage).filter(Stage.slug == "contacted").first()
    contacted_stage_id = contacted_stage.id
    uid = uuid.uuid4().hex[:8]
    old_lead = Lead(
        hustle_id=1,
        stage_id=contacted_stage_id,
        slug=f"old-unreplied-clinic-{uid}",
        name="Old Unreplied Clinic",
        status="ACTIVE",
        needs_followup=True,
        next_followup_at=datetime.now(timezone.utc) - timedelta(days=10),
        next_action="Follow up",
        next_action_due_at=datetime.now(timezone.utc) - timedelta(days=10),
        updated_at=datetime.now(timezone.utc) - timedelta(days=10),
    )
    db_session.add(old_lead)
    db_session.commit()
    db_session.refresh(old_lead)

    db_session.add(
        Message(
            lead_id=old_lead.id,
            channel="whatsapp",
            direction="outbound",
            text="Checking in",
            created_at=datetime.now(timezone.utc) - timedelta(days=10),
        )
    )
    db_session.commit()

    resp = client.get("/api/autopilot/cockpit-state?hustle_id=1")
    assert resp.status_code == 200
    db_session.expire_all()
    db_session.refresh(old_lead)
    assert old_lead.status == "ACTIVE"
    assert old_lead.stage_id == contacted_stage_id

    # Dry-run writes nothing
    dry_resp = client.post("/api/autopilot/auto-close-unreplied?hustle_id=1&dry_run=true")
    assert dry_resp.status_code == 200
    assert dry_resp.json()["dry_run"] is True
    assert dry_resp.json()["transitioned"] >= 1
    db_session.expire_all()
    db_session.refresh(old_lead)
    assert old_lead.status == "ACTIVE"

    # Missing hustle_id is rejected (422)
    assert client.post("/api/autopilot/auto-close-unreplied").status_code == 422

    # Seed 3 leads that must be skipped: inbound reply, do_not_contact, archived
    replied_lead = Lead(
        hustle_id=1,
        stage_id=contacted_stage_id,
        slug=f"replied-skip-{uid}",
        name="Replied Skip",
        status="ACTIVE",
        next_followup_at=datetime.now(timezone.utc) - timedelta(days=10),
        next_action="Follow up",
        next_action_due_at=datetime.now(timezone.utc) - timedelta(days=10),
    )
    dnc_lead = Lead(
        hustle_id=1,
        stage_id=contacted_stage_id,
        slug=f"dnc-skip-{uid}",
        name="DNC Skip",
        status="ACTIVE",
        do_not_contact=True,
        next_followup_at=datetime.now(timezone.utc) - timedelta(days=10),
        next_action="Follow up",
        next_action_due_at=datetime.now(timezone.utc) - timedelta(days=10),
    )
    archived_lead = Lead(
        hustle_id=1,
        stage_id=contacted_stage_id,
        slug=f"archived-skip-{uid}",
        name="Archived Skip",
        status="ACTIVE",
        is_archived=True,
        next_followup_at=datetime.now(timezone.utc) - timedelta(days=10),
        next_action="Follow up",
        next_action_due_at=datetime.now(timezone.utc) - timedelta(days=10),
    )
    db_session.add_all([replied_lead, dnc_lead, archived_lead])
    db_session.commit()
    db_session.refresh(replied_lead)
    db_session.add(
        Message(
            lead_id=replied_lead.id,
            channel="whatsapp",
            direction="inbound",
            text="Yes interested",
            created_at=datetime.now(timezone.utc) - timedelta(days=9),
        )
    )
    db_session.commit()

    # Explicit POST action should transition the eligible lead and skip the 3 guarded leads
    post_resp = client.post("/api/autopilot/auto-close-unreplied?hustle_id=1")
    assert post_resp.status_code == 200
    db_session.expire_all()
    db_session.refresh(old_lead)
    db_session.refresh(replied_lead)
    db_session.refresh(dnc_lead)
    db_session.refresh(archived_lead)
    assert old_lead.status == "CLOSED_LOST"
    assert old_lead.is_lost is True
    assert replied_lead.status == "ACTIVE"
    assert dnc_lead.status == "ACTIVE"
    assert archived_lead.status == "ACTIVE"


def test_leads_list_returns_messages_and_facts(client):
    from app.db.session import get_db
    from app.models.entities import LeadFact

    default_due = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    create_resp = client.post(
        "/api/leads",
        json={
            "hustle_id": 1,
            "stage_id": 1,
            "name": "List Relations Clinic",
            "next_action": "Follow up",
            "next_action_due_at": default_due,
        },
    )
    assert create_resp.status_code == 201
    lead_id = create_resp.json()["id"]

    msg_resp = client.post(
        f"/api/leads/{lead_id}/messages",
        json={"channel": "whatsapp", "direction": "outbound", "text": "Hello doctor"},
    )
    assert msg_resp.status_code == 201

    db_session = next(client.app.dependency_overrides[get_db]())
    db_session.add(
        LeadFact(
            lead_id=lead_id,
            field="specialty",
            value="orthodontics",
            source="test",
        )
    )
    db_session.commit()

    resp = client.get("/api/leads?hustle_id=1")
    assert resp.status_code == 200
    items = resp.json()
    matched = [item for item in items if item["id"] == lead_id]
    assert len(matched) == 1
    assert len(matched[0]["messages"]) == 1
    assert matched[0]["messages"][0]["text"] == "Hello doctor"
    assert len(matched[0]["facts"]) == 1
    assert matched[0]["facts"][0]["field"] == "specialty"
