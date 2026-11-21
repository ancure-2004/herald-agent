from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.db.session import Base


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
    pipeline_steps = Column(JSON, default=list)
    allowed_channels = Column(JSON, default=list)
    channel_limits = Column(JSON, default=dict)
    channel_goals = Column(JSON, default=dict)
    minimum_stock_days = Column(Integer, default=3)
    template_set = Column(JSON, default=dict)
    followup_sequence = Column(JSON, default=list)
    ai_field_questions = Column(JSON, default=list)
    custom_field_defs = Column(JSON, default=list)
    autonomy_mode = Column(String(50), default="copilot")
    deal_value_inr = Column(Integer, default=15000)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    stages = relationship("Stage", back_populates="hustle", cascade="all, delete-orphan", order_by="Stage.order")
    leads = relationship("Lead", back_populates="hustle")
    smart_views = relationship("SmartView", back_populates="hustle", cascade="all, delete-orphan")
    terminal_logs = relationship("TerminalLog", back_populates="hustle")


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
    status = Column(String(50), default="STAGED", nullable=True, index=True)
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
    automation_enabled = Column(Boolean, default=True, index=True)
    needs_followup = Column(Boolean, default=False, index=True)
    next_followup_at = Column(DateTime(timezone=True), nullable=True, index=True)
    is_test = Column(Boolean, default=False, index=True)
    test_run_id = Column(String(100), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    hustle = relationship("Hustle", back_populates="leads")
    stage_rel = relationship("Stage", back_populates="leads")
    facts = relationship("LeadFact", back_populates="lead", cascade="all, delete-orphan")
    packages = relationship("Package", back_populates="lead", cascade="all, delete-orphan")
    messages = relationship(
        "Message", back_populates="lead", cascade="all, delete-orphan", order_by="Message.created_at"
    )
    events = relationship(
        "TrackingEvent", back_populates="lead", cascade="all, delete-orphan", order_by="TrackingEvent.created_at.desc()"
    )
    commitments = relationship("Commitment", back_populates="lead", cascade="all, delete-orphan")
    outbox_items = relationship("OutboxItem", back_populates="lead", cascade="all, delete-orphan")
    calls = relationship(
        "Call", back_populates="lead", cascade="all, delete-orphan", order_by="Call.created_at.desc()"
    )
    terminal_logs = relationship("TerminalLog", back_populates="lead")

    @property
    def stage_slug(self) -> str:
        return self.stage_rel.slug if self.stage_rel else ""

    @property
    def stage_name(self) -> str:
        return self.stage_rel.name if self.stage_rel else ""

    @property
    def is_lost(self) -> bool:
        if (self.status or "").upper() in ("CLOSED_LOST", "LOST"):
            return True
        if self.stage_rel and self.stage_rel.is_lost:
            return True
        if self.stage_id == 8:
            return True
        return bool(self.is_archived or self.do_not_contact)

    @property
    def is_won(self) -> bool:
        if (self.status or "").upper() in ("WON", "CLOSED_WON"):
            return True
        if self.stage_rel and self.stage_rel.is_won:
            return True
        if self.stage_id == 7:
            return True
        return False

    __table_args__ = (
        Index("ix_leads_stage_id_updated_at", "stage_id", "updated_at"),
        Index("ix_leads_status_updated_at", "status", "updated_at"),
        Index("ix_leads_created_at", "created_at"),
        Index("ix_leads_city", "city"),
        Index("ix_leads_city_locality", "city", "locality"),
        Index("ix_leads_hustle_id_city", "hustle_id", "city"),
    )


class LeadFact(Base):
    """Table 4: lead_facts - Every researched detail with source & confidence."""

    __tablename__ = "lead_facts"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True)
    field = Column(String(120), nullable=False)
    value = Column(Text, nullable=False)
    source = Column(String(200), nullable=False)
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
    asset_links = Column(JSON, default=dict)
    video_file_path = Column(String(500), default="")
    video_size_mb = Column(Float, default=0.0)
    clinic_payload = Column(JSON, default=dict)
    quality_score = Column(Integer, default=100)
    self_check_passed = Column(Boolean, default=True)
    self_check_report = Column(JSON, default=dict)
    status = Column(String(50), default="ready_for_review", index=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    last_verified_at = Column(DateTime(timezone=True), default=utcnow)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    lead = relationship("Lead", back_populates="packages")
    events = relationship("TrackingEvent", back_populates="package")


class Message(Base):
    """Table 6: messages - Every message in or out, plus notes (Immutable: never edited or deleted)."""

    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True)
    channel = Column(String(50), nullable=False)
    direction = Column(String(20), nullable=False)
    text = Column(Text, nullable=False)
    template_used = Column(String(150), default="")
    ai_label = Column(String(80), default="")
    delivery_status = Column(String(30), default="sent", index=True)
    outbox_id = Column(Integer, ForeignKey("outbox.id", ondelete="SET NULL"), nullable=True, index=True)
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=utcnow, index=True)

    lead = relationship("Lead", back_populates="messages")
    outbox_item = relationship("OutboxItem", foreign_keys=[outbox_id])

    __table_args__ = (
        Index("ix_messages_lead_id_created_at", "lead_id", "created_at"),
    )


class TrackingEvent(Base):
    """Table 7: events - Views by section, button taps, design choices."""

    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True)
    package_id = Column(Integer, ForeignKey("packages.id", ondelete="SET NULL"), nullable=True, index=True)
    event_type = Column(String(80), nullable=False)
    section = Column(String(120), default="")
    design_chosen = Column(String(80), default="")
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
    who_owes_it = Column(String(50), nullable=False, default="us")
    what = Column(String(500), nullable=False)
    raw_phrase = Column(String(250), default="")
    due_at = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(50), default="proposed")
    created_at = Column(DateTime(timezone=True), default=utcnow)

    lead = relationship("Lead", back_populates="commitments")


