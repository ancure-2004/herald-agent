import logging
from typing import Any, Dict, Iterator, List, Optional, Set

from sqlalchemy.orm import Session

from app.autopilot.discovery.base import DiscoveryProvider
from app.autopilot.discovery.dedup import GENERIC_STOPWORD_NAMES, DiscoveryDeduplicator
from app.autopilot.discovery.google_places import GooglePlacesProvider
from app.autopilot.discovery.local_pool import LocalPoolProvider
from app.autopilot.discovery.localities import Locality
from app.autopilot.discovery.overpass import OverpassProvider
from app.autopilot.log_tags import TAG_SCRAPE
from app.autopilot.settings import get_autopilot_settings
from app.autopilot.types import Candidate
from app.autopilot.utils.hosts import is_allowed_discovery_website
from app.autopilot.utils.phone import check_phone_is_valid_indian_mobile
from app.autopilot.verification.filters import is_hospital_or_chain

logger = logging.getLogger("personal_os.autopilot.waterfall")


class CandidateStream:
    """
    Lazy stream of Candidate items across ordered discovery providers.
    Queries the next provider only when the current provider is exhausted.
    Applies:
      1. Triply-redundant deduplication (CID/Place ID, clean name, 10-digit mobile)
      2. Rejection cache lookups (skip previously dropped candidates instantly)
      3. Fast website filter (allow empty or social/aggregator/linktree; reject custom domains)
      4. 100% WhatsApp phone validation (strictly requires Indian 10-digit mobile starting with 6,7,8,9)
      5. Hospital/chain filter
    """

    def __init__(
        self,
        query: str,
        locality: Locality,
        providers: Optional[List[DiscoveryProvider]] = None,
        target_count: int = 10,
        db: Optional[Session] = None,
        testing_mode: bool = False,
        emit_cb: Optional[Any] = None,
        deduplicator: Optional[DiscoveryDeduplicator] = None,
    ):
        self.query = query
        self.locality = locality
        self.target_count = target_count
        self.db = db
        self.testing_mode = testing_mode
        self.emit_cb = emit_cb

        if deduplicator is not None:
            self.deduplicator = deduplicator
        else:
            self.deduplicator = DiscoveryDeduplicator(db=db, ignore_test_leads=not testing_mode)

        if providers is not None:
            self.providers = providers
        else:
            self.providers = self._init_default_providers()

        self.providers_used: List[str] = []
        self.drop_counts: Dict[str, int] = {
            "has_official_domain": 0,
            "no_mobile_whatsapp": 0,
            "already_in_db": 0,
            "hospital_or_chain": 0,
            "cached_rejection": 0,
        }

    # Backward compatibility properties for seen sets
    @property
    def seen_phones(self) -> Set[str]:
        return self.deduplicator.session_phones

    @property
    def seen_names(self) -> Set[str]:
        return self.deduplicator.session_names

    def _init_default_providers(self) -> List[DiscoveryProvider]:
        settings = get_autopilot_settings()
        order = settings.discovery_providers
        prov_map: Dict[str, DiscoveryProvider] = {
            "google": GooglePlacesProvider(),
            "overpass": OverpassProvider(),
            "local_pool": LocalPoolProvider(),
        }
        res: List[DiscoveryProvider] = []
        for name in order:
            clean_name = name.strip().lower()
            if clean_name in prov_map:
                res.append(prov_map[clean_name])
        return res

    def __iter__(self) -> Iterator[Candidate]:
        settings = get_autopilot_settings()
        yielded_count = 0

        for provider in self.providers:
            # If target count already satisfied or previous provider already yielded candidates, do not query subsequent providers
            if yielded_count >= self.target_count:
                break
            if yielded_count > 0:
                msg = (
                    f"[{TAG_SCRAPE}] Provider already yielded {yielded_count} candidates "
                    f"(target={self.target_count}). Skipping subsequent fallback providers."
                )
                logger.info(msg)
                if self.emit_cb:
                    self.emit_cb(msg)
                break

            # Skip local_pool in testing mode
            if self.testing_mode and provider.name == "local_pool":
                if self.emit_cb:
                    self.emit_cb(f"[{TAG_SCRAPE}] Skipped local_pool (Testing Mode: live-only)")
                continue

            msg = f"[{TAG_SCRAPE}] Querying provider '{provider.name}' for '{self.locality.label}'..."
            logger.info(msg)
            if self.emit_cb:
                self.emit_cb(msg)

            if provider.name not in self.providers_used:
                self.providers_used.append(provider.name)

            try:
                candidates = provider.search_candidates(
                    query=self.query,
                    locality=self.locality,
                    target_count=self.target_count,
                    db=self.db,
                    testing_mode=self.testing_mode,
                )
                if self.emit_cb:
                    self.emit_cb(f"[{TAG_SCRAPE}] Provider '{provider.name}' yielded {len(candidates)} raw candidates.")
            except Exception as e:
                logger.warning("Provider '%s' failed: %s", provider.name, e)
                if self.emit_cb:
                    self.emit_cb(f"[{TAG_SCRAPE}] Provider '{provider.name}' encountered error: {e}")
                continue

            for cand in candidates:
                # 1. Hospital / Chain filter
                is_chain, chain_reason = is_hospital_or_chain(cand.name)
                if is_chain:
                    self.drop_counts["hospital_or_chain"] += 1
                    self.deduplicator.record_rejection(cand, reason="hospital_or_chain", detail=chain_reason)
                    continue

                # 2. Rejection Cache Check (fast skip across overlapping locality queries)
                is_rej, rej_info = self.deduplicator.check_rejection_cache(cand)
                if is_rej:
                    self.drop_counts["cached_rejection"] += 1
                    continue

                # 3. Triply-Redundant Deduplication Check (Place ID, Name, Phone)
                is_dup, dup_reason = self.deduplicator.check_duplicate(cand)
                if is_dup:
                    self.drop_counts["already_in_db"] += 1
                    continue

                # 4. Fast Website Filter
                if cand.website:
                    is_allowed, host = is_allowed_discovery_website(cand.website)
                    if not is_allowed:
                        self.drop_counts["has_official_domain"] += 1
                        self.deduplicator.record_rejection(
                            cand,
                            reason="has_official_domain",
                            detail=f"Active site: {host}",
                            domain=host,
                        )
                        continue

                # 5. Fetch Place Details if Google Places survivor lacks phone
                if not cand.phone and cand.place_id and settings.google_places_api_key:
                    from app.autopilot.discovery.google_places import google_place_details

                    details = google_place_details(cand.place_id, settings.google_places_api_key, db=self.db)
                    phone_val = details.get("nationalPhoneNumber") or details.get("internationalPhoneNumber")
                    if phone_val:
                        cand.phone = phone_val
                    if details.get("regularOpeningHours") and not cand.opening_hours:
                        cand.opening_hours = details["regularOpeningHours"]
                    if details.get("websiteUri") and not cand.website:
                        cand.website = details["websiteUri"]
                        is_allowed, host = is_allowed_discovery_website(cand.website)
                        if not is_allowed:
                            self.drop_counts["has_official_domain"] += 1
                            self.deduplicator.record_rejection(
                                cand,
                                reason="has_official_domain",
                                detail=f"Active site: {host}",
                                domain=host,
                            )
                            continue

                # 6. 100% WhatsApp Phone Validation (Indian mobile starting with 6, 7, 8, or 9)
                is_valid_phone, norm_phone, ten_digit = check_phone_is_valid_indian_mobile(cand.phone)
                if not is_valid_phone or not norm_phone:
                    self.drop_counts["no_mobile_whatsapp"] += 1
                    self.deduplicator.record_rejection(
                        cand,
                        reason="no_mobile_whatsapp",
                        detail=f"Invalid/landline phone: {cand.phone or 'none'}",
                    )
                    continue

                cand.phone = norm_phone

                # 7. Check if normalized phone is already seen/in DB
                if ten_digit in self.deduplicator.db_phones or ten_digit in self.deduplicator.session_phones:
                    self.drop_counts["already_in_db"] += 1
                    continue

                # 8. Register into session seen sets
                full_clean, short_clean = self.deduplicator.normalize_name(cand.name)
                pid = (cand.place_id or "").strip()
                if pid:
                    self.deduplicator.session_place_ids.add(pid)
                if full_clean and full_clean not in GENERIC_STOPWORD_NAMES and len(full_clean) >= 6:
                    self.deduplicator.session_names.add(full_clean)
                if len(short_clean) >= 6 and short_clean not in GENERIC_STOPWORD_NAMES:
                    self.deduplicator.session_names.add(short_clean)
                self.deduplicator.session_phones.add(ten_digit)

                yield cand
                yielded_count += 1
                if yielded_count >= self.target_count:
                    break
