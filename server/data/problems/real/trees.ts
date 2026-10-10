import { code, JS_BUILD_TREE, PY_BUILD_TREE, TREE_INPUT_NOTE, type ProblemSpec } from "../../problemHelpers";

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

const range = (n: number, from = 1) => Array.from({ length: n }, (_, i) => from + i);

/** Level-order text of a left-leaning chain: every node's only child is its left child. */
const leftChain = (values: number[]) => values.map((v, i) => (i === 0 ? String(v) : `${v} null`)).join(" ");
/** Level-order text of a right-leaning chain: every node's only child is its right child. */
const rightChain = (values: number[]) => values.map((v, i) => (i === 0 ? String(v) : `null ${v}`)).join(" ");
/** Perfect-ish complete tree holding 1..n in level order (no null markers needed). */
const completeTree = (n: number) => range(n).join(" ");

interface GenNode {
  val: number;
  left: number;
  right: number;
}

/**
 * Random binary tree with `n` nodes. `deepness` (0-9) biases new nodes toward the most recently created free slots,
 * which produces tall, stringy trees; 0 gives a bushy random tree.
 */
function genNodes(seed: number, n: number, value: (next: (bound: number) => number, index: number) => number, deepness = 0): GenNode[] {
  const next = seededRandom(seed);
  const nodes: GenNode[] = [{ val: value(next, 0), left: -1, right: -1 }];
  const slots: [number, 0 | 1][] = [
    [0, 0],
    [0, 1],
  ];
  while (nodes.length < n) {
    const k = next(10) < deepness ? slots.length - 1 - next(Math.min(3, slots.length)) : next(slots.length);
    const [parent, side] = slots[k];
    slots[k] = slots[slots.length - 1];
    slots.pop();
    const id = nodes.length;
    nodes.push({ val: value(next, id), left: -1, right: -1 });
    if (side === 0) nodes[parent].left = id;
    else nodes[parent].right = id;
    slots.push([id, 0], [id, 1]);
  }
  return nodes;
}

/** Level-order text of a generated tree (trailing nulls trimmed). */
function levelText(nodes: GenNode[], rootId = 0): string {
  const out: string[] = [];
  const queue: number[] = [rootId];
  for (let qi = 0; qi < queue.length; qi++) {
    const id = queue[qi];
    if (id < 0) {
      out.push("null");
      continue;
    }
    out.push(String(nodes[id].val));
    queue.push(nodes[id].left, nodes[id].right);
  }
  while (out[out.length - 1] === "null") out.pop();
  return out.join(" ");
}

/** Pre-order and in-order value lists of a generated tree (iterative). */
function preAndIn(nodes: GenNode[]): { pre: number[]; ino: number[] } {
  const pre: number[] = [];
  const ino: number[] = [];
  const stack = [0];
  while (stack.length) {
    const id = stack.pop()!;
    pre.push(nodes[id].val);
    if (nodes[id].right >= 0) stack.push(nodes[id].right);
    if (nodes[id].left >= 0) stack.push(nodes[id].left);
  }
  const walk: number[] = [];
  let cur = 0;
  while (cur >= 0 || walk.length) {
    while (cur >= 0) {
      walk.push(cur);
      cur = nodes[cur].left;
    }
    const id = walk.pop()!;
    ino.push(nodes[id].val);
    cur = nodes[id].right;
  }
  return { pre, ino };
}

const randomTree = (seed: number, n: number, lo: number, hi: number, deepness = 0) =>
  levelText(genNodes(seed, n, (next) => lo + next(hi - lo + 1), deepness));

