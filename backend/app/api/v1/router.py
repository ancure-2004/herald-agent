from fastapi import APIRouter

from app.api.v1.routes import (
    agents,
    assistant,
    events,
    health,
    hustles,
    leads,
    messages,
    pipeline,
    tracking,
)

api_v1_router = APIRouter()

api_v1_router.include_router(health.router)
api_v1_router.include_router(hustles.router)
api_v1_router.include_router(leads.router)
api_v1_router.include_router(messages.router)
api_v1_router.include_router(tracking.router)
api_v1_router.include_router(pipeline.router)
api_v1_router.include_router(agents.router)
api_v1_router.include_router(assistant.router)
api_v1_router.include_router(events.router)

__all__ = ["api_v1_router"]
