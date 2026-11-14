import logging
import random
import threading
import time

from app.autopilot.settings import get_autopilot_settings

logger = logging.getLogger("personal_os.autopilot.search.throttle")

_GLOBAL_SEARCH_LOCK = threading.Lock()
_LAST_SEARCH_TS: float = 0.0


def acquire_search_slot() -> None:
    """Enforces 1 in-flight search call globally, with interval throttle and random jitter."""
    global _LAST_SEARCH_TS
    settings = get_autopilot_settings()
    min_interval = settings.search_min_interval_seconds

    with _GLOBAL_SEARCH_LOCK:
        now = time.time()
        elapsed = now - _LAST_SEARCH_TS
        jitter = random.uniform(0.1, 0.5)
        required_wait = (min_interval + jitter) - elapsed
        if required_wait > 0:
            time.sleep(required_wait)
        _LAST_SEARCH_TS = time.time()
