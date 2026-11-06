import hashlib
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger("personal_os.autopilot.cache")


class DbCache:
    """
    Database-backed cache for search and Overpass queries.
    Key = hash(provider + normalized query/params).
    Supports both DbCache(db).get(key, bypass=...) and DbCache.get(db, key, bypass=...).
    """

    def __init__(self, db: Optional[Session] = None):
        self.db = db

    @classmethod
    def ensure_schema(cls, db: Session) -> None:
        sql = """
        CREATE TABLE IF NOT EXISTS search_cache (
            key VARCHAR(64) PRIMARY KEY,
            provider VARCHAR(64) NOT NULL,
            value TEXT NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
        try:
            db.execute(text(sql))
            db.commit()
            cls._schema_ensured = True
        except Exception as e:
            db.rollback()
            logger.warning("ensure_schema for search_cache error: %s", e)

    @classmethod
    def make_key(cls, provider: str, params: Any) -> str:
        raw = f"{provider}:{json.dumps(params, sort_keys=True)}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    @classmethod
    def _get_static(
        cls,
        db: Session,
        key: str,
        *,
        bypass: bool = False,
    ) -> Optional[Any]:
        """Gets cached value if valid and not expired. bypass=True skips read."""
        if bypass or not db:
            return None
        cls.ensure_schema(db)
        try:
            row = db.execute(
                text("SELECT value, expires_at FROM search_cache WHERE key = :k"),
                {"k": key},
            ).fetchone()
            if not row:
                return None
            val_str, expires_at = row[0], row[1]
            if isinstance(expires_at, str):
                exp = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
            else:
                exp = expires_at
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) > exp:
                return None
            return json.loads(val_str)
        except Exception as e:
            logger.debug("Cache read error for key %s: %s", key, e)
            return None

    def get(
        self_or_cls,
        *args,
        bypass: bool = False,
        **kwargs,
    ) -> Optional[Any]:
        if isinstance(self_or_cls, DbCache):
            db = self_or_cls.db
            key = args[0] if len(args) > 0 else kwargs["key"]
            return DbCache._get_static(db, key, bypass=bypass)
        else:
            db = args[0] if len(args) > 0 else kwargs["db"]
            key = args[1] if len(args) > 1 else kwargs["key"]
            return DbCache._get_static(db, key, bypass=bypass)

    @classmethod
    def _set_static(
        cls,
        db: Session,
        key: str,
        value: Any,
        provider: str = "generic",
        ttl_hours: int = 720,
        bypass: bool = False,
    ) -> None:
        """Sets cached value with TTL in hours. bypass=True skips write."""
        if bypass or not db:
            return
        cls.ensure_schema(db)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=ttl_hours)
        val_str = json.dumps(value)
        try:
            db.execute(
                text(
                    "INSERT INTO search_cache (key, provider, value, expires_at, created_at) "
                    "VALUES (:k, :p, :v, :e, CURRENT_TIMESTAMP) "
                    "ON CONFLICT(key) DO UPDATE SET value = :v, expires_at = :e"
                ),
                {"k": key, "p": provider, "v": val_str, "e": expires_at},
            )
            db.commit()
        except Exception as e:
            db.rollback()
            logger.warning("Cache write error for key %s: %s", key, e)

    def set(
        self_or_cls,
        *args,
        ttl_hours: int = 720,
        bypass: bool = False,
        **kwargs,
    ) -> None:
        if isinstance(self_or_cls, DbCache):
            db = self_or_cls.db
            key = args[0] if len(args) > 0 else kwargs["key"]
            value = args[1] if len(args) > 1 else kwargs["value"]
            provider = args[2] if len(args) > 2 else kwargs.get("provider", "generic")
            DbCache._set_static(db, key, value, provider=provider, ttl_hours=ttl_hours, bypass=bypass)
        else:
            db = args[0] if len(args) > 0 else kwargs["db"]
            key = args[1] if len(args) > 1 else kwargs["key"]
            value = args[2] if len(args) > 2 else kwargs["value"]
            provider = args[3] if len(args) > 3 else kwargs.get("provider", "generic")
            DbCache._set_static(db, key, value, provider=provider, ttl_hours=ttl_hours, bypass=bypass)
