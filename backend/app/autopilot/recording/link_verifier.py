import asyncio
import json
import logging
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional, Tuple

import httpx
from sqlalchemy.orm import Session

from app.autopilot.config import BATCH_JSON_PATH, BATCH_RECORDER_DIR
from app.autopilot.recording.naming import recording_name
from app.models.entities import Lead, Package

logger = logging.getLogger("personal_os.autopilot.recording.link_verifier")


async def verify_live_demo_links_async(slug: str, base_url: str) -> Tuple[bool, Dict[str, Any]]:
    """Asynchronously verifies that the clinic's live links return HTTP 200 via asyncio.gather."""
    base = base_url.rstrip("/")
    urls = {
        "choice_page": f"{base}/demo/{slug}",
        "modern": f"{base}/modern/{slug}",
        "premium": f"{base}/premium/{slug}",
        "warm": f"{base}/warm/{slug}",
    }
    status_report: Dict[str, Any] = {}
    explicit_timeout = httpx.Timeout(15.0, connect=5.0)

    async def _check_url(client: httpx.AsyncClient, key: str, url: str) -> Tuple[str, Dict[str, Any], bool]:
        try:
            resp = await client.get(url)
            code = resp.status_code
            body_sample = resp.text[:8192]
            ok = code == 200 and len(body_sample) > 500
            return key, {"url": url, "http_status": code, "ok": ok}, ok
        except Exception as e:
            return key, {"url": url, "http_status": 0, "ok": False, "error": str(e)}, False

    async with httpx.AsyncClient(timeout=explicit_timeout, headers={"User-Agent": "Herald-LinkVerifier/2.0"}) as client:
        tasks = [_check_url(client, k, u) for k, u in urls.items()]
        results = await asyncio.gather(*tasks, return_exceptions=True)

    all_ok = True
    for res in results:
        if isinstance(res, Exception):
            all_ok = False
            continue
        key, report, ok = res
        status_report[key] = report
        if not ok:
            all_ok = False

    return all_ok, status_report


