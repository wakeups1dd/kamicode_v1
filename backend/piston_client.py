"""
Piston API client for executing user code in a secure sandbox.
Uses the public Piston API at https://emkc.org/api/v2/piston
or a self-hosted instance with fallback to sandboxed local execution.
"""

import httpx
import asyncio
from typing import Optional
from config import settings
from code_runner import run_test_case_local

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
    timeout_sec: float = 10.0,
) -> dict:
    """
    Submit code to Piston for execution.
    Returns a dict with stdout, stderr, code, compile_output, status.
    """
    piston_lang = LANGUAGE_MAP.get(language.lower(), language.lower())
    
    payload = {
        "language": piston_lang,
        "version": "*",  # Use latest available version
        "files": [
            {
                "content": source_code
            }
        ],
        "stdin": stdin,
        "run_timeout": int(timeout_sec * 1000),
    }

    async with httpx.AsyncClient(timeout=timeout_sec + 5.0) as client:
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
    timeout_sec: Optional[int] = None,
) -> dict:
    """
    Run a single test case using Piston and compare outputs.
    Falls back to sandboxed local execution if Piston API is unreachable.
    """
    effective_timeout = timeout_sec or settings.code_runner_timeout_sec
    try:
        res = await execute_code(
            source_code=source_code,
            stdin=test_input,
            language=language,
            timeout_sec=effective_timeout,
        )
        
        compile_info = res.get("compile", {})
        compile_code = compile_info.get("code", 0)
        compile_stderr = compile_info.get("stderr", "")
        
        run_info = res.get("run", {})
        run_code = run_info.get("code", 0)
        run_stdout = run_info.get("stdout", "")
        run_stderr = run_info.get("stderr", "")
        run_signal = run_info.get("signal")

        actual_output = (run_stdout or "").strip()
        expected_clean = expected_output.strip()
        
        # Determine status
        if compile_code is not None and compile_code != 0:
            status_description = "Compilation Error"
            passed = False
            error_msg = compile_stderr or compile_info.get("output", "Compilation error")
            status_id = 6  # Compilation Error
            status_key = "compilation_error"
        elif run_signal == "SIGKILL" or "Time Limit" in run_stderr:
            status_description = "Time Limit Exceeded"
            passed = False
            error_msg = run_stderr or f"Process timed out after {effective_timeout}s"
            status_id = 5
            status_key = "tle"
        elif run_signal is not None:
            status_description = f"Runtime Error (Signal: {run_signal})"
            passed = False
            error_msg = run_stderr or f"Process terminated by signal: {run_signal}"
            status_id = 11  # Runtime Error
            status_key = "runtime_error"
        elif run_code is not None and run_code != 0:
            status_description = "Runtime Error"
            passed = False
            error_msg = run_stderr or f"Exit code: {run_code}"
            status_id = 11  # Runtime Error
            status_key = "runtime_error"
        else:
            passed = actual_output == expected_clean
            status_description = "Accepted" if passed else "Wrong Answer"
            error_msg = run_stderr if run_stderr else None
            status_id = 3 if passed else 4  # 3=Accepted, 4=Wrong Answer
            status_key = "success" if passed else "wrong_answer"

        return {
            "passed": passed,
            "input": test_input,
            "expected": expected_clean,
            "actual": actual_output,
            "error": error_msg,
            "time_ms": None,
            "status": status_key,
            "status_id": status_id,
            "status_description": status_description,
        }
    except Exception as e:
        # Fallback to local sandbox runner
        return await run_test_case_local(
            source_code=source_code,
            test_input=test_input,
            expected_output=expected_output,
            language=language,
            timeout_sec=effective_timeout,
        )
