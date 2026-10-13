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

const randomLetters = (seed: number, length: number, alphabet: string): string => {
  const next = seededRandom(seed);
  return Array.from({ length }, () => alphabet[next(alphabet.length)]).join("");
};

const randomInts = (seed: number, length: number, bound: number, offset = 0): number[] => {
  const next = seededRandom(seed);
  return Array.from({ length }, () => next(bound) + offset);
};

// ---- performance inputs (expected outputs below are literals from an independent brute force) ----

// Isomorphic Strings: a Caesar-shifted copy is a bijection (true); breaking one late character is not (false).
const ISO_BASE = randomLetters(9101, 50000, "abcdefghijklmnopqrstuvwxyz");
const ISO_SHIFTED = ISO_BASE.split("").map((c) => String.fromCharCode(97 + ((c.charCodeAt(0) - 97 + 3) % 26))).join("");
const ISO_BROKEN = ISO_SHIFTED.slice(0, 49990) + (ISO_SHIFTED[49990] === "a" ? "b" : "a") + ISO_SHIFTED.slice(49991);

// Logger Rate Limiter: 20000 log lines over 40 messages with slowly increasing timestamps.
const LOGGER_EVENTS = (() => {
  const next = seededRandom(9102);
  const events: { t: number; msg: string }[] = [];
  let time = 0;
  for (let i = 0; i < 20000; i++) {
    time += next(3);
    events.push({ t: time, msg: `msg${next(40)}` });
  }
  return events;
})();
const LOGGER_PERF = ["20000", ...LOGGER_EVENTS.map((e) => `${e.t} ${e.msg}`)].join("\n");
// Naive brute force: re-scan the list of everything printed so far (no per-message map).
const LOGGER_PERF_EXPECTED = (() => {
  const printed: { t: number; msg: string }[] = [];
  return LOGGER_EVENTS.map((e) => {
    const blocked = printed.some((p) => p.msg === e.msg && e.t - p.t < 10);
    if (!blocked) printed.push(e);
    return blocked ? "false" : "true";
  }).join(" ");
})();

// First Repeating Element: 20000 values from a million, so the first repeating value sits somewhere in the middle.
const FIRST_REPEAT_PERF = randomInts(9103, 20000, 1000000, -500000).join(" ");

// Most Common Word: 20000 words drawn from a 40 word vocabulary with random case and punctuation.
const COMMON_WORD_PERF = (() => {
  const next = seededRandom(9104);
  const vocab = Array.from({ length: 40 }, (_, i) => randomLetters(9200 + i, 3 + (i % 5), "abcdefghijklmnopqrstuvwxyz"));
  const marks = ["", "", ",", ".", "!", ";"];
  const parts: string[] = [];
  for (let i = 0; i < 20000; i++) {
    let w = vocab[next(40)];
    if (next(3) === 0) w = w[0].toUpperCase() + w.slice(1);
    parts.push(w + marks[next(marks.length)]);
  }
  return parts.join(" ") + "\n" + vocab.slice(0, 3).join(" ");
})();

// Count Pairs with Given Sum: heavy duplicates so the answer needs the count-before-insert trick.
const PAIR_SUM_PERF_A = randomInts(9105, 5000, 41, -20).join(" ") + "\n3";
const PAIR_SUM_PERF_B = randomInts(9106, 100000, 10).join(" ") + "\n9";

// Time Based Key-Value Store: 20000 operations over 30 keys; set timestamps grow per key.
// The expected output comes from a naive brute force that linearly scans every stored (timestamp, value) pair.
const TIME_KV_LINES: string[] = [];
const TIME_KV_EXPECTED_LINES: string[] = [];
(() => {
  const next = seededRandom(9107);
  const clock = new Array(30).fill(0);
  const store: { key: string; ts: number; value: string }[] = [];
  for (let i = 0; i < 20000; i++) {
    const k = next(30);
    const key = `key${k}`;
    if (next(2) === 0) {
      clock[k] += 1 + next(5);
      const value = `v${next(1000)}`;
      store.push({ key, ts: clock[k], value });
      TIME_KV_LINES.push(`set ${key} ${value} ${clock[k]}`);
    } else {
      const query = next(Math.max(1, clock[k] + 10));
      let best = "-1";
      let bestTs = -1;
      for (const e of store) if (e.key === key && e.ts <= query && e.ts > bestTs) { bestTs = e.ts; best = e.value; }
      TIME_KV_LINES.push(`get ${key} ${query}`);
      TIME_KV_EXPECTED_LINES.push(best);
    }
  }
})();
const TIME_KV_PERF = [String(TIME_KV_LINES.length), ...TIME_KV_LINES].join("\n");
const TIME_KV_PERF_EXPECTED = TIME_KV_EXPECTED_LINES.join("\n");

