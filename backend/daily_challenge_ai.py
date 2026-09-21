"""
AI-Powered Daily Challenge Problem Generator & Automated Test Verifier.

Generates unique, novel competitive programming challenges using Google Gemini
(with OpenAI fallback), and executes automated sandbox testing to guarantee
that 100% of test cases pass before publishing.
"""

import json
import re
import random
import logging
import asyncio
from datetime import datetime, timezone
from typing import Optional, Tuple, Dict, Any, List

import httpx

from config import settings
from code_runner import run_test_case_local

logger = logging.getLogger("kamicode.daily_challenge_ai")

TOPICS = [
    "arrays",
    "strings",
    "hash-tables",
    "two-pointers",
    "dynamic-programming",
    "binary-search",
    "sliding-window",
    "greedy",
    "math",
    "trees",
    "graphs",
]

DIFFICULTIES = ["easy", "easy", "medium", "medium", "medium", "hard"]

THEMES = [
    "deep space telemetry and orbital satellites",
    "high-frequency network routing and packet inspection",
    "autonomous robotics and drone fleet coordination",
    "cybersecurity cryptographic key validation",
    "quantum computing state alignment",
    "algorithmic gaming arena leaderboard mechanics",
    "smart grid electrical power load balancing",
    "time-series financial anomaly detection",
]

PROBLEM_GENERATION_PROMPT = """You are a world-class competitive programming problem creator (like a LeetCode Contest or Codeforces coordinator).

Create an original, novel, high-quality competitive programming problem for date {date}.
Topic: {topic}
Difficulty: {difficulty}
Creative Context / Theme: {theme}

Guidelines:
1. Title: Catchy, memorable title (e.g. "Orbital Satellite Synchronization", "Packet Compression Stream", "Quantum Matrix Alignment").
2. Slug: Lowercase kebab-case slug ending with "-{date_compact}" (e.g. "orbital-satellite-synchronization-{date_compact}").
3. Description: Clear, engaging Markdown description with:
   - Brief problem narrative
   - Explicit input format instructions (how data is provided on standard input)
   - Explicit output format instructions (what must be printed to standard output)
4. Constraints: Array of strings (e.g. ["1 <= n <= 10^5", "-10^9 <= a[i] <= 10^9"]).
5. Examples: 2 or 3 examples with "input", "output", and "explanation".
6. Test Cases: 6 to 8 test cases with "input" and "expected_output".
   - Include the examples
   - Include edge cases: minimal bounds (n=1, zeros, negatives), maximum bounds, duplicate values.
7. Starter Code: Clean Python 3 code with comments showing how to read input and a template structure.
8. Reference Solution: A complete, correct, optimal Python 3 solution reading from stdin (`sys.stdin.read` or `input().split()`) and printing to stdout.

IMPORTANT: The reference solution MUST produce the exact output matching every test case!

Respond ONLY with valid raw JSON (no markdown formatting, no backticks):
{{
  "title": "...",
  "slug": "...",
  "difficulty": "{difficulty}",
  "topic": "{topic}",
  "description": "...",
  "constraints": ["...", "..."],
  "examples": [
    {{"input": "...", "output": "...", "explanation": "..."}}
  ],
  "test_cases": [
    {{"input": "...", "expected_output": "..."}}
  ],
  "starter_code": "...",
  "reference_solution": "..."
}}"""


async def _call_gemini_json(prompt: str) -> dict:
    """Call Google Gemini API to generate structured problem JSON."""
    preferred_model = settings.gemini_model or "gemini-3.7-flash"
    models_to_try = [preferred_model]
    for fallback in ["gemini-3.7-flash", "gemini-flash-latest", "gemini-2.5-flash"]:
        if fallback not in models_to_try:
            models_to_try.append(fallback)

    last_err = None
    for model in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={settings.gemini_api_key}"
        payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.7,
                "maxOutputTokens": 4096,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                res = await client.post(url, json=payload)
                res.raise_for_status()
                data = res.json()

                candidates = data.get("candidates", [])
                if not candidates:
                    raise ValueError(f"Gemini {model} returned empty candidates")

                parts = candidates[0].get("content", {}).get("parts", [])
                if not parts:
                    raise ValueError(f"Gemini {model} returned empty content parts")

                raw_text = parts[0].get("text", "{}")
                cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw_text.strip(), flags=re.MULTILINE).strip()
                return json.loads(cleaned)
        except Exception as e:
            last_err = e
            logger.warning(f"Gemini daily challenge model {model} attempt failed: {e}. Trying next fallback...")

    raise last_err or RuntimeError("All Gemini model attempts failed")


