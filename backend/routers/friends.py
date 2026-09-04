from fastapi import APIRouter, Depends, HTTPException
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
    target_user = client.query("users:getByUsername", {"username": payload.friend_username})
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
    client.mutation("friends:acceptRequest", {"requestId": friendship_id})
    return {"status": "success"}


@router.post("/reject/{friendship_id}")
def reject_friend_request(
    friendship_id: str,
    client: ConvexClient = Depends(get_convex),
    current_user: dict = Depends(get_required_user),
):
    client.mutation("friends:rejectRequest", {"requestId": friendship_id})
    return {"status": "success"}


@router.get("/")
def get_friends(
    client: ConvexClient = Depends(get_convex),
    current_user: dict = Depends(get_required_user),
):
    friends = client.query("friends:listFriends", {"userId": current_user["id"]})
    return friends
