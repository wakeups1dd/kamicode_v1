"""
OpenAI-powered code analysis service.

Analyzes accepted submissions for:
- Time and space complexity
- Algorithmic approach identification
- Efficiency and code quality scoring
- Improvement suggestions
"""

import json
import os
from typing import Optional

try:
    from openai import AsyncOpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

# Initialize client — reads OPENAI_API_KEY from environment
_client: Optional["AsyncOpenAI"] = None


def _get_client() -> "AsyncOpenAI":
    global _client
    if not OPENAI_AVAILABLE:
        raise RuntimeError("OpenAI package is not installed. Run: pip install openai")
    if _client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY environment variable is not set")
        _client = AsyncOpenAI(api_key=api_key)
    return _client


ANALYSIS_SYSTEM_PROMPT = """You are an expert code reviewer and algorithm analyst for a competitive programming platform called KamiCode.

Your job is to analyze a user's submitted code solution for a given problem. You must evaluate:

1. **Time Complexity**: The Big-O time complexity of the solution (e.g., O(n), O(n log n), O(n²))
2. **Space Complexity**: The Big-O space complexity (e.g., O(1), O(n))
3. **Approach**: Name the algorithmic technique used (e.g., "Hash Map Lookup", "Two Pointers", "Dynamic Programming - Kadane's Algorithm", "Stack-based Matching")
4. **Approach Explanation**: A brief 1-2 sentence explanation of HOW the solution works
5. **Efficiency Score** (0-100): How efficient is this solution compared to the optimal?
6. **Code Quality Score** (0-100): Readability, style, Pythonic patterns, variable naming
7. **Overall Score** (0-100): Weighted combination of efficiency (60%) and quality (40%)
8. **Strengths**: 2-3 specific things the code does well
9. **Improvements**: 2-3 specific, actionable suggestions to improve the code
10. **Optimized Solution Hint**: A brief hint (NOT the full code) about a more optimal approach if one exists

Respond ONLY with valid JSON matching this exact schema:
{
  "time_complexity": "O(...)",
  "space_complexity": "O(...)",
  "approach": "Name of Approach",
  "approach_explanation": "Brief explanation...",
  "efficiency_score": 85,
  "code_quality_score": 70,
  "overall_score": 79,
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["improvement 1", "improvement 2"],
  "optimized_solution_hint": "Consider using... for better performance"
}

Do NOT include any text outside the JSON object. No markdown, no explanation wrapping."""


async def analyze_code(
    source_code: str,
    problem_title: str,
    problem_description: str,
    language: str = "python",
    runtime_ms: Optional[float] = None,
    memory_kb: Optional[float] = None,
) -> dict:
    """
    Send a code solution to OpenAI for analysis.
    Returns a parsed dict with complexity, approach, scores, and feedback.
    """
    client = _get_client()

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

    response = await client.chat.completions.create(
        model="gpt-4o-mini",  # Cost-effective for analysis
        messages=[
            {"role": "system", "content": ANALYSIS_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.3,
        max_tokens=1000,
        response_format={"type": "json_object"},
    )

    raw_content = response.choices[0].message.content or "{}"

    try:
        analysis = json.loads(raw_content)
    except json.JSONDecodeError:
        analysis = {
            "time_complexity": "Unknown",
            "space_complexity": "Unknown",
            "approach": "Could not analyze",
            "approach_explanation": "AI response was not valid JSON.",
            "efficiency_score": 0,
            "code_quality_score": 0,
            "overall_score": 0,
            "strengths": [],
            "improvements": ["Please try submitting again."],
            "optimized_solution_hint": None,
        }

    analysis["raw_response"] = raw_content
    return analysis


def is_available() -> bool:
    """Check if OpenAI integration is configured and available."""
    return OPENAI_AVAILABLE and bool(os.getenv("OPENAI_API_KEY"))
