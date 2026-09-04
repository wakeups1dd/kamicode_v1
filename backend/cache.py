"""
Thread-safe in-memory TTL caching utility for high-throughput database query responses.
"""

import time
import threading
from typing import Any, Optional


class InMemoryCache:
    def __init__(self, default_ttl_sec: int = 60):
        self._cache: dict[str, tuple[Any, float]] = {}
        self._lock = threading.Lock()
        self._default_ttl = default_ttl_sec

    def get(self, key: str) -> Optional[Any]:
        """Retrieve a cached value if it exists and has not expired."""
        with self._lock:
            if key not in self._cache:
                return None
            val, expiry = self._cache[key]
            if time.time() > expiry:
                del self._cache[key]
                return None
            return val

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Store a value with an expiration timestamp."""
        ttl_sec = ttl if ttl is not None else self._default_ttl
        expiry = time.time() + ttl_sec
        with self._lock:
            self._cache[key] = (value, expiry)

    def invalidate(self, key: str) -> None:
        """Invalidate a specific cache key."""
        with self._lock:
            self._cache.pop(key, None)

    def invalidate_prefix(self, prefix: str) -> None:
        """Invalidate all cache keys starting with a prefix."""
        with self._lock:
            keys_to_delete = [k for k in self._cache if k.startswith(prefix)]
            for k in keys_to_delete:
                del self._cache[k]

    def clear(self) -> None:
        """Clear the entire cache."""
        with self._lock:
            self._cache.clear()


# Global cache instance
cache = InMemoryCache(default_ttl_sec=60)
