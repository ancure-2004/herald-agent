from typing import Any, Dict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.controllers.message_controller import MessageController
from app.schemas.message import MessageCreate, MessageOut, OutboxApproveRequest

router = APIRouter(tags=["Messages"])


@router.post("/leads/{lead_id}/messages", response_model=MessageOut, status_code=201)
def append_message(lead_id: int, payload: MessageCreate, db: Session = Depends(get_db)):
    return MessageController.append_message(db, lead_id, payload)


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
