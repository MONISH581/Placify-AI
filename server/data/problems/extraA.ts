/**
 * Extra problems, batch A: arrays, strings, linked lists, hashing, two pointers.
 *
 * Large "performance" inputs are generated deterministically (seeded PRNG). Their expected outputs come from the
 * simple, independent helper functions below (or from literals computed offline with a brute-force script) and
 * never from the reference solutions.
 */

import { code, type ProblemSpec } from "../problemHelpers";

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

const vis = (input: string, expectedOutput: string) => ({ input, expectedOutput, isHidden: false });
const hid = (input: string, expectedOutput: string) => ({ input, expectedOutput, isHidden: true });

// ---------------------------------------------------------------------------------------------
// Product of Array Except Self: +-1 values with a few 2s (product stays tiny); expected via total / nums[i].
// ---------------------------------------------------------------------------------------------
const PRODUCT_BASE = (() => {
  const next = seededRandom(1101);
  const nums: number[] = Array.from({ length: 30000 }, () => (next(2) ? 1 : -1));
  for (const at of [3, 7000, 15000, 29999]) nums[at] = 2;
  return nums;
})();
const PRODUCT_WITH_ZERO = PRODUCT_BASE.map((v, i) => (i === 12345 ? 0 : v));

function productByDivision(nums: number[]): string {
  let total = 1;
  let zeros = 0;
  for (const v of nums) {
    if (v === 0) zeros++;
    else total *= v;
  }
  return nums
    .map((v) => {
      if (zeros > 1) return 0;
      if (zeros === 1) return v === 0 ? total : 0;
      return total / v;
    })
    .join(" ");
}

// ---------------------------------------------------------------------------------------------
// Maximum Subarray: O(n^2) brute force for 3000 values; the 100000-value case has a literal answer (see below).
// ---------------------------------------------------------------------------------------------
const MAX_SUB_SMALL = randomInts(1201, 3000, 2001, -1000);
function maxSubarrayBrute(nums: number[]): number {
  let best = -Infinity;
  for (let i = 0; i < nums.length; i++) {
    let sum = 0;
    for (let j = i; j < nums.length; j++) {
      sum += nums[j];
      if (sum > best) best = sum;
    }
  }
  return best;
}
const MAX_SUB_BIG = randomInts(1202, 100000, 20001, -10000);
// Computed offline with a divide-and-conquer implementation in Python (independent of Kadane).
const MAX_SUB_BIG_EXPECTED = "1916860";

// ---------------------------------------------------------------------------------------------
// Rotate Array: expected via direct index mapping out[(i + k) % n] = nums[i].
// ---------------------------------------------------------------------------------------------
const ROTATE_NUMS = randomInts(1301, 100000, 2000001, -1000000);
const ROTATE_K = 999999937;
function rotateByMapping(nums: number[], k: number): string {
  const n = nums.length;
  const out = new Array<number>(n);
  const shift = k % n;
  for (let i = 0; i < n; i++) out[(i + shift) % n] = nums[i];
  return out.join(" ");
}

// ---------------------------------------------------------------------------------------------
// Merge Intervals: expected by marking every covered point on a doubled-coordinate lattice (closed intervals that
// touch share a lattice point; intervals with a gap never do), then reading off the covered runs.
// ---------------------------------------------------------------------------------------------
const INTERVALS_PERF = (() => {
  const next = seededRandom(1401);
  const list: [number, number][] = [];
  for (let i = 0; i < 20000; i++) {
    const start = next(1000000);
    list.push([start, start + next(60)]);
  }
  return list;
})();
function mergeByLattice(intervals: [number, number][]): string {
  const size = 2 * 1000100 + 3;
  const covered = new Uint8Array(size);
  for (const [a, b] of intervals) for (let p = 2 * a; p <= 2 * b; p++) covered[p] = 1;
  const rows: string[] = [];
  let p = 0;
  while (p < size) {
    if (!covered[p]) {
      p++;
      continue;
    }
    let q = p;
    while (q + 1 < size && covered[q + 1]) q++;
    rows.push(p / 2 + " " + q / 2);
    p = q + 1;
  }
  return rows.join("\n");
}

// ---------------------------------------------------------------------------------------------
// Longest Palindromic Substring: expected by testing every substring from the longest length down (leftmost first).
// ---------------------------------------------------------------------------------------------
function leftmostLongestPalindromeBrute(s: string): string {
  const isPalindrome = (i: number, j: number) => {
    while (i < j) if (s[i++] !== s[j--]) return false;
    return true;
  };
  for (let len = s.length; len >= 1; len--) {
    for (let i = 0; i + len <= s.length; i++) if (isPalindrome(i, i + len - 1)) return s.slice(i, i + len);
  }
  return "";
}
const PALINDROME_RANDOM = randomLetters(1501, 1000, "ab");
const PALINDROME_ALTERNATING = "ab".repeat(500);
const PALINDROME_MIRROR = randomLetters(1502, 600, "abc") + "x" + randomLetters(1503, 5, "abc");

// ---------------------------------------------------------------------------------------------
// Reverse Words in a String: expected by scanning backwards character by character.
// ---------------------------------------------------------------------------------------------
const WORDS_PERF = (() => {
  const next = seededRandom(1601);
  const parts: string[] = [" ".repeat(1 + next(3))];
  for (let i = 0; i < 30000; i++) {
    const length = 1 + next(8);
    let word = "";
    for (let c = 0; c < length; c++) word += "abcdefghijklmnopqrstuvwxyz"[next(26)];
    parts.push(word, " ".repeat(1 + next(3)));
  }
  return parts.join("");
})();
function reverseWordsBackwards(s: string): string {
  const words: string[] = [];
  let end = s.length;
  for (let i = s.length - 1; i >= -1; i--) {
    if (i === -1 || s[i] === " ") {
      if (end - i - 1 > 0) words.push(s.slice(i + 1, end));
      end = i;
    }
  }
  return words.join(" ");
}

// ---------------------------------------------------------------------------------------------
// String Compression: expected via a regular expression that matches whole runs.
// ---------------------------------------------------------------------------------------------
const COMPRESSION_PERF = (() => {
  const next = seededRandom(1701);
  const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let s = "";
  while (s.length < 100000) s += letters[next(letters.length)].repeat(1 + next(40));
  return s.slice(0, 100000);
})();
const compressByRegex = (s: string) => s.replace(/(.)\1*/g, (run, ch) => (run.length > 1 ? ch + run.length : ch));

// ---------------------------------------------------------------------------------------------
// Linked-list problems.
// ---------------------------------------------------------------------------------------------
const LIST_VALUES = randomInts(1801, 100000, 100000);
const CYCLE_VALUES = randomInts(1802, 100000, 10);
const removeNthBySplice = (values: number[], n: number) => {
  const copy = [...values];
  copy.splice(copy.length - n, 1);
  return copy.length ? copy.join(" ") : "EMPTY";
};
function reorderByInterleave(values: number[]): string {
  const out: number[] = [];
  let lo = 0;
  let hi = values.length - 1;
  while (lo <= hi) {
    out.push(values[lo++]);
    if (lo <= hi) out.push(values[hi--]);
  }
  return out.join(" ");
}

