import logging
import os
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.autopilot.build.payload import build_canonical_clinic_payload
from app.autopilot.build.self_check import run_self_check_gate
from app.autopilot.recording.link_verifier import sync_verified_links_to_batch_json
from app.autopilot.recording.walkthrough import record_walkthrough_batch
from app.autopilot.research.doctor import extract_doctor_and_degrees
from app.autopilot.research.hours import parse_places_opening_hours
from app.autopilot.runs.job_manager import JobManager
from app.core.exceptions import NotFoundError
from app.db.schema_migrations import ensure_schema_columns
from app.models.entities import Lead, LeadFact, Package, RunLog, Stage
from app.repositories.hustle_repo import HustleRepository
from app.services.event_bus import broadcast_sse, emit_pipeline_step, set_autopilot_running

logger = logging.getLogger("personal_os.autopilot.build.factory_service")


def ensure_lead_schema(db: Session) -> None:
    try:
        ensure_schema_columns(db.get_bind())
    except Exception as e:
        logger.debug("ensure_lead_schema migration notice: %s", e)


class DemoFactoryService:
    """
    Dedicated On-Demand Demo Factory Service (Operation B).
    Pulls staged leads FIFO from DB, enriches research, builds 3 live Next.js demo designs,
    runs Quality Self-Check gate, records mobile video walkthroughs, and transitions
    leads to DEMO_READY.
    """

    @classmethod
    def get_staged_count(cls, db: Session, hustle_id: int = 1, testing_mode: bool = False) -> int:
        """Returns the current count of unarchived leads in STAGED status."""
        q = db.query(func.count(Lead.id)).filter(
            Lead.hustle_id == hustle_id,
            Lead.status == "STAGED",
            Lead.is_archived == False,
        )
        if not testing_mode and hasattr(Lead, "is_test"):
            q = q.filter((Lead.is_test == False) | (Lead.is_test == None))  # noqa: E711, E712
        return q.scalar() or 0

    @classmethod
    def build_batch(
        cls,
        db: Session,
        hustle_id: int = 1,
        batch_size: int = 10,
        testing_mode: bool = False,
        base_url: Optional[str] = None,
        log_cb: Optional[Callable[[str], None]] = None,
    ) -> Dict[str, Any]:
        """
        Executes batch demo building and walkthrough video recording for staged leads.
        Pulls oldest staged leads (FIFO), enriches research, scaffolds payloads, validates gates,
        records videos, and advances state to DEMO_READY with immediate commits.
        """
        hustle = HustleRepository.get_by_id(db, hustle_id)
        if not hustle:
            raise NotFoundError(f"Hustle #{hustle_id} not found")

        ensure_lead_schema(db)

        # Enforce batch_size constraints (default 10, max 30)
        batch_val = 10 if batch_size is None else int(batch_size)
        batch_size = max(1, min(batch_val, 30))
        base_url = (base_url or os.getenv("DEMO_ENGINE_BASE_URL", "http://localhost:3001")).rstrip("/")

        # Initialize RunLog
        run_log = RunLog(
            hustle_id=hustle.id,
            job_type="demo_factory",
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
                try:
                    log_cb(text)
                except Exception:
                    pass

        try:
            emit(
                f"[DEMO-FACTORY] Starting batch demo build #{run_log.id} "
                f"(batch_size={batch_size}, testing_mode={testing_mode})..."
            )

            emit_pipeline_step(
                node_id="node-4",
                step_name="SCAFFOLD",
                status="RUNNING",
                clinic_name="Selecting staged leads for manufacturing...",
                metrics={"processed": 0, "total": batch_size, "badge_text": f"Batch: {batch_size}"},
                payload=[],
            )

            # a) Select oldest N leads from DB where status == 'STAGED' and is_archived == False (FIFO order by Lead.id.asc())
            q = db.query(Lead).filter(
                Lead.hustle_id == hustle.id,
                Lead.status == "STAGED",
                Lead.is_archived == False,
            )
            if not testing_mode and hasattr(Lead, "is_test"):
                q = q.filter((Lead.is_test == False) | (Lead.is_test == None))  # noqa: E711, E712

            staged_leads: List[Lead] = q.order_by(Lead.id.asc()).limit(batch_size).all()

            if not staged_leads:
                emit("[DEMO-FACTORY] Zero staged leads available in queue.")
                emit_pipeline_step(
                    node_id="node-4",
                    step_name="SCAFFOLD",
                    status="SUCCESS",
                    clinic_name="0 Staged Leads",
                    metrics={"processed": 0, "total": 0, "badge_text": "Queue Empty"},
                    payload=[],
                )
                remaining = cls.get_staged_count(db, hustle_id=hustle.id, testing_mode=testing_mode)
                run_log.status = "succeeded"
                run_log.finished_at = datetime.now(timezone.utc)
                db.commit()
                return {
                    "status": "succeeded",
                    "batch_size": batch_size,
                    "built_count": 0,
                    "failed_count": 0,
                    "remaining_staged_count": remaining,
                    "built_leads": [],
                    "failed_leads": [],
                }

            # Find stage 2 (package_ready)
            pkg_stage = (
                db.query(Stage).filter(Stage.hustle_id == hustle.id, Stage.slug == "package_ready").first()
            )
            stage_package_ready_id = pkg_stage.id if pkg_stage else 2

            built_lead_objects: List[Lead] = []
            failed_leads: List[Dict[str, Any]] = []

            # b) For each staged lead:
            for idx, lead in enumerate(staged_leads, 1):
                if cancel_token.is_cancelled:
                    emit("[DEMO-FACTORY] Processing halted by cancel token.")
                    break

                emit_pipeline_step(
                    node_id="node-4",
                    step_name="SCAFFOLD",
                    status="RUNNING",
                    clinic_name=lead.name,
                    metrics={
                        "processed": idx,
                        "total": len(staged_leads),
                        "badge_text": f"Scaffolding ({idx}/{len(staged_leads)})",
                    },
                    payload=[],
                )

                custom_fields = dict(lead.custom_fields or {})
                raw_title = custom_fields.get("raw_maps_title") or lead.name
                doc_name = (lead.doctor_name or "").strip()
                degrees = custom_fields.get("degrees") or ""
                doc_source = custom_fields.get("discovery_source_tier", "Discovery Waterfall")

                # Research Enrichment: If doctor_name missing or empty, extract from raw maps title / facts
                if not doc_name or doc_name == "Our Dental Team":
                    for f in lead.facts:
                        if f.field == "doctor_name" and f.value:
                            doc_name = f.value
                            doc_source = f.source
                            break

                if not doc_name or doc_name == "Our Dental Team":
                    extracted_doc, extracted_deg, extracted_src = extract_doctor_and_degrees(
                        clinic_title=raw_title,
                        organic_results=[],
                        lead_phone=lead.primary_phone or "",
                        locality=lead.locality or "",
                    )
                    if extracted_doc and extracted_doc != "Our Dental Team":
                        doc_name = extracted_doc
                        degrees = extracted_deg or degrees
                        doc_source = extracted_src
                    else:
                        doc_name = "Our Dental Team"
                        doc_source = "Neutral Default"

                # Ensure opening hours are parsed if available
                hours_obj = None
                if "hours_obj" in custom_fields and isinstance(custom_fields["hours_obj"], dict):
                    hours_obj = custom_fields["hours_obj"]
                elif "places_hours" in custom_fields and isinstance(custom_fields["places_hours"], dict):
                    hours_obj = parse_places_opening_hours(custom_fields["places_hours"])
                elif "opening_hours" in custom_fields:
                    raw_h = custom_fields["opening_hours"]
                    if isinstance(raw_h, dict):
                        hours_obj = raw_h
                    elif isinstance(raw_h, str) and raw_h.strip():
                        hours_obj = {"verified": False, "notes": raw_h.strip(), "schedule": []}

                if not hours_obj:
                    for f in lead.facts:
                        if f.field == "operating_hours" and f.value:
                            hours_obj = {"verified": False, "notes": f.value, "schedule": []}
                            break

                if not hours_obj:
                    hours_obj = {"verified": False, "notes": "Call to confirm hours", "schedule": []}

                # Rating & reviews
                rating = custom_fields.get("rating")
                review_count = custom_fields.get("review_count")
                if rating is None:
                    for f in lead.facts:
                        if f.field == "google_rating":
                            rating = f.value
                            break
                if review_count is None:
                    for f in lead.facts:
                        if f.field == "review_count":
                            review_count = f.value
                            break

                consultation_fee = custom_fields.get(
                    "consultation_fee", "Contact the clinic for consultation fees"
                )
                city = lead.city or "Delhi NCR"
                locality = lead.locality or city
                address = lead.address or f"{locality}, {city}"

                # Payload Construction
                payload = build_canonical_clinic_payload(
                    slug=lead.slug,
                    clinic_name=lead.name,
                    doctor_name=doc_name,
                    qualifications=degrees,
                    locality=locality,
                    address=address,
                    phone_raw_str=lead.primary_phone or "",
                    rating=str(rating) if rating is not None else None,
                    review_count=str(review_count) if review_count is not None else None,
                    consultation_fee=consultation_fee,
                    opening_hours=hours_obj,
                    city=city,
                )

                # Quality Self-Check Gate
                verified_sources = [
                    custom_fields.get("discovery_source_tier", "Discovery Waterfall"),
                    doc_source,
                ]
                gate_passed, gate_report = run_self_check_gate(payload, verified_sources=verified_sources)

                if not gate_passed:
                    lead.status = "BUILD_FAILED"
                    custom_fields["build_error"] = gate_report
                    lead.custom_fields = custom_fields
                    db.commit()
                    logger.warning(
                        "Quality self-check failed for lead #%s ('%s'): %s",
                        lead.id,
                        lead.name,
                        gate_report,
                    )
                    emit(f"[WARN] Quality self-check failed for lead #{lead.id} ('{lead.name}'): {gate_report}")
                    failed_leads.append(
                        {
                            "id": lead.id,
                            "slug": lead.slug,
                            "name": lead.name,
                            "phone": lead.primary_phone,
                            "status": "BUILD_FAILED",
                            "reason": gate_report,
                        }
                    )
                    continue

                # Package Creation (or update)
                q_score = 65
                if doc_name and doc_name != "Our Dental Team":
                    q_score += 15
                if hours_obj.get("verified"):
                    q_score += 10
                if rating and float(str(rating).replace("★", "").strip() or 0) >= 4.5:
                    q_score += 10

                if doc_name and doc_name != "Our Dental Team":
                    lead.doctor_name = doc_name
                    custom_fields["degrees"] = degrees
                    has_doc_fact = any(f.field == "doctor_name" for f in lead.facts)
                    if not has_doc_fact:
                        db.add(
                            LeadFact(
                                lead_id=lead.id,
                                field="doctor_name",
                                value=f"{doc_name} ({degrees})" if degrees else doc_name,
                                source=doc_source,
                                confidence=0.95 if "Verified" in doc_source else 0.85,
                            )
                        )

                # Advance lead.stage_id to stage 2 (package_ready)
                lead.stage_id = stage_package_ready_id
                lead.custom_fields = custom_fields
                lead.what_changed_summary = f"Built 3 live designs (/demo/{lead.slug}). Quality score: {q_score}."

                pkg = (
                    db.query(Package)
                    .filter(Package.lead_id == lead.id)
                    .order_by(Package.id.desc())
                    .first()
                )
                asset_links = {
                    "choice_page": f"{base_url}/demo/{lead.slug}",
                    "modern": f"{base_url}/modern/{lead.slug}",
                    "premium": f"{base_url}/premium/{lead.slug}",
                    "warm": f"{base_url}/warm/{lead.slug}",
                }

                if not pkg:
                    pkg = Package(
                        lead_id=lead.id,
                        version=1,
                        asset_links=asset_links,
                        video_file_path="",
                        video_size_mb=0.0,
                        clinic_payload=payload,
                        quality_score=q_score,
                        self_check_passed=True,
                        self_check_report=gate_report,
                        status="video_pending",
                    )
                    db.add(pkg)
                else:
                    pkg.asset_links = asset_links
                    pkg.clinic_payload = payload
                    pkg.quality_score = q_score
                    pkg.self_check_passed = True
                    pkg.self_check_report = gate_report
                    pkg.status = "video_pending"

                db.commit()
                built_lead_objects.append(lead)
                emit(f"[BUILD] ✓ Scaffolding & gate passed for lead #{lead.id}: '{lead.name}'")

            # c) Video Walkthrough Recording
            if built_lead_objects:
                emit(f"[DEMO-FACTORY] Syncing batch.json and recording walkthroughs for {len(built_lead_objects)} clinics...")
                emit_pipeline_step(
                    node_id="node-5",
                    step_name="WALKTHROUGH",
                    status="RUNNING",
                    clinic_name="Syncing links & recording walkthroughs...",
                    metrics={
                        "processed": 0,
                        "total": len(built_lead_objects),
                        "badge_text": f"Recording (0/{len(built_lead_objects)})",
                    },
                    payload=[],
                )

                new_lead_ids = [l.id for l in built_lead_objects]
                sync_verified_links_to_batch_json(
                    db=db,
                    base_url=base_url,
                    log_cb=emit,
                    only_lead_ids=new_lead_ids,
                    cancel_check=lambda: cancel_token.is_cancelled,
                    testing_mode=testing_mode,
                )

                record_walkthrough_batch(
                    db=db,
                    leads=built_lead_objects,
                    base_url=base_url,
                    log_cb=emit,
                    testing_mode=testing_mode,
                )

            # d) State Transition & Immediate Commit
            built_leads: List[Dict[str, Any]] = []
            for lead in built_lead_objects:
                pkg = (
                    db.query(Package)
                    .filter(Package.lead_id == lead.id)
                    .order_by(Package.id.desc())
                    .first()
                )
                video_path = pkg.video_file_path if pkg else None
                video_ok = bool(
                    video_path
                    and (
                        (os.path.exists(video_path) and os.path.getsize(video_path) > 1000)
                        or (testing_mode and video_path)
                    )
                )

                if video_ok:
                    lead.status = "DEMO_READY"
                    lead.next_action = "Outreach via WhatsApp"
                    if pkg:
                        pkg.status = "ready"
                    db.commit()
                    built_leads.append(
                        {
                            "id": lead.id,
                            "slug": lead.slug,
                            "name": lead.name,
                            "phone": lead.primary_phone,
                            "doctor_name": lead.doctor_name,
                            "locality": lead.locality,
                            "city": lead.city,
                            "status": lead.status,
                            "quality_score": pkg.quality_score if pkg else 0,
                            "demo_url": (pkg.asset_links or {}).get("choice_page") if pkg else None,
                            "video_path": pkg.video_file_path if pkg else None,
                        }
                    )
                    emit(f"[DEMO-READY] ✓ #{lead.id} '{lead.name}' -> DEMO_READY (/demo/{lead.slug})")
                else:
                    lead.status = "BUILD_FAILED"
                    c_fields = dict(lead.custom_fields or {})
                    c_fields["build_error"] = "Walkthrough video recording failed"
                    lead.custom_fields = c_fields
                    if pkg:
                        pkg.status = "failed"
                    db.commit()
                    failed_leads.append(
                        {
                            "id": lead.id,
                            "slug": lead.slug,
                            "name": lead.name,
                            "phone": lead.primary_phone,
                            "status": "BUILD_FAILED",
                            "reason": "Walkthrough video recording failed",
                        }
                    )
                    emit(f"[FAIL] Walkthrough recording failed for lead #{lead.id} ('{lead.name}')")

            # e) Return structured result
            remaining = cls.get_staged_count(db, hustle_id=hustle.id, testing_mode=testing_mode)
            run_status = "cancelled" if cancel_token.is_cancelled else "succeeded"

            run_log.status = run_status
            run_log.count_found = len(staged_leads)
            run_log.count_passed = len(built_leads)
            run_log.count_dropped = len(failed_leads)
            run_log.drop_reasons = {
                "_structured": {
                    "built_leads": built_leads,
                    "failed_leads": failed_leads,
                    "batch_size": batch_size,
                    "built_count": len(built_leads),
                    "failed_count": len(failed_leads),
                    "remaining_staged_count": remaining,
                }
            }
            run_log.trace_logs = trace_logs
            run_log.finished_at = datetime.now(timezone.utc)
            db.commit()

            emit_pipeline_step(
                node_id="node-5",
                step_name="WALKTHROUGH",
                status="SUCCESS",
                clinic_name=f"{len(built_leads)} Demos Ready",
                metrics={
                    "processed": len(built_leads),
                    "total": len(staged_leads),
                    "badge_text": f"✓ {len(built_leads)} Ready",
                },
                payload=built_leads[:15],
            )

            broadcast_sse(
                "autopilot_build_batch_completed",
                {
                    "run_id": run_log.id,
                    "built_count": len(built_leads),
                    "failed_count": len(failed_leads),
                    "remaining_staged_count": remaining,
                },
            )

            return {
                "status": run_status,
                "batch_size": batch_size,
                "built_count": len(built_leads),
                "failed_count": len(failed_leads),
                "remaining_staged_count": remaining,
                "built_leads": built_leads,
                "failed_leads": failed_leads,
            }

        except Exception as e:
            db.rollback()
            run_log.status = "failed"
            run_log.errors = [str(e)]
            run_log.finished_at = datetime.now(timezone.utc)
            db.commit()
            emit(f"[FAIL] Demo Factory error: {e}")
            raise
        finally:
            set_autopilot_running(False, run_id=run_log.id)
            JobManager.release_single_flight(run_log.id)
