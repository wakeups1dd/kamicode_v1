"""
JDoodle API client for executing user code.
"""

import httpx
from typing import Optional
from config import settings

JDOODLE_API_URL = "https://api.jdoodle.com/v1/execute"

# Map frontend language names to JDoodle identifiers and default version indices
# Format: "frontend_lang": ("jdoodle_lang", "versionIndex")
LANGUAGE_MAP = {
    "python": ("python3", "4"),
    "javascript": ("nodejs", "4"),
    "cpp": ("cpp", "5"),
    "c": ("c", "5"),
    "java": ("java", "4"),
}

async def execute_code(
    source_code: str,
    stdin: str = "",
    language: str = "python",
) -> dict:
    """
    Submit code to JDoodle for execution.
    """
    if not settings.jdoodle_client_id or not settings.jdoodle_client_secret:
        raise ValueError("JDoodle API credentials are not set in configuration.")

    jdoodle_lang, version_index = LANGUAGE_MAP.get(language, (language, "0"))

    payload = {
        "clientId": settings.jdoodle_client_id,
        "clientSecret": settings.jdoodle_client_secret,
        "script": source_code,
        "language": jdoodle_lang,
        "versionIndex": version_index,
        "stdin": stdin,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(
            JDOODLE_API_URL,
            json=payload,
        )
        response.raise_for_status()
        return response.json()


async def run_test_case_jdoodle(
    source_code: str,
    test_input: str,
    expected_output: str,
    language: str = "python",
) -> dict:
    """
    Run a single test case using JDoodle and compare outputs.
    """
    try:
        res = await execute_code(
            source_code=source_code,
            stdin=test_input,
            language=language,
        )
        
        # JDoodle returns: {"output": "...", "statusCode": 200, "memory": "...", "cpuTime": "...", "error": "..."}
        if "error" in res:
            return {
                "passed": False,
                "input": test_input,
                "expected": expected_output,
                "actual": "",
                "error": res["error"],
                "time": None,
                "memory": None,
                "status_id": 11,
                "status_description": "API Error",
                "token": None,
            }

        actual_output = res.get("output", "").strip()
        expected_clean = expected_output.strip()
        
        # Check if the output contains a clear compilation error indicator (JDoodle puts compilation errors in 'output')
        # However, a statusCode of 200 is generally returned. We have to guess based on output if not explicit.
        # statusCode might not be exactly HTTP status. Sometimes it's their internal status.
        status_code = res.get("statusCode")
        
        # If output matches expected exactly:
        passed = actual_output == expected_clean

        try:
            cpu_time = float(res.get("cpuTime", 0))
        except (ValueError, TypeError):
            cpu_time = 0.0

        try:
            memory_kb = float(res.get("memory", 0))
        except (ValueError, TypeError):
            memory_kb = 0.0

        return {
            "passed": passed,
            "input": test_input,
            "expected": expected_clean,
            "actual": actual_output,
            "error": actual_output if not passed and len(actual_output) > 0 else None,
            "time": cpu_time,
            "memory": memory_kb,
            "status_id": 3 if passed else 4,
            "status_description": "success" if passed else "Wrong Answer",
            "token": None,
        }
    except Exception as e:
        return {
            "passed": False,
            "input": test_input,
            "expected": expected_output,
            "actual": "",
            "error": str(e),
            "time": None,
            "memory": None,
            "status_id": 11,
            "status_description": "Runner Error",
            "token": None,
        }
