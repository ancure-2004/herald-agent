import logging
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Dict, List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.autopilot.discovery.dedup import DiscoveryDeduplicator
from app.autopilot.discovery.google_places import GooglePlacesProvider
from app.autopilot.discovery.local_pool import LocalPoolProvider
from app.autopilot.discovery.localities import LOCALITY_PRESETS, resolve_locality
from app.autopilot.discovery.waterfall import CandidateStream
from app.autopilot.quota import QuotaGuard
from app.autopilot.runs.context import CancelToken
from app.autopilot.runs.job_manager import JobManager
from app.autopilot.search.cache import DbCache
from app.autopilot.utils.text import clean_clinic_name, generate_clean_slug
from app.core.exceptions import NotFoundError
from app.db.schema_migrations import ensure_schema_columns
from app.models.entities import Lead, LeadFact, RunLog, Stage
from app.repositories.hustle_repo import HustleRepository
from app.safety import compute_fit_score
from app.services.event_bus import broadcast_sse, emit_pipeline_step, set_autopilot_running

logger = logging.getLogger("personal_os.autopilot.discovery.service")

STAGING_BUFFER_CEILING = 210


def ensure_lead_schema(db: Session) -> None:
    try:
        ensure_schema_columns(db.get_bind())
    except Exception as e:
        logger.debug("ensure_lead_schema migration notice: %s", e)


