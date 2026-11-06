import logging
from typing import Any, Dict, List, Optional, Tuple

from app.autopilot.discovery.localities import Locality
from app.autopilot.discovery.waterfall import CandidateStream
from app.autopilot.research.doctor import extract_doctor_and_degrees
from app.autopilot.research.hours import parse_places_opening_hours
from app.autopilot.runs.context import RunContext
from app.autopilot.runs.stage_build import stage_build
from app.autopilot.runs.stage_recording import stage_recording
from app.autopilot.search.base import WebSearchProvider
from app.autopilot.types import Candidate, ResearchedCandidate, VerifiedCandidate
from app.autopilot.verification.identity import get_existing_db_identities
from app.autopilot.verification.verifier import verify_single_candidate
from app.services.event_bus import emit_pipeline_step

logger = logging.getLogger("personal_os.autopilot.stages")


def stage_discovery(
    ctx: RunContext,
    locality: Locality,
    query: str,
) -> List[Candidate]:
    ctx.emit(f"Step 1/7 [FIND - WATERFALL]: Searching in '{locality.label}' (target={ctx.options.target_count})...")
    emit_pipeline_step(
        node_id="node-1",
        step_name="DISCOVERY",
        status="RUNNING",
        clinic_name=f"Searching: {query}",
        metrics={
            "processed": 0,
            "total": ctx.options.target_count,
            "badge_text": f"Searching ({ctx.options.target_count} target)",
        },
        payload=[],
    )
    stream = CandidateStream(
        query=query,
        locality=locality,
        target_count=ctx.options.target_count,
        db=ctx.db,
        testing_mode=ctx.options.testing_mode,
    )
    candidates: List[Candidate] = []
    max_candidates = max(20, ctx.options.target_count * 4)
    for c in stream:
        if ctx.check_cancelled() or len(candidates) >= max_candidates:
            break
        candidates.append(c)

    emit_pipeline_step(
        node_id="node-1",
        step_name="DISCOVERY",
        status="SUCCESS",
        clinic_name=f"Discovered {len(candidates)} candidate clinics",
        metrics={"processed": len(candidates), "total": len(candidates), "badge_text": f"✓ {len(candidates)} Found"},
        payload=[
            {"name": c.name, "locality": locality.city, "source": c.source_tier, "status": "DISCOVERED"}
            for c in candidates[:15]
        ],
    )
    return candidates


def stage_verification(
    ctx: RunContext,
    candidates: List[Candidate],
    locality: Locality,
    search_provider: Optional[WebSearchProvider],
) -> Tuple[List[VerifiedCandidate], Dict[str, int], List[Dict[str, Any]]]:
    ctx.emit(
        f"Step 2/7 [VERIFICATION]: Probing candidates for no-website & WhatsApp (target={ctx.options.target_count})..."
    )
    emit_pipeline_step(
        node_id="node-2",
        step_name="VERIFICATION",
        status="RUNNING",
        clinic_name="Probing candidates...",
        metrics={
            "processed": 0,
            "total": ctx.options.target_count,
            "badge_text": f"Probing (0/{ctx.options.target_count})",
        },
        payload=[],
    )
    seen_phones, seen_names, _ = get_existing_db_identities(ctx.db, ignore_test_leads=not ctx.options.testing_mode)
    verified: List[VerifiedCandidate] = []
    drop_counts: Dict[str, int] = {}
    dropped_items: List[Dict[str, Any]] = []

    for idx, c in enumerate(candidates, 1):
        if ctx.check_cancelled() or len(verified) >= ctx.options.target_count:
            break
        emit_pipeline_step(
            node_id="node-2",
            step_name="VERIFICATION",
            status="RUNNING",
            clinic_name=c.name,
            metrics={
                "processed": len(verified),
                "total": ctx.options.target_count,
                "badge_text": f"Probing ({idx}/{len(candidates)})",
            },
            payload=[{"clinic": c.name, "status": "PROBING", "source": c.source_tier}],
        )
        res, drop_info = verify_single_candidate(
            candidate=c,
            locality=locality,
            seen_phones=seen_phones,
            seen_names=seen_names,
            search_provider=search_provider,
            db=ctx.db,
            testing_mode=ctx.options.testing_mode,
        )
        if res:
            verified.append(res)
            seen_phones.add(res.ten_digit)
            seen_names.add(res.full_clean_name)
        elif drop_info:
            r = drop_info.get("reason", "unknown")
            drop_counts[r] = drop_counts.get(r, 0) + 1
            dropped_items.append(drop_info)

    emit_pipeline_step(
        node_id="node-2",
        step_name="VERIFICATION",
        status="SUCCESS",
        clinic_name=f"{len(verified)} Clinics Passed Verification",
        metrics={
            "processed": len(verified),
            "total": ctx.options.target_count,
            "badge_text": f"✓ {len(verified)} Verified",
        },
        payload=[
            {"clinic": v.clean_name, "domain": None, "verdict": "PASSED_NO_WEBSITE", "phone": v.norm_phone}
            for v in verified[:15]
        ],
    )
    return verified, drop_counts, dropped_items


