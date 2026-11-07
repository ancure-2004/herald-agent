from typing import Any, Union

from sqlalchemy import inspect, text
from sqlalchemy.engine import Connection, Engine
from sqlalchemy.orm import Session

from app.core.logging import logger


def _run_migration_statements(conn: Any, dialect: str, insp: Any) -> None:
    if dialect == "postgresql":
        conn.execute(
            text(
                """
                ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT FALSE;
                ALTER TABLE leads ADD COLUMN IF NOT EXISTS test_run_id VARCHAR(100);
                ALTER TABLE leads ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'STAGED';
                CREATE INDEX IF NOT EXISTS ix_leads_is_test ON leads (is_test);
                CREATE INDEX IF NOT EXISTS ix_leads_test_run_id ON leads (test_run_id);
                CREATE INDEX IF NOT EXISTS ix_leads_status ON leads (status);
                ALTER TABLE jobs ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE;
                ALTER TABLE jobs ADD COLUMN IF NOT EXISTS error_message TEXT DEFAULT '';
                ALTER TABLE jobs ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
                UPDATE leads
                SET status = CASE
                    WHEN stage_id = 7 THEN 'WON'
                    WHEN stage_id = 8 THEN 'LOST'
                    WHEN stage_id IN (4, 5, 6) THEN 'CONTACTED'
                    ELSE 'DEMO_READY'
                END
                WHERE (id IN (SELECT lead_id FROM packages) OR stage_id != 1)
                  AND status = 'STAGED';
                """
            )
        )
    elif dialect == "sqlite":
        if insp.has_table("leads"):
            lead_cols = {c["name"] for c in insp.get_columns("leads")}
            if "is_test" not in lead_cols:
                conn.execute(text("ALTER TABLE leads ADD COLUMN is_test BOOLEAN DEFAULT 0"))
            if "test_run_id" not in lead_cols:
                conn.execute(text("ALTER TABLE leads ADD COLUMN test_run_id VARCHAR(100)"))
            if "status" not in lead_cols:
                conn.execute(text("ALTER TABLE leads ADD COLUMN status VARCHAR(50) DEFAULT 'STAGED'"))
            if insp.has_table("packages"):
                conn.execute(
                    text(
                        """
                        UPDATE leads
                        SET status = CASE
                            WHEN stage_id = 7 THEN 'WON'
                            WHEN stage_id = 8 THEN 'LOST'
                            WHEN stage_id IN (4, 5, 6) THEN 'CONTACTED'
                            ELSE 'DEMO_READY'
                        END
                        WHERE (id IN (SELECT lead_id FROM packages) OR stage_id != 1)
                          AND status = 'STAGED'
                        """
                    )
                )
            else:
                conn.execute(
                    text(
                        """
                        UPDATE leads
                        SET status = CASE
                            WHEN stage_id = 7 THEN 'WON'
                            WHEN stage_id = 8 THEN 'LOST'
                            WHEN stage_id IN (4, 5, 6) THEN 'CONTACTED'
                            ELSE 'DEMO_READY'
                        END
                        WHERE stage_id != 1 AND status = 'STAGED'
                        """
                    )
                )
            conn.execute(text("UPDATE leads SET status = 'STAGED' WHERE status IS NULL OR status = ''"))
        if insp.has_table("jobs"):
            job_cols = {c["name"] for c in insp.get_columns("jobs")}
            if "locked_until" not in job_cols:
                conn.execute(text("ALTER TABLE jobs ADD COLUMN locked_until TIMESTAMP"))
            if "error_message" not in job_cols:
                conn.execute(text('ALTER TABLE jobs ADD COLUMN error_message TEXT DEFAULT ""'))
            if "completed_at" not in job_cols:
                conn.execute(text("ALTER TABLE jobs ADD COLUMN completed_at TIMESTAMP"))


def ensure_schema_columns(target: Union[Engine, Connection, Session, Any]) -> None:
    """Ensures newly added columns exist in pre-existing tables.

    SQLAlchemy's create_all() only creates missing tables; it never alters existing ones.
    This helper provides lightweight schema migration for both PostgreSQL and SQLite.
    Accepts Engine, Connection, or Session.
    """
    try:
        if isinstance(target, Session):
            conn = target.connection()
            dialect = conn.dialect.name
            insp = inspect(conn)
            _run_migration_statements(target, dialect, insp)
            target.commit()
            target.expire_all()
            return

        if isinstance(target, Connection):
            dialect = target.dialect.name
            insp = inspect(target)
            _run_migration_statements(target, dialect, insp)
            return

        dialect = target.dialect.name
        insp = inspect(target)
        if hasattr(target, "begin"):
            with target.begin() as conn:
                _run_migration_statements(conn, dialect, insp)
        elif hasattr(target, "connect"):
            with target.connect() as conn:
                _run_migration_statements(conn, dialect, insp)
                conn.commit()
    except Exception as e:
        logger.warning(f"ensure_schema_columns notice: {e}")
