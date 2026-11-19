from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.models.entities import Message
from app.schemas.message import (
    ManualReplyRequest,
    MessageCreate,
    MessageSendRequest,
    OutboxApproveRequest,
)
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

    @staticmethod
    def send_message(db: Session, lead_id: int, payload: MessageSendRequest) -> Dict[str, Any]:
        return MessageService.send_message(db, lead_id, payload)

    @staticmethod
    def log_reply(db: Session, lead_id: int, payload: ManualReplyRequest) -> Dict[str, Any]:
        return MessageService.log_reply(db, lead_id, payload)

    @staticmethod
    def get_reply_suggestions(db: Session, lead_id: int) -> Dict[str, Any]:
        return MessageService.get_reply_suggestions(db, lead_id)

    @staticmethod
    def get_lead_messages(db: Session, lead_id: int) -> List[Message]:
        return MessageService.get_lead_messages(db, lead_id)

    @staticmethod
    def update_messages(db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
        return MessageService.update_messages(db, payload)

    @staticmethod
    def reset_messages(db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
        return MessageService.reset_messages(db, payload)

    @staticmethod
    def update_clinic_contact(db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
        return MessageService.update_clinic_contact(db, payload)

    @staticmethod
    def unmark_sent(db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
        return MessageService.unmark_sent(db, payload)

    @staticmethod
    def get_automation_settings(db: Optional[Session] = None) -> Dict[str, Any]:
        return MessageService.get_automation_settings(db)

    @staticmethod
    def update_automation_settings(payload: Dict[str, Any], db: Optional[Session] = None) -> Dict[str, Any]:
        return MessageService.update_automation_settings(payload, db)

    @staticmethod
    def get_ai_settings(db: Optional[Session] = None) -> Dict[str, Any]:
        return MessageService.get_ai_settings(db)

    @staticmethod
    def update_ai_settings(payload: Dict[str, Any], db: Session) -> Dict[str, Any]:
        return MessageService.update_ai_settings(payload, db)

    @staticmethod
    def test_ai_connection(db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
        return MessageService.test_ai_connection(db, payload)

