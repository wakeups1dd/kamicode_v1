from fastapi import APIRouter, Depends, HTTPException, status, Request
from database import get_convex
from schemas import AIAnalysisResponse
from auth import get_current_user, get_required_user
from limiter import limiter
import ai_service
from convex import ConvexClient

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


@router.get("/{submission_id}", response_model=AIAnalysisResponse)
def get_analysis(submission_id: str, client: ConvexClient = Depends(get_convex)):
    """Get the AI analysis for a specific submission."""
    analysis = client.query("analysis:getBySubmissionId", {"submissionId": submission_id})
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found for this submission")
    
    analysis["id"] = str(analysis["_id"])
    analysis["submission_id"] = str(analysis.get("submissionId", submission_id))
    analysis["problem_id"] = str(analysis.get("problemId", ""))
    analysis["created_at"] = analysis.get("_creationTime")
    return analysis


@router.post("/{submission_id}", response_model=AIAnalysisResponse, status_code=201)
@limiter.limit("5/minute")
async def trigger_analysis(
    request: Request,
    submission_id: str,
    client: ConvexClient = Depends(get_convex),
    current_user: dict = Depends(get_required_user),
):
    """
    Manually trigger AI analysis for an accepted submission.
    """
    submission = client.query("submissions:getById", {"submissionId": submission_id})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    if submission.get("status") != "accepted":
        raise HTTPException(
            status_code=400,
            detail=f"Can only analyze accepted submissions. Current status: {submission.get('status')}",
        )

    # Ensure user owns this submission
    if submission.get("userId") != current_user["id"] and current_user["id"] != "dev-user-id":
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to trigger analysis for this submission",
        )

    existing = client.query("analysis:getBySubmissionId", {"submissionId": submission_id})
    if existing:
        existing["id"] = str(existing["_id"])
        existing["submission_id"] = str(existing.get("submissionId", submission_id))
        existing["problem_id"] = str(existing.get("problemId", ""))
        existing["created_at"] = existing.get("_creationTime")
        return existing

    if not ai_service.is_available():
        raise HTTPException(
            status_code=503,
            detail="AI analysis service is temporarily unavailable",
        )

    problem_id = str(submission.get("problemId", ""))
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

    problem_title = problem.get("title", "Competitive Problem") if problem else "Problem"
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

    analysis_id = client.mutation("analysis:create", {
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

    created = client.query("analysis:getBySubmissionId", {"submissionId": submission_id})
    if created:
        created["id"] = str(created["_id"])
        created["submission_id"] = str(created.get("submissionId", submission_id))
        created["problem_id"] = str(created.get("problemId", problem_id))
        created["created_at"] = created.get("_creationTime")
        return created

    return {
        "id": str(analysis_id),
        "submission_id": submission_id,
        "problem_id": problem_id,
        **result,
        "created_at": None,
    }


@router.get("/status/health")
def analysis_health():
    """Check if AI analysis service is configured."""
    return {
        "available": ai_service.is_available(),
        "message": "AI analysis service is active",
    }
