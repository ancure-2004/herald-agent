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

    # Ensure database tables exist and seed initial lookup data
    Base.metadata.create_all(bind=engine)
    ensure_schema_columns(engine)
    db = SessionLocal()
    try:
        seed_initial_data(db, include_demo_leads=True)
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
