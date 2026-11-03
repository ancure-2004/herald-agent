from datetime import datetime
from typing import Any, Dict, Optional

from .common import BaseORMModel


class PackageOut(BaseORMModel):
    id: int
    lead_id: int
    version: int
    asset_links: Dict[str, Any]
    video_file_path: str
    video_size_mb: float
    clinic_payload: Dict[str, Any]
    quality_score: int
    self_check_passed: bool
    self_check_report: Dict[str, Any]
    status: str
    sent_at: Optional[datetime]
    expires_at: Optional[datetime]
    created_at: datetime
