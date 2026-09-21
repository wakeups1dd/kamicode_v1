from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from database import get_convex
from auth import get_current_user
from convex import ConvexClient

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/profile/{username}")
def get_user_profile(
    username: str,
    client: ConvexClient = Depends(get_convex),
    current_user: Optional[dict] = Depends(get_current_user),
):
    """Retrieve public developer profile for a given username."""
    user = client.query("users:getByUsername", {"username": username.strip()})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user_id = user.get("userId")
    streak = client.query("streaks:getByUserId", {"userId": user_id}) or {}
    subs = client.query("submissions:listByUser", {"userId": user_id}) or []
    raw_badges = client.query("badges:listForUser", {"userId": user_id}) or []

    formatted_subs = []
    for s in subs:
        formatted_subs.append({
            "id": str(s.get("_id")),
            "problem_id": str(s.get("problemId")),
            "language": s.get("language", ""),
            "status": s.get("status", ""),
            "runtime_ms": s.get("runtimeMs"),
            "passed_count": s.get("passedCount", 0),
            "total_count": s.get("totalCount", 0),
            "created_at": s.get("_creationTime"),
        })

    formatted_badges = []
    for b in raw_badges:
        badge_obj = {
            "id": str(b.get("_id") or b.get("id", "")),
            "name": b.get("name", ""),
            "description": b.get("description", ""),
            "icon_name": b.get("iconName") or b.get("icon_name", "Award"),
            "condition_type": b.get("conditionType") or b.get("condition_type", ""),
            "condition_value": b.get("conditionValue") or b.get("condition_value", 0),
            "created_at": b.get("_creationTime"),
        }
        formatted_badges.append({
            "id": str(b.get("_id") or b.get("id", "")),
            "user_id": user_id,
            "badge": badge_obj,
            "awarded_at": b.get("awardedAt") or b.get("_creationTime"),
        })

    from presence import presence_manager
    is_online = presence_manager.is_online(user_id)
    last_seen = presence_manager.get_last_seen(user_id)

    return {
        "user_id": user_id,
        "username": user.get("username"),
        "display_name": user.get("displayName") or user.get("username"),
        "avatar_url": user.get("avatarUrl"),
        "created_at": user.get("_creationTime"),
        "is_online": is_online,
        "last_seen": last_seen,
        "streak": {
            "user_id": user_id,
            "current_streak": streak.get("currentStreak", 0),
            "longest_streak": streak.get("longestStreak", 0),
            "total_solves": streak.get("totalSolves", 0),
            "last_solve_date": streak.get("lastSolveDate"),
        },
        "submissions": formatted_subs,
        "badges": formatted_badges,
    }


@router.post("/heartbeat")
def record_heartbeat(
    current_user: dict = Depends(get_current_user),
):
    """Record heartbeat ping to maintain online presence."""
    if not current_user or not current_user.get("id"):
        return {"status": "ignored", "is_online": False}
    from presence import presence_manager
    presence_manager.record_activity(current_user["id"])
    return {"status": "ok", "is_online": True}


@router.post("/offline")
def set_user_offline(
    current_user: dict = Depends(get_current_user),
):
    """Explicitly mark user offline upon tab close or sign-out."""
    if not current_user or not current_user.get("id"):
        return {"status": "ignored", "is_online": False}
    from presence import presence_manager
    presence_manager.set_offline(current_user["id"])
    return {"status": "ok", "is_online": False}

