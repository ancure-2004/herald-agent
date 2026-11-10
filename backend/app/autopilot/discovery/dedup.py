import logging
import re
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Set, Tuple

from sqlalchemy.orm import Session

from app.autopilot.search.cache import DbCache
from app.autopilot.types import Candidate
from app.autopilot.utils.phone import extract_last_10_digits
from app.autopilot.utils.text import clean_clinic_name
from app.models.entities import Lead

logger = logging.getLogger("personal_os.autopilot.discovery.dedup")

GENERIC_STOPWORD_NAMES: Set[str] = {
    "dentalclinic",
    "dentist",
    "dental",
    "clinic",
    "dentalcare",
    "dentalcentre",
    "dentalhospital",
    "smiledental",
    "dentalhub",
    "dentalstudio",
    "theclinic",
    "thedentist",
}


class RejectionCache:
    """
    Persistent rejection cache backed by DbCache.
    Registers dropped candidate identifiers (place_id, normalized name, phone, domain)
    so subsequent locality queries or future runs skip them instantly.
    """

    PROVIDER = "discovery_rejection"
    TTL_HOURS = 720  # 30 days

    @classmethod
    def record_rejection(
        cls,
        db: Optional[Session],
        reason: str,
        place_id: Optional[str] = None,
        norm_name: Optional[str] = None,
        phone_10d: Optional[str] = None,
        domain: Optional[str] = None,
        detail: Optional[str] = None,
    ) -> None:
        if not db:
            return
        payload = {
            "reason": reason,
            "detail": detail or "",
            "place_id": place_id or "",
            "norm_name": norm_name or "",
            "phone_10d": phone_10d or "",
            "domain": domain or "",
            "rejected_at": datetime.now(timezone.utc).isoformat(),
        }

        # Store keyed under each present identifier
        for key_type, key_val in [
            ("place_id", place_id),
            ("name", norm_name),
            ("phone", phone_10d),
            ("domain", domain),
        ]:
            if key_val and str(key_val).strip():
                clean_val = str(key_val).strip().lower()
                # Stopword guard: never cache generic or short clinic names
                if key_type == "name" and (clean_val in GENERIC_STOPWORD_NAMES or len(clean_val) < 6):
                    continue
                cache_key = DbCache.make_key(cls.PROVIDER, {"type": key_type, "val": clean_val})
                DbCache.set(db, cache_key, payload, provider=cls.PROVIDER, ttl_hours=cls.TTL_HOURS)

    @classmethod
    def check_rejected(
        cls,
        db: Optional[Session],
        place_id: Optional[str] = None,
        norm_name: Optional[str] = None,
        phone_10d: Optional[str] = None,
        domain: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        if not db:
            return None
        for key_type, key_val in [
            ("place_id", place_id),
            ("name", norm_name),
            ("phone", phone_10d),
            ("domain", domain),
        ]:
            if key_val and str(key_val).strip():
                clean_val = str(key_val).strip().lower()
                # Stopword guard: never match generic or short clinic names
                if key_type == "name" and (clean_val in GENERIC_STOPWORD_NAMES or len(clean_val) < 6):
                    continue
                cache_key = DbCache.make_key(cls.PROVIDER, {"type": key_type, "val": clean_val})
                cached = DbCache.get(db, cache_key)
                if cached and isinstance(cached, dict):
                    return cached
        return None


class DiscoveryDeduplicator:
    """
    Triply-redundant in-memory and database deduplicator with integrated rejection caching.
    Deduplicates across:
      1. Google CID / Place ID
      2. Normalized clean business name (alphanumeric lowercase)
      3. 10-digit mobile number
    Maintains in-memory seen and rejected sets across all locality queries in a run.
    """

    def __init__(self, db: Optional[Session] = None, ignore_test_leads: bool = True):
        self.db = db
        self.ignore_test_leads = ignore_test_leads

        # DB-backed seen identities
        self.db_place_ids: Set[str] = set()
        self.db_names: Set[str] = set()
        self.db_phones: Set[str] = set()
        self.db_slugs: Set[str] = set()

        if self.db:
            self._load_db_identities()

        # In-memory seen sets across all localities in the current run
        self.session_place_ids: Set[str] = set()
        self.session_names: Set[str] = set()
        self.session_phones: Set[str] = set()

        # In-memory rejection cache across all localities in the current run
        self.session_rejected: Set[str] = set()

    def _load_db_identities(self) -> None:
        if not self.db:
            return

        # Always load all primary_phone and phones across ALL leads (including test leads)
        # to prevent UniqueViolation on ix_leads_primary_phone regardless of ignore_test_leads setting.
        all_phone_leads = self.db.query(Lead.primary_phone, Lead.phones).all()
        for p_phone, p_phones in all_phone_leads:
            if p_phone:
                p10 = extract_last_10_digits(p_phone)
                if p10:
                    self.db_phones.add(p10)
            for p in p_phones or []:
                p10 = extract_last_10_digits(str(p))
                if p10:
                    self.db_phones.add(p10)

        q = self.db.query(Lead)
        if self.ignore_test_leads and hasattr(Lead, "is_test"):
            q = q.filter((Lead.is_test == False) | (Lead.is_test == None))  # noqa: E711, E712

        existing_leads = q.all()
        for l in existing_leads:
            if l.slug:
                self.db_slugs.add(l.slug.strip().lower())
            if l.primary_phone:
                p10 = extract_last_10_digits(l.primary_phone)
                if p10:
                    self.db_phones.add(p10)
            for p in l.phones or []:
                p10 = extract_last_10_digits(str(p))
                if p10:
                    self.db_phones.add(p10)
            if l.name:
                clean = clean_clinic_name(l.name)
                full_clean = re.sub(r"[^a-z0-9]", "", clean.lower())
                short_clean = re.sub(r"[^a-z0-9]", "", re.split(r"[-|:]", l.name)[0].lower())
                if full_clean and full_clean not in GENERIC_STOPWORD_NAMES and len(full_clean) >= 6:
                    self.db_names.add(full_clean)
                if short_clean and short_clean not in GENERIC_STOPWORD_NAMES and len(short_clean) >= 6:
                    self.db_names.add(short_clean)
            if l.custom_fields and isinstance(l.custom_fields, dict):
                pid = l.custom_fields.get("place_id") or l.custom_fields.get("google_cid")
                if pid:
                    self.db_place_ids.add(str(pid).strip())

    @staticmethod
    def normalize_name(raw_name: str) -> Tuple[str, str]:
        clean = clean_clinic_name(raw_name)
        full_clean = re.sub(r"[^a-z0-9]", "", clean.lower())
        short_clean = re.sub(r"[^a-z0-9]", "", re.split(r"[-|:]", raw_name)[0].lower())
        return full_clean, short_clean

    def check_duplicate(self, candidate: Candidate, norm_phone: Optional[str] = None) -> Tuple[bool, Optional[str]]:
        """
        Triply-redundant deduplication check against DB and session memory.
        Returns (is_duplicate, duplicate_reason).
        """
        # 1. Place ID / CID check
        pid = (candidate.place_id or "").strip()
        if pid and (pid in self.db_place_ids or pid in self.session_place_ids):
            return True, f"Place ID '{pid}' already exists in CRM or staged this run"

        # 2. Normalized clean business name check
        full_clean, short_clean = self.normalize_name(candidate.name)
        if full_clean and full_clean not in GENERIC_STOPWORD_NAMES and len(full_clean) >= 6:
            if full_clean in self.db_names or full_clean in self.session_names:
                return True, f"Clinic name '{candidate.name}' already exists in CRM or staged this run"
        if short_clean and short_clean not in GENERIC_STOPWORD_NAMES and len(short_clean) >= 6:
            if short_clean in self.db_names or short_clean in self.session_names:
                return True, f"Clinic prefix '{short_clean}' already exists in CRM or staged this run"

        # 3. 10-digit phone check
        phone_val = norm_phone or candidate.phone
        ten_digit = extract_last_10_digits(phone_val)
        if ten_digit and (ten_digit in self.db_phones or ten_digit in self.session_phones):
            return True, f"Phone number '{ten_digit}' already exists in CRM or staged this run"

        return False, None

    def check_rejection_cache(
        self, candidate: Candidate, domain: Optional[str] = None
    ) -> Tuple[bool, Optional[Dict[str, Any]]]:
        """
        Checks if candidate has been rejected in this session or in the persistent rejection cache.
        Returns (is_rejected, rejection_dict).
        """
        pid = (candidate.place_id or "").strip()
        full_clean, _ = self.normalize_name(candidate.name)
        ten_digit = extract_last_10_digits(candidate.phone)
        dom = (domain or "").strip().lower()

        # Fast in-memory session check
        if pid and f"place_id:{pid}" in self.session_rejected:
            return True, {"reason": "cached_session_rejection", "detail": f"Place ID {pid} rejected earlier"}
        if full_clean and full_clean not in GENERIC_STOPWORD_NAMES and len(full_clean) >= 6:
            if f"name:{full_clean}" in self.session_rejected:
                return True, {
                    "reason": "cached_session_rejection",
                    "detail": f"Clinic name '{full_clean}' rejected earlier",
                }
        if ten_digit and f"phone:{ten_digit}" in self.session_rejected:
            return True, {"reason": "cached_session_rejection", "detail": f"Phone {ten_digit} rejected earlier"}
        if dom and f"domain:{dom}" in self.session_rejected:
            return True, {"reason": "cached_session_rejection", "detail": f"Domain {dom} rejected earlier"}

        # Persistent DbCache check
        cached = RejectionCache.check_rejected(
            db=self.db,
            place_id=pid if pid else None,
            norm_name=full_clean if (full_clean and full_clean not in GENERIC_STOPWORD_NAMES and len(full_clean) >= 6) else None,
            phone_10d=ten_digit if ten_digit else None,
            domain=dom if dom else None,
        )
        if cached:
            # Populate in-memory session set so next lookup is instant
            if pid:
                self.session_rejected.add(f"place_id:{pid}")
            if full_clean and full_clean not in GENERIC_STOPWORD_NAMES and len(full_clean) >= 6:
                self.session_rejected.add(f"name:{full_clean}")
            if ten_digit:
                self.session_rejected.add(f"phone:{ten_digit}")
            if dom:
                self.session_rejected.add(f"domain:{dom}")
            return True, cached

        return False, None

    def record_rejection(
        self,
        candidate: Candidate,
        reason: str,
        detail: str = "",
        domain: Optional[str] = None,
    ) -> None:
        """Records a candidate rejection into both in-memory session and persistent DbCache."""
        pid = (candidate.place_id or "").strip()
        full_clean, _ = self.normalize_name(candidate.name)
        ten_digit = extract_last_10_digits(candidate.phone)
        dom = (domain or "").strip().lower()

        # Add to in-memory session
        if pid:
            self.session_rejected.add(f"place_id:{pid}")
        if full_clean and full_clean not in GENERIC_STOPWORD_NAMES and len(full_clean) >= 6:
            self.session_rejected.add(f"name:{full_clean}")
        if ten_digit:
            self.session_rejected.add(f"phone:{ten_digit}")
        if dom:
            self.session_rejected.add(f"domain:{dom}")

        # Add to persistent DbCache
        RejectionCache.record_rejection(
            db=self.db,
            reason=reason,
            place_id=pid if pid else None,
            norm_name=full_clean if (full_clean and full_clean not in GENERIC_STOPWORD_NAMES and len(full_clean) >= 6) else None,
            phone_10d=ten_digit if ten_digit else None,
            domain=dom if dom else None,
            detail=detail,
        )

    def record_accepted(self, candidate: Candidate, norm_phone: str) -> None:
        """Registers an accepted staged candidate into both session and db seen sets."""
        pid = (candidate.place_id or "").strip()
        full_clean, short_clean = self.normalize_name(candidate.name)
        ten_digit = extract_last_10_digits(norm_phone)

        if pid:
            self.session_place_ids.add(pid)
            self.db_place_ids.add(pid)
        if full_clean and full_clean not in GENERIC_STOPWORD_NAMES and len(full_clean) >= 6:
            self.session_names.add(full_clean)
            self.db_names.add(full_clean)
        if short_clean and short_clean not in GENERIC_STOPWORD_NAMES and len(short_clean) >= 6:
            self.session_names.add(short_clean)
            self.db_names.add(short_clean)
        if ten_digit:
            self.session_phones.add(ten_digit)
            self.db_phones.add(ten_digit)
