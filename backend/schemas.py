from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# ---------- Problem Schemas ----------

class ExampleCase(BaseModel):
    input: str
    output: str
    explanation: Optional[str] = None


class TestCase(BaseModel):
    input: str
    expected_output: str


class ProblemBase(BaseModel):
    title: str
    slug: str
    description: str
    difficulty: str
    topic: str = "general"
    constraints: Optional[str] = None
    examples: Optional[list[ExampleCase]] = None
    test_cases: list[TestCase]
    starter_code: Optional[str] = None
    time_limit_ms: int = 2000
    memory_limit_kb: int = 256000


class ProblemCreate(ProblemBase):
    pass


class ProblemSummary(BaseModel):
    id: int
    title: str
    slug: str
    difficulty: str
    topic: str

    model_config = {"from_attributes": True}


class ProblemDetail(BaseModel):
    id: int
    title: str
    slug: str
    description: str
    difficulty: str
    topic: str
    constraints: Optional[str] = None
    examples: Optional[list[ExampleCase]] = None
    starter_code: Optional[str] = None
    time_limit_ms: int
    memory_limit_kb: int
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ---------- Submission Schemas ----------

class SubmissionCreate(BaseModel):
    problem_id: int
    language: str = "python"
    source_code: str


class TestResultItem(BaseModel):
    passed: bool
    input: str
    expected: str
    actual: Optional[str] = None
    error: Optional[str] = None


class SubmissionResponse(BaseModel):
    id: int
    problem_id: int
    language: str
    status: str
    runtime_ms: Optional[float] = None
    memory_kb: Optional[float] = None
    test_results: Optional[list[TestResultItem]] = None
    passed_count: int
    total_count: int
    stdout: Optional[str] = None
    stderr: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ---------- AI Analysis Schemas ----------

class AIAnalysisResponse(BaseModel):
    id: int
    submission_id: int
    problem_id: int
    time_complexity: Optional[str] = None
    space_complexity: Optional[str] = None
    approach: Optional[str] = None
    approach_explanation: Optional[str] = None
    efficiency_score: Optional[int] = None
    code_quality_score: Optional[int] = None
    overall_score: Optional[int] = None
    strengths: Optional[list[str]] = None
    improvements: Optional[list[str]] = None
    optimized_solution_hint: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class SubmissionWithAnalysis(BaseModel):
    """Extended submission response that includes AI analysis if available."""
    id: int
    problem_id: int
    language: str
    status: str
    runtime_ms: Optional[float] = None
    memory_kb: Optional[float] = None
    test_results: Optional[list[TestResultItem]] = None
    passed_count: int
    total_count: int
    stdout: Optional[str] = None
    stderr: Optional[str] = None
    created_at: Optional[datetime] = None
    ai_analysis: Optional[AIAnalysisResponse] = None

    model_config = {"from_attributes": True}


# ---------- User Schemas ----------

class UserCreate(BaseModel):
    username: str
    display_name: Optional[str] = None
    email: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
