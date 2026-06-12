"""
Submissions router — handles code submission, execution, and result retrieval.

Supports two execution backends:
- "local": subprocess-based Python execution (default, no API key needed)
- "judge0": Judge0 CE via RapidAPI (requires API key)
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from sqlalchemy.orm import Session
from datetime import date, timedelta

from database import get_db
from models import Problem, Submission, SubmissionStatus, AIAnalysis, User, UserStreak
from schemas import SubmissionCreate, SubmissionResponse, SubmissionWithAnalysis
from config import settings
from auth import get_current_user
import ai_service

router = APIRouter(prefix="/api/submissions", tags=["submissions"])


# ─── Execution Backend Selection ────────────────────────────────────

async def _run_single_test(source_code: str, test_input: str, expected_output: str, language: str, time_limit_ms: int, memory_limit_kb: int) -> dict:
    """Run a single test case using the configured backend."""
    if settings.code_runner_mode == "judge0":
        from judge0_client import run_test_case
        return await run_test_case(
            source_code=source_code,
            test_input=test_input,
            expected_output=expected_output,
            language=language,
            time_limit=time_limit_ms / 1000.0,
            memory_limit=memory_limit_kb,
        )
    else:
        from code_runner import run_test_case_local
        result = await run_test_case_local(
            source_code=source_code,
            test_input=test_input,
            expected_output=expected_output,
            language=language,
            timeout_sec=settings.code_runner_timeout_sec,
        )
        # Normalize to match Judge0 response shape
        return {
            "passed": result["passed"],
            "input": result["input"],
            "expected": result["expected"],
            "actual": result["actual"],
            "error": result.get("error"),
            "time": result.get("time_ms", 0) / 1000.0 if result.get("time_ms") else None,
            "memory": None,  # local runner doesn't track memory
            "status_id": 3 if result["status"] == "success" else (5 if result["status"] == "tle" else 11),
            "status_description": result["status"],
            "token": None,
        }


# ─── Background Tasks ──────────────────────────────────────────────

async def _run_ai_analysis(submission_id: int, problem_id: int):
    """
    Background task: run AI analysis on an accepted submission.
    Silently fails if OpenAI is not configured — the submission still works.
    """
    if not ai_service.is_available():
        return

    from database import SessionLocal

    db = SessionLocal()
    try:
        submission = db.query(Submission).filter(Submission.id == submission_id).first()
        if not submission or submission.status != SubmissionStatus.ACCEPTED:
            return

        # Check if analysis already exists
        existing = db.query(AIAnalysis).filter(AIAnalysis.submission_id == submission_id).first()
        if existing:
            return

        problem = db.query(Problem).filter(Problem.id == problem_id).first()
        if not problem:
            return

        result = await ai_service.analyze_code(
            source_code=submission.source_code,
            problem_title=problem.title,
            problem_description=problem.description,
            language=submission.language,
            runtime_ms=submission.runtime_ms,
            memory_kb=submission.memory_kb,
        )

        analysis = AIAnalysis(
            submission_id=submission.id,
            problem_id=problem_id,
            time_complexity=result.get("time_complexity"),
            space_complexity=result.get("space_complexity"),
            approach=result.get("approach"),
            approach_explanation=result.get("approach_explanation"),
            efficiency_score=result.get("efficiency_score"),
            code_quality_score=result.get("code_quality_score"),
            overall_score=result.get("overall_score"),
            strengths=result.get("strengths"),
            improvements=result.get("improvements"),
            optimized_solution_hint=result.get("optimized_solution_hint"),
            raw_response=result.get("raw_response"),
        )
        db.add(analysis)
        db.commit()
    except Exception:
        pass  # AI analysis is best-effort; don't break submission flow
    finally:
        db.close()


async def _execute_submission(
    submission_id: int,
    source_code: str,
    test_cases: list,
    language: str,
    time_limit_ms: int,
    memory_limit_kb: int,
    problem_id: int,
):
    """
    Background task: run user code against all test cases,
    then update the submission record with results.
    If accepted, auto-trigger AI analysis.
    """
    from database import SessionLocal

    db = SessionLocal()
    try:
        submission = db.query(Submission).filter(Submission.id == submission_id).first()
        if not submission:
            return

        submission.status = SubmissionStatus.RUNNING
        db.commit()

        test_results = []
        tokens = []
        total_time = 0.0
        max_memory = 0.0

        for tc in test_cases:
            result = await _run_single_test(
                source_code=source_code,
                test_input=tc["input"],
                expected_output=tc["expected_output"],
                language=language,
                time_limit_ms=time_limit_ms,
                memory_limit_kb=memory_limit_kb,
            )
            test_results.append({
                "passed": result["passed"],
                "input": result["input"],
                "expected": result["expected"],
                "actual": result["actual"],
                "error": result.get("error"),
            })
            if result.get("token"):
                tokens.append(result["token"])
            if result.get("time"):
                total_time += result["time"]
            if result.get("memory"):
                max_memory = max(max_memory, result["memory"])

            # If a non-AC status, stop early
            status_id = result.get("status_id", 3)
            if status_id == 6:  # Compilation Error
                submission.status = SubmissionStatus.COMPILATION_ERROR
                submission.stderr = result.get("error")
                break
            elif status_id == 5:  # Time Limit Exceeded
                submission.status = SubmissionStatus.TIME_LIMIT_EXCEEDED
                break
            elif status_id in (7, 8, 9, 10, 11, 12):  # Runtime errors
                submission.status = SubmissionStatus.RUNTIME_ERROR
                submission.stderr = result.get("error")
                break

        passed_count = sum(1 for r in test_results if r["passed"])

        submission.test_results = test_results
        submission.judge0_tokens = tokens if tokens else None
        submission.passed_count = passed_count
        submission.total_count = len(test_cases)
        submission.runtime_ms = round(total_time * 1000, 2) if total_time else None
        submission.memory_kb = round(max_memory, 2) if max_memory else None

        # Determine final status if not already set by error
        if submission.status == SubmissionStatus.RUNNING:
            if passed_count == len(test_cases):
                submission.status = SubmissionStatus.ACCEPTED
            else:
                submission.status = SubmissionStatus.WRONG_ANSWER

        db.commit()

        # Update user streak if accepted
        if submission.status == SubmissionStatus.ACCEPTED and submission.user_id:
            try:
                _update_user_streak(db, submission.user_id)
            except Exception as se:
                print(f"[ERROR] Failed to update user streak: {se}")

        # Auto-trigger AI analysis for accepted submissions
        if submission.status == SubmissionStatus.ACCEPTED:
            await _run_ai_analysis(submission_id, problem_id)

    except Exception as e:
        submission = db.query(Submission).filter(Submission.id == submission_id).first()
        if submission:
            submission.status = SubmissionStatus.RUNTIME_ERROR
            submission.stderr = str(e)
            db.commit()
    finally:
        db.close()

def _update_user_streak(db: Session, user_id: str):
    """Update user's daily solving streak upon accepted submission."""
    today = date.today()
    streak = db.query(UserStreak).filter(UserStreak.user_id == user_id).first()

    if not streak:
        # First solve ever
        streak = UserStreak(
            user_id=user_id,
            current_streak=1,
            longest_streak=1,
            last_solve_date=today,
            total_solves=1
        )
        db.add(streak)
    else:
        # Check if already solved today
        if streak.last_solve_date == today:
            # Already solved today: don't increment streak, but increment total_solves
            streak.total_solves += 1
        elif streak.last_solve_date == today - timedelta(days=1):
            # Solved yesterday, extend streak
            streak.current_streak += 1
            streak.longest_streak = max(streak.longest_streak, streak.current_streak)
            streak.last_solve_date = today
            streak.total_solves += 1
        else:
            # Solved earlier (streak broken), reset current streak to 1
            streak.current_streak = 1
            streak.last_solve_date = today
            streak.total_solves += 1

    db.commit()


