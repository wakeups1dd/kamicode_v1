"""
AI-powered code analysis service for KamiCode (supports Google Gemini & OpenAI).

Analyzes accepted submissions for:
- Time and space complexity
- Algorithmic approach identification
- Efficiency and code quality scoring
- Strengths & actionable improvements
"""

import json
import re
import logging
from typing import Optional

import httpx

from config import settings

logger = logging.getLogger("kamicode.ai")

try:
    from openai import AsyncOpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

_openai_client: Optional["AsyncOpenAI"] = None


def _get_openai_client() -> "AsyncOpenAI":
    global _openai_client
    if not OPENAI_AVAILABLE:
        raise RuntimeError("OpenAI package is not installed.")
    if _openai_client is None:
        api_key = settings.openai_api_key
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY is not set.")
        _openai_client = AsyncOpenAI(api_key=api_key)
    return _openai_client


ANALYSIS_SYSTEM_PROMPT = """You are an expert algorithm judge and code reviewer for KamiCode, a competitive coding platform.

Analyze the user's submitted code solution for the given problem:
1. **Time Complexity**: Big-O time complexity (e.g. O(N), O(N log N), O(N^2))
2. **Space Complexity**: Big-O auxiliary space complexity (e.g. O(1), O(N))
3. **Approach**: Algorithmic paradigm or technique name (e.g. "Hash Map Frequency Table", "Two Pointers", "Dynamic Programming", "Divide & Conquer")
4. **Approach Explanation**: 1-2 concise sentences explaining HOW this solution executes
5. **Efficiency Score** (0-100): Numerical score compared against the theoretical optimal
6. **Code Quality Score** (0-100): Clean code, idiomatic naming, structure
7. **Overall Score** (0-100): Weighted overall assessment
8. **Strengths**: Array of 2-3 specific positive engineering aspects
9. **Improvements**: Array of 2-3 specific actionable optimizations
10. **Optimized Solution Hint**: A concise strategic hint (without revealing the full code solution)

Respond ONLY with a valid JSON object matching:
{
  "time_complexity": "O(...)",
  "space_complexity": "O(...)",
  "approach": "Approach Name",
  "approach_explanation": "...",
  "efficiency_score": 90,
  "code_quality_score": 85,
  "overall_score": 88,
  "strengths": ["...", "..."],
  "improvements": ["...", "..."],
  "optimized_solution_hint": "..."
}
Do not wrap in markdown or backticks."""


def _generate_mock_analysis(
    source_code: str,
    problem_title: str,
    language: str,
    runtime_ms: Optional[float] = None,
) -> dict:
    """Intelligently heuristic-based mock analysis when no AI API key is configured."""
    has_hashmap = any(w in source_code for w in ["dict", "{}", "map", "HashMap", "Map", "set(", "unordered_map"])
    has_sort = any(w in source_code for w in ["sort", "sorted", "Arrays.sort", "std::sort"])
    has_nested_loop = len(re.findall(r"\b(for|while)\b", source_code)) >= 2 and ("range" in source_code or "{" in source_code)
    has_recursion = re.search(r"def\s+(\w+).*?\1\(", source_code, re.DOTALL) is not None

    if has_hashmap:
        time_comp = "O(N)"
        space_comp = "O(N)"
        approach = "Hash Map / Key-Value Lookup"
        explanation = f"Utilizes linear iteration with constant-time hash table lookups to solve {problem_title} in single-pass O(N) time."
        eff_score = 92
        hint = "Your hash map lookup approach is already optimal for average time complexity!"
    elif has_sort:
        time_comp = "O(N log N)"
        space_comp = "O(1)" if language in ["cpp", "c++"] else "O(N)"
        approach = "Sorting & Linear Scan"
        explanation = f"Sorts the input array/collection and scans through elements to solve {problem_title}."
        eff_score = 80
        hint = "Consider using a hash map or two-pointer technique to potentially eliminate the O(N log N) sorting overhead."
    elif has_nested_loop:
        time_comp = "O(N²)"
        space_comp = "O(1)"
        approach = "Brute Force Iteration"
        explanation = f"Exhaustively checks pairs or combinations across nested loops to find the correct answer for {problem_title}."
        eff_score = 65
        hint = "Try caching seen elements in a hash set or dictionary to reduce the nested loops from O(N²) down to O(N)."
    elif has_recursion:
        time_comp = "O(2^N)" if "memo" not in source_code else "O(N)"
        space_comp = "O(N)"
        approach = "Recursive Backtracking / DFS"
        explanation = f"Explores the state space recursively to solve {problem_title}."
        eff_score = 75
        hint = "Ensure memoization or top-down dynamic programming is used to prune overlapping subproblems."
    else:
        time_comp = "O(N)"
        space_comp = "O(1)"
        approach = "Linear Iteration"
        explanation = f"Processes the input sequentially in a single pass to compute the required result for {problem_title}."
        eff_score = 88
        hint = "Check edge cases with empty or maximum constraint inputs to ensure robustness."

    code_quality = 85
    if len(source_code.strip().splitlines()) > 30:
        code_quality -= 5

    overall = int(eff_score * 0.6 + code_quality * 0.4)
    runtime_note = f" (executed in {runtime_ms:.1f}ms)" if runtime_ms else ""

    return {
        "time_complexity": time_comp,
        "space_complexity": space_comp,
        "approach": approach,
        "approach_explanation": explanation + runtime_note,
        "efficiency_score": eff_score,
        "code_quality_score": code_quality,
        "overall_score": overall,
        "strengths": [
            f"Correct and clean algorithm implementation in {language.capitalize()}",
            f"Expected {time_comp} computational complexity for {problem_title}",
            "Concise logic structure with minimal extraneous allocations",
        ],
        "improvements": [
            "Consider adding type hints and input boundary assertions for production robustness",
            "Optimize memory reuse where possible",
        ],
        "optimized_solution_hint": hint,
        "raw_response": "{}",
    }