// ---------------------------------------------------------------------------------------------
// Group Anagrams: expected by comparing each word's letter counts against every existing group (no sorting trick).
// ---------------------------------------------------------------------------------------------
const ANAGRAM_WORDS = (() => {
  const next = seededRandom(1901);
  return Array.from({ length: 2500 }, () => randomLetters(next(1000000), 1 + next(6), "abc"));
})();
function groupAnagramsBrute(words: string[]): string {
  const counts = (w: string) => {
    const c = [0, 0, 0];
    for (const ch of w) c["abc".indexOf(ch)]++;
    return c;
  };
  const groups: { rep: number[]; members: string[] }[] = [];
  for (const w of words) {
    const c = counts(w);
    const found = groups.find((g) => g.rep.every((v, i) => v === c[i]));
    if (found) found.members.push(w);
    else groups.push({ rep: c, members: [w] });
  }
  const rows = groups.map((g) => g.members.sort());
  rows.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return rows.map((r) => r.join(" ")).join("\n");
}

// ---------------------------------------------------------------------------------------------
// Subarray Sum Equals K: literals computed offline with an O(n^2) brute force.
// ---------------------------------------------------------------------------------------------
const SUBSUM_PERF = randomInts(2001, 20000, 9, -4).join(" ") + "\n7";
const SUBSUM_PERF_EXPECTED = "432258";
const SUBSUM_ZEROS = new Array(20000).fill(0).join(" ") + "\n0";

// ---------------------------------------------------------------------------------------------
// Two pointers.
// ---------------------------------------------------------------------------------------------
const ZEROES_PERF = (() => {
  const next = seededRandom(2101);
  return Array.from({ length: 100000 }, () => (next(2) ? 0 : next(2001) - 1000));
})();
const zeroesLast = (nums: number[]) => {
  const kept = nums.filter((v) => v !== 0);
  return kept.concat(new Array(nums.length - kept.length).fill(0)).join(" ");
};
const COLORS_PERF = randomInts(2201, 100000, 3);
const sortedByCounting = (nums: number[]) => {
  const counts = [0, 0, 0];
  for (const v of nums) counts[v]++;
  return [0, 1, 2].flatMap((c) => new Array(counts[c]).fill(c)).join(" ");
};

