from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import UserStreak, User
from schemas import UserStreakResponse
from auth import get_current_user

router = APIRouter(prefix="/api/streaks", tags=["streaks"])


@router.get("/me", response_model=UserStreakResponse)
def get_my_streak(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve current user's coding streak statistics."""
    streak = db.query(UserStreak).filter(UserStreak.user_id == current_user.id).first()
    if not streak:
        # Return a zeroed streak if they haven't solved anything yet
        return UserStreakResponse(
            user_id=current_user.id,
            current_streak=0,
            longest_streak=0,
            last_solve_date=None,
            total_solves=0
        )
    return streak
