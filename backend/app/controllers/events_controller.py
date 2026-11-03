import asyncio
import json
from typing import Any, AsyncGenerator, Dict, List

from fastapi import Request
from fastapi.responses import StreamingResponse

from app.services.event_bus import SSE_SUBSCRIBERS, get_terminal_logs


class EventsController:
    @staticmethod
    def get_terminal_logs() -> List[Dict[str, Any]]:
        return get_terminal_logs()

    @staticmethod
    def sse_stream(request: Request) -> StreamingResponse:
        async def event_generator() -> AsyncGenerator[str, None]:
            q: asyncio.Queue = asyncio.Queue()
            SSE_SUBSCRIBERS.append(q)
            try:
                yield f"data: {json.dumps({'type': 'connected', 'event': 'connected', 'status': 'streaming'})}\n\n"
                while True:
                    if await request.is_disconnected():
                        break
                    try:
                        data = await asyncio.wait_for(q.get(), timeout=15.0)
                        yield f"data: {json.dumps(data)}\n\n"
                    except asyncio.TimeoutError:
                        if await request.is_disconnected():
                            break
                        yield ": ping\n\n"
            except asyncio.CancelledError:
                pass
            finally:
                if q in SSE_SUBSCRIBERS:
                    SSE_SUBSCRIBERS.remove(q)

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )
