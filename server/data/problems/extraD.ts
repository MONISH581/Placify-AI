/**
 * Extra problems (part D): bit manipulation, sliding window, tries, segment trees, advanced interview problems.
 *
 * Large "performance" inputs are generated deterministically below (seeded PRNG). Their expected outputs are either
 * known by construction (e.g. the missing / duplicated value) or computed by a plain brute-force function defined in
 * this file (never by the reference solutions), or are literals confirmed with an independent brute-force script.
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

function shuffled<T>(items: T[], seed: number): T[] {
  const next = seededRandom(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = next(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function randomWord(next: (bound: number) => number, alphabet: string, minLength: number, maxLength: number): string {
  const length = minLength + next(maxLength - minLength + 1);
  let word = "";
  for (let i = 0; i < length; i++) word += alphabet[next(alphabet.length)];
  return word;
}

// ---------------------------------------------------------------------------------------------
// Bit manipulation
// ---------------------------------------------------------------------------------------------

const COUNTING_BITS_PERF_N = 100000;
// Brute force: count the '1' characters of the binary representation of every number.
const COUNTING_BITS_PERF_EXPECTED = Array.from({ length: COUNTING_BITS_PERF_N + 1 }, (_, i) => i.toString(2).replace(/0/g, "").length).join(" ");

// 0..10000 shuffled with one value removed: the removed value is the answer by construction.
const MISSING_NUMBER_PERF_MISSING = 6173;
const MISSING_NUMBER_PERF = shuffled(
  Array.from({ length: 10001 }, (_, i) => i).filter((v) => v !== MISSING_NUMBER_PERF_MISSING),
  11
).join(" ");

// ---------------------------------------------------------------------------------------------
// Sliding window
// ---------------------------------------------------------------------------------------------

// 12 letters drawn from 10 letters: a permutation window is rare, so the answer is a (checked) literal.
const PERMUTATION_PERF_TRUE = (() => {
  const next = seededRandom(21);
  const s1 = shuffled("abcdefghij".split(""), 22).join("");
  let s2 = "";
  for (let i = 0; i < 6000; i++) s2 += "abcdefghij"[next(10)];
  return s1 + "\n" + s2;
})();
const PERMUTATION_PERF_FALSE = (() => {
  const next = seededRandom(23);
  const s1 = "aaaaaaaaaaaabbbb";
  let s2 = "";
  for (let i = 0; i < 40000; i++) s2 += "abcdefgh"[next(8)];
  return s1 + "\n" + s2;
})();

const FRUIT_PERF = (() => {
  const next = seededRandom(31);
  const fruits: number[] = [];
  const randomRuns = (count: number) => {
    while (fruits.length < count) {
      const type = next(6);
      const run = 1 + next(4);
      for (let i = 0; i < run; i++) fruits.push(type);
    }
  };
  randomRuns(5000);
  for (let i = 0; i < 1500; i++) fruits.push(7, 8); // one long two-type stretch
  fruits.push(9);
  randomRuns(fruits.length + 5000);
  return fruits.join(" ");
})();

const MAX_ONES_PERF = (() => {
  const next = seededRandom(41);
  const bits = Array.from({ length: 6000 }, () => (next(2) === 0 ? 0 : 1));
  return bits.join(" ") + "\n" + 300;
})();

// ---------------------------------------------------------------------------------------------
// Tries
// ---------------------------------------------------------------------------------------------

/** Brute-force wildcard match of a search pattern against one stored word. */
function wildcardMatches(pattern: string, word: string): boolean {
  if (pattern.length !== word.length) return false;
  for (let i = 0; i < pattern.length; i++) if (pattern[i] !== "." && pattern[i] !== word[i]) return false;
  return true;
}

/** Random addWord / search operations over a tiny alphabet; expected answers come from scanning every stored word. */
function wordDictionaryCase(seed: number, operations: number): { input: string; expectedOutput: string; isHidden: boolean } {
  const next = seededRandom(seed);
  const words: string[] = [];
  const lines: string[] = [];
  const answers: string[] = [];
  for (let i = 0; i < operations; i++) {
    if (words.length === 0 || next(3) === 0) {
      const word = randomWord(next, "ab", 1, 10);
      words.push(word);
      lines.push(`addWord ${word}`);
    } else {
      let pattern = "";
      const length = 1 + next(10);
      for (let c = 0; c < length; c++) pattern += next(10) < 3 ? "." : "ab"[next(2)];
      lines.push(`search ${pattern}`);
      answers.push(String(words.some((word) => wildcardMatches(pattern, word))));
    }
  }
  return { input: lines.join("\n"), expectedOutput: answers.join("\n"), isHidden: true };
}

/** Brute-force suggestions: filter by prefix, sort, take three (NONE when nothing matches). */
function bruteSuggestions(products: string[], searchWord: string): string {
  const out: string[] = [];
  for (let len = 1; len <= searchWord.length; len++) {
    const prefix = searchWord.slice(0, len);
    const matches = products.filter((p) => p.startsWith(prefix)).sort();
    out.push(matches.length ? matches.slice(0, 3).join(" ") : "NONE");
  }
  return out.join("\n");
}

const SUGGESTIONS_PERF_PRODUCTS = (() => {
  const next = seededRandom(51);
  const set = new Set<string>();
  while (set.size < 4000) set.add(randomWord(next, "abc", 1, 9));
  return [...set];
})();
const SUGGESTIONS_PERF_WORD = "abcabbcab";

// ---------------------------------------------------------------------------------------------
// Segment trees
// ---------------------------------------------------------------------------------------------

/** Random update / query operations; expected answers come from taking the minimum of a plain array slice. */
function rangeMinimumCase(seed: number, size: number, operations: number): { input: string; expectedOutput: string; isHidden: boolean } {
  const next = seededRandom(seed);
  const values = Array.from({ length: size }, () => next(2000001) - 1000000);
  const lines = [values.join(" ")];
  const answers: string[] = [];
  const array = [...values];
  for (let i = 0; i < operations; i++) {
    if (next(2) === 0) {
      const index = next(size);
      const value = next(2000001) - 1000000;
      array[index] = value;
      lines.push(`update ${index} ${value}`);
    } else {
      const a = next(size);
      const b = next(size);
      const left = Math.min(a, b);
      const right = Math.max(a, b);
      lines.push(`query ${left} ${right}`);
      answers.push(String(Math.min(...array.slice(left, right + 1))));
    }
  }
  return { input: lines.join("\n"), expectedOutput: answers.join("\n"), isHidden: true };
}

// ---------------------------------------------------------------------------------------------
// Advanced
// ---------------------------------------------------------------------------------------------

// Mostly +-1 with a few +-2 and zeros so that every subarray product stays inside 32 bits.
const MAX_PRODUCT_PERF = (() => {
  const next = seededRandom(61);
  const nums = Array.from({ length: 3000 }, () => {
    const roll = next(60);
    if (roll === 0) return 0;
    return next(2) === 0 ? 1 : -1;
  });
  for (let i = 0; i < 14; i++) nums[next(nums.length)] *= 2;
  return nums.join(" ");
})();

// n = 50000: 1..n shuffled, plus a second copy of DUPLICATE_PERF_VALUE (the answer by construction).
const DUPLICATE_PERF_VALUE = 31337;
const DUPLICATE_PERF = shuffled(
  [...Array.from({ length: 50000 }, (_, i) => i + 1), DUPLICATE_PERF_VALUE],
  71
).join(" ");

