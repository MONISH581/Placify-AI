/**
 * Extra interview problems, batch B: stacks, queues, trees, binary search trees and heaps.
 *
 * Large hidden "performance" inputs are generated deterministically below (seeded PRNG). Their expected outputs
 * come from small independent implementations (brute force, formulas, or a different traversal strategy) that do
 * not share code with the reference solutions.
 */

import { code, JS_BUILD_TREE, PY_BUILD_TREE, TREE_INPUT_NOTE, type ProblemSpec, type SeedTestCase } from "../problemHelpers";

// ---------------------------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------------------------

/** Binary heap for the JavaScript reference solutions; `before(a, b)` is true when `a` belongs closer to the top. */
const JS_HEAP = `class Heap {
  constructor(before) {
    this.before = before;
    this.items = [];
  }

  get size() {
    return this.items.length;
  }

  peek() {
    return this.items[0];
  }

  push(value) {
    const items = this.items;
    items.push(value);
    let i = items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!this.before(items[i], items[parent])) break;
      [items[i], items[parent]] = [items[parent], items[i]];
      i = parent;
    }
  }

  pop() {
    const items = this.items;
    const top = items[0];
    const last = items.pop();
    if (items.length > 0) {
      items[0] = last;
      let i = 0;
      for (;;) {
        const left = 2 * i + 1;
        const right = left + 1;
        let best = i;
        if (left < items.length && this.before(items[left], items[best])) best = left;
        if (right < items.length && this.before(items[right], items[best])) best = right;
        if (best === i) break;
        [items[i], items[best]] = [items[best], items[i]];
        i = best;
      }
    }
    return top;
  }
}`;

/** Deterministic PRNG (mulberry32): returns an integer in [0, bound). */
function makeRng(seed: number): (bound: number) => number {
  let state = seed >>> 0;
  return (bound: number) => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * bound);
  };
}

const tc = (input: string, expectedOutput: string, isHidden = true): SeedTestCase => ({ input, expectedOutput, isHidden });

// ---------------------------------------------------------------------------------------------
// Tree builders for the performance cases (node 0 is the root; -1 means "no child")
// ---------------------------------------------------------------------------------------------

interface TreeShape {
  val: number[];
  left: number[];
  right: number[];
}

const emptyShape = (n: number): TreeShape => ({ val: new Array(n).fill(0), left: new Array(n).fill(-1), right: new Array(n).fill(-1) });

/** Level-order string with `null` placeholders (same convention the reference solutions parse). */
function serializeTree(t: TreeShape): string {
  const tokens = [String(t.val[0])];
  const queue = [0];
  for (let qi = 0; qi < queue.length; qi++) {
    const id = queue[qi];
    for (const child of [t.left[id], t.right[id]]) {
      if (child >= 0) {
        tokens.push(String(t.val[child]));
        queue.push(child);
      } else {
        tokens.push("null");
      }
    }
  }
  while (tokens[tokens.length - 1] === "null") tokens.pop();
  return tokens.join(" ");
}

/** Random tree shape with `n` nodes: every new node takes a uniformly random free child slot. Parents have smaller ids. */
function randomShape(seed: number, n: number): TreeShape {
  const rng = makeRng(seed);
  const t = emptyShape(n);
  for (let i = 0; i < n; i++) t.val[i] = i + 1;
  const slots = [0, 1];
  for (let i = 1; i < n; i++) {
    const j = rng(slots.length);
    const slot = slots[j];
    slots[j] = slots[slots.length - 1];
    slots.pop();
    ((slot & 1) === 0 ? t.left : t.right)[slot >> 1] = i;
    slots.push(2 * i, 2 * i + 1);
  }
  return t;
}

/** Straight chain of `n` nodes going left or right; values 1..n from the top. */
function chainShape(n: number, side: "left" | "right"): TreeShape {
  const t = emptyShape(n);
  for (let i = 0; i < n; i++) {
    t.val[i] = i + 1;
    if (i + 1 < n) t[side][i] = i + 1;
  }
  return t;
}

/** Binary search tree built by inserting `values` in order (duplicates not allowed). */
function bstShape(values: number[]): TreeShape {
  const t = emptyShape(values.length);
  t.val = [...values];
  for (let i = 1; i < values.length; i++) {
    let cur = 0;
    for (;;) {
      const side = values[i] < t.val[cur] ? t.left : t.right;
      if (side[cur] < 0) {
        side[cur] = i;
        break;
      }
      cur = side[cur];
    }
  }
  return t;
}

const parentsOf = (t: TreeShape): number[] => {
  const parent = new Array(t.val.length).fill(-1);
  for (let i = 0; i < t.val.length; i++) {
    if (t.left[i] >= 0) parent[t.left[i]] = i;
    if (t.right[i] >= 0) parent[t.right[i]] = i;
  }
  return parent;
};

/** Depth (in nodes) of the deepest node, via parent links (parents always have smaller ids in the shapes above). */
function bruteMaxDepth(t: TreeShape): number {
  const parent = parentsOf(t);
  const depth = new Array(t.val.length).fill(1);
  let best = 1;
  for (let i = 1; i < t.val.length; i++) {
    depth[i] = depth[parent[i]] + 1;
    best = Math.max(best, depth[i]);
  }
  return best;
}

/** Diameter in edges via the "farthest node from anywhere, then farthest from that" trick on the undirected tree. */
function bruteDiameter(t: TreeShape): number {
  const n = t.val.length;
  const parent = parentsOf(t);
  const adjacency: number[][] = Array.from({ length: n }, () => []);
  for (let i = 1; i < n; i++) {
    adjacency[i].push(parent[i]);
    adjacency[parent[i]].push(i);
  }
  const farthest = (start: number): [number, number] => {
    const dist = new Array(n).fill(-1);
    dist[start] = 0;
    const queue = [start];
    let last = start;
    for (let qi = 0; qi < queue.length; qi++) {
      last = queue[qi];
      for (const next of adjacency[last]) {
        if (dist[next] < 0) {
          dist[next] = dist[last] + 1;
          queue.push(next);
        }
      }
    }
    return [last, dist[last]];
  };
  return farthest(farthest(0)[0])[1];
}

/** Right side view via an iterative right-first depth-first walk: the first node seen at each depth is visible. */
function bruteRightView(t: TreeShape): string {
  const seen: number[] = [];
  const stack: [number, number][] = [[0, 0]];
  while (stack.length) {
    const [id, depth] = stack.pop()!;
    if (seen.length === depth) seen.push(t.val[id]);
    if (t.left[id] >= 0) stack.push([t.left[id], depth + 1]);
    if (t.right[id] >= 0) stack.push([t.right[id], depth + 1]);
  }
  return seen.join(" ");
}

/** Lowest common ancestor of two values by comparing root-to-node paths. */
function bruteLca(t: TreeShape, p: number, q: number): number {
  const parent = parentsOf(t);
  const idOf = new Map<number, number>();
  t.val.forEach((v, i) => idOf.set(v, i));
  const pathTo = (value: number) => {
    const path: number[] = [];
    for (let id = idOf.get(value)!; id >= 0; id = parent[id]) path.push(id);
    return path.reverse();
  };
  const a = pathTo(p);
  const b = pathTo(q);
  let k = 0;
  while (k + 1 < a.length && k + 1 < b.length && a[k + 1] === b[k + 1]) k++;
  return t.val[a[k]];
}

// ---------------------------------------------------------------------------------------------
// Stacks: Min Stack
// ---------------------------------------------------------------------------------------------