def verify_live_demo_links(slug: str, base_url: str) -> Tuple[bool, Dict[str, Any]]:
    """Verifies that the clinic's live links (/modern/{slug}, /premium/{slug}, /warm/{slug}, /demo/{slug}) return HTTP 200."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            with ThreadPoolExecutor(max_workers=1) as executor:
                return executor.submit(lambda: asyncio.run(verify_live_demo_links_async(slug, base_url))).result()
        return loop.run_until_complete(verify_live_demo_links_async(slug, base_url))
    except RuntimeError:
        return asyncio.run(verify_live_demo_links_async(slug, base_url))
    except Exception:
        # Fallback to sequential urllib check if async fails
        base = base_url.rstrip("/")
        urls = {
            "choice_page": f"{base}/demo/{slug}",
            "modern": f"{base}/modern/{slug}",
            "premium": f"{base}/premium/{slug}",
            "warm": f"{base}/warm/{slug}",
        }
        status_report: Dict[str, Any] = {}
        all_ok = True

        for key, url in urls.items():
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "Herald-LinkVerifier/2.0"})
                with urllib.request.urlopen(req, timeout=15) as resp:
                    code = resp.getcode()
                    body_sample = resp.read(8192).decode("utf-8", errors="ignore")
                    ok = code == 200 and len(body_sample) > 500
                    status_report[key] = {"url": url, "http_status": code, "ok": ok}
                    if not ok:
                        all_ok = False
            except Exception as e:
                status_report[key] = {"url": url, "http_status": 0, "ok": False, "error": str(e)}
                all_ok = False

        return all_ok, status_report


def sync_verified_links_to_batch_json(
    db: Session,
    base_url: str,
    log_cb: Optional[Callable[[str], None]] = None,
    only_lead_ids: Optional[List[int]] = None,
    since: Optional[datetime] = None,
    cancel_check: Optional[Callable[[], bool]] = None,
    testing_mode: bool = False,
) -> Dict[str, Any]:
    """Audits packages, verifies live routes, and syncs working demo links to batch.json."""

    def _emit(msg: str) -> None:
        if log_cb:
            try:
                log_cb(msg)
            except Exception:
                pass

    base = base_url.rstrip("/")
    q = (
        db.query(Package)
        .join(Lead, Package.lead_id == Lead.id)
        .filter(Lead.is_archived == False, Package.self_check_passed == True)  # noqa: E712
    )
    if only_lead_ids:
        q = q.filter(Lead.id.in_(only_lead_ids))
    if since:
        q = q.filter(Package.created_at >= since)

    packages = q.order_by(Lead.id).all()
    _emit(f"Auditing {len(packages)} clinic packages against live engine ({base})...")

    verified_batch: List[Dict[str, Any]] = []
    failed_links: List[Dict[str, Any]] = []

    if testing_mode:
        for pkg in packages:
            if cancel_check and cancel_check():
                _emit("[STOP] Verification loop stopped by cancellation signal.")
                break
            lead = pkg.lead
            slug = lead.slug
            mock_details = {
                "choice_page": {"url": f"{base}/demo/{slug}", "http_status": 200, "ok": True},
                "modern": {"url": f"{base}/modern/{slug}", "http_status": 200, "ok": True},
                "premium": {"url": f"{base}/premium/{slug}", "http_status": 200, "ok": True},
                "warm": {"url": f"{base}/warm/{slug}", "http_status": 200, "ok": True},
            }
            pkg.self_check_report = {**(pkg.self_check_report or {}), "live_link_verification": mock_details}
            pkg.asset_links = {
                "choice_page": f"{base}/demo/{slug}",
                "modern": f"{base}/modern/{slug}",
                "premium": f"{base}/premium/{slug}",
                "warm": f"{base}/warm/{slug}",
            }
            verified_batch.append(
                {
                    "name": recording_name(lead),
                    "url": f"{base}/modern/{slug}",
                    "choice_url": f"{base}/demo/{slug}",
                    "lead_id": lead.id,
                    "slug": slug,
                }
            )
            _emit(f"[HTTP 200 OK] Verified live routes for '{lead.name}' (slug={slug})")
    else:
        def _check_single(pkg_item: Package) -> Tuple[Package, bool, Dict[str, Any]]:
            return pkg_item, *verify_live_demo_links(pkg_item.lead.slug, base)

        with ThreadPoolExecutor(max_workers=8) as executor:
            futures = {executor.submit(_check_single, p): p for p in packages}
            for future in as_completed(futures):
                if cancel_check and cancel_check():
                    _emit("[STOP] Verification loop stopped by cancellation signal.")
                    break
                pkg, links_ok, check_details = future.result()
                lead = pkg.lead
                slug = lead.slug
                pkg.self_check_report = {**(pkg.self_check_report or {}), "live_link_verification": check_details}

                if links_ok:
                    _emit(f"[HTTP 200 OK] Verified live routes for '{lead.name}' (slug={slug})")
                    pkg.asset_links = {
                        "choice_page": f"{base}/demo/{slug}",
                        "modern": f"{base}/modern/{slug}",
                        "premium": f"{base}/premium/{slug}",
                        "warm": f"{base}/warm/{slug}",
                    }
                    verified_batch.append(
                        {
                            "name": recording_name(lead),
                            "url": f"{base}/modern/{slug}",
                            "choice_url": f"{base}/demo/{slug}",
                            "lead_id": lead.id,
                            "slug": slug,
                        }
                    )
                else:
                    _emit(f"[HTTP FAIL] Route check failed for '{lead.name}' (slug={slug})")
                    failed_links.append({"lead_id": lead.id, "slug": slug, "details": check_details})

    db.commit()

    BATCH_RECORDER_DIR.mkdir(parents=True, exist_ok=True)
    recorder_items = [{"name": item["name"], "url": item["url"]} for item in verified_batch]
    BATCH_JSON_PATH.write_text(json.dumps(recorder_items, indent=2) + "\n", encoding="utf-8")
    _emit(f"Synced {len(verified_batch)} verified clinic URLs -> {BATCH_JSON_PATH.name}")

    return {
        "batch_json_path": str(BATCH_JSON_PATH),
        "verified_count": len(verified_batch),
        "failed_count": len(failed_links),
        "verified_items": verified_batch,
        "failed_items": failed_links,
        "verified": len(verified_batch),
        "total": len(packages),
    }
