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

function randomInts(seed: number, length: number, bound: number, shift = 0): number[] {
  const next = seededRandom(seed);
  return Array.from({ length }, () => next(bound) + shift);
}

function randomLetters(seed: number, length: number, alphabet: string): string {
  const next = seededRandom(seed);
  return Array.from({ length }, () => alphabet[next(alphabet.length)]).join("");
}

const sortedInts = (seed: number, length: number, bound: number, shift = 0) =>
  randomInts(seed, length, bound, shift).sort((a, b) => a - b);

// ---------------------------------------------------------------------------------------------
// Large generated inputs. Expected outputs are literals computed by independent brute-force checkers.
// ---------------------------------------------------------------------------------------------

const REMOVE_DUP_PERF = sortedInts(11, 20000, 5000, -2500).join(" ");
const REMOVE_ELEMENT_PERF = randomInts(12, 20000, 50, -25).join(" ") + "\n7";
const MERGE_PERF = sortedInts(13, 5000, 100000, -50000).join(" ") + "\n" + sortedInts(14, 5000, 100000, -50000).join(" ");
const SUBSEQ_TEXT = randomLetters(15, 60000, "abc");
const SUBSEQ_TRUE_PERF =
  Array.from(SUBSEQ_TEXT)
    .filter((_, i) => i % 20 === 7)
    .join("") +
  "\n" +
  SUBSEQ_TEXT;
const SUBSEQ_FALSE_PERF =
  Array.from(SUBSEQ_TEXT)
    .filter((_, i) => i % 20 === 7)
    .join("") +
  "d\n" +
  SUBSEQ_TEXT;
const BACKSPACE_BASE = (() => {
  const next = seededRandom(16);
  return Array.from({ length: 60000 }, () => (next(10) < 4 ? "#" : "abcd"[next(4)])).join("");
})();
const BACKSPACE_TRUE_PERF = BACKSPACE_BASE + "\nxy#z#" + BACKSPACE_BASE + "x#";
const BACKSPACE_FALSE_PERF = BACKSPACE_BASE + "\nz#" + BACKSPACE_BASE + "a";
const PAL2_HALF = randomLetters(17, 50000, "abc");
const PAL2_REV = PAL2_HALF.split("").reverse().join("");
const PAL2_TRUE_PERF = PAL2_HALF + "xy" + PAL2_REV;
const PAL2_FALSE_PERF = PAL2_HALF + "xy" + PAL2_REV.slice(0, 20000) + (PAL2_REV[20000] === "z" ? "w" : "z") + PAL2_REV.slice(20001, 30000) + "z" + PAL2_REV.slice(30001);
const TWO_SUM_LESS_PERF = randomInts(18, 1000, 1000, 1).join(" ") + "\n1500";
const SEGREGATE_PERF = randomInts(19, 20000, 2001, -1000).join(" ");

