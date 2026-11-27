from app.models.entities import Hustle, Lead, OutboxItem


def test_stop_message_flips_do_not_contact_and_purges_pending_outbox(client):
    db = client.get_db_session()
    try:
        hustle = db.query(Hustle).first()
        leads = db.query(Lead).filter(Lead.is_archived == False, Lead.do_not_contact == False).limit(2).all()
        assert hustle is not None and len(leads) == 2
        lead_id = leads[0].id
        other_lead_id = leads[1].id

        pending_item = OutboxItem(
            hustle_id=hustle.id,
            lead_id=lead_id,
            channel="whatsapp",
            text="Follow up",
            status="pending",
            unique_key=f"dnc-test-pending-{lead_id}",
        )
        other_pending_item = OutboxItem(
            hustle_id=hustle.id,
            lead_id=other_lead_id,
            channel="whatsapp",
            text="Other lead follow up",
            status="pending",
            unique_key=f"dnc-test-pending-other-{other_lead_id}",
        )
        db.add_all([pending_item, other_pending_item])
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
            .filter(OutboxItem.lead_id == lead_id, OutboxItem.status.in_(["pending", "pending_approval", "queued"]))
            .count()
        )
        assert remaining_pending == 0

        other_item = (
            db.query(OutboxItem)
            .filter(OutboxItem.unique_key == f"dnc-test-pending-other-{other_lead_id}")
            .first()
        )
        assert other_item is not None and other_item.status == "pending"
    finally:
        db.close()
