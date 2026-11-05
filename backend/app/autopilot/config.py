"""
Autopilot Configuration and Shared Constants
-------------------------------------------
Centralizes resolved engine paths and validation rules across the Autopilot package.
"""

from pathlib import Path
from typing import Any, Dict, List

from app.core.config import get_settings

settings = get_settings()

BACKEND_DIR: Path = Path(__file__).resolve().parent.parent.parent
MONOREPO_ROOT: Path = BACKEND_DIR.parent
ENGINES_DIR: Path = MONOREPO_ROOT / "engines"

# Resolved Engine Directories (derived dynamically from core settings)
DENTAL_ENGINE_DIR: Path = Path(settings.DENTAL_ENGINE_DIR).resolve()
DENTAL_RECORDER_DIR: Path = Path(settings.DENTAL_RECORDER_DIR).resolve()

# Compatibility Aliases for legacy references
PROJECT_ROOT: Path = MONOREPO_ROOT
BATCH_RECORDER_DIR: Path = DENTAL_RECORDER_DIR
BATCH_JSON_PATH: Path = DENTAL_RECORDER_DIR / "batch.json"
CLINICS_DATA_DIR: Path = DENTAL_ENGINE_DIR / "data" / "clinics"

DIRECTORY_DOMAINS = {
    "practo.com",
    "practo.co.in",
    "justdial.com",
    "lybrate.com",
    "instagram.com",
    "facebook.com",
    "linkedin.com",
    "youtube.com",
    "bajajfinservhealth.in",
    "eka.care",
    "clinicspots.com",
    "sulekha.com",
    "india.com",
    "magicpin.in",
    "whatshot.in",
    "threebestrated.in",
    "myupchar.com",
    "drdata.in",
    "quickerala.com",
    "nhp.gov.in",
    "delhimetrorail.info",
    "mappls.com",
    "waze.com",
    "foursquare.com",
    "mednear.com",
    "drlogy.com",
    "credihealth.com",
    "sehat.com",
    "skedoc.com",
    "lazoi.com",
    "1mg.com",
    "apollo247.com",
    "hexahealth.com",
    "indiamart.com",
    "tradeindia.com",
    "yellowpages.in",
    "asklaila.com",
    "grotal.com",
    "medifee.com",
    "patakare.com",
    "healthfrog.in",
}

HOSPITAL_CHAIN_STOPWORDS = [
    "clove dental",
    "sabka dentist",
    "apollo dental",
    "apollo white",
    "max hospital",
    "fortis",
    "manipal hospital",
    "blk max",
    "medanta",
    "safdarjung",
    "aiims",
]

ALWAYS_BANNED_CLAIMS = [
    "100%",
    "guarantee",
    "guaranteed",
    "permanent cure",
    "permanent fix",
    "painless",
    "zero discomfort",
    "1.618",
    "golden ratio",
    "best dentist",
    "best dental clinic",
    "no. 1 dental",
    "lead specialist",
    "lead dental surgeon & clinical director",
    "experienced clinical practice",
    "registered dental clinician",
]

BANNED_UNLESS_SOURCED_CLAIMS = {
    "zirconia": lambda sourced: any("zirconia" in str(s).lower() for s in sourced),
    "titanium": lambda sourced: any("titanium" in str(s).lower() for s in sourced),
    "vacuum autoclave": lambda sourced: any("vacuum autoclave" in str(s).lower() for s in sourced),
    "class-b": lambda sourced: any("class-b" in str(s).lower() for s in sourced),
    "hospital-grade": lambda sourced: any("hospital-grade" in str(s).lower() for s in sourced),
}

ALLOWED_CLAIM_SOURCES = {
    "Google Business Profile",
    "Tier 1: Google Places API",
    "Google Places API",
    "Google Maps Title",
    "Verified Search Snippet",
    "Standard Clinical Procedure",
}

FORBIDDEN_MEDICAL_CLAIMS = ALWAYS_BANNED_CLAIMS

