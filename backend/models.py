from sqlalchemy import Column, Integer, String, Text, DateTime, Float, JSON, Enum as SQLEnum, ForeignKey
from sqlalchemy.sql import func
from database import Base
import enum


class Difficulty(str, enum.Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class SubmissionStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    ACCEPTED = "accepted"
    WRONG_ANSWER = "wrong_answer"
    TIME_LIMIT_EXCEEDED = "time_limit_exceeded"
    RUNTIME_ERROR = "runtime_error"
    COMPILATION_ERROR = "compilation_error"


class User(Base):
    """
    Flexible user model — designed as a placeholder for a full auth system.
    Currently uses a simple username-based identification via X-User header.
    Can be replaced with Supabase Auth, NextAuth, Clerk, etc. later.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    display_name = Column(String(255), nullable=True)
    email = Column(String(255), unique=True, nullable=True, index=True)
    avatar_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Problem(Base):
    __tablename__ = "problems"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=False)
    difficulty = Column(SQLEnum(Difficulty), nullable=False, default=Difficulty.EASY)
    topic = Column(String(100), nullable=False, default="general")
    constraints = Column(Text, nullable=True)
    examples = Column(JSON, nullable=True)  # [{input, output, explanation}]
    test_cases = Column(JSON, nullable=False)  # [{input, expected_output}]
    starter_code = Column(Text, nullable=True)
    time_limit_ms = Column(Integer, default=2000)
    memory_limit_kb = Column(Integer, default=256000)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    problem_id = Column(Integer, nullable=False, index=True)
    user_id = Column(Integer, nullable=True, index=True)  # Nullable for backward compat
    language = Column(String(50), nullable=False, default="python")
    source_code = Column(Text, nullable=False)
    status = Column(SQLEnum(SubmissionStatus), nullable=False, default=SubmissionStatus.PENDING)
    runtime_ms = Column(Float, nullable=True)
    memory_kb = Column(Float, nullable=True)
    test_results = Column(JSON, nullable=True)  # [{passed, input, expected, actual}]
    passed_count = Column(Integer, default=0)
    total_count = Column(Integer, default=0)
    judge0_tokens = Column(JSON, nullable=True)  # List of Judge0 submission tokens
    stdout = Column(Text, nullable=True)
    stderr = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AIAnalysis(Base):
    """
    Stores AI-powered analysis of accepted submissions.
    Triggered automatically when a submission passes all test cases.
    """
    __tablename__ = "ai_analyses"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    submission_id = Column(Integer, ForeignKey("submissions.id"), unique=True, nullable=False, index=True)
    problem_id = Column(Integer, nullable=False, index=True)

    # Complexity analysis
    time_complexity = Column(String(50), nullable=True)   # e.g. "O(n)"
    space_complexity = Column(String(50), nullable=True)  # e.g. "O(n)"

    # Approach detection
    approach = Column(String(100), nullable=True)         # e.g. "Hash Map", "Two Pointers"
    approach_explanation = Column(Text, nullable=True)

    # Scoring (0-100)
    efficiency_score = Column(Integer, nullable=True)
    code_quality_score = Column(Integer, nullable=True)
    overall_score = Column(Integer, nullable=True)

    # AI feedback
    strengths = Column(JSON, nullable=True)           # List of strength strings
    improvements = Column(JSON, nullable=True)        # List of improvement suggestions
    optimized_solution_hint = Column(Text, nullable=True)

    # Raw AI response for debugging
    raw_response = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
