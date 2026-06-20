import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from database import get_db
from models import Cohort, CohortMember, User, DailyChallenge, Problem
from schemas import CohortCreate, CohortUpdate, CohortResponse, CohortDetailResponse, CohortMemberResponse, DailyChallengeCreate, DailyChallengeResponse
from auth import get_current_user

router = APIRouter(prefix="/api/cohorts", tags=["cohorts"])


def generate_invite_code(db: Session) -> str:
    """Generate a unique 6-character uppercase alphanumeric code."""
    while True:
        code = "".join(secrets.choice("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789") for _ in range(6))
        # Check uniqueness
        exists = db.query(Cohort).filter(Cohort.invite_code == code).first()
        if not exists:
            return code


@router.post("/", response_model=CohortResponse, status_code=201)
def create_cohort(
    payload: CohortCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new cohort coding league and generate a unique join invite code."""
    # Generate unique slug
    base_slug = payload.name.lower().strip().replace(" ", "-")
    # Clean slug characters
    base_slug = "".join(c for c in base_slug if c.isalnum() or c == "-")
    slug = base_slug
    counter = 1
    while db.query(Cohort).filter(Cohort.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1

    invite_code = generate_invite_code(db)

    cohort = Cohort(
        name=payload.name,
        slug=slug,
        description=payload.description,
        invite_code=invite_code,
        created_by=current_user.id
    )
    db.add(cohort)
    db.commit()
    db.refresh(cohort)

    # Automatically add the creator as an admin member
    member = CohortMember(
        cohort_id=cohort.id,
        user_id=current_user.id,
        role="admin"
    )
    db.add(member)
    db.commit()

    return cohort


@router.post("/join", response_model=CohortResponse)
def join_cohort(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Join a cohort coding league using a 6-character invite code."""
    invite_code = payload.get("invite_code")
    if not invite_code:
        raise HTTPException(status_code=400, detail="Invite code is required")
    
    invite_code = invite_code.strip().upper()
    cohort = db.query(Cohort).filter(Cohort.invite_code == invite_code).first()
    if not cohort:
        raise HTTPException(status_code=404, detail="Cohort not found with this invite code")

    # Check if already a member
    member = db.query(CohortMember).filter(
        CohortMember.cohort_id == cohort.id,
        CohortMember.user_id == current_user.id
    ).first()
    if member:
        return cohort  # Already joined, return cohort gracefully

    # Add member
    new_member = CohortMember(
        cohort_id=cohort.id,
        user_id=current_user.id,
        role="member"
    )
    db.add(new_member)
    db.commit()

    return cohort


@router.get("/me", response_model=List[CohortResponse])
def get_my_cohorts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all cohorts that the current user belongs to."""
    cohorts = (
        db.query(Cohort)
        .join(CohortMember, Cohort.id == CohortMember.cohort_id)
        .filter(CohortMember.user_id == current_user.id)
        .all()
    )
    return cohorts


@router.get("/{slug}", response_model=CohortDetailResponse)
def get_cohort_detail(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get detailed information about a cohort, including membership list."""
    cohort = db.query(Cohort).filter(Cohort.slug == slug).first()
    if not cohort:
        raise HTTPException(status_code=404, detail="Cohort not found")

    # Check if current user is a member of this cohort
    is_member = db.query(CohortMember).filter(
        CohortMember.cohort_id == cohort.id,
        CohortMember.user_id == current_user.id
    ).first()
    if not is_member:
        raise HTTPException(status_code=403, detail="You are not a member of this cohort")

    # Fetch members with details
    members_data = (
        db.query(
            CohortMember.user_id,
            CohortMember.role,
            CohortMember.joined_at,
            User.username,
            User.display_name,
            User.avatar_url
        )
        .join(User, CohortMember.user_id == User.id)
        .filter(CohortMember.cohort_id == cohort.id)
        .all()
    )

    members_list = [
        CohortMemberResponse(
            user_id=m.user_id,
            username=m.username,
            display_name=m.display_name,
            avatar_url=m.avatar_url,
            role=m.role,
            joined_at=m.joined_at
        ) for m in members_data
    ]

    # Return combined cohort detail
    return CohortDetailResponse(
        id=cohort.id,
        name=cohort.name,
        slug=cohort.slug,
        description=cohort.description,
        invite_code=cohort.invite_code,
        created_by=cohort.created_by,
        created_at=cohort.created_at,
        members=members_list
    )


@router.post("/{slug}/leave", status_code=200)
def leave_cohort(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Leave a cohort."""
    cohort = db.query(Cohort).filter(Cohort.slug == slug).first()
    if not cohort:
        raise HTTPException(status_code=404, detail="Cohort not found")

    member = db.query(CohortMember).filter(
        CohortMember.cohort_id == cohort.id,
        CohortMember.user_id == current_user.id
    ).first()

    if not member:
        raise HTTPException(status_code=400, detail="You are not a member of this cohort")

    # Optional: Prevent the sole admin/creator from leaving without deleting the cohort
    if member.role == "admin":
        admin_count = db.query(CohortMember).filter(
            CohortMember.cohort_id == cohort.id,
            CohortMember.role == "admin"
        ).count()
        if admin_count == 1:
            raise HTTPException(status_code=400, detail="You are the only admin. You cannot leave the cohort.")

    db.delete(member)
    db.commit()
    return {"status": "success", "message": "Successfully left the cohort"}


@router.put("/{slug}", response_model=CohortResponse)
def update_cohort(
    slug: str,
    payload: CohortUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update cohort details. Only admins can update."""
    cohort = db.query(Cohort).filter(Cohort.slug == slug).first()
    if not cohort:
        raise HTTPException(status_code=404, detail="Cohort not found")

    member = db.query(CohortMember).filter(
        CohortMember.cohort_id == cohort.id,
        CohortMember.user_id == current_user.id
    ).first()

    if not member or member.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update the cohort")

    if payload.name is not None:
        cohort.name = payload.name
    if payload.description is not None:
        cohort.description = payload.description

    db.commit()
    db.refresh(cohort)
    return cohort


@router.delete("/{slug}", status_code=204)
def delete_cohort(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a cohort entirely. Only admins can delete."""
    cohort = db.query(Cohort).filter(Cohort.slug == slug).first()
    if not cohort:
        raise HTTPException(status_code=404, detail="Cohort not found")

    member = db.query(CohortMember).filter(
        CohortMember.cohort_id == cohort.id,
        CohortMember.user_id == current_user.id
    ).first()

    if not member or member.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete the cohort")

    # Delete all daily challenges associated with cohort first
    db.query(DailyChallenge).filter(DailyChallenge.cohort_id == cohort.id).delete(synchronize_session=False)

    # Delete all members first
    db.query(CohortMember).filter(CohortMember.cohort_id == cohort.id).delete(synchronize_session=False)
    
    db.delete(cohort)
    db.commit()
    return None


from datetime import date
from sqlalchemy.sql.expression import func
from models import Problem
from schemas import DailyChallengeResponse

@router.get("/{slug}/daily-challenge", response_model=DailyChallengeResponse)
def get_daily_challenge(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get or generate the daily challenge for a cohort."""
    cohort = db.query(Cohort).filter(Cohort.slug == slug).first()
    if not cohort:
        raise HTTPException(status_code=404, detail="Cohort not found")

    is_member = db.query(CohortMember).filter(
        CohortMember.cohort_id == cohort.id,
        CohortMember.user_id == current_user.id
    ).first()
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a member of this cohort")

    today = date.today()
    challenge = db.query(DailyChallenge).filter(
        DailyChallenge.cohort_id == cohort.id,
        DailyChallenge.date == today
    ).first()

    if not challenge:
        # Create one randomly
        problem = db.query(Problem).order_by(func.random()).first()
        if not problem:
            raise HTTPException(status_code=404, detail="No problems available")

        challenge = DailyChallenge(
            cohort_id=cohort.id,
            problem_id=problem.id,
            date=today
        )
        db.add(challenge)
        db.commit()
        db.refresh(challenge)
    else:
        problem = db.query(Problem).filter(Problem.id == challenge.problem_id).first()

    return {
        "id": challenge.id,
        "cohort_id": challenge.cohort_id,
        "problem_id": challenge.problem_id,
        "date": challenge.date,
        "problem_slug": problem.slug,
        "problem_title": problem.title
    }

import datetime

@router.get("/{slug}/challenges/today", response_model=DailyChallengeResponse)
def get_today_challenge(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the daily challenge for the cohort."""
    cohort = db.query(Cohort).filter(Cohort.slug == slug).first()
    if not cohort:
        raise HTTPException(status_code=404, detail="Cohort not found")

    is_member = db.query(CohortMember).filter(
        CohortMember.cohort_id == cohort.id,
        CohortMember.user_id == current_user.id
    ).first()
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a member of this cohort")

    today = datetime.datetime.now().date()
    challenge = db.query(DailyChallenge).filter(
        DailyChallenge.cohort_id == cohort.id,
        DailyChallenge.date == today
    ).first()

    if not challenge:
        raise HTTPException(status_code=404, detail="No challenge for today")

    problem = db.query(Problem).filter(Problem.id == challenge.problem_id).first()
    
    return DailyChallengeResponse(
        id=challenge.id,
        cohort_id=challenge.cohort_id,
        problem_id=challenge.problem_id,
        date=challenge.date,
        problem_title=problem.title if problem else None,
        problem_slug=problem.slug if problem else None
    )


@router.post("/{slug}/challenges", response_model=DailyChallengeResponse)
def set_today_challenge(
    slug: str,
    payload: DailyChallengeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Admin sets the daily challenge."""
    cohort = db.query(Cohort).filter(Cohort.slug == slug).first()
    if not cohort:
        raise HTTPException(status_code=404, detail="Cohort not found")

    member = db.query(CohortMember).filter(
        CohortMember.cohort_id == cohort.id,
        CohortMember.user_id == current_user.id
    ).first()
    
    if not member or member.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can set challenges")

    today = datetime.datetime.now().date()
    challenge = db.query(DailyChallenge).filter(
        DailyChallenge.cohort_id == cohort.id,
        DailyChallenge.date == today
    ).first()

    if challenge:
        challenge.problem_id = payload.problem_id
    else:
        challenge = DailyChallenge(
            cohort_id=cohort.id,
            problem_id=payload.problem_id,
            date=today
        )
        db.add(challenge)

    db.commit()
    db.refresh(challenge)

    problem = db.query(Problem).filter(Problem.id == challenge.problem_id).first()

    return DailyChallengeResponse(
        id=challenge.id,
        cohort_id=challenge.cohort_id,
        problem_id=challenge.problem_id,
        date=challenge.date,
        problem_title=problem.title if problem else None,
        problem_slug=problem.slug if problem else None
    )
