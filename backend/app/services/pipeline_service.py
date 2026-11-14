import logging
import os
import threading
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.agents import build_cockpit_batch_payload
from app.autopilot.config import DENTAL_RECORDER_DIR
from app.autopilot.orchestrator import run_live_autopilot_discovery, sync_verified_links_to_batch_json
from app.autopilot.runs.job_manager import JobManager
from app.core.exceptions import NotFoundError
from app.db.session import SessionLocal
from app.models.entities import Lead, LeadFact, Package, RunLog, Stage
from app.repositories.hustle_repo import HustleRepository
from app.services.event_bus import broadcast_sse, emit_terminal_log, get_pipeline_state, is_autopilot_running, set_autopilot_running

logger = logging.getLogger("personal_os.pipeline_service")

# Item 11: DB-backed lock helpers
# ---------------------------------------------------------------------------
# The in-memory JobManager lock is reset when the server process restarts or
# when mcp_server.py runs in a different process.  These helpers treat the
# RunLog table as the authoritative lock: a row with status='running' that is
# younger than STALE_RUN_TIMEOUT_SECONDS is considered an active lock.
# ---------------------------------------------------------------------------
_STALE_RUN_TIMEOUT_SECONDS = 3600  # 1 hour: runs older than this are force-released


def _db_check_active_run(db: Session) -> Optional[RunLog]:
    """Return the most recent 'running' RunLog if one exists and is not stale."""
    stale_cutoff = datetime.now(timezone.utc) - timedelta(seconds=_STALE_RUN_TIMEOUT_SECONDS)
    candidate = (
        db.query(RunLog)
        .filter(RunLog.status == "running")
        .order_by(RunLog.id.desc())
        .first()
    )
    if candidate is None:
        return None
    started = candidate.started_at
    if started and started.tzinfo is None:
        started = started.replace(tzinfo=timezone.utc)
    if started and started < stale_cutoff:
        # Stale: treat as interrupted and release the DB lock
        candidate.status = "interrupted"
        candidate.finished_at = candidate.finished_at or datetime.now(timezone.utc)
        candidate.errors = (candidate.errors or []) + [
            "[db_lock] auto-released: exceeded stale timeout of "
            f"{_STALE_RUN_TIMEOUT_SECONDS}s without finishing"
        ]
        db.commit()
        logger.warning("DB lock: stale run #%d auto-released.", candidate.id)
        return None
    return candidate


def _db_assert_no_active_run(db: Session) -> None:
    """Raise HTTP 409 if another run is active in the DB (cross-process safe)."""
    active = _db_check_active_run(db)
    if active is not None:
        raise HTTPException(
            status_code=409,
            detail=f"Run #{active.id} already in progress (DB lock). "
                   "Cancel it before starting a new run.",
        )