SERVICE_CATALOG: List[Dict[str, Any]] = [
    {
        "id": "root-canal-therapy",
        "title": "Root Canal Treatment",
        "category": "Endodontics",
        "badge": "Tooth Preservation",
        "description": "Gentle endodontic care to treat infected tooth pulp, relieve persistent discomfort, and preserve natural tooth structure.",
        "keyBenefits": [
            "Comfortable toothache relief",
            "Conservative tooth preservation",
            "Clinical endodontic care",
            "Step-by-step diagnostic roadmap",
        ],
        "painScore": "Local Anesthetic Care",
        "recoveryTime": "Varies by case",
        "idealFor": "Deep decay, acute tooth pain, persistent sensitivity",
        "image": "/images/root-canal-tech.jpg",
    },
    {
        "id": "dental-implants",
        "title": "Dental Implant Restoration",
        "category": "Implantology",
        "badge": "Tooth Replacement",
        "description": "Comprehensive evaluation and restoration options to replace missing teeth and restore chewing stability and function.",
        "keyBenefits": [
            "Restores natural bite and chewing",
            "Individual missing tooth replacement",
            "Preserves adjacent tooth structure",
            "Long-term oral stability",
        ],
        "painScore": "Local Anesthetic Care",
        "recoveryTime": "Varies by case",
        "idealFor": "Single or multiple missing teeth, loose denture alternatives",
        "image": "/images/operatory-room.jpg",
    },
    {
        "id": "crowns-bridges",
        "title": "Dental Crowns & Bridges",
        "category": "Prosthodontics",
        "badge": "Restorative Protection",
        "description": "Custom dental crowns and bridgework matched to natural enamel shade to protect damaged, fractured, or post-treatment teeth.",
        "keyBenefits": [
            "Natural tooth shade matching",
            "Protects compromised tooth enamel",
            "Restores chewing strength",
            "Precision anatomical fit",
        ],
        "painScore": "Routine Clinical Procedure",
        "recoveryTime": "Varies by case",
        "idealFor": "Fractured teeth, post-root-canal protection, missing tooth spaces",
        "image": "/images/crown-prep.jpg",
    },
    {
        "id": "clear-aligners-braces",
        "title": "Orthodontic & Clear Aligner Care",
        "category": "Orthodontics",
        "badge": "Smile Alignment",
        "description": "Custom alignment consultation and gentle orthodontic options to address spacing, crowding, and bite alignment.",
        "keyBenefits": [
            "Discreet alignment alternatives",
            "Custom step-by-step treatment plan",
            "Careful guided tooth movement",
            "Suitable for teens and adults",
        ],
        "painScore": "Mild Initial Pressure",
        "recoveryTime": "Varies by case",
        "idealFor": "Crooked teeth, spacing concerns, bite alignment",
        "image": "/images/aligner-consultation.jpg",
    },
    {
        "id": "ultrasonic-scaling-polishing",
        "title": "Dental Cleaning & Preventive Care",
        "category": "Periodontics",
        "badge": "Oral Hygiene",
        "description": "Gentle ultrasonic plaque and tartar removal followed by surface polishing to maintain healthy gums and fresh breath.",
        "keyBenefits": [
            "Removes stubborn tartar deposits",
            "Supports healthy gum tissue",
            "Removes tea and coffee stains",
            "Protects enamel surface",
        ],
        "painScore": "Gentle Ultrasonic Water Mist",
        "recoveryTime": "Varies by case",
        "idealFor": "Plaque buildup, gum bleeding, routine preventive care",
        "image": "/images/reception-lounge.jpg",
    },
    {
        "id": "gentle-extractions-wisdom",
        "title": "Tooth Extractions & Oral Care",
        "category": "Oral Surgery",
        "badge": "Clinical Care",
        "description": "Safe, unhurried removal of compromised teeth or problematic wisdom teeth with careful local numbing and post-care support.",
        "keyBenefits": [
            "Topical gel and local numbing",
            "Tissue-preserving elevation",
            "Clear home recovery guidance",
            "Direct practice follow-up line",
        ],
        "painScore": "Local Anesthetic Numbing",
        "recoveryTime": "Varies by case",
        "idealFor": "Impacted wisdom teeth, severe tooth fracture, non-restorable roots",
        "image": "/images/sterilization-autoclave.jpg",
    },
]
