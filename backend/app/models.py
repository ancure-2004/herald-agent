from datetime import datetime, timezone
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from .database import Base


def utcnow():
    return datetime.now(timezone.utc)


class Hustle(Base):
    """Table 1: hustles - One row per side hustle."""
    __tablename__ = "hustles"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, default="")
    proof_asset_type = Column(String(100), default="3_demo_sites_and_video")
    search_query = Column(String(500), default="dental clinic in Delhi NCR")
    pipeline_steps = Column(JSON, default=list)  # e.g. ["find", "verify_no_website", "research", "channel_check", "build", "self_check", "record"]
    allowed_channels = Column(JSON, default=list)  # e.g. ["whatsapp", "instagram", "email"]
    channel_limits = Column(JSON, default=dict)  # e.g. {"whatsapp": 20, "instagram": 15, "email": 25}
    channel_goals = Column(JSON, default=dict)  # e.g. {"whatsapp": 15, "instagram": 10, "email": 5}
    minimum_stock_days = Column(Integer, default=3)
    template_set = Column(JSON, default=dict)
    followup_sequence = Column(JSON, default=list)
    ai_field_questions = Column(JSON, default=list)  # Custom AI questions per hustle
    custom_field_defs = Column(JSON, default=list)  # Custom field definitions per hustle
    autonomy_mode = Column(String(50), default="copilot")  # "copilot" or "autopilot"
    deal_value_inr = Column(Integer, default=15000)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    stages = relationship("Stage", back_populates="hustle", cascade="all, delete-orphan", order_by="Stage.order")
    leads = relationship("Lead", back_populates="hustle")
    smart_views = relationship("SmartView", back_populates="hustle", cascade="all, delete-orphan")


class Stage(Base):
    """Table 2: stages - Pipeline stages for each hustle."""
    __tablename__ = "stages"

    id = Column(Integer, primary_key=True, index=True)
    hustle_id = Column(Integer, ForeignKey("hustles.id", ondelete="CASCADE"), nullable=False, index=True)
    slug = Column(String(100), nullable=False)
    name = Column(String(150), nullable=False)
    order = Column(Integer, nullable=False, default=0)
    color = Column(String(50), default="slate")
    is_won = Column(Boolean, default=False)
    is_lost = Column(Boolean, default=False)

    hustle = relationship("Hustle", back_populates="stages")
    leads = relationship("Lead", back_populates="stage_rel")

    __table_args__ = (UniqueConstraint("hustle_id", "slug", name="uq_hustle_stage_slug"),)


class Lead(Base):
    """Table 3: leads - One row per lead (for clinics, one clinic)."""
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    hustle_id = Column(Integer, ForeignKey("hustles.id"), nullable=False, index=True)
    stage_id = Column(Integer, ForeignKey("stages.id"), nullable=False, index=True)
    slug = Column(String(200), unique=True, nullable=False, index=True)
    name = Column(String(300), nullable=False, index=True)
    doctor_name = Column(String(250), default="")
    locality = Column(String(250), default="")
    city = Column(String(150), default="Delhi NCR")
    address = Column(Text, default="")
    primary_phone = Column(String(40), unique=True, nullable=True, index=True)
    phones = Column(JSON, default=list)
    email = Column(String(250), nullable=True, index=True)
    instagram_handle = Column(String(150), unique=True, nullable=True, index=True)
    preferred_channel = Column(String(50), default="whatsapp")
    fit_score = Column(Integer, default=0)
    fit_reasons = Column(JSON, default=list)
    intent_score = Column(Integer, default=0)
    intent_reasons = Column(JSON, default=list)
    next_action = Column(String(500), nullable=True)
    next_action_due_at = Column(DateTime(timezone=True), nullable=True, index=True)
    do_not_contact = Column(Boolean, default=False, index=True)
    do_not_contact_reason = Column(String(300), default="")
    is_archived = Column(Boolean, default=False, index=True)
    archive_reason = Column(String(300), default="")
    custom_fields = Column(JSON, default=dict)
    ai_fields = Column(JSON, default=dict)
    what_changed_summary = Column(Text, default="")
    deal_value_inr = Column(Integer, default=15000)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    hustle = relationship("Hustle", back_populates="leads")
    stage_rel = relationship("Stage", back_populates="leads")
    facts = relationship("LeadFact", back_populates="lead", cascade="all, delete-orphan")
    packages = relationship("Package", back_populates="lead", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="lead", cascade="all, delete-orphan", order_by="Message.created_at")
    events = relationship("TrackingEvent", back_populates="lead", cascade="all, delete-orphan", order_by="TrackingEvent.created_at.desc()")
    commitments = relationship("Commitment", back_populates="lead", cascade="all, delete-orphan")
    outbox_items = relationship("OutboxItem", back_populates="lead", cascade="all, delete-orphan")


