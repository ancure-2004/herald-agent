from typing import Any, Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_db
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
def get_terminal_logs_endpoint(
    service: Optional[str] = Query(None),
    level: Optional[str] = Query(None),
    lead_id: Optional[int] = Query(None),
    since_seq: Optional[int] = Query(None),
    limit: int = Query(100),
    db: Session = Depends(get_db),
) -> Any:
    """Returns terminal logs. When since_seq is provided, returns {'logs': [...], 'latest_seq': N}."""
    return EventsController.get_terminal_logs(
        db=db,
        service=service,
        level=level,
        lead_id=lead_id,
        since_seq=since_seq,
        limit=limit,
    )
