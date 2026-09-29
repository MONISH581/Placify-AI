/**
 * Data-structure categories: binary search trees, heaps, graphs, tries, segment trees.
 */

import { code, JS_BUILD_TREE, PY_BUILD_TREE, TREE_INPUT_NOTE, type ProblemSpec, type SeedTestCase } from "../problemHelpers";

// ---------------------------------------------------------------------------------------------
// Shared solution snippets
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

// ---------------------------------------------------------------------------------------------
// Deterministic generators for the large hidden "performance" test cases
// ---------------------------------------------------------------------------------------------

/** Tiny deterministic PRNG (32-bit LCG): `next(n)` returns an integer in [0, n). Same sequence on every load. */
function makeRng(seed: number): (n: number) => number {
  let state = seed >>> 0;
  return (n: number) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return Math.floor((state / 4294967296) * n);
  };
}

/** Level-order values of the perfect binary tree whose in-order sequence is `inorder` (length 2^h - 1, so no nulls). */
function perfectTreeLevelOrder(inorder: number[]): string {
  const out: number[] = [];
  for (let step = (inorder.length + 1) / 2; step >= 1; step /= 2) {
    for (let index = step - 1; index < inorder.length; index += 2 * step) out.push(inorder[index]);
  }
  return out.join(" ");
}

/** 2047-node perfect BST (depth 11) with values -3000, -2997, ... */
const LARGE_BST_INORDER = Array.from({ length: 2047 }, (_, i) => i * 3 - 3000);
const VALID_BST_LARGE = perfectTreeLevelOrder(LARGE_BST_INORDER);
/** Same tree, but the leftmost leaf of the root's right subtree is smaller than the root (only the root's bound catches it). */
const INVALID_BST_LARGE = perfectTreeLevelOrder(LARGE_BST_INORDER.map((value, i) => (i === 1024 ? LARGE_BST_INORDER[1023] - 1 : value)));

/** 2047-node perfect tree: a BST with 60 randomly overwritten keys, so only some subtrees remain BSTs. */
const MAX_SUM_BST_LARGE = (() => {
  const rng = makeRng(2024);
  const inorder = Array.from({ length: 2047 }, (_, i) => i * 19 - 19000);
  for (let t = 0; t < 60; t++) inorder[rng(2047)] = rng(80001) - 40000;
  return perfectTreeLevelOrder(inorder);
})();

/** 3000 skewed values (many ties in frequency), k = 15. */
const TOP_K_LARGE = (() => {
  const rng = makeRng(7);
  const nums = Array.from({ length: 3000 }, () => rng(40) * rng(40) - 700);
  return nums.join(" ") + "\n15";
})();

/** ~1400 random addNum / findMedian operations; expected medians come from a plain sorted array. */
function medianStreamCase(seed: number, operations: number): SeedTestCase {
  const rng = makeRng(seed);
  const lines: string[] = [];
  const medians: string[] = [];
  const sorted: number[] = [];
  const query = () => {
    const mid = sorted.length >> 1;
    const median = sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    lines.push("findMedian");
    medians.push(median.toFixed(1));
  };
  for (let i = 0; i < operations; i++) {
    if (sorted.length > 0 && rng(3) === 0) {
      query();
    } else {
      const value = rng(200001) - 100000;
      let lo = 0;
      let hi = sorted.length;
      while (lo < hi) {
        const m = (lo + hi) >> 1;
        if (sorted[m] < value) lo = m + 1;
        else hi = m;
      }
      sorted.splice(lo, 0, value);
      lines.push("addNum " + value);
    }
  }
  query();
  return { input: lines.join("\n"), expectedOutput: medians.join("\n"), isHidden: true };
}

/** 120 x 120 grid of random land split into 5 x 6 blocks by water lines (many small islands). */
const ISLANDS_LARGE = (() => {
  const rng = makeRng(99);
  const rows: string[] = [];
  for (let r = 0; r < 120; r++) {
    let row = "";
    for (let c = 0; c < 120; c++) row += r % 6 !== 5 && c % 7 !== 6 && rng(100) < 62 ? "1" : "0";
    rows.push(row);
  }
  return rows.join("\n");
})();

/** ~2950 five-letter words over a-f (a dense word graph): exploring all paths explodes, BFS is instant. */
const WORD_LADDER_LARGE = (() => {
  const rng = makeRng(31);
  const alphabet = "abcdef";
  const words: string[] = [];
  for (let id = 0; id < 6 ** 5; id++) {
    let word = "";
    for (let x = id, i = 0; i < 5; i++, x = Math.floor(x / 6)) word += alphabet[x % 6];
    const keep = rng(100) < 38;
    if (keep || word === "fffff") words.push(word);
  }
  return "aaaaa fffff\n" + words.join(" ");
})();

/** ~1300 random trie operations over a 3-letter alphabet; expected results come from plain sets. */
function trieOperationsCase(seed: number, operations: number): SeedTestCase {
  const rng = makeRng(seed);
  const words = new Set<string>();
  const prefixes = new Set<string>();
  const lines: string[] = [];
  const results: string[] = [];
  for (let i = 0; i < operations; i++) {
    let text = "";
    const length = 1 + rng(7);
    for (let j = 0; j < length; j++) text += "abc"[rng(3)];
    const kind = rng(3);
    if (kind === 0) {
      lines.push("insert " + text);
      words.add(text);
      for (let j = 1; j <= text.length; j++) prefixes.add(text.slice(0, j));
    } else if (kind === 1) {
      lines.push("search " + text);
      results.push(String(words.has(text)));
    } else {
      lines.push("startsWith " + text);
      results.push(String(prefixes.has(text)));
    }
  }
  return { input: lines.join("\n"), expectedOutput: results.join("\n"), isHidden: true };
}

/**
 * 12 x 12 board with an 8 x 8 block of `a`; 1700 words all start with "aaaaaaa". Searching each word separately
 * repeats the same exponential walk 1700 times (several seconds); a trie walks the shared prefix once.
 */
const WORD_SEARCH_LARGE = (() => {
  const rng = makeRng(5);
  const letters = "bcdefghijklmnopqrstuvwxyz";
  const rows: string[] = [];
  for (let r = 0; r < 12; r++) {
    let row = "";
    for (let c = 0; c < 12; c++) row += r < 8 && c < 8 ? "a" : letters[rng(25)];
    rows.push(row);
  }
  const words = new Set<string>();
  while (words.size < 1700) words.add("aaaaaaa" + letters[rng(25)] + letters[rng(25)] + letters[rng(25)]);
  return "12 12\n" + rows.join("\n") + "\n" + [...words].join(" ");
})();

/** Random updates / range sums; expected sums come from direct summation over a plain array. */
function rangeSumMutableCase(seed: number, length: number, operations: number): SeedTestCase {
  const rng = makeRng(seed);
  const nums = Array.from({ length }, () => rng(201) - 100);
  const lines = [nums.join(" ")];
  const results: string[] = [];
  for (let i = 0; i < operations; i++) {
    if (rng(2) === 0) {
      const index = rng(length);
      const value = rng(201) - 100;
      nums[index] = value;
      lines.push("update " + index + " " + value);
    } else {
      const a = rng(length);
      const b = rng(length);
      const left = Math.min(a, b);
      const right = Math.max(a, b);
      let sum = 0;
      for (let j = left; j <= right; j++) sum += nums[j];
      lines.push("sumRange " + left + " " + right);
      results.push(String(sum));
    }
  }
  return { input: lines.join("\n"), expectedOutput: results.join("\n"), isHidden: true };
}

/** Random values (some clustered to create duplicates); expected counts come from the O(n^2) definition. */
function countSmallerCase(seed: number, length: number): SeedTestCase {
  const rng = makeRng(seed);
  const nums = Array.from({ length }, () => (rng(4) === 0 ? rng(21) - 10 : rng(20001) - 10000));
  const counts = nums.map((value, i) => {
    let count = 0;
    for (let j = i + 1; j < nums.length; j++) if (nums[j] < value) count++;
    return count;
  });
  return { input: nums.join(" "), expectedOutput: counts.join(" "), isHidden: true };
}

// ---------------------------------------------------------------------------------------------
// Problem specs by category
// ---------------------------------------------------------------------------------------------

