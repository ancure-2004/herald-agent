from typing import Optional

from sqlalchemy.orm import Session

from app.models.entities import Commitment, Message, OutboxItem


class MessageRepository:
    @staticmethod
    def create_message(db: Session, message: Message) -> Message:
        db.add(message)
        db.flush()
        return message

    @staticmethod
    def get_message_by_id(db: Session, message_id: int) -> Optional[Message]:
        return db.query(Message).filter(Message.id == message_id).first()

    @staticmethod
    def get_commitment_by_id(db: Session, commitment_id: int) -> Optional[Commitment]:
        return db.query(Commitment).filter(Commitment.id == commitment_id).first()

    @staticmethod
    def get_outbox_by_key(db: Session, unique_key: str) -> Optional[OutboxItem]:
        return db.query(OutboxItem).filter(OutboxItem.unique_key == unique_key).first()

    @staticmethod
    def create_outbox_item(db: Session, item: OutboxItem) -> OutboxItem:
        db.add(item)
        db.flush()
        return item
