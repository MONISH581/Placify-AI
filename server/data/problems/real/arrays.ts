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

function randomInts(seed: number, length: number, bound: number): number[] {
  const next = seededRandom(seed);
  return Array.from({ length }, () => next(bound));
}

const sortedNumbers = (values: number[]) => [...values].sort((a, b) => a - b);

// Performance inputs. Expected outputs below are literals produced by independent brute-force checkers.
const DEDUP_PERF = sortedNumbers(randomInts(11, 20000, 50)).join(" ");

// Every even number 2..200000, so the missing positives are all odd numbers up to 199999 and then everything above 200000.
const KTH_MISSING_PERF = Array.from({ length: 100000 }, (_, i) => 2 * (i + 1)).join(" ") + "\n150000";

// Mountain with its peak in the middle of 100000 values.
const MOUNTAIN_PERF = Array.from({ length: 100000 }, (_, i) => (i < 50000 ? i : 100000 - i)).join(" ");

// 1..n with the last two swapped: [1, ..., n-2, n, n-1] -> next is [1, ..., n-3, n-1, n-2, n].
const NEXT_PERM_N = 50000;
const NEXT_PERM_PERF = [
  ...Array.from({ length: NEXT_PERM_N - 2 }, (_, i) => i + 1),
  NEXT_PERM_N,
  NEXT_PERM_N - 1,
].join(" ");
const NEXT_PERM_EXPECTED = [
  ...Array.from({ length: NEXT_PERM_N - 3 }, (_, i) => i + 1),
  NEXT_PERM_N - 1,
  NEXT_PERM_N - 2,
  NEXT_PERM_N,
].join(" ");

// Strictly increasing sequence base[i] = 7i - 300000 (n = 100000) rotated left by 61234.
// base[12345] sits at rotated index (12345 - 61234) mod 100000 = 51111.
const ROT_N = 100000;
const ROT_SHIFT = 61234;
const ROT_ARRAY = Array.from({ length: ROT_N }, (_, j) => 7 * ((j + ROT_SHIFT) % ROT_N) - 300000).join(" ");
const ROT_TARGET = 7 * 12345 - 300000;

