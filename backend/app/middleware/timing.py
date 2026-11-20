"""
Request Timing & Performance Middleware (`app/middleware/timing.py`)

Measures request latency, attaches the X-Response-Time-Ms response header,
and logs warnings for slow requests taking >100ms.
"""

import time

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.core.logging import logger


class TimingMiddleware(BaseHTTPMiddleware):
    """Measures request execution time, sets X-Response-Time-Ms, and logs warnings for slow requests."""

    SLOW_REQUEST_THRESHOLD_MS: float = 100.0

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        start_time = time.perf_counter()
        response = await call_next(request)
        duration_ms = (time.perf_counter() - start_time) * 1000.0

        response.headers["X-Response-Time-Ms"] = f"{duration_ms:.2f}"

        if duration_ms > self.SLOW_REQUEST_THRESHOLD_MS:
            req_id = getattr(request.state, "request_id", None) or request.headers.get("X-Request-ID") or "-"
            logger.warning(
                f"[{req_id}] Slow request warning: {request.method} {request.url.path} "
                f"took {duration_ms:.2f}ms (threshold: {self.SLOW_REQUEST_THRESHOLD_MS}ms)"
            )

        return response
