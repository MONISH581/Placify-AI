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

function randomInts(seed: number, length: number, bound: number): number[] {
  const next = seededRandom(seed);
  return Array.from({ length }, () => next(bound));
}

/** `count` distinct integers in [lo, lo + span), in generation order. */
function distinctInts(seed: number, count: number, lo: number, span: number): number[] {
  const next = seededRandom(seed);
  const seen = new Set<number>();
  while (seen.size < count) seen.add(lo + next(span));
  return [...seen];
}

function shuffled<T>(seed: number, values: T[]): T[] {
  const next = seededRandom(seed);
  const out = [...values];
  for (let i = out.length - 1; i > 0; i--) {
    const j = next(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// 3000 distinct values, each tripled, plus one single value (all within signed 32-bit range).
const SINGLE_II_PERF = (() => {
  const values = distinctInts(11, 3001, -2147483648, 4294967296);
  const single = values[0];
  const rest = values.slice(1);
  return shuffled(12, [...rest, ...rest, ...rest, single]).join(" ");
})();

// 2500 distinct values, each doubled, plus two singles.
const SINGLE_III_PERF = (() => {
  const values = distinctInts(21, 2502, -2147483648, 4294967296);
  const rest = values.slice(2);
  return shuffled(22, [...rest, ...rest, values[0], values[1]]).join(" ");
})();

// 250 random single-bit operations on a random 32-bit value.
const BIT_OPS_PERF = (() => {
  const next = seededRandom(31);
  const ops = ["SET", "CLEAR", "TOGGLE", "CHECK"];
  const lines = [String(next(4294967296)), "250"];
  for (let i = 0; i < 250; i++) lines.push(`${ops[next(4)]} ${next(32)}`);
  return lines.join("\n");
})();

export const REAL_BITMANIPULATION: ProblemSpec[] = [
  {
    title: "Power of Two",
    difficulty: "Easy",
    companies: ["Google", "Microsoft", "Amazon", "Infosys"],
    description:
      "Given a 32-bit signed integer `n`, decide whether it is an exact power of two, i.e. whether `n = 2^k` for some integer `k >= 0`.\n\nPrint `true` or `false`. A loop-free O(1) bit trick is expected.",
    constraints: "-2^31 <= n <= 2^31 - 1",
    inputFormat: "A single integer `n`.",
    outputFormat: "`true` if `n` is a power of two, otherwise `false`.",
    examples: [
      { input: "16", output: "true", explanation: "16 = 2^4." },
      { input: "218", output: "false", explanation: "218 is not a power of two." },
    ],
    testCases: [
      { input: "16", expectedOutput: "true", isHidden: false },
      { input: "218", expectedOutput: "false", isHidden: false },
      { input: "1", expectedOutput: "true", isHidden: true },
      { input: "0", expectedOutput: "false", isHidden: true },
      { input: "-8", expectedOutput: "false", isHidden: true },
      { input: "1073741824", expectedOutput: "true", isHidden: true },
      { input: "2147483647", expectedOutput: "false", isHidden: true },
      { input: "-2147483648", expectedOutput: "false", isHidden: true },
    ],
    hints: [
      "Powers of two are positive and have exactly one set bit in binary.",
      "Subtracting 1 from a power of two flips that single set bit to 0 and every lower bit to 1.",
      "So for n > 0, `n & (n - 1)` is 0 exactly when n is a power of two. Do not forget to reject n <= 0.",
    ],
    editorial:
      "A positive power of two has a single set bit, e.g. 1000. Then n - 1 is 0111, so `n & (n - 1) == 0`. Any other positive number has at least two set bits, and `n & (n - 1)` only clears the lowest one, leaving a non-zero value. Zero and negative numbers must be rejected explicitly (two's complement negatives such as -2^31 would otherwise pass). Time O(1), space O(1).",
    solutions: {
      javascript: code`
        function solve(input) {
          const n = Number(input.trim());
          return String(n > 0 && (n & (n - 1)) === 0);
        }
      `,
      python: code`
        def solve(input_str):
            n = int(input_str.split()[0])
            return "true" if n > 0 and n & (n - 1) == 0 else "false"
      `,
    },
  },
  {
    title: "Power of Four",
    difficulty: "Easy",
    companies: ["Amazon", "Microsoft", "Google"],
    description:
      "Given a 32-bit signed integer `n`, decide whether it is a power of four, i.e. `n = 4^k` for some integer `k >= 0`.\n\nPrint `true` or `false`. Do it without loops or recursion.",
    constraints: "-2^31 <= n <= 2^31 - 1",
    inputFormat: "A single integer `n`.",
    outputFormat: "`true` if `n` is a power of four, otherwise `false`.",
    examples: [
      { input: "16", output: "true", explanation: "16 = 4^2." },
      { input: "8", output: "false", explanation: "8 = 2^3 is a power of two but not of four." },
    ],
    testCases: [
      { input: "16", expectedOutput: "true", isHidden: false },
      { input: "8", expectedOutput: "false", isHidden: false },
      { input: "1", expectedOutput: "true", isHidden: true },
      { input: "0", expectedOutput: "false", isHidden: true },
      { input: "-4", expectedOutput: "false", isHidden: true },
      { input: "1073741824", expectedOutput: "true", isHidden: true },
      { input: "536870912", expectedOutput: "false", isHidden: true },
      { input: "2147483647", expectedOutput: "false", isHidden: true },
      { input: "5", expectedOutput: "false", isHidden: true },
    ],
    hints: [
      "First make sure n is a power of two (exactly one set bit).",
      "A power of four has its single set bit at an even position (bit 0, 2, 4, ...).",
      "Test the position with a mask of all even positions, 0x55555555 (binary 0101...0101).",
    ],
    editorial:
      "n is a power of four iff n > 0, n has exactly one set bit (`n & (n - 1) == 0`), and that bit sits at an even index, i.e. `n & 0x55555555 != 0`. All three checks are O(1).",
    solutions: {
      javascript: code`
        function solve(input) {
          const n = Number(input.trim());
          return String(n > 0 && (n & (n - 1)) === 0 && (n & 0x55555555) !== 0);
        }
      `,
      python: code`
        def solve(input_str):
            n = int(input_str.split()[0])
            return "true" if n > 0 and n & (n - 1) == 0 and n & 0x55555555 != 0 else "false"
      `,
    },
  },
  {
    title: "Reverse Bits",
    difficulty: "Easy",
    companies: ["Apple", "Amazon", "Microsoft", "Adobe"],
    description:
      "Treat the non-negative integer `n` as an unsigned 32-bit number (padded with leading zeros to exactly 32 bits). Reverse the order of its 32 bits and print the resulting number as an unsigned decimal integer.\n\nFor example, `00000010100101000001111010011100` reversed is `00111001011110000010100101000000`.",
    constraints: "0 <= n <= 2^32 - 1 (fits an unsigned 32-bit integer)",
    inputFormat: "A single integer `n`.",
    outputFormat: "The unsigned decimal value of the bit-reversed number.",
    examples: [
      { input: "43261596", output: "964176192", explanation: "43261596 is 00000010100101000001111010011100 in 32 bits; reversed it is 00111001011110000010100101000000 = 964176192." },
      { input: "4294967293", output: "3221225471", explanation: "11111111111111111111111111111101 reversed is 10111111111111111111111111111111." },
    ],
    testCases: [
      { input: "43261596", expectedOutput: "964176192", isHidden: false },
      { input: "4294967293", expectedOutput: "3221225471", isHidden: false },
      { input: "0", expectedOutput: "0", isHidden: true },
      { input: "1", expectedOutput: "2147483648", isHidden: true },
      { input: "4294967295", expectedOutput: "4294967295", isHidden: true },
      { input: "2147483648", expectedOutput: "1", isHidden: true },
      { input: "2863311530", expectedOutput: "1431655765", isHidden: true },
      { input: "305419896", expectedOutput: "510274632", isHidden: true },
    ],
    hints: [
      "Process the 32 bit positions one by one: take the lowest bit of n and append it to a result.",
      "Shift the result left by one, OR in `n & 1`, then shift n right by one; repeat exactly 32 times.",
      "In JavaScript, bitwise operators return signed 32-bit values, so finish with `>>> 0` to get the unsigned result.",
    ],
    editorial:
      "Repeat 32 times: `result = (result << 1) | (n & 1); n >>>= 1`. After 32 iterations the bits of n have been pushed into result in reverse order. In JavaScript apply `>>> 0` to turn the signed 32-bit result into its unsigned value. Time O(32) = O(1), space O(1).",
    solutions: {
      javascript: code`
        function solve(input) {
          let n = Number(input.trim());
          let result = 0;
          for (let i = 0; i < 32; i++) {
            result = ((result << 1) | (n & 1)) >>> 0;
            n = n >>> 1;
          }
          return String(result >>> 0);
        }
      `,
      python: code`
        def solve(input_str):
            n = int(input_str.split()[0])
            result = 0
            for _ in range(32):
                result = (result << 1) | (n & 1)
                n >>= 1
            return str(result)
      `,
    },
  },
  {
    title: "Hamming Distance",
    difficulty: "Easy",
    companies: ["Meta", "Apple", "Microsoft"],
    description:
      "The Hamming distance between two integers is the number of bit positions at which their binary representations differ.\n\nGiven two non-negative integers `x` and `y` (treated as unsigned 32-bit numbers), print their Hamming distance.",
    constraints: "0 <= x, y <= 2^32 - 1",
    inputFormat: "One line with two space-separated integers `x y`.",
    outputFormat: "A single integer: the Hamming distance.",
    examples: [
      { input: "1 4", output: "2", explanation: "1 = 001 and 4 = 100 differ in two positions." },
      { input: "3 1", output: "1", explanation: "11 and 01 differ only in the second bit." },
    ],
    testCases: [
      { input: "1 4", expectedOutput: "2", isHidden: false },
      { input: "3 1", expectedOutput: "1", isHidden: false },
      { input: "0 0", expectedOutput: "0", isHidden: true },
      { input: "0 4294967295", expectedOutput: "32", isHidden: true },
      { input: "4294967295 4294967295", expectedOutput: "0", isHidden: true },
      { input: "2147483648 1", expectedOutput: "2", isHidden: true },
      { input: "123456789 987654321", expectedOutput: "15", isHidden: true },
    ],
    hints: [
      "Which bit positions differ? XOR gives a 1 exactly at those positions.",
      "So the answer is the number of set bits in `x ^ y`.",
      "Count set bits with Kernighan's trick: `v &= v - 1` removes the lowest set bit, so loop until v is 0. In JavaScript, normalize with `>>> 0`.",
    ],
    editorial:
      "`x ^ y` has a 1 at every position where x and y differ, so the answer is popcount(x ^ y). Count set bits with Kernighan's loop (`v &= v - 1`), which runs once per set bit. Time O(bits), space O(1).",
    solutions: {
      javascript: code`
        function solve(input) {
          const [x, y] = input.trim().split(/\s+/).map(Number);
          let v = (x ^ y) >>> 0;
          let count = 0;
          while (v !== 0) {
            v = (v & (v - 1)) >>> 0;
            count++;
          }
          return String(count);
        }
      `,
      python: code`
        def solve(input_str):
            x, y = map(int, input_str.split())
            v = x ^ y
            count = 0
            while v:
                v &= v - 1
                count += 1
            return str(count)
      `,
    },
  },
  {
    title: "Number Complement",
    difficulty: "Easy",
    companies: ["Amazon", "TCS"],
    description:
      "The complement of a positive integer is obtained by writing it in binary (without leading zeros), flipping every bit (`0` becomes `1` and `1` becomes `0`), and reading the result as a binary number again.\n\nGiven `n`, print its complement. For example `5` is `101`, whose complement `010` is `2`.",
    constraints: "1 <= n <= 2^31 - 1",
    inputFormat: "A single integer `n`.",
    outputFormat: "The complement of `n` as a decimal integer.",
    examples: [
      { input: "5", output: "2", explanation: "101 flipped is 010 = 2." },
      { input: "10", output: "5", explanation: "1010 flipped is 0101 = 5." },
    ],
    testCases: [
      { input: "5", expectedOutput: "2", isHidden: false },
      { input: "10", expectedOutput: "5", isHidden: false },
      { input: "1", expectedOutput: "0", isHidden: true },
      { input: "7", expectedOutput: "0", isHidden: true },
      { input: "8", expectedOutput: "7", isHidden: true },
      { input: "2147483647", expectedOutput: "0", isHidden: true },
      { input: "1073741824", expectedOutput: "1073741823", isHidden: true },
      { input: "2147483646", expectedOutput: "1", isHidden: true },
    ],
    hints: [
      "Flipping all 32 bits would also flip the leading zeros; you only want to flip the bits up to the highest set bit.",
      "Build a mask of all ones with the same bit length as n (e.g. 101 -> 111).",
      "The answer is `n ^ mask`.",
    ],
    editorial:
      "Let `mask` be the all-ones number with the same bit length as n: smear the highest set bit downwards with `mask |= mask >> 1; mask |= mask >> 2; ... >> 16`. XOR-ing n with the mask flips exactly the meaningful bits. Time O(1), space O(1).",
    solutions: {
      javascript: code`
        function solve(input) {
          const n = Number(input.trim());
          let mask = n;
          mask |= mask >> 1;
          mask |= mask >> 2;
          mask |= mask >> 4;
          mask |= mask >> 8;
          mask |= mask >> 16;
          return String(n ^ mask);
        }
      `,
      python: code`
        def solve(input_str):
            n = int(input_str.split()[0])
            mask = (1 << n.bit_length()) - 1
            return str(n ^ mask)
      `,
    },
  },
  {
    title: "Binary Number with Alternating Bits",
    difficulty: "Easy",
    companies: ["Google", "Microsoft", "Accenture"],
    description:
      "Given a positive integer `n`, check whether its binary representation (without leading zeros) has alternating bits, meaning any two adjacent bits always differ.\n\nPrint `true` or `false`.",
    constraints: "1 <= n <= 2^31 - 1",
    inputFormat: "A single integer `n`.",
    outputFormat: "`true` if the bits alternate, otherwise `false`.",
    examples: [
      { input: "5", output: "true", explanation: "5 is 101: the bits alternate." },
      { input: "7", output: "false", explanation: "7 is 111: adjacent bits are equal." },
    ],
    testCases: [
      { input: "5", expectedOutput: "true", isHidden: false },
      { input: "7", expectedOutput: "false", isHidden: false },
      { input: "1", expectedOutput: "true", isHidden: true },
      { input: "2", expectedOutput: "true", isHidden: true },
      { input: "3", expectedOutput: "false", isHidden: true },
      { input: "10", expectedOutput: "true", isHidden: true },
      { input: "11", expectedOutput: "false", isHidden: true },
      { input: "1431655765", expectedOutput: "true", isHidden: true },
      { input: "715827882", expectedOutput: "true", isHidden: true },
      { input: "2147483647", expectedOutput: "false", isHidden: true },
    ],
    hints: [
      "Compare each bit with its neighbour: what does `n ^ (n >> 1)` look like when the bits alternate?",
      "If the bits alternate, `n ^ (n >> 1)` is a run of ones from the lowest bit up to the highest bit, e.g. 101 ^ 010 = 111.",
      "A number x consists only of trailing ones exactly when `x & (x + 1) == 0`.",
    ],
    editorial:
      "Let x = n ^ (n >> 1). Every bit of x (below the top one) is 1 exactly when two adjacent bits of n differ, and the top bit is always 1. So n alternates iff x is all ones, i.e. of the form 2^k - 1, i.e. `x & (x + 1) == 0`. Time O(1), space O(1).",
    solutions: {
      javascript: code`
        function solve(input) {
          const n = Number(input.trim());
          const x = n ^ (n >> 1);
          return String((x & (x + 1)) === 0);
        }
      `,
      python: code`
        def solve(input_str):
            n = int(input_str.split()[0])
            x = n ^ (n >> 1)
            return "true" if x & (x + 1) == 0 else "false"
      `,
    },
  },
  {
    title: "Swap Odd and Even Bits",
    difficulty: "Easy",
    companies: ["Amazon", "Microsoft", "Adobe"],
    description:
      "Given an unsigned 32-bit integer `n`, swap every even-position bit with its neighbouring odd-position bit: bit 0 with bit 1, bit 2 with bit 3, ..., bit 30 with bit 31 (positions are counted from the least significant bit, which is position 0).\n\nPrint the resulting number as an unsigned decimal integer. Use only bitwise operations, in O(1).",
    constraints: "0 <= n <= 2^32 - 1",
    inputFormat: "A single integer `n`.",
    outputFormat: "The unsigned decimal value after swapping.",
    examples: [
      { input: "23", output: "43", explanation: "23 = 10111 = 0...010111; swapping each pair gives 0...101011 = 43." },
      { input: "2", output: "1", explanation: "10 becomes 01." },
    ],
    testCases: [
      { input: "23", expectedOutput: "43", isHidden: false },
      { input: "2", expectedOutput: "1", isHidden: false },
      { input: "0", expectedOutput: "0", isHidden: true },
      { input: "1", expectedOutput: "2", isHidden: true },
      { input: "4294967295", expectedOutput: "4294967295", isHidden: true },
      { input: "2863311530", expectedOutput: "1431655765", isHidden: true },
      { input: "2147483648", expectedOutput: "1073741824", isHidden: true },
      { input: "305419896", expectedOutput: "557361588", isHidden: true },
    ],
    hints: [
      "Handle the even-position bits and the odd-position bits separately, then combine them.",
      "Masks help: 0xAAAAAAAA keeps the odd positions, 0x55555555 keeps the even positions.",
      "Shift the odd bits right by 1, the even bits left by 1, and OR them together. In JavaScript, finish with `>>> 0`.",
    ],
    editorial:
      "`odd = n & 0xAAAAAAAA` holds the bits at odd positions, `even = n & 0x55555555` holds those at even positions. Moving the odd bits one place right and the even bits one place left swaps every pair: `((odd >>> 1) | (even << 1)) >>> 0`. Time O(1), space O(1).",
    solutions: {
      javascript: code`
        function solve(input) {
          const n = Number(input.trim());
          const odd = (n & 0xaaaaaaaa) >>> 1;
          const even = (n & 0x55555555) << 1;
          return String((odd | even) >>> 0);
        }
      `,
      python: code`
        def solve(input_str):
            n = int(input_str.split()[0])
            return str(((n & 0xAAAAAAAA) >> 1) | ((n & 0x55555555) << 1))
      `,
    },
  },
  {
    title: "Set, Clear and Toggle Bits",
    difficulty: "Easy",
    companies: ["TCS", "Wipro", "Infosys"],
    description:
      "You are given an unsigned 32-bit integer `n` and a list of single-bit operations. Bit positions are counted from the least significant bit (position 0) up to position 31. The operations are:\n\n- `SET i`: set bit `i` to 1\n- `CLEAR i`: set bit `i` to 0\n- `TOGGLE i`: flip bit `i`\n- `CHECK i`: report the current value (0 or 1) of bit `i`; this does not change `n`\n\nApply the operations in order. `n` always stays an unsigned 32-bit number.",
    constraints: "0 <= n <= 2^32 - 1\n1 <= q <= 1000\n0 <= i <= 31",
    inputFormat: "Line 1: the integer `n`.\nLine 2: the number of operations `q`.\nNext `q` lines: one operation each, written as `OP i`.",
    outputFormat: "One line per `CHECK` operation (in order) containing 0 or 1, followed by a final line with the unsigned decimal value of `n` after all operations.",
    examples: [
      { input: "10\n4\nSET 0\nCHECK 0\nTOGGLE 1\nCLEAR 3", output: "1\n1", explanation: "1010 -> SET 0 -> 1011 (CHECK 0 prints 1) -> TOGGLE 1 -> 1001 -> CLEAR 3 -> 0001 = 1." },
      { input: "0\n3\nSET 31\nCHECK 31\nCHECK 30", output: "1\n0\n2147483648", explanation: "Setting bit 31 gives 2147483648; bit 31 is 1 and bit 30 is 0." },
    ],
    testCases: [
      { input: "10\n4\nSET 0\nCHECK 0\nTOGGLE 1\nCLEAR 3", expectedOutput: "1\n1", isHidden: false },
      { input: "0\n3\nSET 31\nCHECK 31\nCHECK 30", expectedOutput: "1\n0\n2147483648", isHidden: false },
      { input: "5\n2\nTOGGLE 0\nTOGGLE 0", expectedOutput: "5", isHidden: true },
      { input: "4294967295\n3\nCLEAR 31\nCHECK 31\nCHECK 0", expectedOutput: "0\n1\n2147483647", isHidden: true },
      { input: "0\n2\nCLEAR 7\nCHECK 7", expectedOutput: "0\n0", isHidden: true },
      { input: "4294967295\n1\nTOGGLE 31", expectedOutput: "2147483647", isHidden: true },
      { input: "2147483648\n4\nCHECK 31\nSET 31\nCHECK 31\nTOGGLE 31", expectedOutput: "1\n1\n0", isHidden: true },
      { input: BIT_OPS_PERF, expectedOutput: "0\n0\n1\n0\n0\n1\n0\n1\n1\n0\n0\n1\n1\n0\n0\n0\n1\n0\n1\n1\n0\n0\n0\n0\n1\n0\n0\n0\n1\n1\n0\n1\n1\n1\n1\n1\n1\n0\n0\n0\n0\n1\n1\n1\n1\n1\n0\n1\n1\n1\n0\n1\n1\n0\n1\n0\n1\n1\n1\n2150522552", isHidden: true },
    ],
    hints: [
      "Each operation touches one bit, so build a mask with a single 1 at position `i`: `1 << i`.",
      "SET is OR with the mask, CLEAR is AND with the inverted mask, TOGGLE is XOR with the mask, and CHECK is `(n >> i) & 1`.",
      "In JavaScript, `1 << 31` is negative and results are signed; normalize with `>>> 0`. In Python, mask the result with 0xFFFFFFFF after inverting.",
    ],
    editorial:
      "With `mask = 1 << i`: SET is `n | mask`, CLEAR is `n & ~mask`, TOGGLE is `n ^ mask`, CHECK is `(n >>> i) & 1`. Keep n as an unsigned 32-bit value (`>>> 0` in JavaScript, `& 0xFFFFFFFF` in Python). Each operation is O(1), so the total is O(q).",
    solutions: {
      javascript: code`
        function solve(input) {
          const lines = input.trim().split("\n");
          let n = Number(lines[0].trim()) >>> 0;
          const q = Number(lines[1].trim());
          const out = [];
          for (let k = 0; k < q; k++) {
            const [op, idx] = lines[2 + k].trim().split(/\s+/);
            const mask = (1 << Number(idx)) >>> 0;
            if (op === "SET") n = (n | mask) >>> 0;
            else if (op === "CLEAR") n = (n & ~mask) >>> 0;
            else if (op === "TOGGLE") n = (n ^ mask) >>> 0;
            else out.push((n & mask) !== 0 ? "1" : "0");
          }
          out.push(String(n));
          return out.join("\n");
        }
      `,
      python: code`
        def solve(input_str):
            lines = input_str.strip().split("\n")
            n = int(lines[0])
            q = int(lines[1])
            out = []
            for k in range(q):
                op, idx = lines[2 + k].split()
                mask = 1 << int(idx)
                if op == "SET":
                    n |= mask
                elif op == "CLEAR":
                    n &= ~mask & 0xFFFFFFFF
                elif op == "TOGGLE":
                    n ^= mask
                else:
                    out.append("1" if n & mask else "0")
            out.append(str(n))
            return "\n".join(out)
      `,
    },
  },
  {
    title: "Single Number II",
    difficulty: "Medium",
    companies: ["Google", "Amazon", "Microsoft"],
    description:
      "In an integer array `nums` every value appears exactly three times except for one value that appears exactly once. Print the value that appears once.\n\nSolve it in linear time with constant extra space (no hash map).",
    constraints: "1 <= nums.length <= 10^4 (the length is of the form 3k + 1)\n-2^31 <= nums[i] <= 2^31 - 1",
    inputFormat: "One line of space-separated integers `nums`.",
    outputFormat: "The element that appears exactly once.",
    examples: [
      { input: "2 2 3 2", output: "3", explanation: "2 appears three times, 3 appears once." },
      { input: "0 1 0 1 0 1 99", output: "99", explanation: "0 and 1 appear three times each; 99 appears once." },
    ],
    testCases: [
      { input: "2 2 3 2", expectedOutput: "3", isHidden: false },
      { input: "0 1 0 1 0 1 99", expectedOutput: "99", isHidden: false },
      { input: "7", expectedOutput: "7", isHidden: true },
      { input: "-2 -2 1 1 -3 1 -3 -3 -4 -2", expectedOutput: "-4", isHidden: true },
      { input: "-2147483648 5 5 5", expectedOutput: "-2147483648", isHidden: true },
      { input: "2147483647 -1 -1 -1 2147483647 2147483647 -2147483648", expectedOutput: "-2147483648", isHidden: true },
      { input: "9 9 9 -9", expectedOutput: "-9", isHidden: true },
      { input: SINGLE_II_PERF, expectedOutput: "49765995", isHidden: true },
    ],
    hints: [
      "Count, for each of the 32 bit positions, how many numbers have that bit set.",
      "Every value that appears three times contributes a multiple of 3 to each count, so `count % 3` is the corresponding bit of the single number.",
      "Alternatively keep two bit-registers `ones` and `twos` that act as a base-3 counter per bit: `ones = (ones ^ x) & ~twos; twos = (twos ^ x) & ~ones`. Beware of the sign bit in Python.",
    ],
    editorial:
      "Per bit position, the total number of set bits over the array is 3a + b where b is the bit of the answer. So the answer's bit is `count % 3`. Doing this for 32 positions is O(32 n) time and O(1) space. The `ones`/`twos` trick performs the same mod-3 counting for all bits in parallel: ones holds bits seen once (mod 3), twos holds bits seen twice. In Python reconstruct a negative result by subtracting 2^32 when bit 31 is set.",
    solutions: {
      javascript: code`
        function solve(input) {
          const nums = input.trim().split(/\s+/).map(Number);
          let ones = 0;
          let twos = 0;
          for (const x of nums) {
            ones = (ones ^ x) & ~twos;
            twos = (twos ^ x) & ~ones;
          }
          return String(ones);
        }
      `,
      python: code`
        def solve(input_str):
            nums = list(map(int, input_str.split()))
            result = 0
            for bit in range(32):
                total = 0
                for x in nums:
                    total += (x >> bit) & 1
                if total % 3:
                    result |= 1 << bit
            if result >= 1 << 31:
                result -= 1 << 32
            return str(result)
      `,
    },
  },
  {
    title: "Single Number III",
    difficulty: "Medium",
    companies: ["Amazon", "Meta", "Microsoft"],
    description:
      "In an integer array `nums`, exactly two values appear once and every other value appears exactly twice. Find the two values that appear once.\n\nPrint them in ascending order, separated by a space. Aim for linear time and constant extra space.",
    constraints: "2 <= nums.length <= 3 * 10^4\n-2^31 <= nums[i] <= 2^31 - 1\nExactly two distinct values appear once; all others appear twice.",
    inputFormat: "One line of space-separated integers `nums`.",
    outputFormat: "The two single values in ascending order, separated by one space.",
    examples: [
      { input: "1 2 1 3 2 5", output: "3 5", explanation: "3 and 5 each appear once." },
      { input: "0 1", output: "0 1", explanation: "Both values appear once." },
    ],
    testCases: [
      { input: "1 2 1 3 2 5", expectedOutput: "3 5", isHidden: false },
      { input: "0 1", expectedOutput: "0 1", isHidden: false },
      { input: "-1 0", expectedOutput: "-1 0", isHidden: true },
      { input: "-2147483648 2147483647", expectedOutput: "-2147483648 2147483647", isHidden: true },
      { input: "4 4 -5 9 -5 2", expectedOutput: "2 9", isHidden: true },
      { input: "1 1 2 2 3 4 3 5", expectedOutput: "4 5", isHidden: true },
      { input: "-3 7 -3 7 -8 -9", expectedOutput: "-9 -8", isHidden: true },
      { input: SINGLE_III_PERF, expectedOutput: "-290806989 -227508457", isHidden: true },
    ],
    hints: [
      "XOR of the entire array cancels all the pairs and leaves `a ^ b`, where a and b are the two answers.",
      "a ^ b is non-zero, so some bit is set in it; at that bit a and b differ.",
      "Isolate one such bit with `d = x & -x`, split the numbers into two groups by whether they have that bit, and XOR each group separately. Each group has exactly one single number.",
    ],
    editorial:
      "Let x = XOR of all numbers = a ^ b (non-zero). Pick any set bit of x, e.g. the lowest one `d = x & -x`. a and b differ at that bit, so partitioning the array by `(v & d) != 0` separates a from b, while every pair stays together in the same group. XOR-ing each group yields a and b. Sort the two values for output. Time O(n), space O(1).",
    solutions: {
      javascript: code`
        function solve(input) {
          const nums = input.trim().split(/\s+/).map(Number);
          let x = 0;
          for (const v of nums) x ^= v;
          const d = x & -x;
          let a = 0;
          let b = 0;
          for (const v of nums) {
            if ((v & d) !== 0) a ^= v;
            else b ^= v;
          }
          return a < b ? a + " " + b : b + " " + a;
        }
      `,
      python: code`
        def solve(input_str):
            nums = list(map(int, input_str.split()))
            x = 0
            for v in nums:
                x ^= v
            d = x & -x
            a = b = 0
            for v in nums:
                if v & d:
                    a ^= v
                else:
                    b ^= v
            return "%d %d" % (min(a, b), max(a, b))
      `,
    },
  },
  {
    title: "Total Hamming Distance",
    difficulty: "Medium",
    companies: ["Meta", "Amazon", "Flipkart"],
    description:
      "The Hamming distance of two integers is the number of bit positions at which they differ.\n\nGiven an array `nums`, print the sum of the Hamming distances over all pairs `(i, j)` with `i < j`.\n\nA quadratic pair-by-pair approach is too slow for the largest inputs.",
    constraints: "1 <= nums.length <= 10^5\n0 <= nums[i] <= 10^9 (fits in 31 bits)",
    inputFormat: "One line of space-separated integers `nums`.",
    outputFormat: "A single integer: the sum of pairwise Hamming distances.",
    examples: [
      { input: "4 14 2", output: "6", explanation: "HD(4,14)=2, HD(4,2)=2, HD(14,2)=2, total 6." },
      { input: "4 14 4", output: "4", explanation: "HD(4,14)=2, HD(4,4)=0, HD(14,4)=2, total 4." },
    ],
    testCases: [
      { input: "4 14 2", expectedOutput: "6", isHidden: false },
      { input: "4 14 4", expectedOutput: "4", isHidden: false },
      { input: "5", expectedOutput: "0", isHidden: true },
      { input: "0 0 0 0", expectedOutput: "0", isHidden: true },
      { input: "1 2 3", expectedOutput: "4", isHidden: true },
      { input: "1000000000 0 536870912 1073741823", expectedOutput: "102", isHidden: true },
      { input: "7 7 7 7 7 7", expectedOutput: "0", isHidden: true },
      { input: randomInts(41, 2500, 1000000001).join(" "), expectedOutput: "46820094", isHidden: true },
    ],
    hints: [
      "Instead of looking at pairs of numbers, look at one bit position at a time: the total is the sum over positions of the contribution of that position.",
      "At a fixed position, let c numbers have the bit set and n - c have it clear. A pair differs at this position iff one number is from each group.",
      "So position b contributes `c * (n - c)`. Sum over the 31 positions.",
    ],
    editorial:
      "Bits are independent. For bit position b, if c of the n numbers have that bit set, exactly `c * (n - c)` pairs differ there. Summing over the 31 bit positions gives the answer in O(31 n) time and O(1) space. The sum can reach about 7.5 * 10^10, which fits in a JavaScript double and in Python's integers, but not in 32 bits.",
    solutions: {
      javascript: code`
        function solve(input) {
          const nums = input.trim().split(/\s+/).map(Number);
          const n = nums.length;
          let total = 0;
          for (let bit = 0; bit < 31; bit++) {
            let ones = 0;
            for (const x of nums) ones += (x >> bit) & 1;
            total += ones * (n - ones);
          }
          return String(total);
        }
      `,
      python: code`
        def solve(input_str):
            nums = list(map(int, input_str.split()))
            n = len(nums)
            total = 0
            for bit in range(31):
                ones = sum((x >> bit) & 1 for x in nums)
                total += ones * (n - ones)
            return str(total)
      `,
    },
  },
  {
    title: "Gray Code",
    difficulty: "Medium",
    companies: ["Amazon", "Microsoft"],
    description:
      "An `n`-bit Gray code sequence lists all `2^n` numbers from `0` to `2^n - 1` so that consecutive numbers differ in exactly one bit.\n\nThis problem asks for the **reflected binary** Gray code, defined recursively: the sequence for `n = 0` is `[0]`; the sequence for `n` bits is the sequence for `n - 1` bits followed by that same sequence in reverse order with `2^(n-1)` added to every element. For example `n = 2` gives `0 1 3 2`.\n\nPrint the sequence for the given `n`. Try to produce each element directly from its index without building the sequence recursively.",
    constraints: "1 <= n <= 16",
    inputFormat: "A single integer `n`.",
    outputFormat: "The `2^n` elements of the reflected Gray code, space-separated, on one line.",
    examples: [
      { input: "2", output: "0 1 3 2", explanation: "[0,1] then reversed [1,0] plus 2 = [3,2]." },
      { input: "3", output: "0 1 3 2 6 7 5 4", explanation: "0 1 3 2 followed by (2 3 1 0) + 4 = 6 7 5 4." },
    ],
    testCases: [
      { input: "2", expectedOutput: "0 1 3 2", isHidden: false },
      { input: "3", expectedOutput: "0 1 3 2 6 7 5 4", isHidden: false },
      { input: "1", expectedOutput: "0 1", isHidden: true },
      { input: "4", expectedOutput: "0 1 3 2 6 7 5 4 12 13 15 14 10 11 9 8", isHidden: true },
      { input: "5", expectedOutput: "0 1 3 2 6 7 5 4 12 13 15 14 10 11 9 8 24 25 27 26 30 31 29 28 20 21 23 22 18 19 17 16", isHidden: true },
      { input: "8", expectedOutput: "0 1 3 2 6 7 5 4 12 13 15 14 10 11 9 8 24 25 27 26 30 31 29 28 20 21 23 22 18 19 17 16 48 49 51 50 54 55 53 52 60 61 63 62 58 59 57 56 40 41 43 42 46 47 45 44 36 37 39 38 34 35 33 32 96 97 99 98 102 103 101 100 108 109 111 110 106 107 105 104 120 121 123 122 126 127 125 124 116 117 119 118 114 115 113 112 80 81 83 82 86 87 85 84 92 93 95 94 90 91 89 88 72 73 75 74 78 79 77 76 68 69 71 70 66 67 65 64 192 193 195 194 198 199 197 196 204 205 207 206 202 203 201 200 216 217 219 218 222 223 221 220 212 213 215 214 210 211 209 208 240 241 243 242 246 247 245 244 252 253 255 254 250 251 249 248 232 233 235 234 238 239 237 236 228 229 231 230 226 227 225 224 160 161 163 162 166 167 165 164 172 173 175 174 170 171 169 168 184 185 187 186 190 191 189 188 180 181 183 182 178 179 177 176 144 145 147 146 150 151 149 148 156 157 159 158 154 155 153 152 136 137 139 138 142 143 141 140 132 133 135 134 130 131 129 128", isHidden: true },
      { input: "10", expectedOutput: "0 1 3 2 6 7 5 4 12 13 15 14 10 11 9 8 24 25 27 26 30 31 29 28 20 21 23 22 18 19 17 16 48 49 51 50 54 55 53 52 60 61 63 62 58 59 57 56 40 41 43 42 46 47 45 44 36 37 39 38 34 35 33 32 96 97 99 98 102 103 101 100 108 109 111 110 106 107 105 104 120 121 123 122 126 127 125 124 116 117 119 118 114 115 113 112 80 81 83 82 86 87 85 84 92 93 95 94 90 91 89 88 72 73 75 74 78 79 77 76 68 69 71 70 66 67 65 64 192 193 195 194 198 199 197 196 204 205 207 206 202 203 201 200 216 217 219 218 222 223 221 220 212 213 215 214 210 211 209 208 240 241 243 242 246 247 245 244 252 253 255 254 250 251 249 248 232 233 235 234 238 239 237 236 228 229 231 230 226 227 225 224 160 161 163 162 166 167 165 164 172 173 175 174 170 171 169 168 184 185 187 186 190 191 189 188 180 181 183 182 178 179 177 176 144 145 147 146 150 151 149 148 156 157 159 158 154 155 153 152 136 137 139 138 142 143 141 140 132 133 135 134 130 131 129 128 384 385 387 386 390 391 389 388 396 397 399 398 394 395 393 392 408 409 411 410 414 415 413 412 404 405 407 406 402 403 401 400 432 433 435 434 438 439 437 436 444 445 447 446 442 443 441 440 424 425 427 426 430 431 429 428 420 421 423 422 418 419 417 416 480 481 483 482 486 487 485 484 492 493 495 494 490 491 489 488 504 505 507 506 510 511 509 508 500 501 503 502 498 499 497 496 464 465 467 466 470 471 469 468 476 477 479 478 474 475 473 472 456 457 459 458 462 463 461 460 452 453 455 454 450 451 449 448 320 321 323 322 326 327 325 324 332 333 335 334 330 331 329 328 344 345 347 346 350 351 349 348 340 341 343 342 338 339 337 336 368 369 371 370 374 375 373 372 380 381 383 382 378 379 377 376 360 361 363 362 366 367 365 364 356 357 359 358 354 355 353 352 288 289 291 290 294 295 293 292 300 301 303 302 298 299 297 296 312 313 315 314 318 319 317 316 308 309 311 310 306 307 305 304 272 273 275 274 278 279 277 276 284 285 287 286 282 283 281 280 264 265 267 266 270 271 269 268 260 261 263 262 258 259 257 256 768 769 771 770 774 775 773 772 780 781 783 782 778 779 777 776 792 793 795 794 798 799 797 796 788 789 791 790 786 787 785 784 816 817 819 818 822 823 821 820 828 829 831 830 826 827 825 824 808 809 811 810 814 815 813 812 804 805 807 806 802 803 801 800 864 865 867 866 870 871 869 868 876 877 879 878 874 875 873 872 888 889 891 890 894 895 893 892 884 885 887 886 882 883 881 880 848 849 851 850 854 855 853 852 860 861 863 862 858 859 857 856 840 841 843 842 846 847 845 844 836 837 839 838 834 835 833 832 960 961 963 962 966 967 965 964 972 973 975 974 970 971 969 968 984 985 987 986 990 991 989 988 980 981 983 982 978 979 977 976 1008 1009 1011 1010 1014 1015 1013 1012 1020 1021 1023 1022 1018 1019 1017 1016 1000 1001 1003 1002 1006 1007 1005 1004 996 997 999 998 994 995 993 992 928 929 931 930 934 935 933 932 940 941 943 942 938 939 937 936 952 953 955 954 958 959 957 956 948 949 951 950 946 947 945 944 912 913 915 914 918 919 917 916 924 925 927 926 922 923 921 920 904 905 907 906 910 911 909 908 900 901 903 902 898 899 897 896 640 641 643 642 646 647 645 644 652 653 655 654 650 651 649 648 664 665 667 666 670 671 669 668 660 661 663 662 658 659 657 656 688 689 691 690 694 695 693 692 700 701 703 702 698 699 697 696 680 681 683 682 686 687 685 684 676 677 679 678 674 675 673 672 736 737 739 738 742 743 741 740 748 749 751 750 746 747 745 744 760 761 763 762 766 767 765 764 756 757 759 758 754 755 753 752 720 721 723 722 726 727 725 724 732 733 735 734 730 731 729 728 712 713 715 714 718 719 717 716 708 709 711 710 706 707 705 704 576 577 579 578 582 583 581 580 588 589 591 590 586 587 585 584 600 601 603 602 606 607 605 604 596 597 599 598 594 595 593 592 624 625 627 626 630 631 629 628 636 637 639 638 634 635 633 632 616 617 619 618 622 623 621 620 612 613 615 614 610 611 609 608 544 545 547 546 550 551 549 548 556 557 559 558 554 555 553 552 568 569 571 570 574 575 573 572 564 565 567 566 562 563 561 560 528 529 531 530 534 535 533 532 540 541 543 542 538 539 537 536 520 521 523 522 526 527 525 524 516 517 519 518 514 515 513 512", isHidden: true },
    ],
    hints: [
      "Write out the sequences for n = 1, 2, 3 in binary and compare each element with its index i.",
      "Each bit of the i-th Gray element looks like the XOR of the matching bit of i and the next higher bit of i.",
      "The i-th element is `i ^ (i >> 1)`.",
    ],
    editorial:
      "The reflected Gray code has the closed form `g(i) = i ^ (i >> 1)`. It works because adjacent integers i and i + 1 differ by a trailing block `0111..1 -> 1000..0`; after XOR with the right-shift, only one bit of that block changes. Generating all 2^n values takes O(2^n) time.",
    solutions: {
      javascript: code`
        function solve(input) {
          const n = Number(input.trim());
          const out = [];
          for (let i = 0; i < 1 << n; i++) out.push(i ^ (i >> 1));
          return out.join(" ");
        }
      `,
      python: code`
        def solve(input_str):
            n = int(input_str.split()[0])
            return " ".join(str(i ^ (i >> 1)) for i in range(1 << n))
      `,
    },
  },
  {
    title: "Divide Two Integers",
    difficulty: "Medium",
    companies: ["Meta", "Microsoft", "Amazon"],
    description:
      "Given two 32-bit signed integers `dividend` and `divisor`, compute `dividend / divisor` truncated toward zero **without using multiplication, division or the modulo operator** in your solution.\n\nTruncation toward zero means `7 / -3 = -2` and `-7 / 2 = -3`. If the true quotient is outside the signed 32-bit range, clamp it: it can only exceed the maximum when `-2^31 / -1`, in which case print `2147483647`.",
    constraints: "-2^31 <= dividend, divisor <= 2^31 - 1\ndivisor != 0",
    inputFormat: "One line with two integers `dividend divisor`.",
    outputFormat: "The truncated (and clamped) quotient.",
    examples: [
      { input: "10 3", output: "3", explanation: "10 / 3 = 3.33..., truncated to 3." },
      { input: "7 -3", output: "-2", explanation: "7 / -3 = -2.33..., truncated toward zero gives -2." },
    ],
    testCases: [
      { input: "10 3", expectedOutput: "3", isHidden: false },
      { input: "7 -3", expectedOutput: "-2", isHidden: false },
      { input: "0 5", expectedOutput: "0", isHidden: true },
      { input: "1 1", expectedOutput: "1", isHidden: true },
      { input: "-2147483648 -1", expectedOutput: "2147483647", isHidden: true },
      { input: "-2147483648 1", expectedOutput: "-2147483648", isHidden: true },
      { input: "2147483647 -1", expectedOutput: "-2147483647", isHidden: true },
      { input: "-7 2", expectedOutput: "-3", isHidden: true },
      { input: "5 7", expectedOutput: "0", isHidden: true },
      { input: "-2147483648 2", expectedOutput: "-1073741824", isHidden: true },
      { input: "2147483647 3", expectedOutput: "715827882", isHidden: true },
    ],
    hints: [
      "Repeated subtraction is correct but far too slow when the dividend is large and the divisor is small.",
      "Subtract larger and larger multiples of the divisor by doubling it (`divisor << k`) while it still fits in what is left of the dividend.",
      "Work with absolute values (note |-2^31| does not fit in 32 bits, so use 64-bit or arbitrary-precision numbers), track the sign separately, and clamp the single overflow case.",
    ],
    editorial:
      "Let a = |dividend|, b = |divisor|. While a >= b, find the largest k with `b * 2^k <= a` by repeatedly doubling (shifts/additions), subtract it from a and add `2^k` to the quotient. Each outer round at least halves the remaining a, so there are O(log a) rounds of O(log a) doublings. Apply the sign of the quotient at the end and clamp 2^31 to 2^31 - 1. Time O(log^2 n), space O(1).",
    solutions: {
      javascript: code`
        function solve(input) {
          const [dividend, divisor] = input.trim().split(/\s+/).map(Number);
          const negative = (dividend < 0) !== (divisor < 0);
          let a = Math.abs(dividend);
          const b = Math.abs(divisor);
          let quotient = 0;
          while (a >= b) {
            let chunk = b;
            let times = 1;
            while (chunk + chunk <= a) {
              chunk += chunk;
              times += times;
            }
            a -= chunk;
            quotient += times;
          }
          if (negative) return String(quotient === 0 ? 0 : -quotient);
          return String(Math.min(quotient, 2147483647));
        }
      `,
      python: code`
        def solve(input_str):
            dividend, divisor = map(int, input_str.split())
            negative = (dividend < 0) != (divisor < 0)
            a, b = abs(dividend), abs(divisor)
            quotient = 0
            for shift in range(32, -1, -1):
                if (b << shift) <= a:
                    a -= b << shift
                    quotient += 1 << shift
            if negative:
                return str(-quotient)
            return str(min(quotient, 2147483647))
      `,
    },
  },
  {
    title: "Sum of Two Integers",
    difficulty: "Medium",
    companies: ["Meta", "Amazon", "Microsoft"],
    description:
      "Given two integers `a` and `b`, print their sum **without using the `+` or `-` operators** (you may use bitwise operators and comparisons).\n\nThe inputs are signed 32-bit integers chosen so that the true sum also fits in a signed 32-bit integer.",
    constraints: "-10^9 <= a, b <= 10^9",
    inputFormat: "One line with two integers `a b`.",
    outputFormat: "The value `a + b`.",
    examples: [
      { input: "1 2", output: "3", explanation: "1 + 2 = 3." },
      { input: "-2 3", output: "1", explanation: "-2 + 3 = 1." },
    ],
    testCases: [
      { input: "1 2", expectedOutput: "3", isHidden: false },
      { input: "-2 3", expectedOutput: "1", isHidden: false },
      { input: "0 0", expectedOutput: "0", isHidden: true },
      { input: "-5 5", expectedOutput: "0", isHidden: true },
      { input: "7 -7", expectedOutput: "0", isHidden: true },
      { input: "-1000000000 -1000000000", expectedOutput: "-2000000000", isHidden: true },
      { input: "1000000000 1000000000", expectedOutput: "2000000000", isHidden: true },
      { input: "123456789 -987654321", expectedOutput: "-864197532", isHidden: true },
      { input: "-1 1", expectedOutput: "0", isHidden: true },
    ],
    hints: [
      "Think of binary addition by hand: the digit without carries is XOR, and the carries are where both bits are 1 (AND), moved one place to the left.",
      "`a ^ b` is the sum ignoring carries and `(a & b) << 1` is the carry. Add them again, i.e. repeat with those two values.",
      "Stop when the carry becomes 0. In JavaScript the operators already work on 32-bit two's complement; in Python mask to 32 bits and convert back to a signed value at the end.",
    ],
    editorial:
      "Half-adder loop: `sum = a ^ b`, `carry = (a & b) << 1`, then repeat with (sum, carry) until carry is 0. Every iteration pushes the carry at least one position to the left, so it terminates within 32 iterations in a 32-bit word. JavaScript's bitwise operators are 32-bit two's complement, so negatives work directly. In Python, mask each step with 0xFFFFFFFF and, if the result has bit 31 set, convert it with `~(x ^ 0xFFFFFFFF)`.",
    solutions: {
      javascript: code`
        function solve(input) {
          let [a, b] = input.trim().split(/\s+/).map(Number);
          while (b !== 0) {
            const carry = (a & b) << 1;
            a = a ^ b;
            b = carry;
          }
          return String(a);
        }
      `,
      python: code`
        def solve(input_str):
            a, b = map(int, input_str.split())
            mask = 0xFFFFFFFF
            a &= mask
            b &= mask
            while b:
                a, b = (a ^ b) & mask, ((a & b) << 1) & mask
            if a > 0x7FFFFFFF:
                a = ~(a ^ mask)
            return str(a)
      `,
    },
  },
  {
    title: "Minimum Flips to Make a OR b Equal to c",
    difficulty: "Medium",
    companies: ["Amazon", "Microsoft"],
    description:
      "Given three positive integers `a`, `b` and `c`, you may flip individual bits in the binary representations of `a` and `b` (a flip changes a single `0` into `1` or a `1` into `0`).\n\nPrint the minimum number of bit flips needed so that `a OR b == c` (bitwise OR).",
    constraints: "1 <= a, b, c <= 10^9",
    inputFormat: "One line with three integers `a b c`.",
    outputFormat: "The minimum number of flips.",
    examples: [
      { input: "2 6 5", output: "3", explanation: "Make a=1 (flip bit 1) and b=4 (flip bits 1 and 0): 1 | 4 = 5, using 3 flips." },
      { input: "4 2 7", output: "1", explanation: "Flip bit 0 of a (or b): 5 | 2 = 7." },
    ],
    testCases: [
      { input: "2 6 5", expectedOutput: "3", isHidden: false },
      { input: "4 2 7", expectedOutput: "1", isHidden: false },
      { input: "1 2 3", expectedOutput: "0", isHidden: true },
      { input: "1 1 1", expectedOutput: "0", isHidden: true },
      { input: "8 3 5", expectedOutput: "3", isHidden: true },
      { input: "7 7 7", expectedOutput: "0", isHidden: true },
      { input: "1073741823 1073741823 1", expectedOutput: "58", isHidden: true },
      { input: "1 1 1000000000", expectedOutput: "15", isHidden: true },
    ],
    hints: [
      "Bits are independent: handle each of the 30 bit positions separately and add up the costs.",
      "If the target bit in c is 1, you need at least one of a, b to have a 1 there: cost 1 if both are 0, otherwise 0.",
      "If the target bit in c is 0, both a and b must be 0 there: cost is the number of them that currently have a 1 (0, 1 or 2).",
    ],
    editorial:
      "For each bit position, with bits x (of a), y (of b) and z (of c): if z = 1 the cost is 1 when x = y = 0, else 0; if z = 0 the cost is x + y. Sum these over all positions (30 are enough, since all inputs are at most 10^9 < 2^30). Time O(log max), space O(1).",
    solutions: {
      javascript: code`
        function solve(input) {
          const [a, b, c] = input.trim().split(/\s+/).map(Number);
          let flips = 0;
          for (let bit = 0; bit < 30; bit++) {
            const x = (a >> bit) & 1;
            const y = (b >> bit) & 1;
            const z = (c >> bit) & 1;
            if (z === 1) {
              if (x === 0 && y === 0) flips++;
            } else {
              flips += x + y;
            }
          }
          return String(flips);
        }
      `,
      python: code`
        def solve(input_str):
            a, b, c = map(int, input_str.split())
            flips = 0
            for bit in range(30):
                x = (a >> bit) & 1
                y = (b >> bit) & 1
                z = (c >> bit) & 1
                if z:
                    if x == 0 and y == 0:
                        flips += 1
                else:
                    flips += x + y
            return str(flips)
      `,
    },
  },
  // @@APPEND@@
];
