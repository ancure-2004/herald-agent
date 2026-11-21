from datetime import datetime, timezone
from typing import Any, Dict, List

from sqlalchemy.orm import Session, joinedload
from sqlalchemy.orm.attributes import flag_modified

from app.core.exceptions import ConflictError, NotFoundError, UnprocessableEntityError
from app.models.entities import Hustle, Lead, SmartView, Stage
from app.repositories.hustle_repo import HustleRepository
from app.schemas.hustle import AvailabilitySetRequest, HustleCreate, HustleUpdate
from app.services.event_bus import broadcast_sse
from app.utils.safety import compute_stock_plan, get_today_channel_send_count


class HustleService:
    @staticmethod
    def list_hustles(db: Session) -> List[Hustle]:
        return HustleRepository.list_all(db)

    @staticmethod
    def get_hustle(db: Session, hustle_id: int) -> Hustle:
        hustle = HustleRepository.get_by_id(db, hustle_id)
        if not hustle:
            raise NotFoundError("Hustle not found.")
        return hustle

    @staticmethod
    def create_hustle(db: Session, payload: HustleCreate) -> Hustle:
        existing = HustleRepository.get_by_slug(db, payload.slug)
        if existing:
            raise ConflictError(f"Hustle with slug '{payload.slug}' already exists.")

        hustle = Hustle(**payload.model_dump())
        HustleRepository.create(db, hustle)

        default_stages = [
            ("discovered", "1. Discovered & Researching", 1, "slate", False, False),
            ("package_ready", "2. Review Tray (Ready)", 2, "indigo", False, False),
            ("queued", "3. Approved & Outbox", 3, "blue", False, False),
            ("contacted", "4. Pitch Sent", 4, "amber", False, False),
            ("follow_up", "5. Follow-Up", 5, "violet", False, False),
            ("viewed_demo", "6. Viewed Demo", 6, "purple", False, False),
            ("replied", "7. Replied / Warm", 7, "emerald", False, False),
            ("won", "8. Won (Client)", 8, "green", True, False),
            ("lost", "9. Lost / Closed", 9, "rose", False, True),
        ]
        stages = [
            Stage(
                hustle_id=hustle.id,
                slug=s_slug,
                name=s_name,
                order=s_order,
                color=s_color,
                is_won=is_won,
                is_lost=is_lost,
            )
            for s_slug, s_name, s_order, s_color, is_won, is_lost in default_stages
        ]
        HustleRepository.add_stages(db, stages)

        default_views = [
            ("all_active", "All Active Pipeline", "LayoutGrid", {"archived": False}, 1),
            ("review_tray", "Review Tray (Approve & Send)", "CheckCircle2", {"stage_slug": "package_ready"}, 2),
            ("due_today", "Due Today & Overdue", "Clock", {"due": "today_or_overdue"}, 3),
            ("hot_intent", "Hot Demo Viewers", "Flame", {"min_intent": 40}, 4),
            ("archived", "Archived & DNC", "Archive", {"archived": True}, 5),
        ]
        views = [
            SmartView(
                hustle_id=hustle.id,
                slug=v_slug,
                name=v_name,
                icon=v_icon,
                filter_spec=v_spec,
                sort_order=v_order,
                is_pinned=True,
            )
            for v_slug, v_name, v_icon, v_spec, v_order in default_views
        ]
        HustleRepository.add_smart_views(db, views)

        db.commit()
        db.refresh(hustle)
        return hustle

    @staticmethod
    def update_hustle(db: Session, hustle_id: int, payload: HustleUpdate) -> Hustle:
        hustle = HustleService.get_hustle(db, hustle_id)
        update_data = payload.model_dump(exclude_unset=True)

        if "autonomy_mode" in update_data and update_data["autonomy_mode"] not in ("copilot", "autopilot"):
            raise UnprocessableEntityError("autonomy_mode must be 'copilot' or 'autopilot'.")

        for k, v in update_data.items():
            if k == "channel_limits" and v is not None:
                # Merge so partial updates never drop keys such as dry_run / batch_size
                v = {**(hustle.channel_limits or {}), **v}
            setattr(hustle, k, v)
            if k in ("channel_limits", "channel_goals", "pipeline_steps", "allowed_channels"):
                flag_modified(hustle, k)

        db.commit()
        db.refresh(hustle)
        broadcast_sse("hustle_updated", {"hustle_id": hustle.id, "autonomy_mode": hustle.autonomy_mode})
        return hustle

    @staticmethod
    def get_evening_sprint(db: Session, hustle_id: int = 1, budget_minutes: int = 75) -> Dict[str, Any]:
        leads = (
            db.query(Lead)
            .options(joinedload(Lead.stage_rel))
            .filter(
                Lead.hustle_id == hustle_id,
                Lead.is_archived == False,  # noqa: E712
                Lead.do_not_contact == False,  # noqa: E712
            )
            .all()
        )

        scored_items = []
        for l in leads:
            if l.stage_rel and (l.stage_rel.is_won or l.stage_rel.is_lost):
                continue
            stage_slug = l.stage_rel.slug if l.stage_rel else "discovered"
            if stage_slug == "replied":
                est_mins = 8
                close_prob = 0.45 + (l.intent_score / 250.0)
                action_type = "Reply & Close"
            elif stage_slug == "viewed_demo":
                est_mins = 5
                close_prob = 0.25 + (l.intent_score / 300.0)
                action_type = "Hot Viewer Follow-up"
            elif stage_slug == "package_ready":
                est_mins = 4
                close_prob = 0.12 + (l.fit_score / 500.0)
                action_type = "Review & Send Pitch"
            else:
                est_mins = 5
                close_prob = 0.08
                action_type = "Follow-up"

            expected_value_per_min = (close_prob * (l.deal_value_inr or 15000)) / max(1, est_mins)
            scored_items.append(
                {
                    "lead_id": l.id,
                    "lead_name": l.name,
                    "doctor_name": l.doctor_name,
                    "locality": l.locality,
                    "stage": l.stage_rel.name if l.stage_rel else "",
                    "action_type": action_type,
                    "next_action": l.next_action,
                    "estimated_minutes": est_mins,
                    "fit_score": l.fit_score,
                    "intent_score": l.intent_score,
                    "expected_value_inr": round(close_prob * (l.deal_value_inr or 15000)),
                    "priority_score": round(expected_value_per_min, 1),
                }
            )

        scored_items.sort(key=lambda x: x["priority_score"], reverse=True)

        selected = []
        used_minutes = 0
        for item in scored_items:
            if used_minutes + item["estimated_minutes"] <= budget_minutes:
                selected.append(item)
                used_minutes += item["estimated_minutes"]

        return {
            "budget_minutes": budget_minutes,
            "allocated_minutes": used_minutes,
            "total_expected_value_inr": sum(i["expected_value_inr"] for i in selected),
            "tasks": selected,
        }

    @staticmethod
    def get_stock_plan(db: Session, hustle_id: int = 1) -> Dict[str, Any]:
        hustle = HustleService.get_hustle(db, hustle_id)
        plan = compute_stock_plan(db, hustle)
        today_sends = {
            ch: get_today_channel_send_count(db, hustle.id, ch) for ch in (hustle.allowed_channels or ["whatsapp"])
        }
        plan["today_channel_sends"] = today_sends
        plan["channel_limits"] = hustle.channel_limits or {}
        plan["channel_goals"] = hustle.channel_goals or {}
        return plan

    @staticmethod
    def set_availability(db: Session, payload: AvailabilitySetRequest) -> Dict[str, Any]:
        if payload.mode not in ("normal", "away", "off"):
            raise UnprocessableEntityError("mode must be 'normal', 'away', or 'off'.")
        row = HustleRepository.set_availability_day(db, payload.date_str, payload.mode, payload.note)
        broadcast_sse("availability_updated", {"date": payload.date_str, "mode": payload.mode})
        return {"date_str": row.date_str, "mode": row.mode, "note": row.note}

    @staticmethod
    def set_day_mode(db: Session, mode: str) -> Dict[str, Any]:
        today_str = datetime.now(timezone.utc).date().isoformat()
        req = AvailabilitySetRequest(date_str=today_str, mode=mode, note="Updated from Dashboard Day Mode switcher")
        return HustleService.set_availability(db, req)
