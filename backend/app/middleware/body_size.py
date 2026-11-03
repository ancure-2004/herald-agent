from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.core.config import get_settings


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    """Enforces maximum allowed request body size to prevent memory exhaustion / DoS."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint):
        settings = get_settings()
        content_length = request.headers.get("content-length")

        if content_length:
            try:
                size = int(content_length)
                if size > settings.MAX_REQUEST_BODY_SIZE:
                    return JSONResponse(
                        status_code=413,
                        content={
                            "error": {
                                "code": "REQUEST_ENTITY_TOO_LARGE",
                                "message": f"Request body exceeds limit of {settings.MAX_REQUEST_BODY_SIZE} bytes.",
                            }
                        },
                    )
            except ValueError:
                pass

        return await call_next(request)
