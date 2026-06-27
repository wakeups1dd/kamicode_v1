import uuid
import json
import random
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends

from database import get_convex
from auth import get_current_user
from arena_state import arena_manager
from pydantic import BaseModel

router = APIRouter(prefix="/api/arena", tags=["arena"])

class ArenaInvite(BaseModel):
    target_user_id: str
    room_code: str

@router.post("/invite")
def send_arena_invite(payload: ArenaInvite, client = Depends(get_convex), current_user: dict = Depends(get_current_user)):
    target = payload.target_user_id
    if target not in arena_manager.match_invites:
        arena_manager.match_invites[target] = []
    
    # Remove old invites from same sender
    user_id = current_user["id"]
    arena_manager.match_invites[target] = [inv for inv in arena_manager.match_invites[target] if inv["sender_id"] != user_id]
    
    # Fetch user display name from Convex
    sender = client.query("users:getByUserId", {"userId": user_id})
    sender_name = sender.get("displayName") or sender.get("username") if sender else f"User_{user_id[:4]}"

    arena_manager.match_invites[target].append({
        "room_code": payload.room_code,
        "sender_id": user_id,
        "sender_name": sender_name
    })
    return {"status": "ok"}

@router.get("/invites")
def get_arena_invites(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    invites = arena_manager.match_invites.get(user_id, [])
    # Clear them once fetched so they don't pop up forever
    if user_id in arena_manager.match_invites:
        arena_manager.match_invites[user_id] = []
    return invites

@router.websocket("/ws/{user_id}")
async def arena_websocket(websocket: WebSocket, user_id: str, room_code: str = None):
    # For websockets, we need to manually instantiate client or rely on a global since Depends doesn't work well directly in all websocket scenarios without careful setup.
    # We will instantiate ConvexClient manually here to avoid lifecycle issues in long-lived WS connections.
    from config import settings
    from convex import ConvexClient
    client = ConvexClient(settings.convex_url)

    await arena_manager.connect(websocket)
    
    # Try to fetch user
    user = client.query("users:getByUserId", {"userId": user_id})
    username = user["username"] if user else f"User_{user_id[:4]}"

    try:
        # Check if user is reconnecting to an active match
        if user_id in arena_manager.user_to_match:
            match_id = arena_manager.user_to_match[user_id]
            if match_id in arena_manager.active_matches:
                arena_manager.active_matches[match_id]["players"][user_id]["ws"] = websocket
                arena_manager.active_matches[match_id]["players"][user_id]["connected"] = True
                await websocket.send_json({
                    "type": "reconnected",
                    "match_id": match_id,
                    "problem_id": arena_manager.active_matches[match_id]["problem_id"],
                    "problem_slug": arena_manager.active_matches[match_id]["problem_slug"],
                    "problem_title": arena_manager.active_matches[match_id]["problem_title"],
                    "state": arena_manager.active_matches[match_id]["state"]
                })
        else:
            # Matchmaking helper
            async def create_match(opponent_id: str, opp_username: str, opp_ws: WebSocket):
                match_id = str(uuid.uuid4())
                
                # Pick a random problem from Convex
                problems = client.query("problems:list", {})
                problem = random.choice(problems) if problems else None
                
                problem_id = problem["_id"] if problem else "1"
                problem_slug = problem["slug"] if problem else "two-sum"
                problem_title = problem["title"] if problem else "Two Sum"
                
                match_data = {
                    "match_id": match_id,
                    "problem_id": problem_id,
                    "problem_slug": problem_slug,
                    "problem_title": problem_title,
                    "players": {
                        user_id: {"ws": websocket, "username": username, "connected": True},
                        opponent_id: {"ws": opp_ws, "username": opp_username, "connected": True}
                    },
                    "state": {
                        user_id: {"status": "started", "passed_tests": 0, "total_tests": 0},
                        opponent_id: {"status": "started", "passed_tests": 0, "total_tests": 0}
                    }
                }
                arena_manager.active_matches[match_id] = match_data
                arena_manager.user_to_match[user_id] = match_id
                arena_manager.user_to_match[opponent_id] = match_id
                
                await arena_manager.broadcast_to_match(match_id, {
                    "type": "match_found",
                    "match_id": match_id,
                    "problem_id": problem_id,
                    "problem_slug": problem_slug,
                    "problem_title": problem_title,
                    "players": [
                        {"user_id": user_id, "username": username},
                        {"user_id": opponent_id, "username": opp_username}
                    ]
                })

                # Log matches played to stats (best effort)
                try:
                    client.mutation("streaks:updateStats", {"userId": user_id, "matchPlayed": True, "matchWon": False})
                    client.mutation("streaks:updateStats", {"userId": opponent_id, "matchPlayed": True, "matchWon": False})
                except Exception as e:
                    print("Stats update failed:", e)


            if room_code:
                if room_code in arena_manager.private_rooms:
                    opponent_id, opp_username, opp_ws = arena_manager.private_rooms.pop(room_code)
                    if opponent_id != user_id:
                        await create_match(opponent_id, opp_username, opp_ws)
                    else:
                        arena_manager.private_rooms[room_code] = (user_id, username, websocket)
                else:
                    arena_manager.private_rooms[room_code] = (user_id, username, websocket)
                    await websocket.send_json({"type": "waiting_private", "room_code": room_code})
            else:
                if arena_manager.waiting_queue:
                    opponent_id, opp_username, opp_ws = arena_manager.waiting_queue.pop(0)
                    if opponent_id != user_id:
                        await create_match(opponent_id, opp_username, opp_ws)
                    else:
                        arena_manager.waiting_queue.append((user_id, username, websocket))
                else:
                    arena_manager.waiting_queue.append((user_id, username, websocket))
                    await websocket.send_json({"type": "waiting"})

        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            match_id = arena_manager.user_to_match.get(user_id)
            if match_id:
                msg_type = message.get("type")
                
                if msg_type in ["typing", "evaluating"]:
                    # Forward non-critical events to opponent
                    await arena_manager.broadcast_to_match(match_id, {
                        "type": "opponent_event",
                        "event": msg_type,
                        "user_id": user_id
                    })
                elif msg_type == "evaluated":
                    status = message.get("status")
                    passed = message.get("passed_count", 0)
                    total = message.get("total_count", 0)
                    
                    if user_id in arena_manager.active_matches[match_id]["state"]:
                        arena_manager.active_matches[match_id]["state"][user_id]["status"] = status
                        arena_manager.active_matches[match_id]["state"][user_id]["passed_tests"] = passed
                        arena_manager.active_matches[match_id]["state"][user_id]["total_tests"] = total
                    
                    # Notify opponent of evaluation progress
                    await arena_manager.broadcast_to_match(match_id, {
                        "type": "opponent_evaluated",
                        "user_id": user_id,
                        "status": status,
                        "passed_count": passed,
                        "total_count": total
                    })
                    
                    if status == "accepted":
                        # This player won!
                        await arena_manager.broadcast_to_match(match_id, {
                            "type": "match_ended",
                            "winner_id": user_id,
                            "reason": "solved"
                        })
                        try:
                            client.mutation("streaks:updateStats", {"userId": user_id, "matchPlayed": False, "matchWon": True})
                        except Exception:
                            pass
                elif msg_type == "leave":
                    # Find opponent id
                    opponent_id = None
                    for pid in arena_manager.active_matches[match_id]["players"].keys():
                        if pid != user_id:
                            opponent_id = pid
                            break
                            
                    # Handle forfeit
                    await arena_manager.broadcast_to_match(match_id, {
                        "type": "match_ended",
                        "winner_id": opponent_id,
                        "reason": "forfeit"
                    })
                    break

    except WebSocketDisconnect:
        arena_manager.disconnect(websocket, user_id)
