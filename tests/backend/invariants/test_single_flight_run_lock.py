from app.models.entities import Hustle, RunLog


def test_concurrent_discovery_while_run_active_returns_409(client):
    db = client.get_db_session()
    try:
        hustle = db.query(Hustle).first()
        assert hustle is not None
        active_run = RunLog(
            hustle_id=hustle.id,
            job_type="discovery",
            status="running",
        )
        db.add(active_run)
        db.commit()
    finally:
        db.close()

    res = client.post(
        "/api/autopilot/discover",
        json={"hustle_id": 1, "city": "Mumbai", "max_results": 5},
    )
    assert res.status_code == 409, res.text
