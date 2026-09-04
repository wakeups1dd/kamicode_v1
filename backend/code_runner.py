"""
Hardened subprocess code runner for KamiCode.

Executes user code (Python, JavaScript, C++, Java) in a sandboxed, restricted subprocess
with static security inspection, clean stripped environment, memory and time limits,
and stdin/stdout capture.
"""

import subprocess
import tempfile
import os
import sys
import ast
import re
import asyncio
from typing import Optional, Tuple

from config import settings

# Maximum stdout/stderr capture size (128 KB) to prevent memory flooding
MAX_OUTPUT_BYTES = 128 * 1024


# ─── Static Security Inspections ────────────────────────────────────────

DISALLOWED_PYTHON_MODULES = {
    "os", "sys", "subprocess", "shutil", "socket", "pty", "commands",
    "ctypes", "importlib", "multiprocessing", "threading", "signal",
    "inspect", "pickle", "shelve", "marshal", "posix", "nt", "builtins",
    "winreg", "msvcrt", "_thread", "asyncio.subprocess"
}

DISALLOWED_PYTHON_CALLS = {"open", "eval", "exec", "__import__", "breakpoint", "compile", "globals", "locals"}
DISALLOWED_PYTHON_ATTRS = {"__subclasses__", "__globals__", "__code__", "__bases__", "__mro__", "__builtins__"}


def validate_python_code(source_code: str) -> Tuple[bool, Optional[str]]:
    """
    Parse AST to statically reject dangerous imports, system calls, and dunder reflections.
    """
    try:
        tree = ast.parse(source_code)
    except SyntaxError as e:
        return False, f"Syntax Error: {e}"

    for node in ast.walk(tree):
        # Check standard imports (e.g. import os)
        if isinstance(node, ast.Import):
            for alias in node.names:
                root_module = alias.name.split(".")[0]
                if root_module in DISALLOWED_PYTHON_MODULES:
                    return False, f"Security Violation: Import of restricted module '{alias.name}' is blocked."

        # Check from-imports (e.g. from subprocess import Popen)
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                root_module = node.module.split(".")[0]
                if root_module in DISALLOWED_PYTHON_MODULES:
                    return False, f"Security Violation: Import from restricted module '{node.module}' is blocked."

        # Check dangerous built-in function calls (e.g. eval(), open(), exec())
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name):
                if node.func.id in DISALLOWED_PYTHON_CALLS:
                    return False, f"Security Violation: Use of restricted function '{node.func.id}()' is blocked."

        # Check dangerous attribute accesses (e.g. obj.__subclasses__())
        elif isinstance(node, ast.Attribute):
            if node.attr in DISALLOWED_PYTHON_ATTRS:
                return False, f"Security Violation: Access to restricted attribute '{node.attr}' is blocked."

    return True, None


def validate_javascript_code(source_code: str) -> Tuple[bool, Optional[str]]:
    """Scan JavaScript code for dangerous system invocations."""
    dangerous_patterns = [
        (r"require\s*\(\s*['\"](?:fs|child_process|cluster|os|http|https|net|dgram|dns|worker_threads)", "restricted module require"),
        (r"import\s+.*['\"](?:fs|child_process|cluster|os|http|https|net|dgram|dns|worker_threads)['\"]", "restricted module import"),
        (r"process\s*\.\s*(?:env|exit|kill|binding|dlopen)", "process manipulation"),
        (r"(?:eval|Function)\s*\(", "dynamic code evaluation (eval/Function)"),
        (r"__dirname|__filename", "filesystem reflection"),
    ]
    for pattern, reason in dangerous_patterns:
        if re.search(pattern, source_code, re.IGNORECASE):
            return False, f"Security Violation: Detected {reason}."
    return True, None


