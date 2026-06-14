from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from database import get_db
from models import User, Badge, UserBadge, UserStat, UserStreak
from schemas import BadgeResponse, UserBadgeResponse
from auth import get_current_user

router = APIRouter(prefix="/api/badges", tags=["badges"])

@router.get("/me", response_model=List[UserBadgeResponse])
def get_my_badges(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get the current user's unlocked badges."""
    user_badges = db.query(UserBadge).filter(UserBadge.user_id == current_user.id).all()
    return user_badges

@router.get("/all", response_model=List[BadgeResponse])
def get_all_badges(db: Session = Depends(get_db)):
    """Get all available badges."""
    return db.query(Badge).all()

def evaluate_badges(user_id: str, db: Session) -> List[Badge]:
    """
    Evaluates if the user unlocked any new badges.
    Should be called after a submission or an arena match.
    Returns a list of newly unlocked Badge objects.
    """
    # Fetch user's current stats
    streak = db.query(UserStreak).filter(UserStreak.user_id == user_id).first()
    stats = db.query(UserStat).filter(UserStat.user_id == user_id).first()
    
    total_solves = streak.total_solves if streak else 0
    current_streak = streak.current_streak if streak else 0
    arena_wins = stats.arena_wins if stats else 0

    # Fetch all badges
    all_badges = db.query(Badge).all()
    
    # Fetch already unlocked badges
    unlocked_badge_ids = {
        ub.badge_id for ub in db.query(UserBadge).filter(UserBadge.user_id == user_id).all()
    }
    
    newly_unlocked = []
    
    for badge in all_badges:
        if badge.id in unlocked_badge_ids:
            continue
            
        unlocked = False
        if badge.condition_type == "total_solves" and total_solves >= badge.condition_value:
            unlocked = True
        elif badge.condition_type == "streak" and current_streak >= badge.condition_value:
            unlocked = True
        elif badge.condition_type == "arena_wins" and arena_wins >= badge.condition_value:
            unlocked = True
            
        if unlocked:
            new_ub = UserBadge(user_id=user_id, badge_id=badge.id)
            db.add(new_ub)
            newly_unlocked.append(badge)
            
    if newly_unlocked:
        db.commit()
        
    return newly_unlocked
