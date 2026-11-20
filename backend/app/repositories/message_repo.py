from typing import Dict, List, Optional

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
    def get_messages_by_lead_ids(db: Session, lead_ids: List[int]) -> Dict[int, List[Message]]:
        """Batched IN (...) query returning {lead_id: list_of_messages} mapped into O(1) lookup dictionary."""
        if not lead_ids:
            return {}
        messages = (
            db.query(Message)
            .filter(Message.lead_id.in_(lead_ids))
            .order_by(Message.created_at.asc())
            .all()
        )
        res: Dict[int, List[Message]] = {lid: [] for lid in lead_ids}
        for m in messages:
            res[m.lead_id].append(m)
        return res

    @staticmethod
    def get_outbox_items_by_lead_ids(db: Session, lead_ids: List[int]) -> Dict[int, List[OutboxItem]]:
        """Batched IN (...) query returning {lead_id: list_of_outbox_items} mapped into O(1) lookup dictionary."""
        if not lead_ids:
            return {}
        items = (
            db.query(OutboxItem)
            .filter(OutboxItem.lead_id.in_(lead_ids))
            .order_by(OutboxItem.created_at.asc())
            .all()
        )
        res: Dict[int, List[OutboxItem]] = {lid: [] for lid in lead_ids}
        for item in items:
            res[item.lead_id].append(item)
        return res

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
