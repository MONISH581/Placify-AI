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

/** `count` random inclusive ranges `l r` inside [0, n). */
function randomRanges(seed: number, n: number, count: number): string[] {
  const next = seededRandom(seed);
  return Array.from({ length: count }, () => {
    const a = next(n);
    const b = next(n);
    return `${Math.min(a, b)} ${Math.max(a, b)}`;
  });
}

// Pivot at index 4999: the right half mirrors the left half (an earlier pivot may exist, the answer is the leftmost).
const PIVOT_PERF = (() => {
  const next = seededRandom(11);
  const left = Array.from({ length: 4999 }, () => next(1001) - 500);
  return [...left, 7, ...left.slice().reverse()].join(" ");
})();

const XOR_PERF = (() => {
  const next = seededRandom(12);
  const arr = Array.from({ length: 3000 }, () => next(1000000001));
  return [arr.join(" "), ...randomRanges(13, 3000, 300)].join("\n");
})();

const POPULATION_PERF = (() => {
  const next = seededRandom(14);
  const lines: string[] = [];
  for (let i = 0; i < 3000; i++) {
    const birth = 1950 + next(100);
    lines.push(`${birth} ${birth + 1 + next(2050 - birth)}`);
  }
  return lines.join("\n");
})();

const VOWEL_WORDS_PERF = (() => {
  const next = seededRandom(15);
  const pool = ["apple", "banana", "orange", "umbrella", "a", "e", "kiwi", "eye", "ice", "tree", "open", "xyz", "audio", "idea", "sky"];
  const words = Array.from({ length: 2000 }, () => pool[next(pool.length)]);
  return [words.join(" "), ...randomRanges(16, 2000, 300)].join("\n");
})();

function randomMatrixLines(seed: number, rows: number, cols: number, low: number, span: number): string[] {
  const next = seededRandom(seed);
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => low + next(span)).join(" "));
}

const RANGE_ADD_PERF = (() => {
  const next = seededRandom(21);
  const n = 1000;
  const lines = [String(n)];
  for (let i = 0; i < 1500; i++) {
    const a = next(n);
    const b = next(n);
    lines.push(`${Math.min(a, b)} ${Math.max(a, b)} ${next(2001) - 1000}`);
  }
  return lines.join("\n");
})();

const RSQ2D_PERF = (() => {
  const next = seededRandom(22);
  const rows = 100;
  const cols = 100;
  const lines = [`${rows} ${cols}`, ...randomMatrixLines(23, rows, cols, -1000, 2001)];
  for (let i = 0; i < 300; i++) {
    const r1 = next(rows);
    const r2 = next(rows);
    const c1 = next(cols);
    const c2 = next(cols);
    lines.push(`${Math.min(r1, r2)} ${Math.min(c1, c2)} ${Math.max(r1, r2)} ${Math.max(c1, c2)}`);
  }
  return lines.join("\n");
})();

const BLOCK_SUM_PERF = ["30 30 4", ...randomMatrixLines(24, 30, 30, -100, 201)].join("\n");

/** Random car-pooling trips `passengers from to` (locations 0..1000) and the peak load found by a plain per-kilometre count. */
function carTrips(seed: number, count: number): { trips: string[]; peak: number } {
  const next = seededRandom(seed);
  const raw: number[][] = [];
  for (let i = 0; i < count; i++) {
    const from = next(1000);
    raw.push([1 + next(5), from, from + 1 + next(1000 - from)]);
  }
  let peak = 0;
  for (let location = 0; location <= 1000; location++) {
    let load = 0;
    for (const [passengers, from, to] of raw) if (from <= location && location < to) load += passengers;
    peak = Math.max(peak, load);
  }
  return { trips: raw.map((t) => t.join(" ")), peak };
}
const CAR_PEAK = carTrips(25, 1000);
const CAR_POOL_EXACT = [String(CAR_PEAK.peak), ...CAR_PEAK.trips].join("\n");
const CAR_POOL_SHORT = [String(CAR_PEAK.peak - 1), ...CAR_PEAK.trips].join("\n");

// Operations never create a run of non-zero numbers whose product exceeds 2^31 - 1.
const PRODUCT_PERF = (() => {
  const next = seededRandom(26);
  const pool = [0, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 0, 1, 3, 5];
  const lines: string[] = [];
  let count = 0;
  let run = 1;
  for (let i = 0; i < 3000; i++) {
    if (count > 0 && next(10) < 3) {
      lines.push(`getProduct ${1 + next(count)}`);
    } else {
      let value = pool[next(pool.length)];
      if (value === 0) run = 1;
      else if (run * value > 2147483647) value = 1;
      else run *= value;
      lines.push(`add ${value}`);
      count++;
    }
  }
  return lines.join("\n");
})();