# ─── API Endpoints ──────────────────────────────────────────────────

@router.post("/", response_model=SubmissionResponse, status_code=201)
async def create_submission(
    payload: SubmissionCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit code for a problem. Execution happens asynchronously."""
    problem = db.query(Problem).filter(Problem.id == payload.problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    submission = Submission(
        problem_id=payload.problem_id,
        user_id=current_user.id,
        language=payload.language,
        source_code=payload.source_code,
        status=SubmissionStatus.PENDING,
        total_count=len(problem.test_cases),
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)

    # Kick off background execution
    background_tasks.add_task(
        _execute_submission,
        submission_id=submission.id,
        source_code=payload.source_code,
        test_cases=problem.test_cases,
        language=payload.language,
        time_limit_ms=problem.time_limit_ms,
        memory_limit_kb=problem.memory_limit_kb,
        problem_id=problem.id,
    )

    return submission


@router.get("/user/me", response_model=list[SubmissionResponse])
def list_my_submissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all submissions of the current user."""
    return (
        db.query(Submission)
        .filter(Submission.user_id == current_user.id)
        .order_by(Submission.created_at.desc())
        .limit(50)
        .all()
    )


@router.get("/problem/{problem_id}/status")
def get_user_problem_status(
    problem_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get the current user's best status for a given problem."""
    submissions = (
        db.query(Submission)
        .filter(Submission.problem_id == problem_id, Submission.user_id == current_user.id)
        .all()
    )
    if not submissions:
        return {"solved": False, "status": None, "attempts": 0}

    has_accepted = any(s.status == SubmissionStatus.ACCEPTED for s in submissions)
    best_status = SubmissionStatus.ACCEPTED if has_accepted else submissions[-1].status

    return {
        "solved": has_accepted,
        "status": best_status.value if hasattr(best_status, 'value') else best_status,
        "attempts": len(submissions)
    }


@router.get("/{submission_id}", response_model=SubmissionWithAnalysis)
def get_submission(submission_id: int, db: Session = Depends(get_db)):
    """Get the status and results of a submission, including AI analysis if available."""
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    # Fetch AI analysis if it exists
    analysis = db.query(AIAnalysis).filter(
        AIAnalysis.submission_id == submission_id
    ).first()

    # Build response with optional analysis
    response_data = {
        "id": submission.id,
        "problem_id": submission.problem_id,
        "language": submission.language,
        "status": submission.status.value if hasattr(submission.status, 'value') else submission.status,
        "runtime_ms": submission.runtime_ms,
        "memory_kb": submission.memory_kb,
        "test_results": submission.test_results,
        "passed_count": submission.passed_count,
        "total_count": submission.total_count,
        "stdout": submission.stdout,
        "stderr": submission.stderr,
        "created_at": submission.created_at,
        "ai_analysis": analysis,
    }

    return response_data


@router.get("/problem/{problem_id}", response_model=list[SubmissionResponse])
def list_submissions_for_problem(
    problem_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all submissions of the current user for a given problem."""
    return (
        db.query(Submission)
        .filter(Submission.problem_id == problem_id, Submission.user_id == current_user.id)
        .order_by(Submission.created_at.desc())
        .limit(50)
        .all()
    )
