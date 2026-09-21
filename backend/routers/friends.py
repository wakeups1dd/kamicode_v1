from fastapi import APIRouter, Depends, HTTPException
from typing import List
from database import get_convex
from schemas import FriendRequestCreate, FriendshipResponse
from auth import get_required_user
from convex import ConvexClient

router = APIRouter(prefix="/api/friends", tags=["friends"])


@router.post("/request")
def send_friend_request(
    payload: FriendRequestCreate,
    client: ConvexClient = Depends(get_convex),
    current_user: dict = Depends(get_required_user),
):
    target_user = client.query("users:getByUsername", {"username": payload.friend_username.strip()})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if target_user.get("userId") == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot send friend request to yourself")

    try:
        client.mutation("friends:sendRequest", {
            "userId": current_user["id"],
            "friendId": target_user.get("userId")
        })
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"status": "success"}


@router.post("/accept/{friendship_id}")
def accept_friend_request(
    friendship_id: str,
    client: ConvexClient = Depends(get_convex),
    current_user: dict = Depends(get_required_user),
):
    try:
        client.mutation("friends:acceptRequest", {"requestId": friendship_id})
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to accept request: {str(e)}")
    return {"status": "success"}


@router.post("/reject/{friendship_id}")
def reject_friend_request(
    friendship_id: str,
    client: ConvexClient = Depends(get_convex),
    current_user: dict = Depends(get_required_user),
):
    try:
        client.mutation("friends:rejectRequest", {"requestId": friendship_id})
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to reject request: {str(e)}")
    return {"status": "success"}


@router.get("/", response_model=List[FriendshipResponse])
def get_friends(
    client: ConvexClient = Depends(get_convex),
    current_user: dict = Depends(get_required_user),
):
    """Retrieve all friends and pending friendship requests for the current user."""
    try:
        friendships = client.query("friends:listAllForUser", {"userId": current_user["id"]})
        if friendships:
            return friendships
    except Exception:
        pass

    # Seamless fallback to listPendingRequests + listFriends
    result = []
    try:
        pending = client.query("friends:listPendingRequests", {"userId": current_user["id"]}) or []
        for p in pending:
            req = p.get("request", {})
            usr = p.get("user", {})
            result.append({
                "id": str(req.get("_id") or req.get("id", "")),
                "user_id": req.get("userId", ""),
                "friend_id": req.get("friendId", current_user["id"]),
                "status": "pending",
                "friend_username": usr.get("username", "Anonymous"),
                "friend_display_name": usr.get("displayName") or usr.get("username", "Developer"),
                "friend_avatar_url": usr.get("avatarUrl"),
                "created_at": req.get("_creationTime"),
            })
    except Exception as e:
        print(f"[WARN] Failed to fetch pending requests: {e}")

    try:
        friends = client.query("friends:listFriends", {"userId": current_user["id"]}) or []
        for u in friends:
            result.append({
                "id": str(u.get("_id") or u.get("id", "")),
                "user_id": current_user["id"],
                "friend_id": u.get("userId", ""),
                "status": "accepted",
                "friend_username": u.get("username", "Anonymous"),
                "friend_display_name": u.get("displayName") or u.get("username", "Developer"),
                "friend_avatar_url": u.get("avatarUrl"),
                "created_at": u.get("_creationTime"),
            })
    except Exception as e:
        print(f"[WARN] Failed to fetch accepted friends: {e}")

    return result
