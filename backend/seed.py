"""
Seed script to populate the database with sample problems.
Run with: python seed.py
"""

from database import SessionLocal, engine, Base
from models import Problem, Difficulty

# Ensure tables exist
Base.metadata.create_all(bind=engine)

SEED_PROBLEMS = [
    # ───────────────── EASY ─────────────────
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
            {"input": "1 5 3 7 2\n9", "expected_output": "3 4"},
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
        "title": "Palindrome Check",
        "slug": "palindrome-check",
        "description": """Given a string `s`, determine if it is a palindrome, considering only alphanumeric characters and ignoring case.

Print `true` if it's a palindrome, `false` otherwise.""",
        "difficulty": Difficulty.EASY,
        "topic": "strings",
        "constraints": "1 <= s.length <= 2 * 10^5\ns consists only of printable ASCII characters.",
        "examples": [
            {"input": "A man a plan a canal Panama", "output": "true", "explanation": "After removing non-alphanumeric and lowercasing: 'amanaplanacanalpanama' is a palindrome."},
            {"input": "race a car", "output": "false", "explanation": "'raceacar' is not a palindrome."},
        ],
        "test_cases": [
            {"input": "A man a plan a canal Panama", "expected_output": "true"},
            {"input": "race a car", "expected_output": "false"},
            {"input": " ", "expected_output": "true"},
            {"input": "ab", "expected_output": "false"},
            {"input": "aba", "expected_output": "true"},
        ],
        "starter_code": """# Read the string from stdin
s = input()

# Your solution here
""",
        "time_limit_ms": 1000,
        "memory_limit_kb": 256000,
    },
    {
        "title": "Count Vowels",
        "slug": "count-vowels",
        "description": """Given a string `s`, count the number of vowels (a, e, i, o, u) in it. The count should be case-insensitive.

Print the count as a single integer.""",
        "difficulty": Difficulty.EASY,
        "topic": "strings",
        "constraints": "1 <= s.length <= 10^5\ns consists of printable ASCII characters.",
        "examples": [
            {"input": "Hello World", "output": "3", "explanation": "The vowels are 'e', 'o', 'o' = 3 vowels."},
            {"input": "AEIOU", "output": "5", "explanation": "All characters are vowels."},
        ],
        "test_cases": [
            {"input": "Hello World", "expected_output": "3"},
            {"input": "AEIOU", "expected_output": "5"},
            {"input": "bcdfg", "expected_output": "0"},
            {"input": "a", "expected_output": "1"},
            {"input": "Programming is fun", "expected_output": "5"},
        ],
        "starter_code": """# Read the string from stdin
s = input()

# Your solution here
""",
        "time_limit_ms": 1000,
        "memory_limit_kb": 256000,
    },

    # ───────────────── MEDIUM ─────────────────
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
    {
        "title": "Binary Search",
        "slug": "binary-search",
        "description": """Given a sorted array of integers `nums` and a `target` value, return the index of `target` if it exists in the array. If not, return `-1`.

You must write an algorithm with `O(log n)` runtime complexity.

**Input format**: First line contains space-separated sorted integers. Second line contains the target integer.

Print the index (0-based) or -1.""",
        "difficulty": Difficulty.MEDIUM,
        "topic": "binary-search",
        "constraints": "1 <= nums.length <= 10^4\n-10^4 <= nums[i], target <= 10^4\nAll integers in nums are unique.\nnums is sorted in ascending order.",
        "examples": [
            {"input": "-1 0 3 5 9 12\n9", "output": "4", "explanation": "9 exists in nums and its index is 4."},
            {"input": "-1 0 3 5 9 12\n2", "output": "-1", "explanation": "2 does not exist in nums so return -1."},
        ],
        "test_cases": [
            {"input": "-1 0 3 5 9 12\n9", "expected_output": "4"},
            {"input": "-1 0 3 5 9 12\n2", "expected_output": "-1"},
            {"input": "5\n5", "expected_output": "0"},
            {"input": "1 2 3 4 5 6 7 8 9 10\n10", "expected_output": "9"},
            {"input": "1 2 3 4 5 6 7 8 9 10\n1", "expected_output": "0"},
        ],
        "starter_code": """# Read the sorted array and target
nums = list(map(int, input().split()))
target = int(input())

# Your solution here
""",
        "time_limit_ms": 1000,
        "memory_limit_kb": 256000,
    },
    {
        "title": "Merge Two Sorted Arrays",
        "slug": "merge-sorted-arrays",
        "description": """You are given two sorted integer arrays `nums1` and `nums2`. Merge them into a single sorted array.

Print the merged array as space-separated integers.

**Input format**: First line contains space-separated integers for nums1. Second line contains space-separated integers for nums2.""",
        "difficulty": Difficulty.MEDIUM,
        "topic": "arrays",
        "constraints": "0 <= nums1.length, nums2.length <= 10^4\n-10^4 <= nums1[i], nums2[i] <= 10^4",
        "examples": [
            {"input": "1 3 5\n2 4 6", "output": "1 2 3 4 5 6", "explanation": "Merge [1,3,5] and [2,4,6] into [1,2,3,4,5,6]."},
            {"input": "1\n", "output": "1", "explanation": "Second array is empty, result is [1]."},
        ],
        "test_cases": [
            {"input": "1 3 5\n2 4 6", "expected_output": "1 2 3 4 5 6"},
            {"input": "1\n", "expected_output": "1"},
            {"input": "\n2 4 6", "expected_output": "2 4 6"},
            {"input": "1 2 3\n4 5 6", "expected_output": "1 2 3 4 5 6"},
            {"input": "1 1 1\n1 1 1", "expected_output": "1 1 1 1 1 1"},
        ],
        "starter_code": """# Read both sorted arrays from stdin
line1 = input().strip()
line2 = input().strip()
nums1 = list(map(int, line1.split())) if line1 else []
nums2 = list(map(int, line2.split())) if line2 else []

# Your solution here
""",
        "time_limit_ms": 2000,
        "memory_limit_kb": 256000,
    },
    {
        "title": "Longest Common Prefix",
        "slug": "longest-common-prefix",
        "description": """Write a function to find the longest common prefix string amongst an array of strings.

If there is no common prefix, return an empty string `""`.

**Input format**: First line is an integer `n` (number of strings). Next `n` lines each contain a string.

Print the longest common prefix.""",
        "difficulty": Difficulty.MEDIUM,
        "topic": "strings",
        "constraints": "1 <= strs.length <= 200\n0 <= strs[i].length <= 200\nstrs[i] consists of only lowercase English letters.",
        "examples": [
            {"input": "3\nflower\nflow\nflight", "output": "fl", "explanation": "The longest common prefix is 'fl'."},
            {"input": "3\ndog\nracecar\ncar", "output": "", "explanation": "There is no common prefix."},
        ],
        "test_cases": [
            {"input": "3\nflower\nflow\nflight", "expected_output": "fl"},
            {"input": "3\ndog\nracecar\ncar", "expected_output": ""},
            {"input": "1\nalone", "expected_output": "alone"},
            {"input": "2\naa\naa", "expected_output": "aa"},
            {"input": "3\nab\na\nabc", "expected_output": "a"},
        ],
        "starter_code": """# Read input
n = int(input())
strs = [input() for _ in range(n)]

# Your solution here
""",
        "time_limit_ms": 1000,
        "memory_limit_kb": 256000,
    },

    # ───────────────── HARD ─────────────────
    {
        "title": "Longest Palindromic Substring",
        "slug": "longest-palindromic-substring",
        "description": """Given a string `s`, return the **longest palindromic substring** in `s`.

If there are multiple answers of the same length, return the one that appears first.

Print the longest palindromic substring.""",
        "difficulty": Difficulty.HARD,
        "topic": "dynamic-programming",
        "constraints": "1 <= s.length <= 1000\ns consist of only digits and English letters.",
        "examples": [
            {"input": "babad", "output": "bab", "explanation": "'bab' is a palindromic substring. 'aba' is also valid."},
            {"input": "cbbd", "output": "bb", "explanation": "'bb' is the longest palindromic substring."},
        ],
        "test_cases": [
            {"input": "babad", "expected_output": "bab"},
            {"input": "cbbd", "expected_output": "bb"},
            {"input": "a", "expected_output": "a"},
            {"input": "ac", "expected_output": "a"},
            {"input": "racecar", "expected_output": "racecar"},
        ],
        "starter_code": """# Read the string from stdin
s = input()

# Your solution here
""",
        "time_limit_ms": 3000,
        "memory_limit_kb": 256000,
    },
    {
        "title": "Trapping Rain Water",
        "slug": "trapping-rain-water",
        "description": """Given `n` non-negative integers representing an elevation map where the width of each bar is `1`, compute how much water it can trap after raining.

Print the total amount of trapped water.

**Input format**: Space-separated integers representing heights.""",
        "difficulty": Difficulty.HARD,
        "topic": "arrays",
        "constraints": "n == height.length\n1 <= n <= 2 * 10^4\n0 <= height[i] <= 10^5",
        "examples": [
            {"input": "0 1 0 2 1 0 1 3 2 1 2 1", "output": "6", "explanation": "The elevation map traps 6 units of rain water."},
            {"input": "4 2 0 3 2 5", "output": "9", "explanation": "The elevation map traps 9 units of rain water."},
        ],
        "test_cases": [
            {"input": "0 1 0 2 1 0 1 3 2 1 2 1", "expected_output": "6"},
            {"input": "4 2 0 3 2 5", "expected_output": "9"},
            {"input": "1 2 3 4 5", "expected_output": "0"},
            {"input": "5 4 3 2 1", "expected_output": "0"},
            {"input": "3 0 0 2 0 4", "expected_output": "10"},
        ],
        "starter_code": """# Read the heights from stdin
height = list(map(int, input().split()))

# Your solution here
""",
        "time_limit_ms": 2000,
        "memory_limit_kb": 256000,
    },
    {
        "title": "Merge Intervals",
        "slug": "merge-intervals",
        "description": """Given an array of `intervals` where `intervals[i] = [start_i, end_i]`, merge all overlapping intervals and return an array of the non-overlapping intervals that cover all the intervals in the input.

**Input format**: First line is an integer `n` (number of intervals). Next `n` lines each contain two space-separated integers `start end`.

Print each merged interval on a separate line as `start end`.""",
        "difficulty": Difficulty.HARD,
        "topic": "sorting",
        "constraints": "1 <= intervals.length <= 10^4\nintervals[i].length == 2\n0 <= start_i <= end_i <= 10^4",
        "examples": [
            {"input": "4\n1 3\n2 6\n8 10\n15 18", "output": "1 6\n8 10\n15 18", "explanation": "[1,3] and [2,6] overlap → merged into [1,6]."},
            {"input": "2\n1 4\n4 5", "output": "1 5", "explanation": "[1,4] and [4,5] overlap at 4 → merged into [1,5]."},
        ],
        "test_cases": [
            {"input": "4\n1 3\n2 6\n8 10\n15 18", "expected_output": "1 6\n8 10\n15 18"},
            {"input": "2\n1 4\n4 5", "expected_output": "1 5"},
            {"input": "1\n1 1", "expected_output": "1 1"},
            {"input": "3\n1 4\n0 4\n3 5", "expected_output": "0 5"},
            {"input": "3\n1 2\n3 4\n5 6", "expected_output": "1 2\n3 4\n5 6"},
        ],
        "starter_code": """# Read input
n = int(input())
intervals = []
for _ in range(n):
    s, e = map(int, input().split())
    intervals.append([s, e])

# Your solution here
""",
        "time_limit_ms": 2000,
        "memory_limit_kb": 256000,
    },
    {
        "title": "Climbing Stairs",
        "slug": "climbing-stairs",
        "description": """You are climbing a staircase. It takes `n` steps to reach the top.

Each time you can either climb `1` or `2` steps. In how many distinct ways can you climb to the top?

Print the number of distinct ways.""",
        "difficulty": Difficulty.EASY,
        "topic": "dynamic-programming",
        "constraints": "1 <= n <= 45",
        "examples": [
            {"input": "2", "output": "2", "explanation": "Two ways: (1+1) or (2)."},
            {"input": "3", "output": "3", "explanation": "Three ways: (1+1+1), (1+2), (2+1)."},
        ],
        "test_cases": [
            {"input": "2", "expected_output": "2"},
            {"input": "3", "expected_output": "3"},
            {"input": "1", "expected_output": "1"},
            {"input": "5", "expected_output": "8"},
            {"input": "10", "expected_output": "89"},
        ],
        "starter_code": """# Read n from stdin
n = int(input())

# Your solution here
""",
        "time_limit_ms": 1000,
        "memory_limit_kb": 256000,
    },
    {
        "title": "Container With Most Water",
        "slug": "container-with-most-water",
        "description": """You are given an integer array `height` of length `n`. There are `n` vertical lines drawn such that the two endpoints of the `i-th` line are `(i, 0)` and `(i, height[i])`.

Find two lines that together with the x-axis form a container, such that the container contains the most water.

Return the maximum amount of water a container can store.

**Input format**: Space-separated integers representing heights.

Print the maximum area.""",
        "difficulty": Difficulty.HARD,
        "topic": "two-pointers",
        "constraints": "n == height.length\n2 <= n <= 10^5\n0 <= height[i] <= 10^4",
        "examples": [
            {"input": "1 8 6 2 5 4 8 3 7", "output": "49", "explanation": "Lines at index 1 (height 8) and index 8 (height 7). Area = 7 * (8-1) = 49."},
            {"input": "1 1", "output": "1", "explanation": "Only two lines, area = 1 * 1 = 1."},
        ],
        "test_cases": [
            {"input": "1 8 6 2 5 4 8 3 7", "expected_output": "49"},
            {"input": "1 1", "expected_output": "1"},
            {"input": "4 3 2 1 4", "expected_output": "16"},
            {"input": "1 2 1", "expected_output": "2"},
            {"input": "2 3 4 5 18 17 6", "expected_output": "17"},
        ],
        "starter_code": """# Read the heights from stdin
height = list(map(int, input().split()))

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
            print("To re-seed, delete kamicode.db and run again.")
            return

        for data in SEED_PROBLEMS:
            problem = Problem(**data)
            db.add(problem)

        db.commit()
        print(f"Successfully seeded {len(SEED_PROBLEMS)} problems:")
        for p in SEED_PROBLEMS:
            diff_label = {"easy": "[EASY]  ", "medium": "[MEDIUM]", "hard": "[HARD]  "}.get(p["difficulty"].value, "[?]     ")
            print(f"  {diff_label} {p['title']} [{p['topic']}]")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
