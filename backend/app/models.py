"""
Legacy Models Shim (`app/models.py`)
Re-exports database models from `app.models` for backward compatibility.
"""

from app.models.entities import (
    AvailabilityDay,
    Commitment,
    Hustle,
    Job,
    Lead,
    LeadFact,
    Message,
    Objection,
    OutboxItem,
    Package,
    ProblemReport,
    RunLog,
    SmartView,
    Stage,
    TrackingEvent,
    utcnow,
)

__all__ = [
    "AvailabilityDay",
    "Commitment",
    "Hustle",
    "Job",
    "Lead",
    "LeadFact",
    "Message",
    "Objection",
    "OutboxItem",
    "Package",
    "ProblemReport",
    "RunLog",
    "SmartView",
    "Stage",
    "TrackingEvent",
    "utcnow",
]
