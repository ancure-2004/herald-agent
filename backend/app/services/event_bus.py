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


def get_terminal_logs(since_seq: Optional[int] = None) -> Any:
    all_logs = list(TERMINAL_LOG_BUFFER)
    if since_seq is not None:
        filtered = [l for l in all_logs if l.get("seq", 0) > since_seq]
        latest_seq = all_logs[-1]["seq"] if all_logs else 0
        return {"logs": filtered, "latest_seq": latest_seq}
    return all_logs


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
