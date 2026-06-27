from fastapi import APIRouter, Depends, HTTPException
from typing import Optional

from database import get_convex
from schemas import ProblemCreate, ProblemSummary, ProblemDetail
from convex import ConvexClient

router = APIRouter(prefix="/api/problems", tags=["problems"])


@router.get("/", response_model=list[ProblemSummary])
def list_problems(
    difficulty: Optional[str] = None,
    topic: Optional[str] = None,
    client: ConvexClient = Depends(get_convex),
):
    """List all problems, optionally filtered by difficulty or topic."""
    args = {}
    if difficulty:
        args["difficulty"] = difficulty
    if topic:
        args["topic"] = topic
    problems = client.query("problems:list", args)
    
    # Map _id back to id to match legacy schemas
    for p in problems:
        p["id"] = p["_id"]
        
    return problems


@router.get("/{slug}", response_model=ProblemDetail)
def get_problem(slug: str, client: ConvexClient = Depends(get_convex)):
    """Get a single problem by slug. Test cases are hidden from the response."""
    problem = client.query("problems:getBySlug", {"slug": slug})
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
        
    problem["id"] = problem["_id"]
    return problem


@router.post("/", response_model=ProblemSummary, status_code=201)
def create_problem(problem: ProblemCreate, client: ConvexClient = Depends(get_convex)):
    """Create a new problem."""
    try:
        db_problem = client.mutation("problems:create", {
            "title": problem.title,
            "slug": problem.slug,
            "description": problem.description,
            "difficulty": problem.difficulty,
            "topic": problem.topic,
            "constraints": problem.constraints,
            "examples": [ex.model_dump() for ex in problem.examples] if problem.examples else None,
            "testCases": [tc.model_dump() for tc in problem.test_cases],
            "starterCode": problem.starter_code,
            "timeLimitMs": problem.time_limit_ms,
            "memoryLimitKb": problem.memory_limit_kb,
        })
        db_problem["id"] = db_problem["_id"]
        return db_problem
    except Exception as e:
        if "already exists" in str(e):
            raise HTTPException(status_code=409, detail="A problem with this slug already exists")
        raise HTTPException(status_code=500, detail=str(e))
