def test_health_endpoints(client):
    """Verifies that both /api/health and /api/v1/health return 200 OK with expected metadata."""
    res_legacy = client.get("/api/health")
    assert res_legacy.status_code == 200
    data_legacy = res_legacy.json()
    assert data_legacy["status"] == "ok"
    assert "hustles" in data_legacy
    assert "active_leads" in data_legacy

    res_v1 = client.get("/api/v1/health")
    assert res_v1.status_code == 200
    data_v1 = res_v1.json()
    assert data_v1["status"] == "ok"
    assert data_v1["hustles"] == data_legacy["hustles"]


def test_root_endpoint(client):
    """Verifies root endpoint returns project metadata."""
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "Personal OS & CRM"
    assert data["health"] == "/api/health"
