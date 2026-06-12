"""
Local subprocess code runner for KamiCode.

Executes user code (Python) in a subprocess with stdin/stdout capture.
Enforces timeout limits. Designed as a drop-in replacement for Judge0
during local development.

Security note: This runs user code directly on the host machine.
For production, use Docker-based isolation or Judge0.
"""

import subprocess
import tempfile
import os
import asyncio
from typing import Optional

from config import settings


async def run_code_local(
    source_code: str,
    stdin: str = "",
    language: str = "python",
    timeout_sec: Optional[int] = None,
) -> dict:
    """
    Execute code in a local subprocess.

    Returns:
        dict with keys: stdout, stderr, returncode, status, time_ms
    """
    if timeout_sec is None:
        timeout_sec = settings.code_runner_timeout_sec

    if language != "python":
        return {
            "stdout": "",
            "stderr": f"Language '{language}' is not supported in local mode. Only Python is available.",
            "returncode": -1,
            "status": "error",
            "time_ms": 0,
        }

    # Write source code to a temporary file
    tmp_file = None
    try:
        tmp_file = tempfile.NamedTemporaryFile(
            mode="w",
            suffix=".py",
            delete=False,
            prefix="kamicode_",
        )
        tmp_file.write(source_code)
        tmp_file.flush()
        tmp_file.close()

        # Run in subprocess with timeout
        import time
        start_time = time.perf_counter()

        result = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: subprocess.run(
                ["python", tmp_file.name],
                input=stdin,
                capture_output=True,
                text=True,
                timeout=timeout_sec,
            ),
        )

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        if result.returncode == 0:
            status = "success"
        else:
            status = "runtime_error"

        return {
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode,
            "status": status,
            "time_ms": elapsed_ms,
        }

    except subprocess.TimeoutExpired:
        return {
            "stdout": "",
            "stderr": f"Time Limit Exceeded ({timeout_sec}s)",
            "returncode": -1,
            "status": "tle",
            "time_ms": timeout_sec * 1000,
        }
    except Exception as e:
        return {
            "stdout": "",
            "stderr": str(e),
            "returncode": -1,
            "status": "error",
            "time_ms": 0,
        }
    finally:
        if tmp_file and os.path.exists(tmp_file.name):
            try:
                os.unlink(tmp_file.name)
            except OSError:
                pass


async def run_test_case_local(
    source_code: str,
    test_input: str,
    expected_output: str,
    language: str = "python",
    timeout_sec: Optional[int] = None,
) -> dict:
    """
    Run a single test case locally and compare output.

    Returns:
        dict with: passed, input, expected, actual, error, time_ms, status
    """
    result = await run_code_local(
        source_code=source_code,
        stdin=test_input,
        language=language,
        timeout_sec=timeout_sec,
    )

    actual_output = (result["stdout"] or "").strip()
    expected_clean = expected_output.strip()
    passed = actual_output == expected_clean

    return {
        "passed": passed,
        "input": test_input,
        "expected": expected_clean,
        "actual": actual_output,
        "error": result["stderr"] if result["stderr"] else None,
        "time_ms": result.get("time_ms", 0),
        "status": result["status"],
    }