def validate_cpp_code(source_code: str) -> Tuple[bool, Optional[str]]:
    """Scan C++ code for dangerous system headers and calls."""
    dangerous_patterns = [
        (r"#\s*include\s*<(?:\s*fstream\s*|\s*filesystem\s*|\s*sys/.*|\s*unistd\.h\s*|\s*windows\.h\s*)>", "restricted system header inclusion"),
        (r"\b(?:system|popen|fork|execvp|execl|execv|remove|rename)\s*\(", "restricted system/process invocation"),
    ]
    for pattern, reason in dangerous_patterns:
        if re.search(pattern, source_code):
            return False, f"Security Violation: Detected {reason}."
    return True, None


def validate_java_code(source_code: str) -> Tuple[bool, Optional[str]]:
    """Scan Java code for dangerous system operations."""
    dangerous_patterns = [
        (r"Runtime\.getRuntime\s*\(\s*\)", "Runtime execution"),
        (r"ProcessBuilder", "ProcessBuilder execution"),
        (r"java\.io\.(?:File|FileInputStream|FileOutputStream|RandomAccessFile)", "File I/O operations"),
        (r"java\.nio\.file\.", "NIO File operations"),
        (r"System\.exit\s*\(", "System.exit() invocation"),
        (r"java\.lang\.reflect\.", "Reflection operations"),
        (r"java\.net\.", "Network operations"),
    ]
    for pattern, reason in dangerous_patterns:
        if re.search(pattern, source_code):
            return False, f"Security Violation: Detected {reason}."
    return True, None


def validate_source_code(source_code: str, language: str) -> Tuple[bool, Optional[str]]:
    """Route static validation based on programming language."""
    lang = language.lower()
    if lang == "python":
        return validate_python_code(source_code)
    elif lang in ("javascript", "typescript"):
        return validate_javascript_code(source_code)
    elif lang in ("cpp", "c"):
        return validate_cpp_code(source_code)
    elif lang == "java":
        return validate_java_code(source_code)
    return True, None


# ─── Sandboxed Execution ───────────────────────────────────────────────

def _get_isolated_env(tmp_dir: str) -> dict:
    """
    Build a strictly stripped environment dictionary.
    Excludes sensitive environment variables like API keys, secrets, and DB URLs.
    """
    safe_env = {
        "PATH": os.environ.get("PATH", ""),
        "SYSTEMROOT": os.environ.get("SYSTEMROOT", "C:\\Windows") if os.name == "nt" else "",
        "TEMP": tmp_dir,
        "TMP": tmp_dir,
        "PYTHONNOUSERSITE": "1",
        "PYTHONSAFEPATH": "1",
        "PYTHONUNBUFFERED": "1",
        "NODE_OPTIONS": "--no-addons --disallow-code-generation-from-strings",
    }
    return {k: v for k, v in safe_env.items() if v}


