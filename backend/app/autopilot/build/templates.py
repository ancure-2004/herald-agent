from typing import Any, Dict, Optional


def build_modern_template_config(
    clean_name: str,
    clean_doc: str,
    rating: Optional[str] = None,
    review_count: Optional[str] = None,
) -> Dict[str, Any]:
    hero_metrics = []
    if rating and str(rating).strip():
        hero_metrics.append({
            "number": f"{rating} ★",
            "label": "Google Rating",
            "note": f"{review_count} patient reviews" if review_count else "Patient Reviews",
        })
    hero_metrics.extend([
        {"number": "Transparent", "label": "Consultation", "note": "Contact clinic for OPD fee"},
        {"number": "Practice", "label": "Clinical Team", "note": f"{clean_doc}"},
    ])

    return {
        "heroMetrics": hero_metrics,
        "alignerJourney": [
            {
                "step": "01",
                "title": "Clinical Smile Assessment",
                "duration": "15 Mins",
                "description": "Comprehensive initial evaluation to examine tooth alignment and oral health.",
            },
            {
                "step": "02",
                "title": "Custom Treatment Map",
                "duration": "2 - 3 Days",
                "description": "Clear step-by-step alignment plan reviewed with you before starting.",
            },
            {
                "step": "03",
                "title": "Precision Aligner Series",
                "duration": "Gradual trays",
                "description": "Custom-fitted transparent aligners guide teeth gently with minimal pressure.",
            },
            {
                "step": "04",
                "title": "Smile Lock & Retention",
                "duration": "Final visit",
                "description": "Custom retainers preserve your new alignment for long-term stability.",
            },
        ],
    }


def build_premium_template_config(area: str, city: str) -> Dict[str, Any]:
    return {
        "sanctuaryTitle": f"{area} Dental Practice",
        "sanctuaryFeatures": [
            {
                "title": "Private Treatment Suite",
                "description": f"Calm, unhurried clinical appointments in {area}.",
                "amenity": "Calming Patient Environment",
                "icon": "✨",
            },
            {
                "title": "Autoclave Sterilization",
                "description": "Rigorous autoclave cycles with clean sealed chairside instruments.",
                "amenity": "Strict Hygiene Standards",
                "icon": "🛡️",
            },
            {
                "title": "Targeted Local Numbing",
                "description": "Gentle topical pre-numbing protocols for comfortable procedures.",
                "amenity": "Anxiety-Free Comfort",
                "icon": "🌿",
            },
            {
                "title": "Ethical Treatment Guidance",
                "description": "Clear treatment plans with straightforward clinical advice.",
                "amenity": "Ethical Care",
                "icon": "💎",
            },
        ],
    }


def build_warm_template_config(clean_name: str, clean_doc: str) -> Dict[str, Any]:
    return {
        "comfortPhases": [
            {
                "step": "01",
                "title": "Unhurried Clinical Review",
                "subtitle": "Personal Consultation",
                "description": f"{clean_doc} discusses your dental goals in a welcoming setting.",
                "duration": "10 - 15 Mins",
                "sensoryNote": "Friendly and relaxed conversation.",
                "keySafeguard": "Comprehensive clinical exam.",
            },
            {
                "step": "02",
                "title": "Gentle Topical Pre-Numb",
                "subtitle": "Comfort-First Delivery",
                "description": "A soothing topical gel gently numbs the gum surface before treatment.",
                "duration": "5 Mins",
                "sensoryNote": "Soothing mild numbness.",
                "keySafeguard": "Comfort-first delivery.",
            },
            {
                "step": "03",
                "title": "Precision Conservative Care",
                "subtitle": "Unhurried Mastery",
                "description": "Treatments proceed with careful instruments and regular comfort check-ins.",
                "duration": "20 - 40 Mins",
                "sensoryNote": "Gentle pacing.",
                "keySafeguard": "Continuous patient comfort.",
            },
            {
                "step": "04",
                "title": "Clear Recovery & Guidance",
                "subtitle": "Direct WhatsApp Line",
                "description": f"Straightforward aftercare guidance and direct WhatsApp support from {clean_name}.",
                "duration": "10 Mins",
                "sensoryNote": "Well-supported recovery.",
                "keySafeguard": "Direct post-treatment line.",
            },
        ],
        "dentureComparison": [
            {
                "feature": "Retention & Stability",
                "conventional": "May shift while speaking",
                "bpsPrecision": "Precision-contoured anatomical suction fit",
                "benefit": "Speak and smile with confidence",
            },
            {
                "feature": "Chewing Comfort",
                "conventional": "Often limited to softer foods",
                "bpsPrecision": "Balanced bite distribution for daily meals",
                "benefit": "Enjoy everyday dining",
            },
            {
                "feature": "Gum Pressure",
                "conventional": "Rigid acrylic can cause sore spots",
                "bpsPrecision": "Smooth polished anatomical contours",
                "benefit": "Comfortable all-day wear",
            },
            {
                "feature": "Aesthetic Naturalism",
                "conventional": "Uniform opaque tooth appearance",
                "bpsPrecision": "Natural multi-shaded tooth moulds",
                "benefit": "Authentic, natural smile",
            },
        ],
    }