export const STRUCTURE_SPECS: Record<string, ProblemSpec[]> = {
  bst: [
    {
      title: "Search in a Binary Search Tree",
      difficulty: "Easy",
      description: `You are given the root of a binary search tree (BST) and an integer \`val\`.\n\nFind the node whose value equals \`val\` and print the level-order traversal of the subtree rooted at that node (skipping missing nodes). If no node has the value \`val\`, print \`NONE\`.\n\n${TREE_INPUT_NOTE}`,
      constraints: "1 <= number of nodes <= 5000\n1 <= Node.val <= 10^7\nAll values are unique and the tree is a valid BST.\n1 <= val <= 10^7",
      inputFormat: "Line 1: the BST in level order (`null` for missing children).\nLine 2: the integer `val`.",
      outputFormat: "Space-separated level-order values of the subtree rooted at the node with value `val` (no nulls), or `NONE` if `val` is not in the tree.",
      examples: [
        { input: "4 2 7 1 3\n2", output: "2 1 3", explanation: "The node with value 2 has children 1 and 3, so its subtree in level order is 2 1 3." },
      ],
      testCases: [
        { input: "4 2 7 1 3\n2", expectedOutput: "2 1 3", isHidden: false },
        { input: "4 2 7 1 3\n5", expectedOutput: "NONE", isHidden: false },
        { input: "8 3 10 1 6 null 14 null null 4 7 13\n6", expectedOutput: "6 4 7", isHidden: true },
        { input: "5\n5", expectedOutput: "5", isHidden: true },
        { input: "8 3 10 1 6 null 14 null null 4 7 13\n8", expectedOutput: "8 3 10 1 6 14 4 7 13", isHidden: true },
        { input: "8 3 10 1 6 null 14 null null 4 7 13\n14", expectedOutput: "14 13", isHidden: true },
        { input: "2 1 3\n1", expectedOutput: "1", isHidden: true },
        { input: "50 30 70 20 40 60 80\n65", expectedOutput: "NONE", isHidden: true },
      ],
      hints: [
        "In a BST every value in a node's left subtree is smaller than the node and every value in its right subtree is larger.",
        "Compare `val` with the current node and move left or right: you never need to look at the other side.",
        "Once the node is found, print its subtree with a breadth-first traversal using a queue.",
      ],
      editorial:
        "Walk down from the root: go left when val < node.val, right when val > node.val, and stop on equality or when you fall off the tree (print NONE). Then run a BFS from the found node to print its subtree. The search costs O(h) for a tree of height h (O(log n) when balanced, O(n) in the worst case) plus O(k) to print a subtree of k nodes; extra space O(k) for the queue.",
      solutions: {
        javascript: code`
          ${JS_BUILD_TREE}

          function solve(input) {
            const lines = input.trim().split("\n");
            const target = Number(lines[1]);
            let node = buildTree(lines[0].trim().split(/\s+/));
            while (node && node.val !== target) {
              node = target < node.val ? node.left : node.right;
            }
            if (!node) return "NONE";
            const out = [];
            const queue = [node];
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


          def solve(input_str):
              lines = input_str.strip().split("\n")
              target = int(lines[1])
              node = build_tree(lines[0].split())
              while node is not None and node.val != target:
                  node = node.left if target < node.val else node.right
              if node is None:
                  return "NONE"
              out = []
              queue = [node]
              for current in queue:
                  out.append(str(current.val))
                  if current.left:
                      queue.append(current.left)
                  if current.right:
                      queue.append(current.right)
              return " ".join(out)
        `,
      },
    },
    {
      title: "Validate Binary Search Tree",
      difficulty: "Medium",
      description: `Given the root of a binary tree, print \`true\` if it is a valid binary search tree (BST), otherwise \`false\`.\n\nA valid BST satisfies all of the following:\n- the left subtree of a node contains only values strictly less than the node's value;\n- the right subtree of a node contains only values strictly greater than the node's value;\n- both the left and right subtrees are valid BSTs.\n\n${TREE_INPUT_NOTE}`,
      constraints: "1 <= number of nodes <= 10^4\n-2^31 <= Node.val <= 2^31 - 1",
      inputFormat: "One line: the tree in level order (`null` for missing children).",
      outputFormat: "`true` or `false`.",
      examples: [{ input: "2 1 3", output: "true", explanation: "1 < 2 < 3, so every node respects the BST ordering." }],
      testCases: [
        { input: "2 1 3", expectedOutput: "true", isHidden: false },
        { input: "5 1 4 null null 3 6", expectedOutput: "false", isHidden: false },
        { input: "5 4 6 null null 3 7", expectedOutput: "false", isHidden: true },
        { input: "2 2 2", expectedOutput: "false", isHidden: true },
        { input: "1", expectedOutput: "true", isHidden: true },
        { input: "-2147483648 null 2147483647", expectedOutput: "true", isHidden: true },
        { input: "10 5 15 3 7 12 20 1 null 6 8", expectedOutput: "true", isHidden: true },
        { input: VALID_BST_LARGE, expectedOutput: "true", isHidden: true },
        { input: INVALID_BST_LARGE, expectedOutput: "false", isHidden: true },
      ],
      hints: [
        "Comparing a node only with its direct children is not enough: a value deep in the right subtree must still be greater than the root.",
        "Pass down an allowed open interval (low, high) for every node; going left tightens `high`, going right tightens `low`.",
        "Alternatively, an in-order traversal of a valid BST visits the values in strictly increasing order.",
      ],
      editorial:
        "Do an in-order traversal (left, node, right) with an explicit stack and remember the previously visited value. In a valid BST the in-order sequence is strictly increasing, so the tree is invalid as soon as a value is <= the previous one. The equivalent recursive formulation passes (low, high) bounds down the tree. Every node is visited once: time O(n), space O(h) for the stack where h is the tree height.",
      solutions: {
        javascript: code`
          ${JS_BUILD_TREE}

          function solve(input) {
            const stack = [];
            let node = buildTree(input.trim().split(/\s+/));
            let previous = -Infinity;
            while (node || stack.length) {
              while (node) {
                stack.push(node);
                node = node.left;
              }
              node = stack.pop();
              if (node.val <= previous) return "false";
              previous = node.val;
              node = node.right;
            }
            return "true";
          }
        `,
        python: code`
          ${PY_BUILD_TREE}


          def solve(input_str):
              stack = []
              node = build_tree(input_str.split())
              previous = float("-inf")
              while node is not None or stack:
                  while node is not None:
                      stack.append(node)
                      node = node.left
                  node = stack.pop()
                  if node.val <= previous:
                      return "false"
                  previous = node.val
                  node = node.right
              return "true"
        `,
      },
    },
    {
      title: "Maximum Sum BST in Binary Tree",
      difficulty: "Hard",
      description: `Given the root of a binary tree, find the maximum sum of all keys of any subtree that is also a binary search tree (BST).\n\nA subtree consists of a node and all of its descendants. A BST requires every value in a node's left subtree to be strictly smaller than the node, every value in its right subtree to be strictly larger, and both subtrees to be BSTs. The empty subtree counts as a BST with sum \`0\`, so the answer is never negative.\n\n${TREE_INPUT_NOTE}`,
      constraints: "1 <= number of nodes <= 4 * 10^4\n-4 * 10^4 <= Node.val <= 4 * 10^4",
      inputFormat: "One line: the tree in level order (`null` for missing children).",
      outputFormat: "The maximum sum of a BST subtree as an integer (`0` if every non-empty BST subtree has a negative sum).",
      examples: [
        {
          input: "1 4 3 2 4 2 5 null null null null null null 4 6",
          output: "20",
          explanation: "The subtree rooted at 3 (values 3, 2, 5, 4, 6) is a BST with sum 20. The subtree rooted at 4 is not a BST because its right child 4 is not larger than 4.",
        },
      ],
      testCases: [
        { input: "1 4 3 2 4 2 5 null null null null null null 4 6", expectedOutput: "20", isHidden: false },
        { input: "4 3 null 1 2", expectedOutput: "2", isHidden: false },
        { input: "-4 -2 -5", expectedOutput: "0", isHidden: true },
        { input: "2 1 3", expectedOutput: "6", isHidden: true },
        { input: "5 4 8 3 null 6 3", expectedOutput: "7", isHidden: true },
        { input: "1 null 10 -5 20", expectedOutput: "25", isHidden: true },
        { input: "10 5 15 1 8 null 7", expectedOutput: "14", isHidden: true },
        { input: MAX_SUM_BST_LARGE, expectedOutput: "1754251", isHidden: true },
      ],
      hints: [
        "Checking every subtree separately repeats a lot of work; compute everything bottom-up in a single post-order pass.",
        "For each node, summarise its subtree with four facts: is it a BST, its minimum, its maximum and its sum.",
        "A node roots a BST exactly when both children do and left.max < node.val < right.min; an empty child is a BST with min = +infinity and max = -infinity.",
      ],
      editorial:
        "Process nodes children-first (post-order, or the reverse of a BFS order to avoid deep recursion). For every node combine its children's (isBST, min, max, sum): if both are BSTs and left.max < val < right.min, the node's subtree is a BST with sum left.sum + right.sum + val, min = min(left.min, val) and max = max(right.max, val), and the answer is updated with that sum. Otherwise the subtree is not a BST, and neither is any subtree containing it. The answer starts at 0 for the empty BST. Time O(n), space O(n).",
      solutions: {
        javascript: code`
          ${JS_BUILD_TREE}

          function solve(input) {
            const root = buildTree(input.trim().split(/\s+/));
            // BFS order reversed visits children before parents, so no recursion is needed.
            const order = root ? [root] : [];
            for (let i = 0; i < order.length; i++) {
              if (order[i].left) order.push(order[i].left);
              if (order[i].right) order.push(order[i].right);
            }
            const EMPTY = { isBst: true, min: Infinity, max: -Infinity, sum: 0 };
            const NOT_BST = { isBst: false, min: 0, max: 0, sum: 0 };
            const info = new Map();
            let best = 0;
            for (let i = order.length - 1; i >= 0; i--) {
              const node = order[i];
              const left = node.left ? info.get(node.left) : EMPTY;
              const right = node.right ? info.get(node.right) : EMPTY;
              if (left.isBst && right.isBst && left.max < node.val && node.val < right.min) {
                const sum = left.sum + right.sum + node.val;
                best = Math.max(best, sum);
                info.set(node, { isBst: true, min: Math.min(left.min, node.val), max: Math.max(right.max, node.val), sum });
              } else {
                info.set(node, NOT_BST);
              }
            }
            return String(best);
          }
        `,
        python: code`
          ${PY_BUILD_TREE}


          def solve(input_str):
              root = build_tree(input_str.split())
              # BFS order reversed visits children before parents, so no recursion is needed.
              order = [root] if root else []
              for node in order:
                  if node.left:
                      order.append(node.left)
                  if node.right:
                      order.append(node.right)
              empty = (True, float("inf"), float("-inf"), 0)
              not_bst = (False, 0, 0, 0)
              info = {}
              best = 0
              for node in reversed(order):
                  left = info[node.left] if node.left else empty
                  right = info[node.right] if node.right else empty
                  if left[0] and right[0] and left[2] < node.val < right[1]:
                      total = left[3] + right[3] + node.val
                      best = max(best, total)
                      info[node] = (True, min(left[1], node.val), max(right[2], node.val), total)
                  else:
                      info[node] = not_bst
              return str(best)
        `,
      },
    },
  ],
  heaps: [
    {
      title: "Last Stone Weight",
      difficulty: "Easy",
      description:
        "You are given an array of integers `stones` where `stones[i]` is the weight of the i-th stone.\n\nEach turn, take the two heaviest stones, with weights `x <= y`, and smash them together: if `x == y` both stones are destroyed; otherwise the stone of weight `x` is destroyed and the other stone's weight becomes `y - x`.\n\nWhen at most one stone is left, print its weight, or `0` if no stones remain.",
      constraints: "1 <= stones.length <= 1000\n1 <= stones[i] <= 1000",
      inputFormat: "One line of space-separated integers `stones`.",
      outputFormat: "The weight of the last remaining stone, or `0` if none is left.",
      examples: [
        {
          input: "2 7 4 1 8 1",
          output: "1",
          explanation: "Smash 7 and 8 -> 1 (stones 2 4 1 1 1); smash 2 and 4 -> 2 (2 1 1 1); smash 2 and 1 -> 1 (1 1 1); smash 1 and 1 -> both destroyed (1). The last stone weighs 1.",
        },
      ],
      testCases: [
        { input: "2 7 4 1 8 1", expectedOutput: "1", isHidden: false },
        { input: "1", expectedOutput: "1", isHidden: false },
        { input: "5 5", expectedOutput: "0", isHidden: true },
        { input: "3 7 2", expectedOutput: "2", isHidden: true },
        { input: "10 4 2 10", expectedOutput: "2", isHidden: true },
        { input: "1 1 1 1", expectedOutput: "0", isHidden: true },
        { input: "9 3 2 10", expectedOutput: "0", isHidden: true },
        { input: "1000 1 1 1", expectedOutput: "997", isHidden: true },
      ],
      hints: [
        "Every turn needs the two largest values of a collection that keeps changing.",
        "A max-heap (priority queue) returns and removes the largest element in O(log n).",
        "Pop two stones, push back their difference if it is non-zero, and repeat while more than one stone remains.",
      ],
      editorial:
        "Put all stones in a max-heap. While it holds at least two stones, pop y (the largest) and x (the second largest) and push y - x back if it is positive. The answer is the remaining stone, or 0 if the heap is empty. Every turn removes at least one stone, so there are at most n turns of O(log n) each: time O(n log n), space O(n).",
      solutions: {
        javascript: code`
          ${JS_HEAP}

          function solve(input) {
            const heap = new Heap((a, b) => a > b);
            for (const token of input.trim().split(/\s+/)) heap.push(Number(token));
            while (heap.size > 1) {
              const y = heap.pop();
              const x = heap.pop();
              if (y !== x) heap.push(y - x);
            }
            return String(heap.size ? heap.peek() : 0);
          }
        `,
        python: code`
          import heapq


          def solve(input_str):
              heap = [-int(token) for token in input_str.split()]
              heapq.heapify(heap)
              while len(heap) > 1:
                  y = -heapq.heappop(heap)
                  x = -heapq.heappop(heap)
                  if y != x:
                      heapq.heappush(heap, -(y - x))
              return str(-heap[0]) if heap else "0"
        `,
      },
    },
    {
      title: "Top K Frequent Elements",
      difficulty: "Medium",
      description:
        "Given an integer array `nums` and an integer `k`, find the `k` most frequent elements.\n\nPrint them ordered by frequency, most frequent first. When two elements have the same frequency, the smaller value comes first; this tie-break also decides which elements are included when several values tie at the cut-off.",
      constraints: "1 <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4\n1 <= k <= number of distinct values in nums",
      inputFormat: "Line 1: space-separated integers `nums`.\nLine 2: the integer `k`.",
      outputFormat: "`k` space-separated values, sorted by frequency (descending) and then by value (ascending).",
      examples: [{ input: "1 1 1 2 2 3\n2", output: "1 2", explanation: "1 appears three times and 2 twice, so they are the two most frequent values." }],
      testCases: [
        { input: "1 1 1 2 2 3\n2", expectedOutput: "1 2", isHidden: false },
        { input: "1\n1", expectedOutput: "1", isHidden: false },
        { input: "4 4 -1 -1 7\n2", expectedOutput: "-1 4", isHidden: true },
        { input: "5 3 5 3 5 3 9\n3", expectedOutput: "3 5 9", isHidden: true },
        { input: "1 2 3 4\n4", expectedOutput: "1 2 3 4", isHidden: true },
        { input: "7 7 7 8 8 9 9 10\n2", expectedOutput: "7 8", isHidden: true },
        { input: "-10000 10000 10000 -10000 0\n1", expectedOutput: "-10000", isHidden: true },
        { input: TOP_K_LARGE, expectedOutput: "-700 -628 -680 -560 -532 -520 -620 -610 -556 -616 -595 -502 -460 -688 -640", isHidden: true },
      ],
      hints: [
        "Count how often each value occurs with a hash map.",
        "Sorting all distinct values by frequency works, but you only need the best k of them.",
        "Keep a min-heap of at most k entries whose top is the weakest entry (lowest count, then largest value); pop it whenever the heap grows beyond k.",
      ],
      editorial:
        "Count frequencies in a hash map in O(n). Push each (value, count) pair into a min-heap whose top is the weakest entry: the lowest count, and among equal counts the largest value. Whenever the heap holds more than k entries, pop the top. After all m distinct values are processed the heap contains exactly the answer; popping everything and reversing yields most-frequent-first order. Time O(n + m log k), space O(m). Bucket sort by frequency is an O(n) alternative.",
      solutions: {
        javascript: code`
          ${JS_HEAP}

          function solve(input) {
            const lines = input.trim().split("\n");
            const nums = lines[0].trim().split(/\s+/).map(Number);
            const k = Number(lines[1]);
            const counts = new Map();
            for (const num of nums) counts.set(num, (counts.get(num) || 0) + 1);
            // Entries are [value, count]; the weakest (lowest count, then largest value) sits on top.
            const heap = new Heap((a, b) => a[1] < b[1] || (a[1] === b[1] && a[0] > b[0]));
            for (const entry of counts) {
              heap.push(entry);
              if (heap.size > k) heap.pop();
            }
            const out = [];
            while (heap.size) out.push(heap.pop()[0]);
            return out.reverse().join(" ");
          }
        `,
        python: code`
          import heapq
          from collections import Counter


          def solve(input_str):
              lines = input_str.strip().split("\n")
              nums = list(map(int, lines[0].split()))
              k = int(lines[1])
              counts = Counter(nums)
              best = heapq.nsmallest(k, counts.items(), key=lambda item: (-item[1], item[0]))
              return " ".join(str(value) for value, _ in best)
        `,
      },
    },
    {
      title: "Find Median from Data Stream",
      difficulty: "Hard",
      description:
        "Design a data structure that receives integers from a stream and can report the median of all integers added so far.\n\nProcess the operations in order:\n- `addNum x`: add the integer `x` to the data structure.\n- `findMedian`: print the median of all numbers added so far. With an odd count it is the middle value of the sorted numbers; with an even count it is the mean of the two middle values.\n\nPrint every median with exactly one digit after the decimal point (for example `2.0` or `-1.5`).",
      constraints: "-10^5 <= x <= 10^5\nAt most 5 * 10^4 operations.\n`findMedian` is only called after at least one `addNum`, and there is at least one `findMedian`.",
      inputFormat: "One operation per line: `addNum x` or `findMedian`.",
      outputFormat: "One line per `findMedian` operation: the median with exactly one decimal place.",
      examples: [
        {
          input: "addNum 1\naddNum 2\nfindMedian\naddNum 3\nfindMedian",
          output: "1.5\n2.0",
          explanation: "After adding 1 and 2 the median is (1 + 2) / 2 = 1.5. After adding 3 the sorted stream is 1 2 3 and the median is 2.",
        },
      ],
      testCases: [
        { input: "addNum 1\naddNum 2\nfindMedian\naddNum 3\nfindMedian", expectedOutput: "1.5\n2.0", isHidden: false },
        { input: "addNum 5\nfindMedian", expectedOutput: "5.0", isHidden: false },
        {
          input: "addNum -1\naddNum -2\nfindMedian\naddNum -3\nfindMedian\naddNum -4\nfindMedian\naddNum -5\nfindMedian",
          expectedOutput: "-1.5\n-2.0\n-2.5\n-3.0",
          isHidden: true,
        },
        { input: "addNum 2\naddNum 2\naddNum 2\nfindMedian\naddNum 1\nfindMedian", expectedOutput: "2.0\n2.0", isHidden: true },
        {
          input: "addNum 6\naddNum 10\naddNum 2\naddNum 6\naddNum 5\naddNum 0\nfindMedian\naddNum 6\nfindMedian\naddNum 3\nfindMedian",
          expectedOutput: "5.5\n6.0\n5.5",
          isHidden: true,
        },
        { input: "addNum -1\naddNum 0\nfindMedian\naddNum 1\nfindMedian\nfindMedian", expectedOutput: "-0.5\n0.0\n0.0", isHidden: true },
        { input: "addNum 100000\naddNum -100000\nfindMedian\naddNum 99999\nfindMedian", expectedOutput: "0.0\n99999.0", isHidden: true },
        medianStreamCase(11, 1400),
      ],
      hints: [
        "Re-sorting the whole stream on every query costs O(n log n) per findMedian.",
        "Split the numbers into a lower half and an upper half: the median only depends on the largest value of the lower half and the smallest value of the upper half.",
        "Keep the lower half in a max-heap and the upper half in a min-heap, rebalancing so the lower half has the same size as the upper half or one element more.",
      ],
      editorial:
        "Maintain two heaps: `low`, a max-heap holding the smaller half, and `high`, a min-heap holding the larger half, with size(low) == size(high) or size(low) == size(high) + 1. To add x, push it into low, move low's maximum into high, and if high is now larger than low, move high's minimum back into low. The median is low's top when the count is odd, or the mean of both tops when it is even. addNum is O(log n) and findMedian is O(1); space O(n).",
      solutions: {
        javascript: code`
          ${JS_HEAP}

          function solve(input) {
            const low = new Heap((a, b) => a > b); // max-heap with the smaller half
            const high = new Heap((a, b) => a < b); // min-heap with the larger half
            const out = [];
            for (const line of input.trim().split("\n")) {
              const [op, arg] = line.trim().split(/\s+/);
              if (op === "addNum") {
                low.push(Number(arg));
                high.push(low.pop());
                if (high.size > low.size) low.push(high.pop());
              } else if (op === "findMedian") {
                const median = low.size > high.size ? low.peek() : (low.peek() + high.peek()) / 2;
                out.push(median.toFixed(1));
              }
            }
            return out.join("\n");
          }
        `,
        python: code`
          import heapq


          def solve(input_str):
              low, high = [], []  # low: max-heap (negated) with the smaller half, high: min-heap with the larger half
              out = []
              for line in input_str.strip().split("\n"):
                  parts = line.split()
                  if not parts:
                      continue
                  if parts[0] == "addNum":
                      heapq.heappush(low, -int(parts[1]))
                      heapq.heappush(high, -heapq.heappop(low))
                      if len(high) > len(low):
                          heapq.heappush(low, -heapq.heappop(high))
                  elif parts[0] == "findMedian":
                      if len(low) > len(high):
                          median = float(-low[0])
                      else:
                          median = (-low[0] + high[0]) / 2
                      out.append(f"{median:.1f}")
              return "\n".join(out)
        `,
      },
    },
  ],
  graphs: [
    {
      title: "Find if Path Exists in Graph",
      difficulty: "Easy",
      description:
        "There is an undirected graph with `n` vertices labelled `0` to `n - 1` and `m` edges. Determine whether there is a path from vertex `source` to vertex `destination`.\n\nPrint `true` if such a path exists, otherwise `false`. Every vertex has a path to itself.",
      constraints: "1 <= n <= 2 * 10^5\n0 <= m <= 2 * 10^5\n0 <= u, v <= n - 1 and u != v for every edge; there are no duplicate edges.\n0 <= source, destination <= n - 1",
      inputFormat: "Line 1: two integers `n m` (number of vertices and edges).\nNext `m` lines: an edge `u v`.\nLast line: `source destination`.",
      outputFormat: "`true` or `false`.",
      examples: [{ input: "3 3\n0 1\n1 2\n2 0\n0 2", output: "true", explanation: "Vertex 2 is reachable from 0 directly (edge 2-0) or through 0 -> 1 -> 2." }],
      testCases: [
        { input: "3 3\n0 1\n1 2\n2 0\n0 2", expectedOutput: "true", isHidden: false },
        { input: "6 5\n0 1\n0 2\n3 5\n5 4\n4 3\n0 5", expectedOutput: "false", isHidden: false },
        { input: "1 0\n0 0", expectedOutput: "true", isHidden: true },
        { input: "2 0\n0 1", expectedOutput: "false", isHidden: true },
        { input: "5 4\n0 1\n1 2\n2 3\n3 4\n4 0", expectedOutput: "true", isHidden: true },
        { input: "4 2\n0 1\n2 3\n1 2", expectedOutput: "false", isHidden: true },
        { input: "7 6\n0 1\n1 2\n3 4\n4 5\n5 6\n6 3\n2 2", expectedOutput: "true", isHidden: true },
      ],
      hints: [
        "Store the graph as an adjacency list: for every edge `u v`, add v to u's list and u to v's list.",
        "Explore everything reachable from `source` with BFS or DFS, marking vertices as visited so none is processed twice.",
        "Union-Find also works: union the endpoints of every edge, then check whether source and destination share a root.",
      ],
      editorial:
        "Build an adjacency list and run a BFS from source with a visited array, answering true as soon as destination is dequeued (this also covers source == destination). If the queue empties first, the answer is false. Each vertex and edge is processed at most once: time O(n + m), space O(n + m).",
      solutions: {
        javascript: code`
          function solve(input) {
            const data = input.trim().split(/\s+/).map(Number);
            const n = data[0];
            const m = data[1];
            const adjacency = Array.from({ length: n }, () => []);
            let p = 2;
            for (let i = 0; i < m; i++) {
              const u = data[p++];
              const v = data[p++];
              adjacency[u].push(v);
              adjacency[v].push(u);
            }
            const source = data[p++];
            const destination = data[p++];
            const visited = new Uint8Array(n);
            visited[source] = 1;
            const queue = [source];
            for (let i = 0; i < queue.length; i++) {
              const u = queue[i];
              if (u === destination) return "true";
              for (const v of adjacency[u]) {
                if (!visited[v]) {
                  visited[v] = 1;
                  queue.push(v);
                }
              }
            }
            return "false";
          }
        `,
        python: code`
          from collections import deque


          def solve(input_str):
              data = list(map(int, input_str.split()))
              n, m = data[0], data[1]
              adjacency = [[] for _ in range(n)]
              p = 2
              for _ in range(m):
                  u, v = data[p], data[p + 1]
                  p += 2
                  adjacency[u].append(v)
                  adjacency[v].append(u)
              source, destination = data[p], data[p + 1]
              visited = [False] * n
              visited[source] = True
              queue = deque([source])
              while queue:
                  u = queue.popleft()
                  if u == destination:
                      return "true"
                  for v in adjacency[u]:
                      if not visited[v]:
                          visited[v] = True
                          queue.append(v)
              return "false"
        `,
      },
    },
    {
      title: "Number of Islands",
      difficulty: "Medium",
      description:
        "You are given an `m x n` grid where `1` represents land and `0` represents water. An island is a maximal group of land cells connected horizontally or vertically (diagonal neighbours do not connect). Everything outside the grid is water.\n\nPrint the number of islands.",
      constraints: "1 <= m, n <= 300\nEvery cell is `0` or `1`.",
      inputFormat: "`m` lines, one per grid row: a string of `n` characters, each `0` or `1` (no spaces).",
      outputFormat: "The number of islands.",
      examples: [{ input: "11110\n11010\n11000\n00000", output: "1", explanation: "All land cells are connected horizontally or vertically, forming a single island." }],
      testCases: [
        { input: "11110\n11010\n11000\n00000", expectedOutput: "1", isHidden: false },
        { input: "11000\n11000\n00100\n00011", expectedOutput: "3", isHidden: false },
        { input: "0", expectedOutput: "0", isHidden: true },
        { input: "1", expectedOutput: "1", isHidden: true },
        { input: "10101\n01010\n10101", expectedOutput: "8", isHidden: true },
        { input: "111\n101\n111", expectedOutput: "1", isHidden: true },
        { input: "1\n0\n1\n1", expectedOutput: "2", isHidden: true },
        { input: "1011\n1001\n0110", expectedOutput: "3", isHidden: true },
        { input: ISLANDS_LARGE, expectedOutput: "993", isHidden: true },
      ],
      hints: [
        "Scan the grid; every land cell that has not been visited yet starts a new island.",
        "From that cell, flood-fill (BFS or DFS) all connected land cells so they are never counted again.",
        "Mark visited land by turning it into `0` (or with a visited array); an explicit stack or queue avoids deep recursion on huge islands.",
      ],
      editorial:
        "Iterate over all cells. When a `1` is found, increment the island counter and flood-fill its island with BFS/DFS, turning every reached land cell into `0` so it is not counted again. Every cell is pushed at most once: time O(m * n), space O(m * n) in the worst case for the stack. Union-Find over land cells is an alternative.",
      solutions: {
        javascript: code`
          function solve(input) {
            const grid = input.trim().split("\n").map((row) => row.trim().split(""));
            const rows = grid.length;
            const cols = grid[0].length;
            let islands = 0;
            for (let r = 0; r < rows; r++) {
              for (let c = 0; c < cols; c++) {
                if (grid[r][c] !== "1") continue;
                islands++;
                grid[r][c] = "0";
                const stack = [[r, c]];
                while (stack.length) {
                  const [cr, cc] = stack.pop();
                  for (const [nr, nc] of [[cr + 1, cc], [cr - 1, cc], [cr, cc + 1], [cr, cc - 1]]) {
                    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === "1") {
                      grid[nr][nc] = "0";
                      stack.push([nr, nc]);
                    }
                  }
                }
              }
            }
            return String(islands);
          }
        `,
        python: code`
          def solve(input_str):
              grid = [list(row.strip()) for row in input_str.strip().split("\n")]
              rows, cols = len(grid), len(grid[0])
              islands = 0
              for r in range(rows):
                  for c in range(cols):
                      if grid[r][c] != "1":
                          continue
                      islands += 1
                      grid[r][c] = "0"
                      stack = [(r, c)]
                      while stack:
                          cr, cc = stack.pop()
                          for nr, nc in ((cr + 1, cc), (cr - 1, cc), (cr, cc + 1), (cr, cc - 1)):
                              if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == "1":
                                  grid[nr][nc] = "0"
                                  stack.append((nr, nc))
              return str(islands)
        `,
      },
    },
    {
      title: "Word Ladder",
      difficulty: "Hard",
      description:
        "A transformation sequence from `beginWord` to `endWord` using a dictionary `wordList` is a sequence of words `beginWord -> s1 -> s2 -> ... -> sk` such that every adjacent pair of words differs by exactly one letter, every `si` is in `wordList`, and `sk == endWord`. `beginWord` does not need to be in `wordList`.\n\nPrint the number of words in the shortest transformation sequence (counting both `beginWord` and `endWord`), or `0` if no such sequence exists.",
      constraints: "1 <= beginWord.length <= 10\n`endWord` and every word in `wordList` have the same length as `beginWord`.\n1 <= wordList.length <= 5000\nAll words consist of lowercase English letters; beginWord != endWord; the words in wordList are unique.",
      inputFormat: "Line 1: `beginWord endWord`.\nLine 2: the space-separated words of `wordList`.",
      outputFormat: "The number of words in the shortest transformation sequence, or `0`.",
      examples: [{ input: "hit cog\nhot dot dog lot log cog", output: "5", explanation: "hit -> hot -> dot -> dog -> cog is a shortest sequence and has 5 words." }],
      testCases: [
        { input: "hit cog\nhot dot dog lot log cog", expectedOutput: "5", isHidden: false },
        { input: "hit cog\nhot dot dog lot log", expectedOutput: "0", isHidden: false },
        { input: "a c\na b c", expectedOutput: "2", isHidden: true },
        { input: "hot dog\nhot dog", expectedOutput: "0", isHidden: true },
        { input: "red tax\nted tex red tax tad den rex pee", expectedOutput: "4", isHidden: true },
        { input: "lost cost\nmost fost cost lost", expectedOutput: "2", isHidden: true },
        { input: "abc xyz\nabz ayz xyz axc", expectedOutput: "4", isHidden: true },
        { input: WORD_LADDER_LARGE, expectedOutput: "7", isHidden: true },
      ],
      hints: [
        "Treat every word as a vertex and connect words that differ by exactly one letter; the answer is a shortest path, so use BFS.",
        "Comparing every pair of words costs O(N^2 * L). Instead, generate a word's neighbours by trying all 26 letters at each position and looking them up in a hash set.",
        "Remove a word from the set as soon as it is enqueued so each word is visited once, and stop the moment endWord is generated.",
      ],
      editorial:
        "Put wordList in a hash set and return 0 immediately if endWord is missing. Run a level-by-level BFS from beginWord: for each word of the current level, for every position and every letter a-z build a candidate; if it is in the set, remove it and add it to the next level, answering the current sequence length + 1 as soon as the candidate equals endWord. Each of the N words is expanded once with 26 * L candidates of length L: time O(N * 26 * L^2), space O(N * L). Bidirectional BFS shrinks the explored frontier further.",
      solutions: {
        javascript: code`
          function solve(input) {
            const lines = input.trim().split("\n");
            const [beginWord, endWord] = lines[0].trim().split(/\s+/);
            const words = new Set((lines[1] || "").trim().split(/\s+/).filter(Boolean));
            if (!words.has(endWord)) return "0";
            const letters = "abcdefghijklmnopqrstuvwxyz";
            words.delete(beginWord);
            let frontier = [beginWord];
            let length = 1;
            while (frontier.length) {
              length++;
              const next = [];
              for (const word of frontier) {
                for (let i = 0; i < word.length; i++) {
                  const head = word.slice(0, i);
                  const tail = word.slice(i + 1);
                  for (const letter of letters) {
                    const candidate = head + letter + tail;
                    if (!words.has(candidate)) continue;
                    if (candidate === endWord) return String(length);
                    words.delete(candidate);
                    next.push(candidate);
                  }
                }
              }
              frontier = next;
            }
            return "0";
          }
        `,
        python: code`
          from string import ascii_lowercase


          def solve(input_str):
              lines = input_str.strip().split("\n")
              begin_word, end_word = lines[0].split()
              words = set(lines[1].split()) if len(lines) > 1 else set()
              if end_word not in words:
                  return "0"
              words.discard(begin_word)
              frontier = [begin_word]
              length = 1
              while frontier:
                  length += 1
                  next_level = []
                  for word in frontier:
                      for i in range(len(word)):
                          head, tail = word[:i], word[i + 1:]
                          for letter in ascii_lowercase:
                              candidate = head + letter + tail
                              if candidate not in words:
                                  continue
                              if candidate == end_word:
                                  return str(length)
                              words.remove(candidate)
                              next_level.append(candidate)
                  frontier = next_level
              return "0"
        `,
      },
    },
  ],
  tries: [
    {
      title: "Longest Common Prefix",
      difficulty: "Easy",
      description:
        "Given a list of lowercase words, find the longest string that is a prefix of every word.\n\nPrint that prefix, or `NONE` if the words have no common prefix.",
      constraints: "1 <= words.length <= 200\n1 <= words[i].length <= 200\nwords[i] consists of lowercase English letters.",
      inputFormat: "One line of space-separated words.",
      outputFormat: "The longest common prefix, or `NONE` if it is empty.",
      examples: [{ input: "flower flow flight", output: "fl", explanation: "All three words start with \"fl\", but their third letters differ (o, o, i)." }],
      testCases: [
        { input: "flower flow flight", expectedOutput: "fl", isHidden: false },
        { input: "dog racecar car", expectedOutput: "NONE", isHidden: false },
        { input: "alone", expectedOutput: "alone", isHidden: true },
        { input: "interspecies interstellar interstate", expectedOutput: "inters", isHidden: true },
        { input: "ab a", expectedOutput: "a", isHidden: true },
        { input: "same same same", expectedOutput: "same", isHidden: true },
        { input: "abc abd xbc", expectedOutput: "NONE", isHidden: true },
        { input: "prefix prefixes prefixed pre", expectedOutput: "pre", isHidden: true },
      ],
      hints: [
        "The common prefix can never be longer than the shortest word.",
        "Insert every word into a trie; the common prefix is the path from the root along which every node has exactly one child.",
        "Stop walking as soon as a node has several children or marks the end of a word.",
      ],
      editorial:
        "Build a trie of all the words, marking the node where each word ends. Starting at the root, follow the only child while the current node has exactly one child and no word ends there; the letters on this path form the longest common prefix. Building the trie costs O(S) for S total characters and the walk is bounded by the shortest word: time O(S), space O(S). Vertical scanning (comparing column by column across all words) is an O(S)-time, O(1)-space alternative.",
      solutions: {
        javascript: code`
          function solve(input) {
            const words = input.trim().split(/\s+/);
            const root = { children: new Map(), end: false };
            for (const word of words) {
              let node = root;
              for (const letter of word) {
                if (!node.children.has(letter)) node.children.set(letter, { children: new Map(), end: false });
                node = node.children.get(letter);
              }
              node.end = true;
            }
            let prefix = "";
            let node = root;
            while (node.children.size === 1 && !node.end) {
              const [letter, child] = node.children.entries().next().value;
              prefix += letter;
              node = child;
            }
            return prefix || "NONE";
          }
        `,
        python: code`
          END = "#"


          def solve(input_str):
              root = {}
              for word in input_str.split():
                  node = root
                  for letter in word:
                      node = node.setdefault(letter, {})
                  node[END] = True
              prefix = []
              node = root
              while len(node) == 1 and END not in node:
                  letter, node = next(iter(node.items()))
                  prefix.append(letter)
              return "".join(prefix) or "NONE"
        `,
      },
    },
    {
      title: "Implement Trie (Prefix Tree)",
      difficulty: "Medium",
      description:
        "Implement a trie (prefix tree) that stores lowercase words and supports three operations:\n- `insert word`: insert `word` into the trie (inserting the same word again has no extra effect).\n- `search word`: print `true` if `word` has been inserted before, otherwise `false`.\n- `startsWith prefix`: print `true` if some previously inserted word starts with `prefix`, otherwise `false`.\n\nProcess the operations in order and print the result of every `search` and `startsWith` operation on its own line.",
      constraints: "1 <= word.length, prefix.length <= 2000\nWords and prefixes consist of lowercase English letters.\nAt most 3 * 10^4 operations, including at least one `search` or `startsWith`.",
      inputFormat: "One operation per line: `insert word`, `search word` or `startsWith prefix`.",
      outputFormat: "One line (`true` or `false`) per `search` / `startsWith` operation, in input order.",
      examples: [
        {
          input: "insert apple\nsearch apple\nsearch app\nstartsWith app\ninsert app\nsearch app",
          output: "true\nfalse\ntrue\ntrue",
          explanation: "\"app\" is only a prefix of \"apple\" until \"app\" itself is inserted; after that, search app returns true.",
        },
      ],
      testCases: [
        { input: "insert apple\nsearch apple\nsearch app\nstartsWith app\ninsert app\nsearch app", expectedOutput: "true\nfalse\ntrue\ntrue", isHidden: false },
        { input: "search a\nstartsWith a\ninsert a\nsearch a\nstartsWith a", expectedOutput: "false\nfalse\ntrue\ntrue", isHidden: false },
        { input: "insert abc\ninsert abc\nsearch abc\nsearch ab\nstartsWith abcd\nstartsWith abc", expectedOutput: "true\nfalse\nfalse\ntrue", isHidden: true },
        {
          input: "insert banana\ninsert band\ninsert bandana\nstartsWith ban\nsearch ban\nsearch band\nstartsWith bandan\nsearch bandanas",
          expectedOutput: "true\nfalse\ntrue\ntrue\nfalse",
          isHidden: true,
        },
        { input: "insert z\nstartsWith y\nsearch zz\nstartsWith z", expectedOutput: "false\nfalse\ntrue", isHidden: true },
        { input: "insert car\ninsert cart\nsearch cart\nsearch car\nsearch ca\nstartsWith carts\nstartsWith c", expectedOutput: "true\ntrue\nfalse\nfalse\ntrue", isHidden: true },
        trieOperationsCase(3, 1300),
      ],
      hints: [
        "Each trie node holds up to 26 children (one per letter) and a flag telling whether a word ends at that node.",
        "insert walks down from the root, creating missing children along the way, and marks the last node as the end of a word.",
        "search and startsWith share the same walk; search additionally requires the final node to be marked as a word end.",
      ],
      editorial:
        "Keep a tree of nodes, each with a child map (or a 26-slot array) and an `end` flag. insert follows or creates one node per character and sets `end` on the last node; search follows the characters and returns the last node's `end` flag (false if the path breaks); startsWith only checks that the whole path exists. Every operation costs O(L) for a string of length L, and the trie uses O(total inserted characters) space.",
      solutions: {
        javascript: code`
          class Trie {
            constructor() {
              this.root = { children: new Map(), end: false };
            }

            insert(word) {
              let node = this.root;
              for (const letter of word) {
                if (!node.children.has(letter)) node.children.set(letter, { children: new Map(), end: false });
                node = node.children.get(letter);
              }
              node.end = true;
            }

            walk(text) {
              let node = this.root;
              for (const letter of text) {
                node = node.children.get(letter);
                if (!node) return null;
              }
              return node;
            }

            search(word) {
              const node = this.walk(word);
              return node !== null && node.end;
            }

            startsWith(prefix) {
              return this.walk(prefix) !== null;
            }
          }

          function solve(input) {
            const trie = new Trie();
            const out = [];
            for (const line of input.trim().split("\n")) {
              const [op, arg] = line.trim().split(/\s+/);
              if (op === "insert") trie.insert(arg);
              else if (op === "search") out.push(String(trie.search(arg)));
              else if (op === "startsWith") out.push(String(trie.startsWith(arg)));
            }
            return out.join("\n");
          }
        `,
        python: code`
          class TrieNode:
              __slots__ = ("children", "end")

              def __init__(self):
                  self.children = {}
                  self.end = False


          class Trie:
              def __init__(self):
                  self.root = TrieNode()

              def insert(self, word):
                  node = self.root
                  for letter in word:
                      if letter not in node.children:
                          node.children[letter] = TrieNode()
                      node = node.children[letter]
                  node.end = True

              def _walk(self, text):
                  node = self.root
                  for letter in text:
                      node = node.children.get(letter)
                      if node is None:
                          return None
                  return node

              def search(self, word):
                  node = self._walk(word)
                  return node is not None and node.end

              def starts_with(self, prefix):
                  return self._walk(prefix) is not None


          def solve(input_str):
              trie = Trie()
              out = []
              for line in input_str.strip().split("\n"):
                  parts = line.split()
                  if len(parts) < 2:
                      continue
                  op, arg = parts[0], parts[1]
                  if op == "insert":
                      trie.insert(arg)
                  elif op == "search":
                      out.append("true" if trie.search(arg) else "false")
                  elif op == "startsWith":
                      out.append("true" if trie.starts_with(arg) else "false")
              return "\n".join(out)
        `,
      },
    },
    {
      title: "Word Search II",
      difficulty: "Hard",
      description:
        "Given an `m x n` board of lowercase letters and a list of distinct words, find every word that can be formed on the board.\n\nA word is formed from the letters of sequentially adjacent cells, where adjacent cells are horizontal or vertical neighbours. The same cell may not be used more than once within one word.\n\nPrint the words that can be formed in lexicographic order, separated by spaces, or `NONE` if no word can be formed.",
      constraints: "1 <= m, n <= 12\n1 <= words.length <= 3 * 10^4\n1 <= words[i].length <= 10\nBoard cells and words consist of lowercase English letters; all words are distinct.",
      inputFormat: "Line 1: two integers `m n`.\nNext `m` lines: one board row of `n` letters (no spaces).\nLast line: the space-separated `words`.",
      outputFormat: "The found words in lexicographic order, space-separated, or `NONE`.",
      examples: [
        {
          input: "4 4\noaan\netae\nihkr\niflv\noath pea eat rain",
          output: "eat oath",
          explanation: "\"oath\" starts at the top-left o and \"eat\" runs through the middle of the board; \"pea\" and \"rain\" cannot be formed.",
        },
      ],
      testCases: [
        { input: "4 4\noaan\netae\nihkr\niflv\noath pea eat rain", expectedOutput: "eat oath", isHidden: false },
        { input: "2 2\nab\ncd\nabcb", expectedOutput: "NONE", isHidden: false },
        { input: "1 1\na\na b aa", expectedOutput: "a", isHidden: true },
        { input: "2 2\nab\ncd\nab ac bd ca abdc acdb dcba abcd", expectedOutput: "ab abdc ac acdb bd ca", isHidden: true },
        { input: "3 3\naaa\naaa\naaa\naaaaaaaaa aaaaaaaaaa a aa", expectedOutput: "a aa aaaaaaaaa", isHidden: true },
        { input: "1 3\naba\naba ab ba aa abab", expectedOutput: "ab aba ba", isHidden: true },
        { input: "3 4\ncats\nxdog\nbird\ncat dog bird cats dogs catdog rid sod", expectedOutput: "bird cat cats dog dogs rid", isHidden: true },
        {
          input: WORD_SEARCH_LARGE,
          expectedOutput:
            "aaaaaaacwc aaaaaaacwk aaaaaaaged aaaaaaaixe aaaaaaaixu aaaaaaaled aaaaaaamdi aaaaaaancs aaaaaaangi aaaaaaanxe aaaaaaapzj aaaaaaapzm aaaaaaaxge aaaaaaazde aaaaaaazgx",
          isHidden: true,
        },
      ],
      hints: [
        "Searching the board for every word separately repeats the same walks over and over for words that share a prefix.",
        "Put all words in a trie and run one DFS from every cell, moving through the trie together with the board path; abandon a path as soon as the trie has no child for the next letter.",
        "Store each complete word at its terminal trie node, clear it once reported to avoid duplicates, and prune trie branches that become empty.",
      ],
      editorial:
        "Build a trie of the words, storing each word at its terminal node. From every cell start a backtracking DFS that carries the current trie node: stop if the cell's letter is not a child of the node, record (and clear) the word when reaching a terminal node, temporarily mark the cell as used, recurse into the four neighbours and then restore the cell. Deleting trie branches that no longer lead to any word prunes the search as words are found. Finally sort the found words. The worst case is O(m * n * 4 * 3^(L - 1)) for maximum word length L, but prefixes shared by many words are explored only once; space O(total characters in words).",
      solutions: {
        javascript: code`
          function solve(input) {
            const lines = input.trim().split("\n").map((line) => line.trim());
            const [rows, cols] = lines[0].split(/\s+/).map(Number);
            const board = lines.slice(1, rows + 1).map((row) => row.split(""));
            const words = (lines[rows + 1] || "").split(/\s+/).filter(Boolean);
            const root = { children: new Map(), word: null };
            for (const word of words) {
              let node = root;
              for (const letter of word) {
                if (!node.children.has(letter)) node.children.set(letter, { children: new Map(), word: null });
                node = node.children.get(letter);
              }
              node.word = word;
            }
            const found = [];
            const dfs = (r, c, parent) => {
              const letter = board[r][c];
              const node = parent.children.get(letter);
              if (!node) return;
              if (node.word !== null) {
                found.push(node.word);
                node.word = null; // report every word once
              }
              board[r][c] = "#";
              if (r > 0) dfs(r - 1, c, node);
              if (r + 1 < rows) dfs(r + 1, c, node);
              if (c > 0) dfs(r, c - 1, node);
              if (c + 1 < cols) dfs(r, c + 1, node);
              board[r][c] = letter;
              if (node.children.size === 0 && node.word === null) parent.children.delete(letter); // prune finished branches
            };
            for (let r = 0; r < rows; r++) {
              for (let c = 0; c < cols; c++) dfs(r, c, root);
            }
            return found.length ? found.sort().join(" ") : "NONE";
          }
        `,
        python: code`
          WORD = "$"


          def solve(input_str):
              lines = [line.strip() for line in input_str.strip().split("\n")]
              rows, cols = map(int, lines[0].split())
              board = [list(row) for row in lines[1:rows + 1]]
              words = lines[rows + 1].split() if len(lines) > rows + 1 else []
              root = {}
              for word in words:
                  node = root
                  for letter in word:
                      node = node.setdefault(letter, {})
                  node[WORD] = word
              found = []

              def dfs(r, c, parent):
                  letter = board[r][c]
                  node = parent.get(letter)
                  if node is None:
                      return
                  word = node.pop(WORD, None)  # report every word once
                  if word is not None:
                      found.append(word)
                  board[r][c] = "#"
                  if r > 0:
                      dfs(r - 1, c, node)
                  if r + 1 < rows:
                      dfs(r + 1, c, node)
                  if c > 0:
                      dfs(r, c - 1, node)
                  if c + 1 < cols:
                      dfs(r, c + 1, node)
                  board[r][c] = letter
                  if not node:
                      del parent[letter]  # prune finished branches

              for r in range(rows):
                  for c in range(cols):
                      dfs(r, c, root)
              return " ".join(sorted(found)) if found else "NONE"
        `,
      },
    },
  ],
  segmentTrees: [
    {
      title: "Range Sum Query - Immutable",
      difficulty: "Easy",
      description:
        "Given an integer array `nums`, answer several queries `left right`: for each query print the sum of the elements of `nums` between indices `left` and `right` inclusive (0-indexed). The array never changes between queries.",
      constraints: "1 <= nums.length <= 10^4\n-10^5 <= nums[i] <= 10^5\n0 <= left <= right < nums.length\n1 <= number of queries <= 10^4",
      inputFormat: "Line 1: space-separated integers `nums`.\nFollowing lines: one query per line, `left right`.",
      outputFormat: "One line per query containing the range sum.",
      examples: [
        {
          input: "-2 0 3 -5 2 -1\n0 2\n2 5\n0 5",
          output: "1\n-1\n-3",
          explanation: "-2 + 0 + 3 = 1; 3 + (-5) + 2 + (-1) = -1; the whole array sums to -3.",
        },
      ],
      testCases: [
        { input: "-2 0 3 -5 2 -1\n0 2\n2 5\n0 5", expectedOutput: "1\n-1\n-3", isHidden: false },
        { input: "5\n0 0", expectedOutput: "5", isHidden: false },
        { input: "1 2 3 4 5\n0 4\n1 3\n4 4\n2 2", expectedOutput: "15\n9\n5\n3", isHidden: true },
        { input: "-1 -1 -1 -1\n0 3\n1 2", expectedOutput: "-4\n-2", isHidden: true },
        { input: "100000 100000 100000\n0 2\n1 1", expectedOutput: "300000\n100000", isHidden: true },
        { input: "3 -3 3 -3 3\n0 1\n0 4\n1 4\n3 3", expectedOutput: "0\n3\n0\n-3", isHidden: true },
      ],
      hints: [
        "Summing every range with a loop costs O(n) per query.",
        "Precompute prefix[i] = nums[0] + ... + nums[i - 1] once.",
        "The sum of nums[left..right] is prefix[right + 1] - prefix[left].",
      ],
      editorial:
        "Because the array is immutable, precompute prefix sums in O(n); every query is then answered in O(1) as prefix[right + 1] - prefix[left]. Total time O(n + q), space O(n). A segment tree answers the same queries in O(log n) and becomes the tool of choice once the array can change (see Range Sum Query - Mutable).",
      solutions: {
        javascript: code`
          function solve(input) {
            const lines = input.trim().split("\n");
            const nums = lines[0].trim().split(/\s+/).map(Number);
            const prefix = [0];
            for (const num of nums) prefix.push(prefix[prefix.length - 1] + num);
            const out = [];
            for (const line of lines.slice(1)) {
              const parts = line.trim().split(/\s+/);
              if (parts.length < 2) continue;
              const left = Number(parts[0]);
              const right = Number(parts[1]);
              out.push(prefix[right + 1] - prefix[left]);
            }
            return out.join("\n");
          }
        `,
        python: code`
          from itertools import accumulate


          def solve(input_str):
              lines = input_str.strip().split("\n")
              nums = list(map(int, lines[0].split()))
              prefix = [0] + list(accumulate(nums))
              out = []
              for line in lines[1:]:
                  parts = line.split()
                  if len(parts) < 2:
                      continue
                  left, right = int(parts[0]), int(parts[1])
                  out.append(str(prefix[right + 1] - prefix[left]))
              return "\n".join(out)
        `,
      },
    },
    {
      title: "Range Sum Query - Mutable",
      difficulty: "Medium",
      description:
        "Given an integer array `nums`, process two kinds of operations in order:\n- `update index val`: set `nums[index] = val`.\n- `sumRange left right`: print the sum of `nums[left..right]` (inclusive, 0-indexed).\n\nPrint the result of every `sumRange` operation on its own line.",
      constraints: "1 <= nums.length <= 3 * 10^4\n-100 <= nums[i], val <= 100\n0 <= index < nums.length\n0 <= left <= right < nums.length\nAt most 3 * 10^4 operations, including at least one `sumRange`.",
      inputFormat: "Line 1: space-separated integers `nums`.\nFollowing lines: one operation per line, `update index val` or `sumRange left right`.",
      outputFormat: "One line per `sumRange` operation containing the range sum.",
      examples: [
        {
          input: "1 3 5\nsumRange 0 2\nupdate 1 2\nsumRange 0 2",
          output: "9\n8",
          explanation: "Initially 1 + 3 + 5 = 9. After nums[1] becomes 2 the array is 1 2 5 and the sum is 8.",
        },
      ],
      testCases: [
        { input: "1 3 5\nsumRange 0 2\nupdate 1 2\nsumRange 0 2", expectedOutput: "9\n8", isHidden: false },
        { input: "7\nsumRange 0 0\nupdate 0 -3\nsumRange 0 0", expectedOutput: "7\n-3", isHidden: false },
        {
          input: "1 2 3 4 5 6\nupdate 0 10\nupdate 5 -6\nsumRange 0 5\nsumRange 1 4\nsumRange 5 5\nupdate 3 0\nsumRange 2 4",
          expectedOutput: "18\n14\n-6\n8",
          isHidden: true,
        },
        { input: "0 0 0\nupdate 1 5\nupdate 1 3\nsumRange 0 2\nsumRange 1 1", expectedOutput: "3\n3", isHidden: true },
        { input: "-1 -2 -3\nsumRange 0 1\nupdate 2 3\nsumRange 0 2", expectedOutput: "-3\n0", isHidden: true },
        { input: "5 5 5 5 5\nupdate 4 -100\nupdate 0 100\nsumRange 0 4\nsumRange 1 3\nupdate 2 5\nsumRange 2 2", expectedOutput: "15\n15\n5", isHidden: true },
        rangeSumMutableCase(17, 700, 1000),
      ],
      hints: [
        "Prefix sums answer a query in O(1), but every update would force an O(n) rebuild.",
        "A segment tree stores the sum of every segment; a point update and a range query each touch only O(log n) nodes.",
        "An iterative segment tree in an array of size 2n works well: leaves live at positions n..2n-1 and node i is the sum of nodes 2i and 2i+1.",
      ],
      editorial:
        "Build a segment tree in which every internal node stores the sum of its two children. An update overwrites the leaf and recomputes its ancestors; a range query climbs from both ends of [left, right] towards the root, adding at most two nodes per level. Both operations are O(log n); building is O(n) and space O(n). A Fenwick tree (binary indexed tree) that applies the difference new - old is an equally good alternative.",
      solutions: {
        javascript: code`
          function solve(input) {
            const lines = input.trim().split("\n");
            const nums = lines[0].trim().split(/\s+/).map(Number);
            const n = nums.length;
            const tree = new Array(2 * n).fill(0);
            for (let i = 0; i < n; i++) tree[n + i] = nums[i];
            for (let i = n - 1; i > 0; i--) tree[i] = tree[2 * i] + tree[2 * i + 1];

            const update = (index, value) => {
              let pos = index + n;
              tree[pos] = value;
              for (pos >>= 1; pos >= 1; pos >>= 1) tree[pos] = tree[2 * pos] + tree[2 * pos + 1];
            };

            const sumRange = (left, right) => {
              let sum = 0;
              for (let lo = left + n, hi = right + n + 1; lo < hi; lo >>= 1, hi >>= 1) {
                if (lo & 1) sum += tree[lo++];
                if (hi & 1) sum += tree[--hi];
              }
              return sum;
            };

            const out = [];
            for (const line of lines.slice(1)) {
              const [op, a, b] = line.trim().split(/\s+/);
              if (op === "update") update(Number(a), Number(b));
              else if (op === "sumRange") out.push(sumRange(Number(a), Number(b)));
            }
            return out.join("\n");
          }
        `,
        python: code`
          def solve(input_str):
              lines = input_str.strip().split("\n")
              nums = list(map(int, lines[0].split()))
              n = len(nums)
              tree = [0] * n + nums
              for i in range(n - 1, 0, -1):
                  tree[i] = tree[2 * i] + tree[2 * i + 1]

              def update(index, value):
                  pos = index + n
                  tree[pos] = value
                  pos >>= 1
                  while pos >= 1:
                      tree[pos] = tree[2 * pos] + tree[2 * pos + 1]
                      pos >>= 1

              def sum_range(left, right):
                  total = 0
                  lo, hi = left + n, right + n + 1
                  while lo < hi:
                      if lo & 1:
                          total += tree[lo]
                          lo += 1
                      if hi & 1:
                          hi -= 1
                          total += tree[hi]
                      lo >>= 1
                      hi >>= 1
                  return total

              out = []
              for line in lines[1:]:
                  parts = line.split()
                  if len(parts) < 3:
                      continue
                  if parts[0] == "update":
                      update(int(parts[1]), int(parts[2]))
                  elif parts[0] == "sumRange":
                      out.append(str(sum_range(int(parts[1]), int(parts[2]))))
              return "\n".join(out)
        `,
      },
    },
    {
      title: "Count of Smaller Numbers After Self",
      difficulty: "Hard",
      description:
        "Given an integer array `nums`, compute for every index `i` how many elements to the right of `i` are strictly smaller than `nums[i]`.",
      constraints: "1 <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4",
      inputFormat: "One line of space-separated integers `nums`.",
      outputFormat: "Space-separated counts, one per index, in the original order.",
      examples: [
        {
          input: "5 2 6 1",
          output: "2 1 1 0",
          explanation: "Right of 5 are 2 and 1 (two smaller); right of 2 is only 1 smaller; right of 6 is 1; nothing is right of 1.",
        },
      ],
      testCases: [
        { input: "5 2 6 1", expectedOutput: "2 1 1 0", isHidden: false },
        { input: "-1", expectedOutput: "0", isHidden: false },
        { input: "-1 -1", expectedOutput: "0 0", isHidden: true },
        { input: "1 2 3 4", expectedOutput: "0 0 0 0", isHidden: true },
        { input: "4 3 2 1", expectedOutput: "3 2 1 0", isHidden: true },
        { input: "2 0 1 2 0 -10000 10000", expectedOutput: "4 1 2 2 1 0 0", isHidden: true },
        { input: "3 3 3 1 1 2", expectedOutput: "3 3 3 0 0 0", isHidden: true },
        countSmallerCase(23, 2500),
      ],
      hints: [
        "Comparing every pair of indices is O(n^2), far too slow for 10^5 elements.",
        "Scan from right to left while maintaining a structure that counts the values seen so far.",
        "Compress the values to ranks and keep a segment tree (or Fenwick tree) of counts: query how many seen values have a smaller rank, then add the current value.",
      ],
      editorial:
        "Coordinate-compress the values to ranks 0..m-1. Traverse nums from right to left with a segment tree of counts over the ranks: the answer for index i is the count over ranks [0, rank(nums[i])), after which the count at rank(nums[i]) is incremented. Each step costs O(log m), so the total time is O(n log n) with O(n) space. A merge-sort-based inversion count is an alternative with the same complexity.",
      solutions: {
        javascript: code`
          function solve(input) {
            const nums = input.trim().split(/\s+/).map(Number);
            const sorted = [...new Set(nums)].sort((a, b) => a - b);
            const rank = new Map(sorted.map((value, i) => [value, i]));
            const size = sorted.length;
            const tree = new Int32Array(2 * size); // iterative segment tree of counts; leaves at size..2*size-1
            const result = new Array(nums.length);
            for (let i = nums.length - 1; i >= 0; i--) {
              const r = rank.get(nums[i]);
              let count = 0;
              for (let lo = size, hi = size + r; lo < hi; lo >>= 1, hi >>= 1) {
                if (lo & 1) count += tree[lo++];
                if (hi & 1) count += tree[--hi];
              }
              result[i] = count;
              for (let pos = size + r; pos >= 1; pos >>= 1) tree[pos]++;
            }
            return result.join(" ");
          }
        `,
        python: code`
          def solve(input_str):
              nums = list(map(int, input_str.split()))
              rank = {value: i for i, value in enumerate(sorted(set(nums)))}
              size = len(rank)
              tree = [0] * (2 * size)  # iterative segment tree of counts; leaves at size..2*size-1
              result = [0] * len(nums)
              for i in range(len(nums) - 1, -1, -1):
                  r = rank[nums[i]]
                  count = 0
                  lo, hi = size, size + r
                  while lo < hi:
                      if lo & 1:
                          count += tree[lo]
                          lo += 1
                      if hi & 1:
                          hi -= 1
                          count += tree[hi]
                      lo >>= 1
                      hi >>= 1
                  result[i] = count
                  pos = size + r
                  while pos >= 1:
                      tree[pos] += 1
                      pos >>= 1
              return " ".join(map(str, result))
        `,
      },
    },
  ],
};