class DiscoveryService:
    """
    Dedicated Discovery & Staging Service (Operation A).
    Lightweight, high-throughput intake streaming clean 100% WhatsApp-only leads into the DB
    with status 'STAGED' bounded by the 210-lead staging buffer ceiling.
    """

    @classmethod
    def get_staged_count(cls, db: Session, hustle_id: int = 1, testing_mode: bool = False) -> int:
        """Returns the current count of unarchived leads in STAGED status."""
        q = db.query(func.count(Lead.id)).filter(
            Lead.hustle_id == hustle_id,
            Lead.status == "STAGED",
            Lead.is_archived == False,  # noqa: E712
        )
        if not testing_mode and hasattr(Lead, "is_test"):
            q = q.filter((Lead.is_test == False) | (Lead.is_test == None))  # noqa: E711, E712
        return q.scalar() or 0

    @classmethod
    def run_discovery_and_staging(
        cls,
        db: Session,
        hustle_id: int = 1,
        target_count: int = 30,
        locality: Optional[str] = None,
        testing_mode: bool = False,
        log_cb: Optional[Callable[[str], None]] = None,
        existing_run_log_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Executes standalone lead discovery and stages accepted candidates into the database.
        Enforces the 210-lead staging buffer ceiling and triply-redundant deduplication.
        """
        hustle = HustleRepository.get_by_id(db, hustle_id)
        if not hustle:
            raise NotFoundError(f"Hustle #{hustle_id} not found")

        # Removed runtime ensure_lead_schema to prevent AccessExclusiveLock contention
        DbCache.ensure_schema(db)
        QuotaGuard.ensure_schema(db)

        # 1. Enforce Staging Buffer Ceiling & Testing Mode Cap
        if testing_mode:
            target_count = min(target_count, 2)

        current_staged = cls.get_staged_count(db, hustle_id=hustle.id, testing_mode=testing_mode)
        if current_staged >= STAGING_BUFFER_CEILING:
            msg = (
                f"Staging buffer is full ({current_staged}/{STAGING_BUFFER_CEILING} leads). "
                f"Manufacture demos from the staged pool before discovering more leads."
            )
            if log_cb:
                log_cb(f"[STAGING-CAP] {msg}")
            if existing_run_log_id:
                try:
                    rl = db.query(RunLog).filter(RunLog.id == existing_run_log_id).first()
                    if rl:
                        rl.status = "completed"
                        rl.finished_at = datetime.now(timezone.utc)
                        db.commit()
                except Exception:
                    pass
                set_autopilot_running(False, run_id=existing_run_log_id)
                JobManager.release_single_flight(existing_run_log_id)
            return {
                "status": "full",
                "message": msg,
                "newly_staged_count": 0,
                "total_staged_count": current_staged,
                "staging_ceiling": STAGING_BUFFER_CEILING,
                "found_count": 0,
                "dropped_counts": {},
                "staged_leads": [],
                "run_id": existing_run_log_id,
            }

        remaining_capacity = STAGING_BUFFER_CEILING - current_staged
        if testing_mode:
            effective_target = min(2, remaining_capacity)
        else:
            effective_target = min(target_count, remaining_capacity)
        if effective_target < target_count:
            if log_cb:
                log_cb(
                    f"[STAGING-CAP] Clamping target from {target_count} to {effective_target} "
                    f"to respect the {STAGING_BUFFER_CEILING}-lead buffer ceiling (current: {current_staged})."
                )

        # 2. Acquire single-flight lock or use existing synchronously acquired run_log
        if existing_run_log_id:
            run_log = db.query(RunLog).filter(RunLog.id == existing_run_log_id).first()
            if not run_log:
                run_log = RunLog(
                    id=existing_run_log_id,
                    hustle_id=hustle.id,
                    job_type="autopilot_discovery_and_staging",
                    status="running",
                    started_at=datetime.now(timezone.utc),
                )
                db.add(run_log)
                db.commit()
                db.refresh(run_log)
            cancel_token = getattr(JobManager, "_ACTIVE_CANCEL_TOKEN", None) or (JobManager.get_active_cancel_token() if hasattr(JobManager, "get_active_cancel_token") else None) or CancelToken()
        else:
            run_log = RunLog(
                hustle_id=hustle.id,
                job_type="autopilot_discovery_and_staging",
                status="running",
                count_found=0,
                count_passed=0,
                count_dropped=0,
                drop_reasons={},
                errors=[],
                trace_logs=[],
                started_at=datetime.now(timezone.utc),
            )
            db.add(run_log)
            db.commit()
            db.refresh(run_log)

            cancel_token = JobManager.acquire_single_flight(run_log.id)
            set_autopilot_running(True, run_id=run_log.id)

        trace_logs: List[str] = []

        def emit(text: str) -> None:
            trace_logs.append(text)
            if log_cb:
                log_cb(text)

        emit(
            f"[DISCOVERY] Started standalone discovery run #{run_log.id} "
            f"(target={effective_target}, current_staged={current_staged}, cap={STAGING_BUFFER_CEILING})..."
        )

        emit_pipeline_step(
            node_id="node-1",
            step_name="DISCOVERY",
            status="RUNNING",
            clinic_name="Discovering & Staging WhatsApp Leads",
            metrics={
                "processed": current_staged,
                "total": effective_target,
                "badge_text": f"Staging (Target: {effective_target})",
            },
            payload=[],
        )

        # 3. Find target stage for STAGED leads (slug 'discovered' or stage 1)
        discovered_stage = db.query(Stage).filter(Stage.hustle_id == hustle.id, Stage.slug == "discovered").first()
        stage_id = discovered_stage.id if discovered_stage else 1

        # 4. Initialize shared Triply-Redundant Deduplicator
        deduplicator = DiscoveryDeduplicator(db=db, ignore_test_leads=not testing_mode)

        newly_staged: List[Lead] = []
        staged_summaries: List[Dict[str, Any]] = []
        total_found = 0
        drop_totals: Dict[str, int] = {
            "has_official_domain": 0,
            "no_mobile_whatsapp": 0,
            "already_in_db": 0,
            "hospital_or_chain": 0,
            "cached_rejection": 0,
        }

        try:
            loc_obj = resolve_locality(locality)
            max_presets = len(LOCALITY_PRESETS) if not locality else 1
            locality_specified = bool(locality)

            LocalPoolProvider.reset_pool_status()
            GooglePlacesProvider.reset_quota_status()

            for attempt in range(max_presets):
                if cancel_token.is_cancelled or len(newly_staged) >= effective_target or (testing_mode and len(newly_staged) >= 2):
                    break
                if (current_staged + len(newly_staged)) >= STAGING_BUFFER_CEILING:
                    emit(f"[STAGING-CAP] Reached absolute ceiling of {STAGING_BUFFER_CEILING} staged leads.")
                    break

                if attempt > 0:
                    time.sleep(1.2)
                    loc_obj = resolve_locality(None)
                    emit(
                        f"[WATERFALL] Staged {len(newly_staged)}/{effective_target}. "
                        f"Advancing discovery to next preset: '{loc_obj.label}'..."
                    )

                query = f"dental clinic in {loc_obj.label}, Delhi NCR, India"
                stream = CandidateStream(
                    query=query,
                    locality=loc_obj,
                    target_count=effective_target - len(newly_staged),
                    db=db,
                    testing_mode=testing_mode,
                    emit_cb=emit,
                    deduplicator=deduplicator,
                    locality_specified=locality_specified,
                )

                for cand in stream:
                    if cancel_token.is_cancelled or len(newly_staged) >= effective_target or (testing_mode and len(newly_staged) >= 2):
                        break
                    if (current_staged + len(newly_staged)) >= STAGING_BUFFER_CEILING:
                        emit(f"[STAGING-CAP] Reached absolute ceiling of {STAGING_BUFFER_CEILING} staged leads.")
                        break

                    total_found += 1
                    clean_name = clean_clinic_name(cand.name)
                    slug_base = generate_clean_slug(clean_name)

                    # Ensure unique slug in DB
                    slug = slug_base
                    suffix = 2
                    while db.query(Lead).filter(Lead.slug == slug).first() is not None:
                        slug = f"{slug_base}-{suffix}"
                        suffix += 1

                    now = datetime.now(timezone.utc)
                    fit_score, fit_reasons = compute_fit_score(
                        facts=[],
                        has_doctor_name=False,
                        has_phone=bool(cand.phone),
                        has_ig=False,
                        ai_fields={"channel": "whatsapp"},
                    )

                    staged_lead = Lead(
                        hustle_id=hustle.id,
                        stage_id=stage_id,
                        status="STAGED",
                        slug=slug,
                        name=clean_name,
                        doctor_name="",  # Phase 2 will enrich deep doctor research
                        locality=cand.locality or loc_obj.label,
                        city=loc_obj.city,
                        address=cand.address or f"{cand.locality or loc_obj.label}, {loc_obj.city}",
                        primary_phone=cand.phone,
                        phones=[cand.phone] if cand.phone else [],
                        preferred_channel="whatsapp",
                        next_action="Awaiting demo factory build",
                        next_action_due_at=now + timedelta(days=7),
                        fit_score=fit_score,
                        fit_reasons=fit_reasons,
                        custom_fields={
                            "place_id": cand.place_id,
                            "maps_url": cand.maps_url,
                            "raw_maps_title": cand.name,
                            "discovery_source_tier": cand.source_tier,
                            "discovery_website": cand.website,
                            "rating": cand.rating,
                            "review_count": cand.review_count,
                            "staged_at": now.isoformat(),
                        },
                        ai_fields={
                            "discovery_tier": cand.source_tier,
                            "channel": "whatsapp",
                        },
                        what_changed_summary=f"Discovered via {cand.source_tier} and staged for demo build.",
                        deal_value_inr=15000,
                        is_test=testing_mode,
                        test_run_id=str(run_log.id),
                    )
                    db.add(staged_lead)
                    db.flush()

                    # Add verification & metadata LeadFacts
                    if cand.rating is not None:
                        db.add(
                            LeadFact(
                                lead_id=staged_lead.id,
                                field="google_rating",
                                value=f"{cand.rating}★",
                                source=cand.source_tier,
                                confidence=1.0,
                            )
                        )
                    if cand.review_count is not None:
                        db.add(
                            LeadFact(
                                lead_id=staged_lead.id,
                                field="review_count",
                                value=f"{cand.review_count} reviews",
                                source=cand.source_tier,
                                confidence=1.0,
                            )
                        )
                    db.add(
                        LeadFact(
                            lead_id=staged_lead.id,
                            field="phone_verification",
                            value=f"Verified 100% WhatsApp Mobile: {cand.phone}",
                            source="Discovery Phone Validator",
                            confidence=1.0,
                        )
                    )

                    deduplicator.record_accepted(cand, cand.phone)
                    newly_staged.append(staged_lead)
                    db.commit()
                    staged_summaries.append(
                        {
                            "id": staged_lead.id,
                            "slug": staged_lead.slug,
                            "name": staged_lead.name,
                            "phone": staged_lead.primary_phone,
                            "locality": staged_lead.locality,
                            "city": staged_lead.city,
                            "status": staged_lead.status,
                            "source_tier": cand.source_tier,
                            "fit_score": staged_lead.fit_score,
                        }
                    )
                    emit(f"[STAGE] ✓ Staged #{len(newly_staged)}: '{clean_name}' ({cand.phone})")

                # Accumulate drop counts
                for k, v in stream.drop_counts.items():
                    drop_totals[k] = drop_totals.get(k, 0) + v

            db.commit()

            status_str = "cancelled" if cancel_token.is_cancelled else "succeeded"
            run_log.status = status_str
            run_log.count_found = total_found
            run_log.count_passed = len(newly_staged)
            run_log.count_dropped = sum(drop_totals.values())
            run_log.drop_reasons = {
                **drop_totals,
                "_structured": {
                    "staged_leads": staged_summaries,
                    "target_count": effective_target,
                    "newly_staged_count": len(newly_staged),
                    "total_staged_count": current_staged + len(newly_staged),
                    "staging_ceiling": STAGING_BUFFER_CEILING,
                },
            }
            run_log.trace_logs = trace_logs
            run_log.finished_at = datetime.now(timezone.utc)
            db.commit()

            final_total_staged = cls.get_staged_count(db, hustle_id=hustle.id, testing_mode=testing_mode)
            emit(
                f"[DISCOVERY] Run #{run_log.id} finished: {len(newly_staged)} newly staged. "
                f"Total Staged Pool: {final_total_staged}/{STAGING_BUFFER_CEILING} leads."
            )

            emit_pipeline_step(
                node_id="node-1",
                step_name="DISCOVERY",
                status="SUCCESS",
                clinic_name=f"Staged {len(newly_staged)} WhatsApp Leads",
                metrics={
                    "processed": len(newly_staged),
                    "total": final_total_staged,
                    "badge_text": f"✓ {final_total_staged}/{STAGING_BUFFER_CEILING} Staged",
                },
                payload=staged_summaries[:15],
            )

            broadcast_sse(
                "autopilot_discovery_completed",
                {
                    "run_id": run_log.id,
                    "newly_staged_count": len(newly_staged),
                    "total_staged_count": final_total_staged,
                    "staging_ceiling": STAGING_BUFFER_CEILING,
                },
            )

            return {
                "status": status_str,
                "run_id": run_log.id,
                "newly_staged_count": len(newly_staged),
                "total_staged_count": final_total_staged,
                "staging_ceiling": STAGING_BUFFER_CEILING,
                "found_count": total_found,
                "dropped_counts": drop_totals,
                "staged_leads": staged_summaries,
                "trace_logs": trace_logs,
            }

        except Exception as e:
            db.rollback()
            run_log.status = "failed"
            run_log.errors = [str(e)]
            run_log.finished_at = datetime.now(timezone.utc)
            db.commit()
            emit(f"[FAIL] Discovery & Staging error: {e}")
            raise
        finally:
            set_autopilot_running(False, run_id=run_log.id)
            JobManager.release_single_flight(run_log.id)
