"""
Practo Directory Search Provider (`app/autopilot/search/practo.py`)

Searches Practo (practo.com) for clinic and doctor listings with explicit
HTTP timeouts and bounded exponential backoff retries.
"""

import logging
import re
import time
from typing import Any, Dict, List, Optional
from urllib.parse import quote_plus

import httpx
from sqlalchemy.orm import Session

from app.autopilot.log_tags import TAG_SCRAPE
from app.autopilot.search.base import SearchUnavailable
from app.autopilot.search.cache import DbCache
from app.autopilot.search.throttle import acquire_search_slot

logger = logging.getLogger("personal_os.autopilot.search.practo")


class PractoSearchProvider:
    """Queries Practo directory for doctor degrees and clinic profiles with bounded retries."""

    name = "practo"

    def __init__(self):
        self.consecutive_failures = 0
        self.circuit_open = False

    def reset_circuit(self) -> None:
        self.consecutive_failures = 0
        self.circuit_open = False

    def search(
        self,
        query: str,
        max_results: int = 8,
        db: Optional[Session] = None,
        testing_mode: bool = False,
        **kwargs,
    ) -> List[Dict[str, Any]]:
        if self.circuit_open:
            raise SearchUnavailable("Practo circuit breaker is open (3 consecutive failures)")

        cache_key = DbCache.make_key("practo", {"q": query, "n": max_results})
        if db is not None:
            cached = DbCache.get(db, cache_key, bypass=testing_mode)
            if cached is not None:
                logger.info("%s practo cache hit for '%s'", TAG_SCRAPE, query)
                return cached

        acquire_search_slot()

        # Explicit timeout configuration
        explicit_timeout = httpx.Timeout(12.0, connect=5.0, read=12.0, write=5.0)
        max_attempts = 3
        backoffs = [1.0, 2.0, 4.0]
        last_exception: Optional[Exception] = None

        search_url = f"https://www.practo.com/search/clinics?results_type=clinic&q={quote_plus(query)}"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        }

        for attempt in range(max_attempts):
            try:
                t0 = time.time()
                with httpx.Client(timeout=explicit_timeout, follow_redirects=True) as client:
                    resp = client.get(search_url, headers=headers)
                    if resp.status_code in (429, 500, 502, 503, 504) and attempt < max_attempts - 1:
                        retry_after = resp.headers.get("Retry-After")
                        delay = float(retry_after) if retry_after and retry_after.isdigit() else backoffs[attempt]
                        logger.warning(
                            "Practo returned status %d. Backing off for %.1fs (attempt %d/%d)...",
                            resp.status_code,
                            delay,
                            attempt + 1,
                            max_attempts,
                        )
                        time.sleep(delay)
                        continue

                    if resp.status_code != 200:
                        raise SearchUnavailable(f"Practo HTTP status {resp.status_code}")

                    html = resp.text
                    latency_ms = int((time.time() - t0) * 1000)
                    logger.info("%s practo search response %dms", TAG_SCRAPE, latency_ms)

                    # Extract doctor and clinic cards from HTML
                    results: List[Dict[str, Any]] = []
                    card_matches = re.findall(
                        r'<a[^>]+href="(/[^"]+)"[^>]*>.*?<h2[^>]*>(.*?)</h2>',
                        html,
                        re.IGNORECASE | re.DOTALL,
                    )
                    for href, title in card_matches[:max_results]:
                        clean_title = re.sub(r"<[^>]+>", "", title).strip()
                        results.append(
                            {
                                "title": clean_title,
                                "link": f"https://www.practo.com{href}" if href.startswith("/") else href,
                                "snippet": f"Practo verified dental clinic: {clean_title}",
                            }
                        )

                    self.consecutive_failures = 0
                    if db is not None:
                        DbCache.set(db, cache_key, "practo", results, 7 * 86400, bypass=testing_mode)
                    return results

            except (httpx.TimeoutException, httpx.NetworkError) as e:
                last_exception = e
                logger.warning("Practo attempt %d timeout/network failure: %s", attempt + 1, e)
                if attempt < max_attempts - 1:
                    time.sleep(backoffs[attempt])
            except Exception as e:
                last_exception = e
                logger.warning("Practo search attempt %d error: %s", attempt + 1, e)
                if attempt < max_attempts - 1:
                    time.sleep(backoffs[attempt])

        self.consecutive_failures += 1
        if self.consecutive_failures >= 3:
            self.circuit_open = True
            logger.error("Practo circuit breaker tripped open after %d failures", self.consecutive_failures)

        raise SearchUnavailable(f"Practo search failed: {last_exception}")
