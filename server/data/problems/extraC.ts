/**
 * Extra interview problems, part C: graphs, recursion, backtracking, greedy and dynamic programming.
 *
 * Large "performance" inputs are generated deterministically below (seeded PRNG). Their expected outputs are either
 * literals (computed offline with independent brute-force programs) or produced by the simple exhaustive helpers in
 * the "independent brute force" section - never by the reference solutions.
 */

import { code, type ProblemSpec } from "../problemHelpers";

// ---------------------------------------------------------------------------------------------
// Deterministic generators
// ---------------------------------------------------------------------------------------------

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

function randomInts(seed: number, length: number, min: number, max: number): number[] {
  const next = seededRandom(seed);
  return Array.from({ length }, () => min + next(max - min + 1));
}

function randomLetters(seed: number, length: number, alphabet: string): string {
  const next = seededRandom(seed);
  return Array.from({ length }, () => alphabet[next(alphabet.length)]).join("");
}

function shuffledRange(seed: number, n: number): number[] {
  const next = seededRandom(seed);
  const values = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = next(i + 1);
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}

/** Course Schedule: a chain over 30000 shuffled course labels plus forward shortcuts (acyclic), optionally closed into a cycle. */
function courseSchedulePerf(closeCycle: boolean): string {
  const n = 30000;
  const order = shuffledRange(31, n);
  const lines = [String(n)];
  for (let i = 0; i + 1 < n; i++) lines.push(`${order[i + 1]} ${order[i]}`);
  for (let i = 0; i + 5 < n; i += 7) lines.push(`${order[i + 5]} ${order[i]}`);
  if (closeCycle) lines.push(`${order[0]} ${order[n - 1]}`);
  return lines.join("\n");
}
const COURSE_SCHEDULE_PERF_OK = courseSchedulePerf(false);
const COURSE_SCHEDULE_PERF_CYCLE = courseSchedulePerf(true);

/** Number of Provinces: 200 cities, each pair connected with probability 0.6%. */
const PROVINCES_PERF = (() => {
  const n = 200;
  const next = seededRandom(32);
  const matrix = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (next(1000) < 6) matrix[i][j] = matrix[j][i] = 1;
    }
  }
  return matrix.map((row) => row.join(" ")).join("\n");
})();

/** Network Delay Time: 1000 nodes, a slow ring that guarantees reachability plus 8000 random directed edges. */
const NETWORK_DELAY_PERF = (() => {
  const n = 1000;
  const next = seededRandom(33);
  const lines = [`${n} 1`];
  for (let i = 1; i <= n; i++) lines.push(`${i} ${(i % n) + 1} ${50 + next(51)}`);
  for (let i = 0; i < 8000; i++) {
    const u = 1 + next(n);
    const v = 1 + next(n);
    if (u !== v) lines.push(`${u} ${v} ${1 + next(100)}`);
  }
  return lines.join("\n");
})();

/** Flood Fill: a 100 x 100 serpentine corridor of 1s (about 5000 cells long) walled in by 0s; the fill starts at one end. */
const FLOOD_FILL_PERF = (() => {
  const size = 100;
  const rows: string[] = [];
  for (let r = 0; r < size; r++) {
    const cells = Array.from({ length: size }, () => 0);
    if (r % 2 === 0) cells.fill(1);
    else cells[r % 4 === 1 ? size - 1 : 0] = 1;
    rows.push(cells.join(" "));
  }
  rows.push("0 0 7");
  return rows.join("\n");
})();

/** Gas Station: 20000 stations; the gas at station 0 is topped up so the circuit is feasible overall. */
const GAS_STATION_PERF = (() => {
  const n = 20000;
  const gas = randomInts(34, n, 0, 100);
  const cost = randomInts(35, n, 0, 100);
  const deficit = cost.reduce((a, b) => a + b, 0) - gas.reduce((a, b) => a + b, 0);
  if (deficit > 0) gas[0] += deficit;
  return gas.join(" ") + "\n" + cost.join(" ");
})();

/** Non-overlapping Intervals: 20000 random short intervals on a line of length 100000. */
const NON_OVERLAP_PERF = (() => {
  const next = seededRandom(36);
  const lines: string[] = [];
  for (let i = 0; i < 20000; i++) {
    const start = next(99900) - 50000;
    lines.push(`${start} ${start + 1 + next(60)}`);
  }
  return lines.join("\n");
})();

/** Partition Labels: 13 blocks of 2000-5000 letters, each block drawn from its own private pair of letters. */
const PARTITION_LABELS_PERF = (() => {
  const next = seededRandom(37);
  const letters = "abcdefghijklmnopqrstuvwxyz";
  const pieces: string[] = [];
  for (let group = 0; group < 13; group++) {
    const pair = letters[2 * group] + letters[2 * group + 1];
    pieces.push(randomLetters(100 + group, 2000 + next(3001), pair));
  }
  return pieces.join("");
})();

const HOUSE_ROBBER_PERF = randomInts(38, 100000, 0, 1000).join(" ");
const LIS_PERF = randomInts(39, 20000, -10000, 10000).join(" ");
const LCS_PERF = `${randomLetters(40, 1500, "abcd")}\n${randomLetters(41, 1500, "abcd")}`;
const KNAPSACK_PERF = (() => {
  const weights = randomInts(42, 200, 1, 100);
  const values = randomInts(43, 200, 1, 1000);
  return `${weights.join(" ")}\n${values.join(" ")}\n3000`;
})();

// Literal expected outputs for the generated cases above (computed offline by independent brute-force programs).
const PROVINCES_PERF_EXPECTED = "99";
const NETWORK_DELAY_PERF_EXPECTED = "172";
const GAS_STATION_PERF_EXPECTED = "2728";
const NON_OVERLAP_PERF_EXPECTED = "15382";
const PARTITION_LABELS_PERF_EXPECTED = "3549 4992 2078 4218 2594 3765 2529 4876 3917 3489 3799 4385 2668";
const HOUSE_ROBBER_PERF_EXPECTED = "29326640";
const LIS_PERF_EXPECTED = "283";
const LCS_PERF_EXPECTED = "975";
const KNAPSACK_PERF_EXPECTED = "66508";

// ---------------------------------------------------------------------------------------------
// Independent brute force (exhaustive enumeration; deliberately different from the reference solutions)
// ---------------------------------------------------------------------------------------------

/** All permutations via Heap's algorithm, then sorted numerically element by element. */
function bruteForcePermutations(values: number[]): string {
  const a = [...values];
  const counters = new Array(a.length).fill(0);
  const result: number[][] = [[...a]];
  let i = 0;
  while (i < a.length) {
    if (counters[i] < i) {
      const j = i % 2 === 0 ? 0 : counters[i];
      [a[j], a[i]] = [a[i], a[j]];
      result.push([...a]);
      counters[i]++;
      i = 0;
    } else {
      counters[i] = 0;
      i++;
    }
  }
  result.sort((x, y) => {
    for (let k = 0; k < x.length; k++) if (x[k] !== y[k]) return x[k] - y[k];
    return 0;
  });
  return result.map((p) => p.join(" ")).join("\n");
}

/** Every bitmask selects a subset of the sorted values; subsets are sorted by (size, elements). */
function bruteForceSubsets(values: number[]): string {
  const sorted = [...values].sort((x, y) => x - y);
  const subsets: number[][] = [];
  for (let mask = 0; mask < 1 << sorted.length; mask++) {
    subsets.push(sorted.filter((_, bit) => (mask >> bit) & 1));
  }
  subsets.sort((x, y) => {
    if (x.length !== y.length) return x.length - y.length;
    for (let k = 0; k < x.length; k++) if (x[k] !== y[k]) return x[k] - y[k];
    return 0;
  });
  return subsets.map((s) => "[" + s.join(" ") + "]").join("\n");
}

/** Enumerates every string of n '(' / ')' pairs as a bit pattern (0 = '(') in increasing numeric = lexicographic order. */
function bruteForceParentheses(n: number): string {
  const length = 2 * n;
  const result: string[] = [];
  for (let mask = 0; mask < 2 ** length; mask++) {
    let text = "";
    let balance = 0;
    let valid = true;
    for (let bit = length - 1; bit >= 0; bit--) {
      const close = (mask >> bit) & 1;
      text += close ? ")" : "(";
      balance += close ? -1 : 1;
      if (balance < 0) {
        valid = false;
        break;
      }
    }
    if (valid && balance === 0) result.push(text);
  }
  return result.join("\n");
}

/** Every subset of cut positions is a candidate partition; keep those whose parts are all palindromes, then sort the printed lines. */
function bruteForcePalindromePartitions(text: string): string {
  const n = text.length;
  const lines: string[] = [];
  for (let mask = 0; mask < 1 << (n - 1); mask++) {
    const parts: string[] = [];
    let start = 0;
    for (let i = 0; i < n - 1; i++) {
      if ((mask >> i) & 1) {
        parts.push(text.slice(start, i + 1));
        start = i + 1;
      }
    }
    parts.push(text.slice(start));
    if (parts.every((p) => p === [...p].reverse().join(""))) lines.push(parts.join(" "));
  }
  lines.sort();
  return lines.join("\n");
}

