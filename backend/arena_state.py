import asyncio
import uuid
from typing import Dict, List, Tuple, Any
from fastapi import WebSocket

class ArenaState:
    def __init__(self):
        # Queue: list of tuples (user_id, username, websocket)
        self.waiting_queue: List[Tuple[str, str, WebSocket]] = []
        
        # Private rooms waiting queue: room_code -> (user_id, username, websocket)
        self.private_rooms: Dict[str, Tuple[str, str, WebSocket]] = {}
        
        # Active matches: match_id -> data
        self.active_matches: Dict[str, Dict[str, Any]] = {}
        
        # Map user_id to match_id
        self.user_to_match: Dict[str, str] = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()

    def disconnect(self, websocket: WebSocket, user_id: str):
        self.waiting_queue = [x for x in self.waiting_queue if x[0] != user_id]
        
        # Remove from private rooms
        keys_to_delete = [k for k, v in self.private_rooms.items() if v[0] == user_id]
        for k in keys_to_delete:
            del self.private_rooms[k]
            
        match_id = self.user_to_match.get(user_id)
        if match_id and match_id in self.active_matches:
            # We don't delete the match immediately, but we could mark the user as disconnected
            match = self.active_matches[match_id]
            if user_id in match["players"]:
                match["players"][user_id]["connected"] = False

    async def broadcast_to_match(self, match_id: str, message: dict):
        """Send a message to all connected players in a match."""
        if match_id not in self.active_matches:
            return
        
        match = self.active_matches[match_id]
        for pid, player_data in match["players"].items():
            ws: WebSocket = player_data["ws"]
            if player_data["connected"]:
                try:
                    await ws.send_json(message)
                except Exception as e:
                    print(f"Error broadcasting to {pid}: {e}")
                    player_data["connected"] = False

arena_manager = ArenaState()
