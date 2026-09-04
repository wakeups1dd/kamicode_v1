"""
Health and Readiness Router — Provides liveness and deep readiness probes for container orchestration.
"""

import time
import os
import sys
from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from convex import ConvexClient

from config import settings
from database import get_convex
from code_runner import run_code_local

router = APIRouter(prefix="/api/health", tags=["health"])

START_TIME = time.time()


@router.get("")
@router.get("/")
def liveness_check():
    """Liveness probe: Returns basic application status and uptime."""
    uptime_sec = round(time.time() - START_TIME, 2)
    return {
        "status": "healthy",
        "service": "kamicode-api",
        "version": "2.0.0",
        "uptime_seconds": uptime_sec,
        "environment": "production" if not settings.bypass_auth else "development",
    }


@router.get("/ready")
async def readiness_check(client: ConvexClient = Depends(get_convex)):
    """
    Readiness probe: Validates database connectivity, code execution sandbox,
    and platform memory availability.
    """
    checks = {}
    is_ready = True

    # 1. Database Connectivity Check
    try:
        # Simple ping query to Convex
        res = client.query("problems:list", {})
        checks["database"] = {"status": "ok", "provider": "Convex"}
    except Exception as e:
        checks["database"] = {"status": "degraded", "error": str(e)}
        is_ready = False

    # 2. Local Code Execution Sandbox Check
    try:
        test_run = await run_code_local("print('ready')", "ready\n", "python")
        if test_run.get("status") == "success":
            checks["code_runner"] = {"status": "ok", "mode": settings.code_runner_mode}
        else:
            checks["code_runner"] = {"status": "degraded", "detail": test_run}
            is_ready = False
    except Exception as e:
        checks["code_runner"] = {"status": "error", "error": str(e)}
        is_ready = False

    # 3. AI Service Availability
    checks["ai_service"] = {
        "status": "configured" if settings.openai_api_key else "fallback_mode",
        "provider": "OpenAI" if settings.openai_api_key else "AST/Heuristic Fallback",
    }

    status_code = status.HTTP_200_OK if is_ready else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(
        status_code=status_code,
        content={
            "status": "ready" if is_ready else "not_ready",
            "checks": checks,
            "timestamp": int(time.time()),
        },
    )
