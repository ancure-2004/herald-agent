import json
import logging
import queue
import re
from datetime import datetime
from typing import Any, Dict, List, Optional

logger = logging.getLogger("personal_os.event_bus")

# Global subscriber queue list for SSE broadcasting
SSE_SUBSCRIBERS: List[queue.Queue] = []
MAIN_EVENT_LOOP = None

# In-memory circular buffer for terminal logs (last 250 items)
TERMINAL_LOG_BUFFER: List[Dict[str, Any]] = []
TERMINAL_LOG_SEQ: int = 0

# In-memory buffer for real-time pipeline visualization
PIPELINE_STATE_BUFFER: Dict[str, Any] = {
    "is_running": False,
    "current_run_id": None,
    "active_node_id": None,
    "nodes": {},
}


def set_main_event_loop(loop) -> None:
    global MAIN_EVENT_LOOP
    MAIN_EVENT_LOOP = loop


def broadcast_sse(event_type: str, data: Dict[str, Any]) -> None:
    """Broadcasts a structured event payload to all active SSE client queues."""
    msg = f"event: {event_type}\ndata: {json.dumps(data)}\n\n"
    for q in list(SSE_SUBSCRIBERS):
        try:
            if MAIN_EVENT_LOOP and MAIN_EVENT_LOOP.is_running():
                MAIN_EVENT_LOOP.call_soon_threadsafe(q.put_nowait, msg)
            else:
                q.put_nowait(msg)
        except Exception:
            pass


def emit_terminal_log(
    source: str,
    message: str,
    level: str = "info",
    lead_id: Optional[int] = None,
    hustle_id: Optional[int] = None,  # Item 14: None instead of hardcoded 1
    db: Optional[Any] = None,
) -> str:
    """Appends a log line to the live terminal buffer, persists to TerminalLog, and streams it via SSE."""
    global TERMINAL_LOG_SEQ
    TERMINAL_LOG_SEQ += 1
    now = datetime.now()
    ts_str = now.strftime("%H:%M:%S")
    clean_msg = message.strip()

    # Determine service category
    src_lower = source.lower()
    if "discover" in src_lower or "scout" in src_lower:
        service = "discovery"
    elif "build" in src_lower or "factory" in src_lower or "auditor" in src_lower or "record" in src_lower or "video" in src_lower or "walkthrough" in src_lower or "verify" in src_lower:
        service = "building"
    elif "outreach" in src_lower or "closer" in src_lower or "call" in src_lower or "message" in src_lower:
        service = "outreach"
    else:
        service = src_lower

    # Infer level if info
    norm_level = level.lower()
    if norm_level == "info":
        if "error" in clean_msg.lower() or "fail" in clean_msg.lower():
            norm_level = "error"
        elif "warn" in clean_msg.lower() or "drop" in clean_msg.lower() or "brake" in clean_msg.lower():
            norm_level = "warn"

    if re.match(r"^\[\d{2}:\d{2}:\d{2}\]", clean_msg):
        formatted = f"{clean_msg[:10]} [{source}] {clean_msg[10:].lstrip()}"
    else:
        formatted = f"[{ts_str}] [{source}] {clean_msg}"

    # Item 14: Resolve hustle_id from DB when not supplied rather than hardcoding 1.
    # This is best-effort: if it fails (DB not available, no hustle) we keep None.
    resolved_hustle_id = hustle_id
    if resolved_hustle_id is None and db is not None:
        try:
            from app.models.entities import Hustle as _Hustle
            first = db.query(_Hustle).order_by(_Hustle.id.asc()).first()
            if first:
                resolved_hustle_id = first.id
        except Exception:
            pass

    db_id = None
    # Item 14: Retry up to 3 times on SQLite OperationalError (database is locked)
    # and log to stderr instead of silently swallowing the error.
    _max_retries = 3
    for _attempt in range(_max_retries):
        try:
            from app.db.session import SessionLocal
            from app.models.entities import TerminalLog

            should_close = False
            active_db = db
            if active_db is None:
                active_db = SessionLocal()
                should_close = True
            try:
                t_log = TerminalLog(
                    service=service,
                    level=norm_level,
                    lead_id=lead_id,
                    hustle_id=resolved_hustle_id,
                    message=clean_msg,
                    metadata_json={"source": source, "formatted": formatted},
                    created_at=now,
                )
                active_db.add(t_log)
                active_db.commit()
                active_db.refresh(t_log)
                db_id = t_log.id
                break  # success — exit retry loop
            finally:
                if should_close:
                    active_db.close()
        except Exception as _exc:
            import sys as _sys
            _exc_str = str(_exc)
            _is_busy = "locked" in _exc_str.lower() or "busy" in _exc_str.lower()
            if _is_busy and _attempt < _max_retries - 1:
                import time as _time
                _time.sleep(0.05 * (2 ** _attempt))  # 50ms, 100ms backoff
                continue
            # Non-retryable or final retry: log to stderr so the error is visible
            print(f"[event_bus] emit_terminal_log DB write failed (attempt {_attempt+1}): {_exc_str}", file=_sys.stderr)
            break

    seq_val = db_id or TERMINAL_LOG_SEQ
    entry = {
        "id": seq_val,
        "seq": seq_val,
        "ts": ts_str,
        "source": source,
        "service": service,
        "level": norm_level,
        "lead_id": lead_id,
        "hustle_id": hustle_id,
        "message": clean_msg,
        "line": formatted,
        "timestamp": now.isoformat(),
    }
    TERMINAL_LOG_BUFFER.append(entry)
    if len(TERMINAL_LOG_BUFFER) > 250:
        del TERMINAL_LOG_BUFFER[:-250]

    broadcast_sse(
        "terminal_log",
        {
            "seq": seq_val,
            "id": seq_val,
            "source": source,
            "service": service,
            "level": norm_level,
            "lead_id": lead_id,
            "message": clean_msg,
            "line": formatted,
            "title": formatted,
            "timestamp": now.isoformat(),
        },
    )
    # Also flush directly to backend uvicorn terminal / stdout
    try:
        import sys as _sys
        print(formatted, file=_sys.stdout, flush=True)
    except Exception:
        pass
    return formatted