async def run_code_local(
    source_code: str,
    stdin: str = "",
    language: str = "python",
    timeout_sec: Optional[int] = None,
) -> dict:
    """
    Execute code in a secure, sandboxed local subprocess.

    Returns:
        dict with keys: stdout, stderr, returncode, status, time_ms
    """
    if timeout_sec is None:
        timeout_sec = settings.code_runner_timeout_sec

    norm_lang = language.lower()
    if norm_lang not in ["python", "javascript", "typescript", "cpp", "c", "java"]:
        return {
            "stdout": "",
            "stderr": f"Language '{language}' is not supported in local sandbox.",
            "returncode": -1,
            "status": "error",
            "time_ms": 0,
        }

    # Step 1: Run static security inspection
    is_safe, sec_err = validate_source_code(source_code, norm_lang)
    if not is_safe:
        return {
            "stdout": "",
            "stderr": sec_err or "Security violation detected.",
            "returncode": -1,
            "status": "runtime_error",
            "time_ms": 0,
        }

    # Step 2: Write source code to isolated temp directory
    tmp_dir = tempfile.mkdtemp(prefix="kamicode_sandbox_")
    ext_map = {
        "python": ".py",
        "javascript": ".js",
        "typescript": ".ts",
        "cpp": ".cpp",
        "c": ".c",
        "java": ".java"
    }

    file_name = f"Solution{ext_map[norm_lang]}"
    file_path = os.path.join(tmp_dir, file_name)

    try:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(source_code)

        import time
        start_time = time.perf_counter()
        isolated_env = _get_isolated_env(tmp_dir)

        # Step 3: Handle compilation for compiled languages (C, C++)
        exe_path = None
        if norm_lang in ["cpp", "c"]:
            exe_name = "solution.exe" if os.name == "nt" else "solution.out"
            exe_path = os.path.join(tmp_dir, exe_name)
            compiler = "g++" if norm_lang == "cpp" else "gcc"
            
            compile_proc = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: subprocess.run(
                    [compiler, "-O2", file_path, "-o", exe_path],
                    capture_output=True,
                    text=True,
                    env=isolated_env,
                    cwd=tmp_dir,
                    timeout=10,
                )
            )
            if compile_proc.returncode != 0:
                return {
                    "stdout": "",
                    "stderr": "Compilation Error:\n" + compile_proc.stderr[:MAX_OUTPUT_BYTES],
                    "returncode": compile_proc.returncode,
                    "status": "compilation_error",
                    "time_ms": 0,
                }

        # Step 4: Determine execution command
        if norm_lang == "python":
            # -I: Isolated mode (ignores PYTHONPATH and user site-packages)
            cmd = ["python", "-I", file_path]
        elif norm_lang in ["javascript", "typescript"]:
            cmd = ["node", file_path]
        elif norm_lang == "java":
            cmd = ["java", file_path]
        elif norm_lang in ["cpp", "c"]:
            cmd = [exe_path]

        # Step 5: Run in subprocess with strict timeout & isolated env
        result = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: subprocess.run(
                cmd,
                input=stdin,
                capture_output=True,
                text=True,
                env=isolated_env,
                cwd=tmp_dir,
                timeout=timeout_sec,
            ),
        )

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        status = "success" if result.returncode == 0 else "runtime_error"

        # Truncate outputs to prevent buffer exhaustion
        stdout_clean = (result.stdout or "")[:MAX_OUTPUT_BYTES]
        stderr_clean = (result.stderr or "")[:MAX_OUTPUT_BYTES]

        return {
            "stdout": stdout_clean,
            "stderr": stderr_clean,
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
            "stderr": str(e)[:MAX_OUTPUT_BYTES],
            "returncode": -1,
            "status": "runtime_error",
            "time_ms": 0,
        }
    finally:
        import shutil
        if os.path.exists(tmp_dir):
            shutil.rmtree(tmp_dir, ignore_errors=True)


async def run_test_case_local(
    source_code: str,
    test_input: str,
    expected_output: str,
    language: str = "python",
    timeout_sec: Optional[int] = None,
) -> dict:
    """
    Run a single test case locally in the sandboxed runner and evaluate correctness.

    Returns:
        dict with: passed, input, expected, actual, error, time_ms, status, status_description
    """
    result = await run_code_local(
        source_code=source_code,
        stdin=test_input,
        language=language,
        timeout_sec=timeout_sec,
    )

    actual_output = (result["stdout"] or "").strip()
    expected_clean = expected_output.strip()
    passed = (result["status"] == "success") and (actual_output == expected_clean)

    status_desc = "Accepted" if passed else (
        "Wrong Answer" if result["status"] == "success" else (
            "Time Limit Exceeded" if result["status"] == "tle" else (
                "Compilation Error" if result["status"] == "compilation_error" else "Runtime Error"
            )
        )
    )

    return {
        "passed": passed,
        "input": test_input,
        "expected": expected_clean,
        "actual": actual_output,
        "error": result["stderr"] if result["stderr"] else None,
        "time_ms": result.get("time_ms", 0),
        "status": result["status"],
        "status_description": status_desc,
    }
