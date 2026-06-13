"""
Judge0 API client for executing user code in a secure sandbox.

Uses the free Judge0 CE API at https://judge0-ce.p.rapidapi.com
or a self-hosted instance. Configure via environment variables.
"""

import httpx
import asyncio
import base64
from typing import Optional

from config import settings

# Judge0 CE (Community Edition) via RapidAPI — free tier
JUDGE0_BASE_URL = settings.judge0_base_url
JUDGE0_API_KEY = settings.judge0_api_key
JUDGE0_API_HOST = settings.judge0_api_host

# Language IDs for Judge0
LANGUAGE_IDS = {
    "python": 71,       # Python 3.8.1
    "javascript": 63,   # Node.js 12.14.0
    "cpp": 54,          # C++ (GCC 9.2.0)
    "java": 62,         # Java (OpenJDK 13.0.1)
    "c": 50,            # C (GCC 9.2.0)
}


def _get_headers() -> dict:
    """Build request headers. Supports both RapidAPI and self-hosted Judge0."""
    headers = {"Content-Type": "application/json"}
    if JUDGE0_API_KEY:
        headers["X-RapidAPI-Key"] = JUDGE0_API_KEY
        headers["X-RapidAPI-Host"] = JUDGE0_API_HOST
    return headers


def _encode_base64(text: str) -> str:
    return base64.b64encode(text.encode("utf-8")).decode("utf-8")


def _decode_base64(encoded: Optional[str]) -> Optional[str]:
    if not encoded:
        return None
    try:
        return base64.b64decode(encoded).decode("utf-8")
    except Exception:
        return encoded


async def submit_code(
    source_code: str,
    stdin: str = "",
    language: str = "python",
    time_limit: float = 2.0,
    memory_limit: int = 256000,
) -> str:
    """
    Submit code to Judge0 for execution.
    Returns a submission token to poll for results.
    """
    language_id = LANGUAGE_IDS.get(language, 71)

    payload = {
        "source_code": _encode_base64(source_code),
        "stdin": _encode_base64(stdin),
        "language_id": language_id,
        "cpu_time_limit": time_limit,
        "memory_limit": memory_limit,
        "base64_encoded": True,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{JUDGE0_BASE_URL}/submissions?base64_encoded=true&wait=false",
            json=payload,
            headers=_get_headers(),
        )
        response.raise_for_status()
        data = response.json()
        return data["token"]


async def get_submission_result(token: str) -> dict:
    """
    Poll Judge0 for the result of a submission.
    Returns a dict with status, stdout, stderr, time, and memory.
    """
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
            f"{JUDGE0_BASE_URL}/submissions/{token}?base64_encoded=true&fields=status,stdout,stderr,time,memory,compile_output",
            headers=_get_headers(),
        )
        response.raise_for_status()
        data = response.json()

    return {
        "status_id": data["status"]["id"],
        "status_description": data["status"]["description"],
        "stdout": _decode_base64(data.get("stdout")),
        "stderr": _decode_base64(data.get("stderr")),
        "compile_output": _decode_base64(data.get("compile_output")),
        "time": float(data["time"]) if data.get("time") else None,
        "memory": float(data["memory"]) if data.get("memory") else None,
    }


async def wait_for_result(token: str, max_retries: int = 20, poll_interval: float = 1.0) -> dict:
    """
    Poll Judge0 until the submission finishes.
    Status IDs: 1=In Queue, 2=Processing, 3=Accepted, 4=Wrong Answer, etc.
    """
    for _ in range(max_retries):
        result = await get_submission_result(token)
        # Status 1 = In Queue, 2 = Processing
        if result["status_id"] not in (1, 2):
            return result
        await asyncio.sleep(poll_interval)

    return {"status_id": -1, "status_description": "Timeout waiting for Judge0", "stdout": None, "stderr": None, "time": None, "memory": None, "compile_output": None}


async def run_test_case(
    source_code: str,
    test_input: str,
    expected_output: str,
    language: str = "python",
    time_limit: float = 2.0,
    memory_limit: int = 256000,
) -> dict:
    """
    Run a single test case and compare the output with expected output.
    Returns a dict with pass/fail status and details.
    """
    token = await submit_code(
        source_code=source_code,
        stdin=test_input,
        language=language,
        time_limit=time_limit,
        memory_limit=memory_limit,
    )

    result = await wait_for_result(token)

    actual_output = (result["stdout"] or "").strip()
    expected_clean = expected_output.strip()
    passed = actual_output == expected_clean

    return {
        "passed": passed,
        "input": test_input,
        "expected": expected_clean,
        "actual": actual_output,
        "error": result.get("stderr") or result.get("compile_output"),
        "time": result.get("time"),
        "memory": result.get("memory"),
        "status_id": result["status_id"],
        "status_description": result["status_description"],
        "token": token,
    }
