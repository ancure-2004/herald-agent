from mcp_server import TOOLS


def test_mcp_tools_endpoint_matches_mcp_server(client):
    resp = client.get("/api/mcp-tools")
    assert resp.status_code == 200
    data = resp.json()
    assert "tools" in data

    returned_names = [t["name"] for t in data["tools"]]
    expected_names = [t["name"] for t in TOOLS]
    assert returned_names == expected_names
    assert len(returned_names) > 0

    for tool in data["tools"]:
        assert "name" in tool
        assert "description" in tool
        assert "schema" in tool
