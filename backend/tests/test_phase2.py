"""
Phase 2 Test Suite — Secure Sandboxing, Multi-Language Hardening & Rate Limiting.
"""

import pytest
import asyncio
from fastapi.testclient import TestClient
from unittest.mock import MagicMock

from main import app
from auth import get_required_user
from database import get_convex
from code_runner import (
    run_code_local,
    run_test_case_local,
    validate_source_code,
    _get_isolated_env,
    MAX_OUTPUT_BYTES,
)
from limiter import limiter


# ─── 1. Static Security & Malicious Code Blocking ───────────────────────

@pytest.mark.asyncio
async def test_python_malicious_os_import_blocked():
    """Verify import os is statically blocked."""
    malicious_code = """
import os
files = os.listdir('.')
print(files)
"""
    result = await run_code_local(malicious_code, stdin="", language="python")
    assert result["status"] == "runtime_error"
    assert "Security Violation" in result["stderr"]
    assert "os" in result["stderr"]


@pytest.mark.asyncio
async def test_python_malicious_subprocess_import_blocked():
    """Verify subprocess import is statically blocked."""
    malicious_code = """
from subprocess import Popen
Popen(["whoami"])
"""
    result = await run_code_local(malicious_code, stdin="", language="python")
    assert result["status"] == "runtime_error"
    assert "Security Violation" in result["stderr"]


@pytest.mark.asyncio
async def test_python_dangerous_calls_blocked():
    """Verify open(), eval(), exec(), and __import__() are blocked."""
    for call_snippet in [
        "f = open('secret.txt', 'w')",
        "eval('1 + 1')",
        "exec('x = 2')",
        "__import__('sys')",
    ]:
        is_safe, err = validate_source_code(call_snippet, "python")
        assert not is_safe, f"Expected {call_snippet} to be blocked"
        assert "Security Violation" in err


@pytest.mark.asyncio
async def test_javascript_malicious_operations_blocked():
    """Verify dangerous Node.js modules and process manipulations are blocked."""
    js_attacks = [
        "const fs = require('fs'); fs.readFileSync('/etc/passwd');",
        "process.exit(1);",
        "eval('console.log(1)');",
        "const cp = require('child_process');",
    ]
    for code in js_attacks:
        is_safe, err = validate_source_code(code, "javascript")
        assert not is_safe, f"Expected JS code '{code}' to be blocked"
        assert "Security Violation" in err


@pytest.mark.asyncio
async def test_cpp_malicious_system_calls_blocked():
    """Verify C++ dangerous headers and system calls are blocked."""
    cpp_attacks = [
        "#include <fstream>\nint main() { std::ofstream f(\"test.txt\"); return 0; }",
        "#include <iostream>\nint main() { system(\"whoami\"); return 0; }",
    ]
    for code in cpp_attacks:
        is_safe, err = validate_source_code(code, "cpp")
        assert not is_safe, f"Expected C++ code '{code}' to be blocked"
        assert "Security Violation" in err


@pytest.mark.asyncio
async def test_java_malicious_operations_blocked():
    """Verify Java Runtime and ProcessBuilder attacks are blocked."""
    java_attacks = [
        "public class Main { public static void main(String[] args) { Runtime.getRuntime().exec(\"calc\"); } }",
        "import java.io.File;\npublic class Main { public static void main(String[] args) { new File(\"test\"); } }",
    ]
    for code in java_attacks:
        is_safe, err = validate_source_code(code, "java")
        assert not is_safe, f"Expected Java code '{code}' to be blocked"
        assert "Security Violation" in err


# ─── 2. Isolated Subprocess Environment Verification ───────────────────

