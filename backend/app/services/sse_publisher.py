"""Centralized, typed SSE event publisher for Herald Operations Engine.

Provides standard helper methods for broadcasting domain events:
  - Lead lifecycle: lead_created, lead_updated, task_completed, leads_wiped
  - Tracking & Public demo: tracking_view
  - Messages & Outbox: message_appended, message_queued, outbox_sent
  - Autopilot & Pipeline: autopilot_started, autopilot_stopped, pipeline_step
  - Hustles & Settings: hustle_updated, availability_updated
"""

from typing import Any, Dict, Optional
from app.services.event_bus import broadcast_sse


class EventPublisher:
    """Standardized SSE event publishing interface."""

    @staticmethod
    def publish(event_type: str, data: Dict[str, Any]) -> None:
        """Generic publish proxying to event_bus.broadcast_sse."""
        broadcast_sse(event_type, data)

    # Lead Events
    @staticmethod
    def publish_lead_created(lead_id: int, name: str) -> None:
        broadcast_sse("lead_created", {"lead_id": lead_id, "name": name})

    @staticmethod
    def publish_lead_updated(lead_id: int, stage_id: Optional[int] = None, **extra: Any) -> None:
        payload = {"lead_id": lead_id}
        if stage_id is not None:
            payload["stage_id"] = stage_id
        payload.update(extra)
        broadcast_sse("lead_updated", payload)

    @staticmethod
    def publish_task_completed(lead_id: int, next_action: Optional[str] = None) -> None:
        broadcast_sse("task_completed", {"lead_id": lead_id, "next_action": next_action})

    @staticmethod
    def publish_leads_wiped() -> None:
        broadcast_sse("leads_wiped", {"active_leads": 0})

    # Tracking Events
    @staticmethod
    def publish_tracking_view(
        lead_id: int,
        lead_name: str,
        event_type: str,
        design_chosen: Optional[str] = None,
        intent_score: Optional[int] = None,
        is_bot: bool = False,
        title: Optional[str] = None,
    ) -> None:
        broadcast_sse(
            "tracking_view",
            {
                "lead_id": lead_id,
                "lead_name": lead_name,
                "event_type": event_type,
                "design_chosen": design_chosen,
                "intent_score": intent_score,
                "is_bot": is_bot,
                "title": title or f"HOT VIEW: {lead_name}",
            },
        )

    # Message & Outbox Events
    @staticmethod
    def publish_message_appended(lead_id: int, direction: str, ai_label: Optional[str] = None) -> None:
        broadcast_sse("message_appended", {"lead_id": lead_id, "direction": direction, "ai_label": ai_label})

    @staticmethod
    def publish_message_queued(lead_id: int, outbox_id: int, text: str) -> None:
        broadcast_sse("message_queued", {"lead_id": lead_id, "outbox_id": outbox_id, "text": text})

    @staticmethod
    def publish_outbox_sent(lead_id: int, channel: Optional[str] = None, unique_key: Optional[str] = None, **extra: Any) -> None:
        payload = {"lead_id": lead_id}
        if channel:
            payload["channel"] = channel
        if unique_key:
            payload["unique_key"] = unique_key
        payload.update(extra)
        broadcast_sse("outbox_sent", payload)

    # Autopilot & Pipeline Events
    @staticmethod
    def publish_autopilot_started(task: str, **extra: Any) -> None:
        payload = {"task": task}
        payload.update(extra)
        broadcast_sse("autopilot_started", payload)

    @staticmethod
    def publish_autopilot_stopped(**extra: Any) -> None:
        payload = {"status": "stopped"}
        payload.update(extra)
        broadcast_sse("autopilot_stopped", payload)

    @staticmethod
    def publish_pipeline_step(node_data: Dict[str, Any]) -> None:
        broadcast_sse("pipeline_step", node_data)
