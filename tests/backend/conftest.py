import os
import sys
import pytest

# Ensure backend directory is on sys.path regardless of where pytest is invoked
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.session import Base, get_db
from app.main import app
import app.seed as production_seed
from mock_seed import seed_initial_data as mock_seed_initial_data

# In tests, monkeypatch app.seed.seed_initial_data to mock_seed_initial_data
# so that any test calling seed_initial_data receives the full legacy fixture data
# while production app/seed.py remains completely clean and unpolluted.
production_seed.seed_initial_data = mock_seed_initial_data
seed_initial_data = mock_seed_initial_data


@pytest.fixture()
def client():
    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    Base.metadata.create_all(bind=test_engine)

    db = TestingSessionLocal()
    seed_initial_data(db, include_demo_leads=True)
    db.close()

    def override_get_db():
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    c = TestClient(app)
    c.get_db_session = TestingSessionLocal
    with c:
        yield c
    app.dependency_overrides.clear()
