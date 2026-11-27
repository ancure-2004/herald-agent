import pytest
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError

from app.models.entities import Hustle, Lead, OutboxItem
from app.safety import check_outbox_safety


def test_duplicate_outbox_delivery_key_is_refused(client):
    db = client.get_db_session()
    try:
        hustle = db.query(Hustle).first()
        lead = db.query(Lead).filter(Lead.is_archived == False, Lead.do_not_contact == False).first()
        assert hustle is not None and lead is not None

        hustle.allowed_channels = list(set(hustle.allowed_channels or []) | {"whatsapp"})
        db.commit()

        unique_key = f"{lead.id}:whatsapp:intro"
        first = OutboxItem(
            hustle_id=hustle.id,
            lead_id=lead.id,
            channel="whatsapp",
            text="First message",
            status="pending",
            unique_key=unique_key,
        )
        db.add(first)
        db.commit()

        # Safety check must refuse duplicate unique_key
        with pytest.raises(HTTPException) as exc_info:
            check_outbox_safety(db, lead, hustle, "whatsapp", unique_key)
        assert exc_info.value.status_code in (400, 409)

        # DB unique constraint must also refuse duplicate unique_key
        duplicate = OutboxItem(
            hustle_id=hustle.id,
            lead_id=lead.id,
            channel="whatsapp",
            text="Duplicate message",
            status="pending",
            unique_key=unique_key,
        )
        db.add(duplicate)
        with pytest.raises(IntegrityError):
            db.commit()
        db.rollback()
    finally:
        db.close()
