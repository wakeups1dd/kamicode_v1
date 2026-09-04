"""
Multiplayer Arena Router — Handles 1v1 PvP matchmaking, WebSockets, match lifecycles,
fair problem reveal, heartbeat tracking, 30s disconnect windows, and Elo rating updates.
"""

import uuid
import json
import random
import time
import asyncio
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Request
from pydantic import BaseModel

from database import get_convex
from auth import get_required_user
from arena_state import arena_manager, calculate_elo_change
from limiter import limiter
from config import settings
from convex import ConvexClient

router = APIRouter(prefix="/api/arena", tags=["arena"])


class ArenaInvite(BaseModel):
    target_user_id: str
    room_code: str


@router.post("/invite")
@limiter.limit("20/minute")
def send_arena_invite(
    request: Request,
    payload: ArenaInvite,
    client: ConvexClient = Depends(get_convex),
    current_user: dict = Depends(get_required_user),
):
    """Send an arena match invitation to a friend."""
    target = payload.target_user_id
    if target not in arena_manager.match_invites:
        arena_manager.match_invites[target] = []
    
    user_id = current_user["id"]
    # Remove old invites from same sender
    arena_manager.match_invites[target] = [
        inv for inv in arena_manager.match_invites[target] if inv["sender_id"] != user_id
    ]
    
    # Fetch sender display name from Convex
    sender = client.query("users:getByUserId", {"userId": user_id})
    sender_name = (
        sender.get("displayName") or sender.get("username")
        if sender
        else f"User_{user_id[:4]}"
    )

    arena_manager.match_invites[target].append({
        "room_code": payload.room_code,
        "sender_id": user_id,
        "sender_name": sender_name,
    })
    return {"status": "ok"}


@router.get("/invites")
def get_arena_invites(current_user: dict = Depends(get_required_user)):
    """Retrieve and clear pending match invites for the authenticated user."""
    user_id = current_user["id"]
    invites = arena_manager.match_invites.get(user_id, [])
    if user_id in arena_manager.match_invites:
        arena_manager.match_invites[user_id] = []
    return invites


# ─── Match Helper Functions ─────────────────────────────────────────────

async def _finish_match(
    match_id: str,
    winner_id: Optional[str],
    reason: str,
    client: ConvexClient,
):
    """
    Finalize an arena match, calculate Elo rating deltas, record to Convex DB,
    and broadcast outcome to players.
    """
    if match_id not in arena_manager.active_matches:
        return

    match = arena_manager.active_matches[match_id]
    if match["status"] in ("finished", "abandoned"):
        return

    match["status"] = "finished" if winner_id else "abandoned"
    match["ended_at"] = time.time()
    duration = int(match["ended_at"] - match.get("started_at", match["ended_at"]))

    players = list(match["players"].keys())
    if len(players) >= 2:
        p1_id, p2_id = players[0], players[1]
        p1_elo = match["players"][p1_id].get("elo", 1200)
        p2_elo = match["players"][p2_id].get("elo", 1200)

        # Determine score
        if winner_id == p1_id:
            score_p1 = 1.0
        elif winner_id == p2_id:
            score_p1 = 0.0
        else:
            score_p1 = 0.5

        delta_p1, delta_p2 = calculate_elo_change(p1_elo, p2_elo, score_p1)
        p1_elo_after = max(100, p1_elo + delta_p1)
        p2_elo_after = max(100, p2_elo + delta_p2)

        elo_payload = {
            p1_id: {"before": p1_elo, "after": p1_elo_after, "delta": delta_p1},
            p2_id: {"before": p2_elo, "after": p2_elo_after, "delta": delta_p2},
        }

        # Record match in Convex
        try:
            client.mutation("matches:recordResult", {
                "matchId": match_id,
                "player1Id": p1_id,
                "player2Id": p2_id,
                "winnerId": winner_id,
                "problemId": match.get("problem_id", ""),
                "status": match["status"],
                "durationSeconds": duration,
                "p1EloBefore": p1_elo,
                "p1EloAfter": p1_elo_after,
                "p2EloBefore": p2_elo,
                "p2EloAfter": p2_elo_after,
                "startedAt": int(match.get("started_at", time.time()) * 1000),
                "endedAt": int(match["ended_at"] * 1000),
            })
        except Exception as e:
            print(f"[ERROR] Failed to record match result: {e}")

        # Broadcast match ended event
        await arena_manager.broadcast_to_match(match_id, {
            "type": "match_ended",
            "match_id": match_id,
            "winner_id": winner_id,
            "reason": reason,
            "duration_seconds": duration,
            "elo": elo_payload,
        })
    else:
        await arena_manager.broadcast_to_match(match_id, {
            "type": "match_ended",
            "match_id": match_id,
            "winner_id": winner_id,
            "reason": reason,
        })


