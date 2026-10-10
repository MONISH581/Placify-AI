/**
 * Algorithm-technique categories: recursion, backtracking, greedy, dynamic programming.
 */

import { code, type ProblemSpec } from "../problemHelpers";

// ---------------------------------------------------------------------------------------------
// Deterministic generators for the large "performance" test cases
// ---------------------------------------------------------------------------------------------

/** 32-bit linear congruential generator: the same seed always yields the same sequence. */
function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1103515245) + 12345) >>> 0;
    return state >>> 16;
  };
}

function pseudoRandomInts(count: number, min: number, max: number, seed: number): number[] {
  const next = lcg(seed);
  return Array.from({ length: count }, () => min + (next() % (max - min + 1)));
}

function pseudoRandomWord(length: number, alphabet: string, seed: number): string {
  const next = lcg(seed);
  return Array.from({ length }, () => alphabet[next() % alphabet.length]).join("");
}

/** Jump Game II: 3000 jump lengths in 0..7, about 12% zeros (seed chosen so the last index is reachable). Recursing over every jump choice is exponential. */
const JUMP_GAME_PERF_INPUT = pseudoRandomInts(3000, 0, 7, 816).join(" ");

/** Candy: ratings climb 1..2000 and fall back to 1 (3999 children, ~18 KB) - long slopes in both directions. */
const CANDY_PERF_INPUT = [
  ...Array.from({ length: 2000 }, (_, i) => i + 1),
  ...Array.from({ length: 1999 }, (_, i) => 1999 - i),
].join(" ");

/** Edit Distance: two 500-letter words; the plain three-way recursion is exponential. */
const EDIT_DISTANCE_PERF_INPUT = `${pseudoRandomWord(500, "abcd", 7)}\n${pseudoRandomWord(500, "abcd", 11)}`;

