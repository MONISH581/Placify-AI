/**
 * Curated problem bank used by `npm run seed`.
 *
 * Every problem uses the stdin/stdout harness contract: `solve(input)` receives the raw input text and
 * returns the expected output text. Each problem has >= 3 test cases including >= 1 hidden case, and real
 * JavaScript + Python reference solutions (verified by tests/api.test.ts through the code runner).
 */

export type Difficulty = "Easy" | "Medium" | "Hard";

export interface SeedTestCase {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

export interface SeedProblem {
  id: string;
  title: string;
  difficulty: Difficulty;
  category: string;
  tags: string[];
  description: string;
  constraints: string;
  inputFormat: string;
  outputFormat: string;
  examples: { input: string; output: string; explanation?: string }[];
  testCases: SeedTestCase[];
  hints: string[];
  editorial: string;
  solutions: { javascript: string; python: string; java: string; cpp: string; c: string };
}

export const COMPANIES = [
  "Google", "Microsoft", "Amazon", "Meta", "Netflix", "Apple", "Uber", "Lyft",
  "Airbnb", "Adobe", "Twitter", "Salesforce", "Bloomberg", "Atlassian", "ByteDance",
  "Oracle", "Intel", "Cisco", "Stripe", "Square", "PayPal", "Goldman Sachs",
];

export const CATEGORY_NAMES: Record<string, string> = {
  arrays: "Arrays",
  strings: "Strings",
  linkedLists: "Linked Lists",
  stacks: "Stacks",
  queues: "Queues",
  hashing: "Hashing",
  trees: "Trees",
};

/** Neutral starter stubs (never contain an answer). */
export const STARTER_CODE = {
  javascript: 'function solve(input) {\n  // your code here\n  return "";\n}\n',
  python: 'def solve(input_str):\n    # your code here\n    return ""\n',
  java: 'import java.util.*;\n\npublic class Solution {\n    public static String solve(String input) {\n        // your code here\n        return "";\n    }\n}\n',
  cpp: '#include <bits/stdc++.h>\nusing namespace std;\n\nstring solve(string input) {\n    // your code here\n    return "";\n}\n',
  c: '#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n\nchar* solve(char* input) {\n    // your code here\n    return "";\n}\n',
};

/** Removes the common indentation of a template literal and the surrounding blank lines. */
function dedent(text: string): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.length - l.trimStart().length));
  return lines.map((l) => l.slice(indent)).join("\n") + "\n";
}

/**
 * Tag for source-code blocks: keeps backslashes verbatim (String.raw semantics) and dedents the literal
 * text BEFORE interpolating shared snippets, so multi-line snippets (e.g. Python helpers) keep valid indentation.
 */
const code = (strings: TemplateStringsArray, ...values: unknown[]) => {
  const PLACEHOLDER = "\u0000";
  let index = 0;
  return dedent(strings.raw.join(PLACEHOLDER)).replace(/\u0000/g, () => String(values[index++]));
};

