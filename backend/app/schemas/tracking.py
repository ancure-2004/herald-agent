from datetime import datetime
from typing import Optional

from .common import BaseORMModel, BaseSchema


class TrackingEventCreate(BaseSchema):
    lead_slug: Optional[str] = None
    lead_id: Optional[int] = None
    package_id: Optional[int] = None
    event_type: str
    section: str = ""
    design_chosen: str = ""
    duration_seconds: int = 0
    user_agent: str = ""
    # Item 7: Recorder / preview flag — set to True when the automated Playwright
    # recorder opens the demo URL so this visit is never counted as a real view.
    is_recorder: bool = False


class TrackingEventOut(BaseORMModel):
    id: int
    lead_id: int
    package_id: Optional[int]
    event_type: str
    section: str
    design_chosen: str
    duration_seconds: int
    is_bot: bool
    created_at: datetime