// Insert Delete GetRandom O(1): 20000 operations over a small value range, naive array brute force for the output.
const RANDSET_LINES: string[] = [];
const RANDSET_EXPECTED: string[] = [];
(() => {
  const next = seededRandom(9108);
  const arr: number[] = [];
  for (let i = 0; i < 20000; i++) {
    const kind = next(10);
    if (kind < 4 || arr.length === 0) {
      const x = next(300);
      RANDSET_LINES.push(`insert ${x}`);
      if (arr.indexOf(x) === -1) { arr.push(x); RANDSET_EXPECTED.push("true"); } else RANDSET_EXPECTED.push("false");
    } else if (kind < 7) {
      const x = next(300);
      RANDSET_LINES.push(`remove ${x}`);
      const at = arr.indexOf(x);
      if (at === -1) RANDSET_EXPECTED.push("false");
      else { arr[at] = arr[arr.length - 1]; arr.pop(); RANDSET_EXPECTED.push("true"); }
    } else {
      const at = next(arr.length);
      RANDSET_LINES.push(`getAt ${at}`);
      RANDSET_EXPECTED.push(String(arr[at]));
    }
  }
})();
const RANDSET_PERF = [String(RANDSET_LINES.length), ...RANDSET_LINES].join("\n");
const RANDSET_PERF_EXPECTED = RANDSET_EXPECTED.join(" ");

