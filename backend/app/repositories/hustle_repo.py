from typing import List, Optional

from sqlalchemy.orm import Session, joinedload

from app.models.entities import AvailabilityDay, Hustle, SmartView, Stage


class HustleRepository:
    @staticmethod
    def get_by_id(db: Session, hustle_id: int) -> Optional[Hustle]:
        return db.query(Hustle).filter(Hustle.id == hustle_id).first()

    @staticmethod
    def get_by_slug(db: Session, slug: str) -> Optional[Hustle]:
        return db.query(Hustle).filter(Hustle.slug == slug).first()

    @staticmethod
    def list_all(db: Session) -> List[Hustle]:
        return (
            db.query(Hustle)
            .options(joinedload(Hustle.stages), joinedload(Hustle.smart_views))
            .order_by(Hustle.id)
            .all()
        )

    @staticmethod
    def create(db: Session, hustle: Hustle) -> Hustle:
        db.add(hustle)
        db.flush()
        return hustle

    @staticmethod
    def add_stages(db: Session, stages: List[Stage]) -> None:
        for s in stages:
            db.add(s)

    @staticmethod
    def add_smart_views(db: Session, views: List[SmartView]) -> None:
        for v in views:
            db.add(v)

    @staticmethod
    def get_stage_by_id(db: Session, stage_id: int) -> Optional[Stage]:
        return db.query(Stage).filter(Stage.id == stage_id).first()

    @staticmethod
    def get_first_stage(db: Session, hustle_id: int) -> Optional[Stage]:
        return db.query(Stage).filter(Stage.hustle_id == hustle_id).order_by(Stage.order).first()

    @staticmethod
    def get_availability_day(db: Session, date_str: str) -> Optional[AvailabilityDay]:
        return db.query(AvailabilityDay).filter(AvailabilityDay.date_str == date_str).first()

    @staticmethod
    def set_availability_day(db: Session, date_str: str, mode: str, note: Optional[str] = None) -> AvailabilityDay:
        row = db.query(AvailabilityDay).filter(AvailabilityDay.date_str == date_str).first()
        if not row:
            row = AvailabilityDay(date_str=date_str, mode=mode, note=note or "")
            db.add(row)
        else:
            row.mode = mode
            if note is not None:
                row.note = note
        db.commit()
        db.refresh(row)
        return row
