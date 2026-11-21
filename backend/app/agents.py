from app.utils.safety import normalize_phone
"""
Phase 3 Specialized Sub-Agents & Outreach Bridge (`agents.py`)
--------------------------------------------------------------
Implements the 3 specialized pipeline agents:
1. ScoutAgent: Finds clinics, verifies no-website via Brave, enriches IG/Email/Doctor facts (with optional Free Gemini Flash + deterministic fallback).
2. AuditorAgent: Builds 3 demo templates in Neon Postgres, verifies live HTTP 200, updates `batch.json`, and runs `record-batch.mjs` for MP4 walkthroughs.
3. CloserAgent: Bridges Neon Postgres Outbox with `wa_autopilot.mjs`, `ig_autopilot.mjs`, and `email_autopilot.py` (`GET /api/batch`, `POST /api/mark-sent`, `POST /api/mark-unreachable`) and drafts smart follow-ups for hot viewers.
"""

import asyncio
import json
import os
import shutil
import subprocess
import time
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

import httpx
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.orm.attributes import flag_modified

from .autopilot import (
    BATCH_RECORDER_DIR,
    PROJECT_ROOT,
    run_live_autopilot_discovery,
    sync_verified_links_to_batch_json,
)
from .autopilot.runs.job_manager import JobManager
from .models import AppSetting, Hustle, Lead, Package, RunLog, Stage
from .safety import compute_fit_score, normalize_ig_handle
from .services.event_bus import broadcast_sse, set_autopilot_running

DISPATCH_COCKPIT_DIR = PROJECT_ROOT / "Side hustle (Building Website)" / "dispatch-cockpit"
SCRAPES_DIR = PROJECT_ROOT / "Side hustle (Building Website)" / "scrapes"
RECORDINGS_DIR = BATCH_RECORDER_DIR / "recordings"


def find_lead_recording_path(lead: "Lead") -> Optional[str]:  # noqa: F821
    """Returns the canonical Clinic-{slug}.mp4 recording path for a lead via centralized naming adapter."""
    from app.autopilot.recording.naming import find_lead_recording_path as find_canonical_path
    return find_canonical_path(lead, recordings_dir=RECORDINGS_DIR)


def call_gemini_flash_free(prompt: str) -> Optional[str]:
    """
    Calls Google AI Studio Free Tier (`gemini-2.5-flash` / `gemini-2.0-flash`) if GEMINI_API_KEY is configured.
    Enforces explicit httpx timeout and bounded retries/backoff on transient rate limits (429) or server errors.
    Returns None gracefully if no key is set or if offline, so the deterministic fallback runs at Rs. 0 cost.
    """
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 250},
    }
    explicit_timeout = httpx.Timeout(10.0, connect=3.0)
    for attempt in range(3):
        try:
            with httpx.Client(timeout=explicit_timeout) as client:
                resp = client.post(url, json=payload)
                if resp.status_code in (429, 500, 502, 503, 504) and attempt < 2:
                    time.sleep(1.0 * (2 ** attempt))
                    continue
                if resp.status_code != 200:
                    return None
                data = resp.json()
                candidates = data.get("candidates") or []
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts") or []
                    if parts:
                        return parts[0].get("text", "").strip()
                return None
        except (httpx.TimeoutException, httpx.NetworkError):
            if attempt < 2:
                time.sleep(1.0 * (2 ** attempt))
                continue
            return None
        except Exception:
            return None
    return None


def _load_local_enrichment_Lookup() -> Dict[str, Dict[str, str]]:
    """Loads cached Instagram handles and emails from `scrapes/` so Scout can enrich leads at zero API cost."""
    lookup: Dict[str, Dict[str, str]] = {}
    ig_file = SCRAPES_DIR / "enriched_ig_leads.json"
    email_file = SCRAPES_DIR / "wa_enriched_emails.json"

    for fpath in [ig_file, email_file]:
        if fpath.exists():
            try:
                rows = json.loads(fpath.read_text(encoding="utf-8"))
                if isinstance(rows, list):
                    for r in rows:
                        if not isinstance(r, dict):
                            continue
                        name_key = str(r.get("name") or r.get("clinic_name") or "").strip().lower()
                        if not name_key:
                            continue
                        entry = lookup.setdefault(name_key, {})
                        if r.get("ig_handle") or r.get("instagram"):
                            entry["ig"] = normalize_ig_handle(r.get("ig_handle") or r.get("instagram")) or ""
                        if r.get("email"):
                            entry["email"] = str(r.get("email")).strip()
            except Exception:
                pass
    return lookup


