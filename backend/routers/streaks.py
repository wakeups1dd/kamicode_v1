from fastapi import APIRouter, Depends
from database import get_convex
from auth import get_current_user

router = APIRouter(prefix="/api/streaks", tags=["streaks"])

@router.get("/me")
def get_my_streak(client = Depends(get_convex), current_user: dict = Depends(get_current_user)):
    """Retrieve current user's coding streak statistics."""
    streak = client.query("streaks:getByUserId", {"userId": current_user["id"]})
    if not streak:
        # Return a zeroed streak if they haven't solved anything yet
        return {
            "user_id": current_user["id"],
            "current_streak": 0,
            "longest_streak": 0,
            "last_solve_date": None,
            "total_solves": 0
        }
    
    # Map from camelCase to snake_case for frontend/API compatibility
    return {
        "user_id": streak.get("userId"),
        "current_streak": streak.get("currentStreak"),
        "longest_streak": streak.get("longestStreak"),
        "last_solve_date": streak.get("lastSolveDate"),
        "total_solves": streak.get("totalSolves")
    }
