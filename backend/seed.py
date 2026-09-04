"""
Seed script to populate Convex DB with curated DSA problems across all major topics.
Run with: python seed.py
"""

from enum import Enum

class Difficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"

SEED_PROBLEMS = [
    # ─── 1. ARRAYS ───────────────────────────────────────────────────────
    {
        "title": "Two Sum",
        "slug": "two-sum",
        "description": """Given an array of integers `nums` and an integer `target`, return the 0-based indices of the two numbers such that they add up to `target`.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.

Print the two indices separated by a space in ascending order.""",
        "difficulty": Difficulty.EASY,
        "topic": "arrays",
        "constraints": "2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9",
        "examples": [
            {"input": "2 7 11 15\n9", "output": "0 1", "explanation": "nums[0] + nums[1] = 2 + 7 = 9."},
            {"input": "3 2 4\n6", "output": "1 2", "explanation": "nums[1] + nums[2] = 2 + 4 = 6."},
        ],
        "test_cases": [
            {"input": "2 7 11 15\n9", "expected_output": "0 1"},
            {"input": "3 2 4\n6", "expected_output": "1 2"},
            {"input": "3 3\n6", "expected_output": "0 1"},
            {"input": "1 5 3 7 2\n9", "expected_output": "3 4"},
            {"input": "-1 -2 -3 -4 -5\n-8", "expected_output": "2 4"},
            {"input": "0 4 3 0\n0", "expected_output": "0 3"},
        ],
        "starter_code": """nums = list(map(int, input().split()))
target = int(input())

# Find indices i, j such that nums[i] + nums[j] == target
seen = {}
for i, num in enumerate(nums):
    diff = target - num
    if diff in seen:
        print(f"{seen[diff]} {i}")
        break
    seen[num] = i
""",
        "time_limit_ms": 2000,
        "memory_limit_kb": 256000,
    },
    {
        "title": "Best Time to Buy and Sell Stock",
        "slug": "best-time-to-buy-and-sell-stock",
        "description": """You are given an array `prices` where `prices[i]` is the price of a given stock on the `i-th` day.

You want to maximize your profit by choosing a **single day** to buy one stock and choosing a **different day in the future** to sell that stock.

Print the maximum profit you can achieve from this transaction. If no profit can be achieved, print `0`.""",
        "difficulty": Difficulty.EASY,
        "topic": "arrays",
        "constraints": "1 <= prices.length <= 10^5\n0 <= prices[i] <= 10^4",
        "examples": [
            {"input": "7 1 5 3 6 4", "output": "5", "explanation": "Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6-1 = 5."},
            {"input": "7 6 4 3 1", "output": "0", "explanation": "In this case, no transactions are done and max profit = 0."},
        ],
        "test_cases": [
            {"input": "7 1 5 3 6 4", "expected_output": "5"},
            {"input": "7 6 4 3 1", "expected_output": "0"},
            {"input": "1 2", "expected_output": "1"},
            {"input": "2 4 1", "expected_output": "2"},
            {"input": "3 2 6 5 0 3", "expected_output": "4"},
            {"input": "5", "expected_output": "0"},
        ],
        "starter_code": """prices = list(map(int, input().split()))

min_price = float('inf')
max_profit = 0

for p in prices:
    if p < min_price:
        min_price = p
    elif p - min_price > max_profit:
        max_profit = p - min_price

print(max_profit)
""",
        "time_limit_ms": 2000,
        "memory_limit_kb": 256000,
    },
    {
        "title": "3Sum",
        "slug": "3sum",
        "description": """Given an integer array `nums`, return all the unique triplets `[nums[i], nums[j], nums[k]]` such that `i != j`, `i != k`, and `j != k`, and `nums[i] + nums[j] + nums[k] == 0`.

Print each triplet on a new line with space-separated numbers sorted ascendingly. If no triplets exist, print `None`.""",
        "difficulty": Difficulty.MEDIUM,
        "topic": "arrays",
        "constraints": "3 <= nums.length <= 3000\n-10^5 <= nums[i] <= 10^5",
        "examples": [
            {"input": "-1 0 1 2 -1 -4", "output": "-1 -1 2\n-1 0 1", "explanation": "The distinct triplets are [-1,-1,2] and [-1,0,1]."},
            {"input": "0 1 1", "output": "None", "explanation": "No possible triplet sums to 0."},
        ],
        "test_cases": [
            {"input": "-1 0 1 2 -1 -4", "expected_output": "-1 -1 2\n-1 0 1"},
            {"input": "0 1 1", "expected_output": "None"},
            {"input": "0 0 0", "expected_output": "0 0 0"},
            {"input": "-2 0 1 1 2", "expected_output": "-2 0 2\n-2 1 1"},
        ],
        "starter_code": """nums = list(map(int, input().split()))
nums.sort()
res = []

for i in range(len(nums) - 2):
    if i > 0 and nums[i] == nums[i - 1]:
        continue
    l, r = i + 1, len(nums) - 1
    while l < r:
        s = nums[i] + nums[l] + nums[r]
        if s < 0:
            l += 1
        elif s > 0:
            r -= 1
        else:
            res.append(f"{nums[i]} {nums[l]} {nums[r]}")
            while l < r and nums[l] == nums[l + 1]:
                l += 1
            while l < r and nums[r] == nums[r - 1]:
                r -= 1
            l += 1
            r -= 1

if res:
    print("\\n".join(res))
else:
    print("None")
""",
        "time_limit_ms": 2000,
        "memory_limit_kb": 256000,
    },

    # ─── 2. STRINGS ──────────────────────────────────────────────────────
    {
        "title": "Reverse String",
        "slug": "reverse-string",
        "description": """Write a program that takes a string `s` from stdin and prints the reversed string.""",
        "difficulty": Difficulty.EASY,
        "topic": "strings",
        "constraints": "1 <= s.length <= 10^5\ns consists of printable ASCII characters.",
        "examples": [
            {"input": "hello", "output": "olleh", "explanation": "Reverse of 'hello' is 'olleh'."},
            {"input": "KamiCode", "output": "edoCimaK", "explanation": "Reverse of 'KamiCode' is 'edoCimaK'."},
        ],
        "test_cases": [
            {"input": "hello", "expected_output": "olleh"},
            {"input": "KamiCode", "expected_output": "edoCimaK"},
            {"input": "a", "expected_output": "a"},
            {"input": "racecar", "expected_output": "racecar"},
            {"input": "12345", "expected_output": "54321"},
        ],
        "starter_code": """s = input()
print(s[::-1])
""",
        "time_limit_ms": 1000,
        "memory_limit_kb": 256000,
    },
    {
        "title": "Palindrome Check",
        "slug": "palindrome-check",
        "description": """Given a string `s`, determine if it is a palindrome, considering only alphanumeric characters and ignoring case.

Print `true` if it is a palindrome, `false` otherwise.""",
        "difficulty": Difficulty.EASY,
        "topic": "strings",
        "constraints": "1 <= s.length <= 2 * 10^5",
        "examples": [
            {"input": "A man a plan a canal Panama", "output": "true", "explanation": "Filtered string is 'amanaplanacanalpanama', which is a palindrome."},
            {"input": "race a car", "output": "false", "explanation": "'raceacar' is not a palindrome."},
        ],
        "test_cases": [
            {"input": "A man a plan a canal Panama", "expected_output": "true"},
            {"input": "race a car", "expected_output": "false"},
            {"input": " ", "expected_output": "true"},
            {"input": "ab", "expected_output": "false"},
            {"input": "aba", "expected_output": "true"},
            {"input": "0P", "expected_output": "false"},
        ],
        "starter_code": """s = input()
filtered = "".join(c.lower() for c in s if c.isalnum())
print("true" if filtered == filtered[::-1] else "false")
""",
        "time_limit_ms": 1000,
        "memory_limit_kb": 256000,
    },
    {
        "title": "Longest Common Prefix",
        "slug": "longest-common-prefix",
        "description": """Write a function to find the longest common prefix string amongst an array of strings.

If there is no common prefix, print `""` (empty string).

**Input format**: First line is integer `n`. Next `n` lines contain the strings.""",
        "difficulty": Difficulty.EASY,
        "topic": "strings",
        "constraints": "1 <= strs.length <= 200\n0 <= strs[i].length <= 200",
        "examples": [
            {"input": "3\nflower\nflow\nflight", "output": "fl", "explanation": "Prefix 'fl' is common to all 3 words."},
            {"input": "3\ndog\nracecar\ncar", "output": "", "explanation": "No common prefix."},
        ],
        "test_cases": [
            {"input": "3\nflower\nflow\nflight", "expected_output": "fl"},
            {"input": "3\ndog\nracecar\ncar", "expected_output": ""},
            {"input": "1\nalone", "expected_output": "alone"},
            {"input": "2\naa\naa", "expected_output": "aa"},
            {"input": "3\nab\na\nabc", "expected_output": "a"},
        ],
        "starter_code": """n = int(input())
strs = [input() for _ in range(n)]

if not strs:
    print("")
else:
    prefix = strs[0]
    for s in strs[1:]:
        while not s.startswith(prefix):
            prefix = prefix[:-1]
            if not prefix:
                break
    print(prefix)
""",
        "time_limit_ms": 1000,
        "memory_limit_kb": 256000,
    },

    # ─── 3. TWO POINTERS & SLIDING WINDOW ────────────────────────────────
    {
        "title": "Container With Most Water",
        "slug": "container-with-most-water",
        "description": """You are given an integer array `height` of length `n`. Find two lines that together with the x-axis form a container containing the most water.

Print the maximum area.""",
        "difficulty": Difficulty.MEDIUM,
        "topic": "two-pointers",
        "constraints": "2 <= height.length <= 10^5\n0 <= height[i] <= 10^4",
        "examples": [
            {"input": "1 8 6 2 5 4 8 3 7", "output": "49", "explanation": "Max area = min(8, 7) * (8 - 1) = 49."},
            {"input": "1 1", "output": "1", "explanation": "1 * 1 = 1."},
        ],
        "test_cases": [
            {"input": "1 8 6 2 5 4 8 3 7", "expected_output": "49"},
            {"input": "1 1", "expected_output": "1"},
            {"input": "4 3 2 1 4", "expected_output": "16"},
            {"input": "1 2 1", "expected_output": "2"},
            {"input": "2 3 4 5 18 17 6", "expected_output": "17"},
        ],
        "starter_code": """heights = list(map(int, input().split()))
l, r = 0, len(heights) - 1
max_area = 0

while l < r:
    area = min(heights[l], heights[r]) * (r - l)
    if area > max_area:
        max_area = area
    if heights[l] < heights[r]:
        l += 1
    else:
        r -= 1

print(max_area)
""",
        "time_limit_ms": 2000,
        "memory_limit_kb": 256000,
    },
    {
        "title": "Trapping Rain Water",
        "slug": "trapping-rain-water",
        "description": """Given `n` non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.

Print the total trapped water.""",
        "difficulty": Difficulty.HARD,
        "topic": "two-pointers",
        "constraints": "1 <= height.length <= 2 * 10^4\n0 <= height[i] <= 10^5",
        "examples": [
            {"input": "0 1 0 2 1 0 1 3 2 1 2 1", "output": "6", "explanation": "Traps 6 units of water."},
            {"input": "4 2 0 3 2 5", "output": "9", "explanation": "Traps 9 units of water."},
        ],
        "test_cases": [
            {"input": "0 1 0 2 1 0 1 3 2 1 2 1", "expected_output": "6"},
            {"input": "4 2 0 3 2 5", "expected_output": "9"},
            {"input": "1 2 3 4 5", "expected_output": "0"},
            {"input": "5 4 3 2 1", "expected_output": "0"},
            {"input": "3 0 0 2 0 4", "expected_output": "10"},
        ],
        "starter_code": """height = list(map(int, input().split()))
if not height:
    print(0)
else:
    l, r = 0, len(height) - 1
    left_max, right_max = height[l], height[r]
    ans = 0

    while l < r:
        if left_max < right_max:
            l += 1
            left_max = max(left_max, height[l])
            ans += left_max - height[l]
        else:
            r -= 1
            right_max = max(right_max, height[r])
            ans += right_max - height[r]

    print(ans)
""",
        "time_limit_ms": 2000,
        "memory_limit_kb": 256000,
    },

    # ─── 4. STACKS & QUEUES ──────────────────────────────────────────────
    {
        "title": "Valid Parentheses",
        "slug": "valid-parentheses",
        "description": """Given a string `s` containing `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid.

Print `true` if valid, `false` otherwise.""",
        "difficulty": Difficulty.EASY,
        "topic": "stacks",
        "constraints": "1 <= s.length <= 10^4\ns consists of parentheses only '()[]{}'.",
        "examples": [
            {"input": "()[]{}", "output": "true", "explanation": "All brackets closed properly."},
            {"input": "(]", "output": "false", "explanation": "Bracket types do not match."},
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
        "starter_code": """s = input().strip()
stack = []
mapping = {')': '(', '}': '{', ']': '['}

valid = True
for char in s:
    if char in mapping.values():
        stack.append(char)
    elif char in mapping:
        if not stack or stack.pop() != mapping[char]:
            valid = False
            break

if stack:
    valid = False

print("true" if valid else "false")
""",
        "time_limit_ms": 1000,
        "memory_limit_kb": 256000,
    },

    # ─── 5. BINARY SEARCH ────────────────────────────────────────────────
    {
        "title": "Binary Search",
        "slug": "binary-search",
        "description": """Given a sorted array `nums` and integer `target`, return the index of `target` if found, or `-1` if not found.

**Input format**: First line is space-separated sorted integers. Second line is `target`.""",
        "difficulty": Difficulty.EASY,
        "topic": "binary-search",
        "constraints": "1 <= nums.length <= 10^4\n-10^4 <= nums[i], target <= 10^4",
        "examples": [
            {"input": "-1 0 3 5 9 12\n9", "output": "4", "explanation": "9 exists at index 4."},
            {"input": "-1 0 3 5 9 12\n2", "output": "-1", "explanation": "2 does not exist in nums."},
        ],
        "test_cases": [
            {"input": "-1 0 3 5 9 12\n9", "expected_output": "4"},
            {"input": "-1 0 3 5 9 12\n2", "expected_output": "-1"},
            {"input": "5\n5", "expected_output": "0"},
            {"input": "1 2 3 4 5 6 7 8 9 10\n10", "expected_output": "9"},
            {"input": "1 2 3 4 5 6 7 8 9 10\n1", "expected_output": "0"},
        ],
        "starter_code": """nums = list(map(int, input().split()))
target = int(input())

l, r = 0, len(nums) - 1
ans = -1

while l <= r:
    mid = (l + r) // 2
    if nums[mid] == target:
        ans = mid
        break
    elif nums[mid] < target:
        l = mid + 1
    else:
        r = mid - 1

print(ans)
""",
        "time_limit_ms": 1000,
        "memory_limit_kb": 256000,
    },

    # ─── 6. DYNAMIC PROGRAMMING ──────────────────────────────────────────
    {
        "title": "Climbing Stairs",
        "slug": "climbing-stairs",
        "description": """You are climbing a staircase with `n` steps. Each time you can climb `1` or `2` steps.

Print the total number of distinct ways to reach the top.""",
        "difficulty": Difficulty.EASY,
        "topic": "dynamic-programming",
        "constraints": "1 <= n <= 45",
        "examples": [
            {"input": "2", "output": "2", "explanation": "1+1 or 2."},
            {"input": "3", "output": "3", "explanation": "1+1+1, 1+2, or 2+1."},
        ],
        "test_cases": [
            {"input": "2", "expected_output": "2"},
            {"input": "3", "expected_output": "3"},
            {"input": "1", "expected_output": "1"},
            {"input": "5", "expected_output": "8"},
            {"input": "10", "expected_output": "89"},
            {"input": "20", "expected_output": "10946"},
        ],
        "starter_code": """n = int(input())
if n <= 2:
    print(n)
else:
    a, b = 1, 2
    for _ in range(3, n + 1):
        a, b = b, a + b
    print(b)
""",
        "time_limit_ms": 1000,
        "memory_limit_kb": 256000,
    },
    {
        "title": "Maximum Subarray",
        "slug": "maximum-subarray",
        "description": """Given an integer array `nums`, find the contiguous subarray with the largest sum and print its sum (Kadane's Algorithm).""",
        "difficulty": Difficulty.MEDIUM,
        "topic": "dynamic-programming",
        "constraints": "1 <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4",
        "examples": [
            {"input": "-2 1 -3 4 -1 2 1 -5 4", "output": "6", "explanation": "Subarray [4,-1,2,1] has largest sum 6."},
            {"input": "5 4 -1 7 8", "output": "23", "explanation": "Entire array sums to 23."},
        ],
        "test_cases": [
            {"input": "-2 1 -3 4 -1 2 1 -5 4", "expected_output": "6"},
            {"input": "1", "expected_output": "1"},
            {"input": "5 4 -1 7 8", "expected_output": "23"},
            {"input": "-1", "expected_output": "-1"},
            {"input": "-2 -1", "expected_output": "-1"},
        ],
        "starter_code": """nums = list(map(int, input().split()))
max_so_far = nums[0]
curr_max = nums[0]

for x in nums[1:]:
    curr_max = max(x, curr_max + x)
    max_so_far = max(max_so_far, curr_max)

print(max_so_far)
""",
        "time_limit_ms": 2000,
        "memory_limit_kb": 256000,
    },
    {
        "title": "Coin Change",
        "slug": "coin-change",
        "description": """You are given an integer array `coins` representing coins of different denominations and an integer `amount`.

Print the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, print `-1`.

**Input format**: First line is space-separated coin values. Second line is `amount`.""",
        "difficulty": Difficulty.MEDIUM,
        "topic": "dynamic-programming",
        "constraints": "1 <= coins.length <= 12\n1 <= coins[i] <= 2^31 - 1\n0 <= amount <= 10^4",
        "examples": [
            {"input": "1 2 5\n11", "output": "3", "explanation": "11 = 5 + 5 + 1 (3 coins)."},
            {"input": "2\n3", "output": "-1", "explanation": "Cannot make 3 using only 2s."},
        ],
        "test_cases": [
            {"input": "1 2 5\n11", "expected_output": "3"},
            {"input": "2\n3", "expected_output": "-1"},
            {"input": "1\n0", "expected_output": "0"},
            {"input": "1\n1", "expected_output": "1"},
            {"input": "1 5 10 25\n41", "expected_output": "4"},
        ],
        "starter_code": """coins = list(map(int, input().split()))
amount = int(input())

dp = [float('inf')] * (amount + 1)
dp[0] = 0

for i in range(1, amount + 1):
    for c in coins:
        if i - c >= 0:
            dp[i] = min(dp[i], dp[i - c] + 1)

print(dp[amount] if dp[amount] != float('inf') else -1)
""",
        "time_limit_ms": 2000,
        "memory_limit_kb": 256000,
    },
    {
        "title": "Longest Palindromic Substring",
        "slug": "longest-palindromic-substring",
        "description": """Given a string `s`, print the **longest palindromic substring** in `s`.""",
        "difficulty": Difficulty.MEDIUM,
        "topic": "dynamic-programming",
        "constraints": "1 <= s.length <= 1000",
        "examples": [
            {"input": "babad", "output": "bab", "explanation": "'bab' or 'aba' is a valid longest palindrome."},
            {"input": "cbbd", "output": "bb", "explanation": "'bb' is the longest palindrome."},
        ],
        "test_cases": [
            {"input": "babad", "expected_output": "bab"},
            {"input": "cbbd", "expected_output": "bb"},
            {"input": "a", "expected_output": "a"},
            {"input": "ac", "expected_output": "a"},
            {"input": "racecar", "expected_output": "racecar"},
        ],
        "starter_code": """s = input()
if len(s) < 2:
    print(s)
else:
    def expand(l, r):
        while l >= 0 and r < len(s) and s[l] == s[r]:
            l -= 1
            r += 1
        return s[l+1:r]

    res = ""
    for i in range(len(s)):
        p1 = expand(i, i)
        p2 = expand(i, i + 1)
        if len(p1) > len(res):
            res = p1
        if len(p2) > len(res):
            res = p2

    print(res)
""",
        "time_limit_ms": 2000,
        "memory_limit_kb": 256000,
    },

    # ─── 7. SORTING & INTERVALS ──────────────────────────────────────────
    {
        "title": "Merge Intervals",
        "slug": "merge-intervals",
        "description": """Given an array of `intervals` where `intervals[i] = [start_i, end_i]`, merge all overlapping intervals.

**Input format**: First line is integer `n`. Next `n` lines contain `start end`.""",
        "difficulty": Difficulty.MEDIUM,
        "topic": "sorting",
        "constraints": "1 <= intervals.length <= 10^4",
        "examples": [
            {"input": "4\n1 3\n2 6\n8 10\n15 18", "output": "1 6\n8 10\n15 18", "explanation": "[1,3] and [2,6] overlap -> [1,6]."},
            {"input": "2\n1 4\n4 5", "output": "1 5", "explanation": "[1,4] and [4,5] overlap at 4 -> [1,5]."},
        ],
        "test_cases": [
            {"input": "4\n1 3\n2 6\n8 10\n15 18", "expected_output": "1 6\n8 10\n15 18"},
            {"input": "2\n1 4\n4 5", "expected_output": "1 5"},
            {"input": "1\n1 1", "expected_output": "1 1"},
            {"input": "3\n1 4\n0 4\n3 5", "expected_output": "0 5"},
        ],
        "starter_code": """n = int(input())
intervals = [list(map(int, input().split())) for _ in range(n)]
intervals.sort(key=lambda x: x[0])

merged = []
for interval in intervals:
    if not merged or merged[-1][1] < interval[0]:
        merged.append(interval)
    else:
        merged[-1][1] = max(merged[-1][1], interval[1])

for m in merged:
    print(f"{m[0]} {m[1]}")
""",
        "time_limit_ms": 2000,
        "memory_limit_kb": 256000,
    },
    {
        "title": "Merge Two Sorted Arrays",
        "slug": "merge-sorted-arrays",
        "description": """Merge two sorted integer arrays `nums1` and `nums2` into a single sorted array.""",
        "difficulty": Difficulty.EASY,
        "topic": "arrays",
        "constraints": "0 <= nums1.length, nums2.length <= 10^4",
        "examples": [
            {"input": "1 3 5\n2 4 6", "output": "1 2 3 4 5 6", "explanation": "Merged output is sorted."},
        ],
        "test_cases": [
            {"input": "1 3 5\n2 4 6", "expected_output": "1 2 3 4 5 6"},
            {"input": "1\n", "expected_output": "1"},
            {"input": "\n2 4 6", "expected_output": "2 4 6"},
            {"input": "1 2 3\n4 5 6", "expected_output": "1 2 3 4 5 6"},
        ],
        "starter_code": """line1 = input().strip()
line2 = input().strip()
n1 = list(map(int, line1.split())) if line1 else []
n2 = list(map(int, line2.split())) if line2 else []
res = sorted(n1 + n2)
print(" ".join(map(str, res)))
""",
        "time_limit_ms": 2000,
        "memory_limit_kb": 256000,
    },

    # ─── 8. BACKTRACKING & RECURSION ─────────────────────────────────────
    {
        "title": "Subsets",
        "slug": "subsets",
        "description": """Given an integer array `nums` of unique elements, return all possible subsets (the power set).

Print each subset on a new line with space-separated integers sorted ascendingly. Empty subset is printed as `[]`.""",
        "difficulty": Difficulty.MEDIUM,
        "topic": "backtracking",
        "constraints": "1 <= nums.length <= 10\n-10 <= nums[i] <= 10",
        "examples": [
            {"input": "1 2 3", "output": "[]\n1\n1 2\n1 2 3\n1 3\n2\n2 3\n3", "explanation": "All 8 subsets generated."},
        ],
        "test_cases": [
            {"input": "1 2 3", "expected_output": "[]\\n1\\n1 2\\n1 2 3\\n1 3\\n2\\n2 3\\n3"},
            {"input": "0", "expected_output": "[]\\n0"},
            {"input": "1 2", "expected_output": "[]\\n1\\n1 2\\n2"},
            {"input": "5", "expected_output": "[]\\n5"},
        ],
        "starter_code": """nums = list(map(int, input().split()))
nums.sort()
res = []

def backtrack(start, curr):
    res.append(" ".join(map(str, curr)) if curr else "[]")
    for i in range(start, len(nums)):
        curr.append(nums[i])
        backtrack(i + 1, curr)
        curr.pop()

backtrack(0, [])
print("\\n".join(res))
""",
        "time_limit_ms": 2000,
        "memory_limit_kb": 256000,
    },

    # ─── 9. LOGIC & MISC ─────────────────────────────────────────────────
    {
        "title": "FizzBuzz",
        "slug": "fizzbuzz",
        "description": """Given an integer `n`, print numbers from 1 to n with Fizz, Buzz, or FizzBuzz.""",
        "difficulty": Difficulty.EASY,
        "topic": "logic",
        "constraints": "1 <= n <= 10^4",
        "examples": [
            {"input": "5", "output": "1\n2\nFizz\n4\nBuzz", "explanation": "3 is Fizz, 5 is Buzz."},
        ],
        "test_cases": [
            {"input": "5", "expected_output": "1\n2\nFizz\n4\nBuzz"},
            {"input": "15", "expected_output": "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz"},
            {"input": "1", "expected_output": "1"},
        ],
        "starter_code": """n = int(input())
for i in range(1, n + 1):
    if i % 15 == 0:
        print("FizzBuzz")
    elif i % 3 == 0:
        print("Fizz")
    elif i % 5 == 0:
        print("Buzz")
    else:
        print(i)
""",
        "time_limit_ms": 1000,
        "memory_limit_kb": 256000,
    },
    {
        "title": "Count Vowels",
        "slug": "count-vowels",
        "description": """Given a string `s`, count the total number of vowels (a, e, i, o, u) case-insensitively.""",
        "difficulty": Difficulty.EASY,
        "topic": "strings",
        "constraints": "1 <= s.length <= 10^5",
        "examples": [
            {"input": "Hello World", "output": "3", "explanation": "e, o, o = 3 vowels."},
        ],
        "test_cases": [
            {"input": "Hello World", "expected_output": "3"},
            {"input": "AEIOU", "expected_output": "5"},
            {"input": "bcdfg", "expected_output": "0"},
            {"input": "a", "expected_output": "1"},
        ],
        "starter_code": """s = input().lower()
vowels = set("aeiou")
print(sum(1 for c in s if c in vowels))
""",
        "time_limit_ms": 1000,
        "memory_limit_kb": 256000,
    },
    {
        "title": "Valid Anagram",
        "slug": "valid-anagram",
        "description": """Given two strings `s` and `t`, return `true` if `t` is an anagram of `s`, and `false` otherwise.

**Input format**: First line is `s`. Second line is `t`.""",
        "difficulty": Difficulty.EASY,
        "topic": "strings",
        "constraints": "1 <= s.length, t.length <= 5 * 10^4",
        "examples": [
            {"input": "anagram\nnagaram", "output": "true", "explanation": "Both have the same letters."},
            {"input": "rat\ncar", "output": "false", "explanation": "Different characters."},
        ],
        "test_cases": [
            {"input": "anagram\nnagaram", "expected_output": "true"},
            {"input": "rat\ncar", "expected_output": "false"},
            {"input": "a\na", "expected_output": "true"},
            {"input": "ab\na", "expected_output": "false"},
        ],
        "starter_code": """s = input().strip()
t = input().strip()
print("true" if sorted(s) == sorted(t) else "false")
""",
        "time_limit_ms": 1000,
        "memory_limit_kb": 256000,
    },
    {
        "title": "Search in Rotated Sorted Array",
        "slug": "search-in-rotated-sorted-array",
        "description": """Given an integer array `nums` sorted in ascending order (with distinct values), and rotated at an unknown pivot, find the index of `target` in `O(log n)` time. If not found, print `-1`.

**Input format**: First line is space-separated integers. Second line is `target`.""",
        "difficulty": Difficulty.MEDIUM,
        "topic": "binary-search",
        "constraints": "1 <= nums.length <= 5000\n-10^4 <= nums[i], target <= 10^4",
        "examples": [
            {"input": "4 5 6 7 0 1 2\n0", "output": "4", "explanation": "0 is at index 4."},
            {"input": "4 5 6 7 0 1 2\n3", "output": "-1", "explanation": "3 is not in nums."},
        ],
        "test_cases": [
            {"input": "4 5 6 7 0 1 2\n0", "expected_output": "4"},
            {"input": "4 5 6 7 0 1 2\n3", "expected_output": "-1"},
            {"input": "1\n0", "expected_output": "-1"},
            {"input": "1\n1", "expected_output": "0"},
            {"input": "3 1\n1", "expected_output": "1"},
        ],
        "starter_code": """nums = list(map(int, input().split()))
target = int(input())

l, r = 0, len(nums) - 1
ans = -1

while l <= r:
    mid = (l + r) // 2
    if nums[mid] == target:
        ans = mid
        break
    if nums[l] <= nums[mid]:
        if nums[l] <= target < nums[mid]:
            r = mid - 1
        else:
            l = mid + 1
    else:
        if nums[mid] < target <= nums[r]:
            l = mid + 1
        else:
            r = mid - 1

print(ans)
""",
        "time_limit_ms": 1000,
        "memory_limit_kb": 256000,
    },
    {
        "title": "House Robber",
        "slug": "house-robber",
        "description": """You are a professional robber planning to rob houses along a street. Each house has a certain amount of money stashed. Adjacent houses have security systems connected that will automatically contact the police if two adjacent houses were broken into on the same night.

Print the maximum amount of money you can rob tonight without alerting the police.

**Input format**: Space-separated integers representing money in each house.""",
        "difficulty": Difficulty.MEDIUM,
        "topic": "dynamic-programming",
        "constraints": "1 <= nums.length <= 100\n0 <= nums[i] <= 400",
        "examples": [
            {"input": "1 2 3 1", "output": "4", "explanation": "Rob house 1 (money = 1) and then rob house 3 (money = 3). Total = 4."},
            {"input": "2 7 9 3 1", "output": "12", "explanation": "Rob house 1 (2), house 3 (9), house 5 (1). Total = 12."},
        ],
        "test_cases": [
            {"input": "1 2 3 1", "expected_output": "4"},
            {"input": "2 7 9 3 1", "expected_output": "12"},
            {"input": "0", "expected_output": "0"},
            {"input": "2 1 1 2", "expected_output": "4"},
        ],
        "starter_code": """nums = list(map(int, input().split()))
if not nums:
    print(0)
elif len(nums) == 1:
    print(nums[0])
else:
    prev1, prev2 = max(nums[0], nums[1]), nums[0]
    for i in range(2, len(nums)):
        curr = max(prev1, prev2 + nums[i])
        prev2, prev1 = prev1, curr
    print(prev1)
""",
        "time_limit_ms": 1000,
        "memory_limit_kb": 256000,
    },
    {
        "title": "Number of Islands",
        "slug": "number-of-islands",
        "description": """Given an `m x n` 2D binary grid `grid` which represents a map of `'1'`s (land) and `'0'`s (water), return the number of islands.

An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically.

**Input format**: First line contains integers `m n`. Next `m` lines contain `n` characters (0 or 1).""",
        "difficulty": Difficulty.MEDIUM,
        "topic": "graphs",
        "constraints": "1 <= m, n <= 300\ngrid[i][j] is '0' or '1'.",
        "examples": [
            {"input": "4 5\n11110\n11010\n11000\n00000", "output": "1", "explanation": "All 1s form one big island."},
            {"input": "4 5\n11000\n11000\n00100\n00011", "output": "3", "explanation": "3 separate islands."},
        ],
        "test_cases": [
            {"input": "4 5\n11110\n11010\n11000\n00000", "expected_output": "1"},
            {"input": "4 5\n11000\n11000\n00100\n00011", "expected_output": "3"},
            {"input": "1 1\n1", "expected_output": "1"},
            {"input": "1 1\n0", "expected_output": "0"},
        ],
        "starter_code": """m, n = map(int, input().split())
grid = [list(input().strip()) for _ in range(m)]

count = 0
def dfs(r, c):
    if r < 0 or r >= m or c < 0 or c >= n or grid[r][c] != '1':
        return
    grid[r][c] = '#'
    dfs(r + 1, c)
    dfs(r - 1, c)
    dfs(r, c + 1)
    dfs(r, c - 1)

for r in range(m):
    for c in range(n):
        if grid[r][c] == '1':
            dfs(r, c)
            count += 1

print(count)
""",
        "time_limit_ms": 2000,
        "memory_limit_kb": 256000,
    },
    {
        "title": "Word Break",
        "slug": "word-break",
        "description": """Given a string `s` and a dictionary of strings `wordDict`, return `true` if `s` can be segmented into a space-separated sequence of one or more dictionary words.

**Input format**: First line is `s`. Second line is space-separated dictionary words.""",
        "difficulty": Difficulty.MEDIUM,
        "topic": "dynamic-programming",
        "constraints": "1 <= s.length <= 300\n1 <= wordDict.length <= 1000",
        "examples": [
            {"input": "leetcode\nleet code", "output": "true", "explanation": "'leetcode' can be segmented as 'leet code'."},
            {"input": "catsandog\ncats dog sand and cat", "output": "false", "explanation": "Cannot segment."},
        ],
        "test_cases": [
            {"input": "leetcode\nleet code", "expected_output": "true"},
            {"input": "catsandog\ncats dog sand and cat", "expected_output": "false"},
            {"input": "applepenapple\napple pen", "expected_output": "true"},
            {"input": "cars\ncar ca rs", "expected_output": "true"},
            {"input": "bb\na b bbb bb", "expected_output": "true"},
        ],
        "starter_code": """s = input().strip()
words = set(input().split())

dp = [False] * (len(s) + 1)
dp[0] = True

for i in range(1, len(s) + 1):
    for j in range(i):
        if dp[j] and s[j:i] in words:
            dp[i] = True
            break

print("true" if dp[len(s)] else "false")
""",
        "time_limit_ms": 2000,
        "memory_limit_kb": 256000,
    },
]

SEED_BADGES = [
    {
        "name": "First Blood",
        "description": "Solve your first problem on KamiCode.",
        "icon_name": "Flame",
        "condition_type": "total_solves",
        "condition_value": 1
    },
    {
        "name": "On Fire",
        "description": "Reach a 3-day solve streak.",
        "icon_name": "Zap",
        "condition_type": "streak",
        "condition_value": 3
    },
    {
        "name": "Gladiator",
        "description": "Win your first Arena match.",
        "icon_name": "Swords",
        "condition_type": "arena_wins",
        "condition_value": 1
    },
    {
        "name": "Arena Champion",
        "description": "Win 5 Arena matches.",
        "icon_name": "Trophy",
        "condition_type": "arena_wins",
        "condition_value": 5
    },
    {
        "name": "Code Master",
        "description": "Solve 10 problems total.",
        "icon_name": "Crown",
        "condition_type": "total_solves",
        "condition_value": 10
    }
]


def seed():
    from convex import ConvexClient
    from config import settings
    
    client = ConvexClient(settings.convex_url)
    
    print("Seeding problems...")
    for data in SEED_PROBLEMS:
        try:
            diff = data['difficulty'].value if hasattr(data['difficulty'], 'value') else data['difficulty']

            constraints = data["constraints"]
            if isinstance(constraints, str):
                constraints = [c.strip() for c in constraints.strip().split("\n") if c.strip()]
                
            client.mutation("problems:create", {
                "title": data["title"],
                "slug": data["slug"],
                "description": data["description"],
                "difficulty": diff,
                "topic": data["topic"],
                "constraints": constraints,
                "examples": data["examples"],
                "testCases": data["test_cases"],
                "starterCode": data["starter_code"],
                "timeLimitMs": data["time_limit_ms"],
                "memoryLimitKb": data["memory_limit_kb"],
            })
            print(f"  [+] Created problem: {data['title']}")
        except Exception as e:
            if "already exists" in str(e):
                print(f"  [-] Skipped (already exists): {data['title']}")
            else:
                print(f"  [!] Error creating {data['title']}: {e}")

    print("Seeding badges...")
    for data in SEED_BADGES:
        try:
            client.mutation("badges:createBadge", {
                "name": data["name"],
                "description": data["description"],
                "iconName": data["icon_name"],
                "conditionType": data["condition_type"],
                "conditionValue": data["condition_value"],
            })
            print(f"  [+] Created badge: {data['name']}")
        except Exception as e:
            print(f"  [!] Error creating {data['name']}: {e}")

if __name__ == "__main__":
    seed()
