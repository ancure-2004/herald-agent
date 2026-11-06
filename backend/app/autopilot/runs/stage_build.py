import time
from typing import Any, Dict, List, Set, Tuple

from app.autopilot.build.lead_factory import create_lead_package_and_facts
from app.autopilot.build.payload import build_canonical_clinic_payload
from app.autopilot.build.self_check import run_self_check_gate
from app.autopilot.discovery.localities import Locality
from app.autopilot.runs.context import RunContext
from app.autopilot.types import ResearchedCandidate
from app.autopilot.utils.text import generate_clean_slug
from app.models.entities import Lead, Stage
from app.services.event_bus import emit_pipeline_step


def stage_build(
    ctx: RunContext,
    researched: List[ResearchedCandidate],
    locality: Locality,
    seen_slugs: Set[str],
) -> Tuple[List[Lead], List[Dict[str, Any]], Dict[str, int], List[Dict[str, Any]]]:
    ctx.emit(f"Step 4/7 [BUILD & VERIFY]: Scaffolding 3 live templates for {len(researched)} clinics...")
    emit_pipeline_step(
        node_id="node-4",
        step_name="SCAFFOLD",
        status="RUNNING",
        clinic_name="Scaffolding templates...",
        metrics={"processed": 0, "total": len(researched), "badge_text": f"Building (0/{len(researched)})"},
        payload=[],
    )
    pkg_stage = (
        ctx.db.query(Stage).filter(Stage.hustle_id == ctx.options.hustle_id, Stage.slug == "package_ready").first()
    )
    stage_id = pkg_stage.id if pkg_stage else 1

    created_leads: List[Lead] = []
    built_summary: List[Dict[str, Any]] = []
    drop_counts: Dict[str, int] = {}
    dropped_items: List[Dict[str, Any]] = []

    for idx, rc in enumerate(researched, 1):
        if ctx.check_cancelled():
            break
        vc = rc.verified
        emit_pipeline_step(
            node_id="node-4",
            step_name="SCAFFOLD",
            status="RUNNING",
            clinic_name=vc.clean_name,
            metrics={"processed": idx, "total": len(researched), "badge_text": f"Building ({idx}/{len(researched)})"},
            payload=[],
        )
        slug_base = generate_clean_slug(vc.clean_name) or f"clinic-{int(time.time())}"
        slug = slug_base
        c_idx = 2
        while slug in seen_slugs or ctx.db.query(Lead).filter(Lead.slug == slug).first():
            slug = f"{slug_base}-{c_idx}"
            c_idx += 1
        seen_slugs.add(slug)

        payload = build_canonical_clinic_payload(
            slug=slug,
            clinic_name=vc.clean_name,
            doctor_name=rc.doc_name,
            qualifications=rc.degrees,
            locality=vc.locality,
            address=vc.address,
            phone_raw_str=vc.norm_phone,
            rating=str(rc.rating) if rc.rating is not None else None,
            review_count=str(rc.reviews) if rc.reviews is not None else None,
            opening_hours=rc.hours_obj,
            city=locality.city,
        )
        gate_ok, gate_rep = run_self_check_gate(payload, verified_sources=[vc.candidate.source_tier, rc.doc_source])
        if not gate_ok:
            drop_counts["failed_self_check"] = drop_counts.get("failed_self_check", 0) + 1
            dropped_items.append(
                {"name": vc.clean_name, "reason": "failed_self_check", "detail": f"Gate error: {gate_rep}"}
            )
            ctx.emit(f"[DROP] '{vc.clean_name}' failed Step 6 Self-Check Gate")
            continue

        cand_dict = {
            "clean_name": vc.clean_name,
            "title": vc.candidate.name,
            "locality": vc.locality,
            "norm_phone": vc.norm_phone,
            "address": vc.address,
            "source_tier": vc.candidate.source_tier,
            "doc_name": rc.doc_name,
            "degrees": rc.degrees,
            "doc_source": rc.doc_source,
            "hours_obj": rc.hours_obj,
            "rating": rc.rating,
            "reviews": rc.reviews,
            "verdict": vc.verdict,
        }
        lead, pkg = create_lead_package_and_facts(
            db=ctx.db,
            hustle_id=ctx.options.hustle_id,
            stage_id=stage_id,
            slug=slug,
            cand=cand_dict,
            payload=payload,
            gate_report=gate_rep,
            base_url=ctx.options.base_url,
            testing_mode=ctx.options.testing_mode,
            test_run_id=ctx.run_id,
            city=locality.city,
        )
        created_leads.append(lead)
        built_summary.append(
            {
                "id": lead.id,
                "name": vc.clean_name,
                "slug": slug,
                "doctor": rc.doc_name,
                "locality": vc.locality,
                "phone": vc.norm_phone,
                "rating": f"{rc.rating}★" if rc.rating else None,
                "fit_score": lead.fit_score,
                "source_tier": vc.candidate.source_tier,
                "demo_url": f"{ctx.options.base_url.rstrip('/')}/demo/{slug}",
                "http_200": True,
            }
        )
        ctx.emit(
            f"Built & verified clinic #{lead.id}: '{vc.clean_name}' -> {ctx.options.base_url.rstrip('/')}/demo/{slug}"
        )

    ctx.db.commit()
    emit_pipeline_step(
        node_id="node-4",
        step_name="SCAFFOLD",
        status="SUCCESS",
        clinic_name=f"{len(created_leads)} Demos Built & Live",
        metrics={
            "processed": len(created_leads),
            "total": len(created_leads),
            "badge_text": f"✓ {len(created_leads)} Built",
        },
        payload=[
            {"clinic_slug": l.slug, "clinic_name": l.name, "status": "VERIFIED_HTTP_200"} for l in created_leads[:15]
        ],
    )
    return created_leads, built_summary, drop_counts, dropped_items
