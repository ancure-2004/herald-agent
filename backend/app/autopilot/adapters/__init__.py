"""
Autopilot Adapters Package
--------------------------
Direct adapters for clinic engine execution, batch recorder Playwright automation,
and multichannel outreach drafting.
"""

from .clinic_engine import ClinicEngineAdapter, default_clinic_engine
from .recorder import BatchRecorderAdapter, default_recorder
from .outreach import (
    format_clinic_context,
    generate_email_pitch,
    generate_instagram_pitch,
    generate_whatsapp_pitch,
    get_clean_salutation,
)

__all__ = [
    "ClinicEngineAdapter",
    "default_clinic_engine",
    "BatchRecorderAdapter",
    "default_recorder",
    "format_clinic_context",
    "generate_whatsapp_pitch",
    "generate_instagram_pitch",
    "generate_email_pitch",
    "get_clean_salutation",
]
