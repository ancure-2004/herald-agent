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
                ALTER TABLE leads ADD COLUMN IF NOT EXISTS automation_enabled BOOLEAN DEFAULT TRUE;
                ALTER TABLE leads ADD COLUMN IF NOT EXISTS needs_followup BOOLEAN DEFAULT FALSE;
                CREATE INDEX IF NOT EXISTS ix_leads_is_test ON leads (is_test);
                CREATE INDEX IF NOT EXISTS ix_leads_test_run_id ON leads (test_run_id);
                CREATE INDEX IF NOT EXISTS ix_leads_status ON leads (status);
                CREATE INDEX IF NOT EXISTS ix_leads_automation_enabled ON leads (automation_enabled);
                CREATE INDEX IF NOT EXISTS ix_leads_needs_followup ON leads (needs_followup);
                ALTER TABLE messages ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(30) DEFAULT 'sent';
                ALTER TABLE messages ADD COLUMN IF NOT EXISTS outbox_id INTEGER;
                CREATE INDEX IF NOT EXISTS ix_messages_delivery_status ON messages (delivery_status);
                CREATE INDEX IF NOT EXISTS ix_messages_outbox_id ON messages (outbox_id);
                CREATE TABLE IF NOT EXISTS calls (
                    id SERIAL PRIMARY KEY,
                    lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
                    raw_text TEXT NOT NULL,
                    summary TEXT DEFAULT '',
                    interests JSONB DEFAULT '[]'::jsonb,
                    objections JSONB DEFAULT '[]'::jsonb,
                    commitments JSONB DEFAULT '[]'::jsonb,
                    next_steps JSONB DEFAULT '[]'::jsonb,
                    prep_brief TEXT DEFAULT '',
                    duration_seconds INTEGER DEFAULT 0,
                    outcome VARCHAR(50) DEFAULT 'completed',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                CREATE INDEX IF NOT EXISTS ix_calls_id ON calls (id);
                CREATE INDEX IF NOT EXISTS ix_calls_lead_id ON calls (lead_id);
                CREATE INDEX IF NOT EXISTS ix_calls_created_at ON calls (created_at);
                CREATE TABLE IF NOT EXISTS terminal_logs (
                    id SERIAL PRIMARY KEY,
                    service VARCHAR(50) NOT NULL,
                    level VARCHAR(20) DEFAULT 'info',
                    lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
                    hustle_id INTEGER REFERENCES hustles(id) ON DELETE SET NULL,
                    message TEXT NOT NULL,
                    metadata_json JSONB DEFAULT '{}'::jsonb,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                CREATE INDEX IF NOT EXISTS ix_terminal_logs_id ON terminal_logs (id);
                CREATE INDEX IF NOT EXISTS ix_terminal_logs_service ON terminal_logs (service);
                CREATE INDEX IF NOT EXISTS ix_terminal_logs_level ON terminal_logs (level);
                CREATE INDEX IF NOT EXISTS ix_terminal_logs_lead_id ON terminal_logs (lead_id);
                CREATE INDEX IF NOT EXISTS ix_terminal_logs_hustle_id ON terminal_logs (hustle_id);
                CREATE INDEX IF NOT EXISTS ix_terminal_logs_created_at ON terminal_logs (created_at);
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
            if "automation_enabled" not in lead_cols:
                conn.execute(text("ALTER TABLE leads ADD COLUMN automation_enabled BOOLEAN DEFAULT 1"))
            if "needs_followup" not in lead_cols:
                conn.execute(text("ALTER TABLE leads ADD COLUMN needs_followup BOOLEAN DEFAULT 0"))
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
        if insp.has_table("messages"):
            msg_cols = {c["name"] for c in insp.get_columns("messages")}
            if "delivery_status" not in msg_cols:
                conn.execute(text("ALTER TABLE messages ADD COLUMN delivery_status VARCHAR(30) DEFAULT 'sent'"))
            if "outbox_id" not in msg_cols:
                conn.execute(text("ALTER TABLE messages ADD COLUMN outbox_id INTEGER"))
        if not insp.has_table("calls"):
            conn.execute(
                text(
                    """
                    CREATE TABLE calls (
                        id INTEGER PRIMARY KEY,
                        lead_id INTEGER NOT NULL,
                        raw_text TEXT NOT NULL,
                        summary TEXT DEFAULT '',
                        interests JSON DEFAULT '[]',
                        objections JSON DEFAULT '[]',
                        commitments JSON DEFAULT '[]',
                        next_steps JSON DEFAULT '[]',
                        prep_brief TEXT DEFAULT '',
                        duration_seconds INTEGER DEFAULT 0,
                        outcome VARCHAR(50) DEFAULT 'completed',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY(lead_id) REFERENCES leads(id) ON DELETE CASCADE
                    )
                    """
                )
            )
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_calls_id ON calls (id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_calls_lead_id ON calls (lead_id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_calls_created_at ON calls (created_at)"))
        if not insp.has_table("terminal_logs"):
            conn.execute(
                text(
                    """
                    CREATE TABLE terminal_logs (
                        id INTEGER PRIMARY KEY,
                        service VARCHAR(50) NOT NULL,
                        level VARCHAR(20) DEFAULT 'info',
                        lead_id INTEGER,
                        hustle_id INTEGER,
                        message TEXT NOT NULL,
                        metadata_json JSON DEFAULT '{}',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY(lead_id) REFERENCES leads(id) ON DELETE SET NULL,
                        FOREIGN KEY(hustle_id) REFERENCES hustles(id) ON DELETE SET NULL
                    )
                    """
                )
            )
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_terminal_logs_id ON terminal_logs (id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_terminal_logs_service ON terminal_logs (service)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_terminal_logs_level ON terminal_logs (level)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_terminal_logs_lead_id ON terminal_logs (lead_id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_terminal_logs_hustle_id ON terminal_logs (hustle_id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_terminal_logs_created_at ON terminal_logs (created_at)"))


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
