import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from main import app
from daily_challenge_ai import (
    generate_and_verify_daily_problem,
    verify_problem_solution,
    _get_curated_fallback_problem,
)
from routers.daily_challenge import (
    get_today_utc_date,
    get_seconds_until_utc_midnight,
)

client = TestClient(app)


def test_utc_date_and_seconds_until_midnight():
    """Verify standard 12:00 AM UTC rollover time calculations."""
    today = get_today_utc_date()
    assert len(today) == 10
    assert today.count("-") == 2

    secs = get_seconds_until_utc_midnight()
    assert 0 <= secs <= 86400


@pytest.mark.asyncio
async def test_problem_verification_logic():
    """Verify that verify_problem_solution accepts correct code and rejects broken code."""
    valid_problem = {
        "reference_solution": "a, b = map(int, input().split())\nprint(a + b)",
        "test_cases": [
            {"input": "1 2", "expected_output": "3"},
            {"input": "10 20", "expected_output": "30"},
            {"input": "-5 5", "expected_output": "0"},
        ]
    }
    passed, err = await verify_problem_solution(valid_problem)
    assert passed is True
    assert err is None

    broken_problem = {
        "reference_solution": "a, b = map(int, input().split())\nprint(a - b)",  # Wrong logic
        "test_cases": [
            {"input": "1 2", "expected_output": "3"},
        ]
    }
    passed, err = await verify_problem_solution(broken_problem)
    assert passed is False
    assert err is not None


@pytest.mark.asyncio
async def test_curated_fallback_generation_and_verification():
    """Verify curated fallback problems pass sandbox test cases 100%."""
    today_str = get_today_utc_date()
    problem = _get_curated_fallback_problem(today_str, "easy", "arrays")
    assert problem["title"]
    assert problem["slug"]
    assert len(problem["test_cases"]) >= 4

    passed, err = await verify_problem_solution(problem)
    assert passed is True, f"Curated fallback failed verification: {err}"


def test_get_daily_challenge_endpoint():
    """Test GET /api/daily-challenge returns full problem metadata with reset countdown."""
    response = client.get("/api/daily-challenge")
    assert response.status_code == 200
    data = response.json()

    assert "id" in data
    assert "problem_id" in data
    assert "problem_slug" in data
    assert "problem_title" in data
    assert "difficulty" in data
    assert "topic" in data
    assert "date" in data
    assert data["date"] == get_today_utc_date()
    assert "seconds_until_reset" in data
    assert data["seconds_until_reset"] >= 0
    assert "is_solved" in data


def test_daily_challenge_idempotency():
    """Two successive requests for the daily challenge on the same day must return the same problem."""
    res1 = client.get("/api/daily-challenge")
    res2 = client.get("/api/daily-challenge")

    assert res1.status_code == 200
    assert res2.status_code == 200
    assert res1.json()["problem_slug"] == res2.json()["problem_slug"]
    assert res1.json()["date"] == res2.json()["date"]


def test_daily_challenge_history_endpoint():
    """Test GET /api/daily-challenge/history returns list of daily challenges."""
    response = client.get("/api/daily-challenge/history?limit=5")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