// Deterministic company tags: FNV-1a hash of the id seeds a small PRNG (stable across seeds and machines).
function fnv1a(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function companyTagsFor(problemId: string): string[] {
  const rand = mulberry32(fnv1a(problemId));
  const pool = [...COMPANIES];
  const count = 1 + Math.floor(rand() * 3);
  const picked: string[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(rand() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

type ProblemSpec = Omit<SeedProblem, "id" | "category" | "tags" | "solutions"> & {
  solutions: { javascript: string; python: string; java?: string; cpp?: string; c?: string };
};

// ---------------------------------------------------------------------------------------------
// Shared snippets
// ---------------------------------------------------------------------------------------------

const JS_BUILD_TREE = `function buildTree(tokens) {
  if (!tokens.length || tokens[0] === "null") return null;
  const root = { val: Number(tokens[0]), left: null, right: null };
  const queue = [root];
  let qi = 0;
  let i = 1;
  while (qi < queue.length && i < tokens.length) {
    const node = queue[qi++];
    if (i < tokens.length && tokens[i] !== "null") {
      node.left = { val: Number(tokens[i]), left: null, right: null };
      queue.push(node.left);
    }
    i++;
    if (i < tokens.length && tokens[i] !== "null") {
      node.right = { val: Number(tokens[i]), left: null, right: null };
      queue.push(node.right);
    }
    i++;
  }
  return root;
}`;

const PY_BUILD_TREE = `class TreeNode:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None


def build_tree(tokens):
    if not tokens or tokens[0] == "null":
        return None
    root = TreeNode(int(tokens[0]))
    queue = [root]
    qi, i = 0, 1
    while qi < len(queue) and i < len(tokens):
        node = queue[qi]
        qi += 1
        if i < len(tokens) and tokens[i] != "null":
            node.left = TreeNode(int(tokens[i]))
            queue.append(node.left)
        i += 1
        if i < len(tokens) and tokens[i] != "null":
            node.right = TreeNode(int(tokens[i]))
            queue.append(node.right)
        i += 1
    return root`;

const TREE_INPUT_NOTE =
  "Trees are given in level order (like LeetCode): values separated by spaces, with `null` marking a missing child.";

// ---------------------------------------------------------------------------------------------
// Problem specs by category
// ---------------------------------------------------------------------------------------------

const specs: Record<string, ProblemSpec[]> = {
  arrays: [
    {
      title: "Two Sum",
      difficulty: "Easy",
      description:
        "Given an array of integers `nums` and an integer `target`, return the indices of the two numbers that add up to `target`.\n\nEach input has exactly one solution, and you may not use the same element twice. Print the smaller index first.",
      constraints: "2 <= nums.length <= 10^5\n-10^9 <= nums[i], target <= 10^9\nExactly one valid answer exists.",
      inputFormat: "Line 1: space-separated integers `nums`.\nLine 2: the integer `target`.",
      outputFormat: "Two space-separated indices `i j` with i < j.",
      examples: [{ input: "2 7 11 15\n9", output: "0 1", explanation: "nums[0] + nums[1] = 2 + 7 = 9." }],
      testCases: [
        { input: "2 7 11 15\n9", expectedOutput: "0 1", isHidden: false },
        { input: "3 2 4\n6", expectedOutput: "1 2", isHidden: false },
        { input: "3 3\n6", expectedOutput: "0 1", isHidden: true },
        { input: "-1 -2 -3 -4 -5\n-8", expectedOutput: "2 4", isHidden: true },
      ],
      hints: [
        "For each number, the partner you need is target - nums[i].",
        "A hash map from value to index answers 'have I seen the partner?' in O(1).",
        "Check for the partner before inserting the current number so an element is never paired with itself.",
      ],
      editorial:
        "Scan the array once while storing each value's index in a hash map. For nums[i], if target - nums[i] is already in the map, the answer is (map[target - nums[i]], i). Time O(n), space O(n).",
      solutions: {
        javascript: code`
          function solve(input) {
            const lines = input.trim().split("\n");
            const nums = lines[0].trim().split(/\s+/).map(Number);
            const target = Number(lines[1]);
            const seen = new Map();
            for (let i = 0; i < nums.length; i++) {
              const need = target - nums[i];
              if (seen.has(need)) return seen.get(need) + " " + i;
              seen.set(nums[i], i);
            }
            return "";
          }
        `,
        python: code`
          def solve(input_str):
              lines = input_str.strip().split("\n")
              nums = list(map(int, lines[0].split()))
              target = int(lines[1])
              seen = {}
              for i, num in enumerate(nums):
                  need = target - num
                  if need in seen:
                      return f"{seen[need]} {i}"
                  seen[num] = i
              return ""
        `,
        java: code`
          import java.util.*;

          public class Solution {
              public static String solve(String input) {
                  String[] lines = input.trim().split("\n");
                  String[] parts = lines[0].trim().split("\\s+");
                  int target = Integer.parseInt(lines[1].trim());
                  Map<Integer, Integer> seen = new HashMap<>();
                  for (int i = 0; i < parts.length; i++) {
                      int num = Integer.parseInt(parts[i]);
                      if (seen.containsKey(target - num)) return seen.get(target - num) + " " + i;
                      seen.put(num, i);
                  }
                  return "";
              }
          }
        `,
      },
    },
    {
      title: "Best Time to Buy and Sell Stock",
      difficulty: "Easy",
      description:
        "You are given an array `prices` where `prices[i]` is the price of a stock on day `i`. Choose one day to buy and a later day to sell to maximise profit.\n\nReturn the maximum profit, or `0` if no profit is possible.",
      constraints: "1 <= prices.length <= 10^5\n0 <= prices[i] <= 10^4",
      inputFormat: "One line of space-separated integers `prices`.",
      outputFormat: "The maximum profit as an integer.",
      examples: [{ input: "7 1 5 3 6 4", output: "5", explanation: "Buy at 1 (day 1) and sell at 6 (day 4)." }],
      testCases: [
        { input: "7 1 5 3 6 4", expectedOutput: "5", isHidden: false },
        { input: "7 6 4 3 1", expectedOutput: "0", isHidden: false },
        { input: "2 4 1", expectedOutput: "2", isHidden: true },
        { input: "3 2 6 5 0 3", expectedOutput: "4", isHidden: true },
        { input: "1", expectedOutput: "0", isHidden: true },
      ],
      hints: [
        "The best sell day for a buy day is any later day with a higher price.",
        "Track the minimum price seen so far while scanning left to right.",
        "At each day, the best profit selling today is price - minSoFar.",
      ],
      editorial:
        "Keep the running minimum price and the best profit. For each price, update best = max(best, price - minPrice) and then minPrice = min(minPrice, price). Time O(n), space O(1).",
      solutions: {
        javascript: code`
          function solve(input) {
            const prices = input.trim().split(/\s+/).map(Number);
            let minPrice = Infinity;
            let best = 0;
            for (const price of prices) {
              minPrice = Math.min(minPrice, price);
              best = Math.max(best, price - minPrice);
            }
            return String(best);
          }
        `,
        python: code`
          def solve(input_str):
              prices = list(map(int, input_str.split()))
              min_price = float("inf")
              best = 0
              for price in prices:
                  min_price = min(min_price, price)
                  best = max(best, price - min_price)
              return str(best)
        `,
        java: code`
          public class Solution {
              public static String solve(String input) {
                  String[] parts = input.trim().split("\\s+");
                  int minPrice = Integer.MAX_VALUE, best = 0;
                  for (String part : parts) {
                      int price = Integer.parseInt(part);
                      minPrice = Math.min(minPrice, price);
                      best = Math.max(best, price - minPrice);
                  }
                  return String.valueOf(best);
              }
          }
        `,
      },
    },
    {
      title: "3Sum",
      difficulty: "Medium",
      description:
        "Given an integer array `nums`, find all unique triplets `[a, b, c]` such that `a + b + c = 0`.\n\nPrint each triplet in ascending order on its own line, with the triplets sorted lexicographically. Print `NONE` if no triplet exists.",
      constraints: "3 <= nums.length <= 3000\n-10^5 <= nums[i] <= 10^5",
      inputFormat: "One line of space-separated integers `nums`.",
      outputFormat: "One triplet per line (three space-separated integers, ascending), sorted; or `NONE`.",
      examples: [{ input: "-1 0 1 2 -1 -4", output: "-1 -1 2\n-1 0 1" }],
      testCases: [
        { input: "-1 0 1 2 -1 -4", expectedOutput: "-1 -1 2\n-1 0 1", isHidden: false },
        { input: "0 1 1", expectedOutput: "NONE", isHidden: false },
        { input: "0 0 0 0", expectedOutput: "0 0 0", isHidden: true },
        { input: "-2 0 1 1 2", expectedOutput: "-2 0 2\n-2 1 1", isHidden: true },
      ],
      hints: [
        "Sort the array first; duplicates become adjacent.",
        "Fix the first element, then find pairs with two pointers moving inward.",
        "Skip equal values for the fixed element and after each match to avoid duplicate triplets.",
      ],
      editorial:
        "Sort, then for each index i (skipping duplicates) run a two-pointer search on the suffix for pairs summing to -nums[i]. Sorting makes the output order lexicographic automatically. Time O(n^2), space O(1) extra.",
      solutions: {
        javascript: code`
          function solve(input) {
            const nums = input.trim().split(/\s+/).map(Number).sort((a, b) => a - b);
            const result = [];
            for (let i = 0; i < nums.length - 2; i++) {
              if (i > 0 && nums[i] === nums[i - 1]) continue;
              let lo = i + 1;
              let hi = nums.length - 1;
              while (lo < hi) {
                const sum = nums[i] + nums[lo] + nums[hi];
                if (sum === 0) {
                  result.push(nums[i] + " " + nums[lo] + " " + nums[hi]);
                  while (lo < hi && nums[lo] === nums[lo + 1]) lo++;
                  while (lo < hi && nums[hi] === nums[hi - 1]) hi--;
                  lo++;
                  hi--;
                } else if (sum < 0) {
                  lo++;
                } else {
                  hi--;
                }
              }
            }
            return result.length ? result.join("\n") : "NONE";
          }
        `,
        python: code`
          def solve(input_str):
              nums = sorted(map(int, input_str.split()))
              result = []
              n = len(nums)
              for i in range(n - 2):
                  if i > 0 and nums[i] == nums[i - 1]:
                      continue
                  lo, hi = i + 1, n - 1
                  while lo < hi:
                      total = nums[i] + nums[lo] + nums[hi]
                      if total == 0:
                          result.append(f"{nums[i]} {nums[lo]} {nums[hi]}")
                          while lo < hi and nums[lo] == nums[lo + 1]:
                              lo += 1
                          while lo < hi and nums[hi] == nums[hi - 1]:
                              hi -= 1
                          lo += 1
                          hi -= 1
                      elif total < 0:
                          lo += 1
                      else:
                          hi -= 1
              return "\n".join(result) if result else "NONE"
        `,
      },
    },
  ],
  strings: [
    {
      title: "Valid Palindrome",
      difficulty: "Easy",
      description:
        "A phrase is a palindrome if, after converting all uppercase letters to lowercase and removing all non-alphanumeric characters, it reads the same forward and backward.\n\nGiven a string `s`, print `true` if it is a palindrome and `false` otherwise.",
      constraints: "1 <= s.length <= 2 * 10^5\ns consists of printable ASCII characters.",
      inputFormat: "One line containing the string `s`.",
      outputFormat: "`true` or `false`.",
      examples: [{ input: "A man, a plan, a canal: Panama", output: "true", explanation: '"amanaplanacanalpanama" is a palindrome.' }],
      testCases: [
        { input: "A man, a plan, a canal: Panama", expectedOutput: "true", isHidden: false },
        { input: "race a car", expectedOutput: "false", isHidden: false },
        { input: "0P", expectedOutput: "false", isHidden: true },
        { input: "Was it a car or a cat I saw?", expectedOutput: "true", isHidden: true },
      ],
      hints: [
        "Only letters and digits matter, and case does not.",
        "Use two pointers starting at both ends of the string.",
        "Skip non-alphanumeric characters before comparing.",
      ],
      editorial:
        "Move two pointers inward, skipping characters that are not letters or digits, and compare lower-cased characters. Time O(n), space O(1).",
      solutions: {
        javascript: code`
          function solve(input) {
            const s = input.toLowerCase().replace(/[^a-z0-9]/g, "");
            let i = 0;
            let j = s.length - 1;
            while (i < j) {
              if (s[i] !== s[j]) return "false";
              i++;
              j--;
            }
            return "true";
          }
        `,
        python: code`
          def solve(input_str):
              s = [c.lower() for c in input_str if c.isascii() and c.isalnum()]
              i, j = 0, len(s) - 1
              while i < j:
                  if s[i] != s[j]:
                      return "false"
                  i += 1
                  j -= 1
              return "true"
        `,
      },
    },
    {
      title: "Valid Anagram",
      difficulty: "Easy",
      description:
        "Given two strings `s` and `t`, print `true` if `t` is an anagram of `s` (uses exactly the same characters with the same counts), and `false` otherwise.",
      constraints: "1 <= s.length, t.length <= 5 * 10^4\ns and t consist of lowercase English letters.",
      inputFormat: "Line 1: string `s`.\nLine 2: string `t`.",
      outputFormat: "`true` or `false`.",
      examples: [{ input: "anagram\nnagaram", output: "true" }],
      testCases: [
        { input: "anagram\nnagaram", expectedOutput: "true", isHidden: false },
        { input: "rat\ncar", expectedOutput: "false", isHidden: false },
        { input: "a\nab", expectedOutput: "false", isHidden: true },
        { input: "listen\nsilent", expectedOutput: "true", isHidden: true },
      ],
      hints: [
        "Different lengths can never be anagrams.",
        "Count how many times each character appears in s.",
        "Decrement the counts with t; any negative count means false.",
      ],
      editorial: "Compare character frequency counts (a 26-entry array or a hash map). Time O(n), space O(1) for a fixed alphabet.",
      solutions: {
        javascript: code`
          function solve(input) {
            const lines = input.split("\n").map((line) => line.trim());
            const s = lines[0] || "";
            const t = lines[1] || "";
            if (s.length !== t.length) return "false";
            const counts = new Map();
            for (const ch of s) counts.set(ch, (counts.get(ch) || 0) + 1);
            for (const ch of t) {
              const left = (counts.get(ch) || 0) - 1;
              if (left < 0) return "false";
              counts.set(ch, left);
            }
            return "true";
          }
        `,
        python: code`
          from collections import Counter


          def solve(input_str):
              lines = [line.strip() for line in input_str.split("\n")]
              s = lines[0] if len(lines) > 0 else ""
              t = lines[1] if len(lines) > 1 else ""
              return "true" if Counter(s) == Counter(t) else "false"
        `,
      },
    },
    {
      title: "Longest Substring Without Repeating Characters",
      difficulty: "Medium",
      description: "Given a string `s`, find the length of the longest substring that contains no repeated characters.",
      constraints: "1 <= s.length <= 5 * 10^4\ns consists of English letters, digits and symbols.",
      inputFormat: "One line containing the string `s`.",
      outputFormat: "The length of the longest substring without repeating characters.",
      examples: [{ input: "abcabcbb", output: "3", explanation: 'The answer is "abc", with length 3.' }],
      testCases: [
        { input: "abcabcbb", expectedOutput: "3", isHidden: false },
        { input: "bbbbb", expectedOutput: "1", isHidden: false },
        { input: "pwwkew", expectedOutput: "3", isHidden: true },
        { input: "dvdf", expectedOutput: "3", isHidden: true },
      ],
      hints: [
        "Think of a window [start, i] that never contains a duplicate.",
        "Remember the last index where each character appeared.",
        "When s[i] was seen inside the window, move start just past its previous index.",
      ],
      editorial:
        "Sliding window with a map of last positions: when the current character was last seen at index >= start, jump start to lastIndex + 1. Track the maximum window length. Time O(n).",
      solutions: {
        javascript: code`
          function solve(input) {
            const s = input.replace(/[\r\n]+$/, "");
            const last = new Map();
            let start = 0;
            let best = 0;
            for (let i = 0; i < s.length; i++) {
              const ch = s[i];
              if (last.has(ch) && last.get(ch) >= start) start = last.get(ch) + 1;
              last.set(ch, i);
              best = Math.max(best, i - start + 1);
            }
            return String(best);
          }
        `,
        python: code`
          def solve(input_str):
              s = input_str.rstrip("\r\n")
              last = {}
              start = 0
              best = 0
              for i, ch in enumerate(s):
                  if ch in last and last[ch] >= start:
                      start = last[ch] + 1
                  last[ch] = i
                  best = max(best, i - start + 1)
              return str(best)
        `,
      },
    },
  ],
  linkedLists: [
    {
      title: "Reverse Linked List",
      difficulty: "Easy",
      description:
        "Given the values of a singly linked list, reverse the list and print the values of the reversed list.\n\nTry to reverse the node pointers in place rather than just reversing an array.",
      constraints: "1 <= number of nodes <= 5000\n-5000 <= Node.val <= 5000",
      inputFormat: "One line of space-separated node values, head first.",
      outputFormat: "Space-separated values of the reversed list.",
      examples: [{ input: "1 2 3 4 5", output: "5 4 3 2 1" }],
      testCases: [
        { input: "1 2 3 4 5", expectedOutput: "5 4 3 2 1", isHidden: false },
        { input: "1 2", expectedOutput: "2 1", isHidden: false },
        { input: "7", expectedOutput: "7", isHidden: true },
        { input: "-3 0 -3 8", expectedOutput: "8 -3 0 -3", isHidden: true },
      ],
      hints: [
        "Walk the list once, keeping a pointer to the previous node.",
        "Before re-pointing node.next, save the original next node.",
        "When the walk ends, the previous pointer is the new head.",
      ],
      editorial: "Iterative reversal: for each node, set node.next = prev, then advance prev and node. Time O(n), space O(1).",
      solutions: {
        javascript: code`
          function solve(input) {
            const values = input.trim().split(/\s+/).filter(Boolean);
            let head = null;
            for (let i = values.length - 1; i >= 0; i--) head = { val: values[i], next: head };
            let prev = null;
            while (head) {
              const next = head.next;
              head.next = prev;
              prev = head;
              head = next;
            }
            const out = [];
            for (let node = prev; node; node = node.next) out.push(node.val);
            return out.join(" ");
          }
        `,
        python: code`
          class ListNode:
              def __init__(self, val, next=None):
                  self.val = val
                  self.next = next


          def solve(input_str):
              head = None
              for value in reversed(input_str.split()):
                  head = ListNode(value, head)
              prev = None
              while head:
                  nxt = head.next
                  head.next = prev
                  prev = head
                  head = nxt
              out = []
              while prev:
                  out.append(prev.val)
                  prev = prev.next
              return " ".join(out)
        `,
      },
    },
    {
      title: "Merge Two Sorted Lists",
      difficulty: "Easy",
      description: "You are given two sorted linked lists. Merge them into one sorted list by splicing their nodes together and print the merged values.",
      constraints: "1 <= length of each list <= 50\n-100 <= Node.val <= 100\nBoth lists are sorted in non-decreasing order.",
      inputFormat: "Line 1: space-separated values of list 1.\nLine 2: space-separated values of list 2.",
      outputFormat: "Space-separated values of the merged sorted list.",
      examples: [{ input: "1 2 4\n1 3 4", output: "1 1 2 3 4 4" }],
      testCases: [
        { input: "1 2 4\n1 3 4", expectedOutput: "1 1 2 3 4 4", isHidden: false },
        { input: "5\n1 2 3", expectedOutput: "1 2 3 5", isHidden: false },
        { input: "-3 0 7\n-5 -3 8 9", expectedOutput: "-5 -3 -3 0 7 8 9", isHidden: true },
      ],
      hints: [
        "Compare the current heads of both lists.",
        "Append the smaller node and advance only that list.",
        "When one list runs out, append the rest of the other.",
      ],
      editorial: "Classic two-pointer merge using a dummy head node. Time O(n + m), space O(1) extra.",
      solutions: {
        javascript: code`
          function solve(input) {
            const lines = input.trim().split("\n");
            const a = lines[0].trim().split(/\s+/).map(Number);
            const b = (lines[1] || "").trim().split(/\s+/).filter(Boolean).map(Number);
            const merged = [];
            let i = 0;
            let j = 0;
            while (i < a.length && j < b.length) {
              if (a[i] <= b[j]) merged.push(a[i++]);
              else merged.push(b[j++]);
            }
            while (i < a.length) merged.push(a[i++]);
            while (j < b.length) merged.push(b[j++]);
            return merged.join(" ");
          }
        `,
        python: code`
          def solve(input_str):
              lines = input_str.strip().split("\n")
              a = list(map(int, lines[0].split()))
              b = list(map(int, lines[1].split())) if len(lines) > 1 else []
              merged = []
              i = j = 0
              while i < len(a) and j < len(b):
                  if a[i] <= b[j]:
                      merged.append(a[i])
                      i += 1
                  else:
                      merged.append(b[j])
                      j += 1
              merged.extend(a[i:])
              merged.extend(b[j:])
              return " ".join(map(str, merged))
        `,
      },
    },
    {
      title: "Add Two Numbers",
      difficulty: "Medium",
      description:
        "Two non-negative integers are stored as linked lists of digits in reverse order (the head is the ones digit). Add the two numbers and print the sum as digits in the same reverse order.",
      constraints: "1 <= number of digits <= 100\nNo leading zeros except the number 0 itself.",
      inputFormat: "Line 1: space-separated digits of the first number (reverse order).\nLine 2: space-separated digits of the second number (reverse order).",
      outputFormat: "Space-separated digits of the sum (reverse order).",
      examples: [{ input: "2 4 3\n5 6 4", output: "7 0 8", explanation: "342 + 465 = 807." }],
      testCases: [
        { input: "2 4 3\n5 6 4", expectedOutput: "7 0 8", isHidden: false },
        { input: "0\n0", expectedOutput: "0", isHidden: false },
        { input: "9 9 9 9 9 9 9\n9 9 9 9", expectedOutput: "8 9 9 9 0 0 0 1", isHidden: true },
        { input: "5\n5", expectedOutput: "0 1", isHidden: true },
      ],
      hints: [
        "Add digit by digit from the head, exactly like manual addition.",
        "Carry = floor(sum / 10); the digit written is sum % 10.",
        "Do not forget a final carry after both lists end.",
      ],
      editorial: "Traverse both lists simultaneously, adding digits plus carry and emitting sum % 10. Time O(max(n, m)).",
      solutions: {
        javascript: code`
          function solve(input) {
            const lines = input.trim().split("\n");
            const a = lines[0].trim().split(/\s+/).map(Number);
            const b = lines[1].trim().split(/\s+/).map(Number);
            const out = [];
            let carry = 0;
            for (let i = 0; i < a.length || i < b.length || carry; i++) {
              const sum = (a[i] || 0) + (b[i] || 0) + carry;
              out.push(sum % 10);
              carry = Math.floor(sum / 10);
            }
            return out.join(" ");
          }
        `,
        python: code`
          def solve(input_str):
              lines = input_str.strip().split("\n")
              a = list(map(int, lines[0].split()))
              b = list(map(int, lines[1].split()))
              out = []
              carry = 0
              i = 0
              while i < len(a) or i < len(b) or carry:
                  total = (a[i] if i < len(a) else 0) + (b[i] if i < len(b) else 0) + carry
                  out.append(total % 10)
                  carry = total // 10
                  i += 1
              return " ".join(map(str, out))
        `,
      },
    },
  ],
  stacks: [
    {
      title: "Valid Parentheses",
      difficulty: "Easy",
      description:
        "Given a string containing just the characters `()[]{}`, determine whether it is valid: every open bracket is closed by the same type of bracket, in the correct order.\n\nPrint `true` or `false`.",
      constraints: "1 <= s.length <= 10^4\ns consists only of the characters ()[]{}",
      inputFormat: "One line containing the bracket string.",
      outputFormat: "`true` or `false`.",
      examples: [{ input: "()[]{}", output: "true" }],
      testCases: [
        { input: "()[]{}", expectedOutput: "true", isHidden: false },
        { input: "(]", expectedOutput: "false", isHidden: false },
        { input: "([{}])", expectedOutput: "true", isHidden: true },
        { input: "((", expectedOutput: "false", isHidden: true },
        { input: "([)]", expectedOutput: "false", isHidden: true },
      ],
      hints: [
        "The most recently opened bracket must be closed first.",
        "Push opening brackets on a stack.",
        "On a closing bracket, the stack top must be its matching opener; at the end the stack must be empty.",
      ],
      editorial: "Use a stack of opening brackets; each closing bracket must match the popped top. Valid iff every match succeeds and the stack ends empty. Time O(n).",
      solutions: {
        javascript: code`
          function solve(input) {
            const pairs = { ")": "(", "]": "[", "}": "{" };
            const stack = [];
            for (const ch of input.trim()) {
              if (ch === "(" || ch === "[" || ch === "{") {
                stack.push(ch);
              } else if (pairs[ch]) {
                if (stack.pop() !== pairs[ch]) return "false";
              }
            }
            return stack.length === 0 ? "true" : "false";
          }
        `,
        python: code`
          def solve(input_str):
              pairs = {")": "(", "]": "[", "}": "{"}
              stack = []
              for ch in input_str.strip():
                  if ch in "([{":
                      stack.append(ch)
                  elif ch in pairs:
                      if not stack or stack.pop() != pairs[ch]:
                          return "false"
              return "true" if not stack else "false"
        `,
      },
    },
    {
      title: "Evaluate Reverse Polish Notation",
      difficulty: "Medium",
      description:
        "Evaluate an arithmetic expression given in Reverse Polish Notation. Valid operators are `+`, `-`, `*` and `/`. Division between two integers truncates toward zero.\n\nThe expression is always valid and never divides by zero.",
      constraints: "1 <= tokens.length <= 10^4\nIntermediate results fit in a 32-bit integer.",
      inputFormat: "One line of space-separated tokens (integers or operators).",
      outputFormat: "The integer value of the expression.",
      examples: [{ input: "2 1 + 3 *", output: "9", explanation: "((2 + 1) * 3) = 9." }],
      testCases: [
        { input: "2 1 + 3 *", expectedOutput: "9", isHidden: false },
        { input: "4 13 5 / +", expectedOutput: "6", isHidden: false },
        { input: "10 6 9 3 + -11 * / * 17 + 5 +", expectedOutput: "22", isHidden: true },
        { input: "7 -2 /", expectedOutput: "-3", isHidden: true },
      ],
      hints: [
        "Numbers are pushed onto a stack.",
        "An operator pops the right operand first, then the left operand.",
        "Truncate division toward zero (not floor) for negative results.",
      ],
      editorial: "Scan tokens with a stack: push numbers; for an operator pop b then a and push a op b. Time O(n).",
      solutions: {
        javascript: code`
          function solve(input) {
            const stack = [];
            for (const token of input.trim().split(/\s+/)) {
              if (token === "+" || token === "-" || token === "*" || token === "/") {
                const b = stack.pop();
                const a = stack.pop();
                if (token === "+") stack.push(a + b);
                else if (token === "-") stack.push(a - b);
                else if (token === "*") stack.push(a * b);
                else stack.push(Math.trunc(a / b));
              } else {
                stack.push(Number(token));
              }
            }
            return String(stack.pop() + 0);
          }
        `,
        python: code`
          def solve(input_str):
              stack = []
              for token in input_str.split():
                  if token in ("+", "-", "*", "/"):
                      b = stack.pop()
                      a = stack.pop()
                      if token == "+":
                          stack.append(a + b)
                      elif token == "-":
                          stack.append(a - b)
                      elif token == "*":
                          stack.append(a * b)
                      else:
                          q = abs(a) // abs(b)
                          stack.append(q if (a >= 0) == (b >= 0) else -q)
                  else:
                      stack.append(int(token))
              return str(stack.pop())
        `,
      },
    },
    {
      title: "Largest Rectangle in Histogram",
      difficulty: "Hard",
      description: "Given the heights of a histogram's bars (each bar has width 1), find the area of the largest rectangle that fits inside the histogram.",
      constraints: "1 <= heights.length <= 10^5\n0 <= heights[i] <= 10^4",
      inputFormat: "One line of space-separated bar heights.",
      outputFormat: "The largest rectangle area.",
      examples: [{ input: "2 1 5 6 2 3", output: "10", explanation: "Bars of height 5 and 6 form a 5 x 2 rectangle." }],
      testCases: [
        { input: "2 1 5 6 2 3", expectedOutput: "10", isHidden: false },
        { input: "2 4", expectedOutput: "4", isHidden: false },
        { input: "6 2 5 4 5 1 6", expectedOutput: "12", isHidden: true },
        { input: "1 1 1 1", expectedOutput: "4", isHidden: true },
      ],
      hints: [
        "For each bar, the widest rectangle of its height extends until a shorter bar on each side.",
        "A monotonic increasing stack of indices finds those boundaries.",
        "Append a sentinel bar of height 0 to flush the stack at the end.",
      ],
      editorial:
        "Maintain a stack of indices with increasing heights. When a lower bar arrives, pop bars and compute area = height * (i - leftBoundary - 1). Each index is pushed and popped once: O(n).",
      solutions: {
        javascript: code`
          function solve(input) {
            const heights = input.trim().split(/\s+/).map(Number);
            heights.push(0);
            const stack = [];
            let best = 0;
            for (let i = 0; i < heights.length; i++) {
              while (stack.length && heights[stack[stack.length - 1]] >= heights[i]) {
                const height = heights[stack.pop()];
                const left = stack.length ? stack[stack.length - 1] + 1 : 0;
                best = Math.max(best, height * (i - left));
              }
              stack.push(i);
            }
            return String(best);
          }
        `,
        python: code`
          def solve(input_str):
              heights = list(map(int, input_str.split())) + [0]
              stack = []
              best = 0
              for i, h in enumerate(heights):
                  while stack and heights[stack[-1]] >= h:
                      height = heights[stack.pop()]
                      left = stack[-1] + 1 if stack else 0
                      best = max(best, height * (i - left))
                  stack.append(i)
              return str(best)
        `,
      },
    },
  ],
  queues: [
    {
      title: "Implement Queue using Stacks",
      difficulty: "Easy",
      description:
        "Implement a first-in-first-out (FIFO) queue using only two stacks. Process the operations `push x`, `pop`, `peek` and `empty` in order.\n\nPrint the results of every `pop`, `peek` and `empty` operation, separated by spaces. `pop` and `peek` are never called on an empty queue.",
      constraints: "1 <= operations <= 1000\n1 <= x <= 9",
      inputFormat: "One operation per line: `push x`, `pop`, `peek` or `empty`.",
      outputFormat: "Space-separated results of pop / peek / empty (booleans as `true`/`false`).",
      examples: [{ input: "push 1\npush 2\npeek\npop\nempty", output: "1 1 false" }],
      testCases: [
        { input: "push 1\npush 2\npeek\npop\nempty", expectedOutput: "1 1 false", isHidden: false },
        { input: "push 5\nempty\npop\nempty", expectedOutput: "false 5 true", isHidden: false },
        { input: "push 3\npush 4\npop\npush 5\npeek\npop\npop\nempty", expectedOutput: "3 4 4 5 true", isHidden: true },
      ],
      hints: [
        "Use an input stack for pushes and an output stack for pops.",
        "Only move elements from the input stack to the output stack when the output stack is empty.",
        "Each element moves at most once, so operations are amortised O(1).",
      ],
      editorial: "Two stacks: push onto `in`; for pop/peek, if `out` is empty move everything from `in` to `out` (reversing order), then use the top of `out`. Amortised O(1).",
      solutions: {
        javascript: code`
          function solve(input) {
            const inStack = [];
            const outStack = [];
            const out = [];
            const shift = () => {
              if (outStack.length === 0) {
                while (inStack.length) outStack.push(inStack.pop());
              }
            };
            for (const line of input.trim().split("\n")) {
              const [op, arg] = line.trim().split(/\s+/);
              if (op === "push") {
                inStack.push(Number(arg));
              } else if (op === "pop") {
                shift();
                out.push(outStack.pop());
              } else if (op === "peek") {
                shift();
                out.push(outStack[outStack.length - 1]);
              } else if (op === "empty") {
                out.push(inStack.length === 0 && outStack.length === 0 ? "true" : "false");
              }
            }
            return out.join(" ");
          }
        `,
        python: code`
          def solve(input_str):
              in_stack, out_stack, out = [], [], []

              def shift():
                  if not out_stack:
                      while in_stack:
                          out_stack.append(in_stack.pop())

              for line in input_str.strip().split("\n"):
                  parts = line.split()
                  if not parts:
                      continue
                  op = parts[0]
                  if op == "push":
                      in_stack.append(int(parts[1]))
                  elif op == "pop":
                      shift()
                      out.append(str(out_stack.pop()))
                  elif op == "peek":
                      shift()
                      out.append(str(out_stack[-1]))
                  elif op == "empty":
                      out.append("true" if not in_stack and not out_stack else "false")
              return " ".join(out)
        `,
      },
    },
    {
      title: "Design Circular Queue",
      difficulty: "Medium",
      description:
        "Design a circular queue with capacity `k` supporting: `enQueue x` (insert, prints `true` on success or `false` if full), `deQueue` (remove front, prints `true`/`false`), `Front` and `Rear` (print the value or `-1` if empty), `isEmpty` and `isFull` (print `true`/`false`).\n\nPrint the result of every operation, separated by spaces.",
      constraints: "1 <= k <= 1000\n0 <= x <= 1000\nAt most 3000 operations.",
      inputFormat: "Line 1: capacity `k`.\nFollowing lines: one operation per line.",
      outputFormat: "Space-separated results of all operations.",
      examples: [
        {
          input: "3\nenQueue 1\nenQueue 2\nenQueue 3\nenQueue 4\nRear\nisFull\ndeQueue\nenQueue 4\nRear",
          output: "true true true false 3 true true true 4",
        },
      ],
      testCases: [
        {
          input: "3\nenQueue 1\nenQueue 2\nenQueue 3\nenQueue 4\nRear\nisFull\ndeQueue\nenQueue 4\nRear",
          expectedOutput: "true true true false 3 true true true 4",
          isHidden: false,
        },
        { input: "2\nFront\nisEmpty\nenQueue 7\nFront\nRear\ndeQueue\ndeQueue", expectedOutput: "-1 true true 7 7 true false", isHidden: false },
        { input: "1\nenQueue 9\nenQueue 8\nisFull\nRear\ndeQueue\nisEmpty\nenQueue 6\nFront", expectedOutput: "true false true 9 true true true 6", isHidden: true },
      ],
      hints: [
        "Use a fixed-size array plus a head index and a size counter.",
        "The tail position is (head + size) % k.",
        "Rear is at index (head + size - 1) % k.",
      ],
      editorial: "Store elements in an array of length k with `head` and `size`. All operations are O(1) index arithmetic modulo k.",
      solutions: {
        javascript: code`
          function solve(input) {
            const lines = input.trim().split("\n");
            const k = Number(lines[0]);
            const buffer = new Array(k);
            let head = 0;
            let size = 0;
            const out = [];
            for (const line of lines.slice(1)) {
              const [op, arg] = line.trim().split(/\s+/);
              if (op === "enQueue") {
                if (size === k) out.push("false");
                else {
                  buffer[(head + size) % k] = Number(arg);
                  size++;
                  out.push("true");
                }
              } else if (op === "deQueue") {
                if (size === 0) out.push("false");
                else {
                  head = (head + 1) % k;
                  size--;
                  out.push("true");
                }
              } else if (op === "Front") {
                out.push(size === 0 ? "-1" : String(buffer[head]));
              } else if (op === "Rear") {
                out.push(size === 0 ? "-1" : String(buffer[(head + size - 1) % k]));
              } else if (op === "isEmpty") {
                out.push(size === 0 ? "true" : "false");
              } else if (op === "isFull") {
                out.push(size === k ? "true" : "false");
              }
            }
            return out.join(" ");
          }
        `,
        python: code`
          def solve(input_str):
              lines = input_str.strip().split("\n")
              k = int(lines[0])
              buffer = [0] * k
              head = size = 0
              out = []
              for line in lines[1:]:
                  parts = line.split()
                  if not parts:
                      continue
                  op = parts[0]
                  if op == "enQueue":
                      if size == k:
                          out.append("false")
                      else:
                          buffer[(head + size) % k] = int(parts[1])
                          size += 1
                          out.append("true")
                  elif op == "deQueue":
                      if size == 0:
                          out.append("false")
                      else:
                          head = (head + 1) % k
                          size -= 1
                          out.append("true")
                  elif op == "Front":
                      out.append("-1" if size == 0 else str(buffer[head]))
                  elif op == "Rear":
                      out.append("-1" if size == 0 else str(buffer[(head + size - 1) % k]))
                  elif op == "isEmpty":
                      out.append("true" if size == 0 else "false")
                  elif op == "isFull":
                      out.append("true" if size == k else "false")
              return " ".join(out)
        `,
      },
    },
    {
      title: "Sliding Window Maximum",
      difficulty: "Hard",
      description: "Given an integer array `nums` and a window size `k`, print the maximum of every contiguous window of size `k` as the window slides from left to right.",
      constraints: "1 <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4\n1 <= k <= nums.length",
      inputFormat: "Line 1: space-separated integers `nums`.\nLine 2: the window size `k`.",
      outputFormat: "Space-separated window maxima.",
      examples: [{ input: "1 3 -1 -3 5 3 6 7\n3", output: "3 3 5 5 6 7" }],
      testCases: [
        { input: "1 3 -1 -3 5 3 6 7\n3", expectedOutput: "3 3 5 5 6 7", isHidden: false },
        { input: "1\n1", expectedOutput: "1", isHidden: false },
        { input: "9 11\n2", expectedOutput: "11", isHidden: true },
        { input: "1 3 1 2 0 5\n3", expectedOutput: "3 3 2 5", isHidden: true },
        { input: "4 -2\n2", expectedOutput: "4", isHidden: true },
      ],
      hints: [
        "A brute force scan of every window is O(n * k).",
        "Keep a deque of indices whose values are in decreasing order.",
        "Drop indices that fall out of the window from the front, and smaller values from the back.",
      ],
      editorial: "Monotonic deque of indices: the front always holds the index of the current window maximum. Each index enters and leaves once: O(n).",
      solutions: {
        javascript: code`
          function solve(input) {
            const lines = input.trim().split("\n");
            const nums = lines[0].trim().split(/\s+/).map(Number);
            const k = Number(lines[1]);
            const deque = [];
            let head = 0;
            const out = [];
            for (let i = 0; i < nums.length; i++) {
              while (deque.length > head && deque[head] <= i - k) head++;
              while (deque.length > head && nums[deque[deque.length - 1]] <= nums[i]) deque.pop();
              deque.push(i);
              if (i >= k - 1) out.push(nums[deque[head]]);
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
              window = deque()
              out = []
              for i, value in enumerate(nums):
                  while window and window[0] <= i - k:
                      window.popleft()
                  while window and nums[window[-1]] <= value:
                      window.pop()
                  window.append(i)
                  if i >= k - 1:
                      out.append(str(nums[window[0]]))
              return " ".join(out)
        `,
      },
    },
  ],
  hashing: [
    {
      title: "Contains Duplicate",
      difficulty: "Easy",
      description: "Given an integer array `nums`, print `true` if any value appears at least twice, and `false` if every element is distinct.",
      constraints: "1 <= nums.length <= 10^5\n-10^9 <= nums[i] <= 10^9",
      inputFormat: "One line of space-separated integers.",
      outputFormat: "`true` or `false`.",
      examples: [{ input: "1 2 3 1", output: "true" }],
      testCases: [
        { input: "1 2 3 1", expectedOutput: "true", isHidden: false },
        { input: "1 2 3 4", expectedOutput: "false", isHidden: false },
        { input: "1 1 1 3 3 4 3 2 4 2", expectedOutput: "true", isHidden: true },
        { input: "42", expectedOutput: "false", isHidden: true },
      ],
      hints: ["Sorting would put duplicates next to each other (O(n log n)).", "A hash set gives O(1) membership checks.", "Stop as soon as you see a value twice."],
      editorial: "Insert values into a hash set; if a value is already present, a duplicate exists. Time O(n), space O(n).",
      solutions: {
        javascript: code`
          function solve(input) {
            const seen = new Set();
            for (const token of input.trim().split(/\s+/)) {
              if (seen.has(token)) return "true";
              seen.add(token);
            }
            return "false";
          }
        `,
        python: code`
          def solve(input_str):
              nums = input_str.split()
              return "true" if len(set(nums)) != len(nums) else "false"
        `,
      },
    },
    {
      title: "Intersection of Two Arrays",
      difficulty: "Easy",
      description:
        "Given two integer arrays, print their intersection: the distinct values that appear in both arrays, in ascending order. Print `NONE` if they share no values.",
      constraints: "1 <= nums1.length, nums2.length <= 1000\n-1000 <= nums1[i], nums2[i] <= 1000",
      inputFormat: "Line 1: space-separated integers `nums1`.\nLine 2: space-separated integers `nums2`.",
      outputFormat: "Space-separated distinct common values in ascending order, or `NONE`.",
      examples: [{ input: "4 9 5\n9 4 9 8 4", output: "4 9" }],
      testCases: [
        { input: "1 2 2 1\n2 2", expectedOutput: "2", isHidden: false },
        { input: "4 9 5\n9 4 9 8 4", expectedOutput: "4 9", isHidden: false },
        { input: "1 2 3\n4 5 6", expectedOutput: "NONE", isHidden: true },
        { input: "-1 0 3 3\n3 -1 7", expectedOutput: "-1 3", isHidden: true },
      ],
      hints: ["Put the first array into a set.", "Collect values of the second array that are in the set (deduplicated).", "Sort the result numerically before printing."],
      editorial: "Build a set from nums1, filter nums2 through it into a result set, then sort numerically. Time O(n + m + r log r).",
      solutions: {
        javascript: code`
          function solve(input) {
            const lines = input.trim().split("\n");
            const first = new Set(lines[0].trim().split(/\s+/).map(Number));
            const common = new Set();
            for (const value of lines[1].trim().split(/\s+/).map(Number)) {
              if (first.has(value)) common.add(value);
            }
            const result = [...common].sort((a, b) => a - b);
            return result.length ? result.join(" ") : "NONE";
          }
        `,
        python: code`
          def solve(input_str):
              lines = input_str.strip().split("\n")
              first = set(map(int, lines[0].split()))
              second = set(map(int, lines[1].split()))
              common = sorted(first & second)
              return " ".join(map(str, common)) if common else "NONE"
        `,
      },
    },
    {
      title: "Longest Consecutive Sequence",
      difficulty: "Medium",
      description: "Given an unsorted array of integers `nums`, return the length of the longest run of consecutive integers (e.g. 1, 2, 3, 4). Aim for O(n) time.",
      constraints: "1 <= nums.length <= 10^5\n-10^9 <= nums[i] <= 10^9",
      inputFormat: "One line of space-separated integers.",
      outputFormat: "The length of the longest consecutive sequence.",
      examples: [{ input: "100 4 200 1 3 2", output: "4", explanation: "The longest run is 1, 2, 3, 4." }],
      testCases: [
        { input: "100 4 200 1 3 2", expectedOutput: "4", isHidden: false },
        { input: "0 3 7 2 5 8 4 6 0 1", expectedOutput: "9", isHidden: false },
        { input: "1 2 0 1", expectedOutput: "3", isHidden: true },
        { input: "10", expectedOutput: "1", isHidden: true },
        { input: "-1 -2 5 -3 6", expectedOutput: "3", isHidden: true },
      ],
      hints: ["Put every number in a hash set.", "Only start counting from numbers x where x - 1 is not in the set.", "From such a start, count upward while x + 1 is in the set."],
      editorial: "With all values in a set, each sequence is walked exactly once from its smallest element, giving O(n) total time.",
      solutions: {
        javascript: code`
          function solve(input) {
            const values = new Set(input.trim().split(/\s+/).map(Number));
            let best = 0;
            for (const value of values) {
              if (values.has(value - 1)) continue;
              let length = 1;
              while (values.has(value + length)) length++;
              best = Math.max(best, length);
            }
            return String(best);
          }
        `,
        python: code`
          def solve(input_str):
              values = set(map(int, input_str.split()))
              best = 0
              for value in values:
                  if value - 1 in values:
                      continue
                  length = 1
                  while value + length in values:
                      length += 1
                  best = max(best, length)
              return str(best)
        `,
      },
    },
  ],
  trees: [
    {
      title: "Invert Binary Tree",
      difficulty: "Easy",
      description: `Invert a binary tree (mirror it: swap the left and right child of every node) and print the level-order traversal of the inverted tree, skipping missing nodes.\n\n${TREE_INPUT_NOTE}`,
      constraints: "1 <= number of nodes <= 100\n-100 <= Node.val <= 100",
      inputFormat: "One line: the tree in level order (`null` for missing children).",
      outputFormat: "Space-separated level-order values of the inverted tree (no nulls).",
      examples: [{ input: "4 2 7 1 3 6 9", output: "4 7 2 9 6 3 1" }],
      testCases: [
        { input: "4 2 7 1 3 6 9", expectedOutput: "4 7 2 9 6 3 1", isHidden: false },
        { input: "2 1 3", expectedOutput: "2 3 1", isHidden: false },
        { input: "5 3 8 1 4 null 9", expectedOutput: "5 8 3 9 4 1", isHidden: true },
        { input: "1", expectedOutput: "1", isHidden: true },
      ],
      hints: ["Inverting a tree = swapping children at every node.", "Recursion: invert the left and right subtrees, then swap them.", "Print with a breadth-first traversal using a queue."],
      editorial: "Recursively swap left and right children (or iteratively with a queue). Then output a BFS traversal. Time O(n).",
      solutions: {
        javascript:
          code`
            ${JS_BUILD_TREE}

            function invert(node) {
              if (!node) return null;
              const left = invert(node.left);
              node.left = invert(node.right);
              node.right = left;
              return node;
            }

            function solve(input) {
              const root = invert(buildTree(input.trim().split(/\s+/)));
              const out = [];
              const queue = root ? [root] : [];
              for (let i = 0; i < queue.length; i++) {
                out.push(queue[i].val);
                if (queue[i].left) queue.push(queue[i].left);
                if (queue[i].right) queue.push(queue[i].right);
              }
              return out.join(" ");
            }
          `,
        python: code`
          ${PY_BUILD_TREE}


          def invert(node):
              if node is None:
                  return None
              node.left, node.right = invert(node.right), invert(node.left)
              return node


          def solve(input_str):
              root = invert(build_tree(input_str.split()))
              out = []
              queue = [root] if root else []
              for node in queue:
                  out.append(str(node.val))
                  if node.left:
                      queue.append(node.left)
                  if node.right:
                      queue.append(node.right)
              return " ".join(out)
        `,
      },
    },
    {
      title: "Same Tree",
      difficulty: "Easy",
      description: `Given two binary trees, print \`true\` if they are structurally identical and every corresponding node has the same value, otherwise \`false\`.\n\n${TREE_INPUT_NOTE}`,
      constraints: "1 <= number of nodes in each tree <= 100\n-10^4 <= Node.val <= 10^4",
      inputFormat: "Line 1: tree p in level order.\nLine 2: tree q in level order.",
      outputFormat: "`true` or `false`.",
      examples: [{ input: "1 2 3\n1 2 3", output: "true" }],
      testCases: [
        { input: "1 2 3\n1 2 3", expectedOutput: "true", isHidden: false },
        { input: "1 2\n1 null 2", expectedOutput: "false", isHidden: false },
        { input: "1 2 1\n1 1 2", expectedOutput: "false", isHidden: true },
        { input: "10 5 15 null 7\n10 5 15 null 7", expectedOutput: "true", isHidden: true },
      ],
      hints: ["Two empty trees are the same; one empty and one not are different.", "Compare the root values first.", "Then recursively compare the left subtrees and the right subtrees."],
      editorial: "Recursive comparison: same(p, q) = both null, or both non-null with equal values and same(p.left, q.left) and same(p.right, q.right). Time O(n).",
      solutions: {
        javascript: code`
          ${JS_BUILD_TREE}

          function same(a, b) {
            if (!a && !b) return true;
            if (!a || !b || a.val !== b.val) return false;
            return same(a.left, b.left) && same(a.right, b.right);
          }

          function solve(input) {
            const lines = input.trim().split("\n");
            const p = buildTree(lines[0].trim().split(/\s+/));
            const q = buildTree((lines[1] || "").trim().split(/\s+/).filter(Boolean));
            return same(p, q) ? "true" : "false";
          }
        `,
        python: code`
          ${PY_BUILD_TREE}


          def same(a, b):
              if a is None and b is None:
                  return True
              if a is None or b is None or a.val != b.val:
                  return False
              return same(a.left, b.left) and same(a.right, b.right)


          def solve(input_str):
              lines = input_str.strip().split("\n")
              p = build_tree(lines[0].split())
              q = build_tree(lines[1].split() if len(lines) > 1 else [])
              return "true" if same(p, q) else "false"
        `,
      },
    },
    {
      title: "Binary Tree Level Order Traversal",
      difficulty: "Medium",
      description: `Given a binary tree, print its level-order traversal: the values of each level from left to right, one level per line.\n\n${TREE_INPUT_NOTE}`,
      constraints: "1 <= number of nodes <= 2000\n-1000 <= Node.val <= 1000",
      inputFormat: "One line: the tree in level order (`null` for missing children).",
      outputFormat: "One line per level with space-separated values.",
      examples: [{ input: "3 9 20 null null 15 7", output: "3\n9 20\n15 7" }],
      testCases: [
        { input: "3 9 20 null null 15 7", expectedOutput: "3\n9 20\n15 7", isHidden: false },
        { input: "1", expectedOutput: "1", isHidden: false },
        { input: "1 2 3 4 null null 5", expectedOutput: "1\n2 3\n4 5", isHidden: true },
        { input: "1 2 null 3 null 4", expectedOutput: "1\n2\n3\n4", isHidden: true },
      ],
      hints: ["Use a queue (breadth-first search).", "Process the queue one level at a time: remember how many nodes the level has.", "Collect each level's values before moving to the next."],
      editorial: "BFS where each iteration drains exactly the nodes of the current level, enqueuing their children. Time O(n).",
      solutions: {
        javascript: code`
          ${JS_BUILD_TREE}

          function solve(input) {
            const root = buildTree(input.trim().split(/\s+/));
            const lines = [];
            let level = root ? [root] : [];
            while (level.length) {
              lines.push(level.map((node) => node.val).join(" "));
              const next = [];
              for (const node of level) {
                if (node.left) next.push(node.left);
                if (node.right) next.push(node.right);
              }
              level = next;
            }
            return lines.join("\n");
          }
        `,
        python: code`
          ${PY_BUILD_TREE}


          def solve(input_str):
              root = build_tree(input_str.split())
              lines = []
              level = [root] if root else []
              while level:
                  lines.append(" ".join(str(node.val) for node in level))
                  nxt = []
                  for node in level:
                      if node.left:
                          nxt.append(node.left)
                      if node.right:
                          nxt.append(node.right)
                  level = nxt
              return "\n".join(lines)
        `,
      },
    },
  ],
};

export const PROBLEM_BANK: SeedProblem[] = Object.entries(specs).flatMap(([categoryKey, list]) =>
  list.map((spec) => {
    const id = `prob-${categoryKey}-${slugify(spec.title)}`;
    const category = CATEGORY_NAMES[categoryKey];
    return {
      ...spec,
      id,
      category,
      tags: [category, ...companyTagsFor(id)],
      hints: spec.hints.map((hint, i) => `Level ${i + 1}: ${hint}`),
      solutions: {
        javascript: spec.solutions.javascript,
        python: spec.solutions.python,
        java: spec.solutions.java ?? "",
        cpp: spec.solutions.cpp ?? "",
        c: spec.solutions.c ?? "",
      },
    };
  })
);