export const REAL_HASHING: ProblemSpec[] = [
  {
    title: "Isomorphic Strings",
    difficulty: "Easy",
    companies: ["Amazon", "Google", "Microsoft"],
    description:
      "Two strings `s` and `t` are **isomorphic** if the characters of `s` can be replaced to get `t`, where every character is replaced consistently and no two different characters of `s` map to the same character of `t`. A character may map to itself.\n\nPrint `true` if `s` and `t` are isomorphic, otherwise print `false`.",
    constraints: "1 <= s.length <= 5 * 10^4\nt.length == s.length\ns and t contain visible ASCII characters (no spaces).",
    inputFormat: "Line 1: the string `s`.\nLine 2: the string `t`.",
    outputFormat: "`true` or `false`.",
    examples: [
      { input: "egg\nadd", output: "true", explanation: "e -> a and g -> d is a consistent one-to-one mapping." },
      { input: "foo\nbar", output: "false", explanation: "'o' would have to map to both 'a' and 'r'." },
    ],
    testCases: [
      { input: "egg\nadd", expectedOutput: "true", isHidden: false },
      { input: "foo\nbar", expectedOutput: "false", isHidden: false },
      { input: "paper\ntitle", expectedOutput: "true", isHidden: true },
      { input: "badc\nbaba", expectedOutput: "false", isHidden: true },
      { input: "a\na", expectedOutput: "true", isHidden: true },
      { input: "ab\naa", expectedOutput: "false", isHidden: true },
      { input: "13\n42", expectedOutput: "true", isHidden: true },
      { input: `${ISO_BASE}\n${ISO_SHIFTED}`, expectedOutput: "true", isHidden: true },
      { input: `${ISO_BASE}\n${ISO_BROKEN}`, expectedOutput: "false", isHidden: true },
    ],
    hints: [
      "Mapping s -> t consistently is not enough: 'ab' -> 'aa' is consistent one way but not the other.",
      "You need to check the mapping in both directions, so keep two hash maps (s to t and t to s).",
      "Walk both strings together; if either map already holds a different partner for the current characters, answer false.",
    ],
    editorial:
      "Scan the strings in lockstep, maintaining `forward[s[i]] = t[i]` and `backward[t[i]] = s[i]`. If a character already has a recorded partner that differs from the current one in either map, the strings are not isomorphic. Otherwise record the pairing. Time O(n), space O(alphabet).",
    solutions: {
      javascript: code`
        function solve(input) {
          const lines = input.trim().split("\n");
          const s = lines[0].trim();
          const t = lines[1].trim();
          if (s.length !== t.length) return "false";
          const forward = new Map();
          const backward = new Map();
          for (let i = 0; i < s.length; i++) {
            const a = s[i];
            const b = t[i];
            if (forward.has(a) && forward.get(a) !== b) return "false";
            if (backward.has(b) && backward.get(b) !== a) return "false";
            forward.set(a, b);
            backward.set(b, a);
          }
          return "true";
        }
      `,
      python: code`
        def solve(input_str):
            lines = input_str.strip().split("\n")
            s, t = lines[0].strip(), lines[1].strip()
            if len(s) != len(t):
                return "false"
            forward, backward = {}, {}
            for a, b in zip(s, t):
                if forward.get(a, b) != b or backward.get(b, a) != a:
                    return "false"
                forward[a] = b
                backward[b] = a
            return "true"
      `,
    },
  },
  {
    title: "Word Pattern",
    difficulty: "Easy",
    companies: ["Google", "Amazon", "Uber"],
    description:
      "Given a `pattern` made of lowercase letters and a sentence of words separated by single spaces, decide whether the sentence follows the pattern.\n\nIt follows the pattern when there is a **bijection** between the letters of the pattern and the words of the sentence: each letter always stands for the same word, and each word is always represented by the same letter. Print `true` or `false`.",
    constraints: "1 <= pattern.length <= 300\nThe sentence has 1 to 300 words, each made of lowercase letters, separated by single spaces.",
    inputFormat: "Line 1: the string `pattern`.\nLine 2: the sentence (space-separated words).",
    outputFormat: "`true` or `false`.",
    examples: [
      { input: "abba\ndog cat cat dog", output: "true", explanation: "a -> dog, b -> cat." },
      { input: "abba\ndog dog dog dog", output: "false", explanation: "'a' and 'b' would both map to 'dog'." },
    ],
    testCases: [
      { input: "abba\ndog cat cat dog", expectedOutput: "true", isHidden: false },
      { input: "abba\ndog dog dog dog", expectedOutput: "false", isHidden: false },
      { input: "abba\ndog cat cat fish", expectedOutput: "false", isHidden: true },
      { input: "aaaa\ndog cat cat dog", expectedOutput: "false", isHidden: true },
      { input: "a\nx", expectedOutput: "true", isHidden: true },
      { input: "ab\nx", expectedOutput: "false", isHidden: true },
      { input: "abc\nb c a", expectedOutput: "true", isHidden: true },
      { input: "aaa\nxy xy xy xy", expectedOutput: "false", isHidden: true },
    ],
    hints: [
      "If the pattern length and word count differ, the answer is immediately false.",
      "Like Isomorphic Strings, the mapping must be one-to-one, so track letter -> word and word -> letter.",
      "Compare the pair at each position against both maps; any conflict means false.",
    ],
    editorial:
      "Split the sentence into words. If the counts differ, return false. Then walk the pattern and words together while keeping two maps (letter -> word, word -> letter); a conflict in either map means the sentence does not follow the pattern. Time O(n), space O(n).",
    solutions: {
      javascript: code`
        function solve(input) {
          const lines = input.trim().split("\n");
          const pattern = lines[0].trim();
          const words = lines[1].trim().split(/\s+/);
          if (pattern.length !== words.length) return "false";
          const toWord = new Map();
          const toLetter = new Map();
          for (let i = 0; i < pattern.length; i++) {
            const c = pattern[i];
            const w = words[i];
            if (toWord.has(c) && toWord.get(c) !== w) return "false";
            if (toLetter.has(w) && toLetter.get(w) !== c) return "false";
            toWord.set(c, w);
            toLetter.set(w, c);
          }
          return "true";
        }
      `,
      python: code`
        def solve(input_str):
            lines = input_str.strip().split("\n")
            pattern = lines[0].strip()
            words = lines[1].split()
            if len(pattern) != len(words):
                return "false"
            to_word, to_letter = {}, {}
            for c, w in zip(pattern, words):
                if to_word.get(c, w) != w or to_letter.get(w, c) != c:
                    return "false"
                to_word[c] = w
                to_letter[w] = c
            return "true"
      `,
    },
  },
  {
    title: "Ransom Note",
    difficulty: "Easy",
    companies: ["Amazon", "Microsoft", "Apple"],
    description:
      "You want to write a ransom note by cutting single letters out of a magazine. Each letter of the magazine can be used **at most once**.\n\nGiven the note and the magazine text, print `true` if the note can be built from the magazine's letters, otherwise `false`. Matching is case sensitive.",
    constraints: "1 <= note.length, magazine.length <= 10^5\nBoth strings consist of English letters (no spaces).",
    inputFormat: "Line 1: the ransom note.\nLine 2: the magazine.",
    outputFormat: "`true` or `false`.",
    examples: [
      { input: "aa\naab", output: "true", explanation: "The magazine has two 'a' letters." },
      { input: "aa\nab", output: "false", explanation: "Only one 'a' is available." },
    ],
    testCases: [
      { input: "aa\naab", expectedOutput: "true", isHidden: false },
      { input: "aa\nab", expectedOutput: "false", isHidden: false },
      { input: "a\nb", expectedOutput: "false", isHidden: true },
      { input: "abc\ncba", expectedOutput: "true", isHidden: true },
      { input: "Aa\naa", expectedOutput: "false", isHidden: true },
      { input: "zzz\nzz", expectedOutput: "false", isHidden: true },
      { input: "hello\nhelloworld", expectedOutput: "true", isHidden: true },
    ],
    hints: [
      "Order does not matter; only how many times each letter appears.",
      "Count the letters of the magazine in a hash map or a 52-slot array.",
      "Walk the note and decrement the counts; if a count would go below zero, the answer is false.",
    ],
    editorial:
      "Build a frequency table of the magazine, then consume one count per letter of the note. If any letter is missing (count already zero), the note cannot be written. Time O(n + m), space O(alphabet).",
    solutions: {
      javascript: code`
        function solve(input) {
          const lines = input.trim().split("\n");
          const note = lines[0].trim();
          const magazine = lines[1].trim();
          const count = new Map();
          for (const c of magazine) count.set(c, (count.get(c) || 0) + 1);
          for (const c of note) {
            const left = count.get(c) || 0;
            if (left === 0) return "false";
            count.set(c, left - 1);
          }
          return "true";
        }
      `,
      python: code`
        from collections import Counter

        def solve(input_str):
            lines = input_str.strip().split("\n")
            note, magazine = lines[0].strip(), lines[1].strip()
            count = Counter(magazine)
            for c in note:
                if count[c] == 0:
                    return "false"
                count[c] -= 1
            return "true"
      `,
    },
  },
  {
    title: "Jewels and Stones",
    difficulty: "Easy",
    companies: ["Amazon", "Apple", "Microsoft"],
    description:
      "The string `jewels` lists the types of stones that are jewels, and the string `stones` lists the stones you own. Each character of `stones` is one stone of that type.\n\nPrint how many of your stones are jewels. Letters are case sensitive, so `a` and `A` are different types.",
    constraints: "1 <= jewels.length, stones.length <= 50\nBoth strings consist of English letters. All characters of `jewels` are distinct.",
    inputFormat: "Line 1: the string `jewels`.\nLine 2: the string `stones`.",
    outputFormat: "A single integer: the number of stones that are jewels.",
    examples: [
      { input: "aA\naAAbbbb", output: "3", explanation: "Stones a, A and A are jewels." },
      { input: "z\nZZ", output: "0", explanation: "Lowercase z is a jewel but there is no lowercase z among the stones." },
    ],
    testCases: [
      { input: "aA\naAAbbbb", expectedOutput: "3", isHidden: false },
      { input: "z\nZZ", expectedOutput: "0", isHidden: false },
      { input: "abc\nabcabcabc", expectedOutput: "9", isHidden: true },
      { input: "a\na", expectedOutput: "1", isHidden: true },
      { input: "xyz\nbbbbbbbbbb", expectedOutput: "0", isHidden: true },
      { input: "Zz\nzzZZxyZ", expectedOutput: "5", isHidden: true },
    ],
    hints: [
      "Checking each stone against every jewel letter works, but is O(n * m).",
      "Put the jewel letters into a set so each lookup is O(1).",
      "Count the stones whose character is in the set.",
    ],
    editorial:
      "Store the jewel types in a hash set, then scan the stones and count the ones present in the set. Time O(n + m), space O(m).",
    solutions: {
      javascript: code`
        function solve(input) {
          const lines = input.trim().split("\n");
          const jewels = new Set(lines[0].trim());
          let count = 0;
          for (const c of lines[1].trim()) if (jewels.has(c)) count++;
          return String(count);
        }
      `,
      python: code`
        def solve(input_str):
            lines = input_str.strip().split("\n")
            jewels = set(lines[0].strip())
            return str(sum(1 for c in lines[1].strip() if c in jewels))
      `,
    },
  },
  {
    title: "Logger Rate Limiter",
    difficulty: "Easy",
    companies: ["Google", "Bloomberg", "Twitter"],
    description:
      "Design a logger that receives a stream of `(timestamp, message)` pairs in non-decreasing timestamp order. A message may be printed only if it has **not been printed in the last 10 seconds**: a message printed at time `t` blocks the same message until time `t + 10` (so it can be printed again at exactly `t + 10`).\n\nFor each incoming pair, output `true` if it is printed and `false` if it is suppressed. A suppressed message does **not** reset the 10 second window.",
    constraints: "1 <= n <= 2 * 10^4\n0 <= timestamp <= 10^9, timestamps are non-decreasing\nMessages are non-empty strings without spaces.",
    inputFormat: "Line 1: the integer `n`.\nNext `n` lines: `timestamp message`.",
    outputFormat: "One line with `n` space-separated values, each `true` or `false`.",
    examples: [
      {
        input: "6\n1 foo\n2 bar\n3 foo\n8 bar\n10 foo\n11 foo",
        output: "true true false false false true",
        explanation: "foo prints at 1, is blocked until 11, so 3 and 10 are suppressed and 11 prints. bar prints at 2, so 8 is suppressed.",
      },
      { input: "3\n5 a\n5 a\n15 a", output: "true false true", explanation: "The repeat at time 5 is suppressed; at 15 (= 5 + 10) it prints again." },
    ],
    testCases: [
      { input: "6\n1 foo\n2 bar\n3 foo\n8 bar\n10 foo\n11 foo", expectedOutput: "true true false false false true", isHidden: false },
      { input: "3\n5 a\n5 a\n15 a", expectedOutput: "true false true", isHidden: false },
      { input: "1\n0 x", expectedOutput: "true", isHidden: true },
      { input: "4\n0 a\n9 a\n10 a\n19 a", expectedOutput: "true false true false", isHidden: true },
      { input: "5\n1 a\n2 b\n3 c\n4 d\n5 e", expectedOutput: "true true true true true", isHidden: true },
      { input: "5\n0 q\n10 q\n20 q\n30 q\n39 q", expectedOutput: "true true true true false", isHidden: true },
      { input: LOGGER_PERF, expectedOutput: LOGGER_PERF_EXPECTED, isHidden: true },
    ],
    hints: [
      "You only need to remember, per message, the last time it was actually printed.",
      "A hash map from message to last printed timestamp gives O(1) per query.",
      "Print (and update the map) only if the message is new or timestamp - last >= 10; never update on a suppressed message.",
    ],
    editorial:
      "Keep `lastPrinted[message]`. For each query, if the message is absent or `timestamp - lastPrinted >= 10`, record the timestamp and answer true; otherwise answer false without touching the map. Time O(1) per query, space O(distinct messages).",
    solutions: {
      javascript: code`
        function solve(input) {
          const lines = input.trim().split("\n");
          const n = parseInt(lines[0], 10);
          const last = new Map();
          const out = [];
          for (let i = 1; i <= n; i++) {
            const line = lines[i].trim();
            const sp = line.indexOf(" ");
            const t = parseInt(line.slice(0, sp), 10);
            const msg = line.slice(sp + 1);
            if (!last.has(msg) || t - last.get(msg) >= 10) {
              last.set(msg, t);
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
            lines = input_str.strip().split("\n")
            n = int(lines[0])
            last = {}
            out = []
            for i in range(1, n + 1):
                t_str, msg = lines[i].strip().split(" ", 1)
                t = int(t_str)
                if msg not in last or t - last[msg] >= 10:
                    last[msg] = t
                    out.append("true")
                else:
                    out.append("false")
            return " ".join(out)
      `,
    },
  },
  {
    title: "First Repeating Element",
    difficulty: "Easy",
    companies: ["Amazon", "Microsoft", "Zoho"],
    description:
      "Given an array of integers, find the **first repeating element**: among all values that occur at least twice, the one whose **first occurrence** has the smallest index.\n\nPrint that value, or `-1` if no value repeats.",
    constraints: "1 <= n <= 10^5\n-10^9 <= arr[i] <= 10^9",
    inputFormat: "One line of space-separated integers `arr`.",
    outputFormat: "The first repeating element, or `-1` if all elements are distinct.",
    examples: [
      { input: "10 5 3 4 3 5 6", output: "5", explanation: "Both 5 and 3 repeat, but 5 appears first (index 1 versus index 2)." },
      { input: "6 10 5 4 9 120", output: "-1", explanation: "All elements are distinct." },
    ],
    testCases: [
      { input: "10 5 3 4 3 5 6", expectedOutput: "5", isHidden: false },
      { input: "6 10 5 4 9 120", expectedOutput: "-1", isHidden: false },
      { input: "1", expectedOutput: "-1", isHidden: true },
      { input: "1 1", expectedOutput: "1", isHidden: true },
      { input: "-1 2 -1 2", expectedOutput: "-1", isHidden: true },
      { input: "7 7 7 7", expectedOutput: "7", isHidden: true },
      { input: "1 2 3 4 5 5 4", expectedOutput: "4", isHidden: true },
      { input: FIRST_REPEAT_PERF, expectedOutput: "__FIRST_REPEAT__", isHidden: true },
    ],
    hints: [
      "Comparing every pair of positions is O(n^2); use a hash map to do better.",
      "The answer is decided by the first occurrence, not by which duplicate shows up first while scanning.",
      "Count every value first, then scan left to right and return the first element whose count is at least 2.",
    ],
    editorial:
      "A single pass cannot tell which element is 'first repeating' by first occurrence (the second occurrence of a later element may be seen before the second occurrence of an earlier one). Count the frequency of each value in a hash map, then scan the array from the left and output the first value with frequency >= 2. Time O(n), space O(n).",
    solutions: {
      javascript: code`
        function solve(input) {
          const arr = input.trim().split(/\s+/).map(Number);
          const freq = new Map();
          for (const x of arr) freq.set(x, (freq.get(x) || 0) + 1);
          for (const x of arr) if (freq.get(x) > 1) return String(x);
          return "-1";
        }
      `,
      python: code`
        from collections import Counter

        def solve(input_str):
            arr = list(map(int, input_str.split()))
            freq = Counter(arr)
            for x in arr:
                if freq[x] > 1:
                    return str(x)
            return "-1"
      `,
    },
  },
  {
    title: "Most Common Word",
    difficulty: "Easy",
    companies: ["Amazon", "Bloomberg", "Microsoft"],
    description:
      "Given a paragraph of text and a list of banned words, print the most frequent word that is **not banned**.\n\nA word is a maximal run of English letters; every other character (spaces and the punctuation `! ? , ; .`) separates words. Comparison ignores case, and the answer is printed in lowercase. The input guarantees there is at least one non-banned word and that the answer is unique (no ties for the maximum).",
    constraints: "1 <= paragraph.length <= 2 * 10^5\nThe paragraph contains letters, spaces and the punctuation ! ? , ; .\nBanned words are lowercase letters; 1 to 100 banned words.\nThe most frequent non-banned word is unique.",
    inputFormat: "Line 1: the paragraph.\nLine 2: the banned words, space separated.",
    outputFormat: "The most frequent non-banned word in lowercase.",
    examples: [
      { input: "Bob hit a ball, the hit BALL flew far after it was hit.\nhit", output: "ball", explanation: "'hit' is banned; 'ball' appears twice (any case) and no other word does." },
      { input: "Hello hello HELLO world world\nhello", output: "world", explanation: "'hello' is banned, so 'world' wins with two occurrences." },
    ],
    testCases: [
      { input: "Bob hit a ball, the hit BALL flew far after it was hit.\nhit", expectedOutput: "ball", isHidden: false },
      { input: "Hello hello HELLO world world\nhello", expectedOutput: "world", isHidden: false },
      { input: "a b b\na", expectedOutput: "b", isHidden: true },
      { input: "stone,stone hero\nbob", expectedOutput: "stone", isHidden: true },
      { input: "x\ny", expectedOutput: "x", isHidden: true },
      { input: "Cat! cat? CAT; dog. Dog, bird\ncat", expectedOutput: "dog", isHidden: true },
      { input: "a, a, a, a, b,b,b,c, c\na b", expectedOutput: "c", isHidden: true },
      { input: COMMON_WORD_PERF, expectedOutput: "__COMMON__", isHidden: true },
    ],
    hints: [
      "First normalise: lowercase the text and split it on every non-letter character.",
      "Count the remaining words in a hash map, skipping the ones in a banned set.",
      "Scan the map for the entry with the largest count.",
    ],
    editorial:
      "Lowercase the paragraph and extract runs of letters (a regex `[a-z]+` or a manual scan). Put the banned words in a hash set, count every other word in a hash map, and return the word with the highest count. Time O(n), space O(distinct words).",
    solutions: {
      javascript: code`
        function solve(input) {
          const lines = input.split("\n");
          const text = lines[0].toLowerCase();
          const banned = new Set((lines[1] || "").trim().split(/\s+/).filter(Boolean));
          const count = new Map();
          for (const w of text.match(/[a-z]+/g) || []) {
            if (!banned.has(w)) count.set(w, (count.get(w) || 0) + 1);
          }
          let best = "";
          let bestCount = 0;
          for (const [w, c] of count) {
            if (c > bestCount) {
              best = w;
              bestCount = c;
            }
          }
          return best;
        }
      `,
      python: code`
        import re
        from collections import Counter

        def solve(input_str):
            lines = input_str.split("\n")
            text = lines[0].lower()
            banned = set(lines[1].split()) if len(lines) > 1 else set()
            count = Counter(w for w in re.findall(r"[a-z]+", text) if w not in banned)
            best, best_count = "", 0
            for w, c in count.items():
                if c > best_count:
                    best, best_count = w, c
            return best
      `,
    },
  },
  {
    title: "Count Pairs with Given Sum",
    difficulty: "Easy",
    companies: ["Amazon", "Zoho", "TCS"],
    description:
      "Given an array of integers `arr` and an integer `K`, count the pairs of **positions** `(i, j)` with `i < j` such that `arr[i] + arr[j] == K`.\n\nEqual values at different positions form different pairs, so `1 1 1 1` with `K = 2` has 6 pairs.",
    constraints: "1 <= n <= 10^5\n-10^9 <= arr[i], K <= 10^9\nThe answer can exceed 32 bits only when n is large; use 64-bit counters in typed languages.",
    inputFormat: "Line 1: space-separated integers `arr`.\nLine 2: the integer `K`.",
    outputFormat: "A single integer: the number of pairs.",
    examples: [
      { input: "1 5 7 1\n6", output: "2", explanation: "Positions (0,1) and (1,3) both give 1 + 5 = 6." },
      { input: "1 1 1 1\n2", output: "6", explanation: "Every pair of the four ones works: C(4,2) = 6." },
    ],
    testCases: [
      { input: "1 5 7 1\n6", expectedOutput: "2", isHidden: false },
      { input: "1 1 1 1\n2", expectedOutput: "6", isHidden: false },
      { input: "5\n10", expectedOutput: "0", isHidden: true },
      { input: "0 0 0\n0", expectedOutput: "3", isHidden: true },
      { input: "-3 3 -3 3\n0", expectedOutput: "4", isHidden: true },
      { input: "5 5\n10", expectedOutput: "1", isHidden: true },
      { input: "1 2 3\n100", expectedOutput: "0", isHidden: true },
      { input: PAIR_SUM_PERF_A, expectedOutput: "__PAIRS_A__", isHidden: true },
      { input: PAIR_SUM_PERF_B, expectedOutput: "__PAIRS_B__", isHidden: true },
    ],
    hints: [
      "Checking all pairs is O(n^2), too slow for n = 10^5.",
      "For each element x you need to know how many earlier elements equal K - x.",
      "Keep a frequency map; before inserting x, add freq[K - x] to the answer, then increment freq[x].",
    ],
    editorial:
      "Scan left to right with a hash map of how many times each value has been seen. For the current value x, every earlier occurrence of K - x forms a valid pair with it, so add freq[K - x] to the total and then record x. Because the lookup happens before the insert, an element never pairs with itself. Time O(n), space O(n).",
    solutions: {
      javascript: code`
        function solve(input) {
          const lines = input.trim().split("\n");
          const arr = lines[0].trim().split(/\s+/).map(Number);
          const k = Number(lines[1]);
          const freq = new Map();
          let total = 0;
          for (const x of arr) {
            total += freq.get(k - x) || 0;
            freq.set(x, (freq.get(x) || 0) + 1);
          }
          return String(total);
        }
      `,
      python: code`
        from collections import defaultdict

        def solve(input_str):
            lines = input_str.strip().split("\n")
            arr = list(map(int, lines[0].split()))
            k = int(lines[1])
            freq = defaultdict(int)
            total = 0
            for x in arr:
                total += freq[k - x]
                freq[x] += 1
            return str(total)
      `,
    },
  },
  {
    title: "Insert Delete GetRandom O(1)",
    difficulty: "Medium",
    companies: ["Amazon", "Google", "Uber", "Twitter"],
    description:
      "Design a set that supports `insert`, `remove` and random access in average O(1) time. The classic version returns a *random* element; so that answers are deterministic here, random access is replaced by `getAt i`, which returns the element stored at index `i` of the set's internal array.\n\nThe internal array behaves exactly like this:\n- `insert x`: if `x` is absent, append it to the end and answer `true`; otherwise answer `false`.\n- `remove x`: if `x` is present, move the **last** element of the array into the slot of `x`, shrink the array by one, and answer `true`; otherwise answer `false`.\n- `getAt i`: answer the value at index `i` (0-based). It is guaranteed that `0 <= i < size`.\n\nPrint the answer to every operation in order, space separated.",
    constraints: "1 <= q <= 2 * 10^5\n-10^9 <= x <= 10^9\ngetAt is only called with a valid index.",
    inputFormat: "Line 1: the integer `q`.\nNext `q` lines: one operation, `insert x`, `remove x` or `getAt i`.",
    outputFormat: "One line with `q` space-separated answers (`true`, `false`, or an integer for `getAt`).",
    examples: [
      {
        input: "8\ninsert 1\ninsert 2\ninsert 3\nremove 1\ngetAt 0\ngetAt 1\ninsert 2\nremove 5",
        output: "true true true true 3 2 false false",
        explanation: "After the three inserts the array is [1,2,3]. Removing 1 moves 3 into slot 0, giving [3,2]. getAt 0 is 3, getAt 1 is 2. Inserting 2 fails (present) and removing 5 fails (absent).",
      },
      { input: "4\ninsert 5\nremove 5\ninsert 7\ngetAt 0", output: "true true true 7", explanation: "The array goes [5] -> [] -> [7]." },
    ],
    testCases: [
      { input: "8\ninsert 1\ninsert 2\ninsert 3\nremove 1\ngetAt 0\ngetAt 1\ninsert 2\nremove 5", expectedOutput: "true true true true 3 2 false false", isHidden: false },
      { input: "4\ninsert 5\nremove 5\ninsert 7\ngetAt 0", expectedOutput: "true true true 7", isHidden: false },
      { input: "1\ninsert 4", expectedOutput: "true", isHidden: true },
      { input: "3\nremove 1\ninsert 1\nremove 1", expectedOutput: "false true true", isHidden: true },
      { input: "5\ninsert 1\ninsert 1\nremove 1\nremove 1\ninsert 1", expectedOutput: "true false true false true", isHidden: true },
      { input: "6\ninsert 10\ninsert 20\ninsert 30\nremove 10\ngetAt 0\ngetAt 1", expectedOutput: "true true true true 30 20", isHidden: true },
      { input: "7\ninsert 1\ninsert 2\ninsert 3\ninsert 4\nremove 2\nremove 4\ngetAt 1", expectedOutput: "true true true true true true 3", isHidden: true },
      { input: "4\ninsert -5\ninsert 0\nremove -5\ngetAt 0", expectedOutput: "true true true 0", isHidden: true },
      { input: RANDSET_PERF, expectedOutput: RANDSET_PERF_EXPECTED, isHidden: true },
    ],
    hints: [
      "A hash set alone cannot give index access; an array alone cannot find or delete a value quickly.",
      "Keep both: an array of values, and a hash map from value to its index in the array.",
      "To delete in O(1), copy the last array element into the deleted slot, update that element's index in the map, then pop the array.",
    ],
    editorial:
      "Store the values in a dynamic array `items` and a map `pos[value] = index`. `insert` appends and records the index. `remove` looks up the index i of x, overwrites items[i] with the last element (updating its entry in `pos`), pops the array and deletes x from `pos`. `getAt` is a plain array read (in the original problem you would pick a random index). All operations are O(1) average; space O(n). Be careful when x itself is the last element: update the map before deleting x.",
    solutions: {
      javascript: code`
        function solve(input) {
          const lines = input.trim().split("\n");
          const q = parseInt(lines[0], 10);
          const items = [];
          const pos = new Map();
          const out = [];
          for (let i = 1; i <= q; i++) {
            const parts = lines[i].trim().split(/\s+/);
            const x = Number(parts[1]);
            if (parts[0] === "insert") {
              if (pos.has(x)) {
                out.push("false");
              } else {
                pos.set(x, items.length);
                items.push(x);
                out.push("true");
              }
            } else if (parts[0] === "remove") {
              if (!pos.has(x)) {
                out.push("false");
              } else {
                const idx = pos.get(x);
                const last = items[items.length - 1];
                items[idx] = last;
                pos.set(last, idx);
                items.pop();
                pos.delete(x);
                out.push("true");
              }
            } else {
              out.push(String(items[x]));
            }
          }
          return out.join(" ");
        }
      `,
      python: code`
        def solve(input_str):
            lines = input_str.strip().split("\n")
            q = int(lines[0])
            items = []
            pos = {}
            out = []
            for i in range(1, q + 1):
                op, arg = lines[i].split()
                x = int(arg)
                if op == "insert":
                    if x in pos:
                        out.append("false")
                    else:
                        pos[x] = len(items)
                        items.append(x)
                        out.append("true")
                elif op == "remove":
                    if x not in pos:
                        out.append("false")
                    else:
                        idx = pos[x]
                        last = items[-1]
                        items[idx] = last
                        pos[last] = idx
                        items.pop()
                        del pos[x]
                        out.append("true")
                else:
                    out.append(str(items[x]))
            return " ".join(out)
      `,
    },
  },
  {
    title: "Time Based Key-Value Store",
    difficulty: "Medium",
    companies: ["Google", "Amazon", "Lyft", "Netflix"],
    description:
      "Design a key-value store that keeps every version of a value together with the timestamp at which it was set.\n\nOperations:\n- `set key value timestamp`: store `value` for `key` at `timestamp`. For each key, `set` timestamps are strictly increasing. No output.\n- `get key timestamp`: return the value stored for `key` with the **largest timestamp that is <= the query timestamp**. If the key has no such version, return `-1`.\n\nPrint the result of every `get`, one per line, in input order.",
    constraints: "1 <= q <= 2 * 10^5\n1 <= timestamp <= 10^9\nKeys and values are non-empty lowercase/alphanumeric strings without spaces.",
    inputFormat: "Line 1: the integer `q`.\nNext `q` lines: `set key value timestamp` or `get key timestamp`.",
    outputFormat: "One line per `get` operation (the value, or `-1`). Print nothing for `set`.",
    examples: [
      {
        input: "7\nset love high 10\nset love low 20\nget love 5\nget love 10\nget love 15\nget love 20\nget love 25",
        output: "-1\nhigh\nhigh\nlow\nlow",
        explanation: "Nothing is stored at or before time 5; time 10 and 15 see 'high'; time 20 and 25 see 'low'.",
      },
      {
        input: "6\nset a x 1\nget a 1\nset a y 3\nget a 2\nget a 3\nget b 3",
        output: "x\nx\ny\n-1",
        explanation: "At time 2 the latest version is still 'x'. Key b was never set.",
      },
    ],
    testCases: [
      { input: "7\nset love high 10\nset love low 20\nget love 5\nget love 10\nget love 15\nget love 20\nget love 25", expectedOutput: "-1\nhigh\nhigh\nlow\nlow", isHidden: false },
      { input: "6\nset a x 1\nget a 1\nset a y 3\nget a 2\nget a 3\nget b 3", expectedOutput: "x\nx\ny\n-1", isHidden: false },
      { input: "1\nget a 5", expectedOutput: "-1", isHidden: true },
      { input: "2\nset a x 5\nget a 4", expectedOutput: "-1", isHidden: true },
      { input: "6\nset a 1 1\nset b 2 1\nget a 1\nget b 1\nset a 9 2\nget a 1", expectedOutput: "1\n2\n1", isHidden: true },
      { input: "3\nset k v 1000000000\nget k 1000000000\nget k 999999999", expectedOutput: "v\n-1", isHidden: true },
      { input: "5\nset k a 1\nset k b 2\nset k c 3\nget k 100\nget k 2", expectedOutput: "c\nb", isHidden: true },
      { input: TIME_KV_PERF, expectedOutput: TIME_KV_PERF_EXPECTED, isHidden: true },
    ],
    hints: [
      "Group the versions by key: a hash map from key to a list of (timestamp, value).",
      "Because set timestamps increase per key, each list is already sorted by timestamp.",
      "For get, binary search the key's list for the last timestamp <= the query (an upper-bound search minus one).",
    ],
    editorial:
      "Keep `store[key] = (timestamps[], values[])`, appending on every `set` (timestamps are strictly increasing so the arrays stay sorted). For `get key t`, binary search the timestamp array for the rightmost entry <= t; return its value or `-1` if none. `set` is O(1), `get` is O(log m) where m is the number of versions of that key.",
    solutions: {
      javascript: code`
        function solve(input) {
          const lines = input.trim().split("\n");
          const q = parseInt(lines[0], 10);
          const store = new Map();
          const out = [];
          for (let i = 1; i <= q; i++) {
            const p = lines[i].trim().split(/\s+/);
            if (p[0] === "set") {
              if (!store.has(p[1])) store.set(p[1], { ts: [], vals: [] });
              const entry = store.get(p[1]);
              entry.ts.push(Number(p[3]));
              entry.vals.push(p[2]);
            } else {
              const entry = store.get(p[1]);
              const t = Number(p[2]);
              let answer = "-1";
              if (entry) {
                let lo = 0;
                let hi = entry.ts.length; // first index with ts > t
                while (lo < hi) {
                  const mid = (lo + hi) >> 1;
                  if (entry.ts[mid] <= t) lo = mid + 1;
                  else hi = mid;
                }
                if (lo > 0) answer = entry.vals[lo - 1];
              }
              out.push(answer);
            }
          }
          return out.join("\n");
        }
      `,
      python: code`
        from bisect import bisect_right

        def solve(input_str):
            lines = input_str.strip().split("\n")
            q = int(lines[0])
            store = {}
            out = []
            for i in range(1, q + 1):
                p = lines[i].split()
                if p[0] == "set":
                    ts, vals = store.setdefault(p[1], ([], []))
                    ts.append(int(p[3]))
                    vals.append(p[2])
                else:
                    answer = "-1"
                    if p[1] in store:
                        ts, vals = store[p[1]]
                        idx = bisect_right(ts, int(p[2]))
                        if idx > 0:
                            answer = vals[idx - 1]
                    out.append(answer)
            return "\n".join(out)
      `,
    },
  },
  // @@APPEND@@
];
