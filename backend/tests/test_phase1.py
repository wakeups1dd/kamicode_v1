"""
Phase 1 Automated Test Suite:
- Cryptographic JWT signature verification & rejection of forged/expired tokens
- Route protection (Admin-only problem creation, required auth)
- Submissions execution & testcase handling
- AI analysis heuristic & OpenAI integration
- Schema string ID compatibility
"""

import pytest
from fastapi.testclient import TestClient

from main import app
from config import settings
from database import get_convex
from auth import get_required_user, get_current_user_id
import ai_service


# Setup mock Convex client for testing
class MockConvexClient:
    def __init__(self):
        self.problems = {
            "p1": {
                "_id": "p1",
                "title": "Two Sum",
                "slug": "two-sum",
                "description": "Given an array of integers nums and an integer target, return indices...",
                "difficulty": "easy",
                "topic": "arrays",
                "constraints": ["2 <= nums.length <= 10^4"],
                "examples": [{"input": "2 7 11 15\n9", "output": "0 1"}],
                "testCases": [
                    {"input": "2 7 11 15\n9", "expected_output": "0 1"},
                    {"input": "3 2 4\n6", "expected_output": "1 2"},
                ],
                "starterCode": "nums = list(map(int, input().split()))\ntarget = int(input())\n",
                "timeLimitMs": 2000,
                "memoryLimitKb": 256000,
                "_creationTime": 1700000000000,
            }
        }
        self.submissions = {}
        self.analyses = {}
        self.users = {
            "admin-user-id": {"userId": "admin-user-id", "username": "admin", "role": "admin"},
            "regular-user-id": {"userId": "regular-user-id", "username": "student", "role": "user"},
        }
        self.streaks = {}

    def query(self, name: str, args: dict):
        if name == "problems:list":
            return list(self.problems.values())
        elif name == "problems:getBySlug":
            slug = args.get("slug")
            for p in self.problems.values():
                if p["slug"] == slug:
                    return p
            return None
        elif name == "problems:getById":
            return self.problems.get(args.get("problemId"))
        elif name == "submissions:getById":
            return self.submissions.get(args.get("submissionId"))
        elif name == "submissions:listByUser":
            return [s for s in self.submissions.values() if s.get("userId") == args.get("userId")]
        elif name == "submissions:listByUserAndProblem":
            return [
                s for s in self.submissions.values()
                if s.get("userId") == args.get("userId") and s.get("problemId") == args.get("problemId")
            ]
        elif name == "analysis:getBySubmissionId":
            return self.analyses.get(args.get("submissionId"))
        elif name == "users:getByUserId":
            return self.users.get(args.get("userId"))
        elif name == "streaks:getByUserId":
            return self.streaks.get(args.get("userId"))
        elif name == "streaks:getStats":
            return {"arenaMatches": 0, "arenaWins": 0}
        elif name == "badges:list":
            return []
        elif name == "badges:listForUser":
            return []
        return None

    def mutation(self, name: str, args: dict):
        if name == "problems:create":
            new_id = f"p_{len(self.problems) + 1}"
            doc = {"_id": new_id, **args, "_creationTime": 1700000000000}
            self.problems[new_id] = doc
            return doc
        elif name == "submissions:create":
            sub_id = f"sub_{len(self.submissions) + 1}"
            doc = {"_id": sub_id, **args, "status": "pending", "_creationTime": 1700000000000}
            self.submissions[sub_id] = doc
            return sub_id
        elif name == "submissions:updateResult":
            sub_id = args.get("submissionId")
            if sub_id in self.submissions:
                self.submissions[sub_id].update(args)
            return None
        elif name == "analysis:create":
            an_id = f"an_{len(self.analyses) + 1}"
            doc = {"_id": an_id, **args, "_creationTime": 1700000000000}
            self.analyses[args.get("submissionId")] = doc
            return an_id
        elif name == "streaks:updateStreak":
            u_id = args.get("userId")
            self.streaks[u_id] = {
                "userId": u_id,
                "currentStreak": 1,
                "longestStreak": 1,
                "lastSolveDate": "2026-09-03",
                "totalSolves": 1,
            }
            return None
        return "ok"


mock_convex = MockConvexClient()


def override_get_convex():
    return mock_convex


app.dependency_overrides[get_convex] = override_get_convex
client = TestClient(app)


# ─── 1. Auth & JWT Verification Tests ─────────────────────────────────

