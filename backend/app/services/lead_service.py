import csv
import io
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import MethodNotAllowedError, NotFoundError, UnprocessableEntityError
from app.models.entities import (
    Commitment,
    Lead,
    LeadFact,
    Message,
    Objection,
    OutboxItem,
    Package,
    Stage,
    TrackingEvent,
)
from app.repositories.hustle_repo import HustleRepository
from app.repositories.lead_repo import LeadRepository
from app.schemas.lead import CompleteTaskRequest, LeadCreate, LeadUpdate
from app.services.event_bus import broadcast_sse, emit_terminal_log
from app.utils.safety import (
    assert_active_lead_has_next_step,
    assert_no_duplicate_contact,
    compute_fit_score,
    parse_promises_and_snoozes,
)
from app.utils.slug import slugify


class LeadService:
    @staticmethod
    def list_leads(
        db: Session,
        hustle_id: Optional[int] = None,
        stage_slug: Optional[str] = None,
        smart_view: Optional[str] = None,
        include_archived: bool = False,
        search: Optional[str] = None,
        status: Optional[str] = None,
    ) -> List[Lead]:
        return LeadRepository.list_leads(
            db=db,
            hustle_id=hustle_id,
            stage_slug=stage_slug,
            smart_view=smart_view,
            include_archived=include_archived,
            search=search,
            status=status,
        )

    @staticmethod
    def get_lead(db: Session, lead_id: int) -> Lead:
        lead = LeadRepository.get_by_id(db, lead_id)
        if not lead:
            raise NotFoundError("Lead not found.")
        return lead

    @staticmethod
    def create_lead(db: Session, payload: LeadCreate) -> Lead:
        hustle = HustleRepository.get_by_id(db, payload.hustle_id)
        if not hustle:
            raise NotFoundError("Hustle not found.")

        if payload.stage_id:
            stage = db.query(Stage).filter(Stage.id == payload.stage_id, Stage.hustle_id == hustle.id).first()
        else:
            stage = HustleRepository.get_first_stage(db, hustle.id)
        if not stage:
            raise UnprocessableEntityError("Valid stage not found for hustle.")

        assert_active_lead_has_next_step(
            stage=stage,
            is_archived=False,
            next_action=payload.next_action,
            next_action_due_at=payload.next_action_due_at,
        )

        norm_phone, norm_ig = assert_no_duplicate_contact(
            db=db,
            primary_phone=payload.primary_phone,
            instagram_handle=payload.instagram_handle,
        )

        base_slug = payload.slug or slugify(f"{payload.name}-{payload.locality}")
        slug = base_slug
        counter = 2
        while LeadRepository.get_by_slug(db, slug):
            slug = f"{base_slug}-{counter}"
            counter += 1

        lead = Lead(
            hustle_id=hustle.id,
            stage_id=stage.id,
            slug=slug,
            name=payload.name.strip(),
            doctor_name=payload.doctor_name.strip(),
            locality=payload.locality.strip(),
            city=payload.city.strip(),
            address=payload.address.strip(),
            primary_phone=norm_phone,
            phones=[norm_phone] if norm_phone else [],
            email=payload.email.strip() if payload.email else None,
            instagram_handle=norm_ig,
            preferred_channel=payload.preferred_channel,
            next_action=payload.next_action.strip() if payload.next_action else None,
            next_action_due_at=payload.next_action_due_at,
            custom_fields=payload.custom_fields,
            ai_fields=payload.ai_fields,
            deal_value_inr=payload.deal_value_inr,
            what_changed_summary="Lead created manually in CRM.",
        )
        LeadRepository.create(db, lead)

        fact_objs = []
        for f in payload.facts:
            fo = LeadFact(
                lead_id=lead.id,
                field=f.field,
                value=f.value,
                source=f.source,
                confidence=f.confidence,
                verified_by_two_sources=f.verified_by_two_sources,
            )
            fact_objs.append(fo)
        LeadRepository.add_facts(db, fact_objs)

        fit, fit_reasons = compute_fit_score(
            fact_objs,
            bool(lead.doctor_name),
            bool(lead.primary_phone),
            bool(lead.instagram_handle),
            lead.ai_fields or {},
        )
        lead.fit_score = fit
        lead.fit_reasons = fit_reasons

        db.commit()
        db.refresh(lead)
        broadcast_sse("lead_created", {"lead_id": lead.id, "name": lead.name})
        return lead

    @staticmethod
    def update_lead(db: Session, lead_id: int, payload: LeadUpdate) -> Lead:
        lead = LeadService.get_lead(db, lead_id)
        data = payload.model_dump(exclude_unset=True)

        new_phone = data.get("primary_phone", lead.primary_phone)
        new_ig = data.get("instagram_handle", lead.instagram_handle)
        norm_phone, norm_ig = assert_no_duplicate_contact(
            db=db,
            primary_phone=new_phone,
            instagram_handle=new_ig,
            exclude_lead_id=lead.id,
        )
        if "primary_phone" in data:
            data["primary_phone"] = norm_phone
        if "instagram_handle" in data:
            data["instagram_handle"] = norm_ig

        target_stage_id = data.get("stage_id", lead.stage_id)
        target_stage = db.query(Stage).filter(Stage.id == target_stage_id).first()
        if not target_stage:
            raise UnprocessableEntityError("Target stage not found.")

        target_next_action = data.get("next_action", lead.next_action)
        target_due_at = data.get("next_action_due_at", lead.next_action_due_at)

        assert_active_lead_has_next_step(
            stage=target_stage,
            is_archived=lead.is_archived,
            next_action=target_next_action,
            next_action_due_at=target_due_at,
        )

        for k, v in data.items():
            setattr(lead, k, v)

        if lead.do_not_contact:
            for item in lead.outbox_items:
                if item.status in ("pending_approval", "queued"):
                    item.status = "blocked"
                    item.error_message = "Cancelled due to Do-Not-Contact flag."

        fit, fit_reasons = compute_fit_score(
            lead.facts,
            bool(lead.doctor_name),
            bool(lead.primary_phone),
            bool(lead.instagram_handle),
            lead.ai_fields or {},
        )
        lead.fit_score = fit
        lead.fit_reasons = fit_reasons

        db.commit()
        db.refresh(lead)
        broadcast_sse("lead_updated", {"lead_id": lead.id, "stage_id": lead.stage_id})
        return lead

    @staticmethod
    def complete_task(db: Session, lead_id: int, payload: CompleteTaskRequest) -> Lead:
        lead = LeadService.get_lead(db, lead_id)
        previous_task = lead.next_action or "Task"
        target_stage = lead.stage_rel

        if payload.move_to_stage_id:
            target_stage = db.query(Stage).filter(Stage.id == payload.move_to_stage_id).first()
            if not target_stage:
                raise UnprocessableEntityError("Target stage not found.")
            lead.stage_id = target_stage.id

        if payload.archive:
            lead.is_archived = True
            lead.archive_reason = payload.archive_reason or "Archived on task completion"

        assert_active_lead_has_next_step(
            stage=target_stage,
            is_archived=lead.is_archived,
            next_action=payload.next_action,
            next_action_due_at=payload.next_action_due_at,
        )

        note_text = f"Completed task: '{previous_task}'."
        if payload.completed_note:
            note_text += f" Note: {payload.completed_note}"
        if payload.next_action:
            note_text += f" -> Next step set: '{payload.next_action}'."

        LeadRepository.add_internal_note(db, lead.id, note_text)

        lead.next_action = payload.next_action
        lead.next_action_due_at = payload.next_action_due_at
        lead.what_changed_summary = note_text

        db.commit()
        db.refresh(lead)
        broadcast_sse("task_completed", {"lead_id": lead.id, "next_action": lead.next_action})
        return lead

    @staticmethod
    def delete_lead_blocked() -> None:
        raise MethodNotAllowedError("Leads are never deleted in Personal OS. Use POST /api/leads/{id}/archive instead.")

    @staticmethod
    def archive_lead(db: Session, lead_id: int, reason: str = "Archived by user") -> Lead:
        lead = LeadService.get_lead(db, lead_id)
        lead.is_archived = True
        lead.archive_reason = reason
        LeadRepository.add_internal_note(db, lead.id, f"Lead archived: {reason}")
        db.commit()
        db.refresh(lead)
        return lead

    @staticmethod
    def export_csv(db: Session, hustle_id: Optional[int] = None) -> io.StringIO:
        q = db.query(Lead).options(joinedload(Lead.stage_rel))
        if hustle_id is not None:
            q = q.filter(Lead.hustle_id == hustle_id)
        leads = q.order_by(Lead.id).all()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(
            [
                "ID",
                "Slug",
                "Name",
                "Doctor Name",
                "Locality",
                "City",
                "Stage",
                "Fit Score",
                "Intent Score",
                "Primary Phone",
                "Instagram",
                "Next Action",
                "Next Action Due",
                "Is Archived",
                "Do Not Contact",
            ]
        )
        for l in leads:
            writer.writerow(
                [
                    l.id,
                    l.slug,
                    l.name,
                    l.doctor_name,
                    l.locality,
                    l.city,
                    l.stage_rel.name if l.stage_rel else "",
                    l.fit_score,
                    l.intent_score,
                    l.primary_phone,
                    l.instagram_handle,
                    l.next_action,
                    l.next_action_due_at.isoformat() if l.next_action_due_at else "",
                    l.is_archived,
                    l.do_not_contact,
                ]
            )
        output.seek(0)
        return output

    @staticmethod
    def get_reply_copilot(db: Session, lead_id: int) -> Dict[str, Any]:
        lead = LeadService.get_lead(db, lead_id)
        preferred_design = "Modern"
        for e in lead.events:
            if e.design_chosen:
                preferred_design = e.design_chosen.title()
                break

        doctor = lead.doctor_name or "Doctor"
        clinic = lead.name
        followup_day = (datetime.now(timezone.utc) + timedelta(days=3)).strftime("%A")

        objections = db.query(Objection).filter(Objection.hustle_id == lead.hustle_id).all()
        suggestions = []
        for obj in objections:
            for rep in obj.best_replies or []:
                rendered = (
                    rep["text"]
                    .replace("{doctor_name}", doctor.replace("Dr.", "").strip())
                    .replace("{clinic_name}", clinic)
                    .replace("{preferred_design}", preferred_design)
                    .replace("{followup_day}", followup_day)
                )
                suggestions.append(
                    {
                        "objection_label": obj.label,
                        "lang": rep.get("lang", "en"),
                        "wins": rep.get("wins", 1),
                        "text": rendered,
                    }
                )

        return {
            "lead_id": lead.id,
            "preferred_design": preferred_design,
            "suggestions": suggestions[:4],
        }

    @staticmethod
    def post_call_draft(db: Session, lead_id: int, payload: Dict[str, Any]) -> Dict[str, Any]:
        lead = db.query(Lead).options(joinedload(Lead.packages)).filter(Lead.id == lead_id).first()
        if not lead:
            raise NotFoundError("Lead not found.")

        call_note = str(payload.get("call_note") or "").strip()
        if not call_note:
            raise UnprocessableEntityError("call_note is required.")

        now = datetime.now(timezone.utc)
        db.add(
            Message(
                lead_id=lead.id,
                channel="phone_call",
                direction="internal_note",
                text=f"[Post-Call Log] {call_note}",
                created_at=now,
            )
        )

        proposals = parse_promises_and_snoozes(lead.id, call_note, "outbound", now)
        for p in proposals:
            p.status = "confirmed"
            db.add(p)

        due_at = (
            proposals[0].due_at
            if proposals
            else (now + timedelta(days=1)).replace(hour=18, minute=0, second=0, microsecond=0)
        )
        next_act = proposals[0].what if proposals else f"Send post-call WhatsApp follow-up ({call_note[:45]})"

        base_url = os.getenv("DEMO_ENGINE_BASE_URL", "http://localhost:3001").rstrip("/")
        demo_url = f"{base_url}/demo/{lead.slug}"
        if lead.packages and lead.packages[-1].asset_links:
            demo_url = lead.packages[-1].asset_links.get("choice_page") or demo_url

        doc = lead.doctor_name or "Doctor"
        chosen = "Modern"
        low_note = call_note.lower()
        if "warm" in low_note:
            chosen = "Warm Family Care"
        elif "premium" in low_note or "luxury" in low_note:
            chosen = "Luxury Implant Studio"

        draft_msg = (
            f"Namaste {doc} Ji, thank you for speaking with me today regarding *{lead.name}* ({lead.locality})!\n\n"
            f"As discussed ({call_note}), here is the direct link to your 3 custom website previews "
            f"(especially the {chosen} layout):\n{demo_url}\n\n"
            f"Shall I connect with you at the scheduled time to finalize your preferred layout?"
        )

        lead.next_action = next_act
        lead.next_action_due_at = due_at
        lead.what_changed_summary = (
            f"Post-call follow-up drafted & task scheduled for {due_at.strftime('%d %b %H:%M')}."
        )
        db.commit()

        emit_terminal_log("POST-CALL-DRAFT", f"Drafted follow-up & locked task for '{lead.name}' -> {next_act}")
        return {
            "lead_id": lead.id,
            "draft_message": draft_msg,
            "next_action": next_act,
            "next_action_due_at": due_at.isoformat(),
            "commitments_created": len(proposals),
        }

    @staticmethod
    def find_lead_recording_path(db: Session, lead_id: int) -> Optional[str]:
        lead = LeadRepository.get_by_id(db, lead_id)
        if not lead:
            raise NotFoundError("Lead not found.")

        # 1. Check Package video_file_path if it exists on disk and is valid
        if lead.packages:
            for pkg in reversed(lead.packages):
                if (
                    pkg.video_file_path
                    and os.path.exists(pkg.video_file_path)
                    and os.path.getsize(pkg.video_file_path) > 1000
                ):
                    return pkg.video_file_path

        # 2. Check DENTAL_RECORDER_DIR recordings
        try:
            import re

            from app.autopilot.config import DENTAL_RECORDER_DIR, PROJECTS_ROOT

            clean_slug = (lead.slug or "").lower().strip()
            safe_name = re.sub(r"[^a-zA-Z0-9._-]+", "-", lead.name or "").strip("-").lower()
            canonical_name = f"Clinic-{lead.id}-{clean_slug}"

            recordings_dir = DENTAL_RECORDER_DIR / "recordings"
            if recordings_dir.exists():
                for ext in [".mp4", ".webm"]:
                    for name_cand in [canonical_name, f"Clinic-{clean_slug}", clean_slug, safe_name]:
                        p = recordings_dir / f"{name_cand}{ext}"
                        if p.exists() and p.stat().st_size > 1000:
                            return str(p)

                for p in recordings_dir.glob("*.mp4"):
                    p_lower = p.stem.lower()
                    if (
                        (clean_slug and clean_slug in p_lower)
                        or (safe_name and safe_name in p_lower)
                    ) and p.stat().st_size > 1000:
                        return str(p)

            # 3. Check PROJECTS_ROOT / Dental-Clinic-Clients (strictly require slug match to avoid cross-batch collision)
            clients_dir = PROJECTS_ROOT / "Dental-Clinic-Clients"
            if clients_dir.exists() and clean_slug:
                for p in clients_dir.glob(f"**/*{clean_slug}*/*.mp4"):
                    if p.exists() and p.stat().st_size > 1000:
                        return str(p)
        except Exception:
            pass

        return None

    @staticmethod
    def get_recording_status(db: Session, lead_id: int) -> Dict[str, Any]:
        path_str = LeadService.find_lead_recording_path(db, lead_id)
        if path_str and os.path.exists(path_str):
            size_mb = round(os.path.getsize(path_str) / (1024 * 1024), 2)
            return {
                "has_recording": True,
                "url": f"/api/leads/{lead_id}/recording",
                "filename": os.path.basename(path_str),
                "size_mb": size_mb,
            }
        return {
            "has_recording": False,
            "url": None,
            "filename": None,
            "size_mb": 0.0,
        }

    @staticmethod
    def wipe_leads(db: Session) -> Dict[str, Any]:
        db.query(TrackingEvent).delete()
        db.query(Commitment).delete()
        db.query(OutboxItem).delete()
        db.query(Message).delete()
        db.query(Package).delete()
        db.query(LeadFact).delete()
        db.query(Lead).delete()
        db.commit()
        broadcast_sse("leads_wiped", {"active_leads": 0})
        return {"status": "clean_slate", "remaining_leads": 0}
