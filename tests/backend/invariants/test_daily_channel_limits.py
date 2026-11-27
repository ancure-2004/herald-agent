import pytest
from datetime import datetime, timezone
from fastapi import HTTPException

from app.models.entities import Hustle, Lead, OutboxItem
from app.safety import check_daily_channel_limit, check_outbox_safety


@pytest.mark.parametrize("channel", ["whatsapp", "instagram", "email"])
def test_daily_channel_limit_refuses_queuing_and_dispatch_past_cap(client, channel):
    db = client.get_db_session()
    try:
        hustle = db.query(Hustle).first()
        assert hustle is not None
        hustle.allowed_channels = list(set(hustle.allowed_channels or []) | {channel})
        hustle.channel_limits = {**(hustle.channel_limits or {}), channel: 1}
        db.commit()

        lead = db.query(Lead).filter(Lead.is_archived == False, Lead.do_not_contact == False).first()
        assert lead is not None

        # 1 sent item today reaches the cap of 1
        sent_item = OutboxItem(
            hustle_id=hustle.id,
            lead_id=lead.id,
            channel=channel,
            text="Test body",
            status="sent",
            sent_at=datetime.now(timezone.utc),
            unique_key=f"cap-test-{channel}-{lead.id}-1",
        )
        db.add(sent_item)
        db.commit()

        # Dispatch check must refuse past cap
        allowed, count, cap = check_daily_channel_limit(db, hustle, channel)
        assert allowed is False
        assert count >= 1
        assert cap == 1

        # Queuing check must refuse past cap
        with pytest.raises(HTTPException) as exc_info:
            check_outbox_safety(db, lead, hustle, channel, f"cap-test-{channel}-{lead.id}-2")
        assert exc_info.value.status_code == 429
    finally:
        db.close()
