"""
Legacy Models Shim (`app/models.py`)
Re-exports database models from `app.models` for backward compatibility.
"""

from app.models.entities import (
    AppSetting,
    AvailabilityDay,
    Call,
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
    TerminalLog,
    TrackingEvent,
    utcnow,
)

__all__ = [
    "AppSetting",
    "AvailabilityDay",
    "Call",
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
    "TerminalLog",
    "TrackingEvent",
    "utcnow",
]