async def _handle_forfeit_callback(match_id: str, disconnected_user_id: str):
    """Callback invoked after 30s disconnect grace timer expires without reconnection."""
    if match_id not in arena_manager.active_matches:
        return

    match = arena_manager.active_matches[match_id]
    if match["status"] != "in_progress":
        return

    # Find opponent
    opponent_id = None
    for pid in match["players"]:
        if pid != disconnected_user_id:
            opponent_id = pid
            break

    client = ConvexClient(settings.convex_url)
    await _finish_match(
        match_id=match_id,
        winner_id=opponent_id,
        reason="opponent_disconnected",
        client=client,
    )


# ─── WebSocket Endpoint ─────────────────────────────────────────────────

@router.websocket("/ws/{user_id}")
async def arena_websocket(websocket: WebSocket, user_id: str, room_code: Optional[str] = None):
    """
    Real-time 1v1 PvP Arena WebSocket endpoint.
    Handles matchmaking, countdowns, real-time code progress, and disconnect windows.
    """
    client = ConvexClient(settings.convex_url)
    await arena_manager.connect(websocket)

    # Fetch user profile and Elo rating
    user = None
    try:
        user = client.query("users:getByUserId", {"userId": user_id})
    except Exception:
        pass

    username = user["username"] if user else f"User_{user_id[:4]}"
    user_elo = (user.get("eloRating") or 1200) if user else 1200

    try:
        # Check if user is reconnecting to an active match
        reconnected_match_id = arena_manager.handle_reconnect(user_id, websocket)
        if reconnected_match_id:
            match = arena_manager.active_matches[reconnected_match_id]
            await websocket.send_json({
                "type": "reconnected",
                "match_id": reconnected_match_id,
                "problem_id": match["problem_id"],
                "problem_slug": match["problem_slug"],
                "problem_title": match["problem_title"],
                "status": match["status"],
                "players": [
                    {"user_id": pid, "username": pdata["username"], "elo": pdata.get("elo", 1200)}
                    for pid, pdata in match["players"].items()
                ],
                "state": {
                    pid: {
                        "status": pdata.get("status", "started"),
                        "passed_tests": pdata.get("passed_tests", 0),
                        "total_tests": pdata.get("total_tests", 0),
                    }
                    for pid, pdata in match["players"].items()
                },
            })
            # Notify opponent that player has reconnected
            await arena_manager.broadcast_to_match(reconnected_match_id, {
                "type": "player_reconnected",
                "user_id": user_id,
            })
        else:
            # Matchmaking Creator Helper
            async def start_match(opponent_id: str, opp_username: str, opp_elo: int, opp_ws: WebSocket):
                match_id = str(uuid.uuid4())

                # Select a random problem from Convex
                problem = None
                try:
                    problems = client.query("problems:list", {})
                    if problems:
                        problem = random.choice(problems)
                except Exception:
                    pass

                problem_id = str(problem["_id"]) if problem else "1"
                problem_slug = problem.get("slug", "two-sum") if problem else "two-sum"
                problem_title = problem.get("title", "Two Sum") if problem else "Two Sum"

                match_data = {
                    "match_id": match_id,
                    "problem_id": problem_id,
                    "problem_slug": problem_slug,
                    "problem_title": problem_title,
                    "status": "countdown",
                    "started_at": time.time(),
                    "players": {
                        user_id: {
                            "ws": websocket,
                            "username": username,
                            "elo": user_elo,
                            "connected": True,
                            "status": "starting",
                            "passed_tests": 0,
                            "total_tests": 0,
                            "last_ping": time.time(),
                        },
                        opponent_id: {
                            "ws": opp_ws,
                            "username": opp_username,
                            "elo": opp_elo,
                            "connected": True,
                            "status": "starting",
                            "passed_tests": 0,
                            "total_tests": 0,
                            "last_ping": time.time(),
                        },
                    },
                }
                arena_manager.active_matches[match_id] = match_data
                arena_manager.user_to_match[user_id] = match_id
                arena_manager.user_to_match[opponent_id] = match_id

                # Broadcast match found with 3s synchronized countdown
                await arena_manager.broadcast_to_match(match_id, {
                    "type": "match_found",
                    "match_id": match_id,
                    "countdown_seconds": 3,
                    "problem_title": problem_title,
                    "problem_slug": problem_slug,
                    "players": [
                        {"user_id": user_id, "username": username, "elo": user_elo},
                        {"user_id": opponent_id, "username": opp_username, "elo": opp_elo},
                    ],
                })

                # Transition to in_progress after countdown
                async def _countdown_transition():
                    await asyncio.sleep(3)
                    if match_id in arena_manager.active_matches:
                        arena_manager.active_matches[match_id]["status"] = "in_progress"
                        await arena_manager.broadcast_to_match(match_id, {
                            "type": "match_start",
                            "match_id": match_id,
                            "problem_id": problem_id,
                            "problem_slug": problem_slug,
                            "problem_title": problem_title,
                        })

                asyncio.create_task(_countdown_transition())

            # Handle Private Room vs Public Queue
            if room_code:
                if room_code in arena_manager.private_rooms:
                    opp_id, opp_name, opp_elo_val, opp_socket = arena_manager.private_rooms.pop(room_code)
                    if opp_id != user_id:
                        await start_match(opp_id, opp_name, opp_elo_val, opp_socket)
                    else:
                        arena_manager.private_rooms[room_code] = (user_id, username, user_elo, websocket)
                else:
                    arena_manager.private_rooms[room_code] = (user_id, username, user_elo, websocket)
                    await websocket.send_json({"type": "waiting_private", "room_code": room_code})
            else:
                if arena_manager.waiting_queue:
                    opp_id, opp_name, opp_elo_val, opp_socket = arena_manager.waiting_queue.pop(0)
                    if opp_id != user_id:
                        await start_match(opp_id, opp_name, opp_elo_val, opp_socket)
                    else:
                        arena_manager.waiting_queue.append((user_id, username, user_elo, websocket))
                else:
                    arena_manager.waiting_queue.append((user_id, username, user_elo, websocket))
                    await websocket.send_json({"type": "waiting"})

        # Event processing loop
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            msg_type = message.get("type")

            # Heartbeat ping/pong
            if msg_type == "ping":
                arena_manager.record_ping(user_id)
                await websocket.send_json({"type": "pong"})
                continue

            match_id = arena_manager.user_to_match.get(user_id)
            if not match_id or match_id not in arena_manager.active_matches:
                continue

            match = arena_manager.active_matches[match_id]

            if msg_type in ("typing", "evaluating"):
                # Forward live activity to opponent
                await arena_manager.broadcast_to_match(
                    match_id,
                    {
                        "type": "opponent_event",
                        "event": msg_type,
                        "user_id": user_id,
                    },
                    exclude_user_id=user_id,
                )

            elif msg_type == "anticheat_event":
                event_name = message.get("event", "tab_switch")
                details = message.get("details", "")
                if user_id in match["players"]:
                    player_data = match["players"][user_id]
                    if "anticheat_flags" not in player_data:
                        player_data["anticheat_flags"] = []
                    player_data["anticheat_flags"].append({
                        "event": event_name,
                        "details": details,
                        "timestamp": time.time(),
                    })
                # Broadcast anti-cheat notification to opponent
                await arena_manager.broadcast_to_match(
                    match_id,
                    {
                        "type": "anticheat_warning",
                        "user_id": user_id,
                        "event": event_name,
                    },
                    exclude_user_id=user_id,
                )

            elif msg_type == "evaluated":
                status = message.get("status", "wrong_answer")
                passed = message.get("passed_count", 0)
                total = message.get("total_count", 0)

                if user_id in match["players"]:
                    match["players"][user_id]["status"] = status
                    match["players"][user_id]["passed_tests"] = passed
                    match["players"][user_id]["total_tests"] = total

                # Notify opponent of evaluation progress
                await arena_manager.broadcast_to_match(
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

                # If solved, declare victory!
                if status == "accepted":
                    await _finish_match(
                        match_id=match_id,
                        winner_id=user_id,
                        reason="solved",
                        client=client,
                    )

            elif msg_type == "leave":
                # Find opponent
                opponent_id = None
                for pid in match["players"]:
                    if pid != user_id:
                        opponent_id = pid
                        break

                # Forfeit the match
                await _finish_match(
                    match_id=match_id,
                    winner_id=opponent_id,
                    reason="forfeit",
                    client=client,
                )
                break

    except WebSocketDisconnect:
        arena_manager.remove_from_queues(user_id)
        match_id = arena_manager.user_to_match.get(user_id)
        if match_id and match_id in arena_manager.active_matches:
            match = arena_manager.active_matches[match_id]
            if user_id in match["players"]:
                match["players"][user_id]["connected"] = False

            if match["status"] in ("countdown", "in_progress"):
                # Notify opponent of disconnect and start 30s grace window
                await arena_manager.broadcast_to_match(match_id, {
                    "type": "player_disconnected",
                    "user_id": user_id,
                    "reconnect_window_sec": 30,
                })
                arena_manager.start_disconnect_grace_timer(
                    match_id=match_id,
                    user_id=user_id,
                    callback=_handle_forfeit_callback,
                )