/** Repeatedly spreads the new colour from filled cells to equal-coloured neighbours until nothing changes (forward and backward sweeps). */
function bruteForceFloodFill(input: string): string {
  const lines = input.trim().split("\n");
  const [sr, sc, color] = lines[lines.length - 1].split(" ").map(Number);
  const grid = lines.slice(0, -1).map((row) => row.split(" ").map(Number));
  const rows = grid.length;
  const cols = grid[0].length;
  const original = grid[sr][sc];
  if (original !== color) {
    const filled = grid.map((row) => row.map(() => false));
    filled[sr][sc] = true;
    let changed = true;
    while (changed) {
      changed = false;
      for (let pass = 0; pass < 2; pass++) {
        for (let a = 0; a < rows; a++) {
          for (let b = 0; b < cols; b++) {
            const r = pass === 0 ? a : rows - 1 - a;
            const c = pass === 0 ? b : cols - 1 - b;
            if (filled[r][c] || grid[r][c] !== original) continue;
            const touches =
              (r > 0 && filled[r - 1][c]) ||
              (r + 1 < rows && filled[r + 1][c]) ||
              (c > 0 && filled[r][c - 1]) ||
              (c + 1 < cols && filled[r][c + 1]);
            if (touches) {
              filled[r][c] = true;
              changed = true;
            }
          }
        }
      }
    }
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (filled[r][c]) grid[r][c] = color;
  }
  return grid.map((row) => row.join(" ")).join("\n");
}

// ---------------------------------------------------------------------------------------------
// Problem specs
// ---------------------------------------------------------------------------------------------

