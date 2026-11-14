"""
Autopilot Orchestrator (DEPRECATED COMPATIBILITY SHIM)
------------------------------------------------------
This module is deprecated. Its functionality has been modularized into:
  - app.autopilot.utils
  - app.autopilot.discovery
  - app.autopilot.search
  - app.autopilot.verification
  - app.autopilot.research
  - app.autopilot.build
  - app.autopilot.recording
  - app.autopilot.runs

Import from the specific subpackages for new code.
"""

import warnings
from typing import Any, Callable, Dict, Optional

from sqlalchemy.orm import Session

from app.autopilot.build.payload import build_canonical_clinic_payload
from app.autopilot.build.self_check import run_self_check_gate
from app.autopilot.discovery.google_places import google_place_details, google_places_search
from app.autopilot.discovery.local_pool import (
    load_fallback_candidates_pool,
    playwright_maps_fallback_pool,
)
from app.autopilot.recording.link_verifier import (
    sync_verified_links_to_batch_json,
    verify_live_demo_links,
)
from app.autopilot.recording.walkthrough import record_walkthrough_batch
from app.autopilot.research.doctor import extract_doctor_and_degrees
from app.autopilot.research.entity_match import verify_search_entity_match
from app.autopilot.research.hours import parse_places_opening_hours
from app.autopilot.runs.runner import execute_autopilot_run
from app.autopilot.types import RunOptions
from app.autopilot.utils.address import extract_locality
from app.autopilot.utils.text import clean_clinic_name, generate_clean_slug, short_clinic_name
from app.autopilot.verification.identity import get_existing_db_identities
from app.models import Hustle

warnings.warn(
    "app.autopilot.orchestrator is deprecated and split into submodules.",
    DeprecationWarning,
    stacklevel=2,
)


def run_live_autopilot_discovery(
    db: Session,
    hustle: Hustle,
    target_count: int,
    base_url: str,
    log_cb: Optional[Callable[[str], None]] = None,
    testing_mode: bool = False,
    locality: Optional[str] = None,
    stop_after: Optional[str] = None,
) -> Dict[str, Any]:
    """Compatibility shim delegating to the modular runs/runner pipeline."""
    opts = RunOptions(
        hustle_id=hustle.id,
        target_count=target_count,
        base_url=base_url,
        testing_mode=testing_mode,
        locality=locality,
        stop_after=stop_after,
    )
    return execute_autopilot_run(db=db, options=opts, hustle=hustle, log_cb=log_cb)


__all__ = [
    "clean_clinic_name",
    "short_clinic_name",
    "extract_locality",
    "generate_clean_slug",
    "verify_search_entity_match",
    "extract_doctor_and_degrees",
    "parse_places_opening_hours",
    "build_canonical_clinic_payload",
    "run_self_check_gate",
    "verify_live_demo_links",
    "sync_verified_links_to_batch_json",
    "record_walkthrough_batch",
    "google_places_search",
    "google_place_details",
    "playwright_maps_fallback_pool",
    "load_fallback_candidates_pool",
    "get_existing_db_identities",
    "run_live_autopilot_discovery",
]
