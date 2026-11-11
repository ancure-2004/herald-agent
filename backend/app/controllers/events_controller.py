import json
import queue
import time
from typing import Any, Optional

from app.services.event_bus import SSE_SUBSCRIBERS, get_terminal_logs

# Items 15 & 16: Heartbeat interval in seconds.  25s keeps connections alive
# through most proxies without flooding the stream.
_SSE_HEARTBEAT_INTERVAL = 25.0
# Poll interval per iteration - real-time feel without pegging CPU on idle connections.
_SSE_POLL_INTERVAL = 0.1


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
        """Generator that yields SSE frames.  Sends a named 'connected' event first,
        then forwards queued events, and emits a 'heartbeat' event every
        _SSE_HEARTBEAT_INTERVAL seconds to keep the TCP connection alive and to
        trigger the frontend's reconnect logic if the server goes away."""
        q: queue.Queue = queue.Queue(maxsize=200)
        # Items 15 & 16: Named 'connected' event so es.addEventListener("connected", ...)
        # can handle it, and es.onmessage skips it via the existing data.event check.
        connected_msg = "event: connected\ndata: " + json.dumps({"event": "connected", "status": "streaming"}) + "\n\n"
        yield connected_msg
        SSE_SUBSCRIBERS.append(q)
        last_heartbeat = time.monotonic()
        try:
            while True:
                try:
                    data = q.get(timeout=_SSE_POLL_INTERVAL)
                    yield data
                    last_heartbeat = time.monotonic()  # reset heartbeat timer on real data
                except queue.Empty:
                    # Item 16: Named heartbeat event — browser keeps connection open;
                    # frontend ignores 'heartbeat' (no addEventListener registered for it).
                    now = time.monotonic()
                    if now - last_heartbeat >= _SSE_HEARTBEAT_INTERVAL:
                        hb_msg = "event: heartbeat\ndata: " + json.dumps({"ts": int(now)}) + "\n\n"
                        yield hb_msg
                        last_heartbeat = now
        except GeneratorExit:
            # Item 16: Clean subscriber removal on disconnect / HMR reload so
            # we never leak a dead queue in SSE_SUBSCRIBERS.
            try:
                SSE_SUBSCRIBERS.remove(q)
            except ValueError:
                pass
