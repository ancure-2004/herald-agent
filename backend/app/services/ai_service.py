import json
import logging
import os
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger("personal_os.ai_service")


class AIService:
    """AI Service calling Gemini 3.8 Flash with fast deterministic fallbacks (<10s latency)."""

    GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

    @classmethod
    def _call_gemini_raw(cls, prompt: str, timeout_seconds: float = 4.0) -> Optional[str]:
        api_key = os.getenv("GEMINI_API_KEY", "").strip()
        if not api_key:
            return None

        url = f"{cls.GEMINI_API_URL}?key={api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 800,
            },
        }
        try:
            with httpx.Client(timeout=timeout_seconds) as client:
                resp = client.post(url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates") or []
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts") or []
                        if parts:
                            return parts[0].get("text", "").strip()
        except Exception as e:
            logger.debug(f"Gemini API call skipped or timed out ({e}); using deterministic fallback.")
        return None

    @classmethod
    def generate_reply_suggestions(
        cls,
        lead: Any,
        messages: List[Any],
    ) -> List[Dict[str, str]]:
        """
        Analyzes conversation thread history and the last inbound reply to generate
        exactly 3 distinct reply options:
          1. Direct Answer (clear direct response answering doctor's question or greeting)
          2. Value Reframe (reframes the commercial or marketing conversation around patient trust & Google Maps conversion)
          3. Quick OPD Check-in (low-friction, respectful check-in for busy doctors)
        """
        doctor_name = getattr(lead, "doctor_name", "") or (lead.get("doctor_name") if isinstance(lead, dict) else "")
        doctor_clean = doctor_name.replace("Dr.", "").strip() if doctor_name else "Doctor"
        clinic_name = getattr(lead, "name", "") or (lead.get("name") if isinstance(lead, dict) else "your clinic")
        locality = getattr(lead, "locality", "") or (lead.get("locality") if isinstance(lead, dict) else "Delhi NCR")

        last_inbound_text = ""
        for m in reversed(messages):
            direction = getattr(m, "direction", None) or (m.get("direction") if isinstance(m, dict) else "")
            text = getattr(m, "text", None) or (m.get("text") if isinstance(m, dict) else "")
            if direction == "inbound":
                last_inbound_text = text
                break

        # Attempt Gemini 3.8 Flash inference with prompt
        prompt = (
            f"You are Firstmate AI copilot for dental clinic outreach in Delhi NCR.\n"
            f"Lead: {clinic_name} in {locality}. Doctor: Dr. {doctor_clean}.\n"
            f"Last message from doctor: '{last_inbound_text}'\n\n"
            "Generate JSON with exactly 3 suggestions with keys 'category', 'text', 'tone':\n"
            "1. 'Direct Answer' (professional, answers their question directly)\n"
            "2. 'Value Reframe' (consultative, patient trust, direct WhatsApp booking vs Practo)\n"
            "3. 'Quick OPD Check-in' (polite_brief, acknowledges OPD hours, offers quick 2-min video)\n"
            "Output JSON array only."
        )

        gemini_response = cls._call_gemini_raw(prompt, timeout_seconds=3.5)
        if gemini_response:
            try:
                # Extract JSON array
                cleaned = gemini_response.strip()
                if "```json" in cleaned:
                    cleaned = cleaned.split("```json")[1].split("```")[0].strip()
                elif "```" in cleaned:
                    cleaned = cleaned.split("```")[1].split("```")[0].strip()
                parsed = json.loads(cleaned)
                if isinstance(parsed, list) and len(parsed) == 3:
                    return [
                        {
                            "category": item.get("category", "Direct Answer"),
                            "text": str(item.get("text", "")).strip(),
                            "tone": str(item.get("tone", "professional")).strip(),
                        }
                        for item in parsed
                    ]
            except Exception:
                pass

        # Robust Deterministic Fallback based on message intent & lead profile
        lower_msg = last_inbound_text.lower()
        if "price" in lower_msg or "cost" in lower_msg or "pricing" in lower_msg or "rate" in lower_msg:
            return [
                {
                    "category": "Direct Answer",
                    "text": (
                        f"Namaste Dr. {doctor_clean}! It is a one-time Rs. 15,000 all-inclusive package with zero monthly fees. "
                        f"Includes custom .in domain, 3 mobile designs, and direct WhatsApp appointment routing."
                    ),
                    "tone": "professional",
                },
                {
                    "category": "Value Reframe",
                    "text": (
                        f"Unlike Practo where you pay monthly per lead and competitors appear on your profile, "
                        f"this converts 100% of high-intent Google Maps searches in {locality} directly to your clinic phone."
                    ),
                    "tone": "consultative",
                },
                {
                    "category": "Quick OPD Check-in",
                    "text": (
                        f"Dr. {doctor_clean}, know you're in OPD right now. Would a 2-minute video walkthrough over WhatsApp "
                        f"or a quick 3-minute call post-8 PM work better for you?"
                    ),
                    "tone": "polite_brief",
                },
            ]
        elif "call" in lower_msg or "time" in lower_msg or "pm" in lower_msg or "am" in lower_msg:
            return [
                {
                    "category": "Direct Answer",
                    "text": (
                        f"Perfect Dr. {doctor_clean}! I have noted the time and will call you sharply. "
                        f"Looking forward to speaking with you."
                    ),
                    "tone": "professional",
                },
                {
                    "category": "Value Reframe",
                    "text": (
                        f"Sounds great Dr. Ji! During our quick call, I will show how clinics in {locality} "
                        f"are booking 20+ implant & cosmetic consultations monthly via direct WhatsApp."
                    ),
                    "tone": "consultative",
                },
                {
                    "category": "Quick OPD Check-in",
                    "text": (
                        f"Understood Dr. {doctor_clean}. If surgery runs late, no problem at all - just drop a text here "
                        f"and we can adjust the timing to your convenience."
                    ),
                    "tone": "polite_brief",
                },
            ]
        elif "implant" in lower_msg or "template" in lower_msg or "video" in lower_msg or "demo" in lower_msg:
            return [
                {
                    "category": "Direct Answer",
                    "text": (
                        f"Yes Dr. {doctor_clean}, we can highlight full implant packages, before/after showcases, "
                        f"and transparent pricing directly on the homepage."
                    ),
                    "tone": "professional",
                },
                {
                    "category": "Value Reframe",
                    "text": (
                        f"High-ticket implant patients in {locality} search on Google Maps before visiting. "
                        f"A dedicated implant gallery builds instant credibility and justifies premium consultation fees."
                    ),
                    "tone": "consultative",
                },
                {
                    "category": "Quick OPD Check-in",
                    "text": (
                        f"Dr. {doctor_clean}, I can update the preview with a dedicated implant section today. "
                        f"Shall I send the updated link here once ready?"
                    ),
                    "tone": "polite_brief",
                },
            ]
        else:
            return [
                {
                    "category": "Direct Answer",
                    "text": (
                        f"Namaste Dr. {doctor_clean}! Thank you for your response. We built 3 custom website designs "
                        f"specifically for {clinic_name} so your patients in {locality} can book appointments seamlessly."
                    ),
                    "tone": "professional",
                },
                {
                    "category": "Value Reframe",
                    "text": (
                        f"Most dental clinics in {locality} rely on word of mouth or aggregator listings. "
                        f"Having your own fast website ensures high-intent patients reach you directly on WhatsApp."
                    ),
                    "tone": "consultative",
                },
                {
                    "category": "Quick OPD Check-in",
                    "text": (
                        f"Dr. {doctor_clean}, hope your day is going well! Whenever you have 2 minutes between patients, "
                        f"take a look at the preview link and let me know your thoughts."
                    ),
                    "tone": "polite_brief",
                },
            ]

    @classmethod
    def structure_raw_call_notes(
        cls,
        lead: Any,
        raw_text: str,
    ) -> Dict[str, Any]:
        """
        Structures raw call conversations into 5 sections:
          - summary: str
          - interests: list of str
          - objections: list of str
          - commitments: list of dicts (who_owes_it, what, due_phrase)
          - next_steps: list of str
        plus a prep_brief: str.
        Execution completes in <10s.
        """
        doctor_name = getattr(lead, "doctor_name", "") or (lead.get("doctor_name") if isinstance(lead, dict) else "")
        doctor_clean = doctor_name.replace("Dr.", "").strip() if doctor_name else "Doctor"
        clinic_name = getattr(lead, "name", "") or (lead.get("name") if isinstance(lead, dict) else "clinic")
        locality = getattr(lead, "locality", "") or (lead.get("locality") if isinstance(lead, dict) else "Delhi NCR")

        prompt = (
            f"You are Firstmate AI structuring a phone call with Dr. {doctor_clean} of {clinic_name} in {locality}.\n"
            f"Raw Transcript:\n'''\n{raw_text[:2000]}\n'''\n\n"
            "Return JSON object with exactly these keys:\n"
            "1. 'summary': string (2-3 sentences summary of the call)\n"
            "2. 'interests': array of strings (features or topics doctor was interested in)\n"
            "3. 'objections': array of strings (concerns or hesitation raised)\n"
            "4. 'commitments': array of objects { 'who_owes_it': 'us'|'them', 'what': string, 'due_phrase': string }\n"
            "5. 'next_steps': array of strings (clear concrete action items)\n"
            "6. 'prep_brief': string (brief bullet points for next touchpoint)\n"
            "Output JSON object only."
        )

        gemini_response = cls._call_gemini_raw(prompt, timeout_seconds=3.8)
        if gemini_response:
            try:
                cleaned = gemini_response.strip()
                if "```json" in cleaned:
                    cleaned = cleaned.split("```json")[1].split("```")[0].strip()
                elif "```" in cleaned:
                    cleaned = cleaned.split("```")[1].split("```")[0].strip()
                parsed = json.loads(cleaned)
                if (
                    isinstance(parsed, dict)
                    and "summary" in parsed
                    and "interests" in parsed
                    and "objections" in parsed
                    and "commitments" in parsed
                    and "next_steps" in parsed
                ):
                    return {
                        "summary": str(parsed.get("summary", "")).strip(),
                        "interests": list(parsed.get("interests", [])),
                        "objections": list(parsed.get("objections", [])),
                        "commitments": list(parsed.get("commitments", [])),
                        "next_steps": list(parsed.get("next_steps", [])),
                        "prep_brief": str(parsed.get("prep_brief", "")).strip(),
                    }
            except Exception:
                pass

        # Deterministic extraction logic
        raw_lower = raw_text.lower()
        interests = []
        if "modern" in raw_lower or "design" in raw_lower or "template" in raw_lower or "layout" in raw_lower:
            interests.append("Modern clinic website layout & patient review section")
        if "whatsapp" in raw_lower or "button" in raw_lower or "booking" in raw_lower:
            interests.append("Direct WhatsApp booking integration")
        if "implant" in raw_lower or "cosmetic" in raw_lower or "ortho" in raw_lower:
            interests.append("High-ticket treatment showcase (Implants / Aesthetics)")
        if "google" in raw_lower or "maps" in raw_lower or "seo" in raw_lower or "rating" in raw_lower:
            interests.append("Google Maps local search visibility in " + locality)
        if not interests:
            interests.append("Custom website demo review")

        objections = []
        if "practo" in raw_lower or "justdial" in raw_lower or "spend" in raw_lower:
            objections.append("Existing Practo / aggregator directory subscription spend")
        if "price" in raw_lower or "expensive" in raw_lower or "cost" in raw_lower or "budget" in raw_lower:
            objections.append("Package pricing & domain ownership transparency")
        if "maintenance" in raw_lower or "update" in raw_lower or "timing" in raw_lower or "opd" in raw_lower:
            objections.append("Ongoing maintenance and turnaround time for OPD schedule changes")
        if "retir" in raw_lower or "not interested" in raw_lower or "stop" in raw_lower:
            objections.append("Doctor transitioning or retiring from active practice")
        if not objections:
            objections.append("Requested pricing and feature comparison sheet")

        commitments = []
        if "friday" in raw_lower or "follow" in raw_lower or "call" in raw_lower:
            commitments.append({
                "who_owes_it": "us",
                "what": f"Follow up with Dr. {doctor_clean} regarding clinic proposal",
                "due_phrase": "within 2 days",
            })
        if "send" in raw_lower or "proposal" in raw_lower or "comparison" in raw_lower or "pricing" in raw_lower:
            commitments.append({
                "who_owes_it": "us",
                "what": "Send detailed pricing sheet and domain inclusions over WhatsApp",
                "due_phrase": "by tomorrow",
            })
        if "partner" in raw_lower or "review" in raw_lower or "discuss" in raw_lower:
            commitments.append({
                "who_owes_it": "them",
                "what": "Review proposal with clinic partners",
                "due_phrase": "before next call",
            })
        if not commitments:
            commitments.append({
                "who_owes_it": "us",
                "what": f"Share proposal summary with Dr. {doctor_clean}",
                "due_phrase": "within 24 hours",
            })

        next_steps = []
        if any(c["who_owes_it"] == "us" for c in commitments):
            next_steps.append("Send proposal and comparison sheet via WhatsApp")
        next_steps.append(f"Schedule follow-up call with Dr. {doctor_clean}")

        # Summary generation
        first_sentence = raw_text.split(".")[0].strip() if "." in raw_text else raw_text[:120].strip()
        summary = (
            f"Spoke with Dr. {doctor_clean} ({clinic_name}). {first_sentence}. "
            f"Discussed clinic design options and agreed on next steps."
        )

        prep_brief = (
            f"- Acknowledge Dr. {doctor_clean}'s clinical focus in {locality}.\n"
            f"- Emphasize that own website converts Google Maps patients at 100% margin without aggregator fees.\n"
            f"- Close on Rs. 15,000 package with free domain setup and 2-hour update SLA."
        )

        return {
            "summary": summary,
            "interests": interests,
            "objections": objections,
            "commitments": commitments,
            "next_steps": next_steps,
            "prep_brief": prep_brief,
        }

    @classmethod
    def generate_call_prep_brief(
        cls,
        lead: Any,
        calls: List[Any],
        messages: List[Any],
    ) -> Dict[str, Any]:
        """
        Combines past call notes and thread history into a concise 'what to talk about' brief
        for lead follow-up.
        """
        lead_id = getattr(lead, "id", None) or (lead.get("id") if isinstance(lead, dict) else 0)
        doctor_name = getattr(lead, "doctor_name", "") or (lead.get("doctor_name") if isinstance(lead, dict) else "")
        doctor_clean = doctor_name.replace("Dr.", "").strip() if doctor_name else "Doctor"
        clinic_name = getattr(lead, "name", "") or (lead.get("name") if isinstance(lead, dict) else "clinic")
        locality = getattr(lead, "locality", "") or (lead.get("locality") if isinstance(lead, dict) else "Delhi NCR")

        past_commitments = []
        key_objections = []
        brief_snippets = []

        for c in calls:
            c_brief = getattr(c, "prep_brief", "") or (c.get("prep_brief") if isinstance(c, dict) else "")
            if c_brief:
                brief_snippets.append(c_brief)
            c_comms = getattr(c, "commitments", []) or (c.get("commitments") if isinstance(c, dict) else [])
            if isinstance(c_comms, list):
                past_commitments.extend(c_comms)
            c_objs = getattr(c, "objections", []) or (c.get("objections") if isinstance(c, dict) else [])
            if isinstance(c_objs, list):
                key_objections.extend(c_objs)

        # De-duplicate
        key_objections = list(dict.fromkeys(key_objections))

        if brief_snippets:
            combined_brief = "\n\n".join(brief_snippets)
        else:
            combined_brief = (
                f"Call Brief for Dr. {doctor_clean} ({clinic_name}, {locality}):\n"
                f"- Review 3 custom website designs (Modern, Premium, Warm) built for their clinic.\n"
                f"- Contrast direct WhatsApp patient routing against Practo directory fees.\n"
                f"- Offer standard Rs. 15,000 package with complimentary .in domain and Google Maps verification."
            )

        return {
            "lead_id": lead_id,
            "clinic_name": clinic_name,
            "doctor_name": doctor_name,
            "prep_brief": combined_brief,
            "past_commitments": past_commitments,
            "key_objections": key_objections,
        }
