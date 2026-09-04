import secrets
import random
from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import date, datetime

from database import get_convex
from schemas import (
    CohortCreate,
    CohortUpdate,
    CohortResponse,
    CohortDetailResponse,
    CohortMemberResponse,
    DailyChallengeCreate,
    DailyChallengeResponse,
)
from auth import get_required_user
from convex import ConvexClient

router = APIRouter(prefix="/api/cohorts", tags=["cohorts"])


def generate_invite_code(client: ConvexClient) -> str:
    """Generate a unique 6-character uppercase alphanumeric code."""
    while True:
        code = "".join(secrets.choice("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789") for _ in range(6))
        exists = client.query("cohorts:getByInviteCode", {"inviteCode": code})
        if not exists:
            return code


@router.post("/", response_model=CohortResponse, status_code=201)
def create_cohort(
    payload: CohortCreate,
    client: ConvexClient = Depends(get_convex),
    current_user: dict = Depends(get_required_user),
):
    """Create a new cohort coding league and generate a unique join invite code."""
    base_slug = payload.name.lower().strip().replace(" ", "-")
    base_slug = "".join(c for c in base_slug if c.isalnum() or c == "-")
    slug = base_slug
    counter = 1
    while client.query("cohorts:getBySlug", {"slug": slug}):
        slug = f"{base_slug}-{counter}"
        counter += 1

    invite_code = generate_invite_code(client)
    
    cohort_id = client.mutation("cohorts:create", {
        "name": payload.name,
        "slug": slug,
        "description": payload.description,
        "inviteCode": invite_code,
        "createdBy": current_user["id"]
    })
    
    res = client.query("cohorts:getBySlug", {"slug": slug})
    if res:
        res["id"] = str(res["_id"])
        res["created_by"] = res.get("createdBy")
        res["invite_code"] = res.get("inviteCode")
        res["created_at"] = res.get("_creationTime")
    return res


@router.post("/join", response_model=CohortResponse)
def join_cohort(
    payload: dict,
    client: ConvexClient = Depends(get_convex),
    current_user: dict = Depends(get_required_user),
):
    """Join a cohort coding league using a 6-character invite code."""
    invite_code = payload.get("invite_code")
    if not invite_code:
        raise HTTPException(status_code=400, detail="Invite code is required")
    
    invite_code = invite_code.strip().upper()
    cohort = client.query("cohorts:getByInviteCode", {"inviteCode": invite_code})
    if not cohort:
        raise HTTPException(status_code=404, detail="Cohort not found with this invite code")

    client.mutation("cohorts:join", {"cohortId": cohort.get("_id"), "userId": current_user["id"]})
    cohort["id"] = str(cohort["_id"])
    cohort["created_by"] = cohort.get("createdBy")
    cohort["invite_code"] = cohort.get("inviteCode")
    cohort["created_at"] = cohort.get("_creationTime")
    return cohort


@router.get("/me")
def get_my_cohorts(
    client: ConvexClient = Depends(get_convex),
    current_user: dict = Depends(get_required_user),
):
    """List all cohorts that the current user belongs to."""
    cohorts = client.query("cohorts:listForUser", {"userId": current_user["id"]})
    for c in cohorts:
        c["id"] = str(c.get("_id"))
        c["created_by"] = c.get("createdBy")
        c["invite_code"] = c.get("inviteCode")
        c["created_at"] = c.get("_creationTime")
    return cohorts


@router.get("/{slug}")
def get_cohort_detail(
    slug: str,
    client: ConvexClient = Depends(get_convex),
    current_user: dict = Depends(get_required_user),
):
    """Get detailed information about a cohort, including membership list."""
    cohort = client.query("cohorts:getBySlug", {"slug": slug})
    if not cohort:
        raise HTTPException(status_code=404, detail="Cohort not found")

    members = client.query("cohorts:getMembers", {"cohortId": cohort.get("_id")})
    is_member = any(m.get("userId") == current_user["id"] for m in members)
    
    if not is_member:
        raise HTTPException(status_code=403, detail="You are not a member of this cohort")

    return {
        "id": str(cohort.get("_id")),
        "name": cohort.get("name"),
        "slug": cohort.get("slug"),
        "description": cohort.get("description"),
        "invite_code": cohort.get("inviteCode"),
        "created_by": cohort.get("createdBy"),
        "created_at": cohort.get("_creationTime"),
        "members": [
            {
                "user_id": m.get("userId"),
                "username": m.get("username"),
                "display_name": m.get("displayName"),
                "avatar_url": m.get("avatarUrl"),
                "role": m.get("role"),
                "joined_at": m.get("joinedAt")
            } for m in members
        ]
    }