async def _call_openai_json(prompt: str) -> dict:
    """Call OpenAI API as secondary fallback."""
    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=settings.openai_api_key)
    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
        max_tokens=3000,
        response_format={"type": "json_object"},
    )
    raw = response.choices[0].message.content or "{}"
    return json.loads(raw)


def _get_curated_fallback_problem(date_str: str, difficulty: str, topic: str) -> dict:
    """Deterministic, guaranteed-valid fallback problem if AI APIs are unavailable."""
    date_compact = date_str.replace("-", "")
    
    # Curated templates that are 100% mathematically and syntactically verified
    variants = [
        {
            "title": "Subarray Balance Index",
            "slug": f"subarray-balance-index-{date_compact}",
            "difficulty": difficulty,
            "topic": "arrays",
            "description": f"""Given an array of integers `nums`, find the leftmost **balance index** `i` such that the sum of elements strictly to the left equals the sum of elements strictly to the right.

If no such index exists, return `-1`. If there are multiple balance indices, return the smallest one.

### Input Format
First line contains space-separated integers representing `nums`.

### Output Format
Print the balance index (0-based integer) or `-1`.""",
            "constraints": ["1 <= nums.length <= 10^5", "-10^4 <= nums[i] <= 10^4"],
            "examples": [
                {"input": "1 7 3 6 5 6", "output": "3", "explanation": "Left sum = nums[0]+nums[1]+nums[2] = 11. Right sum = nums[4]+nums[5] = 11."},
                {"input": "1 2 3", "output": "-1", "explanation": "No balance index exists."},
            ],
            "test_cases": [
                {"input": "1 7 3 6 5 6", "expected_output": "3"},
                {"input": "1 2 3", "expected_output": "-1"},
                {"input": "2 1 -1", "expected_output": "0"},
                {"input": "0", "expected_output": "0"},
                {"input": "-1 -1 -1 -1 -1 0", "expected_output": "2"},
                {"input": "10 20 30", "expected_output": "-1"},
            ],
            "starter_code": """nums = list(map(int, input().split()))

# Find leftmost index where left_sum == right_sum
total_sum = sum(nums)
left_sum = 0
found = -1

for i, num in enumerate(nums):
    if left_sum == total_sum - left_sum - num:
        found = i
        break
    left_sum += num

print(found)
""",
            "reference_solution": """nums = list(map(int, input().split()))
total_sum = sum(nums)
left_sum = 0
ans = -1
for i, num in enumerate(nums):
    if left_sum == total_sum - left_sum - num:
        ans = i
        break
    left_sum += num
print(ans)
""",
        },
        {
            "title": "Lexicographical Peak Compressor",
            "slug": f"lexicographical-peak-compressor-{date_compact}",
            "difficulty": difficulty,
            "topic": "strings",
            "description": f"""Given a string `s` of lowercase English letters, eliminate all adjacent duplicate characters recursively until no adjacent duplicates remain.

Print the final resulting string. If the string becomes empty, print `"EMPTY"`.

### Input Format
A single line containing the string `s`.

### Output Format
Print the reduced string or `"EMPTY"`.""",
            "constraints": ["1 <= s.length <= 10^5", "s contains only lowercase English letters."],
            "examples": [
                {"input": "abbaca", "output": "ca", "explanation": "Removing 'bb' yields 'aaca'. Removing 'aa' yields 'ca'."},
                {"input": "azxxzy", "output": "ay", "explanation": "Removing 'xx' yields 'azzy'. Removing 'zz' yields 'ay'."},
            ],
            "test_cases": [
                {"input": "abbaca", "expected_output": "ca"},
                {"input": "azxxzy", "expected_output": "ay"},
                {"input": "aa", "expected_output": "EMPTY"},
                {"input": "a", "expected_output": "a"},
                {"input": "abcdef", "expected_output": "abcdef"},
                {"input": "baab", "expected_output": "EMPTY"},
            ],
            "starter_code": """s = input().strip()

stack = []
for ch in s:
    if stack and stack[-1] == ch:
        stack.pop()
    else:
        stack.append(ch)

result = "".join(stack)
print(result if result else "EMPTY")
""",
            "reference_solution": """s = input().strip()
stack = []
for ch in s:
    if stack and stack[-1] == ch:
        stack.pop()
    else:
        stack.append(ch)
res = "".join(stack)
print(res if res else "EMPTY")
""",
        },
    ]

    date_hash = sum(ord(c) for c in date_str)
    chosen = dict(variants[date_hash % len(variants)])
    chosen["time_limit_ms"] = 2000
    chosen["memory_limit_kb"] = 256000
    return chosen


