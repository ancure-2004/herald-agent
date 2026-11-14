from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import Field

from .common import BaseORMModel, BaseSchema


class TerminalLogCreate(BaseSchema):
    service: str
    level: str = "info"
    lead_id: Optional[int] = None
    hustle_id: Optional[int] = None
    message: str
    metadata_json: Dict[str, Any] = Field(default_factory=dict)


class TerminalLogOut(BaseORMModel):
    id: int
    service: str
    level: str = "info"
    lead_id: Optional[int] = None
    hustle_id: Optional[int] = None
    message: str
    metadata_json: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
