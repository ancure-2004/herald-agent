from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import Field

from .common import BaseORMModel, BaseSchema


class MessageCreate(BaseSchema):
    channel: str = "note"
    direction: str = "internal_note"
    text: str
    template_used: str = ""
    ai_label: str = ""
    delivery_status: Optional[str] = "sent"
    outbox_id: Optional[int] = None


class MessageOut(BaseORMModel):
    id: int
    lead_id: int
    channel: str
    direction: str
    text: str
    template_used: str
    ai_label: str
    delivery_status: str = "sent"
    outbox_id: Optional[int] = None
    created_at: datetime


class CommitmentOut(BaseORMModel):
    id: int
    lead_id: int
    who_owes_it: str
    what: str
    raw_phrase: str
    due_at: datetime
    status: str
    created_at: datetime


class OutboxApproveRequest(BaseSchema):
    lead_id: int
    channel: str
    text: str
    media_path: str = ""
    step_tag: str = "initial_pitch"
    send_immediately: bool = True


class MessageSendRequest(BaseSchema):
    text: str = Field(..., min_length=1)
    channel: str = "whatsapp"
    automation: Optional[bool] = None


class MessageSendResponse(BaseSchema):
    status: str
    outbox_id: Optional[int] = None
    wa_url: Optional[str] = None
    delivery_status: str
    message_id: Optional[int] = None


class ManualReplyRequest(BaseSchema):
    text: str = Field(..., min_length=1)
    channel: str = "whatsapp"
    created_at: Optional[datetime] = None


class ReplySuggestionItem(BaseSchema):
    category: str
    text: str
    tone: str


class ReplySuggestionsResponse(BaseSchema):
    lead_id: int
    suggestions: List[ReplySuggestionItem] = Field(default_factory=list)


class ManualReplyResponse(BaseSchema):
    messages: List[MessageOut] = Field(default_factory=list)
    lead_status: str
    needs_followup: bool
    ai_suggestions: List[Dict[str, Any]] = Field(default_factory=list)


class AutomationSettingsSchema(BaseSchema):
    automation_enabled: bool = True
    whatsapp_sender_mode: str = "playwright"
    auto_reply_analysis: bool = True


class AutomationSettingsUpdate(BaseSchema):
    automation_enabled: Optional[bool] = None
    whatsapp_sender_mode: Optional[str] = None
    auto_reply_analysis: Optional[bool] = None

