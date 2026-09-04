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

    def handle_reconnect(self, user_id: str, websocket: WebSocket) -> Optional[str]:
        """
        Check if user is reconnecting to an ongoing match within grace window.
        Cancels pending forfeit timer if present.
        """
        match_id = self.user_to_match.get(user_id)
        if match_id and match_id in self.active_matches:
            match = self.active_matches[match_id]
            if match["status"] in ("countdown", "in_progress"):
                # Cancel disconnect timer if running
                task_key = (match_id, user_id)
                if task_key in self.disconnect_tasks:
                    self.disconnect_tasks[task_key].cancel()
                    del self.disconnect_tasks[task_key]

                match["players"][user_id]["ws"] = websocket
                match["players"][user_id]["connected"] = True
                match["players"][user_id]["last_ping"] = time.time()
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


arena_manager = ArenaState()
