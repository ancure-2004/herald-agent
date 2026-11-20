from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.entities import Lead, LeadFact, Message, Stage
from app.services.cache_manager import get_cache_manager


class LeadRepository:
    @staticmethod
    def _lead_load_options():
        return (
            joinedload(Lead.stage_rel),
            selectinload(Lead.facts),
            selectinload(Lead.packages),
            selectinload(Lead.messages),
            selectinload(Lead.events),
            selectinload(Lead.commitments),
            selectinload(Lead.calls),
            selectinload(Lead.outbox_items),
        )

    @staticmethod
    def get_by_id(db: Session, lead_id: int) -> Optional[Lead]:
        return (
            db.query(Lead)
            .options(*LeadRepository._lead_load_options())
            .filter(Lead.id == lead_id)
            .first()
        )

    @staticmethod
    def get_by_ids(db: Session, lead_ids: List[int]) -> Dict[int, Lead]:
        """Batched IN (...) query returning {id: lead} mapped into O(1) lookup dictionary."""
        if not lead_ids:
            return {}
        leads = (
            db.query(Lead)
            .options(*LeadRepository._lead_load_options())
            .filter(Lead.id.in_(lead_ids))
            .all()
        )
        return {l.id: l for l in leads}

    @staticmethod
    def get_by_slug(db: Session, slug: str) -> Optional[Lead]:
        return db.query(Lead).filter(Lead.slug == slug).first()

    @staticmethod
    def count_active(db: Session) -> int:
        cache = get_cache_manager()
        cache_key = "leads:count_active"
        cached = cache.get(cache_key)
        if cached is not None:
            return cached
        count = db.query(Lead).filter(Lead.is_archived == False).count()  # noqa: E712
        cache.set(cache_key, count, ttl=60)
        return count

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
        q = db.query(Lead).options(*LeadRepository._lead_load_options())

        if hustle_id is not None:
            q = q.filter(Lead.hustle_id == hustle_id)

        now = datetime.now(timezone.utc)

        if smart_view == "archived":
            q = q.filter((Lead.is_archived == True) | (Lead.do_not_contact == True))  # noqa: E712
        elif not include_archived:
            q = q.filter(Lead.is_archived == False)  # noqa: E712

        if smart_view == "review_tray":
            q = q.join(Stage, Lead.stage_id == Stage.id).filter(Stage.slug == "package_ready")
        elif smart_view == "due_today":
            end_of_today = now + timedelta(hours=12)
            q = q.filter(Lead.next_action_due_at <= end_of_today)
        elif smart_view == "hot_intent":
            q = q.filter(Lead.intent_score >= 40)
        elif smart_view == "replied_warm":
            q = q.join(Stage, Lead.stage_id == Stage.id).filter(Stage.slug == "replied")
        elif smart_view == "no_reply_5d":
            q = q.join(Stage, Lead.stage_id == Stage.id).filter(Stage.slug == "contacted")
        if stage_slug:
            q = q.join(Stage, Lead.stage_id == Stage.id).filter(Stage.slug == stage_slug)

        if status:
            q = q.filter(Lead.status == status)

        if search:
            pattern = f"%{search.strip()}%"
            q = q.filter(
                (Lead.name.ilike(pattern))
                | (Lead.doctor_name.ilike(pattern))
                | (Lead.locality.ilike(pattern))
                | (Lead.primary_phone.ilike(pattern))
                | (Lead.instagram_handle.ilike(pattern))
            )

        return q.order_by(Lead.intent_score.desc(), Lead.fit_score.desc(), Lead.id.desc()).all()

    @staticmethod
    def create(db: Session, lead: Lead) -> Lead:
        db.add(lead)
        db.flush()
        return lead

    @staticmethod
    def add_facts(db: Session, facts: List[LeadFact]) -> None:
        for f in facts:
            db.add(f)
        db.flush()

    @staticmethod
    def add_internal_note(db: Session, lead_id: int, note_text: str) -> Message:
        msg = Message(
            lead_id=lead_id,
            channel="note",
            direction="internal_note",
            text=note_text,
        )
        db.add(msg)
        return msg
