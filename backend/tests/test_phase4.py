"""
Phase 4 Test Suite — Problem Management, Starter Code Integrity & Admin Content Quality.
"""

import ast
import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient

from main import app
from auth import get_current_admin_user, get_required_user
from database import get_convex
from seed import SEED_PROBLEMS, SEED_BADGES


# ─── 1. Problem Dataset Quality & Starter Code Syntax Verification ─────

def test_seed_problems_integrity():
    """Verify all seeded problems have required fields, valid difficulty, and test cases."""
    assert len(SEED_PROBLEMS) >= 15, "Expected at least 15 curated seed problems"

    slugs = set()
    for prob in SEED_PROBLEMS:
        # Check basic fields
        assert prob["title"], "Problem title is required"
        assert prob["slug"], "Problem slug is required"
        assert prob["slug"] not in slugs, f"Duplicate slug: {prob['slug']}"
        slugs.add(prob["slug"])

        assert prob["difficulty"] in ("easy", "medium", "hard")
        assert prob["topic"], f"Problem topic required for {prob['slug']}"
        assert prob["description"], f"Problem description required for {prob['slug']}"
        assert prob["constraints"], f"Problem constraints required for {prob['slug']}"

        # Check examples and test cases
        assert len(prob["examples"]) >= 1, f"Examples missing for {prob['slug']}"
        assert len(prob["test_cases"]) >= 3, f"Insufficient test cases for {prob['slug']}"

        for tc in prob["test_cases"]:
            assert "input" in tc
            assert "expected_output" in tc


def test_starter_code_syntax_validity():
    """Verify all problem starter code snippets are syntactically valid Python."""
    for prob in SEED_PROBLEMS:
        code = prob.get("starter_code", "")
        assert code, f"Starter code missing for {prob['slug']}"
        try:
            ast.parse(code)
        except SyntaxError as e:
            pytest.fail(f"Starter code syntax error in {prob['slug']}: {e}")


# ─── 2. Admin Problem Management Endpoints ──────────────────────────────

def test_admin_create_and_update_problem_flow():
    """Verify admin can create, update, and delete problems via API."""
    mock_convex = MagicMock()
    mock_convex.mutation.side_effect = lambda mutation_name, args: (
        {"_id": "kd7newprob", **args}
        if "create" in mutation_name
        else ({"_id": args.get("id"), **args} if "update" in mutation_name else {"success": True})
    )

    admin_user = {"id": "admin_user_id", "email": "admin@kamicode.com", "role": "admin"}
    app.dependency_overrides[get_current_admin_user] = lambda: admin_user
    app.dependency_overrides[get_convex] = lambda: mock_convex

    client = TestClient(app)

    # 1. Create Problem
    create_payload = {
        "title": "Median of Two Sorted Arrays",
        "slug": "median-of-two-sorted-arrays",
        "description": "Find the median of two sorted arrays in O(log(m+n)).",
        "difficulty": "hard",
        "topic": "binary-search",
        "constraints": ["1 <= nums1.length <= 1000", "1 <= nums2.length <= 1000"],
        "examples": [{"input": "1 3\n2", "output": "2.0", "explanation": "Merged is [1,2,3], median 2.0"}],
        "test_cases": [{"input": "1 3\n2", "expected_output": "2.0"}],
        "starter_code": "print(2.0)\n",
        "time_limit_ms": 2000,
        "memory_limit_kb": 256000,
    }

    create_resp = client.post("/api/problems/", json=create_payload)
    assert create_resp.status_code == 201
    data = create_resp.json()
    assert data["title"] == "Median of Two Sorted Arrays"
    assert data["slug"] == "median-of-two-sorted-arrays"

    # 2. Update Problem
    update_payload = dict(create_payload)
    update_payload["title"] = "Median of Two Sorted Arrays (Updated)"

    update_resp = client.put("/api/problems/kd7newprob", json=update_payload)
    assert update_resp.status_code == 200
    assert update_resp.json()["title"] == "Median of Two Sorted Arrays (Updated)"

    # 3. Delete Problem
    delete_resp = client.delete("/api/problems/kd7newprob")
    assert delete_resp.status_code == 200
    assert delete_resp.json()["success"] is True

    app.dependency_overrides.clear()


def test_regular_user_cannot_manage_problems():
    """Verify regular non-admin user cannot access problem management endpoints."""
    from config import settings
    orig_bypass = settings.bypass_auth
    orig_admins = settings.admin_user_ids
    settings.bypass_auth = False
    settings.admin_user_ids = ""

    try:
        mock_user = {"id": "regular_user", "email": "user@kamicode.com", "role": "user"}
        mock_convex = MagicMock()
        mock_convex.query.return_value = {"userId": "regular_user", "role": "user"}

        app.dependency_overrides[get_required_user] = lambda: mock_user
        app.dependency_overrides[get_convex] = lambda: mock_convex

        client = TestClient(app)

        payload = {
            "title": "Hacked Problem",
            "slug": "hacked-problem",
            "description": "...",
            "difficulty": "easy",
            "topic": "arrays",
        }

        create_resp = client.post("/api/problems/", json=payload)
        assert create_resp.status_code in (401, 403)

        update_resp = client.put("/api/problems/kd7123", json=payload)
        assert update_resp.status_code in (401, 403)

        delete_resp = client.delete("/api/problems/kd7123")
        assert delete_resp.status_code in (401, 403)
    finally:
        settings.bypass_auth = orig_bypass
        settings.admin_user_ids = orig_admins
        app.dependency_overrides.clear()
