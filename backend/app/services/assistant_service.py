import json
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import NotFoundError, UnprocessableEntityError
from app.models.entities import (
    AvailabilityDay,
    Hustle,
    Lead,
    Message,
    ProblemReport,
    RunLog,
    Stage,
)
from app.repositories.hustle_repo import HustleRepository
from app.schemas.hustle import ProblemReportCreate, TelegramCommandRequest
from app.services.event_bus import emit_terminal_log
from app.utils.safety import compute_stock_plan

ASSISTANT_UNDO_STACK: List[Dict[str, Any]] = []


class AssistantService:
    @staticmethod
    def handle_telegram_command(db: Session, payload: TelegramCommandRequest) -> Dict[str, Any]:
        cmd = payload.command_text.strip()
        today_str = datetime.now(timezone.utc).date().isoformat()
        hustle = db.query(Hustle).order_by(Hustle.id).first()

        if cmd.startswith("/off"):
            parts = cmd.replace("/off", "").strip()
            target_date = parts.split()[0] if parts and re.match(r"\d{4}-\d{2}-\d{2}", parts.split()[0]) else today_str
            row = db.query(AvailabilityDay).filter(AvailabilityDay.date_str == target_date).first()
            if not row:
                row = AvailabilityDay(
                    date_str=target_date,
                    mode="off",
                    note=f"Set via Telegram: {cmd}",
                    source="telegram",
                )
                db.add(row)
            else:
                row.mode = "off"
                row.note = f"Set via Telegram: {cmd}"
            db.commit()
            plan = compute_stock_plan(db, hustle) if hustle else {}
            return {
                "reply": f"Day mode set to OFF for {target_date}. Overdue follow-ups will be spread safely across your next normal days. Required stock buffer is now {plan.get('required_ready_packages', 0)} packages."
            }

        if cmd.startswith("/away"):
            row = db.query(AvailabilityDay).filter(AvailabilityDay.date_str == today_str).first()
            if not row:
                row = AvailabilityDay(
                    date_str=today_str,
                    mode="away",
                    note="Away mode via Telegram",
                    source="telegram",
                )
                db.add(row)
            else:
                row.mode = "away"
            db.commit()
            return {"reply": f"Day mode set to AWAY for {today_str} (laptop on, autopilot refilling buffer)."}

        if cmd.startswith("/normal"):
            row = db.query(AvailabilityDay).filter(AvailabilityDay.date_str == today_str).first()
            if row:
                row.mode = "normal"
                db.commit()
            return {"reply": f"Day mode restored to NORMAL for {today_str}."}

        if cmd.startswith("/stock") and hustle:
            plan = compute_stock_plan(db, hustle)
            return {
                "reply": f"Stock Report ({hustle.name}): {plan['current_ready_packages']} ready / {plan['required_ready_packages']} required ({plan['effective_buffer_days']} buffer days). Shortfall: {plan['shortfall']}."
            }

        if cmd.startswith("/log"):
            body = cmd.replace("/log", "", 1).strip()
            lead = db.query(Lead).filter(Lead.is_archived == False).order_by(Lead.updated_at.desc()).first()  # noqa: E712
            if not lead:
                return {"reply": "No active lead found to attach log."}
            db.add(
                Message(
                    lead_id=lead.id,
                    channel="telegram_log",
                    direction="internal_note",
                    text=body or "Quick log from Telegram",
                )
            )
            db.commit()
            return {"reply": f"Logged note onto '{lead.name}': {body}"}

        return {"reply": "Available commands: /off [YYYY-MM-DD], /away, /normal, /stock, /log <note>"}

    @staticmethod
    def create_problem_report(db: Session, payload: ProblemReportCreate) -> Dict[str, Any]:
        lead_snapshot = None
        if payload.lead_id:
            lead = db.query(Lead).filter(Lead.id == payload.lead_id).first()
            if lead:
                lead_snapshot = {
                    "id": lead.id,
                    "slug": lead.slug,
                    "stage_id": lead.stage_id,
                    "fit_score": lead.fit_score,
                    "intent_score": lead.intent_score,
                    "quoted_messages_data_only": [
                        {"direction": m.direction, "quoted_text": repr(m.text)} for m in lead.messages[-3:]
                    ],
                }

        latest_run = db.query(RunLog).order_by(RunLog.id.desc()).first()
        run_snapshot = None
        if latest_run:
            run_snapshot = {
                "id": latest_run.id,
                "step_name": latest_run.step_name,
                "count_found": latest_run.count_found,
                "count_passed": latest_run.count_passed,
                "count_dropped": latest_run.count_dropped,
                "errors": latest_run.errors,
            }

        brief = {
            "user_words": payload.user_description,
            "page": payload.page,
            "element": payload.element,
            "lead_context": lead_snapshot,
            "run_trace": run_snapshot,
            "safety_note": "Client message text is included strictly as quoted data, never as agent instructions.",
        }

        report = ProblemReport(
            page=payload.page,
            element=payload.element,
            user_description=payload.user_description,
            lead_id=payload.lead_id,
            run_id=payload.run_id or (latest_run.id if latest_run else None),
            context_brief=brief,
        )
        db.add(report)
        db.commit()
        db.refresh(report)

        emit_terminal_log("PROBLEM-REPORT", f"Captured issue on [{payload.page}]: {payload.user_description[:60]}")
        return {
            "report_id": report.id,
            "status": "captured",
            "debug_context_brief": json.dumps(brief),
        }

    @staticmethod
    def ask_or_do(db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
        mode = str(payload.get("mode") or "ask").lower().strip()
        prompt = str(payload.get("prompt") or "").strip()
        hustle_id = int(payload.get("hustle_id") or 1)
        if not prompt:
            raise UnprocessableEntityError("prompt is required.")

        hustle = HustleRepository.get_by_id(db, hustle_id)
        leads = (
            db.query(Lead)
            .options(joinedload(Lead.stage_rel), joinedload(Lead.events), joinedload(Lead.commitments))
            .filter(Lead.hustle_id == hustle_id, Lead.is_archived == False)  # noqa: E712
            .all()
        )
        low = prompt.lower()

        if mode == "do":
            m_limit = re.search(r"(?:limit|cap).*?(\d+)", low)
            if m_limit and hustle:
                new_limit = int(m_limit.group(1))
                ch = "instagram" if "insta" in low or "ig" in low else ("email" if "email" in low else "whatsapp")
                old_limits = dict(hustle.channel_limits or {})
                undo_id = len(ASSISTANT_UNDO_STACK) + 1
                ASSISTANT_UNDO_STACK.append(
                    {"undo_id": undo_id, "type": "hustle_limits", "hustle_id": hustle.id, "old_limits": old_limits}
                )
                updated_limits = dict(old_limits)
                updated_limits[ch] = new_limit
                hustle.channel_limits = updated_limits
                db.commit()
                emit_terminal_log("AI-DO", f"Updated {ch.upper()} daily limit -> {new_limit}/day (Undo #{undo_id})")
                return {
                    "mode": "do",
                    "reply": f"Updated {ch.upper()} daily send limit to {new_limit}/day.",
                    "undo_id": undo_id,
                    "matched_leads": [],
                }

            if (
                ("autopilot" in low or "copilot" in low)
                and hustle
                and any(w in low for w in ["switch", "set", "mode", "turn"])
            ):
                new_mode = "autopilot" if "autopilot" in low else "copilot"
                old_mode = hustle.autonomy_mode
                undo_id = len(ASSISTANT_UNDO_STACK) + 1
                ASSISTANT_UNDO_STACK.append(
                    {"undo_id": undo_id, "type": "autonomy_mode", "hustle_id": hustle.id, "old_mode": old_mode}
                )
                hustle.autonomy_mode = new_mode
                db.commit()
                emit_terminal_log("AI-DO", f"Switched Hustle autonomy mode -> {new_mode.upper()} (Undo #{undo_id})")
                return {
                    "mode": "do",
                    "reply": f"Switched '{hustle.name}' autonomy mode from {old_mode.upper()} to {new_mode.upper()}.",
                    "undo_id": undo_id,
                    "matched_leads": [],
                }

            target_lead: Optional[Lead] = None
            for l in leads:
                short_n = re.split(r"[-|:]", l.name)[0].strip().lower()
                if short_n and short_n in low:
                    target_lead = l
                    break
                for word in short_n.split():
                    if len(word) >= 4 and word not in ("dental", "clinic", "care", "doctor", "dr") and word in low:
                        target_lead = l
                        break
                if target_lead:
                    break

            if not target_lead and leads:
                target_lead = leads[0]

            if target_lead:
                old_stage_id = target_lead.stage_id
                old_next_action = target_lead.next_action
                old_due = target_lead.next_action_due_at

                stages = db.query(Stage).filter(Stage.hustle_id == hustle_id).all()
                matched_stage: Optional[Stage] = None
                for st in stages:
                    if st.slug.replace("_", " ") in low or st.name.lower() in low or st.slug in low:
                        matched_stage = st
                        break
                if not matched_stage:
                    if "replied" in low or "warm" in low:
                        matched_stage = next((s for s in stages if s.slug == "replied"), None)
                    elif "viewed" in low or "hot" in low:
                        matched_stage = next((s for s in stages if s.slug == "viewed_demo"), None)
                    elif "contacted" in low or "sent" in low:
                        matched_stage = next((s for s in stages if s.slug == "contacted"), None)
                    elif "won" in low:
                        matched_stage = next((s for s in stages if s.is_won), None)

                m_days = re.search(r"(\d+)\s*day", low)
                snooze_days = int(m_days.group(1)) if m_days else (1 if "tomorrow" in low else 0)

                undo_id = len(ASSISTANT_UNDO_STACK) + 1
                ASSISTANT_UNDO_STACK.append(
                    {
                        "undo_id": undo_id,
                        "type": "lead_mutation",
                        "lead_id": target_lead.id,
                        "old_stage_id": old_stage_id,
                        "old_next_action": old_next_action,
                        "old_due": old_due,
                    }
                )

                changes_desc: List[str] = []
                if matched_stage:
                    target_lead.stage_id = matched_stage.id
                    changes_desc.append(f"moved to stage '{matched_stage.name}'")
                if snooze_days > 0:
                    new_due = datetime.now(timezone.utc) + timedelta(days=snooze_days)
                    target_lead.next_action_due_at = new_due
                    target_lead.next_action = f"Follow up after {snooze_days}d snooze"
                    changes_desc.append(f"snoozed for {snooze_days} days")
                if not changes_desc:
                    target_lead.next_action = prompt
                    target_lead.next_action_due_at = datetime.now(timezone.utc) + timedelta(days=1)
                    changes_desc.append(f"updated next step to '{prompt}'")

                target_lead.what_changed_summary = f"AI Do: {', '.join(changes_desc)}."
                db.commit()
                emit_terminal_log("AI-DO", f"Updated '{target_lead.name}': {', '.join(changes_desc)} (Undo #{undo_id})")
                return {
                    "mode": "do",
                    "reply": f"Done! '{target_lead.name}' {', '.join(changes_desc)}.",
                    "undo_id": undo_id,
                    "matched_leads": [
                        {
                            "id": target_lead.id,
                            "name": target_lead.name,
                            "locality": target_lead.locality,
                            "stage": matched_stage.name
                            if matched_stage
                            else (target_lead.stage_rel.name if target_lead.stage_rel else ""),
                            "fit_score": target_lead.fit_score,
                            "intent_score": target_lead.intent_score,
                        }
                    ],
                }

        matched: List[Lead] = []
        if "warm" in low or "modern" in low or "premium" in low:
            design_q = "warm" if "warm" in low else ("premium" if "premium" in low else "modern")
            matched = [l for l in leads if any((e.design_chosen or "").lower() == design_q for e in (l.events or []))]
            if not matched:
                matched = [l for l in leads if l.intent_score > 0]
        elif "hot" in low or "view" in low or "intent" in low:
            matched = sorted(
                [l for l in leads if l.intent_score > 0 or (l.events and len(l.events) > 0)],
                key=lambda x: x.intent_score,
                reverse=True,
            )
        elif "ready" in low or "review" in low or "stock" in low:
            matched = [l for l in leads if l.stage_rel and l.stage_rel.slug == "package_ready"]
        elif "replied" in low:
            matched = [l for l in leads if l.stage_rel and l.stage_rel.slug == "replied"]
        else:
            keywords = [
                w
                for w in re.findall(r"[a-z0-9]+", low)
                if len(w) >= 3
                and w not in ("which", "show", "leads", "clinics", "the", "with", "what", "who", "are", "all", "for")
            ]
            if keywords:
                matched = [
                    l for l in leads if any(kw in f"{l.name} {l.locality} {l.doctor_name}".lower() for kw in keywords)
                ]
            if not matched:
                matched = sorted(leads, key=lambda x: x.intent_score + x.fit_score, reverse=True)[:5]

        plan = compute_stock_plan(db, hustle) if hustle else {}
        reply_text = (
            f"Found {len(matched)} matching clinic(s) out of {len(leads)} active leads in '{hustle.name if hustle else 'Pipeline'}'. "
            f"Current Ready Buffer: {plan.get('current_ready_packages', 0)}/{plan.get('required_ready_packages', 0)} packages."
        )

        return {
            "mode": "ask",
            "reply": reply_text,
            "undo_id": None,
            "matched_leads": [
                {
                    "id": l.id,
                    "name": l.name,
                    "doctor_name": l.doctor_name,
                    "locality": l.locality,
                    "stage": l.stage_rel.name if l.stage_rel else "",
                    "fit_score": l.fit_score,
                    "intent_score": l.intent_score,
                    "next_action": l.next_action,
                }
                for l in matched[:6]
            ],
        }

    @staticmethod
    def undo_last_action(db: Session, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        if not ASSISTANT_UNDO_STACK:
            raise NotFoundError("No assistant actions to undo.")

        target_id = (payload or {}).get("undo_id")
        item = None
        if target_id:
            for idx, entry in enumerate(ASSISTANT_UNDO_STACK):
                if entry["undo_id"] == target_id:
                    item = ASSISTANT_UNDO_STACK.pop(idx)
                    break
        if not item:
            item = ASSISTANT_UNDO_STACK.pop()

        if item["type"] == "hustle_limits":
            h = HustleRepository.get_by_id(db, item["hustle_id"])
            if h:
                h.channel_limits = item["old_limits"]
                db.commit()
                return {"status": "undone", "message": "Reverted channel daily limits."}

        if item["type"] == "autonomy_mode":
            h = HustleRepository.get_by_id(db, item["hustle_id"])
            if h:
                h.autonomy_mode = item["old_mode"]
                db.commit()
                return {"status": "undone", "message": f"Reverted autonomy mode back to {item['old_mode'].upper()}."}

        if item["type"] == "lead_mutation":
            l = db.query(Lead).filter(Lead.id == item["lead_id"]).first()
            if l:
                l.stage_id = item["old_stage_id"]
                l.next_action = item["old_next_action"]
                l.next_action_due_at = item["old_due"]
                db.commit()
                return {"status": "undone", "message": f"Reverted changes on '{l.name}'."}

        return {"status": "undone", "message": "Action reverted."}
