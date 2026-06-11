from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from models import Problem
from schemas import ProblemCreate, ProblemSummary, ProblemDetail

router = APIRouter(prefix="/api/problems", tags=["problems"])


@router.get("/", response_model=list[ProblemSummary])
def list_problems(
    difficulty: Optional[str] = None,
    topic: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """List all problems, optionally filtered by difficulty or topic."""
    query = db.query(Problem)
    if difficulty:
        query = query.filter(Problem.difficulty == difficulty)
    if topic:
        query = query.filter(Problem.topic == topic)
    return query.order_by(Problem.id).all()


@router.get("/{slug}", response_model=ProblemDetail)
def get_problem(slug: str, db: Session = Depends(get_db)):
    """Get a single problem by slug. Test cases are hidden from the response."""
    problem = db.query(Problem).filter(Problem.slug == slug).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    return problem


@router.post("/", response_model=ProblemSummary, status_code=201)
def create_problem(problem: ProblemCreate, db: Session = Depends(get_db)):
    """Create a new problem (admin endpoint — will be protected with auth later)."""
    existing = db.query(Problem).filter(Problem.slug == problem.slug).first()
    if existing:
        raise HTTPException(status_code=409, detail="A problem with this slug already exists")

    db_problem = Problem(
        title=problem.title,
        slug=problem.slug,
        description=problem.description,
        difficulty=problem.difficulty,
        topic=problem.topic,
        constraints=problem.constraints,
        examples=[ex.model_dump() for ex in problem.examples] if problem.examples else None,
        test_cases=[tc.model_dump() for tc in problem.test_cases],
        starter_code=problem.starter_code,
        time_limit_ms=problem.time_limit_ms,
        memory_limit_kb=problem.memory_limit_kb,
    )
    db.add(db_problem)
    db.commit()
    db.refresh(db_problem)
    return db_problem
