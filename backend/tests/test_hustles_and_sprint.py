def test_hustles_list_and_sprint(client):
    res_hustles = client.get("/api/hustles")
    assert res_hustles.status_code == 200
    hustles = res_hustles.json()
    assert len(hustles) >= 1
    hustle_id = hustles[0]["id"]

    res_sprint = client.get(f"/api/sprint?hustle_id={hustle_id}&budget_minutes=60")
    assert res_sprint.status_code == 200
    sprint_data = res_sprint.json()
    assert sprint_data["budget_minutes"] == 60
    assert "tasks" in sprint_data
    assert "allocated_minutes" in sprint_data
    assert sprint_data["allocated_minutes"] <= 60


def test_stock_plan_endpoint(client):
    res = client.get("/api/stock-plan?hustle_id=1")
    assert res.status_code == 200
    plan = res.json()
    assert "required_ready_packages" in plan
    assert "current_ready_packages" in plan
    assert "shortfall" in plan
    assert "needs_refill" in plan


def test_availability_and_day_mode(client):
    res = client.post(
        "/api/availability",
        json={"date_str": "2026-11-10", "mode": "away", "note": "Conference"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["mode"] == "away"
    assert data["date_str"] == "2026-11-10"

    res_day_mode = client.post("/api/schedule/day-mode", json={"mode": "normal"})
    assert res_day_mode.status_code == 200
    assert res_day_mode.json()["mode"] == "normal"