# ===========================================================================
# 1. SCOUT AGENT (Discovery + 2-Source Fact Enrichment + IG/Email Lookup)
# ===========================================================================
def run_scout_agent(
    db: Session,
    hustle: Hustle,
    batch_size: int = 2,
    base_url: str = "http://localhost:3001",
    log_cb: Optional[Callable[[str], None]] = None,
) -> Dict[str, Any]:
    """
    Scout Agent:
    1. Discovers new clinics without websites via `run_live_autopilot_discovery`.
    2. Enriches existing & newly discovered leads with Instagram handles, email addresses,
       and AI-refined specialty/doctor facts (using Gemini Flash free tier if configured, or deterministic rules).
    """

    def _emit(msg: str) -> None:
        if log_cb:
            try:
                log_cb(msg)
            except Exception:
                pass

    _emit(f"[SCOUT] Initializing Scout Agent (target batch={batch_size})...")
    discovery_res = run_live_autopilot_discovery(
        db=db,
        hustle=hustle,
        target_count=batch_size,
        base_url=base_url,
        log_cb=_emit,
    )

    is_dental = "dental" in (hustle.slug or "").lower() or "dental" in (hustle.name or "").lower()
    allow_ig_research = (
        False if is_dental else bool((getattr(hustle, "pipeline_config", None) or {}).get("enable_instagram_discovery", False))
    )

    enrichment_lookup = _load_local_enrichment_Lookup()
    leads = (
        db.query(Lead)
        .options(joinedload(Lead.facts))
        .filter(Lead.hustle_id == hustle.id, Lead.is_archived == False)  # noqa: E712
        .all()
    )
    _emit(
        f"[SCOUT] Enriching {len(leads)} active clinic dossiers (IG Research={'ENABLED' if allow_ig_research else 'DISABLED for Dental Clinics'})..."
    )

    async def _enrich_lead_async(lead: Lead) -> Tuple[bool, Optional[str]]:
        changed = False
        key = lead.name.strip().lower()
        cached = enrichment_lookup.get(key, {})

        # Only enrich IG handle if IG discovery/research is enabled for this hustle (disabled for Dental Clinics)
        if allow_ig_research and not lead.instagram_handle and cached.get("ig"):
            lead.instagram_handle = cached["ig"]
            changed = True

        if not lead.email and cached.get("email"):
            lead.email = cached["email"]
            changed = True

        # Optional Gemini Flash enrichment if GEMINI_API_KEY is present
        if not lead.ai_fields or "scout_summary" not in (lead.ai_fields or {}):
            ai_summary = await asyncio.to_thread(
                call_gemini_flash_free,
                f"Write a 1-sentence sales research note for dental clinic '{lead.name}' "
                f"({lead.doctor_name or 'Doctor'}) in {lead.locality}, {lead.city} that has no website.",
            )
            if not ai_summary:
                ai_summary = (
                    f"Scout verified '{lead.name}' in {lead.locality} has no standalone website; "
                    f"high-fit candidate for 3-template dental studio pitch."
                )
            ai_f = dict(lead.ai_fields or {})
            ai_f["scout_summary"] = ai_summary
            lead.ai_fields = ai_f
            changed = True

        log_msg = None
        if changed:
            fit, reasons = compute_fit_score(
                lead.facts,
                bool(lead.doctor_name),
                bool(lead.primary_phone),
                bool(lead.instagram_handle),
                lead.ai_fields or {},
            )
            lead.fit_score = fit
            lead.fit_reasons = reasons
            log_msg = f"[SCOUT] Enriched dossier for '{lead.name}' ({lead.locality}) -> Fit Score: {fit} | Phone: {lead.primary_phone or 'N/A'}"

        return changed, log_msg

    async def _run_all_enrichments():
        tasks = [_enrich_lead_async(lead) for lead in leads]
        return await asyncio.gather(*tasks, return_exceptions=True)

    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                enrich_results = executor.submit(lambda: asyncio.run(_run_all_enrichments())).result()
        else:
            enrich_results = loop.run_until_complete(_run_all_enrichments())
    except RuntimeError:
        enrich_results = asyncio.run(_run_all_enrichments())

    enriched_count = 0
    extra_logs: List[str] = []
    for res in enrich_results:
        if isinstance(res, Exception):
            continue
        changed, log_msg = res
        if changed:
            enriched_count += 1
            if log_msg:
                extra_logs.append(log_msg)
                _emit(log_msg)

    summary_line = (
        f"[SCOUT] Completed: {discovery_res['passed']} new clinics built, {enriched_count} clinic dossiers enriched."
    )
    extra_logs.append(summary_line)
    _emit(summary_line)

    # Update RunLog job_type and trace_logs so Latest Run shows Scout Agent details
    run_obj = db.query(RunLog).filter(RunLog.id == discovery_res["run_id"]).first()
    all_traces = discovery_res["trace_logs"] + extra_logs
    if run_obj:
        run_obj.job_type = "scout_agent_discovery_and_enrichment"
        run_obj.trace_logs = all_traces
        dr = dict(run_obj.drop_reasons or {})
        st = dict(dr.get("_structured") or {})
        st["enriched_dossiers"] = enriched_count
        dr["_structured"] = st
        run_obj.drop_reasons = dr

    db.commit()
    # Auto-assign newly discovered leads to batches
    ensure_hustle_lead_batches(db, hustle.id)
    return {
        "agent": "scout",
        "run_id": discovery_res["run_id"],
        "discovered_new": discovery_res["passed"],
        "enriched_leads": enriched_count,
        "dropped": discovery_res["dropped"],
        "structured": discovery_res.get("structured"),
        "trace_logs": all_traces,
    }