class LeadFact(Base):
    """Table 4: lead_facts - Every researched detail with source & confidence."""
    __tablename__ = "lead_facts"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True)
    field = Column(String(120), nullable=False)
    value = Column(Text, nullable=False)
    source = Column(String(200), nullable=False)  # e.g. "Google Maps", "Practo", "Justdial"
    confidence = Column(Float, default=1.0)
    verified_by_two_sources = Column(Boolean, default=False)
    checked_at = Column(DateTime(timezone=True), default=utcnow)

    lead = relationship("Lead", back_populates="facts")


class Package(Base):
    """Table 5: packages - The built proof asset for a lead (3 demo designs and a video)."""
    __tablename__ = "packages"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True)
    version = Column(Integer, default=1)
    asset_links = Column(JSON, default=dict)  # {"choice_page": "...", "modern": "...", "premium": "...", "warm": "..."}
    video_file_path = Column(String(500), default="")
    video_size_mb = Column(Float, default=0.0)
    clinic_payload = Column(JSON, default=dict)  # Canonical JSON for dental-clinic-engine
    quality_score = Column(Integer, default=100)
    self_check_passed = Column(Boolean, default=True)
    self_check_report = Column(JSON, default=dict)
    status = Column(String(50), default="ready_for_review", index=True)  # building, failed_gate, ready_for_review, approved, sent, expired
    sent_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)  # Starts 7 days after sent_at
    last_verified_at = Column(DateTime(timezone=True), default=utcnow)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    lead = relationship("Lead", back_populates="packages")
    events = relationship("TrackingEvent", back_populates="package")


class Message(Base):
    """Table 6: messages - Every message in or out, plus notes (Immutable: never edited or deleted)."""
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True)
    channel = Column(String(50), nullable=False)  # whatsapp, instagram, email, note, call_log, telegram_log
    direction = Column(String(20), nullable=False)  # outbound, inbound, internal_note
    text = Column(Text, nullable=False)
    template_used = Column(String(150), default="")
    ai_label = Column(String(80), default="")  # interested, price_question, not_now, wrong_person, stop, neutral
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=utcnow, index=True)

    lead = relationship("Lead", back_populates="messages")


class TrackingEvent(Base):
    """Table 7: events - Views by section, button taps, design choices."""
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True)
    package_id = Column(Integer, ForeignKey("packages.id", ondelete="SET NULL"), nullable=True, index=True)
    event_type = Column(String(80), nullable=False)  # page_view, section_view, design_choice, whatsapp_tap
    section = Column(String(120), default="")
    design_chosen = Column(String(80), default="")  # modern, premium, warm
    duration_seconds = Column(Integer, default=0)
    user_agent = Column(String(400), default="")
    is_bot = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, index=True)

    lead = relationship("Lead", back_populates="events")
    package = relationship("Package", back_populates="events")


class Commitment(Base):
    """Table 8: commitments - Promises and snoozes read from messages."""
    __tablename__ = "commitments"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True)
    who_owes_it = Column(String(50), nullable=False, default="us")  # "us" or "lead"
    what = Column(String(500), nullable=False)
    raw_phrase = Column(String(250), default="")  # e.g. "next Monday", "after Diwali"
    due_at = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(50), default="proposed")  # proposed, confirmed, completed, dismissed
    created_at = Column(DateTime(timezone=True), default=utcnow)

    lead = relationship("Lead", back_populates="commitments")


class OutboxItem(Base):
    """Table 9: outbox - Messages waiting to be sent with idempotency key and safety checks."""
    __tablename__ = "outbox"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True)
    hustle_id = Column(Integer, ForeignKey("hustles.id"), nullable=False, index=True)
    channel = Column(String(50), nullable=False, index=True)  # whatsapp, instagram, email, linkedin
    text = Column(Text, nullable=False)
    media_path = Column(String(500), default="")
    unique_key = Column(String(255), unique=True, nullable=False, index=True)  # Prevents double-send
    status = Column(String(50), default="pending_approval", index=True)  # pending_approval, queued, sending, sent, paused, failed, blocked
    error_message = Column(Text, default="")
    scheduled_for = Column(DateTime(timezone=True), default=utcnow)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    lead = relationship("Lead", back_populates="outbox_items")


