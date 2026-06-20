from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from database import get_db
from models import Friendship, FriendshipStatus, User
from auth import get_current_user

router = APIRouter(prefix="/api/friends", tags=["friends"])

class FriendRequestCreate(BaseModel):
    friend_username: str

class FriendshipResponse(BaseModel):
    id: int
    user_id: str
    friend_id: str
    status: str
    created_at: datetime
    friend_username: Optional[str] = None
    friend_display_name: Optional[str] = None
    friend_avatar_url: Optional[str] = None

    model_config = {"from_attributes": True}

@router.post("/request", response_model=FriendshipResponse)
def send_friend_request(
    payload: FriendRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    target_user = db.query(User).filter(User.username == payload.friend_username).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if target_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot send friend request to yourself")

    existing = db.query(Friendship).filter(
        or_(
            and_(Friendship.user_id == current_user.id, Friendship.friend_id == target_user.id),
            and_(Friendship.user_id == target_user.id, Friendship.friend_id == current_user.id)
        )
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Friendship or request already exists")

    friendship = Friendship(
        user_id=current_user.id,
        friend_id=target_user.id,
        status=FriendshipStatus.PENDING
    )
    db.add(friendship)
    db.commit()
    db.refresh(friendship)

    return {
        **friendship.__dict__,
        "friend_username": target_user.username,
        "friend_display_name": target_user.display_name,
        "friend_avatar_url": target_user.avatar_url
    }

@router.post("/accept/{friendship_id}", response_model=FriendshipResponse)
def accept_friend_request(
    friendship_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    friendship = db.query(Friendship).filter(Friendship.id == friendship_id).first()
    if not friendship:
        raise HTTPException(status_code=404, detail="Friend request not found")
    
    if friendship.friend_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to accept this request")
    
    if friendship.status != FriendshipStatus.PENDING:
        raise HTTPException(status_code=400, detail="Request is not pending")

    friendship.status = FriendshipStatus.ACCEPTED
    db.commit()
    db.refresh(friendship)

    sender = db.query(User).filter(User.id == friendship.user_id).first()

    return {
        **friendship.__dict__,
        "friend_username": sender.username,
        "friend_display_name": sender.display_name,
        "friend_avatar_url": sender.avatar_url
    }

@router.post("/reject/{friendship_id}", response_model=FriendshipResponse)
def reject_friend_request(
    friendship_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    friendship = db.query(Friendship).filter(Friendship.id == friendship_id).first()
    if not friendship:
        raise HTTPException(status_code=404, detail="Friend request not found")
    
    if friendship.friend_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to reject this request")
    
    if friendship.status != FriendshipStatus.PENDING:
        raise HTTPException(status_code=400, detail="Request is not pending")

    friendship.status = FriendshipStatus.REJECTED
    db.commit()
    db.refresh(friendship)

    sender = db.query(User).filter(User.id == friendship.user_id).first()

    return {
        **friendship.__dict__,
        "friend_username": sender.username,
        "friend_display_name": sender.display_name,
        "friend_avatar_url": sender.avatar_url
    }

@router.get("/", response_model=List[FriendshipResponse])
def get_friends(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    friendships = db.query(Friendship).filter(
        or_(
            Friendship.user_id == current_user.id,
            Friendship.friend_id == current_user.id
        )
    ).all()

    results = []
    for f in friendships:
        other_id = f.friend_id if f.user_id == current_user.id else f.user_id
        other_user = db.query(User).filter(User.id == other_id).first()
        
        # If the user is the sender and status is pending, it's an "outgoing" request.
        # We handle this loosely here, frontend can distinguish by comparing user_id.
        results.append({
            "id": f.id,
            "user_id": f.user_id,
            "friend_id": f.friend_id,
            "status": f.status.value if hasattr(f.status, 'value') else f.status,
            "created_at": f.created_at,
            "friend_username": other_user.username if other_user else "Unknown",
            "friend_display_name": other_user.display_name if other_user else None,
            "friend_avatar_url": other_user.avatar_url if other_user else None
        })

    return results
