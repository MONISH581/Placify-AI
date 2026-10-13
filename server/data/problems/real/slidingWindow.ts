import { code, type ProblemSpec } from "../../problemHelpers";

/** Deterministic PRNG (mulberry32): returns an integer in [0, bound). */
function seededRandom(seed: number): (bound: number) => number {
  let state = seed >>> 0;
  return (bound: number) => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * bound);
  };
}

function randomInts(seed: number, length: number, bound: number, offset = 0): number[] {
  const next = seededRandom(seed);
  return Array.from({ length }, () => next(bound) + offset);
}

function randomLetters(seed: number, length: number, alphabet: string): string {
  const next = seededRandom(seed);
  return Array.from({ length }, () => alphabet[next(alphabet.length)]).join("");
}

// Naive O(n * k) reference used only to build expected outputs of the long sequence-valued performance cases.
const naiveWindows = (nums: number[], k: number, f: (window: number[]) => number): string => {
  const out: number[] = [];
  for (let i = 0; i + k <= nums.length; i++) out.push(f(nums.slice(i, i + k)));
  return out.join(" ");
};

const MAXAVG_PERF = randomInts(11, 20000, 20001, -10000).join(" ") + "\n137";

const GIVEN_SUM_PERF = (() => {
  const nums = randomInts(12, 50000, 1000, 1);
  return nums.join(" ") + "\n" + 25_000_000;
})();

const VOWELS_PERF = randomLetters(13, 20000, "abcdefghijklmnopqrstuvwxyz") + "\n500";

const DISTINCT_PERF_NUMS = randomInts(14, 5000, 80);
const DISTINCT_PERF = DISTINCT_PERF_NUMS.join(" ") + "\n100";
const DISTINCT_PERF_OUT = naiveWindows(DISTINCT_PERF_NUMS, 100, (w) => new Set(w).size);

const FIRSTNEG_PERF_NUMS = randomInts(15, 5000, 151, -140);
const FIRSTNEG_PERF = FIRSTNEG_PERF_NUMS.join(" ") + "\n100";
const FIRSTNEG_PERF_OUT = naiveWindows(FIRSTNEG_PERF_NUMS, 100, (w) => w.find((x) => x < 0) ?? 0);

// 20000 distinct values, then the value at index 7 is repeated at index 7 + 501 (one step too far for k = 500).
const DUP2_PERF_FALSE = (() => {
  const nums = Array.from({ length: 20000 }, (_, i) => (i * 7919) % 20011);
  nums[508] = nums[7];
  return nums.join(" ") + "\n500";
})();
const DUP2_PERF_TRUE = (() => {
  const nums = Array.from({ length: 20000 }, (_, i) => (i * 7919) % 20011);
  nums[507] = nums[7];
  return nums.join(" ") + "\n500";
})();

// __CONSTS__