export const EXTRA_C: Record<string, ProblemSpec[]> = {
  graphs: [
    {
      title: "Course Schedule",
      difficulty: "Medium",
      companies: ["Google", "Amazon", "Microsoft", "Meta", "Uber"],
      description:
        "You must take `n` courses, labelled `0` to `n - 1`. Some courses have prerequisites: a pair `a b` means course `b` has to be completed before course `a` can be started.\n\nPrint `true` if it is possible to finish every course, and `false` otherwise (which happens exactly when the prerequisites contain a circular dependency, including a course that requires itself).",
      constraints:
        "1 <= n <= 10^5\n0 <= number of prerequisite pairs <= 10^5\n0 <= a, b < n\nPairs may repeat.",
      inputFormat: "Line 1: the integer `n`.\nThen one prerequisite pair `a b` per line (there may be no such lines at all).",
      outputFormat: "`true` or `false`.",
      examples: [
        { input: "2\n1 0", output: "true", explanation: "Take course 0 first, then course 1." },
        { input: "2\n1 0\n0 1", output: "false", explanation: "Course 1 needs course 0 and course 0 needs course 1: a cycle." },
      ],
      testCases: [
        { input: "2\n1 0", expectedOutput: "true", isHidden: false },
        { input: "2\n1 0\n0 1", expectedOutput: "false", isHidden: false },
        { input: "1", expectedOutput: "true", isHidden: true },
        { input: "4\n1 0\n2 0\n3 1\n3 2", expectedOutput: "true", isHidden: true },
        { input: "3\n1 0\n2 1\n0 2", expectedOutput: "false", isHidden: true },
        { input: "3\n2 2", expectedOutput: "false", isHidden: true },
        { input: "2\n1 0\n1 0", expectedOutput: "true", isHidden: true },
        { input: "5\n1 0\n2 0\n3 1\n4 3\n2 4", expectedOutput: "true", isHidden: true },
        { input: "6\n1 0\n2 1\n4 3\n5 4\n3 5", expectedOutput: "false", isHidden: true },
        { input: COURSE_SCHEDULE_PERF_OK, expectedOutput: "true", isHidden: true },
        { input: COURSE_SCHEDULE_PERF_CYCLE, expectedOutput: "false", isHidden: true },
      ],
      hints: [
        "Model the courses as a directed graph with an edge b -> a for every pair. The answer is `true` exactly when this graph has no cycle.",
        "A course with no unfinished prerequisites can be taken right now. Count each course's prerequisites (its in-degree) and start from those with count 0.",
        "Kahn's algorithm: repeatedly take a course with in-degree 0, 'complete' it by decreasing the in-degree of the courses that depend on it, and queue the ones that reach 0. If you complete all `n` courses the answer is `true`.",
      ],
      editorial:
        "Build the dependency graph (edge b -> a) and the in-degree of every course. Put all courses with in-degree 0 into a queue. Pop a course, and for each course that depends on it decrement its in-degree, queueing it when it reaches 0. Courses on a cycle never reach in-degree 0, so the number of processed courses equals n if and only if the graph is acyclic. Time O(n + p) for p prerequisite pairs, space O(n + p). An iterative approach is preferable to recursive DFS because the dependency chain can be 10^5 courses deep.",
      solutions: {
        javascript: code`
          function solve(input) {
            const lines = input.trim().split("\n");
            const n = Number(lines[0]);
            const adj = Array.from({ length: n }, () => []);
            const indegree = new Array(n).fill(0);
            for (let i = 1; i < lines.length; i++) {
              const text = lines[i].trim();
              if (!text) continue;
              const [a, b] = text.split(/\s+/).map(Number);
              adj[b].push(a);
              indegree[a]++;
            }
            const queue = [];
            for (let i = 0; i < n; i++) if (indegree[i] === 0) queue.push(i);
            let head = 0;
            while (head < queue.length) {
              const course = queue[head++];
              for (const next of adj[course]) {
                if (--indegree[next] === 0) queue.push(next);
              }
            }
            return queue.length === n ? "true" : "false";
          }
        `,
        python: code`
          def solve(input_str):
              lines = input_str.strip().split("\n")
              n = int(lines[0])
              adj = [[] for _ in range(n)]
              indegree = [0] * n
              for line in lines[1:]:
                  if not line.strip():
                      continue
                  a, b = map(int, line.split())
                  adj[b].append(a)
                  indegree[a] += 1
              queue = [i for i in range(n) if indegree[i] == 0]
              head = 0
              while head < len(queue):
                  course = queue[head]
                  head += 1
                  for nxt in adj[course]:
                      indegree[nxt] -= 1
                      if indegree[nxt] == 0:
                          queue.append(nxt)
              return "true" if len(queue) == n else "false"
        `,
      },
    },
    {
      title: "Number of Provinces",
      difficulty: "Medium",
      companies: ["Amazon", "Google", "Microsoft", "Bloomberg", "Flipkart"],
      description:
        "There are `n` cities. Some pairs of cities are directly connected by a road, and connectivity is also transitive through other cities: if city `a` is connected to `b` and `b` to `c`, then `a`, `b` and `c` all belong to the same province.\n\nYou are given an `n x n` matrix `isConnected` where `isConnected[i][j] = 1` means cities `i` and `j` are directly connected and `0` means they are not. Print the number of provinces (groups of mutually reachable cities).",
      constraints: "1 <= n <= 200\nisConnected[i][j] is 0 or 1.\nisConnected[i][i] = 1 and isConnected[i][j] = isConnected[j][i].",
      inputFormat: "`n` lines, one per matrix row, each containing `n` space-separated digits (`0` or `1`). The number of rows is `n`.",
      outputFormat: "The number of provinces.",
      examples: [
        { input: "1 1 0\n1 1 0\n0 0 1", output: "2", explanation: "Cities 0 and 1 form one province; city 2 is alone." },
        { input: "1 0 0\n0 1 0\n0 0 1", output: "3", explanation: "No two cities are connected." },
      ],
      testCases: [
        { input: "1 1 0\n1 1 0\n0 0 1", expectedOutput: "2", isHidden: false },
        { input: "1 0 0\n0 1 0\n0 0 1", expectedOutput: "3", isHidden: false },
        { input: "1", expectedOutput: "1", isHidden: true },
        { input: "1 1 1\n1 1 1\n1 1 1", expectedOutput: "1", isHidden: true },
        { input: "1 1 0 0\n1 1 1 0\n0 1 1 0\n0 0 0 1", expectedOutput: "2", isHidden: true },
        { input: "1 0 0 1\n0 1 1 0\n0 1 1 0\n1 0 0 1", expectedOutput: "2", isHidden: true },
        { input: "1 1 0 0 0\n1 1 1 0 0\n0 1 1 0 0\n0 0 0 1 1\n0 0 0 1 1", expectedOutput: "2", isHidden: true },
        { input: PROVINCES_PERF, expectedOutput: PROVINCES_PERF_EXPECTED, isHidden: true },
      ],
      hints: [
        "Think of the cities as nodes of an undirected graph; a province is a connected component.",
        "Walk the cities in order. Whenever you meet a city that has not been visited, you have found a new province: count it.",
        "Visit everything reachable from that city with DFS/BFS (or merge cities with union-find) so none of them is counted again.",
      ],
      editorial:
        "Count connected components of the graph given by the adjacency matrix. Keep a visited array; for each unvisited city increase the counter and traverse all cities reachable from it with an explicit stack (or BFS). Equivalent: union-find where every connected pair is merged and the answer is the number of distinct roots. Reading the matrix makes every traversal O(n^2) total time and O(n) extra space.",
      solutions: {
        javascript: code`
          function solve(input) {
            const matrix = input.trim().split("\n").map((row) => row.trim().split(/\s+/).map(Number));
            const n = matrix.length;
            const visited = new Array(n).fill(false);
            let provinces = 0;
            for (let start = 0; start < n; start++) {
              if (visited[start]) continue;
              provinces++;
              visited[start] = true;
              const stack = [start];
              while (stack.length) {
                const city = stack.pop();
                for (let other = 0; other < n; other++) {
                  if (matrix[city][other] === 1 && !visited[other]) {
                    visited[other] = true;
                    stack.push(other);
                  }
                }
              }
            }
            return String(provinces);
          }
        `,
        python: code`
          def solve(input_str):
              matrix = [list(map(int, row.split())) for row in input_str.strip().split("\n")]
              n = len(matrix)
              visited = [False] * n
              provinces = 0
              for start in range(n):
                  if visited[start]:
                      continue
                  provinces += 1
                  visited[start] = True
                  stack = [start]
                  while stack:
                      city = stack.pop()
                      for other in range(n):
                          if matrix[city][other] == 1 and not visited[other]:
                              visited[other] = True
                              stack.append(other)
              return str(provinces)
        `,
      },
    },
    {
      title: "Network Delay Time",
      difficulty: "Medium",
      companies: ["Amazon", "Google", "Microsoft", "Uber", "Flipkart"],
      description:
        "A network has `n` nodes labelled `1` to `n`. You are given directed, weighted edges `u v w`: a signal sent from `u` reaches `v` after `w` time units.\n\nA signal is sent from node `k` at time 0 and travels along every outgoing edge it can. Print the time at which the last node receives the signal, i.e. the largest shortest-path distance from `k`. If some node can never receive it, print `-1`.",
      constraints:
        "1 <= k <= n <= 1000\n0 <= number of edges <= 10^4\n1 <= u, v <= n, u != v\n1 <= w <= 100\nParallel edges are allowed.",
      inputFormat: "Line 1: two integers `n k`.\nThen one edge `u v w` per line (there may be no edge lines at all).",
      outputFormat: "A single integer: the time for all nodes to receive the signal, or `-1`.",
      examples: [
        { input: "4 2\n2 1 1\n2 3 1\n3 4 1", output: "2", explanation: "Node 1 and node 3 get the signal at time 1; node 4 gets it at time 2." },
        { input: "2 1\n1 2 1", output: "1" },
      ],
      testCases: [
        { input: "4 2\n2 1 1\n2 3 1\n3 4 1", expectedOutput: "2", isHidden: false },
        { input: "2 1\n1 2 1", expectedOutput: "1", isHidden: false },
        { input: "2 2\n1 2 1", expectedOutput: "-1", isHidden: true },
        { input: "1 1", expectedOutput: "0", isHidden: true },
        { input: "3 1\n1 2 5\n1 3 100\n2 3 10", expectedOutput: "15", isHidden: true },
        { input: "5 1\n1 2 2\n1 3 5\n2 3 1\n3 4 1\n2 5 10", expectedOutput: "12", isHidden: true },
        { input: "4 1\n1 2 1\n3 4 1", expectedOutput: "-1", isHidden: true },
        { input: "3 1\n1 2 9\n1 2 4\n2 3 1\n1 3 20", expectedOutput: "5", isHidden: true },
        { input: "3 2\n1 2 1\n2 3 1", expectedOutput: "-1", isHidden: true },
        { input: NETWORK_DELAY_PERF, expectedOutput: NETWORK_DELAY_PERF_EXPECTED, isHidden: true },
      ],
      hints: [
        "The time a node receives the signal is the length of the shortest path from `k` to it.",
        "All weights are positive, so Dijkstra's algorithm computes every shortest distance from `k`.",
        "After running it, the answer is the maximum distance; if any distance is still infinite, print `-1`.",
      ],
      editorial:
        "Run Dijkstra from node k with a binary min-heap keyed by distance. Skip heap entries whose stored distance is stale. Afterwards take the maximum finite distance; if any node was never reached the answer is -1. Time O((n + m) log n), space O(n + m). Bellman-Ford (O(n * m)) also works within these limits but is slower.",
      solutions: {
        javascript: code`
          function solve(input) {
            const lines = input.trim().split("\n");
            const [n, k] = lines[0].trim().split(/\s+/).map(Number);
            const adj = Array.from({ length: n + 1 }, () => []);
            for (let i = 1; i < lines.length; i++) {
              const text = lines[i].trim();
              if (!text) continue;
              const [u, v, w] = text.split(/\s+/).map(Number);
              adj[u].push([v, w]);
            }
            const dist = new Array(n + 1).fill(Infinity);
            dist[k] = 0;
            const heap = [[0, k]];
            function push(item) {
              heap.push(item);
              let i = heap.length - 1;
              while (i > 0) {
                const parent = (i - 1) >> 1;
                if (heap[parent][0] <= heap[i][0]) break;
                [heap[parent], heap[i]] = [heap[i], heap[parent]];
                i = parent;
              }
            }
            function pop() {
              const top = heap[0];
              const last = heap.pop();
              if (heap.length) {
                heap[0] = last;
                let i = 0;
                for (;;) {
                  const left = 2 * i + 1;
                  const right = left + 1;
                  let smallest = i;
                  if (left < heap.length && heap[left][0] < heap[smallest][0]) smallest = left;
                  if (right < heap.length && heap[right][0] < heap[smallest][0]) smallest = right;
                  if (smallest === i) break;
                  [heap[smallest], heap[i]] = [heap[i], heap[smallest]];
                  i = smallest;
                }
              }
              return top;
            }
            while (heap.length) {
              const [d, u] = pop();
              if (d > dist[u]) continue;
              for (const [v, w] of adj[u]) {
                if (d + w < dist[v]) {
                  dist[v] = d + w;
                  push([dist[v], v]);
                }
              }
            }
            let answer = 0;
            for (let node = 1; node <= n; node++) answer = Math.max(answer, dist[node]);
            return String(answer === Infinity ? -1 : answer);
          }
        `,
        python: code`
          import heapq


          def solve(input_str):
              lines = input_str.strip().split("\n")
              n, k = map(int, lines[0].split())
              adj = [[] for _ in range(n + 1)]
              for line in lines[1:]:
                  if not line.strip():
                      continue
                  u, v, w = map(int, line.split())
                  adj[u].append((v, w))
              dist = [float("inf")] * (n + 1)
              dist[k] = 0
              heap = [(0, k)]
              while heap:
                  d, u = heapq.heappop(heap)
                  if d > dist[u]:
                      continue
                  for v, w in adj[u]:
                      if d + w < dist[v]:
                          dist[v] = d + w
                          heapq.heappush(heap, (dist[v], v))
              answer = max(dist[1:])
              return str(-1 if answer == float("inf") else answer)
        `,
      },
    },
  ],
  recursion: [
    {
      title: "Generate Parentheses",
      difficulty: "Medium",
      companies: ["Google", "Amazon", "Meta", "Microsoft", "Uber"],
      description:
        "Given `n` pairs of parentheses, generate every distinct string of length `2n` that is a well-formed (balanced) sequence of parentheses: each `(` is closed by a later `)` and no prefix contains more `)` than `(`.\n\nPrint the strings in lexicographic (dictionary) order, treating `(` as smaller than `)`.",
      constraints: "1 <= n <= 8",
      inputFormat: "A single integer `n`.",
      outputFormat: "One balanced string per line, in lexicographic order with `(` < `)`.",
      examples: [
        { input: "3", output: "((()))\n(()())\n(())()\n()(())\n()()()" },
        { input: "1", output: "()" },
      ],
      testCases: [
        { input: "3", expectedOutput: "((()))\n(()())\n(())()\n()(())\n()()()", isHidden: false },
        { input: "1", expectedOutput: "()", isHidden: false },
        { input: "2", expectedOutput: "(())\n()()", isHidden: true },
        {
          input: "4",
          expectedOutput:
            "(((())))\n((()()))\n((())())\n((()))()\n(()(()))\n(()()())\n(()())()\n(())(())\n(())()()\n()((()))\n()(()())\n()(())()\n()()(())\n()()()()",
          isHidden: true,
        },
        { input: "8", expectedOutput: bruteForceParentheses(8), isHidden: true },
        { input: "7", expectedOutput: bruteForceParentheses(7), isHidden: true },
      ],
      hints: [
        "Build the string one character at a time. At each step you either add `(` or `)`.",
        "You may add `(` while fewer than `n` have been used, and `)` only while it would not close more than was opened (closed < opened).",
        "Try `(` before `)`: because `(` sorts first, the strings come out already in lexicographic order, and every branch you explore leads to a valid result.",
      ],
      editorial:
        "Backtracking with two counters, open and close. If open < n, append `(` and recurse; if close < open, append `)` and recurse; when the string reaches length 2n it is valid and is recorded. Trying `(` first yields the strings in lexicographic order. No invalid prefix is ever extended, so the work is proportional to the output size: the number of results is the n-th Catalan number C(n) = (2n)! / ((n + 1)! n!), roughly 4^n / n^1.5, and each string costs O(n) to emit.",
      solutions: {
        javascript: code`
          function solve(input) {
            const n = Number(input.trim());
            const result = [];
            const path = [];
            function build(open, close) {
              if (path.length === 2 * n) {
                result.push(path.join(""));
                return;
              }
              if (open < n) {
                path.push("(");
                build(open + 1, close);
                path.pop();
              }
              if (close < open) {
                path.push(")");
                build(open, close + 1);
                path.pop();
              }
            }
            build(0, 0);
            return result.join("\n");
          }
        `,
        python: code`
          def solve(input_str):
              n = int(input_str.strip())
              result = []
              path = []

              def build(open_count, close_count):
                  if len(path) == 2 * n:
                      result.append("".join(path))
                      return
                  if open_count < n:
                      path.append("(")
                      build(open_count + 1, close_count)
                      path.pop()
                  if close_count < open_count:
                      path.append(")")
                      build(open_count, close_count + 1)
                      path.pop()

              build(0, 0)
              return "\n".join(result)
        `,
      },
    },
    {
      title: "Flood Fill",
      difficulty: "Easy",
      companies: ["Amazon", "Google", "Microsoft", "Meta", "Zoho"],
      description:
        "An image is stored as a grid of integers, where each integer is the colour of a pixel. You are given a starting pixel `(sr, sc)` and a new colour `color`.\n\nRecolour the starting pixel and every pixel connected to it through a path of pixels (moving up, down, left or right) that all have the same original colour as the starting pixel. Print the resulting grid. If the starting pixel already has the colour `color`, the image does not change.",
      constraints:
        "1 <= rows, columns <= 100\n0 <= pixel colours, color <= 65535\n0 <= sr < rows, 0 <= sc < columns",
      inputFormat:
        "The grid, one row per line with space-separated integers, followed by a final line with three integers `sr sc color`.",
      outputFormat: "The recoloured grid in the same layout: one row per line, values separated by single spaces.",
      examples: [
        {
          input: "1 1 1\n1 1 0\n1 0 1\n1 1 2",
          output: "2 2 2\n2 2 0\n2 0 1",
          explanation: "The bottom-right 1 is not connected to the filled region by a 4-directional path, so it stays 1.",
        },
        { input: "0 0 0\n0 1 1\n1 1 1", output: "0 0 0\n0 1 1", explanation: "The start pixel already has colour 1, so nothing changes." },
      ],
      testCases: [
        { input: "1 1 1\n1 1 0\n1 0 1\n1 1 2", expectedOutput: "2 2 2\n2 2 0\n2 0 1", isHidden: false },
        { input: "0 0 0\n0 1 1\n1 1 1", expectedOutput: "0 0 0\n0 1 1", isHidden: false },
        { input: "5\n0 0 9", expectedOutput: "9", isHidden: true },
        { input: "1 0\n0 1\n0 0 3", expectedOutput: "3 0\n0 1", isHidden: true },
        { input: "2 2 2\n2 2 2\n1 2 5", expectedOutput: "5 5 5\n5 5 5", isHidden: true },
        { input: "1 1 1 1\n1 0 0 1\n1 0 1 1\n1 1 8", expectedOutput: "1 1 1 1\n1 8 8 1\n1 8 1 1", isHidden: true },
        { input: "1 2 3\n4 2 6\n7 2 9\n2 1 65535", expectedOutput: "1 65535 3\n4 65535 6\n7 65535 9", isHidden: true },
        { input: FLOOD_FILL_PERF, expectedOutput: bruteForceFloodFill(FLOOD_FILL_PERF), isHidden: true },
      ],
      hints: [
        "Remember the colour of the starting pixel before you change anything. If it already equals the new colour, return the image unchanged.",
        "From the start pixel, repeatedly visit its four neighbours that still have the original colour and recolour them.",
        "Recolouring a pixel immediately also marks it as visited, so you never need a separate visited array. Use an explicit stack or queue if the region can be thousands of pixels long.",
      ],
      editorial:
        "Let original be the colour at (sr, sc). If original == color nothing changes (and, importantly, the traversal would otherwise never terminate, because recoloured pixels would still look unvisited). Otherwise run DFS/BFS from the start pixel: paint the pixel with the new colour, and push each in-bounds 4-neighbour whose colour is still original. Each pixel is painted at most once, so time is O(rows * columns) and the explicit stack avoids deep recursion on long snake-like regions.",
      solutions: {
        javascript: code`
          function solve(input) {
            const lines = input.trim().split("\n");
            const [sr, sc, color] = lines[lines.length - 1].trim().split(/\s+/).map(Number);
            const grid = lines.slice(0, -1).map((row) => row.trim().split(/\s+/).map(Number));
            const rows = grid.length;
            const cols = grid[0].length;
            const original = grid[sr][sc];
            if (original !== color) {
              grid[sr][sc] = color;
              const stack = [[sr, sc]];
              while (stack.length) {
                const [r, c] = stack.pop();
                for (const [nr, nc] of [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]]) {
                  if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === original) {
                    grid[nr][nc] = color;
                    stack.push([nr, nc]);
                  }
                }
              }
            }
            return grid.map((row) => row.join(" ")).join("\n");
          }
        `,
        python: code`
          def solve(input_str):
              lines = input_str.strip().split("\n")
              sr, sc, color = map(int, lines[-1].split())
              grid = [list(map(int, row.split())) for row in lines[:-1]]
              rows, cols = len(grid), len(grid[0])
              original = grid[sr][sc]
              if original != color:
                  grid[sr][sc] = color
                  stack = [(sr, sc)]
                  while stack:
                      r, c = stack.pop()
                      for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                          if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == original:
                              grid[nr][nc] = color
                              stack.append((nr, nc))
              return "\n".join(" ".join(map(str, row)) for row in grid)
        `,
      },
    },
  ],
  backtracking: [
    {
      title: "Permutations",
      difficulty: "Medium",
      companies: ["Amazon", "Microsoft", "Meta", "Google", "Zoho"],
      description:
        "Given an array `nums` of distinct integers, print every possible ordering (permutation) of its elements.\n\nThe permutations must be printed in lexicographic order of the sequences: compare two permutations element by element, comparing the numbers by their numeric value (so `-1 < 0 < 10`).",
      constraints: "1 <= nums.length <= 6\n-10 <= nums[i] <= 10\nAll values are distinct.",
      inputFormat: "One line of space-separated integers `nums`.",
      outputFormat: "One permutation per line (elements separated by single spaces), in lexicographic order.",
      examples: [
        { input: "1 2 3", output: "1 2 3\n1 3 2\n2 1 3\n2 3 1\n3 1 2\n3 2 1" },
        { input: "0 1", output: "0 1\n1 0" },
      ],
      testCases: [
        { input: "1 2 3", expectedOutput: "1 2 3\n1 3 2\n2 1 3\n2 3 1\n3 1 2\n3 2 1", isHidden: false },
        { input: "0 1", expectedOutput: "0 1\n1 0", isHidden: false },
        { input: "5", expectedOutput: "5", isHidden: true },
        { input: "3 1 2", expectedOutput: "1 2 3\n1 3 2\n2 1 3\n2 3 1\n3 1 2\n3 2 1", isHidden: true },
        { input: "-1 0 10", expectedOutput: "-1 0 10\n-1 10 0\n0 -1 10\n0 10 -1\n10 -1 0\n10 0 -1", isHidden: true },
        { input: "4 3 2 1", expectedOutput: bruteForcePermutations([4, 3, 2, 1]), isHidden: true },
        { input: "-10 7 0 3 -4 10", expectedOutput: bruteForcePermutations([-10, 7, 0, 3, -4, 10]), isHidden: true },
      ],
      hints: [
        "Build a permutation position by position: at each position choose any element that has not been used yet.",
        "Keep a `used` flag per element; after exploring a choice, undo it (mark unused, remove it from the current path) and try the next element.",
        "Sort the numbers first and always try the candidates in increasing order: the permutations are then produced in lexicographic order automatically.",
      ],
      editorial:
        "Sort the array, then use backtracking: path holds the chosen prefix, used[i] marks elements already in it. At depth n the path is a complete permutation. Iterating candidates in sorted order and recursing into each unused one emits permutations in lexicographic order, since the smallest possible element is always tried first at every position. There are n! results, each costing O(n) to copy, so time O(n * n!) and extra space O(n) for the recursion.",
      solutions: {
        javascript: code`
          function solve(input) {
            const nums = input.trim().split(/\s+/).map(Number).sort((a, b) => a - b);
            const n = nums.length;
            const used = new Array(n).fill(false);
            const path = [];
            const result = [];
            function backtrack() {
              if (path.length === n) {
                result.push(path.join(" "));
                return;
              }
              for (let i = 0; i < n; i++) {
                if (used[i]) continue;
                used[i] = true;
                path.push(nums[i]);
                backtrack();
                path.pop();
                used[i] = false;
              }
            }
            backtrack();
            return result.join("\n");
          }
        `,
        python: code`
          def solve(input_str):
              nums = sorted(map(int, input_str.split()))
              n = len(nums)
              used = [False] * n
              path = []
              result = []

              def backtrack():
                  if len(path) == n:
                      result.append(" ".join(map(str, path)))
                      return
                  for i in range(n):
                      if used[i]:
                          continue
                      used[i] = True
                      path.append(nums[i])
                      backtrack()
                      path.pop()
                      used[i] = False

              backtrack()
              return "\n".join(result)
        `,
      },
    },
    {
      title: "Subsets",
      difficulty: "Medium",
      companies: ["Amazon", "Meta", "Google", "Microsoft", "Infosys"],
      description:
        "Given an array `nums` of distinct integers, print all of its subsets (the power set), including the empty subset and the full set.\n\nPrint each subset on its own line as its elements in ascending order, separated by single spaces, wrapped in square brackets (the empty subset is `[]`). The subsets themselves must be ordered by size first (smaller subsets first); subsets of equal size are ordered lexicographically by their elements, comparing numbers by value.",
      constraints: "1 <= nums.length <= 10\n-10 <= nums[i] <= 10\nAll values are distinct.",
      inputFormat: "One line of space-separated integers `nums` (in any order).",
      outputFormat: "`2^n` lines, one subset per line formatted like `[]`, `[2]`, `[1 3]`, in the order described above.",
      examples: [
        { input: "1 2 3", output: "[]\n[1]\n[2]\n[3]\n[1 2]\n[1 3]\n[2 3]\n[1 2 3]" },
        { input: "0", output: "[]\n[0]" },
      ],
      testCases: [
        { input: "1 2 3", expectedOutput: "[]\n[1]\n[2]\n[3]\n[1 2]\n[1 3]\n[2 3]\n[1 2 3]", isHidden: false },
        { input: "0", expectedOutput: "[]\n[0]", isHidden: false },
        { input: "3 1 2", expectedOutput: "[]\n[1]\n[2]\n[3]\n[1 2]\n[1 3]\n[2 3]\n[1 2 3]", isHidden: true },
        { input: "-1 5", expectedOutput: "[]\n[-1]\n[5]\n[-1 5]", isHidden: true },
        { input: "10 2 -3", expectedOutput: "[]\n[-3]\n[2]\n[10]\n[-3 2]\n[-3 10]\n[2 10]\n[-3 2 10]", isHidden: true },
        {
          input: "4 1 3 2",
          expectedOutput:
            "[]\n[1]\n[2]\n[3]\n[4]\n[1 2]\n[1 3]\n[1 4]\n[2 3]\n[2 4]\n[3 4]\n[1 2 3]\n[1 2 4]\n[1 3 4]\n[2 3 4]\n[1 2 3 4]",
          isHidden: true,
        },
        { input: "9 -7 4 0 -2 10 3 -10 6 1", expectedOutput: bruteForceSubsets([9, -7, 4, 0, -2, 10, 3, -10, 6, 1]), isHidden: true },
      ],
      hints: [
        "For every element there are exactly two choices: it is in the subset or it is not.",
        "Sort the numbers first. To generate subsets of exactly size `k`, choose elements in increasing index order, so each subset is built only once and already ascending.",
        "Loop `k` from 0 to n and, for each `k`, run the backtracking that picks `k` elements in increasing index order: this yields the required order (size first, then lexicographic).",
      ],
      editorial:
        "Sort the array. For each target size k = 0..n, run a backtracking routine choose(start, path) that appends nums[i] for i = start..n-1 and recurses with start = i + 1 until the path has k elements. Picking indices in increasing order produces each k-element subset exactly once, with elements ascending, and visiting the candidates in order emits equal-size subsets lexicographically. Total work is O(n * 2^n) because there are 2^n subsets of length up to n.",
      solutions: {
        javascript: code`
          function solve(input) {
            const nums = input.trim().split(/\s+/).map(Number).sort((a, b) => a - b);
            const n = nums.length;
            const result = [];
            const path = [];
            function choose(start, size) {
              if (path.length === size) {
                result.push("[" + path.join(" ") + "]");
                return;
              }
              for (let i = start; i < n; i++) {
                path.push(nums[i]);
                choose(i + 1, size);
                path.pop();
              }
            }
            for (let size = 0; size <= n; size++) choose(0, size);
            return result.join("\n");
          }
        `,
        python: code`
          def solve(input_str):
              nums = sorted(map(int, input_str.split()))
              n = len(nums)
              result = []
              path = []

              def choose(start, size):
                  if len(path) == size:
                      result.append("[" + " ".join(map(str, path)) + "]")
                      return
                  for i in range(start, n):
                      path.append(nums[i])
                      choose(i + 1, size)
                      path.pop()

              for size in range(n + 1):
                  choose(0, size)
              return "\n".join(result)
        `,
      },
    },
    {
      title: "Palindrome Partitioning",
      difficulty: "Medium",
      companies: ["Amazon", "Google", "Meta", "Microsoft"],
      description:
        "Given a string `s`, split it into consecutive non-empty pieces so that every piece is a palindrome. Print every possible way to do this.\n\nPrint each partition on its own line with its pieces separated by a single space. Sort the lines in ascending ASCII order (plain dictionary order of the printed lines). Since a space sorts before any letter, this is the same as listing partitions whose first piece is shorter first, and so on recursively.",
      constraints: "1 <= s.length <= 16\n`s` consists of lowercase English letters.\nThe output has fewer than 2^15 lines.",
      inputFormat: "One line containing the string `s`.",
      outputFormat: "One partition per line (pieces separated by single spaces), in ascending ASCII order of the lines.",
      examples: [
        { input: "aab", output: "a a b\naa b", explanation: "`aab` can be cut as a|a|b or aa|b. The other cuts (a|ab and aab) contain a piece that is not a palindrome." },
        { input: "a", output: "a" },
      ],
      testCases: [
        { input: "aab", expectedOutput: "a a b\naa b", isHidden: false },
        { input: "a", expectedOutput: "a", isHidden: false },
        { input: "aaa", expectedOutput: "a a a\na aa\naa a\naaa", isHidden: true },
        { input: "abc", expectedOutput: "a b c", isHidden: true },
        { input: "racecar", expectedOutput: "r a c e c a r\nr a cec a r\nr aceca r\nracecar", isHidden: true },
        { input: "abba", expectedOutput: "a b b a\na bb a\nabba", isHidden: true },
        { input: "aabb", expectedOutput: "a a b b\na a bb\naa b b\naa bb", isHidden: true },
        { input: "aaaaaaaaaaaa", expectedOutput: bruteForcePalindromePartitions("aaaaaaaaaaaa"), isHidden: true },
        { input: "abacabacabaa", expectedOutput: bruteForcePalindromePartitions("abacabacabaa"), isHidden: true },
      ],
      hints: [
        "A partition starts with some palindromic prefix. Try every prefix s[0..i] that is a palindrome, then partition the rest of the string the same way.",
        "Backtrack: keep the pieces chosen so far; when the start index reaches the end of the string, print the pieces as one answer.",
        "Trying shorter prefixes before longer ones produces the lines in the required order. Precompute `isPal[i][j]` once so each palindrome test is O(1).",
      ],
      editorial:
        "Precompute a table isPal[i][j] (substring s[i..j] is a palindrome) with the usual expansion DP: isPal[i][j] = s[i] == s[j] && (j - i < 2 || isPal[i + 1][j - 1]). Then backtrack over the start index: for end = start..n-1, if isPal[start][end] append s[start..end] and recurse from end + 1; when start == n record the pieces joined by spaces. Because shorter first pieces are tried first, and a space sorts before any letter, the lines appear in ascending ASCII order. Time is O(n * 2^n) in the worst case (a string like `aaaa...` has 2^(n-1) partitions).",
      solutions: {
        javascript: code`
          function solve(input) {
            const s = input.trim();
            const n = s.length;
            const isPal = Array.from({ length: n }, () => new Array(n).fill(false));
            for (let i = n - 1; i >= 0; i--) {
              for (let j = i; j < n; j++) {
                isPal[i][j] = s[i] === s[j] && (j - i < 2 || isPal[i + 1][j - 1]);
              }
            }
            const result = [];
            const pieces = [];
            function backtrack(start) {
              if (start === n) {
                result.push(pieces.join(" "));
                return;
              }
              for (let end = start; end < n; end++) {
                if (!isPal[start][end]) continue;
                pieces.push(s.slice(start, end + 1));
                backtrack(end + 1);
                pieces.pop();
              }
            }
            backtrack(0);
            return result.join("\n");
          }
        `,
        python: code`
          def solve(input_str):
              s = input_str.strip()
              n = len(s)
              is_pal = [[False] * n for _ in range(n)]
              for i in range(n - 1, -1, -1):
                  for j in range(i, n):
                      is_pal[i][j] = s[i] == s[j] and (j - i < 2 or is_pal[i + 1][j - 1])
              result = []
              pieces = []

              def backtrack(start):
                  if start == n:
                      result.append(" ".join(pieces))
                      return
                  for end in range(start, n):
                      if not is_pal[start][end]:
                          continue
                      pieces.append(s[start:end + 1])
                      backtrack(end + 1)
                      pieces.pop()

              backtrack(0)
              return "\n".join(result)
        `,
      },
    },
  ],
  greedy: [
    {
      title: "Gas Station",
      difficulty: "Medium",
      companies: ["Amazon", "Google", "Bloomberg", "Flipkart"],
      description:
        "There are `n` gas stations arranged on a circular route. Station `i` gives you `gas[i]` units of fuel, and driving from station `i` to station `i + 1` (wrapping from the last station back to station 0) costs `cost[i]` units. Your tank is empty and unlimited in size at the start, and you fill up at every station you reach (including the starting one).\n\nPrint the index of a station from which you can complete one full lap in the clockwise direction without the tank ever going below zero, or `-1` if no such station exists. If several stations work, print the smallest index.",
      constraints: "1 <= n <= 10^5\n0 <= gas[i], cost[i] <= 10^4",
      inputFormat: "Line 1: `n` space-separated integers `gas`.\nLine 2: `n` space-separated integers `cost`.",
      outputFormat: "The smallest valid starting index, or `-1`.",
      examples: [
        {
          input: "1 2 3 4 5\n3 4 5 1 2",
          output: "3",
          explanation: "Start at station 3: tank 4, then 4 - 1 + 5 = 8, 8 - 2 + 1 = 7, 7 - 3 + 2 = 6, 6 - 4 + 3 = 5, 5 - 5 + 4 = 4, back at station 3 with fuel left.",
        },
        { input: "2 3 4\n3 4 3", output: "-1", explanation: "Total fuel 9 is smaller than the total cost 10, so no start works." },
      ],
      testCases: [
        { input: "1 2 3 4 5\n3 4 5 1 2", expectedOutput: "3", isHidden: false },
        { input: "2 3 4\n3 4 3", expectedOutput: "-1", isHidden: false },
        { input: "5\n4", expectedOutput: "0", isHidden: true },
        { input: "1\n2", expectedOutput: "-1", isHidden: true },
        { input: "1 1\n1 1", expectedOutput: "0", isHidden: true },
        { input: "5 1 2 3 4\n4 4 1 5 1", expectedOutput: "4", isHidden: true },
        { input: "3 1 1\n1 2 2", expectedOutput: "0", isHidden: true },
        { input: "0 0 5\n1 1 1", expectedOutput: "2", isHidden: true },
        { input: GAS_STATION_PERF, expectedOutput: GAS_STATION_PERF_EXPECTED, isHidden: true },
      ],
      hints: [
        "If the total gas is smaller than the total cost, no station can work. Otherwise a valid start exists.",
        "Let `gain[i] = gas[i] - cost[i]`. Simulate a trip from station 0, tracking the tank. When the tank would become negative at some station, none of the stations passed since the last start can be a valid start.",
        "So restart: set the candidate start to the next station and reset the tank to 0. After one pass the candidate (when total gas >= total cost) is the answer.",
      ],
      editorial:
        "Compute gain[i] = gas[i] - cost[i]. If sum(gain) < 0 the answer is -1. Otherwise scan once, keeping tank and candidate start: add gain[i] to tank; if tank < 0, then no station in [start, i] can be a valid start (any such station j would have reached station i with a prefix at least as bad as starting from start, because the portion from start to j - 1 had a non-negative balance), so set start = i + 1 and tank = 0. Since total gain is non-negative, the final candidate completes the circle. Because the candidate only moves after a failure, it is also the smallest valid start. Time O(n), space O(1).",
      solutions: {
        javascript: code`
          function solve(input) {
            const lines = input.trim().split("\n");
            const gas = lines[0].trim().split(/\s+/).map(Number);
            const cost = lines[1].trim().split(/\s+/).map(Number);
            let total = 0;
            let tank = 0;
            let start = 0;
            for (let i = 0; i < gas.length; i++) {
              const gain = gas[i] - cost[i];
              total += gain;
              tank += gain;
              if (tank < 0) {
                start = i + 1;
                tank = 0;
              }
            }
            return String(total >= 0 ? start : -1);
          }
        `,
        python: code`
          def solve(input_str):
              lines = input_str.strip().split("\n")
              gas = list(map(int, lines[0].split()))
              cost = list(map(int, lines[1].split()))
              total = 0
              tank = 0
              start = 0
              for i in range(len(gas)):
                  gain = gas[i] - cost[i]
                  total += gain
                  tank += gain
                  if tank < 0:
                      start = i + 1
                      tank = 0
              return str(start if total >= 0 else -1)
        `,
      },
    },
    {
      title: "Non-overlapping Intervals",
      difficulty: "Medium",
      companies: ["Amazon", "Google", "Meta", "Uber", "Microsoft"],
      description:
        "You are given a list of intervals `[start, end]`. Two intervals overlap if they share an interior point; intervals that merely touch at an endpoint (like `[1, 2]` and `[2, 3]`) do not overlap.\n\nPrint the minimum number of intervals you must remove so that the remaining intervals are pairwise non-overlapping.",
      constraints: "1 <= number of intervals <= 10^5\n-5 * 10^4 <= start < end <= 5 * 10^4",
      inputFormat: "One interval per line, given as two integers `start end`.",
      outputFormat: "The minimum number of intervals to remove.",
      examples: [
        { input: "1 2\n2 3\n3 4\n1 3", output: "1", explanation: "Removing [1, 3] leaves [1, 2], [2, 3], [3, 4], which do not overlap." },
        { input: "1 2\n1 2\n1 2", output: "2", explanation: "Keep one of the three identical intervals." },
      ],
      testCases: [
        { input: "1 2\n2 3\n3 4\n1 3", expectedOutput: "1", isHidden: false },
        { input: "1 2\n1 2\n1 2", expectedOutput: "2", isHidden: false },
        { input: "1 2\n2 3", expectedOutput: "0", isHidden: true },
        { input: "5 8", expectedOutput: "0", isHidden: true },
        { input: "1 100\n11 22\n1 11\n2 12", expectedOutput: "2", isHidden: true },
        { input: "-5 -2\n-3 0\n-1 3\n2 4", expectedOutput: "2", isHidden: true },
        { input: "1 10\n2 3\n4 5\n6 7", expectedOutput: "1", isHidden: true },
        { input: NON_OVERLAP_PERF, expectedOutput: NON_OVERLAP_PERF_EXPECTED, isHidden: true },
      ],
      hints: [
        "Minimising removals is the same as maximising the number of intervals you keep.",
        "Among intervals competing for the same time, the one that finishes earliest leaves the most room for the rest.",
        "Sort by end point. Keep an interval if its start is at least the end of the last kept interval; otherwise it overlaps, so count it as removed.",
      ],
      editorial:
        "This is classic interval scheduling. Sort the intervals by end. Greedily keep the interval with the smallest end, then keep every next interval whose start >= the end of the last kept one; all others are removed. Choosing the earliest finishing interval can never hurt: any optimal schedule can be exchanged to start with it, leaving at least as much room. Answer = total - kept. Time O(n log n), space O(n).",
      solutions: {
        javascript: code`
          function solve(input) {
            const intervals = input
              .trim()
              .split("\n")
              .map((line) => line.trim().split(/\s+/).map(Number))
              .sort((a, b) => a[1] - b[1] || a[0] - b[0]);
            let kept = 0;
            let lastEnd = -Infinity;
            for (const [start, end] of intervals) {
              if (start >= lastEnd) {
                kept++;
                lastEnd = end;
              }
            }
            return String(intervals.length - kept);
          }
        `,
        python: code`
          def solve(input_str):
              intervals = [tuple(map(int, line.split())) for line in input_str.strip().split("\n")]
              intervals.sort(key=lambda iv: (iv[1], iv[0]))
              kept = 0
              last_end = float("-inf")
              for start, end in intervals:
                  if start >= last_end:
                      kept += 1
                      last_end = end
              return str(len(intervals) - kept)
        `,
      },
    },
    {
      title: "Partition Labels",
      difficulty: "Medium",
      companies: ["Amazon", "Google", "Microsoft", "Flipkart"],
      description:
        "Given a string `s` of lowercase letters, cut it into as many consecutive parts as possible so that every letter appears in at most one part.\n\nPrint the sizes of the parts, in order, separated by single spaces.",
      constraints: "1 <= s.length <= 10^5\n`s` consists of lowercase English letters.",
      inputFormat: "One line containing the string `s`.",
      outputFormat: "The sizes of the parts from left to right, space-separated.",
      examples: [
        {
          input: "ababcbacadefegdehijhklij",
          output: "9 7 8",
          explanation: "The parts are `ababcbaca`, `defegde` and `hijhklij`; no letter occurs in two parts.",
        },
        { input: "eccbbbbdec", output: "10", explanation: "`e` appears at both ends, so the whole string must be one part." },
      ],
      testCases: [
        { input: "ababcbacadefegdehijhklij", expectedOutput: "9 7 8", isHidden: false },
        { input: "eccbbbbdec", expectedOutput: "10", isHidden: false },
        { input: "a", expectedOutput: "1", isHidden: true },
        { input: "abc", expectedOutput: "1 1 1", isHidden: true },
        { input: "abab", expectedOutput: "4", isHidden: true },
        { input: "caedbdedda", expectedOutput: "1 9", isHidden: true },
        { input: "aaabbbccc", expectedOutput: "3 3 3", isHidden: true },
        { input: PARTITION_LABELS_PERF, expectedOutput: PARTITION_LABELS_PERF_EXPECTED, isHidden: true },
      ],
      hints: [
        "A part that contains a letter must reach at least as far as the last occurrence of that letter.",
        "Precompute the last index of each letter. Then sweep the string while tracking the farthest last occurrence of any letter seen in the current part.",
        "When the sweep index reaches that farthest point, the part is closed: record its size and start a new part.",
      ],
      editorial:
        "Record last[c], the final index of each letter. Sweep i from left to right, maintaining `end` = max(last[s[i]]) over the current part and `start` = its first index. When i == end, every letter seen so far has all its occurrences inside [start, end], so the part can be cut here: output end - start + 1 and begin the next part at i + 1. Cutting at the first possible moment maximises the number of parts. Time O(n), space O(1) (26 letters).",
      solutions: {
        javascript: code`
          function solve(input) {
            const s = input.trim();
            const last = {};
            for (let i = 0; i < s.length; i++) last[s[i]] = i;
            const sizes = [];
            let start = 0;
            let end = 0;
            for (let i = 0; i < s.length; i++) {
              end = Math.max(end, last[s[i]]);
              if (i === end) {
                sizes.push(end - start + 1);
                start = i + 1;
              }
            }
            return sizes.join(" ");
          }
        `,
        python: code`
          def solve(input_str):
              s = input_str.strip()
              last = {ch: i for i, ch in enumerate(s)}
              sizes = []
              start = end = 0
              for i, ch in enumerate(s):
                  end = max(end, last[ch])
                  if i == end:
                      sizes.append(end - start + 1)
                      start = i + 1
              return " ".join(map(str, sizes))
        `,
      },
    },
  ],
  dp: [
    {
      title: "House Robber",
      difficulty: "Medium",
      companies: ["Amazon", "Google", "Microsoft", "Zoho", "TCS"],
      description:
        "A row of houses lies along a street, and house `i` contains `nums[i]` rupees. You may rob any set of houses, but never two houses that are next to each other, because adjacent houses share an alarm system.\n\nPrint the maximum amount you can rob.",
      constraints: "1 <= nums.length <= 10^5\n0 <= nums[i] <= 1000",
      inputFormat: "One line of space-separated integers `nums`.",
      outputFormat: "The maximum amount that can be robbed.",
      examples: [
        { input: "1 2 3 1", output: "4", explanation: "Rob houses 0 and 2: 1 + 3 = 4." },
        { input: "2 7 9 3 1", output: "12", explanation: "Rob houses 0, 2 and 4: 2 + 9 + 1 = 12." },
      ],
      testCases: [
        { input: "1 2 3 1", expectedOutput: "4", isHidden: false },
        { input: "2 7 9 3 1", expectedOutput: "12", isHidden: false },
        { input: "5", expectedOutput: "5", isHidden: true },
        { input: "2 1", expectedOutput: "2", isHidden: true },
        { input: "0 0 0", expectedOutput: "0", isHidden: true },
        { input: "1 3 1 3 100", expectedOutput: "103", isHidden: true },
        { input: "100 1 1 100", expectedOutput: "200", isHidden: true },
        { input: "4 1 2 7 5 3 1", expectedOutput: "14", isHidden: true },
        { input: HOUSE_ROBBER_PERF, expectedOutput: HOUSE_ROBBER_PERF_EXPECTED, isHidden: true },
      ],
      hints: [
        "For each house you either rob it or skip it. If you rob house i you cannot have robbed house i - 1.",
        "Let best[i] be the maximum for the first i + 1 houses: best[i] = max(best[i - 1], best[i - 2] + nums[i]).",
        "Only the last two values are ever needed, so two variables are enough instead of a whole array.",
      ],
      editorial:
        "Define best(i) as the maximum loot from houses 0..i. The i-th house is either skipped (best(i - 1)) or robbed (nums[i] + best(i - 2)), so best(i) = max(best(i - 1), best(i - 2) + nums[i]) with best of an empty prefix equal to 0. The recurrence only looks back two steps, so keep two rolling variables. Time O(n), space O(1). Plain recursion without memoisation repeats work exponentially.",
      solutions: {
        javascript: code`
          function solve(input) {
            const nums = input.trim().split(/\s+/).map(Number);
            let skip = 0;
            let take = 0;
            for (const value of nums) {
              const next = Math.max(take, skip + value);
              skip = take;
              take = next;
            }
            return String(take);
          }
        `,
        python: code`
          def solve(input_str):
              nums = list(map(int, input_str.split()))
              skip, take = 0, 0
              for value in nums:
                  skip, take = take, max(take, skip + value)
              return str(take)
        `,
      },
    },
    {
      title: "Longest Increasing Subsequence",
      difficulty: "Medium",
      companies: ["Amazon", "Google", "Microsoft", "Flipkart", "Goldman Sachs"],
      description:
        "Given an integer array `nums`, print the length of its longest strictly increasing subsequence. A subsequence keeps the original order of elements but may skip any of them (it does not need to be contiguous).",
      constraints: "1 <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4",
      inputFormat: "One line of space-separated integers `nums`.",
      outputFormat: "The length of the longest strictly increasing subsequence.",
      examples: [
        { input: "10 9 2 5 3 7 101 18", output: "4", explanation: "One longest subsequence is 2, 3, 7, 18 (or 2, 5, 7, 101)." },
        { input: "0 1 0 3 2 3", output: "4", explanation: "For example 0, 1, 2, 3." },
      ],
      testCases: [
        { input: "10 9 2 5 3 7 101 18", expectedOutput: "4", isHidden: false },
        { input: "0 1 0 3 2 3", expectedOutput: "4", isHidden: false },
        { input: "7 7 7 7 7 7 7", expectedOutput: "1", isHidden: true },
        { input: "5", expectedOutput: "1", isHidden: true },
        { input: "4 3 2 1", expectedOutput: "1", isHidden: true },
        { input: "1 2 3 4 5", expectedOutput: "5", isHidden: true },
        { input: "-5 -4 -1 -3 0", expectedOutput: "4", isHidden: true },
        { input: "3 5 6 2 5 4 19 5 6 7 12", expectedOutput: "6", isHidden: true },
        { input: LIS_PERF, expectedOutput: LIS_PERF_EXPECTED, isHidden: true },
      ],
      hints: [
        "A simple DP: dp[i] = length of the longest increasing subsequence ending at i, equal to 1 + max(dp[j]) over j < i with nums[j] < nums[i]. That is O(n^2), too slow for n = 10^5.",
        "Keep an array `tails` where tails[k] is the smallest possible last element of an increasing subsequence of length k + 1. It is always sorted.",
        "For each number, binary search for the first tail that is >= the number and replace it (or append the number if all tails are smaller). The final size of `tails` is the answer.",
      ],
      editorial:
        "Patience-sorting style solution. Maintain tails (sorted); tails[k] is the smallest tail value of any increasing subsequence of length k + 1 seen so far. For each x, find by binary search the first index with tails[idx] >= x: replace it with x, or append x if none exists (strictness comes from using >= when searching). Replacing keeps tails small, which can only help future extensions. The length of tails is the LIS length (the array itself is not necessarily a valid subsequence). Time O(n log n), space O(n). The O(n^2) DP is correct but too slow for the largest inputs.",
      solutions: {
        javascript: code`
          function solve(input) {
            const nums = input.trim().split(/\s+/).map(Number);
            const tails = [];
            for (const x of nums) {
              let lo = 0;
              let hi = tails.length;
              while (lo < hi) {
                const mid = (lo + hi) >> 1;
                if (tails[mid] < x) lo = mid + 1;
                else hi = mid;
              }
              tails[lo] = x;
            }
            return String(tails.length);
          }
        `,
        python: code`
          from bisect import bisect_left


          def solve(input_str):
              nums = list(map(int, input_str.split()))
              tails = []
              for x in nums:
                  idx = bisect_left(tails, x)
                  if idx == len(tails):
                      tails.append(x)
                  else:
                      tails[idx] = x
              return str(len(tails))
        `,
      },
    },
    {
      title: "Longest Common Subsequence",
      difficulty: "Medium",
      companies: ["Amazon", "Google", "Microsoft", "Goldman Sachs", "Oracle"],
      description:
        "Given two strings `a` and `b`, print the length of their longest common subsequence: the longest string that can be obtained from both `a` and `b` by deleting some characters (possibly none) without changing the order of the remaining ones. Print `0` if they share no character.",
      constraints: "1 <= a.length, b.length <= 2000\n`a` and `b` consist of lowercase English letters.",
      inputFormat: "Line 1: the string `a`.\nLine 2: the string `b`.",
      outputFormat: "The length of the longest common subsequence.",
      examples: [
        { input: "abcde\nace", output: "3", explanation: "The longest common subsequence is `ace`." },
        { input: "abc\ndef", output: "0" },
      ],
      testCases: [
        { input: "abcde\nace", expectedOutput: "3", isHidden: false },
        { input: "abc\ndef", expectedOutput: "0", isHidden: false },
        { input: "a\na", expectedOutput: "1", isHidden: true },
        { input: "abc\nabc", expectedOutput: "3", isHidden: true },
        { input: "abcba\nabcbcba", expectedOutput: "5", isHidden: true },
        { input: "aggtab\ngxtxayb", expectedOutput: "4", isHidden: true },
        { input: "abc\ncba", expectedOutput: "1", isHidden: true },
        { input: LCS_PERF, expectedOutput: LCS_PERF_EXPECTED, isHidden: true },
      ],
      hints: [
        "Let f(i, j) be the answer for the first i characters of `a` and the first j characters of `b`.",
        "If a[i - 1] == b[j - 1] the two characters can be matched: f(i, j) = f(i - 1, j - 1) + 1. Otherwise f(i, j) = max(f(i - 1, j), f(i, j - 1)).",
        "Fill the table row by row. Each row depends only on the previous one, so two rows are enough. Plain recursion without memoisation is exponential.",
      ],
      editorial:
        "Classic 2-D DP. dp[i][j] = LCS length of a[0..i) and b[0..j). When the last characters match, extend the diagonal: dp[i][j] = dp[i - 1][j - 1] + 1; otherwise drop the last character of one of the strings: dp[i][j] = max(dp[i - 1][j], dp[i][j - 1]). Base case: dp[0][*] = dp[*][0] = 0. The answer is dp[|a|][|b|]. Time O(|a| * |b|); because row i only needs row i - 1, space can be reduced to O(|b|).",
      solutions: {
        javascript: code`
          function solve(input) {
            const lines = input.trim().split("\n");
            const a = lines[0].trim();
            const b = lines[1].trim();
            let previous = new Int32Array(b.length + 1);
            let current = new Int32Array(b.length + 1);
            for (let i = 1; i <= a.length; i++) {
              for (let j = 1; j <= b.length; j++) {
                if (a[i - 1] === b[j - 1]) current[j] = previous[j - 1] + 1;
                else current[j] = Math.max(previous[j], current[j - 1]);
              }
              [previous, current] = [current, previous];
            }
            return String(previous[b.length]);
          }
        `,
        python: code`
          def solve(input_str):
              lines = input_str.strip().split("\n")
              a, b = lines[0].strip(), lines[1].strip()
              previous = [0] * (len(b) + 1)
              for i in range(1, len(a) + 1):
                  current = [0] * (len(b) + 1)
                  for j in range(1, len(b) + 1):
                      if a[i - 1] == b[j - 1]:
                          current[j] = previous[j - 1] + 1
                      else:
                          current[j] = max(previous[j], current[j - 1])
                  previous = current
              return str(previous[len(b)])
        `,
      },
    },
    {
      title: "0/1 Knapsack",
      difficulty: "Medium",
      companies: ["Amazon", "Google", "Goldman Sachs", "Flipkart", "Oracle"],
      description:
        "You have `n` items, where item `i` has weight `weights[i]` and value `values[i]`, and a knapsack that can carry total weight at most `capacity`. Each item can be taken at most once (it is either in the knapsack or not).\n\nPrint the maximum total value that fits in the knapsack.",
      constraints: "1 <= n <= 500\n1 <= weights[i] <= 10^4\n0 <= values[i] <= 10^4\n0 <= capacity <= 10^4",
      inputFormat: "Line 1: `n` space-separated integers `weights`.\nLine 2: `n` space-separated integers `values`.\nLine 3: the integer `capacity`.",
      outputFormat: "The maximum total value.",
      examples: [
        { input: "1 3 4 5\n1 4 5 7\n7", output: "9", explanation: "Take the items of weight 3 and 4: value 4 + 5 = 9 with total weight 7." },
        { input: "10 20 30\n60 100 120\n50", output: "220", explanation: "Take the items of weight 20 and 30: value 100 + 120 = 220." },
      ],
      testCases: [
        { input: "1 3 4 5\n1 4 5 7\n7", expectedOutput: "9", isHidden: false },
        { input: "10 20 30\n60 100 120\n50", expectedOutput: "220", isHidden: false },
        { input: "1 2\n10 20\n0", expectedOutput: "0", isHidden: true },
        { input: "1 2 3\n6 10 12\n10", expectedOutput: "28", isHidden: true },
        { input: "5 6\n10 20\n4", expectedOutput: "0", isHidden: true },
        { input: "1 3 4\n15 20 30\n4", expectedOutput: "35", isHidden: true },
        { input: "7\n9\n7", expectedOutput: "9", isHidden: true },
        { input: KNAPSACK_PERF, expectedOutput: KNAPSACK_PERF_EXPECTED, isHidden: true },
      ],
      hints: [
        "Greedy by value-to-weight ratio is not correct for the 0/1 version. Think in terms of decisions: for each item, take it or leave it.",
        "Let dp[c] be the best value achievable with capacity c using the items considered so far. Taking item i changes it to dp[c - w] + v.",
        "Process items one at a time and update capacities from high to low (c = capacity down to w), so that each item is used at most once. Answer: dp[capacity].",
      ],
      editorial:
        "Let dp[i][c] be the best value using the first i items with capacity c: dp[i][c] = max(dp[i - 1][c], dp[i - 1][c - w_i] + v_i) when c >= w_i, else dp[i - 1][c]. Row i only depends on row i - 1, so a single array dp[0..capacity] suffices if capacities are updated in decreasing order (otherwise an item could be counted several times, which is the unbounded knapsack). Time O(n * capacity), space O(capacity). The answer is dp[capacity].",
      solutions: {
        javascript: code`
          function solve(input) {
            const lines = input.trim().split("\n");
            const weights = lines[0].trim().split(/\s+/).map(Number);
            const values = lines[1].trim().split(/\s+/).map(Number);
            const capacity = Number(lines[2]);
            const dp = new Array(capacity + 1).fill(0);
            for (let i = 0; i < weights.length; i++) {
              for (let c = capacity; c >= weights[i]; c--) {
                dp[c] = Math.max(dp[c], dp[c - weights[i]] + values[i]);
              }
            }
            return String(dp[capacity]);
          }
        `,
        python: code`
          def solve(input_str):
              lines = input_str.strip().split("\n")
              weights = list(map(int, lines[0].split()))
              values = list(map(int, lines[1].split()))
              capacity = int(lines[2])
              dp = [0] * (capacity + 1)
              for w, v in zip(weights, values):
                  for c in range(capacity, w - 1, -1):
                      dp[c] = max(dp[c], dp[c - w] + v)
              return str(dp[capacity])
        `,
      },
    },
  ],
};
