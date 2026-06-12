from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import UserStreak, User, Cohort, CohortMember
from schemas import LeaderboardEntry
from auth import get_current_user

router = APIRouter(prefix="/api/leaderboard", tags=["leaderboard"])


@router.get("/global", response_model=List[LeaderboardEntry])
def get_global_leaderboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get global leaderboard rankings based on total problems solved."""
    results = (
        db.query(
            UserStreak.user_id,
            UserStreak.total_solves,
            UserStreak.current_streak,
            UserStreak.longest_streak,
            User.username,
            User.display_name,
            User.avatar_url
        )
        .join(User, UserStreak.user_id == User.id)
        .order_by(UserStreak.total_solves.desc(), UserStreak.current_streak.desc())
        .limit(100)
        .all()
    )

    leaderboard = []
    for rank, r in enumerate(results, 1):
        leaderboard.append(
            LeaderboardEntry(
                rank=rank,
                user_id=r.user_id,
                username=r.username,
                display_name=r.display_name,
                avatar_url=r.avatar_url,
                total_solves=r.total_solves,
                current_streak=r.current_streak,
                longest_streak=r.longest_streak
            )
        )
    return leaderboard


@router.get("/cohort/{cohort_id}", response_model=List[LeaderboardEntry])
def get_cohort_leaderboard(
    cohort_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get cohort-specific leaderboard rankings."""
    # Check if cohort exists
    cohort = db.query(Cohort).filter(Cohort.id == cohort_id).first()
    if not cohort:
        raise HTTPException(status_code=404, detail="Cohort not found")

    # Check if user is member
    is_member = db.query(CohortMember).filter(
        CohortMember.cohort_id == cohort_id,
        CohortMember.user_id == current_user.id
    ).first()
    if not is_member:
        raise HTTPException(status_code=403, detail="You are not a member of this cohort")

    # Fetch cohort members' streak details
    results = (
        db.query(
            CohortMember.user_id,
            User.username,
            User.display_name,
            User.avatar_url,
            UserStreak.total_solves,
            UserStreak.current_streak,
            UserStreak.longest_streak
        )
        .join(User, CohortMember.user_id == User.id)
        .outerjoin(UserStreak, CohortMember.user_id == UserStreak.user_id)
        .filter(CohortMember.cohort_id == cohort_id)
        .order_by(
            UserStreak.total_solves.desc().nullslast(),
            UserStreak.current_streak.desc().nullslast()
        )
        .all()
    )

    leaderboard = []
    for rank, r in enumerate(results, 1):
        leaderboard.append(
            LeaderboardEntry(
                rank=rank,
                user_id=r.user_id,
                username=r.username,
                display_name=r.display_name,
                avatar_url=r.avatar_url,
                total_solves=r.total_solves or 0,
                current_streak=r.current_streak or 0,
                longest_streak=r.longest_streak or 0
            )
        )
    return leaderboard
