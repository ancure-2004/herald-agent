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
    finally:
        db.close()


def test_delete_lead_archives_instead_of_hard_deleting(client):
    db = client.get_db_session()
    try:
        lead = db.query(Lead).filter(Lead.is_archived == False).first()
        assert lead is not None
        lead_id = lead.id
    finally:
        db.close()

    del_res = client.delete(f"/api/leads/{lead_id}")
    assert del_res.status_code == 405, del_res.text

    res = client.post(f"/api/leads/{lead_id}/archive")
    assert res.status_code == 200, res.text

    db = client.get_db_session()
    try:
        archived = db.query(Lead).filter(Lead.id == lead_id).first()
        assert archived is not None, "Lead row must not be hard-deleted"
        assert archived.is_archived is True
    finally:
        db.close()