export const REAL_TWOPOINTERS: ProblemSpec[] = [
  // ------------------------------------------------------------------------------------- EASY
  {
    title: "Remove Duplicates from Sorted Array",
    difficulty: "Easy",
    companies: ["Amazon", "Microsoft", "TCS", "Infosys"],
    description:
      "You are given an array `nums` sorted in non-decreasing order. Remove the duplicates **in place** so that every distinct value appears exactly once, keeping the relative order of the distinct values.\n\nPrint the number `k` of distinct values on the first line, and the first `k` elements of the modified array (the distinct values in their original order) on the second line.\n\nThe classic solution uses two pointers: a slow pointer marking the end of the de-duplicated prefix and a fast pointer scanning the array.",
    constraints: "1 <= nums.length <= 3 * 10^4\n-10^4 <= nums[i] <= 10^4\n`nums` is sorted in non-decreasing order.",
    inputFormat: "One line of space-separated integers `nums`.",
    outputFormat: "Line 1: the integer `k`.\nLine 2: the `k` distinct values separated by single spaces.",
    examples: [
      { input: "1 1 2", output: "2\n1 2", explanation: "The distinct values are 1 and 2, so k = 2." },
      { input: "0 0 1 1 1 2 2 3 3 4", output: "5\n0 1 2 3 4", explanation: "Five distinct values remain, in their original order." },
    ],
    testCases: [
      { input: "1 1 2", expectedOutput: "2\n1 2", isHidden: false },
      { input: "0 0 1 1 1 2 2 3 3 4", expectedOutput: "5\n0 1 2 3 4", isHidden: false },
      { input: "5", expectedOutput: "1\n5", isHidden: true },
      { input: "-3 -3 -3", expectedOutput: "1\n-3", isHidden: true },
      { input: "-5 -2 -2 0 0 7 9 9", expectedOutput: "5\n-5 -2 0 7 9", isHidden: true },
      { input: "1 2 3 4", expectedOutput: "4\n1 2 3 4", isHidden: true },
      { input: REMOVE_DUP_PERF, expectedOutput: "@@REMOVE_DUP_PERF", isHidden: true },
    ],
    hints: [
      "Because the array is sorted, equal values sit next to each other, so you only ever compare a value with its neighbour.",
      "Keep a write index `k` for the next free slot of the de-duplicated prefix, and scan with a read index `i`.",
      "Whenever `nums[i]` differs from the last value written (`nums[k - 1]`), copy it to `nums[k]` and advance `k`.",
    ],
    editorial:
      "Use a slow pointer `k` (length of the unique prefix, starting at 1) and a fast pointer `i` scanning from index 1. If `nums[i] != nums[k-1]` the value is new: write it at `nums[k]` and increment `k`. After the scan the first `k` cells hold the distinct values in order. Time O(n), extra space O(1).",
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
    title: "Remove Element",
    difficulty: "Easy",
    companies: ["Microsoft", "Amazon", "Google"],
    description:
      "Given an integer array `nums` and an integer `val`, remove every occurrence of `val` **in place**. The elements that are kept must preserve their original relative order.\n\nPrint the number `k` of elements that are not equal to `val` on the first line, and those `k` elements (in their original order) on the second line. If `k` is 0, the second line is empty.",
    constraints: "1 <= nums.length <= 10^5\n-10^4 <= nums[i], val <= 10^4",
    inputFormat: "Line 1: space-separated integers `nums`.\nLine 2: the integer `val`.",
    outputFormat: "Line 1: the integer `k`.\nLine 2: the `k` kept elements separated by single spaces (empty when `k = 0`).",
    examples: [
      { input: "3 2 2 3\n3", output: "2\n2 2", explanation: "Both 3s are removed; two 2s remain." },
      { input: "0 1 2 2 3 0 4 2\n2", output: "5\n0 1 3 0 4", explanation: "All three 2s are removed and the others keep their order." },
    ],
    testCases: [
      { input: "3 2 2 3\n3", expectedOutput: "2\n2 2", isHidden: false },
      { input: "0 1 2 2 3 0 4 2\n2", expectedOutput: "5\n0 1 3 0 4", isHidden: false },
      { input: "5\n5", expectedOutput: "0", isHidden: true },
      { input: "5\n6", expectedOutput: "1\n5", isHidden: true },
      { input: "4 4 4 4\n4", expectedOutput: "0", isHidden: true },
      { input: "-1 -2 -1 0 -1\n-1", expectedOutput: "2\n-2 0", isHidden: true },
      { input: REMOVE_ELEMENT_PERF, expectedOutput: "@@REMOVE_ELEMENT_PERF", isHidden: true },
    ],
    hints: [
      "You do not need to shift elements one by one; you only care about the elements you keep.",
      "Use a write index `k` that points to where the next kept element should go.",
      "Scan with a read index; whenever `nums[i] != val`, copy it to `nums[k]` and increment `k`.",
    ],
    editorial:
      "A single pass with two pointers: the read pointer visits every element and the write pointer `k` only advances when the visited element is not `val`. The first `k` cells then contain the kept elements in their original order. Time O(n), space O(1) beyond the output.",
    solutions: {
      javascript: code`
        function solve(input) {
          const lines = input.trim().split("\n");
          const nums = lines[0].trim().split(/\s+/).map(Number);
          const val = Number(lines[1]);
          let k = 0;
          for (let i = 0; i < nums.length; i++) {
            if (nums[i] !== val) nums[k++] = nums[i];
          }
          return k + "\n" + nums.slice(0, k).join(" ");
        }
      `,
      python: code`
        def solve(input_str):
            lines = input_str.strip().split("\n")
            nums = list(map(int, lines[0].split()))
            val = int(lines[1])
            k = 0
            for i in range(len(nums)):
                if nums[i] != val:
                    nums[k] = nums[i]
                    k += 1
            return str(k) + "\n" + " ".join(map(str, nums[:k]))
      `,
    },
  },
  {
    title: "Merge Sorted Array",
    difficulty: "Easy",
    companies: ["Microsoft", "Amazon", "Meta", "Adobe"],
    description:
      "You are given two arrays `a` and `b`, each sorted in non-decreasing order. Imagine `a` is stored in a buffer with `len(b)` spare cells at its end. Merge `b` into that buffer so the whole buffer is sorted.\n\nPrint the merged array. The intended solution fills the buffer **from the back** with two pointers, running in O(m + n) time and O(1) extra space.",
    constraints: "1 <= a.length, b.length <= 10^4\n-10^5 <= a[i], b[i] <= 10^5\nBoth arrays are sorted in non-decreasing order.",
    inputFormat: "Line 1: the sorted integers of `a` separated by spaces.\nLine 2: the sorted integers of `b` separated by spaces.",
    outputFormat: "One line with the merged sorted array, space-separated.",
    examples: [
      { input: "1 2 3\n2 5 6", output: "1 2 2 3 5 6", explanation: "Merging keeps both copies of 2." },
      { input: "4 5 6\n1 2 3", output: "1 2 3 4 5 6", explanation: "Every element of b is smaller than every element of a." },
    ],
    testCases: [
      { input: "1 2 3\n2 5 6", expectedOutput: "1 2 2 3 5 6", isHidden: false },
      { input: "4 5 6\n1 2 3", expectedOutput: "1 2 3 4 5 6", isHidden: false },
      { input: "1\n2", expectedOutput: "1 2", isHidden: true },
      { input: "-5 0 3\n-5 -1 4 4", expectedOutput: "-5 -5 -1 0 3 4 4", isHidden: true },
      { input: "2 2 2\n2 2", expectedOutput: "2 2 2 2 2", isHidden: true },
      { input: "1 2 3\n4 5 6", expectedOutput: "1 2 3 4 5 6", isHidden: true },
      { input: MERGE_PERF, expectedOutput: "@@MERGE_PERF", isHidden: true },
    ],
    hints: [
      "Merging from the front would overwrite unread elements of `a`. Which end of the buffer is always safe to write to?",
      "The largest remaining element of either array belongs at the back of the buffer, so start there.",
      "Keep one pointer at the last unmerged element of `a`, one at the last of `b`, and one write pointer at the back; move the larger one into place and step it left. Copy whatever remains of `b` at the end.",
    ],
    editorial:
      "Place three pointers: `i` at the last element of `a`, `j` at the last element of `b`, and `w` at the last cell of the extended buffer. Repeatedly write the larger of `a[i]` and `b[j]` to `w` and move the corresponding pointers left. When `a` is exhausted, the rest of `b` is copied; when `b` is exhausted, the remaining prefix of `a` is already in place. Time O(m + n), extra space O(1) apart from the output.",
    solutions: {
      javascript: code`
        function solve(input) {
          const lines = input.trim().split("\n");
          const a = lines[0].trim().split(/\s+/).map(Number);
          const b = lines[1].trim().split(/\s+/).map(Number);
          let i = a.length - 1;
          let j = b.length - 1;
          const buf = a.concat(new Array(b.length).fill(0));
          let w = buf.length - 1;
          while (j >= 0) {
            if (i >= 0 && a[i] > b[j]) buf[w--] = a[i--];
            else buf[w--] = b[j--];
          }
          return buf.join(" ");
        }
      `,
      python: code`
        def solve(input_str):
            lines = input_str.strip().split("\n")
            a = list(map(int, lines[0].split()))
            b = list(map(int, lines[1].split()))
            i, j = len(a) - 1, len(b) - 1
            buf = a + [0] * len(b)
            w = len(buf) - 1
            while j >= 0:
                if i >= 0 and a[i] > b[j]:
                    buf[w] = a[i]
                    i -= 1
                else:
                    buf[w] = b[j]
                    j -= 1
                w -= 1
            return " ".join(map(str, buf))
      `,
    },
  },
  {
    title: "Is Subsequence",
    difficulty: "Easy",
    companies: ["Google", "Amazon", "Microsoft"],
    description:
      "Given two strings `s` and `t`, print `true` if `s` is a subsequence of `t`, otherwise `false`.\n\nA subsequence is obtained by deleting zero or more characters from a string without changing the order of the remaining characters. For example `ace` is a subsequence of `abcde`, but `aec` is not.",
    constraints: "1 <= s.length <= 10^5\n1 <= t.length <= 10^5\n`s` and `t` consist of lowercase English letters.",
    inputFormat: "Line 1: the string `s`.\nLine 2: the string `t`.",
    outputFormat: "`true` or `false`.",
    examples: [
      { input: "abc\nahbgdc", output: "true", explanation: "Pick a, b, c at positions 0, 2, 5 of t." },
      { input: "axc\nahbgdc", output: "false", explanation: "There is no x in t." },
    ],
    testCases: [
      { input: "abc\nahbgdc", expectedOutput: "true", isHidden: false },
      { input: "axc\nahbgdc", expectedOutput: "false", isHidden: false },
      { input: "a\na", expectedOutput: "true", isHidden: true },
      { input: "aaaa\naaa", expectedOutput: "false", isHidden: true },
      { input: "abc\nabc", expectedOutput: "true", isHidden: true },
      { input: "b\na", expectedOutput: "false", isHidden: true },
      { input: "ace\nabcde", expectedOutput: "true", isHidden: true },
      { input: SUBSEQ_TRUE_PERF, expectedOutput: "true", isHidden: true },
      { input: SUBSEQ_FALSE_PERF, expectedOutput: "false", isHidden: true },
    ],
    hints: [
      "You only need to know, for each character of `s`, whether it can be found in `t` after the previous match.",
      "Walk through `t` once with a pointer into `s`.",
      "Whenever `t[j] == s[i]`, advance `i`. At the end `s` is a subsequence exactly when `i` reached `s.length`.",
    ],
    editorial:
      "Greedy matching is optimal: matching each character of `s` at its earliest possible position in `t` never hurts later characters. One pointer `i` into `s` moves only on a match while `j` scans `t`. Return whether `i == len(s)`. Time O(|t|), space O(1).",
    solutions: {
      javascript: code`
        function solve(input) {
          const lines = input.trim().split("\n");
          const s = lines[0].trim();
          const t = lines[1].trim();
          let i = 0;
          for (let j = 0; j < t.length && i < s.length; j++) {
            if (t[j] === s[i]) i++;
          }
          return i === s.length ? "true" : "false";
        }
      `,
      python: code`
        def solve(input_str):
            lines = input_str.strip().split("\n")
            s, t = lines[0].strip(), lines[1].strip()
            i = 0
            for ch in t:
                if i < len(s) and ch == s[i]:
                    i += 1
            return "true" if i == len(s) else "false"
      `,
    },
  },
  {
    title: "Backspace String Compare",
    difficulty: "Easy",
    companies: ["Google", "Amazon", "Meta", "Microsoft"],
    description:
      "Two strings `s` and `t` are typed into empty text editors. The character `#` means a backspace, which deletes the previous character if there is one (backspacing on an empty text does nothing).\n\nPrint `true` if the two editors end up with equal text, otherwise `false`.\n\nA stack solves it in O(n) space; try to do it in O(1) space by scanning both strings from the right with two pointers.",
    constraints: "1 <= s.length, t.length <= 2 * 10^5\n`s` and `t` contain only lowercase English letters and `#`.",
    inputFormat: "Line 1: the string `s`.\nLine 2: the string `t`.",
    outputFormat: "`true` or `false`.",
    examples: [
      { input: "ab#c\nad#c", output: "true", explanation: "Both strings become \"ac\"." },
      { input: "a#c\nb", output: "false", explanation: "s becomes \"c\" while t stays \"b\"." },
    ],
    testCases: [
      { input: "ab#c\nad#c", expectedOutput: "true", isHidden: false },
      { input: "a#c\nb", expectedOutput: "false", isHidden: false },
      { input: "ab##\nc#d#", expectedOutput: "true", isHidden: true },
      { input: "a##c\n#a#c", expectedOutput: "true", isHidden: true },
      { input: "###\n#", expectedOutput: "true", isHidden: true },
      { input: "ab#\nab", expectedOutput: "false", isHidden: true },
      { input: "bxj##tw\nbxo#j##tw", expectedOutput: "true", isHidden: true },
      { input: "xywrrmp\nxywrrmu#p", expectedOutput: "true", isHidden: true },
      { input: BACKSPACE_TRUE_PERF, expectedOutput: "@@BACKSPACE_TRUE_PERF", isHidden: true },
      { input: BACKSPACE_FALSE_PERF, expectedOutput: "@@BACKSPACE_FALSE_PERF", isHidden: true },
    ],
    hints: [
      "Simulating with a stack works: push letters, pop on `#`. Compare the two final stacks.",
      "To use O(1) space, scan both strings from the end. Going right to left, a `#` tells you how many letters to skip.",
      "For each string keep a skip counter: `#` increments it, a letter with skip > 0 is skipped (decrement), otherwise it is the next surviving character. Compare the surviving characters of `s` and `t` one by one.",
    ],
    editorial:
      "Walk both strings right to left. For each string, advance past backspaces and the letters they erase using a skip counter to find the next character that survives. Compare the two surviving characters; if they differ, or only one string runs out, the answer is `false`. Both pointers exhausted together means `true`. Time O(|s| + |t|), space O(1).",
    solutions: {
      javascript: code`
        function solve(input) {
          const lines = input.split("\n");
          const s = lines[0].trim();
          const t = (lines[1] || "").trim();
          const nextValid = (str, idx) => {
            let skip = 0;
            while (idx >= 0) {
              if (str[idx] === "#") skip++;
              else if (skip > 0) skip--;
              else break;
              idx--;
            }
            return idx;
          };
          let i = s.length - 1;
          let j = t.length - 1;
          while (true) {
            i = nextValid(s, i);
            j = nextValid(t, j);
            if (i < 0 || j < 0) break;
            if (s[i] !== t[j]) return "false";
            i--;
            j--;
          }
          return i < 0 && j < 0 ? "true" : "false";
        }
      `,
      python: code`
        def solve(input_str):
            lines = input_str.split("\n")
            s = lines[0].strip()
            t = lines[1].strip() if len(lines) > 1 else ""

            def next_valid(text, idx):
                skip = 0
                while idx >= 0:
                    if text[idx] == "#":
                        skip += 1
                    elif skip > 0:
                        skip -= 1
                    else:
                        break
                    idx -= 1
                return idx

            i, j = len(s) - 1, len(t) - 1
            while True:
                i = next_valid(s, i)
                j = next_valid(t, j)
                if i < 0 or j < 0:
                    break
                if s[i] != t[j]:
                    return "false"
                i -= 1
                j -= 1
            return "true" if i < 0 and j < 0 else "false"
      `,
    },
  },
  {
    title: "Valid Palindrome II",
    difficulty: "Easy",
    companies: ["Meta", "Microsoft", "Amazon"],
    description:
      "Given a string `s`, print `true` if it can become a palindrome after deleting **at most one** character, otherwise `false`.\n\nA palindrome reads the same forwards and backwards.",
    constraints: "1 <= s.length <= 10^5\n`s` consists of lowercase English letters.",
    inputFormat: "One line containing the string `s`.",
    outputFormat: "`true` or `false`.",
    examples: [
      { input: "abca", output: "true", explanation: "Deleting `c` (or `b`) gives \"aba\" (or \"aca\")." },
      { input: "abc", output: "false", explanation: "No single deletion makes it a palindrome." },
    ],
    testCases: [
      { input: "abca", expectedOutput: "true", isHidden: false },
      { input: "abc", expectedOutput: "false", isHidden: false },
      { input: "a", expectedOutput: "true", isHidden: true },
      { input: "ab", expectedOutput: "true", isHidden: true },
      { input: "deeee", expectedOutput: "true", isHidden: true },
      { input: "eedede", expectedOutput: "true", isHidden: true },
      { input: "abcdef", expectedOutput: "false", isHidden: true },
      { input: "racecar", expectedOutput: "true", isHidden: true },
      { input: PAL2_TRUE_PERF, expectedOutput: "@@PAL2_TRUE_PERF", isHidden: true },
      { input: PAL2_FALSE_PERF, expectedOutput: "@@PAL2_FALSE_PERF", isHidden: true },
    ],
    hints: [
      "Start with the plain palindrome check using one pointer at each end moving inwards.",
      "At the first mismatch you must delete either the left or the right character.",
      "Check whether `s[l+1..r]` or `s[l..r-1]` is a palindrome (a plain two-pointer check). If either is, the answer is `true`. You only need to branch once.",
    ],
    editorial:
      "Move `l` and `r` inwards while `s[l] == s[r]`. On the first mismatch, the single allowed deletion must remove `s[l]` or `s[r]`, so the answer is whether `s[l+1..r]` or `s[l..r-1]` is a palindrome, each tested with a simple two-pointer scan. If there is no mismatch the string is already a palindrome. Time O(n), space O(1).",
    solutions: {
      javascript: code`
        function solve(input) {
          const s = input.trim();
          const isPal = (l, r) => {
            while (l < r) {
              if (s[l] !== s[r]) return false;
              l++;
              r--;
            }
            return true;
          };
          let l = 0;
          let r = s.length - 1;
          while (l < r) {
            if (s[l] !== s[r]) return isPal(l + 1, r) || isPal(l, r - 1) ? "true" : "false";
            l++;
            r--;
          }
          return "true";
        }
      `,
      python: code`
        def solve(input_str):
            s = input_str.strip()

            def is_pal(l, r):
                while l < r:
                    if s[l] != s[r]:
                        return False
                    l += 1
                    r -= 1
                return True

            l, r = 0, len(s) - 1
            while l < r:
                if s[l] != s[r]:
                    return "true" if is_pal(l + 1, r) or is_pal(l, r - 1) else "false"
                l += 1
                r -= 1
            return "true"
      `,
    },
  },
  {
    title: "Two Sum Less Than K",
    difficulty: "Easy",
    companies: ["Amazon", "Google"],
    description:
      "Given an array `nums` of integers and an integer `k`, find the maximum value of `nums[i] + nums[j]` over all pairs with `i < j` such that the sum is **strictly less than** `k`.\n\nPrint that maximum sum, or `-1` if no pair has a sum below `k`.",
    constraints: "1 <= nums.length <= 100\n1 <= nums[i] <= 1000\n1 <= k <= 2000",
    inputFormat: "Line 1: space-separated integers `nums`.\nLine 2: the integer `k`.",
    outputFormat: "The maximum pair sum below `k`, or `-1`.",
    examples: [
      { input: "34 23 1 24 75 33 54 8\n60", output: "58", explanation: "34 + 24 = 58 is the largest pair sum below 60." },
      { input: "10 20 30\n15", output: "-1", explanation: "Every pair sums to at least 30." },
    ],
    testCases: [
      { input: "34 23 1 24 75 33 54 8\n60", expectedOutput: "58", isHidden: false },
      { input: "10 20 30\n15", expectedOutput: "-1", isHidden: false },
      { input: "5\n10", expectedOutput: "-1", isHidden: true },
      { input: "1 1 1\n2", expectedOutput: "-1", isHidden: true },
      { input: "1 1 1\n3", expectedOutput: "2", isHidden: true },
      { input: "10 20 30 40\n100", expectedOutput: "70", isHidden: true },
      { input: "500 500\n1001", expectedOutput: "1000", isHidden: true },
      { input: TWO_SUM_LESS_PERF, expectedOutput: "@@TWO_SUM_LESS_PERF", isHidden: true },
    ],
    hints: [
      "Checking every pair works, but sorting first lets you discard many pairs at once.",
      "Sort the array and put one pointer at each end.",
      "If `nums[l] + nums[r] < k`, record it and move `l` right to try a bigger sum; otherwise move `r` left to shrink the sum.",
    ],
    editorial:
      "Sort `nums`, then use `l = 0`, `r = n-1`. If the pair sum is below `k` it is a candidate and no smaller partner for `nums[r]` can do better, so move `l` up; otherwise the sum is too big and `r` moves down. Track the best candidate. Time O(n log n) for the sort and O(n) for the scan, space O(1).",
    solutions: {
      javascript: code`
        function solve(input) {
          const lines = input.trim().split("\n");
          const nums = lines[0].trim().split(/\s+/).map(Number).sort((a, b) => a - b);
          const k = Number(lines[1]);
          let l = 0;
          let r = nums.length - 1;
          let best = -1;
          while (l < r) {
            const sum = nums[l] + nums[r];
            if (sum < k) {
              if (sum > best) best = sum;
              l++;
            } else {
              r--;
            }
          }
          return String(best);
        }
      `,
      python: code`
        def solve(input_str):
            lines = input_str.strip().split("\n")
            nums = sorted(map(int, lines[0].split()))
            k = int(lines[1])
            l, r = 0, len(nums) - 1
            best = -1
            while l < r:
                total = nums[l] + nums[r]
                if total < k:
                    best = max(best, total)
                    l += 1
                else:
                    r -= 1
            return str(best)
      `,
    },
  },
  {
    title: "Segregate Even and Odd Numbers",
    difficulty: "Easy",
    companies: ["TCS", "Wipro", "Zoho"],
    description:
      "Rearrange an integer array so that all even numbers come first and all odd numbers follow. Within the even group and within the odd group, the numbers must keep the same relative order as in the input (a stable partition).\n\nPrint the rearranged array. Zero and negative numbers are allowed; `0` is even.",
    constraints: "1 <= nums.length <= 10^5\n-10^6 <= nums[i] <= 10^6",
    inputFormat: "One line of space-separated integers `nums`.",
    outputFormat: "One line with the rearranged array, space-separated.",
    examples: [
      { input: "1 2 3 4 5 6", output: "2 4 6 1 3 5", explanation: "Evens 2 4 6 first, then odds 1 3 5, each group in input order." },
      { input: "7 9 11", output: "7 9 11", explanation: "There are no even numbers, so nothing changes." },
    ],
    testCases: [
      { input: "1 2 3 4 5 6", expectedOutput: "2 4 6 1 3 5", isHidden: false },
      { input: "7 9 11", expectedOutput: "7 9 11", isHidden: false },
      { input: "2 4 6", expectedOutput: "2 4 6", isHidden: true },
      { input: "-1 -2 -3 -4 0", expectedOutput: "-2 -4 0 -1 -3", isHidden: true },
      { input: "0", expectedOutput: "0", isHidden: true },
      { input: "5 8 5 8 3 2", expectedOutput: "8 8 2 5 5 3", isHidden: true },
      { input: SEGREGATE_PERF, expectedOutput: "@@SEGREGATE_PERF", isHidden: true },
    ],
    hints: [
      "Parity of a number is `x % 2`; be careful that negative numbers give `-1` in some languages, so test `x % 2 == 0` for evenness.",
      "A simple stable approach: write the evens in one pass, then the odds in a second pass.",
      "With a single pass you can keep two output lists (or two write cursors if the target positions are known) and concatenate them. Each pass preserves input order automatically.",
    ],
    editorial:
      "Scan once, appending even numbers to one list and odd numbers to another, then print the evens followed by the odds. Because each list is built in scan order, the relative order inside each group is preserved. Time O(n), space O(n). An in-place unstable swap-based partition would be O(1) space but would not guarantee the required order.",
    solutions: {
      javascript: code`
        function solve(input) {
          const nums = input.trim().split(/\s+/).map(Number);
          const evens = [];
          const odds = [];
          for (const x of nums) {
            if (x % 2 === 0) evens.push(x);
            else odds.push(x);
          }
          return evens.concat(odds).join(" ");
        }
      `,
      python: code`
        def solve(input_str):
            nums = list(map(int, input_str.split()))
            evens = [x for x in nums if x % 2 == 0]
            odds = [x for x in nums if x % 2 != 0]
            return " ".join(map(str, evens + odds))
      `,
    },
  },
];