class Job(Base):
    """Table 10: jobs - The autopilot work queue."""
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    hustle_id = Column(Integer, ForeignKey("hustles.id"), nullable=True, index=True)
    job_type = Column(String(100), nullable=False, index=True)  # find, verify_no_website, research, build_package, record_video, send_outbox, stock_refill
    input_payload = Column(JSON, default=dict)
    status = Column(String(50), default="queued", index=True)  # queued, running, succeeded, failed, cancelled
    priority = Column(Integer, default=10)  # Lower number = higher priority (1=send, 2=reply_capture, 3=refill)
    attempts = Column(Integer, default=0)
    max_attempts = Column(Integer, default=2)
    run_after = Column(DateTime(timezone=True), default=utcnow, index=True)
    last_error = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class RunLog(Base):
    """Table 11: runs - A log of each automated run and trace."""
    __tablename__ = "runs"

    id = Column(Integer, primary_key=True, index=True)
    hustle_id = Column(Integer, ForeignKey("hustles.id"), nullable=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True)
    job_type = Column(String(100), nullable=False, index=True)
    status = Column(String(50), default="succeeded")  # running, succeeded, partial, failed
    count_found = Column(Integer, default=0)
    count_passed = Column(Integer, default=0)
    count_dropped = Column(Integer, default=0)
    drop_reasons = Column(JSON, default=dict)  # e.g. {"has_website": 4, "no_whatsapp": 2}
    errors = Column(JSON, default=list)
    trace_logs = Column(JSON, default=list)
    started_at = Column(DateTime(timezone=True), default=utcnow)
    finished_at = Column(DateTime(timezone=True), nullable=True)


class AvailabilityDay(Base):
    """Table 12: availability - The mode of each day (normal, away, off)."""
    __tablename__ = "availability"

    id = Column(Integer, primary_key=True, index=True)
    date_str = Column(String(20), unique=True, nullable=False, index=True)  # YYYY-MM-DD
    mode = Column(String(30), nullable=False, default="normal")  # normal, away, off
    note = Column(String(250), default="")
    source = Column(String(50), default="manual")  # manual, telegram, calendar
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class Objection(Base):
    """Table 13: objections - Your objection library."""
    __tablename__ = "objections"

    id = Column(Integer, primary_key=True, index=True)
    hustle_id = Column(Integer, ForeignKey("hustles.id"), nullable=True, index=True)
    label = Column(String(150), unique=True, nullable=False)  # e.g. "Too expensive / Price question", "Already have Instagram"
    trigger_phrases = Column(JSON, default=list)
    best_replies = Column(JSON, default=list)  # [{"text": "...", "lang": "en", "wins": 4}]
    times_encountered = Column(Integer, default=0)
    times_progressed = Column(Integer, default=0)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class SmartView(Base):
    """Table 14: smart_views - Saved filters that act as your queues and segments."""
    __tablename__ = "smart_views"

    id = Column(Integer, primary_key=True, index=True)
    hustle_id = Column(Integer, ForeignKey("hustles.id", ondelete="CASCADE"), nullable=False, index=True)
    slug = Column(String(100), nullable=False)
    name = Column(String(150), nullable=False)
    icon = Column(String(50), default="Filter")
    filter_spec = Column(JSON, default=dict)  # e.g. {"stage_slug": "package_ready", "due": "today", "min_intent": 40}
    sort_order = Column(Integer, default=0)
    is_pinned = Column(Boolean, default=True)

    hustle = relationship("Hustle", back_populates="smart_views")


class ProblemReport(Base):
    """Trace & Context Brief logger for the Phase 1 'Report a problem' button."""
    __tablename__ = "problem_reports"

    id = Column(Integer, primary_key=True, index=True)
    page = Column(String(200), default="")
    element = Column(String(200), default="")
    user_description = Column(Text, nullable=False)
    lead_id = Column(Integer, nullable=True)
    run_id = Column(Integer, nullable=True)
    context_brief = Column(JSON, default=dict)
    status = Column(String(50), default="open")
    created_at = Column(DateTime(timezone=True), default=utcnow)
