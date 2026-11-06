import logging
import time
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.autopilot.log_tags import TAG_SCRAPE
from app.autopilot.search.base import SearchUnavailable
from app.autopilot.search.cache import DbCache
from app.autopilot.search.throttle import acquire_search_slot
from app.autopilot.settings import get_autopilot_settings

logger = logging.getLogger("personal_os.autopilot.search.ddgs")


class DDGSSearchProvider:
    name = "ddgs"

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
        """
        Performs web search using ddgs with rate limiting, retries, and circuit breaker.
        Raises SearchUnavailable on error or when circuit is open. Never returns [] on error.
        """
        if self.circuit_open:
            raise SearchUnavailable("DDGS circuit breaker is open (3 consecutive failures)")

        settings = get_autopilot_settings()
        cache_key = DbCache.make_key("ddgs", {"q": query, "n": max_results})

        if db is not None:
            cached = DbCache.get(db, cache_key, bypass=testing_mode)
            if cached is not None:
                logger.info("%s ddgs cache hit for '%s'", TAG_SCRAPE, query)
                return cached

        # Rate limiting & concurrency lock
        acquire_search_slot()

        from ddgs import DDGS

        backoffs = [10.0, 30.0]
        last_exception: Optional[Exception] = None

        for attempt in range(3):
            try:
                t0 = time.time()
                client = DDGS(timeout=10)
                raw_results = client.text(
                    query=query,
                    region="in-en",
                    max_results=max_results,
                )
                latency_ms = int((time.time() - t0) * 1000)
                logger.info(
                    "%s ddgs %s %dms (%d results)",
                    TAG_SCRAPE,
                    "MISS" if not testing_mode else "TEST",
                    latency_ms,
                    len(raw_results),
                )

                # Normalize keys
                results: List[Dict[str, Any]] = []
                for r in raw_results:
                    results.append(
                        {
                            "title": r.get("title", ""),
                            "link": r.get("href") or r.get("url", ""),
                            "snippet": r.get("body") or r.get("snippet", ""),
                        }
                    )

                self.consecutive_failures = 0
                if db is not None:
                    ttl_sec = settings.search_cache_ttl_days * 86400
                    DbCache.set(db, cache_key, "ddgs", results, ttl_sec, bypass=testing_mode)

                return results
            except Exception as e:
                last_exception = e
                logger.warning("DDGS attempt %d failed for '%s': %s", attempt + 1, query, e)
                if attempt < 2:
                    time.sleep(backoffs[attempt])

        self.consecutive_failures += 1
        if self.consecutive_failures >= 3:
            self.circuit_open = True
            logger.error("DDGS circuit breaker tripped open after %d failures", self.consecutive_failures)

        raise SearchUnavailable(f"DDGS search failed: {last_exception}")
