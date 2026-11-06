from typing import Any, Optional

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse

from app.controllers.events_controller import EventsController

router = APIRouter(tags=["Events & Telemetry"])


@router.get("/events")
def stream_events():
    """Server-Sent Events endpoint streaming pipeline progress and agent logs."""
    return StreamingResponse(
        EventsController.subscribe_sse(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


@router.get("/terminal/logs")
def get_terminal_logs_endpoint(since_seq: Optional[int] = Query(None)) -> Any:
    """Returns terminal logs. When since_seq is provided, returns {'logs': [...], 'latest_seq': N}."""
    return EventsController.get_terminal_logs(since_seq=since_seq)