/** Combination Sum performance case (candidates 5 4 3 2, target 40): all 145 combinations in the required order. */
const COMBINATION_SUM_PERF_EXPECTED = [
  "2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2",
  "2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 4",
  "2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 3 3",
  "2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 3 5",
  "2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 4 4",
  "2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 3 3 4",
  "2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 5 5",
  "2 2 2 2 2 2 2 2 2 2 2 2 2 2 3 3 3 3",
  "2 2 2 2 2 2 2 2 2 2 2 2 2 2 3 4 5",
  "2 2 2 2 2 2 2 2 2 2 2 2 2 2 4 4 4",
  "2 2 2 2 2 2 2 2 2 2 2 2 2 3 3 3 5",
  "2 2 2 2 2 2 2 2 2 2 2 2 2 3 3 4 4",
  "2 2 2 2 2 2 2 2 2 2 2 2 2 4 5 5",
  "2 2 2 2 2 2 2 2 2 2 2 2 3 3 3 3 4",
  "2 2 2 2 2 2 2 2 2 2 2 2 3 3 5 5",
  "2 2 2 2 2 2 2 2 2 2 2 2 3 4 4 5",
  "2 2 2 2 2 2 2 2 2 2 2 2 4 4 4 4",
  "2 2 2 2 2 2 2 2 2 2 2 3 3 3 3 3 3",
  "2 2 2 2 2 2 2 2 2 2 2 3 3 3 4 5",
  "2 2 2 2 2 2 2 2 2 2 2 3 3 4 4 4",
  "2 2 2 2 2 2 2 2 2 2 2 3 5 5 5",
  "2 2 2 2 2 2 2 2 2 2 2 4 4 5 5",
  "2 2 2 2 2 2 2 2 2 2 3 3 3 3 3 5",
  "2 2 2 2 2 2 2 2 2 2 3 3 3 3 4 4",
  "2 2 2 2 2 2 2 2 2 2 3 3 4 5 5",
  "2 2 2 2 2 2 2 2 2 2 3 4 4 4 5",
  "2 2 2 2 2 2 2 2 2 2 4 4 4 4 4",
  "2 2 2 2 2 2 2 2 2 2 5 5 5 5",
  "2 2 2 2 2 2 2 2 2 3 3 3 3 3 3 4",
  "2 2 2 2 2 2 2 2 2 3 3 3 3 5 5",
  "2 2 2 2 2 2 2 2 2 3 3 3 4 4 5",
  "2 2 2 2 2 2 2 2 2 3 3 4 4 4 4",
  "2 2 2 2 2 2 2 2 2 3 4 5 5 5",
  "2 2 2 2 2 2 2 2 2 4 4 4 5 5",
  "2 2 2 2 2 2 2 2 3 3 3 3 3 3 3 3",
  "2 2 2 2 2 2 2 2 3 3 3 3 3 4 5",
  "2 2 2 2 2 2 2 2 3 3 3 3 4 4 4",
  "2 2 2 2 2 2 2 2 3 3 3 5 5 5",
  "2 2 2 2 2 2 2 2 3 3 4 4 5 5",
  "2 2 2 2 2 2 2 2 3 4 4 4 4 5",
  "2 2 2 2 2 2 2 2 4 4 4 4 4 4",
  "2 2 2 2 2 2 2 2 4 5 5 5 5",
  "2 2 2 2 2 2 2 3 3 3 3 3 3 3 5",
  "2 2 2 2 2 2 2 3 3 3 3 3 3 4 4",
  "2 2 2 2 2 2 2 3 3 3 3 4 5 5",
  "2 2 2 2 2 2 2 3 3 3 4 4 4 5",
  "2 2 2 2 2 2 2 3 3 4 4 4 4 4",
  "2 2 2 2 2 2 2 3 3 5 5 5 5",
  "2 2 2 2 2 2 2 3 4 4 5 5 5",
  "2 2 2 2 2 2 2 4 4 4 4 5 5",
  "2 2 2 2 2 2 3 3 3 3 3 3 3 3 4",
  "2 2 2 2 2 2 3 3 3 3 3 3 5 5",
  "2 2 2 2 2 2 3 3 3 3 3 4 4 5",
  "2 2 2 2 2 2 3 3 3 3 4 4 4 4",
  "2 2 2 2 2 2 3 3 3 4 5 5 5",
  "2 2 2 2 2 2 3 3 4 4 4 5 5",
  "2 2 2 2 2 2 3 4 4 4 4 4 5",
  "2 2 2 2 2 2 3 5 5 5 5 5",
  "2 2 2 2 2 2 4 4 4 4 4 4 4",
  "2 2 2 2 2 2 4 4 5 5 5 5",
  "2 2 2 2 2 3 3 3 3 3 3 3 3 3 3",
  "2 2 2 2 2 3 3 3 3 3 3 3 4 5",
  "2 2 2 2 2 3 3 3 3 3 3 4 4 4",
  "2 2 2 2 2 3 3 3 3 3 5 5 5",
  "2 2 2 2 2 3 3 3 3 4 4 5 5",
  "2 2 2 2 2 3 3 3 4 4 4 4 5",
  "2 2 2 2 2 3 3 4 4 4 4 4 4",
  "2 2 2 2 2 3 3 4 5 5 5 5",
  "2 2 2 2 2 3 4 4 4 5 5 5",
  "2 2 2 2 2 4 4 4 4 4 5 5",
  "2 2 2 2 2 5 5 5 5 5 5",
  "2 2 2 2 3 3 3 3 3 3 3 3 3 5",
  "2 2 2 2 3 3 3 3 3 3 3 3 4 4",
  "2 2 2 2 3 3 3 3 3 3 4 5 5",
  "2 2 2 2 3 3 3 3 3 4 4 4 5",
  "2 2 2 2 3 3 3 3 4 4 4 4 4",
  "2 2 2 2 3 3 3 3 5 5 5 5",
  "2 2 2 2 3 3 3 4 4 5 5 5",
  "2 2 2 2 3 3 4 4 4 4 5 5",
  "2 2 2 2 3 4 4 4 4 4 4 5",
  "2 2 2 2 3 4 5 5 5 5 5",
  "2 2 2 2 4 4 4 4 4 4 4 4",
  "2 2 2 2 4 4 4 5 5 5 5",
  "2 2 2 3 3 3 3 3 3 3 3 3 3 4",
  "2 2 2 3 3 3 3 3 3 3 3 5 5",
  "2 2 2 3 3 3 3 3 3 3 4 4 5",
  "2 2 2 3 3 3 3 3 3 4 4 4 4",
  "2 2 2 3 3 3 3 3 4 5 5 5",
  "2 2 2 3 3 3 3 4 4 4 5 5",
  "2 2 2 3 3 3 4 4 4 4 4 5",
  "2 2 2 3 3 3 5 5 5 5 5",
  "2 2 2 3 3 4 4 4 4 4 4 4",
  "2 2 2 3 3 4 4 5 5 5 5",
  "2 2 2 3 4 4 4 4 5 5 5",
  "2 2 2 4 4 4 4 4 4 5 5",
  "2 2 2 4 5 5 5 5 5 5",
  "2 2 3 3 3 3 3 3 3 3 3 3 3 3",
  "2 2 3 3 3 3 3 3 3 3 3 4 5",
  "2 2 3 3 3 3 3 3 3 3 4 4 4",
  "2 2 3 3 3 3 3 3 3 5 5 5",
  "2 2 3 3 3 3 3 3 4 4 5 5",
  "2 2 3 3 3 3 3 4 4 4 4 5",
  "2 2 3 3 3 3 4 4 4 4 4 4",
  "2 2 3 3 3 3 4 5 5 5 5",
  "2 2 3 3 3 4 4 4 5 5 5",
  "2 2 3 3 4 4 4 4 4 5 5",
  "2 2 3 3 5 5 5 5 5 5",
  "2 2 3 4 4 4 4 4 4 4 5",
  "2 2 3 4 4 5 5 5 5 5",
  "2 2 4 4 4 4 4 4 4 4 4",
  "2 2 4 4 4 4 5 5 5 5",
  "2 3 3 3 3 3 3 3 3 3 3 3 5",
  "2 3 3 3 3 3 3 3 3 3 3 4 4",
  "2 3 3 3 3 3 3 3 3 4 5 5",
  "2 3 3 3 3 3 3 3 4 4 4 5",
  "2 3 3 3 3 3 3 4 4 4 4 4",
  "2 3 3 3 3 3 3 5 5 5 5",
  "2 3 3 3 3 3 4 4 5 5 5",
  "2 3 3 3 3 4 4 4 4 5 5",
  "2 3 3 3 4 4 4 4 4 4 5",
  "2 3 3 3 4 5 5 5 5 5",
  "2 3 3 4 4 4 4 4 4 4 4",
  "2 3 3 4 4 4 5 5 5 5",
  "2 3 4 4 4 4 4 5 5 5",
  "2 3 5 5 5 5 5 5 5",
  "2 4 4 4 4 4 4 4 5 5",
  "2 4 4 5 5 5 5 5 5",
  "3 3 3 3 3 3 3 3 3 3 3 3 4",
  "3 3 3 3 3 3 3 3 3 3 5 5",
  "3 3 3 3 3 3 3 3 3 4 4 5",
  "3 3 3 3 3 3 3 3 4 4 4 4",
  "3 3 3 3 3 3 3 4 5 5 5",
  "3 3 3 3 3 3 4 4 4 5 5",
  "3 3 3 3 3 4 4 4 4 4 5",
  "3 3 3 3 3 5 5 5 5 5",
  "3 3 3 3 4 4 4 4 4 4 4",
  "3 3 3 3 4 4 5 5 5 5",
  "3 3 3 4 4 4 4 5 5 5",
  "3 3 4 4 4 4 4 4 5 5",
  "3 3 4 5 5 5 5 5 5",
  "3 4 4 4 4 4 4 4 4 5",
  "3 4 4 4 5 5 5 5 5",
  "4 4 4 4 4 4 4 4 4 4",
  "4 4 4 4 4 5 5 5 5",
  "5 5 5 5 5 5 5 5",
].join("\n");

// ---------------------------------------------------------------------------------------------
// Problem specs
// ---------------------------------------------------------------------------------------------