const SPIRAL_ROWS = 100;
const SPIRAL_COLS = 120;
const SPIRAL_PERF = Array.from({ length: SPIRAL_ROWS }, (_, r) =>
  Array.from({ length: SPIRAL_COLS }, (_, c) => r * SPIRAL_COLS + c + 1).join(" ")
).join("\n");
/** Brute force: walk cell by cell, turning right at the border or at an already visited cell. */
function spiralBySimulation(rows: number, cols: number): string {
  const seen = Array.from({ length: rows }, () => new Array(cols).fill(false));
  const dr = [0, 1, 0, -1];
  const dc = [1, 0, -1, 0];
  const out: number[] = [];
  let r = 0;
  let c = 0;
  let d = 0;
  for (let step = 0; step < rows * cols; step++) {
    out.push(r * cols + c + 1);
    seen[r][c] = true;
    let nr = r + dr[d];
    let nc = c + dc[d];
    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || seen[nr][nc]) {
      d = (d + 1) % 4;
      nr = r + dr[d];
      nc = c + dc[d];
    }
    r = nr;
    c = nc;
  }
  return out.join(" ");
}

const ROTATE_N = 150;
const ROTATE_MATRIX = (() => {
  const next = seededRandom(81);
  return Array.from({ length: ROTATE_N }, () => Array.from({ length: ROTATE_N }, () => next(2001) - 1000));
})();
const ROTATE_PERF = ROTATE_MATRIX.map((row) => row.join(" ")).join("\n");
// Brute force: output row i is the original column i read from the bottom row to the top row.
const ROTATE_PERF_EXPECTED = Array.from({ length: ROTATE_N }, (_, i) =>
  Array.from({ length: ROTATE_N }, (_, j) => ROTATE_MATRIX[ROTATE_N - 1 - j][i]).join(" ")
).join("\n");

