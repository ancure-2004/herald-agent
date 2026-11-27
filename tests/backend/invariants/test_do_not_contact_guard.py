import pytest

from app.models.entities import Hustle, Lead, OutboxItem


@pytest.mark.xfail(
    strict=True,
    reason="log-reply flips do_not_contact=True but does not purge pending OutboxItem rows",
)
def test_stop_message_flips_do_not_contact_and_purges_pending_outbox(client):
    db = client.get_db_session()
    try:
        hustle = db.query(Hustle).first()
        lead = db.query(Lead).filter(Lead.is_archived == False, Lead.do_not_contact == False).first()
        assert hustle is not None and lead is not None
        lead_id = lead.id

        pending_item = OutboxItem(
            hustle_id=hustle.id,
            lead_id=lead_id,
            channel="whatsapp",
            text="Follow up",
            status="pending",
            unique_key=f"dnc-test-pending-{lead_id}",
        )
        db.add(pending_item)
        db.commit()
    finally:
        db.close()

    res = client.post(
        f"/api/leads/{lead_id}/messages/log-reply",
        json={"channel": "whatsapp", "text": "Please unsubscribe me, do not message again."},
    )
    assert res.status_code in (200, 201), res.text

    db = client.get_db_session()
    try:
        refreshed_lead = db.query(Lead).filter(Lead.id == lead_id).first()
        assert refreshed_lead.do_not_contact is True

        remaining_pending = (
            db.query(OutboxItem)
            .filter(OutboxItem.lead_id == lead_id, OutboxItem.status.in_(["pending", "queued"]))
            .count()
        )
        assert remaining_pending == 0
    finally:
        db.close()
