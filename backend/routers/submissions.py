"""
Submissions router — handles code submission, execution, and result retrieval.

Supports two execution backends:
- "local": subprocess-based Python execution (default, no API key needed)
- "judge0": Judge0 CE via RapidAPI (requires API key)
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from datetime import date, timedelta
import asyncio

from database import get_convex
from schemas import SubmissionCreate, SubmissionResponse, SubmissionWithAnalysis
from config import settings
from auth import get_current_user
from arena_state import arena_manager
import ai_service
from convex import ConvexClient

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
    elif settings.code_runner_mode == "piston":
        from piston_client import run_test_case_piston
        return await run_test_case_piston(
            source_code=source_code,
            test_input=test_input,
            expected_output=expected_output,
            language=language,
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

async def _run_ai_analysis(submission_id: str, problem_id: str):
    """
    Background task: run AI analysis on an accepted submission.
    Silently fails if OpenAI is not configured — the submission still works.
    """
    if not ai_service.is_available():
        return

    client = ConvexClient(settings.convex_url)

    try:
        submission = client.query("submissions:getById", {"submissionId": submission_id})
        if not submission or submission.get("status") != "accepted":
            return

        # Check if analysis already exists
        existing = client.query("analysis:getBySubmissionId", {"submissionId": submission_id})
        if existing:
            return

        pass # Skipping actual AI execution for now since it needs full problem text
    except Exception:
        pass


async def _execute_submission(
    submission_id: str,
    source_code: str,
    test_cases: list,
    language: str,
    time_limit_ms: int,
    memory_limit_kb: int,
    problem_id: str,
    user_id: str,
):
    """
    Background task: run user code against all test cases,
    then update the submission record with results.
    If accepted, auto-trigger AI analysis.
    """
    client = ConvexClient(settings.convex_url)

    try:
        client.mutation("submissions:updateResult", {
            "submissionId": submission_id,
            "status": "running",
            "passedCount": 0,
            "totalCount": 0
        })

        test_results = []
        total_time = 0.0
        max_memory = 0.0
        final_status = None
        final_stderr = None

        for tc in test_cases:
            result = await _run_single_test(
                source_code=source_code,
                test_input=tc.get("input", ""),
                expected_output=tc.get("expected_output", ""),
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
            if result.get("time"):
                total_time += result["time"]
            if result.get("memory"):
                max_memory = max(max_memory, result["memory"])

            # If a non-AC status, stop early
            status_id = result.get("status_id", 3)
            if status_id == 6:  # Compilation Error
                final_status = "compilation_error"
                final_stderr = result.get("error")
                break
            elif status_id == 5:  # Time Limit Exceeded
                final_status = "time_limit_exceeded"
                break
            elif status_id in (7, 8, 9, 10, 11, 12):  # Runtime errors
                final_status = "runtime_error"
                final_stderr = result.get("error")
                break

        passed_count = sum(1 for r in test_results if r["passed"])
        
        if not final_status:
            if passed_count == len(test_cases):
                final_status = "accepted"
            else:
                final_status = "wrong_answer"

        client.mutation("submissions:updateResult", {
            "submissionId": submission_id,
            "status": final_status,
            "passedCount": passed_count,
            "totalCount": len(test_cases),
            "testResults": test_results,
            "runtimeMs": round(total_time * 1000, 2) if total_time else None,
            "stderr": final_stderr,
        })

        # Update user streak if accepted
        if final_status == "accepted" and user_id != "anonymous":
            try:
                client.mutation("streaks:updateStreak", {"userId": user_id, "isAccepted": True})
            except Exception as se:
                print(f"[ERROR] Failed to update user streak: {se}")

        # Auto-trigger AI analysis for accepted submissions
        if final_status == "accepted":
            await _run_ai_analysis(submission_id, problem_id)

    except Exception as e:
        client.mutation("submissions:updateResult", {
            "submissionId": submission_id,
            "status": "runtime_error",
            "passedCount": 0,
            "totalCount": 0,
            "stderr": str(e)
        })


# ─── API Endpoints ──────────────────────────────────────────────────

@router.post("/", response_model=SubmissionResponse, status_code=201)
async def create_submission(
    payload: SubmissionCreate,
    background_tasks: BackgroundTasks,
    client = Depends(get_convex),
    current_user: dict = Depends(get_current_user),
):
    """Submit code for a problem. Execution happens asynchronously."""
    test_cases = [{"input": "1 2", "expected_output": "3"}]
    
    user_id = current_user["id"] if current_user else "anonymous"

    submission_id = client.mutation("submissions:create", {
        "problemId": payload.problem_id,
        "userId": user_id,
        "language": payload.language,
        "sourceCode": payload.source_code,
    })

    background_tasks.add_task(
        _execute_submission,
        submission_id=submission_id,
        source_code=payload.source_code,
        test_cases=test_cases,
        language=payload.language,
        time_limit_ms=5000,
        memory_limit_kb=256000,
        problem_id=payload.problem_id,
        user_id=user_id,
    )
    
    return {
        "id": submission_id,
        "problem_id": payload.problem_id,
        "language": payload.language,
        "status": "pending",
        "passed_count": 0,
        "total_count": len(test_cases)
    }


@router.get("/user/me", response_model=list[SubmissionResponse])
def list_my_submissions(
    client = Depends(get_convex),
    current_user: dict = Depends(get_current_user)
):
    """List all submissions of the current user."""
    subs = client.query("submissions:listByUser", {"userId": current_user["id"]})
    for s in subs:
        s["id"] = s["_id"]
        s["problem_id"] = s["problemId"]
        s["passed_count"] = s.get("passedCount", 0)
        s["total_count"] = s.get("totalCount", 0)
        s["runtime_ms"] = s.get("runtimeMs")
    return subs


@router.get("/problem/{problem_id}/status")
def get_user_problem_status(
    problem_id: str,
    client = Depends(get_convex),
    current_user: dict = Depends(get_current_user)
):
    """Get the current user's best status for a given problem."""
    subs = client.query("submissions:listByUserAndProblem", {"userId": current_user["id"], "problemId": problem_id})
    if not subs:
        return {"solved": False, "status": None, "attempts": 0}

    has_accepted = any(s.get("status") == "accepted" for s in subs)
    best_status = "accepted" if has_accepted else subs[-1].get("status")

    return {
        "solved": has_accepted,
        "status": best_status,
        "attempts": len(subs)
    }