async def verify_problem_solution(problem_data: dict) -> Tuple[bool, Optional[str]]:
    """
    Automated Sandbox Verification: Run the AI reference solution against 100% of test cases.
    Returns (True, None) if all test cases pass, or (False, reason) if any test case fails.
    """
    ref_code = problem_data.get("reference_solution") or problem_data.get("starter_code")
    if not ref_code:
        return False, "No reference solution provided"

    test_cases = problem_data.get("test_cases", [])
    if not test_cases:
        return False, "No test cases provided in problem definition"

    for idx, tc in enumerate(test_cases):
        inp = tc.get("input", "")
        expected = tc.get("expected_output", "")
        result = await run_test_case_local(
            source_code=ref_code,
            test_input=inp,
            expected_output=expected,
            language="python",
            timeout_sec=4,
        )

        if not result["passed"]:
            err_msg = (
                f"Test case {idx + 1} failed. Input: '{inp[:50]}...', "
                f"Expected: '{expected[:50]}', Actual: '{result.get('actual', '')[:50]}', "
                f"Error: {result.get('error')}"
            )
            logger.warning(f"Problem verification failed: {err_msg}")
            return False, err_msg

    return True, None


async def generate_and_verify_daily_problem(date_str: str) -> dict:
    """
    Orchestrate AI problem creation with automated verification.
    1. Select randomized topic & difficulty.
    2. Attempt Gemini generation -> verify.
    3. If failed, attempt OpenAI generation -> verify.
    4. If both fail or are unconfigured, return verified curated fallback problem.
    """
    date_compact = date_str.replace("-", "")
    difficulty = random.choice(DIFFICULTIES)
    topic = random.choice(TOPICS)
    theme = random.choice(THEMES)

    prompt = PROBLEM_GENERATION_PROMPT.format(
        date=date_str,
        date_compact=date_compact,
        difficulty=difficulty,
        topic=topic,
        theme=theme,
    )

    # 1. Try Gemini
    if settings.gemini_api_key:
        try:
            logger.info(f"Generating daily challenge for {date_str} via Gemini...")
            gemini_data = await _call_gemini_json(prompt)
            # Ensure slug is unique to date
            if not gemini_data.get("slug", "").endswith(date_compact):
                gemini_data["slug"] = f"{gemini_data.get('slug', 'challenge')}-{date_compact}"
            
            gemini_data["time_limit_ms"] = 2000
            gemini_data["memory_limit_kb"] = 256000
            
            # Verify solution
            passed, err = await verify_problem_solution(gemini_data)
            if passed:
                logger.info(f"Gemini daily challenge '{gemini_data.get('title')}' passed 100% of test cases.")
                gemini_data["generated_by_ai"] = True
                gemini_data["ai_model"] = settings.gemini_model or "gemini-3.7-flash"
                return gemini_data
            else:
                logger.warning(f"Gemini problem failed verification: {err}")
        except Exception as e:
            logger.warning(f"Gemini daily problem generation encountered error: {e}")

    # 2. Try OpenAI fallback
    if settings.openai_api_key:
        try:
            logger.info(f"Generating daily challenge for {date_str} via OpenAI...")
            openai_data = await _call_openai_json(prompt)
            if not openai_data.get("slug", "").endswith(date_compact):
                openai_data["slug"] = f"{openai_data.get('slug', 'challenge')}-{date_compact}"
            
            openai_data["time_limit_ms"] = 2000
            openai_data["memory_limit_kb"] = 256000
            
            passed, err = await verify_problem_solution(openai_data)
            if passed:
                logger.info(f"OpenAI daily challenge '{openai_data.get('title')}' passed 100% of test cases.")
                openai_data["generated_by_ai"] = True
                openai_data["ai_model"] = "gpt-4o-mini"
                return openai_data
            else:
                logger.warning(f"OpenAI problem failed verification: {err}")
        except Exception as e:
            logger.warning(f"OpenAI daily problem generation encountered error: {e}")

    # 3. Deterministic Curated Fallback
    logger.info(f"Using verified curated fallback problem for {date_str}")
    fallback = _get_curated_fallback_problem(date_str, difficulty, topic)
    fallback["generated_by_ai"] = False
    fallback["ai_model"] = "curated-reserve"
    return fallback
