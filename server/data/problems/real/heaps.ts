/**
 * Heaps / priority queues: company-tagged interview problems.
 *
 * Large "performance" inputs are generated deterministically (seeded PRNG); their expected outputs are computed by
 * simple, clearly independent brute-force routines (sorting, exhaustive scans, digit-wise addition) defined below,
 * never by the heap-based reference solutions.
 */

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

const ascending = (values: number[]) => [...values].sort((a, b) => a - b);

/** Generic binary heap shared by the JavaScript reference solutions: `less(a, b)` true means a is popped before b. */
const JS_HEAP = `class Heap {
  constructor(less) {
    this.a = [];
    this.less = less;
  }
  get size() {
    return this.a.length;
  }
  peek() {
    return this.a[0];
  }
  push(v) {
    const a = this.a;
    a.push(v);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a;
    const top = a[0];
    const last = a.pop();
    if (a.length) {
      a[0] = last;
      const n = a.length;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < n && this.less(a[l], a[m])) m = l;
        if (r < n && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}`;

// ---------------------------------------------------------------------------------------------
// Performance inputs (expected outputs from independent brute force)
// ---------------------------------------------------------------------------------------------

// Kth Largest Element in a Stream: keep a plain sorted array and insert by binary search.
const STREAM_PERF = (() => {
  const next = seededRandom(1101);
  const k = 50;
  const init = Array.from({ length: 3000 }, () => next(2000001) - 1000000);
  const adds = Array.from({ length: 3000 }, () => next(2000001) - 1000000);
  const sorted = ascending(init);
  const out: number[] = [];
  for (const v of adds) {
    let lo = 0;
    let hi = sorted.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (sorted[mid] < v) lo = mid + 1;
      else hi = mid;
    }
    sorted.splice(lo, 0, v);
    out.push(sorted[sorted.length - k]);
  }
  return { input: `${k}\n${init.join(" ")}\n${adds.join(" ")}`, output: out.join(" ") };
})();

// Connect Ropes: repeatedly sort and merge the two smallest (quadratic, but obviously correct).
const ROPES_PERF = (() => {
  const next = seededRandom(1102);
  const ropes = Array.from({ length: 2500 }, () => 1 + next(1000000));
  const work = [...ropes];
  let total = 0;
  while (work.length > 1) {
    work.sort((a, b) => a - b);
    const merged = work[0] + work[1];
    total += merged;
    work.splice(0, 2, merged);
  }
  return { input: ropes.join(" "), output: String(total) };
})();