# ===========================================================================
# 2. AUDITOR AGENT (Compliance Gate + HTTP 200 Check + Video Recording)
# ===========================================================================
def run_auditor_agent(
    db: Session,
    hustle: Hustle,
    base_url: str = "http://localhost:3001",
    record_video: bool = False,
    clinic_id: Optional[int] = None,
    log_cb: Optional[Callable[[str], None]] = None,
) -> Dict[str, Any]:
    """
    Auditor Agent:
    1. Verifies all 4 live demo URLs (/demo, /modern, /premium, /warm) return HTTP 200.
    2. Syncs verified working links to `dental-batch-recorder/batch.json`.
    3. Checks if MP4 recordings exist in `dental-batch-recorder/recordings/` (or runs `record-batch.mjs` if requested)
       and attaches `video_file_path` + `video_size_mb` to each lead's Package in Neon Postgres.
    """
    started_at = datetime.now(timezone.utc)
    trace: List[str] = []

    def _emit(msg: str) -> None:
        trace.append(msg)
        if log_cb:
            try:
                log_cb(msg)
            except Exception:
                pass

    set_autopilot_running(True)
    broadcast_sse("autopilot_started", {"task": "auditor", "channel": "recorder"})
    _emit(f"[AUDITOR] Starting Auditor Agent (record_video={record_video})...")
    sync_report = sync_verified_links_to_batch_json(db=db, base_url=base_url, log_cb=_emit)
    RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)

    recorded_videos: List[str] = []
    recorder_log_lines: List[str] = []
    _proc_key = "auditor_recorder"

    try:
        if record_video and sync_report["verified_items"]:
            target_items = sync_report["verified_items"]
            if clinic_id is not None:
                target_items = [item for item in target_items if item["lead_id"] == clinic_id]
            else:
                target_items = target_items[:1]  # Record 1 clinic per UI click so it finishes fast

            if target_items:
                single_batch_path = BATCH_RECORDER_DIR / "batch-auditor-active.json"
                single_batch_path.write_text(
                    json.dumps([{"name": i["name"], "url": i["url"]} for i in target_items], indent=2),
                    encoding="utf-8",
                )
                _emit(f"[AUDITOR] Launching Playwright recorder (`record-batch.mjs`) for {target_items[0]['name']}...")
                try:
                    proc = subprocess.Popen(
                        ["node", "record-batch.mjs", str(single_batch_path)],
                        cwd=str(BATCH_RECORDER_DIR),
                        stdout=subprocess.PIPE,
                        stderr=subprocess.STDOUT,
                        text=True,
                        bufsize=1,
                    )
                    JobManager.register_process(_proc_key, proc, task_type="auditor")
                    if proc.stdout:
                        for raw_line in proc.stdout:
                            # Check if cancelled between lines
                            if proc.poll() is not None:
                                break
                            token = JobManager.get_active_cancel_token()
                            if token and token.is_cancelled:
                                _emit("[STOPPED] Automation halted by user.")
                                proc.terminate()
                                break
                            clean_line = raw_line.rstrip()
                            if clean_line:
                                recorder_log_lines.append(clean_line)
                                _emit(f"[RECORDER] {clean_line}")
                    proc.wait(timeout=120)
                except Exception as exc:
                    err_msg = f"Recorder note: {exc}"
                    recorder_log_lines.append(err_msg)
                    _emit(f"[RECORDER] {err_msg}")
    finally:
        JobManager.unregister_process(_proc_key)
        set_autopilot_running(False)

    # Match existing or newly recorded MP4 files in `recordings/` to packages
    packages = db.query(Package).options(joinedload(Package.lead)).all()
    attached_videos = 0
    audited_summary: List[Dict[str, Any]] = []
    for pkg in packages:
        lead = pkg.lead
        if not lead:
            continue
        # Strictly lookup canonical Clinic-{slug}.mp4 only (never numeric id or cross-clinic samples)
        from app.autopilot.recording.naming import find_lead_recording_path as find_canonical_path
        canonical_p = find_canonical_path(lead, recordings_dir=RECORDINGS_DIR)
        found_mp4: Optional[Path] = Path(canonical_p) if canonical_p else None

        if found_mp4 and found_mp4.exists():
            size_mb = round(found_mp4.stat().st_size / (1024 * 1024), 2)
            pkg.video_file_path = str(found_mp4)
            pkg.video_size_mb = size_mb
            attached_videos += 1
            recorded_videos.append(found_mp4.name)
            _emit(f"[AUDITOR] Linked MP4 walkthrough {found_mp4.name} ({size_mb} MB) -> '{lead.name}'")
            audited_summary.append(
                {
                    "id": lead.id,
                    "name": lead.name,
                    "slug": lead.slug,
                    "doctor": lead.doctor_name or "Doctor",
                    "locality": lead.locality,
                    "phone": lead.primary_phone or "",
                    "fit_score": lead.fit_score,
                    "source_tier": f"MP4: {found_mp4.name} ({size_mb} MB)",
                    "demo_url": f"{base_url.rstrip('/')}/demo/{lead.slug}",
                    "http_200": True,
                }
            )

    _emit(
        f"[AUDITOR] Completed: {sync_report['verified_count']} packages verified HTTP 200, "
        f"{attached_videos} MP4 videos linked."
    )

    structured_auditor = {
        "http_failed": sync_report["failed_count"],
        "_structured": {
            "tiers_used": ["Auditor HTTP 200 Verifier", "Playwright MP4 Recorder"],
            "built_leads": audited_summary,
            "dropped_items": [
                {"name": item["slug"], "reason": "http_failed", "detail": "Failed live HTTP 200 verification"}
                for item in sync_report.get("failed_items", [])
            ],
            "verified_in_batch_json": sync_report["verified_count"],
        },
    }

    run_log = RunLog(
        hustle_id=hustle.id,
        job_type="auditor_agent_qa_and_video",
        status="succeeded",
        count_found=sync_report["verified_count"] + sync_report["failed_count"],
        count_passed=sync_report["verified_count"],
        count_dropped=sync_report["failed_count"],
        drop_reasons=structured_auditor,
        errors=[],
        trace_logs=trace,
        started_at=started_at,
        finished_at=datetime.now(timezone.utc),
    )
    db.add(run_log)
    db.commit()
    db.refresh(run_log)
    # Auto-assign any newly audited leads to batches
    ensure_hustle_lead_batches(db, hustle.id)

    return {
        "agent": "auditor",
        "run_id": run_log.id,
        "verified_links_count": sync_report["verified_count"],
        "failed_links_count": sync_report["failed_count"],
        "batch_json_path": sync_report["batch_json_path"],
        "attached_videos_count": attached_videos,
        "video_files": recorded_videos[:10],
        "recorder_log": "\n".join(recorder_log_lines)[-800:],
        "trace_logs": trace,
    }


