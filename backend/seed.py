"""
Seed script to populate the database with sample problems.
Run with: python seed.py
"""

from database import SessionLocal, engine, Base
from models import Problem, Difficulty

# Ensure tables exist
Base.metadata.create_all(bind=engine)

SEED_PROBLEMS = [
    {
        "title": "Two Sum",
        "slug": "two-sum",
        "description": """Given an array of integers `nums` and an integer `target`, return the indices of the two numbers such that they add up to `target`.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.

You can return the answer in any order. Print the two indices separated by a space.""",
        "difficulty": Difficulty.EASY,
        "topic": "arrays",
        "constraints": "2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9",
        "examples": [
            {"input": "2 7 11 15\n9", "output": "0 1", "explanation": "Because nums[0] + nums[1] == 9, we return [0, 1]."},
            {"input": "3 2 4\n6", "output": "1 2", "explanation": "Because nums[1] + nums[2] == 6, we return [1, 2]."},
        ],
        "test_cases": [
            {"input": "2 7 11 15\n9", "expected_output": "0 1"},
            {"input": "3 2 4\n6", "expected_output": "1 2"},
            {"input": "3 3\n6", "expected_output": "0 1"},
            {"input": "1 5 3 7 2\n9", "expected_output": "1 3"},
            {"input": "-1 -2 -3 -4 -5\n-8", "expected_output": "2 4"},
        ],
        "starter_code": """# Read the array and target from stdin
nums = list(map(int, input().split()))
target = int(input())

# Your solution here
""",
        "time_limit_ms": 2000,
        "memory_limit_kb": 256000,
    },
    {
        "title": "Reverse String",
        "slug": "reverse-string",
        "description": """Write a function that reverses a string. The input string is given as a single line.

Print the reversed string.""",
        "difficulty": Difficulty.EASY,
        "topic": "strings",
        "constraints": "1 <= s.length <= 10^5\ns consists of printable ASCII characters.",
        "examples": [
            {"input": "hello", "output": "olleh", "explanation": "The reverse of 'hello' is 'olleh'."},
            {"input": "KamiCode", "output": "edoCimaK", "explanation": "The reverse of 'KamiCode' is 'edoCimaK'."},
        ],
        "test_cases": [
            {"input": "hello", "expected_output": "olleh"},
            {"input": "KamiCode", "expected_output": "edoCimaK"},
            {"input": "a", "expected_output": "a"},
            {"input": "racecar", "expected_output": "racecar"},
            {"input": "12345", "expected_output": "54321"},
        ],
        "starter_code": """# Read the string from stdin
s = input()

# Your solution here
""",
        "time_limit_ms": 1000,
        "memory_limit_kb": 256000,
    },
    {
        "title": "FizzBuzz",
        "slug": "fizzbuzz",
        "description": """Given an integer `n`, print a string for each number from 1 to n:

- `"FizzBuzz"` if the number is divisible by both 3 and 5,
- `"Fizz"` if the number is divisible by 3,
- `"Buzz"` if the number is divisible by 5,
- The number itself otherwise.

Print each result on a new line.""",
        "difficulty": Difficulty.EASY,
        "topic": "logic",
        "constraints": "1 <= n <= 10^4",
        "examples": [
            {"input": "5", "output": "1\n2\nFizz\n4\nBuzz", "explanation": "3 is divisible by 3 (Fizz), 5 is divisible by 5 (Buzz)."},
            {"input": "15", "output": "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz", "explanation": "15 is divisible by both 3 and 5 (FizzBuzz)."},
        ],
        "test_cases": [
            {"input": "5", "expected_output": "1\n2\nFizz\n4\nBuzz"},
            {"input": "15", "expected_output": "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz"},
            {"input": "1", "expected_output": "1"},
            {"input": "3", "expected_output": "1\n2\nFizz"},
        ],
        "starter_code": """# Read n from stdin
n = int(input())

# Your solution here
""",
        "time_limit_ms": 2000,
        "memory_limit_kb": 256000,
    },
    {
        "title": "Valid Parentheses",
        "slug": "valid-parentheses",
        "description": """Given a string `s` containing just the characters `'('`, `')'`, `'{'`, `'}'`, `'['` and `']'`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

Print `true` if valid, `false` otherwise.""",
        "difficulty": Difficulty.MEDIUM,
        "topic": "stacks",
        "constraints": "1 <= s.length <= 10^4\ns consists of parentheses only '()[]{}'.",
        "examples": [
            {"input": "()", "output": "true", "explanation": "Single pair of matching parentheses."},
            {"input": "()[]{}", "output": "true", "explanation": "All brackets are properly matched."},
            {"input": "(]", "output": "false", "explanation": "Mismatched bracket types."},
        ],
        "test_cases": [
            {"input": "()", "expected_output": "true"},
            {"input": "()[]{}", "expected_output": "true"},
            {"input": "(]", "expected_output": "false"},
            {"input": "([)]", "expected_output": "false"},
            {"input": "{[]}", "expected_output": "true"},
            {"input": "", "expected_output": "true"},
            {"input": "((((", "expected_output": "false"},
        ],
        "starter_code": """# Read the string from stdin
s = input()

# Your solution here
""",
        "time_limit_ms": 1000,
        "memory_limit_kb": 256000,
    },
    {
        "title": "Maximum Subarray",
        "slug": "maximum-subarray",
        "description": """Given an integer array `nums`, find the subarray with the largest sum, and return its sum.

A **subarray** is a contiguous non-empty sequence of elements within an array.

Read the array from stdin as space-separated integers. Print the maximum subarray sum.""",
        "difficulty": Difficulty.MEDIUM,
        "topic": "dynamic-programming",
        "constraints": "1 <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4",
        "examples": [
            {"input": "-2 1 -3 4 -1 2 1 -5 4", "output": "6", "explanation": "The subarray [4,-1,2,1] has the largest sum 6."},
            {"input": "1", "output": "1", "explanation": "Single element, so the max subarray sum is 1."},
            {"input": "5 4 -1 7 8", "output": "23", "explanation": "The entire array has the largest sum 23."},
        ],
        "test_cases": [
            {"input": "-2 1 -3 4 -1 2 1 -5 4", "expected_output": "6"},
            {"input": "1", "expected_output": "1"},
            {"input": "5 4 -1 7 8", "expected_output": "23"},
            {"input": "-1", "expected_output": "-1"},
            {"input": "-2 -1", "expected_output": "-1"},
        ],
        "starter_code": """# Read the array from stdin
nums = list(map(int, input().split()))

# Your solution here
""",
        "time_limit_ms": 2000,
        "memory_limit_kb": 256000,
    },
]


def seed():
    db = SessionLocal()
    try:
        existing_count = db.query(Problem).count()
        if existing_count > 0:
            print(f"Database already has {existing_count} problems. Skipping seed.")
            return

        for data in SEED_PROBLEMS:
            problem = Problem(**data)
            db.add(problem)

        db.commit()
        print(f"Successfully seeded {len(SEED_PROBLEMS)} problems.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
