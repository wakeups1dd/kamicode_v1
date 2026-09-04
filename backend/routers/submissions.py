"""
Submissions router — handles code submission, execution, and result retrieval.

Supports multiple execution backends:
- "local": subprocess-based execution
- "piston": Piston API
- "judge0": Judge0 CE via RapidAPI
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from typing import Optional, List
from datetime import date
import asyncio

from database import get_convex
from schemas import SubmissionCreate, SubmissionResponse, SubmissionWithAnalysis
from config import settings
from auth import get_current_user, get_required_user
from arena_state import arena_manager
from routers.badges import evaluate_badges
from limiter import limiter
import ai_service
from convex import ConvexClient

router = APIRouter(prefix="/api/submissions", tags=["submissions"])


# ─── Execution Backend Selection ────────────────────────────────────

async def _run_single_test(
    source_code: str,
    test_input: str,
    expected_output: str,
    language: str,
    time_limit_ms: int,
    memory_limit_kb: int,
) -> dict:
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
            timeout_sec=max(1, int(time_limit_ms / 1000.0)),
        )
        return {
            "passed": result["passed"],
            "input": result["input"],
            "expected": result["expected"],
            "actual": result["actual"],
            "error": result.get("error"),
            "time": result.get("time_ms", 0) / 1000.0 if result.get("time_ms") else None,
            "memory": None,
            "status_id": 3 if result["status"] == "success" else (5 if result["status"] == "tle" else 11),
            "status_description": result["status"],
            "token": None,
        }


# ─── Background Tasks ──────────────────────────────────────────────

async def _run_ai_analysis(submission_id: str, problem_id: str, client: Optional[ConvexClient] = None):
    """
    Background task: run AI analysis on an accepted submission.
    Fetches real problem details and generates feedback.
    """
    if not ai_service.is_available():
        return

    if client is None:
        client = ConvexClient(settings.convex_url)

    try:
        submission = client.query("submissions:getById", {"submissionId": submission_id})
        if not submission or submission.get("status") != "accepted":
            return

        # Check if analysis already exists
        existing = client.query("analysis:getBySubmissionId", {"submissionId": submission_id})
        if existing:
            return

        # Fetch problem details
        problem = None
        try:
            problem = client.query("problems:getById", {"problemId": problem_id})
        except Exception:
            pass
        if not problem:
            try:
                problem = client.query("problems:getBySlug", {"slug": problem_id})
            except Exception:
                pass

        problem_title = problem.get("title", "Problem") if problem else "Problem"
        problem_desc = problem.get("description", "") if problem else ""
        constraints = problem.get("constraints", []) if problem else []
        if isinstance(constraints, list):
            constraints_text = "\n".join(constraints)
        else:
            constraints_text = str(constraints) if constraints else ""

        full_description = f"{problem_desc}\n\nConstraints:\n{constraints_text}".strip()

        result = await ai_service.analyze_code(
            source_code=submission.get("sourceCode", ""),
            problem_title=problem_title,
            problem_description=full_description,
            language=submission.get("language", "python"),
            runtime_ms=submission.get("runtimeMs"),
            memory_kb=0,
        )

        client.mutation("analysis:create", {
            "submissionId": submission_id,
            "problemId": problem_id,
            "timeComplexity": result.get("time_complexity"),
            "spaceComplexity": result.get("space_complexity"),
            "approach": result.get("approach"),
            "approachExplanation": result.get("approach_explanation"),
            "efficiencyScore": result.get("efficiency_score"),
            "codeQualityScore": result.get("code_quality_score"),
            "overallScore": result.get("overall_score"),
            "strengths": result.get("strengths", []),
            "improvements": result.get("improvements", []),
            "optimizedSolutionHint": result.get("optimized_solution_hint"),
            "rawResponse": result.get("raw_response"),
        })
    except Exception as e:
        print(f"[ERROR] Background AI analysis failed for submission {submission_id}: {e}")


async def _execute_submission(
    submission_id: str,
    source_code: str,
    test_cases: list,
    language: str,
    time_limit_ms: int,
    memory_limit_kb: int,
    problem_id: str,
    user_id: str,
    client: Optional[ConvexClient] = None,
):
    """
    Background task: run user code against all test cases,
    then update the submission record with results.
    If accepted, auto-trigger AI analysis and update streak.
    """
    if client is None:
        client = ConvexClient(settings.convex_url)

    try:
        client.mutation("submissions:updateResult", {
            "submissionId": submission_id,
            "status": "running",
            "passedCount": 0,
            "totalCount": len(test_cases),
        })

        test_results = []
        total_time = 0.0
        final_status = None
        final_stderr = None

        for idx, tc in enumerate(test_cases):
            test_input = tc.get("input", "")
            expected_output = tc.get("expected_output", tc.get("output", ""))
            is_hidden = tc.get("is_hidden", False)

            result = await _run_single_test(
                source_code=source_code,
                test_input=test_input,
                expected_output=expected_output,
                language=language,
                time_limit_ms=time_limit_ms,
                memory_limit_kb=memory_limit_kb,
            )

            test_results.append({
                "passed": result["passed"],
                "input": "[Hidden Test Case]" if is_hidden else result["input"],
                "expected": "[Hidden]" if is_hidden else result["expected"],
                "actual": "[Hidden]" if is_hidden else result["actual"],
                "error": result.get("error"),
                "is_hidden": is_hidden,
            })

            if result.get("time"):
                total_time += result["time"]

            # Check status codes
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

        # Update user streak and evaluate badges if accepted
        if final_status == "accepted" and user_id and user_id != "anonymous":
            try:
                client.mutation("streaks:updateStreak", {"userId": user_id, "isAccepted": True})
                evaluate_badges(user_id, client)
            except Exception as se:
                print(f"[ERROR] Failed to update user streak/badges: {se}")

        # Auto-trigger AI analysis for accepted submissions
        if final_status == "accepted":
            await _run_ai_analysis(submission_id, problem_id, client=client)

    except Exception as e:
        print(f"[ERROR] Submission execution failed: {e}")
        client.mutation("submissions:updateResult", {
            "submissionId": submission_id,
            "status": "runtime_error",
            "passedCount": 0,
            "totalCount": len(test_cases),
            "stderr": str(e),
        })


# ─── API Endpoints ──────────────────────────────────────────────────

@router.post("/", response_model=SubmissionResponse, status_code=201)
@limiter.limit("10/minute")
async def create_submission(
    request: Request,
    payload: SubmissionCreate,
    background_tasks: BackgroundTasks,
    client: ConvexClient = Depends(get_convex),
    current_user: dict = Depends(get_required_user),
):
    """Submit code for a problem. Fetches actual test cases and executes asynchronously."""
    # Fetch problem to get real test cases and limits
    problem = None
    try:
        problem = client.query("problems:getById", {"problemId": payload.problem_id})
    except Exception:
        pass

    if not problem:
        try:
            problem = client.query("problems:getBySlug", {"slug": payload.problem_id})
        except Exception:
            pass

    if not problem:
        from seed import SEED_PROBLEMS
        for p in SEED_PROBLEMS:
            if p.get("slug") == payload.problem_id or str(p.get("title")).lower() == payload.problem_id.lower():
                problem = dict(p)
                problem["_id"] = p.get("slug")
                problem["testCases"] = p.get("test_cases", [])
                break

    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    actual_problem_id = str(problem.get("_id", payload.problem_id))
    raw_test_cases = problem.get("testCases") or problem.get("test_cases") or []
    
    # Fallback to examples if testCases array is empty
    if not raw_test_cases and problem.get("examples"):
        raw_test_cases = [
            {"input": ex.get("input", ""), "expected_output": ex.get("output", "")}
            for ex in problem["examples"]
        ]

    if not raw_test_cases:
        raise HTTPException(status_code=400, detail="Problem has no test cases configured")

    user_id = current_user["id"]

    submission_id = client.mutation("submissions:create", {
        "problemId": actual_problem_id,
        "userId": user_id,
        "language": payload.language,
        "sourceCode": payload.source_code,
    })

    time_limit_ms = problem.get("timeLimitMs") or 2000
    memory_limit_kb = problem.get("memoryLimitKb") or 256000

    background_tasks.add_task(
        _execute_submission,
        submission_id=str(submission_id),
        source_code=payload.source_code,
        test_cases=raw_test_cases,
        language=payload.language,
        time_limit_ms=time_limit_ms,
        memory_limit_kb=memory_limit_kb,
        problem_id=actual_problem_id,
        user_id=user_id,
        client=client,
    )
    
    return {
        "id": str(submission_id),
        "problem_id": actual_problem_id,
        "language": payload.language,
        "status": "pending",
        "passed_count": 0,
        "total_count": len(raw_test_cases),
        "created_at": None,
    }


@router.get("/user/me", response_model=list[SubmissionResponse])
def list_my_submissions(
    client: ConvexClient = Depends(get_convex),
    current_user: dict = Depends(get_required_user),
):
    """List all submissions of the current user."""
    subs = client.query("submissions:listByUser", {"userId": current_user["id"]})
    for s in subs:
        s["id"] = str(s["_id"])
        s["problem_id"] = str(s["problemId"])
        s["passed_count"] = s.get("passedCount", 0)
        s["total_count"] = s.get("totalCount", 0)
        s["runtime_ms"] = s.get("runtimeMs")
        s["created_at"] = s.get("_creationTime")
    return subs


@router.get("/problem/{problem_id}/status")
def get_user_problem_status(
    problem_id: str,
    client: ConvexClient = Depends(get_convex),
    current_user: dict = Depends(get_required_user),
):
    """Get the current user's best status for a given problem."""
    try:
        subs = client.query("submissions:listByUserAndProblem", {"userId": current_user["id"], "problemId": problem_id})
    except Exception:
        subs = []

    if not subs:
        return {"solved": False, "status": None, "attempts": 0}

    has_accepted = any(s.get("status") == "accepted" for s in subs)
    best_status = "accepted" if has_accepted else subs[-1].get("status")

    return {
        "solved": has_accepted,
        "status": best_status,
        "attempts": len(subs),
    }