def get_terminal_logs(
    db: Optional[Any] = None,
    service: Optional[str] = None,
    level: Optional[str] = None,
    lead_id: Optional[int] = None,
    since_seq: Optional[int] = None,
    limit: int = 100,
) -> Any:
    """Fetches terminal logs from persistent store and merges with active buffer with query filtering."""
    merged_logs: List[Dict[str, Any]] = []
    # Item 14: Track DB row IDs (not messages) to avoid duplicating rows that are
    # already in the in-memory buffer.  Identical message text from different steps
    # must NOT be collapsed — only exact same DB row id is a true duplicate.
    seen_db_ids: set = set()

    # 1. Fetch from database if available
    if db is not None:
        try:
            from app.models.entities import TerminalLog

            query = db.query(TerminalLog)
            if service and service.strip().lower() != "all":
                query = query.filter(TerminalLog.service == service.strip().lower())
            if level:
                query = query.filter(TerminalLog.level == level.strip().lower())
            if lead_id is not None:
                query = query.filter(TerminalLog.lead_id == lead_id)
            if since_seq is not None:
                query = query.filter(TerminalLog.id > since_seq)

            db_logs = query.order_by(TerminalLog.id.asc()).limit(limit).all()
            for l in db_logs:
                entry = {
                    "id": l.id,
                    "seq": l.id,
                    "service": l.service,
                    "level": l.level.lower(),
                    "lead_id": l.lead_id,
                    "hustle_id": l.hustle_id,
                    "message": l.message,
                    "line": f"[{l.service.upper()}] {l.message}",
                    "created_at": l.created_at.isoformat() if l.created_at else "",
                    "timestamp": l.created_at.isoformat() if l.created_at else "",
                }
                merged_logs.append(entry)
                seen_db_ids.add(l.id)
        except Exception:
            pass

    # 2. Merge with active buffer — skip only entries whose DB id is already present.
    # Items that only exist in the buffer (db_id=None, seq is TERMINAL_LOG_SEQ) are
    # always included so in-flight log lines never disappear.
    for b_log in TERMINAL_LOG_BUFFER:
        b_service = (b_log.get("service") or "").lower()
        b_level = (b_log.get("level") or "").lower()
        b_lead_id = b_log.get("lead_id")
        b_seq = b_log.get("seq", 0)
        b_id = b_log.get("id")

        if service and service.strip().lower() != "all" and b_service != service.strip().lower():
            continue
        if level and b_level != level.strip().lower():
            continue
        if lead_id is not None and b_lead_id != lead_id:
            continue
        if since_seq is not None and b_seq <= since_seq:
            continue

        # Only skip if this buffer entry is already represented by a DB row
        if b_id and b_id in seen_db_ids:
            continue
        merged_logs.append(b_log)

    sliced_logs = merged_logs[:limit]
    if since_seq is not None:
        latest_seq = sliced_logs[-1]["seq"] if sliced_logs else (since_seq or 0)
        return {"logs": sliced_logs, "latest_seq": latest_seq}
    return sliced_logs



def set_autopilot_running(running: bool, run_id: Optional[int] = None) -> None:
    """Updates whether an autopilot run is currently actively executing."""
    PIPELINE_STATE_BUFFER["is_running"] = running
    if run_id is not None:
        PIPELINE_STATE_BUFFER["current_run_id"] = run_id
    if not running:
        PIPELINE_STATE_BUFFER["active_node_id"] = None
    broadcast_sse(
        "autopilot_state",
        {
            "is_running": running,
            "run_id": PIPELINE_STATE_BUFFER.get("current_run_id"),
            "active_node_id": PIPELINE_STATE_BUFFER.get("active_node_id"),
        },
    )


def emit_pipeline_step(
    node_id: str,
    step_name: str,
    status: str,
    clinic_name: Optional[str] = None,
    latency_ms: Optional[int] = None,
    metrics: Optional[Dict[str, Any]] = None,
    payload: Optional[List[Dict[str, Any]]] = None,
    error: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Updates the pipeline node status and streams a structured pipeline_step SSE event."""
    PIPELINE_STATE_BUFFER["active_node_id"] = node_id if status == "RUNNING" else None

    node_data = {
        "node_id": node_id,
        "step_name": step_name,
        "status": status,
        "clinic_name": clinic_name,
        "latency_ms": latency_ms,
        "metrics": metrics or {},
        "payload": payload or [],
        "error": error,
        "updated_at": datetime.now().isoformat(),
    }
    PIPELINE_STATE_BUFFER["nodes"][node_id] = node_data

    broadcast_sse("pipeline_step", node_data)
    return node_data


def get_pipeline_state() -> Dict[str, Any]:
    return dict(PIPELINE_STATE_BUFFER)


def is_autopilot_running() -> bool:
    """Returns True if the autopilot running flag is currently set."""
    return bool(PIPELINE_STATE_BUFFER.get("is_running", False))


# Re-export EventPublisher for centralized access
from app.services.sse_publisher import EventPublisher  # noqa: E402
