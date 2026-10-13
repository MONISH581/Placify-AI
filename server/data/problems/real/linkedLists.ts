import { code, type ProblemSpec } from "../../problemHelpers";

/**
 * Real company-tagged Linked List problems.
 *
 * Larger "performance" inputs are generated deterministically below (seeded PRNG) so they are identical on every
 * machine; their expected outputs come from simple independent brute-force constructions (or literals checked
 * against an independent Python implementation), never from the reference solutions.
 */

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

/** `length` integers in [lo, hi]. */
function randomInts(seed: number, length: number, lo: number, hi: number): number[] {
  const next = seededRandom(seed);
  return Array.from({ length }, () => lo + next(hi - lo + 1));
}

const line = (values: number[]) => values.join(" ");

// 100000 nodes: an even palindrome built by mirroring a random half, and the same list with one value changed.
const PAL_HALF = randomInts(1201, 50000, -1000000000, 1000000000);
const PAL_EVEN = [...PAL_HALF, ...[...PAL_HALF].reverse()];
const PAL_BROKEN = PAL_EVEN.slice();
PAL_BROKEN[49998] += 1;

const DEDUP_SORTED = randomInts(1301, 30000, 0, 5000).sort((a, b) => a - b);

const REMOVE_VALUES = randomInts(1401, 20000, 0, 3);

const MEET_A = randomInts(1501, 30000, 1, 1000000000);
const MEET_B = randomInts(1502, 70000, 1, 1000000000);
const MEET_TAIL = randomInts(1503, 20000, 1, 1000000000);

/**
 * A list over `n` shuffled node labels (head is label 0). The last node links back to the node at list position
 * `back`, or to nothing when `back < 0`. Returns the input text plus the answers known from the construction.
 */
function loopedList(seed: number, n: number, back: number) {
  const next = seededRandom(seed);
  const labels = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = next(i + 1);
    [labels[i], labels[j]] = [labels[j], labels[i]];
  }
  const zeroAt = labels.indexOf(0);
  [labels[0], labels[zeroAt]] = [labels[zeroAt], labels[0]];
  const nxt = new Array<number>(n).fill(-1);
  for (let s = 0; s + 1 < n; s++) nxt[labels[s]] = labels[s + 1];
  if (back >= 0) nxt[labels[n - 1]] = labels[back];
  return {
    input: n + "\n" + line(nxt),
    entry: back >= 0 ? labels[back] : -1,
    length: back >= 0 ? n - back : 0,
  };
}

const LOOP_BIG = loopedList(1601, 100000, 40000);
const LOOP_NONE = loopedList(1602, 100000, -1);

const ADD1_DIGITS = [5, ...randomInts(1701, 19998, 0, 9), 8];

const SORT012_VALUES = randomInts(1801, 30000, 0, 2);