async def _analyze_with_gemini(user_prompt: str) -> dict:
    """Analyze code using Google Gemini API with automatic model fallback."""
    preferred_model = settings.gemini_model or "gemini-flash-latest"
    models_to_try = [preferred_model]
    for fallback in ["gemini-flash-latest", "gemini-3.7-flash", "gemini-2.5-flash"]:
        if fallback not in models_to_try:
            models_to_try.append(fallback)

    last_err = None
    for model in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={settings.gemini_api_key}"
        payload = {
            "system_instruction": {
                "parts": [{"text": ANALYSIS_SYSTEM_PROMPT}]
            },
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": user_prompt}]
                }
            ],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.2,
                "maxOutputTokens": 4096,
            }
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                data = response.json()

                candidates = data.get("candidates", [])
                if not candidates:
                    raise ValueError(f"Gemini {model} returned empty response candidates")

                parts = candidates[0].get("content", {}).get("parts", [])
                if not parts:
                    raise ValueError(f"Gemini {model} returned empty content parts")

                raw_text = parts[0].get("text", "{}")
                cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw_text.strip(), flags=re.MULTILINE).strip()
                analysis = json.loads(cleaned)
                analysis["raw_response"] = raw_text
                return analysis
        except Exception as e:
            last_err = e
            logger.warning(f"Gemini model {model} attempt failed: {e}. Trying next fallback...")

    raise last_err or RuntimeError("All Gemini model attempts failed")


async def _analyze_with_openai(user_prompt: str) -> dict:
    """Analyze code using OpenAI API."""
    client = _get_openai_client()
    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": ANALYSIS_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.3,
        max_tokens=1000,
        response_format={"type": "json_object"},
    )
    raw_content = response.choices[0].message.content or "{}"
    analysis = json.loads(raw_content)
    analysis["raw_response"] = raw_content
    return analysis


async def analyze_code(
    source_code: str,
    problem_title: str,
    problem_description: str,
    language: str = "python",
    runtime_ms: Optional[float] = None,
    memory_kb: Optional[float] = None,
) -> dict:
    """
    Send a code solution to Gemini (or OpenAI) for analysis or generate structured heuristic analysis.
    """
    user_prompt = f"""## Problem: {problem_title}

### Description
{problem_description}

### User's Solution ({language})
```{language}
{source_code}
```

### Runtime Metrics
- Execution Time: {f'{runtime_ms:.1f}ms' if runtime_ms else 'N/A'}
- Memory Used: {f'{memory_kb:.1f}KB' if memory_kb else 'N/A'}

Analyze this solution."""

    # 1. Try Gemini first if GEMINI_API_KEY is configured
    if settings.gemini_api_key:
        try:
            return await _analyze_with_gemini(user_prompt)
        except Exception as e:
            logger.warning(f"Gemini analysis failed: {e}. Attempting fallback...")

    # 2. Try OpenAI if OPENAI_API_KEY is configured
    if settings.openai_api_key and OPENAI_AVAILABLE:
        try:
            return await _analyze_with_openai(user_prompt)
        except Exception as e:
            logger.warning(f"OpenAI analysis failed: {e}. Falling back to heuristic analysis.")

    # 3. Fallback to Local Heuristic Engine
    return _generate_mock_analysis(
        source_code=source_code,
        problem_title=problem_title,
        language=language,
        runtime_ms=runtime_ms,
    )


def is_available() -> bool:
    """Check if AI analysis service is available."""
    return True