export const REAL_ARRAYS: ProblemSpec[] = [
  {
    title: "Remove Duplicates from Sorted Array",
    difficulty: "Easy",
    companies: ["Amazon", "Microsoft", "Apple"],
    description:
      "You are given an array `nums` sorted in non-decreasing order. Remove the duplicates so that every distinct value appears exactly once, keeping the original relative order.\n\nPrint the number of distinct values `k` on the first line and the distinct values themselves (in order) on the second line. An in-place two-pointer solution with O(1) extra space is expected.",
    constraints: "1 <= nums.length <= 3 * 10^4\n-100 <= nums[i] <= 100\nnums is sorted in non-decreasing order.",
    inputFormat: "One line of space-separated integers `nums`.",
    outputFormat: "Line 1: the integer `k`.\nLine 2: the `k` distinct values, space-separated, in increasing order.",
    examples: [
      { input: "1 1 2", output: "2\n1 2", explanation: "The distinct values are 1 and 2." },
      { input: "0 0 1 1 1 2 2 3 3 4", output: "5\n0 1 2 3 4" },
    ],
    testCases: [
      { input: "1 1 2", expectedOutput: "2\n1 2", isHidden: false },
      { input: "0 0 1 1 1 2 2 3 3 4", expectedOutput: "5\n0 1 2 3 4", isHidden: false },
      { input: "5", expectedOutput: "1\n5", isHidden: true },
      { input: "-3 -3 -3", expectedOutput: "1\n-3", isHidden: true },
      { input: "-5 -2 -2 0 0 7", expectedOutput: "4\n-5 -2 0 7", isHidden: true },
      { input: "1 2 3 4", expectedOutput: "4\n1 2 3 4", isHidden: true },
      {
        input: DEDUP_PERF,
        expectedOutput: "50\n" + Array.from({ length: 50 }, (_, i) => i).join(" "),
        isHidden: true,
      },
    ],
    hints: [
      "Because the array is sorted, equal values sit next to each other.",
      "Keep a write pointer `k` marking the end of the de-duplicated prefix and a read pointer scanning ahead.",
      "Copy nums[read] to nums[k] only when it differs from the last value kept, nums[k - 1].",
    ],
    editorial:
      "Two pointers. The prefix nums[0..k-1] always holds the distinct values seen so far. For each read index i, if nums[i] != nums[k-1] we write it at position k and advance k. Equal values are adjacent because of sorting, so comparing with the last kept value is enough. Time O(n), extra space O(1).",
    solutions: {
      javascript: code`
        function solve(input) {
          const nums = input.trim().split(/\s+/).map(Number);
          let k = 1;
          for (let i = 1; i < nums.length; i++) {
            if (nums[i] !== nums[k - 1]) nums[k++] = nums[i];
          }
          return k + "\n" + nums.slice(0, k).join(" ");
        }
      `,
      python: code`
        def solve(input_str):
            nums = list(map(int, input_str.split()))
            k = 1
            for i in range(1, len(nums)):
                if nums[i] != nums[k - 1]:
                    nums[k] = nums[i]
                    k += 1
            return str(k) + "\n" + " ".join(map(str, nums[:k]))
      `,
    },
  },
  {
    title: "Plus One",
    difficulty: "Easy",
    companies: ["Google", "Amazon", "Apple"],
    description:
      "A non-negative integer is stored as an array `digits`, most significant digit first. Add one to the number and print the resulting digits.\n\nThe array has no leading zeros, except for the number `0` itself which is given as a single digit.",
    constraints: "1 <= digits.length <= 1000\n0 <= digits[i] <= 9\nNo leading zeros except for the number 0 itself.",
    inputFormat: "One line of space-separated digits.",
    outputFormat: "One line of space-separated digits of the incremented number.",
    examples: [
      { input: "1 2 3", output: "1 2 4", explanation: "123 + 1 = 124." },
      { input: "9 9", output: "1 0 0", explanation: "99 + 1 = 100, so the array grows by one digit." },
    ],
    testCases: [
      { input: "1 2 3", expectedOutput: "1 2 4", isHidden: false },
      { input: "9 9", expectedOutput: "1 0 0", isHidden: false },
      { input: "0", expectedOutput: "1", isHidden: true },
      { input: "9", expectedOutput: "1 0", isHidden: true },
      { input: "4 3 2 1", expectedOutput: "4 3 2 2", isHidden: true },
      { input: "1 9 9", expectedOutput: "2 0 0", isHidden: true },
      { input: "8 9 9 9", expectedOutput: "9 0 0 0", isHidden: true },
      {
        input: Array.from({ length: 1000 }, () => 9).join(" "),
        expectedOutput: "1" + " 0".repeat(1000),
        isHidden: true,
      },
    ],
    hints: [
      "Think about how you add 1 by hand: start at the last digit.",
      "A digit below 9 simply becomes digit + 1 and you can stop; a 9 becomes 0 and carries to the left.",
      "If the carry falls off the front (all digits were 9), the answer is a 1 followed by zeros.",
    ],
    editorial:
      "Walk from the least significant digit. While the digit is 9, set it to 0 and move left. At the first digit that is not 9, increment it and stop. If every digit was 9, prepend a 1. Time O(n), space O(1) beyond the output.",
    solutions: {
      javascript: code`
        function solve(input) {
          const d = input.trim().split(/\s+/).map(Number);
          let i = d.length - 1;
          while (i >= 0 && d[i] === 9) {
            d[i] = 0;
            i--;
          }
          if (i >= 0) d[i]++;
          else d.unshift(1);
          return d.join(" ");
        }
      `,
      python: code`
        def solve(input_str):
            d = list(map(int, input_str.split()))
            i = len(d) - 1
            while i >= 0 and d[i] == 9:
                d[i] = 0
                i -= 1
            if i >= 0:
                d[i] += 1
            else:
                d.insert(0, 1)
            return " ".join(map(str, d))
      `,
    },
  },
  {
    title: "Find Pivot Index",
    difficulty: "Easy",
    companies: ["Amazon", "Meta"],
    description:
      "Given an array of integers `nums`, the pivot index is an index where the sum of all the numbers strictly to its left equals the sum of all the numbers strictly to its right. An empty side counts as sum `0`.\n\nPrint the **leftmost** pivot index, or `-1` if no such index exists.",
    constraints: "1 <= nums.length <= 10^4\n-1000 <= nums[i] <= 1000",
    inputFormat: "One line of space-separated integers `nums`.",
    outputFormat: "The leftmost pivot index, or -1.",
    examples: [
      { input: "1 7 3 6 5 6", output: "3", explanation: "Left sum 1+7+3 = 11 equals right sum 5+6 = 11." },
      { input: "1 2 3", output: "-1", explanation: "No index balances the two sides." },
    ],
    testCases: [
      { input: "1 7 3 6 5 6", expectedOutput: "3", isHidden: false },
      { input: "1 2 3", expectedOutput: "-1", isHidden: false },
      { input: "2 1 -1", expectedOutput: "0", isHidden: true },
      { input: "0", expectedOutput: "0", isHidden: true },
      { input: "-1 -1 0 1 1 0", expectedOutput: "5", isHidden: true },
      { input: "1 -1", expectedOutput: "-1", isHidden: true },
      { input: "0 0 0", expectedOutput: "0", isHidden: true },
    ],
    hints: [
      "Computing both sums from scratch for every index is O(n^2).",
      "Let total be the sum of the whole array. If left is the sum before index i, the right sum is total - left - nums[i].",
      "Scan once, updating left after checking each index, and return the first index where left == total - left - nums[i].",
    ],
    editorial:
      "Prefix-sum idea with a running total. Precompute total. At index i, the left sum is the running prefix and the right sum is total - left - nums[i]. Return the first i where they match, otherwise -1. Negative values are fine because we only compare equality. Time O(n), space O(1).",
    solutions: {
      javascript: code`
        function solve(input) {
          const nums = input.trim().split(/\s+/).map(Number);
          const total = nums.reduce((a, b) => a + b, 0);
          let left = 0;
          for (let i = 0; i < nums.length; i++) {
            if (left === total - left - nums[i]) return String(i);
            left += nums[i];
          }
          return "-1";
        }
      `,
      python: code`
        def solve(input_str):
            nums = list(map(int, input_str.split()))
            total = sum(nums)
            left = 0
            for i, x in enumerate(nums):
                if left == total - left - x:
                    return str(i)
                left += x
            return "-1"
      `,
    },
  },
  {
    title: "Second Largest Distinct Element",
    difficulty: "Easy",
    companies: ["TCS", "Infosys", "Wipro", "Accenture"],
    description:
      "Given an array of integers, print the second largest **distinct** value (strictly smaller than the maximum). If the array has no such value (for example every element is equal, or there is only one element), print `-1`.\n\nTry to do it in a single pass without sorting.",
    constraints: "1 <= n <= 10^5\n-10^9 <= arr[i] <= 10^9",
    inputFormat: "One line of space-separated integers.",
    outputFormat: "The second largest distinct value, or -1 if it does not exist.",
    examples: [
      { input: "12 35 1 10 34 1", output: "34", explanation: "The maximum is 35 and the next distinct value is 34." },
      { input: "10 10 10", output: "-1", explanation: "There is only one distinct value." },
    ],
    testCases: [
      { input: "12 35 1 10 34 1", expectedOutput: "34", isHidden: false },
      { input: "10 10 10", expectedOutput: "-1", isHidden: false },
      { input: "5", expectedOutput: "-1", isHidden: true },
      { input: "-5 -2 -9", expectedOutput: "-5", isHidden: true },
      { input: "7 7 3", expectedOutput: "3", isHidden: true },
      { input: "1 2", expectedOutput: "1", isHidden: true },
      { input: "35 35 12 34 34", expectedOutput: "34", isHidden: true },
    ],
    hints: [
      "Sorting works in O(n log n), but one pass is enough.",
      "Maintain two variables: the largest value and the largest value strictly below it.",
      "When a new value equals the current maximum, ignore it; otherwise it can only replace the maximum or the runner-up.",
    ],
    editorial:
      "Keep first (maximum) and second (best value strictly less than first). For each x: if x > first then second = first, first = x; else if x < first and x > second then second = x. Equal values are skipped so duplicates of the maximum never become the runner-up. If second was never set, print -1. Time O(n), space O(1).",
    solutions: {
      javascript: code`
        function solve(input) {
          const nums = input.trim().split(/\s+/).map(Number);
          let first = null;
          let second = null;
          for (const x of nums) {
            if (first === null || x > first) {
              second = first;
              first = x;
            } else if (x < first && (second === null || x > second)) {
              second = x;
            }
          }
          return second === null ? "-1" : String(second);
        }
      `,
      python: code`
        def solve(input_str):
            nums = list(map(int, input_str.split()))
            first = second = None
            for x in nums:
                if first is None or x > first:
                    second = first
                    first = x
                elif x < first and (second is None or x > second):
                    second = x
            return "-1" if second is None else str(second)
      `,
    },
  },
  {
    title: "Merge Sorted Array",
    difficulty: "Easy",
    companies: ["Meta", "Microsoft", "Amazon", "Adobe"],
    description:
      "You are given two arrays `a` and `b`, each sorted in non-decreasing order. Print a single array containing all elements of both, also sorted in non-decreasing order.\n\nAim for a linear-time merge using two pointers rather than concatenating and sorting.",
    constraints: "1 <= a.length, b.length <= 10^5\n-10^9 <= a[i], b[i] <= 10^9\nBoth arrays are sorted in non-decreasing order.",
    inputFormat: "Line 1: space-separated integers of `a`.\nLine 2: space-separated integers of `b`.",
    outputFormat: "One line with the merged sorted array, space-separated.",
    examples: [
      { input: "1 2 3\n2 5 6", output: "1 2 2 3 5 6" },
      { input: "4 5 6\n1 2 3", output: "1 2 3 4 5 6" },
    ],
    testCases: [
      { input: "1 2 3\n2 5 6", expectedOutput: "1 2 2 3 5 6", isHidden: false },
      { input: "4 5 6\n1 2 3", expectedOutput: "1 2 3 4 5 6", isHidden: false },
      { input: "1\n1", expectedOutput: "1 1", isHidden: true },
      { input: "-5 0 0\n-6 -5 7", expectedOutput: "-6 -5 -5 0 0 7", isHidden: true },
      { input: "1 2 3 4 5\n9", expectedOutput: "1 2 3 4 5 9", isHidden: true },
      { input: "-10\n-20 -15 -10", expectedOutput: "-20 -15 -10 -10", isHidden: true },
      { input: "3 3 3\n3 3", expectedOutput: "3 3 3 3 3", isHidden: true },
    ],
    hints: [
      "Each array is already sorted, so the smallest remaining element is at the front of one of them.",
      "Keep one pointer per array and repeatedly take the smaller of the two front elements.",
      "When one array is exhausted, append whatever is left of the other.",
    ],
    editorial:
      "Classic merge step of merge sort. Pointers i and j walk a and b; append the smaller of a[i], b[j] (taking from a on ties keeps it stable) until one array runs out, then copy the remainder. Time O(n + m), space O(n + m) for the output.",
    solutions: {
      javascript: code`
        function solve(input) {
          const lines = input.trim().split("\n");
          const a = lines[0].trim().split(/\s+/).map(Number);
          const b = lines[1].trim().split(/\s+/).map(Number);
          const out = [];
          let i = 0;
          let j = 0;
          while (i < a.length && j < b.length) {
            if (a[i] <= b[j]) out.push(a[i++]);
            else out.push(b[j++]);
          }
          while (i < a.length) out.push(a[i++]);
          while (j < b.length) out.push(b[j++]);
          return out.join(" ");
        }
      `,
      python: code`
        def solve(input_str):
            lines = input_str.strip().split("\n")
            a = list(map(int, lines[0].split()))
            b = list(map(int, lines[1].split()))
            out = []
            i = j = 0
            while i < len(a) and j < len(b):
                if a[i] <= b[j]:
                    out.append(a[i])
                    i += 1
                else:
                    out.append(b[j])
                    j += 1
            out.extend(a[i:])
            out.extend(b[j:])
            return " ".join(map(str, out))
      `,
    },
  },
  {
    title: "Leaders in an Array",
    difficulty: "Easy",
    companies: ["Amazon", "Zoho"],
    description:
      "An element of an array is a **leader** if it is strictly greater than every element to its right. The last element is always a leader.\n\nPrint all leaders in the order in which they appear in the array (left to right).",
    constraints: "1 <= n <= 10^5\n-10^9 <= arr[i] <= 10^9",
    inputFormat: "One line of space-separated integers.",
    outputFormat: "The leaders, space-separated, in their original left-to-right order.",
    examples: [
      { input: "16 17 4 3 5 2", output: "17 5 2", explanation: "17 > everything after it, 5 > 2, and 2 is last." },
      { input: "1 2 3 4 0", output: "4 0" },
    ],
    testCases: [
      { input: "16 17 4 3 5 2", expectedOutput: "17 5 2", isHidden: false },
      { input: "1 2 3 4 0", expectedOutput: "4 0", isHidden: false },
      { input: "5", expectedOutput: "5", isHidden: true },
      { input: "5 4 3 2 1", expectedOutput: "5 4 3 2 1", isHidden: true },
      { input: "7 7 7", expectedOutput: "7", isHidden: true },
      { input: "-1 -3 -2", expectedOutput: "-1 -2", isHidden: true },
      { input: "1 2 3 4 5", expectedOutput: "5", isHidden: true },
      { input: "3 1 2", expectedOutput: "3 2", isHidden: true },
    ],
    hints: [
      "Checking every element against everything on its right costs O(n^2).",
      "Look at the array from right to left: what single value tells you whether the current element beats everything to its right?",
      "Keep the running maximum of the suffix. An element is a leader when it is strictly greater than that maximum; collect leaders and reverse the list at the end.",
    ],
    editorial:
      "Scan from the right while tracking the maximum seen so far (initially -infinity). An element strictly greater than that maximum is a leader, and the maximum is then updated. Because we collect leaders right-to-left, reverse them before printing. Equal values are not leaders since the comparison is strict. Time O(n), space O(1) besides the output.",
    solutions: {
      javascript: code`
        function solve(input) {
          const a = input.trim().split(/\s+/).map(Number);
          const out = [];
          let best = -Infinity;
          for (let i = a.length - 1; i >= 0; i--) {
            if (a[i] > best) {
              out.push(a[i]);
              best = a[i];
            }
          }
          return out.reverse().join(" ");
        }
      `,
      python: code`
        def solve(input_str):
            a = list(map(int, input_str.split()))
            out = []
            best = float("-inf")
            for x in reversed(a):
                if x > best:
                    out.append(x)
                    best = x
            return " ".join(map(str, reversed(out)))
      `,
    },
  },
  {
    title: "Kth Missing Positive Number",
    difficulty: "Easy",
    companies: ["Google", "Meta", "Amazon"],
    description:
      "You are given a strictly increasing array `arr` of positive integers and an integer `k`. Considering the positive integers `1, 2, 3, ...` that do **not** appear in `arr`, print the `k`-th one of them.\n\nA solution faster than counting up one number at a time (binary search) is expected.",
    constraints: "1 <= arr.length <= 10^5\n1 <= arr[i] <= 10^6, strictly increasing\n1 <= k <= 10^6",
    inputFormat: "Line 1: space-separated integers `arr`.\nLine 2: the integer `k`.",
    outputFormat: "The k-th missing positive integer.",
    examples: [
      { input: "2 3 4 7 11\n5", output: "9", explanation: "Missing numbers are 1, 5, 6, 8, 9, 10, ... and the 5th is 9." },
      { input: "1 2 3 4\n2", output: "6", explanation: "Missing numbers are 5, 6, 7, ... so the 2nd is 6." },
    ],
    testCases: [
      { input: "2 3 4 7 11\n5", expectedOutput: "9", isHidden: false },
      { input: "1 2 3 4\n2", expectedOutput: "6", isHidden: false },
      { input: "5\n1", expectedOutput: "1", isHidden: true },
      { input: "5\n5", expectedOutput: "6", isHidden: true },
      { input: "1 2 3\n1", expectedOutput: "4", isHidden: true },
      { input: "2 5 6\n3", expectedOutput: "4", isHidden: true },
      { input: "1\n1", expectedOutput: "2", isHidden: true },
      { input: KTH_MISSING_PERF, expectedOutput: "250000", isHidden: true },
    ],
    hints: [
      "For index i, arr[i] - (i + 1) is the number of positive integers missing before arr[i].",
      "That count never decreases as i grows, so you can binary search for the first index whose missing-count is at least k.",
      "If that first index is lo (0 if none qualifies is lo = n), the answer is lo + k.",
    ],
    editorial:
      "Let missing(i) = arr[i] - (i + 1), the number of absent positives before arr[i]. It is non-decreasing, so binary search for the smallest lo in [0, n] with missing(lo) >= k (treat lo = n as always true). Exactly lo array elements are smaller than the answer, so the answer is lo + k. Time O(log n), space O(1).",
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
    title: "Valid Mountain Array",
    difficulty: "Easy",
    companies: ["Amazon", "Google"],
    description:
      "An array `arr` is a **mountain** if it has at least 3 elements and there is an index `p` with `0 < p < n - 1` such that `arr[0] < arr[1] < ... < arr[p]` and `arr[p] > arr[p + 1] > ... > arr[n - 1]`.\n\nPrint `true` if the array is a mountain, otherwise `false`. Equal neighbours break the strict ordering.",
    constraints: "1 <= n <= 10^5\n0 <= arr[i] <= 10^5",
    inputFormat: "One line of space-separated integers.",
    outputFormat: "`true` or `false`.",
    examples: [
      { input: "0 3 2 1", output: "true", explanation: "Strictly up to 3, then strictly down." },
      { input: "3 5 5", output: "false", explanation: "5 5 is not strictly increasing, and there is no descent." },
    ],
    testCases: [
      { input: "0 3 2 1", expectedOutput: "true", isHidden: false },
      { input: "3 5 5", expectedOutput: "false", isHidden: false },
      { input: "2 1", expectedOutput: "false", isHidden: true },
      { input: "1 2 3", expectedOutput: "false", isHidden: true },
      { input: "3 2 1", expectedOutput: "false", isHidden: true },
      { input: "1 3 2", expectedOutput: "true", isHidden: true },
      { input: "0 2 3 3 5 2 1 0", expectedOutput: "false", isHidden: true },
      { input: "1 2 1 2", expectedOutput: "false", isHidden: true },
      { input: MOUNTAIN_PERF, expectedOutput: "true", isHidden: true },
    ],
    hints: [
      "A mountain has exactly one climb followed by exactly one descent.",
      "Walk up while the next element is strictly larger, then walk down while the next element is strictly smaller.",
      "The array is a mountain only if the peak is neither the first nor the last element and the descent reaches the last index.",
    ],
    editorial:
      "One pass with a pointer. Advance i while arr[i] < arr[i+1]. If i is 0 (no climb) or n-1 (no descent), answer false. Then advance while arr[i] > arr[i+1]. The array is a mountain exactly when i ends at n-1. Time O(n), space O(1).",
    solutions: {
      javascript: code`
        function solve(input) {
          const a = input.trim().split(/\s+/).map(Number);
          const n = a.length;
          let i = 0;
          while (i + 1 < n && a[i] < a[i + 1]) i++;
          if (i === 0 || i === n - 1) return "false";
          while (i + 1 < n && a[i] > a[i + 1]) i++;
          return i === n - 1 ? "true" : "false";
        }
      `,
      python: code`
        def solve(input_str):
            a = list(map(int, input_str.split()))
            n = len(a)
            i = 0
            while i + 1 < n and a[i] < a[i + 1]:
                i += 1
            if i == 0 or i == n - 1:
                return "false"
            while i + 1 < n and a[i] > a[i + 1]:
                i += 1
            return "true" if i == n - 1 else "false"
      `,
    },
  },
  {
    title: "Next Permutation",
    difficulty: "Medium",
    companies: ["Google", "Amazon", "Microsoft", "Meta"],
    description:
      "Given an array of integers `nums` (a permutation of its values, duplicates allowed), print the next lexicographically greater arrangement of the same numbers.\n\nIf the array is already the largest arrangement (sorted in non-increasing order), print the smallest arrangement instead (sorted ascending). The rearrangement should use O(1) extra space.",
    constraints: "1 <= nums.length <= 10^5\n-10^9 <= nums[i] <= 10^9",
    inputFormat: "One line of space-separated integers `nums`.",
    outputFormat: "One line with the next permutation, space-separated.",
    examples: [
      { input: "1 2 3", output: "1 3 2" },
      { input: "3 2 1", output: "1 2 3", explanation: "3 2 1 is the largest arrangement, so wrap around to the smallest." },
    ],
    testCases: [
      { input: "1 2 3", expectedOutput: "1 3 2", isHidden: false },
      { input: "3 2 1", expectedOutput: "1 2 3", isHidden: false },
      { input: "1 1 5", expectedOutput: "1 5 1", isHidden: true },
      { input: "1", expectedOutput: "1", isHidden: true },
      { input: "1 3 2", expectedOutput: "2 1 3", isHidden: true },
      { input: "2 2 2", expectedOutput: "2 2 2", isHidden: true },
      { input: "5 4 7 5 3 2", expectedOutput: "5 5 2 3 4 7", isHidden: true },
      { input: "-1 -2 -3", expectedOutput: "-3 -2 -1", isHidden: true },
      { input: NEXT_PERM_PERF, expectedOutput: NEXT_PERM_EXPECTED, isHidden: true },
    ],
    hints: [
      "The longest non-increasing suffix cannot be made larger by rearranging itself.",
      "Find the rightmost index i with nums[i] < nums[i + 1]; then swap nums[i] with the rightmost element in the suffix that is larger than nums[i].",
      "After the swap the suffix is still non-increasing; reverse it to make it the smallest possible. If no such i exists, just reverse the whole array.",
    ],
    editorial:
      "1) Find the pivot i, the last index with nums[i] < nums[i+1] (the suffix after i is non-increasing). 2) If it exists, find the rightmost j > i with nums[j] > nums[i] and swap them. 3) Reverse nums[i+1..]. If no pivot exists the array is the largest permutation and step 3 on the whole array gives the smallest. Time O(n), space O(1).",
    solutions: {
      javascript: code`
        function solve(input) {
          const a = input.trim().split(/\s+/).map(Number);
          const n = a.length;
          let i = n - 2;
          while (i >= 0 && a[i] >= a[i + 1]) i--;
          if (i >= 0) {
            let j = n - 1;
            while (a[j] <= a[i]) j--;
            [a[i], a[j]] = [a[j], a[i]];
          }
          let l = i + 1;
          let r = n - 1;
          while (l < r) {
            [a[l], a[r]] = [a[r], a[l]];
            l++;
            r--;
          }
          return a.join(" ");
        }
      `,
      python: code`
        def solve(input_str):
            a = list(map(int, input_str.split()))
            n = len(a)
            i = n - 2
            while i >= 0 and a[i] >= a[i + 1]:
                i -= 1
            if i >= 0:
                j = n - 1
                while a[j] <= a[i]:
                    j -= 1
                a[i], a[j] = a[j], a[i]
            a[i + 1:] = reversed(a[i + 1:])
            return " ".join(map(str, a))
      `,
    },
  },
  {
    title: "Search in Rotated Sorted Array",
    difficulty: "Medium",
    companies: ["Amazon", "Microsoft", "Meta", "Google"],
    description:
      "A sorted array of **distinct** integers was rotated at an unknown pivot, e.g. `[0 1 2 4 5 6 7]` may become `[4 5 6 7 0 1 2]`. Given the rotated array `nums` and an integer `target`, print the index of `target`, or `-1` if it is not present.\n\nYou must achieve O(log n) time.",
    constraints: "1 <= nums.length <= 10^5\n-10^9 <= nums[i], target <= 10^9\nAll values of nums are distinct; nums is a rotation of a strictly increasing array.",
    inputFormat: "Line 1: space-separated integers `nums`.\nLine 2: the integer `target`.",
    outputFormat: "The index of `target`, or -1.",
    examples: [
      { input: "4 5 6 7 0 1 2\n0", output: "4" },
      { input: "4 5 6 7 0 1 2\n3", output: "-1" },
    ],
    testCases: [
      { input: "4 5 6 7 0 1 2\n0", expectedOutput: "4", isHidden: false },
      { input: "4 5 6 7 0 1 2\n3", expectedOutput: "-1", isHidden: false },
      { input: "1\n0", expectedOutput: "-1", isHidden: true },
      { input: "1\n1", expectedOutput: "0", isHidden: true },
      { input: "3 1\n1", expectedOutput: "1", isHidden: true },
      { input: "5 1 3\n5", expectedOutput: "0", isHidden: true },
      { input: "1 2 3 4 5\n4", expectedOutput: "3", isHidden: true },
      { input: ROT_ARRAY + "\n" + ROT_TARGET, expectedOutput: "51111", isHidden: true },
    ],
    hints: [
      "Whatever midpoint you choose, at least one of the two halves is sorted.",
      "Decide which half is sorted by comparing nums[lo] with nums[mid].",
      "If target lies inside the range of the sorted half, search that half; otherwise search the other one.",
    ],
    editorial:
      "Modified binary search. With lo, hi, mid: if nums[lo] <= nums[mid] the left half is sorted. If nums[lo] <= target < nums[mid] go left, else go right. Otherwise the right half is sorted: if nums[mid] < target <= nums[hi] go right, else go left. Return mid when nums[mid] equals the target. Time O(log n), space O(1).",
    solutions: {
      javascript: code`
        function solve(input) {
          const lines = input.trim().split("\n");
          const a = lines[0].trim().split(/\s+/).map(Number);
          const target = Number(lines[1]);
          let lo = 0;
          let hi = a.length - 1;
          while (lo <= hi) {
            const mid = (lo + hi) >> 1;
            if (a[mid] === target) return String(mid);
            if (a[lo] <= a[mid]) {
              if (a[lo] <= target && target < a[mid]) hi = mid - 1;
              else lo = mid + 1;
            } else {
              if (a[mid] < target && target <= a[hi]) lo = mid + 1;
              else hi = mid - 1;
            }
          }
          return "-1";
        }
      `,
      python: code`
        def solve(input_str):
            lines = input_str.strip().split("\n")
            a = list(map(int, lines[0].split()))
            target = int(lines[1])
            lo, hi = 0, len(a) - 1
            while lo <= hi:
                mid = (lo + hi) // 2
                if a[mid] == target:
                    return str(mid)
                if a[lo] <= a[mid]:
                    if a[lo] <= target < a[mid]:
                        hi = mid - 1
                    else:
                        lo = mid + 1
                else:
                    if a[mid] < target <= a[hi]:
                        lo = mid + 1
                    else:
                        hi = mid - 1
            return "-1"
      `,
    },
  },
  // @@NEXT
];
