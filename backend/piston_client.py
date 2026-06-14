"""
Piston API client for executing user code in a secure sandbox.
Uses the free public Piston API at https://emkc.org/api/v2/piston
or a self-hosted instance. Configure via config settings.
"""

import httpx
import asyncio
from typing import Optional
from config import settings

# Retrieve Piston URL from settings
PISTON_BASE_URL = settings.piston_base_url

# Map frontend language names to Piston language identifiers
LANGUAGE_MAP = {
    "python": "python",
    "javascript": "javascript",
    "typescript": "typescript",
    "cpp": "c++",
    "c": "c",
    "java": "java",
}

async def execute_code(
    source_code: str,
    stdin: str = "",
    language: str = "python",
) -> dict:
    """
    Submit code to Piston for execution.
    Returns a dict with stdout, stderr, code, compile_output, status.
    """
    piston_lang = LANGUAGE_MAP.get(language, language)
    
    payload = {
        "language": piston_lang,
        "version": "*",  # Use latest available version
        "files": [
            {
                "content": source_code
            }
        ],
        "stdin": stdin,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(
            f"{PISTON_BASE_URL}/execute",
            json=payload,
        )
        response.raise_for_status()
        data = response.json()
        
    return data

async def run_test_case_piston(
    source_code: str,
    test_input: str,
    expected_output: str,
    language: str = "python",
) -> dict:
    """
    Run a single test case using Piston and compare outputs.
    """
    try:
        res = await execute_code(
            source_code=source_code,
            stdin=test_input,
            language=language,
        )
        
        compile_info = res.get("compile", {})
        compile_code = compile_info.get("code", 0)
        compile_stderr = compile_info.get("stderr", "")
        
        run_info = res.get("run", {})
        run_code = run_info.get("code", 0)
        run_stdout = run_info.get("stdout", "")
        run_stderr = run_info.get("stderr", "")
        run_signal = run_info.get("signal")

        actual_output = run_stdout.strip()
        expected_clean = expected_output.strip()
        
        # Determine status
        if compile_code is not None and compile_code != 0:
            status_description = "Compilation Error"
            passed = False
            error_msg = compile_stderr or compile_info.get("output", "Compilation error")
            status_id = 6  # Compilation Error
        elif run_signal is not None:
            status_description = f"Runtime Error (Signal: {run_signal})"
            passed = False
            error_msg = run_stderr or f"Process terminated by signal: {run_signal}"
            status_id = 11  # Runtime Error
        elif run_code is not None and run_code != 0:
            status_description = "Runtime Error"
            passed = False
            error_msg = run_stderr or f"Exit code: {run_code}"
            status_id = 11  # Runtime Error
        else:
            passed = actual_output == expected_clean
            status_description = "success" if passed else "Wrong Answer"
            error_msg = run_stderr if run_stderr else None
            status_id = 3 if passed else 4  # 3=Accepted, 4=Wrong Answer

        return {
            "passed": passed,
            "input": test_input,
            "expected": expected_clean,
            "actual": actual_output,
            "error": error_msg,
            "time": None,
            "memory": None,
            "status_id": status_id,
            "status_description": status_description,
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
