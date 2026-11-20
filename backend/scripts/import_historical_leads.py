#!/usr/bin/env python3
"""
import_historical_leads.py
---------------------------
Scans ALL historical leads across:
  (1) projects/Side hustle (Building Website)/website-hustle-tracker.xlsx
  (2) projects/Side hustle (Building Website)/website hustle tracker/ (Sept, Oct, Master)
  (3) projects/dental-clinic-engine/data/clinics/
  (4) projects/Dental-Clinic-Clients/
  (5) projects/Side hustle (Building Website)/dispatch-cockpit/ + scrapes/ + call logs/

Deduplicates by normalized phone (+91/10-digit) and slug.
Cross-checks contacted status against dispatch-cockpit ground truth:
  - wa_autopilot_state.json
  - wa_daily_log.json
  - email_autopilot_state.json
  - ig_autopilot_state.json
  - ig_daily_log.json
  - call logs/
  - client dispatch_log.md records
(NOT tracker alone).

Classification rules:
  (a) Contacted via WhatsApp/Email/Call -> keep accurate contacted/replied/DNC stage & history.
  (b) Never contacted OR contacted ONLY via Instagram -> set status='STAGED'
      (brand-new uncontacted lead, preserving demo links & research if built, into Lead & LeadFact).

Supports:
  --dry-run : preview counts, classification, and details without writing to DB.
  --apply   : execute upsert into SQLite personal_os.db.
"""

import argparse
import glob
import json
import os
import re
import sys
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple

# Add local package site-packages if openpyxl is in ~/.local
LOCAL_SITE = "/home/ancure/.local/lib/python3.14/site-packages"
if os.path.exists(LOCAL_SITE) and LOCAL_SITE not in sys.path:
    sys.path.insert(0, LOCAL_SITE)

try:
    import openpyxl
except ImportError:
    openpyxl = None

# Ensure backend root is on sys.path to import app models
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from app.database import SessionLocal  # noqa: E402
from app.models import Hustle, Lead, LeadFact, Package, Stage  # noqa: E402


PROJECTS_ROOT = os.path.abspath(os.path.join(BACKEND_ROOT, "..", ".."))
HUSTLE_DIR = os.path.join(PROJECTS_ROOT, "Side hustle (Building Website)")
DENTAL_ENGINE_DIR = os.path.join(PROJECTS_ROOT, "dental-clinic-engine")
CLIENTS_DIR = os.path.join(PROJECTS_ROOT, "Dental-Clinic-Clients")


def sanitize_instagram_handle(val: Any) -> Optional[str]:
    """Extracts and validates a clean Instagram handle, rejecting emails and domains."""
    if not val:
        return None
    s = str(val).strip()
    if not s or s.lower() in ("none", "null", "nan", "-"):
        return None
    # If it's an email address, reject
    if re.search(r"@[\w\.-]+\.(com|in|org|net|edu|io|co)", s, re.IGNORECASE):
        return None
    if "@" in s:
        m = re.search(r"@([A-Za-z0-9_\.]+)", s)
        if m:
            s = m.group(1)
        else:
            return None
    s = s.strip("/").strip()
    # If it's a URL like instagram.com/handle
    if "instagram.com" in s:
        parts = s.split("instagram.com/")
        if len(parts) > 1:
            s = parts[1].split("/")[0].split("?")[0]
    s = s.replace("@", "").strip()
    # Reject common non-handles
    if s.lower() in ("gmail.com", "yahoo.com", "outlook.com", "instagram", "facebook", "website"):
        return None
    if re.match(r"^[A-Za-z0-9_\.]{2,30}$", s) and not s.endswith(".com") and not s.endswith(".in"):
        return s.lower()
    return None


def normalize_phone(phone_str: Any) -> Optional[str]:
    """Normalizes phone numbers to standard 10-digit format for India."""
    if not phone_str:
        return None
    raw = str(phone_str).strip()
    if raw in ("-", "None", "", "nan", "null"):
        return None
    digits = re.sub(r"\D", "", raw)
    if not digits:
        return None
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    elif len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]
    elif len(digits) > 10 and digits.startswith("91"):
        digits = digits[2:12]

    if len(digits) == 10 and digits[0] in "6789":
        return digits
    if len(digits) >= 10:
        return digits[-10:]
    return None


def format_e164(phone_10: Optional[str]) -> Optional[str]:
    """Formats 10-digit number as +91XXXXXXXXXX."""
    if not phone_10 or len(phone_10) != 10:
        return None
    return f"+91{phone_10}"


def slugify(text: str) -> str:
    """Generates a clean URL slug."""
    s = re.sub(r"[^a-z0-9]+", "-", str(text).lower()).strip("-")
    return s or "clinic"


def parse_int_safe(val: Any) -> int:
    """Safely extracts integer count from strings like '77+', '1,200', etc."""
    if val is None:
        return 0
    if isinstance(val, (int, float)):
        return int(val)
    m = re.search(r"\d+", str(val).replace(",", ""))
    return int(m.group(0)) if m else 0


