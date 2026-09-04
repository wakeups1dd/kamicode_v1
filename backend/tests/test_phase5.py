"""
Phase 5 Test Suite — Performance Optimization, Caching, Observability & Health Probes.
"""

import pytest
import time
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from main import app
from cache import cache
from database import get_convex
from auth import get_current_admin_user


# ─── 1. Health & Readiness Probes ───────────────────────────────────────

def test_liveness_health_check():
    """Verify /api/health returns 200 OK with operational details."""
    client = TestClient(app)
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert data["version"] == "2.0.0"
    assert "uptime_seconds" in data
    assert data["service"] == "kamicode-api"


def test_readiness_probe_healthy():
    """Verify /api/health/ready verifies database and sandbox runner."""
    mock_convex = MagicMock()
    mock_convex.query.return_value = [{"_id": "p1", "title": "Two Sum"}]

    app.dependency_overrides[get_convex] = lambda: mock_convex

    client = TestClient(app)
    resp = client.get("/api/health/ready")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ready"
    assert data["checks"]["database"]["status"] == "ok"
    assert data["checks"]["code_runner"]["status"] == "ok"

    app.dependency_overrides.clear()


def test_readiness_probe_database_failure():
    """Verify /api/health/ready returns 503 when database is unreachable."""
    mock_convex = MagicMock()
    mock_convex.query.side_effect = Exception("Convex connection refused")

    app.dependency_overrides[get_convex] = lambda: mock_convex

    client = TestClient(app)
    resp = client.get("/api/health/ready")
    assert resp.status_code == 503
    data = resp.json()
    assert data["status"] == "not_ready"
    assert data["checks"]["database"]["status"] == "degraded"

    app.dependency_overrides.clear()


# ─── 2. Request Tracing & Timing Headers ────────────────────────────────

def test_request_tracing_middleware_generates_request_id():
    """Verify responses include auto-generated X-Request-ID and X-Process-Time-Ms."""
    client = TestClient(app)
    resp = client.get("/")
    assert resp.status_code == 200
    assert "X-Request-ID" in resp.headers
    assert "X-Process-Time-Ms" in resp.headers
    assert float(resp.headers["X-Process-Time-Ms"]) >= 0.0


def test_request_tracing_preserves_custom_request_id():
    """Verify client-supplied X-Request-ID is preserved across the lifecycle."""
    client = TestClient(app)
    custom_id = "trace-custom-uuid-999"
    resp = client.get("/", headers={"X-Request-ID": custom_id})
    assert resp.status_code == 200
    assert resp.headers["X-Request-ID"] == custom_id


# ─── 3. In-Memory Caching & Cache Invalidation ──────────────────────────

def test_in_memory_cache_ttl_expiry():
    """Verify cache item expires after TTL seconds."""
    cache.clear()
    cache.set("test_key", "test_value", ttl=1)
    assert cache.get("test_key") == "test_value"
    time.sleep(1.1)
    assert cache.get("test_key") is None


def test_problems_endpoint_caching_and_invalidation():
    """Verify problems list is served from cache and invalidated upon admin creation."""
    cache.clear()

    mock_convex = MagicMock()
    query_call_count = 0

    def mock_query(name, args):
        nonlocal query_call_count
        query_call_count += 1
        return [{"_id": "prob1", "title": "Two Sum", "slug": "two-sum", "difficulty": "easy", "topic": "arrays"}]

    mock_convex.query.side_effect = mock_query
    mock_convex.mutation.return_value = {
        "_id": "prob2",
        "title": "New Problem",
        "slug": "new-problem",
        "difficulty": "medium",
        "topic": "strings",
    }

    admin_user = {"id": "admin_user", "email": "admin@kamicode.com", "role": "admin"}
    app.dependency_overrides[get_convex] = lambda: mock_convex
    app.dependency_overrides[get_current_admin_user] = lambda: admin_user

    client = TestClient(app)

    # 1. First GET request -> queries database
    resp1 = client.get("/api/problems/")
    assert resp1.status_code == 200
    assert query_call_count == 1

    # 2. Second GET request -> served from memory cache (no database query)
    resp2 = client.get("/api/problems/")
    assert resp2.status_code == 200
    assert query_call_count == 1

    # 3. Admin POST request creates new problem -> invalidates problems:* cache
    create_payload = {
        "title": "New Problem",
        "slug": "new-problem",
        "description": "Desc",
        "difficulty": "medium",
        "topic": "strings",
    }
    create_resp = client.post("/api/problems/", json=create_payload)
    assert create_resp.status_code == 201

    # 4. Third GET request -> cache was cleared, so queries database again
    resp3 = client.get("/api/problems/")
    assert resp3.status_code == 200
    assert query_call_count == 2

    app.dependency_overrides.clear()
    cache.clear()