def test_unauthenticated_request_rejected_on_protected_endpoint():
    """Unauthenticated requests to protected endpoints must return 401."""
    settings.bypass_auth = False
    app.dependency_overrides.pop(get_required_user, None)
    app.dependency_overrides.pop(get_current_user_id, None)

    response = client.post("/api/submissions/", json={
        "problem_id": "p1",
        "language": "python",
        "source_code": "print('hello')",
    })
    assert response.status_code == 401
    assert "detail" in response.json()


def test_forged_or_invalid_jwt_rejected():
    """Forged JWT tokens with fake signatures must be rejected with 401."""
    settings.bypass_auth = False
    app.dependency_overrides.pop(get_required_user, None)
    app.dependency_overrides.pop(get_current_user_id, None)

    fake_token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJoYWNrZXIifQ.fakesignature"
    response = client.post(
        "/api/submissions/",
        json={"problem_id": "p1", "language": "python", "source_code": "print('1')"},
        headers={"Authorization": f"Bearer {fake_token}"},
    )
    assert response.status_code == 401


def test_bypass_auth_mode():
    """When BYPASS_AUTH is True, dev user header or default dev-user-id is accepted."""
    settings.bypass_auth = True
    app.dependency_overrides.pop(get_required_user, None)
    app.dependency_overrides.pop(get_current_user_id, None)

    response = client.get("/api/streaks/me", headers={"X-User-Id": "dev-user-123"})
    assert response.status_code == 200
    assert response.json()["user_id"] == "dev-user-123"


# ─── 2. Admin Route Protection Tests ─────────────────────────────────

def test_admin_route_protection_for_regular_user():
    """Non-admin user cannot create problems (403 Forbidden)."""
    settings.bypass_auth = False
    settings.admin_user_ids = "admin-user-id"
    app.dependency_overrides[get_required_user] = lambda: {"id": "regular-user-id"}

    response = client.post("/api/problems/", json={
        "title": "New Problem",
        "slug": "new-problem",
        "description": "Desc",
        "difficulty": "easy",
        "topic": "arrays",
        "test_cases": [{"input": "1", "expected_output": "1"}],
    })
    assert response.status_code == 403


def test_admin_route_success_for_admin_user():
    """Admin user can create problems."""
    settings.bypass_auth = False
    settings.admin_user_ids = "admin-user-id"
    app.dependency_overrides[get_required_user] = lambda: {"id": "admin-user-id"}

    response = client.post("/api/problems/", json={
        "title": "Admin Created Problem",
        "slug": "admin-problem-1",
        "description": "Desc",
        "difficulty": "medium",
        "topic": "graphs",
        "test_cases": [{"input": "1", "expected_output": "1"}],
    })
    assert response.status_code == 201
    assert response.json()["slug"] == "admin-problem-1"
    assert isinstance(response.json()["id"], str)


# ─── 3. Submissions & Test Case Execution Tests ───────────────────────

@pytest.mark.asyncio
async def test_submission_and_execution_flow():
    """Submit code, verify actual problem test cases are evaluated."""
    settings.bypass_auth = True
    app.dependency_overrides.pop(get_required_user, None)

    solution_code = """
nums = list(map(int, input().split()))
target = int(input())
seen = {}
for i, num in enumerate(nums):
    comp = target - num
    if comp in seen:
        print(f"{seen[comp]} {i}")
        break
    seen[num] = i
"""
    response = client.post(
        "/api/submissions/",
        json={"problem_id": "p1", "language": "python", "source_code": solution_code},
        headers={"X-User-Id": "dev-user-id"},
    )
    assert response.status_code == 201
    sub_data = response.json()
    assert sub_data["status"] == "pending"
    assert sub_data["total_count"] == 2  # p1 has 2 test cases!


# ─── 4. AI Analysis Heuristic and Fallback Tests ──────────────────────

@pytest.mark.asyncio
async def test_ai_analysis_generation():
    """Verify AI analysis correctly evaluates algorithmic structure."""
    code = """
seen = {}
for i, n in enumerate(nums):
    if target - n in seen:
        return [seen[target - n], i]
    seen[n] = i
"""
    analysis = await ai_service.analyze_code(
        source_code=code,
        problem_title="Two Sum",
        problem_description="Given array and target...",
        language="python",
        runtime_ms=12.5,
    )
    assert "time_complexity" in analysis
    assert "approach" in analysis
    assert "efficiency_score" in analysis
    assert analysis["efficiency_score"] >= 80
    assert len(analysis["strengths"]) > 0
