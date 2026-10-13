import { code, type ProblemSpec } from "../../problemHelpers";

/** Deterministic seeded PRNG (mulberry32) used to build the larger performance inputs below. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random palindrome over {a,b,c} of length n with a 'z' inserted at each given index (indices apply to the growing string, ascending). */
function palWithNoise(n: number, seed: number, zAt: number[]): string {
  const rand = rng(seed);
  let half = "";
  for (let i = 0; i < n / 2; i++) half += "abc"[Math.floor(rand() * 3)];
  let s = half + half.split("").reverse().join("");
  for (const at of [...zAt].sort((a, b) => b - a)) s = s.slice(0, at) + "z" + s.slice(at);
  return s;
}

export const REAL_STRINGS: ProblemSpec[] = [
  {
    title: "Roman to Integer",
    difficulty: "Easy",
    companies: ["Amazon", "Microsoft", "Bloomberg", "Apple", "Adobe"],
    description:
      "Roman numerals are written with the symbols `I=1, V=5, X=10, L=50, C=100, D=500, M=1000`. Symbols are normally written from largest to smallest, left to right, and their values are added. The exception is subtraction: a smaller symbol placed directly before a larger one is subtracted, which happens in exactly six patterns: `IV=4, IX=9, XL=40, XC=90, CD=400, CM=900`.\n\nGiven a valid Roman numeral, convert it to an integer.",
    constraints: "1 <= length <= 15\nThe string only contains the characters `I, V, X, L, C, D, M`.\nThe string is a valid Roman numeral in the range [1, 3999].",
    inputFormat: "A single line containing the Roman numeral.",
    outputFormat: "A single integer: the value of the numeral.",
    examples: [
      { input: "LVIII", output: "58", explanation: "L = 50, V = 5, III = 3." },
      { input: "MCMXCIV", output: "1994", explanation: "M = 1000, CM = 900, XC = 90, IV = 4." },
    ],
    testCases: [
      { input: "LVIII", expectedOutput: "58", isHidden: false },
      { input: "MCMXCIV", expectedOutput: "1994", isHidden: false },
      { input: "III", expectedOutput: "3", isHidden: true },
      { input: "IV", expectedOutput: "4", isHidden: true },
      { input: "IX", expectedOutput: "9", isHidden: true },
      { input: "MMMCMXCIX", expectedOutput: "3999", isHidden: true },
      { input: "XLII", expectedOutput: "42", isHidden: true },
      { input: "CDXLIV", expectedOutput: "444", isHidden: true },
      { input: "MMMDCCCLXXXVIII", expectedOutput: "3888", isHidden: true },
    ],
    hints: [
      "Map every symbol to its value. Most of the time you simply add the values from left to right.",
      "When is a symbol subtracted instead of added? Only when the symbol to its right is strictly larger.",
      "Scan once: if value[i] < value[i + 1] subtract value[i], otherwise add it.",
    ],
    editorial:
      "Build a lookup table of the seven symbol values and scan the string left to right. If the current symbol is smaller than the next one it belongs to a subtractive pair (IV, IX, XL, XC, CD, CM), so subtract it; otherwise add it. The last symbol is always added. Time O(n), space O(1).",
    solutions: {
      javascript: code`
        function solve(input) {
          const s = input.trim();
          const val = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
          let total = 0;
          for (let i = 0; i < s.length; i++) {
            const cur = val[s[i]];
            const next = i + 1 < s.length ? val[s[i + 1]] : 0;
            total += cur < next ? -cur : cur;
          }
          return String(total);
        }
      `,
      python: code`
        def solve(input_str):
            s = input_str.strip()
            val = {"I": 1, "V": 5, "X": 10, "L": 50, "C": 100, "D": 500, "M": 1000}
            total = 0
            for i, ch in enumerate(s):
                cur = val[ch]
                nxt = val[s[i + 1]] if i + 1 < len(s) else 0
                total += -cur if cur < nxt else cur
            return str(total)
      `,
    },
  },
  {
    title: "Find the Index of First Occurrence in a String",
    difficulty: "Easy",
    companies: ["Amazon", "Microsoft", "Google", "Apple", "Adobe"],
    description:
      "Given two strings `haystack` and `needle`, return the index of the first position in `haystack` where `needle` occurs as a contiguous substring, or `-1` if it never occurs.\n\nA naive scan can take O(n * m) time on inputs such as `aaaa...ab`. Aim for linear time with the KMP prefix function (or the Z-function).",
    constraints: "1 <= haystack.length <= 2 * 10^5\n1 <= needle.length <= 2 * 10^5\nBoth strings consist of lowercase English letters.",
    inputFormat: "Line 1: the string `haystack`.\nLine 2: the string `needle`.",
    outputFormat: "A single integer: the 0-based index of the first occurrence, or -1.",
    examples: [
      { input: "sadbutsad\nsad", output: "0", explanation: '"sad" occurs at index 0 (and 6); the first is 0.' },
      { input: "leetcode\nleeto", output: "-1", explanation: '"leeto" is not a substring of "leetcode".' },
    ],
    testCases: [
      { input: "sadbutsad\nsad", expectedOutput: "0", isHidden: false },
      { input: "leetcode\nleeto", expectedOutput: "-1", isHidden: false },
      { input: "hello\nll", expectedOutput: "2", isHidden: true },
      { input: "a\na", expectedOutput: "0", isHidden: true },
      { input: "mississippi\nissip", expectedOutput: "4", isHidden: true },
      { input: "abc\nabcd", expectedOutput: "-1", isHidden: true },
      { input: "aabaaabaaac\naabaaac", expectedOutput: "4", isHidden: true },
      { input: "aaaaa\nbba", expectedOutput: "-1", isHidden: true },
      { input: "a".repeat(199999) + "b" + "\n" + "a".repeat(1000) + "b", expectedOutput: "198999", isHidden: true },
    ],
    hints: [
      "Comparing needle at every start position is O(n * m) in the worst case. Where does that work get repeated?",
      "After a mismatch, the part of the needle that matched already tells you how far you can safely fall back: that is the longest proper prefix of the needle that is also a suffix of the matched part.",
      "Precompute that fallback table (the KMP prefix function) for the needle, then run a single pass over the haystack without ever moving backwards.",
    ],
    editorial:
      "Compute the prefix function pi of the needle (pi[i] = length of the longest proper border of needle[0..i]). Walk through the haystack keeping k = length of the currently matched needle prefix: while k > 0 and the characters differ, set k = pi[k - 1]; if they match, k++. When k reaches the needle length, the match starts at i - m + 1. Time O(n + m), space O(m).",
    solutions: {
      javascript: code`
        function solve(input) {
          const lines = input.trim().split("\n");
          const text = lines[0].trim();
          const pat = lines[1].trim();
          const m = pat.length;
          const pi = new Int32Array(m);
          for (let i = 1, k = 0; i < m; i++) {
            while (k > 0 && pat[i] !== pat[k]) k = pi[k - 1];
            if (pat[i] === pat[k]) k++;
            pi[i] = k;
          }
          for (let i = 0, k = 0; i < text.length; i++) {
            while (k > 0 && text[i] !== pat[k]) k = pi[k - 1];
            if (text[i] === pat[k]) k++;
            if (k === m) return String(i - m + 1);
          }
          return "-1";
        }
      `,
      python: code`
        def solve(input_str):
            lines = input_str.strip().split("\n")
            text = lines[0].strip()
            pat = lines[1].strip()
            m = len(pat)
            pi = [0] * m
            k = 0
            for i in range(1, m):
                while k > 0 and pat[i] != pat[k]:
                    k = pi[k - 1]
                if pat[i] == pat[k]:
                    k += 1
                pi[i] = k
            k = 0
            for i, ch in enumerate(text):
                while k > 0 and ch != pat[k]:
                    k = pi[k - 1]
                if ch == pat[k]:
                    k += 1
                if k == m:
                    return str(i - m + 1)
            return "-1"
      `,
    },
  },
  {
    title: "Add Binary",
    difficulty: "Easy",
    companies: ["Meta", "Amazon", "Microsoft", "Apple", "TCS"],
    description:
      "Given two binary strings `a` and `b`, return their sum as a binary string.\n\nThe numbers can be far larger than any built-in integer type, so add them digit by digit, the way you would on paper, carrying as you go. The result must not contain leading zeros unless it is exactly `0`.",
    constraints: "1 <= a.length, b.length <= 10^5\nEach string contains only `0` and `1`.\nNeither string has leading zeros, except for the string `0` itself.",
    inputFormat: "Line 1: binary string `a`.\nLine 2: binary string `b`.",
    outputFormat: "A single line: the binary sum of `a` and `b`.",
    examples: [
      { input: "11\n1", output: "100", explanation: "3 + 1 = 4 = 100 in binary." },
      { input: "1010\n1011", output: "10101", explanation: "10 + 11 = 21 = 10101 in binary." },
    ],
    testCases: [
      { input: "11\n1", expectedOutput: "100", isHidden: false },
      { input: "1010\n1011", expectedOutput: "10101", isHidden: false },
      { input: "0\n0", expectedOutput: "0", isHidden: true },
      { input: "1\n1", expectedOutput: "10", isHidden: true },
      { input: "1111\n1111", expectedOutput: "11110", isHidden: true },
      { input: "100\n110010", expectedOutput: "110110", isHidden: true },
      { input: "0\n1101", expectedOutput: "1101", isHidden: true },
      { input: "1".repeat(100000) + "\n1", expectedOutput: "1" + "0".repeat(100000), isHidden: true },
    ],
    hints: [
      "Process both strings from the least significant (rightmost) digit.",
      "At every position the column sum is bitA + bitB + carry; its low bit is the output digit and its high bit is the new carry.",
      "Keep going while either string has digits left or a carry remains, then reverse the collected digits.",
    ],
    editorial:
      "Walk two pointers from the ends of both strings, summing digit + digit + carry. Append sum % 2 to the result and set carry = floor(sum / 2). After both strings are exhausted, append a final carry if it is 1. The digits were produced least significant first, so reverse them. Time O(max(n, m)), space O(max(n, m)).",
    solutions: {
      javascript: code`
        function solve(input) {
          const lines = input.trim().split("\n");
          const a = lines[0].trim();
          const b = lines[1].trim();
          let i = a.length - 1;
          let j = b.length - 1;
          let carry = 0;
          const out = [];
          while (i >= 0 || j >= 0 || carry) {
            let sum = carry;
            if (i >= 0) sum += a.charCodeAt(i--) - 48;
            if (j >= 0) sum += b.charCodeAt(j--) - 48;
            out.push(sum & 1);
            carry = sum >> 1;
          }
          return out.reverse().join("");
        }
      `,
      python: code`
        def solve(input_str):
            lines = input_str.strip().split("\n")
            a = lines[0].strip()
            b = lines[1].strip()
            i, j, carry = len(a) - 1, len(b) - 1, 0
            out = []
            while i >= 0 or j >= 0 or carry:
                s = carry
                if i >= 0:
                    s += ord(a[i]) - 48
                    i -= 1
                if j >= 0:
                    s += ord(b[j]) - 48
                    j -= 1
                out.append(str(s & 1))
                carry = s >> 1
            return "".join(reversed(out))
      `,
    },
  },
  {
    title: "Count and Say",
    difficulty: "Easy",
    companies: ["Amazon", "Microsoft", "Meta", "Bloomberg"],
    description:
      'The "count-and-say" sequence is defined recursively: `countAndSay(1) = "1"`, and `countAndSay(n)` is obtained by reading `countAndSay(n - 1)` aloud. To read a digit string, split it into maximal groups of the same digit, and for each group say how many digits there are, followed by the digit itself, then concatenate everything.\n\nFor example, `"3322251"` is read as two 3s, three 2s, one 5, one 1, giving `"23321511"`.\n\nGiven `n`, return `countAndSay(n)`.',
    constraints: "1 <= n <= 30",
    inputFormat: "A single integer `n`.",
    outputFormat: "A single line: the n-th term of the sequence.",
    examples: [
      { input: "4", output: "1211", explanation: '1 -> "11" -> "21" -> "1211".' },
      { input: "6", output: "312211", explanation: '"111221" is one 3, one 2, two 1s -> "312211".' },
    ],
    testCases: [
      { input: "4", expectedOutput: "1211", isHidden: false },
      { input: "6", expectedOutput: "312211", isHidden: false },
      { input: "1", expectedOutput: "1", isHidden: true },
      { input: "2", expectedOutput: "11", isHidden: true },
      { input: "7", expectedOutput: "13112221", isHidden: true },
      { input: "10", expectedOutput: "13211311123113112211", isHidden: true },
      { input: "12", expectedOutput: "3113112221232112111312211312113211", isHidden: true },
      {
        input: "15",
        expectedOutput: "311311222113111231131112132112311321322112111312211312111322212311322113212221",
        isHidden: true,
      },
    ],
    hints: [
      "To compute term n you only need term n - 1, so build the terms iteratively from 1 up to n.",
      "Reading a string aloud means counting consecutive equal characters (run-length encoding).",
      "For each run, append the run length followed by the character; remember to flush the last run.",
    ],
    editorial:
      "Start with s = '1' and repeat n - 1 times: scan s, count each maximal run of equal digits, and append count + digit to a new string. The term length grows by about 30% per step, so for n <= 30 the result stays in the thousands of characters. Time is proportional to the sum of the term lengths.",
    solutions: {
      javascript: code`
        function solve(input) {
          const n = parseInt(input.trim(), 10);
          let s = "1";
          for (let step = 1; step < n; step++) {
            const parts = [];
            let i = 0;
            while (i < s.length) {
              let j = i;
              while (j < s.length && s[j] === s[i]) j++;
              parts.push(String(j - i), s[i]);
              i = j;
            }
            s = parts.join("");
          }
          return s;
        }
      `,
      python: code`
        def solve(input_str):
            n = int(input_str.strip())
            s = "1"
            for _ in range(n - 1):
                parts = []
                i = 0
                while i < len(s):
                    j = i
                    while j < len(s) and s[j] == s[i]:
                        j += 1
                    parts.append(str(j - i))
                    parts.append(s[i])
                    i = j
                s = "".join(parts)
            return s
      `,
    },
  },
  {
    title: "First Unique Character in a String",
    difficulty: "Easy",
    companies: ["Amazon", "Microsoft", "Bloomberg", "Google", "Adobe"],
    description:
      "Given a string `s`, find the first character that appears exactly once in the whole string and return its 0-based index. If every character repeats, return `-1`.",
    constraints: "1 <= s.length <= 10^5\n`s` consists of lowercase English letters.",
    inputFormat: "A single line containing the string `s`.",
    outputFormat: "A single integer: the index of the first non-repeating character, or -1.",
    examples: [
      { input: "leetcode", output: "0", explanation: "'l' appears once and is the leftmost such character." },
      { input: "loveleetcode", output: "2", explanation: "'l', 'o' repeat; 'v' at index 2 is the first with a single occurrence." },
    ],
    testCases: [
      { input: "leetcode", expectedOutput: "0", isHidden: false },
      { input: "loveleetcode", expectedOutput: "2", isHidden: false },
      { input: "aabb", expectedOutput: "-1", isHidden: true },
      { input: "z", expectedOutput: "0", isHidden: true },
      { input: "aadadaad", expectedOutput: "-1", isHidden: true },
      { input: "abcabcd", expectedOutput: "6", isHidden: true },
      { input: "dddccdbba", expectedOutput: "8", isHidden: true },
      { input: "ab".repeat(50000), expectedOutput: "-1", isHidden: true },
      { input: "ab".repeat(49999) + "ac", expectedOutput: "99999", isHidden: true },
    ],
    hints: [
      "You need to know, for each letter, how many times it occurs in the whole string.",
      "A table of 26 counters filled in one pass gives all frequencies.",
      "Make a second pass left to right and return the first index whose letter has count 1.",
    ],
    editorial:
      "Pass 1 counts occurrences of each letter in an array of 26 counters. Pass 2 scans the string from the left and returns the first index i with count[s[i]] == 1; if none exists return -1. Time O(n), space O(1) because the alphabet is fixed.",
    solutions: {
      javascript: code`
        function solve(input) {
          const s = input.trim();
          const count = new Array(26).fill(0);
          for (let i = 0; i < s.length; i++) count[s.charCodeAt(i) - 97]++;
          for (let i = 0; i < s.length; i++) {
            if (count[s.charCodeAt(i) - 97] === 1) return String(i);
          }
          return "-1";
        }
      `,
      python: code`
        def solve(input_str):
            s = input_str.strip()
            count = [0] * 26
            for ch in s:
                count[ord(ch) - 97] += 1
            for i, ch in enumerate(s):
                if count[ord(ch) - 97] == 1:
                    return str(i)
            return "-1"
      `,
    },
  },
  {
    title: "Valid Palindrome II",
    difficulty: "Easy",
    companies: ["Meta", "Microsoft", "Amazon", "Google"],
    description:
      "Given a string `s`, decide whether it can become a palindrome after deleting **at most one** character (the characters that remain keep their order).\n\nPrint `true` if it is possible and `false` otherwise.",
    constraints: "1 <= s.length <= 10^5\n`s` consists of lowercase English letters.",
    inputFormat: "A single line containing the string `s`.",
    outputFormat: "`true` or `false`.",
    examples: [
      { input: "abca", output: "true", explanation: "Delete 'c' (or 'b') to get \"aba\" (or \"aca\")." },
      { input: "abc", output: "false", explanation: "No single deletion produces a palindrome." },
    ],
    testCases: [
      { input: "abca", expectedOutput: "true", isHidden: false },
      { input: "abc", expectedOutput: "false", isHidden: false },
      { input: "aba", expectedOutput: "true", isHidden: true },
      { input: "a", expectedOutput: "true", isHidden: true },
      { input: "ab", expectedOutput: "true", isHidden: true },
      { input: "deeee", expectedOutput: "true", isHidden: true },
      { input: "abbca", expectedOutput: "true", isHidden: true },
      { input: "eedede", expectedOutput: "true", isHidden: true },
      { input: "abcdba", expectedOutput: "false", isHidden: true },
      {
        input: "cupuufxoohdfpgjdmysgvhmvffcnqxjjxqncffvmhvgsymdjgpfdhooxfuupucu",
        expectedOutput: "true",
        isHidden: true,
      },
      { input: palWithNoise(100000, 11, [30000]), expectedOutput: "true", isHidden: true },
      { input: palWithNoise(100000, 12, [5, 30000]), expectedOutput: "false", isHidden: true },
    ],
    hints: [
      "Start with the usual two pointers moving inward from both ends while the characters match.",
      "At the first mismatch you have exactly one chance: either drop the left character or drop the right character.",
      "After the first mismatch, check whether s[l+1..r] or s[l..r-1] is a palindrome with a plain two-pointer test. Total work stays O(n).",
    ],
    editorial:
      "Move l and r inward while s[l] == s[r]. On the first mismatch the deletion must be s[l] or s[r], so the answer is isPalindrome(s, l + 1, r) OR isPalindrome(s, l, r - 1). If no mismatch occurs the string is already a palindrome. Each check is linear, so the total time is O(n) and space O(1).",
    solutions: {
      javascript: code`
        function solve(input) {
          const s = input.trim();
          function isPal(l, r) {
            while (l < r) {
              if (s[l] !== s[r]) return false;
              l++;
              r--;
            }
            return true;
          }
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
                    return "true" if (is_pal(l + 1, r) or is_pal(l, r - 1)) else "false"
                l += 1
                r -= 1
            return "true"
      `,
    },
  },
  {
    title: "Check If One String Is a Rotation of Another",
    difficulty: "Easy",
    companies: ["Amazon", "Microsoft", "Zoho", "TCS", "Infosys"],
    description:
      "A rotation moves some number of characters from the front of a string to its back, keeping their order (for example `abcde` -> `cdeab`). Given strings `s` and `goal`, print `true` if `goal` can be obtained from `s` by some number of rotations (including zero) and `false` otherwise.\n\nThere is a one-line trick: all rotations of `s` appear as substrings of `s + s`. Make sure the substring search itself stays linear (KMP / Z-function) on adversarial inputs.",
    constraints: "1 <= s.length, goal.length <= 10^5\nBoth strings consist of lowercase English letters.",
    inputFormat: "Line 1: the string `s`.\nLine 2: the string `goal`.",
    outputFormat: "`true` or `false`.",
    examples: [
      { input: "abcde\ncdeab", output: "true", explanation: "Rotate \"abcde\" left by two positions." },
      { input: "abcde\nabced", output: "false", explanation: "\"abced\" is not a rotation of \"abcde\"." },
    ],
    testCases: [
      { input: "abcde\ncdeab", expectedOutput: "true", isHidden: false },
      { input: "abcde\nabced", expectedOutput: "false", isHidden: false },
      { input: "a\na", expectedOutput: "true", isHidden: true },
      { input: "ab\nabc", expectedOutput: "false", isHidden: true },
      { input: "abab\nbaba", expectedOutput: "true", isHidden: true },
      { input: "aab\nbaa", expectedOutput: "true", isHidden: true },
      { input: "aab\naba", expectedOutput: "true", isHidden: true },
      { input: "abc\nacb", expectedOutput: "false", isHidden: true },
      { input: "aaaaa\naaaab", expectedOutput: "false", isHidden: true },
      { input: "a".repeat(100000) + "b\nb" + "a".repeat(100000), expectedOutput: "true", isHidden: true },
      {
        input: "a".repeat(50000) + "bb" + "a".repeat(49999) + "\n" + "a".repeat(40000) + "b" + "a".repeat(59999) + "b",
        expectedOutput: "false",
        isHidden: true,
      },
    ],
    hints: [
      "If the lengths differ the answer is immediately false.",
      "Concatenate s with itself: every rotation of s is a contiguous window of s + s.",
      "So the question becomes 'is goal a substring of s + s?'. Use KMP (prefix function of goal) so the search is O(n) even on strings like aaaa...ab.",
    ],
    editorial:
      "Rotations of s are exactly the length-n windows of s + s. Reject if the lengths differ, then search goal inside s + s with the KMP automaton (prefix function of goal, one pass over the doubled text). Time O(n), space O(n).",
    solutions: {
      javascript: code`
        function solve(input) {
          const lines = input.trim().split("\n");
          const s = lines[0].trim();
          const goal = lines[1].trim();
          if (s.length !== goal.length) return "false";
          const m = goal.length;
          const pi = new Int32Array(m);
          for (let i = 1, k = 0; i < m; i++) {
            while (k > 0 && goal[i] !== goal[k]) k = pi[k - 1];
            if (goal[i] === goal[k]) k++;
            pi[i] = k;
          }
          const text = s + s;
          for (let i = 0, k = 0; i < text.length; i++) {
            while (k > 0 && text[i] !== goal[k]) k = pi[k - 1];
            if (text[i] === goal[k]) k++;
            if (k === m) return "true";
          }
          return "false";
        }
      `,
      python: code`
        def solve(input_str):
            lines = input_str.strip().split("\n")
            s = lines[0].strip()
            goal = lines[1].strip()
            if len(s) != len(goal):
                return "false"
            m = len(goal)
            pi = [0] * m
            k = 0
            for i in range(1, m):
                while k > 0 and goal[i] != goal[k]:
                    k = pi[k - 1]
                if goal[i] == goal[k]:
                    k += 1
                pi[i] = k
            text = s + s
            k = 0
            for ch in text:
                while k > 0 and ch != goal[k]:
                    k = pi[k - 1]
                if ch == goal[k]:
                    k += 1
                if k == m:
                    return "true"
            return "false"
      `,
    },
  },
  {
    title: "Excel Sheet Column Title",
    difficulty: "Easy",
    companies: ["Microsoft", "Amazon", "Meta", "Zoho"],
    description:
      "Spreadsheet columns are labelled `A, B, ..., Z, AA, AB, ..., AZ, BA, ..., ZZ, AAA, ...`. Given a positive integer `n`, print the label of the n-th column (column 1 is `A`).\n\nNote that this is not an ordinary base-26 conversion: there is no zero digit, so `Z` is followed directly by `AA`.",
    constraints: "1 <= n <= 2^31 - 1",
    inputFormat: "A single integer `n`.",
    outputFormat: "A single line: the column label in uppercase letters.",
    examples: [
      { input: "28", output: "AB", explanation: "26 columns A..Z, then AA = 27, AB = 28." },
      { input: "701", output: "ZY", explanation: "26 * 26 + 25 = 701." },
    ],
    testCases: [
      { input: "28", expectedOutput: "AB", isHidden: false },
      { input: "701", expectedOutput: "ZY", isHidden: false },
      { input: "1", expectedOutput: "A", isHidden: true },
      { input: "26", expectedOutput: "Z", isHidden: true },
      { input: "27", expectedOutput: "AA", isHidden: true },
      { input: "52", expectedOutput: "AZ", isHidden: true },
      { input: "702", expectedOutput: "ZZ", isHidden: true },
      { input: "703", expectedOutput: "AAA", isHidden: true },
      { input: "18278", expectedOutput: "ZZZ", isHidden: true },
      { input: "2147483647", expectedOutput: "FXSHRXW", isHidden: true },
    ],
    hints: [
      "Think of letters as digits 1..26 instead of 0..25. The last letter is determined by n modulo 26.",
      "Because digits start at 1, subtract 1 from n before taking the remainder: letter = 'A' + (n - 1) % 26.",
      "Then replace n by (n - 1) / 26 and repeat until n becomes 0; the letters come out from last to first.",
    ],
    editorial:
      "This is bijective base-26 numeration. Repeatedly do n -= 1, take n % 26 as the next letter (A = 0), and set n = floor(n / 26). The letters are produced least significant first, so reverse them at the end. Time O(log26 n), space O(log26 n).",
    solutions: {
      javascript: code`
        function solve(input) {
          let n = parseInt(input.trim(), 10);
          const out = [];
          while (n > 0) {
            n -= 1;
            out.push(String.fromCharCode(65 + (n % 26)));
            n = Math.floor(n / 26);
          }
          return out.reverse().join("");
        }
      `,
      python: code`
        def solve(input_str):
            n = int(input_str.strip())
            out = []
            while n > 0:
                n -= 1
                out.append(chr(65 + n % 26))
                n //= 26
            return "".join(reversed(out))
      `,
    },
  },
  // __APPEND__
];
