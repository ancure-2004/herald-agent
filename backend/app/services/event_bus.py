import asyncio
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

SSE_SUBSCRIBERS: List[asyncio.Queue] = []
MAIN_EVENT_LOOP: Optional[asyncio.AbstractEventLoop] = None
TERMINAL_LOG_BUFFER: List[Dict[str, Any]] = []
TERMINAL_LOG_SEQ: int = 0
PIPELINE_STATE_BUFFER: Dict[str, Any] = {
    "is_running": False,
    "current_run_id": None,
    "active_node_id": None,
    "nodes": {},
}


def set_main_event_loop(loop: asyncio.AbstractEventLoop) -> None:
    global MAIN_EVENT_LOOP
    MAIN_EVENT_LOOP = loop


def broadcast_sse(event_name: str, payload: Dict[str, Any]) -> None:
    """Broadcasts a live JSON event to all connected SSE clients."""
    msg = {
        "type": event_name,
        "event": event_name,
        "data": payload,
        **payload,
        "ts": datetime.now(timezone.utc).isoformat(),
    }
    for q in list(SSE_SUBSCRIBERS):
        try:
            if MAIN_EVENT_LOOP and MAIN_EVENT_LOOP.is_running():
                MAIN_EVENT_LOOP.call_soon_threadsafe(q.put_nowait, msg)
            else:
                q.put_nowait(msg)
        except Exception:
            pass


def emit_terminal_log(source: str, message: str) -> str:
    """Appends a log line to the live terminal buffer and streams it via SSE."""
    global TERMINAL_LOG_SEQ
    TERMINAL_LOG_SEQ += 1
    ts_str = datetime.now().strftime("%H:%M:%S")
    clean_msg = message.strip()

    if re.match(r"^\[\d{2}:\d{2}:\d{2}\]", clean_msg):
        formatted = f"{clean_msg[:10]} [{source}] {clean_msg[10:].lstrip()}"
    else:
        formatted = f"[{ts_str}] [{source}] {clean_msg}"

    entry = {
        "seq": TERMINAL_LOG_SEQ,
        "ts": ts_str,
        "source": source,
        "line": formatted,
    }
    TERMINAL_LOG_BUFFER.append(entry)
    if len(TERMINAL_LOG_BUFFER) > 250:
        del TERMINAL_LOG_BUFFER[:-250]

    broadcast_sse("terminal_log", {"seq": TERMINAL_LOG_SEQ, "source": source, "line": formatted, "title": formatted})
    return formatted


def get_terminal_logs() -> List[Dict[str, Any]]:
    return list(TERMINAL_LOG_BUFFER)


def set_autopilot_running(running: bool, run_id: Optional[int] = None) -> None:
    """Updates whether an autopilot run is currently actively executing."""
    PIPELINE_STATE_BUFFER["is_running"] = running
    if run_id is not None:
        PIPELINE_STATE_BUFFER["current_run_id"] = run_id
    if not running:
        PIPELINE_STATE_BUFFER["active_node_id"] = None


def emit_pipeline_step(
    node_id: str,
    step_name: str,
    status: str,
    clinic_name: Optional[str] = None,
    latency_ms: Optional[int] = None,
    metrics: Optional[Dict[str, Any]] = None,
    payload: Optional[Any] = None,
    error: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Broadcasts a structured pipeline_step SSE event and updates in-memory state."""
    event_payload: Dict[str, Any] = {
        "node_id": node_id,
        "step_name": step_name,
        "status": status,
        "clinic_name": clinic_name,
        "latency_ms": latency_ms,
        "metrics": metrics or {},
        "payload": payload if payload is not None else [],
        "error": error,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    PIPELINE_STATE_BUFFER["active_node_id"] = node_id if status == "RUNNING" else None
    PIPELINE_STATE_BUFFER["nodes"][node_id] = event_payload
    broadcast_sse("pipeline_step", event_payload)
    return event_payload


def get_pipeline_state() -> Dict[str, Any]:
    """Returns the current live pipeline state buffer."""
    return dict(PIPELINE_STATE_BUFFER)