def stage_research(
    ctx: RunContext,
    verified_candidates: List[VerifiedCandidate],
) -> List[ResearchedCandidate]:
    ctx.emit(
        f"Step 3/7 [DEEP RESEARCH]: Extracting doctor credentials & facts for {len(verified_candidates)} clinics..."
    )
    emit_pipeline_step(
        node_id="node-3",
        step_name="RESEARCH",
        status="RUNNING",
        clinic_name=f"Enriching {len(verified_candidates)} clinics",
        metrics={
            "processed": 0,
            "total": len(verified_candidates),
            "badge_text": f"0/{len(verified_candidates)} Enriched",
        },
        payload=[],
    )
    researched: List[ResearchedCandidate] = []
    for idx, vc in enumerate(verified_candidates, 1):
        if ctx.check_cancelled():
            break
        emit_pipeline_step(
            node_id="node-3",
            step_name="RESEARCH",
            status="RUNNING",
            clinic_name=vc.clean_name,
            metrics={
                "processed": idx,
                "total": len(verified_candidates),
                "badge_text": f"Enriching ({idx}/{len(verified_candidates)})",
            },
            payload=[],
        )
        doc_name, degrees, doc_source = extract_doctor_and_degrees(
            vc.candidate.name,
            vc.organic_results,
            lead_phone=vc.norm_phone,
            locality=vc.locality,
        )
        hours_obj = parse_places_opening_hours(
            vc.candidate.opening_hours if isinstance(vc.candidate.opening_hours, dict) else None
        )
        rc = ResearchedCandidate(
            verified=vc,
            doc_name=doc_name,
            degrees=degrees,
            doc_source=doc_source,
            hours_obj=hours_obj,
            rating=vc.candidate.rating,
            reviews=vc.candidate.review_count,
        )
        researched.append(rc)
        ctx.emit(
            f"Step 3/7 [RESEARCH]: '{vc.clean_name}' -> Doctor: {doc_name} ({degrees or 'No Degree Claim'}, {doc_source})"
        )

    emit_pipeline_step(
        node_id="node-3",
        step_name="RESEARCH",
        status="SUCCESS",
        clinic_name=f"{len(researched)} Clinics Researched",
        metrics={"processed": len(researched), "total": len(researched), "badge_text": f"✓ {len(researched)} Enriched"},
        payload=[
            {"clinic": r.verified.clean_name, "lead_doctor": r.doc_name, "degrees": r.degrees, "source": r.doc_source}
            for r in researched[:15]
        ],
    )
    return researched


__all__ = [
    "stage_discovery",
    "stage_verification",
    "stage_research",
    "stage_build",
    "stage_recording",
]
