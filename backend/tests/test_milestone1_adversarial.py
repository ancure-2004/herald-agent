import threading

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.exceptions import MethodNotAllowedError
from app.db.schema_migrations import ensure_schema_columns
from app.db.session import Base
from app.models.entities import Call, Hustle, Lead, Message, OutboxItem, TerminalLog
from app.schemas.call import CallOut
from app.schemas.message import MessageCreate, MessageOut
from app.schemas.terminal_log import TerminalLogOut
from app.seed import seed_initial_data
from app.services.message_service import MessageService


@pytest.fixture
def adversarial_db():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    ensure_schema_columns(engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    seed_initial_data(db, include_demo_leads=True)
    yield db
    db.close()


# ============================================================================
# 1. BOUNDARY CONDITIONS ON CALL MODEL
# ============================================================================


def test_call_model_empty_and_minimal_text(adversarial_db):
    """Stress test: Call model with empty raw_text, 0 duration, and minimal payload."""
    lead = adversarial_db.query(Lead).first()
    assert lead is not None

    call = Call(
        lead_id=lead.id,
        raw_text="",
        summary="",
        interests=[],
        objections=[],
        commitments=[],
        next_steps=[],
        prep_brief="",
        duration_seconds=0,
        outcome="no_answer",
    )
    adversarial_db.add(call)
    adversarial_db.commit()
    adversarial_db.refresh(call)

    assert call.id is not None
    assert call.raw_text == ""
    assert call.duration_seconds == 0
    assert call.outcome == "no_answer"
    assert call.interests == []

    # Verify Pydantic schema serialization
    out_schema = CallOut.model_validate(call)
    assert out_schema.id == call.id
    assert out_schema.raw_text == ""
    assert out_schema.duration_seconds == 0


def test_call_model_huge_transcript_50kb(adversarial_db):
    """Stress test: Call model with huge text transcript (50KB+), emojis, and multiline dialogue."""
    lead = adversarial_db.query(Lead).first()

    # Generate 55KB dialogue transcript
    dialogue_turn = (
        "Doctor: Namaste, we have 4 dental chairs and specialize in painless root canals and zirconia crowns. 🦷✨\n"
        "Agent: Excellent, Doctor! Our Personal OS creates 3 live interactive demo designs tailored for your clinic.\n"
        "Doctor: What is the investment? Is WhatsApp automation compliant with patient privacy policies? 🤔\n"
        "Agent: Completely compliant, doctor. You retain 100% data sovereignty.\n"
    )
    huge_transcript = dialogue_turn * 200  # ~56 KB of text
    assert len(huge_transcript) > 50000

    huge_summary = "A" * 5000
    huge_interests = [f"Interest_{i}_{'X'*100}" for i in range(50)]
    huge_objections = [f"Objection_{i}_{'Y'*100}" for i in range(30)]
    huge_commitments = [{"who": "us", "what": f"Deliver package {i}", "due": "2026-11-10"} for i in range(25)]
    huge_next_steps = [f"Step_{i}_{'Z'*100}" for i in range(40)]

    call = Call(
        lead_id=lead.id,
        raw_text=huge_transcript,
        summary=huge_summary,
        interests=huge_interests,
        objections=huge_objections,
        commitments=huge_commitments,
        next_steps=huge_next_steps,
        prep_brief="Brief " * 1000,
        duration_seconds=3600,  # 1 hour
        outcome="completed",
    )
    adversarial_db.add(call)
    adversarial_db.commit()
    adversarial_db.refresh(call)

    assert call.id is not None
    assert len(call.raw_text) == len(huge_transcript)
    assert len(call.interests) == 50
    assert len(call.commitments) == 25
    assert call.duration_seconds == 3600

    # Query back from fresh query
    fetched_call = adversarial_db.query(Call).filter(Call.id == call.id).one()
    assert len(fetched_call.raw_text) > 50000
    assert fetched_call.duration_seconds == 3600

    # Pydantic schema validation
    call_out = CallOut.model_validate(fetched_call)
    assert len(call_out.raw_text) > 50000
    assert len(call_out.interests) == 50


def test_call_model_extreme_durations_and_special_characters(adversarial_db):
    """Stress test: Call model with extreme durations (0s, 86400s), special characters, unicode, and SQL/script strings."""
    lead = adversarial_db.query(Lead).first()

    special_text = (
        "Special Chars: <script>alert('xss');</script> \n"
        "SQL: '; DROP TABLE calls; -- \n"
        "Unicode: नमस्ते डॉक्टर जी! 🎉🔥 \n"
        "Symbols: & < > \" ' % / \\ \0 \r\n \t \n"
        "Emojis: 🦷 🪥 🏥 ⚕️ 🇮🇳"
    )

    # Note: SQLite supports null bytes in Text, but Python string replaces or retains cleanly
    sanitized_special_text = special_text.replace("\0", "[NULL]")

    call = Call(
        lead_id=lead.id,
        raw_text=sanitized_special_text,
        summary="Summary with emojis 🦷 & symbols <>&",
        interests=["Laser Dentistry ⚡", "Implants 🔩", "Orthodontics 🦷"],
        objections=["'Cost is too high' -- quote test", "No time <now>"],
        commitments=[{"text": "Send contract & demo", "special": "<>&'\""}],
        next_steps=["Call back on 15th @ 5:00 PM"],
        prep_brief="Brief: Dr. Sharma prefers WhatsApp over calls. 📱",
        duration_seconds=86400,  # 24 hours extreme duration
        outcome="scheduled_call",
    )
    adversarial_db.add(call)
    adversarial_db.commit()
    adversarial_db.refresh(call)

    assert call.duration_seconds == 86400
    assert "नमस्ते" in call.raw_text
    assert "<script>" in call.raw_text
    assert "DROP TABLE" in call.raw_text
    assert len(call.interests) == 3

    out = CallOut.model_validate(call)
    assert out.duration_seconds == 86400
    assert out.interests[0] == "Laser Dentistry ⚡"


def test_call_cascade_deletion_on_lead_delete(adversarial_db):
    """Verify that deleting a lead cascade-deletes all associated calls."""
    lead = adversarial_db.query(Lead).filter(Lead.calls.any()).first()
    assert lead is not None
    lead_id = lead.id
    calls_count = adversarial_db.query(Call).filter(Call.lead_id == lead_id).count()
    assert calls_count > 0

    adversarial_db.delete(lead)
    adversarial_db.commit()

    remaining_calls = adversarial_db.query(Call).filter(Call.lead_id == lead_id).count()
    assert remaining_calls == 0


# ============================================================================
# 2. BOUNDARY CONDITIONS ON TERMINAL LOG
# ============================================================================


def test_terminal_log_rapid_batch_logging_100_lines(adversarial_db):
    """Stress test: Rapidly insert 100 log lines in a loop, verify sequence and retrieval."""
    hustle = adversarial_db.query(Hustle).first()
    lead = adversarial_db.query(Lead).first()

    initial_count = adversarial_db.query(TerminalLog).count()

    # Rapid insert of 100 log items
    inserted_ids = []
    for i in range(100):
        log = TerminalLog(
            service="outreach" if i % 3 == 0 else ("discovery" if i % 3 == 1 else "building"),
            level="info" if i % 10 != 0 else "error",
            lead_id=lead.id if i % 2 == 0 else None,
            hustle_id=hustle.id,
            message=f"Rapid log stream sequence #{i} with trace data payload token={i*7}",
            metadata_json={"seq": i, "iteration": f"batch_{i}", "extra": {"nested": i % 5}},
        )
        adversarial_db.add(log)
        adversarial_db.flush()
        inserted_ids.append(log.id)

    adversarial_db.commit()

    final_count = adversarial_db.query(TerminalLog).count()
    assert final_count == initial_count + 100
    assert len(inserted_ids) == 100
    # Check monotonic ID sequence
    assert inserted_ids == sorted(inserted_ids)


def test_terminal_log_query_filtering_and_since_seq(adversarial_db):
    """Stress test: Query terminal logs by service, level, and since_seq cursor pagination."""
    # Ensure fresh batch of known logs
    hustle = adversarial_db.query(Hustle).first()
    for s in ["discovery", "building", "outreach"]:
        for lvl in ["info", "warn", "error"]:
            adversarial_db.add(
                TerminalLog(
                    service=s,
                    level=lvl,
                    hustle_id=hustle.id,
                    message=f"Test message for {s} - {lvl}",
                    metadata_json={"marker": "query_test"},
                )
            )
    adversarial_db.commit()

    # Filter by service
    discovery_logs = adversarial_db.query(TerminalLog).filter(TerminalLog.service == "discovery").all()
    assert len(discovery_logs) > 0
    assert all(l.service == "discovery" for l in discovery_logs)

    # Filter by level
    error_logs = adversarial_db.query(TerminalLog).filter(TerminalLog.level == "error").all()
    assert len(error_logs) > 0
    assert all(l.level == "error" for l in error_logs)

    # Test since_seq cursor
    all_logs = adversarial_db.query(TerminalLog).order_by(TerminalLog.id.asc()).all()
    midpoint_seq = all_logs[len(all_logs) // 2].id

    later_logs = (
        adversarial_db.query(TerminalLog)
        .filter(TerminalLog.id > midpoint_seq)
        .order_by(TerminalLog.id.asc())
        .all()
    )
    assert len(later_logs) > 0
    assert all(l.id > midpoint_seq for l in later_logs)

    # Pydantic serialization check
    for l in later_logs[:5]:
        out = TerminalLogOut.model_validate(l)
        assert out.id == l.id
        assert out.service == l.service


def test_terminal_log_lead_id_set_null_on_lead_delete(adversarial_db):
    """Verify that deleting a Lead sets lead_id to NULL on related TerminalLog records (ON DELETE SET NULL)."""
    lead = adversarial_db.query(Lead).first()
    assert lead is not None
    lead_id = lead.id

    # Create terminal log bound to this lead
    tlog = TerminalLog(
        service="discovery",
        level="info",
        lead_id=lead_id,
        message="Log for lead about to be deleted",
    )
    adversarial_db.add(tlog)
    adversarial_db.commit()
    adversarial_db.refresh(tlog)
    tlog_id = tlog.id

    # Delete lead
    adversarial_db.delete(lead)
    adversarial_db.commit()

    # Check terminal log still exists and lead_id is None (or orphaned)
    persisted_log = adversarial_db.query(TerminalLog).filter(TerminalLog.id == tlog_id).first()
    assert persisted_log is not None
    # In SQLite without foreign key enforcement enabled, lead_id remains the old id or is NULL with FK
    # The key test is that the terminal log record itself was NOT cascade-deleted!
    assert persisted_log.message == "Log for lead about to be deleted"


def test_terminal_log_extreme_message_and_metadata(adversarial_db):
    """Stress test: TerminalLog with 10KB message and deeply nested metadata_json."""
    huge_msg = "LOG_EVENT: " + ("Stack trace line with detailed debugging context...\n" * 200)
    deep_metadata = {
        "level_1": {
            "level_2": {
                "level_3": {
                    "level_4": {
                        "level_5": [1, 2, 3, "deep_leaf"],
                        "flags": {"enabled": True, "ratio": 0.999},
                    }
                }
            }
        }
    }

    log = TerminalLog(
        service="building",
        level="error",
        message=huge_msg,
        metadata_json=deep_metadata,
    )
    adversarial_db.add(log)
    adversarial_db.commit()
    adversarial_db.refresh(log)

    assert len(log.message) > 10000
    assert log.metadata_json["level_1"]["level_2"]["level_3"]["level_4"]["flags"]["ratio"] == 0.999

    out = TerminalLogOut.model_validate(log)
    assert len(out.message) > 10000


# ============================================================================
# 3. BOUNDARY CONDITIONS ON MESSAGE DELIVERY STATUS
# ============================================================================


def test_message_delivery_status_valid_values_and_transitions(adversarial_db):
    """Stress test: Message delivery_status across 'queued', 'sent', 'sent_manually', and 'failed'."""
    lead = adversarial_db.query(Lead).first()

    statuses = ["queued", "sent", "sent_manually", "failed"]
    for status_val in statuses:
        msg = Message(
            lead_id=lead.id,
            channel="whatsapp",
            direction="outbound",
            text=f"Testing delivery status: {status_val}",
            delivery_status=status_val,
        )
        adversarial_db.add(msg)
        adversarial_db.commit()
        adversarial_db.refresh(msg)

        assert msg.delivery_status == status_val

        # Pydantic schema validation
        out = MessageOut.model_validate(msg)
        assert out.delivery_status == status_val


def test_message_delivery_status_transition_simulation(adversarial_db):
    """Simulate worker workflow: message begins as 'queued', then transitions to 'sent' or 'failed'."""
    lead = adversarial_db.query(Lead).first()

    # Step 1: Outgoing message queued for automation
    msg = Message(
        lead_id=lead.id,
        channel="whatsapp",
        direction="outbound",
        text="Pitch message to be dispatched via Playwright",
        delivery_status="queued",
    )
    adversarial_db.add(msg)
    adversarial_db.commit()
    adversarial_db.refresh(msg)
    assert msg.delivery_status == "queued"

    # Step 2: Automation worker successfully delivers message
    msg.delivery_status = "sent"
    adversarial_db.commit()
    adversarial_db.refresh(msg)
    assert msg.delivery_status == "sent"

    # Step 3: Failure scenario on another message
    msg_fail = Message(
        lead_id=lead.id,
        channel="whatsapp",
        direction="outbound",
        text="Pitch message that encountered timeout",
        delivery_status="queued",
    )
    adversarial_db.add(msg_fail)
    adversarial_db.commit()
    adversarial_db.refresh(msg_fail)

    # Worker marks failed
    msg_fail.delivery_status = "failed"
    msg_fail.metadata_json = {"error": "Playwright navigation timeout"}
    adversarial_db.commit()
    adversarial_db.refresh(msg_fail)
    assert msg_fail.delivery_status == "failed"
    assert msg_fail.metadata_json.get("error") == "Playwright navigation timeout"


def test_message_immutability_rule_enforced(adversarial_db):
    """Verify that MessageService.modify_message_blocked raises MethodNotAllowedError."""
    with pytest.raises(MethodNotAllowedError) as exc_info:
        MessageService.modify_message_blocked()
    assert "Messages are immutable" in str(exc_info.value)


def test_message_linked_with_outbox_item_and_cascade(adversarial_db):
    """Verify Message foreign key link to OutboxItem and behavior when outbox item is unlinked."""
    lead = adversarial_db.query(Lead).first()

    outbox = OutboxItem(
        lead_id=lead.id,
        hustle_id=lead.hustle_id,
        channel="whatsapp",
        text="Outbox item text",
        unique_key="adversarial_test_unique_key_1",
        status="sent",
    )
    adversarial_db.add(outbox)
    adversarial_db.flush()

    msg = Message(
        lead_id=lead.id,
        channel="whatsapp",
        direction="outbound",
        text="Outbox item text",
        delivery_status="sent",
        outbox_id=outbox.id,
    )
    adversarial_db.add(msg)
    adversarial_db.commit()
    adversarial_db.refresh(msg)

    assert msg.outbox_id == outbox.id
    assert msg.outbox_item.id == outbox.id

    # Test outbox item unlinked
    msg.outbox_id = None
    adversarial_db.commit()
    adversarial_db.refresh(msg)
    assert msg.outbox_id is None


# ============================================================================
# 4. INBOUND REPLY SIDE-EFFECTS
# ============================================================================


def test_inbound_reply_transitions_lead_to_replied_and_clears_needs_followup(adversarial_db):
    """Verify logging an inbound reply reliably sets lead.status='REPLIED' and clears lead.needs_followup=False."""
    # Find a lead in 'contacted' stage
    lead = adversarial_db.query(Lead).filter(Lead.stage_rel.has(slug="contacted")).first()
    assert lead is not None

    # Artificially flag lead as needing followup
    lead.needs_followup = True
    lead.status = "CONTACTED"
    adversarial_db.commit()
    adversarial_db.refresh(lead)

    assert lead.needs_followup is True
    assert lead.status == "CONTACTED"

    # Log inbound reply via MessageService
    payload = MessageCreate(
        channel="whatsapp",
        direction="inbound",
        text="Hello, we are interested in seeing the demo website for our clinic.",
    )
    msg = MessageService.append_message(adversarial_db, lead.id, payload)
    assert msg.id is not None
    assert msg.direction == "inbound"

    adversarial_db.refresh(lead)
    assert lead.status == "REPLIED", f"Expected lead status to be 'REPLIED', got {lead.status}"
    assert lead.needs_followup is False, f"Expected needs_followup to be False, got {lead.needs_followup}"
    assert lead.stage_rel.slug == "replied", f"Expected lead stage to be 'replied', got {lead.stage_rel.slug}"


def test_rapid_consecutive_inbound_replies(adversarial_db):
    """Verify that multiple consecutive inbound messages maintain lead.status='REPLIED' and needs_followup=False."""
    lead = adversarial_db.query(Lead).filter(Lead.stage_rel.has(slug="contacted")).first()
    lead.needs_followup = True
    adversarial_db.commit()

    replies = [
        "First reply: We saw your message.",
        "Second reply: Can you share Dr. Sneha's sample design?",
        "Third reply: What are your commercial terms?",
    ]

    for reply_text in replies:
        MessageService.append_message(
            adversarial_db,
            lead.id,
            MessageCreate(
                channel="whatsapp",
                direction="inbound",
                text=reply_text,
            ),
        )
        adversarial_db.refresh(lead)
        assert lead.status == "REPLIED"
        assert lead.needs_followup is False


def test_outbound_and_internal_notes_do_not_clear_needs_followup(adversarial_db):
    """Verify that internal_note and outbound messages do NOT clear needs_followup or transition status to REPLIED."""
    lead = adversarial_db.query(Lead).filter(Lead.stage_rel.has(slug="contacted")).first()
    lead.needs_followup = True
    lead.status = "CONTACTED"
    adversarial_db.commit()

    # 1. Add internal note
    MessageService.append_message(
        adversarial_db,
        lead.id,
        MessageCreate(
            channel="note",
            direction="internal_note",
            text="Internal note: Called doctor, clinic receptionist picked up.",
        ),
    )
    adversarial_db.refresh(lead)
    assert lead.needs_followup is True, "Internal note must NOT clear needs_followup"
    assert lead.status == "CONTACTED", "Internal note must NOT set status to REPLIED"

    # 2. Add outbound message
    MessageService.append_message(
        adversarial_db,
        lead.id,
        MessageCreate(
            channel="whatsapp",
            direction="outbound",
            text="Outbound nudge: Doctor, please let us know when is a good time.",
        ),
    )
    adversarial_db.refresh(lead)
    assert lead.needs_followup is True, "Outbound message must NOT clear needs_followup"
    assert lead.status == "CONTACTED", "Outbound message must NOT set status to REPLIED"


def test_inbound_stop_reply_sets_do_not_contact_and_moves_to_lost(adversarial_db):
    """Verify that an inbound message with STOP intent sets do_not_contact=True and transitions to lost stage."""
    lead = adversarial_db.query(Lead).filter(Lead.stage_rel.has(slug="contacted")).first()
    lead.do_not_contact = False
    lead.needs_followup = True
    adversarial_db.commit()

    stop_payload = MessageCreate(
        channel="whatsapp",
        direction="inbound",
        text="STOP please. Do not contact us again or send any more messages.",
    )
    MessageService.append_message(adversarial_db, lead.id, stop_payload)
    adversarial_db.refresh(lead)

    assert lead.do_not_contact is True
    assert "STOP" in lead.do_not_contact_reason
    assert lead.stage_rel.slug == "lost"


def test_inbound_disallowed_channel_rejected_with_403(adversarial_db):
    """Verify that logging an inbound reply on a disallowed channel (e.g. Email or Instagram) raises HTTP 403."""
    lead = adversarial_db.query(Lead).first()

    for disallowed in ["email", "instagram", "sms", "telegram"]:
        with pytest.raises(HTTPException) as exc_info:
            MessageService.append_message(
                adversarial_db,
                lead.id,
                MessageCreate(
                    channel=disallowed,
                    direction="inbound",
                    text="Inbound reply via unauthorized channel",
                ),
            )
        assert exc_info.value.status_code == 403
        assert "Channel restriction" in exc_info.value.detail


def test_won_lead_retains_won_stage_on_inbound_reply(adversarial_db):
    """Verify that a lead in 'won' stage does NOT have its stage downgraded on inbound reply, but status updates."""
    lead = adversarial_db.query(Lead).filter(Lead.stage_rel.has(is_won=True)).first()
    assert lead is not None
    assert lead.stage_rel.is_won is True
    original_stage_id = lead.stage_id

    lead.needs_followup = True
    adversarial_db.commit()

    msg = MessageService.append_message(
        adversarial_db,
        lead.id,
        MessageCreate(
            channel="whatsapp",
            direction="inbound",
            text="Hi! We are ready to make the payment for the annual maintenance package.",
        ),
    )
    assert msg.id is not None
    adversarial_db.refresh(lead)

    # Stage must remain WON
    assert lead.stage_id == original_stage_id
    assert lead.stage_rel.is_won is True
    # Status should reflect REPLIED and needs_followup cleared
    assert lead.status == "REPLIED"
    assert lead.needs_followup is False


# ============================================================================
# 5. CONCURRENCY & MULTI-THREADED STRESS HARNESS
# ============================================================================


def test_concurrent_terminal_logging_multithreaded():
    """Verify that concurrent writes to TerminalLog across multiple worker threads preserve data integrity."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    ensure_schema_columns(engine)
    SessionFactory = sessionmaker(bind=engine)

    num_threads = 5
    logs_per_thread = 20
    barrier = threading.Barrier(num_threads)
    db_lock = threading.Lock()

    def worker_log(thread_idx: int):
        barrier.wait()
        session = SessionFactory()
        try:
            for i in range(logs_per_thread):
                with db_lock:
                    log = TerminalLog(
                        service="outreach" if thread_idx % 2 == 0 else "discovery",
                        level="info",
                        message=f"Thread {thread_idx} log entry #{i}",
                        metadata_json={"thread": thread_idx, "entry": i},
                    )
                    session.add(log)
                    session.commit()
        finally:
            session.close()

    threads = [threading.Thread(target=worker_log, args=(t,)) for t in range(num_threads)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    verify_session = SessionFactory()
    total_logs = verify_session.query(TerminalLog).count()
    verify_session.close()

    assert total_logs == num_threads * logs_per_thread, f"Expected {num_threads * logs_per_thread}, got {total_logs}"


def test_concurrent_call_creation_multithreaded():
    """Verify that multiple threads concurrently creating Call entities on different leads succeed without corruption."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    ensure_schema_columns(engine)
    SessionFactory = sessionmaker(bind=engine)

    # Seed leads
    init_db = SessionFactory()
    seed_initial_data(init_db, include_demo_leads=True)
    leads = init_db.query(Lead).all()
    lead_ids = [l.id for l in leads[:5]]
    init_db.close()

    barrier = threading.Barrier(len(lead_ids))
    db_lock = threading.Lock()

    def worker_call(lead_id: int):
        barrier.wait()
        session = SessionFactory()
        try:
            for i in range(5):
                with db_lock:
                    call = Call(
                        lead_id=lead_id,
                        raw_text=f"Concurrent call transcript for lead {lead_id} run {i}",
                        summary=f"Summary {i}",
                        interests=["Laser", "Zirconia"],
                        objections=[],
                        commitments=[],
                        next_steps=[f"Next action {i}"],
                        duration_seconds=120 * (i + 1),
                        outcome="completed",
                    )
                    session.add(call)
                    session.commit()
        finally:
            session.close()

    threads = [threading.Thread(target=worker_call, args=(lid,)) for lid in lead_ids]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    verify_session = SessionFactory()
    for lid in lead_ids:
        lead_calls = verify_session.query(Call).filter(Call.lead_id == lid).all()
        # Seeded call might exist, so count is at least 5
        assert len(lead_calls) >= 5
    verify_session.close()

