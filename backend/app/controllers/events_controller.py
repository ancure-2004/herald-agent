import json
import queue
from typing import Any, Optional

from app.services.event_bus import SSE_SUBSCRIBERS, get_terminal_logs


class EventsController:
    @staticmethod
    def get_terminal_logs(
        db: Optional[Any] = None,
        service: Optional[str] = None,
        level: Optional[str] = None,
        lead_id: Optional[int] = None,
        since_seq: Optional[int] = None,
        limit: int = 100,
    ) -> Any:
        return get_terminal_logs(
            db=db,
            service=service,
            level=level,
            lead_id=lead_id,
            since_seq=since_seq,
            limit=limit,
        )

    @staticmethod
    def subscribe_sse():
        q: queue.Queue = queue.Queue(maxsize=100)
        yield f"data: {json.dumps({'event': 'connected', 'status': 'streaming'})}\n\n"
        SSE_SUBSCRIBERS.append(q)
        try:
            while True:
                try:
                    data = q.get(timeout=0.2)
                    yield data
                except queue.Empty:
                    yield ": ping\n\n"
        except GeneratorExit:
            if q in SSE_SUBSCRIBERS:
                SSE_SUBSCRIBERS.remove(q)
