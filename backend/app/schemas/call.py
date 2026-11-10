from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import Field, model_validator

from .common import BaseORMModel, BaseSchema


class CallCreate(BaseSchema):
    raw_text: str = Field(..., min_length=1)
    duration_seconds: int = 0
    outcome: str = "completed"


class CallOut(BaseORMModel):
    id: int
    call_id: Optional[int] = None
    lead_id: int
    raw_text: str
    summary: str = ""
    interests: List[str] = Field(default_factory=list)
    objections: List[str] = Field(default_factory=list)
    commitments: List[Dict[str, Any]] = Field(default_factory=list)
    next_steps: List[str] = Field(default_factory=list)
    prep_brief: str = ""
    duration_seconds: int = 0
    outcome: str = "completed"
    created_at: datetime

    @model_validator(mode="before")
    @classmethod
    def set_call_id(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "call_id" not in data and "id" in data:
                data["call_id"] = data["id"]
        elif hasattr(data, "id"):
            # For ORM object
            if not hasattr(data, "call_id") or getattr(data, "call_id") is None:
                try:
                    setattr(data, "call_id", data.id)
                except Exception:
                    pass
        return data


class CallBriefOut(BaseSchema):
    lead_id: int
    clinic_name: str = ""
    doctor_name: str = ""
    prep_brief: str = ""
    past_commitments: List[Any] = Field(default_factory=list)
    key_objections: List[Any] = Field(default_factory=list)

