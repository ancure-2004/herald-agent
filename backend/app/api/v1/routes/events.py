from typing import Any, Dict, List

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.controllers.events_controller import EventsController

router = APIRouter(tags=["Events & Logs"])


@router.get("/events/stream")
@router.get("/events")
def sse_event_stream() -> StreamingResponse:
    return EventsController.sse_stream()


@router.get("/terminal/logs")
def get_terminal_logs() -> List[Dict[str, Any]]:
    return EventsController.get_terminal_logs()
