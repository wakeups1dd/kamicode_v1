"""
KamiCode API — FastAPI backend for the AI-powered coding league platform.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from config import settings
from database import engine, Base
from models import Problem, Submission, User, AIAnalysis, Badge, UserBadge, UserStat  # noqa: F401 — ensures tables are registered
from routers import problems, submissions, analysis, cohorts, leaderboard, streaks, arena, badges, friends


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Create all database tables on startup
    Base.metadata.create_all(bind=engine)
    print(f"[*] KamiCode API starting...")
    print(f"    Database: {settings.database_url}")
    print(f"    Convex URL: {settings.convex_url}")
    print(f"    Code Runner: {settings.code_runner_mode}")
    print(f"    AI Analysis: {'enabled' if settings.openai_api_key else 'disabled (no OPENAI_API_KEY)'}")
    yield
    print("[*] KamiCode API shutting down...")


app = FastAPI(
    title="KamiCode API",
    description="API for the KamiCode competitive programming platform",
    version="2.0.0",
    lifespan=lifespan,
)

# Configure CORS
origins = [o.strip() for o in settings.cors_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(problems.router)
app.include_router(submissions.router)
app.include_router(analysis.router)
app.include_router(cohorts.router)
app.include_router(leaderboard.router)
app.include_router(streaks.router)
app.include_router(arena.router)
app.include_router(badges.router)
app.include_router(friends.router)


@app.get("/")
def read_root():
    return {"message": "Welcome to KamiCode API", "version": "2.0.0"}


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "version": "2.0.0",
        "code_runner": settings.code_runner_mode,
        "ai_analysis": bool(settings.openai_api_key),
    }
