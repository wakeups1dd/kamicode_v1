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
    from presence import presence_manager
    my_id = current_user["id"]
    presence_manager.record_activity(my_id)

    raw_friendships = []
    try:
        raw_friendships = client.query("friends:listAllForUser", {"userId": my_id}) or []
    except Exception:
        pass

    if raw_friendships:
        result = []
        for f in raw_friendships:
            other_user_id = f.get("friend_id") if f.get("user_id") == my_id else f.get("user_id")
            if not other_user_id or other_user_id == my_id:
                other_user_id = f.get("friend_id") if f.get("friend_id") != my_id else f.get("user_id")

            result.append({
                "id": str(f.get("id") or f.get("_id", "")),
                "user_id": f.get("user_id", ""),
                "friend_id": f.get("friend_id", ""),
                "status": f.get("status", ""),
                "friend_username": f.get("friend_username"),
                "friend_display_name": f.get("friend_display_name"),
                "friend_avatar_url": f.get("friend_avatar_url"),
                "created_at": f.get("created_at") or f.get("_creationTime"),
                "is_online": presence_manager.is_online(other_user_id),
                "last_seen": presence_manager.get_last_seen(other_user_id),
            })
        return result

    # Seamless fallback to listPendingRequests + listFriends
    result = []
    try:
        pending = client.query("friends:listPendingRequests", {"userId": my_id}) or []
        for p in pending:
            req = p.get("request", {})
            usr = p.get("user", {})
            other_id = req.get("userId", "")
            result.append({
                "id": str(req.get("_id") or req.get("id", "")),
                "user_id": other_id,
                "friend_id": req.get("friendId", my_id),
                "status": "pending",
                "friend_username": usr.get("username", "Anonymous"),
                "friend_display_name": usr.get("displayName") or usr.get("username", "Developer"),
                "friend_avatar_url": usr.get("avatarUrl"),
                "created_at": req.get("_creationTime"),
                "is_online": presence_manager.is_online(other_id),
                "last_seen": presence_manager.get_last_seen(other_id),
            })
    except Exception as e:
        print(f"[WARN] Failed to fetch pending requests: {e}")

    try:
        friends = client.query("friends:listFriends", {"userId": my_id}) or []
        for u in friends:
            other_id = u.get("userId", "")
            result.append({
                "id": str(u.get("_id") or u.get("id", "")),
                "user_id": my_id,
                "friend_id": other_id,
                "status": "accepted",
                "friend_username": u.get("username", "Anonymous"),
                "friend_display_name": u.get("displayName") or u.get("username", "Developer"),
                "friend_avatar_url": u.get("avatarUrl"),
                "created_at": u.get("_creationTime"),
                "is_online": presence_manager.is_online(other_id),
                "last_seen": presence_manager.get_last_seen(other_id),
            })
    except Exception as e:
        print(f"[WARN] Failed to fetch accepted friends: {e}")

    return result