export const EXTRA_D: Record<string, ProblemSpec[]> = {
  bitManipulation: [
    {
      title: "Number of 1 Bits",
      difficulty: "Easy",
      companies: ["Apple", "Microsoft", "Amazon", "TCS", "Infosys"],
      description:
        "Given a non-negative integer `n`, treated as an unsigned 32-bit number, print how many bits of its binary representation are `1` (this count is also called the Hamming weight).\n\nTry to use a method whose running time depends on the number of set bits rather than on the full 32 positions.",
      constraints: "0 <= n <= 2^32 - 1",
      inputFormat: "One line with the integer `n`.",
      outputFormat: "The number of `1` bits in `n`, as an integer.",
      examples: [
        { input: "11", output: "3", explanation: "11 is 1011 in binary, which has three 1 bits." },
        { input: "128", output: "1", explanation: "128 is 10000000 in binary: a single 1 bit." },
      ],
      testCases: [
        { input: "11", expectedOutput: "3", isHidden: false },
        { input: "128", expectedOutput: "1", isHidden: false },
        { input: "0", expectedOutput: "0", isHidden: true },
        { input: "1", expectedOutput: "1", isHidden: true },
        { input: "4294967295", expectedOutput: "32", isHidden: true },
        { input: "2147483648", expectedOutput: "1", isHidden: true },
        { input: "2147483645", expectedOutput: "30", isHidden: true },
        { input: "1431655765", expectedOutput: "16", isHidden: true },
      ],
      hints: [
        "Write the number in binary and count the 1s; the question is how to do this with bit operations.",
        "n & 1 tells you whether the lowest bit is set; shifting right moves the next bit into that position.",
        "Better: n & (n - 1) clears the lowest set bit, so repeat it until n becomes 0 and count the iterations. In JavaScript, apply >>> 0 so numbers above 2^31 stay unsigned.",
      ],
      editorial:
        "Subtracting 1 from n flips the lowest set bit to 0 and turns every bit below it into 1, so n & (n - 1) is n with exactly its lowest set bit removed. Repeating until n is 0 therefore takes one iteration per set bit - O(popcount) time and O(1) space. Checking all 32 positions with n & 1 and a shift is the simpler O(32) alternative. In JavaScript, bitwise operators work on signed 32-bit integers, so use `>>> 0` to keep values like 4294967295 unsigned.",
      solutions: {
        javascript: code`
          function solve(input) {
            let n = Number(input.trim()) >>> 0;
            let count = 0;
            while (n !== 0) {
              n = (n & (n - 1)) >>> 0;
              count++;
            }
            return String(count);
          }
        `,
        python: code`
          def solve(input_str):
              n = int(input_str.strip())
              count = 0
              while n:
                  n &= n - 1
                  count += 1
              return str(count)
        `,
      },
    },
    {
      title: "Counting Bits",
      difficulty: "Easy",
      companies: ["Google", "Amazon", "Apple", "Adobe"],
      description:
        "Given an integer `n`, print an array `ans` of length `n + 1` where `ans[i]` is the number of `1` bits in the binary representation of `i`, for every `i` from `0` to `n`.\n\nCounting the bits of each number separately costs O(n log n); aim for a single pass that reuses earlier answers.",
      constraints: "0 <= n <= 10^5",
      inputFormat: "One line with the integer `n`.",
      outputFormat: "`n + 1` space-separated integers: the bit counts of 0, 1, ..., n.",
      examples: [
        { input: "2", output: "0 1 1", explanation: "0 -> 0, 1 -> 1, 2 (10) -> 1." },
        { input: "5", output: "0 1 1 2 1 2", explanation: "0, 1, 10, 11, 100, 101 have 0, 1, 1, 2, 1, 2 set bits." },
      ],
      testCases: [
        { input: "2", expectedOutput: "0 1 1", isHidden: false },
        { input: "5", expectedOutput: "0 1 1 2 1 2", isHidden: false },
        { input: "0", expectedOutput: "0", isHidden: true },
        { input: "1", expectedOutput: "0 1", isHidden: true },
        { input: "8", expectedOutput: "0 1 1 2 1 2 2 3 1", isHidden: true },
        { input: "15", expectedOutput: "0 1 1 2 1 2 2 3 1 2 2 3 2 3 3 4", isHidden: true },
        { input: "16", expectedOutput: "0 1 1 2 1 2 2 3 1 2 2 3 2 3 3 4 1", isHidden: true },
        { input: String(COUNTING_BITS_PERF_N), expectedOutput: COUNTING_BITS_PERF_EXPECTED, isHidden: true },
      ],
      hints: [
        "Counting the bits of every number from scratch works, but it repeats a lot of work.",
        "Dropping the lowest bit of i gives i >> 1, a smaller number whose answer you have already computed.",
        "ans[i] = ans[i >> 1] + (i & 1). Fill the array from 0 upward.",
      ],
      editorial:
        "The binary form of i is the binary form of i >> 1 followed by one extra low bit (i & 1). So bits(i) = bits(i >> 1) + (i & 1), and since i >> 1 < i it has already been computed when we reach i. Start with ans[0] = 0 and fill upward: O(n) time and O(n) space for the output. Another recurrence is bits(i) = bits(i & (i - 1)) + 1.",
      solutions: {
        javascript: code`
          function solve(input) {
            const n = Number(input.trim());
            const ans = new Array(n + 1).fill(0);
            for (let i = 1; i <= n; i++) ans[i] = ans[i >> 1] + (i & 1);
            return ans.join(" ");
          }
        `,
        python: code`
          def solve(input_str):
              n = int(input_str.strip())
              ans = [0] * (n + 1)
              for i in range(1, n + 1):
                  ans[i] = ans[i >> 1] + (i & 1)
              return " ".join(map(str, ans))
        `,
      },
    },
    {
      title: "Missing Number",
      difficulty: "Easy",
      companies: ["Amazon", "Microsoft", "Apple", "Accenture", "Zoho"],
      description:
        "You are given an array `nums` containing `n` distinct integers, each in the range `[0, n]`. Exactly one number from that range is absent. Print the missing number.\n\nTry to solve it in O(n) time and O(1) extra space.",
      constraints: "1 <= n <= 10^4\n0 <= nums[i] <= n\nAll values of nums are distinct.",
      inputFormat: "One line of `n` space-separated integers `nums`.",
      outputFormat: "The missing number.",
      examples: [
        { input: "3 0 1", output: "2", explanation: "n = 3, so the range is [0, 3]; 2 does not appear." },
        { input: "0 1", output: "2", explanation: "n = 2, the range is [0, 2]; 2 does not appear." },
      ],
      testCases: [
        { input: "3 0 1", expectedOutput: "2", isHidden: false },
        { input: "0 1", expectedOutput: "2", isHidden: false },
        { input: "1", expectedOutput: "0", isHidden: true },
        { input: "0", expectedOutput: "1", isHidden: true },
        { input: "9 6 4 2 3 5 7 0 1", expectedOutput: "8", isHidden: true },
        { input: "1 2 3 4", expectedOutput: "0", isHidden: true },
        { input: "0 1 2 3 4", expectedOutput: "5", isHidden: true },
        { input: MISSING_NUMBER_PERF, expectedOutput: String(MISSING_NUMBER_PERF_MISSING), isHidden: true },
      ],
      hints: [
        "Sorting the array and looking for the first gap works in O(n log n).",
        "The expected total of 0..n is n(n+1)/2; compare it with the actual sum.",
        "XOR is even safer: XOR together all indices 0..n-1, the value n, and every array element - everything cancels except the missing number.",
      ],
      editorial:
        "Each number in [0, n] should appear once. XOR all numbers 0..n together with all array elements: every present value is XOR-ed twice and cancels (x ^ x = 0), leaving only the missing one. Starting with n and XOR-ing i ^ nums[i] for each index does it in one pass. The arithmetic version (n(n+1)/2 - sum) is equivalent and fine here since the sums are small. Time O(n), space O(1).",
      solutions: {
        javascript: code`
          function solve(input) {
            const nums = input.trim().split(/\s+/).map(Number);
            let missing = nums.length;
            for (let i = 0; i < nums.length; i++) missing ^= i ^ nums[i];
            return String(missing);
          }
        `,
        python: code`
          def solve(input_str):
              nums = list(map(int, input_str.split()))
              missing = len(nums)
              for i, num in enumerate(nums):
                  missing ^= i ^ num
              return str(missing)
        `,
      },
    },
  ],
  slidingWindow: [
    {
      title: "Permutation in String",
      difficulty: "Medium",
      companies: ["Microsoft", "Amazon", "Google", "Bloomberg"],
      description:
        "Given two strings `s1` and `s2`, print `true` if `s2` contains a permutation of `s1` as a contiguous substring, and `false` otherwise. In other words, check whether some substring of `s2` uses exactly the same letters, with the same counts, as `s1`.",
      constraints: "1 <= s1.length, s2.length <= 10^5\ns1 and s2 consist of lowercase English letters.",
      inputFormat: "Line 1: the string `s1`.\nLine 2: the string `s2`.",
      outputFormat: "`true` or `false`.",
      examples: [
        { input: "ab\neidbaooo", output: "true", explanation: "s2 contains \"ba\", a permutation of \"ab\"." },
        { input: "ab\neidboaoo", output: "false", explanation: "No two adjacent letters of s2 are a and b." },
      ],
      testCases: [
        { input: "ab\neidbaooo", expectedOutput: "true", isHidden: false },
        { input: "ab\neidboaoo", expectedOutput: "false", isHidden: false },
        { input: "a\na", expectedOutput: "true", isHidden: true },
        { input: "abc\nab", expectedOutput: "false", isHidden: true },
        { input: "adc\ndcda", expectedOutput: "true", isHidden: true },
        { input: "hello\nooolleoooleh", expectedOutput: "false", isHidden: true },
        { input: "abc\nbbbca", expectedOutput: "true", isHidden: true },
        { input: PERMUTATION_PERF_TRUE, expectedOutput: "true", isHidden: true },
        { input: PERMUTATION_PERF_FALSE, expectedOutput: "false", isHidden: true },
      ],
      hints: [
        "A permutation of s1 is any string with the same letter counts, so the window you look for has length exactly s1.length.",
        "Slide a window of that fixed length over s2, updating the 26 letter counts by adding the new letter and removing the old one.",
        "Compare the window's counts with s1's counts (26 numbers), or maintain a single 'matching letters' counter so each step is O(1).",
      ],
      editorial:
        "Two strings are permutations of each other exactly when their letter-count arrays are equal. Build the count array for s1, then slide a window of length |s1| across s2, adding the entering letter and removing the leaving one. After each step compare the two 26-element arrays; if they are equal, answer true. If |s1| > |s2| the answer is immediately false. Time O(26 * |s2|) (or O(|s2|) with a running 'matches' counter), space O(26).",
      solutions: {
        javascript: code`
          function solve(input) {
            const lines = input.trim().split("\n");
            const s1 = lines[0].trim();
            const s2 = (lines[1] || "").trim();
            if (s1.length > s2.length) return "false";
            const need = new Array(26).fill(0);
            const window = new Array(26).fill(0);
            const code = (ch) => ch.charCodeAt(0) - 97;
            for (let i = 0; i < s1.length; i++) {
              need[code(s1[i])]++;
              window[code(s2[i])]++;
            }
            const same = () => {
              for (let c = 0; c < 26; c++) if (need[c] !== window[c]) return false;
              return true;
            };
            if (same()) return "true";
            for (let i = s1.length; i < s2.length; i++) {
              window[code(s2[i])]++;
              window[code(s2[i - s1.length])]--;
              if (same()) return "true";
            }
            return "false";
          }
        `,
        python: code`
          def solve(input_str):
              lines = input_str.strip().split("\n")
              s1 = lines[0].strip()
              s2 = lines[1].strip() if len(lines) > 1 else ""
              if len(s1) > len(s2):
                  return "false"
              need = [0] * 26
              window = [0] * 26
              for i in range(len(s1)):
                  need[ord(s1[i]) - 97] += 1
                  window[ord(s2[i]) - 97] += 1
              if need == window:
                  return "true"
              for i in range(len(s1), len(s2)):
                  window[ord(s2[i]) - 97] += 1
                  window[ord(s2[i - len(s1)]) - 97] -= 1
                  if need == window:
                      return "true"
              return "false"
        `,
      },
    },
    {
      title: "Fruit Into Baskets",
      difficulty: "Medium",
      companies: ["Google", "Amazon", "Microsoft", "Uber"],
      description:
        "You are visiting a farm with a single row of fruit trees; `fruits[i]` is the type of fruit on the `i`-th tree. You carry two baskets, and each basket can hold only one type of fruit (but any amount of it).\n\nYou choose any starting tree and then walk to the right, picking exactly one fruit from every tree you pass. You must stop as soon as you reach a tree whose fruit fits in neither basket. Print the maximum number of fruits you can pick.\n\nEquivalently: find the longest contiguous subarray containing at most two distinct values.",
      constraints: "1 <= fruits.length <= 10^5\n0 <= fruits[i] < fruits.length",
      inputFormat: "One line of space-separated integers `fruits`.",
      outputFormat: "The maximum number of fruits, as an integer.",
      examples: [
        { input: "1 2 1", output: "3", explanation: "Pick all three trees: only fruit types 1 and 2 are involved." },
        { input: "0 1 2 2", output: "3", explanation: "Start at index 1 and pick 1 2 2 (types 1 and 2)." },
      ],
      testCases: [
        { input: "1 2 1", expectedOutput: "3", isHidden: false },
        { input: "0 1 2 2", expectedOutput: "3", isHidden: false },
        { input: "1 2 3 2 2", expectedOutput: "4", isHidden: true },
        { input: "3 3 3 1 2 1 1 2 3 3 4", expectedOutput: "5", isHidden: true },
        { input: "1", expectedOutput: "1", isHidden: true },
        { input: "5 5 5 5", expectedOutput: "4", isHidden: true },
        { input: "0 1 2 3 4", expectedOutput: "2", isHidden: true },
        { input: FRUIT_PERF, expectedOutput: "3000", isHidden: true },
      ],
      hints: [
        "Rephrase the story: find the longest subarray that contains at most 2 different values.",
        "Keep a window [left, right] and a map from fruit type to its count inside the window.",
        "Extend right each step; while the map holds more than 2 types, remove fruits[left] (deleting types whose count reaches 0) and advance left. Track the largest window.",
      ],
      editorial:
        "This is a sliding window with a constraint on the number of distinct values. Grow the window to the right, counting each fruit type in a hash map. Whenever the map contains three types, shrink from the left, decrementing counts and deleting a type when its count reaches 0, until only two types remain. The window length after each step is a candidate answer. Every index enters and leaves the window once: time O(n), space O(1) (at most three map entries).",
      solutions: {
        javascript: code`
          function solve(input) {
            const fruits = input.trim().split(/\s+/).map(Number);
            const counts = new Map();
            let left = 0;
            let best = 0;
            for (let right = 0; right < fruits.length; right++) {
              counts.set(fruits[right], (counts.get(fruits[right]) || 0) + 1);
              while (counts.size > 2) {
                const out = fruits[left++];
                const remaining = counts.get(out) - 1;
                if (remaining === 0) counts.delete(out);
                else counts.set(out, remaining);
              }
              best = Math.max(best, right - left + 1);
            }
            return String(best);
          }
        `,
        python: code`
          def solve(input_str):
              fruits = list(map(int, input_str.split()))
              counts = {}
              left = 0
              best = 0
              for right, fruit in enumerate(fruits):
                  counts[fruit] = counts.get(fruit, 0) + 1
                  while len(counts) > 2:
                      out = fruits[left]
                      left += 1
                      counts[out] -= 1
                      if counts[out] == 0:
                          del counts[out]
                  best = max(best, right - left + 1)
              return str(best)
        `,
      },
    },
    {
      title: "Max Consecutive Ones III",
      difficulty: "Medium",
      companies: ["Meta", "Amazon", "Microsoft", "Google", "Bloomberg"],
      description:
        "You are given a binary array `nums` (each element is `0` or `1`) and an integer `k`. You may flip at most `k` zeros into ones.\n\nPrint the length of the longest contiguous subarray consisting only of ones that you can obtain.",
      constraints: "1 <= nums.length <= 10^5\nnums[i] is 0 or 1\n0 <= k <= nums.length",
      inputFormat: "Line 1: space-separated 0/1 values `nums`.\nLine 2: the integer `k`.",
      outputFormat: "The maximum length of a run of ones after at most `k` flips.",
      examples: [
        { input: "1 1 1 0 0 0 1 1 1 1 0\n2", output: "6", explanation: "Flip the zeros at indices 5 and 10 to get 1 1 1 0 0 1 1 1 1 1 1; the last six elements are all ones." },
        { input: "0 0 1 1 0 0 1 1 1 0 1 1 0 0 0 1 1 1 1\n3", output: "10", explanation: "Flip the zeros at indices 4, 5 and 9: positions 3 through 12 become ones, a run of length 10." },
      ],
      testCases: [
        { input: "1 1 1 0 0 0 1 1 1 1 0\n2", expectedOutput: "6", isHidden: false },
        { input: "0 0 1 1 0 0 1 1 1 0 1 1 0 0 0 1 1 1 1\n3", expectedOutput: "10", isHidden: false },
        { input: "0\n0", expectedOutput: "0", isHidden: true },
        { input: "0\n1", expectedOutput: "1", isHidden: true },
        { input: "1 1 1\n0", expectedOutput: "3", isHidden: true },
        { input: "0 0 0\n2", expectedOutput: "2", isHidden: true },
        { input: "1 0 1 0 1\n1", expectedOutput: "3", isHidden: true },
        { input: "1 0 0 1 1 0 1\n5", expectedOutput: "7", isHidden: true },
        { input: MAX_ONES_PERF, expectedOutput: "658", isHidden: true },
      ],
      hints: [
        "Flipping at most k zeros inside a window is the same as the window containing at most k zeros.",
        "Keep a window [left, right] and a count of zeros inside it; extend right one element at a time.",
        "When the zero count exceeds k, move left forward (decrementing the zero count when you pass a zero) until the window is valid again. The best window length is the answer.",
      ],
      editorial:
        "The longest run of ones after flipping at most k zeros is the longest subarray with at most k zeros. Use a sliding window: move right across the array, increasing a zero counter when nums[right] is 0. While the counter exceeds k, advance left and decrement the counter whenever a zero leaves the window. After each step the window [left, right] is valid, so record right - left + 1. Each pointer moves at most n times: O(n) time, O(1) space.",
      solutions: {
        javascript: code`
          function solve(input) {
            const lines = input.trim().split("\n");
            const nums = lines[0].trim().split(/\s+/).map(Number);
            const k = Number(lines[1]);
            let left = 0;
            let zeros = 0;
            let best = 0;
            for (let right = 0; right < nums.length; right++) {
              if (nums[right] === 0) zeros++;
              while (zeros > k) {
                if (nums[left] === 0) zeros--;
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
              nums = list(map(int, lines[0].split()))
              k = int(lines[1])
              left = 0
              zeros = 0
              best = 0
              for right, value in enumerate(nums):
                  if value == 0:
                      zeros += 1
                  while zeros > k:
                      if nums[left] == 0:
                          zeros -= 1
                      left += 1
                  best = max(best, right - left + 1)
              return str(best)
        `,
      },
    },
  ],
  tries: [
    {
      title: "Design Add and Search Words Data Structure",
      difficulty: "Medium",
      companies: ["Meta", "Google", "Amazon", "Microsoft", "Bloomberg"],
      description:
        "Design a data structure that stores words and supports two operations:\n- `addWord word`: add `word` to the structure (adding the same word again has no extra effect).\n- `search pattern`: print `true` if some previously added word matches `pattern`, otherwise `false`. A pattern consists of lowercase letters and the wildcard `.`, where `.` matches exactly one arbitrary letter. A match must have the same length as the pattern.\n\nProcess the operations in order and print the result of every `search` operation on its own line.",
      constraints: "1 <= word.length, pattern.length <= 25\nWords consist of lowercase English letters; patterns consist of lowercase letters and `.`\nAt most 3 * 10^4 operations, including at least one `search`.",
      inputFormat: "One operation per line: `addWord word` or `search pattern`.",
      outputFormat: "One line (`true` or `false`) per `search` operation, in input order.",
      examples: [
        {
          input: "addWord bad\naddWord dad\naddWord mad\nsearch pad\nsearch bad\nsearch .ad\nsearch b..",
          output: "false\ntrue\ntrue\ntrue",
          explanation: "\"pad\" was never added; \"bad\" was; \".ad\" matches bad, dad or mad; \"b..\" matches bad.",
        },
        { input: "search a\naddWord a\nsearch .\nsearch a.\nsearch a", output: "false\ntrue\nfalse\ntrue", explanation: "Nothing is stored at first. After adding \"a\": \".\" matches it, \"a.\" is too long for it, \"a\" matches it." },
      ],
      testCases: [
        {
          input: "addWord bad\naddWord dad\naddWord mad\nsearch pad\nsearch bad\nsearch .ad\nsearch b..",
          expectedOutput: "false\ntrue\ntrue\ntrue",
          isHidden: false,
        },
        { input: "search a\naddWord a\nsearch .\nsearch a.\nsearch a", expectedOutput: "false\ntrue\nfalse\ntrue", isHidden: false },
        { input: "addWord at\naddWord and\naddWord an\naddWord add\nsearch a\nsearch .at\nsearch an.\nsearch a.d.\nsearch b.\nsearch a.d\nsearch .", expectedOutput: "false\nfalse\ntrue\nfalse\nfalse\ntrue\nfalse", isHidden: true },
        { input: "addWord abc\nsearch ...\nsearch ....\nsearch ..\nsearch a.c\nsearch ab.\nsearch .bc\nsearch abd", expectedOutput: "true\nfalse\nfalse\ntrue\ntrue\ntrue\nfalse", isHidden: true },
        { input: "addWord hello\naddWord hello\nsearch h.l.o\nsearch hell\nsearch .....\nsearch ......", expectedOutput: "true\nfalse\ntrue\nfalse", isHidden: true },
        { input: "addWord zz\naddWord zzz\nsearch z.\nsearch ..z\nsearch .z.\nsearch ...z", expectedOutput: "true\ntrue\ntrue\nfalse", isHidden: true },
        wordDictionaryCase(5, 1800),
      ],
      hints: [
        "A hash set answers exact lookups instantly but cannot handle the `.` wildcard efficiently - a trie is a better fit.",
        "Store the words in a trie. For a letter in the pattern, follow just that child; for `.`, you must try every child.",
        "Implement search recursively: search(node, index) returns true if the rest of the pattern from `index` matches below `node`; at the end of the pattern, the node must be marked as the end of a word.",
      ],
      editorial:
        "Store all words in a trie with an `end` flag on the last node of each word. Adding a word costs O(L). To search, walk the pattern with a depth-first search: for a letter, move to the matching child (fail if it does not exist); for `.`, recurse into every child and succeed if any branch matches. When the pattern is consumed, succeed only if the current node marks a word end. Adding is O(L); a search is O(L) without wildcards and O(26^w * L) in the worst case with w wildcards, but it only ever explores existing branches, which is small in practice. Space is O(total characters).",
      solutions: {
        javascript: code`
          class WordDictionary {
            constructor() {
              this.root = { children: new Map(), end: false };
            }

            addWord(word) {
              let node = this.root;
              for (const letter of word) {
                if (!node.children.has(letter)) node.children.set(letter, { children: new Map(), end: false });
                node = node.children.get(letter);
              }
              node.end = true;
            }

            search(pattern) {
              const dfs = (node, index) => {
                if (index === pattern.length) return node.end;
                const letter = pattern[index];
                if (letter === ".") {
                  for (const child of node.children.values()) if (dfs(child, index + 1)) return true;
                  return false;
                }
                const child = node.children.get(letter);
                return child ? dfs(child, index + 1) : false;
              };
              return dfs(this.root, 0);
            }
          }

          function solve(input) {
            const dictionary = new WordDictionary();
            const out = [];
            for (const line of input.trim().split("\n")) {
              const [op, arg] = line.trim().split(/\s+/);
              if (op === "addWord") dictionary.addWord(arg);
              else if (op === "search") out.push(String(dictionary.search(arg)));
            }
            return out.join("\n");
          }
        `,
        python: code`
          class WordDictionary:
              def __init__(self):
                  self.root = {}

              def add_word(self, word):
                  node = self.root
                  for letter in word:
                      node = node.setdefault(letter, {})
                  node["$"] = True

              def search(self, pattern):
                  def dfs(node, index):
                      if index == len(pattern):
                          return "$" in node
                      letter = pattern[index]
                      if letter == ".":
                          for key, child in node.items():
                              if key != "$" and dfs(child, index + 1):
                                  return True
                          return False
                      child = node.get(letter)
                      return child is not None and dfs(child, index + 1)

                  return dfs(self.root, 0)


          def solve(input_str):
              dictionary = WordDictionary()
              out = []
              for line in input_str.strip().split("\n"):
                  parts = line.split()
                  if not parts:
                      continue
                  if parts[0] == "addWord":
                      dictionary.add_word(parts[1])
                  elif parts[0] == "search":
                      out.append("true" if dictionary.search(parts[1]) else "false")
              return "\n".join(out)
        `,
      },
    },
    {
      title: "Search Suggestions System",
      difficulty: "Medium",
      companies: ["Amazon", "Google", "Microsoft", "Bloomberg"],
      description:
        "You are given a list of distinct lowercase `products` and a lowercase string `searchWord`. Imagine the user typing `searchWord` one letter at a time. After each typed letter, suggest up to three products that start with the text typed so far. If more than three products match, suggest the three that are lexicographically smallest.\n\nPrint one line per typed letter (so `searchWord.length` lines): the suggestions in lexicographic order separated by single spaces, or `NONE` if no product starts with the current prefix.",
      constraints: "1 <= products.length <= 1000\n1 <= products[i].length <= 100\n1 <= searchWord.length <= 100\nAll products are distinct and consist of lowercase English letters; searchWord is lowercase letters.",
      inputFormat: "Line 1: space-separated products.\nLine 2: the string `searchWord`.",
      outputFormat: "`searchWord.length` lines. Line i holds the suggestions for the first i letters of `searchWord` (space-separated, lexicographically sorted, at most three), or `NONE`.",
      examples: [
        {
          input: "mobile moneypot monitor mouse mousepad\nmouse",
          output: "mobile moneypot monitor\nmobile moneypot monitor\nmouse mousepad\nmouse mousepad\nmouse mousepad",
          explanation: "Prefix \"m\" and \"mo\" match all five products (the three smallest are shown); \"mou\", \"mous\" and \"mouse\" match only mouse and mousepad.",
        },
        { input: "havana\nhavana", output: "havana\nhavana\nhavana\nhavana\nhavana\nhavana", explanation: "Every prefix of \"havana\" matches the only product." },
      ],
      testCases: [
        {
          input: "mobile moneypot monitor mouse mousepad\nmouse",
          expectedOutput: "mobile moneypot monitor\nmobile moneypot monitor\nmouse mousepad\nmouse mousepad\nmouse mousepad",
          isHidden: false,
        },
        { input: "havana\nhavana", expectedOutput: "havana\nhavana\nhavana\nhavana\nhavana\nhavana", isHidden: false },
        { input: "bags baggage banner box cloths\nbags", expectedOutput: "baggage bags banner\nbaggage bags banner\nbaggage bags\nbags", isHidden: true },
        { input: "havana\ntatiana", expectedOutput: "NONE\nNONE\nNONE\nNONE\nNONE\nNONE\nNONE", isHidden: true },
        { input: "a b c d\nbz", expectedOutput: "b\nNONE", isHidden: true },
        { input: "apple app apricot ape apex apt\nap", expectedOutput: "ape apex app\nape apex app", isHidden: true },
        { input: "code coder codex cod co\ncode", expectedOutput: "co cod code\nco cod code\ncod code coder\ncode coder codex", isHidden: true },
        { input: SUGGESTIONS_PERF_PRODUCTS.join(" ") + "\n" + SUGGESTIONS_PERF_WORD, expectedOutput: bruteSuggestions(SUGGESTIONS_PERF_PRODUCTS, SUGGESTIONS_PERF_WORD), isHidden: true },
      ],
      hints: [
        "Sort the products first - the three lexicographically smallest matches are then the first three in sorted order.",
        "All products sharing a prefix are contiguous in sorted order, so binary search (or a pointer that only moves forward) finds them for every prefix.",
        "Trie approach: insert the products in sorted order and let each node remember the first three products that passed through it; then just walk the searchWord letter by letter.",
      ],
      editorial:
        "Sort the products. Insert them into a trie in that order; because the order is sorted, the first three products to pass through a node are exactly the three smallest products having that node's path as a prefix, so each node stores a list capped at three entries. Walk the searchWord from the root: after each letter print the node's list, or `NONE` once the path no longer exists (all further prefixes then also print `NONE`). Building costs O(total characters) after the O(P log P) sort; each query step is O(1). An alternative keeps the sorted array and binary-searches the first product >= the current prefix, then inspects up to three entries.",
      solutions: {
        javascript: code`
          function solve(input) {
            const lines = input.trim().split("\n");
            const products = lines[0].trim().split(/\s+/).sort();
            const searchWord = (lines[1] || "").trim();
            const root = { children: new Map(), top: [] };
            for (const product of products) {
              let node = root;
              for (const letter of product) {
                if (!node.children.has(letter)) node.children.set(letter, { children: new Map(), top: [] });
                node = node.children.get(letter);
                if (node.top.length < 3) node.top.push(product);
              }
            }
            const out = [];
            let node = root;
            for (const letter of searchWord) {
              if (node) node = node.children.get(letter) || null;
              out.push(node && node.top.length ? node.top.join(" ") : "NONE");
            }
            return out.join("\n");
          }
        `,
        python: code`
          def solve(input_str):
              lines = input_str.strip().split("\n")
              products = sorted(lines[0].split())
              search_word = lines[1].strip() if len(lines) > 1 else ""
              root = {"children": {}, "top": []}
              for product in products:
                  node = root
                  for letter in product:
                      node = node["children"].setdefault(letter, {"children": {}, "top": []})
                      if len(node["top"]) < 3:
                          node["top"].append(product)
              out = []
              node = root
              for letter in search_word:
                  if node is not None:
                      node = node["children"].get(letter)
                  out.append(" ".join(node["top"]) if node is not None and node["top"] else "NONE")
              return "\n".join(out)
        `,
      },
    },
  ],
  segmentTrees: [
    {
      title: "Range Minimum Query",
      difficulty: "Medium",
      companies: ["Google", "Amazon", "Microsoft", "Uber"],
      description:
        "Given an integer array `nums`, process a sequence of operations in order:\n- `update i v`: set `nums[i] = v`.\n- `query l r`: print the minimum value among `nums[l..r]` (both ends inclusive, 0-indexed).\n\nPrint the answer of every `query` operation on its own line, in input order.",
      constraints: "1 <= nums.length <= 5 * 10^4\n-10^9 <= nums[i], v <= 10^9\n0 <= i < nums.length\n0 <= l <= r < nums.length\n1 <= number of operations <= 5 * 10^4, with at least one `query`",
      inputFormat: "Line 1: space-separated integers `nums`.\nFollowing lines: one operation per line, `update i v` or `query l r`.",
      outputFormat: "One line per `query` operation containing the minimum of the range.",
      examples: [
        { input: "5 2 8 1 9\nquery 0 4\nupdate 3 10\nquery 0 4\nquery 2 4", output: "1\n2\n8", explanation: "Initially the minimum is 1. After nums[3] becomes 10 the array is 5 2 8 10 9, so the minimum is 2, and nums[2..4] = 8 10 9 has minimum 8." },
        { input: "7\nquery 0 0\nupdate 0 -3\nquery 0 0", output: "7\n-3", explanation: "A single-element array." },
      ],
      testCases: [
        { input: "5 2 8 1 9\nquery 0 4\nupdate 3 10\nquery 0 4\nquery 2 4", expectedOutput: "1\n2\n8", isHidden: false },
        { input: "7\nquery 0 0\nupdate 0 -3\nquery 0 0", expectedOutput: "7\n-3", isHidden: false },
        { input: "4 4 4 4\nquery 1 2\nupdate 2 3\nquery 1 2\nquery 3 3\nquery 0 3", expectedOutput: "4\n3\n4\n3", isHidden: true },
        { input: "-5 3 -2 8\nquery 1 3\nupdate 0 100\nquery 0 1\nquery 0 3\nupdate 2 50\nquery 1 3", expectedOutput: "-2\n3\n-2\n3", isHidden: true },
        { input: "1000000000 -1000000000 0\nquery 0 2\nquery 0 0\nupdate 1 1000000000\nquery 0 2", expectedOutput: "-1000000000\n1000000000\n0", isHidden: true },
        { input: "9 8 7 6 5 4 3 2 1\nquery 0 8\nquery 0 3\nupdate 8 100\nquery 5 8\nquery 6 7\nupdate 0 -1\nquery 0 0\nquery 0 8", expectedOutput: "1\n6\n2\n2\n-1\n-1", isHidden: true },
        { input: "3 1 2\nupdate 1 5\nupdate 1 0\nquery 0 2\nquery 1 1\nquery 2 2", expectedOutput: "0\n0\n2", isHidden: true },
        rangeMinimumCase(9, 2000, 2500),
      ],
      hints: [
        "Scanning the range for every query is O(n) each, and prefix minima break as soon as an update arrives.",
        "A segment tree stores the minimum of each segment; a point update and a range query both touch only O(log n) nodes.",
        "Use an iterative tree of size 2n: leaves at positions n..2n-1, node i = min(node 2i, node 2i+1). After an update recompute the ancestors; for a query move two boundaries upward, taking a node whenever a boundary is a right/left child.",
      ],
      editorial:
        "Build a segment tree where each node stores the minimum of its two children (leaves hold the array values). An update overwrites the leaf and recomputes its ancestors in O(log n). A query over [l, r] starts with l + n and r + n + 1 as half-open bounds in the leaf layer; whenever the left bound is a right child its node is included and the bound moves right, whenever the right bound is a right child the node before it is included, and then both bounds move up a level. At most two nodes per level are inspected: O(log n). Building is O(n); space is O(n). Because min is commutative the iterative layout works for any n, not just powers of two.",
      solutions: {
        javascript: code`
          function solve(input) {
            const lines = input.trim().split("\n");
            const nums = lines[0].trim().split(/\s+/).map(Number);
            const n = nums.length;
            const tree = new Array(2 * n).fill(Infinity);
            for (let i = 0; i < n; i++) tree[n + i] = nums[i];
            for (let i = n - 1; i > 0; i--) tree[i] = Math.min(tree[2 * i], tree[2 * i + 1]);

            const update = (index, value) => {
              let pos = index + n;
              tree[pos] = value;
              for (pos >>= 1; pos >= 1; pos >>= 1) tree[pos] = Math.min(tree[2 * pos], tree[2 * pos + 1]);
            };

            const query = (left, right) => {
              let best = Infinity;
              for (let lo = left + n, hi = right + n + 1; lo < hi; lo >>= 1, hi >>= 1) {
                if (lo & 1) best = Math.min(best, tree[lo++]);
                if (hi & 1) best = Math.min(best, tree[--hi]);
              }
              return best;
            };

            const out = [];
            for (const line of lines.slice(1)) {
              const parts = line.trim().split(/\s+/);
              if (parts[0] === "update") update(Number(parts[1]), Number(parts[2]));
              else if (parts[0] === "query") out.push(query(Number(parts[1]), Number(parts[2])));
            }
            return out.join("\n");
          }
        `,
        python: code`
          def solve(input_str):
              lines = input_str.strip().split("\n")
              nums = list(map(int, lines[0].split()))
              n = len(nums)
              inf = float("inf")
              tree = [inf] * n + nums
              for i in range(n - 1, 0, -1):
                  tree[i] = min(tree[2 * i], tree[2 * i + 1])

              def update(index, value):
                  pos = index + n
                  tree[pos] = value
                  pos >>= 1
                  while pos >= 1:
                      tree[pos] = min(tree[2 * pos], tree[2 * pos + 1])
                      pos >>= 1

              def query(left, right):
                  best = inf
                  lo, hi = left + n, right + n + 1
                  while lo < hi:
                      if lo & 1:
                          best = min(best, tree[lo])
                          lo += 1
                      if hi & 1:
                          hi -= 1
                          best = min(best, tree[hi])
                      lo >>= 1
                      hi >>= 1
                  return best

              out = []
              for line in lines[1:]:
                  parts = line.split()
                  if not parts:
                      continue
                  if parts[0] == "update":
                      update(int(parts[1]), int(parts[2]))
                  elif parts[0] == "query":
                      out.append(str(query(int(parts[1]), int(parts[2]))))
              return "\n".join(out)
        `,
      },
    },
  ],
  advanced: [
    {
      title: "Maximum Product Subarray",
      difficulty: "Medium",
      companies: ["Amazon", "Google", "Microsoft", "Meta", "Adobe"],
      description:
        "Given an integer array `nums`, find a non-empty contiguous subarray with the largest product, and print that product.\n\nThe array may contain negative numbers and zeros. The product of any subarray is guaranteed to fit in a 32-bit signed integer.",
      constraints: "1 <= nums.length <= 2 * 10^4\n-10 <= nums[i] <= 10\nThe product of any subarray of nums fits in a 32-bit signed integer.",
      inputFormat: "One line of space-separated integers `nums`.",
      outputFormat: "The maximum product of a contiguous subarray, as an integer.",
      examples: [
        { input: "2 3 -2 4", output: "6", explanation: "The subarray [2, 3] has the largest product, 6." },
        { input: "-2 0 -1", output: "0", explanation: "The best you can do is [0] (or [-2, 0]); 2 is not achievable because -2 and -1 are not adjacent." },
      ],
      testCases: [
        { input: "2 3 -2 4", expectedOutput: "6", isHidden: false },
        { input: "-2 0 -1", expectedOutput: "0", isHidden: false },
        { input: "-2", expectedOutput: "-2", isHidden: true },
        { input: "-2 3 -4", expectedOutput: "24", isHidden: true },
        { input: "0 2", expectedOutput: "2", isHidden: true },
        { input: "-1 -2 -3 0 -4", expectedOutput: "6", isHidden: true },
        { input: "2 -5 -2 -4 3", expectedOutput: "24", isHidden: true },
        { input: "-3 -1 -1", expectedOutput: "3", isHidden: true },
        { input: MAX_PRODUCT_PERF, expectedOutput: "8", isHidden: true },
      ],
      hints: [
        "Checking every subarray is O(n^2). Think about how the best product ending at position i can be extended from position i - 1.",
        "A negative number can turn the smallest (most negative) product into the largest one, so track both the maximum and the minimum product of a subarray ending at i.",
        "At each x: newMax = max(x, x * prevMax, x * prevMin) and newMin = min(x, x * prevMax, x * prevMin). The answer is the largest newMax seen.",
      ],
      editorial:
        "Let maxEnd and minEnd be the largest and smallest products of subarrays ending at the current index. For the next element x the candidates for both are x alone (restart), x * maxEnd and x * minEnd; a negative x swaps their roles, which is why the minimum must be tracked too. A zero resets both to 0 naturally because x alone competes with 0 * anything. Keep the maximum of maxEnd over all positions. Time O(n), space O(1).",
      solutions: {
        javascript: code`
          function solve(input) {
            const nums = input.trim().split(/\s+/).map(Number);
            let maxEnd = nums[0];
            let minEnd = nums[0];
            let best = nums[0];
            for (let i = 1; i < nums.length; i++) {
              const x = nums[i];
              const a = maxEnd * x;
              const b = minEnd * x;
              maxEnd = Math.max(x, a, b);
              minEnd = Math.min(x, a, b);
              best = Math.max(best, maxEnd);
            }
            return String(best);
          }
        `,
        python: code`
          def solve(input_str):
              nums = list(map(int, input_str.split()))
              max_end = min_end = best = nums[0]
              for x in nums[1:]:
                  a, b = max_end * x, min_end * x
                  max_end = max(x, a, b)
                  min_end = min(x, a, b)
                  best = max(best, max_end)
              return str(best)
        `,
      },
    },
    {
      title: "Find the Duplicate Number",
      difficulty: "Medium",
      companies: ["Amazon", "Microsoft", "Google", "Adobe", "Zoho"],
      description:
        "You are given an array `nums` of `n + 1` integers where every value lies in the range `[1, n]`. Exactly one value appears more than once (it may appear two or more times); every other value appears at most once. Print the repeated value.\n\nSolve it without modifying the array and using only O(1) extra space.",
      constraints: "1 <= n <= 10^5 (so the array has n + 1 elements)\n1 <= nums[i] <= n\nExactly one value is repeated; it may occur more than twice.",
      inputFormat: "One line of `n + 1` space-separated integers `nums`.",
      outputFormat: "The repeated value.",
      examples: [
        { input: "1 3 4 2 2", output: "2", explanation: "n = 4 and the value 2 appears twice." },
        { input: "3 1 3 4 2", output: "3", explanation: "The value 3 appears twice." },
      ],
      testCases: [
        { input: "1 3 4 2 2", expectedOutput: "2", isHidden: false },
        { input: "3 1 3 4 2", expectedOutput: "3", isHidden: false },
        { input: "1 1", expectedOutput: "1", isHidden: true },
        { input: "1 1 2", expectedOutput: "1", isHidden: true },
        { input: "2 2 2 2 2", expectedOutput: "2", isHidden: true },
        { input: "1 4 4 2 4", expectedOutput: "4", isHidden: true },
        { input: "2 5 9 6 9 3 8 9 7 1", expectedOutput: "9", isHidden: true },
        { input: DUPLICATE_PERF, expectedOutput: String(DUPLICATE_PERF_VALUE), isHidden: true },
      ],
      hints: [
        "Sorting or a hash set finds the duplicate, but sorting modifies the array and a set needs O(n) space.",
        "Treat the array as a linked list where index i points to nums[i]. Because there are n + 1 slots and only n distinct targets, this walk must eventually enter a cycle.",
        "The duplicate value is the entrance of the cycle: use Floyd's tortoise and hare - find a meeting point, then restart one pointer from the start and move both one step at a time until they meet again.",
      ],
      editorial:
        "Define the function f(i) = nums[i], so following f from index 0 gives a sequence of values in [1, n]; index 0 is never a target, so the walk starts outside any cycle. Two different indices that map to the same value (the duplicate) create a node with two incoming edges, which is exactly the entrance of the cycle. Floyd's algorithm finds it: advance slow by one step and fast by two until they meet inside the cycle, then put slow back at the start and advance both one step at a time; they meet again at the cycle entrance, which is the duplicate. Time O(n), space O(1), array untouched.",
      solutions: {
        javascript: code`
          function solve(input) {
            const nums = input.trim().split(/\s+/).map(Number);
            let slow = nums[0];
            let fast = nums[0];
            do {
              slow = nums[slow];
              fast = nums[nums[fast]];
            } while (slow !== fast);
            slow = nums[0];
            while (slow !== fast) {
              slow = nums[slow];
              fast = nums[fast];
            }
            return String(slow);
          }
        `,
        python: code`
          def solve(input_str):
              nums = list(map(int, input_str.split()))
              slow = fast = nums[0]
              while True:
                  slow = nums[slow]
                  fast = nums[nums[fast]]
                  if slow == fast:
                      break
              slow = nums[0]
              while slow != fast:
                  slow = nums[slow]
                  fast = nums[fast]
              return str(slow)
        `,
      },
    },
    {
      title: "Spiral Matrix",
      difficulty: "Medium",
      companies: ["Microsoft", "Amazon", "Google", "Adobe", "Zoho"],
      description:
        "Given an `m x n` matrix of integers, print all of its elements in spiral order: start at the top-left cell, go right along the top row, then down the right column, then left along the bottom row, then up the left column, and keep spiralling inwards until every cell has been visited exactly once.",
      constraints: "1 <= m, n <= 200\n-10^5 <= matrix[i][j] <= 10^5",
      inputFormat: "The matrix, one row per line, with the row's elements separated by spaces. All rows have the same length.",
      outputFormat: "All `m * n` elements in spiral order, on one line separated by single spaces.",
      examples: [
        { input: "1 2 3\n4 5 6\n7 8 9", output: "1 2 3 6 9 8 7 4 5", explanation: "Right along the top (1 2 3), down the right side (6 9), left along the bottom (8 7), up the left side (4) and finally the centre (5)." },
        { input: "1 2 3 4\n5 6 7 8\n9 10 11 12", output: "1 2 3 4 8 12 11 10 9 5 6 7", explanation: "Top row, right column, bottom row reversed, then the left column and the inner row." },
      ],
      testCases: [
        { input: "1 2 3\n4 5 6\n7 8 9", expectedOutput: "1 2 3 6 9 8 7 4 5", isHidden: false },
        { input: "1 2 3 4\n5 6 7 8\n9 10 11 12", expectedOutput: "1 2 3 4 8 12 11 10 9 5 6 7", isHidden: false },
        { input: "5", expectedOutput: "5", isHidden: true },
        { input: "1 2 3", expectedOutput: "1 2 3", isHidden: true },
        { input: "1\n2\n3", expectedOutput: "1 2 3", isHidden: true },
        { input: "1 2\n3 4", expectedOutput: "1 2 4 3", isHidden: true },
        { input: "1 2\n3 4\n5 6", expectedOutput: "1 2 4 6 5 3", isHidden: true },
        { input: "-1 0 1 2 3\n4 5 6 7 8", expectedOutput: "-1 0 1 2 3 8 7 6 5 4", isHidden: true },
        { input: SPIRAL_PERF, expectedOutput: spiralBySimulation(SPIRAL_ROWS, SPIRAL_COLS), isHidden: true },
      ],
      hints: [
        "Visit the matrix layer by layer, from the outside in.",
        "Keep four boundaries: top, bottom, left, right. After walking along one side, shrink the corresponding boundary.",
        "Watch the degenerate cases: after finishing the top row and right column, only walk the bottom row if top <= bottom and the left column if left <= right, otherwise single rows/columns are visited twice.",
      ],
      editorial:
        "Maintain top, bottom, left and right bounds of the unvisited rectangle. While top <= bottom and left <= right: walk the top row left to right and increment top; walk the right column top to bottom and decrement right; if rows remain (top <= bottom) walk the bottom row right to left and decrement bottom; if columns remain (left <= right) walk the left column bottom to top and increment left. The two guards prevent visiting a single remaining row or column twice. Each cell is visited once: O(m * n) time and O(1) extra space besides the output.",
      solutions: {
        javascript: code`
          function solve(input) {
            const matrix = input
              .trim()
              .split("\n")
              .map((line) => line.trim().split(/\s+/).map(Number));
            let top = 0;
            let bottom = matrix.length - 1;
            let left = 0;
            let right = matrix[0].length - 1;
            const out = [];
            while (top <= bottom && left <= right) {
              for (let c = left; c <= right; c++) out.push(matrix[top][c]);
              top++;
              for (let r = top; r <= bottom; r++) out.push(matrix[r][right]);
              right--;
              if (top <= bottom) {
                for (let c = right; c >= left; c--) out.push(matrix[bottom][c]);
                bottom--;
              }
              if (left <= right) {
                for (let r = bottom; r >= top; r--) out.push(matrix[r][left]);
                left++;
              }
            }
            return out.join(" ");
          }
        `,
        python: code`
          def solve(input_str):
              matrix = [list(map(int, line.split())) for line in input_str.strip().split("\n")]
              top, bottom = 0, len(matrix) - 1
              left, right = 0, len(matrix[0]) - 1
              out = []
              while top <= bottom and left <= right:
                  for c in range(left, right + 1):
                      out.append(matrix[top][c])
                  top += 1
                  for r in range(top, bottom + 1):
                      out.append(matrix[r][right])
                  right -= 1
                  if top <= bottom:
                      for c in range(right, left - 1, -1):
                          out.append(matrix[bottom][c])
                      bottom -= 1
                  if left <= right:
                      for r in range(bottom, top - 1, -1):
                          out.append(matrix[r][left])
                      left += 1
              return " ".join(map(str, out))
        `,
      },
    },
    {
      title: "Rotate Image",
      difficulty: "Medium",
      companies: ["Amazon", "Microsoft", "Apple", "Google", "Adobe"],
      description:
        "You are given an `n x n` matrix of integers representing an image. Rotate the image by 90 degrees clockwise and print the resulting matrix.\n\nIn an interview you would be asked to do this in place (without allocating a second matrix); your reference solution should do the same.",
      constraints: "1 <= n <= 200\n-1000 <= matrix[i][j] <= 1000",
      inputFormat: "The `n x n` matrix, one row per line, with the row's elements separated by spaces.",
      outputFormat: "The rotated matrix, one row per line, elements separated by single spaces.",
      examples: [
        { input: "1 2 3\n4 5 6\n7 8 9", output: "7 4 1\n8 5 2\n9 6 3", explanation: "The first column read bottom-to-top (7 4 1) becomes the first row." },
        {
          input: "5 1 9 11\n2 4 8 10\n13 3 6 7\n15 14 12 16",
          output: "15 13 2 5\n14 3 4 1\n12 6 8 9\n16 7 10 11",
          explanation: "Each row of the result is a column of the input read from bottom to top.",
        },
      ],
      testCases: [
        { input: "1 2 3\n4 5 6\n7 8 9", expectedOutput: "7 4 1\n8 5 2\n9 6 3", isHidden: false },
        { input: "5 1 9 11\n2 4 8 10\n13 3 6 7\n15 14 12 16", expectedOutput: "15 13 2 5\n14 3 4 1\n12 6 8 9\n16 7 10 11", isHidden: false },
        { input: "1", expectedOutput: "1", isHidden: true },
        { input: "1 2\n3 4", expectedOutput: "3 1\n4 2", isHidden: true },
        { input: "-1 -2\n-3 -4", expectedOutput: "-3 -1\n-4 -2", isHidden: true },
        { input: "1 2 3 4 5\n6 7 8 9 10\n11 12 13 14 15\n16 17 18 19 20\n21 22 23 24 25", expectedOutput: "21 16 11 6 1\n22 17 12 7 2\n23 18 13 8 3\n24 19 14 9 4\n25 20 15 10 5", isHidden: true },
        { input: "0 0 0\n0 1 0\n0 0 0", expectedOutput: "0 0 0\n0 1 0\n0 0 0", isHidden: true },
        { input: ROTATE_PERF, expectedOutput: ROTATE_PERF_EXPECTED, isHidden: true },
      ],
      hints: [
        "Work out where the cell (i, j) ends up after a clockwise rotation: it lands at (j, n - 1 - i).",
        "Rotating in place by moving cells one by one is awkward; try splitting the rotation into two simple operations.",
        "Transpose the matrix (swap matrix[i][j] with matrix[j][i]), then reverse every row. That is exactly a 90-degree clockwise rotation.",
      ],
      editorial:
        "A clockwise rotation sends the element at (i, j) to (j, n - 1 - i). That equals a transpose ((i, j) -> (j, i)) followed by reversing each row ((j, i) -> (j, n - 1 - i)). Both steps can be done in place by swapping pairs of cells, so no second matrix is needed. Time O(n^2), extra space O(1). (Rotating counter-clockwise would be a transpose followed by reversing the columns instead.)",
      solutions: {
        javascript: code`
          function solve(input) {
            const matrix = input
              .trim()
              .split("\n")
              .map((line) => line.trim().split(/\s+/).map(Number));
            const n = matrix.length;
            for (let i = 0; i < n; i++) {
              for (let j = i + 1; j < n; j++) {
                [matrix[i][j], matrix[j][i]] = [matrix[j][i], matrix[i][j]];
              }
            }
            for (const row of matrix) row.reverse();
            return matrix.map((row) => row.join(" ")).join("\n");
          }
        `,
        python: code`
          def solve(input_str):
              matrix = [list(map(int, line.split())) for line in input_str.strip().split("\n")]
              n = len(matrix)
              for i in range(n):
                  for j in range(i + 1, n):
                      matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]
              for row in matrix:
                  row.reverse()
              return "\n".join(" ".join(map(str, row)) for row in matrix)
        `,
      },
    },
  ],
};
