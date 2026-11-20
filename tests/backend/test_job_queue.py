import time
from fastapi.testclient import TestClient
import pytest

from app.main import app
from app.services.job_queue import get_job_queue


@pytest.fixture
def client():
    return TestClient(app)


def test_job_queue_submit_and_get():
    queue = get_job_queue()

    def dummy_task(x: int, y: int):
        return {"sum": x + y}

    submission = queue.submit_job(
        job_type="test_task",
        func=dummy_task,
        x=10,
        y=20,
    )
    assert "job_id" in submission
    assert submission["status"] == "queued"
    assert submission["job_type"] == "test_task"

    job_id = submission["job_id"]

    # Poll until completed (or timeout)
    for _ in range(50):
        job = queue.get_job(job_id)
        if job and job["status"] == "completed":
            break
        time.sleep(0.05)

    job = queue.get_job(job_id)
    assert job is not None
    assert job["status"] == "completed"
    assert job["result"] == {"sum": 30}
    assert job["progress"] == 100


def test_api_jobs_endpoint(client):
    queue = get_job_queue()

    submission = queue.submit_job(
        job_type="api_test_task",
        func=lambda: "done",
    )
    job_id = submission["job_id"]

    # Test GET /api/v1/jobs/{job_id}
    res = client.get(f"/api/v1/jobs/{job_id}")
    assert res.status_code == 200
    data = res.json()
    assert data["job_id"] == job_id
    assert data["job_type"] == "api_test_task"

    # Test non-existent job 404
    res_404 = client.get("/api/v1/jobs/job_nonexistent_999999")
    assert res_404.status_code == 404
    body = res_404.json()
    assert "error" in body
    assert body["error"]["code"] == "RESOURCE_NOT_FOUND"


def test_api_jobs_list_and_cancel(client):
    queue = get_job_queue()

    submission = queue.submit_job(
        job_type="cancel_test",
        func=lambda: time.sleep(0.5),
    )
    job_id = submission["job_id"]

    res_cancel = client.post(f"/api/v1/jobs/{job_id}/cancel")
    assert res_cancel.status_code == 200
    assert res_cancel.json()["status"] == "cancelled"

    res_list = client.get("/api/v1/jobs")
    assert res_list.status_code == 200
    assert isinstance(res_list.json(), list)