/** 8000 random operations; getMin answers come from a plain scan of the current contents. */
function minStackCase(seed: number, operations: number): SeedTestCase {
  const rng = makeRng(seed);
  const lines: string[] = [];
  const answers: number[] = [];
  const stack: number[] = [];
  for (let i = 0; i < operations; i++) {
    const roll = rng(10);
    if (stack.length === 0 || roll < 6) {
      const value = rng(200001) - 100000;
      stack.push(value);
      lines.push("push " + value);
    } else if (roll < 7) {
      stack.pop();
      lines.push("pop");
    } else if (roll < 8) {
      lines.push("top");
      answers.push(stack[stack.length - 1]);
    } else {
      lines.push("getMin");
      let min = stack[0];
      for (const value of stack) if (value < min) min = value;
      answers.push(min);
    }
  }
  return tc(lines.join("\n"), answers.join(" "));
}

// ---------------------------------------------------------------------------------------------
// Stacks: Daily Temperatures
// ---------------------------------------------------------------------------------------------

function dailyTemperaturesBrute(temps: number[]): string {
  const out: number[] = [];
  for (let i = 0; i < temps.length; i++) {
    let wait = 0;
    for (let j = i + 1; j < temps.length; j++) {
      if (temps[j] > temps[i]) {
        wait = j - i;
        break;
      }
    }
    out.push(wait);
  }
  return out.join(" ");
}

const DAILY_RANDOM = (() => {
  const rng = makeRng(11);
  return Array.from({ length: 30000 }, () => 30 + rng(71));
})();
/** 100000 non-increasing days: nothing ever gets warmer, so every answer is 0 (a nested scan would need ~5*10^9 steps). */
const DAILY_NON_INCREASING = [...new Array(50000).fill(100), ...new Array(30000).fill(70), ...new Array(20000).fill(30)];

// ---------------------------------------------------------------------------------------------
// Stacks: Decode String
// ---------------------------------------------------------------------------------------------

const DECODE_BINARY_NESTING = "2[".repeat(15) + "a" + "]".repeat(15);
const DECODE_DEEP = "1[".repeat(3000) + "xy" + "]".repeat(3000);

// ---------------------------------------------------------------------------------------------
// Queues: Rotting Oranges
// ---------------------------------------------------------------------------------------------

/** Minute-by-minute simulation on a copy of the grid (no queue). */
function rottingBrute(grid: number[][]): number {
  const g = grid.map((row) => [...row]);
  const rows = g.length;
  const cols = g[0].length;
  let minutes = 0;
  for (;;) {
    const toRot: [number, number][] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (g[r][c] !== 1) continue;
        if ((r > 0 && g[r - 1][c] === 2) || (r + 1 < rows && g[r + 1][c] === 2) || (c > 0 && g[r][c - 1] === 2) || (c + 1 < cols && g[r][c + 1] === 2)) {
          toRot.push([r, c]);
        }
      }
    }
    if (toRot.length === 0) break;
    for (const [r, c] of toRot) g[r][c] = 2;
    minutes++;
  }
  return g.some((row) => row.includes(1)) ? -1 : minutes;
}

const gridText = (grid: number[][]) => grid.map((row) => row.join(" ")).join("\n");

const ROTTING_RANDOM = (() => {
  const rng = makeRng(77);
  return Array.from({ length: 250 }, () =>
    Array.from({ length: 250 }, () => {
      const roll = rng(1000);
      return roll < 5 ? 2 : roll < 35 ? 0 : 1;
    })
  );
})();

/** Same kind of grid, but one fresh orange is walled in by empty cells, so the answer is -1. */
const ROTTING_WALLED = (() => {
  const grid = ROTTING_RANDOM.slice(0, 200).map((row) => row.slice(0, 200));
  grid[100][100] = 1;
  grid[99][100] = grid[101][100] = grid[100][99] = grid[100][101] = 0;
  return grid;
})();

/** A long snake corridor of fresh oranges (rows of 1s joined by single cells) with the rotten one at the start. */
const ROTTING_SNAKE = (() => {
  const rows = 61;
  const cols = 100;
  const grid: number[][] = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, () => (r % 2 === 0 ? 1 : 0)));
  for (let r = 1; r < rows; r += 2) grid[r][r % 4 === 1 ? cols - 1 : 0] = 1;
  grid[0][0] = 2;
  return grid;
})();

// ---------------------------------------------------------------------------------------------
// Queues: Moving Average from Data Stream
// ---------------------------------------------------------------------------------------------

/** Exact integer formatting of sum / count to two decimals (round half up on the magnitude; ties cannot occur for count <= 7). */
function formatAverage(sum: number, count: number): string {
  const magnitude = Math.abs(sum);
  const cents = Math.floor((magnitude * 200 + count) / (2 * count));
  const text = Math.floor(cents / 100) + "." + String(cents % 100).padStart(2, "0");
  return sum < 0 ? "-" + text : text;
}

function movingAverageCase(seed: number, k: number, operations: number): SeedTestCase {
  const rng = makeRng(seed);
  const values = Array.from({ length: operations }, () => rng(2001) - 1000);
  const lines = [String(k), ...values.map((v) => "next " + v)];
  const answers = values.map((_, i) => {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - k + 1); j <= i; j++) {
      sum += values[j];
      count++;
    }
    return formatAverage(sum, count);
  });
  return tc(lines.join("\n"), answers.join(" "));
}

// ---------------------------------------------------------------------------------------------
// Trees and BSTs: large cases
// ---------------------------------------------------------------------------------------------

const CHAIN_LEFT_50K = chainShape(50000, "left");
const CHAIN_RIGHT_50K = chainShape(50000, "right");
const RANDOM_TREE_A = randomShape(5, 60000);
const RANDOM_TREE_B = randomShape(6, 40000);
const COMPLETE_TREE_15 = (() => {
  const t = emptyShape(32767);
  for (let i = 0; i < 32767; i++) {
    t.val[i] = i + 1;
    if (2 * i + 2 < 32767) {
      t.left[i] = 2 * i + 1;
      t.right[i] = 2 * i + 2;
    }
  }
  return t;
})();

/** Random BST over distinct values drawn from [-10^6, 10^6]. */
const RANDOM_BST = (() => {
  const rng = makeRng(31);
  const used = new Set<number>();
  const values: number[] = [];
  while (values.length < 30000) {
    const value = rng(2000001) - 1000000;
    if (!used.has(value)) {
      used.add(value);
      values.push(value);
    }
  }
  return bstShape(values);
})();
const RANDOM_BST_SORTED = [...RANDOM_BST.val].sort((a, b) => a - b);

// ---------------------------------------------------------------------------------------------
// Heaps: large cases
// ---------------------------------------------------------------------------------------------

const KTH_LARGEST_NUMS = (() => {
  const rng = makeRng(404);
  return Array.from({ length: 100000 }, () => rng(2000000001) - 1000000000);
})();
const KTH_LARGEST_K = 12345;
const KTH_LARGEST_ANSWER = [...KTH_LARGEST_NUMS].sort((a, b) => b - a)[KTH_LARGEST_K - 1];

const MERGE_K_PERF = (() => {
  const rng = makeRng(808);
  const lists = Array.from({ length: 500 }, (_, i) => {
    if (i % 97 === 5) return [] as number[];
    const length = 1 + rng(200);
    return Array.from({ length }, () => rng(200001) - 100000).sort((a, b) => a - b);
  });
  const lines = lists.map((list) => (list.length ? list.join(" ") : "EMPTY"));
  const merged = lists.flat().sort((a, b) => a - b);
  return tc(lines.join("\n"), merged.join(" "));
})();

/** Task Scheduler closed-form answer: max(#tasks, (maxCount - 1) * (n + 1) + #tasks with maxCount). */
function taskSchedulerFormula(tasks: string, n: number): number {
  const counts = new Map<string, number>();
  for (const ch of tasks) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  const max = Math.max(...counts.values());
  let ties = 0;
  for (const c of counts.values()) if (c === max) ties++;
  return Math.max(tasks.length, (max - 1) * (n + 1) + ties);
}

