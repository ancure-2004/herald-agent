from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

from app.core.logging import logger


def ensure_schema_columns(engine: Engine) -> None:
    """Ensures newly added columns exist in pre-existing tables.

    SQLAlchemy's create_all() only creates missing tables; it never alters existing ones.
    This helper provides lightweight schema migration for both PostgreSQL and SQLite.
    """
    try:
        insp = inspect(engine)
        dialect = engine.dialect.name

        with engine.connect() as conn:
            if dialect == "postgresql":
                conn.execute(
                    text(
                        """
                        ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT FALSE;
                        ALTER TABLE leads ADD COLUMN IF NOT EXISTS test_run_id VARCHAR(100);
                        CREATE INDEX IF NOT EXISTS ix_leads_is_test ON leads (is_test);
                        CREATE INDEX IF NOT EXISTS ix_leads_test_run_id ON leads (test_run_id);
                        ALTER TABLE jobs ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE;
                        ALTER TABLE jobs ADD COLUMN IF NOT EXISTS error_message TEXT DEFAULT '';
                        ALTER TABLE jobs ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
                        """
                    )
                )
                conn.commit()
            elif dialect == "sqlite":
                if insp.has_table("leads"):
                    lead_cols = {c["name"] for c in insp.get_columns("leads")}
                    if "is_test" not in lead_cols:
                        conn.execute(text("ALTER TABLE leads ADD COLUMN is_test BOOLEAN DEFAULT 0"))
                    if "test_run_id" not in lead_cols:
                        conn.execute(text("ALTER TABLE leads ADD COLUMN test_run_id VARCHAR(100)"))
                if insp.has_table("jobs"):
                    job_cols = {c["name"] for c in insp.get_columns("jobs")}
                    if "locked_until" not in job_cols:
                        conn.execute(text("ALTER TABLE jobs ADD COLUMN locked_until TIMESTAMP"))
                    if "error_message" not in job_cols:
                        conn.execute(text('ALTER TABLE jobs ADD COLUMN error_message TEXT DEFAULT ""'))
                    if "completed_at" not in job_cols:
                        conn.execute(text("ALTER TABLE jobs ADD COLUMN completed_at TIMESTAMP"))
                conn.commit()
    except Exception as e:
        logger.warning(f"ensure_schema_columns notice: {e}")
