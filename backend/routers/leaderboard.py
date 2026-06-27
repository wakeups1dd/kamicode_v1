from fastapi import APIRouter, Depends, HTTPException
from typing import List

from database import get_convex
from schemas import LeaderboardEntry
from auth import get_current_user

router = APIRouter(prefix="/api/leaderboard", tags=["leaderboard"])

@router.get("/global")
def get_global_leaderboard(client = Depends(get_convex), current_user: dict = Depends(get_current_user)):
    """Get global leaderboard rankings based on total problems solved."""
    results = client.query("streaks:getGlobalLeaderboard", {})
    
    leaderboard = []
    for rank, r in enumerate(results, 1):
        leaderboard.append({
            "rank": rank,
            "user_id": r.get("userId"),
            "username": r.get("username"),
            "display_name": r.get("displayName"),
            "avatar_url": r.get("avatarUrl"),
            "total_solves": r.get("totalSolves", 0),
            "current_streak": r.get("currentStreak", 0),
            "longest_streak": r.get("longestStreak", 0)
        })
    return leaderboard

@router.get("/cohort/{slug}")
def get_cohort_leaderboard(slug: str, client = Depends(get_convex), current_user: dict = Depends(get_current_user)):
    """Get cohort-specific leaderboard rankings."""
    cohort = client.query("cohorts:getBySlug", {"slug": slug})
    if not cohort:
        raise HTTPException(status_code=404, detail="Cohort not found")
        
    members = client.query("cohorts:getMembers", {"cohortId": cohort.get("_id")})
    is_member = any(m.get("userId") == current_user["id"] for m in members)
    if not is_member:
        raise HTTPException(status_code=403, detail="You are not a member of this cohort")

    results = client.query("streaks:getCohortLeaderboard", {"cohortId": cohort.get("_id")})

    leaderboard = []
    for rank, r in enumerate(results, 1):
        leaderboard.append({
            "rank": rank,
            "user_id": r.get("userId"),
            "username": r.get("username"),
            "display_name": r.get("displayName"),
            "avatar_url": r.get("avatarUrl"),
            "total_solves": r.get("totalSolves", 0),
            "current_streak": r.get("currentStreak", 0),
            "longest_streak": r.get("longestStreak", 0)
        })
    return leaderboard
