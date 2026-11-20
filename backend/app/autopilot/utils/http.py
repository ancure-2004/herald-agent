import time
from typing import Any, Dict, Optional

import httpx

from app.autopilot.settings import get_autopilot_settings


def get_default_headers() -> Dict[str, str]:
    settings = get_autopilot_settings()
    return {
        "User-Agent": settings.contact_user_agent,
        "Accept": "application/json, text/html, */*",
    }


def create_http_client(timeout: float = 15.0) -> httpx.Client:
    """Creates a shared synchronous httpx client with timeouts and custom user agent."""
    explicit_timeout = httpx.Timeout(timeout=timeout, connect=5.0) if isinstance(timeout, (int, float)) else timeout
    return httpx.Client(
        headers=get_default_headers(),
        timeout=explicit_timeout,
        follow_redirects=True,
    )


def safe_request_with_retry(
    url: str,
    method: str = "GET",
    max_retries: int = 2,
    backoff_seconds: float = 1.0,
    timeout: float = 15.0,
    headers: Optional[Dict[str, str]] = None,
    json_data: Optional[Any] = None,
    params: Optional[Dict[str, Any]] = None,
) -> Optional[httpx.Response]:
    """Executes an HTTP request with exponential backoff on transient errors."""
    req_headers = {**get_default_headers(), **(headers or {})}
    explicit_timeout = httpx.Timeout(timeout=timeout, connect=5.0) if isinstance(timeout, (int, float)) else timeout
    with httpx.Client(timeout=explicit_timeout, follow_redirects=True) as client:
        for attempt in range(max_retries + 1):
            try:
                resp = client.request(
                    method=method,
                    url=url,
                    headers=req_headers,
                    json=json_data,
                    params=params,
                )
                if resp.status_code < 500 and resp.status_code != 429:
                    return resp
            except (httpx.TimeoutException, httpx.NetworkError):
                if attempt == max_retries:
                    raise
            time.sleep(backoff_seconds * (2**attempt))
    return None
