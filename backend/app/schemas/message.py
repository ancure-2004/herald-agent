from datetime import datetime

from .common import BaseORMModel, BaseSchema


class MessageCreate(BaseSchema):
    channel: str = "note"
    direction: str = "internal_note"
    text: str
    template_used: str = ""
    ai_label: str = ""


class MessageOut(BaseORMModel):
    id: int
    lead_id: int
    channel: str
    direction: str
    text: str
    template_used: str
    ai_label: str
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