const TASKS_RANDOM = (() => {
  const rng = makeRng(909);
  return Array.from({ length: 10000 }, () => String.fromCharCode(65 + (rng(100) < 40 ? rng(3) : rng(26)))).join("");
})();
const TASKS_ONE_LETTER = "A".repeat(10000);

// ---------------------------------------------------------------------------------------------
// Problem specs
// ---------------------------------------------------------------------------------------------

export const EXTRA_B: Record<string, ProblemSpec[]> = {
  stacks: [
    {
      title: "Min Stack",
      difficulty: "Medium",
      companies: ["Amazon", "Microsoft", "Bloomberg", "Google", "Flipkart"],
      description:
        "Design a stack that supports `push x`, `pop`, `top` and `getMin`, where `getMin` returns the smallest value currently in the stack. Every operation must run in constant time.\n\nProcess the operations in order and print the result of every `top` and `getMin` operation, separated by single spaces. (`push` and `pop` print nothing.) `pop`, `top` and `getMin` are only called when the stack is non-empty.",
      constraints: "1 <= operations <= 10^5\n-10^9 <= x <= 10^9\nEvery pop / top / getMin is called on a non-empty stack.\nAt least one top or getMin operation is present.",
      inputFormat: "One operation per line: `push x`, `pop`, `top` or `getMin`.",
      outputFormat: "Space-separated results of the `top` and `getMin` operations, in order.",
      examples: [
        { input: "push -2\npush 0\npush -3\ngetMin\npop\ntop\ngetMin", output: "-3 0 -2", explanation: "getMin = -3; after pop the stack is [-2, 0], so top = 0 and getMin = -2." },
        { input: "push 1\npush 2\ntop\ngetMin\npop\ngetMin", output: "2 1 1" },
      ],
      testCases: [
        tc("push -2\npush 0\npush -3\ngetMin\npop\ntop\ngetMin", "-3 0 -2", false),
        tc("push 1\npush 2\ntop\ngetMin\npop\ngetMin", "2 1 1", false),
        tc("push 5\ngetMin\ntop", "5 5"),
        tc("push 2\npush 2\npush 1\ngetMin\npop\ngetMin\npop\ngetMin", "1 2 2"),
        tc("push 3\npush 1\npush 2\npush 1\ngetMin\npop\ngetMin\npop\ngetMin\npop\ngetMin\ntop", "1 1 1 3 3"),
        tc("push 1000000000\npush -1000000000\ngetMin\npop\ngetMin\ntop", "-1000000000 1000000000 1000000000"),
        minStackCase(2024, 8000),
      ],
      hints: [
        "A plain stack cannot tell you the minimum after a pop without rescanning, which is too slow.",
        "Each element could remember the minimum of everything beneath it (including itself).",
        "Store pairs (value, minSoFar); the new minSoFar is min(value, minSoFar of the previous top). Popping a pair restores the previous minimum automatically.",
      ],
      editorial:
        "Keep a stack of pairs `(value, minimumUpToHere)`. On push, the new minimum is `min(x, previous top's minimum)`. `pop` simply removes the top pair, which restores the earlier minimum, `top` reads the pair's value and `getMin` reads its minimum. Every operation is O(1) time and the stack uses O(n) space.",
      solutions: {
        javascript: code`
          function solve(input) {
            const stack = [];
            const out = [];
            for (const line of input.trim().split("\n")) {
              const parts = line.trim().split(/\s+/);
              const op = parts[0];
              if (op === "push") {
                const x = Number(parts[1]);
                const min = stack.length ? Math.min(x, stack[stack.length - 1][1]) : x;
                stack.push([x, min]);
              } else if (op === "pop") {
                stack.pop();
              } else if (op === "top") {
                out.push(stack[stack.length - 1][0]);
              } else if (op === "getMin") {
                out.push(stack[stack.length - 1][1]);
              }
            }
            return out.join(" ");
          }
        `,
        python: code`
          def solve(input_str):
              stack = []
              out = []
              for line in input_str.strip().split("\n"):
                  parts = line.split()
                  if not parts:
                      continue
                  op = parts[0]
                  if op == "push":
                      x = int(parts[1])
                      low = min(x, stack[-1][1]) if stack else x
                      stack.append((x, low))
                  elif op == "pop":
                      stack.pop()
                  elif op == "top":
                      out.append(str(stack[-1][0]))
                  elif op == "getMin":
                      out.append(str(stack[-1][1]))
              return " ".join(out)
        `,
      },
    },
    {
      title: "Daily Temperatures",
      difficulty: "Medium",
      companies: ["Amazon", "Google", "Meta", "Bloomberg", "Salesforce"],
      description:
        "You are given the daily temperatures of a city. For every day, find how many days you have to wait until a strictly warmer temperature occurs. If no later day is warmer, the answer for that day is `0`.\n\nPrint the answers for all days in order.",
      constraints: "1 <= temperatures.length <= 10^5\n30 <= temperatures[i] <= 100",
      inputFormat: "One line of space-separated integers `temperatures`.",
      outputFormat: "One line of space-separated integers: the waiting days for each day.",
      examples: [
        { input: "73 74 75 71 69 72 76 73", output: "1 1 4 2 1 1 0 0", explanation: "Day 2 (75) has to wait 4 days for 76." },
        { input: "30 40 50 60", output: "1 1 1 0" },
      ],
      testCases: [
        tc("73 74 75 71 69 72 76 73", "1 1 4 2 1 1 0 0", false),
        tc("30 40 50 60", "1 1 1 0", false),
        tc("30 60 90", "1 1 0"),
        tc("90 80 70", "0 0 0"),
        tc("50", "0"),
        tc("55 55 55", "0 0 0"),
        tc("70 60 70 60 80", "4 1 2 1 0"),
        tc(DAILY_RANDOM.join(" "), dailyTemperaturesBrute(DAILY_RANDOM)),
        tc(DAILY_NON_INCREASING.join(" "), new Array(DAILY_NON_INCREASING.length).fill(0).join(" ")),
      ],
      hints: [
        "For one day, the brute force scans forward until it finds a warmer day. That can be quadratic overall.",
        "Keep a stack of days that are still waiting for a warmer temperature.",
        "When today is warmer than the day on top of the stack, pop it and record (today - thatDay). The stack always holds non-increasing temperatures.",
      ],
      editorial:
        "Scan left to right with a stack of indices whose temperatures are non-increasing (days still waiting for a warmer day). For each day `i`, while the temperature at the stack's top is lower than `temps[i]`, pop that index `j` and set `answer[j] = i - j`. Then push `i`. Each index is pushed and popped at most once, so the time is O(n) and the extra space O(n). Days left on the stack keep the default answer 0.",
      solutions: {
        javascript: code`
          function solve(input) {
            const temps = input.trim().split(/\s+/).map(Number);
            const answer = new Array(temps.length).fill(0);
            const stack = [];
            for (let i = 0; i < temps.length; i++) {
              while (stack.length && temps[stack[stack.length - 1]] < temps[i]) {
                const j = stack.pop();
                answer[j] = i - j;
              }
              stack.push(i);
            }
            return answer.join(" ");
          }
        `,
        python: code`
          def solve(input_str):
              temps = list(map(int, input_str.split()))
              answer = [0] * len(temps)
              stack = []
              for i, t in enumerate(temps):
                  while stack and temps[stack[-1]] < t:
                      j = stack.pop()
                      answer[j] = i - j
                  stack.append(i)
              return " ".join(map(str, answer))
        `,
      },
    },
    {
      title: "Decode String",
      difficulty: "Medium",
      companies: ["Google", "Amazon", "Meta", "Bloomberg", "Uber"],
      description:
        "An encoded string follows the rule `k[encoded]`, which means the text inside the brackets is repeated exactly `k` times. Brackets can be nested, and plain letters can appear anywhere between them.\n\nGiven a valid encoded string, print the decoded string. The input contains only lowercase letters, digits and square brackets; every digit sequence is a repeat count that is immediately followed by `[`.",
      constraints: "1 <= s.length <= 10^4\n1 <= k <= 300\nThe decoded string has at most 10^5 characters.\nThe input is always well-formed.",
      inputFormat: "One line containing the encoded string `s`.",
      outputFormat: "The decoded string.",
      examples: [
        { input: "3[a]2[bc]", output: "aaabcbc" },
        { input: "3[a2[c]]", output: "accaccacc", explanation: "The inner 2[c] gives cc, so the group is acc; repeated 3 times." },
      ],
      testCases: [
        tc("3[a]2[bc]", "aaabcbc", false),
        tc("3[a2[c]]", "accaccacc", false),
        tc("2[abc]3[cd]ef", "abcabccdcdcdef"),
        tc("abc", "abc"),
        tc("10[a]", "aaaaaaaaaa"),
        tc("2[2[2[a]]]", "aaaaaaaa"),
        tc("a2[b3[c]]d", "abcccbcccd"),
        tc("12[ab]", "ab".repeat(12)),
        tc("100[2[ab]c]", "ababc".repeat(100)),
        tc(DECODE_BINARY_NESTING, "a".repeat(2 ** 15)),
        tc(DECODE_DEEP, "xy"),
      ],
      hints: [
        "A closing bracket tells you the group is complete, so you need to remember what was built before its opening bracket.",
        "Use a stack. On `[`, save the text built so far and the repeat count, then start fresh inside the brackets.",
        "On `]`, pop the saved text and count: the new current text is saved + current * count. Parse multi-digit counts by accumulating digits.",
      ],
      editorial:
        "Process the characters left to right while keeping the text built so far in the current level and a number accumulator for the repeat count. A digit extends the count, a letter extends the current text, `[` pushes `(currentText, count)` on a stack and starts a fresh level, and `]` pops `(previousText, count)` and sets the current text to `previousText + currentText.repeat(count)`. This is iterative, so deeply nested input cannot overflow the call stack. Time is proportional to the length of the decoded output.",
      solutions: {
        javascript: code`
          function solve(input) {
            const s = input.trim();
            const stack = [];
            let current = "";
            let count = 0;
            for (const ch of s) {
              if (ch >= "0" && ch <= "9") {
                count = count * 10 + (ch.charCodeAt(0) - 48);
              } else if (ch === "[") {
                stack.push([current, count]);
                current = "";
                count = 0;
              } else if (ch === "]") {
                const [previous, times] = stack.pop();
                current = previous + current.repeat(times);
              } else {
                current += ch;
              }
            }
            return current;
          }
        `,
        python: code`
          def solve(input_str):
              s = input_str.strip()
              stack = []
              current = ""
              count = 0
              for ch in s:
                  if ch.isdigit():
                      count = count * 10 + int(ch)
                  elif ch == "[":
                      stack.append((current, count))
                      current = ""
                      count = 0
                  elif ch == "]":
                      previous, times = stack.pop()
                      current = previous + current * times
                  else:
                      current += ch
              return current
        `,
      },
    },
  ],

  queues: [
    {
      title: "Rotting Oranges",
      difficulty: "Medium",
      companies: ["Amazon", "Microsoft", "Google", "Meta", "Flipkart"],
      description:
        "A grid contains cells with value `0` (empty), `1` (fresh orange) or `2` (rotten orange). Every minute, each fresh orange that is directly adjacent (up, down, left or right) to a rotten orange becomes rotten.\n\nPrint the minimum number of minutes that must pass until no fresh orange is left. If that never happens, print `-1`. A grid with no fresh oranges needs `0` minutes.",
      constraints: "1 <= rows, cols <= 300\ngrid[r][c] is 0, 1 or 2.",
      inputFormat: "One grid row per line; the cell values of a row are separated by spaces.",
      outputFormat: "A single integer: the minimum number of minutes, or -1.",
      examples: [
        { input: "2 1 1\n1 1 0\n0 1 1", output: "4" },
        { input: "2 1 1\n0 1 1\n1 0 1", output: "-1", explanation: "The orange in the bottom-left corner is never adjacent to a rotten one." },
      ],
      testCases: [
        tc("2 1 1\n1 1 0\n0 1 1", "4", false),
        tc("2 1 1\n0 1 1\n1 0 1", "-1", false),
        tc("0 2", "0"),
        tc("0", "0"),
        tc("1", "-1"),
        tc("2 2\n2 2", "0"),
        tc("2 1 1 1 1 1", "5"),
        tc("1 2 1\n1 1 1\n1 1 1", "3"),
        tc(gridText(ROTTING_RANDOM), String(rottingBrute(ROTTING_RANDOM))),
        tc(gridText(ROTTING_WALLED), String(rottingBrute(ROTTING_WALLED))),
        tc(gridText(ROTTING_SNAKE), String(rottingBrute(ROTTING_SNAKE))),
      ],
      hints: [
        "Rotting spreads one step per minute in all four directions, like a wave.",
        "Start a breadth-first search from every rotten orange at the same time (multi-source BFS).",
        "Process the queue level by level; each level is one minute. At the end, if any fresh orange remains, the answer is -1.",
      ],
      editorial:
        "Count the fresh oranges and put every initially rotten cell in a queue. Then run BFS one layer at a time: each layer turns the adjacent fresh oranges rotten (decrementing the fresh counter) and adds them to the queue, and every layer that rots something adds one minute. When the queue is exhausted, the answer is the number of layers if no fresh orange remains, otherwise -1. Every cell is visited at most once: O(rows * cols) time and space.",
      solutions: {
        javascript: code`
          function solve(input) {
            const grid = input.trim().split("\n").map((line) => line.trim().split(/\s+/).map(Number));
            const rows = grid.length;
            const cols = grid[0].length;
            const queue = [];
            let fresh = 0;
            for (let r = 0; r < rows; r++) {
              for (let c = 0; c < cols; c++) {
                if (grid[r][c] === 2) queue.push(r * cols + c);
                else if (grid[r][c] === 1) fresh++;
              }
            }
            const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
            let head = 0;
            let minutes = 0;
            while (head < queue.length && fresh > 0) {
              const end = queue.length;
              while (head < end) {
                const id = queue[head++];
                const r = Math.floor(id / cols);
                const c = id % cols;
                for (const [dr, dc] of dirs) {
                  const nr = r + dr;
                  const nc = c + dc;
                  if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === 1) {
                    grid[nr][nc] = 2;
                    fresh--;
                    queue.push(nr * cols + nc);
                  }
                }
              }
              minutes++;
            }
            return String(fresh === 0 ? minutes : -1);
          }
        `,
        python: code`
          from collections import deque


          def solve(input_str):
              grid = [list(map(int, line.split())) for line in input_str.strip().split("\n")]
              rows, cols = len(grid), len(grid[0])
              queue = deque()
              fresh = 0
              for r in range(rows):
                  for c in range(cols):
                      if grid[r][c] == 2:
                          queue.append((r, c))
                      elif grid[r][c] == 1:
                          fresh += 1
              minutes = 0
              while queue and fresh > 0:
                  for _ in range(len(queue)):
                      r, c = queue.popleft()
                      for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                          nr, nc = r + dr, c + dc
                          if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 1:
                              grid[nr][nc] = 2
                              fresh -= 1
                              queue.append((nr, nc))
                  minutes += 1
              return str(minutes if fresh == 0 else -1)
        `,
      },
    },
    {
      title: "Moving Average from Data Stream",
      difficulty: "Easy",
      companies: ["Google", "Amazon", "Meta", "Microsoft"],
      description:
        "Design a moving-average calculator with a window of size `k`. Each `next x` operation adds the value `x` to the stream and returns the average of the last `k` values seen so far (or of all values if fewer than `k` have arrived).\n\nPrint the result of every `next` operation formatted with exactly two digits after the decimal point (for example `5.50` or `-0.33`), separated by single spaces.",
      constraints: "1 <= k <= 7\n1 <= number of next operations <= 10^5\n-1000 <= x <= 1000\nAverages are rounded to two decimals (round half up on the magnitude); with k <= 7 no tie can occur.",
      inputFormat: "Line 1: the window size `k`.\nFollowing lines: one operation per line, `next x`.",
      outputFormat: "Space-separated averages, each with exactly two decimal places.",
      examples: [
        { input: "3\nnext 1\nnext 10\nnext 3\nnext 5", output: "1.00 5.50 4.67 6.00", explanation: "Windows: [1], [1,10], [1,10,3], [10,3,5]." },
        { input: "1\nnext 5\nnext -2\nnext 7", output: "5.00 -2.00 7.00" },
      ],
      testCases: [
        tc("3\nnext 1\nnext 10\nnext 3\nnext 5", "1.00 5.50 4.67 6.00", false),
        tc("1\nnext 5\nnext -2\nnext 7", "5.00 -2.00 7.00", false),
        tc("4\nnext 2\nnext 4\nnext 6\nnext 8\nnext 10", "2.00 3.00 4.00 5.00 7.00"),
        tc("2\nnext -1\nnext -2\nnext 3", "-1.00 -1.50 0.50"),
        tc("5\nnext 1\nnext 1\nnext 1\nnext 1\nnext 1\nnext 2", "1.00 1.00 1.00 1.00 1.00 1.20"),
        tc("3\nnext -1\nnext 0\nnext 0\nnext 0", "-1.00 -0.50 -0.33 0.00"),
        tc("6\nnext 1000\nnext 1000\nnext -1000", "1000.00 1000.00 333.33"),
        movingAverageCase(515, 7, 50000),
        movingAverageCase(516, 4, 20000),
      ],
      hints: [
        "Only the last k values matter; older values must be forgotten.",
        "A queue (deque) holds the current window: add the new value at the back, remove from the front when the window is too big.",
        "Keep a running sum instead of re-adding the window each time: add the new value, subtract the value you evict. Format with 2 decimals.",
      ],
      editorial:
        "Store the window in a queue and maintain its sum. On `next x`, push `x` and add it to the sum; if the queue now has more than `k` elements, pop the front and subtract it. The average is `sum / queue.length`, printed with two decimals (`toFixed(2)` in JavaScript, `:.2f` in Python). Each operation is O(1).",
      solutions: {
        javascript: code`
          function solve(input) {
            const lines = input.trim().split("\n");
            const k = Number(lines[0]);
            const window = [];
            let head = 0;
            let sum = 0;
            const out = [];
            for (let i = 1; i < lines.length; i++) {
              const parts = lines[i].trim().split(/\s+/);
              if (parts[0] !== "next") continue;
              const x = Number(parts[1]);
              window.push(x);
              sum += x;
              if (window.length - head > k) sum -= window[head++];
              out.push((sum / (window.length - head)).toFixed(2));
            }
            return out.join(" ");
          }
        `,
        python: code`
          from collections import deque


          def solve(input_str):
              lines = input_str.strip().split("\n")
              k = int(lines[0])
              window = deque()
              total = 0
              out = []
              for line in lines[1:]:
                  parts = line.split()
                  if not parts or parts[0] != "next":
                      continue
                  x = int(parts[1])
                  window.append(x)
                  total += x
                  if len(window) > k:
                      total -= window.popleft()
                  out.append(f"{total / len(window):.2f}")
              return " ".join(out)
        `,
      },
    },
  ],

  trees: [
    {
      title: "Maximum Depth of Binary Tree",
      difficulty: "Easy",
      companies: ["Amazon", "Microsoft", "Google", "TCS", "Infosys"],
      description: `Given a binary tree, print its maximum depth: the number of nodes on the longest path from the root down to the farthest leaf.\n\n${TREE_INPUT_NOTE}`,
      constraints: "1 <= number of nodes <= 10^5\n-10^5 <= Node.val <= 10^5\nThe tree may be completely skewed (depth up to 10^5).",
      inputFormat: "One line: the tree in level order (`null` for missing children).",
      outputFormat: "A single integer: the maximum depth.",
      examples: [
        { input: "3 9 20 null null 15 7", output: "3" },
        { input: "1 null 2", output: "2" },
      ],
      testCases: [
        tc("3 9 20 null null 15 7", "3", false),
        tc("1 null 2", "2", false),
        tc("1", "1"),
        tc("1 2 null 3 null 4", "4"),
        tc("1 2 3 4 null null 5 6", "4"),
        tc("0 null 1 null 2 null 3 null 4", "5"),
        tc(serializeTree(CHAIN_LEFT_50K), String(bruteMaxDepth(CHAIN_LEFT_50K))),
        tc(serializeTree(COMPLETE_TREE_15), String(bruteMaxDepth(COMPLETE_TREE_15))),
        tc(serializeTree(RANDOM_TREE_A), String(bruteMaxDepth(RANDOM_TREE_A))),
      ],
      hints: [
        "The depth of a tree is 1 + the larger depth of its two subtrees (and 0 for an empty tree).",
        "A recursive solution is short, but a skewed tree with 10^5 nodes can overflow the call stack.",
        "Do a level-by-level BFS with a queue and count how many levels you process.",
      ],
      editorial:
        "Run a breadth-first search that processes one full level per iteration; the number of iterations is the depth. This is iterative, so even a chain of 10^5 nodes is safe. Time O(n), space O(width of the tree).",
      solutions: {
        javascript: code`
          ${JS_BUILD_TREE}

          function solve(input) {
            const root = buildTree(input.trim().split(/\s+/));
            if (!root) return "0";
            let level = [root];
            let depth = 0;
            while (level.length) {
              const next = [];
              for (const node of level) {
                if (node.left) next.push(node.left);
                if (node.right) next.push(node.right);
              }
              depth++;
              level = next;
            }
            return String(depth);
          }
        `,
        python: code`
          ${PY_BUILD_TREE}


          def solve(input_str):
              root = build_tree(input_str.split())
              if root is None:
                  return "0"
              level = [root]
              depth = 0
              while level:
                  nxt = []
                  for node in level:
                      if node.left:
                          nxt.append(node.left)
                      if node.right:
                          nxt.append(node.right)
                  depth += 1
                  level = nxt
              return str(depth)
        `,
      },
    },
    {
      title: "Diameter of Binary Tree",
      difficulty: "Easy",
      companies: ["Meta", "Amazon", "Google", "Microsoft", "Flipkart"],
      description: `The diameter of a binary tree is the length of the longest path between any two nodes, measured in the number of edges. The path may or may not pass through the root.\n\nGiven a binary tree, print its diameter.\n\n${TREE_INPUT_NOTE}`,
      constraints: "1 <= number of nodes <= 10^5\n-10^5 <= Node.val <= 10^5\nThe tree may be completely skewed.",
      inputFormat: "One line: the tree in level order (`null` for missing children).",
      outputFormat: "A single integer: the number of edges on the longest path.",
      examples: [
        { input: "1 2 3 4 5", output: "3", explanation: "The path 4 -> 2 -> 1 -> 3 has 3 edges." },
        { input: "1 2", output: "1" },
      ],
      testCases: [
        tc("1 2 3 4 5", "3", false),
        tc("1 2", "1", false),
        tc("1", "0"),
        tc("1 2 null 3 null 4", "3"),
        tc("1 2 null 3 4 5 6 7 8", "4"),
        tc("1 2 3 null null 4 5 6 null null 7", "4"),
        tc("1 2 2 3 3 null null 4 4", "4"),
        tc(serializeTree(CHAIN_RIGHT_50K), String(bruteDiameter(CHAIN_RIGHT_50K))),
        tc(serializeTree(RANDOM_TREE_B), String(bruteDiameter(RANDOM_TREE_B))),
        tc(serializeTree(RANDOM_TREE_A), String(bruteDiameter(RANDOM_TREE_A))),
      ],
      hints: [
        "Any path has a highest node; the longest path through a node uses its deepest left chain plus its deepest right chain.",
        "So compute the height of every subtree and keep the maximum of (leftHeight + rightHeight) over all nodes.",
        "Process nodes bottom-up (reverse BFS order) to avoid deep recursion; with heights in edges, a missing child counts as -1 so that a leaf contributes 0 and a node adds 1 for each existing child.",
      ],
      editorial:
        "Define the height of a node as the number of edges on its longest downward path (an absent child contributes -1). For every node, the longest path whose top is that node has `(leftHeight + 1) + (rightHeight + 1)` edges, and the answer is the maximum over all nodes. Compute heights bottom-up by walking the BFS order in reverse so every child is finished before its parent; this avoids recursion entirely. Time O(n), space O(n).",
      solutions: {
        javascript: code`
          ${JS_BUILD_TREE}

          function solve(input) {
            const root = buildTree(input.trim().split(/\s+/));
            if (!root) return "0";
            const order = [root];
            for (let i = 0; i < order.length; i++) {
              if (order[i].left) order.push(order[i].left);
              if (order[i].right) order.push(order[i].right);
            }
            let best = 0;
            for (let i = order.length - 1; i >= 0; i--) {
              const node = order[i];
              const hl = node.left ? node.left.h : -1;
              const hr = node.right ? node.right.h : -1;
              node.h = Math.max(hl, hr) + 1;
              best = Math.max(best, hl + hr + 2);
            }
            return String(best);
          }
        `,
        python: code`
          ${PY_BUILD_TREE}


          def solve(input_str):
              root = build_tree(input_str.split())
              if root is None:
                  return "0"
              order = [root]
              for node in order:
                  if node.left:
                      order.append(node.left)
                  if node.right:
                      order.append(node.right)
              best = 0
              for node in reversed(order):
                  hl = node.left.h if node.left else -1
                  hr = node.right.h if node.right else -1
                  node.h = max(hl, hr) + 1
                  best = max(best, hl + hr + 2)
              return str(best)
        `,
      },
    },
    {
      title: "Binary Tree Right Side View",
      difficulty: "Medium",
      companies: ["Meta", "Amazon", "Microsoft", "Google", "Uber"],
      description: `Imagine standing on the right side of a binary tree. Print the values of the nodes you can see, ordered from top to bottom: for every level, the visible node is the rightmost one on that level.\n\n${TREE_INPUT_NOTE}`,
      constraints: "1 <= number of nodes <= 10^5\n-10^5 <= Node.val <= 10^5",
      inputFormat: "One line: the tree in level order (`null` for missing children).",
      outputFormat: "Space-separated values of the visible nodes, from the top level to the bottom level.",
      examples: [
        { input: "1 2 3 null 5 null 4", output: "1 3 4" },
        { input: "1 null 3", output: "1 3" },
      ],
      testCases: [
        tc("1 2 3 null 5 null 4", "1 3 4", false),
        tc("1 null 3", "1 3", false),
        tc("1", "1"),
        tc("1 2", "1 2"),
        tc("1 2 3 4", "1 3 4"),
        tc("1 2 3 4 null null null 5", "1 3 4 5"),
        tc(serializeTree(RANDOM_TREE_A), bruteRightView(RANDOM_TREE_A)),
        tc(serializeTree(CHAIN_LEFT_50K), bruteRightView(CHAIN_LEFT_50K)),
        tc(serializeTree(COMPLETE_TREE_15), bruteRightView(COMPLETE_TREE_15)),
      ],
      hints: [
        "On each level, exactly one node is visible: the last one from left to right.",
        "A level-order traversal naturally groups nodes by level.",
        "Process the queue one level at a time and record the last node of every level.",
      ],
      editorial:
        "Do a BFS that handles one level per outer iteration. While iterating over the `size` nodes of the current level, enqueue children left then right; the last node dequeued in that level is the visible one. Collect those values. Time O(n), space O(width).",
      solutions: {
        javascript: code`
          ${JS_BUILD_TREE}

          function solve(input) {
            const root = buildTree(input.trim().split(/\s+/));
            const view = [];
            let level = root ? [root] : [];
            while (level.length) {
              view.push(level[level.length - 1].val);
              const next = [];
              for (const node of level) {
                if (node.left) next.push(node.left);
                if (node.right) next.push(node.right);
              }
              level = next;
            }
            return view.join(" ");
          }
        `,
        python: code`
          ${PY_BUILD_TREE}


          def solve(input_str):
              root = build_tree(input_str.split())
              view = []
              level = [root] if root else []
              while level:
                  view.append(str(level[-1].val))
                  nxt = []
                  for node in level:
                      if node.left:
                          nxt.append(node.left)
                      if node.right:
                          nxt.append(node.right)
                  level = nxt
              return " ".join(view)
        `,
      },
    },
  ],

  bst: [
    {
      title: "Kth Smallest Element in a BST",
      difficulty: "Medium",
      companies: ["Amazon", "Microsoft", "Google", "Meta", "Flipkart"],
      description: `Given the root of a binary search tree and an integer \`k\`, print the k-th smallest value (1-indexed) among all node values in the tree.\n\n${TREE_INPUT_NOTE}`,
      constraints: "1 <= k <= number of nodes <= 10^5\nAll node values are distinct integers.\nThe tree is a valid BST and may be skewed.",
      inputFormat: "Line 1: the BST in level order (`null` for missing children).\nLine 2: the integer `k`.",
      outputFormat: "A single integer: the k-th smallest value.",
      examples: [
        { input: "3 1 4 null 2\n1", output: "1" },
        { input: "5 3 6 2 4 null null 1\n3", output: "3", explanation: "The sorted values are 1 2 3 4 5 6." },
      ],
      testCases: [
        tc("3 1 4 null 2\n1", "1", false),
        tc("5 3 6 2 4 null null 1\n3", "3", false),
        tc("1\n1", "1"),
        tc("2 1 3\n3", "3"),
        tc("5 3 6 2 4 null null 1\n6", "6"),
        tc("5 3 6 2 4 null null 1\n4", "4"),
        tc(serializeTree(CHAIN_RIGHT_50K) + "\n25000", "25000"),
        tc(serializeTree(RANDOM_BST) + "\n1", String(RANDOM_BST_SORTED[0])),
        tc(serializeTree(RANDOM_BST) + "\n17777", String(RANDOM_BST_SORTED[17776])),
        tc(serializeTree(RANDOM_BST) + "\n30000", String(RANDOM_BST_SORTED[29999])),
      ],
      hints: [
        "An in-order traversal of a BST visits the values in ascending order.",
        "You do not need to store all values: stop as soon as you have visited k nodes.",
        "Use an explicit stack for the in-order walk (go left as far as possible, pop, count it, then go right) so a skewed tree cannot overflow the recursion limit.",
      ],
      editorial:
        "Perform an iterative in-order traversal. Keep pushing nodes while moving to the left child; when you cannot go left, pop a node, decrement `k`, and if `k` reaches 0 that node's value is the answer; otherwise continue with its right child. Time O(h + k), space O(h) where h is the tree height.",
      solutions: {
        javascript: code`
          ${JS_BUILD_TREE}

          function solve(input) {
            const lines = input.trim().split("\n");
            const root = buildTree(lines[0].trim().split(/\s+/));
            let k = Number(lines[1]);
            const stack = [];
            let node = root;
            while (node || stack.length) {
              while (node) {
                stack.push(node);
                node = node.left;
              }
              node = stack.pop();
              if (--k === 0) return String(node.val);
              node = node.right;
            }
            return "";
          }
        `,
        python: code`
          ${PY_BUILD_TREE}


          def solve(input_str):
              lines = input_str.strip().split("\n")
              root = build_tree(lines[0].split())
              k = int(lines[1])
              stack = []
              node = root
              while node or stack:
                  while node:
                      stack.append(node)
                      node = node.left
                  node = stack.pop()
                  k -= 1
                  if k == 0:
                      return str(node.val)
                  node = node.right
              return ""
        `,
      },
    },
    {
      title: "Lowest Common Ancestor of a Binary Search Tree",
      difficulty: "Medium",
      companies: ["Amazon", "Microsoft", "Meta", "Google", "Zoho"],
      description: `Given a binary search tree and two different values \`p\` and \`q\` that both exist in the tree, print the value of their lowest common ancestor: the deepest node that has both \`p\` and \`q\` in its subtree (a node counts as a descendant of itself).\n\n${TREE_INPUT_NOTE}`,
      constraints: "2 <= number of nodes <= 10^5\nAll node values are distinct.\np != q, and both values are present in the tree.\nThe tree is a valid BST and may be skewed.",
      inputFormat: "Line 1: the BST in level order (`null` for missing children).\nLine 2: two integers `p q`.",
      outputFormat: "A single integer: the value of the lowest common ancestor.",
      examples: [
        { input: "6 2 8 0 4 7 9 null null 3 5\n2 8", output: "6" },
        { input: "6 2 8 0 4 7 9 null null 3 5\n2 4", output: "2", explanation: "A node may be an ancestor of itself, so 2 is the LCA of 2 and 4." },
      ],
      testCases: [
        tc("6 2 8 0 4 7 9 null null 3 5\n2 8", "6", false),
        tc("6 2 8 0 4 7 9 null null 3 5\n2 4", "2", false),
        tc("2 1\n2 1", "2"),
        tc("6 2 8 0 4 7 9 null null 3 5\n3 5", "4"),
        tc("6 2 8 0 4 7 9 null null 3 5\n0 5", "2"),
        tc("6 2 8 0 4 7 9 null null 3 5\n7 9", "8"),
        tc("6 2 8 0 4 7 9 null null 3 5\n9 3", "6"),
        tc(serializeTree(CHAIN_RIGHT_50K) + "\n49999 50000", "49999"),
        tc(serializeTree(RANDOM_BST) + "\n" + RANDOM_BST.val[29999] + " " + RANDOM_BST.val[17], String(bruteLca(RANDOM_BST, RANDOM_BST.val[29999], RANDOM_BST.val[17]))),
        tc(serializeTree(RANDOM_BST) + "\n" + RANDOM_BST_SORTED[3] + " " + RANDOM_BST_SORTED[29990], String(bruteLca(RANDOM_BST, RANDOM_BST_SORTED[3], RANDOM_BST_SORTED[29990]))),
      ],
      hints: [
        "In a BST, the left subtree holds smaller values and the right subtree holds larger values than the node.",
        "Start at the root. If both p and q are smaller than the current node, the answer is in the left subtree; if both are larger, it is in the right subtree.",
        "The first node where p and q are not on the same side (or one of them equals the node) is the LCA. A simple loop is enough; no recursion is needed.",
      ],
      editorial:
        "Walk down from the root. While both `p` and `q` are smaller than the current value go left; while both are larger go right. The first node that splits them (one value on each side, or equal to one of them) is the lowest common ancestor. This uses the BST ordering instead of searching both subtrees: O(h) time and O(1) extra space.",
      solutions: {
        javascript: code`
          ${JS_BUILD_TREE}

          function solve(input) {
            const lines = input.trim().split("\n");
            let node = buildTree(lines[0].trim().split(/\s+/));
            const [p, q] = lines[1].trim().split(/\s+/).map(Number);
            while (node) {
              if (p < node.val && q < node.val) node = node.left;
              else if (p > node.val && q > node.val) node = node.right;
              else return String(node.val);
            }
            return "";
          }
        `,
        python: code`
          ${PY_BUILD_TREE}


          def solve(input_str):
              lines = input_str.strip().split("\n")
              node = build_tree(lines[0].split())
              p, q = map(int, lines[1].split())
              while node:
                  if p < node.val and q < node.val:
                      node = node.left
                  elif p > node.val and q > node.val:
                      node = node.right
                  else:
                      return str(node.val)
              return ""
        `,
      },
    },
  ],

  heaps: [
    {
      title: "Kth Largest Element in an Array",
      difficulty: "Medium",
      companies: ["Amazon", "Meta", "Google", "Adobe", "Flipkart"],
      description:
        "Given an integer array `nums` and an integer `k`, print the k-th largest element of the array. This is the k-th element in descending sorted order, so duplicates count separately (for `[5, 5, 4]` the 2nd largest is `5`).",
      constraints: "1 <= k <= nums.length <= 10^5\n-10^9 <= nums[i] <= 10^9",
      inputFormat: "Line 1: space-separated integers `nums`.\nLine 2: the integer `k`.",
      outputFormat: "A single integer: the k-th largest element.",
      examples: [
        { input: "3 2 1 5 6 4\n2", output: "5" },
        { input: "3 2 3 1 2 4 5 5 6\n4", output: "4" },
      ],
      testCases: [
        tc("3 2 1 5 6 4\n2", "5", false),
        tc("3 2 3 1 2 4 5 5 6\n4", "4", false),
        tc("1\n1", "1"),
        tc("7 7 7\n2", "7"),
        tc("-1 -5 -3\n3", "-5"),
        tc("5 2 4 1 3 6 0\n7", "0"),
        tc("5 5 4\n2", "5"),
        tc(KTH_LARGEST_NUMS.join(" ") + "\n" + KTH_LARGEST_K, String(KTH_LARGEST_ANSWER)),
        tc(KTH_LARGEST_NUMS.join(" ") + "\n1", String(KTH_LARGEST_NUMS.reduce((a, b) => Math.max(a, b)))),
      ],
      hints: [
        "Sorting the whole array works in O(n log n), but a heap can do better when k is small.",
        "Keep a min-heap that never holds more than k elements: the k largest values seen so far.",
        "After processing every number, the heap's smallest element (its top) is the k-th largest overall.",
      ],
      editorial:
        "Maintain a min-heap of size at most `k`. For each number, push it; if the heap grows beyond `k`, pop the smallest. The heap then always contains the `k` largest values seen so far, and its top is the k-th largest. Time O(n log k), space O(k). (Quickselect gives O(n) on average.)",
      solutions: {
        javascript: code`
          ${JS_HEAP}

          function solve(input) {
            const lines = input.trim().split("\n");
            const nums = lines[0].trim().split(/\s+/).map(Number);
            const k = Number(lines[1]);
            const heap = new Heap((a, b) => a < b);
            for (const x of nums) {
              heap.push(x);
              if (heap.size > k) heap.pop();
            }
            return String(heap.peek());
          }
        `,
        python: code`
          import heapq


          def solve(input_str):
              lines = input_str.strip().split("\n")
              nums = list(map(int, lines[0].split()))
              k = int(lines[1])
              heap = []
              for x in nums:
                  if len(heap) < k:
                      heapq.heappush(heap, x)
                  elif x > heap[0]:
                      heapq.heapreplace(heap, x)
              return str(heap[0])
        `,
      },
    },
    {
      title: "Merge k Sorted Lists",
      difficulty: "Hard",
      companies: ["Amazon", "Google", "Meta", "Microsoft", "Uber"],
      description:
        "You are given `k` lists of integers, each already sorted in ascending order. Merge them into one sorted list and print it. Equal values from different lists all appear in the output.\n\nA list can be empty; an empty list is written as the single word `EMPTY`. If every list is empty, print `EMPTY`.",
      constraints: "1 <= k <= 500\n0 <= length of each list <= 500, and the total number of values is at most 10^5\n-10^5 <= value <= 10^5 (each list is sorted in ascending order)",
      inputFormat: "k lines, one list per line: space-separated integers in ascending order, or the word `EMPTY` for an empty list.",
      outputFormat: "The merged values separated by spaces in ascending order, or `EMPTY` if there are none.",
      examples: [
        { input: "1 4 5\n1 3 4\n2 6", output: "1 1 2 3 4 4 5 6" },
        { input: "1 2 3\nEMPTY\n4 5", output: "1 2 3 4 5" },
      ],
      testCases: [
        tc("1 4 5\n1 3 4\n2 6", "1 1 2 3 4 4 5 6", false),
        tc("1 2 3\nEMPTY\n4 5", "1 2 3 4 5", false),
        tc("EMPTY\nEMPTY", "EMPTY"),
        tc("EMPTY", "EMPTY"),
        tc("5", "5"),
        tc("-3 -1\n-2 0 2\n-5 7", "-5 -3 -2 -1 0 2 7"),
        tc("1 1 1\n1 1", "1 1 1 1 1"),
        tc("10\n9\n8\n7\n6", "6 7 8 9 10"),
        MERGE_K_PERF,
      ],
      hints: [
        "Merging two sorted lists is easy; merging k of them by repeatedly scanning all list heads costs O(k) per output value.",
        "At any moment the next output value is the smallest among the current heads of the k lists.",
        "Keep those heads in a min-heap as (value, listIndex, position). Pop the smallest, output it, and push the next element of the same list.",
      ],
      editorial:
        "Put the first element of every non-empty list into a min-heap, tagged with its list index and position. Repeatedly pop the minimum, append it to the output, and push the following element from the same list if there is one. The heap never holds more than `k` entries, so the total time is O(N log k) for N values in total, with O(k) extra space. If nothing was output, print `EMPTY`.",
      solutions: {
        javascript: code`
          ${JS_HEAP}

          function solve(input) {
            const lists = input.trim().split("\n").map((line) => {
              const text = line.trim();
              return text === "EMPTY" || text === "" ? [] : text.split(/\s+/).map(Number);
            });
            const heap = new Heap((a, b) => a[0] < b[0]);
            lists.forEach((list, i) => {
              if (list.length) heap.push([list[0], i, 0]);
            });
            const out = [];
            while (heap.size) {
              const [value, i, pos] = heap.pop();
              out.push(value);
              if (pos + 1 < lists[i].length) heap.push([lists[i][pos + 1], i, pos + 1]);
            }
            return out.length ? out.join(" ") : "EMPTY";
          }
        `,
        python: code`
          import heapq


          def solve(input_str):
              lists = []
              for line in input_str.strip().split("\n"):
                  text = line.strip()
                  lists.append([] if text in ("EMPTY", "") else list(map(int, text.split())))
              heap = [(lst[0], i, 0) for i, lst in enumerate(lists) if lst]
              heapq.heapify(heap)
              out = []
              while heap:
                  value, i, pos = heapq.heappop(heap)
                  out.append(str(value))
                  if pos + 1 < len(lists[i]):
                      heapq.heappush(heap, (lists[i][pos + 1], i, pos + 1))
              return " ".join(out) if out else "EMPTY"
        `,
      },
    },
    {
      title: "Task Scheduler",
      difficulty: "Medium",
      companies: ["Meta", "Amazon", "Google", "Uber", "Atlassian"],
      description:
        "A CPU must run a list of tasks, each labelled with an uppercase letter. Every task takes exactly one interval, and in each interval the CPU either runs one task or stays idle. Tasks may be run in any order, but two tasks with the same letter must be separated by at least `n` other intervals (tasks or idle time).\n\nPrint the minimum number of intervals needed to finish all tasks.",
      constraints: "1 <= number of tasks <= 10^4\nEach task is an uppercase letter A-Z.\n0 <= n <= 100",
      inputFormat: "Line 1: the tasks written as one string of letters (no spaces).\nLine 2: the cooling interval `n`.",
      outputFormat: "A single integer: the minimum number of intervals.",
      examples: [
        { input: "AAABBB\n2", output: "8", explanation: "A B idle A B idle A B." },
        { input: "AAABBB\n0", output: "6" },
      ],
      testCases: [
        tc("AAABBB\n2", "8", false),
        tc("AAABBB\n0", "6", false),
        tc("AAAAAABCDEFG\n2", "16"),
        tc("A\n5", "1"),
        tc("ABCD\n3", "4"),
        tc("AAAB\n3", "9"),
        tc("AABB\n1", "4"),
        tc("AAABBBCCC\n2", "9"),
        tc("AAAAAAB\n1", "11"),
        tc(TASKS_RANDOM + "\n50", String(taskSchedulerFormula(TASKS_RANDOM, 50))),
        tc(TASKS_RANDOM + "\n2", String(taskSchedulerFormula(TASKS_RANDOM, 2))),
        tc(TASKS_ONE_LETTER + "\n100", String(taskSchedulerFormula(TASKS_ONE_LETTER, 100))),
      ],
      hints: [
        "Always prefer to run the task type that still has the most copies left; it is the hardest to space out.",
        "After running a task type, it must cool down for n intervals. Keep the available types in a max-heap of remaining counts and park cooling types in a queue until they are ready.",
        "If nothing is ready but cooling tasks remain, the CPU idles: jump the clock to the next ready time. (A closed form also exists: max(total tasks, (maxCount - 1) * (n + 1) + number of types with maxCount).)",
      ],
      editorial:
        "Count the occurrences of every letter and put the counts in a max-heap. Simulate time: at each step pop the largest remaining count, run it for one interval (time + 1), and if copies remain place it in a cooldown queue with ready time `time + n`. Before each step release every queued entry whose ready time has arrived back into the heap; when the heap is empty but the queue is not, advance the clock directly to the next ready time (idle intervals). The heap has at most 26 entries, so the time is O(T log 26) for T intervals processed (idle gaps are skipped in one jump).",
      solutions: {
        javascript: code`
          ${JS_HEAP}

          function solve(input) {
            const lines = input.trim().split("\n");
            const tasks = lines[0].trim();
            const n = Number(lines[1]);
            const counts = new Array(26).fill(0);
            for (const ch of tasks) counts[ch.charCodeAt(0) - 65]++;
            const heap = new Heap((a, b) => a > b);
            for (const c of counts) if (c > 0) heap.push(c);
            const cooling = [];
            let head = 0;
            let time = 0;
            while (heap.size || head < cooling.length) {
              if (heap.size === 0 && cooling[head][0] > time) time = cooling[head][0];
              while (head < cooling.length && cooling[head][0] <= time) heap.push(cooling[head++][1]);
              const remaining = heap.pop() - 1;
              time++;
              if (remaining > 0) cooling.push([time + n, remaining]);
            }
            return String(time);
          }
        `,
        python: code`
          import heapq
          from collections import deque


          def solve(input_str):
              lines = input_str.strip().split("\n")
              tasks = lines[0].strip()
              n = int(lines[1])
              counts = {}
              for ch in tasks:
                  counts[ch] = counts.get(ch, 0) + 1
              heap = [-c for c in counts.values()]
              heapq.heapify(heap)
              cooling = deque()
              time = 0
              while heap or cooling:
                  if not heap and cooling[0][0] > time:
                      time = cooling[0][0]
                  while cooling and cooling[0][0] <= time:
                      heapq.heappush(heap, cooling.popleft()[1])
                  remaining = -heapq.heappop(heap) - 1
                  time += 1
                  if remaining > 0:
                      cooling.append((time + n, -remaining))
              return str(time)
        `,
      },
    },
  ],
};