export const EXTRA_A: Record<string, ProblemSpec[]> = {
  arrays: [
    {
      title: "Product of Array Except Self",
      difficulty: "Medium",
      companies: ["Amazon", "Microsoft", "Meta", "Apple"],
      description:
        "Given an integer array `nums`, build an array `answer` where `answer[i]` is the product of every element of `nums` except `nums[i]`.\n\nDo it in O(n) time without using the division operator. Every prefix product and suffix product of `nums` is guaranteed to fit in a 32-bit signed integer.",
      constraints: "2 <= nums.length <= 10^5\n-30 <= nums[i] <= 30\nEvery prefix or suffix product fits in a 32-bit signed integer.",
      inputFormat: "One line of space-separated integers `nums`.",
      outputFormat: "`n` space-separated integers: the array `answer`.",
      examples: [
        { input: "1 2 3 4", output: "24 12 8 6", explanation: "answer[0] = 2*3*4 = 24, answer[1] = 1*3*4 = 12, and so on." },
        { input: "-1 1 0 -3 3", output: "0 0 9 0 0", explanation: "Only the position holding 0 gets a non-zero product: (-1)*1*(-3)*3 = 9." },
      ],
      testCases: [
        vis("1 2 3 4", "24 12 8 6"),
        vis("-1 1 0 -3 3", "0 0 9 0 0"),
        hid("5 3", "3 5"),
        hid("0 0 2", "0 0 0"),
        hid("0 4 5", "20 0 0"),
        hid("-2 -3 4", "-12 -8 6"),
        hid("1 1 1 1", "1 1 1 1"),
        hid(PRODUCT_BASE.join(" "), productByDivision(PRODUCT_BASE)),
        hid(PRODUCT_WITH_ZERO.join(" "), productByDivision(PRODUCT_WITH_ZERO)),
      ],
      hints: [
        "answer[i] = (product of everything left of i) * (product of everything right of i).",
        "Compute the left products in one pass and store them directly in the answer array.",
        "Make a second pass from the right keeping a running suffix product, and multiply it into answer[i]. No division and O(1) extra space.",
      ],
      editorial:
        "Splitting the product at index i gives prefix(i) * suffix(i). First pass: answer[i] = product of nums[0..i-1]. Second pass, right to left: multiply answer[i] by the product of nums[i+1..n-1], kept in a single running variable. Division is avoided entirely, so zeros need no special handling. Time O(n), extra space O(1) beyond the output.",
      solutions: {
        javascript: code`
          function solve(input) {
            const nums = input.trim().split(/\s+/).map(Number);
            const n = nums.length;
            const answer = new Array(n).fill(1);
            let prefix = 1;
            for (let i = 0; i < n; i++) {
              answer[i] = prefix;
              prefix *= nums[i];
            }
            let suffix = 1;
            for (let i = n - 1; i >= 0; i--) {
              answer[i] *= suffix;
              suffix *= nums[i];
            }
            return answer.join(" ");
          }
        `,
        python: code`
          def solve(input_str):
              nums = list(map(int, input_str.split()))
              n = len(nums)
              answer = [1] * n
              prefix = 1
              for i in range(n):
                  answer[i] = prefix
                  prefix *= nums[i]
              suffix = 1
              for i in range(n - 1, -1, -1):
                  answer[i] *= suffix
                  suffix *= nums[i]
              return " ".join(map(str, answer))
        `,
      },
    },
    {
      title: "Maximum Subarray",
      difficulty: "Medium",
      companies: ["Amazon", "Microsoft", "Apple", "Infosys", "TCS"],
      description:
        "Given an integer array `nums`, find the contiguous non-empty subarray with the largest sum and print that sum.\n\nA subarray is a contiguous part of the array. The array may contain negative numbers; if every element is negative the answer is the largest (least negative) element.",
      constraints: "1 <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4",
      inputFormat: "One line of space-separated integers `nums`.",
      outputFormat: "A single integer: the maximum subarray sum.",
      examples: [
        { input: "-2 1 -3 4 -1 2 1 -5 4", output: "6", explanation: "The subarray [4, -1, 2, 1] has sum 6." },
        { input: "5 4 -1 7 8", output: "23", explanation: "The whole array is the best subarray." },
      ],
      testCases: [
        vis("-2 1 -3 4 -1 2 1 -5 4", "6"),
        vis("5 4 -1 7 8", "23"),
        hid("1", "1"),
        hid("-5", "-5"),
        hid("-3 -1 -2", "-1"),
        hid("0 0 0", "0"),
        hid("-1 -2 3 -2 3 -4 1", "4"),
        hid("10000 -10000 10000", "10000"),
        hid(MAX_SUB_SMALL.join(" "), String(maxSubarrayBrute(MAX_SUB_SMALL))),
        hid(MAX_SUB_BIG.join(" "), MAX_SUB_BIG_EXPECTED),
      ],
      hints: [
        "Brute force checks every pair (i, j) in O(n^2); with 10^5 elements that is too slow.",
        "At each index decide: extend the best subarray ending at the previous index, or start fresh here.",
        "best_ending_here = max(nums[i], best_ending_here + nums[i]); the answer is the maximum of best_ending_here over all i. Initialise from the first element, not from 0.",
      ],
      editorial:
        "Kadane's algorithm. Let cur be the best sum of a subarray that ends at the current index. A negative running sum can only hurt a later subarray, so cur = max(x, cur + x). Track the global maximum of cur. Initialising both with nums[0] (instead of 0) handles all-negative arrays. Time O(n), space O(1).",
      solutions: {
        javascript: code`
          function solve(input) {
            const nums = input.trim().split(/\s+/).map(Number);
            let cur = nums[0];
            let best = nums[0];
            for (let i = 1; i < nums.length; i++) {
              cur = Math.max(nums[i], cur + nums[i]);
              best = Math.max(best, cur);
            }
            return String(best);
          }
        `,
        python: code`
          def solve(input_str):
              nums = list(map(int, input_str.split()))
              cur = best = nums[0]
              for x in nums[1:]:
                  cur = max(x, cur + x)
                  best = max(best, cur)
              return str(best)
        `,
      },
    },
    {
      title: "Rotate Array",
      difficulty: "Medium",
      companies: ["Microsoft", "Amazon", "Adobe", "Accenture", "TCS"],
      description:
        "Given an integer array `nums` and a non-negative integer `k`, rotate the array to the right by `k` steps. Each step moves the last element to the front.\n\nNote that `k` can be far larger than the array length. Print the rotated array.",
      constraints: "1 <= nums.length <= 10^5\n-10^6 <= nums[i] <= 10^6\n0 <= k <= 10^9",
      inputFormat: "Line 1: space-separated integers `nums`.\nLine 2: the integer `k`.",
      outputFormat: "The rotated array as space-separated integers on one line.",
      examples: [
        { input: "1 2 3 4 5 6 7\n3", output: "5 6 7 1 2 3 4", explanation: "After 3 right rotations the last three elements 5 6 7 come to the front." },
        { input: "-1 -100 3 99\n2", output: "3 99 -1 -100" },
      ],
      testCases: [
        vis("1 2 3 4 5 6 7\n3", "5 6 7 1 2 3 4"),
        vis("-1 -100 3 99\n2", "3 99 -1 -100"),
        hid("1\n0", "1"),
        hid("1 2\n3", "2 1"),
        hid("1 2 3\n0", "1 2 3"),
        hid("1 2 3 4 5\n5", "1 2 3 4 5"),
        hid("1 2 3\n1000000000", "3 1 2"),
        hid("7 7 8\n2", "7 8 7"),
        hid(ROTATE_NUMS.join(" ") + "\n" + ROTATE_K, rotateByMapping(ROTATE_NUMS, ROTATE_K)),
      ],
      hints: [
        "Rotating by k is the same as rotating by k mod n; k can be much larger than n.",
        "After rotating right by k, the last k elements come first, followed by the first n - k elements.",
        "Three reversals do it in place: reverse the whole array, then reverse the first k elements, then reverse the rest.",
      ],
      editorial:
        "Reduce k modulo n. Reversing the whole array puts the last k elements at the front but in reverse order; reversing the first k and the remaining n - k elements separately restores their order. Time O(n), extra space O(1) (a slice-based version uses O(n)).",
      solutions: {
        javascript: code`
          function solve(input) {
            const lines = input.trim().split("\n");
            const nums = lines[0].trim().split(/\s+/).map(Number);
            const n = nums.length;
            const k = Number(lines[1]) % n;
            const reverse = (lo, hi) => {
              while (lo < hi) {
                const tmp = nums[lo];
                nums[lo] = nums[hi];
                nums[hi] = tmp;
                lo++;
                hi--;
              }
            };
            reverse(0, n - 1);
            reverse(0, k - 1);
            reverse(k, n - 1);
            return nums.join(" ");
          }
        `,
        python: code`
          def solve(input_str):
              lines = input_str.strip().split("\n")
              nums = list(map(int, lines[0].split()))
              k = int(lines[1]) % len(nums)
              if k:
                  nums = nums[-k:] + nums[:-k]
              return " ".join(map(str, nums))
        `,
      },
    },
    {
      title: "Merge Intervals",
      difficulty: "Medium",
      companies: ["Google", "Meta", "Amazon", "Microsoft", "Bloomberg"],
      description:
        "You are given a list of closed intervals `[start, end]`. Merge every group of overlapping intervals and print the resulting non-overlapping intervals.\n\nTwo intervals overlap when they share at least one point, so `[1, 4]` and `[4, 5]` merge into `[1, 5]`. The input intervals are not necessarily sorted. Print the merged intervals sorted by start.",
      constraints: "1 <= number of intervals <= 10^5\n0 <= start <= end <= 10^9",
      inputFormat: "One interval per line, written as two space-separated integers `start end`.",
      outputFormat: "One merged interval per line (`start end`), sorted by start.",
      examples: [
        { input: "1 3\n2 6\n8 10\n15 18", output: "1 6\n8 10\n15 18", explanation: "[1,3] and [2,6] overlap and become [1,6]." },
        { input: "1 4\n4 5", output: "1 5", explanation: "Intervals that touch at a point are merged." },
      ],
      testCases: [
        vis("1 3\n2 6\n8 10\n15 18", "1 6\n8 10\n15 18"),
        vis("1 4\n4 5", "1 5"),
        hid("5 7", "5 7"),
        hid("1 10\n2 3\n4 5", "1 10"),
        hid("8 10\n1 3\n2 4\n15 18\n17 20", "1 4\n8 10\n15 20"),
        hid("0 0\n0 0", "0 0"),
        hid("1 2\n3 4", "1 2\n3 4"),
        hid("6 8\n1 9\n2 4\n4 7", "1 9"),
        hid(INTERVALS_PERF.map(([a, b]) => a + " " + b).join("\n"), mergeByLattice(INTERVALS_PERF)),
      ],
      hints: [
        "Intervals can only merge with neighbours once they are ordered; think about sorting first.",
        "Sort by start. Then each interval either overlaps the last merged interval (start <= last end) or begins a new one.",
        "When it overlaps, extend the last merged interval's end to max(last end, current end), because the current interval may be fully contained.",
      ],
      editorial:
        "Sort the intervals by start. Keep a list of merged intervals; for each interval, if its start is <= the end of the last merged interval, set that end to the larger of the two ends, otherwise append the interval as a new group. Sorting dominates: O(n log n) time, O(n) space.",
      solutions: {
        javascript: code`
          function solve(input) {
            const intervals = input
              .trim()
              .split("\n")
              .map((line) => line.trim().split(/\s+/).map(Number));
            intervals.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
            const merged = [];
            for (const [start, end] of intervals) {
              const last = merged[merged.length - 1];
              if (last && start <= last[1]) last[1] = Math.max(last[1], end);
              else merged.push([start, end]);
            }
            return merged.map((pair) => pair[0] + " " + pair[1]).join("\n");
          }
        `,
        python: code`
          def solve(input_str):
              intervals = [tuple(map(int, line.split())) for line in input_str.strip().split("\n") if line.strip()]
              intervals.sort()
              merged = []
              for start, end in intervals:
                  if merged and start <= merged[-1][1]:
                      merged[-1][1] = max(merged[-1][1], end)
                  else:
                      merged.append([start, end])
              return "\n".join(str(s) + " " + str(e) for s, e in merged)
        `,
      },
    },
  ],
  strings: [
    {
      title: "Longest Palindromic Substring",
      difficulty: "Medium",
      companies: ["Amazon", "Microsoft", "Google", "Adobe", "Zoho"],
      description:
        "Given a string `s`, find its longest palindromic substring. A palindrome reads the same forwards and backwards, and the comparison is case-sensitive.\n\nSeveral substrings can tie for the longest length; print the one that starts earliest (the leftmost one).",
      constraints: "1 <= s.length <= 1000\ns consists of digits and English letters (upper and lower case).",
      inputFormat: "One line containing the string `s`.",
      outputFormat: "The leftmost longest palindromic substring.",
      examples: [
        { input: "babad", output: "bab", explanation: '"bab" and "aba" both have length 3; "bab" starts first.' },
        { input: "cbbd", output: "bb" },
      ],
      testCases: [
        vis("babad", "bab"),
        vis("cbbd", "bb"),
        hid("a", "a"),
        hid("ac", "a"),
        hid("forgeeksskeegfor", "geeksskeeg"),
        hid("abcd", "a"),
        hid("aaaa", "aaaa"),
        hid("abacdfgdcaba", "aba"),
        hid("Aa", "A"),
        hid("xabbay", "abba"),
        hid(PALINDROME_RANDOM, leftmostLongestPalindromeBrute(PALINDROME_RANDOM)),
        hid(PALINDROME_ALTERNATING, leftmostLongestPalindromeBrute(PALINDROME_ALTERNATING)),
        hid(PALINDROME_MIRROR, leftmostLongestPalindromeBrute(PALINDROME_MIRROR)),
      ],
      hints: [
        "Checking every substring is O(n^3); can you reuse work between neighbouring substrings?",
        "Every palindrome has a centre: a character (odd length) or a gap between two characters (even length). Expand outwards from each centre while the two ends match.",
        "There are 2n - 1 centres and each expansion costs O(n). Replace the best only when strictly longer, scanning centres left to right, so the leftmost one wins.",
      ],
      editorial:
        "Expand around centres. For every index i, expand with (i, i) for odd palindromes and (i, i+1) for even ones while s[l] == s[r]. Keep the start and length of the best palindrome and update it only when the new one is strictly longer (or equal and starts earlier), which makes the answer the leftmost longest palindrome. Time O(n^2), space O(1). Manacher's algorithm brings it to O(n).",
      solutions: {
        javascript: code`
          function solve(input) {
            const s = input.trim();
            let bestStart = 0;
            let bestLen = 1;
            const expand = (l, r) => {
              while (l >= 0 && r < s.length && s[l] === s[r]) {
                l--;
                r++;
              }
              const len = r - l - 1;
              const start = l + 1;
              if (len > bestLen || (len === bestLen && start < bestStart)) {
                bestLen = len;
                bestStart = start;
              }
            };
            for (let i = 0; i < s.length; i++) {
              expand(i, i);
              expand(i, i + 1);
            }
            return s.substring(bestStart, bestStart + bestLen);
          }
        `,
        python: code`
          def solve(input_str):
              s = input_str.strip()
              best_start, best_len = 0, 1

              def expand(l, r):
                  nonlocal best_start, best_len
                  while l >= 0 and r < len(s) and s[l] == s[r]:
                      l -= 1
                      r += 1
                  length = r - l - 1
                  start = l + 1
                  if length > best_len or (length == best_len and start < best_start):
                      best_len, best_start = length, start

              for i in range(len(s)):
                  expand(i, i)
                  expand(i, i + 1)
              return s[best_start:best_start + best_len]
        `,
      },
    },
    {
      title: "Reverse Words in a String",
      difficulty: "Medium",
      companies: ["Microsoft", "Amazon", "Apple", "Bloomberg", "TCS"],
      description:
        "Given a string `s`, reverse the order of its words. A word is a maximal run of non-space characters.\n\nThe input may contain leading or trailing spaces and several spaces between words. The output must contain the words in reverse order separated by exactly one space, with no leading or trailing spaces.",
      constraints: "1 <= s.length <= 10^5\ns contains English letters (upper and lower case), digits and spaces.\ns contains at least one word.",
      inputFormat: "One line containing the string `s` (it may start or end with spaces).",
      outputFormat: "The words in reverse order, separated by single spaces.",
      examples: [
        { input: "the sky is blue", output: "blue is sky the" },
        { input: "  hello world  ", output: "world hello", explanation: "Extra leading and trailing spaces are dropped." },
      ],
      testCases: [
        vis("the sky is blue", "blue is sky the"),
        vis("  hello world  ", "world hello"),
        hid("a good   example", "example good a"),
        hid("word", "word"),
        hid("  a  ", "a"),
        hid("one two three four five", "five four three two one"),
        hid("Alice  loves   Bob", "Bob loves Alice"),
        hid("x1   y22 z333", "z333 y22 x1"),
        hid(WORDS_PERF, reverseWordsBackwards(WORDS_PERF)),
      ],
      hints: [
        "The tricky part is the irregular spacing, not the reversing.",
        "Split on runs of whitespace so that empty tokens never appear, then reverse the list of words.",
        "Join the reversed words with one space. Without built-ins, scan from the end of the string and copy each word you meet.",
      ],
      editorial:
        "Split the string on whitespace (ignoring empty tokens), reverse the resulting list and join with a single space. All of it is a linear pass: O(n) time and O(n) space. A manual alternative walks the string from the right, skipping spaces and emitting each word as it is found.",
      solutions: {
        javascript: code`
          function solve(input) {
            const words = input.trim().split(/\s+/);
            words.reverse();
            return words.join(" ");
          }
        `,
        python: code`
          def solve(input_str):
              words = input_str.split()
              words.reverse()
              return " ".join(words)
        `,
      },
    },
    {
      title: "String Compression",
      difficulty: "Medium",
      companies: ["Amazon", "Microsoft", "Meta", "Bloomberg", "Zoho"],
      description:
        "Compress a string using run-length encoding. Walk through `s` and replace every maximal run of the same character by that character followed by the run length. If a run has length 1, write only the character (no `1`).\n\nA run of length 12 is written with all its digits, e.g. `a12`. Print the compressed string.",
      constraints: "1 <= s.length <= 10^5\ns consists of English letters (upper and lower case) only; letters are case-sensitive.",
      inputFormat: "One line containing the string `s`.",
      outputFormat: "The compressed string.",
      examples: [
        { input: "aabcccccaaa", output: "a2bc5a3", explanation: "aa -> a2, b -> b, ccccc -> c5, aaa -> a3." },
        { input: "abc", output: "abc", explanation: "Every run has length 1, so nothing changes." },
      ],
      testCases: [
        vis("aabcccccaaa", "a2bc5a3"),
        vis("abc", "abc"),
        hid("a", "a"),
        hid("aaaaaaaaaaaa", "a12"),
        hid("abbbbbbbbbbbb", "ab12"),
        hid("aabbaa", "a2b2a2"),
        hid("zzzzzzzzzz", "z10"),
        hid("aAaA", "aAaA"),
        hid("aaAAaa", "a2A2a2"),
        hid(COMPRESSION_PERF, compressByRegex(COMPRESSION_PERF)),
      ],
      hints: [
        "Group consecutive equal characters; only adjacent equal characters belong to the same run.",
        "Keep a pointer to the start of the current run and advance a second pointer while the character stays the same.",
        "After each run append the character, and append the run length only when it is greater than 1. Convert the length to a string so multi-digit counts work.",
      ],
      editorial:
        "Single left-to-right scan with two indices: i marks the start of a run, j advances while s[j] == s[i]. Append s[i], then str(j - i) if j - i > 1, and continue from j. Building the result with an array/list join keeps it O(n) time and O(n) space.",
      solutions: {
        javascript: code`
          function solve(input) {
            const s = input.trim();
            const out = [];
            let i = 0;
            while (i < s.length) {
              let j = i;
              while (j < s.length && s[j] === s[i]) j++;
              out.push(s[i]);
              if (j - i > 1) out.push(String(j - i));
              i = j;
            }
            return out.join("");
          }
        `,
        python: code`
          def solve(input_str):
              s = input_str.strip()
              out = []
              i = 0
              while i < len(s):
                  j = i
                  while j < len(s) and s[j] == s[i]:
                      j += 1
                  out.append(s[i])
                  if j - i > 1:
                      out.append(str(j - i))
                  i = j
              return "".join(out)
        `,
      },
    },
  ],
  linkedLists: [
    {
      title: "Linked List Cycle",
      difficulty: "Easy",
      companies: ["Amazon", "Microsoft", "Apple", "Bloomberg", "TCS"],
      description:
        "A singly linked list is described by its node values from head to tail. The tail's `next` pointer either points to nothing or back to the node at index `pos` (0-indexed), which creates a cycle.\n\nPrint `true` if the list contains a cycle and `false` otherwise. Node values can repeat, so compare nodes, never values. Aim for O(1) extra memory.",
      constraints: "1 <= number of nodes <= 10^5\n-10^5 <= Node.val <= 10^5\npos is -1 (no cycle) or a valid index in [0, n - 1].",
      inputFormat: "Line 1: space-separated node values from head to tail.\nLine 2: the integer `pos` (the index the tail connects to, or -1 for no cycle).",
      outputFormat: "`true` or `false`.",
      examples: [
        { input: "3 2 0 -4\n1", output: "true", explanation: "The tail (-4) connects back to the node at index 1 (value 2)." },
        { input: "1\n-1", output: "false", explanation: "A single node pointing to nothing." },
      ],
      testCases: [
        vis("3 2 0 -4\n1", "true"),
        vis("1\n-1", "false"),
        hid("1 2\n0", "true"),
        hid("1\n0", "true"),
        hid("1 2 3 4 5\n-1", "false"),
        hid("1 1 1 1\n-1", "false"),
        hid("1 1 1 1\n3", "true"),
        hid("5 6 7 8 9 10\n4", "true"),
        hid(CYCLE_VALUES.join(" ") + "\n-1", "false"),
        hid(CYCLE_VALUES.join(" ") + "\n49999", "true"),
      ],
      hints: [
        "Storing every visited node in a set works but uses O(n) memory.",
        "Use two pointers moving at different speeds: slow moves one step, fast moves two.",
        "If there is a cycle the fast pointer eventually laps the slow one and they meet; if fast reaches the end (null), there is no cycle.",
      ],
      editorial:
        "Floyd's tortoise and hare. Advance slow by 1 and fast by 2 each step. Without a cycle, fast falls off the end. With a cycle, both enter it and the gap between them shrinks by 1 per step, so they must meet. Time O(n), space O(1). The harness builds the list from the values and connects the tail to node `pos`.",
      solutions: {
        javascript: code`
          function solve(input) {
            const lines = input.trim().split("\n");
            const values = lines[0].trim().split(/\s+/).map(Number);
            const pos = Number(lines[1]);
            const nodes = values.map((v) => ({ val: v, next: null }));
            for (let i = 0; i + 1 < nodes.length; i++) nodes[i].next = nodes[i + 1];
            if (pos >= 0) nodes[nodes.length - 1].next = nodes[pos];
            let slow = nodes[0];
            let fast = nodes[0];
            while (fast && fast.next) {
              slow = slow.next;
              fast = fast.next.next;
              if (slow === fast) return "true";
            }
            return "false";
          }
        `,
        python: code`
          class Node:
              def __init__(self, val):
                  self.val = val
                  self.next = None

          def solve(input_str):
              lines = input_str.strip().split("\n")
              values = list(map(int, lines[0].split()))
              pos = int(lines[1])
              nodes = [Node(v) for v in values]
              for i in range(len(nodes) - 1):
                  nodes[i].next = nodes[i + 1]
              if pos >= 0:
                  nodes[-1].next = nodes[pos]
              slow = fast = nodes[0]
              while fast and fast.next:
                  slow = slow.next
                  fast = fast.next.next
                  if slow is fast:
                      return "true"
              return "false"
        `,
      },
    },
    {
      title: "Remove Nth Node From End of List",
      difficulty: "Medium",
      companies: ["Meta", "Amazon", "Microsoft", "Google", "Bloomberg"],
      description:
        "Given the values of a singly linked list from head to tail and an integer `n`, remove the `n`-th node counted from the end of the list (the last node is the 1st from the end) and print the remaining list.\n\nTry to do it in a single pass over the list. If the list becomes empty, print `EMPTY`.",
      constraints: "1 <= list length <= 10^5\n0 <= Node.val <= 10^5\n1 <= n <= list length",
      inputFormat: "Line 1: space-separated node values from head to tail.\nLine 2: the integer `n`.",
      outputFormat: "The remaining node values as space-separated integers, or `EMPTY` if no nodes remain.",
      examples: [
        { input: "1 2 3 4 5\n2", output: "1 2 3 5", explanation: "The 2nd node from the end is 4." },
        { input: "1\n1", output: "EMPTY", explanation: "Removing the only node leaves an empty list." },
      ],
      testCases: [
        vis("1 2 3 4 5\n2", "1 2 3 5"),
        vis("1\n1", "EMPTY"),
        hid("1 2\n1", "1"),
        hid("1 2\n2", "2"),
        hid("1 2 3\n3", "2 3"),
        hid("5 5 5 5\n2", "5 5 5"),
        hid("9 8 7 6 5 4 3 2 1 0\n10", "8 7 6 5 4 3 2 1 0"),
        hid(LIST_VALUES.join(" ") + "\n37", removeNthBySplice(LIST_VALUES, 37)),
        hid(LIST_VALUES.join(" ") + "\n100000", removeNthBySplice(LIST_VALUES, 100000)),
      ],
      hints: [
        "Two passes work: count the length, then remove node (length - n). Can you do it in one pass?",
        "Keep two pointers separated by exactly n nodes. When the front pointer reaches the end, the back pointer is right before the node to delete.",
        "Use a dummy node before the head so that removing the head needs no special case.",
      ],
      editorial:
        "Put a dummy node in front of the head. Move `fast` n steps ahead of `slow` (both start at the dummy), then advance both until fast is the last node. Now slow.next is the n-th node from the end; unlink it with slow.next = slow.next.next. The dummy makes deleting the head uniform. Time O(L), space O(1) beyond the list itself.",
      solutions: {
        javascript: code`
          function solve(input) {
            const lines = input.trim().split("\n");
            const values = lines[0].trim().split(/\s+/).map(Number);
            const n = Number(lines[1]);
            const nodes = values.map((v) => ({ val: v, next: null }));
            for (let i = 0; i + 1 < nodes.length; i++) nodes[i].next = nodes[i + 1];
            const dummy = { val: 0, next: nodes[0] };
            let fast = dummy;
            let slow = dummy;
            for (let i = 0; i < n; i++) fast = fast.next;
            while (fast.next) {
              fast = fast.next;
              slow = slow.next;
            }
            slow.next = slow.next.next;
            const out = [];
            for (let node = dummy.next; node; node = node.next) out.push(node.val);
            return out.length ? out.join(" ") : "EMPTY";
          }
        `,
        python: code`
          class Node:
              def __init__(self, val):
                  self.val = val
                  self.next = None

          def solve(input_str):
              lines = input_str.strip().split("\n")
              values = list(map(int, lines[0].split()))
              n = int(lines[1])
              nodes = [Node(v) for v in values]
              for i in range(len(nodes) - 1):
                  nodes[i].next = nodes[i + 1]
              dummy = Node(0)
              dummy.next = nodes[0]
              fast = slow = dummy
              for _ in range(n):
                  fast = fast.next
              while fast.next:
                  fast = fast.next
                  slow = slow.next
              slow.next = slow.next.next
              out = []
              node = dummy.next
              while node:
                  out.append(str(node.val))
                  node = node.next
              return " ".join(out) if out else "EMPTY"
        `,
      },
    },
    {
      title: "Reorder List",
      difficulty: "Medium",
      companies: ["Amazon", "Meta", "Microsoft", "Adobe", "Bloomberg"],
      description:
        "A singly linked list `L0 -> L1 -> ... -> L(n-1)` is given by its node values. Reorder it into `L0 -> L(n-1) -> L1 -> L(n-2) -> L2 -> L(n-3) -> ...`, alternating between the front and the back of the original list.\n\nYou must rearrange the nodes themselves, not just copy values. Print the values of the reordered list.",
      constraints: "1 <= list length <= 5 * 10^4 (the tests go up to 10^5)\n1 <= Node.val <= 1000 (any integer values are handled)",
      inputFormat: "One line of space-separated node values from head to tail.",
      outputFormat: "The reordered node values as space-separated integers.",
      examples: [
        { input: "1 2 3 4", output: "1 4 2 3" },
        { input: "1 2 3 4 5", output: "1 5 2 4 3", explanation: "Front, back, front, back, then the middle node is left." },
      ],
      testCases: [
        vis("1 2 3 4", "1 4 2 3"),
        vis("1 2 3 4 5", "1 5 2 4 3"),
        hid("1", "1"),
        hid("1 2", "1 2"),
        hid("1 2 3", "1 3 2"),
        hid("10 20 30 40 50 60", "10 60 20 50 30 40"),
        hid("7 7 7 7", "7 7 7 7"),
        hid("3 1 4 1 5 9 2", "3 2 1 9 4 5 1"),
        hid(LIST_VALUES.join(" "), reorderByInterleave(LIST_VALUES)),
        hid(LIST_VALUES.slice(0, 99999).join(" "), reorderByInterleave(LIST_VALUES.slice(0, 99999))),
      ],
      hints: [
        "Copying the nodes into an array and interleaving from both ends is easy, but needs O(n) memory. Try to relink the nodes in place.",
        "Split the list at its middle (slow/fast pointers) and reverse the second half.",
        "Now merge the two halves by alternating nodes: first, second, first, second, ... The first half is never shorter than the second.",
      ],
      editorial:
        "Three steps: (1) find the middle with slow/fast pointers and cut the list there; (2) reverse the second half in place; (3) weave the two halves together, taking one node from each alternately. For an odd length the first half has the extra (middle) node, which ends up last. Time O(n), space O(1).",
      solutions: {
        javascript: code`
          function solve(input) {
            const values = input.trim().split(/\s+/).map(Number);
            const nodes = values.map((v) => ({ val: v, next: null }));
            for (let i = 0; i + 1 < nodes.length; i++) nodes[i].next = nodes[i + 1];
            const head = nodes[0];
            let slow = head;
            let fast = head;
            while (fast.next && fast.next.next) {
              slow = slow.next;
              fast = fast.next.next;
            }
            let prev = null;
            let cur = slow.next;
            slow.next = null;
            while (cur) {
              const next = cur.next;
              cur.next = prev;
              prev = cur;
              cur = next;
            }
            let first = head;
            let second = prev;
            while (second) {
              const afterFirst = first.next;
              const afterSecond = second.next;
              first.next = second;
              second.next = afterFirst;
              first = afterFirst;
              second = afterSecond;
            }
            const out = [];
            for (let node = head; node; node = node.next) out.push(node.val);
            return out.join(" ");
          }
        `,
        python: code`
          class Node:
              def __init__(self, val):
                  self.val = val
                  self.next = None

          def solve(input_str):
              values = list(map(int, input_str.split()))
              nodes = [Node(v) for v in values]
              for i in range(len(nodes) - 1):
                  nodes[i].next = nodes[i + 1]
              head = nodes[0]
              slow = fast = head
              while fast.next and fast.next.next:
                  slow = slow.next
                  fast = fast.next.next
              prev, cur = None, slow.next
              slow.next = None
              while cur:
                  nxt = cur.next
                  cur.next = prev
                  prev = cur
                  cur = nxt
              first, second = head, prev
              while second:
                  after_first, after_second = first.next, second.next
                  first.next = second
                  second.next = after_first
                  first, second = after_first, after_second
              out = []
              node = head
              while node:
                  out.append(str(node.val))
                  node = node.next
              return " ".join(out)
        `,
      },
    },
  ],
  hashing: [
    {
      title: "Group Anagrams",
      difficulty: "Medium",
      companies: ["Amazon", "Meta", "Google", "Bloomberg", "Goldman Sachs"],
      description:
        "Given a list of words, group together the words that are anagrams of each other (they use exactly the same letters with the same counts).\n\nTo make the output deterministic: sort the words inside every group alphabetically, then sort the groups by their first word. Duplicate words stay in the list (each copy is printed).",
      constraints: "1 <= number of words <= 10^4\n1 <= word length <= 100\nWords consist of lowercase English letters.",
      inputFormat: "One line of space-separated words.",
      outputFormat: "One group per line: the group's words, sorted alphabetically and separated by spaces. Groups are ordered by their first word.",
      examples: [
        { input: "eat tea tan ate nat bat", output: "ate eat tea\nbat\nnat tan" },
        { input: "a", output: "a" },
      ],
      testCases: [
        vis("eat tea tan ate nat bat", "ate eat tea\nbat\nnat tan"),
        vis("a", "a"),
        hid("abc bca cab xyz zyx yxz", "abc bca cab\nxyz yxz zyx"),
        hid("listen silent enlist google gogole inlets", "enlist inlets listen silent\ngogole google"),
        hid("a b a", "a a\nb"),
        hid("ab ba abc", "ab ba\nabc"),
        hid("aa a aaa", "a\naa\naaa"),
        hid("zz zz zz", "zz zz zz"),
        hid(ANAGRAM_WORDS.join(" "), groupAnagramsBrute(ANAGRAM_WORDS)),
      ],
      hints: [
        "Two words are anagrams exactly when they have the same letters once sorted.",
        "Use a hash map from a canonical key (e.g. the word's letters sorted) to the list of words with that key.",
        "After grouping, sort each group alphabetically and then sort the groups by their first word to match the required output order.",
      ],
      editorial:
        "Map each word to its sorted-letters key and append it to that key's list. Finally sort every group and sort the groups by first word for a deterministic order. With k = max word length and n words the grouping costs O(n * k log k); a 26-count tuple key makes it O(n * k). Space O(n * k).",
      solutions: {
        javascript: code`
          function solve(input) {
            const groups = new Map();
            for (const word of input.trim().split(/\s+/)) {
              const key = word.split("").sort().join("");
              if (!groups.has(key)) groups.set(key, []);
              groups.get(key).push(word);
            }
            const rows = [...groups.values()].map((list) => list.sort());
            rows.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
            return rows.map((row) => row.join(" ")).join("\n");
          }
        `,
        python: code`
          def solve(input_str):
              groups = {}
              for word in input_str.split():
                  groups.setdefault("".join(sorted(word)), []).append(word)
              rows = sorted(sorted(group) for group in groups.values())
              return "\n".join(" ".join(row) for row in rows)
        `,
      },
    },
    {
      title: "Subarray Sum Equals K",
      difficulty: "Medium",
      companies: ["Meta", "Amazon", "Google", "Microsoft", "Goldman Sachs"],
      description:
        "Given an integer array `nums` and an integer `k`, count the contiguous non-empty subarrays whose elements sum to `k`.\n\nThe array can contain negative numbers and zeros, so a sliding window does not work. Subarrays at different positions count separately even if they hold the same values.",
      constraints: "1 <= nums.length <= 2 * 10^4\n-1000 <= nums[i] <= 1000\n-10^7 <= k <= 10^7",
      inputFormat: "Line 1: space-separated integers `nums`.\nLine 2: the integer `k`.",
      outputFormat: "A single integer: the number of subarrays with sum `k`.",
      examples: [
        { input: "1 1 1\n2", output: "2", explanation: "[1,1] at indices 0-1 and [1,1] at indices 1-2." },
        { input: "1 2 3\n3", output: "2", explanation: "[1,2] and [3]." },
      ],
      testCases: [
        vis("1 1 1\n2", "2"),
        vis("1 2 3\n3", "2"),
        hid("1\n1", "1"),
        hid("1\n0", "0"),
        hid("0 0 0\n0", "6"),
        hid("1 -1 0\n0", "3"),
        hid("3 4 7 2 -3 1 4 2\n7", "4"),
        hid("-1 -1 1\n0", "1"),
        hid("2 -2 2 -2\n0", "4"),
        hid(SUBSUM_ZEROS, "200010000"),
        hid(SUBSUM_PERF, SUBSUM_PERF_EXPECTED),
      ],
      hints: [
        "Brute force over all (i, j) pairs is O(n^2) (or O(n^3) if you re-sum each time).",
        "Let prefix[j] be the sum of the first j elements. The subarray (i, j] sums to k exactly when prefix[j] - prefix[i] = k.",
        "Scan once, keeping a hash map of how many times each prefix sum has occurred. At each step add count[prefix - k] to the answer, then record the current prefix. Start with count[0] = 1.",
      ],
      editorial:
        "Running prefix sums plus a frequency map. For the current prefix sum p, every earlier prefix equal to p - k marks the start of a subarray ending here with sum k, so add freq[p - k] to the answer, then increment freq[p]. Seeding freq[0] = 1 covers subarrays that start at index 0. Works with negatives because it never shrinks a window. Time O(n), space O(n).",
      solutions: {
        javascript: code`
          function solve(input) {
            const lines = input.trim().split("\n");
            const nums = lines[0].trim().split(/\s+/).map(Number);
            const k = Number(lines[1]);
            const freq = new Map([[0, 1]]);
            let prefix = 0;
            let count = 0;
            for (const x of nums) {
              prefix += x;
              count += freq.get(prefix - k) || 0;
              freq.set(prefix, (freq.get(prefix) || 0) + 1);
            }
            return String(count);
          }
        `,
        python: code`
          def solve(input_str):
              lines = input_str.strip().split("\n")
              nums = list(map(int, lines[0].split()))
              k = int(lines[1])
              freq = {0: 1}
              prefix = 0
              count = 0
              for x in nums:
                  prefix += x
                  count += freq.get(prefix - k, 0)
                  freq[prefix] = freq.get(prefix, 0) + 1
              return str(count)
        `,
      },
    },
    {
      title: "Happy Number",
      difficulty: "Easy",
      companies: ["Airbnb", "Uber", "Apple", "TCS", "Wipro"],
      description:
        "A number is happy if repeatedly replacing it with the sum of the squares of its digits eventually reaches 1. If instead the process loops forever in a cycle that never includes 1, the number is not happy.\n\nGiven a positive integer `n`, print `true` if it is a happy number and `false` otherwise.",
      constraints: "1 <= n <= 2^31 - 1",
      inputFormat: "A single integer `n`.",
      outputFormat: "`true` or `false`.",
      examples: [
        { input: "19", output: "true", explanation: "1^2+9^2 = 82, 8^2+2^2 = 68, 6^2+8^2 = 100, 1^2+0^2+0^2 = 1." },
        { input: "2", output: "false", explanation: "The sequence 2, 4, 16, 37, 58, 89, 145, 42, 20, 4, ... enters a cycle without 1." },
      ],
      testCases: [
        vis("19", "true"),
        vis("2", "false"),
        hid("1", "true"),
        hid("7", "true"),
        hid("4", "false"),
        hid("100", "true"),
        hid("1111111", "true"),
        hid("2147483647", "false"),
        hid("999999999", "false"),
        hid("1000000000", "true"),
      ],
      hints: [
        "Write a helper that returns the sum of the squares of the digits of a number.",
        "The sequence either hits 1 or repeats a value. Remember the values you have seen in a set.",
        "Alternatively, use slow/fast pointers on the sequence (Floyd's cycle detection) to avoid the set. Any number drops below 244 after one step, so the cycle is found quickly.",
      ],
      editorial:
        "For a number with d digits the next value is at most 81*d, so after the first step the numbers stay small (below 1000 for 32-bit input) and the sequence must either reach 1 or repeat. Detect repetition with a hash set (or Floyd's slow/fast pointers for O(1) space). Time O(log n) for the first step plus a constant number of further steps.",
      solutions: {
        javascript: code`
          function solve(input) {
            let n = Number(input.trim());
            const next = (x) => {
              let sum = 0;
              while (x > 0) {
                const digit = x % 10;
                sum += digit * digit;
                x = Math.floor(x / 10);
              }
              return sum;
            };
            const seen = new Set();
            while (n !== 1 && !seen.has(n)) {
              seen.add(n);
              n = next(n);
            }
            return n === 1 ? "true" : "false";
          }
        `,
        python: code`
          def solve(input_str):
              n = int(input_str.strip())

              def step(x):
                  total = 0
                  while x > 0:
                      x, digit = divmod(x, 10)
                      total += digit * digit
                  return total

              seen = set()
              while n != 1 and n not in seen:
                  seen.add(n)
                  n = step(n)
              return "true" if n == 1 else "false"
        `,
      },
    },
  ],
  twoPointers: [
    {
      title: "Move Zeroes",
      difficulty: "Easy",
      companies: ["Meta", "Amazon", "Bloomberg", "Apple", "TCS"],
      description:
        "Given an integer array `nums`, move all `0` values to the end while keeping the relative order of the non-zero elements.\n\nDo it in place with a single pass and O(1) extra space if you can, and print the resulting array.",
      constraints: "1 <= nums.length <= 10^5\n-2^31 <= nums[i] <= 2^31 - 1",
      inputFormat: "One line of space-separated integers `nums`.",
      outputFormat: "The rearranged array as space-separated integers.",
      examples: [
        { input: "0 1 0 3 12", output: "1 3 12 0 0" },
        { input: "0", output: "0", explanation: "A single zero stays where it is." },
      ],
      testCases: [
        vis("0 1 0 3 12", "1 3 12 0 0"),
        vis("0", "0"),
        hid("1 2 3", "1 2 3"),
        hid("0 0 1", "1 0 0"),
        hid("-1 0 -2 0 -3", "-1 -2 -3 0 0"),
        hid("0 0 0", "0 0 0"),
        hid("4 0 5 0 0 6", "4 5 6 0 0 0"),
        hid("2147483647 0 -2147483648", "2147483647 -2147483648 0"),
        hid(ZEROES_PERF.join(" "), zeroesLast(ZEROES_PERF)),
      ],
      hints: [
        "Building a new array of the non-zero values and padding with zeros works but uses extra memory.",
        "Keep a write pointer `w` to the next slot where a non-zero value should go.",
        "Scan with a read pointer; whenever nums[r] is non-zero, swap it with nums[w] and advance w. Everything before w is non-zero and in order.",
      ],
      editorial:
        "Two pointers. The read pointer r scans the array; the write pointer w marks the boundary of the compacted non-zero prefix. When nums[r] != 0, swap nums[r] and nums[w] and increment w. Because swaps only exchange a zero (or the same element) with a non-zero value, the order of the non-zero elements is preserved. Time O(n), space O(1).",
      solutions: {
        javascript: code`
          function solve(input) {
            const nums = input.trim().split(/\s+/).map(Number);
            let w = 0;
            for (let r = 0; r < nums.length; r++) {
              if (nums[r] !== 0) {
                const tmp = nums[w];
                nums[w] = nums[r];
                nums[r] = tmp;
                w++;
              }
            }
            return nums.join(" ");
          }
        `,
        python: code`
          def solve(input_str):
              nums = list(map(int, input_str.split()))
              w = 0
              for r in range(len(nums)):
                  if nums[r] != 0:
                      nums[w], nums[r] = nums[r], nums[w]
                      w += 1
              return " ".join(map(str, nums))
        `,
      },
    },
    {
      title: "Sort Colors",
      difficulty: "Medium",
      companies: ["Microsoft", "Amazon", "Meta", "Apple", "Adobe"],
      description:
        "An array `nums` contains only the values `0`, `1` and `2` (think of red, white and blue). Sort it in ascending order so that equal values are adjacent: all 0s, then all 1s, then all 2s.\n\nDo not use a library sort. A one-pass solution with constant extra space exists (the Dutch national flag algorithm). Print the sorted array.",
      constraints: "1 <= nums.length <= 10^5\nnums[i] is 0, 1 or 2.",
      inputFormat: "One line of space-separated integers `nums`.",
      outputFormat: "The sorted array as space-separated integers.",
      examples: [
        { input: "2 0 2 1 1 0", output: "0 0 1 1 2 2" },
        { input: "2 0 1", output: "0 1 2" },
      ],
      testCases: [
        vis("2 0 2 1 1 0", "0 0 1 1 2 2"),
        vis("2 0 1", "0 1 2"),
        hid("0", "0"),
        hid("1", "1"),
        hid("2 2 2", "2 2 2"),
        hid("1 0", "0 1"),
        hid("2 1 0 2 1 0", "0 0 1 1 2 2"),
        hid("1 1 0 0 2 2 1", "0 0 1 1 1 2 2"),
        hid(COLORS_PERF.join(" "), sortedByCounting(COLORS_PERF)),
      ],
      hints: [
        "Counting the 0s, 1s and 2s and rewriting the array works in two passes. Can you do it in one?",
        "Maintain three regions with pointers: everything before `low` is 0, everything after `high` is 2, and `mid` scans the unknown middle.",
        "If nums[mid] is 0, swap with low and advance both; if 1, just advance mid; if 2, swap with high and shrink high (do NOT advance mid, the swapped-in value is unchecked).",
      ],
      editorial:
        "Dutch national flag partitioning with pointers low, mid, high. Invariant: [0, low) are 0s, [low, mid) are 1s, (high, n-1] are 2s and [mid, high] is unexamined. A 0 is swapped to low (the value coming back is a 1, so mid advances), a 1 is left in place, a 2 is swapped to high without advancing mid. One pass, O(n) time, O(1) space.",
      solutions: {
        javascript: code`
          function solve(input) {
            const nums = input.trim().split(/\s+/).map(Number);
            let low = 0;
            let mid = 0;
            let high = nums.length - 1;
            while (mid <= high) {
              if (nums[mid] === 0) {
                const tmp = nums[low];
                nums[low] = nums[mid];
                nums[mid] = tmp;
                low++;
                mid++;
              } else if (nums[mid] === 1) {
                mid++;
              } else {
                const tmp = nums[high];
                nums[high] = nums[mid];
                nums[mid] = tmp;
                high--;
              }
            }
            return nums.join(" ");
          }
        `,
        python: code`
          def solve(input_str):
              nums = list(map(int, input_str.split()))
              low, mid, high = 0, 0, len(nums) - 1
              while mid <= high:
                  if nums[mid] == 0:
                      nums[low], nums[mid] = nums[mid], nums[low]
                      low += 1
                      mid += 1
                  elif nums[mid] == 1:
                      mid += 1
                  else:
                      nums[mid], nums[high] = nums[high], nums[mid]
                      high -= 1
              return " ".join(map(str, nums))
        `,
      },
    },
  ],
};
