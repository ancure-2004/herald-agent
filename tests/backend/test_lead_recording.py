import os
import tempfile

from fastapi.testclient import TestClient

from app.db.session import get_db
from app.models.entities import Lead, Package


def test_lead_recording_endpoints(client: TestClient):
    # Retrieve the db session from app dependency override
    db_gen = client.app.dependency_overrides[get_db]()
    db = next(db_gen)

    lead = Lead(
        id=999999,
        hustle_id=1,
        stage_id=1,
        slug="test-recording-clinic-unique-999999",
        name="Test Recording Clinic Unique 999999",
        primary_phone="+919811000888",
        city="Delhi NCR",
        locality="Rohini",
    )
    db.add(lead)
    db.flush()

    pkg = Package(
        lead_id=lead.id,
        version=1,
        asset_links={"choice_page": f"http://localhost:3001/demo/{lead.slug}"},
        video_file_path="",
        status="ready_for_review",
    )
    db.add(pkg)
    db.commit()

    # 1. Recording status when no video exists
    res = client.get(f"/api/leads/{lead.id}/recording/status")
    assert res.status_code == 200
    data = res.json()
    assert data["has_recording"] is False
    assert data["url"] is None

    # 2. Recording endpoint returns 404 when no video exists
    res_vid = client.get(f"/api/leads/{lead.id}/recording")
    assert res_vid.status_code == 404

    # 3. Create dummy recording file and link to package
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
        f.write(b"\x00\x00\x00\x18ftypisom" + b"0" * 2000)
        temp_path = f.name

    try:
        pkg.video_file_path = temp_path
        db.commit()

        # Now status should report true
        res_ok = client.get(f"/api/leads/{lead.id}/recording/status")
        assert res_ok.status_code == 200
        data_ok = res_ok.json()
        assert data_ok["has_recording"] is True
        assert data_ok["url"] == f"/api/leads/{lead.id}/recording"

        # And streaming endpoint should return 200 with video/mp4
        res_stream = client.get(f"/api/leads/{lead.id}/recording")
        assert res_stream.status_code == 200
        assert "video/mp4" in res_stream.headers["content-type"]
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
