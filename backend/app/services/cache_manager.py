"""Multi-tier Cache Manager for PersonalOS & CRM (Herald).

Supports:
1. Cloud Redis via REDIS_URL configuration/environment.
2. Local Redis fallback (redis://localhost:6379/0) if REDIS_URL is unset and local Redis is reachable.
3. Automatic in-memory thread-safe LRU+TTL cache (OrderedDict + RLock) when Redis is unavailable or uninstalled.
"""

from collections import OrderedDict
import json
import threading
import time
from typing import Any, List, Optional, Union

from app.core.logging import logger


class InMemoryLRUCache:
    """Thread-safe in-memory LRU cache with per-item TTL expiration."""

    def __init__(self, maxsize: int = 10000, default_ttl: int = 60) -> None:
        self.maxsize = maxsize
        self.default_ttl = default_ttl
        self._cache: OrderedDict[str, tuple[Any, Optional[float]]] = OrderedDict()
        self._lock = threading.RLock()

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            if key not in self._cache:
                return None
            value, expires_at = self._cache[key]
            if expires_at is not None and time.time() > expires_at:
                del self._cache[key]
                return None
            self._cache.move_to_end(key)
            return value

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        with self._lock:
            effective_ttl = self.default_ttl if ttl is None else ttl
            expires_at = time.time() + effective_ttl if effective_ttl is not None and effective_ttl > 0 else None
            if key in self._cache:
                self._cache.move_to_end(key)
            self._cache[key] = (value, expires_at)
            while len(self._cache) > self.maxsize:
                self._cache.popitem(last=False)
            return True

    def delete(self, key: str) -> bool:
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
            return False

    def invalidate_prefix(self, prefix: str) -> int:
        with self._lock:
            matching = [k for k in self._cache if k.startswith(prefix)]
            for k in matching:
                del self._cache[k]
            return len(matching)

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()

    def __len__(self) -> int:
        with self._lock:
            return len(self._cache)


class CacheManager:
    """Unified Cache Manager providing get, set, delete, and invalidate_prefix across Redis or In-Memory fallback."""

    def __init__(
        self,
        redis_url: Optional[str] = None,
        default_ttl: int = 60,
        maxsize: int = 10000,
    ) -> None:
        self.default_ttl = default_ttl
        self.maxsize = maxsize
        self.redis_client: Any = None
        self.is_redis: bool = False
        self.backend_type: str = "memory"
        self._memory = InMemoryLRUCache(maxsize=maxsize, default_ttl=default_ttl)

        self._init_redis(redis_url)

    def _init_redis(self, redis_url: Optional[str]) -> None:
        try:
            import redis
        except ImportError:
            logger.info("redis package not installed; using in-memory LRU cache")
            return

        urls_to_try: List[tuple[str, str]] = []
        if redis_url:
            urls_to_try.append(("cloud", redis_url))
        else:
            urls_to_try.append(("local", "redis://localhost:6379/0"))

        for label, url in urls_to_try:
            try:
                client = redis.from_url(
                    url,
                    socket_connect_timeout=1.0,
                    socket_timeout=1.0,
                    decode_responses=True,
                )
                client.ping()
                self.redis_client = client
                self.is_redis = True
                self.backend_type = f"redis_{label}"
                logger.info(f"CacheManager connected to {label} Redis at {url}")
                return
            except Exception as e:
                logger.debug(f"CacheManager could not connect to {label} Redis ({url}): {e}")

        logger.info("Redis unavailable; using in-memory LRU+TTL cache")

    @staticmethod
    def _serialize(value: Any) -> str:
        try:
            return json.dumps(value)
        except (TypeError, ValueError):
            return str(value)

    @staticmethod
    def _deserialize(raw: Union[str, bytes]) -> Any:
        if isinstance(raw, bytes):
            raw = raw.decode("utf-8")
        try:
            return json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            return raw

    def get(self, key: str) -> Optional[Any]:
        """Retrieve a cached value by key. Returns None if absent or expired."""
        if self.is_redis and self.redis_client:
            try:
                raw = self.redis_client.get(key)
                if raw is None:
                    return None
                return self._deserialize(raw)
            except Exception as e:
                logger.warning(f"Redis get error for '{key}': {e}. Falling back to memory cache.")
                return self._memory.get(key)
        return self._memory.get(key)

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Store a value in cache with optional TTL in seconds (defaults to CACHE_DEFAULT_TTL)."""
        effective_ttl = self.default_ttl if ttl is None else ttl
        # Always maintain in-memory cache as immediate hot cache
        self._memory.set(key, value, ttl=effective_ttl)

        if self.is_redis and self.redis_client:
            try:
                payload = self._serialize(value)
                if effective_ttl and effective_ttl > 0:
                    self.redis_client.set(key, payload, ex=effective_ttl)
                else:
                    self.redis_client.set(key, payload)
                return True
            except Exception as e:
                logger.warning(f"Redis set error for '{key}': {e}")
                return True
        return True

    def delete(self, key: str) -> bool:
        """Delete a key from cache. Returns True if deleted, False otherwise."""
        mem_deleted = self._memory.delete(key)
        if self.is_redis and self.redis_client:
            try:
                res = self.redis_client.delete(key)
                return bool(res or mem_deleted)
            except Exception as e:
                logger.warning(f"Redis delete error for '{key}': {e}")
                return mem_deleted
        return mem_deleted

    def invalidate_prefix(self, prefix: str) -> int:
        """Invalidate all keys matching prefix* and return the count of deleted keys."""
        mem_count = self._memory.invalidate_prefix(prefix)
        if self.is_redis and self.redis_client:
            try:
                keys = list(self.redis_client.scan_iter(match=f"{prefix}*", count=100))
                if keys:
                    deleted = self.redis_client.delete(*keys)
                    return max(deleted, mem_count)
                return mem_count
            except Exception as e:
                logger.warning(f"Redis invalidate_prefix error for '{prefix}': {e}")
                return mem_count
        return mem_count

    def clear(self) -> None:
        """Clear all cached entries."""
        self._memory.clear()
        if self.is_redis and self.redis_client:
            try:
                self.redis_client.flushdb()
            except Exception as e:
                logger.warning(f"Redis flushdb error: {e}")


_cache_manager_instance: Optional[CacheManager] = None
_cache_manager_lock = threading.Lock()


def get_cache_manager() -> CacheManager:
    """Return the global singleton CacheManager instance."""
    global _cache_manager_instance
    if _cache_manager_instance is None:
        with _cache_manager_lock:
            if _cache_manager_instance is None:
                from app.core.config import get_settings

                settings = get_settings()
                _cache_manager_instance = CacheManager(
                    redis_url=getattr(settings, "REDIS_URL", None),
                    default_ttl=getattr(settings, "CACHE_DEFAULT_TTL", 60),
                )
    return _cache_manager_instance