# ===========================================================================
# 3. CLOSER AGENT & DISPATCH COCKPIT BRIDGE (WA / IG / Email Automation)
# ===========================================================================
def build_pitch_messages(lead: Lead, pkg: Optional[Package], base_url: str = "http://localhost:3001") -> Dict[str, str]:
    """Builds the 2-part WhatsApp Hook + Demo Links, Instagram DM invite, and Email pitch for a clinic."""
    doc = lead.doctor_name or "Doctor"
    clinic = lead.name
    loc = lead.locality or lead.city or "Delhi NCR"

    links = (pkg.asset_links if pkg and pkg.asset_links else {}) or {}
    choice_url = links.get("choice_page") or f"{base_url}/demo/{lead.slug}"
    modern_url = links.get("modern") or f"{base_url}/modern/{lead.slug}"
    premium_url = links.get("premium") or f"{base_url}/premium/{lead.slug}"
    warm_url = links.get("warm") or f"{base_url}/warm/{lead.slug}"

    wa_msg1 = (
        f"Namaste {doc} Ji,\n\n"
        f"Google Maps par *{clinic}* ({loc}) ke strong patient reviews dekh kar "
        f"humne aapke clinic ke liye 3 custom mobile website designs ready kiye hain."
    )
    wa_msg2 = (
        f"Aap teeno live designs aur 45-sec walkthrough video yahan dekh sakte hain:\n\n"
        f"1. All-in-One Switcher: {choice_url}\n"
        f"2. Modern Clinical: {modern_url}\n"
        f"3. Luxury Implant Studio: {premium_url}\n"
        f"4. Warm Family Care: {warm_url}\n\n"
        f"Inmein se kaunsa layout aapke clinic vibe ko sabse best suit karta hai?"
    )
    ig_dm_invite = (
        f"Namaste {doc} Ji\n\n"
        f"Google par {clinic} ({loc}) ke patient reviews dekh kar humne aapke liye 3 custom website designs tayyar kiye hain.\n\n"
        f"Live preview yahan dekhein:\n{choice_url}\n\n"
        f"Aapko Modern, Premium, ya Warm mein se kaunsa layout sabse accha laga?"
    )
    ig_reply_caption = wa_msg2  # Same demo-links block re-used as an IG reply caption
    email_subject = f"3 Custom Website Previews for {clinic} ({loc})"
    email_body = f"{wa_msg1}\n\n{wa_msg2}\n\nBest regards,\nAnkur"

    # Apply saved pitch overrides from lead.custom_fields["pitch_overrides"]
    # (written by POST /update-messages).  Only non-empty strings override.
    overrides: Dict[str, str] = (lead.custom_fields or {}).get("pitch_overrides") or {}
    if overrides.get("wa_msg1"):
        wa_msg1 = overrides["wa_msg1"]
    if overrides.get("wa_msg2"):
        wa_msg2 = overrides["wa_msg2"]
    if overrides.get("ig_dm_invite"):
        ig_dm_invite = overrides["ig_dm_invite"]
    if overrides.get("ig_reply_caption"):
        ig_reply_caption = overrides["ig_reply_caption"]
    if overrides.get("email_subject"):
        email_subject = overrides["email_subject"]
    if overrides.get("email_body"):
        email_body = overrides["email_body"]

    return {
        "wa_msg1": wa_msg1,
        "wa_msg2": wa_msg2,
        "ig_dm_invite": ig_dm_invite,
        "ig_reply_caption": ig_reply_caption,
        "email_subject": email_subject,
        "email_body": email_body,
        "choice_url": choice_url,
    }