@router.post("/{slug}/leave", status_code=200)
def leave_cohort(
    slug: str,
    client: ConvexClient = Depends(get_convex),
    current_user: dict = Depends(get_required_user),
):
    """Leave a cohort."""
    cohort = client.query("cohorts:getBySlug", {"slug": slug})
    if not cohort:
        raise HTTPException(status_code=404, detail="Cohort not found")

    members = client.query("cohorts:getMembers", {"cohortId": cohort.get("_id")})
    user_member = next((m for m in members if m.get("userId") == current_user["id"]), None)
    
    if not user_member:
        raise HTTPException(status_code=400, detail="You are not a member of this cohort")

    if user_member.get("role") == "admin":
        admin_count = sum(1 for m in members if m.get("role") == "admin")
        if admin_count == 1:
            raise HTTPException(status_code=400, detail="You are the only admin. You cannot leave the cohort.")

    client.mutation("cohorts:leave", {"cohortId": cohort.get("_id"), "userId": current_user["id"]})
    return {"status": "success", "message": "Successfully left the cohort"}


@router.put("/{slug}")
def update_cohort(
    slug: str,
    payload: CohortUpdate,
    client: ConvexClient = Depends(get_convex),
    current_user: dict = Depends(get_required_user),
):
    """Update cohort details. Only admins can update."""
    cohort = client.query("cohorts:getBySlug", {"slug": slug})
    if not cohort:
        raise HTTPException(status_code=404, detail="Cohort not found")

    members = client.query("cohorts:getMembers", {"cohortId": cohort.get("_id")})
    user_member = next((m for m in members if m.get("userId") == current_user["id"]), None)
    
    if not user_member or user_member.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update the cohort")

    client.mutation("cohorts:update", {
        "cohortId": cohort.get("_id"),
        "name": payload.name,
        "description": payload.description
    })
    
    updated = client.query("cohorts:getBySlug", {"slug": slug})
    updated["id"] = str(updated["_id"])
    updated["created_by"] = updated.get("createdBy")
    updated["invite_code"] = updated.get("inviteCode")
    updated["created_at"] = updated.get("_creationTime")
    return updated


@router.delete("/{slug}", status_code=204)
def delete_cohort(
    slug: str,
    client: ConvexClient = Depends(get_convex),
    current_user: dict = Depends(get_required_user),
):
    """Delete a cohort entirely. Only admins can delete."""
    cohort = client.query("cohorts:getBySlug", {"slug": slug})
    if not cohort:
        raise HTTPException(status_code=404, detail="Cohort not found")

    members = client.query("cohorts:getMembers", {"cohortId": cohort.get("_id")})
    user_member = next((m for m in members if m.get("userId") == current_user["id"]), None)
    
    if not user_member or user_member.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete the cohort")

    client.mutation("cohorts:deleteCohort", {"cohortId": cohort.get("_id")})
    return None


@router.get("/{slug}/daily-challenge")
def get_daily_challenge(
    slug: str,
    client: ConvexClient = Depends(get_convex),
    current_user: dict = Depends(get_required_user),
):
    """Get or generate the daily challenge for a cohort."""
    cohort = client.query("cohorts:getBySlug", {"slug": slug})
    if not cohort:
        raise HTTPException(status_code=404, detail="Cohort not found")

    members = client.query("cohorts:getMembers", {"cohortId": cohort.get("_id")})
    is_member = any(m.get("userId") == current_user["id"] for m in members)
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a member of this cohort")

    today = date.today().isoformat()
    challenge = client.query("cohorts:getDailyChallenge", {"cohortId": cohort.get("_id"), "date": today})

    if not challenge:
        problems = client.query("problems:list", {})
        if not problems:
            raise HTTPException(status_code=404, detail="No problems available")
        problem = random.choice(problems)
        
        challenge_id = client.mutation("cohorts:createDailyChallenge", {
            "cohortId": cohort.get("_id"),
            "problemId": problem.get("_id"),
            "date": today
        })
        
        challenge = client.query("cohorts:getDailyChallenge", {"cohortId": cohort.get("_id"), "date": today})
    else:
        problem = client.query("problems:getById", {"problemId": challenge.get("problemId")})

    return {
        "id": str(challenge.get("_id")),
        "cohort_id": str(challenge.get("cohortId")),
        "problem_id": str(challenge.get("problemId")),
        "date": today,
        "problem_slug": problem.get("slug") if problem else None,
        "problem_title": problem.get("title") if problem else None
    }


@router.get("/{slug}/challenges/today")
def get_today_challenge(
    slug: str,
    client: ConvexClient = Depends(get_convex),
    current_user: dict = Depends(get_required_user),
):
    return get_daily_challenge(slug, client, current_user)
