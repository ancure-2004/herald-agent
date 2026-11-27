import os
import sys
import pytest

# Ensure backend directory is on sys.path regardless of where pytest is invoked
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

# Force in-memory SQLite before any app module is imported so tests never touch personal_os.db
os.environ["DATABASE_URL"] = "sqlite://"

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


def _is_agy_command(args) -> bool:
    if isinstance(args, str):
        parts = args.strip().split()
        return bool(parts) and os.path.basename(parts[0]) == "agy"
    if isinstance(args, (list, tuple)) and len(args) > 0:
        return os.path.basename(str(args[0])) == "agy"
    return False


@pytest.fixture(autouse=True)
def _guard_no_agy_cli(monkeypatch, request):
    """Fail any test that attempts to start the real agy CLI."""
    import subprocess
    import asyncio

    nodeid = request.node.nodeid

    def _wrap_sync(orig):
        def _guarded(args, *pargs, **kwargs):
            if _is_agy_command(args):
                pytest.fail(f"Test {nodeid} attempted to start the agy CLI: {args!r}")
            return orig(args, *pargs, **kwargs)
        return _guarded

    for fn_name in ("run", "Popen", "call", "check_call", "check_output"):
        orig = getattr(subprocess, fn_name)
        monkeypatch.setattr(subprocess, fn_name, _wrap_sync(orig))

    orig_exec = asyncio.create_subprocess_exec

    async def _guarded_exec(program, *args, **kwargs):
        if _is_agy_command([program, *args]):
            pytest.fail(f"Test {nodeid} attempted to start the agy CLI: {program!r}")
        return await orig_exec(program, *args, **kwargs)

    monkeypatch.setattr(asyncio, "create_subprocess_exec", _guarded_exec)

    orig_shell = asyncio.create_subprocess_shell

    async def _guarded_shell(cmd, *args, **kwargs):
        if _is_agy_command(cmd):
            pytest.fail(f"Test {nodeid} attempted to start the agy CLI: {cmd!r}")
        return await orig_shell(cmd, *args, **kwargs)

    monkeypatch.setattr(asyncio, "create_subprocess_shell", _guarded_shell)


@pytest.fixture(autouse=True)
def _isolate_recorder_dir(monkeypatch, tmp_path):
    """Ensure backend tests never write to tracked files in engines/dental-batch-recorder/."""
    from app.autopilot.adapters.recorder import BatchRecorderAdapter

    orig_init = BatchRecorderAdapter.__init__

    def _isolated_init(self, recorder_dir=None, *args, **kwargs):
        if recorder_dir is None:
            recorder_dir = tmp_path / "recorder"
        return orig_init(self, recorder_dir=recorder_dir, *args, **kwargs)

    monkeypatch.setattr(BatchRecorderAdapter, "__init__", _isolated_init)


@pytest.fixture(autouse=True)
def _disable_local_cli_provider(monkeypatch):
    """Ensure tests never pick LocalCLIProvider (agy) regardless of PATH."""
    import shutil

    orig_which = shutil.which

    def _which_no_agy(cmd, *args, **kwargs):
        if cmd == "agy":
            return None
        return orig_which(cmd, *args, **kwargs)

    monkeypatch.setattr(shutil, "which", _which_no_agy)


@pytest.fixture(autouse=True)
def _sync_message_worker_threads(monkeypatch):
    """Run message_service._worker synchronously without patching Thread.start globally."""
    import threading

    orig_thread = threading.Thread

    class _SyncThread:
        def __init__(self, target=None, args=(), kwargs=None):
            self._target = target
            self._args = args
            self._kwargs = kwargs or {}

        def start(self):
            self._target(*self._args, **self._kwargs)

    def _thread_factory(*args, **kwargs):
        target = kwargs.get("target") if "target" in kwargs else (args[1] if len(args) > 1 else None)
        if (
            target is not None
            and getattr(target, "__module__", "") == "app.services.message_service"
            and getattr(target, "__name__", "") == "_worker"
        ):
            t_args = kwargs.get("args", ())
            t_kwargs = kwargs.get("kwargs", {})
            return _SyncThread(target=target, args=t_args, kwargs=t_kwargs)
        return orig_thread(*args, **kwargs)

    monkeypatch.setattr(threading, "Thread", _thread_factory)


@pytest.fixture()
def client(monkeypatch):
    import app.db.session as dbsession
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
    monkeypatch.setattr(dbsession, "SessionLocal", TestingSessionLocal)
    c = TestClient(app)
    c.get_db_session = TestingSessionLocal
    with c:
        yield c
    app.dependency_overrides.clear()
    test_engine.dispose()
