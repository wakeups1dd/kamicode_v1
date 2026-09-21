"""
Global Daily Challenge Router.

Provides global daily challenge synchronization with a standardized 12:00 AM UTC
midnight rollover, AI problem generation, automated verification, and solve detection.
"""

import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from convex import ConvexClient

from database import get_convex
from auth import get_current_user, get_current_admin_user
from daily_challenge_ai import generate_and_verify_daily_problem

logger = logging.getLogger("kamicode.daily_challenge")

router = APIRouter(prefix="/api/daily-challenge", tags=["daily-challenge"])

# Mutex to ensure single generation even during traffic spikes
_generation_lock = asyncio.Lock()

# Process-level cache to guarantee instant response and idempotency
_daily_challenge_cache: dict = {}


# ─── Response Schemas ──────────────────────────────────────────────────

class GlobalDailyChallengeResponse(BaseModel):
    id: str
    problem_id: str
    problem_slug: str
    problem_title: str
    difficulty: str
    topic: str
    date: str
    generated_by_ai: bool
    seconds_until_reset: int
    is_solved: bool = False


# ─── Core Service Logic ────────────────────────────────────────────────

def get_today_utc_date() -> str:
    """Return the current global UTC date in YYYY-MM-DD format."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def get_seconds_until_utc_midnight() -> int:
    """Calculate the remaining seconds until the next 12:00 AM UTC rollover."""
    now = datetime.now(timezone.utc)
    tomorrow = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    return max(0, int((tomorrow - now).total_seconds()))


async def ensure_daily_challenge(date_str: str, client: ConvexClient) -> dict:
    """
    Idempotently retrieve or generate the global daily challenge for the given date.
    Guaranteed single execution across concurrent requests via asyncio.Lock.
    """
    if date_str in _daily_challenge_cache:
        return _daily_challenge_cache[date_str]

    async with _generation_lock:
        if date_str in _daily_challenge_cache:
            return _daily_challenge_cache[date_str]

        # 1. Check if challenge already exists in Convex
        try:
            existing = client.query("dailyChallenges:getForDate", {"date": date_str})
            if existing:
                _daily_challenge_cache[date_str] = existing
                return existing
        except Exception as e:
            logger.warning(f"Failed to query dailyChallenges:getForDate from Convex: {e}")

        # 2. Generate a new, verified problem
        logger.info(f"Generating new daily challenge for date {date_str}...")
        problem_spec = await generate_and_verify_daily_problem(date_str)

        # 3. Insert problem into Convex DB 'problems' table
        problem_id = None
        try:
            # Check if problem with this slug already exists
            existing_prob = client.query("problems:getBySlug", {"slug": problem_spec["slug"]})
            if existing_prob:
                problem_id = str(existing_prob.get("_id"))
            else:
                new_prob = client.mutation(
                    "problems:create",
                    {
                        "title": problem_spec["title"],
                        "slug": problem_spec["slug"],
                        "description": problem_spec["description"],
                        "difficulty": problem_spec["difficulty"],
                        "topic": problem_spec["topic"],
                        "constraints": problem_spec.get("constraints", []),
                        "examples": problem_spec.get("examples", []),
                        "testCases": problem_spec.get("test_cases", []),
                        "starterCode": problem_spec.get("starter_code", ""),
                        "timeLimitMs": problem_spec.get("time_limit_ms", 2000),
                        "memoryLimitKb": problem_spec.get("memory_limit_kb", 256000),
                    },
                )
                problem_id = str(new_prob.get("_id") if isinstance(new_prob, dict) else new_prob)
        except Exception as e:
            logger.error(f"Error persisting generated problem in Convex: {e}")
            problem_id = f"prob_{problem_spec['slug']}"

        # 4. Insert into 'globalDailyChallenges' table
        challenge_data = {
            "date": date_str,
            "problemId": problem_id,
            "problemSlug": problem_spec["slug"],
            "problemTitle": problem_spec["title"],
            "difficulty": problem_spec["difficulty"],
            "topic": problem_spec["topic"],
            "generatedByAi": problem_spec.get("generated_by_ai", True),
            "aiModel": problem_spec.get("ai_model", "gemini-3.7-flash"),
            "createdAt": int(datetime.now(timezone.utc).timestamp() * 1000),
        }

        try:
            record = client.mutation("dailyChallenges:create", challenge_data)
            result = record if isinstance(record, dict) else challenge_data
        except Exception as e:
            logger.warning(f"Error saving daily challenge record in Convex: {e}")
            challenge_data["_id"] = f"challenge_{date_str}"
            result = challenge_data

        _daily_challenge_cache[date_str] = result
        return result


def check_if_user_solved(problem_id: str, problem_slug: str, user_id: Optional[str], client: ConvexClient) -> bool:
    """Check if the user has an accepted submission for the daily challenge problem."""
    if not user_id:
        return False

    try:
        submissions = client.query("submissions:listByUser", {"userId": user_id})
        for s in submissions:
            if s.get("status") == "accepted":
                sub_pid = str(s.get("problemId") or s.get("problem_id") or "")
                if sub_pid in (problem_id, problem_slug):
                    return True
    except Exception as e:
        logger.warning(f"Error checking user solve status: {e}")

    return False


# ─── API Endpoints ─────────────────────────────────────────────────────

@router.get("", response_model=GlobalDailyChallengeResponse)
async def get_daily_challenge(
    client: ConvexClient = Depends(get_convex),
    current_user: Optional[dict] = Depends(get_current_user),
):
    """
    Get today's global daily challenge (12:00 AM UTC rollover).
    All users globally receive the exact same challenge for the current UTC date.
    """
    today_str = get_today_utc_date()
    challenge = await ensure_daily_challenge(today_str, client)

    problem_id = str(challenge.get("problemId") or challenge.get("problem_id") or "")
    problem_slug = str(challenge.get("problemSlug") or challenge.get("problem_slug") or "")
    problem_title = str(challenge.get("problemTitle") or challenge.get("problem_title") or "Daily Challenge")
    difficulty = str(challenge.get("difficulty") or "medium")
    topic = str(challenge.get("topic") or "Algorithms")
    generated_by_ai = bool(challenge.get("generatedByAi", True))
    challenge_id = str(challenge.get("_id") or f"dc_{today_str}")

    user_id = current_user.get("id") if current_user else None
    is_solved = check_if_user_solved(problem_id, problem_slug, user_id, client)
    seconds_left = get_seconds_until_utc_midnight()

    return GlobalDailyChallengeResponse(
        id=challenge_id,
        problem_id=problem_id,
        problem_slug=problem_slug,
        problem_title=problem_title,
        difficulty=difficulty,
        topic=topic,
        date=today_str,
        generated_by_ai=generated_by_ai,
        seconds_until_reset=seconds_left,
        is_solved=is_solved,
    )


@router.get("/history", response_model=List[GlobalDailyChallengeResponse])
async def list_daily_challenge_history(
    limit: int = Query(default=14, ge=1, le=30),
    client: ConvexClient = Depends(get_convex),
    current_user: Optional[dict] = Depends(get_current_user),
):
    """List recent daily challenges with completion status for calendar history."""
    try:
        challenges = client.query("dailyChallenges:listRecent", {"limit": limit}) or []
        if not isinstance(challenges, list):
            challenges = []
    except Exception as e:
        logger.warning(f"Failed to query dailyChallenges:listRecent: {e}")
        challenges = []

    if not challenges and _daily_challenge_cache:
        challenges = list(_daily_challenge_cache.values())

    user_id = current_user.get("id") if current_user else None
    seconds_left = get_seconds_until_utc_midnight()
    results = []

    for c in challenges:
        pid = str(c.get("problemId") or "")
        slug = str(c.get("problemSlug") or "")
        is_solved = check_if_user_solved(pid, slug, user_id, client)

        results.append(
            GlobalDailyChallengeResponse(
                id=str(c.get("_id") or ""),
                problem_id=pid,
                problem_slug=slug,
                problem_title=str(c.get("problemTitle") or "Daily Challenge"),
                difficulty=str(c.get("difficulty") or "medium"),
                topic=str(c.get("topic") or "Algorithms"),
                date=str(c.get("date") or ""),
                generated_by_ai=bool(c.get("generatedByAi", True)),
                seconds_until_reset=seconds_left,
                is_solved=is_solved,
            )
        )

    return results


@router.post("/generate-now", response_model=GlobalDailyChallengeResponse)
async def force_generate_daily_challenge(
    target_date: Optional[str] = None,
    client: ConvexClient = Depends(get_convex),
    admin_user: dict = Depends(get_current_admin_user),
):
    """
    Admin-only endpoint to force generate a new AI daily challenge for a target date (defaults to today).
    """
    date_str = target_date or get_today_utc_date()
    challenge = await ensure_daily_challenge(date_str, client)

    return GlobalDailyChallengeResponse(
        id=str(challenge.get("_id") or f"dc_{date_str}"),
        problem_id=str(challenge.get("problemId") or ""),
        problem_slug=str(challenge.get("problemSlug") or ""),
        problem_title=str(challenge.get("problemTitle") or "Daily Challenge"),
        difficulty=str(challenge.get("difficulty") or "medium"),
        topic=str(challenge.get("topic") or "Algorithms"),
        date=date_str,
        generated_by_ai=bool(challenge.get("generatedByAi", True)),
        seconds_until_reset=get_seconds_until_utc_midnight(),
        is_solved=False,
    )


# ─── Midnight Cron Loop ────────────────────────────────────────────────

async def daily_challenge_cron_loop():
    """
    Background worker that runs continuously in FastAPI lifespan.
    1. Ensures today's challenge exists immediately on server start.
    2. Sleeps until 12:00:01 AM UTC every night and triggers rollover generation.
    """
    from database import get_convex

    logger.info("Initializing Daily Challenge Midnight Cron Worker...")
    while True:
        try:
            client = get_convex()
            today_str = get_today_utc_date()

            # Ensure today's challenge exists
            await ensure_daily_challenge(today_str, client)

            # Sleep until 12:00:01 AM UTC tomorrow
            now = datetime.now(timezone.utc)
            tomorrow = (now + timedelta(days=1)).replace(hour=0, minute=0, second=1, microsecond=0)
            sleep_duration = (tomorrow - now).total_seconds()
            logger.info(
                f"Daily Challenge Cron: verified for {today_str}. Sleeping {sleep_duration:.1f}s until midnight rollover ({tomorrow.isoformat()})."
            )
            await asyncio.sleep(sleep_duration)

            # Midnight rollover triggered! Generate new day's challenge
            new_date_str = get_today_utc_date()
            logger.info(f"12:00 AM UTC reached! Generating global daily challenge for {new_date_str}...")
            await ensure_daily_challenge(new_date_str, client)
        except asyncio.CancelledError:
            logger.info("Daily challenge cron worker cancelled.")
            break
        except Exception as e:
            logger.error(f"Error in daily challenge cron loop: {e}. Retrying in 60s...")
            await asyncio.sleep(60)