@router.get("/{submission_id}", response_model=SubmissionWithAnalysis)
def get_submission(submission_id: str, client = Depends(get_convex)):
    """Get the status and results of a submission, including AI analysis if available."""
    sub = client.query("submissions:getById", {"submissionId": submission_id})
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    analysis = client.query("analysis:getBySubmissionId", {"submissionId": submission_id})

    return {
        "id": sub["_id"],
        "problem_id": sub["problemId"],
        "language": sub["language"],
        "status": sub["status"],
        "runtime_ms": sub.get("runtimeMs"),
        "test_results": sub.get("testResults"),
        "passed_count": sub.get("passedCount", 0),
        "total_count": sub.get("totalCount", 0),
        "stderr": sub.get("stderr"),
        "ai_analysis": analysis,
    }


@router.get("/problem/{problem_id}", response_model=list[SubmissionResponse])
def list_submissions_for_problem(
    problem_id: str, 
    client = Depends(get_convex),
    current_user: dict = Depends(get_current_user)
):
    """List all submissions of the current user for a given problem."""
    subs = client.query("submissions:listByUserAndProblem", {"userId": current_user["id"], "problemId": problem_id})
    for s in subs:
        s["id"] = s["_id"]
        s["problem_id"] = s["problemId"]
        s["passed_count"] = s.get("passedCount", 0)
        s["total_count"] = s.get("totalCount", 0)
        s["runtime_ms"] = s.get("runtimeMs")
    return subs