# ===========================================================================
# 0. BATCH HELPER (Auto-assign leads to BATCH-01, BATCH-02, ...)
# ===========================================================================
def ensure_hustle_lead_batches(
    db: Session,
    hustle_id: int = 1,
    force_rebatch: bool = False,
) -> Dict[str, Any]:
    """
    Zero-migration auto-batching helper.  Assigns every non-archived lead for
    `hustle_id` a `custom_fields["batch_id"]` ("BATCH-01", "BATCH-02", …).

    If `force_rebatch` is False: existing assignments are kept intact; only
    unbatched leads (regardless of stage) are appended to the latest open batch
    (or a new one). Every non-archived lead ends up with a batch_id — zero
    "UNBATCHED" leads anywhere in the pipeline.

    If `force_rebatch` is True: ALL non-archived leads (regardless of stage,
    including contacted, viewed_demo, replied, etc.) are re-sliced cleanly into
    BATCH-01, BATCH-02, ... of size `batch_size` ordered by Lead.id.asc().
    This guarantees zero unbatched leads after clicking "Re-Batch Stock".
    """
    hustle = db.query(Hustle).filter(Hustle.id == hustle_id).first()
    if not hustle:
        return {"batch_size": 25, "batches": [], "active_batch_id": "BATCH-01"}

    batch_size = int((hustle.channel_limits or {}).get("batch_size") or 25)

    # Fetch ALL non-archived leads ordered by id asc
    leads = (
        db.query(Lead)
        .options(joinedload(Lead.stage_rel), joinedload(Lead.outbox_items), joinedload(Lead.packages))
        .filter(Lead.hustle_id == hustle_id, Lead.is_archived == False, Lead.do_not_contact == False)  # noqa: E712
        .order_by(Lead.id.asc())
        .all()
    )

    def is_lead_lost(l: Lead) -> bool:
        if (l.status or "").upper() in ("CLOSED_LOST", "LOST") or l.stage_id == 8:
            return True
        if l.stage_rel and (l.stage_rel.slug in ("lost", "closed_lost") or l.stage_rel.is_lost):
            return True
        return False

    active_leads = [l for l in leads if not is_lead_lost(l)]
    lost_leads = [l for l in leads if is_lead_lost(l)]

    any_updated = False

    if force_rebatch:
        # Re-slice ALL non-archived leads (ordered by Lead.id.asc()) continuously into BATCH-01, BATCH-02, ...
        batch_num = 1
        slot_count = 0
        for lead in leads:
            if slot_count >= batch_size:
                batch_num += 1
                slot_count = 0
            new_bid = f"BATCH-{batch_num:02d}"
            cf = dict(lead.custom_fields or {})
            if cf.get("batch_id") != new_bid:
                cf["batch_id"] = new_bid
                lead.custom_fields = cf
                flag_modified(lead, "custom_fields")
                any_updated = True
            slot_count += 1
    else:
        # Incremental mode:
        # Keep existing assignments intact; assign unbatched leads to open / next BATCH-xx
        batch_counts: Dict[str, int] = {}
        for lead in leads:
            bid = (lead.custom_fields or {}).get("batch_id")
            if bid and bid.startswith("BATCH-"):
                batch_counts[bid] = batch_counts.get(bid, 0) + 1

        if batch_counts:
            max_num = max(
                int(k.replace("BATCH-", ""))
                for k in batch_counts
                if k.startswith("BATCH-")
            )
            current_batch_id = f"BATCH-{max_num:02d}"
            slot_count = batch_counts.get(current_batch_id, 0)
        else:
            max_num = 1
            current_batch_id = "BATCH-01"
            slot_count = 0

        for lead in leads:
            bid = (lead.custom_fields or {}).get("batch_id")
            if bid and bid.startswith("BATCH-"):
                continue  # already has continuous BATCH-xx — keep as-is
            if slot_count >= batch_size:
                max_num += 1
                current_batch_id = f"BATCH-{max_num:02d}"
                slot_count = 0
            cf = dict(lead.custom_fields or {})
            cf["batch_id"] = current_batch_id
            lead.custom_fields = cf
            flag_modified(lead, "custom_fields")
            any_updated = True
            slot_count += 1

    if any_updated:
        db.commit()

    # Build summary per batch
    now_utc = datetime.now(timezone.utc)
    today_start = now_utc.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)

    batch_map: Dict[str, Dict[str, Any]] = {}
    for lead in leads:
        bid = (lead.custom_fields or {}).get("batch_id") or "BATCH-01"
        if bid not in batch_map:
            batch_map[bid] = {
                "batch_id": bid,
                "total": 0,
                "ready_unsent": 0,
                "sent": 0,
                "followup_count": 0,
                "followup_due_today": 0,
                "followup_overdue": 0,
                "followup_upcoming": 0,
                "stage_counts": {},
                "demo_ready_count": 0,
            }
        batch_map[bid]["total"] += 1
        stage_slug = lead.stage_rel.slug if lead.stage_rel else "discovered"
        batch_map[bid]["stage_counts"][stage_slug] = batch_map[bid]["stage_counts"].get(stage_slug, 0) + 1

        # Check demo readiness: stage is package_ready or beyond, or lead.status == 'DEMO_READY', or has ready package
        has_ready_pkg = any(p.status in ("ready", "ready_for_review", "sent") for p in (lead.packages or []))
        is_demo_ready = (
            stage_slug in ("package_ready", "queued", "contacted", "viewed_demo", "replied", "won")
            or (lead.status or "").upper() == "DEMO_READY"
            or has_ready_pkg
        )
        if is_demo_ready:
            batch_map[bid]["demo_ready_count"] = batch_map[bid].get("demo_ready_count", 0) + 1
        already_sent = stage_slug in ("contacted", "viewed_demo", "replied", "won") or any(
            ob.status == "sent" for ob in (lead.outbox_items or [])
        )
        has_queued = any(ob.status == "queued" for ob in (lead.outbox_items or []))
        if has_queued:
            already_sent = False
        if not already_sent and not lead.do_not_contact:
            batch_map[bid]["ready_unsent"] += 1
        else:
            batch_map[bid]["sent"] += 1

        # Track follow-up eligibility and schedule
        is_fup = bool(lead.needs_followup) or stage_slug in ("contacted", "viewed_demo", "replied")
        if is_fup and not lead.do_not_contact:
            batch_map[bid]["followup_count"] += 1
            fup_dt = None
            if lead.next_followup_at:
                fup_dt = lead.next_followup_at if lead.next_followup_at.tzinfo else lead.next_followup_at.replace(tzinfo=timezone.utc)
            elif lead.next_action_due_at:
                fup_dt = lead.next_action_due_at if lead.next_action_due_at.tzinfo else lead.next_action_due_at.replace(tzinfo=timezone.utc)
            
            if fup_dt:
                if fup_dt < today_start:
                    batch_map[bid]["followup_overdue"] += 1
                elif today_start <= fup_dt < today_end:
                    batch_map[bid]["followup_due_today"] += 1
                else:
                    batch_map[bid]["followup_upcoming"] += 1
            else:
                # Default for active follow-up without future date is due today
                batch_map[bid]["followup_due_today"] += 1

        # Track closed-lost count to identify all-lost batches
        if is_lead_lost(lead):
            batch_map[bid]["lost_count"] = batch_map[bid].get("lost_count", 0) + 1

    # Mark is_all_lost on each batch (True when total > 0 and lost_count == total)
    for b in batch_map.values():
        b["is_all_lost"] = b.get("total", 0) > 0 and b.get("lost_count", 0) == b.get("total", 0)

    # Sort batch list: continuous BATCH-xx sorted numerically
    def batch_sort_key(b: Dict[str, Any]):
        bid = b["batch_id"]
        if bid.startswith("BATCH-"):
            try:
                return (0, int(bid.replace("BATCH-", "")))
            except ValueError:
                return (0, 999999)
        return (1, bid)

    batches = sorted(batch_map.values(), key=batch_sort_key)

    # Active batch = first active (non-all-lost) batch that still has unsent leads; fall back to last active batch
    active_batches = [b for b in batches if not b.get("is_all_lost")]
    if not active_batches:
        active_batches = batches
    active_batch_id = active_batches[-1]["batch_id"] if active_batches else (batches[0]["batch_id"] if batches else "BATCH-01")
    for b in active_batches:
        if b["ready_unsent"] > 0:
            active_batch_id = b["batch_id"]
            break

    return {
        "batch_size": batch_size,
        "batches": batches,
        "active_batch_id": active_batch_id,
    }