class OutboxItem(Base):
    """Table 9: outbox - Messages waiting to be sent with idempotency key and safety checks."""

    __tablename__ = "outbox"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True)
    hustle_id = Column(Integer, ForeignKey("hustles.id"), nullable=False, index=True)
    channel = Column(String(50), nullable=False, index=True)
    text = Column(Text, nullable=False)
    media_path = Column(String(500), default="")
    unique_key = Column(String(255), unique=True, nullable=False, index=True)
    status = Column(String(50), default="pending_approval", index=True)
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
    job_type = Column(String(100), nullable=False, index=True)
    input_payload = Column(JSON, default=dict)
    status = Column(String(50), default="queued", index=True)
    priority = Column(Integer, default=10)
    attempts = Column(Integer, default=0)
    max_attempts = Column(Integer, default=2)
    run_after = Column(DateTime(timezone=True), default=utcnow, index=True)
    locked_until = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), default=utcnow)
    completed_at = Column(DateTime(timezone=True), nullable=True)


class SmartView(Base):
    """Table 11: smart_views - Saved filters and queues."""

    __tablename__ = "smart_views"

    id = Column(Integer, primary_key=True, index=True)
    hustle_id = Column(Integer, ForeignKey("hustles.id", ondelete="CASCADE"), nullable=False, index=True)
    slug = Column(String(100), nullable=False)
    name = Column(String(150), nullable=False)
    icon = Column(String(50), default="Filter")
    filter_spec = Column(JSON, default=dict)
    sort_order = Column(Integer, default=0)
    is_pinned = Column(Boolean, default=False)

    hustle = relationship("Hustle", back_populates="smart_views")

    __table_args__ = (UniqueConstraint("hustle_id", "slug", name="uq_hustle_smart_view_slug"),)


class Objection(Base):
    """Table 12: objections - Objections and tested counter-scripts."""

    __tablename__ = "objections"

    id = Column(Integer, primary_key=True, index=True)
    hustle_id = Column(Integer, ForeignKey("hustles.id", ondelete="CASCADE"), nullable=False, index=True)
    label = Column(String(150), unique=True, nullable=False)
    trigger_phrases = Column(JSON, default=list)
    best_replies = Column(JSON, default=list)
    times_encountered = Column(Integer, default=0)
    times_progressed = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class RunLog(Base):
    """Table 11: runs - A log of each automated run and trace."""

    __tablename__ = "runs"

    id = Column(Integer, primary_key=True, index=True)
    hustle_id = Column(Integer, ForeignKey("hustles.id"), nullable=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True)
    job_type = Column(String(100), nullable=False, index=True)
    status = Column(String(50), default="succeeded")
    count_found = Column(Integer, default=0)
    count_passed = Column(Integer, default=0)
    count_dropped = Column(Integer, default=0)
    drop_reasons = Column(JSON, default=dict)
    errors = Column(JSON, default=list)
    trace_logs = Column(JSON, default=list)
    started_at = Column(DateTime(timezone=True), default=utcnow)
    finished_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_runs_hustle_id_job_type", "hustle_id", "job_type"),
        Index("ix_runs_job_type_started_at", "job_type", "started_at"),
        Index("ix_runs_started_at", "started_at"),
    )


class AvailabilityDay(Base):
    """Table 12: availability - The mode of each day (normal, away, off)."""

    __tablename__ = "availability"

    id = Column(Integer, primary_key=True, index=True)
    date_str = Column(String(20), unique=True, nullable=False, index=True)  # YYYY-MM-DD
    mode = Column(String(30), nullable=False, default="normal")  # normal, away, off
    note = Column(String(250), default="")
    source = Column(String(50), default="manual")  # manual, telegram, calendar
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


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


class Call(Base):
    """Table 13: calls - Raw call logs, AI-structured 5-section notes, and prep briefs."""

    __tablename__ = "calls"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True)
    raw_text = Column(Text, nullable=False)
    summary = Column(Text, default="")
    interests = Column(JSON, default=list)
    objections = Column(JSON, default=list)
    commitments = Column(JSON, default=list)
    next_steps = Column(JSON, default=list)
    prep_brief = Column(Text, default="")
    duration_seconds = Column(Integer, default=0)
    outcome = Column(String(50), default="completed")
    created_at = Column(DateTime(timezone=True), default=utcnow, index=True)

    lead = relationship("Lead", back_populates="calls")

    __table_args__ = (
        Index("ix_calls_lead_id_created_at", "lead_id", "created_at"),
    )


class TerminalLog(Base):
    """Table 14: terminal_logs - Structured logs for Discovery, Building, and Outreach terminals."""

    __tablename__ = "terminal_logs"

    id = Column(Integer, primary_key=True, index=True)
    service = Column(String(50), nullable=False, index=True)
    level = Column(String(20), default="info", index=True)
    lead_id = Column(Integer, ForeignKey("leads.id", ondelete="SET NULL"), nullable=True, index=True)
    hustle_id = Column(Integer, ForeignKey("hustles.id", ondelete="SET NULL"), nullable=True, index=True)
    message = Column(Text, nullable=False)
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=utcnow, index=True)

    lead = relationship("Lead", back_populates="terminal_logs")
    hustle = relationship("Hustle", back_populates="terminal_logs")


class AppSetting(Base):
    """Table 15: app_settings - Durable key/value store for runtime settings (e.g. automation toggle).

    Replaces in-memory globals so server restarts and --reload respect the last saved value.
    """

    __tablename__ = "app_settings"

    key = Column(String(100), primary_key=True, nullable=False)
    value = Column(Text, nullable=False, default="")
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
