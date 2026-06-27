from fastapi import APIRouter, Depends
from typing import List

from database import get_convex
from auth import get_current_user

router = APIRouter(prefix="/api/badges", tags=["badges"])

@router.get("/me")
def get_my_badges(client = Depends(get_convex), current_user: dict = Depends(get_current_user)):
    """Get the current user's unlocked badges."""
    return client.query("badges:listForUser", {"userId": current_user["id"]})

@router.get("/all")
def get_all_badges(client = Depends(get_convex)):
    """Get all available badges."""
    return client.query("badges:list", {})

def evaluate_badges(user_id: str, client):
    """
    Evaluates if the user unlocked any new badges.
    This logic should ideally be a Convex mutation or action.
    """
    # Fetch user's current stats
    streak = client.query("streaks:getByUserId", {"userId": user_id})
    stats = client.query("streaks:getStats", {"userId": user_id})
    
    total_solves = streak.get("totalSolves", 0) if streak else 0
    current_streak = streak.get("currentStreak", 0) if streak else 0
    arena_wins = stats.get("arenaWins", 0) if stats else 0

    all_badges = client.query("badges:list", {})
    user_badges = client.query("badges:listForUser", {"userId": user_id})
    unlocked_badge_ids = {b.get("_id") for b in user_badges}
    
    newly_unlocked = []
    
    for badge in all_badges:
        if badge.get("_id") in unlocked_badge_ids:
            continue
            
        unlocked = False
        cond_type = badge.get("conditionType")
        cond_val = badge.get("conditionValue", 0)

        if cond_type == "total_solves" and total_solves >= cond_val:
            unlocked = True
        elif cond_type == "streak" and current_streak >= cond_val:
            unlocked = True
        elif cond_type == "arena_wins" and arena_wins >= cond_val:
            unlocked = True
            
        if unlocked:
            client.mutation("badges:award", {"userId": user_id, "badgeId": badge.get("_id")})
            newly_unlocked.append(badge)
            
    return newly_unlocked
