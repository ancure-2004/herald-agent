from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models.entities import Lead, Message, Stage
from app.schemas.message import OutboxApproveRequest
from app.seed import seed_initial_data
from app.services.lead_service import LeadService
from app.services.message_service import MessageService


@pytest.fixture()
def db():
    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    Base.metadata.create_all(bind=test_engine)

    session = TestingSessionLocal()
    seed_initial_data(session, include_demo_leads=True)
    try:
        yield session
    finally:
        session.close()


def test_3_day_followup_rule(db):
    """Test 3.1: Sending an outreach message sets next_action_due_at and next_followup_at to Day 3."""
    stage = db.query(Stage).filter(Stage.hustle_id == 1, Stage.slug == "package_ready").first()
    if not stage:
        stage = Stage(hustle_id=1, name="Package Ready", slug="package_ready", order=2)
        db.add(stage)
        db.commit()

    lead = Lead(
        hustle_id=1,
        stage_id=stage.id,
        slug="test-clinic-fup-3d",
        name="Test 3D Clinic",
        primary_phone="919876543210",
        preferred_channel="whatsapp",
        status="DEMO_READY",
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)

    now_before = datetime.now(timezone.utc)
    req = OutboxApproveRequest(
        lead_id=lead.id,
        channel="whatsapp",
        text="Hello doctor, here is your demo",
        step_tag="initial_pitch",
        send_immediately=True,
    )
    res = MessageService.approve_and_send_pitch(db, req)
    assert res["status"] == "sent"

    db.refresh(lead)
    assert lead.next_action_due_at is not None
    assert lead.next_followup_at is not None
    fup_dt = lead.next_followup_at if lead.next_followup_at.tzinfo else lead.next_followup_at.replace(tzinfo=timezone.utc)
    delta_days = (fup_dt - now_before).days
    assert delta_days >= 2 and delta_days <= 3


def test_7_day_auto_lost_rule(db):
    """Test 3.2: Leads unreplied 7 days after follow-up transition automatically to CLOSED_LOST."""
    lost_stage = db.query(Stage).filter(Stage.hustle_id == 1, Stage.is_lost == True).first()
    contacted_stage = db.query(Stage).filter(Stage.hustle_id == 1, Stage.slug == "contacted").first()
    if not contacted_stage:
        contacted_stage = Stage(hustle_id=1, name="Contacted", slug="contacted", order=4)
        db.add(contacted_stage)
        db.commit()

    eight_days_ago = datetime.now(timezone.utc) - timedelta(days=8)

    # Lead A: Contacted 8 days ago, no reply -> should transition to CLOSED_LOST
    lead_a = Lead(
        hustle_id=1,
        stage_id=contacted_stage.id,
        slug="test-auto-lost-clinic-a",
        name="Unreplied 8D Clinic",
        primary_phone="919811122233",
        preferred_channel="whatsapp",
        status="CONTACTED",
        next_followup_at=eight_days_ago,
    )
    msg_out = Message(
        lead=lead_a,
        channel="whatsapp",
        direction="outbound",
        text="Pitch message",
        delivery_status="sent",
        created_at=eight_days_ago,
    )
    db.add(lead_a)
    db.add(msg_out)

    # Lead B: Contacted 8 days ago, BUT replied -> should NOT transition to CLOSED_LOST
    lead_b = Lead(
        hustle_id=1,
        stage_id=contacted_stage.id,
        slug="test-auto-lost-clinic-b",
        name="Replied 8D Clinic",
        primary_phone="919844455566",
        preferred_channel="whatsapp",
        status="REPLIED",
        next_followup_at=eight_days_ago,
    )
    msg_in = Message(
        lead=lead_b,
        channel="whatsapp",
        direction="inbound",
        text="Looks good, tell me more",
        delivery_status="delivered",
        created_at=eight_days_ago + timedelta(days=1),
    )
    db.add(lead_b)
    db.add(msg_in)
    db.commit()

    transitioned = LeadService.auto_transition_unreplied_to_closed_lost(db, hustle_id=1)
    transitioned_ids = [l.id for l in transitioned]

    assert lead_a.id in transitioned_ids
    assert lead_b.id not in transitioned_ids

    db.refresh(lead_a)
    db.refresh(lead_b)
    assert lead_a.status == "CLOSED_LOST"
    if lost_stage:
        assert lead_a.stage_id == lost_stage.id
    assert lead_b.status == "REPLIED"