def build_cockpit_batch_payload(db: Session, hustle_id: int = 1, batch_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Serves `GET /api/batch` in the exact JSON schema expected by:
    - `dispatch-cockpit/wa_autopilot.mjs`
    - `dispatch-cockpit/ig_autopilot.mjs`
    - `dispatch-cockpit/email_autopilot.py`
    """
    base_url = os.getenv("DEMO_ENGINE_BASE_URL", "http://localhost:3001")

    # Run 7-day auto-lost transition check
    from app.services.lead_service import LeadService
    LeadService.auto_transition_unreplied_to_closed_lost(db, hustle_id=hustle_id)

    # Ensure all leads have batch assignments; get active batch meta
    batch_meta = ensure_hustle_lead_batches(db, hustle_id)
    valid_batch_ids = {b["batch_id"] for b in batch_meta["batches"]}
    saved_batch_id = None
    if not batch_id:
        setting_row = db.query(AppSetting).filter(AppSetting.key == "active_outreach_batch_id").first()
        if setting_row and setting_row.value in valid_batch_ids:
            saved_batch_id = setting_row.value
    target_batch_id = batch_id or saved_batch_id or batch_meta["active_batch_id"]

    leads = (
        db.query(Lead)
        .options(joinedload(Lead.packages), joinedload(Lead.stage_rel), joinedload(Lead.outbox_items))
        .filter(
            Lead.hustle_id == hustle_id,
            Lead.is_archived == False,
            Lead.do_not_contact == False,
            Lead.status.notin_(["CLOSED_LOST", "LOST"]),
        )  # noqa: E712
        .order_by(Lead.id.asc())
        .all()
    )

    clinics_out: List[Dict[str, Any]] = []
    for l in leads:
        if (l.status or "").upper() in ("CLOSED_LOST", "LOST") or l.stage_id == 8 or (l.stage_rel and l.stage_rel.is_lost):
            continue
        pkg = l.packages[-1] if l.packages else None
        pitches = build_pitch_messages(l, pkg, base_url=base_url)
        stage_slug = l.stage_rel.slug if l.stage_rel else "discovered"
        already_sent = stage_slug in ("contacted", "viewed_demo", "replied", "won") or any(
            ob.status == "sent" for ob in (l.outbox_items or [])
        )

        # Queued custom messages (from the Messaging tab) override the hardcoded pitch.
        queued_items = [ob for ob in (l.outbox_items or []) if ob.status == "queued"]
        queued_item = max(queued_items, key=lambda ob: ob.id or 0) if queued_items else None
        if queued_item:
            already_sent = False
            pitches["wa_msg1"] = queued_item.text
            pitches["wa_msg2"] = ""
            pitches["ig_dm_invite"] = queued_item.text
            pitches["email_body"] = queued_item.text

        pref = (l.preferred_channel or "whatsapp").lower()
        if pref == "instagram" or (not l.primary_phone and l.instagram_handle):
            target_ch = "Instagram"
        elif pref == "email" or (not l.primary_phone and not l.instagram_handle and l.email):
            target_ch = "Email"
        else:
            target_ch = "WhatsApp"

        lead_batch_id = (l.custom_fields or {}).get("batch_id", "BATCH-01")

        # --- video_file_path / inbox-flag resolution ---------------------------------
        if queued_item:
            # Manual Inbox message: use the explicitly attached media (if any);
            # NEVER fall back to RECORDINGS_DIRS so the wrong clinic's video is
            # never accidentally attached to a custom "hello" message.
            _video_file_path = queued_item.media_path or ""
            _is_custom_inbox_msg = True
            _skip_video = not bool(queued_item.media_path)
        else:
            # Normal batch outreach: prefer pkg.video_file_path (if the file still
            # exists on disk), then fall back to the canonical slug-based recording.
            _pkg_vfp = (pkg.video_file_path or "") if pkg else ""
            if _pkg_vfp and os.path.exists(_pkg_vfp):
                _video_file_path = _pkg_vfp
            else:
                _video_file_path = find_lead_recording_path(l) or ""
            _is_custom_inbox_msg = False
            _skip_video = False
        # -----------------------------------------------------------------------------

        clinics_out.append(
            {
                "id": l.id,
                "slug": l.slug,
                "name": l.name,
                "doctor": l.doctor_name or "Doctor",
                "locality": l.locality,
                "city": l.city,
                "primary_phone": normalize_phone(l.primary_phone) or "",
                "phone": normalize_phone(l.primary_phone) or "",
                "phones": [normalize_phone(p) for p in (l.phones or ([l.primary_phone] if l.primary_phone else [])) if normalize_phone(p)],
                "ig_handle": l.instagram_handle or "",
                "ig_verified": True,
                "email": l.email or "",
                "target_channel": target_ch,
                "is_sent": already_sent,
                "batch_id": lead_batch_id,
                "video_file_path": _video_file_path,
                "is_custom_inbox_msg": _is_custom_inbox_msg,
                "skip_video": _skip_video,
                "queued_outbox_id": queued_item.id if queued_item else None,
                # Dispatch Cockpit persistence fields
                "has_custom_edits": bool((l.custom_fields or {}).get("pitch_overrides")),
                "stage_slug": stage_slug,
                "is_lost": stage_slug == "lost",
                "demo_url": pitches.get("choice_url", f"{base_url}/demo/{l.slug}"),
                "template_urls": {
                    "modern": f"{base_url}/modern/{l.slug}",
                    "premium": f"{base_url}/premium/{l.slug}",
                    "warm": f"{base_url}/warm/{l.slug}",
                },
                "has_video": bool(_video_file_path and os.path.exists(_video_file_path)),
                "needs_followup": bool(l.needs_followup),
                "next_followup_at": l.next_followup_at.isoformat() if l.next_followup_at else None,
                "next_action": l.next_action,
                "next_action_due_at": l.next_action_due_at.isoformat() if l.next_action_due_at else None,
                **pitches,
            }
        )

    # Filter to the target batch unless ALL is explicitly requested
    if batch_id != "ALL" and target_batch_id:
        clinics_out = [
            c for c in clinics_out
            if c["batch_id"] == target_batch_id
        ]

    return {
        "clinics": clinics_out,
        "total": len(clinics_out),
        "batch_size": batch_meta["batch_size"],
        "batches": batch_meta["batches"],
        "active_batch_id": target_batch_id,
    }


def run_closer_agent(
    db: Session,
    hustle: Hustle,
    channel: str = "whatsapp",
    dry_run: bool = True,
    clinic_id: Optional[int] = None,
    batch_id: Optional[str] = None,
    log_cb: Optional[Callable[[str], None]] = None,
) -> Dict[str, Any]:
    """
    Closer Agent:
    1. Runs `wa_autopilot.mjs`, `ig_autopilot.mjs`, or `email_autopilot.py` against the CRM's `/api/batch` endpoint (`PORT=8000`).
    2. Scans all `Viewed Demo` (hot viewer) leads and auto-drafts personalized follow-up notes if they don't have one yet.
    """
    started_at = datetime.now(timezone.utc)
    trace: List[str] = []

    def _emit(msg: str) -> None:
        trace.append(msg)
        if log_cb:
            try:
                log_cb(msg)
            except Exception:
                pass

    set_autopilot_running(True)
    broadcast_sse("autopilot_started", {"task": "closer", "channel": channel})

    env = os.environ.copy()
    env["PORT"] = "8000"
    env["COCKPIT_BASE"] = "http://127.0.0.1:8000"

    # Determine target batch and limit dispatch to that batch's unsent count
    batch_size_setting = int((hustle.channel_limits or {}).get("batch_size") or 25)
    batch_meta = ensure_hustle_lead_batches(db, hustle.id)
    target_batch_id = batch_id or batch_meta["active_batch_id"]

    # Count unsent leads in this specific batch
    unsent_in_batch = 0
    if clinic_id is None:
        for b in batch_meta["batches"]:
            if b["batch_id"] == target_batch_id:
                unsent_in_batch = b["ready_unsent"]
                break
        if unsent_in_batch == 0:
            _emit(f"[CLOSER] Batch {target_batch_id} has 0 unsent clinics remaining. Skipping dispatch.")
            set_autopilot_running(False)
            broadcast_sse("autopilot_stopped", {"task": "closer", "channel": channel.lower().strip()})
            return {
                "agent": "closer",
                "channel": channel.lower().strip(),
                "dry_run": dry_run,
                "batch_id": target_batch_id,
                "dispatch_log": f"Batch {target_batch_id} has 0 unsent clinics remaining.",
                "hot_viewers_followed_up": 0,
                "items": [],
                "trace": trace,
            }

    # Store the active batch in AppSetting so autopilot scripts calling GET /api/batch
    # automatically get the right batch filtered payload.
    try:
        setting_row = db.query(AppSetting).filter(AppSetting.key == "active_outreach_batch_id").first()
        if setting_row:
            setting_row.value = target_batch_id
        else:
            db.add(AppSetting(key="active_outreach_batch_id", value=target_batch_id))
        db.commit()
    except Exception:
        pass  # Non-fatal; worst case autopilot gets unfiltered payload

    # Expose batch ID to autopilot scripts via env
    env["OUTREACH_BATCH_ID"] = target_batch_id

    ch = channel.lower().strip()
    mode_label = "DRY-RUN SAFE TEST" if dry_run else "LIVE DISPATCH"
    _emit(f"[CLOSER] Starting Closer Agent on {ch.upper()} ({mode_label}) — Batch: {target_batch_id} ({unsent_in_batch} unsent)...")

    # Batch-scoped limit: cap at how many unsent leads remain in this batch
    dispatch_limit = max(1, min(batch_size_setting, unsent_in_batch)) if clinic_id is None else 1

    cmd: List[str] = []
    if ch == "whatsapp":
        cmd = ["node", "wa_autopilot.mjs", "--ignore-break", "--limit", str(dispatch_limit)]
        if dry_run:
            cmd.append("--dry-run")
        if clinic_id:
            cmd.extend(["--clinic-id", str(clinic_id)])
    elif ch == "instagram":
        cmd = ["node", "ig_autopilot.mjs", "--account", "a", "--bypass-schedule", "--limit", str(dispatch_limit)]
        if dry_run:
            cmd.append("--dry-run")
        if clinic_id:
            cmd.extend(["--clinic-id", str(clinic_id)])
    elif ch == "email":
        cmd = ["python3", "email_autopilot.py", "--ignore-break", "--limit", str(dispatch_limit)]
        if dry_run:
            cmd.append("--dry-run")
        if clinic_id:
            cmd.extend(["--clinic-id", str(clinic_id)])

    _proc_key = f"closer_{ch}"
    dispatch_lines: List[str] = []
    try:
        if cmd and DISPATCH_COCKPIT_DIR.exists():
            _emit(f"[CLOSER] Executing: {' '.join(cmd)} (COCKPIT_BASE=http://127.0.0.1:8000)")
            try:
                # Remove any stale stop flag before spawning a fresh subprocess so
                # wa_autopilot.mjs starts clean and doesn't abort immediately.
                _wa_stop_flag = DISPATCH_COCKPIT_DIR / ".wa_stop_requested"
                if _wa_stop_flag.exists():
                    try:
                        _wa_stop_flag.unlink()
                    except Exception:
                        pass

                proc = subprocess.Popen(
                    cmd,
                    cwd=str(DISPATCH_COCKPIT_DIR),
                    env=env,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    bufsize=1,
                )
                JobManager.register_process(_proc_key, proc, task_type=f"closer_{ch}")
                if proc.stdout:
                    for raw_line in proc.stdout:
                        # Check if cancelled between lines
                        if proc.poll() is not None:
                            break
                        token = JobManager.get_active_cancel_token()
                        if token and token.is_cancelled:
                            _emit("[STOPPED] Automation halted by user.")
                            # Write stop flag so the Node subprocess exits gracefully
                            # via its own isStopRequested() poll (non-destructive signal).
                            try:
                                _wa_stop_flag.write_text("stop", encoding="utf-8")
                            except Exception:
                                pass
                            proc.terminate()
                            break
                        clean_line = raw_line.rstrip()
                        if clean_line:
                            dispatch_lines.append(clean_line)
                            _emit(f"[{ch.upper()}] {clean_line}")
                proc.wait(timeout=600)
            except Exception as exc:
                err_msg = f"Dispatcher execution note: {exc}"
                dispatch_lines.append(err_msg)
                _emit(f"[{ch.upper()}] {err_msg}")
    finally:
        JobManager.unregister_process(_proc_key)
        set_autopilot_running(False)
        broadcast_sse("autopilot_stopped", {"task": "closer", "channel": ch})
    dispatch_output = "\n".join(dispatch_lines)[-1200:]

    # Also draft follow-ups for Hot Demo Viewers (`viewed_demo` stage)
    hot_leads = (
        db.query(Lead)
        .join(Stage, Lead.stage_id == Stage.id)
        .filter(Lead.hustle_id == hustle.id, Stage.slug == "viewed_demo", Lead.do_not_contact == False)  # noqa: E712
        .all()
    )
    drafted_followups = 0
    closer_structured_items: List[Dict[str, Any]] = []
    base_url = os.getenv("DEMO_ENGINE_BASE_URL", "http://localhost:3001").rstrip("/")
    for hl in hot_leads:
        chosen = "Modern"
        for ev in hl.events or []:
            if ev.design_chosen:
                chosen = ev.design_chosen.title()
                break
        draft = (
            f"[Closer Agent Draft] Namaste {hl.doctor_name or 'Doctor'} Ji, noticed you checked out the "
            f"{chosen} website preview for {hl.name}! Should I lock this layout for your clinic's domain?"
        )
        hl.next_action = f"Send Closer follow-up on {chosen} layout"
        hl.what_changed_summary = draft
        drafted_followups += 1
        _emit(f"[CLOSER] Auto-drafted hot-viewer follow-up for '{hl.name}' (viewed {chosen} design)")
        closer_structured_items.append(
            {
                "id": hl.id,
                "name": hl.name,
                "slug": hl.slug,
                "doctor": hl.doctor_name or "Doctor",
                "locality": hl.locality,
                "phone": hl.primary_phone or "",
                "fit_score": hl.intent_score,
                "source_tier": f"Hot Viewer ({chosen} layout)",
                "demo_url": f"{base_url}/demo/{hl.slug}",
                "http_200": True,
            }
        )

    _emit(f"[CLOSER] Finished {ch.upper()} run & drafted {drafted_followups} hot-viewer follow-ups.")

    structured_closer = {
        "_structured": {
            "tiers_used": [f"Closer {ch.upper()} ({'Dry-Run' if dry_run else 'LIVE'})", "Hot-Viewer Follow-Up Drafter"],
            "built_leads": closer_structured_items,
            "dropped_items": [],
        }
    }

    run_log = RunLog(
        hustle_id=hustle.id,
        job_type=f"closer_agent_{ch}_{'dry_run' if dry_run else 'live'}",
        status="succeeded",
        count_found=len(hot_leads) + 3,
        count_passed=drafted_followups + (3 if dispatch_lines else 0),
        count_dropped=0,
        drop_reasons=structured_closer,
        errors=[],
        trace_logs=trace,
        started_at=started_at,
        finished_at=datetime.now(timezone.utc),
    )
    db.add(run_log)
    db.commit()
    db.refresh(run_log)

    return {
        "agent": "closer",
        "run_id": run_log.id,
        "channel": ch,
        "dry_run": dry_run,
        "clinic_id": clinic_id,
        "batch_id": target_batch_id,
        "drafted_hot_followups": drafted_followups,
        "dispatch_log": dispatch_output,
        "trace_logs": trace,
    }
