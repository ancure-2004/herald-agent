import pytest
from datetime import datetime, timezone
from fastapi import HTTPException

from app.models.entities import Lead, Stage
from app.safety import assert_active_lead_has_next_step


def test_active_lead_requires_next_action_and_due_at(client):
    db = client.get_db_session()
    try:
        stage = db.query(Stage).first()
        assert stage is not None

        # Active lead missing next_action must be refused
        with pytest.raises(HTTPException) as exc1:
            assert_active_lead_has_next_step(
                stage,
                is_archived=False,
                next_action=None,
                next_action_due_at=datetime.now(timezone.utc),
            )
        assert exc1.value.status_code == 422

        # Active lead missing next_action_due_at must be refused
        with pytest.raises(HTTPException) as exc2:
            assert_active_lead_has_next_step(
                stage,
                is_archived=False,
                next_action="Send intro",
                next_action_due_at=None,
            )
        assert exc2.value.status_code == 422

        # All active leads in DB have both next_action and next_action_due_at
        active_leads = db.query(Lead).filter(Lead.is_archived == False).all()
        assert len(active_leads) > 0
        for lead in active_leads:
            assert lead.next_action, f"Active lead {lead.id} missing next_action"
            assert lead.next_action_due_at is not None, f"Active lead {lead.id} missing next_action_due_at"
    finally:
        db.close()