export const REAL_TREES: ProblemSpec[] = [
  // ---------------------------------------------------------------------------------------------- Easy
  {
    title: "Symmetric Tree",
    difficulty: "Easy",
    companies: ["Amazon", "Microsoft", "Bloomberg", "Apple"],
    description: `Given the root of a binary tree, decide whether the tree is a mirror image of itself: the left subtree must be the reflection of the right subtree, both in shape and in node values.\n\nPrint \`true\` if the tree is symmetric around its centre and \`false\` otherwise.\n\n${TREE_INPUT_NOTE}`,
    constraints: "1 <= number of nodes <= 5000\n-100 <= Node.val <= 100",
    inputFormat: "One line: the tree in level order (`null` for missing children).",
    outputFormat: "`true` or `false`.",
    examples: [
      { input: "1 2 2 3 4 4 3", output: "true", explanation: "The left subtree (2 with children 3, 4) mirrors the right subtree (2 with children 4, 3)." },
      { input: "1 2 2 null 3 null 3", output: "false", explanation: "Both 2s have only a right child, so one subtree is a copy of the other instead of a reflection." },
    ],
    testCases: [
      { input: "1 2 2 3 4 4 3", expectedOutput: "true", isHidden: false },
      { input: "1 2 2 null 3 null 3", expectedOutput: "false", isHidden: false },
      { input: "1", expectedOutput: "true", isHidden: true },
      { input: "1 2 3", expectedOutput: "false", isHidden: true },
      { input: "1 2 2 3 null null 3", expectedOutput: "true", isHidden: true },
      { input: "1 2 2 2 null 2 null", expectedOutput: "false", isHidden: true },
      { input: "5 -3 -3 7 null null 7 1 2 2 1", expectedOutput: "true", isHidden: true },
      { input: "1 2 2 null 3 3", expectedOutput: "true", isHidden: true },
    ],
    hints: [
      "A tree is symmetric when its left and right subtrees are mirror images of each other, so compare two nodes at a time.",
      "Two nodes mirror each other if their values are equal, the left child of one mirrors the right child of the other, and the right child of one mirrors the left child of the other.",
      "Keep a stack (or queue) of node pairs instead of recursing, so very tall trees cannot overflow the call stack.",
    ],
    editorial:
      "Start with the pair (root.left, root.right). Pop a pair (a, b): if both are missing, continue; if exactly one is missing or the values differ, the tree is not symmetric; otherwise push (a.left, b.right) and (a.right, b.left). If the stack empties, the tree is symmetric. Each node is visited once: O(n) time, O(h) extra space for the stack.",
    solutions: {
      javascript: code`
        ${JS_BUILD_TREE}

        function solve(input) {
          const root = buildTree(input.trim().split(/\s+/));
          const stack = [[root.left, root.right]];
          while (stack.length) {
            const [a, b] = stack.pop();
            if (!a && !b) continue;
            if (!a || !b || a.val !== b.val) return "false";
            stack.push([a.left, b.right], [a.right, b.left]);
          }
          return "true";
        }
      `,
      python: code`
        ${PY_BUILD_TREE}


        def solve(input_str):
            root = build_tree(input_str.split())
            stack = [(root.left, root.right)]
            while stack:
                a, b = stack.pop()
                if a is None and b is None:
                    continue
                if a is None or b is None or a.val != b.val:
                    return "false"
                stack.append((a.left, b.right))
                stack.append((a.right, b.left))
            return "true"
      `,
    },
  },
  {
    title: "Subtree of Another Tree",
    difficulty: "Easy",
    companies: ["Amazon", "Meta", "Microsoft", "Google"],
    description: `You are given two binary trees, \`root\` and \`subRoot\`. Decide whether \`root\` contains a subtree that has exactly the same structure and node values as \`subRoot\`.\n\nA subtree of a tree is some node of that tree together with ALL of its descendants (the tree itself also counts). Print \`true\` if such a subtree exists, otherwise \`false\`.\n\n${TREE_INPUT_NOTE}`,
    constraints: "1 <= nodes in root <= 2000\n1 <= nodes in subRoot <= 1000\n-10^4 <= Node.val <= 10^4",
    inputFormat: "Line 1: the tree `root` in level order.\nLine 2: the tree `subRoot` in level order.",
    outputFormat: "`true` or `false`.",
    examples: [
      { input: "3 4 5 1 2\n4 1 2", output: "true", explanation: "The node 4 together with its children 1 and 2 is identical to subRoot." },
      { input: "3 4 5 1 2 null null null null 0\n4 1 2", output: "false", explanation: "The node 2 in root has an extra child 0, so the subtree rooted at 4 differs from subRoot." },
    ],
    testCases: [
      { input: "3 4 5 1 2\n4 1 2", expectedOutput: "true", isHidden: false },
      { input: "3 4 5 1 2 null null null null 0\n4 1 2", expectedOutput: "false", isHidden: false },
      { input: "1\n1", expectedOutput: "true", isHidden: true },
      { input: "1 1\n1", expectedOutput: "true", isHidden: true },
      { input: "1 2 3\n1", expectedOutput: "false", isHidden: true },
      { input: "1 null 1 null 1 null 2\n1 null 2", expectedOutput: "true", isHidden: true },
      { input: "2 1 3\n2 1", expectedOutput: "false", isHidden: true },
      { input: "-1 -2 -3\n-3", expectedOutput: "true", isHidden: true },
      { input: leftChain(Array(2000).fill(1)) + "\n" + leftChain([...Array(999).fill(1), 2]), expectedOutput: "false", isHidden: true },
    ],
    hints: [
      "Start by solving the easier question: are two given trees identical?",
      "Try every node of root as the potential match: if the node has the same value as subRoot's root, run the identical-trees check on it.",
      "Both the traversal over root and the identical-trees comparison can use explicit stacks. Worst case is O(n * m) comparisons, which is fine for these limits.",
    ],
    editorial:
      "Walk through every node of `root` (iteratively). For each node, test whether the tree rooted there is identical to `subRoot` using a pair-wise stack comparison that stops at the first mismatch. The first success means `true`. Worst case O(n * m) time, O(h) space; an O(n + m) alternative serializes both trees and uses string matching.",
    solutions: {
      javascript: code`
        ${JS_BUILD_TREE}

        function same(a, b) {
          const stack = [[a, b]];
          while (stack.length) {
            const [x, y] = stack.pop();
            if (!x && !y) continue;
            if (!x || !y || x.val !== y.val) return false;
            stack.push([x.left, y.left], [x.right, y.right]);
          }
          return true;
        }

        function solve(input) {
          const lines = input.trim().split("\n");
          const root = buildTree(lines[0].trim().split(/\s+/));
          const sub = buildTree(lines[1].trim().split(/\s+/));
          const stack = [root];
          while (stack.length) {
            const node = stack.pop();
            if (node.val === sub.val && same(node, sub)) return "true";
            if (node.left) stack.push(node.left);
            if (node.right) stack.push(node.right);
          }
          return "false";
        }
      `,
      python: code`
        ${PY_BUILD_TREE}


        def same(a, b):
            stack = [(a, b)]
            while stack:
                x, y = stack.pop()
                if x is None and y is None:
                    continue
                if x is None or y is None or x.val != y.val:
                    return False
                stack.append((x.left, y.left))
                stack.append((x.right, y.right))
            return True


        def solve(input_str):
            lines = input_str.strip().split("\n")
            root = build_tree(lines[0].split())
            sub = build_tree(lines[1].split())
            stack = [root]
            while stack:
                node = stack.pop()
                if node.val == sub.val and same(node, sub):
                    return "true"
                if node.left:
                    stack.append(node.left)
                if node.right:
                    stack.append(node.right)
            return "false"
      `,
    },
  },
  {
    title: "Path Sum",
    difficulty: "Easy",
    companies: ["Amazon", "Microsoft", "Meta", "Bloomberg"],
    description: `Given a binary tree and an integer \`targetSum\`, decide whether the tree has a root-to-leaf path whose node values add up to exactly \`targetSum\`.\n\nA leaf is a node with no children. The path must start at the root and end at a leaf. Print \`true\` if such a path exists, otherwise \`false\`.\n\n${TREE_INPUT_NOTE}`,
    constraints: "1 <= number of nodes <= 5000\n-1000 <= Node.val <= 1000\n-10^6 <= targetSum <= 10^6",
    inputFormat: "Line 1: the tree in level order.\nLine 2: the integer `targetSum`.",
    outputFormat: "`true` or `false`.",
    examples: [
      { input: "5 3 7 2 4 6 9\n18", output: "true", explanation: "The path 5 -> 7 -> 6 sums to 18." },
      { input: "5 3 7 2 4 6 9\n15", output: "false", explanation: "The leaf sums are 10, 12, 18 and 21. The partial sum 5 + 3 + ... never lands on 15 at a leaf." },
    ],
    testCases: [
      { input: "5 3 7 2 4 6 9\n18", expectedOutput: "true", isHidden: false },
      { input: "5 3 7 2 4 6 9\n15", expectedOutput: "false", isHidden: false },
      { input: "1 2\n1", expectedOutput: "false", isHidden: true },
      { input: "1 2\n3", expectedOutput: "true", isHidden: true },
      { input: "-2 null -3\n-5", expectedOutput: "true", isHidden: true },
      { input: "0\n0", expectedOutput: "true", isHidden: true },
      { input: "1 2 null 3\n3", expectedOutput: "false", isHidden: true },
      { input: "1 2 3\n4", expectedOutput: "true", isHidden: true },
      { input: rightChain(Array(5000).fill(1)) + "\n5000", expectedOutput: "true", isHidden: true },
      { input: leftChain(Array(5000).fill(1)) + "\n4999", expectedOutput: "false", isHidden: true },
    ],
    hints: [
      "Carry the running sum from the root down to each node.",
      "Only check the sum at leaves: a node with at least one child is not the end of a valid path (watch out for negative values and a single-child root).",
      "Use a stack of (node, sum so far) pairs; stop as soon as one leaf matches.",
    ],
    editorial:
      "Depth-first search with a stack of (node, sum of the path so far including the node). At a leaf, compare the sum with the target. Otherwise push the children with the updated sum. O(n) time, O(h) space. Do not stop at a non-leaf even if its prefix sum equals the target, because values can be negative or the node may have further children.",
    solutions: {
      javascript: code`
        ${JS_BUILD_TREE}

        function solve(input) {
          const lines = input.trim().split("\n");
          const root = buildTree(lines[0].trim().split(/\s+/));
          const target = Number(lines[1]);
          const stack = [[root, root.val]];
          while (stack.length) {
            const [node, sum] = stack.pop();
            if (!node.left && !node.right && sum === target) return "true";
            if (node.left) stack.push([node.left, sum + node.left.val]);
            if (node.right) stack.push([node.right, sum + node.right.val]);
          }
          return "false";
        }
      `,
      python: code`
        ${PY_BUILD_TREE}


        def solve(input_str):
            lines = input_str.strip().split("\n")
            root = build_tree(lines[0].split())
            target = int(lines[1])
            stack = [(root, root.val)]
            while stack:
                node, total = stack.pop()
                if node.left is None and node.right is None and total == target:
                    return "true"
                if node.left:
                    stack.append((node.left, total + node.left.val))
                if node.right:
                    stack.append((node.right, total + node.right.val))
            return "false"
      `,
    },
  },
  {
    title: "Balanced Binary Tree",
    difficulty: "Easy",
    companies: ["Amazon", "Bloomberg", "Google", "Microsoft"],
    description: `A binary tree is height-balanced if, for EVERY node, the heights of its left and right subtrees differ by at most 1. The height of an empty subtree is 0.\n\nGiven a binary tree, print \`true\` if it is height-balanced and \`false\` otherwise.\n\n${TREE_INPUT_NOTE}`,
    constraints: "1 <= number of nodes <= 5000\n-1000 <= Node.val <= 1000",
    inputFormat: "One line: the tree in level order (`null` for missing children).",
    outputFormat: "`true` or `false`.",
    examples: [
      { input: "3 9 20 null null 15 7", output: "true", explanation: "Every node's subtrees differ in height by at most 1." },
      { input: "1 2 2 3 3 null null 4 4", output: "false", explanation: "The left child 2 has a left subtree of height 3 but a right subtree of height 1." },
    ],
    testCases: [
      { input: "3 9 20 null null 15 7", expectedOutput: "true", isHidden: false },
      { input: "1 2 2 3 3 null null 4 4", expectedOutput: "false", isHidden: false },
      { input: "1", expectedOutput: "true", isHidden: true },
      { input: "1 2", expectedOutput: "true", isHidden: true },
      { input: "1 2 null 3", expectedOutput: "false", isHidden: true },
      { input: "1 2 3 4 null null 5", expectedOutput: "true", isHidden: true },
      { input: "1 2 5 3 null 6 7 4 null 8", expectedOutput: "false", isHidden: true },
      { input: leftChain(range(5000)), expectedOutput: "false", isHidden: true },
      { input: completeTree(4095), expectedOutput: "true", isHidden: true },
    ],
    hints: [
      "Computing the height of each subtree separately for every node works but repeats a lot of work.",
      "Compute heights bottom-up once; while doing so compare the two child heights at each node and bail out on a difference larger than 1.",
      "To avoid deep recursion, record nodes in a parent-before-child order with a stack, then process that list in reverse so children are finished before their parents.",
    ],
    editorial:
      "Collect all nodes in a pre-order list, then walk the list backwards. When a node is processed both children already have heights, so check |hl - hr| <= 1 and set height = 1 + max(hl, hr). Any violation means `false`. O(n) time and space, no recursion.",
    solutions: {
      javascript: code`
        ${JS_BUILD_TREE}

        function solve(input) {
          const root = buildTree(input.trim().split(/\s+/));
          const order = [];
          const stack = [root];
          while (stack.length) {
            const node = stack.pop();
            order.push(node);
            if (node.left) stack.push(node.left);
            if (node.right) stack.push(node.right);
          }
          for (let i = order.length - 1; i >= 0; i--) {
            const node = order[i];
            const lh = node.left ? node.left.h : 0;
            const rh = node.right ? node.right.h : 0;
            if (Math.abs(lh - rh) > 1) return "false";
            node.h = 1 + Math.max(lh, rh);
          }
          return "true";
        }
      `,
      python: code`
        ${PY_BUILD_TREE}


        def solve(input_str):
            root = build_tree(input_str.split())
            order = []
            stack = [root]
            while stack:
                node = stack.pop()
                order.append(node)
                if node.left:
                    stack.append(node.left)
                if node.right:
                    stack.append(node.right)
            for node in reversed(order):
                lh = node.left.h if node.left else 0
                rh = node.right.h if node.right else 0
                if abs(lh - rh) > 1:
                    return "false"
                node.h = 1 + max(lh, rh)
            return "true"
      `,
    },
  },
  {
    title: "Minimum Depth of Binary Tree",
    difficulty: "Easy",
    companies: ["Amazon", "Meta", "Microsoft"],
    description: `The minimum depth of a binary tree is the number of nodes on the shortest path from the root down to the nearest LEAF (a node with no children).\n\nGiven a binary tree, print its minimum depth. Be careful: a node with only one child is not a leaf, so the path must continue through that child.\n\n${TREE_INPUT_NOTE}`,
    constraints: "1 <= number of nodes <= 5000\n-1000 <= Node.val <= 1000",
    inputFormat: "One line: the tree in level order (`null` for missing children).",
    outputFormat: "A single integer: the minimum depth.",
    examples: [
      { input: "1 2 3 4 5", output: "2", explanation: "The leaf 3 is two nodes from the root (1 -> 3)." },
      { input: "1 2 null 3 null 4", output: "4", explanation: "The root has no right child, so the only leaf is 4 and the path is 1 -> 2 -> 3 -> 4." },
    ],
    testCases: [
      { input: "1 2 3 4 5", expectedOutput: "2", isHidden: false },
      { input: "1 2 null 3 null 4", expectedOutput: "4", isHidden: false },
      { input: "1", expectedOutput: "1", isHidden: true },
      { input: "1 2", expectedOutput: "2", isHidden: true },
      { input: "1 null 2", expectedOutput: "2", isHidden: true },
      { input: "1 2 3 4 5 null null 6", expectedOutput: "2", isHidden: true },
      { input: "5 3 8 1 4 7 9 null 2", expectedOutput: "3", isHidden: true },
      { input: rightChain(range(5000)), expectedOutput: "5000", isHidden: true },
      { input: completeTree(4095), expectedOutput: "12", isHidden: true },
    ],
    hints: [
      "The shortest root-to-leaf path is the first leaf you meet when exploring level by level.",
      "A breadth-first search can stop at the first leaf it dequeues.",
      "Do not treat a node with a single child as a leaf: only nodes with no children end a path.",
    ],
    editorial:
      "Breadth-first search, one level at a time, starting with depth 1 for the root. The first node found with neither child is a leaf at the minimum depth. BFS visits at most every node once: O(n) time, O(w) space where w is the maximum width. A recursive min(left, right) + 1 approach is wrong for nodes with a single child unless special-cased.",
    solutions: {
      javascript: code`
        ${JS_BUILD_TREE}

        function solve(input) {
          const root = buildTree(input.trim().split(/\s+/));
          let level = [root];
          let depth = 1;
          while (level.length) {
            const next = [];
            for (const node of level) {
              if (!node.left && !node.right) return String(depth);
              if (node.left) next.push(node.left);
              if (node.right) next.push(node.right);
            }
            level = next;
            depth++;
          }
          return "0";
        }
      `,
      python: code`
        ${PY_BUILD_TREE}


        def solve(input_str):
            root = build_tree(input_str.split())
            level = [root]
            depth = 1
            while level:
                nxt = []
                for node in level:
                    if node.left is None and node.right is None:
                        return str(depth)
                    if node.left:
                        nxt.append(node.left)
                    if node.right:
                        nxt.append(node.right)
                level = nxt
                depth += 1
            return "0"
      `,
    },
  },
  {
    title: "Binary Tree Inorder Traversal",
    difficulty: "Easy",
    companies: ["Microsoft", "Amazon", "Zoho", "TCS"],
    description: `Print the inorder traversal of a binary tree: visit the left subtree, then the node itself, then the right subtree.\n\nThe tree can be very tall, so an iterative solution with an explicit stack is expected.\n\n${TREE_INPUT_NOTE}`,
    constraints: "1 <= number of nodes <= 5000\n-1000 <= Node.val <= 1000",
    inputFormat: "One line: the tree in level order (`null` for missing children).",
    outputFormat: "The node values in inorder, separated by single spaces, on one line.",
    examples: [
      { input: "1 null 2 3", output: "1 3 2", explanation: "1 has no left child, then its right subtree 2 yields 3 (left of 2) followed by 2." },
      { input: "4 2 6 1 3 5 7", output: "1 2 3 4 5 6 7" },
    ],
    testCases: [
      { input: "1 null 2 3", expectedOutput: "1 3 2", isHidden: false },
      { input: "4 2 6 1 3 5 7", expectedOutput: "1 2 3 4 5 6 7", isHidden: false },
      { input: "1", expectedOutput: "1", isHidden: true },
      { input: "1 2 null 3", expectedOutput: "3 2 1", isHidden: true },
      { input: "1 null 2 null 3", expectedOutput: "1 2 3", isHidden: true },
      { input: "-1 -2 -3 null null -4", expectedOutput: "-2 -1 -4 -3", isHidden: true },
      { input: leftChain(range(5000)), expectedOutput: range(5000).reverse().join(" "), isHidden: true },
      { input: rightChain(range(5000)), expectedOutput: range(5000).join(" "), isHidden: true },
    ],
    hints: [
      "Recursion would be left, node, right; an explicit stack can simulate it.",
      "Keep walking left while pushing nodes on the stack, then pop one, record it, and move to its right child.",
      "Loop while there is a current node or the stack is non-empty.",
    ],
    editorial:
      "Maintain a stack and a pointer `cur`. While `cur` exists, push it and go left. When it is empty, pop a node, output its value, and set `cur` to the popped node's right child. Every node is pushed and popped once: O(n) time, O(h) space.",
    solutions: {
      javascript: code`
        ${JS_BUILD_TREE}

        function solve(input) {
          let cur = buildTree(input.trim().split(/\s+/));
          const stack = [];
          const out = [];
          while (cur || stack.length) {
            while (cur) {
              stack.push(cur);
              cur = cur.left;
            }
            cur = stack.pop();
            out.push(cur.val);
            cur = cur.right;
          }
          return out.join(" ");
        }
      `,
      python: code`
        ${PY_BUILD_TREE}


        def solve(input_str):
            cur = build_tree(input_str.split())
            stack = []
            out = []
            while cur or stack:
                while cur:
                    stack.append(cur)
                    cur = cur.left
                cur = stack.pop()
                out.append(str(cur.val))
                cur = cur.right
            return " ".join(out)
      `,
    },
  },
  {
    title: "Binary Tree Postorder Traversal",
    difficulty: "Easy",
    companies: ["Amazon", "Microsoft", "Zoho", "Infosys"],
    description: `Print the postorder traversal of a binary tree: visit the left subtree, then the right subtree, and finally the node itself.\n\nThe tree can be very tall, so avoid recursion and use an explicit stack.\n\n${TREE_INPUT_NOTE}`,
    constraints: "1 <= number of nodes <= 5000\n-1000 <= Node.val <= 1000",
    inputFormat: "One line: the tree in level order (`null` for missing children).",
    outputFormat: "The node values in postorder, separated by single spaces, on one line.",
    examples: [
      { input: "1 null 2 3", output: "3 2 1", explanation: "Node 2 is finished after its left child 3; the root 1 comes last." },
      { input: "4 2 6 1 3 5 7", output: "1 3 2 5 7 6 4" },
    ],
    testCases: [
      { input: "1 null 2 3", expectedOutput: "3 2 1", isHidden: false },
      { input: "4 2 6 1 3 5 7", expectedOutput: "1 3 2 5 7 6 4", isHidden: false },
      { input: "1", expectedOutput: "1", isHidden: true },
      { input: "1 2 3", expectedOutput: "2 3 1", isHidden: true },
      { input: "1 2 null 3", expectedOutput: "3 2 1", isHidden: true },
      { input: "5 3 8 1 4 7 9 null 2", expectedOutput: "2 1 4 3 7 9 8 5", isHidden: true },
      { input: leftChain(range(5000)), expectedOutput: range(5000).reverse().join(" "), isHidden: true },
      { input: rightChain(range(5000)), expectedOutput: range(5000).reverse().join(" "), isHidden: true },
    ],
    hints: [
      "Postorder is the reverse of a modified preorder: node, right subtree, left subtree.",
      "Run that modified preorder with a stack (pop a node, record it, push its left child, then its right child).",
      "Reverse the recorded values at the end.",
    ],
    editorial:
      "A stack-based preorder that visits node -> right -> left produces the exact reverse of postorder (left -> right -> node). Collect the values and reverse them at the end. O(n) time, O(h) extra space for the stack (plus O(n) for the output).",
    solutions: {
      javascript: code`
        ${JS_BUILD_TREE}

        function solve(input) {
          const root = buildTree(input.trim().split(/\s+/));
          const stack = [root];
          const out = [];
          while (stack.length) {
            const node = stack.pop();
            out.push(node.val);
            if (node.left) stack.push(node.left);
            if (node.right) stack.push(node.right);
          }
          return out.reverse().join(" ");
        }
      `,
      python: code`
        ${PY_BUILD_TREE}


        def solve(input_str):
            root = build_tree(input_str.split())
            stack = [root]
            out = []
            while stack:
                node = stack.pop()
                out.append(str(node.val))
                if node.left:
                    stack.append(node.left)
                if node.right:
                    stack.append(node.right)
            return " ".join(reversed(out))
      `,
    },
  },
  {
    title: "Binary Tree Paths",
    difficulty: "Easy",
    companies: ["Amazon", "Meta", "Apple", "Google"],
    description: `Given a binary tree, list every root-to-leaf path. Write each path as its node values joined by \`->\` (for example \`1->2->5\`).\n\nPrint the paths one per line in left-to-right leaf order, i.e. the order in which a depth-first search that visits the left child before the right child reaches the leaves.\n\n${TREE_INPUT_NOTE}`,
    constraints: "1 <= number of nodes <= 2000\n-100 <= Node.val <= 100",
    inputFormat: "One line: the tree in level order (`null` for missing children).",
    outputFormat: "One path per line, e.g. `1->2->5`, ordered by leaves from left to right.",
    examples: [
      { input: "1 2 3 null 5", output: "1->2->5\n1->3", explanation: "Leaf 5 (under 2) comes before leaf 3." },
      { input: "7", output: "7", explanation: "A single node is both root and leaf." },
    ],
    testCases: [
      { input: "1 2 3 null 5", expectedOutput: "1->2->5\n1->3", isHidden: false },
      { input: "7", expectedOutput: "7", isHidden: false },
      { input: "1 2 3 4 5 6 7", expectedOutput: "1->2->4\n1->2->5\n1->3->6\n1->3->7", isHidden: true },
      { input: "1 2", expectedOutput: "1->2", isHidden: true },
      { input: "-1 null -2 -3", expectedOutput: "-1->-2->-3", isHidden: true },
      { input: "0 1 2 null 3 4", expectedOutput: "0->1->3\n0->2->4", isHidden: true },
      { input: leftChain(range(1500)), expectedOutput: range(1500).join("->"), isHidden: true },
      { input: rightChain(range(1500)), expectedOutput: range(1500).join("->"), isHidden: true },
    ],
    hints: [
      "A path ends exactly at a leaf; carry the path-so-far string down while traversing.",
      "Use a stack of (node, path string). When a node has no children, add its path to the answer.",
      "Push the right child before the left child so that the left child is popped (and its leaves reported) first.",
    ],
    editorial:
      "Iterative DFS with a stack of (node, path). A leaf appends its path to the result; otherwise children are pushed with the path extended by `->value`. Pushing right before left keeps the output in left-to-right order. Time is O(n * h) because of the path strings; space O(n * h) in the worst case for the output.",
    solutions: {
      javascript: code`
        ${JS_BUILD_TREE}

        function solve(input) {
          const root = buildTree(input.trim().split(/\s+/));
          const stack = [[root, String(root.val)]];
          const out = [];
          while (stack.length) {
            const [node, path] = stack.pop();
            if (!node.left && !node.right) out.push(path);
            if (node.right) stack.push([node.right, path + "->" + node.right.val]);
            if (node.left) stack.push([node.left, path + "->" + node.left.val]);
          }
          return out.join("\n");
        }
      `,
      python: code`
        ${PY_BUILD_TREE}


        def solve(input_str):
            root = build_tree(input_str.split())
            stack = [(root, str(root.val))]
            out = []
            while stack:
                node, path = stack.pop()
                if node.left is None and node.right is None:
                    out.append(path)
                if node.right:
                    stack.append((node.right, path + "->" + str(node.right.val)))
                if node.left:
                    stack.append((node.left, path + "->" + str(node.left.val)))
            return "\n".join(out)
      `,
    },
  },
  // __NEXT__
];
