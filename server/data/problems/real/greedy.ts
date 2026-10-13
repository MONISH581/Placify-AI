/**
 * Greedy algorithms: company-tagged interview problems.
 *
 * Long "performance" inputs are generated deterministically with a seeded PRNG; their expected outputs are
 * literals that were produced by independent brute-force implementations (not by the reference solutions).
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

type Case = [input: string, output: string, hidden?: boolean, explanation?: string];

/** Builds `examples` (the visible cases) and `testCases` from one list so the two can never drift apart. */
function mk(cases: Case[]) {
  const visible = cases.filter((c) => !c[2]);
  return {
    examples: visible.map(([input, output, , explanation]) =>
      explanation ? { input, output, explanation } : { input, output },
    ),
    testCases: cases.map(([input, expectedOutput, hidden]) => ({ input, expectedOutput, isHidden: !!hidden })),
  };
}

// ---- performance inputs ----------------------------------------------------------------------------------
const LEMONADE_PERF = Array.from({ length: 25000 }, () => "5 5 10 20").join(" ");
const LEMONADE_PERF_FAIL = LEMONADE_PERF + " 20";

function shuffled<T>(items: T[], seed: number): T[] {
  const next = seededRandom(seed);
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = next(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ACTIVITY_PERF = (() => {
  const next = seededRandom(11);
  const rows = Array.from({ length: 3000 }, () => {
    const start = next(1000000);
    return `${start} ${start + 1 + next(30000)}`;
  });
  return `3000\n${rows.join("\n")}`;
})();

const MEETING_BASE = Array.from({ length: 50000 }, (_, i) => [2 * i, 2 * i + 2]);
const MEETING_PERF_OK = `50000\n${shuffled(MEETING_BASE, 21).map((m) => m.join(" ")).join("\n")}`;
const MEETING_PERF_BAD = `50000\n${shuffled(MEETING_BASE.map((m, i) => (i === 700 ? [1399, 1402] : m)), 22)
  .map((m) => m.join(" "))
  .join("\n")}`;

const STOCK2_PERF = (() => {
  const next = seededRandom(31);
  return Array.from({ length: 100000 }, () => next(10001)).join(" ");
})();

const FLOWER_ZEROS = Array.from({ length: 100000 }, () => "0").join(" ");
const FLOWER_PERF_TRUE = `${FLOWER_ZEROS}\n50000`;
const FLOWER_PERF_FALSE = `${FLOWER_ZEROS}\n50001`;

const NEGATIONS_PERF = (() => {
  const next = seededRandom(41);
  return `${Array.from({ length: 100000 }, () => next(201) - 100).join(" ")}\n10000`;
})();

export const REAL_GREEDY: ProblemSpec[] = [
  {
    title: "Lemonade Change",
    difficulty: "Easy",
    companies: ["Amazon", "Google"],
    description:
      "A lemonade stand sells each cup for `$5`. Customers stand in a queue and each buys exactly one cup, paying with a `$5`, `$10` or `$20` bill. You start with no money at all, and you must hand every customer the correct change immediately, using only the bills you have collected so far.\n\nGiven the bills in the order the customers arrive, decide whether you can give correct change to every single customer.",
    constraints: "1 <= bills.length <= 10^5\nEach bill is 5, 10 or 20.",
    inputFormat: "One line of space-separated integers: the bills in queue order.",
    outputFormat: "`true` if every customer can be given correct change, otherwise `false`.",
    ...mk([
      ["5 5 5 10 20", "true", false, "Collect three 5s, give one 5 for the 10, then give 10 + 5 for the 20."],
      ["5 5 10 10 20", "false", false, "After the two 10s you hold no 5s, so the 20 cannot be given 15 back."],
      ["5", "true", true],
      ["10", "false", true],
      ["20", "false", true],
      ["5 5 5 20", "true", true],
      ["5 5 10 20 5 5 5 5 20 20", "false", true],
      ["5 5 5 10 5 20 5 10 5 20", "true", true],
      [LEMONADE_PERF, "true", true],
      [LEMONADE_PERF_FAIL, "false", true],
    ]),
    hints: [
      "Only the 5 and 10 bills in your till can ever be handed back as change; a 20 is never given out.",
      "A 10 needs one 5 back. A 20 needs 15 back, which you can make as 10 + 5 or as 5 + 5 + 5.",
      "Prefer 10 + 5 for a 20: 5s are more flexible than 10s (a 10 can only be used for a 20), so spend the large bill first.",
    ],
    editorial:
      "Keep only two counters: the number of 5s and the number of 10s. A 5 needs no change. A 10 consumes one 5. A 20 needs 15 back: greedily use one 10 and one 5 if possible (10s are useless for any other future change), otherwise three 5s; if neither works, the answer is false. Because the greedy choice never leaves you with a worse till than any alternative, one pass decides the answer. Time O(n), space O(1).",
    solutions: {
      javascript: code`
        function solve(input) {
          const bills = input.trim().split(/\s+/).map(Number);
          let fives = 0;
          let tens = 0;
          for (const bill of bills) {
            if (bill === 5) {
              fives++;
            } else if (bill === 10) {
              if (fives === 0) return "false";
              fives--;
              tens++;
            } else {
              if (tens > 0 && fives > 0) {
                tens--;
                fives--;
              } else if (fives >= 3) {
                fives -= 3;
              } else {
                return "false";
              }
            }
          }
          return "true";
        }
      `,
      python: code`
        def solve(input_str):
            bills = list(map(int, input_str.split()))
            fives = tens = 0
            for bill in bills:
                if bill == 5:
                    fives += 1
                elif bill == 10:
                    if fives == 0:
                        return "false"
                    fives -= 1
                    tens += 1
                else:
                    if tens > 0 and fives > 0:
                        tens -= 1
                        fives -= 1
                    elif fives >= 3:
                        fives -= 3
                    else:
                        return "false"
            return "true"
      `,
    },
  },
  {
    title: "Maximum Units on a Truck",
    difficulty: "Easy",
    companies: ["Amazon", "Microsoft"],
    description:
      "You are loading boxes onto a truck. There are `n` box types: type `i` has `boxes[i]` identical boxes available, and each of those boxes holds `units[i]` units of goods.\n\nThe truck can carry at most `truckSize` boxes in total (the box type does not matter, only the count). Return the maximum total number of units that can be loaded.",
    constraints:
      "1 <= n <= 1000\n1 <= boxes[i], units[i] <= 1000\n1 <= truckSize <= 10^6",
    inputFormat:
      "Line 1: two integers `n` and `truckSize`.\nNext `n` lines: two integers `boxes[i] units[i]` for each box type.",
    outputFormat: "A single integer: the maximum number of units.",
    ...mk([
      ["3 4\n1 3\n2 2\n3 1", "8", false, "Take the 1 box with 3 units, the 2 boxes with 2 units each, and 1 box with 1 unit: 3 + 4 + 1 = 8."],
      ["4 10\n5 10\n2 5\n4 7\n3 9", "91", false, "Take 5 boxes of 10 units, 3 boxes of 9 units and 2 boxes of 7 units: 50 + 27 + 14 = 91."],
      ["1 1\n1 1", "1", true],
      ["2 100\n3 4\n5 6", "42", true],
      ["3 1\n5 2\n5 9\n5 4", "9", true],
      ["4 7\n2 5\n2 5\n2 5\n2 5", "35", true],
      ["3 5\n2 1000\n2 1000\n1 1000", "5000", true],
    ]),
    hints: [
      "Every box takes exactly one slot on the truck, so the only thing that distinguishes boxes is how many units they hold.",
      "If you could only pick one more box, which type would you choose?",
      "Sort the box types by units per box, descending, and take as many boxes as possible from each type until the truck is full.",
    ],
    editorial:
      "Since each box occupies one slot, a box with more units is never worse than a box with fewer. Sort the types by units per box in descending order and fill the truck type by type, taking min(boxes[i], remainingCapacity) boxes each time. An exchange argument shows any optimal load can be rearranged to match this. Time O(n log n), space O(n).",
    solutions: {
      javascript: code`
        function solve(input) {
          const lines = input.trim().split("\n");
          const [n, truckSize] = lines[0].trim().split(/\s+/).map(Number);
          const types = [];
          for (let i = 1; i <= n; i++) types.push(lines[i].trim().split(/\s+/).map(Number));
          types.sort((a, b) => b[1] - a[1]);
          let left = truckSize;
          let total = 0;
          for (const [count, units] of types) {
            const take = Math.min(count, left);
            total += take * units;
            left -= take;
            if (left === 0) break;
          }
          return String(total);
        }
      `,
      python: code`
        def solve(input_str):
            lines = input_str.strip().split("\n")
            n, truck_size = map(int, lines[0].split())
            types = [tuple(map(int, lines[i].split())) for i in range(1, n + 1)]
            types.sort(key=lambda t: -t[1])
            left = truck_size
            total = 0
            for count, units in types:
                take = min(count, left)
                total += take * units
                left -= take
                if left == 0:
                    break
            return str(total)
      `,
    },
  },
  {
    title: "Minimum Number of Coins (Indian Currency)",
    difficulty: "Easy",
    companies: ["Amazon", "Microsoft", "Flipkart"],
    description:
      "A cashier has an unlimited supply of coins and notes in these denominations: `1, 2, 5, 10, 20, 50, 100, 200, 500, 2000`. Given an amount `V`, pay it using the **minimum possible number** of coins/notes.\n\nPrint how many are used, and on the next line print the denominations used in descending order, separated by single spaces, with repeats (for example `500 500 100 2`). For this particular set of denominations the optimal multiset of coins is unique.",
    constraints: "1 <= V <= 10^5",
    inputFormat: "A single integer `V`.",
    outputFormat:
      "Line 1: the minimum number of coins/notes.\nLine 2: the denominations used, in descending order, space-separated.",
    ...mk([
      ["43", "4\n20 20 2 1", false, "20 + 20 + 2 + 1 = 43 using four coins."],
      ["1121", "5\n500 500 100 20 1", false, "500 + 500 + 100 + 20 + 1 = 1121 using five notes/coins."],
      ["1", "1\n1", true],
      ["3", "2\n2 1", true],
      ["4", "2\n2 2", true],
      ["9", "3\n5 2 2", true],
      ["2000", "1\n2000", true],
      ["99999", "60\n" +"2000 ".repeat(49) + "500 500 500 200 200 50 20 20 5 2 2", true],
    ]),
    hints: [
      "Think about how you make change in daily life: you hand over the largest note that does not exceed what you still owe.",
      "Process denominations from largest to smallest, taking as many of each as fit into the remaining amount.",
      "This works only because the denominations are 'canonical' (each is roughly double or 2.5x the previous). For arbitrary coin sets you would need dynamic programming (see Coin Change).",
    ],
    editorial:
      "For this denomination system the greedy strategy of always taking the largest coin not exceeding the remaining amount is optimal, because every denomination can be built from smaller ones in a way that never beats using it directly (the system is canonical). Iterate the denominations in descending order and repeatedly subtract while possible. The number of coins is at most V/2000 plus a bounded remainder, so the work is O(V/2000 + #denominations).",
    solutions: {
      javascript: code`
        function solve(input) {
          let v = Number(input.trim());
          const denominations = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1];
          const used = [];
          for (const d of denominations) {
            while (v >= d) {
              used.push(d);
              v -= d;
            }
          }
          return used.length + "\n" + used.join(" ");
        }
      `,
      python: code`
        def solve(input_str):
            v = int(input_str.strip())
            used = []
            for d in (2000, 500, 200, 100, 50, 20, 10, 5, 2, 1):
                while v >= d:
                    used.append(d)
                    v -= d
            return str(len(used)) + "\n" + " ".join(map(str, used))
      `,
    },
  },
  {
    title: "Activity Selection",
    difficulty: "Easy",
    companies: ["Amazon", "Microsoft", "Flipkart"],
    description:
      "There are `n` activities, activity `i` runs from `start[i]` to `finish[i]` (with `start[i] < finish[i]`). One person can do only one activity at a time, and may begin an activity at the exact moment the previous one finishes.\n\nSelect the maximum number of activities one person can complete. To make the printed answer unique, use this exact rule: consider the activities ordered by finish time (ties broken by the smaller original index); walk through them in that order and pick an activity whenever its start time is at least the finish time of the last picked activity.\n\nPrint how many were picked and which ones (1-based original indices, in the order they were picked).",
    constraints: "1 <= n <= 10^5\n0 <= start[i] < finish[i] <= 10^9",
    inputFormat: "Line 1: the integer `n`.\nNext `n` lines: `start[i] finish[i]` for activity `i` (numbered from 1).",
    outputFormat: "Line 1: the number of selected activities.\nLine 2: their 1-based indices in the order picked, separated by single spaces.",
    ...mk([
      ["6\n1 2\n3 4\n0 6\n5 7\n8 9\n5 9", "4\n1 2 4 5", false, "Sorted by finish: 1 (1-2), 2 (3-4), 3 (0-6), 4 (5-7), 5 (8-9), 6 (5-9). Pick 1, 2, skip 3, pick 4, pick 5, skip 6."],
      ["4\n1 4\n2 4\n4 6\n3 6", "2\n1 3", false, "Activities 1 and 2 tie on finish time 4, so index 1 comes first. After picking 1, activity 3 starts exactly at 4 and is allowed."],
      ["1\n0 1", "1\n1", true],
      ["3\n1 10\n2 9\n3 8", "1\n3", true],
      ["3\n1 2\n1 2\n1 2", "1\n1", true],
      ["5\n10 20\n12 25\n20 30\n25 35\n30 40", "3\n1 3 5", true],
      ["5\n1 3\n3 5\n5 7\n7 9\n9 11", "5\n1 2 3 4 5", true],
      ["5\n5 9\n1 2\n3 4\n0 6\n8 9", "3\n2 3 5", true],
      [ACTIVITY_PERF, "249\n540 542 662 518 1529 1875 2186 1621 2777 186 2848 80 1891 2409 169 1865 2478 1674 578 2249 364 226 454 2638 2139 1786 906 630 696 505 2738 46 1152 849 1819 2583 1167 1881 2957 191 36 391 1730 2978 381 268 1394 889 1795 1272 317 2233 880 1703 2991 1907 264 421 225 1338 2955 2904 771 16 1806 1375 2981 1370 1154 297 2820 1299 1767 623 165 2221 2614 2872 1072 803 1916 1569 2195 2435 97 2165 2926 1991 2507 2267 1251 183 2903 1291 2156 23 1850 1595 2645 1204 2986 2551 1274 2870 2542 2765 1561 2907 1943 397 1319 185 324 2553 2163 2095 1620 238 2936 455 996 1524 2494 373 2489 1006 2612 2950 2218 681 851 387 1292 1777 656 1199 2188 1591 394 1616 1092 1720 173 1531 1821 543 2048 70 2762 130 339 1934 1481 2809 1468 2998 412 2806 712 1947 575 2481 783 2909 2713 1749 1892 1602 1607 147 1494 1515 55 372 1110 1400 2154 2167 27 2197 840 1236 182 67 2231 1622 1288 1140 2862 2669 1983 1896 2894 841 2548 979 2222 2687 1128 94 923 311 2927 1343 614 1426 440 418 446 2629 1437 1805 351 2740 1762 1571 1815 846 1782 2619 508 1373 1637 1311 441 2519 2084 964 499 1358 859 434 664 252 1909 2761 1913 1671 419 1214 2374 1707 1044 1409 2468 2394 2646 2869 1330", true],
    ]),
    hints: [
      "Which activity, if chosen first, leaves the most room for the rest? Think about what finishing early buys you.",
      "Sort the activities by finish time. The one that finishes first can always be part of some optimal schedule.",
      "After picking an activity, skip every activity that starts before its finish time and repeat with the next compatible one.",
    ],
    editorial:
      "Greedy by earliest finish time: the activity that finishes first leaves the largest possible suffix of time, so an exchange argument shows some optimal schedule contains it. Sort by (finish, index), keep the finish time of the last picked activity, and take each activity whose start is at least that value. Time O(n log n), space O(n).",
    solutions: {
      javascript: code`
        function solve(input) {
          const lines = input.trim().split("\n");
          const n = Number(lines[0]);
          const acts = [];
          for (let i = 1; i <= n; i++) {
            const [s, f] = lines[i].trim().split(/\s+/).map(Number);
            acts.push({ s, f, id: i });
          }
          acts.sort((a, b) => a.f - b.f || a.id - b.id);
          const picked = [];
          let last = -1;
          for (const a of acts) {
            if (a.s >= last) {
              picked.push(a.id);
              last = a.f;
            }
          }
          return picked.length + "\n" + picked.join(" ");
        }
      `,
      python: code`
        def solve(input_str):
            lines = input_str.strip().split("\n")
            n = int(lines[0])
            acts = []
            for i in range(1, n + 1):
                s, f = map(int, lines[i].split())
                acts.append((f, i, s))
            acts.sort()
            picked = []
            last = -1
            for f, i, s in acts:
                if s >= last:
                    picked.append(i)
                    last = f
            return str(len(picked)) + "\n" + " ".join(map(str, picked))
      `,
    },
  },
  {
    title: "Meeting Rooms",
    difficulty: "Easy",
    companies: ["Meta", "Amazon", "Google", "Bloomberg"],
    description:
      "You are given the schedule of one person as a list of meetings, each with a start time and an end time. Decide whether the person can attend all of the meetings.\n\nTwo meetings conflict only if they overlap for a positive length of time. A meeting that ends at time `t` and another that starts at time `t` do not conflict.",
    constraints: "0 <= n <= 10^5\n0 <= start[i] < end[i] <= 10^9",
    inputFormat: "Line 1: the integer `n`.\nNext `n` lines: `start[i] end[i]` for each meeting.",
    outputFormat: "`true` if every meeting can be attended, otherwise `false`.",
    ...mk([
      ["3\n0 30\n5 10\n15 20", "false", false, "Meetings 0-30 and 5-10 overlap."],
      ["2\n7 10\n2 4", "true", false, "2-4 finishes before 7-10 begins."],
      ["0", "true", true],
      ["1\n5 6", "true", true],
      ["2\n1 5\n5 8", "true", true, "Back-to-back meetings do not conflict."],
      ["3\n1 3\n3 5\n4 6", "false", true],
      ["3\n10 20\n1 30\n40 50", "false", true],
      [MEETING_PERF_OK, "true", true],
      [MEETING_PERF_BAD, "false", true],
    ]),
    hints: [
      "If two meetings overlap, some pair of meetings that are neighbours in time order overlaps too.",
      "Sort the meetings by start time.",
      "After sorting, it is enough to check that every meeting starts at or after the previous meeting's end.",
    ],
    editorial:
      "Sort meetings by start time and compare each meeting with the one before it: if `start[i] < end[i-1]` there is a conflict. If any two meetings overlap, then after sorting some adjacent pair overlaps, so the adjacent check is sufficient. Time O(n log n), space O(n).",
    solutions: {
      javascript: code`
        function solve(input) {
          const lines = input.trim().split("\n");
          const n = Number(lines[0]);
          const meetings = [];
          for (let i = 1; i <= n; i++) meetings.push(lines[i].trim().split(/\s+/).map(Number));
          meetings.sort((a, b) => a[0] - b[0]);
          for (let i = 1; i < n; i++) {
            if (meetings[i][0] < meetings[i - 1][1]) return "false";
          }
          return "true";
        }
      `,
      python: code`
        def solve(input_str):
            lines = input_str.strip().split("\n")
            n = int(lines[0])
            meetings = sorted(tuple(map(int, lines[i].split())) for i in range(1, n + 1))
            for i in range(1, n):
                if meetings[i][0] < meetings[i - 1][1]:
                    return "false"
            return "true"
      `,
    },
  },
  {
    title: "Best Time to Buy and Sell Stock II",
    difficulty: "Easy",
    companies: ["Amazon", "Bloomberg", "Goldman Sachs", "Meta"],
    description:
      "`prices[i]` is the price of a stock on day `i`. You may buy and sell as many times as you like, but you can hold at most one share at a time (you must sell before buying again). You may sell and buy again on the same day.\n\nReturn the maximum total profit you can make.",
    constraints: "1 <= prices.length <= 10^5\n0 <= prices[i] <= 10^4",
    inputFormat: "One line of space-separated integers `prices`.",
    outputFormat: "The maximum profit as an integer.",
    ...mk([
      ["7 1 5 3 6 4", "7", false, "Buy at 1, sell at 5 (profit 4); buy at 3, sell at 6 (profit 3)."],
      ["1 2 3 4 5", "4", false, "Buy on day 1 and sell on day 5, which equals the sum of every daily gain."],
      ["7 6 4 3 1", "0", true],
      ["5", "0", true],
      ["1 5 1 5 1 5", "12", true],
      ["3 3 3", "0", true],
      ["2 1 2 0 1", "2", true],
      [STOCK2_PERF, "166515767", true],
    ]),
    hints: [
      "A long climb from a low to a high can be split into consecutive one-day climbs without changing the total.",
      "So you never need to decide exactly where to buy: every upward step between neighbouring days is profit you can capture.",
      "Add up `prices[i] - prices[i-1]` for every day where the price rose.",
    ],
    editorial:
      "Any profitable trade from day a to day b equals the sum of the daily differences between a and b, and the optimal strategy simply collects every positive difference while skipping negative ones. So the answer is the sum of max(0, prices[i] - prices[i-1]). Time O(n), space O(1).",
    solutions: {
      javascript: code`
        function solve(input) {
          const prices = input.trim().split(/\s+/).map(Number);
          let profit = 0;
          for (let i = 1; i < prices.length; i++) {
            if (prices[i] > prices[i - 1]) profit += prices[i] - prices[i - 1];
          }
          return String(profit);
        }
      `,
      python: code`
        def solve(input_str):
            prices = list(map(int, input_str.split()))
            profit = 0
            for i in range(1, len(prices)):
                if prices[i] > prices[i - 1]:
                    profit += prices[i] - prices[i - 1]
            return str(profit)
      `,
    },
  },
  {
    title: "Can Place Flowers",
    difficulty: "Easy",
    companies: ["Google", "Amazon"],
    description:
      "A long flowerbed is represented by an array of `0`s (empty plot) and `1`s (planted plot). Flowers cannot be planted in adjacent plots. The given bed already obeys this rule.\n\nGiven the bed and an integer `n`, decide whether `n` additional flowers can be planted without breaking the no-adjacent-flowers rule.",
    constraints: "1 <= flowerbed.length <= 10^5\nflowerbed[i] is 0 or 1 and no two 1s are adjacent\n0 <= n <= flowerbed.length",
    inputFormat: "Line 1: space-separated `0`/`1` values for the flowerbed.\nLine 2: the integer `n`.",
    outputFormat: "`true` if `n` new flowers fit, otherwise `false`.",
    ...mk([
      ["1 0 0 0 1\n1", "true", false, "Plant in the middle plot (index 2)."],
      ["1 0 0 0 1\n2", "false", false, "Only one extra flower fits."],
      ["0\n1", "true", true],
      ["1\n0", "true", true],
      ["1\n1", "false", true],
      ["0 0 0 0 0\n3", "true", true],
      ["0 0 0 0 0\n4", "false", true],
      ["0 0 1 0 0\n2", "true", true],
      [FLOWER_PERF_TRUE, "true", true],
      [FLOWER_PERF_FALSE, "false", true],
    ]),
    hints: [
      "A plot is usable only if it is empty and both neighbours are empty (or do not exist).",
      "Scan left to right and plant as early as you can; planting earlier never hurts later plots more than planting later would.",
      "Count the flowers you manage to plant and compare with `n`; you can stop early once the count reaches `n`.",
    ],
    editorial:
      "Scan from the left and plant a flower at index i whenever bed[i] is 0 and both neighbours are 0 or out of range, then mark it as planted so the next plot is blocked. Planting as far left as possible is optimal by an exchange argument, and the count is the maximum number of flowers that fit. Compare it with n. Time O(n), space O(1).",
    solutions: {
      javascript: code`
        function solve(input) {
          const lines = input.trim().split("\n");
          const bed = lines[0].trim().split(/\s+/).map(Number);
          const need = Number(lines[1]);
          let planted = 0;
          for (let i = 0; i < bed.length; i++) {
            const leftFree = i === 0 || bed[i - 1] === 0;
            const rightFree = i === bed.length - 1 || bed[i + 1] === 0;
            if (bed[i] === 0 && leftFree && rightFree) {
              bed[i] = 1;
              planted++;
            }
          }
          return planted >= need ? "true" : "false";
        }
      `,
      python: code`
        def solve(input_str):
            lines = input_str.strip().split("\n")
            bed = list(map(int, lines[0].split()))
            need = int(lines[1])
            planted = 0
            for i in range(len(bed)):
                left_free = i == 0 or bed[i - 1] == 0
                right_free = i == len(bed) - 1 or bed[i + 1] == 0
                if bed[i] == 0 and left_free and right_free:
                    bed[i] = 1
                    planted += 1
            return "true" if planted >= need else "false"
      `,
    },
  },
  {
    title: "Maximize Sum of Array After K Negations",
    difficulty: "Easy",
    companies: ["Amazon", "Microsoft"],
    description:
      "You are given an integer array `nums` and an integer `k`. In one operation you pick any index `i` and replace `nums[i]` with `-nums[i]`. You must perform exactly `k` operations, and you may pick the same index more than once.\n\nReturn the largest possible sum of the array after performing exactly `k` operations.",
    constraints: "1 <= nums.length <= 10^5\n-100 <= nums[i] <= 100\n1 <= k <= 10^4",
    inputFormat: "Line 1: space-separated integers `nums`.\nLine 2: the integer `k`.",
    outputFormat: "The maximum possible sum as an integer.",
    ...mk([
      ["4 2 3\n1", "5", false, "Negate 2 to get [4, -2, 3], sum 5."],
      ["3 -1 0 2\n3", "6", false, "Negate -1, then negate 0 twice (any index may be reused): result [3, 1, 0, 2], sum 6."],
      ["2 -3 -1 5 -4\n2", "13", true],
      ["-8 3 -5 -3 -5 -2\n6", "22", true],
      ["1\n3", "-1", true],
      ["1\n4", "1", true],
      ["0 0\n5", "0", true],
      ["-1 -2 -3\n10", "4", true],
      [NEGATIONS_PERF, "1800090", true],
    ]),
    hints: [
      "Negating a negative number always increases the sum, and the most negative number gains the most.",
      "Once no negatives remain, negating the same number twice changes nothing, so only the parity of the remaining operations matters.",
      "If an odd number of operations remains after all negatives are flipped, flip the element with the smallest absolute value once.",
    ],
    editorial:
      "Sort ascending. Flip negative numbers from the most negative while operations remain. If operations are left and k is odd, one extra flip is forced; apply it to the smallest absolute value in the array (zero makes it free). The result is the sum with this adjustment. Time O(n log n), space O(1) extra.",
    solutions: {
      javascript: code`
        function solve(input) {
          const lines = input.trim().split("\n");
          const nums = lines[0].trim().split(/\s+/).map(Number);
          let k = Number(lines[1]);
          nums.sort((a, b) => a - b);
          for (let i = 0; i < nums.length && k > 0 && nums[i] < 0; i++) {
            nums[i] = -nums[i];
            k--;
          }
          let sum = 0;
          let smallest = Infinity;
          for (const x of nums) {
            sum += x;
            smallest = Math.min(smallest, Math.abs(x));
          }
          if (k % 2 === 1) sum -= 2 * smallest;
          return String(sum);
        }
      `,
      python: code`
        def solve(input_str):
            lines = input_str.strip().split("\n")
            nums = sorted(map(int, lines[0].split()))
            k = int(lines[1])
            for i in range(len(nums)):
                if k > 0 and nums[i] < 0:
                    nums[i] = -nums[i]
                    k -= 1
                else:
                    break
            total = sum(nums)
            smallest = min(abs(x) for x in nums)
            if k % 2 == 1:
                total -= 2 * smallest
            return str(total)
      `,
    },
  },
  // __NEXT__
];
