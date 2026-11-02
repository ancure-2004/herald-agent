from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class StageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    hustle_id: int
    slug: str
    name: str
    order: int
    color: str
    is_won: bool
    is_lost: bool


class SmartViewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    hustle_id: int
    slug: str
    name: str
    icon: str
    filter_spec: Dict[str, Any]
    sort_order: int
    is_pinned: bool


class HustleCreate(BaseModel):
    slug: str
    name: str
    description: str = ""
    proof_asset_type: str = "3_demo_sites_and_video"
    search_query: str = "dental clinic in Delhi NCR"
    pipeline_steps: List[str] = Field(
        default_factory=lambda: [
            "find",
            "confirm_no_website",
            "research",
            "channel_check",
            "build",
            "self_check",
            "record",
        ]
    )
    allowed_channels: List[str] = Field(default_factory=lambda: ["whatsapp", "instagram", "email"])
    channel_limits: Dict[str, int] = Field(default_factory=lambda: {"whatsapp": 20, "instagram": 15, "email": 25})
    channel_goals: Dict[str, int] = Field(default_factory=lambda: {"whatsapp": 15, "instagram": 5, "email": 5})
    minimum_stock_days: int = 3
    ai_field_questions: List[Dict[str, str]] = Field(default_factory=list)
    custom_field_defs: List[Dict[str, str]] = Field(default_factory=list)
    autonomy_mode: str = "copilot"
    deal_value_inr: int = 15000


class HustleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    search_query: Optional[str] = None
    allowed_channels: Optional[List[str]] = None
    channel_limits: Optional[Dict[str, int]] = None
    channel_goals: Optional[Dict[str, int]] = None
    minimum_stock_days: Optional[int] = None
    ai_field_questions: Optional[List[Dict[str, str]]] = None
    custom_field_defs: Optional[List[Dict[str, str]]] = None
    autonomy_mode: Optional[str] = None
    deal_value_inr: Optional[int] = None


class HustleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    name: str
    description: str
    proof_asset_type: str
    search_query: str
    pipeline_steps: List[str]
    allowed_channels: List[str]
    channel_limits: Dict[str, Any]
    channel_goals: Dict[str, Any]
    minimum_stock_days: int
    ai_field_questions: List[Any]
    custom_field_defs: List[Any]
    autonomy_mode: str
    deal_value_inr: int
    is_active: bool
    stages: List[StageOut] = []
    smart_views: List[SmartViewOut] = []


class LeadFactCreate(BaseModel):
    field: str
    value: str
    source: str
    confidence: float = 1.0
    verified_by_two_sources: bool = False


class LeadFactOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    lead_id: int
    field: str
    value: str
    source: str
    confidence: float
    verified_by_two_sources: bool
    checked_at: datetime


class PackageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    lead_id: int
    version: int
    asset_links: Dict[str, Any]
    video_file_path: str
    video_size_mb: float
    clinic_payload: Dict[str, Any]
    quality_score: int
    self_check_passed: bool
    self_check_report: Dict[str, Any]
    status: str
    sent_at: Optional[datetime]
    expires_at: Optional[datetime]
    created_at: datetime


class MessageCreate(BaseModel):
    channel: str = "note"
    direction: str = "internal_note"
    text: str
    template_used: str = ""
    ai_label: str = ""


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    lead_id: int
    channel: str
    direction: str
    text: str
    template_used: str
    ai_label: str
    created_at: datetime


class TrackingEventCreate(BaseModel):
    lead_slug: Optional[str] = None
    lead_id: Optional[int] = None
    package_id: Optional[int] = None
    event_type: str  # page_view, section_view, design_choice, whatsapp_tap
    section: str = ""
    design_chosen: str = ""
    duration_seconds: int = 0
    user_agent: str = ""


class TrackingEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    lead_id: int
    package_id: Optional[int]
    event_type: str
    section: str
    design_chosen: str
    duration_seconds: int
    is_bot: bool
    created_at: datetime


class CommitmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    lead_id: int
    who_owes_it: str
    what: str
    raw_phrase: str
    due_at: datetime
    status: str
    created_at: datetime


class LeadCreate(BaseModel):
    hustle_id: int
    stage_id: Optional[int] = None
    slug: Optional[str] = None
    name: str
    doctor_name: str = ""
    locality: str = ""
    city: str = "Delhi NCR"
    address: str = ""
    primary_phone: Optional[str] = None
    email: Optional[str] = None
    instagram_handle: Optional[str] = None
    preferred_channel: str = "whatsapp"
    next_action: Optional[str] = None
    next_action_due_at: Optional[datetime] = None
    custom_fields: Dict[str, Any] = Field(default_factory=dict)
    ai_fields: Dict[str, Any] = Field(default_factory=dict)
    deal_value_inr: int = 15000
    facts: List[LeadFactCreate] = Field(default_factory=list)


class LeadUpdate(BaseModel):
    name: Optional[str] = None
    doctor_name: Optional[str] = None
    locality: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    primary_phone: Optional[str] = None
    email: Optional[str] = None
    instagram_handle: Optional[str] = None
    preferred_channel: Optional[str] = None
    stage_id: Optional[int] = None
    next_action: Optional[str] = None
    next_action_due_at: Optional[datetime] = None
    do_not_contact: Optional[bool] = None
    do_not_contact_reason: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None
    ai_fields: Optional[Dict[str, Any]] = None
    what_changed_summary: Optional[str] = None
    deal_value_inr: Optional[int] = None


class CompleteTaskRequest(BaseModel):
    completed_note: str = ""
    next_action: Optional[str] = None
    next_action_due_at: Optional[datetime] = None
    move_to_stage_id: Optional[int] = None
    archive: bool = False
    archive_reason: str = ""


class LeadOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    hustle_id: int
    stage_id: int
    slug: str
    name: str
    doctor_name: str
    locality: str
    city: str
    address: str
    primary_phone: Optional[str]
    phones: List[str]
    email: Optional[str]
    instagram_handle: Optional[str]
    preferred_channel: str
    fit_score: int
    fit_reasons: List[str]
    intent_score: int
    intent_reasons: List[str]
    next_action: Optional[str]
    next_action_due_at: Optional[datetime]
    do_not_contact: bool
    do_not_contact_reason: str
    is_archived: bool
    archive_reason: str
    custom_fields: Dict[str, Any]
    ai_fields: Dict[str, Any]
    what_changed_summary: str
    deal_value_inr: int
    created_at: datetime
    updated_at: datetime
    facts: List[LeadFactOut] = []
    packages: List[PackageOut] = []
    messages: List[MessageOut] = []
    events: List[TrackingEventOut] = []
    commitments: List[CommitmentOut] = []


class OutboxApproveRequest(BaseModel):
    lead_id: int
    channel: str
    text: str
    media_path: str = ""
    step_tag: str = "initial_pitch"
    send_immediately: bool = True


class AvailabilitySetRequest(BaseModel):
    date_str: str
    mode: str  # normal, away, off
    note: str = ""


class TelegramCommandRequest(BaseModel):
    command_text: str


class ProblemReportCreate(BaseModel):
    page: str
    element: str = ""
    user_description: str
    lead_id: Optional[int] = None
    run_id: Optional[int] = None
