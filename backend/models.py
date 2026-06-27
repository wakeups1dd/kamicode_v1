from sqlalchemy import Column, Integer, String, Text, DateTime, Float, JSON, Enum as SQLEnum, ForeignKey, Date
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
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
    User model integrated with Supabase Auth / Local dev.
    id is a String(36) representing the Supabase UUID (or mock ID in dev).
    """
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, index=True)
    username = Column(String(255), unique=True, nullable=False, index=True)
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
    problem_id = Column(String(100), nullable=False, index=True)
    user_id = Column(String(36), nullable=True, index=True)  # Supabase User UUID
    language = Column(String(50), nullable=False, default="python")
    source_code = Column(Text, nullable=False)
    status = Column(SQLEnum(SubmissionStatus), nullable=False, default=SubmissionStatus.PENDING)
    runtime_ms = Column(Float, nullable=True)
    memory_kb = Column(Float, nullable=True)
    test_results = Column(JSON, nullable=True)  # [{passed, input, expected, actual}]
    passed_count = Column(Integer, default=0)
    total_count = Column(Integer, default=0)
    judge0_tokens = Column(JSON, nullable=True)
    stdout = Column(Text, nullable=True)
    stderr = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AIAnalysis(Base):
    """
    Stores AI-powered analysis of accepted submissions.
    """
    __tablename__ = "ai_analyses"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    submission_id = Column(String(100), unique=True, nullable=False, index=True)
    problem_id = Column(String(100), nullable=False, index=True)

    time_complexity = Column(String(50), nullable=True)
    space_complexity = Column(String(50), nullable=True)

    approach = Column(String(100), nullable=True)
    approach_explanation = Column(Text, nullable=True)

    efficiency_score = Column(Integer, nullable=True)
    code_quality_score = Column(Integer, nullable=True)
    overall_score = Column(Integer, nullable=True)

    strengths = Column(JSON, nullable=True)
    improvements = Column(JSON, nullable=True)
    optimized_solution_hint = Column(Text, nullable=True)

    raw_response = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Cohort(Base):
    """A college/club coding league."""
    __tablename__ = "cohorts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, index=True)
    description = Column(Text, nullable=True)
    invite_code = Column(String(20), unique=True, index=True)  # e.g., KAMI23
    created_by = Column(String(36), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class CohortMember(Base):
    """User membership in a cohort."""
    __tablename__ = "cohort_members"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    cohort_id = Column(Integer, ForeignKey("cohorts.id", ondelete="CASCADE"))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"))
    role = Column(String(20), default="member")  # "admin" | "member"
    joined_at = Column(DateTime(timezone=True), server_default=func.now())


class UserStreak(Base):
    """Daily solve streak tracking."""
    __tablename__ = "user_streaks"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    current_streak = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    last_solve_date = Column(Date, nullable=True)
    total_solves = Column(Integer, default=0)


class DailyChallenge(Base):
    """Daily problem assignment for a cohort."""
    __tablename__ = "daily_challenges"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    cohort_id = Column(Integer, ForeignKey("cohorts.id", ondelete="CASCADE"))
    problem_id = Column(String(100), nullable=False)
    date = Column(Date, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Badge(Base):
    """System badges that users can unlock."""
    __tablename__ = "badges"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), unique=True, nullable=False)
    description = Column(String(500), nullable=False)
    icon_name = Column(String(50), nullable=False)  # e.g. 'Swords', 'Flame', 'Trophy'
    condition_type = Column(String(50), nullable=False) # 'total_solves', 'arena_wins', 'streak'
    condition_value = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class UserBadge(Base):
    """Tracks which user unlocked which badge."""
    __tablename__ = "user_badges"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    badge_id = Column(Integer, ForeignKey("badges.id", ondelete="CASCADE"), index=True)
    awarded_at = Column(DateTime(timezone=True), server_default=func.now())
    badge = relationship("Badge")


class UserStat(Base):
    """General user stats tracked continuously, e.g., for Arena."""
    __tablename__ = "user_stats"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True)
    arena_matches = Column(Integer, default=0)
    arena_wins = Column(Integer, default=0)


class FriendshipStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"


class Friendship(Base):
    """Tracks friend requests and accepted friends."""
    __tablename__ = "friendships"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    friend_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    status = Column(SQLEnum(FriendshipStatus), nullable=False, default=FriendshipStatus.PENDING)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

