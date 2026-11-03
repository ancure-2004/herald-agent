def test_security_headers_and_request_id(client):
    res = client.get("/api/health")
    assert res.status_code == 200

    # Verification of Security Headers
    assert res.headers.get("X-Content-Type-Options") == "nosniff"
    assert res.headers.get("X-Frame-Options") == "DENY"
    assert res.headers.get("X-XSS-Protection") == "1; mode=block"
    assert res.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"

    # Verification of X-Request-ID propagation
    req_id = res.headers.get("X-Request-ID")
    assert req_id is not None
    assert len(req_id) > 0


def test_custom_request_id_preserved(client):
    res = client.get("/api/health", headers={"X-Request-ID": "custom-trace-id-12345"})
    assert res.status_code == 200
    assert res.headers.get("X-Request-ID") == "custom-trace-id-12345"