// K-Sorted Array: shuffle every block of k+1 consecutive elements of a sorted array (displacement <= k).
const KSORTED_PERF = (() => {
  const next = seededRandom(1103);
  const k = 7;
  const sorted = ascending(Array.from({ length: 6000 }, () => next(2000001) - 1000000));
  const shuffled = [...sorted];
  for (let start = 0; start < shuffled.length; start += k + 1) {
    const end = Math.min(start + k + 1, shuffled.length);
    for (let i = end - 1; i > start; i--) {
      const j = start + next(i - start + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
  }
  return { input: `${k}\n${shuffled.join(" ")}`, output: sorted.join(" ") };
})();

// K Weakest Rows: count soldiers per row, then fully sort (count, index).
const WEAKEST_PERF = (() => {
  const next = seededRandom(1104);
  const rows: number[][] = [];
  const counts: number[] = [];
  for (let r = 0; r < 100; r++) {
    const soldiers = next(101);
    counts.push(soldiers);
    rows.push(Array.from({ length: 100 }, (_, c) => (c < soldiers ? 1 : 0)));
  }
  const k = 17;
  const order = counts.map((c, i) => [c, i]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return { input: `${k}\n${rows.map((r) => r.join(" ")).join("\n")}`, output: order.slice(0, k).map((p) => p[1]).join(" ") };
})();

// K Largest Elements: sort descending and slice.
const KLARGEST_PERF = (() => {
  const next = seededRandom(1105);
  const nums = Array.from({ length: 5000 }, () => next(2000001) - 1000000);
  const k = 100;
  return { input: `${k}\n${nums.join(" ")}`, output: ascending(nums).reverse().slice(0, k).join(" ") };
})();

// Min-heap check: a sorted array is always a min-heap; swapping the first and last element breaks it.
const HEAP_CHECK_SORTED = ascending(Array.from({ length: 20000 }, (_, i) => i * 3 + (i % 5)));
const HEAP_CHECK_BROKEN = (() => {
  const values = [...HEAP_CHECK_SORTED];
  [values[0], values[values.length - 1]] = [values[values.length - 1], values[0]];
  return values;
})();

// Minimum Sum from Digits: sort the digits, deal them alternately, add the two decimal strings digit by digit.
const DIGIT_SUM_PERF = (() => {
  const next = seededRandom(1107);
  const digits = Array.from({ length: 3000 }, () => next(10));
  const sorted = ascending(digits);
  const first: number[] = [];
  const second: number[] = [];
  sorted.forEach((d, i) => (i % 2 === 0 ? first : second).push(d));
  const a = first.reverse();
  const b = second.reverse();
  const out: number[] = [];
  let carry = 0;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const s = (a[i] ?? 0) + (b[i] ?? 0) + carry;
    out.push(s % 10);
    carry = Math.floor(s / 10);
  }
  if (carry) out.push(carry);
  while (out.length > 1 && out[out.length - 1] === 0) out.pop();
  return { input: digits.join(" "), output: out.reverse().join("") };
})();

// Sum between K1 and K2: sort and add up the slice.
const RANK_SUM_PERF = (() => {
  const next = seededRandom(1108);
  const nums = Array.from({ length: 5000 }, () => next(2000001) - 1000000);
  const sorted = ascending(nums);
  const k1 = 700;
  const k2 = 3900;
  let total = 0;
  for (let i = k1; i < k2 - 1; i++) total += sorted[i];
  return { input: `${k1} ${k2}\n${nums.join(" ")}`, output: String(total) };
})();

// Top K Frequent Words: count, then fully sort by (-count, word).
const WORDS_PERF = (() => {
  const next = seededRandom(1201);
  const alphabet = "abcdef";
  const words: string[] = [];
  for (let i = 0; i < 20000; i++) {
    const length = 1 + next(4);
    let w = "";
    for (let j = 0; j < length; j++) w += alphabet[next(alphabet.length)];
    words.push(w);
  }
  const counts = new Map<string, number>();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  const k = 25;
  return { input: `${k}\n${words.join(" ")}`, output: ranked.slice(0, k).map((e) => e[0]).join(" ") };
})();

// K Closest Points: sort every point by (distance^2, x, y). Small coordinates create many ties and duplicates.
const POINTS_PERF = (() => {
  const next = seededRandom(1202);
  const points = Array.from({ length: 5000 }, () => [next(81) - 40, next(81) - 40]);
  const k = 300;
  const ranked = [...points].sort((a, b) => a[0] ** 2 + a[1] ** 2 - (b[0] ** 2 + b[1] ** 2) || a[0] - b[0] || a[1] - b[1]);
  return { input: `${k}\n${points.map((p) => p.join(" ")).join("\n")}`, output: ranked.slice(0, k).map((p) => p.join(" ")).join("\n") };
})();

function shuffled<T>(values: T[], next: (bound: number) => number): T[] {
  const a = [...values];
  for (let i = a.length - 1; i > 0; i--) {
    const j = next(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Reorganize String: with only a's and b's the lexicographically smallest valid answer is forced to be "abab...".
const REORG_EVEN = shuffled([..."a".repeat(1000), ..."b".repeat(1000)], seededRandom(1203)).join("");
const REORG_ODD = shuffled([..."a".repeat(1000), ..."b".repeat(999)], seededRandom(1204)).join("");

// Meeting Rooms II: the answer is the largest number of intervals covering some interval's start (quadratic scan).
const MEETING_PERF = (() => {
  const next = seededRandom(1205);
  const intervals = Array.from({ length: 2000 }, () => {
    const start = next(100000);
    return [start, start + 1 + next(5000)];
  });
  let best = 0;
  for (const [s] of intervals) {
    let overlap = 0;
    for (const [a, b] of intervals) if (a <= s && s < b) overlap++;
    best = Math.max(best, overlap);
  }
  return { input: `${intervals.length}\n${intervals.map((i) => i.join(" ")).join("\n")}`, output: String(best) };
})();

// Kth Smallest in a Sorted Matrix: build a row/column sorted matrix, flatten and sort.
const MATRIX_PERF = (() => {
  const next = seededRandom(1206);
  const n = 300;
  const grid: number[][] = [];
  for (let i = 0; i < n; i++) {
    grid.push([]);
    for (let j = 0; j < n; j++) {
      const up = i > 0 ? grid[i - 1][j] : -1000;
      const left = j > 0 ? grid[i][j - 1] : -1000;
      grid[i].push(Math.max(up, left) + next(4));
    }
  }
  const k = 45678;
  const flat = ascending(grid.flat());
  return { input: `${k}\n${grid.map((r) => r.join(" ")).join("\n")}`, output: String(flat[k - 1]) };
})();

export const REAL_HEAPS: ProblemSpec[] = [
    {
      title: "Kth Largest Element in a Stream",
      difficulty: "Easy",
      companies: ["Amazon", "Meta", "Microsoft"],
      description:
        "You are monitoring a live feed of scores. You are given an integer `k`, an initial list of scores `nums`, and a list of new scores that arrive one at a time.\n\nAfter **each** new score arrives, report the `k`-th largest score seen so far (counting duplicates, so for scores `5 5 3` the 2nd largest is `5`).\n\nThe initial list always has at least `k - 1` scores, so an answer exists after every arrival.",
      constraints: "1 <= k <= 10^4\nk - 1 <= nums.length <= 10^4, nums.length >= 1\n1 <= number of arrivals <= 10^4\n-10^6 <= every score <= 10^6",
      inputFormat: "Line 1: the integer `k`.\nLine 2: the initial scores, space separated.\nLine 3: the arriving scores in order, space separated.",
      outputFormat: "One line with the `k`-th largest score after each arrival, space separated.",
      examples: [
        { input: "3\n4 5 8 2\n3 5 10 9 4", output: "4 5 5 8 8", explanation: "After adding 3 the scores are 2 3 4 5 8, so the 3rd largest is 4. After adding 5 the top three are 8 5 5, so the answer is 5, and so on." },
        { input: "1\n5\n3 7 -1", output: "5 7 7" },
      ],
      testCases: [
        { input: "3\n4 5 8 2\n3 5 10 9 4", expectedOutput: "4 5 5 8 8", isHidden: false },
        { input: "1\n5\n3 7 -1", expectedOutput: "5 7 7", isHidden: false },
        { input: "2\n1\n1 1 1", expectedOutput: "1 1 1", isHidden: true },
        { input: "3\n-10 -3 0 5\n-20 100 4", expectedOutput: "-3 0 4", isHidden: true },
        { input: "4\n7 7 7\n7 8", expectedOutput: "7 7", isHidden: true },
        { input: "2\n9 8 7 6\n1 10 5", expectedOutput: "8 9 9", isHidden: true },
        { input: STREAM_PERF.input, expectedOutput: STREAM_PERF.output, isHidden: true },
      ],
      hints: [
        "Re-sorting after every arrival works but is far too slow for 10^4 arrivals.",
        "Only the `k` largest scores can ever matter for the answer; the rest can be discarded forever.",
        "Keep a min-heap of exactly `k` scores. Its root is the `k`-th largest. When a new score arrives, push it and pop the root if the heap grows beyond `k`.",
      ],
      editorial:
        "Maintain a min-heap that holds only the `k` largest scores seen so far. Its smallest element (the root) is exactly the `k`-th largest overall. For each arrival, push the score and, if the heap now has more than `k` entries, pop the root, which can never again be among the top `k`. Building the initial heap takes O(n log k) and each arrival costs O(log k), so the total is O((n + m) log k) time and O(k) space.",
      solutions: {
        javascript: code`
          ${JS_HEAP}

          function solve(input) {
            const lines = input.trim().split(/\r?\n/);
            const k = Number(lines[0]);
            const nums = lines[1].trim().split(/\s+/).map(Number);
            const adds = lines[2].trim().split(/\s+/).map(Number);
            const heap = new Heap((a, b) => a < b);
            const offer = (v) => {
              heap.push(v);
              if (heap.size > k) heap.pop();
            };
            for (const v of nums) offer(v);
            const out = [];
            for (const v of adds) {
              offer(v);
              out.push(heap.peek());
            }
            return out.join(" ");
          }
        `,
        python: code`
          import heapq

          def solve(input_str):
              lines = input_str.strip().splitlines()
              k = int(lines[0])
              nums = list(map(int, lines[1].split()))
              adds = list(map(int, lines[2].split()))
              heap = []

              def offer(v):
                  heapq.heappush(heap, v)
                  if len(heap) > k:
                      heapq.heappop(heap)

              for v in nums:
                  offer(v)
              out = []
              for v in adds:
                  offer(v)
                  out.append(str(heap[0]))
              return " ".join(out)
        `,
      },
    },
    {
      title: "Minimum Cost to Connect Ropes",
      difficulty: "Easy",
      companies: ["Amazon", "Google", "Microsoft"],
      description:
        "You have several ropes with given lengths. Connecting two ropes of lengths `a` and `b` costs `a + b` and produces a single rope of length `a + b`.\n\nKeep connecting ropes, two at a time, until only one rope remains. Print the minimum total cost needed to do so. If there is only one rope, the cost is `0`.",
      constraints: "1 <= number of ropes <= 10^5\n1 <= length <= 10^6",
      inputFormat: "One line of space-separated rope lengths.",
      outputFormat: "A single integer: the minimum total cost.",
      examples: [
        { input: "4 3 2 6", output: "29", explanation: "Join 2+3=5 (rest: 4 5 6), join 4+5=9 (rest: 6 9), join 6+9=15. Total 5+9+15=29." },
        { input: "1 8 3 5", output: "30" },
      ],
      testCases: [
        { input: "4 3 2 6", expectedOutput: "29", isHidden: false },
        { input: "1 8 3 5", expectedOutput: "30", isHidden: false },
        { input: "7", expectedOutput: "0", isHidden: true },
        { input: "5 5", expectedOutput: "10", isHidden: true },
        { input: "1 1 1 1", expectedOutput: "8", isHidden: true },
        { input: "1000000 1000000 1000000", expectedOutput: "5000000", isHidden: true },
        { input: "2 2 3 3 4", expectedOutput: "32", isHidden: true },
        { input: ROPES_PERF.input, expectedOutput: ROPES_PERF.output, isHidden: true },
      ],
      hints: [
        "Every rope's length is paid once for each merge it takes part in (directly or inside a bigger rope).",
        "So the longest ropes should be merged as late as possible and the shortest ones as early as possible.",
        "Greedy: repeatedly take the two shortest ropes from a min-heap, add their sum to the answer, and push the merged rope back.",
      ],
      editorial:
        "The merge order forms a binary tree whose leaves are the ropes; a rope contributes its length times its depth. Minimising this is the Huffman coding problem, solved greedily: always merge the two shortest ropes. A min-heap provides them in O(log n), giving O(n log n) time and O(n) space. Totals reach about 10^11, which is still exact in a double.",
      solutions: {
        javascript: code`
          ${JS_HEAP}

          function solve(input) {
            const ropes = input.trim().split(/\s+/).map(Number);
            const heap = new Heap((a, b) => a < b);
            for (const r of ropes) heap.push(r);
            let total = 0;
            while (heap.size > 1) {
              const merged = heap.pop() + heap.pop();
              total += merged;
              heap.push(merged);
            }
            return String(total);
          }
        `,
        python: code`
          import heapq

          def solve(input_str):
              ropes = list(map(int, input_str.split()))
              heapq.heapify(ropes)
              total = 0
              while len(ropes) > 1:
                  merged = heapq.heappop(ropes) + heapq.heappop(ropes)
                  total += merged
                  heapq.heappush(ropes, merged)
              return str(total)
        `,
      },
    },
    {
      title: "Sort a K-Sorted Array",
      difficulty: "Easy",
      companies: ["Amazon", "Flipkart", "Microsoft"],
      description:
        "An array is **k-sorted** if every element is at most `k` positions away from the position it would occupy in the fully sorted array.\n\nGiven a k-sorted array, print it in sorted (non-decreasing) order. A solution that simply sorts in O(n log n) is not the point: aim for O(n log k).",
      constraints: "1 <= n <= 10^5\n0 <= k < n\n-10^9 <= a[i] <= 10^9\nThe array is guaranteed to be k-sorted.",
      inputFormat: "Line 1: the integer `k`.\nLine 2: the n array elements, space separated.",
      outputFormat: "The sorted array on one line, space separated.",
      examples: [
        { input: "3\n6 5 3 2 8 10 9", output: "2 3 5 6 8 9 10", explanation: "Each element is at most 3 positions from its sorted place." },
        { input: "1\n2 1 4 3 5", output: "1 2 3 4 5" },
      ],
      testCases: [
        { input: "3\n6 5 3 2 8 10 9", expectedOutput: "2 3 5 6 8 9 10", isHidden: false },
        { input: "1\n2 1 4 3 5", expectedOutput: "1 2 3 4 5", isHidden: false },
        { input: "0\n1 2 3", expectedOutput: "1 2 3", isHidden: true },
        { input: "0\n9", expectedOutput: "9", isHidden: true },
        { input: "3\n4 1 2 3", expectedOutput: "1 2 3 4", isHidden: true },
        { input: "3\n3 3 1 1 2", expectedOutput: "1 1 2 3 3", isHidden: true },
        { input: "2\n-5 -7 -6 -3 -4", expectedOutput: "-7 -6 -5 -4 -3", isHidden: true },
        { input: KSORTED_PERF.input, expectedOutput: KSORTED_PERF.output, isHidden: true },
      ],
      hints: [
        "The smallest remaining element can never be further than `k` places from the front of what is still unsorted.",
        "That means the next output element is always among the first `k + 1` elements not yet consumed.",
        "Slide a min-heap of size `k + 1` across the array: push the next element, pop the minimum into the output. Drain the heap at the end.",
      ],
      editorial:
        "Because every element is within k positions of its final place, the smallest unplaced element must be among the next k+1 array elements. Load the first k+1 elements into a min-heap; then for each following element, pop the minimum to the output and push the new element. Finally pop everything that is left. Each of the n elements enters and leaves a heap of size k+1 once: O(n log k) time, O(k) space.",
      solutions: {
        javascript: code`
          ${JS_HEAP}

          function solve(input) {
            const lines = input.trim().split(/\r?\n/);
            const k = Number(lines[0]);
            const a = lines[1].trim().split(/\s+/).map(Number);
            const heap = new Heap((x, y) => x < y);
            const out = [];
            for (let i = 0; i < a.length; i++) {
              heap.push(a[i]);
              if (heap.size > k) out.push(heap.pop());
            }
            while (heap.size) out.push(heap.pop());
            return out.join(" ");
          }
        `,
        python: code`
          import heapq

          def solve(input_str):
              lines = input_str.strip().splitlines()
              k = int(lines[0])
              a = list(map(int, lines[1].split()))
              heap = []
              out = []
              for x in a:
                  heapq.heappush(heap, x)
                  if len(heap) > k:
                      out.append(heapq.heappop(heap))
              while heap:
                  out.append(heapq.heappop(heap))
              return " ".join(map(str, out))
        `,
      },
    },
    {
      title: "The K Weakest Rows in a Matrix",
      difficulty: "Easy",
      companies: ["Amazon", "Google", "Microsoft"],
      description:
        "A binary matrix describes the military strength of several rows. A `1` is a soldier and a `0` is a civilian. In every row all soldiers stand to the left of all civilians.\n\nRow `i` is **weaker** than row `j` if it has fewer soldiers, or if both have the same number of soldiers and `i < j`.\n\nPrint the indices of the `k` weakest rows, ordered from weakest to strongest.",
      constraints: "1 <= rows, columns <= 100\n1 <= k <= rows\nEach row is a run of 1s followed by a run of 0s.",
      inputFormat: "Line 1: the integer `k`.\nThen one line per row with its cells (`0` or `1`) separated by spaces.",
      outputFormat: "The `k` row indices (0-based), space separated, weakest first.",
      examples: [
        { input: "3\n1 1 0 0 0\n1 1 1 1 0\n1 0 0 0 0\n1 1 0 0 0\n1 1 1 1 1", output: "2 0 3", explanation: "Soldier counts are 2, 4, 1, 2, 5. Row 2 is weakest, then rows 0 and 3 tie on 2 soldiers and the smaller index wins." },
        { input: "2\n1 0 0 0\n1 1 1 1\n1 0 0 0\n1 0 0 0", output: "0 2" },
      ],
      testCases: [
        { input: "3\n1 1 0 0 0\n1 1 1 1 0\n1 0 0 0 0\n1 1 0 0 0\n1 1 1 1 1", expectedOutput: "2 0 3", isHidden: false },
        { input: "2\n1 0 0 0\n1 1 1 1\n1 0 0 0\n1 0 0 0", expectedOutput: "0 2", isHidden: false },
        { input: "1\n0 0 0", expectedOutput: "0", isHidden: true },
        { input: "3\n0 0\n0 0\n0 0", expectedOutput: "0 1 2", isHidden: true },
        { input: "2\n1 1\n1 1\n1 1", expectedOutput: "0 1", isHidden: true },
        { input: "1\n1 1 1\n0 0 0\n1 0 0", expectedOutput: "1", isHidden: true },
        { input: "4\n1 1 1 0\n1 0 0 0\n1 1 0 0\n0 0 0 0", expectedOutput: "3 1 2 0", isHidden: true },
        { input: WEAKEST_PERF.input, expectedOutput: WEAKEST_PERF.output, isHidden: true },
      ],
      hints: [
        "Compute each row's soldier count first; because soldiers are contiguous at the left, binary search finds it quickly, but a plain count is fine for 100 columns.",
        "Each row is described by the pair (soldiers, index); smaller pairs are weaker, and comparing pairs lexicographically handles the tie rule.",
        "Push all pairs into a min-heap and pop `k` times, or keep a max-heap of size `k` to stay at O(m log k).",
      ],
      editorial:
        "Reduce each row to the pair (soldiers, index). The required ordering is exactly the lexicographic order on these pairs, so we need the `k` smallest pairs. Push all pairs into a min-heap and pop `k` of them (or keep only the k smallest with a bounded max-heap). Counting soldiers is O(columns) per row (or O(log columns) with binary search), and the heap work is O(m log m) or O(m log k).",
      solutions: {
        javascript: code`
          ${JS_HEAP}

          function solve(input) {
            const lines = input.trim().split(/\r?\n/);
            const k = Number(lines[0]);
            const heap = new Heap((a, b) => a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]));
            for (let i = 1; i < lines.length; i++) {
              const soldiers = lines[i].trim().split(/\s+/).filter((c) => c === "1").length;
              heap.push([soldiers, i - 1]);
            }
            const out = [];
            for (let i = 0; i < k; i++) out.push(heap.pop()[1]);
            return out.join(" ");
          }
        `,
        python: code`
          import heapq

          def solve(input_str):
              lines = input_str.strip().splitlines()
              k = int(lines[0])
              heap = []
              for i, line in enumerate(lines[1:]):
                  heap.append((line.split().count("1"), i))
              heapq.heapify(heap)
              return " ".join(str(heapq.heappop(heap)[1]) for _ in range(k))
        `,
      },
    },
    {
      title: "K Largest Elements",
      difficulty: "Easy",
      companies: ["Amazon", "TCS", "Infosys"],
      description:
        "Given an array of integers and a number `k`, print the `k` largest elements of the array in **descending** order.\n\nDuplicates count separately: in `5 5 5 1` the two largest elements are `5 5`.",
      constraints: "1 <= k <= n <= 10^5\n-10^9 <= a[i] <= 10^9",
      inputFormat: "Line 1: the integer `k`.\nLine 2: the n array elements, space separated.",
      outputFormat: "The `k` largest elements in descending order, space separated.",
      examples: [
        { input: "3\n1 23 12 9 30 2 50", output: "50 30 23" },
        { input: "2\n5 5 5 1", output: "5 5", explanation: "Duplicates are counted individually." },
      ],
      testCases: [
        { input: "3\n1 23 12 9 30 2 50", expectedOutput: "50 30 23", isHidden: false },
        { input: "2\n5 5 5 1", expectedOutput: "5 5", isHidden: false },
        { input: "1\n-4", expectedOutput: "-4", isHidden: true },
        { input: "4\n3 1 2 4", expectedOutput: "4 3 2 1", isHidden: true },
        { input: "3\n-1 -2 -3 -4", expectedOutput: "-1 -2 -3", isHidden: true },
        { input: "2\n7 7 7 7", expectedOutput: "7 7", isHidden: true },
        { input: KLARGEST_PERF.input, expectedOutput: KLARGEST_PERF.output, isHidden: true },
      ],
      hints: [
        "Sorting the whole array works in O(n log n); can you do better when k is small?",
        "You only need to remember the `k` largest values seen so far. Which of them is the first to be evicted by a bigger newcomer?",
        "Keep a min-heap of size `k`: push each element and pop the root when the size exceeds `k`. At the end, pop everything and reverse.",
      ],
      editorial:
        "A min-heap bounded to `k` elements always contains the `k` largest values seen so far, with the smallest of them at the root ready for eviction. Scanning the array costs O(n log k); popping the survivors yields them in ascending order, so reverse them for the required descending output. Space is O(k).",
      solutions: {
        javascript: code`
          ${JS_HEAP}

          function solve(input) {
            const lines = input.trim().split(/\r?\n/);
            const k = Number(lines[0]);
            const nums = lines[1].trim().split(/\s+/).map(Number);
            const heap = new Heap((a, b) => a < b);
            for (const v of nums) {
              heap.push(v);
              if (heap.size > k) heap.pop();
            }
            const out = [];
            while (heap.size) out.push(heap.pop());
            return out.reverse().join(" ");
          }
        `,
        python: code`
          import heapq

          def solve(input_str):
              lines = input_str.strip().splitlines()
              k = int(lines[0])
              nums = list(map(int, lines[1].split()))
              heap = []
              for v in nums:
                  heapq.heappush(heap, v)
                  if len(heap) > k:
                      heapq.heappop(heap)
              out = []
              while heap:
                  out.append(heapq.heappop(heap))
              out.reverse()
              return " ".join(map(str, out))
        `,
      },
    },
    {
      title: "Check if an Array Is a Min-Heap",
      difficulty: "Easy",
      companies: ["Amazon", "Microsoft"],
      description:
        "A complete binary tree stored in an array (the children of index `i` are at `2i + 1` and `2i + 2`) is a **min-heap** if every node is less than or equal to each of its children.\n\nGiven an array, print `true` if it is a valid min-heap in this array representation, otherwise `false`.",
      constraints: "1 <= n <= 10^5\n-10^9 <= a[i] <= 10^9",
      inputFormat: "One line of space-separated integers.",
      outputFormat: "`true` or `false`.",
      examples: [
        { input: "1 3 2 4 5", output: "true", explanation: "1 <= 3, 1 <= 2, 3 <= 4, 3 <= 5." },
        { input: "10 5 15", output: "false", explanation: "The root 10 is larger than its child 5." },
      ],
      testCases: [
        { input: "1 3 2 4 5", expectedOutput: "true", isHidden: false },
        { input: "10 5 15", expectedOutput: "false", isHidden: false },
        { input: "7", expectedOutput: "true", isHidden: true },
        { input: "2 2 2 2", expectedOutput: "true", isHidden: true },
        { input: "1 2 3 4 5 6 7 0", expectedOutput: "false", isHidden: true },
        { input: "3 9 5 12 10 6 8 15 14", expectedOutput: "true", isHidden: true },
        { input: "-5 -3 -4 0 -1", expectedOutput: "true", isHidden: true },
        { input: "1 2 3 4 5 6 7 8 9 10 11 12 13 14 0", expectedOutput: "false", isHidden: true },
        { input: HEAP_CHECK_SORTED.join(" "), expectedOutput: "true", isHidden: true },
        { input: HEAP_CHECK_BROKEN.join(" "), expectedOutput: "false", isHidden: true },
      ],
      hints: [
        "Each element except the root has exactly one parent, at index `(i - 1) / 2` rounded down.",
        "The heap property only relates a node to its direct children, not to the whole subtree: checking those local pairs is enough.",
        "Loop `i` from 1 to n-1 and fail as soon as `a[parent(i)] > a[i]`. No recursion is required.",
      ],
      editorial:
        "The min-heap property is local: it holds for the whole tree if and only if every non-root node is >= its parent (equivalently every node is <= its children). Scan i = 1..n-1 comparing a[i] with a[(i-1)/2]. A single violation means `false`. O(n) time, O(1) space, and no recursion so large arrays are safe.",
      solutions: {
        javascript: code`
          function solve(input) {
            const a = input.trim().split(/\s+/).map(Number);
            for (let i = 1; i < a.length; i++) {
              if (a[(i - 1) >> 1] > a[i]) return "false";
            }
            return "true";
          }
        `,
        python: code`
          def solve(input_str):
              a = list(map(int, input_str.split()))
              for i in range(1, len(a)):
                  if a[(i - 1) // 2] > a[i]:
                      return "false"
              return "true"
        `,
      },
    },
    {
      title: "Minimum Sum of Two Numbers Formed from Digits",
      difficulty: "Easy",
      companies: ["Amazon", "Microsoft"],
      description:
        "You are given an array of decimal digits. Use **every** digit exactly once to build two non-negative numbers (leading zeros are allowed, so `047` is just `47`). Print the smallest possible sum of the two numbers.\n\nThe numbers can have thousands of digits, so the sum will not fit in a 64-bit integer.",
      constraints: "2 <= n <= 5000\n0 <= digit <= 9",
      inputFormat: "One line of space-separated digits.",
      outputFormat: "The minimum sum as an integer without leading zeros.",
      examples: [
        { input: "6 8 4 5 2 3", output: "604", explanation: "Build 246 and 358: 246 + 358 = 604." },
        { input: "5 3 0 7 4", output: "82", explanation: "Build 047 and 35: 47 + 35 = 82." },
      ],
      testCases: [
        { input: "6 8 4 5 2 3", expectedOutput: "604", isHidden: false },
        { input: "5 3 0 7 4", expectedOutput: "82", isHidden: false },
        { input: "0 0", expectedOutput: "0", isHidden: true },
        { input: "9 9", expectedOutput: "18", isHidden: true },
        { input: "1 0 0 0", expectedOutput: "1", isHidden: true },
        { input: "9 9 9 9 9 9 9 9", expectedOutput: "19998", isHidden: true },
        { input: "3 1 4 1 5 9 2 6", expectedOutput: "2605", isHidden: true },
        { input: DIGIT_SUM_PERF.input, expectedOutput: DIGIT_SUM_PERF.output, isHidden: true },
      ],
      hints: [
        "To keep the sum small, both numbers should have as few digits as possible: split the digits as evenly as you can.",
        "The most significant positions should hold the smallest digits. Which digits should go in the two leading positions?",
        "Repeatedly take the smallest remaining digit (min-heap or sorting) and give it alternately to the two numbers. Add the two resulting strings as big integers.",
      ],
      editorial:
        "The sum is minimised when the two numbers have lengths differing by at most one, and when smaller digits occupy more significant positions. So sort the digits (or pop them from a min-heap) and deal them alternately to the two numbers: the 1st, 3rd, 5th... smallest go to number A and the 2nd, 4th, ... to number B. Since n can be 5000, add the two numbers with big-integer arithmetic. O(n log n) time.",
      solutions: {
        javascript: code`
          ${JS_HEAP}

          function solve(input) {
            const digits = input.trim().split(/\s+/).map(Number);
            const heap = new Heap((a, b) => a < b);
            for (const d of digits) heap.push(d);
            let first = "";
            let second = "";
            let turn = 0;
            while (heap.size) {
              const d = heap.pop();
              if (turn === 0) first += d;
              else second += d;
              turn ^= 1;
            }
            return (BigInt(first) + BigInt(second || "0")).toString();
          }
        `,
        python: code`
          import heapq

          def solve(input_str):
              digits = list(map(int, input_str.split()))
              heapq.heapify(digits)
              first, second = [], []
              turn = 0
              while digits:
                  d = heapq.heappop(digits)
                  (first if turn == 0 else second).append(str(d))
                  turn ^= 1
              return str(int("".join(first)) + int("".join(second) or "0"))
        `,
      },
    },
    {
      title: "Sum of Elements Between K1-th and K2-th Smallest",
      difficulty: "Easy",
      companies: ["Amazon", "Flipkart"],
      description:
        "Given an array of integers and two ranks `k1 < k2`, consider the array in sorted order (duplicates keep separate ranks, rank 1 is the smallest). Print the sum of the elements whose rank is **strictly between** `k1` and `k2`.\n\nIf `k2 = k1 + 1` there is nothing in between and the answer is `0`.",
      constraints: "2 <= n <= 10^5\n1 <= k1 < k2 <= n\n-10^6 <= a[i] <= 10^6",
      inputFormat: "Line 1: `k1 k2`.\nLine 2: the n array elements, space separated.",
      outputFormat: "A single integer: the sum.",
      examples: [
        { input: "3 6\n20 8 22 4 12 10 14", output: "26", explanation: "Sorted: 4 8 10 12 14 20 22. Ranks 4 and 5 are 12 and 14, so the sum is 26." },
        { input: "2 4\n5 1 9 3", output: "5", explanation: "Sorted: 1 3 5 9. Only rank 3 lies between ranks 2 and 4, and it is 5." },
      ],
      testCases: [
        { input: "3 6\n20 8 22 4 12 10 14", expectedOutput: "26", isHidden: false },
        { input: "2 4\n5 1 9 3", expectedOutput: "5", isHidden: false },
        { input: "1 2\n4 4", expectedOutput: "0", isHidden: true },
        { input: "1 5\n5 5 5 5 5", expectedOutput: "15", isHidden: true },
        { input: "2 6\n-3 -1 -4 -1 -5 -9", expectedOutput: "-8", isHidden: true },
        { input: "1 3\n10 20 30", expectedOutput: "20", isHidden: true },
        { input: RANK_SUM_PERF.input, expectedOutput: RANK_SUM_PERF.output, isHidden: true },
      ],
      hints: [
        "If the array were sorted, the answer would be a simple slice sum. Do you really need to sort everything?",
        "Only the `k2 - 1` smallest elements matter: everything larger can be ignored.",
        "Keep a max-heap of the `k2 - 1` smallest elements. Pop its largest `(k2 - 1) - k1` times, adding each popped value.",
      ],
      editorial:
        "Only the k2-1 smallest elements can be ranked below k2. Maintain a max-heap bounded to k2-1 elements while scanning (push, then pop the maximum if the size exceeds k2-1). The heap then holds exactly the ranks 1..k2-1. Popping from the max-heap yields ranks k2-1, k2-2, ...; the first (k2-1-k1) pops are ranks k2-1 down to k1+1, so their sum is the answer. O(n log k2) time, O(k2) space.",
      solutions: {
        javascript: code`
          ${JS_HEAP}

          function solve(input) {
            const lines = input.trim().split(/\r?\n/);
            const [k1, k2] = lines[0].trim().split(/\s+/).map(Number);
            const nums = lines[1].trim().split(/\s+/).map(Number);
            const heap = new Heap((a, b) => a > b);
            for (const v of nums) {
              heap.push(v);
              if (heap.size > k2 - 1) heap.pop();
            }
            let sum = 0;
            for (let i = 0; i < k2 - 1 - k1; i++) sum += heap.pop();
            return String(sum);
          }
        `,
        python: code`
          import heapq

          def solve(input_str):
              lines = input_str.strip().splitlines()
              k1, k2 = map(int, lines[0].split())
              nums = list(map(int, lines[1].split()))
              smallest = heapq.nsmallest(k2 - 1, nums)
              return str(sum(smallest[k1:k2 - 1]))
        `,
      },
    },
  // __APPEND_MEDIUM__
];
