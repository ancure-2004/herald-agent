from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import Field

from .common import BaseORMModel, BaseSchema
from .message import CommitmentOut, MessageOut
from .package import PackageOut
from .tracking import TrackingEventOut


class LeadFactCreate(BaseSchema):
    field: str
    value: str
    source: str
    confidence: float = 1.0
    verified_by_two_sources: bool = False


class LeadFactOut(BaseORMModel):
    id: int
    lead_id: int
    field: str
    value: str
    source: str
    confidence: float
    verified_by_two_sources: bool
    checked_at: datetime


class LeadCreate(BaseSchema):
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


class LeadUpdate(BaseSchema):
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


class CompleteTaskRequest(BaseSchema):
    completed_note: str = ""
    next_action: Optional[str] = None
    next_action_due_at: Optional[datetime] = None
    move_to_stage_id: Optional[int] = None
    archive: bool = False
    archive_reason: str = ""


class LeadOut(BaseORMModel):
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
