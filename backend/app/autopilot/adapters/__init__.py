"""
Autopilot Adapters Package
--------------------------
Direct adapters for clinic engine execution, batch recorder Playwright automation,
and multichannel outreach drafting.
"""

from .clinic_engine import ClinicEngineAdapter, default_clinic_engine
from .outreach import (
    format_clinic_context,
    generate_whatsapp_pitch,
    get_clean_salutation,
)
from .recorder import BatchRecorderAdapter, default_recorder

__all__ = [
    "ClinicEngineAdapter",
    "default_clinic_engine",
    "BatchRecorderAdapter",
    "default_recorder",
    "format_clinic_context",
    "generate_whatsapp_pitch",
    "get_clean_salutation",
]
