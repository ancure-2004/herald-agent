"""Creates herald's schema, runs herald's own seed, and fills it with invented rows through herald's models.

Imports herald's app modules, so DATABASE_URL must already be set by the caller.
"""

from datetime import datetime, timedelta, timezone
import random

from sqlalchemy import func, select
from sqlalchemy.orm import sessionmaker

from app.db.session import Base, engine
from app.models import AvailabilityDay, Objection, Stage
from app.seed import seed_initial_data
from app.services.lead_service import sync_lead_stage_and_status

import fake_global as fg
import fake_rows as fr
import fake_values as fv

BASE = datetime(2026, 11, 1, 9, 0, tzinfo=timezone.utc)
BATCH = 500
# expire_on_commit off: the stages and hustle stay readable between batches without a reload each time.
Session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
JOBS = 12
RUNS = 8


def _pin_seed_times(db, hustle):
    """Herald's seed stamps rows with the real clock; give them the fixed base instead."""
    hustle.created_at = BASE
    hustle.updated_at = BASE
    for objection in db.query(Objection).all():
        objection.created_at = BASE
        objection.updated_at = BASE
    days = db.query(AvailabilityDay).order_by(AvailabilityDay.id).all()
    for offset, day in enumerate(days):
        day.date_str = (BASE.date() + timedelta(days=offset)).isoformat()
        day.updated_at = BASE
    db.commit()


def _fill(db, rng, hustle, stages, leads):
    """Leads in batches, each with its children; stages are used round-robin."""
    hustle_id = hustle.id
    for start in range(1, leads + 1, BATCH):
        batch = []
        for n in range(start, min(start + BATCH, leads + 1)):
            stage = stages[(n - 1) % len(stages)]
            created = BASE + timedelta(minutes=n * 5 + rng.randint(0, 4))
            lead = fr.make_lead(rng, n, hustle_id, stage, created)
            sync_lead_stage_and_status(db, lead, stage)
            batch.append((lead, stage, created, n == fv.BUSY_LEAD))
        db.add_all([lead for lead, _, _, _ in batch])
        db.flush()

        children = []
        with_package = []
        for lead, stage, created, busy in batch:
            children += fr.make_facts(rng, lead, created, busy)
            package = fr.make_package(rng, lead, stage, created)
            if package is not None:
                children.append(package)
            children += fr.make_messages(rng, lead, created, busy)
            children += fr.make_calls(rng, lead, created, busy)
            children += fr.make_commitments(rng, lead, created, busy)
            children += fr.make_outbox(rng, lead, hustle_id, created)
            log = fg.make_log(rng, lead, hustle_id, created)
            if log is not None:
                children.append(log)
            with_package.append((lead, created, package))
        db.add_all(children)
        db.flush()

        events = []
        for lead, created, package in with_package:
            events += fr.make_events(rng, lead, created, package)
        db.add_all(events)
        db.commit()


def _fill_global(db, rng, hustle):
    """A few jobs and run logs that are not tied to one lead."""
    jobs = fg.make_jobs(rng, hustle.id, BASE, JOBS)
    db.add_all(jobs)
    db.flush()
    db.add_all(fg.make_runs(rng, hustle.id, jobs, BASE, RUNS))
    db.commit()


def counts(db):
    """Row count per table, in herald's table order."""
    return {table.name: db.execute(select(func.count()).select_from(table)).scalar_one() for table in Base.metadata.sorted_tables}


def run(leads, seed):
    """Builds the database at DATABASE_URL and returns the row count per table."""
    Base.metadata.create_all(bind=engine)
    db = Session()
    try:
        hustle = seed_initial_data(db)
        _pin_seed_times(db, hustle)
        stages = db.query(Stage).filter(Stage.hustle_id == hustle.id).order_by(Stage.order).all()
        if leads < len(stages):
            raise RuntimeError(f"herald seeds {len(stages)} stages; --leads must be at least that")
        rng = random.Random(seed)
        _fill(db, rng, hustle, stages, leads)
        _fill_global(db, rng, hustle)
        return counts(db)
    finally:
        db.close()
        engine.dispose()