def test_isolated_env_strips_sensitive_keys(monkeypatch):
    """Verify platform secrets are stripped from subprocess env."""
    monkeypatch.setenv("CLERK_SECRET_KEY", "sk_test_super_secret")
    monkeypatch.setenv("OPENAI_API_KEY", "sk-proj-super_secret_ai_key")
    monkeypatch.setenv("CONVEX_URL", "https://secret.convex.cloud")

    env = _get_isolated_env("/tmp/sandbox")
    assert "CLERK_SECRET_KEY" not in env
    assert "OPENAI_API_KEY" not in env
    assert "CONVEX_URL" not in env
    assert env["PYTHONNOUSERSITE"] == "1"
    assert env["PYTHONSAFEPATH"] == "1"


# ─── 3. Multi-Language Execution & Limits ──────────────────────────────

@pytest.mark.asyncio
async def test_safe_python_execution():
    """Verify safe Python code runs and computes correct output."""
    safe_code = """
import sys
line = sys.stdin.read().strip() if False else input()
a, b = map(int, line.split())
print(a + b)
"""
    # Note: sys is disallowed in strict mode, so we test standard input/print
    safe_code = """
a, b = map(int, input().split())
print(a + b)
"""
    result = await run_test_case_local(
        source_code=safe_code,
        test_input="15 27",
        expected_output="42",
        language="python",
        timeout_sec=3,
    )
    assert result["passed"] is True
    assert result["actual"] == "42"
    assert result["status"] == "success"


@pytest.mark.asyncio
async def test_infinite_loop_timeout_tle():
    """Verify infinite loop triggers Time Limit Exceeded cleanly."""
    loop_code = """
while True:
    pass
"""
    result = await run_code_local(loop_code, stdin="", language="python", timeout_sec=1)
    assert result["status"] == "tle"
    assert "Time Limit Exceeded" in result["stderr"]


# ─── 4. API Rate Limiting Verification ─────────────────────────────────

@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """Reset the limiter storage before each rate limit test."""
    limiter.reset()
    yield
    limiter.reset()


def test_submissions_rate_limiting():
    """Spamming POST /api/submissions/ returns 429 Too Many Requests."""
    mock_convex = MagicMock()
    mock_convex.query.return_value = {
        "_id": "kd7problem123",
        "title": "Two Sum",
        "testCases": [{"input": "1 2", "expected_output": "3"}],
        "timeLimitMs": 2000,
        "memoryLimitKb": 256000,
    }
    mock_convex.mutation.return_value = "kd7sub123"

    mock_user = {"id": "rate_limit_user", "email": "test@kamicode.com", "role": "user"}

    app.dependency_overrides[get_required_user] = lambda: mock_user
    app.dependency_overrides[get_convex] = lambda: mock_convex

    client = TestClient(app)

    payload = {
        "problem_id": "kd7problem123",
        "language": "python",
        "source_code": "print(3)",
    }

    # Allowed: 10 requests per minute
    status_codes = []
    for _ in range(12):
        resp = client.post("/api/submissions/", json=payload)
        status_codes.append(resp.status_code)

    app.dependency_overrides.clear()

    # Verify at least one 429 status code was received once the threshold is exceeded
    assert 429 in status_codes
    # Verify the initial requests succeeded with 201
    assert status_codes[0] == 201


def test_analysis_rate_limiting():
    """Spamming POST /api/analysis/{submission_id} returns 429 Too Many Requests."""
    mock_convex = MagicMock()
    mock_convex.query.return_value = {
        "_id": "kd7sub123",
        "userId": "rate_limit_user",
        "status": "accepted",
        "problemId": "kd7prob123",
        "sourceCode": "print(42)",
    }
    mock_convex.mutation.return_value = "kd7analysis123"

    mock_user = {"id": "rate_limit_user", "email": "test@kamicode.com", "role": "user"}

    app.dependency_overrides[get_required_user] = lambda: mock_user
    app.dependency_overrides[get_convex] = lambda: mock_convex

    client = TestClient(app)

    # Allowed: 5 requests per minute
    status_codes = []
    for _ in range(7):
        resp = client.post("/api/analysis/kd7sub123")
        status_codes.append(resp.status_code)

    app.dependency_overrides.clear()

    # Verify 429 is returned
    assert 429 in status_codes