export const REAL_SLIDINGWINDOW: ProblemSpec[] = [
  // ------------------------------------------------------------------ Easy
  {
    title: "Maximum Average Subarray I",
    difficulty: "Easy",
    companies: ["Amazon", "Google"],
    description:
      "You are given an integer array `nums` and a window length `k`. Among all contiguous subarrays of exactly `k` elements, find the one whose average is the largest.\n\nTo keep the output exact, print the largest average **rounded down (towards negative infinity) to exactly two decimal places**. For example `12.759` prints as `12.75` and `-0.333` prints as `-0.34`.",
    constraints: "1 <= k <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4",
    inputFormat: "Line 1: space-separated integers `nums`.\nLine 2: the integer `k`.",
    outputFormat: "The maximum average, rounded down to exactly two decimals (for example `5.00` or `-1.50`).",
    examples: [
      {
        input: "1 12 -5 -6 50 3\n4",
        output: "12.75",
        explanation: "The window [12, -5, -6, 50] has sum 51, and 51 / 4 = 12.75.",
      },
      { input: "5\n1", output: "5.00", explanation: "A single window of one element." },
    ],
    testCases: [
      { input: "1 12 -5 -6 50 3\n4", expectedOutput: "12.75", isHidden: false },
      { input: "5\n1", expectedOutput: "5.00", isHidden: false },
      { input: "-1 -2 -3\n2", expectedOutput: "-1.50", isHidden: true },
      { input: "-1 0 0 -1\n3", expectedOutput: "-0.34", isHidden: true },
      { input: "0 0 0\n2", expectedOutput: "0.00", isHidden: true },
      { input: "3 3 4\n3", expectedOutput: "3.33", isHidden: true },
      { input: "10000 -10000 10000\n2", expectedOutput: "0.00", isHidden: true },
      { input: "7 7 7 7\n4", expectedOutput: "7.00", isHidden: true },
      { input: MAXAVG_PERF, expectedOutput: "TBD", isHidden: true },
    ],
    hints: [
      "Comparing averages of equal-length windows is the same as comparing their sums.",
      "When the window slides one step right, the new sum is the old sum plus the entering element minus the leaving element.",
      "Track the best sum in one pass, then convert it once at the end using integer arithmetic: floor(sum * 100 / k) gives the value in hundredths.",
    ],
    editorial:
      "All windows have the same length, so the best average belongs to the window with the largest sum. Compute the first window's sum, then slide: add `nums[i]` and subtract `nums[i-k]`, keeping the maximum. That is O(n) time and O(1) space.\n\nFormatting: take `v = floor(bestSum * 100 / k)` using integer floor division (so negatives round towards negative infinity), then print the sign, `|v| / 100`, a dot, and `|v| % 100` padded to two digits. This avoids floating-point rounding surprises entirely.",
    solutions: {
      javascript: code`
        function solve(input) {
          const lines = input.trim().split("\n");
          const nums = lines[0].trim().split(/\s+/).map(Number);
          const k = parseInt(lines[1], 10);
          let sum = 0;
          for (let i = 0; i < k; i++) sum += nums[i];
          let best = sum;
          for (let i = k; i < nums.length; i++) {
            sum += nums[i] - nums[i - k];
            if (sum > best) best = sum;
          }
          const total = best * 100;
          const rem = ((total % k) + k) % k;
          const v = (total - rem) / k;
          const abs = Math.abs(v);
          return (v < 0 ? "-" : "") + Math.floor(abs / 100) + "." + String(abs % 100).padStart(2, "0");
        }
      `,
      python: code`
        def solve(input_str):
            lines = input_str.strip().split("\n")
            nums = list(map(int, lines[0].split()))
            k = int(lines[1])
            window = sum(nums[:k])
            best = window
            for i in range(k, len(nums)):
                window += nums[i] - nums[i - k]
                best = max(best, window)
            v = (best * 100) // k
            sign = "-" if v < 0 else ""
            v = abs(v)
            return "%s%d.%02d" % (sign, v // 100, v % 100)
      `,
    },
  },
  {
    title: "Subarray with Given Sum",
    difficulty: "Easy",
    companies: ["Amazon", "Flipkart", "Zoho"],
    description:
      "You are given an array of **positive** integers `nums` and a target `S`. Find a contiguous subarray whose elements add up to exactly `S`.\n\nIf several subarrays qualify, report the one that starts earliest (smallest starting position). Positions are **1-based**. If no subarray has sum `S`, report `-1`.",
    constraints: "1 <= nums.length <= 10^5\n1 <= nums[i] <= 10^9\n1 <= S <= 10^14",
    inputFormat: "Line 1: space-separated positive integers `nums`.\nLine 2: the integer `S`.",
    outputFormat: "Two space-separated integers `l r` (1-based, inclusive) of the leftmost matching subarray, or `-1` if none exists.",
    examples: [
      { input: "1 2 3 7 5\n12", output: "2 4", explanation: "2 + 3 + 7 = 12 is the only match, positions 2 to 4." },
      { input: "1 2 3 4\n3", output: "1 2", explanation: "Both [1, 2] and [3] sum to 3; [1, 2] starts earlier." },
    ],
    testCases: [
      { input: "1 2 3 7 5\n12", expectedOutput: "2 4", isHidden: false },
      { input: "1 2 3 4\n3", expectedOutput: "1 2", isHidden: false },
      { input: "5\n5", expectedOutput: "1 1", isHidden: true },
      { input: "5\n6", expectedOutput: "-1", isHidden: true },
      { input: "1 2 3 4 5\n15", expectedOutput: "1 5", isHidden: true },
      { input: "4 1 1 1 2 3 5\n5", expectedOutput: "2 5", isHidden: true },
      { input: "1000000000 1000000000 1000000000\n3000000000", expectedOutput: "1 3", isHidden: true },
      { input: "2 4 6 8\n7", expectedOutput: "-1", isHidden: true },
      { input: GIVEN_SUM_PERF, expectedOutput: "TBD", isHidden: true },
    ],
    hints: [
      "Because every number is positive, adding an element always increases the sum and removing one always decreases it.",
      "Keep a window [l, r]. Extend r each step; while the sum is above S, shrink from the left.",
      "The first time the window sum equals S you have the earliest-ending match, which for positive numbers is also the earliest-starting one. If the loop ends with no match, print -1.",
    ],
    editorial:
      "Positivity makes the window sum monotone in both directions, so a two-pointer window works in O(n): move the right end forward adding elements, and while the sum exceeds `S` advance the left end. The first time the sum equals `S` we stop. Because windows ending earlier also start earlier (for positive values), this is exactly the leftmost-start match. Time O(n), space O(1). This does not work with negative numbers, where you would use prefix sums and a hash map instead.",
    solutions: {
      javascript: code`
        function solve(input) {
          const lines = input.trim().split("\n");
          const nums = lines[0].trim().split(/\s+/).map(Number);
          const target = Number(lines[1]);
          let left = 0;
          let sum = 0;
          for (let right = 0; right < nums.length; right++) {
            sum += nums[right];
            while (sum > target && left <= right) {
              sum -= nums[left++];
            }
            if (sum === target) return (left + 1) + " " + (right + 1);
          }
          return "-1";
        }
      `,
      python: code`
        def solve(input_str):
            lines = input_str.strip().split("\n")
            nums = list(map(int, lines[0].split()))
            target = int(lines[1])
            left = 0
            total = 0
            for right, value in enumerate(nums):
                total += value
                while total > target and left <= right:
                    total -= nums[left]
                    left += 1
                if total == target:
                    return "%d %d" % (left + 1, right + 1)
            return "-1"
      `,
    },
  },
  {
    title: "Maximum Number of Vowels in a Substring of Given Length",
    difficulty: "Easy",
    companies: ["Amazon", "Google"],
    description:
      "Given a lowercase string `s` and an integer `k`, look at every substring of length exactly `k` and count the vowels (`a`, `e`, `i`, `o`, `u`) in it. Return the largest such count.",
    constraints: "1 <= k <= s.length <= 10^5\n`s` consists of lowercase English letters.",
    inputFormat: "Line 1: the string `s`.\nLine 2: the integer `k`.",
    outputFormat: "A single integer: the maximum number of vowels in any substring of length `k`.",
    examples: [
      { input: "abciiidef\n3", output: "3", explanation: "The substring \"iii\" has three vowels." },
      { input: "leetcode\n3", output: "2", explanation: "Substrings such as \"lee\", \"eet\" and \"ode\" contain 2 vowels; no window of 3 has more." },
    ],
    testCases: [
      { input: "abciiidef\n3", expectedOutput: "3", isHidden: false },
      { input: "leetcode\n3", expectedOutput: "2", isHidden: false },
      { input: "aeiou\n2", expectedOutput: "2", isHidden: true },
      { input: "bcdfg\n3", expectedOutput: "0", isHidden: true },
      { input: "a\n1", expectedOutput: "1", isHidden: true },
      { input: "rhythms\n7", expectedOutput: "0", isHidden: true },
      { input: "aeiouaeiou\n10", expectedOutput: "10", isHidden: true },
      { input: "baeiouz\n4", expectedOutput: "4", isHidden: true },
      { input: VOWELS_PERF, expectedOutput: "TBD", isHidden: true },
    ],
    hints: [
      "Recounting vowels in each window from scratch costs O(k) per window.",
      "Maintain the vowel count of the current window: when it slides, check only the character that enters and the one that leaves.",
      "Initialise the count with the first k characters, then update it as you move; record the maximum.",
    ],
    editorial:
      "Fixed-size sliding window. Count vowels in the first `k` characters, then for each next position add 1 if the entering character is a vowel and subtract 1 if the leaving character is a vowel, tracking the maximum. The loop can stop early if the count reaches `k`. Time O(n), space O(1).",
    solutions: {
      javascript: code`
        function solve(input) {
          const lines = input.trim().split("\n");
          const s = lines[0].trim();
          const k = parseInt(lines[1], 10);
          const isVowel = (c) => c === "a" || c === "e" || c === "i" || c === "o" || c === "u";
          let count = 0;
          for (let i = 0; i < k; i++) if (isVowel(s[i])) count++;
          let best = count;
          for (let i = k; i < s.length; i++) {
            if (isVowel(s[i])) count++;
            if (isVowel(s[i - k])) count--;
            if (count > best) best = count;
          }
          return String(best);
        }
      `,
      python: code`
        def solve(input_str):
            lines = input_str.strip().split("\n")
            s = lines[0].strip()
            k = int(lines[1])
            vowels = set("aeiou")
            count = sum(1 for c in s[:k] if c in vowels)
            best = count
            for i in range(k, len(s)):
                if s[i] in vowels:
                    count += 1
                if s[i - k] in vowels:
                    count -= 1
                best = max(best, count)
            return str(best)
      `,
    },
  },
  {
    title: "Count Distinct Elements in Every Window",
    difficulty: "Easy",
    companies: ["Amazon", "Flipkart"],
    description:
      "Given an integer array `nums` and a window size `k`, report how many **distinct** values appear in each contiguous window of length `k`, from the leftmost window to the rightmost.",
    constraints: "1 <= k <= nums.length <= 10^5\n-10^9 <= nums[i] <= 10^9",
    inputFormat: "Line 1: space-separated integers `nums`.\nLine 2: the integer `k`.",
    outputFormat: "`n - k + 1` space-separated integers, the distinct count of each window in left-to-right order.",
    examples: [
      { input: "1 2 1 3 4 2 3\n4", output: "3 4 4 3", explanation: "Windows [1 2 1 3], [2 1 3 4], [1 3 4 2], [3 4 2 3] have 3, 4, 4 and 3 distinct values." },
      { input: "5 5 5\n2", output: "1 1", explanation: "Every window contains only the value 5." },
    ],
    testCases: [
      { input: "1 2 1 3 4 2 3\n4", expectedOutput: "3 4 4 3", isHidden: false },
      { input: "5 5 5\n2", expectedOutput: "1 1", isHidden: false },
      { input: "7\n1", expectedOutput: "1", isHidden: true },
      { input: "1 2 3 4 5\n5", expectedOutput: "5", isHidden: true },
      { input: "1 2 3 4 5\n1", expectedOutput: "1 1 1 1 1", isHidden: true },
      { input: "-1 -1 2 2 -1\n3", expectedOutput: "2 2 2", isHidden: true },
      { input: "1000000000 -1000000000 1000000000 -1000000000\n3", expectedOutput: "2 2", isHidden: true },
      { input: DISTINCT_PERF, expectedOutput: DISTINCT_PERF_OUT, isHidden: true },
    ],
    hints: [
      "Rebuilding a set for every window costs O(k) each, which is too slow for large inputs.",
      "Keep a frequency map for the current window together with the number of keys whose count is above zero.",
      "When an element leaves, decrement its count and delete the key at zero; when one enters, increment it. The map size is the answer for that window.",
    ],
    editorial:
      "Maintain a hash map from value to its frequency in the current window. Adding an element increments its count; removing the outgoing element decrements its count and deletes the key when it reaches zero. After each slide, the number of keys is the distinct count. Time O(n) expected, space O(k).",
    solutions: {
      javascript: code`
        function solve(input) {
          const lines = input.trim().split("\n");
          const nums = lines[0].trim().split(/\s+/).map(Number);
          const k = parseInt(lines[1], 10);
          const freq = new Map();
          const out = [];
          for (let i = 0; i < nums.length; i++) {
            freq.set(nums[i], (freq.get(nums[i]) || 0) + 1);
            if (i >= k) {
              const gone = nums[i - k];
              const c = freq.get(gone) - 1;
              if (c === 0) freq.delete(gone);
              else freq.set(gone, c);
            }
            if (i >= k - 1) out.push(freq.size);
          }
          return out.join(" ");
        }
      `,
      python: code`
        def solve(input_str):
            lines = input_str.strip().split("\n")
            nums = list(map(int, lines[0].split()))
            k = int(lines[1])
            freq = {}
            out = []
            for i, value in enumerate(nums):
                freq[value] = freq.get(value, 0) + 1
                if i >= k:
                    gone = nums[i - k]
                    freq[gone] -= 1
                    if freq[gone] == 0:
                        del freq[gone]
                if i >= k - 1:
                    out.append(len(freq))
            return " ".join(map(str, out))
      `,
    },
  },
  {
    title: "First Negative Integer in Every Window of Size K",
    difficulty: "Easy",
    companies: ["Amazon", "Flipkart", "Microsoft"],
    description:
      "Given an integer array `nums` and a window size `k`, print for every contiguous window of length `k` (left to right) the **first negative number** inside that window. If the window has no negative number, print `0` for it.",
    constraints: "1 <= k <= nums.length <= 10^5\n-10^9 <= nums[i] <= 10^9",
    inputFormat: "Line 1: space-separated integers `nums`.\nLine 2: the integer `k`.",
    outputFormat: "`n - k + 1` space-separated integers, one per window.",
    examples: [
      { input: "12 -1 -7 8 -15 30 16 28\n3", output: "-1 -1 -7 -15 -15 0", explanation: "Window [12 -1 -7] -> -1, [-1 -7 8] -> -1, [-7 8 -15] -> -7, [8 -15 30] -> -15, [-15 30 16] -> -15, [30 16 28] -> 0." },
      { input: "1 2 3\n2", output: "0 0", explanation: "No negatives anywhere." },
    ],
    testCases: [
      { input: "12 -1 -7 8 -15 30 16 28\n3", expectedOutput: "-1 -1 -7 -15 -15 0", isHidden: false },
      { input: "1 2 3\n2", expectedOutput: "0 0", isHidden: false },
      { input: "-5\n1", expectedOutput: "-5", isHidden: true },
      { input: "-1 -2 -3 -4\n2", expectedOutput: "-1 -2 -3", isHidden: true },
      { input: "3 -2 4 5 -1\n4", expectedOutput: "-2 -2", isHidden: true },
      { input: "0 0 -1 0 0\n2", expectedOutput: "0 -1 -1 0", isHidden: true },
      { input: "5 6 7 -8\n4", expectedOutput: "-8", isHidden: true },
      { input: FIRSTNEG_PERF, expectedOutput: FIRSTNEG_PERF_OUT, isHidden: true },
    ],
    hints: [
      "Scanning each window for its first negative is O(k) per window.",
      "Only negative numbers matter. Remember their indices in a queue, in order.",
      "Before answering window ending at i, pop indices from the front of the queue that are less than i - k + 1. The front (if any) is the first negative in the window; otherwise print 0.",
    ],
    editorial:
      "Store the indices of negative numbers in a FIFO queue as we scan. For the window ending at index `i`, drop queue-front indices that have fallen out of the window (`< i - k + 1`). If the queue is non-empty, its front is the first negative in the window; else the answer is 0. Every index is pushed and popped at most once, so time is O(n) and extra space O(n) (or O(k) if indices are removed eagerly).",
    solutions: {
      javascript: code`
        function solve(input) {
          const lines = input.trim().split("\n");
          const nums = lines[0].trim().split(/\s+/).map(Number);
          const k = parseInt(lines[1], 10);
          const queue = [];
          let head = 0;
          const out = [];
          for (let i = 0; i < nums.length; i++) {
            if (nums[i] < 0) queue.push(i);
            if (i >= k - 1) {
              while (head < queue.length && queue[head] < i - k + 1) head++;
              out.push(head < queue.length ? nums[queue[head]] : 0);
            }
          }
          return out.join(" ");
        }
      `,
      python: code`
        from collections import deque

        def solve(input_str):
            lines = input_str.strip().split("\n")
            nums = list(map(int, lines[0].split()))
            k = int(lines[1])
            queue = deque()
            out = []
            for i, value in enumerate(nums):
                if value < 0:
                    queue.append(i)
                if i >= k - 1:
                    while queue and queue[0] < i - k + 1:
                        queue.popleft()
                    out.append(nums[queue[0]] if queue else 0)
            return " ".join(map(str, out))
      `,
    },
  },
  {
    title: "Contains Duplicate II",
    difficulty: "Easy",
    companies: ["Amazon", "Airbnb", "Google"],
    description:
      "Given an integer array `nums` and an integer `k`, decide whether there are two **different** positions `i` and `j` with `nums[i] == nums[j]` and `|i - j| <= k`.\n\nPrint `true` if such a pair exists, otherwise `false`.",
    constraints: "1 <= nums.length <= 10^5\n-10^9 <= nums[i] <= 10^9\n0 <= k <= 10^5",
    inputFormat: "Line 1: space-separated integers `nums`.\nLine 2: the integer `k`.",
    outputFormat: "`true` or `false` (lowercase).",
    examples: [
      { input: "1 2 3 1\n3", output: "true", explanation: "The two 1s are at positions 0 and 3, distance 3 <= 3." },
      { input: "1 2 3 1 2 3\n2", output: "false", explanation: "Equal values are always 3 apart, which exceeds k = 2." },
    ],
    testCases: [
      { input: "1 2 3 1\n3", expectedOutput: "true", isHidden: false },
      { input: "1 2 3 1 2 3\n2", expectedOutput: "false", isHidden: false },
      { input: "1\n5", expectedOutput: "false", isHidden: true },
      { input: "7 7\n0", expectedOutput: "false", isHidden: true },
      { input: "7 7\n1", expectedOutput: "true", isHidden: true },
      { input: "-4 5 -4 6\n2", expectedOutput: "true", isHidden: true },
      { input: "1 0 1 1\n1", expectedOutput: "true", isHidden: true },
      { input: "9 8 7 6 5\n100", expectedOutput: "false", isHidden: true },
      { input: DUP2_PERF_FALSE, expectedOutput: "false", isHidden: true },
      { input: DUP2_PERF_TRUE, expectedOutput: "true", isHidden: true },
    ],
    hints: [
      "Checking every pair within distance k is O(n * k).",
      "Keep a set containing exactly the last k elements you have passed.",
      "For each new element: if it is already in the set, answer true. Otherwise insert it, and when the set grows beyond k elements remove the one that is k steps behind.",
    ],
    editorial:
      "Slide a window of the last `k` elements held in a hash set. For each `nums[i]`, if it is already in the set we have a duplicate within distance `k`; otherwise add it, and if the set exceeds size `k` evict `nums[i-k]`. When `k = 0` the window is empty and the answer is always false. Time O(n), space O(min(n, k)).",
    solutions: {
      javascript: code`
        function solve(input) {
          const lines = input.trim().split("\n");
          const nums = lines[0].trim().split(/\s+/).map(Number);
          const k = parseInt(lines[1], 10);
          const window = new Set();
          for (let i = 0; i < nums.length; i++) {
            if (window.has(nums[i])) return "true";
            window.add(nums[i]);
            if (window.size > k) window.delete(nums[i - k]);
          }
          return "false";
        }
      `,
      python: code`
        def solve(input_str):
            lines = input_str.strip().split("\n")
            nums = list(map(int, lines[0].split()))
            k = int(lines[1])
            window = set()
            for i, value in enumerate(nums):
                if value in window:
                    return "true"
                window.add(value)
                if len(window) > k:
                    window.remove(nums[i - k])
            return "false"
      `,
    },
  },
  // __NEXT__
];
