import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.autopilot.log_tags import TAG_QUOTA
from app.autopilot.settings import get_autopilot_settings

logger = logging.getLogger("personal_os.autopilot.quota")


class QuotaGuard:
    """
    Tracks and enforces monthly soft limits on paid/quota-restricted APIs (e.g. Google Places).
    Ensures runs never incur unexpected API billing by halting calls before reaching provider caps.
    Supports both QuotaGuard(db).try_consume(provider, sku) and QuotaGuard.try_consume(db, provider, sku).
    """

    SOFT_LIMITS: Dict[str, Dict[str, int]] = {}

    def __init__(self, db: Optional[Session] = None):
        self.db = db

    @classmethod
    def ensure_schema(cls, db: Session) -> None:
        """Idempotently creates the api_usage table if it doesn't already exist."""
        bind = db.get_bind()
        is_sqlite = bind is not None and bind.dialect.name == "sqlite"
        id_col = "id INTEGER PRIMARY KEY AUTOINCREMENT" if is_sqlite else "id SERIAL PRIMARY KEY"
        sql = f"""
        CREATE TABLE IF NOT EXISTS api_usage (
            {id_col},
            provider VARCHAR(64) NOT NULL,
            sku VARCHAR(64) NOT NULL,
            month VARCHAR(7) NOT NULL,
            count INTEGER NOT NULL DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(provider, sku, month)
        );
        """
        try:
            db.execute(text(sql))
            db.commit()
        except Exception as e:
            db.rollback()
            logger.warning("ensure_schema for api_usage encountered error: %s", e)

    @classmethod
    def get_current_month(cls) -> str:
        return datetime.now(timezone.utc).strftime("%Y-%m")

    @classmethod
    def get_limit(cls, provider: str, sku: str) -> int:
        if provider in cls.SOFT_LIMITS and sku in cls.SOFT_LIMITS[provider]:
            return cls.SOFT_LIMITS[provider][sku]
        settings = get_autopilot_settings()
        p = provider.lower()
        s = sku.lower()
        if "google" in p:
            if "detail" in s:
                return settings.google_monthly_soft_limit_details
            return settings.google_monthly_soft_limit_text_search
        return 1000

    @classmethod
    def _try_consume_static(
        cls,
        db: Session,
        provider: str,
        sku: str,
        limit: Optional[int] = None,
    ) -> bool:
        cls.ensure_schema(db)
        month = cls.get_current_month()
        max_allowed = limit if limit is not None else cls.get_limit(provider, sku)

        try:
            # Query existing count
            row = db.execute(
                text("SELECT count FROM api_usage WHERE provider = :p AND sku = :s AND month = :m"),
                {"p": provider, "s": sku, "m": month},
            ).fetchone()

            current_count = row[0] if row else 0
            if current_count >= max_allowed:
                logger.warning(
                    "%s Monthly soft limit reached for %s:%s (%d/%d)",
                    TAG_QUOTA,
                    provider,
                    sku,
                    current_count,
                    max_allowed,
                )
                return False

            if row:
                db.execute(
                    text(
                        "UPDATE api_usage SET count = count + 1, updated_at = CURRENT_TIMESTAMP "
                        "WHERE provider = :p AND sku = :s AND month = :m"
                    ),
                    {"p": provider, "s": sku, "m": month},
                )
            else:
                db.execute(
                    text("INSERT INTO api_usage (provider, sku, month, count) VALUES (:p, :s, :m, 1)"),
                    {"p": provider, "s": sku, "m": month},
                )
            db.commit()
            return True
        except Exception as e:
            db.rollback()
            logger.error("Error updating api_usage for %s:%s: %s", provider, sku, e)
            return True

    def try_consume(
        self_or_cls,
        *args,
        **kwargs,
    ) -> bool:
        if isinstance(self_or_cls, QuotaGuard):
            db = self_or_cls.db
            provider = args[0] if len(args) > 0 else kwargs["provider"]
            sku = args[1] if len(args) > 1 else kwargs["sku"]
            limit = args[2] if len(args) > 2 else kwargs.get("limit")
            return QuotaGuard._try_consume_static(db, provider, sku, limit=limit)
        elif self_or_cls is QuotaGuard:
            db = args[0] if len(args) > 0 else kwargs["db"]
            provider = args[1] if len(args) > 1 else kwargs["provider"]
            sku = args[2] if len(args) > 2 else kwargs["sku"]
            limit = args[3] if len(args) > 3 else kwargs.get("limit")
            return QuotaGuard._try_consume_static(db, provider, sku, limit=limit)
        else:
            db = self_or_cls
            provider = args[0] if len(args) > 0 else kwargs["provider"]
            sku = args[1] if len(args) > 1 else kwargs["sku"]
            limit = args[2] if len(args) > 2 else kwargs.get("limit")
            return QuotaGuard._try_consume_static(db, provider, sku, limit=limit)

    def get_usage(
        self_or_cls,
        *args,
        **kwargs,
    ) -> Dict[str, Any]:
        """Returns monthly usage records for the cockpit."""
        if isinstance(self_or_cls, QuotaGuard):
            db = self_or_cls.db
            provider = args[0] if len(args) > 0 else kwargs.get("provider")
        elif self_or_cls is QuotaGuard:
            db = args[0] if len(args) > 0 else kwargs["db"]
            provider = args[1] if len(args) > 1 else kwargs.get("provider")
        else:
            db = self_or_cls
            provider = args[0] if len(args) > 0 else kwargs.get("provider")

        QuotaGuard.ensure_schema(db)
        month = QuotaGuard.get_current_month()
        try:
            if provider:
                rows = db.execute(
                    text("SELECT provider, sku, month, count FROM api_usage WHERE month = :m AND provider = :p"),
                    {"m": month, "p": provider},
                ).fetchall()
            else:
                rows = db.execute(
                    text("SELECT provider, sku, month, count FROM api_usage WHERE month = :m"),
                    {"m": month},
                ).fetchall()

            usage: Dict[str, Any] = {}
            for r in rows:
                key = f"{r[0]}:{r[1]}"
                usage[key] = {
                    "provider": r[0],
                    "sku": r[1],
                    "month": r[2],
                    "count": r[3],
                    "limit": QuotaGuard.get_limit(r[0], r[1]),
                }
            return usage
        except Exception as e:
            logger.error("Error retrieving api_usage: %s", e)
            return {}
