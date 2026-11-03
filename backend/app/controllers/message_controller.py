from typing import Any, Dict

from sqlalchemy.orm import Session

from app.models.entities import Message
from app.schemas.message import MessageCreate, OutboxApproveRequest
from app.services.message_service import MessageService


class MessageController:
    @staticmethod
    def append_message(db: Session, lead_id: int, payload: MessageCreate) -> Message:
        return MessageService.append_message(db, lead_id, payload)

    @staticmethod
    def modify_message_blocked() -> None:
        MessageService.modify_message_blocked()

    @staticmethod
    def confirm_commitment(db: Session, commitment_id: int) -> Dict[str, Any]:
        return MessageService.confirm_commitment(db, commitment_id)

    @staticmethod
    def approve_and_send_pitch(db: Session, payload: OutboxApproveRequest) -> Dict[str, Any]:
        return MessageService.approve_and_send_pitch(db, payload)

    @staticmethod
    def mark_sent(db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
        return MessageService.mark_sent(db, payload)

    @staticmethod
    def mark_unreachable(db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
        return MessageService.mark_unreachable(db, payload)
