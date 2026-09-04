from fastapi import APIRouter, Depends
from database import get_convex
from schemas import UserStreakResponse
from auth import get_required_user
from convex import ConvexClient

router = APIRouter(prefix="/api/streaks", tags=["streaks"])


@router.get("/me", response_model=UserStreakResponse)
def get_my_streak(
    client: ConvexClient = Depends(get_convex),
    current_user: dict = Depends(get_required_user),
):
    """Retrieve current user's coding streak statistics."""
    streak = client.query("streaks:getByUserId", {"userId": current_user["id"]})
    if not streak:
        return {
            "user_id": current_user["id"],
            "current_streak": 0,
            "longest_streak": 0,
            "last_solve_date": None,
            "total_solves": 0,
        }
    
    return {
        "user_id": streak.get("userId", current_user["id"]),
        "current_streak": streak.get("currentStreak", 0),
        "longest_streak": streak.get("longestStreak", 0),
        "last_solve_date": streak.get("lastSolveDate"),
        "total_solves": streak.get("totalSolves", 0),
    }
