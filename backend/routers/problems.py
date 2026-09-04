"""
Problems Router — CRUD endpoints for problems with in-memory TTL caching, admin authorization,
and local seed data fallback.
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Optional

from database import get_convex
from schemas import ProblemCreate, ProblemSummary, ProblemDetail
from auth import get_current_admin_user
from cache import cache
from convex import ConvexClient
from seed import SEED_PROBLEMS

router = APIRouter(prefix="/api/problems", tags=["problems"])


def _get_seed_problems() -> list[dict]:
    """Provide local in-memory fallback list from seed dataset."""
    result = []
    for idx, p in enumerate(SEED_PROBLEMS):
        item = dict(p)
        item["_id"] = f"seed_{idx+1}"
        item["id"] = f"seed_{idx+1}"
        item["difficulty"] = item["difficulty"].value if hasattr(item["difficulty"], "value") else str(item["difficulty"])
        if isinstance(item.get("constraints"), str):
            item["constraints"] = [c.strip() for c in item["constraints"].split("\n") if c.strip()]
        result.append(item)
    return result


@router.get("/", response_model=list[ProblemSummary])
def list_problems(
    difficulty: Optional[str] = None,
    topic: Optional[str] = None,
    client: ConvexClient = Depends(get_convex),
):
    """List all problems, optionally filtered by difficulty or topic (Cached for 60s)."""
    cache_key = f"problems:list:{difficulty}:{topic}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    args = {}
    if difficulty:
        args["difficulty"] = difficulty
    if topic:
        args["topic"] = topic

    try:
        problems = client.query("problems:list", args)
        if not problems:
            raise Exception("No problems returned from DB, use fallback")
        # Map _id back to id to match API schemas
        for p in problems:
            p["id"] = p["_id"]
    except Exception:
        # Fallback to curated seed dataset
        problems = _get_seed_problems()
        if difficulty:
            problems = [p for p in problems if p.get("difficulty") == difficulty]
        if topic:
            problems = [p for p in problems if p.get("topic") == topic]
        
    cache.set(cache_key, problems, ttl=60)
    return problems


@router.get("/{slug}", response_model=ProblemDetail)
def get_problem(slug: str, client: ConvexClient = Depends(get_convex)):
    """Get a single problem by slug (Cached for 60s)."""
    cache_key = f"problems:slug:{slug}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    problem = None
    try:
        problem = client.query("problems:getBySlug", {"slug": slug})
        if problem:
            problem["id"] = problem["_id"]
    except Exception:
        problem = None

    if not problem:
        for p in _get_seed_problems():
            if p.get("slug") == slug:
                problem = p
                break

    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
        
    cache.set(cache_key, problem, ttl=60)
    return problem


@router.post("/", response_model=ProblemSummary, status_code=201)
def create_problem(
    problem: ProblemCreate,
    client: ConvexClient = Depends(get_convex),
    admin_user: dict = Depends(get_current_admin_user),
):
    """Create a new problem. Restricted to authenticated admins."""
    try:
        constraints = problem.constraints
        if isinstance(constraints, str):
            constraints = [c.strip() for c in constraints.strip().split("\n") if c.strip()]
        elif constraints is None:
            constraints = []

        db_problem = client.mutation("problems:create", {
            "title": problem.title,
            "slug": problem.slug,
            "description": problem.description,
            "difficulty": problem.difficulty,
            "topic": problem.topic,
            "constraints": constraints,
            "examples": [ex.model_dump() for ex in problem.examples] if problem.examples else [],
            "testCases": [tc.model_dump() for tc in problem.test_cases] if problem.test_cases else [],
            "starterCode": problem.starter_code,
            "timeLimitMs": problem.time_limit_ms,
            "memoryLimitKb": problem.memory_limit_kb,
        })
        db_problem["id"] = db_problem["_id"]
        cache.invalidate_prefix("problems:")
        return db_problem
    except Exception as e:
        if "already exists" in str(e):
            raise HTTPException(status_code=409, detail="A problem with this slug already exists")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{problem_id}", response_model=ProblemSummary)
def update_problem(
    problem_id: str,
    problem: ProblemCreate,
    client: ConvexClient = Depends(get_convex),
    admin_user: dict = Depends(get_current_admin_user),
):
    """Update an existing problem. Restricted to authenticated admins."""
    try:
        constraints = problem.constraints
        if isinstance(constraints, str):
            constraints = [c.strip() for c in constraints.strip().split("\n") if c.strip()]
        elif constraints is None:
            constraints = []

        updated = client.mutation("problems:update", {
            "id": problem_id,
            "title": problem.title,
            "slug": problem.slug,
            "description": problem.description,
            "difficulty": problem.difficulty,
            "topic": problem.topic,
            "constraints": constraints,
            "examples": [ex.model_dump() for ex in problem.examples] if problem.examples else [],
            "testCases": [tc.model_dump() for tc in problem.test_cases] if problem.test_cases else [],
            "starterCode": problem.starter_code,
            "timeLimitMs": problem.time_limit_ms,
            "memoryLimitKb": problem.memory_limit_kb,
        })
        if not updated:
            raise HTTPException(status_code=404, detail="Problem not found")
        updated["id"] = updated["_id"]
        cache.invalidate_prefix("problems:")
        return updated
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{problem_id}")
def delete_problem(
    problem_id: str,
    client: ConvexClient = Depends(get_convex),
    admin_user: dict = Depends(get_current_admin_user),
):
    """Delete a problem. Restricted to authenticated admins."""
    try:
        client.mutation("problems:remove", {"id": problem_id})
        cache.invalidate_prefix("problems:")
        return {"success": True, "message": "Problem deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
