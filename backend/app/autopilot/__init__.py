"""
Autopilot Package
-----------------
Modularized Autopilot engine providing discovery, verification,
engine adapters, and execution pipelines.
"""

from .adapters import (
    BatchRecorderAdapter,
    ClinicEngineAdapter,
    default_clinic_engine,
    default_recorder,
    format_clinic_context,
    generate_whatsapp_pitch,
    get_clean_salutation,
)
from .config import (
    ALLOWED_CLAIM_SOURCES,
    ALWAYS_BANNED_CLAIMS,
    BANNED_UNLESS_SOURCED_CLAIMS,
    BATCH_JSON_PATH,
    BATCH_RECORDER_DIR,
    CLINICS_DATA_DIR,
    DENTAL_ENGINE_DIR,
    DENTAL_RECORDER_DIR,
    DIRECTORY_DOMAINS,
    ENGINES_DIR,
    FORBIDDEN_MEDICAL_CLAIMS,
    HOSPITAL_CHAIN_STOPWORDS,
    MONOREPO_ROOT,
    PROJECT_ROOT,
    PROJECTS_ROOT,
    SERVICE_CATALOG,
)
from .orchestrator import (
    build_canonical_clinic_payload,
    clean_clinic_name,
    extract_doctor_and_degrees,
    extract_locality,
    generate_clean_slug,
    get_existing_db_identities,
    google_place_details,
    google_places_search,
    load_fallback_candidates_pool,
    parse_places_opening_hours,
    playwright_maps_fallback_pool,
    record_walkthrough_batch,
    run_live_autopilot_discovery,
    run_self_check_gate,
    short_clinic_name,
    sync_verified_links_to_batch_json,
    verify_live_demo_links,
    verify_search_entity_match,
)
from .pipelines import (
    DentalPipeline,
    default_dental_pipeline,
)

__all__ = [
    # Config & Constants
    "PROJECT_ROOT",
    "PROJECTS_ROOT",
    "MONOREPO_ROOT",
    "ENGINES_DIR",
    "DENTAL_ENGINE_DIR",
    "DENTAL_RECORDER_DIR",
    "BATCH_RECORDER_DIR",
    "BATCH_JSON_PATH",
    "CLINICS_DATA_DIR",
    "DIRECTORY_DOMAINS",
    "HOSPITAL_CHAIN_STOPWORDS",
    "ALWAYS_BANNED_CLAIMS",
    "BANNED_UNLESS_SOURCED_CLAIMS",
    "ALLOWED_CLAIM_SOURCES",
    "FORBIDDEN_MEDICAL_CLAIMS",
    "SERVICE_CATALOG",
    # Orchestrator & Discovery
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
    # Adapters
    "ClinicEngineAdapter",
    "default_clinic_engine",
    "BatchRecorderAdapter",
    "default_recorder",
    "format_clinic_context",
    "generate_whatsapp_pitch",
    "get_clean_salutation",
    # Pipelines
    "DentalPipeline",
    "default_dental_pipeline",
]