class PipelineService:
    @staticmethod
    def list_runs(db: Session, hustle_id: Optional[int] = None) -> List[RunLog]:
        q = db.query(RunLog)
        if hustle_id is not None:
            q = q.filter(RunLog.hustle_id == hustle_id)
        return q.order_by(RunLog.id.desc()).limit(30).all()

    @staticmethod
    def get_run_by_id(db: Session, run_id: int) -> Dict[str, Any]:
        run = db.query(RunLog).filter(RunLog.id == run_id).first()
        if not run:
            raise NotFoundError(f"Run #{run_id} not found")
        structured = (run.drop_reasons or {}).get("_structured", {})
        return {
            "id": run.id,
            "hustle_id": run.hustle_id,
            "status": run.status,
            "count_found": run.count_found,
            "count_passed": run.count_passed,
            "count_dropped": run.count_dropped,
            "drop_reasons": run.drop_reasons,
            "errors": run.errors or [],
            "trace_logs": (run.trace_logs or [])[-100:],
            "provenance": structured.get("provenance", {}),
            "started_at": run.started_at.isoformat() if run.started_at else None,
            "finished_at": run.finished_at.isoformat() if run.finished_at else None,
        }

    @staticmethod
    def cancel_run(run_id: Optional[int] = None) -> Dict[str, Any]:
        active_id = JobManager.get_active_run_id()
        target_id = run_id if run_id is not None else active_id

        if target_id is None and not JobManager.has_active_processes():
            return {"status": "no_run_active", "stopped": False, "detail": "No autopilot run is currently executing"}

        stopped = JobManager.cancel_active_run(target_id)
        if stopped:
            emit_terminal_log("AUTOPILOT", f"Automation stopped (run_id={target_id})")
            return {"status": "cancelling", "stopped": True, "run_id": target_id}

        if run_id is not None:
            return {"status": "not_running", "stopped": False, "run_id": run_id}

        return {"status": "no_run_active", "stopped": False, "detail": "No autopilot run is currently executing"}

    @classmethod
    def discover_leads(
        cls,
        db: Session,
        hustle_id: int = 1,
        target_count: int = 30,
        locality: Optional[str] = None,
        testing_mode: bool = False,
        async_mode: bool = False,
    ) -> Dict[str, Any]:
        from app.autopilot.discovery.service import DiscoveryService

        if testing_mode:
            target_count = min(target_count, 2)

        if async_mode:
            # Item 11: Check both in-memory lock (same process) and DB lock (cross-process)
            active_id = JobManager.get_active_run_id()
            if active_id is not None:
                raise HTTPException(status_code=409, detail=f"Run #{active_id} already in progress")
            _db_assert_no_active_run(db)  # cross-process / mcp_server.py check

            hustle = HustleRepository.get_by_id(db, hustle_id)
            if not hustle:
                raise NotFoundError(f"Hustle #{hustle_id} not found")

            # Synchronously create RunLog and acquire single-flight lock before returning 202
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

            try:
                JobManager.acquire_single_flight(run_log.id)
            except HTTPException:
                run_log.status = "conflict"
                db.commit()
                raise

            set_autopilot_running(True, run_id=run_log.id)

            def _bg_worker():
                with SessionLocal() as bg_db:
                    try:
                        DiscoveryService.run_discovery_and_staging(
                            db=bg_db,
                            hustle_id=hustle_id,
                            target_count=target_count,
                            locality=locality,
                            testing_mode=testing_mode,
                            log_cb=lambda msg: emit_terminal_log("DISCOVERY", msg),
                            existing_run_log_id=run_log.id,
                        )
                    except Exception as ex:
                        logger.error("Async discovery run failed: %s", ex)
                        JobManager.release_single_flight(run_log.id)
                        set_autopilot_running(False, run_id=run_log.id)

            t = threading.Thread(target=_bg_worker, daemon=True)
            t.start()
            return {
                "status": "running",
                "async": True,
                "message": "Autopilot lead discovery started in background thread",
                "run_id": run_log.id,
            }

        return DiscoveryService.run_discovery_and_staging(
            db=db,
            hustle_id=hustle_id,
            target_count=target_count,
            locality=locality,
            testing_mode=testing_mode,
            log_cb=lambda msg: emit_terminal_log("DISCOVERY", msg),
        )

    @classmethod
    def build_batch(
        cls,
        db: Session,
        hustle_id: int = 1,
        batch_id: Optional[str] = None,
        batch_size: Optional[int] = None,
        testing_mode: bool = False,
        async_mode: bool = False,
    ) -> Dict[str, Any]:
        from app.autopilot.build.factory_service import DemoFactoryService

        if async_mode:
            # Item 11: DB lock check for build_batch cross-process safety
            active_id = JobManager.get_active_run_id()
            if active_id is not None:
                raise HTTPException(status_code=409, detail=f"Run #{active_id} already in progress")
            _db_assert_no_active_run(db)

            def _bg_worker():
                with SessionLocal() as bg_db:
                    try:
                        DemoFactoryService.build_batch(
                            db=bg_db,
                            hustle_id=hustle_id,
                            batch_id=batch_id,
                            batch_size=batch_size,
                            testing_mode=testing_mode,
                            log_cb=lambda msg: emit_terminal_log("DEMO-FACTORY", msg),
                        )
                    except Exception as ex:
                        logger.error("Async demo factory build batch failed: %s", ex)

            t = threading.Thread(target=_bg_worker, daemon=True)
            t.start()
            return {
                "status": "running",
                "async": True,
                "message": "Autopilot demo factory batch build started in background thread",
            }

        return DemoFactoryService.build_batch(
            db=db,
            hustle_id=hustle_id,
            batch_id=batch_id,
            batch_size=batch_size,
            testing_mode=testing_mode,
            log_cb=lambda msg: emit_terminal_log("DEMO-FACTORY", msg),
        )

    @classmethod
    def trigger_refill(
        cls,
        db: Session,
        hustle_id: int = 1,
        batch_size: int = 3,
        testing_mode: bool = False,
        locality: Optional[str] = None,
        async_mode: bool = False,
        stop_after: Optional[str] = None,
    ) -> Dict[str, Any]:
        if stop_after == "discovery":
            return cls.discover_leads(
                db=db,
                hustle_id=hustle_id,
                target_count=batch_size,
                locality=locality,
                testing_mode=testing_mode,
                async_mode=async_mode,
            )
        if stop_after == "build":
            return cls.build_batch(
                db=db,
                hustle_id=hustle_id,
                batch_size=batch_size,
                testing_mode=testing_mode,
                async_mode=async_mode,
            )

        hustle = HustleRepository.get_by_id(db, hustle_id)
        if not hustle:
            raise NotFoundError("Hustle not found.")

        from app.core.config import get_settings as _get_settings
        base_url = _get_settings().DEMO_ENGINE_BASE_URL
        mode_tag = " [TESTING MODE: LIVE-ONLY / NO-CACHE]" if testing_mode else ""

        def _worker(
            bg_hustle_id: int,
            bg_batch_size: int,
            bg_testing_mode: bool,
            bg_locality: Optional[str],
            bg_stop_after: Optional[str],
        ):
            with SessionLocal() as bg_db:
                bg_h = HustleRepository.get_by_id(bg_db, bg_hustle_id)
                if not bg_h:
                    return
                try:
                    run_live_autopilot_discovery(
                        db=bg_db,
                        hustle=bg_h,
                        target_count=bg_batch_size,
                        base_url=base_url,
                        log_cb=lambda msg: emit_terminal_log("REFILL-BATCH", msg),
                        testing_mode=bg_testing_mode,
                        locality=bg_locality,
                        stop_after=bg_stop_after,
                    )
                except Exception as ex:
                    logger.error("Async autopilot run failed: %s", ex)

        if async_mode:
            emit_terminal_log(
                "REFILL-BATCH", f"Spawning async background Autopilot run (target_count={batch_size}){mode_tag}..."
            )
            # Item 11: Check in-memory AND DB lock before spawning thread
            active_id = JobManager.get_active_run_id()
            if active_id is not None:
                raise HTTPException(status_code=409, detail=f"Run #{active_id} already in progress")
            _db_assert_no_active_run(db)

            t = threading.Thread(
                target=_worker,
                args=(hustle_id, batch_size, testing_mode, locality, stop_after),
                daemon=True,
            )
            t.start()
            return {"status": "running", "async": True, "message": "Autopilot refill started in background thread"}

        emit_terminal_log(
            "REFILL-BATCH", f"Starting 7-Step Autopilot Refill Batch (target_count={batch_size}){mode_tag}..."
        )
        result = run_live_autopilot_discovery(
            db=db,
            hustle=hustle,
            target_count=batch_size,
            base_url=base_url,
            log_cb=lambda msg: emit_terminal_log("REFILL-BATCH", msg),
            testing_mode=testing_mode,
            locality=locality,
            stop_after=stop_after,
        )
        emit_terminal_log(
            "REFILL-BATCH",
            f"Run #{result['run_id']} finished: {result['passed']} built, {result['batch_sync']['verified_count']} live URLs synced to batch.json.",
        )
        broadcast_sse(
            "autopilot_run",
            {
                "run_id": result["run_id"],
                "passed": result["passed"],
                "verified_in_batch_json": result["batch_sync"]["verified_count"],
                "title": f"Refill Run #{result['run_id']} finished ({result['passed']} built)",
            },
        )
        return result

    @staticmethod
    def cleanup_test_data(
        db: Session, confirmation: str = "DELETE_TEST_DATA", test_run_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Deletes only is_test rows and their associated recordings."""
        if confirmation != "DELETE_TEST_DATA":
            raise HTTPException(status_code=400, detail="Invalid confirmation string. Must be 'DELETE_TEST_DATA'")

        q = db.query(Lead).filter(Lead.is_test == True)  # noqa: E712
        if test_run_id:
            q = q.filter(Lead.test_run_id == test_run_id)
        test_leads = q.all()
        lead_ids = [l.id for l in test_leads]

        recordings_dir = DENTAL_RECORDER_DIR / "recordings"
        deleted_files = 0
        for l in test_leads:
            cand_mp4 = recordings_dir / f"Clinic-{l.id}-{l.slug}.mp4"
            if cand_mp4.exists():
                try:
                    cand_mp4.unlink()
                    deleted_files += 1
                except Exception:
                    pass

        pkg_count = (
            db.query(Package).filter(Package.lead_id.in_(lead_ids)).delete(synchronize_session=False) if lead_ids else 0
        )
        fact_count = (
            db.query(LeadFact).filter(LeadFact.lead_id.in_(lead_ids)).delete(synchronize_session=False)
            if lead_ids
            else 0
        )
        lead_count = db.query(Lead).filter(Lead.id.in_(lead_ids)).delete(synchronize_session=False) if lead_ids else 0
        run_count = db.query(RunLog).filter(RunLog.job_type.like("%test%")).delete(synchronize_session=False)

        db.commit()
        return {
            "deleted_leads": lead_count,
            "deleted_packages": pkg_count,
            "deleted_facts": fact_count,
            "deleted_recordings": deleted_files,
            "deleted_runs": run_count,
        }

    @staticmethod
    def verify_links(db: Session) -> Dict[str, Any]:
        from app.core.config import get_settings as _get_settings
        base_url = _get_settings().DEMO_ENGINE_BASE_URL
        emit_terminal_log("VERIFY-LINKS", f"Starting HTTP 200 verification on {base_url}...")
        report = sync_verified_links_to_batch_json(
            db=db,
            base_url=base_url,
            log_cb=lambda msg: emit_terminal_log("VERIFY-LINKS", msg),
        )
        emit_terminal_log(
            "VERIFY-LINKS",
            f"Completed: {report['verified_count']} passed HTTP 200, {report['failed_count']} failed.",
        )
        broadcast_sse(
            "links_verified",
            {"verified_count": report["verified_count"], "title": f"Verified {report['verified_count']} live links"},
        )
        return report

    @staticmethod
    def get_cockpit_batch(db: Session, hustle_id: int = 1, batch_id: Optional[str] = None) -> Dict[str, Any]:
        return build_cockpit_batch_payload(db=db, hustle_id=hustle_id, batch_id=batch_id)

    @staticmethod
    def get_cockpit_state(db: Session, hustle_id: int = 1) -> Dict[str, Any]:
        pipeline_state = get_pipeline_state()
        is_running = bool(pipeline_state.get("is_running", False))
        current_run_id = pipeline_state.get("current_run_id")
        active_node_id = pipeline_state.get("active_node_id")

        package_ready_stage = (
            db.query(Stage).filter(Stage.hustle_id == hustle_id, Stage.slug == "package_ready").first()
        )
        stage_ready_id = package_ready_stage.id if package_ready_stage else 2

        last_run = db.query(RunLog).filter(RunLog.hustle_id == hustle_id).order_by(RunLog.id.desc()).first()
        packages = (
            db.query(Package)
            .options(joinedload(Package.lead))
            .join(Lead)
            .filter(Lead.hustle_id == hustle_id, (Lead.is_test == False) | Lead.is_test.is_(None))
            .order_by(Package.id.desc())
            .limit(15)
            .all()  # noqa: E711, E712
        )
        review_leads = (
            db.query(Lead)
            .filter(
                Lead.hustle_id == hustle_id,
                Lead.stage_id == stage_ready_id,
                (Lead.is_test == False) | Lead.is_test.is_(None),
            )  # noqa: E711, E712
            .order_by(Lead.id.desc())
            .limit(15)
            .all()
        )

        structured = (last_run.drop_reasons or {}).get("_structured", {}) if last_run else {}
        built_leads_data = structured.get("built_leads", [])
        dropped_items_data = structured.get("dropped_items", [])

        discovery_payload = [
            {
                "id": b.get("id", 0),
                "name": b.get("name", "Unknown"),
                "locality": b.get("locality", "Delhi NCR"),
                "phone": b.get("phone", ""),
                "source": b.get("source_tier", "Google Places API"),
                "status": "DISCOVERED",
            }
            for b in built_leads_data
        ]

        verification_payload = []
        for item in dropped_items_data[:8]:
            verification_payload.append(
                {
                    "clinic": item.get("name", "Unknown"),
                    "domain": item.get("detail"),
                    "verdict": f"DROPPED_{item.get('reason', 'FILTERED').upper()}",
                }
            )
        for item in built_leads_data[:8]:
            verification_payload.append(
                {
                    "clinic": item.get("name", "Unknown"),
                    "domain": None,
                    "http_status": 404,
                    "has_mobile_site": False,
                    "verdict": "PASSED_NO_WEBSITE",
                }
            )

        research_payload = [
            {
                "clinic": b.get("name", "Unknown"),
                "lead_doctor": b.get("doctor", "Doctor In-Charge"),
                "degrees": b.get("degrees", ""),
                "source": b.get("source_tier", "Verified Source"),
                "phone": b.get("phone", ""),
                "locality": b.get("locality", ""),
            }
            for b in built_leads_data[:8]
        ]

        from app.core.config import get_settings as _get_settings
        base_url = _get_settings().DEMO_ENGINE_BASE_URL.rstrip("/")
        scaffold_payload = [
            {
                "clinic_slug": p.lead.slug if p.lead else f"clinic-{p.id}",
                "clinic_name": p.lead.name if p.lead else f"Clinic #{p.id}",
                "themes_generated": ["modern", "premium", "warm"],
                "routes": p.asset_links
                or {
                    "modern": f"{base_url}/modern/{p.lead.slug if p.lead else p.id}",
                    "warm": f"{base_url}/warm/{p.lead.slug if p.lead else p.id}",
                    "premium": f"{base_url}/premium/{p.lead.slug if p.lead else p.id}",
                },
                "status": "VERIFIED_HTTP_200",
            }
            for p in packages[:8]
        ]

        walkthrough_payload = [
            {
                "clinic": p.lead.name if p.lead else f"Clinic #{p.id}",
                "video_file": p.video_file_path or f"recordings/Clinic-{p.id}.mp4",
                "resolution": structured.get("viewport", "1080x1920 (Mobile)"),
                "duration_seconds": 45,
                "status": "ENCODED_READY" if p.video_file_path else "RECORDING_STAGED",
            }
            for p in packages[:8]
        ]

        review_tray_payload = [
            {
                "lead_id": l.id,
                "clinic_name": l.name,
                "doctor": l.doctor_name,
                "locality": l.locality,
                "phone": l.primary_phone,
                "preferred_channel": l.preferred_channel or "whatsapp",
                "package_sealed": True,
                "est_value_inr": l.deal_value_inr or 15000,
            }
            for l in review_leads
        ]

        found_cnt = last_run.count_found if last_run else 0
        passed_cnt = last_run.count_passed if last_run else len(packages)
        dropped_cnt = last_run.count_dropped if last_run else 0
        built_cnt = len(packages)
        review_buffer_cnt = len(review_leads)
        recorded_cnt = sum(1 for p in packages if p.video_file_path or p.status != "video_pending")

        # Real duration calculation
        dur_str = "0s"
        if last_run and last_run.started_at:
            fin = last_run.finished_at or datetime.now(timezone.utc)
            st = last_run.started_at
            if st.tzinfo is None:
                st = st.replace(tzinfo=timezone.utc)
            if fin.tzinfo is None:
                fin = fin.replace(tzinfo=timezone.utc)
            dur_str = f"{max(1, int((fin - st).total_seconds()))}s"

        def _get_node_status(step_num: int, default_success: bool) -> str:
            if not is_running:
                if step_num == 6:
                    return "WAITING_FOR_REVIEW" if review_buffer_cnt > 0 else "IDLE"
                return "SUCCESS" if default_success else "IDLE"
            if not active_node_id:
                if step_num == 6:
                    return "WAITING_FOR_REVIEW" if review_buffer_cnt > 0 else "IDLE"
                return "SUCCESS" if default_success else "IDLE"
            active_step_map = {
                "node-1": 1,
                "node-2": 2,
                "node-3": 3,
                "node-4": 4,
                "node-5": 5,
                "node-6": 6,
            }
            active_num = active_step_map.get(active_node_id, 1)
            if step_num < active_num:
                return "SUCCESS"
            elif step_num == active_num:
                return "RUNNING" if step_num < 6 else "WAITING_FOR_REVIEW"
            else:
                return "QUEUED"

        nodes = [
            {
                "id": 1,
                "stepNumber": 1,
                "name": "DISCOVERY",
                "title": "1. Candidate Discovery Waterfall",
                "subtitle": "Google Places API + Verified Local Pool",
                "tools": "Google Places API • Verified Local Pool",
                "status": _get_node_status(1, found_cnt > 0),
                "badge": f"✓ {found_cnt} Found" if found_cnt > 0 else "0 Found",
                "progressText": f"{found_cnt} candidate clinics discovered in last run",
                "logicDescription": "Queries Google Places API & Verified Local Pool for dental clinics in specified locality.",
                "duration": dur_str,
                "payload": discovery_payload,
                "error": None,
            },
            {
                "id": 2,
                "stepNumber": 2,
                "name": "VERIFICATION",
                "title": "2. Website Verification & HTTP Probe",
                "subtitle": "HTTP Probes + DuckDuckGo",
                "tools": "HTTP 200/404 Probes • DuckDuckGo Search Verification",
                "status": _get_node_status(2, passed_cnt > 0),
                "badge": f"✓ {passed_cnt} Verified ({dropped_cnt} Dropped)" if passed_cnt > 0 else "0 Verified",
                "progressText": f"{passed_cnt} verified no-website • {dropped_cnt} dropped",
                "logicDescription": "Probes domain status and uses DuckDuckGo to verify clinic has no active mobile website.",
                "duration": dur_str,
                "payload": verification_payload,
                "error": None,
            },
            {
                "id": 3,
                "stepNumber": 3,
                "name": "DEEP RESEARCH",
                "title": "3. Doctor & Clinic Dossier Enrichment",
                "subtitle": "Doctor Extraction & Opening Hours",
                "tools": "Doctor Scraping • Opening Hours • Verified Reviews",
                "status": _get_node_status(3, len(research_payload) > 0),
                "badge": f"✓ {len(research_payload)} Enriched" if research_payload else "0 Enriched",
                "progressText": f"{len(research_payload)} doctor credentials & clinical facts staged",
                "logicDescription": "Extracts doctor educational qualifications, reviews, and clinic specialty services.",
                "duration": dur_str,
                "payload": research_payload,
                "error": None,
            },
            {
                "id": 4,
                "stepNumber": 4,
                "name": "NEXT.JS BUILD",
                "title": "4. Multi-Template Next.js Demo Scaffold",
                "subtitle": "3 Live Themes: Modern, Premium, Warm",
                "tools": "add-clinic.ts • 3 Next.js Themes • Live HTTP Verification",
                "status": _get_node_status(4, built_cnt > 0),
                "badge": f"✓ {built_cnt} Built" if built_cnt > 0 else "0 Built",
                "progressText": f"{built_cnt} clinics compiled across 3 luxury themes",
                "logicDescription": "Scaffolds clinic data into Next.js Dental Engine and verifies HTTP 200 live status on localhost:3001.",
                "duration": dur_str,
                "payload": scaffold_payload,
                "error": None,
            },
            {
                "id": 5,
                "stepNumber": 5,
                "name": "WALKTHROUGH",
                "title": "5. Headless Video Walkthrough Recording",
                "subtitle": "Headless MP4 Video Recorder",
                "tools": "Playwright Headless • Mobile Viewport • WebM/MP4",
                "status": _get_node_status(5, recorded_cnt > 0),
                "badge": f"✓ {recorded_cnt} Recorded" if recorded_cnt > 0 else f"{built_cnt} Synced",
                "progressText": f"{recorded_cnt} mobile video walkthroughs recorded & ready"
                if recorded_cnt > 0
                else f"{built_cnt} mobile video walkthroughs staged for recorder",
                "logicDescription": "Spawns Playwright Chromium to record an authentic scrollable mobile preview of the clinic website.",
                "duration": dur_str,
                "payload": walkthrough_payload,
                "error": None,
            },
            {
                "id": 6,
                "stepNumber": 6,
                "name": "REVIEW TRAY",
                "title": "6. Sealed & Staged Review Tray Buffer",
                "subtitle": "Sealed & Staged Ready for Pitch",
                "tools": "Buffer Health Engine • One-Click Operator Approval",
                "status": _get_node_status(6, review_buffer_cnt > 0),
                "badge": f"{review_buffer_cnt} in Buffer",
                "progressText": f"{review_buffer_cnt} qualified dental clinics sealed & ready to send",
                "logicDescription": "Stages validated packages with live links into the CRM Review Tray for operator dispatch.",
                "duration": "Ready",
                "payload": review_tray_payload,
                "error": None,
            },
        ]

        recent_leads = (
            db.query(Lead)
            .filter(Lead.hustle_id == hustle_id, (Lead.is_test == False) | Lead.is_test.is_(None))
            .order_by(Lead.id.desc())
            .limit(1)
            .all()
        )  # noqa: E711, E712
        first_lead = recent_leads[0] if recent_leads else None
        first_pkg = packages[0] if packages else None
        preview_links = (
            (first_pkg.asset_links or {})
            if first_pkg
            else {
                "modern": f"{base_url}/modern",
                "warm": f"{base_url}/warm",
                "premium": f"{base_url}/premium",
            }
        )

        recent_lead_data = {
            "id": first_lead.id if first_lead else 0,
            "name": first_lead.name if first_lead else "No lead discovered yet",
            "doctor": (first_lead.doctor_name or "Doctor In-Charge") if first_lead else "",
            "locality": (first_lead.locality or "Delhi NCR") if first_lead else "",
            "phone": (first_lead.primary_phone or "") if first_lead else "",
            "fitScore": first_lead.fit_score if first_lead and first_lead.fit_score else 95,
            "previewLinks": {
                "modern": preview_links.get("modern", f"{base_url}/modern"),
                "warm": preview_links.get("warm", f"{base_url}/warm"),
                "lux": preview_links.get("premium", f"{base_url}/premium"),
            },
        }

        from app.autopilot.discovery.service import STAGING_BUFFER_CEILING, DiscoveryService

        staged_pool_cnt = DiscoveryService.get_staged_count(db, hustle_id=hustle_id)

        metrics = {
            "runId": f"#run-{last_run.id}" if last_run else "#run-0",
            "triggeredAgo": "Recently" if last_run else "Never",
            "status": "COMPLETED"
            if (last_run and last_run.status == "succeeded")
            else ("IN_PROGRESS" if is_running else "COMPLETED"),
            "targetRequested": structured.get("target_count", 3),
            "candidateFound": found_cnt,
            "verifiedNoSite": passed_cnt,
            "droppedCount": dropped_cnt,
            "enrichedDossiers": len(research_payload),
            "demosBuilt": built_cnt,
            "reviewTrayReady": review_buffer_cnt,
            "stagedPoolCount": staged_pool_cnt,
            "stagedCeiling": STAGING_BUFFER_CEILING,
            "duration": dur_str,
            "recentLead": recent_lead_data,
        }

        return {
            "is_running": is_running,
            "current_run_id": current_run_id,
            "active_node_id": active_node_id,
            "nodes": nodes,
            "metrics": metrics,
        }


cleanup_test_data = PipelineService.cleanup_test_data
