from typing import Any, Dict, List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.controllers.message_controller import MessageController
from app.schemas.message import (
    AutomationSettingsSchema,
    AutomationSettingsUpdate,
    ManualReplyRequest,
    ManualReplyResponse,
    MessageCreate,
    MessageOut,
    MessageSendRequest,
    MessageSendResponse,
    OutboxApproveRequest,
    ReplySuggestionsResponse,
)

router = APIRouter(tags=["Messages"])


@router.get("/leads/{lead_id}/messages", response_model=List[MessageOut])
def get_lead_messages(lead_id: int, db: Session = Depends(get_db)):
    """Returns conversation thread history with delivery statuses for a lead."""
    return MessageController.get_lead_messages(db, lead_id)


@router.post("/leads/{lead_id}/messages", response_model=MessageOut, status_code=201)
def append_message(lead_id: int, payload: MessageCreate, db: Session = Depends(get_db)):
    return MessageController.append_message(db, lead_id, payload)


@router.post("/leads/{lead_id}/messages/send", response_model=MessageSendResponse)
def send_message(lead_id: int, payload: MessageSendRequest, db: Session = Depends(get_db)):
    """
    Sends an outgoing message:
      - Automation ON: queues for Playwright sender (status: queued).
      - Automation OFF: generates prefilled wa.me link and logs sent_manually.
    """
    return MessageController.send_message(db, lead_id, payload)


@router.post("/leads/{lead_id}/messages/log-reply", response_model=ManualReplyResponse)
def log_manual_reply(lead_id: int, payload: ManualReplyRequest, db: Session = Depends(get_db)):
    """
    Logs inbound reply text with editable timestamp and multi-line support.
    Updates lead stage to replied, clears needs_followup, and triggers AI analysis.
    """
    return MessageController.log_reply(db, lead_id, payload)


@router.get("/leads/{lead_id}/reply-suggestions", response_model=ReplySuggestionsResponse)
def get_reply_suggestions(lead_id: int, db: Session = Depends(get_db)):
    """Returns 3 AI reply suggestions (Direct Answer, Value Reframe, Quick OPD Check-in)."""
    return MessageController.get_reply_suggestions(db, lead_id)


@router.get("/settings/automation", response_model=AutomationSettingsSchema)
def get_automation_settings(db: Session = Depends(get_db)):
    """Returns global outreach automation settings (DB-persisted)."""
    return MessageController.get_automation_settings(db)


@router.patch("/settings/automation", response_model=AutomationSettingsSchema)
def update_automation_settings(payload: AutomationSettingsUpdate, db: Session = Depends(get_db)):
    """Updates global outreach automation settings and persists to DB so restarts respect the toggle."""
    return MessageController.update_automation_settings(payload.model_dump(exclude_unset=True), db)


@router.put("/messages/{message_id}")
@router.patch("/messages/{message_id}")
@router.delete("/messages/{message_id}")
def modify_message_blocked(message_id: int):
    MessageController.modify_message_blocked()


@router.post("/commitments/{commitment_id}/confirm")
def confirm_commitment(commitment_id: int, db: Session = Depends(get_db)):
    return MessageController.confirm_commitment(db, commitment_id)


@router.post("/outbox/approve")
def approve_and_send_pitch(payload: OutboxApproveRequest, db: Session = Depends(get_db)):
    return MessageController.approve_and_send_pitch(db, payload)


@router.post("/mark-sent")
def mark_cockpit_sent(payload: Dict[str, Any], db: Session = Depends(get_db)):
    return MessageController.mark_sent(db, payload)


@router.post("/mark-unreachable")
def mark_cockpit_unreachable(payload: Dict[str, Any], db: Session = Depends(get_db)):
    return MessageController.mark_unreachable(db, payload)


@router.post("/update-messages")
def update_messages(payload: Dict[str, Any], db: Session = Depends(get_db)):
    """Saves custom pitch overrides for a lead (wa_msg1, wa_msg2, ig_dm_invite,
    ig_reply_caption, email_subject, email_body).  Only non-empty fields are updated."""
    return MessageController.update_messages(db, payload)


@router.post("/reset-messages")
def reset_messages(payload: Dict[str, Any], db: Session = Depends(get_db)):
    """Removes all saved pitch overrides for a lead, reverting to generated defaults."""
    return MessageController.reset_messages(db, payload)


@router.post("/update-clinic-contact")
def update_clinic_contact(payload: Dict[str, Any], db: Session = Depends(get_db)):
    """Updates a lead's contact details: phone (normalized), email, ig_handle (@ stripped),
    and target_channel (whatsapp / instagram / email)."""
    return MessageController.update_clinic_contact(db, payload)


@router.post("/unmark-sent")
def unmark_sent(payload: Dict[str, Any], db: Session = Depends(get_db)):
    """Resets a lead back to the package_ready stage and cancels any sent OutboxItem rows,
    allowing the pitch to be re-sent after edits."""
    return MessageController.unmark_sent(db, payload)

