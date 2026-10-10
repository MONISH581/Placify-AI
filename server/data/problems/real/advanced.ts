/**
 * Advanced mixed interview problems: design questions (operation lines), binary search on the answer,
 * matrix / simulation classics and a few well-known hard problems.
 *
 * Large "performance" inputs are generated with a seeded PRNG so they are identical on every machine; their
 * expected outputs are literals computed by independent brute-force checkers (not by the reference solutions).
 */

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

// ---------------------------------------------------------------------------------------------
// Large generated inputs
// ---------------------------------------------------------------------------------------------

const KTH_MISSING_PERF = (() => {
  const next = seededRandom(11);
  let cur = 0;
  const arr: number[] = [];
  for (let i = 0; i < 50000; i++) {
    cur += 1 + next(4);
    arr.push(cur);
  }
  return arr.join(" ") + "\n120000";
})();

const MOUNTAIN_PERF = (() => {
  const next = seededRandom(12);
  const up: number[] = [];
  let cur = -50000;
  for (let i = 0; i < 73422; i++) {
    cur += 1 + next(3);
    up.push(cur);
  }
  const down: number[] = [];
  cur = up[up.length - 1];
  for (let i = 0; i < 26578; i++) {
    cur -= 1 + next(3);
    down.push(cur);
  }
  return [...up, ...down].join(" ");
})();

const FIRST_BAD_PERF = Array.from({ length: 100000 }, (_, i) => (i >= 67889 ? 1 : 0)).join(" ");

const LETTER_PERF = (() => {
  const next = seededRandom(14);
  const letters = Array.from({ length: 10000 }, () => String.fromCharCode(97 + next(24))).sort().join("");
  return letters + "\nm";
})();

const LOGGER_PERF = (() => {
  const next = seededRandom(15);
  const lines: string[] = [];
  let ts = 0;
  for (let i = 0; i < 20000; i++) {
    ts += next(3);
    lines.push(ts + " m" + next(60));
  }
  return lines.join("\n");
})();

const INSERT_POS_PERF = (() => {
  const next = seededRandom(16);
  let cur = -200000;
  const arr: number[] = [];
  for (let i = 0; i < 100000; i++) {
    cur += 1 + next(4);
    arr.push(cur);
  }
  return arr.join(" ") + "\n" + (arr[61234] - 1);
})();

const HIT_COUNTER_PERF = (() => {
  const next = seededRandom(21);
  const lines: string[] = [];
  let ts = 1;
  for (let i = 0; i < 30000; i++) {
    ts += next(15);
    lines.push((next(3) === 0 ? "count " : "hit ") + ts);
  }
  lines.push("count " + ts);
  return lines.join("\n");
})();

const RANDOM_SET_PERF = (() => {
  const next = seededRandom(22);
  const present = new Set<number>();
  const lines: string[] = [];
  for (let i = 0; i < 30000; i++) {
    const r = next(10);
    if (r < 4 || present.size === 0) {
      const v = next(600) - 300;
      present.add(v);
      lines.push("insert " + v);
    } else if (r < 7) {
      const v = next(600) - 300;
      present.delete(v);
      lines.push("remove " + v);
    } else {
      lines.push("pick " + next(present.size));
    }
  }
  return lines.join("\n");
})();

const SET_ZEROES_PERF = (() => {
  const next = seededRandom(23);
  const m = 150;
  const n = 180;
  const rows: string[] = [m + " " + n];
  for (let i = 0; i < m; i++) {
    const row: number[] = [];
    for (let j = 0; j < n; j++) {
      if (next(1500) === 0) row.push(0);
      else {
        let v = next(18) - 9;
        if (v >= 0) v++;
        row.push(v);
      }
    }
    rows.push(row.join(" "));
  }
  return rows.join("\n");
})();

const ROTATED_PERF = (() => {
  const next = seededRandom(24);
  const sorted: number[] = [];
  let cur = -100000;
  for (let i = 0; i < 100000; i++) {
    cur += 1 + next(5);
    sorted.push(cur);
  }
  const rotated = [...sorted.slice(37311), ...sorted.slice(0, 37311)];
  return rotated.join(" ") + "\n" + sorted[9];
})();

const PEAK_PERF = (() => {
  const next = seededRandom(25);
  const arr: number[] = [];
  for (let i = 0; i < 100000; i++) {
    let v = next(1000000);
    if (i > 0 && v === arr[i - 1]) v++;
    arr.push(v);
  }
  return arr.join(" ");
})();

const PEAK_PERF_SORTED = Array.from({ length: 100000 }, (_, i) => i * 3 - 1000).join(" ");

const SHIP_PERF = (() => {
  const next = seededRandom(26);
  const w = Array.from({ length: 1500 }, () => 1 + next(50));
  return w.join(" ") + "\n5";
})();
const SHIP_PERF_ONES = Array(50000).fill(1).join(" ") + "\n7";

// @@PERF@@

