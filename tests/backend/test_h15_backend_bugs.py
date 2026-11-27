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


def test_cockpit_state_get_does_not_write_and_leads_list_under_half_second(client):
    db_session = SessionLocal()
    # Create an old contacted lead that would have been auto-closed by a write-on-read
    contacted_stage = db_session.query(Stage).filter(Stage.slug == "contacted").first()
    uid = uuid.uuid4().hex[:8]
    old_lead = Lead(
        hustle_id=1,
        stage_id=contacted_stage.id,
        slug=f"old-unreplied-clinic-{uid}",
        name="Old Unreplied Clinic",
        status="ACTIVE",
        next_action="Follow up",
        next_action_due_at=datetime.now(timezone.utc) - timedelta(days=10),
        updated_at=datetime.now(timezone.utc) - timedelta(days=10),
    )
    db_session.add(old_lead)
    db_session.commit()
    db_session.refresh(old_lead)

    resp = client.get("/api/autopilot/cockpit-state?hustle_id=1")
    assert resp.status_code == 200
    db_session.refresh(old_lead)
    assert old_lead.status == "ACTIVE"
    assert old_lead.stage_id == contacted_stage.id

    # Bulk insert 2,000 leads and time GET /api/leads
    now = datetime.now(timezone.utc)
    bulk = [
        Lead(
            hustle_id=1,
            stage_id=1,
            slug=f"perf-lead-{uid}-{i}",
            name=f"Perf Clinic {i}",
            status="STAGED",
            next_action="Call clinic",
            next_action_due_at=now + timedelta(days=1),
        )
        for i in range(2000)
    ]
    db_session.bulk_save_objects(bulk)
    db_session.commit()

    t0 = time.perf_counter()
    r = client.get("/api/leads?hustle_id=1")
    elapsed = time.perf_counter() - t0
    assert r.status_code == 200
    assert elapsed < 0.5, f"GET /api/leads took {elapsed:.3f}s (target < 0.5s)"
