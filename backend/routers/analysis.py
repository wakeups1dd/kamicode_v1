from fastapi import APIRouter, Depends, HTTPException
from database import get_convex
from schemas import AIAnalysisResponse
import ai_service

router = APIRouter(prefix="/api/analysis", tags=["analysis"])

@router.get("/{submission_id}")
def get_analysis(submission_id: str, client = Depends(get_convex)):
    """Get the AI analysis for a specific submission."""
    analysis = client.query("analysis:getBySubmissionId", {"submissionId": submission_id})
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found for this submission")
    
    # Map _id to id for response compatibility if needed
    analysis["id"] = analysis["_id"]
    return analysis

@router.post("/{submission_id}", status_code=201)
async def trigger_analysis(submission_id: str, client = Depends(get_convex)):
    """
    Manually trigger AI analysis for an accepted submission.
    """
    submission = client.query("submissions:getById", {"submissionId": submission_id})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    if submission.get("status") != "accepted":
        raise HTTPException(
            status_code=400,
            detail=f"Can only analyze accepted submissions. Current status: {submission.get('status')}"
        )

    existing = client.query("analysis:getBySubmissionId", {"submissionId": submission_id})
    if existing:
        raise HTTPException(status_code=409, detail="Analysis already exists for this submission")

    if not ai_service.is_available():
        raise HTTPException(
            status_code=503,
            detail="AI analysis is not available. Set the OPENAI_API_KEY environment variable."
        )

    # Note: We need problems:getById in Convex for this to fully work.
    # We will mock the problem details if they aren't available to not crash.
    # Ideally, we would fetch the problem from Convex.
    # Let's assume problems:getById is added.
    try:
        problem = client.query("problems:getById", {"problemId": submission.get("problemId")})
        problem_title = problem.get("title", "Unknown")
        problem_desc = problem.get("description", "")
    except Exception:
        problem_title = "Unknown Problem"
        problem_desc = "Code analysis request without context."

    result = await ai_service.analyze_code(
        source_code=submission.get("sourceCode"),
        problem_title=problem_title,
        problem_description=problem_desc,
        language=submission.get("language"),
        runtime_ms=submission.get("runtimeMs"),
        memory_kb=0, # Convex doesn't track memory yet
    )

    analysis_id = client.mutation("analysis:create", {
        "submissionId": submission_id,
        "problemId": submission.get("problemId"),
        "timeComplexity": result.get("time_complexity"),
        "spaceComplexity": result.get("space_complexity"),
        "approach": result.get("approach"),
        "approachExplanation": result.get("approach_explanation"),
        "efficiencyScore": result.get("efficiency_score"),
        "codeQualityScore": result.get("code_quality_score"),
        "overallScore": result.get("overall_score"),
        "strengths": result.get("strengths"),
        "improvements": result.get("improvements"),
        "optimizedSolutionHint": result.get("optimized_solution_hint"),
        "rawResponse": result.get("raw_response"),
    })

    # Return the newly created analysis
    return client.query("analysis:getBySubmissionId", {"submissionId": submission_id})

@router.get("/status/health")
def analysis_health():
    """Check if AI analysis service is available."""
    return {
        "available": ai_service.is_available(),
        "message": "OpenAI integration is active" if ai_service.is_available()
                   else "Set OPENAI_API_KEY environment variable to enable AI analysis",
    }