export const REAL_ADVANCED: ProblemSpec[] = [
  // ----------------------------------------------------------------------------------------- Easy
  {
    title: "Integer Square Root",
    difficulty: "Easy",
    companies: ["Amazon", "Apple", "Microsoft", "Bloomberg"],
    description:
      "Given a non-negative integer `x`, print the integer part of its square root, that is the largest integer `r` with `r * r <= x`.\n\nBuilt-in power or square-root functions are not the point of the exercise: solve it with a binary search over the possible answers.",
    constraints: "0 <= x <= 2^31 - 1",
    inputFormat: "A single integer `x`.",
    outputFormat: "A single integer: floor(sqrt(x)).",
    examples: [
      { input: "4", output: "2", explanation: "2 * 2 = 4." },
      { input: "8", output: "2", explanation: "sqrt(8) = 2.828..., the decimal part is dropped." },
    ],
    testCases: [
      { input: "4", expectedOutput: "2", isHidden: false },
      { input: "8", expectedOutput: "2", isHidden: false },
      { input: "0", expectedOutput: "0", isHidden: true },
      { input: "1", expectedOutput: "1", isHidden: true },
      { input: "15", expectedOutput: "3", isHidden: true },
      { input: "2147395599", expectedOutput: "46339", isHidden: true },
      { input: "2147395600", expectedOutput: "46340", isHidden: true },
      { input: "2147483647", expectedOutput: "46340", isHidden: true },
    ],
    hints: [
      "The answer lies between 0 and x, and r * r grows with r.",
      "Because r * r is monotonic, you can binary search for the largest r whose square does not exceed x.",
      "Cap the upper bound (for example at 46341) or compare with division so that mid * mid cannot overflow in fixed-width languages.",
    ],
    editorial:
      "The predicate 'r * r <= x' is true for small r and false for large r, so binary search for the last r where it holds. Use the upper-middle element when moving `lo = mid` to guarantee progress. Time O(log x), space O(1).",
    solutions: {
      javascript: code`
        function solve(input) {
          const x = Number(input.trim());
          let lo = 0;
          let hi = Math.min(x, 46341);
          while (lo < hi) {
            const mid = Math.floor((lo + hi + 1) / 2);
            if (mid * mid <= x) lo = mid;
            else hi = mid - 1;
          }
          return String(lo);
        }
      `,
      python: code`
        def solve(input_str):
            x = int(input_str.strip())
            lo, hi = 0, min(x, 46341)
            while lo < hi:
                mid = (lo + hi + 1) // 2
                if mid * mid <= x:
                    lo = mid
                else:
                    hi = mid - 1
            return str(lo)
      `,
    },
  },
  {
    title: "Kth Missing Positive Number",
    difficulty: "Easy",
    companies: ["Google", "Meta", "Amazon"],
    description:
      "You are given a strictly increasing array `arr` of positive integers and an integer `k`. Positive integers that do not appear in `arr` are called *missing*.\n\nPrint the `k`-th missing positive integer (counting from 1).",
    constraints: "1 <= arr.length <= 10^5\n1 <= arr[i] <= 10^9, arr is strictly increasing\n1 <= k <= 10^9",
    inputFormat: "Line 1: space-separated integers `arr`.\nLine 2: the integer `k`.",
    outputFormat: "A single integer: the k-th missing positive number.",
    examples: [
      { input: "2 3 4 7 11\n5", output: "9", explanation: "Missing numbers are 1, 5, 6, 8, 9, 10, ... The 5th one is 9." },
      { input: "1 2 3 4\n2", output: "6", explanation: "Missing numbers are 5, 6, 7, ... The 2nd one is 6." },
    ],
    testCases: [
      { input: "2 3 4 7 11\n5", expectedOutput: "9", isHidden: false },
      { input: "1 2 3 4\n2", expectedOutput: "6", isHidden: false },
      { input: "5\n1", expectedOutput: "1", isHidden: true },
      { input: "2\n1", expectedOutput: "1", isHidden: true },
      { input: "1 2 3 4\n1", expectedOutput: "5", isHidden: true },
      { input: "7 8 9\n3", expectedOutput: "3", isHidden: true },
      { input: "1000\n1000000000", expectedOutput: "1000000001", isHidden: true },
      { input: "1 10 21 22 25\n12", expectedOutput: "14", isHidden: true },
      { input: KTH_MISSING_PERF, expectedOutput: "170000", isHidden: true },
    ],
    hints: [
      "For index i, exactly arr[i] - (i + 1) positive numbers are missing before arr[i].",
      "That count never decreases as i grows, so you can binary search for the first index whose missing count reaches k.",
      "If p elements of arr are smaller than the answer, the answer is simply p + k.",
    ],
    editorial:
      "Define missing(i) = arr[i] - (i + 1), the count of absent numbers before arr[i]; it is non-decreasing. Binary search for the smallest index p with missing(p) >= k (p = n if none). Exactly p array elements lie below the answer, so the answer is k + p. Time O(log n), space O(1).",
    solutions: {
      javascript: code`
        function solve(input) {
          const lines = input.trim().split("\n");
          const arr = lines[0].trim().split(/\s+/).map(Number);
          const k = Number(lines[1]);
          let lo = 0;
          let hi = arr.length;
          while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (arr[mid] - (mid + 1) >= k) hi = mid;
            else lo = mid + 1;
          }
          return String(lo + k);
        }
      `,
      python: code`
        def solve(input_str):
            lines = input_str.strip().split("\n")
            arr = list(map(int, lines[0].split()))
            k = int(lines[1])
            lo, hi = 0, len(arr)
            while lo < hi:
                mid = (lo + hi) // 2
                if arr[mid] - (mid + 1) >= k:
                    hi = mid
                else:
                    lo = mid + 1
            return str(lo + k)
      `,
    },
  },
  {
    title: "Peak Index in a Mountain Array",
    difficulty: "Easy",
    companies: ["Amazon", "Google"],
    description:
      "An array `arr` is a *mountain* if its values strictly increase up to a single peak element and then strictly decrease (the peak is neither the first nor the last element).\n\nGiven a mountain array, print the index of its peak. Aim for O(log n).",
    constraints: "3 <= arr.length <= 10^5\n-10^6 <= arr[i] <= 10^6\narr is guaranteed to be a mountain.",
    inputFormat: "One line of space-separated integers `arr`.",
    outputFormat: "The 0-based index of the peak element.",
    examples: [
      { input: "0 2 1 0", output: "1", explanation: "arr[1] = 2 is the maximum." },
      { input: "0 10 5 2", output: "1" },
    ],
    testCases: [
      { input: "0 2 1 0", expectedOutput: "1", isHidden: false },
      { input: "0 10 5 2", expectedOutput: "1", isHidden: false },
      { input: "3 4 5 1", expectedOutput: "2", isHidden: true },
      { input: "24 69 100 99 79 78 67 36 26 19", expectedOutput: "2", isHidden: true },
      { input: "-5 -1 -3", expectedOutput: "1", isHidden: true },
      { input: "1 2 3 4 5 6 7 8 9 10 11 10", expectedOutput: "10", isHidden: true },
      { input: "1 100 99 98 97 96 95 94", expectedOutput: "1", isHidden: true },
      { input: MOUNTAIN_PERF, expectedOutput: "73421", isHidden: true },
    ],
    hints: [
      "Compare a middle element with its right neighbour.",
      "If arr[mid] < arr[mid + 1] you are on the rising slope, so the peak lies to the right of mid.",
      "Otherwise the peak is mid or to its left. Shrink the range until one index remains.",
    ],
    editorial:
      "In a mountain, 'arr[i] < arr[i + 1]' is true exactly on the rising part and false from the peak onward, so the peak is the first index where it becomes false. Binary search on that predicate in O(log n) time and O(1) space.",
    solutions: {
      javascript: code`
        function solve(input) {
          const arr = input.trim().split(/\s+/).map(Number);
          let lo = 0;
          let hi = arr.length - 1;
          while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (arr[mid] < arr[mid + 1]) lo = mid + 1;
            else hi = mid;
          }
          return String(lo);
        }
      `,
      python: code`
        def solve(input_str):
            arr = list(map(int, input_str.split()))
            lo, hi = 0, len(arr) - 1
            while lo < hi:
                mid = (lo + hi) // 2
                if arr[mid] < arr[mid + 1]:
                    lo = mid + 1
                else:
                    hi = mid
            return str(lo)
      `,
    },
  },
  {
    title: "First Bad Version",
    difficulty: "Easy",
    companies: ["Meta", "Microsoft", "Amazon", "Google"],
    description:
      "A product has versions numbered `1..n`. Once a version is bad, every later version is bad too. You are given an array `flags` of length `n` where `flags[v - 1]` is `1` if version `v` is bad and `0` if it is good.\n\nPrint the number of the first bad version. In a real setting each check is an expensive API call, so aim to inspect as few versions as possible (binary search).",
    constraints: "1 <= n <= 10^5\nflags is non-decreasing (0s then 1s)\nflags contains at least one 1.",
    inputFormat: "One line of `n` space-separated values, each 0 or 1.",
    outputFormat: "The 1-based number of the first bad version.",
    examples: [
      { input: "0 0 0 1 1", output: "4", explanation: "Versions 4 and 5 are bad; version 4 is the first." },
      { input: "1", output: "1" },
    ],
    testCases: [
      { input: "0 0 0 1 1", expectedOutput: "4", isHidden: false },
      { input: "1", expectedOutput: "1", isHidden: false },
      { input: "0 1", expectedOutput: "2", isHidden: true },
      { input: "1 1 1 1", expectedOutput: "1", isHidden: true },
      { input: "0 0 0 0 0 0 0 1", expectedOutput: "8", isHidden: true },
      { input: "0 0 1 1 1 1 1 1 1", expectedOutput: "3", isHidden: true },
      { input: FIRST_BAD_PERF, expectedOutput: "67890", isHidden: true },
    ],
    hints: [
      "The flags look like 0 0 ... 0 1 1 ... 1, so you are looking for the boundary.",
      "Probe the middle version: if it is bad, the answer is at mid or earlier; otherwise it is later.",
      "Keep `lo` and `hi` as a range that always contains the answer and stop when they meet.",
    ],
    editorial:
      "The array is sorted, so the first 1 can be found with a lower-bound style binary search: if flags[mid] is 1, set hi = mid, otherwise lo = mid + 1. When lo == hi it is the first bad index; print lo + 1. Time O(log n), space O(1).",
    solutions: {
      javascript: code`
        function solve(input) {
          const flags = input.trim().split(/\s+/).map(Number);
          let lo = 0;
          let hi = flags.length - 1;
          while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (flags[mid] === 1) hi = mid;
            else lo = mid + 1;
          }
          return String(lo + 1);
        }
      `,
      python: code`
        def solve(input_str):
            flags = list(map(int, input_str.split()))
            lo, hi = 0, len(flags) - 1
            while lo < hi:
                mid = (lo + hi) // 2
                if flags[mid] == 1:
                    hi = mid
                else:
                    lo = mid + 1
            return str(lo + 1)
      `,
    },
  },
  {
    title: "Find Smallest Letter Greater Than Target",
    difficulty: "Easy",
    companies: ["Google", "Amazon"],
    description:
      "You are given a string `letters` of lowercase letters sorted in non-decreasing order and a target letter `target`. Print the smallest letter in `letters` that is strictly greater than `target`.\n\nThe letters wrap around: if no letter is greater than `target`, print the first letter of `letters`.",
    constraints: "2 <= letters.length <= 10^4\nletters is sorted non-decreasingly and contains at least two different letters\ntarget is a lowercase letter.",
    inputFormat: "Line 1: the string `letters` (no spaces).\nLine 2: the single character `target`.",
    outputFormat: "A single lowercase letter.",
    examples: [
      { input: "cfj\na", output: "c", explanation: "'c' is the smallest letter greater than 'a'." },
      { input: "cfj\nj", output: "c", explanation: "Nothing is greater than 'j', so wrap around to the first letter." },
    ],
    testCases: [
      { input: "cfj\na", expectedOutput: "c", isHidden: false },
      { input: "cfj\nj", expectedOutput: "c", isHidden: false },
      { input: "cfj\nc", expectedOutput: "f", isHidden: true },
      { input: "xxyy\nz", expectedOutput: "x", isHidden: true },
      { input: "ab\nb", expectedOutput: "a", isHidden: true },
      { input: "aabbcc\nb", expectedOutput: "c", isHidden: true },
      { input: "ez\ny", expectedOutput: "z", isHidden: true },
      { input: LETTER_PERF, expectedOutput: "n", isHidden: true },
    ],
    hints: [
      "Because the letters are sorted, you do not need to look at all of them.",
      "Binary search for the first position whose letter is strictly greater than `target` (duplicates must be skipped past).",
      "If that position is past the end of the string, wrap around to index 0.",
    ],
    editorial:
      "This is an upper-bound search: find the first index with letters[i] > target using binary search (when letters[mid] <= target move right, otherwise keep mid as a candidate). If the index equals the length, the answer wraps to letters[0]. Time O(log n), space O(1).",
    solutions: {
      javascript: code`
        function solve(input) {
          const lines = input.trim().split("\n");
          const letters = lines[0].trim();
          const target = lines[1].trim();
          let lo = 0;
          let hi = letters.length;
          while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (letters[mid] <= target) lo = mid + 1;
            else hi = mid;
          }
          return lo === letters.length ? letters[0] : letters[lo];
        }
      `,
      python: code`
        def solve(input_str):
            lines = input_str.strip().split("\n")
            letters = lines[0].strip()
            target = lines[1].strip()
            lo, hi = 0, len(letters)
            while lo < hi:
                mid = (lo + hi) // 2
                if letters[mid] <= target:
                    lo = mid + 1
                else:
                    hi = mid
            return letters[0] if lo == len(letters) else letters[lo]
      `,
    },
  },
  {
    title: "Logger Rate Limiter",
    difficulty: "Easy",
    companies: ["Google", "Bloomberg", "Meta"],
    description:
      "Design a logger that receives a stream of messages together with their timestamps (in seconds). Each distinct message may be printed **at most once every 10 seconds**.\n\nFor every incoming `timestamp message`, decide whether it should be printed. A message is printed if it has never been printed before, or if its last *printed* time was at least 10 seconds ago (`timestamp - lastPrinted >= 10`). Only printed messages update the last-printed time. Timestamps never decrease.\n\nFor each input line output `true` if the message is printed and `false` if it is suppressed.",
    constraints: "1 <= number of lines <= 2 * 10^4\n0 <= timestamp <= 10^9, timestamps are non-decreasing\nmessage is a non-empty string of lowercase letters and digits without spaces.",
    inputFormat: "One line per call: `timestamp message`.",
    outputFormat: "Space-separated `true` / `false`, one per input line, in order.",
    examples: [
      {
        input: "1 foo\n2 bar\n3 foo\n8 bar\n10 foo\n11 foo",
        output: "true true false false false true",
        explanation: "foo is printed at 1, so it is blocked until 11; bar is printed at 2 and blocked until 12.",
      },
      {
        input: "5 a\n5 a\n15 a\n24 a\n25 a",
        output: "true false true false true",
        explanation: "A gap of exactly 10 seconds is allowed (5 -> 15 and 15 -> 25).",
      },
    ],
    testCases: [
      { input: "1 foo\n2 bar\n3 foo\n8 bar\n10 foo\n11 foo", expectedOutput: "true true false false false true", isHidden: false },
      { input: "5 a\n5 a\n15 a\n24 a\n25 a", expectedOutput: "true false true false true", isHidden: false },
      { input: "0 x", expectedOutput: "true", isHidden: true },
      { input: "0 x\n9 x\n10 x\n19 x\n20 x", expectedOutput: "true false true false true", isHidden: true },
      { input: "1 a\n1 b\n1 c\n1 a\n12 a\n12 b\n12 c", expectedOutput: "true true true false true true true", isHidden: true },
      { input: "100 m\n105 m\n109 m\n110 m\n111 m\n120 m", expectedOutput: "true false false true false true", isHidden: true },
      { input: LOGGER_PERF, expectedOutput: "true true true true true false true true true true true true true true true true true false true true true true true false false true true true true true true true true false true true true true true false true true true true false true true true true true true false true true true true true true true true true true true true true true true true true true false true true true true true true false true true true true false true true true true true false true true true true true true true true true true true true true true true true true true false true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true false true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true false true true true true true true true true true true true true true true true true false true true true true true true true true true true true true false true true false true true true true true false true true true true true true true true true true true false true true true false true true true true false false true true true true false true true true true true true true true false true true true true true false true true true true false false true false true false true true true true true true true true true false true true true true true true true false true false true true true true true true true true true true true true true true false true true true true true true true false true true true false true true true true true true false true false false true true true true true true true true false true false true false true true true false true true true true true true true true true true true true true true true true true true true true true false true true true false true true true true true true true true true true true true false true true true true true true true false true false false true true true true true true true true true false false true true true true true true true true true false true true true true false true false true false true true true true true true true true true false true true false true true true true true true true true true true true true true true true true false true true true false true false false true true true true true true true false true true true true true true true true false false true true true false true false true true true true true false true true true true true true true false true true false true true true true false true true true false true true true true false true true true true true true true true true true true false true false false true true true true true true true true true true true true true true true false false true true true true true false false true true true true true true true true true true true true false true false false true true true true true true true false true true true false true true true true true true true true false true true true true true true true true true true true true true true false true false true true true true true true true true true true true false false false true true true true true true true false true true true true true true true true false true true true true true true false true true true true false true true true true true true true true true true true true false true false true true true true true true true true true true false true true true true false true true true true true true true true true true true true true true true true true true true true true false true true true true true true true true true true true true true true false true true true true true true true true true true true true true true false true true true true true true true true true true true true true true true false true true true true true false true false true true true false true true true true true true true false true true true true true true true true true true true false true true true true false true true true true true true true true true true true true false true true false false true true true true true true true false true true false false true true false true true true true true true true true true true true true true true true true true true true true true true true true true true true true true false false true false false true true true true true true true true false true true true true true true true true true true true true true true false true true true true true true true false true true true true true true true true true true true true true true true false true true true true true true true true true false true true true false true false true true true true true true true true true true true true true true true true true false true false false true true true false true false false true true true true false false true true true false true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true false true false true true true true true true true true true true true true false false true true true true false true false true true true false true true true true true false true true true false true true false true true true false true true false true true true true true true true true false true false true true true true true true true false true true true true true true true true true true true true true true true true false true true true true true true true true true true true false true true true true true true true true true true true true true false true true true true true true true true true true true false true true true true true false true true true true true true true true true true true true true true true true true true true true true true true true true true true true false true true true true true true true true true true false true false true true true true true true true true true true true true true false true true false true false true true true true true true true true true true true false true true true true true true true true true true true true true true true true true false true true false true false true false true true true true true true true false false true true true false true true true false true true true true true true true false true false true true true false true true true true true true true false true true true true true true true true true true true true true false true true true true true true false false true true true true true true true true true true true true true true true true false true true true true true true true true false true true true true true false true false false true true true true true true true true true true true true true true true true false true true true true true true true true true true true false true false true true true true true true true true true true false true true true true true true true true true false true true true true false true true true true true true false true true false true false true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true false true true true true true true true true true true true true false true false true true true true false true true true false true true true true false false true false false false true true true true true true true false true true true true true true true true true true true true true false true false true true true true false true true false true true true true true false true true false false true true true true true true false true false true true true true true true true true true false true false true true true true true true true true true true false true true true false false true true true true true true true true true false true true true false true true false true true false false true false true true true true true true true true true true true true true true true true true true true true true true false true true false true true true true true true true true true true true true true true true false false true false true true false true true true true true true true true true true true false true true true true true false true true true true true true true true true true true false true true true false true true true true false true true true false true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true false true true true true true true true true true true true true false true true true true true true true false true true true true true false true true true true true true true true true false false true true true true true true true true true true true true true true true false true false true false false true true true true true true true true true true true true true true true false false true true true true true true true true true true true true true true false true true true true true true true true false true false true true false false false true true true true true true true false true true true true true true true true true false true false true true true true true true true true false true true true true true true true true false true true true true true true true true true true true true true true true true true false true true true true true true true true true true true true true true false true true true true true true true true false true true true true true true true true true true true true true false true true true true true true true false true false true true true false true true true false true true true true true true true true true true true true true false true true false true false true true true true true true true false true false true true true true false true true true true true true true true true false true true true false true true true true true true false true true true true false true false true true true true true true true false true false true true true true true true true true true true true true true true true true true false true true true true true true true true true true true true true true true true false true false true true true true true true true true true true false true true false true true false true true true true false true true true true true true true true true true true true true true false false true true true true true true true true true true true true true false true true false true true true true true true false true true true true true true true false true true true true true true true false true true true true true true true true true true true true true true true true true false false true false false false true true true true true true true true false true false true false true true true false true true true true true true true true true true true true true true true true false false true true true true false true true true true true true true true true true true true true true true false true true true true false true true true false true true true false true true true false true true false true false true true true true true true true true true true true false true true true true true true true true true true true true false true true true true true true true true true true true true true true true false true true true true true true true true true true true true true false true true false true true true true true true false true true true true true true false true true true true true true true true true true false true true true false true false true true true true true true true true true true true true true true true false true false true true true false true true true true false true true true true true true true false true true true false true true true true true true true true true true false true true true true true true false true true false true true true true true true false true true true true true true true false true true true true true false true false true true true true false true true true false true true true true true true true true true true false false true true false true true true false true true true true true true true true true false true true true true true true true true true true false true true false true true true true true true true true true true true false true true true true true true true true true true true true true true true false true true true false true true true true true true false true true true false true false true true true true true true true true true false true true true true true true true false true true true true true true true true true true true true true true true true true false true true false true false true true true true true true true true true true true true false false false false false false true true true true true false true true true true true false true true true true true true true true true false true false true true false true true true true true true true true true true true true true false true true true true true true true true true true true true true true true true true true true true true true true true true false true true false true true true true true true true false true true true true true false false true true true false false true true true true true false true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true false true false true true false false true true true true true true true false true true true true true true false true true true true true true true true true true false true false true false true false true true false true true true false true true true true true true false false true false true true true true true true true true true true true true true true true true true true true true true true true true true true false true true false true true false true true false true true true true true true true true false true true true true true true true false true true true true true false true true false true true true true true true true true true true true true true true true true true true false false true true false true true true true true true true true true true true true true true true true true true true true false true true true true false true true false true true true true true true true true true true true true true false true false true true true true true true true true true true true true true false true true true false true true true true true true true true true true true false true true true true true true true false true true true true true false true false true true true true false false false false false true true true false true true true true true true true true true false true true true true true true true true true true true true false false true true true true true true true true true true true true true true false true true true false true true false true true true true true true true true true true true true false true true true true true true true false true true true true true true true true true true true false true true true true false true true false true true false true true true false true true true true true true true true true true true false true true true true true true true false true true false true true true true true true false true false true true false true true true true true true true false false true false true true false true true false true true false true false true true false false true true true true true true true true true true true true true true true false false true true true true true true true true true true true true true true true true true true false true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true false true true true true false true true false true true false true true true true true true true true true true true true true true true true true true true false true true true true true true true false true true true true true true true true true true true true true true true true true true false false true true true true false true true true true true true true true false true true true false true true true true true false true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true false true true true true true true true false true true true true true true true true true true true true true true false true true true false true true true true true true true true true true true true true false true true false false false true true true true true true true true true true true true true true true true true true true true true true true false true false true false true true true true false false true true true true true false true true true true true true true true false true true false true true false true true true true true true true true true true true true true true true true true true true false true true true true true true true true false true true true true true true true true false true true true true true true true true false true true true false true true true true true true true false true true true true false true true true true true true true true true true true false true true false true true true true true true false true true true true true true true true false true false true true true true true true true true true true true true true false true true false true false true true false true true true true true true true true false true true false true true false false true false true true true true true true true true true true true true true true false true true true true true true true true false true true true true true true true true false true true true true true true true false true true true true true true true true true true true true false true true false true false false true true true true true true true true false false true true true true true true true true true true true true false true true false true false true true true true true true true true true true true true true true true true true true true true true false true true true true true true true true true true true true true true true true true true true true true true true true true false true true true false true false true true true true true true true false true true true true false true true true true true true true true true true true true true true false true true true true true true true false true true true true true true true true true true true true true true true false true true true false true true false true true false true true true true true true true true true false true true true true false true true true true true true true true true false true true true true true true true true true false true true true false true false true true true true true true false true true true true false true true true true true false true true true false true true true true true true true true true true true true true false false true false true true true true true true true true true true true false true true false true false true true true true true true true true true true true true false true false true true false true true true true true true true false true true true true false true true true true true true false true true true true true true true true true true true true true true true true true true true true true true true true false true true true true false true true true false false true true true true true true true true true true true true false true true true true true true false true true true true true true false true true true true true false false true true true true true true false true true true true true true false true true false true true false true false true true true true true true true true true true true false true false true true true true true true true true true true true true true true true true true true true true true false true true false true true true true true true true true true true true true false true true false true true true true false true true true true true true false true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true false true true true true true true true true true true true true true true false true true true true true true true false true true true true false true false false true true true true true true true true true true true false true true true true true true true false true true true true true true true false true true true true true true false true true true false true true true false true true true true true true true true true true true true false true true true true true true true true true false true true true true true false true true false true true true true true true true true false true true true true true true true true true true true true true true true true true false true true true true true true true true true false true false true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true false true true true true false true true true false false true true true true true true true true true true true true true true true true true true true true true true true true false true true true true true true true true true true true true true false true false true true true true true true true true true true true true true true true true true true false true true false true false true true true true true true true true true true true true false true true false true false true true false true true true true true true true true true false true true true false true true true true true true false true true true true true true true true true true true true true true false true true true true true true true false true true true true true true true true true true true true true true true true true true true true true true true true true false true true true true false true true true false true true true true true true true true true false true false true true true true true true true true true true true true true true true false true true false true true true true true false true true false true true true true true true false true true true true true true true false true true true true true true true true true true true true true false true true true true true true false true true false true false true false true false true true true false true true true true true true false true true true true true true true false true true true true true true true false true true true true true true true true true true false false false true true true true true true true true true true true true true true true true true true true false false true true true false true true true true true true true true true true true true true false true false true true true true true true true true true true false true false true true true true true true true true true true true true true true true true true true true true true true true true true false true true true false true true true true true true true true true true true true true true false true true true true true true true true true true true true true true true false true true true true true true true true true true true true true true true true true true true true true true true true true true true true true false true true true true true true true true true true true true true true true true true true true true false true true true true true true true false true true true true true true true true true true true true true true true true false true true true true true true true true true true true true false true true true true true true true true true true true true true true true false true true true true true false true true true true true true true false false true true true true true true true false true true true true false true true true false true true true true true true true true true false true true true true true true true true true true false true true true true true true true true true false true false false true true true true true true true true true true true true true false true true true false true true true true true true true true true true true true true true true false true true true false true true true true true true true true true true true false true false true true true true true true true true true true true true true true true false false true false true true true false true true true true true false true true true true true true false true true true true true true true true true true true true true true true true true true true false true false false true true true true true true true true true true true true true false false true true true true true true true true true true false true true true true true true true true true true true true true true true true true true false true true false true true true true true true true false true true true true true true true true true true true true false true true true true true false true true false true true false true true true true true true true true true true true true false false true true true true true true true true true false true false true true true true true true false true true true true true true true true true true false true false true true true true true true true true true true true true true true true true true true true true true true true true true true false true true true true true true true false true false true true true true true true true true true true true true true true true false true true true true true true true true true true true true true false true false true true true true true true true true true true true true true true true true false true true true true true true true true true true false true true true true true true true false true true false true true true true true true false true true false true true false true true true true true true true false true true true false true true true true true true true false true true false true true true true true true true true false true false true true true true true false true true true true true true true true true true true true true true false true true true true true true true true true false true true false true false true true false true true true false true true true true true false true true true true true false true true true true true true false true true true true true true true false true false true true true true true true true true true true true true true true true true true true true true false true true true true false true true true true true true true false true true false true false false true true true true true true true true true true true true true true true false true true true false true true true true false true false true true true true true true false false false true true false true true true true true true false true true true true true false true true true true true true true true false false true true true true false true true true true true true true true true true true true false true true false true true true true true true true true true true true true false true true true true true true true true true false true true true true true true false false true true true true false true true true true false false true true false true true true true true true false true true true true true true true true false false true true true true false true false true true true true true false true true true true true true false true true false true true false true false true true true true true true true true true true true true true true true true true false true true true false true true false true true true true true true true true true true true false true true true true true true true true true false true true true true true true true true true true true true true true true true true true true true true true true false true true true true true true false true true true true true true true true true true true true true true true true true true true true true true true true true true false true true true true true false true false true true false true true true true true true true false true true false true true false true true true true true true true true true true true true true true true true true true true true true true false true true true true true true true true true true true false true false true true true true true true true true false true true true true true true true true true true false true true true true true true true true false true true true true true true true false true true true true true true true true true true true true false true true true true true true false true true true false true true true false false true true true true true false true true true true true true true true true true true true false true true false true true true true true true false false false true false true true true true true true true true true false true true true true false true true true true true false true true false true true true false true true true true true true true true true true true true true true false true false true true true true true true true true true true true true true true true false true true true true true true true true true true true true false true true true true true true true true true false true true false false true true true true true true true true true true true true true true true false true true true true true true false false true false true true true true true true true true true false true true true true true true false true true true true false true true false true true true true true true false true true false true true true true true true true true false true false true true true true true true true true true true true true true true false true true true true false false false false true true true true true false true false true true true true true true true true true true true true true true true true true true true true false true true true true true true true true true true true true true true true true true false true false true true true true true true true true true true true false true true true false true true true true true true true true true true true true true true true true true false true true true true true true false true true true true false true true false false true true true true true true true false false true true true true true true true true true true true true true true true true false true true true true true true true true true true true true true true true true true true true true true true true true false true false true false true true true true false false true true false true true true true true true true true true true true true true true true true false false true true true true true true false true true true true true false true true false true false true true true true true true true true true true true true true true true false true true true true true true true true true false true true false true true true true true true true true true true true true false true false true true true true true true false false true true true true true false true false true true true false true true false true true true true true true true true true true true true true true true true true true true true true true true true true true true true true false true true true true true true true true true true true true true true true true false false true false true true true true true true true true true true true true true true true true true false true true true true true true true true true true false false true false true true true false true true true true true true true true true true true false true false true true true false true true true true true true true false true true true true true true true true true true true false true true true true true true true true true true true true false true true true true true true true true true false true true true true true true true true false true true true true true true true true true true true true true true true true true true true true true true false true false true true false true true false true true true true true true true true true true true true true true true false true true true false true true true true false true true true true true true false true true true false true true true true true true false true true true true true true true true true false true true true true true true true true true true true true true true true true true true true true true true false false true true true true true true true true true true true true false true true true true true true false true true true false true true true true true false true true true true true false true true true true false true true true true true true true true false true true true true true true false true true true true true true true true true false true true true true true true true true true false true true true true true true true false true true true true true true true true true true false true true true true false true true true true true true true false true true false true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true false true true true true true true true true true true true false true true true true false true true false true false true true true true false true true true true true true true true true true true true true false true true true true true true true true true true true true false true true true false true true true false true true true true true true true true true true true false true false true true true true true false true true true true false false true false true true false true true true true true true true true true true true false true true true false true true false true false true true true true true true true true false false true true true true false true true true true true true true true true true true false true true true true true true true true false true true true false true true true false false true true true true true true true true true true true true true true true true true true true true true true true false true true false false true true true true false true true false true true true true true true true false true true true false true true true false true true true true false true true true true true true true true true true true true true true true true true true true true true true true true true false true true true true true false true true true false true true true true true false true false true true false true true true false true true true true true true true true false true true true true true true true true true true false false true true true false true true true true true true true false true true false true true true false true false true true false true true true true true true true false true true true true true true true false true true true true true true true true true true true false true true true true true true true true true true true true true true true true true false true true true true true true true true true false true true true true true true false true true true true true true true true true true true true true true true true false false true true true true true true true true true false true true false true true true true true true true true true true true true true true true true true true true false true false false true true true true true false true false false true true true true true true true true true true true true false true true true true true true false true true true true true false true false true true true true true true true true true true true false true true true true true true true true true true true true true true true true true true true true true true false true true true true true true true true true true true true true true true true false true false true true true true true true true true true false true true true true true true false true true true true true true true true true true true true true true true true true true true true false true true true true true true true true true true true true true true true true true true false true true true false true false true false true true true true true true true true true true true true true true true true false true true false true true true true true true true true true true true true true false true true false false true true true true false true true false true true true false true true false true false true true true true true true false true true true false true true true true true false true true true true true false true true true true true true false false true true true true true true true true true true true true true true false true true true true false false true true true true true true true false false true true true true true true true true true true true true true true true false true true true true true true true true true true true false true true true true false true true true true true false true true true true false true true true true true true true false true true false true true true true true true true true true true true false true true true true true true true false true true true true true true true false true true false true true true false false false true true true true true false true true true true true true true true true true true true true true true true true true true true false true true false true true false true true true true false true true true true true true true true true true true true false true false true true true true true false true true false true true true false true true true true true true true false true true true true true true true true false true true true false true true false true true true true true true true true true true true false false true true true true true true true true true false true true true true true true true true true true true false true true true true true true true true true true true true true true true true true false true true true true true true true true true true false true true true false true true true false true true true true true true true true true true true true false true true true true true true true false true true true true true true true true true true true true true true false true true true false true true true true true true true true true true false true true true false true true true true true true true true true true true true true false true true true true false true false true true true true true true true true true true true true true true true true true true true true true false true true true true true true true true true true true true true true true true true true true true true false false true true true true true true true true true true true false true true true true true true true true true true true true true true true true true true false true true true false true true true true true true true false false true true true true true true true true true true true true false false true false true true true true true true true true true true true true true true false true true true false true true true true true true true true true true true true true true true true false true true true true true true true true true true true true true false true true false true true true true false true true true true false true true true true false true true true true true true true true true true true true true true true true true true true true true true true false true true true true true true true true true true true true true true true false true true true false false true false true true true true true false true true true false true false true true true true true true true true true true true true true true true true true true true true false true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true false true false true true true true true false true true false true true true true true false true true true true true true true true true true true true true true true true true true true true true true true true true false false true true true true true true true true true true true true true true false true true true true true true true true true false true true true true true true true true true true false true true true true true true false false true true true true true true true true true true true true true true true true false true true true true true true true false true false true true true true true true true true false false true false false false true true true true true true true true true true false true true true true true true true true true true true true true true false false true true true false true true true true false true true true true true true true true false true true true true true true true true true true false true false true true true true true true true false true true true true true true true true true true true false true false true true false true true true true true true true true true true true false true true false false true true true true true false false true true true true true true true true true false true true false true true true true true true true true true true true true true true true true true false true true true true true true true true true true true true true true true true true true true true true false true true true true true false true true true true true true false true true true true true true true true true true true true true true true false true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true false true true true true false true true true true true true true true true true true true true true true true true true true true true false true true true true true false true true true true true true true true true true true true true true false true false false true true true true true true true true true true true false true true true true true true true true true true true true true true true true true false true true true true false true true true true true true true true true true false false true true true true true true true true true false false false true true true true true true true true true true true true true true true true true true true true true true true true true true true true true false false true true true true true true true true false true true false true true true true true true true true true true true true true true true true true true false true true true false true true true false true true true true true true true true true true true true true false true true true false true true true true true true true true true true true false false true false true true false true true false true true true true true true true true true true true true true true true false true false true false true true true true true true true true true true false true true true true true false true false true false true true true true true true true true false true true true false true true true true true true true false true true true true true true true true true true true false true true true true true true true false true true true false true true false true true true true true true false true true true true true true true true true true true true true false true true true true false true true true true true true true false true true true true true true true true true true true true false true true true true true true true true true true true false true true true false false true true true true true true true false true true true false true true true true true true true true true true true true true true true true false true true true true true true true true true true true true true true true true true true true true true false false true true false true false false true true true true true true false true true true true true true true true true true true true false true true true true false true true false false true false true true true true false true true true true true true true false true true true true true true true false false false true true false false false true true true true true true true true true true true true true true true false true true true true true true true true false true true true true false false true true true true true true true true true true true true true true false true true true true true false false true true true true true true true true true true true true true false true true true false true true true true true true true true true true true true true true true true true false true true false false true false true true true true true true true false false true false true true true true true true true false true true true false true true true true false true true true true true true true false true true true true true true true true true true true false true true false true true true true true false true true true true true true true false true true true true true true true true true true false true true true true true false false true true false true true true true true true true true true true true true true true true true true true true true true true false true true true true true true true true false true true true true true true false true true true true true true true true true true true true false true true false true true true false true true true true true false true false false true true true true true true true true true true true true false true true false false true true false false true true false true true true true false true true true true true false true true false true false true true true true true false true true true false true true true true true true true false true false true true true true true true true true true true true true true true false false true true true true true true true true true true false false true true true true true true true true false true true true true true true true true true true false true true true true true true false true false true false true true true true true true false true true true true true true true true true true false true true true true false true true true true true true true true true true true true true false true false true true true true true true true true false true true true true true true true true true true false true true true true true false true true true true true true false false true false true true true true true true true false true false true true true true true true true true true true true false true true false true true true true false true true true true true true true true false true true true true false true true true true true false true true true true true true true true true true true true true false false true true true true false false true true true true true true true true true true true true true true true false false true true true true true true true true true false true false true true true true true true true true false true true false true true true true true true true true true false true true true true true true true true true true true true true false true true true true true true true true true true true true true true true false true true true true true false true true true false true true true true true false true true true true true false true true true true true true true true true true true true true true true true false true true true true true true true true true true true true false true true true true true true true true false true true true true true true true false true true true true true true true false true true true true false true true false true true true true true true true true true true true true true true false true true false true false true true true true true true true true true true true true true true true true true true true true false true true true true true true true false true false true true true true true false true true true true true true true true true true true true true false true false true true true false true false true true true true true true true true true true true true true true true true true true true true true true true true false true true true true true true true true true false true true true true true true true true true true true true true true true true true true true false false true true true true true true true false true true true true false true true false true false true true true true true true true true false false true true true true true true false true true false true false true true true true true true true true true true true true true true true true true false true true false true false true false true false true false true true true true true true true true true false true true true true true true true true true true false false true false true true true true true true true true true false true true true false true true true true true true true true true true false true true true true false true true true true true true true true true true true true true true true true true true true false true false true true false true true true true true true true true true true true false true false true true true true true true true true true true true true true true true true false true true true true true false true true true true true true false true true true true true true true true true true true true false false true true true true true true false true true true true true true true true true true true true true true true true false true true true true true true false false true true true true true true true true true true true true true true true true true true true true true true false true true true true true true true true true true false true true true true true true true true true true true true true false true true true true true true true true true true true true true true true true false true true true true false false true true true true false true true true true true true true true true true false true true true false true true true true true true true true true true true true false true true false true false true true true true true true false true true true true true false true true true true true true true true true true true true true true true true false true true true true true true true true true true true true true true true true true true true false false true true true true true true true true true true true true true true true true true false true true false true false true true true true true true true true true true true true true false true true true true true false true true true true true true true true true true true true true true true true true false false true true true true true true true true true true false true true true true true true true true true true true true false true true true true true false true true true true true true true true true true true true true true false true true true true true true true true true false true false true false true true false true true true true true true true true true false true true true true true true true false true false true true true true true true true false true true true false true true false true true false true false true true true true true true true true true true true true true true false true true true true true true true true true false true true true true true true true true true true true true true true true false true true true true true true true true true false true false true true true true true true true true true true true true true true true true true true true true true true true true true true true true false true true true true false true true true true true true true true true true true true true true true false true true true true true true true true false false true true true true true false true true false true true true true true false true true true true false true true false true true true true false true true false true true false true true true true true true false true true true true true true true false true true true false false true true true true true true false true true true true true false true true false true true true true true true true true true false true true true false true true true true true false true true true true true true true true true true true true true true true true true true true true true true true false true true true true true true true true true true true true false true true true false true true true false true true false true true true true true true true true true true true true true true true true true false true true true true true true true true true true true true true true false false false false false true true true true true true true true true true true true true true true false true false true true false true false true false true false true true true true true false true false false true true true true true true true true false true false false true true true true false true true true true false true true true true true true true true true true true true true true true true true true true true true true true false true true false true true true true true true true true true true true true true true false true true true true true true false true true true true true true true true true true true true false true true true true true false true true true true true true true true true true true false true true true true true true true true true false true true true true true true true true true true true true true true true true true true true true true true false true false true true false true true true true true true true false true true true true true true true true true true true true true true true true true true true true true true true true false true true true true true true true true true false true true true true false false true true true true false true true true true true false true false true true false true true true true true false true true true true true true true true true false true true true true true true true true true true true true true true true true true true true true true true true true false true true true true true true true false true true true true true true false true true true true false true false false true true true true true true true true true true true true true true true true true false true true true false true true true true true true false true true false true true true true true true true true true true true true true true true true true true true true false true true true false true true false true true true true true true false true true false true true true true true true true true true false true true true false true true true true true true true false true true true false true true true false true true true true true true true true true true true true true true true true true true true true true true true false false true false false false true true true false true true true true true true true true false true true true false true false true false true true false true true true true true false true true true true true false true true true true true true true true true true false true true false false true true true true true true true true true true true false true true false true true true true true false true true true true true true true true true false true true true true true true true false true true true true true true true true true true true true true true true true true true true true true true true true true true true false true false true true true true true true true true true true true false true true true true true true true true true true true true true true false true true true true false true true true true true true false true true true true true false true true true true true true true true true true true true true true true true true true true true false true true true true true true true true true true true true true true false true false true true true true true true true true true true true false false true true true false true true true true true true true true true true true false true true false true true true true true true true false true true true false true true true true true true true true true false true true true true true true true true true true true false false false true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true false true true true true true true true true true true true false true false true true true true true true true false true true true true false false true true true true true true true true true true true false true true false true true true true true false true true true true true true true true true true true true true true false true true true true true true true true true true true true false true false true true true true true true true true true true false true true true true true true true true true true true true false false true true true true false true false true true true true true true true true true true true true false true false true true true true true true true false true true true true true true false true false true true false true false true true true true true true true true true true false true true true true true true true true true true true false true true true true false true true true true true true false true true true true true true true true false true true true true true true true true true false true true true true true false true false true false true true true true false true true true true true true true true true true true true true false true true true true true true true true false true true true true true true true true true false true true true true true false false false false true true true true false true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true false true true true true true true true false true true true true true true true true true true true true true true true false true true true true true true true true false true true true true true true true true true true true true true true true true true true true true true false true true true true true true false true true true true true false true true true true false true true true false true true true true true true true true false true false true false true true true true true true true true true true false false true true true true true true true true true false true true true true true true true true true true true true true true true true true true true true true false true true true true true true true true true true true true true false true true true true true true false false true true true true false true true true true true true true true true true true true true true false true true true true false true true true false true true false true true true true true true false false true true true true true true true true true true true false true true true true true true true true true false false true true true false true true false true true true false true true true true true true true true true false true true true true true true true true true true true true true true true true false true false true true true true true false true true true true true true true true true false true true true true true true true false true true true true true true true true true true true true true true true true true true false true true true true false true true true true true true false true true true true false true true true true true true true true true true true true true true false true true true true false true false true false true true true true true true true true false false true true true true true false true true true true true true true true true true true false true true true true true true true false true true true true true true true true true true true true true false true true true false true true true false false true true true true true true true true false true true true true true true true true true true true true true true true true false true true true true true true true true true true true false true true true true true true true true true true true true true true true true false true true true true true true false true true true true true true false true true false false true true true true true true true true true true true true true true false true true true true true true true true true true true true true true true true true true true true true true true false true true false false false true true true true true true true true true true true true false true true true true true true true true true true true true true true true true true true true true true true true true true false true true true true true true true true true true false true false true false true true true true false true true false true true true true true true true true true true true true true true true false true false true true true true true true true true true false true false true true true true true true true false true true false true true true true false true true false false true true true true true true true true true true true true false true true true true true true true true false true true false true true true true true true true true true false true false false false true true true false true true true true true true true false false false true true true true true false true true true true false true true true true true true true true true true true true false true true true false true true true false true true false true true true false true false true true true true true true true true true true true true true true true true true true true true true true true true true false true true true true false true true true false true true true true true false true true true true true false true true true true true false true true true true true true true false true true true true true true true true false true true true true true true false true false false true true true true true true true false false false true true true true true true true true true true true true true true true true true true true true false true true true true true true true true true true true true false true true true false true true true true true true false true true false false true true true true true true true true true true true true true true false true true true true true true true false true true true true true true true true true true true false true true true true true true false true true true true true false true true false true true true true true true true true true true true true false true true true true true true true true true true true true false true true true true true false false true false true true true true true true true true true true true true true true true true true true true true true true true true true false true true true true true true true true true true true true true true true true true true true true true true true true false true true true true true true false true true true true true true true true true true true true true false true false true true true true true true true true true true true true true false true true true true true true true false true true true true true true true true true true true true true false true true true true true true true true true true true true false true true true true true true true true true false true false true true true true true true true true true true true true true false true true true true true true true true true true true true true true false true false false true true true true false true true true true true true true true true true true true true true true true true true true true true false false true true true true true true true true true true true true true true true false true true true true true true true false true true false true true true true true true true true true true true true true true false true true true true true true true true true true true true true true true true true true false false true true true true true true true true true true true true true true true true true true true true false true true true true true true true true true true true true true true false true true true true true true true true true true false true true true true true true false false false true true true true true false true false true true true false true true true true true true false true true true true true true true false true false true true false true true true true true false true true true true true true true true true true true true true true true false true true true false true true true true true true true false true true true true true false true true true true true true false true true true true true true true false true true true true true true true true true true true false true true true true true true true true true true true true true true true true true true true true true true true true false true true true true false false true true true true true true true true true false true true true true true false true true true true true false true true true true true true true true true true true true true true true true true true false true true true true true true true false false true true false true true true true true false true true false true true true true true true true true true true true true false true true true true true true true true false true true true true true true true true true false true true true true true true true true true true true true true false true true true true true true true false true true true false true true true true true true true false true true true true true true true true true true true false true true true true true true true true true true true true true true true false true true true false true true true true true false false true true true true true true true true false true true true true true true true false false true true true true true true true false true true true true false true true true true false true false true true true true true true false true true true true true false true true false false true true true true false true true false true true true true true true true true true true true true true true false true true true true false true true true true false true false true true true true true true true true false true false false false true true true true true true true false true true true true true true true true false true true true true true true true true true false true true false true true true false true true true true true true true true true true true true true true true true true false true true true false true true false true true true false true false false true true true true false true true true true true true true false true true true true true true false true false true false true false false true true true true true true true true false true true true true true true true true true true true true true true false true true false true true true true true true true true true true true true false true true false true true true true true true true true true true true true true true true true true true true false true false false true true true true true true true false true true true false true false true true true true false true false true true true true true true true false false true true true true true true true true false true true false true false false false true true true false true true false true true true true false true true true true true true true true false true false true false true true true true true true true true true false true true true false true true true true true true true true true true true true true true true true true true true false true true false true true true true true true true true true true true true true true false true true true true true true true true true true true false true true true true true true true true true true true true true true true true true false true false false true true true true true true false true true true true true true true true true true true true false true true true true true true true true true true true true true true true false true true false true true true true true true true true true true true true true true true true true true false true true true false true false false true true true true false true true true true true true true true true true true true false true false true true true true true true true true true true true true true false false true true true true false true true true true true true true true true true true false true true true true true true true true false false true true true false false true true true false true true true true true true true true true true true true true true true true true false true true false true true true true true true true true true true true true true true false true true true true false true false false false true true true true true false true true true false true true true true true true true true true true false true true true false false true true true true true true true false true true true true true true true true true false false false true true true true true true true true true true false true true false false false true true true false true true true true true true true true true false true true true false true true true true true true true true true true true true true true true true true true true false true true true false true true false true true true true true true true true true true true true true true false true true true true true false true true true true true true true true true true true true false false true false false true true true false true true true true true true true true true true true true false true true true true true true true true true true true true true true true true true true true true true true true true true true true true false true false true true true true true true false true true false true true true true true true false true false true true true true false true true false true false true true true true true true true true false true true true false true true true true true false true true false false true true true true true true true true true true true false true true true false true true true true true true true true true true true false true false true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true false true true true true true true true true true true true false true true true false false true true true true true false true true false true true true true true true true true true true true true true true true true false true true false true true true true true true false true true true true true false true true true true true true true true true true false true true true false true true true false true true true true true true true true true true true true true true true true true false true true true true true true true true true true true true true true true true true true true true true true true false true true true true true true true true true true true false true true true true true true false false true true true true true true false false false true false true true true true true false true true true true true true true true true false true true false true true true true false true true true true true true true true true true true true true true true false true true true true false true true false true true true false true true false true true true true true true true true true true true true false true false false true true false false true true true true true false true true true true true true true true false true true true false true true true true true true true true true true true false true true true true true true true true false true true true true true false false true true true true true true true true true true false true true false true true true true true true true false true true true true true true true true true true false true true true true true true true true true true true true true true true true true false true true true true true true true true true false true false true true true true true true true true true true true false true true true true true false false true true true true true true true true true true true true true true true true true true false true true true true true true false true false true true true true true true true true true true true true true true false true true true true false true true true true true true true true false false true true true true true true true true true true true true true true true true true true true true true true true true true true true false true true false true true true true true true true true true true true true true true true true true true true true false true true true true true true true true true false true true true false false true false false true true true false true true true true true true true false false false true true false true false true true true true false true false true true true true true true true true true true false true true true true true false true true true true true true true true true true true true true true true true true true false true true true true true true true true true true true true false true true true false true true true true true true false true true true true true true false true true true true true true true true true true true false false true true true true true true true false true false true true true false true true true true true true true false true false true true true true true true true true true true true true true true true true true true true true true true true true true true true true false true true true true true true true true true true true true true true true true true true false true true true true true true true true true true false true true true false true true false true true false true false false true true true true true true true true false true true true true true false false true false true true false true true true true true true true true true true true true true true true true true true true true true true false false true true true true true true true true true true false true true true true true true true true false true true false true true true true true true true true true false true true true true true true false true true true true false true true true true true true true true true false true true false false false false true true true true true true true true true true false true false true true true true true true true true true true true true true false true true false true true true true true true true true true true true true true true true false true true true true true false false true true true false true true true false true false true true true true true true true false true true true true true true true true true false true true true true true true false true true true true false true true false true true true true true true true true false true true true true true false true true true true false true true true true true false true true true true true true true true false true true true true true true true true true true true true true true true true false true true true true false true true true true true true true true true true true true true true true false true true true true true true true true true true true true true false true true false true true false true true true false true false true true false true false true true true true true true true true true true true true true true true true true false false true true true true true true false true true false false true true true true true true true true false false true true true true true true true true true true false false false true true true false true true true true true false false true true true true true true true false false true true true true true true true true true false true true true true true true true true true true false true true true true false true false true true true true true true true true true true true true false true true true true true true true true true true true true true true true true true true true true true true true true true true true true true false false true true false true false true true true true false true true true true true true true true true true true true false true true false true true true true true true true true true true true false true true true true true true true true true true true true true true true true true true true true true true true true true false false true true true true true true true true true true true true true true false true true true true true true true true true true true true true false false true true true true true true true true true true true true true true false true true true false true true false true true true false true true true true true true true true true true true true true true true true true true true true true true false false true true true true true true true true true true true true false true true false false true false true true true true true true true false true true true true true true true true true true true false true true true true true true true true true true false true true true true true true true true true true true false true true true false true true true true true true true true true true true true true true false true true true true true true true true true true true false true true true true true true true true false true true true true true true true true true false true true true true true true true true true true true true true true true true true true false true true false true true true true true false true false true true true true true true true true true true true true true true true true true true true false true true true true false true true true true true true true true true true true true true false true true true true true true true true true true true false true true false true true false true true true true true true true true true true true true true true true true true false true true true true true true true true true true false true true true true true true true true true true true true true true true false true true true true true true true true true false true true true false true true true true false false true true true false true true true true true true false true true true true true true true true true true true false true true true true true false false true true true true true true true true false true true true true true true false false true true true true true false true true true true true true false true true true true true true true true true false true true true true true true true true true true true true true true true true false true true true false true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true false true true true true true true true true true true true true true true true true true true true true true true false true true true true true true true true true true false true true true true false true true false true true false true true true true true true true true true true true true true true true true true false true true true true true false true false true true true true true false true true true true true false true true false true true true true true true true true true true true true false true false true true false true true true true true true true true true true true true true true true true true false true true true true true true true false true true true true false true true true false true true true true true true false true false true true true true true true true true true false true true false true false true true true true true true true true true true true true true true true true true true true true true true false true true true true true true true true true true true true true true true true true true false true true true false true true true true true true true true true false true true false true false true true true true false true true true true true true true true true true true false true true true true true true true true false true true true false true true true true true true true true true true false true true true true false true true true true true true true true true false true true true true true true false true true false true false false false false false true true true true false true true true true false true true true true true true false true true false true true true true true true true true false true true true true true true true true true true true true true true true true true true true true true true true true true true true true false true true true true true false true true true true true true true true true true false true true true false true true true true true true true true true true true true true true true true true true true true true true true true true true true false false true true true true true true true true true true true true true true true true true false true true false false true true true true true true true true false true true true true true true true true true true true true true true true true true true true true true true true true true true false true true true true true true true false false false false true false true true true true true true true true true true true true true true true true false true false true false true true true true true false true true true false true true true true true true true true true true false true true true true true true true true true false true true true true true true true true true true true true false false false true true false true true true true true true false true true true true true true true true true true true true true true true true true false true true true true true false true true true true true true true false true true false true true true true true true true true false false true false false false true true true true true true true true true true true true false true true true true true false false true true true true true true true true true true true true true true true true true true true true true true false true true true true true false true true true true true true true true true true true false true true true true true true true true true true false true true true true true false true true true true true true true true true true true true true true true false true true true true true false true true true true true true true true true true true true true false true true true false false true true true true true true true true true false true true true true true true true false true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true false true true true true true true true true false true true true true true true true true true true false true false false true true true true true false true true true true true true false false true true true true true true true false false true true false true false true true false true false true true true true true true false true true true true true true true true true true true true true false true true true true true true true true true true true false true true true true true true false true true true true true true false true true true true true true true true true true true true true true true true true true true true true true true true true false true true true true true true true true true true true true false true true true true true true true false false true false true true true true true true true true true true true true true true true true true true true true false true true true true true true false true true true true true true true false false true true true true true true false true true true true true true true true false true true true true true true false true true false true true false true true false true true true true true true true true true true true true false true true false true true true true true true false true true false false true true true true true true true true true false true true true true true true true true true false true true true true true true true true true true true true true true true false true true true true true true true true true true true true true true false true true true true false false false true true true true true true true true true true false true true true true false true true false true true true true true true true true true true true true true true true true true false false true true true false true true true true true true true true true true true true true true false true true true true true true false true true true true true true false true true true false false false true true true true true true true true true true true true true true true true true true true true true true true true true true true false true true true false true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true false true true false true true true true false true true false true true true false true true true false true true true true false false true true true true true true true true true true true true true true true true true false true true true true true true true true true true true false true true true true true true true false false true true true true false true true true true true true true true true true true true true true true true false true true true true true true true true true true true true false true true true true true true false true true false true true true true true true true false true true true true true true true true true true true true true true true true true true true true false true true false true true true true false true true true true true true true true true true true true true true true true true true true true false true true true true true true false false false true true true false true true true true true false true true true true true true false true true true false false false false true true true true true true true true true true true true true true false false true true true true true true true true true true true true true true true true false false true true true true false true true true true true true false true true true true true true true true true true true true true true true true false true true true true true true true true false true true true true true true true true false true true true true false true true true true true true true true true true true true true false true true true true true true false true true true false true true true true true true true true true true true true true true true true true true true true true true false true true true true true true true true true true true true false true true false true true true true true true true true true true true false true false true false false true true false true true true true true true true true true true true false true true true true true true true true true true false true true true true true true true true false true false true true true true true true true true false false true true true true true true true true true true true true true true true true true false true true true true true true true false true true true true true true true true false true true true true true true false true true false true true true true true true true true true false true true true true true true true true true true true true true true true true true true true false true true true true true true true true true true true false true true true true false true true true false true true true true false true false true true true true true true false true true true false true true true true true true true true true true true true true true true false true true true true true true false true true false true true true true false true true true true true true true true true true true false true true true true false false false true true true true false true true true true true true true true true false true true true true true true true true true true false true false true true true true true true true true true true true true true false true false true true false false true true true true true true true true true true true true true true false true true true true false true true true true true true true false true true false true true true false true true true true true true true true true false true true true false true true true true true true true true true false true true true true true true true true true true true true true true true true true true false true true true true true true true false true true true true true true true true true true true true true false true false true true false true true false true false true true true true true false true true true true true true true true true false true true false true true true false true true true true true false true false true true true false true true false true true false true true false true true true true true true false true true true true true true false true false true true true true true false true true false false true true true true true true true true true false true true true true true false true true true true true true true true true true true false true true true true true false true true true true true true true true true true true true true true true true true true false true true true false true true true true true false true false true true true true true true false true true false true true true true true true true true true true true true true true true true true true true false true true true true true true true true true true true true true false true false true true true true true true true true true true true true true false true true false true true true false true true true true false true true true false true true true true true false true true false true true true true true true true true false true false true true true true true true true true true true false true true true true false true true true true true true false true true true true false true true true true true true true false true true true true true true true true false true false true true true true true true true true true true true true true true false true true true false true true false false true true false true true true true true true true true false true true true true true true true false true true true true true true true true false false true true true true true true true false true true true true true true true true true false true true true true true true true true false true true true true true true false true true true true true true true true false true true true true false true true true true true true true true true true true true true true true true true true true true true true true true true false true true true true true true true true true true true true true true true true true true true false true true true true true true true true true true false true true true true true false true true true true true false true true true true true true true true true true true true true true true true true true false true true false true false false true true true true true true true true true true true false true true true true true true true true true true true true true true true true false true true true false true true true true true true true true true false true true true true false true true true true false true true true true true true true true true true true true true true true true true true true true true true true true true true false true true true true false true true false true false false true true true true true true true true true true true false true true true true false false true true true true true true true true true true true false true true true true false true true true true true true true true true true true true true true true true true true true false true true true true true true true true true true true true true true true true true true true false false true false true true true true true true true true true true true true false true true true true true true true true true true true true false true false true true true true true true false true true true true true true false true true true true false true true true true true true true true true true true true true true true true false true false true true true true true false true true false true false true true true true true true true true true false true true false true true true true true true true false true true false true true true true true true true true true true false true true true true true true true true false true true true true true true true true true true true true true false true true true true true true true true true true true true false true true true true true true true true true false true true true true true true true true true false true true false true true true true true true true true true true true true true true true true false true true true true true false false true true true true true true true false true true true true true false true true true true true true true true false true true true false true true true true true false true false true true true true true true true true true false true true true true true true true true false true true true true true true true true true false true true true false true true true true true true true true false false true true true true true true false true true true true true true true true true true false true true false false true true true true false true true true true true true false true true true false true true false true true true true true true true true true true true true true true true true true true true true true true true true true true true true true false true true true true true false false false true false true true true true true true true true false true true true true true true true true false true true true true true true true true true true true true true true true true true true true false true true true true true true true true true true true true true false true true true true true true true true true true false true true true true true false true true true true true true true true true true true true true true true true true true true true true true true true true true false true true false true false true true true true true false true true true true true true true true true true false false true true true true true true true true true true false true true true true false true true true true true true true true true true true true true true true true true false true true false true true true true true true true true false true true true true true false true true false false true true true true true false false true true true false true true true true true true true true true false true true false true true true true true false true true false true true true true true true true true true true true true true true true true false true true true true true true true true true true false true true true true true true true true true true true true true true true true true false true true false false true true true true false true true false true true true true true false true true true true false true true true true true false false true true false true true true true false true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true false true true true true true true false true false true true true true true true true true false false true true true true true true true true true true true true true true true true true true true true true true true true true true true true true true false true true true true true true true true true true true true true true false true true true true false true false true true true true false true true true true true true false false true true true true true true true true false true true true true true true true true true true true true true true true true true true true true true true true true true true true true false true false true true true true true true false true true true true true true true true true true true false true true true true true true true true true true true true false true true true true false true false true true true true true true true true true true false true true true true true true true true true true true true true true false true true true true true true false true true false true true false true true true true false true false true true false true true true false true true true true true true false true true false true true false true true true true true true true true true true true true true true true true true true true true false true true false true true true true true true true true true true true true false false true true true true true true true false true true true true true true true true true true true false true true true true true true true true true true true false true true true true true false true true true true false true true true false true true true true true false true true true true true true false true true true true true true true true false true true true false true true true true true true true true true false true true true true true false true true true true true true true false true true true true true true true true true true true true true true true true true true true true true true true true true true true false true true false true true true true true false true true true true true true true true true true true true true false true true true true false false true false true true true true true true true true true true true false false true true true true true true true true false true true true true true true true true true true true true true true true true true true false true true true true true true true true true false true false true true true true true true true true true true false false false true true true true true true true true true true true true true true true true true true false true true true true true true false false true true true false true true true true false true true true true true true true true true false true true true false true true true true true true true true true true false true true true true true true true true true false true true true false true true true true true true true true true true true false true true true true true true true true true true true true true false false true true false true false true true true true true true true true false true true true false true true true true true true true false true true true true true true true false true true true true true true true true true true true true true true true true true true true true true true true false true true true true true true true true true true true true true true true true true true true false false true true true true true false true true true true true false true true true true true true true false false true true true true true true true true true true true true true true true false true false true true true true true true true true true false true true false true true false false true true true true true false true true true true true true true true true true true true true true true false true false true true true true false true true true true true true true true true true false true false true true true true true true true true true true true true true true true true true true true true true true true false true true true true true false true false true false true true true true true true true true false true true true true true true true true true true true false true true true true false true true false true true true true true true true false true false true true true true true true true true true true true true true true true true false true true true true true true true true false true true false false true true true true true true true true true true true true true true true true true true false false false true false true true true true true true false true true true true true true true true true true true true true true true true true true true true true true true true true true true true false true true true true true true true false true true false true true true false true true true true true true true true true true true true true true true true true true true true true true true true true true true true false true true true true true true true true true true true true true true true true false true true true true true true true true true true true true true true true true true true true true false true true false true true true true true true true true true true true true true true true true true false false true true true true true true true true false true true true true true true true true true false true true true true true false true true false true true true true true true true true true true true true false true true true true true false true true true true true true false true false true true true true true false true true true true true true true true true true true true true true true true true true true true true true true true", isHidden: true },
    ],
    hints: [
      "You need to remember something per distinct message.",
      "Store the last time each message was actually printed in a hash map.",
      "A suppressed message must not refresh its stored time; only update the map when you print.",
    ],
    editorial:
      "Keep a hash map message -> last printed timestamp. For a new call, print when the message is absent or timestamp - last >= 10, and in that case store the new timestamp. Each call is O(1) time; memory grows with the number of distinct messages.",
    solutions: {
      javascript: code`
        function solve(input) {
          const last = new Map();
          const out = [];
          for (const line of input.trim().split("\n")) {
            const cut = line.indexOf(" ");
            const ts = Number(line.slice(0, cut));
            const msg = line.slice(cut + 1).trim();
            if (!last.has(msg) || ts - last.get(msg) >= 10) {
              last.set(msg, ts);
              out.push("true");
            } else {
              out.push("false");
            }
          }
          return out.join(" ");
        }
      `,
      python: code`
        def solve(input_str):
            last = {}
            out = []
            for line in input_str.strip().split("\n"):
                ts_text, msg = line.split(" ", 1)
                ts = int(ts_text)
                msg = msg.strip()
                if msg not in last or ts - last[msg] >= 10:
                    last[msg] = ts
                    out.append("true")
                else:
                    out.append("false")
            return " ".join(out)
      `,
    },
  },
  {
    title: "Search Insert Position",
    difficulty: "Easy",
    companies: ["Amazon", "Microsoft", "Apple", "Adobe"],
    description:
      "Given a sorted array of distinct integers `nums` and a value `target`, print the index where `target` is found. If it is not present, print the index where it would be inserted to keep the array sorted.\n\nYour algorithm should run in O(log n) time.",
    constraints: "1 <= nums.length <= 10^5\n-10^9 <= nums[i], target <= 10^9\nnums is sorted in strictly increasing order.",
    inputFormat: "Line 1: space-separated integers `nums`.\nLine 2: the integer `target`.",
    outputFormat: "A single integer: the index of `target` or its insertion index.",
    examples: [
      { input: "1 3 5 6\n5", output: "2" },
      { input: "1 3 5 6\n2", output: "1", explanation: "2 would be inserted between 1 and 3, at index 1." },
    ],
    testCases: [
      { input: "1 3 5 6\n5", expectedOutput: "2", isHidden: false },
      { input: "1 3 5 6\n2", expectedOutput: "1", isHidden: false },
      { input: "1 3 5 6\n7", expectedOutput: "4", isHidden: true },
      { input: "1 3 5 6\n0", expectedOutput: "0", isHidden: true },
      { input: "1\n1", expectedOutput: "0", isHidden: true },
      { input: "-10 -3 0 4\n-5", expectedOutput: "1", isHidden: true },
      { input: "2 4\n3", expectedOutput: "1", isHidden: true },
      { input: INSERT_POS_PERF, expectedOutput: "61234", isHidden: true },
    ],
    hints: [
      "The answer is the number of elements strictly smaller than `target`.",
      "Because the array is sorted, binary search can find the first index whose value is >= target.",
      "If every element is smaller than `target`, that index equals nums.length.",
    ],
    editorial:
      "This is the classic lower bound. Maintain lo = 0, hi = n; while lo < hi compute mid and either set hi = mid (nums[mid] >= target) or lo = mid + 1. The final lo is both the match index and the insertion point. Time O(log n), space O(1).",
    solutions: {
      javascript: code`
        function solve(input) {
          const lines = input.trim().split("\n");
          const nums = lines[0].trim().split(/\s+/).map(Number);
          const target = Number(lines[1]);
          let lo = 0;
          let hi = nums.length;
          while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (nums[mid] >= target) hi = mid;
            else lo = mid + 1;
          }
          return String(lo);
        }
      `,
      python: code`
        def solve(input_str):
            lines = input_str.strip().split("\n")
            nums = list(map(int, lines[0].split()))
            target = int(lines[1])
            lo, hi = 0, len(nums)
            while lo < hi:
                mid = (lo + hi) // 2
                if nums[mid] >= target:
                    hi = mid
                else:
                    lo = mid + 1
            return str(lo)
      `,
    },
  },
  // --------------------------------------------------------------------------------------- Medium
  {
    title: "Design Hit Counter",
    difficulty: "Medium",
    companies: ["Google", "Amazon", "Microsoft", "Atlassian"],
    description:
      "Design a counter that records website hits and reports how many hits happened in the last 5 minutes.\n\nYou receive a sequence of operations with timestamps in seconds (timestamps never decrease across the whole input):\n\n- `hit t` records one hit at time `t`. Several hits can share the same timestamp.\n- `count t` reports the number of hits with timestamp in the window `(t - 300, t]`, i.e. hits that happened strictly less than 300 seconds before `t`, up to and including `t`.\n\nOutput the answer of every `count` operation.",
    constraints: "1 <= number of operations <= 3 * 10^4\n1 <= t <= 10^9, non-decreasing\nThere is at least one `count` operation.\nThe number of hits can be large, so avoid storing one entry per second.",
    inputFormat: "One operation per line: `hit t` or `count t`.",
    outputFormat: "Space-separated results of the `count` operations, in order.",
    examples: [
      {
        input: "hit 1\nhit 2\nhit 3\ncount 4\nhit 300\ncount 300\ncount 301",
        output: "3 4 3",
        explanation: "At time 301 the window is (1, 301], so the hit at time 1 has expired.",
      },
      { input: "hit 1\nhit 1\nhit 2\ncount 2\ncount 301\ncount 302", output: "3 1 0" },
    ],
    testCases: [
      { input: "hit 1\nhit 2\nhit 3\ncount 4\nhit 300\ncount 300\ncount 301", expectedOutput: "TODO", isHidden: false },
      { input: "hit 1\nhit 1\nhit 2\ncount 2\ncount 301\ncount 302", expectedOutput: "TODO", isHidden: false },
      { input: "count 5", expectedOutput: "TODO", isHidden: true },
      { input: "hit 10\ncount 309\ncount 310\ncount 311", expectedOutput: "TODO", isHidden: true },
      { input: "hit 5\nhit 5\nhit 5\nhit 5\ncount 5\ncount 304\ncount 305", expectedOutput: "TODO", isHidden: true },
      { input: "hit 1\ncount 1\nhit 100\ncount 100\nhit 400\ncount 400\nhit 700\ncount 700\ncount 1000", expectedOutput: "TODO", isHidden: true },
      { input: HIT_COUNTER_PERF, expectedOutput: "TODO", isHidden: true },
    ],
    hints: [
      "Only hits from the last 300 seconds matter, and timestamps arrive in non-decreasing order.",
      "Keep hits in a queue ordered by time and drop entries from the front once they leave the window.",
      "Group equal timestamps into one (time, count) entry and maintain a running total so each operation is amortised O(1).",
    ],
    editorial:
      "Because time only moves forward, expired hits are always at the front. Store (timestamp, hitsAtThatTimestamp) pairs in a queue plus a running total. On `hit`, bump the last pair or append a new one. On `count t`, pop pairs with timestamp <= t - 300, subtracting their counts from the total, then report the total. Each pair is pushed and popped once: amortised O(1) per operation, memory bounded by the number of distinct timestamps in the window (at most 300).",
    solutions: {
      javascript: code`
        function solve(input) {
          const times = [];
          const counts = [];
          let head = 0;
          let total = 0;
          const out = [];
          for (const line of input.trim().split("\n")) {
            const parts = line.trim().split(/\s+/);
            const t = Number(parts[1]);
            if (parts[0] === "hit") {
              if (times.length > 0 && times[times.length - 1] === t) counts[counts.length - 1]++;
              else {
                times.push(t);
                counts.push(1);
              }
              total++;
            } else {
              while (head < times.length && times[head] <= t - 300) {
                total -= counts[head];
                head++;
              }
              out.push(total);
            }
          }
          return out.join(" ");
        }
      `,
      python: code`
        from collections import deque


        def solve(input_str):
            window = deque()  # [timestamp, hits]
            total = 0
            out = []
            for line in input_str.strip().split("\n"):
                op, t_text = line.split()
                t = int(t_text)
                if op == "hit":
                    if window and window[-1][0] == t:
                        window[-1][1] += 1
                    else:
                        window.append([t, 1])
                    total += 1
                else:
                    while window and window[0][0] <= t - 300:
                        total -= window.popleft()[1]
                    out.append(str(total))
            return " ".join(out)
      `,
    },
  },
  {
    title: "Insert Delete GetRandom O(1)",
    difficulty: "Medium",
    companies: ["Amazon", "Meta", "Google", "Uber"],
    description:
      "Design a set of integers that supports `insert`, `remove` and `pick` in average O(1) time. The classic problem asks for a uniformly random element; to keep the output deterministic, `pick` here takes an explicit index into the structure's internal array.\n\nThe structure keeps an array `A` of its elements:\n\n- `insert x`: if `x` is already present print `false`; otherwise append `x` to the end of `A` and print `true`.\n- `remove x`: if `x` is absent print `false`; otherwise move the **last** element of `A` into the slot that held `x`, shrink `A` by one and print `true`. (If `x` itself is last, it is simply dropped.)\n- `pick k`: print `A[k]`. It is guaranteed that `0 <= k < size`.\n\nThe swap-with-last rule is what makes deletion O(1): you need a hash map from value to its position in `A`.",
    constraints: "1 <= number of operations <= 3 * 10^4\n-10^9 <= x <= 10^9\n`pick` is only issued when the set is non-empty and 0 <= k < size.",
    inputFormat: "One operation per line: `insert x`, `remove x` or `pick k`.",
    outputFormat: "Space-separated outputs of all operations in order (`true`, `false` or an integer).",
    examples: [
      {
        input: "insert 1\nremove 2\ninsert 2\npick 1\nremove 1\ninsert 2\npick 0",
        output: "true false true 2 true false 2",
        explanation: "After the first three steps A = [1, 2]. Removing 1 moves 2 into slot 0, so A = [2].",
      },
      {
        input: "insert 5\ninsert 6\ninsert 7\ninsert 8\nremove 6\npick 1\npick 2",
        output: "true true true true true 8 7",
        explanation: "Removing 6 (slot 1) moves the last element 8 there: A = [5, 8, 7].",
      },
    ],
    testCases: [
      { input: "insert 1\nremove 2\ninsert 2\npick 1\nremove 1\ninsert 2\npick 0", expectedOutput: "TODO", isHidden: false },
      { input: "insert 5\ninsert 6\ninsert 7\ninsert 8\nremove 6\npick 1\npick 2", expectedOutput: "TODO", isHidden: false },
      { input: "insert -3\npick 0", expectedOutput: "TODO", isHidden: true },
      { input: "insert 4\nremove 4\nremove 4\ninsert 4\npick 0", expectedOutput: "TODO", isHidden: true },
      { input: "insert 1\ninsert 2\ninsert 3\nremove 3\nremove 1\npick 0\ninsert 9\npick 1", expectedOutput: "TODO", isHidden: true },
      { input: "insert 0\ninsert 0\ninsert -1\nremove 0\npick 0\nremove -1\ninsert 7\npick 0", expectedOutput: "TODO", isHidden: true },
      { input: RANDOM_SET_PERF, expectedOutput: "TODO", isHidden: true },
    ],
    hints: [
      "A hash set gives O(1) insert/remove/contains, but it cannot return the element at a given index.",
      "An array gives O(1) index access, but deleting from the middle shifts elements.",
      "Store values in an array plus a map value -> index; to delete, overwrite the slot with the last element, update that element's index, and pop.",
    ],
    editorial:
      "Keep `A` (dynamic array) and `pos` (value -> index in A). insert appends and records the index. remove reads i = pos[x], copies the last element into A[i], updates pos[last] = i, pops A and deletes pos[x]. pick(k) is A[k]. In the original problem, pick(random index) is uniformly random precisely because A has no holes. All operations are O(1) average time with O(n) space.",
    solutions: {
      javascript: code`
        function solve(input) {
          const arr = [];
          const pos = new Map();
          const out = [];
          for (const line of input.trim().split("\n")) {
            const parts = line.trim().split(/\s+/);
            const v = Number(parts[1]);
            if (parts[0] === "insert") {
              if (pos.has(v)) out.push("false");
              else {
                pos.set(v, arr.length);
                arr.push(v);
                out.push("true");
              }
            } else if (parts[0] === "remove") {
              if (!pos.has(v)) out.push("false");
              else {
                const i = pos.get(v);
                const last = arr[arr.length - 1];
                arr[i] = last;
                pos.set(last, i);
                arr.pop();
                pos.delete(v);
                out.push("true");
              }
            } else {
              out.push(String(arr[v]));
            }
          }
          return out.join(" ");
        }
      `,
      python: code`
        def solve(input_str):
            arr = []
            pos = {}
            out = []
            for line in input_str.strip().split("\n"):
                op, text = line.split()
                v = int(text)
                if op == "insert":
                    if v in pos:
                        out.append("false")
                    else:
                        pos[v] = len(arr)
                        arr.append(v)
                        out.append("true")
                elif op == "remove":
                    if v not in pos:
                        out.append("false")
                    else:
                        i = pos[v]
                        last = arr[-1]
                        arr[i] = last
                        pos[last] = i
                        arr.pop()
                        del pos[v]
                        out.append("true")
                else:
                    out.append(str(arr[v]))
            return " ".join(out)
      `,
    },
  },
  {
    title: "Set Matrix Zeroes",
    difficulty: "Medium",
    companies: ["Microsoft", "Amazon", "Apple", "Adobe"],
    description:
      "Given an `m x n` integer matrix, whenever an element is `0` set its entire row and its entire column to `0`. All zeroing is based on the **original** matrix: zeros created by the operation must not trigger further zeroing.\n\nPrint the resulting matrix. Try to do it in place with O(1) extra space (use the first row and first column as markers).",
    constraints: "1 <= m, n <= 200\n-2^31 <= matrix[i][j] <= 2^31 - 1",
    inputFormat: "Line 1: `m n`.\nNext `m` lines: `n` space-separated integers (one matrix row each).",
    outputFormat: "`m` lines of `n` space-separated integers: the final matrix.",
    examples: [
      {
        input: "3 3\n1 1 1\n1 0 1\n1 1 1",
        output: "1 0 1\n0 0 0\n1 0 1",
        explanation: "The only zero is at row 1, column 1, so that row and column are cleared.",
      },
      {
        input: "3 4\n0 1 2 0\n3 4 5 2\n1 3 1 5",
        output: "0 0 0 0\n0 4 5 0\n0 3 1 0",
      },
    ],
    testCases: [
      { input: "3 3\n1 1 1\n1 0 1\n1 1 1", expectedOutput: "TODO", isHidden: false },
      { input: "3 4\n0 1 2 0\n3 4 5 2\n1 3 1 5", expectedOutput: "TODO", isHidden: false },
      { input: "1 1\n0", expectedOutput: "TODO", isHidden: true },
      { input: "1 1\n7", expectedOutput: "TODO", isHidden: true },
      { input: "1 4\n3 0 5 6", expectedOutput: "TODO", isHidden: true },
      { input: "4 1\n2\n-1\n0\n9", expectedOutput: "TODO", isHidden: true },
      { input: "2 2\n-5 3\n8 -2", expectedOutput: "TODO", isHidden: true },
      { input: "3 3\n1 2 3\n4 5 6\n7 8 0", expectedOutput: "TODO", isHidden: true },
      { input: "3 3\n0 0 0\n0 0 0\n0 0 0", expectedOutput: "TODO", isHidden: true },
      { input: "3 3\n5 1 1\n0 2 2\n3 4 4", expectedOutput: "TODO", isHidden: true },
      { input: SET_ZEROES_PERF, expectedOutput: "TODO", isHidden: true },
    ],
    hints: [
      "Zeroing while you scan is wrong: new zeros would wrongly clear more rows and columns.",
      "First record which rows and which columns contain a zero, then do a second pass to clear them.",
      "To save space, reuse the first row and first column as the 'this column/row has a zero' flags, remembering separately whether the first row/column themselves originally contained a zero.",
    ],
    editorial:
      "Two passes. Pass 1: for every zero at (i, j) mark row i and column j. Pass 2: set every cell whose row or column is marked to 0. The marks can live inside the matrix: store them in matrix[i][0] and matrix[0][j] for i, j >= 1, with two booleans for whether row 0 and column 0 contained zeros. Process the inner cells first, then the first row and column. Time O(mn), space O(1).",
    solutions: {
      javascript: code`
        function solve(input) {
          const lines = input.trim().split("\n");
          const [m, n] = lines[0].trim().split(/\s+/).map(Number);
          const g = [];
          for (let i = 0; i < m; i++) g.push(lines[1 + i].trim().split(/\s+/).map(Number));
          let firstRow = false;
          let firstCol = false;
          for (let j = 0; j < n; j++) if (g[0][j] === 0) firstRow = true;
          for (let i = 0; i < m; i++) if (g[i][0] === 0) firstCol = true;
          for (let i = 1; i < m; i++) {
            for (let j = 1; j < n; j++) {
              if (g[i][j] === 0) {
                g[i][0] = 0;
                g[0][j] = 0;
              }
            }
          }
          for (let i = 1; i < m; i++) {
            for (let j = 1; j < n; j++) {
              if (g[i][0] === 0 || g[0][j] === 0) g[i][j] = 0;
            }
          }
          if (firstRow) for (let j = 0; j < n; j++) g[0][j] = 0;
          if (firstCol) for (let i = 0; i < m; i++) g[i][0] = 0;
          return g.map((row) => row.join(" ")).join("\n");
        }
      `,
      python: code`
        def solve(input_str):
            lines = input_str.strip().split("\n")
            m, n = map(int, lines[0].split())
            g = [list(map(int, lines[1 + i].split())) for i in range(m)]
            first_row = any(g[0][j] == 0 for j in range(n))
            first_col = any(g[i][0] == 0 for i in range(m))
            for i in range(1, m):
                for j in range(1, n):
                    if g[i][j] == 0:
                        g[i][0] = 0
                        g[0][j] = 0
            for i in range(1, m):
                for j in range(1, n):
                    if g[i][0] == 0 or g[0][j] == 0:
                        g[i][j] = 0
            if first_row:
                for j in range(n):
                    g[0][j] = 0
            if first_col:
                for i in range(m):
                    g[i][0] = 0
            return "\n".join(" ".join(map(str, row)) for row in g)
      `,
    },
  },
  {
    title: "Search in Rotated Sorted Array",
    difficulty: "Medium",
    companies: ["Amazon", "Microsoft", "Meta", "Google"],
    description:
      "A sorted array of **distinct** integers was rotated at an unknown pivot, e.g. `[0 1 2 4 5 6 7]` may become `[4 5 6 7 0 1 2]`. Given the rotated array `nums` and an integer `target`, print the index of `target`, or `-1` if it is not present.\n\nYou must solve it in O(log n) time.",
    constraints: "1 <= nums.length <= 10^5\n-10^9 <= nums[i], target <= 10^9\nAll values are distinct. The array is a rotation of a strictly increasing array (possibly by 0).",
    inputFormat: "Line 1: space-separated integers `nums`.\nLine 2: the integer `target`.",
    outputFormat: "The index of `target`, or -1.",
    examples: [
      { input: "4 5 6 7 0 1 2\n0", output: "4" },
      { input: "4 5 6 7 0 1 2\n3", output: "-1", explanation: "3 does not appear in the array." },
    ],
    testCases: [
      { input: "4 5 6 7 0 1 2\n0", expectedOutput: "TODO", isHidden: false },
      { input: "4 5 6 7 0 1 2\n3", expectedOutput: "TODO", isHidden: false },
      { input: "1\n0", expectedOutput: "TODO", isHidden: true },
      { input: "1\n1", expectedOutput: "TODO", isHidden: true },
      { input: "1 3\n3", expectedOutput: "TODO", isHidden: true },
      { input: "3 1\n1", expectedOutput: "TODO", isHidden: true },
      { input: "1 2 3 4 5\n5", expectedOutput: "TODO", isHidden: true },
      { input: "5 1 2 3 4\n5", expectedOutput: "TODO", isHidden: true },
      { input: "-4 -3 -1 7 9 -10 -8\n-8", expectedOutput: "TODO", isHidden: true },
      { input: "6 7 8 1 2 3 4 5\n8", expectedOutput: "TODO", isHidden: true },
      { input: ROTATED_PERF, expectedOutput: "TODO", isHidden: true },
    ],
    hints: [
      "Whichever way you split the array at mid, at least one of the two halves is still sorted.",
      "Decide which half is sorted by comparing nums[lo] with nums[mid].",
      "Check whether target lies inside the sorted half's value range; if so search that half, otherwise search the other.",
    ],
    editorial:
      "At every step compare nums[lo] <= nums[mid]: if true the left half [lo, mid] is sorted, otherwise the right half [mid, hi] is. If target fits inside the sorted half's bounds, discard the other half; if not, discard the sorted half. Because all values are distinct the check is unambiguous. Time O(log n), space O(1).",
    solutions: {
      javascript: code`
        function solve(input) {
          const lines = input.trim().split("\n");
          const nums = lines[0].trim().split(/\s+/).map(Number);
          const target = Number(lines[1]);
          let lo = 0;
          let hi = nums.length - 1;
          while (lo <= hi) {
            const mid = (lo + hi) >> 1;
            if (nums[mid] === target) return String(mid);
            if (nums[lo] <= nums[mid]) {
              if (nums[lo] <= target && target < nums[mid]) hi = mid - 1;
              else lo = mid + 1;
            } else {
              if (nums[mid] < target && target <= nums[hi]) lo = mid + 1;
              else hi = mid - 1;
            }
          }
          return "-1";
        }
      `,
      python: code`
        def solve(input_str):
            lines = input_str.strip().split("\n")
            nums = list(map(int, lines[0].split()))
            target = int(lines[1])
            lo, hi = 0, len(nums) - 1
            while lo <= hi:
                mid = (lo + hi) // 2
                if nums[mid] == target:
                    return str(mid)
                if nums[lo] <= nums[mid]:
                    if nums[lo] <= target < nums[mid]:
                        hi = mid - 1
                    else:
                        lo = mid + 1
                else:
                    if nums[mid] < target <= nums[hi]:
                        lo = mid + 1
                    else:
                        hi = mid - 1
            return "-1"
      `,
    },
  },
  {
    title: "Find Peak Element",
    difficulty: "Medium",
    companies: ["Google", "Amazon", "Microsoft", "Meta"],
    description:
      "An element of `nums` is a *peak* if it is strictly greater than its neighbours. Treat both ends as if they were surrounded by negative infinity, so `nums[0]` is a peak when `nums[0] > nums[1]` and the last element is a peak when it is greater than the one before it. Adjacent elements are never equal.\n\nPrint the index of the **leftmost** peak. (The original problem accepts any peak, which a binary search can find in O(log n) by always walking uphill; asking for the leftmost one makes the answer unique for this judge, and walking up the first slope finds it directly.)",
    constraints: "1 <= nums.length <= 10^5\n-2^31 <= nums[i] <= 2^31 - 1\nnums[i] != nums[i + 1] for all valid i.",
    inputFormat: "One line of space-separated integers `nums`.",
    outputFormat: "The 0-based index of the leftmost peak.",
    examples: [
      { input: "1 2 3 1", output: "2", explanation: "3 is the only peak." },
      { input: "1 2 1 3 5 6 4", output: "1", explanation: "Peaks are at indices 1 (value 2) and 5 (value 6); the leftmost is 1." },
    ],
    testCases: [
      { input: "1 2 3 1", expectedOutput: "TODO", isHidden: false },
      { input: "1 2 1 3 5 6 4", expectedOutput: "TODO", isHidden: false },
      { input: "5", expectedOutput: "TODO", isHidden: true },
      { input: "1 2", expectedOutput: "TODO", isHidden: true },
      { input: "2 1", expectedOutput: "TODO", isHidden: true },
      { input: "9 7 5 3 1", expectedOutput: "TODO", isHidden: true },
      { input: "1 3 5 7 9", expectedOutput: "TODO", isHidden: true },
      { input: "-4 -2 -7 -1 -9 -3", expectedOutput: "TODO", isHidden: true },
      { input: PEAK_PERF, expectedOutput: "TODO", isHidden: true },
      { input: PEAK_PERF_SORTED, expectedOutput: "TODO", isHidden: true },
    ],
    hints: [
      "Because neighbours are never equal and the borders count as -infinity, a peak always exists.",
      "If nums[i] < nums[i + 1] the sequence is still climbing: a peak must exist at or after i + 1.",
      "Start at index 0 and keep moving right while the next element is larger; the first index where the climb stops is the leftmost peak.",
    ],
    editorial:
      "Climb from the left: while i + 1 < n and nums[i] < nums[i + 1], advance i. At the first i where the next value is smaller (or the array ends), nums[i-1] < nums[i] > nums[i+1], so i is a peak, and no earlier index can be one because the array was strictly increasing up to i. This is O(n). The same 'follow the uphill neighbour' argument powers the O(log n) binary search that finds an arbitrary peak: compare nums[mid] with nums[mid + 1] and keep the side that rises.",
    solutions: {
      javascript: code`
        function solve(input) {
          const nums = input.trim().split(/\s+/).map(Number);
          let i = 0;
          while (i + 1 < nums.length && nums[i] < nums[i + 1]) i++;
          return String(i);
        }
      `,
      python: code`
        def solve(input_str):
            nums = list(map(int, input_str.split()))
            i = 0
            while i + 1 < len(nums) and nums[i] < nums[i + 1]:
                i += 1
            return str(i)
      `,
    },
  },
  {
    title: "Capacity To Ship Packages Within D Days",
    difficulty: "Medium",
    companies: ["Amazon", "Google", "Meta"],
    description:
      "A conveyor belt carries packages with weights `weights[0..n-1]`, and they must be shipped **in the given order** to another port within `days` days. Each day you load the ship with consecutive packages (in order) without exceeding the ship's weight capacity.\n\nPrint the least ship capacity that lets you ship all packages within `days` days.",
    constraints: "1 <= days <= weights.length <= 5 * 10^4\n1 <= weights[i] <= 500",
    inputFormat: "Line 1: space-separated integers `weights`.\nLine 2: the integer `days`.",
    outputFormat: "A single integer: the minimum capacity.",
    examples: [
      {
        input: "1 2 3 4 5 6 7 8 9 10\n5",
        output: "15",
        explanation: "Capacity 15 gives days (1 2 3 4 5), (6 7), (8), (9), (10).",
      },
      { input: "3 2 2 4 1 4\n3", output: "6", explanation: "(3 2), (2 4), (1 4)." },
    ],
    testCases: [
      { input: "1 2 3 4 5 6 7 8 9 10\n5", expectedOutput: "TODO", isHidden: false },
      { input: "3 2 2 4 1 4\n3", expectedOutput: "TODO", isHidden: false },
      { input: "1 2 3 1 1\n4", expectedOutput: "TODO", isHidden: true },
      { input: "10\n1", expectedOutput: "TODO", isHidden: true },
      { input: "5 5 5\n3", expectedOutput: "TODO", isHidden: true },
      { input: "5 5 5\n1", expectedOutput: "TODO", isHidden: true },
      { input: "500 1 1 1\n2", expectedOutput: "TODO", isHidden: true },
      { input: "1 1 1 1 1 1 1 500\n3", expectedOutput: "TODO", isHidden: true },
      { input: SHIP_PERF, expectedOutput: "TODO", isHidden: true },
      { input: SHIP_PERF_ONES, expectedOutput: "7143", isHidden: true },
    ],
    hints: [
      "The capacity can never be below the heaviest package, and never needs to exceed the total weight.",
      "For a fixed capacity you can greedily count the days needed: start a new day whenever the next package does not fit.",
      "More capacity never needs more days, so binary search the smallest capacity whose greedy day count is <= days.",
    ],
    editorial:
      "Binary search on the answer in [max(weights), sum(weights)]. feasible(c) simulates the shipping greedily (new day when the running load would exceed c) and returns days_used <= days; it is monotone in c. The smallest feasible capacity is the answer. Time O(n log(sum)), space O(1).",
    solutions: {
      javascript: code`
        function solve(input) {
          const lines = input.trim().split("\n");
          const weights = lines[0].trim().split(/\s+/).map(Number);
          const days = Number(lines[1]);
          let lo = 0;
          let hi = 0;
          for (const w of weights) {
            lo = Math.max(lo, w);
            hi += w;
          }
          const feasible = (cap) => {
            let used = 1;
            let load = 0;
            for (const w of weights) {
              if (load + w > cap) {
                used++;
                load = 0;
              }
              load += w;
            }
            return used <= days;
          };
          while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (feasible(mid)) hi = mid;
            else lo = mid + 1;
          }
          return String(lo);
        }
      `,
      python: code`
        def solve(input_str):
            lines = input_str.strip().split("\n")
            weights = list(map(int, lines[0].split()))
            days = int(lines[1])
            lo, hi = max(weights), sum(weights)

            def feasible(cap):
                used, load = 1, 0
                for w in weights:
                    if load + w > cap:
                        used += 1
                        load = 0
                    load += w
                return used <= days

            while lo < hi:
                mid = (lo + hi) // 2
                if feasible(mid):
                    hi = mid
                else:
                    lo = mid + 1
            return str(lo)
      `,
    },
  },
  // @@NEXT@@
];
