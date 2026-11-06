import threading
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Callable, Dict, List, Optional

from sqlalchemy.orm import Session

from app.autopilot.types import Provenance, RunOptions


class CancelToken:
    def __init__(self):
        self._cancelled = False
        self._lock = threading.Lock()

    def cancel(self) -> None:
        with self._lock:
            self._cancelled = True

    @property
    def is_cancelled(self) -> bool:
        with self._lock:
            return self._cancelled


@dataclass
class RunContext:
    options: RunOptions
    db: Session
    log_cb: Optional[Callable[[str], None]] = None
    cancel_token: CancelToken = field(default_factory=CancelToken)
    trace_logs: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    stage_durations: Dict[str, float] = field(default_factory=dict)
    provenance: Dict[str, Provenance] = field(default_factory=dict)
    run_id: Optional[int] = None
    started_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def emit(self, msg: str) -> None:
        ts = datetime.now(timezone.utc).strftime("%H:%M:%S")
        line = msg if msg.startswith("[") else f"[{ts}] {msg}"
        self.trace_logs.append(line)
        if self.log_cb:
            try:
                self.log_cb(line)
            except Exception:
                pass

    def record_provenance(
        self,
        provider: str,
        is_hit: bool,
        latency_ms: float,
        is_failure: bool = False,
        source_name: Optional[str] = None,
    ) -> None:
        if provider not in self.provenance:
            self.provenance[provider] = Provenance(provider=provider)
        p = self.provenance[provider]
        p.calls += 1
        if is_hit:
            p.cache_hits += 1
        else:
            p.cache_misses += 1
        if is_failure:
            p.failures += 1
        p.avg_latency_ms = (p.avg_latency_ms * (p.calls - 1) + latency_ms) / p.calls
        if source_name and source_name not in p.sources:
            p.sources.append(source_name)

    def check_cancelled(self) -> bool:
        return self.cancel_token.is_cancelled
