from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import AIAnalysis, Submission, Problem, SubmissionStatus
from schemas import AIAnalysisResponse
import ai_service

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


@router.get("/{submission_id}", response_model=AIAnalysisResponse)
def get_analysis(submission_id: int, db: Session = Depends(get_db)):
    """Get the AI analysis for a specific submission."""
    analysis = db.query(AIAnalysis).filter(
        AIAnalysis.submission_id == submission_id
    ).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found for this submission")
    return analysis


@router.post("/{submission_id}", response_model=AIAnalysisResponse, status_code=201)
async def trigger_analysis(submission_id: int, db: Session = Depends(get_db)):
    """
    Manually trigger AI analysis for an accepted submission.
    Returns 400 if the submission hasn't been accepted yet.
    Returns 409 if analysis already exists.
    """
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    if submission.status != SubmissionStatus.ACCEPTED:
        raise HTTPException(
            status_code=400,
            detail=f"Can only analyze accepted submissions. Current status: {submission.status}"
        )

    # Check if analysis already exists
    existing = db.query(AIAnalysis).filter(
        AIAnalysis.submission_id == submission_id
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Analysis already exists for this submission")

    if not ai_service.is_available():
        raise HTTPException(
            status_code=503,
            detail="AI analysis is not available. Set the OPENAI_API_KEY environment variable."
        )

    # Fetch problem for context
    problem = db.query(Problem).filter(Problem.id == submission.problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    # Run the analysis
    result = await ai_service.analyze_code(
        source_code=submission.source_code,
        problem_title=problem.title,
        problem_description=problem.description,
        language=submission.language,
        runtime_ms=submission.runtime_ms,
        memory_kb=submission.memory_kb,
    )

    # Save to database
    analysis = AIAnalysis(
        submission_id=submission.id,
        problem_id=submission.problem_id,
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
    db.refresh(analysis)

    return analysis


@router.get("/status/health")
def analysis_health():
    """Check if AI analysis service is available."""
    return {
        "available": ai_service.is_available(),
        "message": "OpenAI integration is active" if ai_service.is_available()
                   else "Set OPENAI_API_KEY environment variable to enable AI analysis",
    }
