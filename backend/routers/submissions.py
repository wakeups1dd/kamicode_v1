from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from database import get_db
from models import Problem, Submission, SubmissionStatus, AIAnalysis
from schemas import SubmissionCreate, SubmissionResponse, SubmissionWithAnalysis
from judge0_client import run_test_case
import ai_service

router = APIRouter(prefix="/api/submissions", tags=["submissions"])


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


async def _execute_submission(submission_id: int, source_code: str, test_cases: list, language: str, time_limit_ms: int, memory_limit_kb: int, problem_id: int):
    """
    Background task: run user code against all test cases via Judge0,
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
            result = await run_test_case(
                source_code=source_code,
                test_input=tc["input"],
                expected_output=tc["expected_output"],
                language=language,
                time_limit=time_limit_ms / 1000.0,
                memory_limit=memory_limit_kb,
            )
            test_results.append({
                "passed": result["passed"],
                "input": result["input"],
                "expected": result["expected"],
                "actual": result["actual"],
                "error": result.get("error"),
            })
            tokens.append(result.get("token"))
            if result.get("time"):
                total_time += result["time"]
            if result.get("memory"):
                max_memory = max(max_memory, result["memory"])

            # If a non-AC status (compilation error, runtime error, TLE), stop early
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
        total_count = len(test_results)

        submission.test_results = test_results
        submission.judge0_tokens = tokens
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


@router.post("/", response_model=SubmissionResponse, status_code=201)
async def create_submission(
    payload: SubmissionCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Submit code for a problem. Execution happens asynchronously via Judge0."""
    problem = db.query(Problem).filter(Problem.id == payload.problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    submission = Submission(
        problem_id=payload.problem_id,
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
def list_submissions_for_problem(problem_id: int, db: Session = Depends(get_db)):
    """List all submissions for a given problem."""
    return (
        db.query(Submission)
        .filter(Submission.problem_id == problem_id)
        .order_by(Submission.created_at.desc())
        .limit(50)
        .all()
    )
