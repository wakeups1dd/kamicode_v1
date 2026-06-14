import uuid
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from sqlalchemy.sql.expression import func

from database import get_db
from models import User, Problem
from arena_state import arena_manager

router = APIRouter(prefix="/api/arena", tags=["arena"])

@router.websocket("/ws/{user_id}")
async def arena_websocket(websocket: WebSocket, user_id: str, db: Session = Depends(get_db)):
    await arena_manager.connect(websocket)
    
    # Try to fetch user, fallback to simple ID
    user = db.query(User).filter(User.id == user_id).first()
    username = user.username if user else f"User_{user_id[:4]}"

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
            # Matchmaking
            if arena_manager.waiting_queue:
                opponent_id, opp_username, opp_ws = arena_manager.waiting_queue.pop(0)
                if opponent_id != user_id:
                    match_id = str(uuid.uuid4())
                    
                    # Pick a random problem from the database
                    problem = db.query(Problem).order_by(func.random()).first()
                    # Fallback if DB is empty
                    problem_id = problem.id if problem else 1
                    problem_slug = problem.slug if problem else "two-sum"
                    problem_title = problem.title if problem else "Two Sum"
                    
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
                elif msg_type == "leave":
                    # Handle forfeit
                    await arena_manager.broadcast_to_match(match_id, {
                        "type": "match_ended",
                        "winner_id": "opponent",
                        "reason": "forfeit"
                    })
                    break

    except WebSocketDisconnect:
        arena_manager.disconnect(websocket, user_id)
