"""
Real-time Presence Manager for KamiCode.
Tracks user online/offline status with heartbeat timestamps and configurable timeouts.
"""

import time
from typing import Dict, Optional, Set


class PresenceManager:
    def __init__(self, timeout_seconds: int = 60):
        self._last_seen: Dict[str, float] = {}
        self.timeout_seconds = timeout_seconds

    def record_activity(self, user_id: str):
        """Update last seen timestamp for a user."""
        if user_id:
            self._last_seen[str(user_id)] = time.time()

    def set_offline(self, user_id: str):
        """Mark a user explicitly offline."""
        if user_id and str(user_id) in self._last_seen:
            self._last_seen[str(user_id)] = 0.0

    def is_online(self, user_id: str) -> bool:
        """Check if a user has had activity within the timeout window."""
        if not user_id:
            return False
        last = self._last_seen.get(str(user_id), 0.0)
        return (time.time() - last) <= self.timeout_seconds

    def get_last_seen(self, user_id: str) -> Optional[int]:
        """Return last seen epoch in milliseconds, or None if never recorded."""
        if not user_id:
            return None
        last = self._last_seen.get(str(user_id))
        if last and last > 0:
            return int(last * 1000)
        return None

    def get_all_online_users(self) -> Set[str]:
        """Return a set of all user IDs currently considered online."""
        now = time.time()
        return {
            uid
            for uid, last in self._last_seen.items()
            if (now - last) <= self.timeout_seconds
        }

    def clear(self):
        """Clear all presence records (useful for testing)."""
        self._last_seen.clear()


presence_manager = PresenceManager(timeout_seconds=60)
