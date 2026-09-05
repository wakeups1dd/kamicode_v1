"""
KamiCode API — High-Performance, Secure FastAPI backend for the KamiCode CP platform.
"""

import time
import uuid
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from limiter import limiter

from config import settings
from routers import (
    health,
    problems,
    submissions,
    analysis,
    cohorts,
    leaderboard,
    streaks,
    arena,
    badges,
    friends,
)

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
)
logger = logging.getLogger("kamicode.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("KamiCode API initialized")
    logger.info(f"Convex DB: {settings.convex_url}")
    logger.info(f"Code Runner: {settings.code_runner_mode}")
    ai_provider = "Gemini" if settings.gemini_api_key else ("OpenAI" if settings.openai_api_key else "Local Heuristic Engine")
    logger.info(f"AI Service: {ai_provider}")
    yield
    logger.info("KamiCode API shutting down...")


app = FastAPI(
    title="KamiCode API",
    description="Commercial-grade competitive programming and AI analysis platform",
    version="2.0.0",
    lifespan=lifespan,
)

# Register rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS
origins = [o.strip() for o in settings.cors_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Structured Request Tracing & Timing Middleware
@app.middleware("http")
async def request_tracing_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    start_time = time.perf_counter()

    response = await call_next(request)

    process_time_ms = round((time.perf_counter() - start_time) * 1000, 2)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time-Ms"] = str(process_time_ms)

    # Log non-healthcheck requests or slow requests
    if not request.url.path.startswith("/api/health"):
        logger.info(
            f"{request.method} {request.url.path} "
            f"status={response.status_code} "
            f"latency={process_time_ms}ms "
            f"req_id={request_id[:8]}"
        )

    return response


# Register routers
app.include_router(health.router)
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
    return {
        "name": "KamiCode API",
        "version": "2.0.0",
        "status": "operational",
        "documentation": "/docs",
    }