export const REAL_SEGMENTTREES: ProblemSpec[] = [
  {
    title: "Find Pivot Index",
    difficulty: "Easy",
    companies: ["Amazon", "Meta", "Microsoft", "Zoho"],
    description:
      "The **pivot index** of an integer array `nums` is an index whose left-side sum equals its right-side sum. The left sum counts every element strictly before the index and the right sum counts every element strictly after it. An empty side sums to `0`, so index `0` can be a pivot when everything to its right adds up to `0`.\n\nPrint the **leftmost** pivot index, or `-1` if the array has none.",
    constraints: "1 <= nums.length <= 10^4\n-1000 <= nums[i] <= 1000",
    inputFormat: "One line of space-separated integers `nums`.",
    outputFormat: "A single integer: the leftmost pivot index, or -1.",
    examples: [
      { input: "1 7 3 6 5 6", output: "3", explanation: "Left of index 3 sums to 1 + 7 + 3 = 11 and right of it sums to 5 + 6 = 11." },
      { input: "1 2 3", output: "-1", explanation: "No index splits the array into two equal sums." },
    ],
    testCases: [
      { input: "1 7 3 6 5 6", expectedOutput: "3", isHidden: false },
      { input: "1 2 3", expectedOutput: "-1", isHidden: false },
      { input: "2 1 -1", expectedOutput: "0", isHidden: true },
      { input: "5", expectedOutput: "0", isHidden: true },
      { input: "0 0 0 0", expectedOutput: "0", isHidden: true },
      { input: "1 -1", expectedOutput: "-1", isHidden: true },
      { input: "-1 -1 -1 -1 -1 0", expectedOutput: "2", isHidden: true },
      { input: PIVOT_PERF, expectedOutput: "4999", isHidden: true },
    ],
    hints: [
      "Computing the left and right sums from scratch for every index costs O(n^2).",
      "The right sum of index i equals total - leftSum - nums[i].",
      "Scan left to right keeping a running left sum; return the first index where leftSum == total - leftSum - nums[i].",
    ],
    editorial:
      "Compute the total once. While scanning, maintain `left`, the sum of everything before the current index. The right sum is `total - left - nums[i]`; the first index where the two are equal is the leftmost pivot. Time O(n), space O(1).",
    solutions: {
      javascript: code`
        function solve(input) {
          const nums = input.trim().split(/\s+/).map(Number);
          let total = 0;
          for (const x of nums) total += x;
          let left = 0;
          for (let i = 0; i < nums.length; i++) {
            if (left === total - left - nums[i]) return String(i);
            left += nums[i];
          }
          return "-1";
        }
      `,
      python: code`
        def solve(input_str):
            nums = list(map(int, input_str.split()))
            total = sum(nums)
            left = 0
            for i, x in enumerate(nums):
                if left == total - left - x:
                    return str(i)
                left += x
            return "-1"
      `,
    },
  },
  {
    title: "Range Addition II",
    difficulty: "Easy",
    companies: ["Amazon", "Google"],
    description:
      "You start with an `m x n` matrix filled with zeros and a list of operations. Operation `a b` adds `1` to every cell `(x, y)` with `0 <= x < a` and `0 <= y < b` (the top-left `a x b` block).\n\nAfter applying all operations, print how many cells hold the **maximum** value in the matrix. If there are no operations every cell is `0`, so the answer is `m * n`.",
    constraints: "1 <= m, n <= 4 * 10^4\n0 <= number of operations <= 10^4\n1 <= a <= m, 1 <= b <= n",
    inputFormat: "Line 1: `m n`.\nFollowing lines (possibly none): one operation per line, `a b`.",
    outputFormat: "A single integer: the number of cells equal to the maximum value.",
    examples: [
      { input: "3 3\n2 2\n3 3", output: "4", explanation: "After both operations the top-left 2 x 2 block holds 2 and every other cell holds 1, so 4 cells are maximal." },
      { input: "3 3", output: "9", explanation: "No operations: all 9 cells are 0 and therefore all are maximal." },
    ],
    testCases: [
      { input: "3 3\n2 2\n3 3", expectedOutput: "4", isHidden: false },
      { input: "3 3", expectedOutput: "9", isHidden: false },
      { input: "3 3\n2 2\n3 3\n3 3\n2 2\n2 2\n3 3\n3 3\n2 2\n3 3\n3 3\n3 3", expectedOutput: "4", isHidden: true },
      { input: "4 5\n3 5\n4 2", expectedOutput: "6", isHidden: true },
      { input: "1 1\n1 1", expectedOutput: "1", isHidden: true },
      { input: "5 7\n5 7", expectedOutput: "35", isHidden: true },
      { input: "40000 40000", expectedOutput: "1600000000", isHidden: true },
      { input: "40000 40000\n39999 1\n1 39999", expectedOutput: "1", isHidden: true },
    ],
    hints: [
      "Simulating the matrix is far too large: m * n can be 1.6 billion cells.",
      "Every operation covers the top-left corner, so the maximum value is reached exactly where all operations overlap.",
      "That overlap is an `min(a) x min(b)` rectangle (use m and n as the starting minimums).",
    ],
    editorial:
      "All operations are anchored at cell (0, 0), so the cells covered by every operation form the rectangle `[0, min a) x [0, min b)`. Those cells receive the most increments, so the answer is `min_a * min_b`, with `min_a = m` and `min_b = n` when there are no operations. Time O(k), space O(1).",
    solutions: {
      javascript: code`
        function solve(input) {
          const lines = input.trim().split("\n");
          const [m, n] = lines[0].trim().split(/\s+/).map(Number);
          let a = m;
          let b = n;
          for (const line of lines.slice(1)) {
            const parts = line.trim().split(/\s+/);
            if (parts.length < 2) continue;
            a = Math.min(a, Number(parts[0]));
            b = Math.min(b, Number(parts[1]));
          }
          return String(a * b);
        }
      `,
      python: code`
        def solve(input_str):
            lines = input_str.strip().split("\n")
            m, n = map(int, lines[0].split())
            a, b = m, n
            for line in lines[1:]:
                parts = line.split()
                if len(parts) < 2:
                    continue
                a = min(a, int(parts[0]))
                b = min(b, int(parts[1]))
            return str(a * b)
      `,
    },
  },
  {
    title: "XOR Queries of a Subarray",
    difficulty: "Easy",
    companies: ["Google", "Amazon"],
    description:
      "Given an array `arr` of non-negative integers and several queries `left right`, print for each query the bitwise XOR of `arr[left] ^ arr[left + 1] ^ ... ^ arr[right]` (0-indexed, inclusive).\n\nThe array never changes between queries.",
    constraints: "1 <= arr.length <= 3 * 10^4\n0 <= arr[i] <= 10^9\n1 <= number of queries <= 3 * 10^4\n0 <= left <= right < arr.length",
    inputFormat: "Line 1: space-separated integers `arr`.\nFollowing lines: one query per line, `left right`.",
    outputFormat: "One line per query containing the XOR of the range.",
    examples: [
      { input: "1 3 4 8\n0 1\n1 2\n0 3\n3 3", output: "2\n7\n14\n8", explanation: "1^3 = 2, 3^4 = 7, 1^3^4^8 = 14, and the single element 8." },
      { input: "5\n0 0", output: "5" },
    ],
    testCases: [
      { input: "1 3 4 8\n0 1\n1 2\n0 3\n3 3", expectedOutput: "2\n7\n14\n8", isHidden: false },
      { input: "5\n0 0", expectedOutput: "5", isHidden: false },
      { input: "4 8 2 10\n2 3\n1 3\n0 0\n0 3", expectedOutput: "8\n0\n4\n4", isHidden: true },
      { input: "7 7 7 7\n0 1\n0 2\n1 3\n2 2", expectedOutput: "0\n7\n7\n7", isHidden: true },
      { input: "0 0 0\n0 2\n1 1", expectedOutput: "0\n0", isHidden: true },
      { input: "1000000000 999999999 123456789\n0 1\n1 2\n0 2", expectedOutput: "1023\n1019282666\n123457258", isHidden: true },
      { input: XOR_PERF, expectedOutput: "661125035\n84128479\n1005529161\n151458168\n548349631\n110953198\n317265098\n419982549\n227522802\n422773472\n809048350\n167647553\n952177619\n597724192\n734691327\n156211026\n1037792462\n81697768\n1028950245\n943309555\n1020634156\n388598462\n247781154\n656955137\n743471494\n825440251\n776015255\n1016131262\n693742052\n1042033738\n100497617\n545777853\n940291323\n441579646\n563847545\n610271970\n65095586\n421629742\n286443185\n687630963\n436069377\n822526270\n55752426\n178617770\n41871026\n769395826\n665824347\n829935322\n414663282\n560017386\n236749037\n44423659\n253244519\n510968127\n254189508\n401395570\n113731407\n697351968\n34519859\n73406181\n526616072\n884692238\n347834157\n528768689\n15323186\n554822803\n379479732\n344974241\n967728908\n886497950\n372723043\n624496327\n215724275\n916829882\n151544724\n354642029\n132482180\n602049290\n187895655\n822937243\n824806796\n1065272339\n1038689631\n984250214\n557084668\n31246457\n840715493\n647389398\n148285860\n199772872\n532232015\n786341155\n778039746\n467631252\n968888851\n577808217\n564748885\n479221521\n914574783\n361232471\n931070367\n56954668\n891089439\n551497815\n886897990\n1013468216\n1040939052\n929748182\n654594972\n254371927\n322746100\n736872947\n32143550\n855240882\n2948922\n398769758\n270655892\n736949164\n85403133\n889031811\n308855042\n1072397922\n831574562\n734233361\n323151342\n809476480\n903090929\n2388422\n439612776\n512308823\n876470039\n774684095\n363768774\n147004778\n522362638\n755478831\n50580800\n264319538\n194159373\n626082424\n61749711\n851437662\n46602978\n723289782\n521257237\n804865309\n41584713\n512199733\n766448566\n708302167\n548126102\n267847233\n245090816\n450798305\n541393794\n782710363\n668510185\n542616084\n315727979\n1010685453\n8479369\n603602629\n790464901\n648969181\n48291337\n998703608\n84630593\n975067926\n518804869\n172320703\n441161962\n31529771\n891661869\n346952559\n538156604\n76742683\n469070171\n603165650\n329320300\n804803228\n885864973\n28832452\n446142546\n457940355\n102395248\n524038193\n126668130\n370300470\n902311866\n516215990\n790143070\n43996535\n978800391\n854653882\n624791403\n580274853\n74795976\n856531339\n628132622\n779057417\n335849234\n989521454\n475618060\n693862518\n373817468\n1050448503\n385286319\n436399574\n1014666905\n157449198\n43197099\n338713725\n584562468\n66855849\n277497973\n104903453\n450374619\n926223923\n911342284\n1013130914\n735051726\n403744511\n212625302\n1026260610\n218237693\n782309275\n756657353\n30469936\n873451196\n717937851\n1065026146\n1072314027\n997307055\n171272804\n73969204\n818947633\n375018009\n761674150\n175165888\n685562415\n897702636\n523924783\n842915358\n23175383\n579652488\n1071201305\n700646720\n510177170\n158710835\n724084203\n367809575\n685864367\n408870126\n382898632\n115936934\n1063741554\n688894716\n957748314\n524679248\n721706553\n488880363\n656670921\n109881834\n686650187\n908381618\n764255687\n530222906\n534985200\n177244536\n135107561\n222837136\n973975036\n104280748\n531983255\n333615961\n1032489940\n945691897\n289443227\n903100616\n51246554\n685958116\n363369234\n507596359\n758625043\n966529060\n358056950\n323305454\n410362567\n819740468\n705124836\n188989861\n437633371\n662504511\n292538238\n231924366\n1049815735\n181889394\n352700167\n879093055\n620897953", isHidden: true },
    ],
    hints: [
      "XOR-ing the range element by element is O(n) per query.",
      "XOR is its own inverse: x ^ x = 0. So prefix XORs behave just like prefix sums.",
      "Let pre[i] = arr[0] ^ ... ^ arr[i - 1]; then the answer is pre[right + 1] ^ pre[left].",
    ],
    editorial:
      "Build `pre` with `pre[0] = 0` and `pre[i + 1] = pre[i] ^ arr[i]`. The common prefix `arr[0..left-1]` appears in both `pre[right + 1]` and `pre[left]` and cancels, leaving `arr[left..right]`. Preprocessing O(n), every query O(1).",
    solutions: {
      javascript: code`
        function solve(input) {
          const lines = input.trim().split("\n");
          const arr = lines[0].trim().split(/\s+/).map(Number);
          const pre = [0];
          for (const x of arr) pre.push(pre[pre.length - 1] ^ x);
          const out = [];
          for (const line of lines.slice(1)) {
            const parts = line.trim().split(/\s+/);
            if (parts.length < 2) continue;
            out.push(pre[Number(parts[1]) + 1] ^ pre[Number(parts[0])]);
          }
          return out.join("\n");
        }
      `,
      python: code`
        def solve(input_str):
            lines = input_str.strip().split("\n")
            arr = list(map(int, lines[0].split()))
            pre = [0]
            for x in arr:
                pre.append(pre[-1] ^ x)
            out = []
            for line in lines[1:]:
                parts = line.split()
                if len(parts) < 2:
                    continue
                out.append(str(pre[int(parts[1]) + 1] ^ pre[int(parts[0])]))
            return "\n".join(out)
      `,
    },
  },
  {
    title: "Maximum Population Year",
    difficulty: "Easy",
    companies: ["Amazon", "Microsoft"],
    description:
      "Each input line describes one person as `birth death`. A person counts toward the population of every year from `birth` up to, but **not including**, `death` (so `death` is the first year they are gone).\n\nPrint the **earliest** year that has the maximum population.",
    constraints: "1 <= number of people <= 10^5\n1950 <= birth < death <= 2050",
    inputFormat: "One person per line: `birth death`.",
    outputFormat: "A single integer: the earliest year with the highest population.",
    examples: [
      { input: "1993 1999\n2000 2010", output: "1993", explanation: "Never more than one person is alive; the earliest year with one person is 1993." },
      { input: "1950 1961\n1960 1971\n1970 1981", output: "1960", explanation: "In 1960 two people are alive (1950-1960 and 1960-1970); 1970 also has two, but 1960 is earlier." },
    ],
    testCases: [
      { input: "1993 1999\n2000 2010", expectedOutput: "1993", isHidden: false },
      { input: "1950 1961\n1960 1971\n1970 1981", expectedOutput: "1960", isHidden: false },
      { input: "2000 2001", expectedOutput: "2000", isHidden: true },
      { input: "1950 2050\n1950 2050", expectedOutput: "1950", isHidden: true },
      { input: "1950 1960\n1960 1970", expectedOutput: "1950", isHidden: true },
      { input: "2049 2050\n2049 2050\n1950 2050", expectedOutput: "2049", isHidden: true },
      { input: "1970 1980\n1975 1985\n1978 1990\n1960 1976", expectedOutput: "1975", isHidden: true },
      { input: POPULATION_PERF, expectedOutput: "2011", isHidden: true },
    ],
    hints: [
      "Counting how many people cover each year one by one costs O(people * years).",
      "Add +1 at the birth year and -1 at the death year in a small difference array.",
      "Take the running sum over 1950..2050 and keep the first year where it reaches a new maximum.",
    ],
    editorial:
      "Use a difference array over the 101 possible years: `diff[birth]++`, `diff[death]--`. The prefix sum at year y is the population of y because the death year is exclusive. Scan the years in order, updating the answer only on a strictly larger value so ties keep the earliest year. Time O(n + 100), space O(100).",
    solutions: {
      javascript: code`
        function solve(input) {
          const diff = new Array(2052).fill(0);
          for (const line of input.trim().split("\n")) {
            const parts = line.trim().split(/\s+/);
            if (parts.length < 2) continue;
            diff[Number(parts[0])]++;
            diff[Number(parts[1])]--;
          }
          let current = 0;
          let best = 0;
          let bestYear = 1950;
          for (let year = 1950; year <= 2050; year++) {
            current += diff[year];
            if (current > best) {
              best = current;
              bestYear = year;
            }
          }
          return String(bestYear);
        }
      `,
      python: code`
        def solve(input_str):
            diff = [0] * 2052
            for line in input_str.strip().split("\n"):
                parts = line.split()
                if len(parts) < 2:
                    continue
                diff[int(parts[0])] += 1
                diff[int(parts[1])] -= 1
            current = best = 0
            best_year = 1950
            for year in range(1950, 2051):
                current += diff[year]
                if current > best:
                    best = current
                    best_year = year
            return str(best_year)
      `,
    },
  },
  {
    title: "Count Vowel Strings in Ranges",
    difficulty: "Easy",
    companies: ["Google", "Amazon"],
    description:
      "You are given a list of lowercase words and several queries `left right`. For each query print how many words with an index in `[left, right]` (0-indexed, inclusive) both **start and end with a vowel** (`a`, `e`, `i`, `o`, `u`). A one-letter word such as `a` starts and ends with the same vowel and therefore counts.",
    constraints: "1 <= number of words <= 10^5\n1 <= word length <= 40, lowercase letters only\n1 <= number of queries <= 10^5\n0 <= left <= right < number of words",
    inputFormat: "Line 1: space-separated words.\nFollowing lines: one query per line, `left right`.",
    outputFormat: "One line per query containing the count.",
    examples: [
      { input: "aba bcb ece aa e\n0 2\n1 4\n1 1", output: "2\n3\n0", explanation: "The good words are aba, ece, aa and e (indices 0, 2, 3, 4)." },
      { input: "xyz\n0 0", output: "0" },
    ],
    testCases: [
      { input: "aba bcb ece aa e\n0 2\n1 4\n1 1", expectedOutput: "2\n3\n0", isHidden: false },
      { input: "xyz\n0 0", expectedOutput: "0", isHidden: false },
      { input: "a\n0 0", expectedOutput: "1", isHidden: true },
      { input: "apple banana orange umbrella sky\n0 4\n0 0\n1 2\n3 4", expectedOutput: "3\n1\n1\n1", isHidden: true },
      { input: "ab ba ae ea bb\n0 4\n2 3\n4 4", expectedOutput: "2\n2\n0", isHidden: true },
      { input: "eye ice open idea audio\n0 4\n2 2", expectedOutput: "4\n0", isHidden: true },
      { input: VOWEL_WORDS_PERF, expectedOutput: "594\n435\n384\n529\n914\n540\n187\n339\n97\n838\n472\n124\n24\n20\n174\n888\n362\n290\n151\n484\n113\n249\n24\n79\n214\n79\n596\n598\n253\n393\n917\n209\n706\n54\n427\n404\n657\n201\n224\n252\n796\n339\n53\n20\n1024\n185\n380\n977\n162\n358\n830\n933\n456\n304\n673\n73\n347\n115\n115\n228\n116\n254\n1007\n297\n960\n114\n553\n145\n48\n24\n260\n536\n534\n599\n1035\n662\n32\n115\n1122\n601\n6\n344\n421\n475\n12\n749\n328\n486\n499\n593\n101\n579\n295\n254\n335\n941\n579\n70\n687\n1171\n67\n997\n219\n542\n3\n551\n369\n330\n314\n139\n85\n537\n722\n72\n490\n694\n146\n742\n396\n384\n335\n932\n155\n552\n65\n542\n197\n626\n364\n241\n302\n357\n718\n169\n825\n655\n730\n356\n102\n402\n818\n844\n368\n183\n342\n355\n256\n117\n537\n872\n546\n848\n469\n540\n653\n701\n29\n677\n394\n262\n383\n281\n148\n231\n353\n390\n562\n225\n207\n519\n501\n336\n580\n880\n1051\n87\n23\n604\n75\n753\n436\n1059\n549\n455\n269\n880\n1012\n211\n637\n65\n346\n417\n619\n221\n32\n805\n971\n272\n372\n618\n74\n201\n251\n43\n808\n608\n411\n250\n57\n343\n490\n702\n211\n23\n971\n534\n460\n2\n123\n721\n895\n300\n563\n450\n709\n797\n768\n670\n6\n1093\n122\n601\n7\n320\n1063\n92\n256\n317\n285\n232\n637\n384\n720\n586\n319\n268\n58\n629\n295\n235\n266\n612\n642\n711\n62\n157\n792\n376\n356\n12\n832\n95\n254\n724\n652\n477\n664\n1012\n256\n151\n791\n236\n103\n59\n216\n759\n152\n568\n214\n23\n567\n215\n174\n593\n491\n157\n655\n479\n279\n408\n191\n516\n84\n84\n178\n5\n258\n50\n97\n173", isHidden: true },
    ],
    hints: [
      "Checking every word of every query is O(n) per query.",
      "Turn the list into a 0/1 array: 1 when the word starts and ends with a vowel.",
      "Build prefix sums over that array; each query is prefix[right + 1] - prefix[left].",
    ],
    editorial:
      "Mark each word as good (first and last letters are vowels) and build prefix counts `pre[i + 1] = pre[i] + good[i]`. A query is answered as `pre[right + 1] - pre[left]` in O(1). Total time O(total word work + n + q).",
    solutions: {
      javascript: code`
        function solve(input) {
          const lines = input.trim().split("\n");
          const words = lines[0].trim().split(/\s+/);
          const vowels = "aeiou";
          const pre = [0];
          for (const w of words) {
            const good = vowels.includes(w[0]) && vowels.includes(w[w.length - 1]) ? 1 : 0;
            pre.push(pre[pre.length - 1] + good);
          }
          const out = [];
          for (const line of lines.slice(1)) {
            const parts = line.trim().split(/\s+/);
            if (parts.length < 2) continue;
            out.push(pre[Number(parts[1]) + 1] - pre[Number(parts[0])]);
          }
          return out.join("\n");
        }
      `,
      python: code`
        def solve(input_str):
            lines = input_str.strip().split("\n")
            words = lines[0].split()
            pre = [0]
            for w in words:
                pre.append(pre[-1] + (1 if w[0] in "aeiou" and w[-1] in "aeiou" else 0))
            out = []
            for line in lines[1:]:
                parts = line.split()
                if len(parts) < 2:
                    continue
                out.append(str(pre[int(parts[1]) + 1] - pre[int(parts[0])]))
            return "\n".join(out)
      `,
    },
  },
  {
    title: "Range Addition",
    difficulty: "Medium",
    companies: ["Google", "Amazon"],
    description:
      "You are given the length `n` of an array that starts as all zeros and a list of update operations. Operation `start end inc` adds `inc` to every element with index in `[start, end]` (0-indexed, inclusive).\n\nApply all operations and print the final array.",
    constraints: "1 <= n <= 10^5\n0 <= number of operations <= 10^4\n0 <= start <= end < n\n-1000 <= inc <= 1000",
    inputFormat: "Line 1: the integer `n`.\nFollowing lines (possibly none): one update per line, `start end inc`.",
    outputFormat: "One line: the final array as `n` space-separated integers.",
    examples: [
      { input: "5\n1 3 2\n2 4 3\n0 2 -2", output: "-2 0 3 5 3", explanation: "After the three updates the array becomes [0,2,2,2,0], then [0,2,5,5,3], then [-2,0,3,5,3]." },
      { input: "1\n0 0 7", output: "7" },
    ],
    testCases: [
      { input: "5\n1 3 2\n2 4 3\n0 2 -2", expectedOutput: "-2 0 3 5 3", isHidden: false },
      { input: "1\n0 0 7", expectedOutput: "7", isHidden: false },
      { input: "3", expectedOutput: "0 0 0", isHidden: true },
      { input: "4\n0 3 1\n0 3 1\n0 3 -2", expectedOutput: "0 0 0 0", isHidden: true },
      { input: "6\n5 5 10\n0 0 -10\n2 4 3", expectedOutput: "-10 0 3 3 3 10", isHidden: true },
      { input: "2\n0 1 1000\n1 1 -1000", expectedOutput: "1000 0", isHidden: true },
      { input: RANGE_ADD_PERF, expectedOutput: "@@RANGE_ADD_PERF@@", isHidden: true },
    ],
    hints: [
      "Applying every update element by element costs O(n) per update.",
      "Store only the changes at the boundaries: add `inc` at `start` and subtract it just after `end`.",
      "A running prefix sum over that difference array reconstructs every final value in O(n).",
    ],
    editorial:
      "Keep a difference array `diff` of size n + 1. For an update `(s, e, v)` do `diff[s] += v` and `diff[e + 1] -= v`. The final value at index i is the prefix sum `diff[0] + ... + diff[i]`. Time O(n + k) for k updates, space O(n).",
    solutions: {
      javascript: code`
        function solve(input) {
          const lines = input.trim().split("\n");
          const n = Number(lines[0]);
          const diff = new Array(n + 1).fill(0);
          for (const line of lines.slice(1)) {
            const parts = line.trim().split(/\s+/);
            if (parts.length < 3) continue;
            const value = Number(parts[2]);
            diff[Number(parts[0])] += value;
            diff[Number(parts[1]) + 1] -= value;
          }
          const out = [];
          let current = 0;
          for (let i = 0; i < n; i++) {
            current += diff[i];
            out.push(current);
          }
          return out.join(" ");
        }
      `,
      python: code`
        def solve(input_str):
            lines = input_str.strip().split("\n")
            n = int(lines[0])
            diff = [0] * (n + 1)
            for line in lines[1:]:
                parts = line.split()
                if len(parts) < 3:
                    continue
                diff[int(parts[0])] += int(parts[2])
                diff[int(parts[1]) + 1] -= int(parts[2])
            out = []
            current = 0
            for i in range(n):
                current += diff[i]
                out.append(str(current))
            return " ".join(out)
      `,
    },
  },
  {
    title: "Range Sum Query 2D - Immutable",
    difficulty: "Medium",
    companies: ["Amazon", "Google", "Microsoft"],
    description:
      "Given a matrix of integers and several queries `row1 col1 row2 col2`, print for each query the sum of all elements inside the rectangle whose top-left corner is `(row1, col1)` and bottom-right corner is `(row2, col2)` (0-indexed, inclusive).\n\nThe matrix never changes, so answer each query in O(1) after preprocessing.",
    constraints: "1 <= rows, cols <= 200\n-10^4 <= matrix[i][j] <= 10^4\n1 <= number of queries <= 10^4\n0 <= row1 <= row2 < rows, 0 <= col1 <= col2 < cols",
    inputFormat: "Line 1: `rows cols`.\nNext `rows` lines: the matrix, one row per line.\nFollowing lines: one query per line, `row1 col1 row2 col2`.",
    outputFormat: "One line per query containing the rectangle sum.",
    examples: [
      {
        input: "5 5\n3 0 1 4 2\n5 6 3 2 1\n1 2 0 1 5\n4 1 0 1 7\n1 0 3 0 5\n2 1 4 3\n1 1 2 2\n1 2 2 4",
        output: "8\n11\n12",
        explanation: "The first rectangle covers rows 2-4 and columns 1-3: 2+0+1 + 1+0+1 + 0+3+0 = 8.",
      },
      { input: "1 1\n-5\n0 0 0 0", output: "-5" },
    ],
    testCases: [
      {
        input: "5 5\n3 0 1 4 2\n5 6 3 2 1\n1 2 0 1 5\n4 1 0 1 7\n1 0 3 0 5\n2 1 4 3\n1 1 2 2\n1 2 2 4",
        expectedOutput: "8\n11\n12",
        isHidden: false,
      },
      { input: "1 1\n-5\n0 0 0 0", expectedOutput: "-5", isHidden: false },
      { input: "2 3\n1 2 3\n4 5 6\n0 0 1 2\n0 1 0 2\n1 0 1 0\n1 1 1 2", expectedOutput: "21\n5\n4\n11", isHidden: true },
      { input: "3 3\n-1 -1 -1\n-1 -1 -1\n-1 -1 -1\n0 0 2 2\n1 1 1 1\n0 0 0 2", expectedOutput: "-9\n-1\n-3", isHidden: true },
      { input: "1 5\n10 -10 10 -10 10\n0 0 0 4\n1 3 1 3\n0 2 0 4", expectedOutput: "10\n-10\n10", isHidden: true },
      { input: "4 1\n7\n0\n-7\n3\n0 0 3 0\n0 0 2 0\n2 0 3 0", expectedOutput: "3\n0\n-4", isHidden: true },
      { input: RSQ2D_PERF, expectedOutput: "@@RSQ2D_PERF@@", isHidden: true },
    ],
    hints: [
      "Summing every rectangle cell by cell is O(rows * cols) per query.",
      "Define P[i][j] as the sum of the sub-rectangle from (0,0) to (i-1,j-1) and build it row by row.",
      "Use inclusion-exclusion: sum = P[r2+1][c2+1] - P[r1][c2+1] - P[r2+1][c1] + P[r1][c1].",
    ],
    editorial:
      "Build a (rows+1) x (cols+1) prefix table with `P[i+1][j+1] = M[i][j] + P[i][j+1] + P[i+1][j] - P[i][j]`. Any rectangle sum is then the big corner minus the two overhanging strips plus the doubly subtracted corner, an O(1) lookup. Preprocessing O(rows * cols), queries O(1).",
    solutions: {
      javascript: code`
        function solve(input) {
          const lines = input.trim().split("\n");
          const [rows, cols] = lines[0].trim().split(/\s+/).map(Number);
          const P = Array.from({ length: rows + 1 }, () => new Array(cols + 1).fill(0));
          for (let i = 0; i < rows; i++) {
            const row = lines[1 + i].trim().split(/\s+/).map(Number);
            for (let j = 0; j < cols; j++) {
              P[i + 1][j + 1] = row[j] + P[i][j + 1] + P[i + 1][j] - P[i][j];
            }
          }
          const out = [];
          for (const line of lines.slice(1 + rows)) {
            const parts = line.trim().split(/\s+/);
            if (parts.length < 4) continue;
            const [r1, c1, r2, c2] = parts.map(Number);
            out.push(P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1]);
          }
          return out.join("\n");
        }
      `,
      python: code`
        def solve(input_str):
            lines = input_str.strip().split("\n")
            rows, cols = map(int, lines[0].split())
            P = [[0] * (cols + 1) for _ in range(rows + 1)]
            for i in range(rows):
                row = list(map(int, lines[1 + i].split()))
                for j in range(cols):
                    P[i + 1][j + 1] = row[j] + P[i][j + 1] + P[i + 1][j] - P[i][j]
            out = []
            for line in lines[1 + rows:]:
                parts = line.split()
                if len(parts) < 4:
                    continue
                r1, c1, r2, c2 = map(int, parts)
                out.append(str(P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1]))
            return "\n".join(out)
      `,
    },
  },
  {
    title: "Matrix Block Sum",
    difficulty: "Medium",
    companies: ["Amazon", "Google"],
    description:
      "Given an `m x n` matrix `mat` and an integer `k`, build a matrix `answer` of the same size where `answer[i][j]` is the sum of every `mat[r][c]` with `i - k <= r <= i + k` and `j - k <= c <= j + k` that lies inside the matrix (cells outside the matrix are ignored).\n\nPrint `answer`.",
    constraints: "1 <= m, n <= 100\n0 <= k <= 100\n-1000 <= mat[i][j] <= 1000",
    inputFormat: "Line 1: `m n k`.\nNext `m` lines: the matrix, one row per line.",
    outputFormat: "`m` lines, each with `n` space-separated integers (the matrix `answer`).",
    examples: [
      { input: "3 3 1\n1 2 3\n4 5 6\n7 8 9", output: "12 21 16\n27 45 33\n24 39 28", explanation: "For the centre cell the 3 x 3 block is the whole matrix (sum 45); for the top-left corner only 1+2+4+5 = 12 fits." },
      { input: "3 3 2\n1 2 3\n4 5 6\n7 8 9", output: "45 45 45\n45 45 45\n45 45 45" },
    ],
    testCases: [
      { input: "3 3 1\n1 2 3\n4 5 6\n7 8 9", expectedOutput: "12 21 16\n27 45 33\n24 39 28", isHidden: false },
      { input: "3 3 2\n1 2 3\n4 5 6\n7 8 9", expectedOutput: "45 45 45\n45 45 45\n45 45 45", isHidden: false },
      { input: "1 1 1\n5", expectedOutput: "5", isHidden: true },
      { input: "1 4 1\n1 2 3 4", expectedOutput: "3 6 9 7", isHidden: true },
      { input: "2 2 0\n-1 2\n3 -4", expectedOutput: "-1 2\n3 -4", isHidden: true },
      { input: "3 2 1\n-1 -2\n-3 -4\n-5 -6", expectedOutput: "-10 -10\n-21 -21\n-18 -18", isHidden: true },
      { input: "4 1 100\n1\n2\n3\n4", expectedOutput: "10\n10\n10\n10", isHidden: true },
      { input: BLOCK_SUM_PERF, expectedOutput: "@@BLOCK_SUM_PERF@@", isHidden: true },
    ],
    hints: [
      "Summing each (2k+1) x (2k+1) block directly costs O(m * n * k^2).",
      "Build a 2D prefix-sum table so any rectangle sum is O(1).",
      "For cell (i, j) clamp the block to rows [max(0,i-k), min(m-1,i+k)] and columns [max(0,j-k), min(n-1,j+k)], then use inclusion-exclusion.",
    ],
    editorial:
      "With the prefix table `P` (size (m+1) x (n+1)), the answer for (i, j) is the sum of the clamped rectangle `r1..r2, c1..c2`: `P[r2+1][c2+1] - P[r1][c2+1] - P[r2+1][c1] + P[r1][c1]`. Time O(m * n), space O(m * n).",
    solutions: {
      javascript: code`
        function solve(input) {
          const lines = input.trim().split("\n");
          const [m, n, k] = lines[0].trim().split(/\s+/).map(Number);
          const P = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
          for (let i = 0; i < m; i++) {
            const row = lines[1 + i].trim().split(/\s+/).map(Number);
            for (let j = 0; j < n; j++) {
              P[i + 1][j + 1] = row[j] + P[i][j + 1] + P[i + 1][j] - P[i][j];
            }
          }
          const out = [];
          for (let i = 0; i < m; i++) {
            const row = [];
            const r1 = Math.max(0, i - k);
            const r2 = Math.min(m - 1, i + k);
            for (let j = 0; j < n; j++) {
              const c1 = Math.max(0, j - k);
              const c2 = Math.min(n - 1, j + k);
              row.push(P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1]);
            }
            out.push(row.join(" "));
          }
          return out.join("\n");
        }
      `,
      python: code`
        def solve(input_str):
            lines = input_str.strip().split("\n")
            m, n, k = map(int, lines[0].split())
            P = [[0] * (n + 1) for _ in range(m + 1)]
            for i in range(m):
                row = list(map(int, lines[1 + i].split()))
                for j in range(n):
                    P[i + 1][j + 1] = row[j] + P[i][j + 1] + P[i + 1][j] - P[i][j]
            out = []
            for i in range(m):
                r1, r2 = max(0, i - k), min(m - 1, i + k)
                row = []
                for j in range(n):
                    c1, c2 = max(0, j - k), min(n - 1, j + k)
                    row.append(str(P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1]))
                out.append(" ".join(row))
            return "\n".join(out)
      `,
    },
  },
  {
    title: "Car Pooling",
    difficulty: "Medium",
    companies: ["Lyft", "Uber", "Amazon", "Microsoft"],
    description:
      "A car with `capacity` empty seats drives only **east** along a line. Each trip is `passengers from to`: pick up `passengers` people at kilometre `from` and drop them off at kilometre `to`. At any location, passengers dropping off leave before new passengers board.\n\nPrint `true` if every trip can be completed without ever exceeding the capacity, otherwise `false`.",
    constraints: "1 <= capacity <= 10^5\n0 <= number of trips <= 1000\n1 <= passengers <= 100\n0 <= from < to <= 1000",
    inputFormat: "Line 1: the integer `capacity`.\nFollowing lines (possibly none): one trip per line, `passengers from to`.",
    outputFormat: "`true` or `false`.",
    examples: [
      { input: "4\n2 1 5\n3 3 7", output: "false", explanation: "Between kilometres 3 and 5 the car holds 2 + 3 = 5 passengers, more than 4 seats." },
      { input: "5\n2 1 5\n3 3 7", output: "true" },
    ],
    testCases: [
      { input: "4\n2 1 5\n3 3 7", expectedOutput: "false", isHidden: false },
      { input: "5\n2 1 5\n3 3 7", expectedOutput: "true", isHidden: false },
      { input: "3", expectedOutput: "true", isHidden: true },
      { input: "3\n2 1 5\n3 5 7", expectedOutput: "true", isHidden: true },
      { input: "3\n2 1 5\n3 4 7", expectedOutput: "false", isHidden: true },
      { input: "10\n5 0 1000\n5 0 1000\n1 500 501", expectedOutput: "false", isHidden: true },
      { input: "1\n1 0 1\n1 1 2\n1 2 3", expectedOutput: "true", isHidden: true },
      { input: CAR_POOL_EXACT, expectedOutput: "true", isHidden: true },
      { input: CAR_POOL_SHORT, expectedOutput: "false", isHidden: true },
    ],
    hints: [
      "Checking the load at every kilometre against every trip is O(1000 * trips); a smarter bookkeeping is possible.",
      "Record +passengers at `from` and -passengers at `to` in a difference array over locations.",
      "Walk the locations in order keeping a running total; if it ever exceeds the capacity the answer is false. Drop-offs at a location are applied before pickups because `to` is exclusive.",
    ],
    editorial:
      "A trip occupies seats for kilometres `from .. to - 1`. Add `+p` at `diff[from]` and `-p` at `diff[to]`; the prefix sum at kilometre x is the number of passengers on board while driving from x to x + 1. Return false as soon as a prefix sum exceeds the capacity. Time O(trips + 1000), space O(1000).",
    solutions: {
      javascript: code`
        function solve(input) {
          const lines = input.trim().split("\n");
          const capacity = Number(lines[0]);
          const diff = new Array(1002).fill(0);
          for (const line of lines.slice(1)) {
            const parts = line.trim().split(/\s+/);
            if (parts.length < 3) continue;
            const passengers = Number(parts[0]);
            diff[Number(parts[1])] += passengers;
            diff[Number(parts[2])] -= passengers;
          }
          let load = 0;
          for (let x = 0; x <= 1000; x++) {
            load += diff[x];
            if (load > capacity) return "false";
          }
          return "true";
        }
      `,
      python: code`
        def solve(input_str):
            lines = input_str.strip().split("\n")
            capacity = int(lines[0])
            diff = [0] * 1002
            for line in lines[1:]:
                parts = line.split()
                if len(parts) < 3:
                    continue
                passengers = int(parts[0])
                diff[int(parts[1])] += passengers
                diff[int(parts[2])] -= passengers
            load = 0
            for x in range(1001):
                load += diff[x]
                if load > capacity:
                    return "false"
            return "true"
      `,
    },
  },
  {
    title: "Product of the Last K Numbers",
    difficulty: "Medium",
    companies: ["Amazon", "Google"],
    description:
      "Design a data structure over a growing stream of non-negative integers that supports two operations, given one per line:\n- `add num`: append `num` to the stream.\n- `getProduct k`: print the product of the last `k` numbers added.\n\nIt is guaranteed that `k` never exceeds the stream length and that the product of any contiguous run of the stream fits in a signed 32-bit integer. The stream may contain zeros.",
    constraints: "0 <= num <= 100\n1 <= k <= number of numbers added so far\nAt most 4 * 10^4 operations\nEvery contiguous product fits in a 32-bit signed integer",
    inputFormat: "One operation per line: `add num` or `getProduct k`.",
    outputFormat: "One line per `getProduct` operation containing the product.",
    examples: [
      { input: "add 3\nadd 0\nadd 2\nadd 5\nadd 4\ngetProduct 2\ngetProduct 3\ngetProduct 4\nadd 8\ngetProduct 2", output: "20\n40\n0\n32", explanation: "The last two are 5, 4 (20); the last three are 2, 5, 4 (40); the last four include the 0; after adding 8 the last two are 4, 8 (32)." },
      { input: "add 5\ngetProduct 1", output: "5" },
    ],
    testCases: [
      {
        input: "add 3\nadd 0\nadd 2\nadd 5\nadd 4\ngetProduct 2\ngetProduct 3\ngetProduct 4\nadd 8\ngetProduct 2",
        expectedOutput: "20\n40\n0\n32",
        isHidden: false,
      },
      { input: "add 5\ngetProduct 1", expectedOutput: "5", isHidden: false },
      { input: "add 0\ngetProduct 1", expectedOutput: "0", isHidden: true },
      { input: "add 2\nadd 3\nadd 4\ngetProduct 3\ngetProduct 1\ngetProduct 2", expectedOutput: "24\n4\n12", isHidden: true },
      { input: "add 7\nadd 0\nadd 3\ngetProduct 1\ngetProduct 2\nadd 0\nadd 2\ngetProduct 2\ngetProduct 1\ngetProduct 3", expectedOutput: "3\n0\n0\n2\n0", isHidden: true },
      { input: "add 100\nadd 100\nadd 100\ngetProduct 3\ngetProduct 2", expectedOutput: "1000000\n10000", isHidden: true },
      { input: PRODUCT_PERF, expectedOutput: "@@PRODUCT_PERF@@", isHidden: true },
    ],
    hints: [
      "Multiplying the last k numbers on every query is O(k) each.",
      "Keep prefix products, so the product of a window is a division of two prefix products.",
      "A zero poisons every prefix product after it: when a 0 arrives, clear the list. A window reaching back past the last zero has product 0.",
    ],
    editorial:
      "Store `pre` with `pre[0] = 1` and append `pre[-1] * num` for each non-zero `num`. When `num == 0`, reset `pre = [1]` because any window covering that zero has product 0. For `getProduct k`: if `k >= len(pre)` the window contains the latest zero, answer 0; otherwise the answer is `pre[-1] / pre[-1-k]` (exact integer division). Every operation is O(1).",
    solutions: {
      javascript: code`
        function solve(input) {
          let pre = [1];
          const out = [];
          for (const line of input.trim().split("\n")) {
            const parts = line.trim().split(/\s+/);
            if (parts[0] === "add") {
              const num = Number(parts[1]);
              if (num === 0) pre = [1];
              else pre.push(pre[pre.length - 1] * num);
            } else if (parts[0] === "getProduct") {
              const k = Number(parts[1]);
              if (k >= pre.length) out.push(0);
              else out.push(pre[pre.length - 1] / pre[pre.length - 1 - k]);
            }
          }
          return out.join("\n");
        }
      `,
      python: code`
        def solve(input_str):
            pre = [1]
            out = []
            for line in input_str.strip().split("\n"):
                parts = line.split()
                if not parts:
                    continue
                if parts[0] == "add":
                    num = int(parts[1])
                    if num == 0:
                        pre = [1]
                    else:
                        pre.append(pre[-1] * num)
                elif parts[0] == "getProduct":
                    k = int(parts[1])
                    if k >= len(pre):
                        out.append("0")
                    else:
                        out.append(str(pre[-1] // pre[-1 - k]))
            return "\n".join(out)
      `,
    },
  },
];
