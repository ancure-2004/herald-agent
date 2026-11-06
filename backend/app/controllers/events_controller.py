import json
import queue
from typing import Any, Optional

from app.services.event_bus import SSE_SUBSCRIBERS, get_terminal_logs


class EventsController:
    @staticmethod
    def get_terminal_logs(since_seq: Optional[int] = None) -> Any:
        return get_terminal_logs(since_seq=since_seq)

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