@router.get("/{submission_id}", response_model=SubmissionWithAnalysis)
def get_submission(submission_id: str, client: ConvexClient = Depends(get_convex)):
    """Get the status and results of a submission, including AI analysis if available."""
    sub = client.query("submissions:getById", {"submissionId": submission_id})
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    analysis = client.query("analysis:getBySubmissionId", {"submissionId": submission_id})
    if analysis:
        analysis["id"] = str(analysis["_id"])
        analysis["submission_id"] = str(analysis.get("submissionId", submission_id))
        analysis["problem_id"] = str(analysis.get("problemId", sub.get("problemId", "")))
        analysis["created_at"] = analysis.get("_creationTime")

    return {
        "id": str(sub["_id"]),
        "problem_id": str(sub["problemId"]),
        "language": sub["language"],
        "status": sub["status"],
        "runtime_ms": sub.get("runtimeMs"),
        "test_results": sub.get("testResults"),
        "passed_count": sub.get("passedCount", 0),
        "total_count": sub.get("totalCount", 0),
        "stderr": sub.get("stderr"),
        "created_at": sub.get("_creationTime"),
        "ai_analysis": analysis,
    }


@router.get("/problem/{problem_id}", response_model=list[SubmissionResponse])
def list_submissions_for_problem(
    problem_id: str, 
    client: ConvexClient = Depends(get_convex),
    current_user: dict = Depends(get_required_user),
):
    """List all submissions of the current user for a given problem."""
    try:
        subs = client.query("submissions:listByUserAndProblem", {"userId": current_user["id"], "problemId": problem_id})
    except Exception:
        subs = []

    for s in subs:
        s["id"] = str(s["_id"])
        s["problem_id"] = str(s["problemId"])
        s["passed_count"] = s.get("passedCount", 0)
        s["total_count"] = s.get("totalCount", 0)
        s["runtime_ms"] = s.get("runtimeMs")
        s["created_at"] = s.get("_creationTime")
    return subs
