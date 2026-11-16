# Item 9: Populate os.environ from .env BEFORE importing any app module that calls
# os.getenv() directly (agents.py, pipeline_service.py, tracking_service.py, etc.).
# config.py also calls load_dotenv, but main.py imports trigger those modules first.
try:
    from pathlib import Path as _Path
    from dotenv import load_dotenv as _load_dotenv
    _load_dotenv(_Path(__file__).resolve().parent.parent / ".env", override=False)
except Exception:
    pass

import asyncio
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.v1.router import api_v1_router
from app.core.config import get_settings
from app.core.exceptions import (
    AppException,
    app_exception_handler,
    generic_exception_handler,
    validation_exception_handler,
)
from app.core.logging import logger
from app.db.schema_migrations import ensure_schema_columns
from app.db.session import Base, SessionLocal, engine
from app.middleware.body_size import RequestSizeLimitMiddleware
from app.middleware.rate_limit import limiter
from app.middleware.request_id import RequestIdMiddleware
from app.middleware.security import SecurityHeadersMiddleware
from app.seed import seed_initial_data
from app.services.event_bus import emit_terminal_log, set_main_event_loop


def _startup_recover_stuck_runs(db) -> int:
    """Item 10: Mark any RunLog rows still in 'running' status as 'interrupted'.

    These are runs that were alive in a previous server process which crashed or
    was restarted. The JobManager in-memory lock was reset when the process died,
    so these rows are now orphaned — mark them before the new process can start
    new runs so the UI does not permanently show a phantom 'in progress' state.
    Also clears any in-memory autopilot running flags.
    """
    from datetime import datetime, timezone
    from app.models.entities import RunLog
    from app.services.event_bus import set_autopilot_running

    set_autopilot_running(False, run_id=None)

    stuck = db.query(RunLog).filter(RunLog.status == "running").all()
    for run in stuck:
        run.status = "interrupted"
        run.finished_at = run.finished_at or datetime.now(timezone.utc)
        run.errors = (run.errors or []) + ["[startup] marked interrupted — previous process ended without completing this run"]
    if stuck:
        db.commit()
        logger.warning(f"Startup: marked {len(stuck)} stuck run(s) as 'interrupted': ids={[r.id for r in stuck]}")
    return len(stuck)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Production lifespan event manager for application startup and shutdown."""
    settings = get_settings()
    logger.info(f"Starting {settings.PROJECT_NAME} in '{settings.ENVIRONMENT}' environment...")

    # Bind running asyncio loop to SSE event bus
    try:
        loop = asyncio.get_running_loop()
        set_main_event_loop(loop)
    except RuntimeError:
        pass

    # Ensure database tables exist
    Base.metadata.create_all(bind=engine)
    ensure_schema_columns(engine)

    db = SessionLocal()
    try:
        # Item 10: Recover stuck 'running' runs from a previous crashed/restarted process
        recovered = _startup_recover_stuck_runs(db)
        if recovered:
            emit_terminal_log("SYSTEM", f"Startup: recovered {recovered} interrupted pipeline run(s).")

        # Item 12: Only seed sample/demo leads when explicitly opted-in via env var.
        # Unconditional seeding wiped real leads on every --reload and obfuscated
        # the stage→status guess logic.  Lookup data (stages, hustles, smart views,
        # objections) is seeded always; demo leads are gated.
        import os as _os
        seed_demo = _os.getenv("SEED_SAMPLE_DATA", "").lower() == "true"
        seed_initial_data(db, include_demo_leads=seed_demo)
        if seed_demo:
            logger.info("SEED_SAMPLE_DATA=true — sample clinic demo leads seeded.")
    except Exception as e:
        logger.warning(f"Initial data seed notice: {e}")
    finally:
        db.close()

    emit_terminal_log("SYSTEM", f"{settings.PROJECT_NAME} initialized. Layered backend ready.")
    logger.info("Application startup completed successfully.")

    yield

    logger.info("Application shutting down...")


def create_app() -> FastAPI:
    """FastAPI Application Factory."""
    settings = get_settings()

    docs_url = None if settings.is_production else "/docs"
    redoc_url = None if settings.is_production else "/redoc"
    openapi_url = None if settings.is_production else "/openapi.json"

    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.API_V1_STR,
        description="Autopilot-first CRM for service side hustles (layered production-grade backend).",
        docs_url=docs_url,
        redoc_url=redoc_url,
        openapi_url=openapi_url,
        lifespan=lifespan,
    )

    # Attach slowapi rate limiter to app state
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # Centralized exception handlers
    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)

    # Middleware Pipeline (evaluated in reverse order of addition)
    # 1. Request ID Middleware (attaches correlation ID first)
    app.add_middleware(RequestIdMiddleware)

    # 2. Security Headers
    app.add_middleware(SecurityHeadersMiddleware)

    # 3. Request Body Size Limit (10MB)
    app.add_middleware(RequestSizeLimitMiddleware)

    # 4. Trusted Host Middleware
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.allowed_hosts_list,
    )

    # 5. Strict CORS Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    # Routers:
    # Standard v1 router under /api/v1
    app.include_router(api_v1_router, prefix="/api/v1")

    # Backward-compatible unversioned router under /api (so existing frontend calls remain 100% operational)
    app.include_router(api_v1_router, prefix="/api")

    @app.get("/", tags=["Root"])
    def root():
        return {
            "name": settings.PROJECT_NAME,
            "version": "1.0.0",
            "environment": settings.ENVIRONMENT,
            "docs": docs_url,
            "health": "/api/health",
        }

    return app


# Default ASGI application instance for Uvicorn
app = create_app()
