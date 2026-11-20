"""
HTTP ETag Caching Middleware (`app/middleware/etag.py`)

Computes entity tags (ETags) for cacheable GET responses and returns HTTP 304
Not Modified when the client's If-None-Match header matches the calculated ETag.
"""

import hashlib
from typing import Set

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response


class ETagMiddleware(BaseHTTPMiddleware):
    """Computes ETag on cacheable GET responses and returns 304 Not Modified when matched."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if request.method not in ("GET", "HEAD"):
            return await call_next(request)

        response = await call_next(request)

        # Only process successful 200 OK responses that are not event streams
        content_type = response.headers.get("content-type", "")
        if response.status_code != 200 or "text/event-stream" in content_type:
            return response

        # Collect response body
        body_chunks = []
        async for chunk in response.body_iterator:
            body_chunks.append(chunk if isinstance(chunk, bytes) else chunk.encode("utf-8"))
        body = b"".join(body_chunks)

        # Compute SHA-1 ETag
        etag = f'"{hashlib.sha1(body).hexdigest()}"'

        # Check client If-None-Match header
        if_none_match = request.headers.get("if-none-match")
        if if_none_match:
            client_tags: Set[str] = {t.strip() for t in if_none_match.split(",")}
            matched = False
            for t in client_tags:
                clean_t = t[2:] if t.startswith("W/") else t
                if clean_t == etag or t == "*" or t == etag:
                    matched = True
                    break

            if matched:
                h = {"ETag": etag}
                for header_key in ("Cache-Control", "Vary", "X-Request-ID", "X-Response-Time-Ms"):
                    if header_key in response.headers:
                        h[header_key] = response.headers[header_key]
                return Response(status_code=304, headers=h)

        # Attach ETag to response headers
        headers = dict(response.headers)
        headers["ETag"] = etag
        return Response(
            content=body,
            status_code=response.status_code,
            headers=headers,
            media_type=response.media_type,
        )
