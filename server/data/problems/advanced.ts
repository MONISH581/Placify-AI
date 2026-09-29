/**
 * Pattern categories: bit manipulation, sliding window, two pointers, advanced interview problems.
 *
 * Long "performance" inputs are generated deterministically below (seeded PRNG) so they are identical on every
 * machine; their expected outputs are literals verified against independent brute-force implementations.
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

function randomInts(seed: number, length: number, bound: number): number[] {
  const next = seededRandom(seed);
  return Array.from({ length }, () => next(bound));
}

function randomLetters(seed: number, length: number, alphabet: string): string {
  const next = seededRandom(seed);
  return Array.from({ length }, () => alphabet[next(alphabet.length)]).join("");
}

const sortedNumbers = (values: number[]) => [...values].sort((a, b) => a - b);

// 1500 values below 2^31: fine for a trie, pointless to brute force at the upper constraint.
const MAX_XOR_PERF = randomInts(101, 1500, 2 ** 31).join(" ");

// 15000 letters: an O(n^2) scan over all substrings times out, the sliding window is instant.
const CHAR_REPLACEMENT_PERF = randomLetters(202, 15000, "ABC") + "\n" + 300;

// The only windows containing X, Y and Z sit near the end, so "extend from every start" is quadratic.
const LOWER = "abcdefghijklmnopqrstuvw";
const MIN_WINDOW_PERF =
  randomLetters(303, 8000, LOWER) +
  "X" +
  randomLetters(304, 4000, LOWER) +
  "Y" +
  randomLetters(305, 1500, LOWER) +
  "Z" +
  "qrstu" +
  "Y" +
  "ab" +
  "X" +
  randomLetters(306, 10, LOWER) +
  "\nXYZ";

const CONTAINER_PERF = randomInts(404, 3000, 10001).join(" ");

const TRAPPING_PERF = randomInts(505, 3000, 5001).join(" ");

const LRU_PERF = (() => {
  const next = seededRandom(606);
  const lines = ["250"];
  for (let i = 0; i < 1300; i++) {
    if (next(10) === 0) lines.push(`get ${next(400)}`);
    else lines.push(`put ${next(400)} ${next(10001)}`);
  }
  return lines.join("\n");
})();
const LRU_PERF_EXPECTED =
  "-1 -1 -1 -1 -1 3864 -1 -1 2542 -1 -1 -1 -1 2660 -1 -1 -1 -1 -1 -1 -1 -1 -1 -1 -1 2475 -1 8501 8362 3713 -1 2643 -1 -1 " +
  "2475 -1 -1 -1 9981 1575 -1 6842 -1 -1 436 5969 -1 -1 7979 2711 8362 -1 5894 -1 6332 4642 8010 4165 -1 9725 2820 4852 2820 " +
  "2475 6842 -1 -1 -1 7979 -1 4998 -1 -1 -1 -1 9249 -1 250 -1 -1 -1 7045 -1 -1 7874 8427 -1 4386 5255 -1 5082 6597 1810 4973 " +
  "-1 8855 8234 -1 -1 -1 1249 2563 4962 -1 7191 421 2038 -1 -1 -1 3302 -1 5844 8629 8222 45 9814 829 -1 5549 6766 9065 3866 " +
  "7852 8328 9864 -1 1068 -1 -1 -1 2617";

const MEDIAN_PERF = (() => {
  const shift = (values: number[]) => values.map((v) => v - 1000000);
  const first = sortedNumbers(shift(randomInts(707, 1000, 2000001)));
  const second = sortedNumbers(shift(randomInts(708, 1000, 2000001)));
  return first.join(" ") + "\n" + second.join(" ");
})();

export const ADVANCED_SPECS: Record<string, ProblemSpec[]> = {
  bitManipulation: [
    {
      title: "Single Number",
      difficulty: "Easy",
      description:
        "Given a non-empty array of integers `nums`, every element appears exactly twice except for one element, which appears once. Print that single element.\n\nYour solution should run in linear time and use only constant extra space.",
      constraints: "1 <= nums.length <= 3 * 10^4 (nums.length is odd)\n-3 * 10^4 <= nums[i] <= 3 * 10^4\nEvery element appears twice except exactly one.",
      inputFormat: "One line of space-separated integers `nums`.",
      outputFormat: "The element that appears only once.",
      examples: [{ input: "4 1 2 1 2", output: "4", explanation: "1 and 2 each appear twice; 4 appears once." }],
      testCases: [
        { input: "4 1 2 1 2", expectedOutput: "4", isHidden: false },
        { input: "2 2 1", expectedOutput: "1", isHidden: false },
        { input: "1", expectedOutput: "1", isHidden: true },
        { input: "-1 -1 -2", expectedOutput: "-2", isHidden: true },
        { input: "7 0 7", expectedOutput: "0", isHidden: true },
        { input: "30000 -30000 12 30000 -30000", expectedOutput: "12", isHidden: true },
      ],
      hints: [
        "A hash map of counts works, but it needs O(n) extra space.",
        "XOR has two useful properties: x ^ x = 0 and x ^ 0 = x, and it is commutative.",
        "XOR all the numbers together: every pair cancels out and only the single number is left.",
      ],
      editorial:
        "XOR is associative and commutative, x ^ x = 0 and x ^ 0 = x. XOR-ing every element therefore cancels each pair and leaves exactly the element that appears once (this also works for negative numbers in two's complement). Time O(n), space O(1).",
      solutions: {
        javascript: code`
          function solve(input) {
            let result = 0;
            for (const token of input.trim().split(/\s+/)) result ^= Number(token);
            return String(result);
          }
        `,
        python: code`
          def solve(input_str):
              result = 0
              for token in input_str.split():
                  result ^= int(token)
              return str(result)
        `,
      },
    },
    {
      title: "Bitwise AND of Numbers Range",
      difficulty: "Medium",
      description:
        "Given two integers `left` and `right` that represent the range `[left, right]`, print the bitwise AND of all numbers in this range, inclusive.\n\nThe range can contain up to 2^31 numbers, so looping over it is too slow.",
      constraints: "0 <= left <= right <= 2^31 - 1",
      inputFormat: "One line with two space-separated integers `left right`.",
      outputFormat: "The bitwise AND of every integer in `[left, right]`.",
      examples: [{ input: "5 7", output: "4", explanation: "5 = 101, 6 = 110, 7 = 111 in binary; 101 & 110 & 111 = 100 = 4." }],
      testCases: [
        { input: "5 7", expectedOutput: "4", isHidden: false },
        { input: "0 0", expectedOutput: "0", isHidden: false },
        { input: "1 2147483647", expectedOutput: "0", isHidden: true },
        { input: "12 15", expectedOutput: "12", isHidden: true },
        { input: "26 30", expectedOutput: "24", isHidden: true },
        { input: "7 7", expectedOutput: "7", isHidden: true },
        { input: "2147483646 2147483647", expectedOutput: "2147483646", isHidden: true },
        { input: "1073741824 2147483647", expectedOutput: "1073741824", isHidden: true },
      ],
      hints: [
        "Looping over the whole range takes up to 2^31 steps - far too slow.",
        "If a bit position takes both values 0 and 1 somewhere in the range, that bit is 0 in the AND.",
        "The answer is the common binary prefix of left and right: shift both right until they are equal, then shift the prefix back.",
      ],
      editorial:
        "Let b be the highest bit where left and right differ. Every bit at or below b flips somewhere inside the range, so those bits are 0 in the result; every bit above b is shared by all numbers in the range. So the answer is the common binary prefix of left and right followed by zeros: shift both numbers right until they are equal (counting the shifts), then shift the common value back left. An equivalent loop clears the lowest set bit of right (right &= right - 1) while right > left. Time O(log right), space O(1).",
      solutions: {
        javascript: code`
          function solve(input) {
            let [left, right] = input.trim().split(/\s+/).map(Number);
            let shift = 0;
            while (left !== right) {
              left >>= 1;
              right >>= 1;
              shift++;
            }
            return String(left << shift);
          }
        `,
        python: code`
          def solve(input_str):
              left, right = map(int, input_str.split())
              shift = 0
              while left != right:
                  left >>= 1
                  right >>= 1
                  shift += 1
              return str(left << shift)
        `,
      },
    },
    {
      title: "Maximum XOR of Two Numbers in an Array",
      difficulty: "Hard",
      description:
        "Given an array of non-negative integers `nums`, print the maximum value of `nums[i] XOR nums[j]`, where `0 <= i <= j < n`.\n\nA single-element array therefore has answer `0`.",
      constraints: "1 <= nums.length <= 2 * 10^4\n0 <= nums[i] <= 2^31 - 1",
      inputFormat: "One line of space-separated non-negative integers `nums`.",
      outputFormat: "The maximum XOR of any pair as an integer.",
      examples: [{ input: "3 10 5 25 2 8", output: "28", explanation: "The maximum is 5 XOR 25 = 00101 XOR 11001 = 11100 = 28." }],
      testCases: [
        { input: "3 10 5 25 2 8", expectedOutput: "28", isHidden: false },
        { input: "14 70 53 83 49 91 36 80 92 51 66 70", expectedOutput: "127", isHidden: false },
        { input: "0", expectedOutput: "0", isHidden: true },
        { input: "7 7 7", expectedOutput: "0", isHidden: true },
        { input: "1 2", expectedOutput: "3", isHidden: true },
        { input: "8 10 2", expectedOutput: "10", isHidden: true },
        { input: "2147483647 0 1073741824", expectedOutput: "2147483647", isHidden: true },
        { input: MAX_XOR_PERF, expectedOutput: "2147482199", isHidden: true },
      ],
      hints: [
        "Checking every pair is O(n^2) - too slow for large inputs.",
        "Build the answer greedily from the highest bit: a 1 in a higher bit beats any combination of lower bits.",
        "Insert the numbers into a binary trie (bit 30 down to 0); for each number, walk the trie preferring the opposite bit at every level.",
      ],
      editorial:
        "Insert each number's 31-bit binary representation into a trie, most significant bit first. To find the best partner for x, walk down from the root and move to the child holding the opposite bit whenever it exists (that bit of the XOR becomes 1); otherwise follow the same bit. The maximum over all x is the answer. Time O(31 * n), space O(31 * n).\n\nAn equivalent approach fixes the answer one bit at a time with a hash set of prefixes: `candidate = best | (1 << bit)` is achievable exactly when two prefixes p and q (the numbers masked to the bits decided so far) satisfy p ^ q = candidate, i.e. candidate ^ p is also in the set.",
      solutions: {
        javascript: code`
          function solve(input) {
            const nums = input.trim().split(/\s+/).map(Number);
            const root = [null, null];
            let best = 0;
            for (const num of nums) {
              let node = root;
              for (let bit = 30; bit >= 0; bit--) {
                const b = (num >> bit) & 1;
                if (!node[b]) node[b] = [null, null];
                node = node[b];
              }
              node = root;
              let xor = 0;
              for (let bit = 30; bit >= 0; bit--) {
                const b = (num >> bit) & 1;
                if (node[b ^ 1]) {
                  xor |= 1 << bit;
                  node = node[b ^ 1];
                } else {
                  node = node[b];
                }
              }
              if (xor > best) best = xor;
            }
            return String(best);
          }
        `,
        python: code`
          def solve(input_str):
              nums = list(map(int, input_str.split()))
              best = 0
              mask = 0
              for bit in range(30, -1, -1):
                  mask |= 1 << bit
                  prefixes = {num & mask for num in nums}
                  candidate = best | (1 << bit)
                  if any((candidate ^ prefix) in prefixes for prefix in prefixes):
                      best = candidate
              return str(best)
        `,
      },
    },
  ],
  slidingWindow: [
    {
      title: "Maximum Sum Subarray of Size K",
      difficulty: "Easy",
      description:
        "Given an integer array `nums` and an integer `k`, print the maximum sum of any contiguous subarray of exactly `k` elements.\n\nThe array may contain negative numbers, so the answer can be negative.",
      constraints: "1 <= k <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4",
      inputFormat: "Line 1: space-separated integers `nums`.\nLine 2: the window size `k`.",
      outputFormat: "The maximum sum of a window of size `k`, as an integer.",
      examples: [{ input: "2 1 5 1 3 2\n3", output: "9", explanation: "The window [5, 1, 3] has the largest sum, 9." }],
      testCases: [
        { input: "2 1 5 1 3 2\n3", expectedOutput: "9", isHidden: false },
        { input: "2 3 4 1 5\n2", expectedOutput: "7", isHidden: false },
        { input: "5\n1", expectedOutput: "5", isHidden: true },
        { input: "-1 -2 -3 -4\n2", expectedOutput: "-3", isHidden: true },
        { input: "1 -1 1 -1 1\n5", expectedOutput: "1", isHidden: true },
        { input: "4 4 4 4\n3", expectedOutput: "12", isHidden: true },
        { input: "-10000 10000 -10000 10000 10000\n2", expectedOutput: "20000", isHidden: true },
      ],
      hints: [
        "Recomputing the sum of every window from scratch costs O(n * k).",
        "Two neighbouring windows share k - 1 elements.",
        "Slide the window: add nums[i], subtract nums[i - k], and track the maximum (start from the first window, not from 0).",
      ],
      editorial:
        "Compute the sum of the first k elements, then slide the window one step at a time: the new sum is the old sum + nums[i] - nums[i - k]. Track the maximum over all windows, initialising it with the first window's sum so all-negative arrays are handled. Time O(n), space O(1).",
      solutions: {
        javascript: code`
          function solve(input) {
            const lines = input.trim().split("\n");
            const nums = lines[0].trim().split(/\s+/).map(Number);
            const k = Number(lines[1]);
            let windowSum = 0;
            for (let i = 0; i < k; i++) windowSum += nums[i];
            let best = windowSum;
            for (let i = k; i < nums.length; i++) {
              windowSum += nums[i] - nums[i - k];
              best = Math.max(best, windowSum);
            }
            return String(best);
          }
        `,
        python: code`
          def solve(input_str):
              lines = input_str.strip().split("\n")
              nums = list(map(int, lines[0].split()))
              k = int(lines[1])
              window_sum = sum(nums[:k])
              best = window_sum
              for i in range(k, len(nums)):
                  window_sum += nums[i] - nums[i - k]
                  best = max(best, window_sum)
              return str(best)
        `,
      },
    },
    {
      title: "Longest Repeating Character Replacement",
      difficulty: "Medium",
      description:
        "You are given a string `s` of uppercase English letters and an integer `k`. You may choose any character of the string and change it to any other uppercase English letter, performing this operation at most `k` times.\n\nPrint the length of the longest substring containing only one repeated letter that you can obtain after performing the operations.",
      constraints: "1 <= s.length <= 10^5\ns consists of uppercase English letters only.\n0 <= k <= s.length",
      inputFormat: "Line 1: the string `s`.\nLine 2: the integer `k`.",
      outputFormat: "The length of the longest achievable single-letter substring.",
      examples: [
        { input: "AABABBA\n1", output: "4", explanation: "Replace the 'A' at index 3 with 'B' to get \"AABBBBA\"; the substring \"BBBB\" has length 4." },
      ],
      testCases: [
        { input: "AABABBA\n1", expectedOutput: "4", isHidden: false },
        { input: "ABAB\n2", expectedOutput: "4", isHidden: false },
        { input: "A\n0", expectedOutput: "1", isHidden: true },
        { input: "ABCDE\n0", expectedOutput: "1", isHidden: true },
        { input: "AAAA\n2", expectedOutput: "4", isHidden: true },
        { input: "ABCDE\n5", expectedOutput: "5", isHidden: true },
        { input: "BAAAB\n2", expectedOutput: "5", isHidden: true },
        { input: "ABBBCCCCD\n1", expectedOutput: "5", isHidden: true },
        { input: CHAR_REPLACEMENT_PERF, expectedOutput: "498", isHidden: true },
      ],
      hints: [
        "A window can be turned into one repeated letter iff (window length - count of its most frequent letter) <= k.",
        "Grow the window to the right, and shrink it from the left only when it becomes invalid.",
        "Keep counts for the 26 letters and the highest frequency seen so far; the window size at each step is a candidate answer.",
      ],
      editorial:
        "Sliding window with letter counts. The window [left, right] is fixable while its length minus the frequency of its most common letter is at most k. Move right one step at a time, updating the counts and maxFreq; if the window becomes invalid, move left one step (the window never needs to shrink by more than one). maxFreq may be stale (it never decreases), which is fine: the answer can only grow when a strictly higher frequency appears. Time O(n), space O(26).",
      solutions: {
        javascript: code`
          function solve(input) {
            const lines = input.trim().split("\n");
            const s = lines[0].trim();
            const k = Number(lines[1]);
            const counts = new Array(26).fill(0);
            let left = 0;
            let maxCount = 0;
            let best = 0;
            for (let right = 0; right < s.length; right++) {
              const c = s.charCodeAt(right) - 65;
              counts[c]++;
              maxCount = Math.max(maxCount, counts[c]);
              if (right - left + 1 - maxCount > k) {
                counts[s.charCodeAt(left) - 65]--;
                left++;
              }
              best = Math.max(best, right - left + 1);
            }
            return String(best);
          }
        `,
        python: code`
          def solve(input_str):
              lines = input_str.strip().split("\n")
              s = lines[0].strip()
              k = int(lines[1])
              counts = [0] * 26
              left = max_count = best = 0
              for right, ch in enumerate(s):
                  idx = ord(ch) - 65
                  counts[idx] += 1
                  max_count = max(max_count, counts[idx])
                  if right - left + 1 - max_count > k:
                      counts[ord(s[left]) - 65] -= 1
                      left += 1
                  best = max(best, right - left + 1)
              return str(best)
        `,
      },
    },
    {
      title: "Minimum Window Substring",
      difficulty: "Hard",
      description:
        "Given two strings `s` and `t`, print the minimum window substring of `s` such that every character in `t` (including duplicates) is included in the window. Matching is case-sensitive.\n\nIf several windows share the minimum length, print the one that starts leftmost. If no such window exists, print `NONE`.",
      constraints: "1 <= s.length, t.length <= 10^5\ns and t consist of uppercase and lowercase English letters.",
      inputFormat: "Line 1: the string `s`.\nLine 2: the string `t`.",
      outputFormat: "The minimum window (leftmost on ties), or `NONE` if no window contains all of `t`.",
      examples: [{ input: "ADOBECODEBANC\nABC", output: "BANC", explanation: "\"BANC\" is the shortest substring containing 'A', 'B' and 'C'." }],
      testCases: [
        { input: "ADOBECODEBANC\nABC", expectedOutput: "BANC", isHidden: false },
        { input: "a\naa", expectedOutput: "NONE", isHidden: false },
        { input: "a\na", expectedOutput: "a", isHidden: true },
        { input: "abxba\nab", expectedOutput: "ab", isHidden: true },
        { input: "BbAa\nab", expectedOutput: "bAa", isHidden: true },
        { input: "abcabdebac\ncda", expectedOutput: "cabd", isHidden: true },
        { input: "aaflslflsldkalskaaa\naaa", expectedOutput: "aaa", isHidden: true },
        { input: MIN_WINDOW_PERF, expectedOutput: "ZqrstuYabX", isHidden: true },
      ],
      hints: [
        "Checking every substring is O(n^2) windows - too slow for long strings.",
        "Use two pointers: expand right until the window covers all of t, then shrink from the left while it still does.",
        "Keep a count map of what t still needs plus a single 'missing' counter so validity is O(1); record a window only when it is strictly shorter, which keeps the leftmost one.",
      ],
      editorial:
        "Count the characters of t in `need` and set `missing = t.length`. Move `right` across s: if need[s[right]] > 0 the character was still required, so decrement `missing`; then decrement need[s[right]]. While `missing === 0` the window [left, right] covers t: record it if it is strictly shorter than the best so far, then give s[left] back (increment need, and `missing` if it becomes positive) and advance left. Each pointer moves at most |s| times, so the time is O(|s| + |t|) with O(alphabet) space. Because windows are discovered in order of their right end and only strictly shorter ones replace the best, the leftmost minimum window wins ties.",
      solutions: {
        javascript: code`
          function solve(input) {
            const lines = input.trim().split("\n");
            const s = lines[0].trim();
            const t = (lines[1] || "").trim();
            const need = new Map();
            for (const ch of t) need.set(ch, (need.get(ch) || 0) + 1);
            let missing = t.length;
            let bestStart = 0;
            let bestLen = Infinity;
            let left = 0;
            for (let right = 0; right < s.length; right++) {
              const ch = s[right];
              if (need.has(ch)) {
                if (need.get(ch) > 0) missing--;
                need.set(ch, need.get(ch) - 1);
              }
              while (missing === 0) {
                if (right - left + 1 < bestLen) {
                  bestLen = right - left + 1;
                  bestStart = left;
                }
                const out = s[left];
                if (need.has(out)) {
                  need.set(out, need.get(out) + 1);
                  if (need.get(out) > 0) missing++;
                }
                left++;
              }
            }
            return bestLen === Infinity ? "NONE" : s.slice(bestStart, bestStart + bestLen);
          }
        `,
        python: code`
          from collections import Counter


          def solve(input_str):
              lines = input_str.strip().split("\n")
              s = lines[0].strip()
              t = lines[1].strip() if len(lines) > 1 else ""
              need = Counter(t)
              missing = len(t)
              best_start, best_len = 0, float("inf")
              left = 0
              for right, ch in enumerate(s):
                  if need[ch] > 0:
                      missing -= 1
                  need[ch] -= 1
                  while missing == 0:
                      if right - left + 1 < best_len:
                          best_start, best_len = left, right - left + 1
                      out = s[left]
                      need[out] += 1
                      if need[out] > 0:
                          missing += 1
                      left += 1
              if best_len == float("inf"):
                  return "NONE"
              return s[best_start:best_start + best_len]
        `,
      },
    },
  ],
  twoPointers: [
    {
      title: "Squares of a Sorted Array",
      difficulty: "Easy",
      description:
        "Given an integer array `nums` sorted in non-decreasing order, print the squares of each number, also sorted in non-decreasing order.\n\nSquaring and sorting is O(n log n); try to find an O(n) solution.",
      constraints: "1 <= nums.length <= 10^4\n-10^4 <= nums[i] <= 10^4\nnums is sorted in non-decreasing order.",
      inputFormat: "One line of space-separated integers `nums` in non-decreasing order.",
      outputFormat: "Space-separated squares in non-decreasing order.",
      examples: [{ input: "-4 -1 0 3 10", output: "0 1 9 16 100", explanation: "The squares are 16 1 0 9 100; sorted they become 0 1 9 16 100." }],
      testCases: [
        { input: "-4 -1 0 3 10", expectedOutput: "0 1 9 16 100", isHidden: false },
        { input: "-7 -3 2 3 11", expectedOutput: "4 9 9 49 121", isHidden: false },
        { input: "5", expectedOutput: "25", isHidden: true },
        { input: "-5 -3 -2 -1", expectedOutput: "1 4 9 25", isHidden: true },
        { input: "-2 -2 2 2", expectedOutput: "4 4 4 4", isHidden: true },
        { input: "1 2 3", expectedOutput: "1 4 9", isHidden: true },
        { input: "-10000 0 10000", expectedOutput: "0 100000000 100000000", isHidden: true },
      ],
      hints: [
        "Squaring every element and sorting works in O(n log n).",
        "The largest square is always at one of the two ends of the array.",
        "Use two pointers at both ends and fill the result from the back with the larger of the two squares.",
      ],
      editorial:
        "Because the array is sorted, the largest absolute value is at the left or the right end. Keep pointers at both ends and fill the output from the last position backwards: write the larger of nums[left]^2 and nums[right]^2 and move that pointer inward. Time O(n), space O(n) for the output.",
      solutions: {
        javascript: code`
          function solve(input) {
            const nums = input.trim().split(/\s+/).map(Number);
            const result = new Array(nums.length);
            let left = 0;
            let right = nums.length - 1;
            for (let pos = nums.length - 1; pos >= 0; pos--) {
              const leftSquare = nums[left] * nums[left];
              const rightSquare = nums[right] * nums[right];
              if (leftSquare > rightSquare) {
                result[pos] = leftSquare;
                left++;
              } else {
                result[pos] = rightSquare;
                right--;
              }
            }
            return result.join(" ");
          }
        `,
        python: code`
          def solve(input_str):
              nums = list(map(int, input_str.split()))
              result = [0] * len(nums)
              left, right = 0, len(nums) - 1
              for pos in range(len(nums) - 1, -1, -1):
                  left_square = nums[left] * nums[left]
                  right_square = nums[right] * nums[right]
                  if left_square > right_square:
                      result[pos] = left_square
                      left += 1
                  else:
                      result[pos] = right_square
                      right -= 1
              return " ".join(map(str, result))
        `,
      },
    },
    {
      title: "Container With Most Water",
      difficulty: "Medium",
      description:
        "You are given an integer array `height` of length `n`. There are `n` vertical lines drawn such that the two endpoints of the `i`-th line are `(i, 0)` and `(i, height[i])`.\n\nFind two lines that, together with the x-axis, form a container holding the most water, and print that maximum amount of water. The container cannot be slanted, so its area is `min(height[i], height[j]) * (j - i)`.",
      constraints: "2 <= n <= 10^5\n0 <= height[i] <= 10^4",
      inputFormat: "One line of space-separated integers `height`.",
      outputFormat: "The maximum area as an integer.",
      examples: [
        { input: "1 8 6 2 5 4 8 3 7", output: "49", explanation: "Lines at indices 1 (height 8) and 8 (height 7): min(8, 7) * (8 - 1) = 49." },
      ],
      testCases: [
        { input: "1 8 6 2 5 4 8 3 7", expectedOutput: "49", isHidden: false },
        { input: "1 1", expectedOutput: "1", isHidden: false },
        { input: "4 3 2 1 4", expectedOutput: "16", isHidden: true },
        { input: "1 2 1", expectedOutput: "2", isHidden: true },
        { input: "0 0 0", expectedOutput: "0", isHidden: true },
        { input: "2 3 10 5 7 8 9", expectedOutput: "36", isHidden: true },
        { input: CONTAINER_PERF, expectedOutput: "28830750", isHidden: true },
      ],
      hints: [
        "Checking every pair of lines is O(n^2).",
        "Start with the widest container: one pointer at each end.",
        "Always move the pointer at the shorter line inward - moving the taller one can never produce a bigger area.",
      ],
      editorial:
        "Place pointers at both ends and compute min(height[l], height[r]) * (r - l). The shorter line limits every container that uses it: any other partner is closer, so the width shrinks while the height stays capped by the shorter line. That line can therefore be discarded - move its pointer inward and repeat until the pointers meet, keeping the best area. Time O(n), space O(1).",
      solutions: {
        javascript: code`
          function solve(input) {
            const height = input.trim().split(/\s+/).map(Number);
            let left = 0;
            let right = height.length - 1;
            let best = 0;
            while (left < right) {
              best = Math.max(best, Math.min(height[left], height[right]) * (right - left));
              if (height[left] < height[right]) left++;
              else right--;
            }
            return String(best);
          }
        `,
        python: code`
          def solve(input_str):
              height = list(map(int, input_str.split()))
              left, right = 0, len(height) - 1
              best = 0
              while left < right:
                  best = max(best, min(height[left], height[right]) * (right - left))
                  if height[left] < height[right]:
                      left += 1
                  else:
                      right -= 1
              return str(best)
        `,
      },
    },
    {
      title: "Trapping Rain Water",
      difficulty: "Hard",
      description:
        "Given `n` non-negative integers representing an elevation map where the width of each bar is `1`, compute how many units of water it can trap after raining.",
      constraints: "1 <= n <= 2 * 10^4\n0 <= height[i] <= 10^5",
      inputFormat: "One line of space-separated integers `height`.",
      outputFormat: "The total units of trapped water as an integer.",
      examples: [
        {
          input: "0 1 0 2 1 0 1 3 2 1 2 1",
          output: "6",
          explanation: "Water collects above indices 2 (1 unit), 4 (1), 5 (2), 6 (1) and 9 (1): 6 units in total.",
        },
      ],
      testCases: [
        { input: "0 1 0 2 1 0 1 3 2 1 2 1", expectedOutput: "6", isHidden: false },
        { input: "4 2 0 3 2 5", expectedOutput: "9", isHidden: false },
        { input: "5", expectedOutput: "0", isHidden: true },
        { input: "1 2 3 4 5", expectedOutput: "0", isHidden: true },
        { input: "5 4 1 2", expectedOutput: "1", isHidden: true },
        { input: "3 0 0 0 3", expectedOutput: "9", isHidden: true },
        { input: "2 0 2 0 2", expectedOutput: "4", isHidden: true },
        { input: TRAPPING_PERF, expectedOutput: "7298427", isHidden: true },
      ],
      hints: [
        "The water above bar i is min(highest bar to its left, highest bar to its right) - height[i].",
        "Precomputing prefix maxima and suffix maxima gives an O(n) time, O(n) space solution.",
        "With two pointers, always process the side whose bar is lower: its water level is already decided by that side's running maximum.",
      ],
      editorial:
        "Water at index i is min(leftMax[i], rightMax[i]) - height[i]. Use pointers l and r at both ends with running maxima. If height[l] < height[r], the right side already has a bar at least as tall as anything that limits l, so the level at l is leftMax: update leftMax, add leftMax - height[l] and move l right. Otherwise do the symmetric step on the right. Each index is processed once: O(n) time, O(1) space.",
      solutions: {
        javascript: code`
          function solve(input) {
            const height = input.trim().split(/\s+/).map(Number);
            let left = 0;
            let right = height.length - 1;
            let leftMax = 0;
            let rightMax = 0;
            let water = 0;
            while (left < right) {
              if (height[left] < height[right]) {
                leftMax = Math.max(leftMax, height[left]);
                water += leftMax - height[left];
                left++;
              } else {
                rightMax = Math.max(rightMax, height[right]);
                water += rightMax - height[right];
                right--;
              }
            }
            return String(water);
          }
        `,
        python: code`
          def solve(input_str):
              height = list(map(int, input_str.split()))
              left, right = 0, len(height) - 1
              left_max = right_max = water = 0
              while left < right:
                  if height[left] < height[right]:
                      left_max = max(left_max, height[left])
                      water += left_max - height[left]
                      left += 1
                  else:
                      right_max = max(right_max, height[right])
                      water += right_max - height[right]
                      right -= 1
              return str(water)
        `,
      },
    },
  ],
  advanced: [
    {
      title: "Majority Element",
      difficulty: "Easy",
      description:
        "Given an array `nums` of size `n`, print the majority element: the value that appears more than `n / 2` times. The majority element always exists.\n\nTry to solve it in O(n) time and O(1) extra space.",
      constraints: "1 <= n <= 5 * 10^4\n-10^9 <= nums[i] <= 10^9\nA majority element always exists.",
      inputFormat: "One line of space-separated integers `nums`.",
      outputFormat: "The majority element.",
      examples: [{ input: "2 2 1 1 1 2 2", output: "2", explanation: "2 appears 4 times out of 7, which is more than 7 / 2." }],
      testCases: [
        { input: "2 2 1 1 1 2 2", expectedOutput: "2", isHidden: false },
        { input: "3 2 3", expectedOutput: "3", isHidden: false },
        { input: "7", expectedOutput: "7", isHidden: true },
        { input: "-1 -1 -1 5 5", expectedOutput: "-1", isHidden: true },
        { input: "1 2 1 3 1 4 1", expectedOutput: "1", isHidden: true },
        { input: "1000000000 -1000000000 1000000000", expectedOutput: "1000000000", isHidden: true },
      ],
      hints: [
        "Counting occurrences with a hash map is O(n) time but O(n) space.",
        "If you cancel each occurrence of the majority against a different value, some copies of the majority are always left over.",
        "Boyer-Moore voting: keep a candidate and a counter; add 1 on a match, subtract 1 otherwise, and adopt the current value when the counter is 0.",
      ],
      editorial:
        "Boyer-Moore majority vote. Scan once with a candidate and a count: when the count is 0, take the current value as the candidate; then increment the count if the value equals the candidate, otherwise decrement it. Every decrement pairs one candidate occurrence with a different value, and since the majority occurs more than n / 2 times it cannot be cancelled out completely, so it is the final candidate. Time O(n), space O(1).",
      solutions: {
        javascript: code`
          function solve(input) {
            let candidate = 0;
            let count = 0;
            for (const token of input.trim().split(/\s+/)) {
              const num = Number(token);
              if (count === 0) candidate = num;
              count += num === candidate ? 1 : -1;
            }
            return String(candidate);
          }
        `,
        python: code`
          def solve(input_str):
              candidate, count = 0, 0
              for token in input_str.split():
                  num = int(token)
                  if count == 0:
                      candidate = num
                  count += 1 if num == candidate else -1
              return str(candidate)
        `,
      },
    },
    {
      title: "LRU Cache",
      difficulty: "Medium",
      description:
        "Design a Least Recently Used (LRU) cache with a fixed `capacity` that supports two operations:\n\n- `get key`: output the value of `key` if it is in the cache, otherwise output `-1`.\n- `put key value`: insert `key` with `value`, or update the value if `key` already exists. If inserting a new key would exceed the capacity, first evict the least recently used key.\n\nA successful `get` and every `put` count as a use of that key. Both operations should run in O(1) average time. Print the results of all `get` operations in order, separated by spaces.",
      constraints: "1 <= capacity <= 3000\n0 <= key <= 10^4\n0 <= value <= 10^5\n1 <= number of operations <= 2 * 10^4\nThere is at least one `get` operation.",
      inputFormat: "Line 1: the capacity.\nFollowing lines: one operation per line, either `put key value` or `get key`.",
      outputFormat: "Space-separated results of the `get` operations, in order.",
      examples: [
        {
          input: "2\nput 1 1\nput 2 2\nget 1\nput 3 3\nget 2\nput 4 4\nget 1\nget 3\nget 4",
          output: "1 -1 -1 3 4",
          explanation: "`put 3 3` evicts key 2 (key 1 was used more recently by `get 1`); `put 4 4` then evicts key 1.",
        },
      ],
      testCases: [
        {
          input: "2\nput 1 1\nput 2 2\nget 1\nput 3 3\nget 2\nput 4 4\nget 1\nget 3\nget 4",
          expectedOutput: "1 -1 -1 3 4",
          isHidden: false,
        },
        { input: "1\nput 2 1\nget 2\nput 3 2\nget 2\nget 3", expectedOutput: "1 -1 2", isHidden: false },
        { input: "2\nget 2\nput 2 6\nget 1\nput 1 5\nput 1 2\nget 1\nget 2", expectedOutput: "-1 -1 2 6", isHidden: true },
        { input: "2\nput 2 1\nput 1 1\nput 2 3\nput 4 1\nget 1\nget 2", expectedOutput: "-1 3", isHidden: true },
        { input: "3\nput 1 1\nput 2 2\nput 3 3\nget 1\nput 4 4\nget 2\nget 3\nget 1\nget 4", expectedOutput: "1 -1 3 1 4", isHidden: true },
        { input: LRU_PERF, expectedOutput: LRU_PERF_EXPECTED, isHidden: true },
      ],
      hints: [
        "A hash map gives O(1) lookup, but you also need to know which key was used least recently.",
        "Keep the keys in recency order: move a key to the 'most recent' end whenever it is used.",
        "Combine a hash map with a doubly linked list (or an insertion-ordered map such as JavaScript's Map or Python's OrderedDict) so moving and evicting are O(1).",
      ],
      editorial:
        "Store key -> node in a hash map and keep the nodes in a doubly linked list ordered from least to most recently used. `get` looks the node up and moves it to the tail; `put` updates and moves an existing node, or evicts the head node when the cache is full and appends a new node at the tail. Every step is O(1). In JavaScript a Map already iterates in insertion order (delete + set moves a key to the end, and `keys().next()` is the LRU key); in Python `OrderedDict.move_to_end` and `popitem(last=False)` do the same. Time O(1) per operation, space O(capacity).",
      solutions: {
        javascript: code`
          function solve(input) {
            const lines = input.trim().split("\n");
            const capacity = Number(lines[0]);
            const cache = new Map(); // iteration order: least -> most recently used
            const out = [];
            for (const line of lines.slice(1)) {
              const [op, keyText, valueText] = line.trim().split(/\s+/);
              const key = Number(keyText);
              if (op === "get") {
                if (!cache.has(key)) {
                  out.push("-1");
                  continue;
                }
                const value = cache.get(key);
                cache.delete(key);
                cache.set(key, value);
                out.push(String(value));
              } else if (op === "put") {
                if (cache.has(key)) cache.delete(key);
                else if (cache.size === capacity) cache.delete(cache.keys().next().value);
                cache.set(key, Number(valueText));
              }
            }
            return out.join(" ");
          }
        `,
        python: code`
          from collections import OrderedDict


          def solve(input_str):
              lines = input_str.strip().split("\n")
              capacity = int(lines[0])
              cache = OrderedDict()  # order: least -> most recently used
              out = []
              for line in lines[1:]:
                  parts = line.split()
                  if not parts:
                      continue
                  key = int(parts[1])
                  if parts[0] == "get":
                      if key in cache:
                          cache.move_to_end(key)
                          out.append(str(cache[key]))
                      else:
                          out.append("-1")
                  elif parts[0] == "put":
                      if key in cache:
                          cache.move_to_end(key)
                      elif len(cache) == capacity:
                          cache.popitem(last=False)
                      cache[key] = int(parts[2])
              return " ".join(out)
        `,
      },
    },
    {
      title: "Median of Two Sorted Arrays",
      difficulty: "Hard",
      description:
        "Given two sorted arrays `nums1` and `nums2` of sizes `m` and `n`, print the median of the two arrays combined. The overall run time complexity should be O(log (m + n)).\n\nPrint the median with exactly one digit after the decimal point (for example `2.0` or `-2.5`).",
      constraints: "1 <= m, n <= 1000\n-10^6 <= nums1[i], nums2[i] <= 10^6\nBoth arrays are sorted in non-decreasing order.",
      inputFormat: "Line 1: space-separated integers `nums1` (sorted).\nLine 2: space-separated integers `nums2` (sorted).",
      outputFormat: "The median with exactly one decimal place.",
      examples: [{ input: "1 3\n2", output: "2.0", explanation: "The merged array is [1, 2, 3] and its median is 2." }],
      testCases: [
        { input: "1 3\n2", expectedOutput: "2.0", isHidden: false },
        { input: "1 2\n3 4", expectedOutput: "2.5", isHidden: false },
        { input: "5\n5", expectedOutput: "5.0", isHidden: true },
        { input: "-5 -3 -1\n-2", expectedOutput: "-2.5", isHidden: true },
        { input: "-1\n0", expectedOutput: "-0.5", isHidden: true },
        { input: "1 2 3 4 5\n6 7 8 9 10 11", expectedOutput: "6.0", isHidden: true },
        { input: "100 200\n1 2 3", expectedOutput: "3.0", isHidden: true },
        { input: "1 1 1\n1 1 1", expectedOutput: "1.0", isHidden: true },
        { input: MEDIAN_PERF, expectedOutput: "-17587.5", isHidden: true },
      ],
      hints: [
        "Merging both arrays gives the median in O(m + n) - correct, but not the intended complexity.",
        "The median splits the combined array into a left half and a right half of equal size (the left half takes the extra element when the total is odd).",
        "Binary search how many elements the shorter array puts in the left half; the split is valid when aLeft <= bRight and bLeft <= aRight.",
      ],
      editorial:
        "Binary search on the shorter array a (length m). Taking i elements from a and j = (m + n + 1) / 2 - i elements from b forms the left half. The partition is correct when a[i-1] <= b[j] and b[j-1] <= a[i] (treating positions past either end as -infinity / +infinity). If a[i-1] > b[j], take fewer elements from a; otherwise take more. With a valid partition, the median is max(a[i-1], b[j-1]) for an odd total, or the average of that and min(a[i], b[j]) for an even total. Time O(log min(m, n)), space O(1).",
      solutions: {
        javascript: code`
          function solve(input) {
            const lines = input.trim().split("\n");
            let a = lines[0].trim().split(/\s+/).map(Number);
            let b = lines[1].trim().split(/\s+/).map(Number);
            if (a.length > b.length) [a, b] = [b, a];
            const m = a.length;
            const n = b.length;
            const half = Math.floor((m + n + 1) / 2);
            let lo = 0;
            let hi = m;
            while (lo <= hi) {
              const i = Math.floor((lo + hi) / 2);
              const j = half - i;
              const aLeft = i > 0 ? a[i - 1] : -Infinity;
              const aRight = i < m ? a[i] : Infinity;
              const bLeft = j > 0 ? b[j - 1] : -Infinity;
              const bRight = j < n ? b[j] : Infinity;
              if (aLeft <= bRight && bLeft <= aRight) {
                const leftMax = Math.max(aLeft, bLeft);
                if ((m + n) % 2 === 1) return leftMax.toFixed(1);
                return ((leftMax + Math.min(aRight, bRight)) / 2).toFixed(1);
              }
              if (aLeft > bRight) hi = i - 1;
              else lo = i + 1;
            }
            return "";
          }
        `,
        python: code`
          def solve(input_str):
              lines = input_str.strip().split("\n")
              a = list(map(int, lines[0].split()))
              b = list(map(int, lines[1].split()))
              if len(a) > len(b):
                  a, b = b, a
              m, n = len(a), len(b)
              half = (m + n + 1) // 2
              lo, hi = 0, m
              while lo <= hi:
                  i = (lo + hi) // 2
                  j = half - i
                  a_left = a[i - 1] if i > 0 else float("-inf")
                  a_right = a[i] if i < m else float("inf")
                  b_left = b[j - 1] if j > 0 else float("-inf")
                  b_right = b[j] if j < n else float("inf")
                  if a_left <= b_right and b_left <= a_right:
                      left_max = max(a_left, b_left)
                      if (m + n) % 2 == 1:
                          return f"{left_max:.1f}"
                      return f"{(left_max + min(a_right, b_right)) / 2:.1f}"
                  if a_left > b_right:
                      hi = i - 1
                  else:
                      lo = i + 1
              return ""
        `,
      },
    },
  ],
};
