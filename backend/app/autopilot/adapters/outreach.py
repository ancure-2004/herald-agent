"""
Outreach Generation Adapter
---------------------------
Generates personalized, multi-channel outreach copy (WhatsApp, Instagram, Email)
for dental clinic prospects based on clinic details and demo URLs.
"""

import re
from typing import Any, Dict, Optional

from app.core.config import get_settings


def get_clean_salutation(doc_name: Optional[str]) -> str:
    """Formats doctor name into a respectful salutation ('Dr. Name Ji' or fallback)."""
    if not doc_name or doc_name.strip() in [
        "Doctor",
        "Lead Dental Surgeon",
        "Lead Dental Specialist",
        "Lead Surgeon",
        "Resident Dental Director",
        "",
    ]:
        return "Doctor Ji"
    d = doc_name.strip()
    if not d.endswith("Ji"):
        d = f"{d} Ji"
    return d


def format_clinic_context(clinic: Dict[str, Any], base_url: Optional[str] = None) -> Dict[str, Any]:
    """Extracts and normalizes clinic context for outreach templates."""
    settings = get_settings()
    base = (base_url or settings.DEMO_ENGINE_BASE_URL).rstrip("/")

    name = clinic.get("name", "Dental Clinic")
    slug = clinic.get("slug", re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-"))
    doc = clinic.get("doc_name") or clinic.get("doctor_name") or "Doctor"
    locality = clinic.get("locality", "Delhi NCR")
    phone = clinic.get("phone", "")
    rating = str(clinic.get("rating", "4.9"))
    revs = str(clinic.get("review_count") or clinic.get("reviews", "45"))
    tpl = (clinic.get("recommended_template") or clinic.get("template") or "modern").lower()

    return {
        "id": clinic.get("id") or clinic.get("lead_id", 1),
        "name": name,
        "slug": slug,
        "doc": doc,
        "doc_salutation": get_clean_salutation(doc),
        "loc": locality,
        "phone": phone,
        "rating": rating,
        "revs": revs,
        "tpl": tpl,
        "tpl_cap": tpl.capitalize(),
        "contact": clinic.get("contact", phone),
        "demo_url": f"{base}/{tpl}/{slug}",
        "choice_url": f"{base}/demo/{slug}",
        "modern_url": f"{base}/modern/{slug}",
        "premium_url": f"{base}/premium/{slug}",
        "warm_url": f"{base}/warm/{slug}",
    }


def generate_whatsapp_pitch(clinic: Dict[str, Any], base_url: Optional[str] = None) -> Dict[str, str]:
    """Generates 2-part WhatsApp pitch (text hook + video/links caption)."""
    c = format_clinic_context(clinic, base_url)
    hook = (
        f"Namaste {c['doc_salutation']} 🙏\n\n"
        f"Google par {c['name']} ki {c['rating']}★ rating aur {c['revs']} patient reviews dekh kar kaafi accha laga.\n\n"
        f"Humne aapke clinic ke liye 3 alag visual styles mein ek modern website ready ki hai, taaki patients directly details dekh sakein aur appointment book kar sakein.\n\n"
        f"Iska ek quick screen recording video walkthrough niche share kar raha hoon:"
    )

    caption = (
        f"Ye walkthrough video aapke clinic ke liye customized layout ka preview hai.\n\n"
        f"Aapke clinic ke 3 distinct designs ready hain:\n"
        f"• Design 1 (Modern): {c['modern_url']}\n"
        f"• Design 2 (Premium): {c['premium_url']}\n"
        f"• Design 3 (Warm): {c['warm_url']}\n\n"
        f"Inme se jo bhi design aapko sabse best lage, hum aapke clinic ke liye wahi finalize kar denge.\n\n"
        f"Aapko inme se kaun sa design sabse accha laga?"
    )

    return {
        "channel": "WhatsApp",
        "text_hook": hook,
        "video_caption": caption,
        "full_text": f"{hook}\n\n---\n\n{caption}",
    }


def generate_instagram_pitch(clinic: Dict[str, Any], base_url: Optional[str] = None) -> Dict[str, str]:
    """Generates Instagram DM invite and reply kit."""
    c = format_clinic_context(clinic, base_url)
    dm = (
        f"Namaste {c['doc_salutation']}\n\n"
        f"Google par {c['name']} ki {c['rating']}/5 rating aur {c['revs']} patient reviews dekh kar kaafi accha laga.\n\n"
        f"Humne aapke clinic ke liye 3 alag visual styles mein ek modern website ready ki hai. Sample design ka live preview link ye raha:\n"
        f"{c['demo_url']}\n\n"
        f"Baqi do designs bhi live hain. Aapko ye design kaisa laga?"
    )

    reply_kit = (
        f"Ye {c['name']} ke live sample ka screen recording preview hai.\n\n"
        f"Aapke clinic ke 3 styles yahan dekh sakte hain:\n"
        f"• Modern: {c['modern_url']}\n"
        f"• Premium: {c['premium_url']}\n"
        f"• Warm: {c['warm_url']}\n\n"
        f"Aapke clinic brand ke liye kaun sa design sabse accha rahega?"
    )

    return {
        "channel": "Instagram",
        "initial_dm": dm,
        "reply_kit": reply_kit,
    }


def generate_email_pitch(clinic: Dict[str, Any], base_url: Optional[str] = None) -> Dict[str, str]:
    """Generates personalized Email subject and HTML/Plain-text body."""
    c = format_clinic_context(clinic, base_url)
    subject = f"Sample Website Designs for {c['name']}"
    body = (
        f"Namaste {c['doc_salutation']},\n\n"
        f"Google par {c['name']} ({c['loc']}) ki {c['rating']}★ rating aur {c['revs']} patient reviews dekh kar kaafi accha laga.\n\n"
        f"Humne aapke clinic ke liye 3 distinct visual styles mein interactive website layouts ready kiye hain, jisme mobile-first booking, verified services aur patient proof beautifully arranged hain:\n\n"
        f"• Design 1 (Modern Precision): {c['modern_url']}\n"
        f"• Design 2 (Premium Boutique): {c['premium_url']}\n"
        f"• Design 3 (Warm Family Care): {c['warm_url']}\n\n"
        f"Inme se jo bhi aesthetic aapke practice ke liye best fit ho, hum wahi finalize kar denge. Aapko inme se kaun sa design sabse pasand aaya?\n\n"
        f"Warm regards,\n"
        f"Ankur Tyagi\n"
        f"Web Architect & Healthcare UI Designer\n"
        f"Delhi NCR | +91 95823 90243\n\n"
        f"If you prefer not to receive updates regarding website designs, please reply 'opt-out' and we will remove your contact immediately."
    )

    return {
        "channel": "Email",
        "subject": subject,
        "body": body,
    }