export const ALGORITHM_SPECS: Record<string, ProblemSpec[]> = {
  recursion: [
    {
      title: "Tower of Hanoi",
      difficulty: "Easy",
      description:
        "There are three rods `A`, `B` and `C`. Rod `A` holds `n` disks of different sizes, numbered `1` (smallest) to `n` (largest), stacked with the largest at the bottom. Move the whole stack to rod `C`, using rod `B` as a helper, while obeying the rules:\n\n- Only one disk moves at a time: the top disk of one rod is placed on top of another rod.\n- A disk may never be placed on top of a smaller disk.\n\nPrint the moves of the shortest solution (it is unique and has `2^n - 1` moves).",
      constraints: "1 <= n <= 10",
      inputFormat: "A single integer `n`.",
      outputFormat:
        "`2^n - 1` lines, one move per line in the order they are made. A move is printed as `d X Y`: move disk `d` from rod `X` to rod `Y`.",
      examples: [
        {
          input: "2",
          output: "1 A B\n2 A C\n1 B C",
          explanation: "Park disk 1 on the helper rod B, move disk 2 to C, then put disk 1 back on top of disk 2.",
        },
      ],
      testCases: [
        { input: "2", expectedOutput: "1 A B\n2 A C\n1 B C", isHidden: false },
        { input: "3", expectedOutput: "1 A C\n2 A B\n1 C B\n3 A C\n1 B A\n2 B C\n1 A C", isHidden: false },
        { input: "1", expectedOutput: "1 A C", isHidden: true },
        {
          input: "4",
          expectedOutput:
            "1 A B\n2 A C\n1 B C\n3 A B\n1 C A\n2 C B\n1 A B\n4 A C\n1 B C\n2 B A\n1 C A\n3 B C\n1 A B\n2 A C\n1 B C",
          isHidden: true,
        },
        {
          input: "5",
          expectedOutput:
            "1 A C\n2 A B\n1 C B\n3 A C\n1 B A\n2 B C\n1 A C\n4 A B\n1 C B\n2 C A\n1 B A\n3 C B\n1 A C\n2 A B\n1 C B\n5 A C\n1 B A\n2 B C\n1 A C\n3 B A\n1 C B\n2 C A\n1 B A\n4 B C\n1 A C\n2 A B\n1 C B\n3 A C\n1 B A\n2 B C\n1 A C",
          isHidden: true,
        },
      ],
      hints: [
        "The largest disk `n` can only move when all `n - 1` smaller disks are stacked on the one remaining rod.",
        "So: move `n - 1` disks from the source to the helper, move disk `n` to the target, then move the `n - 1` disks from the helper onto the target.",
        "Write `hanoi(k, from, to, via)`, which recurses on `k - 1` twice with the roles of the rods swapped; `k = 0` does nothing.",
      ],
      editorial:
        "Recursion: hanoi(k, from, to, via) = hanoi(k - 1, from, via, to); move disk k from `from` to `to`; hanoi(k - 1, via, to, from). The call hanoi(n, A, C, B) prints the whole plan. The number of moves satisfies T(k) = 2T(k - 1) + 1, so T(n) = 2^n - 1, which is optimal: disk n must move at least once, and before and after that move all smaller disks must be stacked on the third rod. Time O(2^n) (one step per printed move), recursion depth O(n).",
      solutions: {
        javascript: code`
          function solve(input) {
            const n = Number(input.trim());
            const moves = [];
            function hanoi(k, from, to, via) {
              if (k === 0) return;
              hanoi(k - 1, from, via, to);
              moves.push(k + " " + from + " " + to);
              hanoi(k - 1, via, to, from);
            }
            hanoi(n, "A", "C", "B");
            return moves.join("\n");
          }
        `,
        python: code`
          def solve(input_str):
              n = int(input_str.strip())
              moves = []

              def hanoi(k, src, dst, via):
                  if k == 0:
                      return
                  hanoi(k - 1, src, via, dst)
                  moves.append(f"{k} {src} {dst}")
                  hanoi(k - 1, via, dst, src)

              hanoi(n, "A", "C", "B")
              return "\n".join(moves)
        `,
      },
    },
    {
      title: "K-th Symbol in Grammar",
      difficulty: "Medium",
      description:
        "Build a table of rows, numbered from `1`. Row `1` is `0`. Every following row is produced from the previous one by replacing each `0` with `01` and each `1` with `10`. So row 2 is `01`, row 3 is `0110` and row 4 is `01101001`.\n\nAnswer `q` queries: for each pair `n k`, print the `k`-th symbol (1-indexed) of row `n`. Row `n` has `2^(n - 1)` symbols, so it is far too long to build for large `n`.",
      constraints: "1 <= q <= 1000\n1 <= n <= 30\n1 <= k <= 2^(n - 1)",
      inputFormat: "Line 1: the number of queries `q`.\nNext `q` lines: two integers `n` and `k`.",
      outputFormat: "`q` lines: the symbol (`0` or `1`) answering each query, in input order.",
      examples: [
        {
          input: "4\n1 1\n2 1\n2 2\n4 5",
          output: "0\n0\n1\n1",
          explanation: "Row 1 is `0`, row 2 is `01` and row 4 is `01101001`, whose 5th symbol is `1`.",
        },
      ],
      testCases: [
        { input: "4\n1 1\n2 1\n2 2\n4 5", expectedOutput: "0\n0\n1\n1", isHidden: false },
        { input: "3\n3 1\n3 2\n3 4", expectedOutput: "0\n1\n0", isHidden: false },
        { input: "1\n1 1", expectedOutput: "0", isHidden: true },
        {
          input: "16\n5 1\n5 2\n5 3\n5 4\n5 5\n5 6\n5 7\n5 8\n5 9\n5 10\n5 11\n5 12\n5 13\n5 14\n5 15\n5 16",
          expectedOutput: "0\n1\n1\n0\n1\n0\n0\n1\n1\n0\n0\n1\n0\n1\n1\n0",
          isHidden: true,
        },
        {
          input: "8\n30 1\n30 536870912\n30 268435456\n30 268435457\n30 123456789\n29 268435456\n30 434991989\n25 16777216",
          expectedOutput: "0\n1\n0\n1\n1\n0\n0\n0",
          isHidden: true,
        },
      ],
      hints: [
        "Every symbol of row `n` is produced by exactly one parent symbol in row `n - 1`: position `k` comes from position `ceil(k / 2)`.",
        "A parent `0` produces `01` and a parent `1` produces `10`: an odd `k` copies its parent's symbol, an even `k` flips it.",
        "Recurse from `(n, k)` to `(n - 1, ceil(k / 2))` until row 1 (whose only symbol is `0`), flipping the result for every even `k` on the way back. Each query costs O(n).",
      ],
      editorial:
        "Symbol k of row n is generated by symbol ceil(k / 2) of row n - 1: it equals the parent when k is odd and is the flipped parent when k is even. Hence kth(n, k) = kth(n - 1, ceil(k / 2)) XOR (k is even), with kth(1, 1) = 0. Each query takes O(n) time and O(n) recursion depth, and no row is ever built (row 30 would have 2^29 symbols). Unrolling the recursion shows the answer is the parity of the number of 1-bits in k - 1.",
      solutions: {
        javascript: code`
          function kth(n, k) {
            if (n === 1) return 0;
            const parent = kth(n - 1, Math.ceil(k / 2));
            return k % 2 === 1 ? parent : 1 - parent;
          }

          function solve(input) {
            const lines = input.trim().split("\n");
            const q = Number(lines[0]);
            const out = [];
            for (let i = 1; i <= q; i++) {
              const [n, k] = lines[i].trim().split(/\s+/).map(Number);
              out.push(kth(n, k));
            }
            return out.join("\n");
          }
        `,
        python: code`
          def kth(n, k):
              if n == 1:
                  return 0
              parent = kth(n - 1, (k + 1) // 2)
              return parent if k % 2 == 1 else 1 - parent


          def solve(input_str):
              lines = input_str.strip().split("\n")
              q = int(lines[0])
              out = []
              for line in lines[1:q + 1]:
                  n, k = map(int, line.split())
                  out.append(str(kth(n, k)))
              return "\n".join(out)
        `,
      },
    },
    {
      title: "Scramble String",
      difficulty: "Hard",
      description:
        "A string `t` is a *scramble* of a string `s` if it can be produced by this recursive process:\n\n- If `s` has length 1, stop: `t = s`.\n- Otherwise split `s` at any position into two non-empty parts `x` and `y` (so `s = x + y`), then either keep their order (`x + y`) or swap them (`y + x`), and scramble each of the two parts independently with the same process.\n\nGiven two strings `s1` and `s2` of the same length, print `true` if `s2` is a scramble of `s1`, otherwise `false`.",
      constraints: "1 <= s1.length == s2.length <= 30\n`s1` and `s2` consist of lowercase English letters.",
      inputFormat: "Line 1: the string `s1`.\nLine 2: the string `s2`.",
      outputFormat: "`true` or `false`.",
      examples: [
        {
          input: "great\nrgeat",
          output: "true",
          explanation: "Split `great` into `gr` + `eat` and keep the order; split `gr` into `g` + `r` and swap them; leave `eat` unchanged. The result is `rg` + `eat` = `rgeat`.",
        },
      ],
      testCases: [
        { input: "great\nrgeat", expectedOutput: "true", isHidden: false },
        { input: "abcde\ncaebd", expectedOutput: "false", isHidden: false },
        { input: "a\na", expectedOutput: "true", isHidden: true },
        { input: "abcd\nbdac", expectedOutput: "false", isHidden: true },
        { input: "abb\nbba", expectedOutput: "true", isHidden: true },
        { input: "abcdefghij\njihgfedcba", expectedOutput: "true", isHidden: true },
        {
          input: "eebaacbcbcadaaedceaaacadccd\neadcaacabaddaceacbceaabeccd",
          expectedOutput: "false",
          isHidden: true,
        },
        { input: "bcccbccccbccbcbabbbaababcccbcc\nbccbaccbcbcbcacabcbbcbcabccccb", expectedOutput: "false", isHidden: true },
      ],
      hints: [
        "Try every split point `k` of `s1`. Either the parts kept their order (compare the first `k` characters of both strings, and the rests) or they were swapped (compare the first `k` characters of `s1` with the last `k` characters of `s2`, and the rests).",
        "Prune early: two strings can only be scrambles of each other if they contain exactly the same letters with the same counts.",
        "The same pair of substrings is checked over and over. Memoise on `(i, j, len)` - start in `s1`, start in `s2`, length - to get O(n^4) total work instead of exponential.",
      ],
      editorial:
        "Let f(i, j, len) be true when s2[j .. j + len) is a scramble of s1[i .. i + len). For len = 1 compare the two characters. Otherwise try every split k in 1..len - 1: without a swap f(i, j, k) and f(i + k, j + k, len - k) must hold; with a swap f(i, j + len - k, k) and f(i + k, j, len - k) must hold. Plain recursion re-solves the same substring pairs exponentially often (tens of millions of calls on the largest hidden test, even with anagram pruning); memoising the O(n^3) states, each doing O(n) work, gives O(n^4) time - under a million steps for n = 30 - and O(n^3) space. An anagram check on each pair prunes most states early.",
      solutions: {
        javascript: code`
          function solve(input) {
            const lines = input.trim().split("\n");
            const s1 = lines[0].trim();
            const s2 = lines[1].trim();
            const n = s1.length;
            if (s2.length !== n) return "false";
            const memo = new Int8Array(n * n * (n + 1)); // 0 = unknown, 1 = true, 2 = false
            function scramble(i, j, len) {
              const key = (i * n + j) * (n + 1) + len;
              if (memo[key]) return memo[key] === 1;
              let result = false;
              if (len === 1) {
                result = s1[i] === s2[j];
              } else {
                for (let k = 1; k < len && !result; k++) {
                  result =
                    (scramble(i, j, k) && scramble(i + k, j + k, len - k)) ||
                    (scramble(i, j + len - k, k) && scramble(i + k, j, len - k));
                }
              }
              memo[key] = result ? 1 : 2;
              return result;
            }
            return scramble(0, 0, n) ? "true" : "false";
          }
        `,
        python: code`
          from functools import lru_cache


          def solve(input_str):
              lines = input_str.strip().split("\n")
              s1, s2 = lines[0].strip(), lines[1].strip()
              if len(s1) != len(s2):
                  return "false"

              @lru_cache(maxsize=None)
              def scramble(i, j, length):
                  a, b = s1[i:i + length], s2[j:j + length]
                  if a == b:
                      return True
                  if sorted(a) != sorted(b):
                      return False
                  for k in range(1, length):
                      if scramble(i, j, k) and scramble(i + k, j + k, length - k):
                          return True
                      if scramble(i, j + length - k, k) and scramble(i + k, j, length - k):
                          return True
                  return False

              return "true" if scramble(0, 0, len(s1)) else "false"
        `,
      },
    },
  ],
  backtracking: [
    {
      title: "Letter Case Permutation",
      difficulty: "Easy",
      description:
        "Given a string `s` made of English letters and digits, you may independently switch every letter to lowercase or uppercase. Print every distinct string that can be produced this way.\n\nPrint the strings in lexicographic (ASCII) order, one per line: digits sort before uppercase letters, and uppercase letters sort before lowercase letters.",
      constraints: "1 <= s.length <= 12\n`s` consists of English letters and digits and contains at most 10 letters.",
      inputFormat: "A single line: the string `s`.",
      outputFormat: "Every produced string on its own line, sorted in ASCII order.",
      examples: [
        {
          input: "a1b2",
          output: "A1B2\nA1b2\na1B2\na1b2",
          explanation: "Each of the 2 letters can be either case, giving 2^2 = 4 strings. `A` (65) sorts before `a` (97).",
        },
      ],
      testCases: [
        { input: "a1b2", expectedOutput: "A1B2\nA1b2\na1B2\na1b2", isHidden: false },
        { input: "3z4", expectedOutput: "3Z4\n3z4", isHidden: false },
        { input: "12345", expectedOutput: "12345", isHidden: true },
        { input: "C", expectedOutput: "C\nc", isHidden: true },
        { input: "aB", expectedOutput: "AB\nAb\naB\nab", isHidden: true },
        {
          input: "0aZ9bY",
          expectedOutput:
            "0AZ9BY\n0AZ9By\n0AZ9bY\n0AZ9by\n0Az9BY\n0Az9By\n0Az9bY\n0Az9by\n0aZ9BY\n0aZ9By\n0aZ9bY\n0aZ9by\n0az9BY\n0az9By\n0az9bY\n0az9by",
          isHidden: true,
        },
      ],
      hints: [
        "Walk the string from left to right: every letter branches into two choices, every digit into just one.",
        "Backtrack on a character array: set position `i` to uppercase and recurse on `i + 1`, then set it to lowercase and recurse again.",
        "Exploring the uppercase branch first already produces the strings in ASCII order (uppercase sorts first); otherwise sort the results before printing.",
      ],
      editorial:
        "Depth-first backtracking over the positions: a digit is kept as is, a letter branches into its uppercase and lowercase forms. Because the earlier positions are fixed inside each branch and the uppercase branch is explored first, the strings come out in ASCII order without sorting. With L letters there are 2^L strings of length n: time O(n * 2^L), recursion depth O(n).",
      solutions: {
        javascript: code`
          function solve(input) {
            const chars = input.trim().split("");
            const out = [];
            function backtrack(i) {
              if (i === chars.length) {
                out.push(chars.join(""));
                return;
              }
              const ch = chars[i];
              if (/[a-zA-Z]/.test(ch)) {
                chars[i] = ch.toUpperCase();
                backtrack(i + 1);
                chars[i] = ch.toLowerCase();
                backtrack(i + 1);
                chars[i] = ch;
              } else {
                backtrack(i + 1);
              }
            }
            backtrack(0);
            return out.join("\n");
          }
        `,
        python: code`
          def solve(input_str):
              chars = list(input_str.strip())
              out = []

              def backtrack(i):
                  if i == len(chars):
                      out.append("".join(chars))
                      return
                  ch = chars[i]
                  if ch.isalpha():
                      chars[i] = ch.upper()
                      backtrack(i + 1)
                      chars[i] = ch.lower()
                      backtrack(i + 1)
                      chars[i] = ch
                  else:
                      backtrack(i + 1)

              backtrack(0)
              return "\n".join(out)
        `,
      },
    },
    {
      title: "Combination Sum",
      difficulty: "Medium",
      description:
        "Given an array of distinct positive integers `candidates` and an integer `target`, find all unique combinations of candidates whose sum is `target`. The same candidate may be chosen any number of times. Two combinations are the same if they use every number the same number of times.\n\nPrint each combination on its own line as space-separated numbers in non-decreasing order, and order the lines lexicographically (compare the numbers element by element, numerically). Print `NONE` if there is no combination.",
      constraints:
        "1 <= candidates.length <= 30\n2 <= candidates[i] <= 40\nAll candidates are distinct.\n1 <= target <= 40\nThere are fewer than 150 combinations.",
      inputFormat: "Line 1: space-separated integers `candidates` (in any order).\nLine 2: the integer `target`.",
      outputFormat: "One combination per line (numbers in non-decreasing order), lines in lexicographic order; or `NONE`.",
      examples: [
        {
          input: "2 3 6 7\n7",
          output: "2 2 3\n7",
          explanation: "2 + 2 + 3 = 7 (2 is used twice) and 7 = 7. These are the only two combinations.",
        },
      ],
      testCases: [
        { input: "2 3 6 7\n7", expectedOutput: "2 2 3\n7", isHidden: false },
        { input: "2 3 5\n8", expectedOutput: "2 2 2 2\n2 3 3\n3 5", isHidden: false },
        { input: "2\n1", expectedOutput: "NONE", isHidden: true },
        { input: "8 7 4 3\n11", expectedOutput: "3 4 4\n3 8\n4 7", isHidden: true },
        { input: "12 10 11\n10", expectedOutput: "10", isHidden: true },
        { input: "40\n40", expectedOutput: "40", isHidden: true },
        { input: "5 4 3 2\n40", expectedOutput: COMBINATION_SUM_PERF_EXPECTED, isHidden: true },
      ],
      hints: [
        "Sort the candidates and build every combination in non-decreasing order, so each multiset is generated exactly once.",
        "Backtrack with `(start, remaining)`: try each candidate from index `start` onward, and recurse with the same index (reuse is allowed) - never an earlier one.",
        "Stop the loop as soon as a candidate exceeds `remaining`, since every later candidate is larger. Trying candidates in ascending order also emits the lines in the required order.",
      ],
      editorial:
        "Sort the candidates and run dfs(start, remaining, path): when remaining is 0, record path; otherwise for i = start, start + 1, ... while candidates[i] <= remaining, push candidates[i], call dfs(i, remaining - candidates[i], path) and pop. Restricting the choices to indices >= start makes every path non-decreasing, so each combination is produced once (no deduplication needed), and exploring smaller values first produces the combinations in lexicographic order. The search only visits partial combinations with sum <= target; the worst case is exponential in target / min(candidates), but generating ordered sequences and deduplicating them afterwards is far slower (tens of millions of sequences for the largest hidden test). Space O(target / min(candidates)) for the path.",
      solutions: {
        javascript: code`
          function solve(input) {
            const lines = input.trim().split("\n");
            const candidates = lines[0].trim().split(/\s+/).map(Number).sort((a, b) => a - b);
            const target = Number(lines[1]);
            const result = [];
            const path = [];
            function backtrack(start, remaining) {
              if (remaining === 0) {
                result.push(path.join(" "));
                return;
              }
              for (let i = start; i < candidates.length && candidates[i] <= remaining; i++) {
                path.push(candidates[i]);
                backtrack(i, remaining - candidates[i]);
                path.pop();
              }
            }
            backtrack(0, target);
            return result.length ? result.join("\n") : "NONE";
          }
        `,
        python: code`
          def solve(input_str):
              lines = input_str.strip().split("\n")
              candidates = sorted(map(int, lines[0].split()))
              target = int(lines[1])
              result = []
              path = []

              def backtrack(start, remaining):
                  if remaining == 0:
                      result.append(" ".join(map(str, path)))
                      return
                  for i in range(start, len(candidates)):
                      if candidates[i] > remaining:
                          break
                      path.append(candidates[i])
                      backtrack(i, remaining - candidates[i])
                      path.pop()

              backtrack(0, target)
              return "\n".join(result) if result else "NONE"
        `,
      },
    },
    {
      title: "N-Queens II",
      difficulty: "Hard",
      description:
        "The `n`-queens puzzle asks you to place `n` queens on an `n x n` chessboard so that no two queens attack each other: no two queens may share a row, a column or a diagonal.\n\nGiven `n`, print the number of distinct solutions.",
      constraints: "1 <= n <= 12",
      inputFormat: "A single integer `n`.",
      outputFormat: "The number of distinct solutions.",
      examples: [
        {
          input: "4",
          output: "2",
          explanation: "The two solutions are `.Q.. / ...Q / Q... / ..Q.` and its mirror image `..Q. / Q... / ...Q / .Q..` (rows listed top to bottom).",
        },
      ],
      testCases: [
        { input: "4", expectedOutput: "2", isHidden: false },
        { input: "1", expectedOutput: "1", isHidden: false },
        { input: "3", expectedOutput: "0", isHidden: true },
        { input: "6", expectedOutput: "4", isHidden: true },
        { input: "8", expectedOutput: "92", isHidden: true },
        { input: "10", expectedOutput: "724", isHidden: true },
        { input: "12", expectedOutput: "14200", isHidden: true },
      ],
      hints: [
        "Every row holds exactly one queen, so place the queens row by row and only choose a column for each.",
        "Square `(r, c)` is attacked through its column `c`, its diagonal `r - c` and its anti-diagonal `r + c`. Keep the occupied ones in three sets (or bitmasks) for O(1) checks.",
        "Backtrack: in row `r` try every free column, mark it, recurse into row `r + 1`, then unmark it. Reaching row `n` counts one solution.",
      ],
      editorial:
        "Backtracking row by row with O(1) conflict checks: a queen at (r, c) blocks column c, diagonal r - c and anti-diagonal r + c. A branch dies as soon as a row has no safe column, so for n = 12 the search visits under a million partial boards instead of the 12! = 479 million permutations a brute force would test. With bitmasks, the free columns of the next row are ~(cols | diag | anti) & (2^n - 1); after placing a queen the diagonal masks shift by one position per row, and iterating over the lowest set bit keeps every step to a few machine operations. Time is exponential (bounded by O(n!)) but fast in practice; space O(n).",
      solutions: {
        javascript: code`
          function solve(input) {
            const n = Number(input.trim());
            const full = (1 << n) - 1;
            function place(cols, diag, anti) {
              if (cols === full) return 1;
              let count = 0;
              let free = full & ~(cols | diag | anti);
              while (free) {
                const bit = free & -free;
                free -= bit;
                count += place(cols | bit, ((diag | bit) << 1) & full, (anti | bit) >> 1);
              }
              return count;
            }
            return String(place(0, 0, 0));
          }
        `,
        python: code`
          def solve(input_str):
              n = int(input_str.strip())
              full = (1 << n) - 1

              def place(cols, diag, anti):
                  if cols == full:
                      return 1
                  count = 0
                  free = full & ~(cols | diag | anti)
                  while free:
                      bit = free & -free
                      free ^= bit
                      count += place(cols | bit, ((diag | bit) << 1) & full, (anti | bit) >> 1)
                  return count

              return str(place(0, 0, 0))
        `,
      },
    },
  ],
  greedy: [
    {
      title: "Assign Cookies",
      difficulty: "Easy",
      description:
        "You want to hand out cookies to children. Child `i` has a greed factor `g[i]`: the minimum cookie size that makes them content. Cookie `j` has size `s[j]`. Each child gets at most one cookie and each cookie goes to at most one child; child `i` is content if they receive a cookie with `s[j] >= g[i]`.\n\nPrint the maximum number of content children.",
      constraints: "1 <= g.length, s.length <= 3 * 10^4\n1 <= g[i], s[j] <= 2^31 - 1",
      inputFormat: "Line 1: space-separated greed factors `g`.\nLine 2: space-separated cookie sizes `s`.",
      outputFormat: "The maximum number of content children.",
      examples: [
        {
          input: "1 2 3\n1 1",
          output: "1",
          explanation: "Both cookies have size 1, which only satisfies the child with greed factor 1.",
        },
      ],
      testCases: [
        { input: "1 2 3\n1 1", expectedOutput: "1", isHidden: false },
        { input: "1 2\n1 2 3", expectedOutput: "2", isHidden: false },
        { input: "10 9 8 7\n5 6 7 8", expectedOutput: "2", isHidden: true },
        { input: "5\n4", expectedOutput: "0", isHidden: true },
        { input: "2 2 2\n2 2 2 2", expectedOutput: "3", isHidden: true },
        { input: "3 1 2 1\n1 5 1 2", expectedOutput: "4", isHidden: true },
        { input: "2147483647 1\n1 2147483647", expectedOutput: "2", isHidden: true },
      ],
      hints: [
        "Give each child the smallest cookie that satisfies them - larger cookies are more useful for greedier children.",
        "Sort both the greed factors and the cookie sizes.",
        "Walk through the cookies from smallest to largest with a pointer on the least greedy child still waiting: whenever the cookie is big enough for that child, feed them and move the pointer.",
      ],
      editorial:
        "Sort g and s. Scan the cookies in increasing size while a pointer i marks the least greedy unsatisfied child; if s[j] >= g[i], child i gets cookie j and i advances, otherwise cookie j is too small for everyone left and is skipped. An exchange argument shows some optimal assignment feeds the least greedy children with the smallest sufficient cookies, so the greedy count is optimal. Time O(n log n + m log m) for sorting, O(1) extra space.",
      solutions: {
        javascript: code`
          function solve(input) {
            const lines = input.trim().split("\n");
            const greed = lines[0].trim().split(/\s+/).map(Number).sort((a, b) => a - b);
            const sizes = lines[1].trim().split(/\s+/).map(Number).sort((a, b) => a - b);
            let child = 0;
            for (const size of sizes) {
              if (child < greed.length && size >= greed[child]) child++;
            }
            return String(child);
          }
        `,
        python: code`
          def solve(input_str):
              lines = input_str.strip().split("\n")
              greed = sorted(map(int, lines[0].split()))
              sizes = sorted(map(int, lines[1].split()))
              child = 0
              for size in sizes:
                  if child < len(greed) and size >= greed[child]:
                      child += 1
              return str(child)
        `,
      },
    },
    {
      title: "Jump Game II",
      difficulty: "Medium",
      description:
        "You are given an array `nums` of non-negative integers. You start at index `0`; from index `i` you may jump forward to any index `i + j` with `1 <= j <= nums[i]`.\n\nPrint the minimum number of jumps needed to reach the last index. The input guarantees that the last index is reachable.",
      constraints: "1 <= nums.length <= 10^4\n0 <= nums[i] <= 1000\nThe last index is reachable from index 0.",
      inputFormat: "One line of space-separated integers `nums`.",
      outputFormat: "The minimum number of jumps.",
      examples: [
        {
          input: "2 3 1 1 4",
          output: "2",
          explanation: "Jump 1 step from index 0 to index 1, then 3 steps to the last index.",
        },
      ],
      testCases: [
        { input: "2 3 1 1 4", expectedOutput: "2", isHidden: false },
        { input: "2 3 0 1 4", expectedOutput: "2", isHidden: false },
        { input: "0", expectedOutput: "0", isHidden: true },
        { input: "1 1 1 1", expectedOutput: "3", isHidden: true },
        { input: "5 0 0 0 0 1", expectedOutput: "1", isHidden: true },
        { input: "1 2 1 1 1", expectedOutput: "3", isHidden: true },
        { input: JUMP_GAME_PERF_INPUT, expectedOutput: "625", isHidden: true },
      ],
      hints: [
        "Think in layers, like breadth-first search: with 0 jumps you can stand only on index 0; with 1 jump, on any index up to `nums[0]`; and so on.",
        "While scanning the indices of the current layer, keep `farthest = max(i + nums[i])`: the end of the next layer.",
        "When `i` reaches the end of the current layer you must jump: increment the count and move the layer end to `farthest`. Stop once it covers the last index.",
      ],
      editorial:
        "Greedy BFS in O(1) space: `end` is the farthest index reachable with `jumps` jumps and `farthest` the farthest reachable with one more. For i from 0 to n - 2: farthest = max(farthest, i + nums[i]); if i == end, then jumps++ and end = farthest. Every index is examined once: O(n) time, O(1) space. An O(n * max(nums)) DP also passes, but plain recursion over every jump choice is exponential and times out on the large hidden test.",
      solutions: {
        javascript: code`
          function solve(input) {
            const nums = input.trim().split(/\s+/).map(Number);
            let jumps = 0;
            let end = 0;
            let farthest = 0;
            for (let i = 0; i < nums.length - 1; i++) {
              farthest = Math.max(farthest, i + nums[i]);
              if (i === end) {
                jumps++;
                end = farthest;
                if (end >= nums.length - 1) break;
              }
            }
            return String(jumps);
          }
        `,
        python: code`
          def solve(input_str):
              nums = list(map(int, input_str.split()))
              jumps = end = farthest = 0
              for i in range(len(nums) - 1):
                  farthest = max(farthest, i + nums[i])
                  if i == end:
                      jumps += 1
                      end = farthest
                      if end >= len(nums) - 1:
                          break
              return str(jumps)
        `,
      },
    },
    {
      title: "Candy",
      difficulty: "Hard",
      description:
        "`n` children stand in a line and child `i` has a rating `ratings[i]`. You are giving candies to these children subject to two rules:\n\n- Every child gets at least one candy.\n- A child with a higher rating than an adjacent neighbour gets more candies than that neighbour.\n\nPrint the minimum total number of candies you need.",
      constraints: "1 <= n <= 2 * 10^4\n0 <= ratings[i] <= 2 * 10^4",
      inputFormat: "One line of space-separated integers `ratings`.",
      outputFormat: "The minimum number of candies.",
      examples: [
        {
          input: "1 0 2",
          output: "5",
          explanation: "Give 2, 1 and 2 candies: both outer children out-rank the middle one.",
        },
      ],
      testCases: [
        { input: "1 0 2", expectedOutput: "5", isHidden: false },
        { input: "1 2 2", expectedOutput: "4", isHidden: false },
        { input: "5", expectedOutput: "1", isHidden: true },
        { input: "1 3 4 5 2", expectedOutput: "11", isHidden: true },
        { input: "1 2 87 87 87 2 1", expectedOutput: "13", isHidden: true },
        { input: "3 3 3 3", expectedOutput: "4", isHidden: true },
        { input: "5 4 3 2 1", expectedOutput: "15", isHidden: true },
        { input: CANDY_PERF_INPUT, expectedOutput: "4000000", isHidden: true },
      ],
      hints: [
        "Split the rule into two independent constraints: one about the left neighbour and one about the right neighbour. Equal ratings impose no constraint.",
        "Scan left to right: `left[i] = left[i - 1] + 1` if `ratings[i] > ratings[i - 1]`, else `1`. Scan right to left to build `right[i]` the same way.",
        "Child `i` needs `max(left[i], right[i])` candies - the least amount that satisfies both sides. Sum these values.",
      ],
      editorial:
        "Two passes. The forward pass gives each child the minimum candies that respect the left neighbour (the length of the strictly increasing run ending there); the backward pass does the same for the right neighbour, and each child takes the maximum of both. Every value is forced by a strictly monotone run ending at that child, so the total is minimal, and both rules hold. Time O(n), space O(n) (an O(1)-space variant counts the lengths of up and down slopes). Repeatedly fixing violations until nothing changes also reaches the answer, but needs a pass per step of the longest slope: O(n^2) in the worst case.",
      solutions: {
        javascript: code`
          function solve(input) {
            const ratings = input.trim().split(/\s+/).map(Number);
            const n = ratings.length;
            const candies = new Array(n).fill(1);
            for (let i = 1; i < n; i++) {
              if (ratings[i] > ratings[i - 1]) candies[i] = candies[i - 1] + 1;
            }
            for (let i = n - 2; i >= 0; i--) {
              if (ratings[i] > ratings[i + 1]) candies[i] = Math.max(candies[i], candies[i + 1] + 1);
            }
            return String(candies.reduce((sum, c) => sum + c, 0));
          }
        `,
        python: code`
          def solve(input_str):
              ratings = list(map(int, input_str.split()))
              n = len(ratings)
              candies = [1] * n
              for i in range(1, n):
                  if ratings[i] > ratings[i - 1]:
                      candies[i] = candies[i - 1] + 1
              for i in range(n - 2, -1, -1):
                  if ratings[i] > ratings[i + 1]:
                      candies[i] = max(candies[i], candies[i + 1] + 1)
              return str(sum(candies))
        `,
      },
    },
  ],
  dp: [
    {
      title: "Climbing Stairs",
      difficulty: "Easy",
      description:
        "You are climbing a staircase with `n` steps. Each move you climb either `1` or `2` steps.\n\nPrint the number of distinct ways to reach the top.",
      constraints: "1 <= n <= 45",
      inputFormat: "A single integer `n`.",
      outputFormat: "The number of distinct ways to climb to the top.",
      examples: [
        {
          input: "3",
          output: "3",
          explanation: "The three ways are 1 + 1 + 1, 1 + 2 and 2 + 1.",
        },
      ],
      testCases: [
        { input: "3", expectedOutput: "3", isHidden: false },
        { input: "2", expectedOutput: "2", isHidden: false },
        { input: "1", expectedOutput: "1", isHidden: true },
        { input: "5", expectedOutput: "8", isHidden: true },
        { input: "10", expectedOutput: "89", isHidden: true },
        { input: "45", expectedOutput: "1836311903", isHidden: true },
      ],
      hints: [
        "To stand on step `n`, your last move started from step `n - 1` or from step `n - 2`.",
        "So `ways(n) = ways(n - 1) + ways(n - 2)` with `ways(1) = 1` and `ways(2) = 2` - but plain recursion recomputes the same values exponentially many times.",
        "Compute the values bottom-up from the base cases, keeping only the last two.",
      ],
      editorial:
        "ways(n) = ways(n - 1) + ways(n - 2), the Fibonacci recurrence. Iterating upward from the base cases while keeping two variables takes O(n) time and O(1) space (memoised recursion is O(n) too). Naive recursion makes about 1.6^n calls - billions for n = 45.",
      solutions: {
        javascript: code`
          function solve(input) {
            const n = Number(input.trim());
            let prev = 1; // ways to stand on step 0
            let curr = 1; // ways to stand on step 1
            for (let i = 2; i <= n; i++) {
              const next = prev + curr;
              prev = curr;
              curr = next;
            }
            return String(curr);
          }
        `,
        python: code`
          def solve(input_str):
              n = int(input_str.strip())
              prev, curr = 1, 1  # ways to stand on steps 0 and 1
              for _ in range(2, n + 1):
                  prev, curr = curr, prev + curr
              return str(curr)
        `,
      },
    },
    {
      title: "Coin Change",
      difficulty: "Medium",
      description:
        "You are given coin denominations `coins` and an `amount`. You have an unlimited number of coins of each denomination.\n\nPrint the fewest number of coins that add up exactly to `amount`, or `-1` if the amount cannot be made up by any combination of the coins.",
      constraints: "1 <= coins.length <= 12\n1 <= coins[i] <= 2^31 - 1\n0 <= amount <= 10^4",
      inputFormat: "Line 1: space-separated integers `coins`.\nLine 2: the integer `amount`.",
      outputFormat: "The minimum number of coins, or `-1`.",
      examples: [{ input: "1 2 5\n11", output: "3", explanation: "11 = 5 + 5 + 1." }],
      testCases: [
        { input: "1 2 5\n11", expectedOutput: "3", isHidden: false },
        { input: "2\n3", expectedOutput: "-1", isHidden: false },
        { input: "1\n0", expectedOutput: "0", isHidden: true },
        { input: "1 3 4\n6", expectedOutput: "2", isHidden: true },
        { input: "2 5 10 1\n27", expectedOutput: "4", isHidden: true },
        { input: "3 7\n5", expectedOutput: "-1", isHidden: true },
        { input: "7 2147483647\n14", expectedOutput: "2", isHidden: true },
        { input: "186 419 83 408\n6249", expectedOutput: "20", isHidden: true },
        {
          input: "411 412 413 414 415 416 417 418 419 420 421 422\n9864",
          expectedOutput: "24",
          isHidden: true,
        },
      ],
      hints: [
        "Always taking the largest coin fails: with coins `1 3 4` and amount 6 it uses 4 + 1 + 1 instead of 3 + 3.",
        "Let `dp[x]` be the fewest coins that make `x`. The last coin used is some `c`, so `dp[x] = 1 + min(dp[x - c])` over the coins `c <= x`.",
        "Fill `dp[0..amount]` bottom-up with `dp[0] = 0` and infinity for amounts that cannot be made; the answer is `dp[amount]`, or `-1` if it stayed infinite.",
      ],
      editorial:
        "Unbounded-knapsack DP over amounts: dp[0] = 0 and dp[x] = min over coins c <= x of dp[x - c] + 1 (infinity when no coin fits). Trying every coin recursively is exponential in the amount; the table solves each of the amount + 1 subproblems once. Time O(amount * coins.length), space O(amount).",
      solutions: {
        javascript: code`
          function solve(input) {
            const lines = input.trim().split("\n");
            const coins = lines[0].trim().split(/\s+/).map(Number);
            const amount = Number(lines[1]);
            const dp = new Array(amount + 1).fill(Infinity);
            dp[0] = 0;
            for (let x = 1; x <= amount; x++) {
              for (const coin of coins) {
                if (coin <= x && dp[x - coin] + 1 < dp[x]) dp[x] = dp[x - coin] + 1;
              }
            }
            return String(dp[amount] === Infinity ? -1 : dp[amount]);
          }
        `,
        python: code`
          def solve(input_str):
              lines = input_str.strip().split("\n")
              coins = list(map(int, lines[0].split()))
              amount = int(lines[1])
              INF = float("inf")
              dp = [0] + [INF] * amount
              for x in range(1, amount + 1):
                  for coin in coins:
                      if coin <= x and dp[x - coin] + 1 < dp[x]:
                          dp[x] = dp[x - coin] + 1
              return str(dp[amount]) if dp[amount] != INF else "-1"
        `,
      },
    },
    {
      title: "Edit Distance",
      difficulty: "Hard",
      description:
        "Given two strings `word1` and `word2`, print the minimum number of operations required to convert `word1` into `word2`.\n\nYou may perform three operations on `word1`: insert a character, delete a character, or replace a character.",
      constraints: "1 <= word1.length, word2.length <= 500\n`word1` and `word2` consist of lowercase English letters.",
      inputFormat: "Line 1: the string `word1`.\nLine 2: the string `word2`.",
      outputFormat: "The minimum number of operations.",
      examples: [
        {
          input: "horse\nros",
          output: "3",
          explanation: "horse -> rorse (replace `h` with `r`) -> rose (delete `r`) -> ros (delete `e`).",
        },
      ],
      testCases: [
        { input: "horse\nros", expectedOutput: "3", isHidden: false },
        { input: "intention\nexecution", expectedOutput: "5", isHidden: false },
        { input: "a\na", expectedOutput: "0", isHidden: true },
        { input: "a\nb", expectedOutput: "1", isHidden: true },
        { input: "kitten\nsitting", expectedOutput: "3", isHidden: true },
        { input: "abc\nyabd", expectedOutput: "2", isHidden: true },
        { input: "zzzz\nzz", expectedOutput: "2", isHidden: true },
        { input: EDIT_DISTANCE_PERF_INPUT, expectedOutput: "255", isHidden: true },
      ],
      hints: [
        "Compare the last characters of the two prefixes. If they are equal, the answer is the same as without them.",
        "Otherwise the last operation was a replace (`dp[i-1][j-1] + 1`), a delete from `word1` (`dp[i-1][j] + 1`) or an insert into `word1` (`dp[i][j-1] + 1`).",
        "Let `dp[i][j]` be the distance between the first `i` characters of `word1` and the first `j` characters of `word2`, with `dp[i][0] = i` and `dp[0][j] = j`. Fill the table row by row - one previous row of memory is enough.",
      ],
      editorial:
        "Classic Levenshtein DP: dp[i][j] = dp[i-1][j-1] if word1[i-1] == word2[j-1], otherwise 1 + min(dp[i-1][j-1], dp[i-1][j], dp[i][j-1]) for replace, delete and insert. The recursion alone branches three ways and is exponential; the table has (m + 1)(n + 1) cells computed in O(1) each. Time O(m * n), space O(n) with a rolling row.",
      solutions: {
        javascript: code`
          function solve(input) {
            const lines = input.trim().split("\n");
            const a = lines[0].trim();
            const b = lines[1].trim();
            let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
            for (let i = 1; i <= a.length; i++) {
              const curr = [i];
              for (let j = 1; j <= b.length; j++) {
                if (a[i - 1] === b[j - 1]) curr[j] = prev[j - 1];
                else curr[j] = 1 + Math.min(prev[j - 1], prev[j], curr[j - 1]);
              }
              prev = curr;
            }
            return String(prev[b.length]);
          }
        `,
        python: code`
          def solve(input_str):
              lines = input_str.strip().split("\n")
              a, b = lines[0].strip(), lines[1].strip()
              prev = list(range(len(b) + 1))
              for i in range(1, len(a) + 1):
                  curr = [i] + [0] * len(b)
                  for j in range(1, len(b) + 1):
                      if a[i - 1] == b[j - 1]:
                          curr[j] = prev[j - 1]
                      else:
                          curr[j] = 1 + min(prev[j - 1], prev[j], curr[j - 1])
                  prev = curr
              return str(prev[len(b)])
        `,
      },
    },
  ],
};
