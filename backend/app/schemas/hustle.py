from typing import Any, Dict, List, Optional

from pydantic import Field

from .common import BaseORMModel, BaseSchema


class StageOut(BaseORMModel):
    id: int
    hustle_id: int
    slug: str
    name: str
    order: int
    color: str
    is_won: bool
    is_lost: bool


class SmartViewOut(BaseORMModel):
    id: int
    hustle_id: int
    slug: str
    name: str
    icon: str
    filter_spec: Dict[str, Any]
    sort_order: int
    is_pinned: bool


class HustleCreate(BaseSchema):
    slug: str
    name: str
    description: str = ""
    proof_asset_type: str = "3_demo_sites_and_video"
    search_query: str = "dental clinic in Delhi NCR"
    pipeline_steps: List[str] = Field(
        default_factory=lambda: [
            "find",
            "confirm_no_website",
            "research",
            "channel_check",
            "build",
            "self_check",
            "record",
        ]
    )
    allowed_channels: List[str] = Field(default_factory=lambda: ["whatsapp", "instagram", "email"])
    channel_limits: Dict[str, int] = Field(default_factory=lambda: {"whatsapp": 20, "instagram": 15, "email": 25})
    channel_goals: Dict[str, int] = Field(default_factory=lambda: {"whatsapp": 15, "instagram": 5, "email": 5})
    minimum_stock_days: int = 3
    ai_field_questions: List[Dict[str, str]] = Field(default_factory=list)
    custom_field_defs: List[Dict[str, str]] = Field(default_factory=list)
    autonomy_mode: str = "copilot"
    deal_value_inr: int = 15000


class HustleUpdate(BaseSchema):
    name: Optional[str] = None
    description: Optional[str] = None
    search_query: Optional[str] = None
    allowed_channels: Optional[List[str]] = None
    channel_limits: Optional[Dict[str, int]] = None
    channel_goals: Optional[Dict[str, int]] = None
    minimum_stock_days: Optional[int] = None
    ai_field_questions: Optional[List[Dict[str, str]]] = None
    custom_field_defs: Optional[List[Dict[str, str]]] = None
    autonomy_mode: Optional[str] = None
    deal_value_inr: Optional[int] = None


class HustleOut(BaseORMModel):
    id: int
    slug: str
    name: str
    description: str
    proof_asset_type: str
    search_query: str
    pipeline_steps: List[str]
    allowed_channels: List[str]
    channel_limits: Dict[str, Any]
    channel_goals: Dict[str, Any]
    minimum_stock_days: int
    ai_field_questions: List[Any]
    custom_field_defs: List[Any]
    autonomy_mode: str
    deal_value_inr: int
    is_active: bool
    stages: List[StageOut] = []
    smart_views: List[SmartViewOut] = []


from .autopilot import AvailabilitySetRequest, ProblemReportCreate, TelegramCommandRequest  # noqa: E402

__all__ = [
    "AvailabilitySetRequest",
    "HustleCreate",
    "HustleOut",
    "HustleUpdate",
    "ProblemReportCreate",
    "SmartViewOut",
    "StageOut",
    "TelegramCommandRequest",
]