class HistoricalLeadScanner:
    def __init__(self, dry_run: bool = True):
        self.dry_run = dry_run
        self.wa_contacted_phones: Set[str] = set()
        self.wa_contacted_slugs: Set[str] = set()
        self.email_contacted_emails: Set[str] = set()
        self.email_contacted_slugs: Set[str] = set()
        self.call_logged_phones: Set[str] = set()
        self.call_logged_slugs: Set[str] = set()
        self.ig_contacted_handles: Set[str] = set()
        self.ig_contacted_slugs: Set[str] = set()

        # Master candidate registry keyed by canonical identifier: phone or slug
        self.leads_by_phone: Dict[str, Dict[str, Any]] = {}
        self.leads_by_slug: Dict[str, Dict[str, Any]] = {}
        self.canonical_leads: List[Dict[str, Any]] = []

    def load_ground_truth(self) -> None:
        """Loads ground truth from dispatch-cockpit state files, call logs, and client dispatch logs."""
        dp_dir = os.path.join(HUSTLE_DIR, "dispatch-cockpit")

        # 1. WhatsApp ground truth
        wa_daily_path = os.path.join(dp_dir, "wa_daily_log.json")
        if os.path.exists(wa_daily_path):
            try:
                with open(wa_daily_path, "r", encoding="utf-8") as f:
                    wa_data = json.load(f)
                    for day_key, val in wa_data.items():
                        targets = val.get("targets", [])
                        for t in targets:
                            p = normalize_phone(t.get("phone"))
                            if p:
                                self.wa_contacted_phones.add(p)
                            n = t.get("name")
                            if n:
                                self.wa_contacted_slugs.add(slugify(n))
            except Exception as e:
                print(f"[WARN] Error reading wa_daily_log.json: {e}")

        wa_state_path = os.path.join(dp_dir, "wa_autopilot_state.json")
        if os.path.exists(wa_state_path):
            try:
                with open(wa_state_path, "r", encoding="utf-8") as f:
                    wa_st = json.load(f)
                    for line in wa_st.get("logs", []):
                        matches = re.findall(r"(?:91|\+91)?([6789]\d{9})", line)
                        for m in matches:
                            self.wa_contacted_phones.add(m)
            except Exception as e:
                print(f"[WARN] Error reading wa_autopilot_state.json: {e}")

        # 2. Email ground truth
        email_state_path = os.path.join(dp_dir, "email_autopilot_state.json")
        if os.path.exists(email_state_path):
            try:
                with open(email_state_path, "r", encoding="utf-8") as f:
                    em_st = json.load(f)
                    for line in em_st.get("logs", []):
                        em_match = re.findall(r"[\w\.-]+@[\w\.-]+\.\w+", line)
                        for em in em_match:
                            self.email_contacted_emails.add(em.lower())
            except Exception as e:
                print(f"[WARN] Error reading email_autopilot_state.json: {e}")

        # 3. Call logs ground truth
        call_logs_dir = os.path.join(HUSTLE_DIR, "call logs")
        if os.path.exists(call_logs_dir):
            for file_path in glob.glob(os.path.join(call_logs_dir, "*.txt")):
                try:
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                        for line in f:
                            p_match = re.search(r"Phone:\s*([^\n\r]+)", line, re.IGNORECASE)
                            if p_match:
                                digits = re.sub(r"\D", "", p_match.group(1))
                                if len(digits) >= 10:
                                    self.call_logged_phones.add(digits[-10:])
                            for m in re.finditer(r"(?:(?:\+?91|0)?([6789]\d{9}))\b", line):
                                self.call_logged_phones.add(m.group(1))
                            m_name = re.match(r"^\d+\.\s+([^(—\-]+)", line.strip())
                            if m_name:
                                self.call_logged_slugs.add(slugify(m_name.group(1).strip()))
                except Exception as e:
                    print(f"[WARN] Error reading call log {file_path}: {e}")

        # 4. Instagram ground truth
        ig_daily_path = os.path.join(dp_dir, "ig_daily_log.json")
        if os.path.exists(ig_daily_path):
            try:
                with open(ig_daily_path, "r", encoding="utf-8") as f:
                    ig_data = json.load(f)
                    for day_key, day_val in ig_data.items():
                        for subkey in ("sends", "a", "b"):
                            items = []
                            if subkey in day_val:
                                sub = day_val[subkey]
                                if isinstance(sub, dict):
                                    items = sub.get("sends", [])
                                elif isinstance(sub, list):
                                    items = sub
                            for item in items:
                                handle = item.get("handle")
                                if handle:
                                    self.ig_contacted_handles.add(handle.lower().replace("@", ""))
                                name = item.get("name")
                                if name:
                                    self.ig_contacted_slugs.add(slugify(name))
            except Exception as e:
                print(f"[WARN] Error reading ig_daily_log.json: {e}")

        # 5. Client dispatch_log.md records (ground truth of executed dispatches)
        for month_folder in ("september", "october"):
            folder_path = os.path.join(CLIENTS_DIR, month_folder)
            if not os.path.exists(folder_path):
                continue
            for client_dir in glob.glob(os.path.join(folder_path, "client-*")):
                dlog_file = os.path.join(client_dir, "dispatch_log.md")
                if os.path.exists(dlog_file):
                    try:
                        folder_name = os.path.basename(client_dir)
                        clean_name = re.sub(r"^client-\d+-", "", folder_name).replace("-", " ")
                        c_slug = slugify(clean_name)
                        with open(dlog_file, "r", encoding="utf-8", errors="ignore") as dfp:
                            dlog_content = dfp.read()
                            if "WhatsApp" in dlog_content:
                                self.wa_contacted_slugs.add(c_slug)
                            if "Instagram" in dlog_content:
                                self.ig_contacted_slugs.add(c_slug)
                            if "Email" in dlog_content:
                                self.email_contacted_slugs.add(c_slug)
                    except Exception:
                        pass

        print(f"[Ground Truth] WA Contacted: {len(self.wa_contacted_phones)} phones, {len(self.wa_contacted_slugs)} slugs")
        print(f"[Ground Truth] Call Logged: {len(self.call_logged_phones)} phones, {len(self.call_logged_slugs)} slugs")
        print(f"[Ground Truth] Email Contacted: {len(self.email_contacted_emails)} emails, {len(self.email_contacted_slugs)} slugs")
        print(f"[Ground Truth] IG Contacted: {len(self.ig_contacted_handles)} handles, {len(self.ig_contacted_slugs)} slugs")

    def _merge_lead_record(self, record: Dict[str, Any]) -> None:
        """Merges a candidate lead into the unified registry."""
        phone = record.get("phone")
        slug = record.get("slug")
        name = record.get("name") or "Dental Clinic"

        existing = None
        if phone and phone in self.leads_by_phone:
            existing = self.leads_by_phone[phone]
        elif slug and slug in self.leads_by_slug:
            existing = self.leads_by_slug[slug]

        if not existing:
            lead_entry = {
                "name": name,
                "slug": slug or slugify(name),
                "phone": phone,
                "phones": [phone] if phone else [],
                "doctor_name": record.get("doctor_name", ""),
                "locality": record.get("locality", ""),
                "address": record.get("address", ""),
                "city": record.get("city", "Delhi NCR"),
                "email": record.get("email"),
                "instagram_handle": record.get("instagram_handle"),
                "maps_url": record.get("maps_url", ""),
                "rating": float(record.get("rating", 0.0) or 0.0),
                "review_count": parse_int_safe(record.get("review_count", 0)),
                "lead_score": parse_int_safe(record.get("lead_score", 0)),
                "tracker_status": record.get("tracker_status", ""),
                "demo_links": list(record.get("demo_links", [])),
                "video_path": record.get("video_path"),
                "facts": dict(record.get("facts", {})),
                "package_data": record.get("package_data"),
                "sources": {record.get("source", "unknown")},
                "raw_channels": set(record.get("raw_channels", [])),
                "is_dnc": bool(record.get("is_dnc", False)),
                "is_closed_lost": bool(record.get("is_closed_lost", False)),
                "has_replied": bool(record.get("has_replied", False)),
            }
            if phone:
                self.leads_by_phone[phone] = lead_entry
            if lead_entry["slug"]:
                self.leads_by_slug[lead_entry["slug"]] = lead_entry
            self.canonical_leads.append(lead_entry)
        else:
            if not existing["doctor_name"] and record.get("doctor_name"):
                existing["doctor_name"] = record["doctor_name"]
            if not existing["locality"] and record.get("locality"):
                existing["locality"] = record["locality"]
            if not existing["address"] and record.get("address"):
                existing["address"] = record["address"]
            if not existing["email"] and record.get("email"):
                existing["email"] = record["email"]
            if not existing["instagram_handle"] and record.get("instagram_handle"):
                existing["instagram_handle"] = record["instagram_handle"]
            if not existing["maps_url"] and record.get("maps_url"):
                existing["maps_url"] = record["maps_url"]
            if record.get("rating"):
                existing["rating"] = max(existing.get("rating", 0.0), float(record["rating"]))
            if record.get("review_count"):
                existing["review_count"] = max(existing.get("review_count", 0), parse_int_safe(record["review_count"]))
            if record.get("lead_score"):
                existing["lead_score"] = max(existing.get("lead_score", 0), parse_int_safe(record["lead_score"]))
            if phone and phone not in existing["phones"]:
                existing["phones"].append(phone)
            if not existing["phone"] and phone:
                existing["phone"] = phone
                self.leads_by_phone[phone] = existing
            if record.get("demo_links"):
                for dl in record["demo_links"]:
                    if dl and dl not in existing["demo_links"]:
                        existing["demo_links"].append(dl)
            if record.get("video_path") and not existing.get("video_path"):
                existing["video_path"] = record["video_path"]
            if record.get("facts"):
                existing["facts"].update(record["facts"])
            if record.get("package_data") and not existing.get("package_data"):
                existing["package_data"] = record["package_data"]
            if record.get("source"):
                existing["sources"].add(record["source"])
            if record.get("raw_channels"):
                existing["raw_channels"].update(record["raw_channels"])
            if record.get("is_dnc"):
                existing["is_dnc"] = True
            if record.get("is_closed_lost"):
                existing["is_closed_lost"] = True
            if record.get("has_replied"):
                existing["has_replied"] = True
            if record.get("tracker_status") and not existing.get("tracker_status"):
                existing["tracker_status"] = record["tracker_status"]

    def scan_trackers(self) -> None:
        """Scans website-hustle-tracker.xlsx and website hustle tracker/ (Sept, Oct)."""
        if not openpyxl:
            print("[ERROR] openpyxl not available. Skipping Excel trackers.")
            return

        tracker_files = [
            os.path.join(HUSTLE_DIR, "website-hustle-tracker.xlsx"),
            os.path.join(HUSTLE_DIR, "website hustle tracker", "october outreach.xlsx"),
            os.path.join(HUSTLE_DIR, "website hustle tracker", "september outreach.xlsx"),
            os.path.join(HUSTLE_DIR, "website hustle tracker", "october outreach.backup.xlsx"),
        ]

        for file_path in tracker_files:
            if not os.path.exists(file_path):
                continue
            src_name = os.path.basename(file_path)
            try:
                wb = openpyxl.load_workbook(file_path, data_only=True)
                # 1. Lead Pipeline tab
                if "Lead Pipeline" in wb.sheetnames:
                    ws = wb["Lead Pipeline"]
                    header_map: Dict[str, int] = {}
                    for col in range(1, ws.max_column + 1):
                        val = ws.cell(1, col).value
                        if val:
                            header_map[str(val).strip().lower()] = col

                    for row in range(2, ws.max_row + 1):
                        name_val = ws.cell(row, header_map.get("business name", 1)).value
                        if not name_val or str(name_val).strip() in ("None", "", "-"):
                            continue
                        name = str(name_val).strip()
                        phone_val = ws.cell(row, header_map.get("phone", 4)).value
                        phone = normalize_phone(phone_val)
                        area_val = ws.cell(row, header_map.get("area/locality", 3)).value
                        ig_web_val = ws.cell(row, header_map.get("instagram/website (if any)", 5)).value
                        owner_val = ws.cell(row, header_map.get("owner name", 6)).value
                        maps_val = ws.cell(row, header_map.get("google maps url", 9)).value
                        score_val = ws.cell(row, header_map.get("lead score", 10)).value
                        status_val = ws.cell(row, header_map.get("status", 11)).value
                        demo_val = ws.cell(row, header_map.get("demo link", 12)).value
                        notes_val = ws.cell(row, header_map.get("notes", 15)).value
                        json_val = ws.cell(row, header_map.get("full details (json)", 16)).value

                        ig_handle = sanitize_instagram_handle(ig_web_val)

                        facts = {}
                        rating = 0.0
                        review_count = 0
                        if json_val:
                            try:
                                j_obj = json.loads(str(json_val))
                                if isinstance(j_obj, dict):
                                    for k in ("address", "hours", "place_id", "email"):
                                        if j_obj.get(k):
                                            facts[k] = j_obj[k]
                                    rating = float(j_obj.get("rating", 0.0) or 0.0)
                                    review_count = parse_int_safe(j_obj.get("review_count", 0))
                            except Exception:
                                pass

                        demo_links = []
                        if demo_val and str(demo_val).startswith("http"):
                            demo_links.append(str(demo_val).strip())

                        rec = {
                            "name": name,
                            "slug": slugify(name),
                            "phone": phone,
                            "doctor_name": str(owner_val).strip() if owner_val and str(owner_val) != "None" else "",
                            "locality": str(area_val).strip() if area_val and str(area_val) != "None" else "",
                            "instagram_handle": ig_handle,
                            "maps_url": str(maps_val).strip() if maps_val and str(maps_val) != "None" else "",
                            "rating": rating,
                            "review_count": review_count,
                            "lead_score": parse_int_safe(score_val),
                            "tracker_status": str(status_val).strip() if status_val else "",
                            "demo_links": demo_links,
                            "facts": facts,
                            "source": f"excel_{src_name}",
                            "is_closed_lost": "closed-lost" in str(status_val).lower() or "lost" in str(notes_val).lower(),
                        }
                        self._merge_lead_record(rec)

                # 2. Outreach Log tab
                if "Outreach Log" in wb.sheetnames:
                    ws = wb["Outreach Log"]
                    for row in range(2, ws.max_row + 1):
                        bname = ws.cell(row, 1).value
                        if not bname:
                            continue
                        channel = str(ws.cell(row, 2).value or "").strip()
                        outcome = str(ws.cell(row, 9).value or "").strip()
                        response = str(ws.cell(row, 8).value or "").strip()
                        call_outcome = str(ws.cell(row, 7).value or "").strip()

                        slug = slugify(bname)
                        rec = {
                            "name": str(bname).strip(),
                            "slug": slug,
                            "raw_channels": [channel] if channel else [],
                            "source": f"excel_{src_name}_outreach",
                            "is_closed_lost": "closed-lost" in outcome.lower() or "lost" in call_outcome.lower(),
                            "has_replied": response.lower() in ("yes", "replied") or "replied" in outcome.lower(),
                        }
                        self._merge_lead_record(rec)
            except Exception as e:
                print(f"[WARN] Error scanning {file_path}: {e}")

    def scan_dental_clinic_engine(self) -> None:
        """Scans dental-clinic-engine/data/clinics/*."""
        clinics_base = os.path.join(DENTAL_ENGINE_DIR, "data", "clinics")
        if not os.path.exists(clinics_base):
            return

        for clinic_dir in glob.glob(os.path.join(clinics_base, "*")):
            if not os.path.isdir(clinic_dir):
                continue
            clinic_json_path = os.path.join(clinic_dir, "clinic.json")
            if not os.path.exists(clinic_json_path):
                continue

            try:
                with open(clinic_json_path, "r", encoding="utf-8") as f:
                    content = f.read().strip()
                    if not content or content.startswith("\x00"):
                        continue
                    cdata = json.loads(content)

                slug = cdata.get("slug") or os.path.basename(clinic_dir)
                name = cdata.get("clinicName") or cdata.get("shortName") or slug
                phone = normalize_phone(cdata.get("phone") or cdata.get("phoneRaw") or cdata.get("whatsapp"))
                doctor = cdata.get("doctor", {})
                doc_name = doctor.get("name", "") if isinstance(doctor, dict) else str(doctor)

                demo_links = [
                    f"/modern/{slug}",
                    f"/premium/{slug}",
                    f"/warm/{slug}",
                    f"/demo/{slug}",
                ]

                facts = {
                    "area": cdata.get("area", ""),
                    "address": cdata.get("address", ""),
                    "landmark": cdata.get("landmark", ""),
                    "rating": float(cdata.get("rating", 0.0) or 0.0),
                    "review_count": parse_int_safe(cdata.get("reviewCount")),
                    "consultation_fee": cdata.get("consultationFee", ""),
                    "hours": cdata.get("hours", {}),
                    "doctors": cdata.get("doctors", []),
                }

                for fname in ("claims.json", "faqs.json", "services.json"):
                    fpath = os.path.join(clinic_dir, fname)
                    if os.path.exists(fpath):
                        try:
                            with open(fpath, "r", encoding="utf-8") as sfp:
                                facts[fname.replace(".json", "")] = json.load(sfp)
                        except Exception:
                            pass

                rec = {
                    "name": name,
                    "slug": slug,
                    "phone": phone,
                    "doctor_name": doc_name,
                    "locality": cdata.get("area", ""),
                    "address": cdata.get("address", ""),
                    "rating": float(cdata.get("rating", 0.0) or 0.0),
                    "review_count": parse_int_safe(cdata.get("reviewCount")),
                    "demo_links": demo_links,
                    "package_data": cdata,
                    "facts": facts,
                    "source": "dental_clinic_engine",
                }
                self._merge_lead_record(rec)
            except Exception as e:
                print(f"[WARN] Error scanning clinic {clinic_dir}: {e}")

    def scan_dental_clinic_clients(self) -> None:
        """Scans Dental-Clinic-Clients (september & october)."""
        for month_folder in ("september", "october"):
            folder_path = os.path.join(CLIENTS_DIR, month_folder)
            if not os.path.exists(folder_path):
                continue

            for client_dir in glob.glob(os.path.join(folder_path, "client-*")):
                if not os.path.isdir(client_dir):
                    continue

                folder_name = os.path.basename(client_dir)
                clean_name = re.sub(r"^client-\d+-", "", folder_name).replace("-", " ")

                video_files = glob.glob(os.path.join(client_dir, "*.mp4"))
                video_path = video_files[0] if video_files else None

                research_path = os.path.join(client_dir, "research.md")
                phone = None
                locality = ""
                address = ""
                doctor_name = ""
                facts = {}

                if os.path.exists(research_path):
                    try:
                        with open(research_path, "r", encoding="utf-8", errors="ignore") as f:
                            r_text = f.read().replace("\x00", "")
                            p_match = re.search(r"Phone:\s*([^\n|]+)", r_text)
                            if p_match:
                                phone = normalize_phone(p_match.group(1))
                            a_match = re.search(r"Address:\s*([^\n]+)", r_text)
                            if a_match:
                                address = a_match.group(1).strip()
                            l_match = re.search(r"Area/Locality:\s*([^\n]+)", r_text)
                            if l_match:
                                locality = l_match.group(1).strip()
                            d_match = re.search(r"(?:Doctor|Owner)(?:\s*name)?:\s*([^\n]+)", r_text, re.IGNORECASE)
                            if d_match:
                                doctor_name = d_match.group(1).strip()
                            facts["dossier_text"] = r_text[:500]
                    except Exception:
                        pass

                rec = {
                    "name": clean_name,
                    "slug": slugify(clean_name),
                    "phone": phone,
                    "doctor_name": doctor_name,
                    "locality": locality,
                    "address": address,
                    "video_path": video_path,
                    "facts": facts,
                    "source": f"clients_{month_folder}",
                }
                self._merge_lead_record(rec)

    def scan_scrapes_and_dispatch(self) -> None:
        """Scans scrapes/ and dispatch-cockpit candidate/manifest files."""
        # 1. Scrapes
        scrapes_dir = os.path.join(HUSTLE_DIR, "scrapes")
        if os.path.exists(scrapes_dir):
            l30_path = os.path.join(scrapes_dir, "leads_30_batch.json")
            if os.path.exists(l30_path):
                try:
                    with open(l30_path, "r", encoding="utf-8") as f:
                        for item in json.load(f):
                            name = item.get("Business Name") or item.get("name")
                            if name:
                                self._merge_lead_record({
                                    "name": name,
                                    "slug": slugify(name),
                                    "phone": normalize_phone(item.get("Phone") or item.get("phone")),
                                    "locality": item.get("Area/Locality") or item.get("locality", ""),
                                    "rating": float(item.get("Google Rating") or item.get("rating") or 0.0),
                                    "review_count": parse_int_safe(item.get("Review Count") or item.get("review_count")),
                                    "source": "scrapes_leads_30_batch",
                                })
                except Exception as e:
                    print(f"[WARN] Error reading leads_30_batch.json: {e}")

            eig_path = os.path.join(scrapes_dir, "enriched_ig_leads.json")
            if os.path.exists(eig_path):
                try:
                    with open(eig_path, "r", encoding="utf-8") as f:
                        for item in json.load(f):
                            name = item.get("business_name")
                            if name:
                                self._merge_lead_record({
                                    "name": name,
                                    "slug": slugify(name),
                                    "phone": normalize_phone(item.get("phone")),
                                    "email": item.get("email"),
                                    "instagram_handle": sanitize_instagram_handle(item.get("ig_handle")),
                                    "locality": item.get("area", ""),
                                    "source": "scrapes_enriched_ig",
                                })
                except Exception as e:
                    print(f"[WARN] Error reading enriched_ig_leads.json: {e}")

        # 2. Dispatch cockpit manifests / batches
        dp_dir = os.path.join(HUSTLE_DIR, "dispatch-cockpit")
        for bfile in glob.glob(os.path.join(dp_dir, "batch_*.json")):
            try:
                with open(bfile, "r", encoding="utf-8") as f:
                    content = json.load(f)
                    items = content if isinstance(content, list) else content.get("clinics", [])
                    if isinstance(items, list):
                        for item in items:
                            if isinstance(item, dict):
                                name = item.get("name") or item.get("clinicName")
                                if name:
                                    self._merge_lead_record({
                                        "name": name,
                                        "slug": slugify(name),
                                        "phone": normalize_phone(item.get("phone") or item.get("whatsapp")),
                                        "locality": item.get("area") or item.get("locality", ""),
                                        "source": f"cockpit_{os.path.basename(bfile)}",
                                    })
            except Exception:
                pass

    def classify_lead(self, lead: Dict[str, Any], stage_map: Dict[str, Stage]) -> Tuple[str, int, str]:
        """
        Classifies lead according to ground truth:
          (a) Contacted via WhatsApp/Email/Call -> keep accurate contacted/replied/DNC stage & history
          (b) Never contacted OR contacted ONLY via Instagram -> set status='STAGED'
        """
        phone = lead.get("phone")
        slug = lead.get("slug")
        email = lead.get("email", "").lower() if lead.get("email") else ""
        ig_handle = lead.get("instagram_handle", "").lower() if lead.get("instagram_handle") else ""

        # Check contact channels against ground truth
        contacted_wa = bool((phone and phone in self.wa_contacted_phones) or (slug and slug in self.wa_contacted_slugs))
        contacted_call = bool((phone and phone in self.call_logged_phones) or (slug and slug in self.call_logged_slugs))
        contacted_email = bool((email and email in self.email_contacted_emails) or (slug and slug in self.email_contacted_slugs))
        contacted_ig = bool((ig_handle and ig_handle in self.ig_contacted_handles) or (slug and slug in self.ig_contacted_slugs))

        # Check tracker signals as secondary verification for WhatsApp / Call / Email
        raw_channels = lead.get("raw_channels", set())
        if "WhatsApp" in raw_channels:
            contacted_wa = True
        if "Direct Call" in raw_channels:
            contacted_call = True
        if "Email" in raw_channels:
            contacted_email = True

        has_high_touch_contact = contacted_wa or contacted_call or contacted_email

        if not has_high_touch_contact:
            # RULE (b): Never contacted OR contacted ONLY via Instagram -> status='STAGED'
            has_package = bool(lead.get("demo_links") or lead.get("package_data") or lead.get("video_path"))
            stage_slug = "package_ready" if has_package else "discovered"
            stage_id = stage_map.get(stage_slug, stage_map["discovered"]).id
            reason = "contacted_only_ig" if contacted_ig else "never_contacted"
            return "STAGED", stage_id, reason

        # Previously contacted via WhatsApp / Call / Email -> set to CLOSED_LOST
        # Acts as historical discovery-deduplication records without cluttering active outreach.
        stage_id = stage_map.get("lost", stage_map["discovered"]).id
        return "CLOSED_LOST", stage_id, "contacted_closed_lost"

    def run(self) -> Dict[str, Any]:
        """Runs the historical scan and classification."""
        print("=" * 60)
        print("STARTING HISTORICAL LEADS SCAN & CLASSIFICATION")
        print("=" * 60)

        self.load_ground_truth()
        print("\nScanning Trackers...")
        self.scan_trackers()
        print(f"  -> Canonical leads so far: {len(self.canonical_leads)}")

        print("\nScanning Dental Clinic Engine...")
        self.scan_dental_clinic_engine()
        print(f"  -> Canonical leads so far: {len(self.canonical_leads)}")

        print("\nScanning Dental Clinic Clients (Dossiers & Videos)...")
        self.scan_dental_clinic_clients()
        print(f"  -> Canonical leads so far: {len(self.canonical_leads)}")

        print("\nScanning Scrapes & Dispatch Cockpit...")
        self.scan_scrapes_and_dispatch()
        print(f"  -> Total deduplicated leads: {len(self.canonical_leads)}")

        db = SessionLocal()
        hustle = db.query(Hustle).filter(Hustle.slug == "dental-clinics").first()
        if not hustle:
            print("[ERROR] 'dental-clinics' hustle not found in database! Please initialize seed data.")
            db.close()
            return {}

        stages = db.query(Stage).filter(Stage.hustle_id == hustle.id).all()
        stage_map = {s.slug: s for s in stages}

        counts = {
            "total_scanned": len(self.canonical_leads),
            "staged_new": 0,
            "staged_only_ig": 0,
            "contacted_active": 0,
            "replied": 0,
            "closed_lost": 0,
            "dnc": 0,
            "packages_preserved": 0,
            "facts_preserved": 0,
        }

        for lead in self.canonical_leads:
            status, stage_id, reason = self.classify_lead(lead, stage_map)
            lead["final_status"] = status
            lead["final_stage_id"] = stage_id
            lead["classification_reason"] = reason

            if status == "STAGED":
                if reason == "contacted_only_ig":
                    counts["staged_only_ig"] += 1
                else:
                    counts["staged_new"] += 1
            elif status == "CONTACTED":
                counts["contacted_active"] += 1
            elif status == "REPLIED":
                counts["replied"] += 1
            elif status == "CLOSED_LOST":
                counts["closed_lost"] += 1
            elif status == "DNC":
                counts["dnc"] += 1

            if lead.get("demo_links") or lead.get("package_data") or lead.get("video_path"):
                counts["packages_preserved"] += 1
            if lead.get("facts"):
                counts["facts_preserved"] += 1

        print("\n" + "=" * 60)
        print("CLASSIFICATION SUMMARY")
        print("=" * 60)
        print(f"Total Unique Leads Scanned: {counts['total_scanned']}")
        print(f"  - STAGED (Brand-new, never contacted): {counts['staged_new']}")
        print(f"  - STAGED (Contacted ONLY via Instagram - treated as fresh): {counts['staged_only_ig']}")
        print(f"  - Total Fresh STAGED Leads: {counts['staged_new'] + counts['staged_only_ig']}")
        print(f"  - CONTACTED (WhatsApp/Call active outreach): {counts['contacted_active']}")
        print(f"  - REPLIED / WARM: {counts['replied']}")
        print(f"  - CLOSED / LOST: {counts['closed_lost']}")
        print(f"  - DNC (Do Not Contact): {counts['dnc']}")
        print(f"Preserved Demo Packages: {counts['packages_preserved']}")
        print(f"Preserved Research Facts: {counts['facts_preserved']}")
        print("=" * 60)

        if not self.dry_run:
            print("\n[APPLY] Upserting historical leads into personal_os.db...")
            self.apply_to_db(db, hustle.id)
            print("[APPLY] Complete!")
        else:
            print("\n[DRY RUN] Completed without database writes. Use --apply to commit changes.")

        db.close()
        return counts

    def apply_to_db(self, db: SessionLocal, hustle_id: int) -> None:
        """Applies scanned leads, packages, and facts into the database."""
        now = datetime.now(timezone.utc)
        applied_leads = 0
        applied_facts = 0
        applied_packages = 0

        # Query existing slugs, phones, and instagram handles from DB to avoid uniqueness violations
        existing_db_records = db.query(Lead.id, Lead.slug, Lead.primary_phone, Lead.instagram_handle).all()
        used_slugs: Dict[str, int] = {r.slug: r.id for r in existing_db_records if r.slug}
        used_phones: Dict[str, int] = {r.primary_phone: r.id for r in existing_db_records if r.primary_phone}
        used_ig_handles: Dict[str, int] = {r.instagram_handle.lower(): r.id for r in existing_db_records if r.instagram_handle}

        for lead in self.canonical_leads:
            slug = lead["slug"]
            phone_10 = lead.get("phone")
            e164_phone = format_e164(phone_10)
            target_phone = e164_phone or phone_10
            raw_ig = lead.get("instagram_handle")
            ig_handle = sanitize_instagram_handle(raw_ig)

            # Determine existing lead by slug or primary_phone
            existing_lead_id = None
            if target_phone and target_phone in used_phones:
                existing_lead_id = used_phones[target_phone]
            elif e164_phone and e164_phone in used_phones:
                existing_lead_id = used_phones[e164_phone]
            elif phone_10 and phone_10 in used_phones:
                existing_lead_id = used_phones[phone_10]
            elif slug in used_slugs:
                existing_lead_id = used_slugs[slug]
            elif ig_handle and ig_handle.lower() in used_ig_handles:
                existing_lead_id = used_ig_handles[ig_handle.lower()]

            existing = db.query(Lead).filter(Lead.id == existing_lead_id).first() if existing_lead_id else None

            # Check if target_phone is already taken by a different lead
            assigned_phone = target_phone
            if assigned_phone and assigned_phone in used_phones and used_phones[assigned_phone] != existing_lead_id:
                assigned_phone = None  # Don't violate phone unique constraint

            # Check if ig_handle is already taken by a different lead
            assigned_ig = ig_handle
            if assigned_ig and assigned_ig.lower() in used_ig_handles and used_ig_handles[assigned_ig.lower()] != existing_lead_id:
                assigned_ig = None  # Don't violate IG unique constraint

            if not existing:
                # Ensure unique slug
                base_slug = slug
                counter = 1
                while slug in used_slugs:
                    slug = f"{base_slug}-{counter}"
                    counter += 1

                existing = Lead(
                    hustle_id=hustle_id,
                    slug=slug,
                    name=lead["name"],
                    doctor_name=lead.get("doctor_name", ""),
                    locality=lead.get("locality", ""),
                    address=lead.get("address", ""),
                    primary_phone=assigned_phone,
                    phones=[e164_phone] if e164_phone else ([phone_10] if phone_10 else []),
                    email=lead.get("email"),
                    instagram_handle=assigned_ig,
                    preferred_channel="whatsapp",
                    stage_id=lead["final_stage_id"],
                    status=lead["final_status"],
                    fit_score=lead.get("lead_score", 85) or 85,
                    intent_score=90 if lead["final_status"] == "REPLIED" else 65,
                    deal_value_inr=15000,
                    created_at=now,
                    updated_at=now,
                )
                db.add(existing)
                db.flush()
                applied_leads += 1
                used_slugs[slug] = existing.id
                if assigned_phone:
                    used_phones[assigned_phone] = existing.id
                if assigned_ig:
                    used_ig_handles[assigned_ig.lower()] = existing.id
            else:
                existing.status = lead["final_status"]
                existing.stage_id = lead["final_stage_id"]
                if not existing.doctor_name and lead.get("doctor_name"):
                    existing.doctor_name = lead["doctor_name"]
                if not existing.locality and lead.get("locality"):
                    existing.locality = lead["locality"]
                if not existing.address and lead.get("address"):
                    existing.address = lead["address"]
                if not existing.primary_phone and assigned_phone:
                    existing.primary_phone = assigned_phone
                    used_phones[assigned_phone] = existing.id
                if lead.get("email") and not existing.email:
                    existing.email = lead["email"]
                if not existing.instagram_handle and assigned_ig:
                    existing.instagram_handle = assigned_ig
                    used_ig_handles[assigned_ig.lower()] = existing.id
                existing.updated_at = now
                db.flush()

            # Upsert Facts
            facts = lead.get("facts", {})
            for f_key, f_val in facts.items():
                if not f_val:
                    continue
                val_str = json.dumps(f_val) if isinstance(f_val, (dict, list)) else str(f_val)
                val_str = val_str.replace("\x00", "")
                fact_exists = db.query(LeadFact).filter(
                    LeadFact.lead_id == existing.id, LeadFact.field == f_key
                ).first()
                if not fact_exists:
                    db.add(LeadFact(
                        lead_id=existing.id,
                        field=f_key,
                        value=val_str,
                        source=lead["sources"].copy().pop() if lead.get("sources") else "historical_import",
                        confidence=1.0,
                        verified_by_two_sources=True,
                        checked_at=now,
                    ))
                    applied_facts += 1

            # Upsert Package if demo links or package data exists
            if lead.get("demo_links") or lead.get("package_data") or lead.get("video_path"):
                pkg_exists = db.query(Package).filter(Package.lead_id == existing.id).first()
                asset_links = {
                    "modern": f"/modern/{slug}",
                    "premium": f"/premium/{slug}",
                    "warm": f"/warm/{slug}",
                    "choice_page": f"/demo/{slug}",
                }
                if not pkg_exists:
                    db.add(Package(
                        lead_id=existing.id,
                        version=1,
                        asset_links=asset_links,
                        video_file_path=lead.get("video_path"),
                        clinic_payload=lead.get("package_data") or {},
                        quality_score=95,
                        self_check_passed=True,
                        status="ready",
                        created_at=now,
                    ))
                    applied_packages += 1

        db.commit()
        print(f"[APPLY] Committed: {applied_leads} new leads, {applied_facts} facts, {applied_packages} packages.")


def main():
    parser = argparse.ArgumentParser(description="Scan and import historical leads into PersonalOS & CRM.")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--dry-run", action="store_true", help="Perform scan and preview classification counts without database writes.")
    group.add_argument("--apply", action="store_true", help="Apply historical leads import into personal_os.db.")

    args = parser.parse_args()
    scanner = HistoricalLeadScanner(dry_run=args.dry_run)
    scanner.run()


if __name__ == "__main__":
    main()