export const REAL_LINKEDLISTS: ProblemSpec[] = [
  {
    title: "Middle of the Linked List",
    difficulty: "Easy",
    companies: ["Amazon", "Microsoft", "Accenture"],
    description: "Given the values of a singly linked list (head first), print the values from the **middle node** to the end of the list.\n\nIf the list has two middle nodes (even length), use the second one. Do it in a single pass over the list with the slow/fast pointer technique.",
    constraints: "1 <= number of nodes <= 10^5\n-10^9 <= value <= 10^9",
    inputFormat: "One line: the node values separated by spaces, head first.",
    outputFormat: "The values from the middle node to the tail, separated by single spaces.",
    examples: [
      { input: "1 2 3 4 5", output: "3 4 5", explanation: "The list has 5 nodes; the middle node holds 3, so we print 3 4 5." },
      { input: "1 2 3 4 5 6", output: "4 5 6", explanation: "Six nodes means two middles (3 and 4); we take the second, so the output starts at 4." },
    ],
    testCases: [
      { input: "1 2 3 4 5", expectedOutput: "3 4 5", isHidden: false },
      { input: "1 2 3 4 5 6", expectedOutput: "4 5 6", isHidden: false },
      { input: "7", expectedOutput: "7", isHidden: true },
      { input: "1 2", expectedOutput: "2", isHidden: true },
      { input: "-3 -2 -1 0", expectedOutput: "-1 0", isHidden: true },
      { input: "10 20 30", expectedOutput: "20 30", isHidden: true },
      { input: "5 5 5 5 5 5 5 5", expectedOutput: "5 5 5 5", isHidden: true },
      { input: line(Array.from({ length: 100000 }, (_, i) => i + 1)), expectedOutput: line(Array.from({ length: 50000 }, (_, i) => 50001 + i)), isHidden: true },
    ],
    hints: [
      "Counting the nodes first and walking n/2 steps works but needs two passes.",
      "Move one pointer one step at a time and another two steps at a time.",
      "When the fast pointer can no longer jump two nodes, the slow pointer sits on the (second) middle node.",
    ],
    editorial: "Keep two pointers starting at the head. Advance `slow` by one node and `fast` by two nodes while `fast` and `fast.next` exist. When the loop stops, `fast` has covered the whole list, so `slow` is at index floor(n/2), which is the second middle for even n. Print from `slow` to the tail. Time O(n), space O(1).",
    solutions: {
      javascript: code`
          function solve(input) {
            const vals = input.trim().split(/\s+/);
            let head = null;
            for (let i = vals.length - 1; i >= 0; i--) head = { val: vals[i], next: head };
            let slow = head;
            let fast = head;
            while (fast && fast.next) {
              slow = slow.next;
              fast = fast.next.next;
            }
            const out = [];
            for (let node = slow; node; node = node.next) out.push(node.val);
            return out.join(" ");
          }
        `,
      python: code`
          class Node:
              def __init__(self, val, nxt=None):
                  self.val = val
                  self.next = nxt


          def solve(input_str):
              head = None
              for v in reversed(input_str.split()):
                  head = Node(v, head)
              slow = fast = head
              while fast and fast.next:
                  slow = slow.next
                  fast = fast.next.next
              out = []
              while slow:
                  out.append(slow.val)
                  slow = slow.next
              return " ".join(out)
        `,
    },
  },
  {
    title: "Palindrome Linked List",
    difficulty: "Easy",
    companies: ["Amazon", "Meta", "Microsoft", "Adobe"],
    description: "Given the values of a singly linked list (head first), print `true` if the list reads the same from head to tail and from tail to head, otherwise print `false`.\n\nThe list can only be walked forwards. Aim for O(n) time and O(1) extra space by reversing the second half in place.",
    constraints: "1 <= number of nodes <= 10^5\n-10^9 <= value <= 10^9",
    inputFormat: "One line: the node values separated by spaces, head first.",
    outputFormat: "`true` or `false`.",
    examples: [
      { input: "1 2 2 1", output: "true", explanation: "Reading backwards gives 1 2 2 1 again." },
      { input: "1 2", output: "false", explanation: "Backwards the list is 2 1, which differs." },
    ],
    testCases: [
      { input: "1 2 2 1", expectedOutput: "true", isHidden: false },
      { input: "1 2", expectedOutput: "false", isHidden: false },
      { input: "5", expectedOutput: "true", isHidden: true },
      { input: "1 2 3 2 1", expectedOutput: "true", isHidden: true },
      { input: "1 2 3 4 1", expectedOutput: "false", isHidden: true },
      { input: "1 1 1 1", expectedOutput: "true", isHidden: true },
      { input: "-1 5 -1", expectedOutput: "true", isHidden: true },
      { input: "1 0 0", expectedOutput: "false", isHidden: true },
      { input: "10 20 20 10 10", expectedOutput: "false", isHidden: true },
      { input: line(PAL_EVEN), expectedOutput: "true", isHidden: true },
      { input: line(PAL_BROKEN), expectedOutput: "false", isHidden: true },
    ],
    hints: [
      "Copying the values into an array and comparing it with its reverse works, but costs O(n) extra space.",
      "Find the middle with slow/fast pointers, then reverse the half that starts at the middle.",
      "Walk the front half and the reversed back half together; any mismatch means the list is not a palindrome.",
    ],
    editorial: "Locate the middle with slow/fast pointers (slow ends on the second middle for even length, on the exact middle for odd length). Reverse the list from `slow` onward in place, then compare the original head sequence against the reversed half node by node until the reversed half is exhausted. For odd lengths the middle node is simply compared with itself. Time O(n), extra space O(1) (the list is only modified in its second half, which is never read afterwards).",
    solutions: {
      javascript: code`
          function solve(input) {
            const vals = input.trim().split(/\s+/);
            let head = null;
            for (let i = vals.length - 1; i >= 0; i--) head = { val: vals[i], next: head };
            let slow = head;
            let fast = head;
            while (fast && fast.next) {
              slow = slow.next;
              fast = fast.next.next;
            }
            let prev = null;
            let cur = slow;
            while (cur) {
              const nxt = cur.next;
              cur.next = prev;
              prev = cur;
              cur = nxt;
            }
            let a = head;
            let b = prev;
            while (b) {
              if (a.val !== b.val) return "false";
              a = a.next;
              b = b.next;
            }
            return "true";
          }
        `,
      python: code`
          class Node:
              def __init__(self, val, nxt=None):
                  self.val = val
                  self.next = nxt


          def solve(input_str):
              head = None
              for v in reversed(input_str.split()):
                  head = Node(v, head)
              slow = fast = head
              while fast and fast.next:
                  slow = slow.next
                  fast = fast.next.next
              prev, cur = None, slow
              while cur:
                  nxt = cur.next
                  cur.next = prev
                  prev = cur
                  cur = nxt
              a, b = head, prev
              while b:
                  if a.val != b.val:
                      return "false"
                  a, b = a.next, b.next
              return "true"
        `,
    },
  },
  {
    title: "Remove Duplicates from Sorted List",
    difficulty: "Easy",
    companies: ["Amazon", "Microsoft", "Bloomberg"],
    description: "You are given a singly linked list whose values are sorted in non-decreasing order. Delete nodes so that every value appears exactly once, keeping the first node of each run of equal values, and print the resulting list.",
    constraints: "1 <= number of nodes <= 10^5\n-10^9 <= value <= 10^9\nThe values are sorted in non-decreasing order.",
    inputFormat: "One line: the sorted node values separated by spaces, head first.",
    outputFormat: "The values of the list after removing duplicates, separated by single spaces.",
    examples: [
      { input: "1 1 2", output: "1 2", explanation: "The second 1 is dropped." },
      { input: "1 1 2 3 3", output: "1 2 3", explanation: "The repeated 1 and the repeated 3 are each dropped once, leaving 1 2 3." },
    ],
    testCases: [
      { input: "1 1 2", expectedOutput: "1 2", isHidden: false },
      { input: "1 1 2 3 3", expectedOutput: "1 2 3", isHidden: false },
      { input: "5", expectedOutput: "5", isHidden: true },
      { input: "2 2 2 2", expectedOutput: "2", isHidden: true },
      { input: "-3 -3 -1 0 0 4", expectedOutput: "-3 -1 0 4", isHidden: true },
      { input: "1 2 3", expectedOutput: "1 2 3", isHidden: true },
      { input: "0 0 0 1 1 1 2 2 2", expectedOutput: "0 1 2", isHidden: true },
      { input: "-5 -5", expectedOutput: "-5", isHidden: true },
      { input: line(DEDUP_SORTED), expectedOutput: line([...new Set(DEDUP_SORTED)]), isHidden: true },
    ],
    hints: [
      "Because the list is sorted, equal values always sit next to each other.",
      "Compare each node with the node right after it.",
      "While the next node has the same value, unlink it by pointing `cur.next` to `cur.next.next`; otherwise advance.",
    ],
    editorial: "Walk with a single pointer `cur`. While `cur.next` exists: if its value equals `cur.val`, skip it with `cur.next = cur.next.next`, otherwise move `cur` forward. Sortedness guarantees all copies of a value are adjacent, so one pass is enough. Time O(n), space O(1).",
    solutions: {
      javascript: code`
          function solve(input) {
            const vals = input.trim().split(/\s+/).map(Number);
            let head = null;
            for (let i = vals.length - 1; i >= 0; i--) head = { val: vals[i], next: head };
            let cur = head;
            while (cur && cur.next) {
              if (cur.next.val === cur.val) cur.next = cur.next.next;
              else cur = cur.next;
            }
            const out = [];
            for (let node = head; node; node = node.next) out.push(node.val);
            return out.join(" ");
          }
        `,
      python: code`
          class Node:
              def __init__(self, val, nxt=None):
                  self.val = val
                  self.next = nxt


          def solve(input_str):
              head = None
              for v in reversed([int(x) for x in input_str.split()]):
                  head = Node(v, head)
              cur = head
              while cur and cur.next:
                  if cur.next.val == cur.val:
                      cur.next = cur.next.next
                  else:
                      cur = cur.next
              out = []
              while head:
                  out.append(str(head.val))
                  head = head.next
              return " ".join(out)
        `,
    },
  },
  {
    title: "Remove Linked List Elements",
    difficulty: "Easy",
    companies: ["Amazon", "Apple", "Meta"],
    description: "Given a singly linked list and an integer `val`, delete every node whose value equals `val` and print the remaining list. The head itself may need to be removed.\n\nIf no node is left, print `empty`.",
    constraints: "1 <= number of nodes <= 10^5\n-10^9 <= value, val <= 10^9",
    inputFormat: "Line 1: the node values separated by spaces, head first.\nLine 2: the integer `val`.",
    outputFormat: "The remaining values separated by single spaces, or `empty` if the list becomes empty.",
    examples: [
      { input: "1 2 6 3 4 5 6\n6", output: "1 2 3 4 5", explanation: "Both 6s are removed." },
      { input: "1 2 2 1\n2", output: "1 1", explanation: "Both 2s are removed, leaving 1 1." },
    ],
    testCases: [
      { input: "1 2 6 3 4 5 6\n6", expectedOutput: "1 2 3 4 5", isHidden: false },
      { input: "1 2 2 1\n2", expectedOutput: "1 1", isHidden: false },
      { input: "7 7 7 7\n7", expectedOutput: "empty", isHidden: true },
      { input: "5\n5", expectedOutput: "empty", isHidden: true },
      { input: "5\n3", expectedOutput: "5", isHidden: true },
      { input: "6 1 6 2 6\n6", expectedOutput: "1 2", isHidden: true },
      { input: "-1 -2 -1\n-1", expectedOutput: "-2", isHidden: true },
      { input: "1 2 3\n4", expectedOutput: "1 2 3", isHidden: true },
      { input: line(REMOVE_VALUES) + "\n2", expectedOutput: line(REMOVE_VALUES.filter((v) => v !== 2)), isHidden: true },
    ],
    hints: [
      "Deleting a node means making its predecessor point past it, but the head has no predecessor.",
      "Put a dummy node in front of the head so every real node has a predecessor.",
      "Walk with `prev`: if `prev.next.val == val`, set `prev.next = prev.next.next`, otherwise move `prev` forward. Return `dummy.next`.",
    ],
    editorial: "Create a dummy node whose `next` is the head, so removing the head is no special case. Keep a pointer `prev` starting at the dummy; while `prev.next` exists, either unlink it (when its value equals `val`) without advancing `prev`, or advance `prev`. The answer is `dummy.next`. Time O(n), space O(1).",
    solutions: {
      javascript: code`
          function solve(input) {
            const lines = input.trim().split("\n");
            const vals = lines[0].trim().split(/\s+/).map(Number);
            const target = Number(lines[1]);
            const dummy = { val: 0, next: null };
            let tail = dummy;
            for (const v of vals) {
              tail.next = { val: v, next: null };
              tail = tail.next;
            }
            let prev = dummy;
            while (prev.next) {
              if (prev.next.val === target) prev.next = prev.next.next;
              else prev = prev.next;
            }
            const out = [];
            for (let node = dummy.next; node; node = node.next) out.push(node.val);
            return out.length ? out.join(" ") : "empty";
          }
        `,
      python: code`
          class Node:
              def __init__(self, val, nxt=None):
                  self.val = val
                  self.next = nxt


          def solve(input_str):
              lines = input_str.strip().split("\n")
              vals = [int(x) for x in lines[0].split()]
              target = int(lines[1])
              dummy = Node(0)
              tail = dummy
              for v in vals:
                  tail.next = Node(v)
                  tail = tail.next
              prev = dummy
              while prev.next:
                  if prev.next.val == target:
                      prev.next = prev.next.next
                  else:
                      prev = prev.next
              out = []
              node = dummy.next
              while node:
                  out.append(str(node.val))
                  node = node.next
              return " ".join(out) if out else "empty"
        `,
    },
  },
  {
    title: "Intersection of Two Linked Lists",
    difficulty: "Easy",
    companies: ["Amazon", "Microsoft", "Meta", "Bloomberg"],
    description: "Two singly linked lists may merge into a single shared tail: from the merge node onward both lists use the very same nodes (not just equal values). Print the value stored in the first shared node, or `null` if the two lists never meet.\n\nThe lists are described by their private prefixes and the shared tail, so list A is `prefixA + tail` and list B is `prefixB + tail`. Equal values do not mean shared nodes, so compare nodes, not values. Aim for O(n + m) time and O(1) extra space.\n\nA line containing only `-` stands for an empty sequence.",
    constraints: "1 <= nodes in each list <= 10^5\n1 <= value <= 10^9\nBoth complete lists (prefix + tail) are non-empty.",
    inputFormat: "Line 1: values of `prefixA` (or `-` if empty).\nLine 2: values of `prefixB` (or `-` if empty).\nLine 3: values of the shared `tail` (or `-` if the lists do not meet).",
    outputFormat: "The value of the first shared node, or `null`.",
    examples: [
      { input: "4 1\n5 6 1\n8 4 5", output: "8", explanation: "List A is 4 1 8 4 5 and list B is 5 6 1 8 4 5. They merge at the node holding 8, not at the earlier 1s (equal values, different nodes)." },
      { input: "2 6 4\n1 5\n-", output: "null", explanation: "There is no shared tail, so the lists never meet even though they contain the same kind of values." },
    ],
    testCases: [
      { input: "4 1\n5 6 1\n8 4 5", expectedOutput: "8", isHidden: false },
      { input: "2 6 4\n1 5\n-", expectedOutput: "null", isHidden: false },
      { input: "-\n-\n3 4", expectedOutput: "3", isHidden: true },
      { input: "1\n-\n2", expectedOutput: "2", isHidden: true },
      { input: "1 2 3\n1 2 3\n-", expectedOutput: "null", isHidden: true },
      { input: "7\n7\n7", expectedOutput: "7", isHidden: true },
      { input: "9 9 9 9\n9\n9 9", expectedOutput: "9", isHidden: true },
      { input: "5\n6\n1", expectedOutput: "1", isHidden: true },
      { input: line(MEET_A) + "\n" + line(MEET_B) + "\n" + line(MEET_TAIL), expectedOutput: String(MEET_TAIL[0]), isHidden: true },
    ],
    hints: [
      "The lists can have different lengths, so you cannot just advance both pointers together from the heads.",
      "If you knew both lengths you could skip the extra nodes of the longer list first.",
      "Neat trick: when a pointer reaches the end of its list, restart it at the head of the other list. Both pointers then travel the same total distance and meet at the intersection (or both become null together).",
    ],
    editorial: "Let `p` start at head A and `q` at head B. Advance both one step at a time; when a pointer falls off the end, move it to the head of the other list. After at most lenA + lenB steps both pointers have walked the same number of nodes, so they are either on the same node (the intersection) or both null (no intersection). Comparison is by node identity. Time O(n + m), space O(1).",
    solutions: {
      javascript: code`
          function solve(input) {
            const lines = input.trim().split("\n").map((l) => l.trim());
            const toVals = (l) => (l === "-" ? [] : l.split(/\s+/).map(Number));
            const build = (vals, rest) => {
              let head = rest;
              for (let i = vals.length - 1; i >= 0; i--) head = { val: vals[i], next: head };
              return head;
            };
            const tail = build(toVals(lines[2]), null);
            const a = build(toVals(lines[0]), tail);
            const b = build(toVals(lines[1]), tail);
            let p = a;
            let q = b;
            while (p !== q) {
              p = p ? p.next : b;
              q = q ? q.next : a;
            }
            return p ? String(p.val) : "null";
          }
        `,
      python: code`
          class Node:
              def __init__(self, val, nxt=None):
                  self.val = val
                  self.next = nxt


          def solve(input_str):
              lines = [l.strip() for l in input_str.strip().split("\n")]

              def to_vals(l):
                  return [] if l == "-" else [int(x) for x in l.split()]

              def build(vals, rest):
                  head = rest
                  for v in reversed(vals):
                      head = Node(v, head)
                  return head

              tail = build(to_vals(lines[2]), None)
              a = build(to_vals(lines[0]), tail)
              b = build(to_vals(lines[1]), tail)
              p, q = a, b
              while p is not q:
                  p = p.next if p else b
                  q = q.next if q else a
              return str(p.val) if p else "null"
        `,
    },
  },
  {
    title: "Length of the Loop in a Linked List",
    difficulty: "Easy",
    companies: ["Amazon", "Microsoft", "Accenture"],
    description: "A singly linked list may be corrupted so that its tail points back to one of the earlier nodes, creating a loop. Nodes are labelled `0..n-1` and node `0` is the head. Labels are arbitrary (they are not in list order), and every node can be reached from the head, so following `nxt` from node 0 visits all n nodes once before either hitting `-1` or revisiting a node.\n\nPrint the number of nodes that lie on the loop, or `0` if the list has no loop. Use O(1) extra space (Floyd's slow/fast pointers).",
    constraints: "1 <= n <= 10^5\n-1 <= nxt[i] < n\nThe nodes form one chain starting at node 0, optionally ending in a loop.",
    inputFormat: "Line 1: `n`, the number of nodes.\nLine 2: `n` integers `nxt[0..n-1]`, where `nxt[i]` is the label of the node after node `i`, or `-1` if node `i` is the tail.",
    outputFormat: "The number of nodes on the loop (0 if there is none).",
    examples: [
      { input: "5\n3 4 1 1 2", output: "3", explanation: "The chain is 0 -> 3 -> 1 -> 4 -> 2 -> 1. Nodes 1, 4 and 2 form the loop." },
      { input: "3\n2 -1 1", output: "0", explanation: "The chain 0 -> 2 -> 1 ends at -1, so there is no loop." },
    ],
    testCases: [
      { input: "5\n3 4 1 1 2", expectedOutput: "3", isHidden: false },
      { input: "3\n2 -1 1", expectedOutput: "0", isHidden: false },
      { input: "1\n-1", expectedOutput: "0", isHidden: true },
      { input: "1\n0", expectedOutput: "1", isHidden: true },
      { input: "2\n1 0", expectedOutput: "2", isHidden: true },
      { input: "2\n1 1", expectedOutput: "1", isHidden: true },
      { input: "4\n1 2 3 0", expectedOutput: "4", isHidden: true },
      { input: "6\n1 2 3 4 5 2", expectedOutput: "4", isHidden: true },
      { input: "7\n4 5 -1 1 6 3 2", expectedOutput: "0", isHidden: true },
      { input: LOOP_BIG.input, expectedOutput: String(LOOP_BIG.length), isHidden: true },
      { input: LOOP_NONE.input, expectedOutput: String(LOOP_NONE.length), isHidden: true },
    ],
    hints: [
      "A hash set of visited nodes works but uses O(n) memory.",
      "Run a slow pointer (1 step) and a fast pointer (2 steps) from the head; if the list is linear the fast pointer hits the end, otherwise they meet inside the loop.",
      "After they meet, stay at the meeting node and walk around the loop once, counting steps until you return to it.",
    ],
    editorial: "Floyd's cycle detection: move `slow` by one and `fast` by two from the head. If `fast` reaches the end the list is linear (answer 0). Otherwise the pointers must meet at some node inside the loop, because the fast pointer gains one node per step on the slow one. From the meeting node, walk once around the loop counting nodes until you return; that count is the loop length. Time O(n), space O(1).",
    solutions: {
      javascript: code`
          function solve(input) {
            const lines = input.trim().split("\n");
            const nxt = lines[1].trim().split(/\s+/).map(Number);
            let slow = 0;
            let fast = 0;
            while (fast !== -1 && nxt[fast] !== -1) {
              slow = nxt[slow];
              fast = nxt[nxt[fast]];
              if (slow === fast) {
                let length = 1;
                for (let cur = nxt[slow]; cur !== slow; cur = nxt[cur]) length++;
                return String(length);
              }
            }
            return "0";
          }
        `,
      python: code`
          def solve(input_str):
              lines = input_str.strip().split("\n")
              nxt = [int(x) for x in lines[1].split()]
              slow = fast = 0
              while fast != -1 and nxt[fast] != -1:
                  slow = nxt[slow]
                  fast = nxt[nxt[fast]]
                  if slow == fast:
                      length = 1
                      cur = nxt[slow]
                      while cur != slow:
                          cur = nxt[cur]
                          length += 1
                      return str(length)
              return "0"
        `,
    },
  },
  {
    title: "Add One to a Number Stored in a Linked List",
    difficulty: "Easy",
    companies: ["Amazon", "Microsoft", "Google", "Flipkart"],
    description: "A non-negative integer is stored in a singly linked list with one decimal digit per node, most significant digit first. Add 1 to the number and print the digits of the result, most significant first.\n\nThe number has no leading zeros (except the number 0 itself), and it may be far too large for any built-in integer type.",
    constraints: "1 <= number of digits <= 10^5\nEach node holds a digit 0-9.\nNo leading zeros unless the number is 0.",
    inputFormat: "One line: the digits separated by spaces, most significant first.",
    outputFormat: "The digits of (number + 1), separated by single spaces.",
    examples: [
      { input: "1 2 9", output: "1 3 0", explanation: "129 + 1 = 130." },
      { input: "9 9 9", output: "1 0 0 0", explanation: "999 + 1 = 1000, so the list grows by one node." },
    ],
    testCases: [
      { input: "1 2 9", expectedOutput: "1 3 0", isHidden: false },
      { input: "9 9 9", expectedOutput: "1 0 0 0", isHidden: false },
      { input: "0", expectedOutput: "1", isHidden: true },
      { input: "9", expectedOutput: "1 0", isHidden: true },
      { input: "1 9 9 8", expectedOutput: "1 9 9 9", isHidden: true },
      { input: "4 5 6 7 8 9 9 9", expectedOutput: "4 5 6 7 9 0 0 0", isHidden: true },
      { input: "8", expectedOutput: "9", isHidden: true },
      { input: "1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 9", expectedOutput: "1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0", isHidden: true },
      { input: line(Array(50000).fill(9)), expectedOutput: line(["1", ...Array(50000).fill(0)]), isHidden: true },
      { input: line(ADD1_DIGITS), expectedOutput: line([...ADD1_DIGITS.slice(0, -1), 9]), isHidden: true },
    ],
    hints: [
      "Addition starts at the least significant digit, but a singly linked list only lets you walk from the most significant one.",
      "Reverse the list (or push the digits on a stack) so you can process from the least significant digit.",
      "Add 1 with a carry: digit + carry, store digit % 10, carry = digit // 10. If a carry is left over at the end, a new leading 1 is needed. Only a run of trailing 9s ever changes.",
    ],
    editorial: "Reverse the list so the least significant digit comes first, then add 1 with carry propagation: `sum = digit + carry; digit = sum % 10; carry = sum / 10`. Stop early once the carry is 0. If a carry remains after the last digit (the number was all 9s), append a node with digit 1. Reverse back (or read the digits in reverse) to print. Alternative single pass: remember the last node that is not 9, increment it and zero every node after it; if no such node exists prepend a 1. Time O(n), space O(1).",
    solutions: {
      javascript: code`
          function solve(input) {
            const digits = input.trim().split(/\s+/).map(Number);
            let head = null; // least significant digit first
            for (const d of digits) head = { val: d, next: head };
            let carry = 1;
            let last = null;
            for (let node = head; node; node = node.next) {
              const sum = node.val + carry;
              node.val = sum % 10;
              carry = sum >= 10 ? 1 : 0;
              last = node;
            }
            if (carry) last.next = { val: 1, next: null };
            const out = [];
            for (let node = head; node; node = node.next) out.push(node.val);
            return out.reverse().join(" ");
          }
        `,
      python: code`
          class Node:
              def __init__(self, val, nxt=None):
                  self.val = val
                  self.next = nxt


          def solve(input_str):
              head = None  # least significant digit first
              for d in input_str.split():
                  head = Node(int(d), head)
              carry = 1
              last = None
              node = head
              while node:
                  total = node.val + carry
                  node.val = total % 10
                  carry = 1 if total >= 10 else 0
                  last = node
                  node = node.next
              if carry:
                  last.next = Node(1)
              out = []
              node = head
              while node:
                  out.append(str(node.val))
                  node = node.next
              return " ".join(reversed(out))
        `,
    },
  },
  {
    title: "Sort a Linked List of 0s, 1s and 2s",
    difficulty: "Easy",
    companies: ["Amazon", "Microsoft", "Flipkart", "Zoho"],
    description: "A singly linked list contains only the values 0, 1 and 2. Sort it in non-decreasing order by re-linking the existing nodes (no value counting and no new list of the same size is needed), and print the sorted list.\n\nTarget O(n) time with a single traversal and O(1) extra space.",
    constraints: "1 <= number of nodes <= 10^5\nEach value is 0, 1 or 2.",
    inputFormat: "One line: the node values (each 0, 1 or 2) separated by spaces, head first.",
    outputFormat: "The sorted values separated by single spaces.",
    examples: [
      { input: "1 0 2 1 0", output: "0 0 1 1 2", explanation: "Two 0s, two 1s and one 2." },
      { input: "2 2 0 1", output: "0 1 2 2", explanation: "One 0, one 1 and two 2s." },
    ],
    testCases: [
      { input: "1 0 2 1 0", expectedOutput: "0 0 1 1 2", isHidden: false },
      { input: "2 2 0 1", expectedOutput: "0 1 2 2", isHidden: false },
      { input: "0", expectedOutput: "0", isHidden: true },
      { input: "2 2 2", expectedOutput: "2 2 2", isHidden: true },
      { input: "1 1 0 0", expectedOutput: "0 0 1 1", isHidden: true },
      { input: "2 1 0", expectedOutput: "0 1 2", isHidden: true },
      { input: "1", expectedOutput: "1", isHidden: true },
      { input: "0 0 0 1 1 2 2 2 2", expectedOutput: "0 0 0 1 1 2 2 2 2", isHidden: true },
      { input: line(SORT012_VALUES), expectedOutput: line([...SORT012_VALUES].sort((a, b) => a - b)), isHidden: true },
    ],
    hints: [
      "Counting the 0s, 1s and 2s and rewriting values works but the task asks you to re-link nodes.",
      "Keep three separate chains, one per value, each with a dummy head and a tail pointer.",
      "Append every node to the chain of its value, then connect chain 0 to chain 1 to chain 2 (skipping chains that are empty) and end with null.",
    ],
    editorial: "Maintain three dummy heads and three tail pointers, one pair per value. Traverse the list once and append each node to the chain matching its value. Finally link the tail of the 0-chain to the first node of the 1-chain (or the 2-chain when there are no 1s), the 1-chain to the 2-chain, and terminate the 2-chain with null. This is the Dutch national flag idea applied to links. Time O(n), space O(1).",
    solutions: {
      javascript: code`
          function solve(input) {
            const vals = input.trim().split(/\s+/).map(Number);
            let head = null;
            for (let i = vals.length - 1; i >= 0; i--) head = { val: vals[i], next: null, link: head };
            const dummy = [{ next: null }, { next: null }, { next: null }];
            const tail = [dummy[0], dummy[1], dummy[2]];
            for (let node = head; node; ) {
              const following = node.link;
              node.next = null;
              tail[node.val].next = node;
              tail[node.val] = node;
              node = following;
            }
            tail[0].next = dummy[1].next ? dummy[1].next : dummy[2].next;
            tail[1].next = dummy[2].next;
            const out = [];
            const start = dummy[0].next ? dummy[0].next : dummy[1].next ? dummy[1].next : dummy[2].next;
            for (let node = start; node; node = node.next) out.push(node.val);
            return out.join(" ");
          }
        `,
      python: code`
          class Node:
              def __init__(self, val):
                  self.val = val
                  self.next = None


          def solve(input_str):
              nodes = [Node(int(x)) for x in input_str.split()]
              dummy = [Node(0), Node(0), Node(0)]
              tail = list(dummy)
              for node in nodes:
                  tail[node.val].next = node
                  tail[node.val] = node
              tail[0].next = dummy[1].next if dummy[1].next else dummy[2].next
              tail[1].next = dummy[2].next
              tail[2].next = None
              start = dummy[0].next or dummy[1].next or dummy[2].next
              out = []
              while start:
                  out.append(str(start.val))
                  start = start.next
              return " ".join(out)
        `,
    },
  },
];
