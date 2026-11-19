import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.schema_migrations import ensure_schema_columns
from app.db.session import Base
from app.models.entities import Call, Lead, Message, OutboxItem, TerminalLog
from app.schemas.message import MessageCreate
from app.seed import seed_initial_data
from app.services.message_service import MessageService


@pytest.fixture
def memory_db():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    ensure_schema_columns(engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    yield db
    db.close()


def test_seed_creates_16_delhi_ncr_clinics_and_allowed_channels(memory_db):
    """Verifies that seed_initial_data creates 16 clinics across all stages and enforces WhatsApp-only."""
    hustle = seed_initial_data(memory_db, include_demo_leads=True)
    assert hustle.slug == "dental-clinics"
    # Channel restriction invariant: strictly WhatsApp-only
    assert hustle.allowed_channels == ["whatsapp"]

    leads = memory_db.query(Lead).filter(Lead.hustle_id == hustle.id).all()
    assert len(leads) == 16, f"Expected 16 seeded clinics, found {len(leads)}"

    # Check that all 8 stages are populated
    stage_slugs = {lead.stage_rel.slug for lead in leads}
    expected_stages = {
        "discovered",
        "package_ready",
        "queued",
        "contacted",
        "viewed_demo",
        "replied",
        "won",
        "lost",
    }
    assert expected_stages.issubset(stage_slugs), f"Missing stages in seed: {expected_stages - stage_slugs}"

    # Check stage counts
    stage_counts = {}
    for lead in leads:
        slug = lead.stage_rel.slug
        stage_counts[slug] = stage_counts.get(slug, 0) + 1

    assert stage_counts["discovered"] == 2
    assert stage_counts["package_ready"] == 3
    assert stage_counts["queued"] == 2
    assert stage_counts["contacted"] == 3
    assert stage_counts["viewed_demo"] == 2
    assert stage_counts["replied"] == 2
    assert stage_counts["won"] == 1
    assert stage_counts["lost"] == 1


def test_seed_creates_4_logged_calls_with_5_section_notes(memory_db):
    """Verifies that 4 logged calls with 5-section AI notes and prep briefs are seeded."""
    seed_initial_data(memory_db, include_demo_leads=True)

    calls = memory_db.query(Call).all()
    assert len(calls) == 4, f"Expected 4 logged calls, found {len(calls)}"

    for call in calls:
        assert call.raw_text, "Call raw_text must not be empty"
        assert call.summary, "Call summary must not be empty"
        assert isinstance(call.interests, list), "Interests must be a JSON list"
        assert isinstance(call.objections, list), "Objections must be a JSON list"
        assert isinstance(call.commitments, list), "Commitments must be a JSON list"
        assert isinstance(call.next_steps, list), "Next steps must be a JSON list"
        assert call.prep_brief, "Call prep_brief must not be empty"
        assert call.duration_seconds > 0, "Duration must be positive"
        assert call.outcome in ("interested", "scheduled_call", "completed", "not_interested")


def test_seed_creates_30_plus_structured_terminal_logs(memory_db):
    """Verifies that 30+ structured terminal logs across discovery, building, and outreach are seeded."""
    seed_initial_data(memory_db, include_demo_leads=True)

    logs = memory_db.query(TerminalLog).all()
    assert len(logs) >= 30, f"Expected at least 30 terminal logs, found {len(logs)}"

    services = {log.service for log in logs}
    assert "discovery" in services, "Must include discovery logs"
    assert "building" in services, "Must include building logs"
    assert "outreach" in services, "Must include outreach logs"

    levels = {log.level for log in logs}
    assert "info" in levels
    assert "warn" in levels or "success" in levels


def test_channel_restriction_invariant_in_message_service(memory_db):
    """Verifies that MessageService.append_message rejects non-WhatsApp channels with HTTP 403."""
    seed_initial_data(memory_db, include_demo_leads=True)
    lead = memory_db.query(Lead).filter(Lead.stage_rel.has(slug="replied")).first()

    # Allowed channel: WhatsApp -> should succeed
    msg_ok = MessageService.append_message(
        db=memory_db,
        lead_id=lead.id,
        payload=MessageCreate(
            channel="whatsapp",
            direction="outbound",
            text="Namaste Doctor Ji, following up on our call.",
        ),
    )
    assert msg_ok.id is not None
    assert msg_ok.channel == "whatsapp"
    assert msg_ok.delivery_status == "sent"

    # Disallowed channel: Instagram -> must raise HTTP 403
    with pytest.raises(HTTPException) as exc_info:
        MessageService.append_message(
            db=memory_db,
            lead_id=lead.id,
            payload=MessageCreate(
                channel="instagram",
                direction="outbound",
                text="Hey doctor, check your DMs!",
            ),
        )
    assert exc_info.value.status_code == 403
    assert "Channel restriction" in exc_info.value.detail

    # Disallowed channel: Email -> must raise HTTP 403
    with pytest.raises(HTTPException) as exc_info_email:
        MessageService.append_message(
            db=memory_db,
            lead_id=lead.id,
            payload=MessageCreate(
                channel="email",
                direction="outbound",
                text="Dear Doctor, please find proposal attached.",
            ),
        )
    assert exc_info_email.value.status_code == 403
    assert "Channel restriction" in exc_info_email.value.detail


def test_lead_model_automation_and_followup_flags(memory_db):
    """Verifies automation_enabled and needs_followup attributes on Lead."""
    seed_initial_data(memory_db, include_demo_leads=True)

    leads_needing_followup = memory_db.query(Lead).filter(Lead.needs_followup == True).all()  # noqa: E712
    assert len(leads_needing_followup) >= 2, "Expected at least 2 leads flagged with needs_followup=True"

    # Inbound message clears needs_followup and sets status to REPLIED
    lead = leads_needing_followup[0]
    assert lead.needs_followup is True

    inbound = MessageService.append_message(
        db=memory_db,
        lead_id=lead.id,
        payload=MessageCreate(
            channel="whatsapp",
            direction="inbound",
            text="Yes, tell me more about pricing.",
        ),
    )
    assert inbound.id is not None
    memory_db.refresh(lead)
    assert lead.needs_followup is False
    assert lead.status == "REPLIED"


def test_message_delivery_status_and_outbox_link(memory_db):
    """Verifies delivery_status and outbox_id fields on Message model."""
    seed_initial_data(memory_db, include_demo_leads=True)
    lead = memory_db.query(Lead).first()

    outbox_item = OutboxItem(
        lead_id=lead.id,
        hustle_id=lead.hustle_id,
        channel="whatsapp",
        text="Test pitch message",
        unique_key=f"lead:{lead.id}:test_key",
        status="sent",
    )
    memory_db.add(outbox_item)
    memory_db.flush()

    msg = Message(
        lead_id=lead.id,
        channel="whatsapp",
        direction="outbound",
        text="Test pitch message",
        delivery_status="sent",
        outbox_id=outbox_item.id,
    )
    memory_db.add(msg)
    memory_db.commit()
    memory_db.refresh(msg)

    assert msg.delivery_status == "sent"
    assert msg.outbox_id == outbox_item.id
    assert msg.outbox_item.id == outbox_item.id


def test_schema_migrations_adds_columns_to_existing_tables():
    """Verifies ensure_schema_columns dynamically adds missing columns to SQLite tables."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                CREATE TABLE hustles (
                    id INTEGER PRIMARY KEY,
                    slug VARCHAR(100) UNIQUE NOT NULL,
                    name VARCHAR(200) NOT NULL
                )
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE TABLE stages (
                    id INTEGER PRIMARY KEY,
                    hustle_id INTEGER,
                    slug VARCHAR(100),
                    name VARCHAR(100),
                    "order" INTEGER,
                    is_won BOOLEAN,
                    is_lost BOOLEAN
                )
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE TABLE leads (
                    id INTEGER PRIMARY KEY,
                    hustle_id INTEGER NOT NULL,
                    stage_id INTEGER NOT NULL,
                    slug VARCHAR(200) UNIQUE,
                    name VARCHAR(300) NOT NULL
                )
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE TABLE messages (
                    id INTEGER PRIMARY KEY,
                    lead_id INTEGER NOT NULL,
                    channel VARCHAR(50),
                    direction VARCHAR(20),
                    text TEXT
                )
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE TABLE jobs (
                    id INTEGER PRIMARY KEY,
                    hustle_id INTEGER,
                    job_type VARCHAR(50),
                    status VARCHAR(50)
                )
                """
            )
        )

    # Run ensure_schema_columns on legacy schema
    ensure_schema_columns(engine)

    insp = inspect(engine)
    lead_cols = {c["name"] for c in insp.get_columns("leads")}
    assert "automation_enabled" in lead_cols
    assert "needs_followup" in lead_cols
    assert "status" in lead_cols
    assert "is_test" in lead_cols

    msg_cols = {c["name"] for c in insp.get_columns("messages")}
    assert "delivery_status" in msg_cols
    assert "outbox_id" in msg_cols

    assert insp.has_table("calls")
    assert insp.has_table("terminal_logs")
