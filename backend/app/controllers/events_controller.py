import asyncio
import json
from typing import Any, AsyncGenerator, Dict, List

from fastapi.responses import StreamingResponse

from app.services.event_bus import SSE_SUBSCRIBERS, get_terminal_logs


class EventsController:
    @staticmethod
    def get_terminal_logs() -> List[Dict[str, Any]]:
        return get_terminal_logs()

    @staticmethod
    def sse_stream() -> StreamingResponse:
        async def event_generator() -> AsyncGenerator[str, None]:
            q: asyncio.Queue = asyncio.Queue()
            SSE_SUBSCRIBERS.append(q)
            try:
                yield f"data: {json.dumps({'event': 'connected', 'status': 'streaming'})}\n\n"
                while True:
                    data = await q.get()
                    yield f"data: {json.dumps(data)}\n\n"
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
