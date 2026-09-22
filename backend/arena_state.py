"""
Hardened Arena Multiplayer State Manager.

Manages 1v1 PvP match lifecycles, matchmaking queues, private challenge rooms,
heartbeat tracking, 30s disconnect grace windows, anti-cheat problem reveal,
and Elo rating calculations.
"""

import asyncio
import time
import math
from typing import Dict, List, Tuple, Any, Optional
from fastapi import WebSocket


def calculate_elo_change(rating_a: int, rating_b: int, score_a: float, k_factor: int = 32) -> Tuple[int, int]:
    """
    Calculate Elo rating changes for Player A and Player B.
    score_a: 1.0 if Player A won, 0.0 if Player B won, 0.5 for draw.
    Returns: (delta_a, delta_b)
    """
    expected_a = 1.0 / (1.0 + math.pow(10.0, (rating_b - rating_a) / 400.0))
    expected_b = 1.0 - expected_a
    score_b = 1.0 - score_a

    delta_a = round(k_factor * (score_a - expected_a))
    delta_b = round(k_factor * (score_b - expected_b))

    return delta_a, delta_b


class ArenaState:
    def __init__(self):
        # Public queue: list of tuples (user_id, username, elo, websocket)
        self.waiting_queue: List[Tuple[str, str, int, WebSocket]] = []
        
        # Private rooms: room_code -> (user_id, username, elo, websocket)
        self.private_rooms: Dict[str, Tuple[str, str, int, WebSocket]] = {}
        
        # Active matches: match_id -> match_data
        self.active_matches: Dict[str, Dict[str, Any]] = {}
        
        # Map user_id to match_id
        self.user_to_match: Dict[str, str] = {}
        
        # Match invites: target_user_id -> list of {"room_code": str, "sender_id": str, "sender_name": str}
        self.match_invites: Dict[str, List[Dict[str, str]]] = {}

        # Disconnect grace timers: (match_id, user_id) -> asyncio.Task
        self.disconnect_tasks: Dict[Tuple[str, str], asyncio.Task] = {}

        # Match duration game clocks: match_id -> asyncio.Task
        self.match_clock_tasks: Dict[str, asyncio.Task] = {}

        # Post-match cleanup tasks: match_id -> asyncio.Task
        self.cleanup_tasks: Dict[str, asyncio.Task] = {}

        # Players transitioning between lobby and battle room: (match_id, user_id) -> timestamp
        self.navigating_players: Dict[Tuple[str, str], float] = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()

    def is_user_in_match(self, user_id: str) -> bool:
        """Check if user has an active ongoing match."""
        match_id = self.user_to_match.get(user_id)
        if match_id and match_id in self.active_matches:
            status = self.active_matches[match_id].get("status")
            return status in ("countdown", "in_progress")
        return False

    def remove_from_queues(self, user_id: str):
        """Remove user from public queue and private room listings."""
        self.waiting_queue = [x for x in self.waiting_queue if x[0] != user_id]
        keys_to_delete = [k for k, v in self.private_rooms.items() if v[0] == user_id]
        for k in keys_to_delete:
            del self.private_rooms[k]

    def record_ping(self, user_id: str):
        """Record heartbeat from user."""
        try:
            from presence import presence_manager
            presence_manager.record_activity(user_id)
        except Exception:
            pass
        match_id = self.user_to_match.get(user_id)
        if match_id and match_id in self.active_matches:
            players = self.active_matches[match_id]["players"]
            if user_id in players:
                players[user_id]["last_ping"] = time.time()

    async def broadcast_to_match(self, match_id: str, message: dict, exclude_user_id: Optional[str] = None):
        """Send a JSON message to connected players in a match (optionally excluding one)."""
        if match_id not in self.active_matches:
            return
        
        match = self.active_matches[match_id]
        for pid, player_data in list(match["players"].items()):
            if exclude_user_id and pid == exclude_user_id:
                continue
            ws: Optional[WebSocket] = player_data.get("ws")
            if ws and player_data.get("connected", False):
                try:
                    await ws.send_json(message)
                except Exception:
                    player_data["connected"] = False

    def mark_navigating(self, match_id: str, user_id: str):
        """Mark a player as navigating from lobby to battle room to suppress false disconnect alerts."""
        self.navigating_players[(match_id, user_id)] = time.time()

    def is_navigating(self, match_id: str, user_id: str) -> bool:
        """Check if user is in route transition (valid for 15 seconds)."""
        key = (match_id, user_id)
        if key in self.navigating_players:
            if time.time() - self.navigating_players[key] < 15.0:
                return True
            else:
                del self.navigating_players[key]
        return False

    def handle_reconnect(self, user_id: str, websocket: WebSocket, target_match_id: Optional[str] = None) -> Optional[str]:
        """
        Check if user is connecting/reconnecting to an ongoing match.
        If target_match_id is provided, enforces that the user belongs to that match.
        Cancels pending forfeit timer if present.
        """
        match_id = target_match_id or self.user_to_match.get(user_id)
        if match_id and match_id in self.active_matches:
            match = self.active_matches[match_id]
            if user_id in match.get("players", {}):
                if match["status"] in ("countdown", "in_progress"):
                    # Cancel disconnect timer if running
                    task_key = (match_id, user_id)
                    if task_key in self.disconnect_tasks:
                        self.disconnect_tasks[task_key].cancel()
                        del self.disconnect_tasks[task_key]

                    # Clear navigating status
                    self.navigating_players.pop((match_id, user_id), None)

                    match["players"][user_id]["ws"] = websocket
                    match["players"][user_id]["connected"] = True
                    match["players"][user_id]["last_ping"] = time.time()
                    self.user_to_match[user_id] = match_id
                    return match_id
        return None

    def start_disconnect_grace_timer(self, match_id: str, user_id: str, callback):
        """
        Schedule a 30-second forfeit timer when a user disconnects during a match.
        """
        task_key = (match_id, user_id)
        if task_key in self.disconnect_tasks:
            self.disconnect_tasks[task_key].cancel()

        async def _grace_period():
            try:
                await asyncio.sleep(30)
                await callback(match_id, user_id)
            except asyncio.CancelledError:
                pass
            finally:
                self.disconnect_tasks.pop(task_key, None)

        task = asyncio.create_task(_grace_period())
        self.disconnect_tasks[task_key] = task

    def start_match_clock(self, match_id: str, timeout_sec: int, timeout_callback):
        """Start a match duration countdown clock (e.g., 15 minutes / 900 seconds)."""
        if match_id in self.match_clock_tasks:
            self.match_clock_tasks[match_id].cancel()

        async def _match_clock():
            try:
                await asyncio.sleep(timeout_sec)
                await timeout_callback(match_id)
            except asyncio.CancelledError:
                pass
            finally:
                self.match_clock_tasks.pop(match_id, None)

        task = asyncio.create_task(_match_clock())
        self.match_clock_tasks[match_id] = task

    def schedule_cleanup(self, match_id: str, delay_sec: int = 60):
        """Schedule garbage collection of match and user references after conclusion."""
        if match_id in self.cleanup_tasks:
            self.cleanup_tasks[match_id].cancel()

        async def _cleanup():
            try:
                await asyncio.sleep(delay_sec)
                # Cancel any remaining timers
                if match_id in self.match_clock_tasks:
                    self.match_clock_tasks[match_id].cancel()
                    self.match_clock_tasks.pop(match_id, None)

                for (mid, uid) in list(self.disconnect_tasks.keys()):
                    if mid == match_id:
                        self.disconnect_tasks[mid, uid].cancel()
                        self.disconnect_tasks.pop((mid, uid), None)

                # Remove from active matches and user mapping
                if match_id in self.active_matches:
                    match = self.active_matches.pop(match_id, None)
                    if match:
                        for pid in match.get("players", {}):
                            if self.user_to_match.get(pid) == match_id:
                                self.user_to_match.pop(pid, None)
            except asyncio.CancelledError:
                pass
        try:
            loop = asyncio.get_running_loop()
            task = loop.create_task(_cleanup())
            self.cleanup_tasks[match_id] = task
        except RuntimeError:
            # Fallback for synchronous test execution without running event loop
            if match_id in self.active_matches:
                match = self.active_matches.pop(match_id, None)
                if match:
                    for pid in match.get("players", {}):
                        if self.user_to_match.get(pid) == match_id:
                            self.user_to_match.pop(pid, None)

    async def notify_submission_outcome(
        self,
        user_id: str,
        problem_id: str,
        status: str,
        passed: int,
        total: int,
        on_solved_callback=None,
    ):
        """
        Authoritative callback triggered when code execution finishes in backend.
        Updates state and notifies players.
        """
        match_id = self.user_to_match.get(user_id)
        if not match_id or match_id not in self.active_matches:
            return

        match = self.active_matches[match_id]
        if match.get("status") not in ("countdown", "in_progress"):
            return

        if user_id in match["players"]:
            match["players"][user_id]["status"] = status
            match["players"][user_id]["passed_tests"] = passed
            match["players"][user_id]["total_tests"] = total

        # Broadcast progress to opponent
        await self.broadcast_to_match(
            match_id,
            {
                "type": "opponent_evaluated",
                "user_id": user_id,
                "status": status,
                "passed_count": passed,
                "total_count": total,
            },
            exclude_user_id=user_id,
        )

        # If accepted, authoritatively finish match
        if status == "accepted" and on_solved_callback:
            await on_solved_callback(match_id, user_id)


arena_manager = ArenaState()

