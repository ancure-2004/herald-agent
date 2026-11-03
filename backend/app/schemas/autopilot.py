from typing import Optional

from .common import BaseSchema


class AvailabilitySetRequest(BaseSchema):
    date_str: str
    mode: str
    note: str = ""


class TelegramCommandRequest(BaseSchema):
    command_text: str


class ProblemReportCreate(BaseSchema):
    page: str
    element: str = ""
    user_description: str
    lead_id: Optional[int] = None
    run_id: Optional[int] = None
