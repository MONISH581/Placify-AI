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

function randomEdges(next: (bound: number) => number, n: number, m: number, base = 0): [number, number][] {
  const seen = new Set<number>();
  const edges: [number, number][] = [];
  while (edges.length < m) {
    const u = next(n);
    const v = next(n);
    if (u === v) continue;
    const key = Math.min(u, v) * n + Math.max(u, v);
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push([u + base, v + base]);
  }
  return edges;
}

const TOWN_PERF = (() => {
  const next = seededRandom(1101);
  const n = 1000;
  const edges: [number, number][] = [];
  for (let i = 1; i < n; i++) {
    edges.push([i, n]);
    if (next(2) === 1) {
      const j = 1 + next(n - 1);
      if (j !== i) edges.push([i, j]);
    }
  }
  return [n + " " + edges.length, ...edges.map(([a, b]) => a + " " + b)].join("\n");
})();

const PERIM_PERF = (() => {
  const next = seededRandom(1202);
  const size = 150;
  const rows: string[] = [];
  for (let r = 0; r < size; r++) {
    let row = "";
    for (let c = 0; c < size; c++) row += next(10) < 6 ? "1" : "0";
    rows.push(row);
  }
  return [size + " " + size, ...rows].join("\n");
})();

const BFS_PERF = (() => {
  const next = seededRandom(1303);
  const n = 1500;
  const edges = randomEdges(next, n, 3000);
  return [n + " " + edges.length, ...edges.map(([a, b]) => a + " " + b)].join("\n");
})();

const DFS_PERF = (() => {
  const next = seededRandom(1404);
  const n = 2500;
  const seen = new Set<number>();
  const edges: [number, number][] = [];
  for (let i = 0; i + 1 < n; i++) {
    edges.push([i, i + 1]);
    seen.add(i * n + i + 1);
  }
  while (edges.length < n - 1 + 1000) {
    const a = next(n);
    const b = next(n);
    if (Math.abs(a - b) < 2) continue;
    const key = Math.min(a, b) * n + Math.max(a, b);
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push([a, b]);
  }
  return [n + " " + edges.length, ...edges.map(([a, b]) => a + " " + b)].join("\n");
})();

const EMP_PERF = (() => {
  const next = seededRandom(1505);
  const n = 2000;
  const importance: number[] = [];
  for (let i = 0; i < n; i++) importance.push(next(50));
  const children: number[][] = Array.from({ length: n }, () => []);
  for (let i = 1; i < n; i++) children[next(i)].push(i);
  const idOf = (i: number) => 100 + 3 * i;
  const lines = [String(n)];
  for (let i = 0; i < n; i++) {
    lines.push([idOf(i), importance[i], children[i].length, ...children[i].map(idOf)].join(" "));
  }
  lines.push(String(idOf(0)));
  return lines.join("\n");
})();

const SPU_PERF = (() => {
  const next = seededRandom(1606);
  const n = 1500;
  const edges = randomEdges(next, n, 2000);
  return [n + " " + edges.length, ...edges.map(([a, b]) => a + " " + b), String(next(n))].join("\n");
})();

const PAC_PERF = (() => {
  const next = seededRandom(2107);
  const size = 120;
  const lines = [size + " " + size];
  for (let r = 0; r < size; r++) {
    const row: number[] = [];
    for (let c = 0; c < size; c++) row.push(next(100));
    lines.push(row.join(" "));
  }
  return lines.join("\n");
})();

const SURR_PERF = (() => {
  const next = seededRandom(2208);
  const size = 150;
  const rows: string[] = [];
  for (let r = 0; r < size; r++) {
    let row = "";
    for (let c = 0; c < size; c++) row += next(100) < 55 ? "O" : "X";
    rows.push(row);
  }
  return [size + " " + size, ...rows].join("\n");
})();

const BIN_PERF = (() => {
  const next = seededRandom(2309);
  const n = 300;
  const rows: string[] = [];
  for (let r = 0; r < n; r++) {
    let row = "";
    for (let c = 0; c < n; c++) row += next(100) < 30 ? "1" : "0";
    rows.push(row);
  }
  rows[0] = "0" + rows[0].slice(1);
  rows[n - 1] = rows[n - 1].slice(0, n - 1) + "0";
  return [String(n), ...rows].join("\n");
})();

const BIP_RAND_PERF = (() => {
  const next = seededRandom(2410);
  const n = 2000;
  const seen = new Set<number>();
  const edges: [number, number][] = [];
  while (edges.length < 5000) {
    const u = next(n);
    const v = next(n);
    if (u % 2 === v % 2) continue;
    const key = Math.min(u, v) * n + Math.max(u, v);
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push([u, v]);
  }
  return [n + " " + edges.length, ...edges.map(([a, b]) => a + " " + b)].join("\n");
})();
const BIP_CYCLE_PERF = (() => {
  const n = 2000;
  const edges: [number, number][] = [];
  for (let i = 0; i + 1 < n; i++) edges.push([i, i + 1]);
  edges.push([0, 1998]);
  return [n + " " + edges.length, ...edges.map(([a, b]) => a + " " + b)].join("\n");
})();

const DCYC_DAG_PERF = (() => {
  const next = seededRandom(2511);
  const n = 2000;
  const seen = new Set<number>();
  const edges: [number, number][] = [];
  while (edges.length < 6000) {
    const a = next(n);
    const b = next(n);
    if (a === b) continue;
    const u = Math.min(a, b);
    const v = Math.max(a, b);
    if (seen.has(u * n + v)) continue;
    seen.add(u * n + v);
    edges.push([u, v]);
  }
  return [n + " " + edges.length, ...edges.map(([a, b]) => a + " " + b)].join("\n");
})();
const DCYC_LONG_PERF = (() => {
  const n = 2000;
  const edges: [number, number][] = [];
  for (let i = 0; i + 1 < n; i++) edges.push([i, i + 1]);
  edges.push([n - 1, 1000]);
  return [n + " " + edges.length, ...edges.map(([a, b]) => a + " " + b)].join("\n");
})();

const TOPO_PERF = (() => {
  const next = seededRandom(2612);
  const n = 2000;
  const perm = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = next(i + 1);
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  const seen = new Set<number>();
  const edges: [number, number][] = [];
  while (edges.length < 5000) {
    const a = next(n);
    const b = next(n);
    if (a === b) continue;
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    if (seen.has(lo * n + hi)) continue;
    seen.add(lo * n + hi);
    edges.push([perm[lo], perm[hi]]);
  }
  return [n + " " + edges.length, ...edges.map(([a, b]) => a + " " + b)].join("\n");
})();

const DIJ_PERF = (() => {
  const next = seededRandom(2713);
  const n = 1000;
  const edges = randomEdges(next, n, 4000);
  const lines = [n + " " + edges.length];
  for (const [a, b] of edges) lines.push(a + " " + b + " " + (next(1000) + 1));
  lines.push(String(next(n)));
  return lines.join("\n");
})();

export const REAL_GRAPHS: ProblemSpec[] = [
  {
    title: "Find the Town Judge",
    difficulty: "Easy",
    companies: ["Amazon", "Google"],
    description:
      "A town has `n` people labelled `1..n`. Rumour says one of them is the town judge. If the judge exists, then:\n\n1. The judge trusts nobody.\n2. Everybody else (all `n - 1` other people) trusts the judge.\n\nYou are given the trust relations as pairs `a b`, meaning person `a` trusts person `b`. Each pair appears at most once. Print the label of the judge, or `-1` if there is no judge. At most one person can satisfy both rules.",
    constraints:
      "1 <= n <= 1000\n0 <= m <= 10^4\n1 <= a, b <= n, a != b\nNo pair appears twice.",
    inputFormat:
      "Line 1: two integers `n m`.\nNext `m` lines: two integers `a b` (a trusts b).",
    outputFormat:
      "A single integer: the judge's label, or `-1`.",
    examples: [
      { input: "3 2\n1 3\n2 3", output: "3", explanation: "Persons 1 and 2 both trust person 3, and person 3 trusts nobody, so 3 is the judge." },
      { input: "3 3\n1 3\n2 3\n3 1", output: "-1", explanation: "Person 3 trusts person 1, so person 3 cannot be the judge, and nobody else is trusted by everyone." },
    ],
    testCases: [
      { input: "3 2\n1 3\n2 3", expectedOutput: "3", isHidden: false },
      { input: "3 3\n1 3\n2 3\n3 1", expectedOutput: "-1", isHidden: false },
      { input: "1 0", expectedOutput: "1", isHidden: true },
      { input: "2 1\n1 2", expectedOutput: "2", isHidden: true },
      { input: "4 5\n1 3\n1 4\n2 3\n2 4\n4 3", expectedOutput: "3", isHidden: true },
      { input: "3 2\n1 2\n2 3", expectedOutput: "-1", isHidden: true },
      { input: "2 0", expectedOutput: "-1", isHidden: true },
      { input: "3 1\n1 2", expectedOutput: "-1", isHidden: true },
      { input: "4 6\n1 4\n2 4\n3 4\n4 1\n1 2\n2 3", expectedOutput: "-1", isHidden: true },
      { input: TOWN_PERF, expectedOutput: "1000", isHidden: true },
    ],
    hints: [
      "Use the two rules together: the judge has trust-in count n - 1 and trust-out count 0.",
      "You do not need adjacency lists. Keep one array of integers per person.",
      "For every pair a trusts b do score[a]--, score[b]++. The judge is the only person who can reach score n - 1.",
    ],
    editorial:
      "Give each person a score: +1 for every person who trusts them, -1 for every person they trust. The judge is trusted by n - 1 people and trusts nobody, so the score is exactly n - 1. Anyone who trusts somebody loses at least one point and can have at most n - 2 incoming trusts (nobody trusts themselves), so no one else can reach n - 1. Scan the scores once. Time O(n + m), space O(n).",
    solutions: {
      javascript: code`
        function solve(input) {
          const t = input.split(/\s+/).filter(Boolean).map(Number);
          const n = t[0], m = t[1];
          const score = new Array(n + 1).fill(0);
          for (let i = 0; i < m; i++) {
            score[t[2 + 2 * i]]--;
            score[t[3 + 2 * i]]++;
          }
          for (let v = 1; v <= n; v++) if (score[v] === n - 1) return String(v);
          return "-1";
        }
      `,
      python: code`
        def solve(input_str):
            t = list(map(int, input_str.split()))
            n, m = t[0], t[1]
            score = [0] * (n + 1)
            for i in range(m):
                score[t[2 + 2 * i]] -= 1
                score[t[3 + 2 * i]] += 1
            for v in range(1, n + 1):
                if score[v] == n - 1:
                    return str(v)
            return "-1"
      `,
    },
  },
  {
    title: "Island Perimeter",
    difficulty: "Easy",
    companies: ["Google", "Amazon", "Meta"],
    description:
      "You are given a rectangular grid of `0` (water) and `1` (land). Cells connect horizontally and vertically only, and the grid is surrounded by water. The grid may contain any number of land cells.\n\nPrint the total perimeter of the land: the number of unit edges that separate a land cell from water or from the outside of the grid.",
    constraints:
      "1 <= R, C <= 150\nEach cell is `0` or `1`.",
    inputFormat:
      "Line 1: two integers `R C`.\nNext `R` lines: a string of `C` characters, each `0` or `1` (no spaces).",
    outputFormat:
      "A single integer: the total perimeter.",
    examples: [
      { input: "4 4\n0100\n1110\n0100\n1100", output: "16", explanation: "The land is one connected shape with 7 cells; counting every land edge that touches water or the border gives 16." },
      { input: "1 1\n1", output: "4", explanation: "A single land cell has four exposed edges." },
    ],
    testCases: [
      { input: "4 4\n0100\n1110\n0100\n1100", expectedOutput: "16", isHidden: false },
      { input: "1 1\n1", expectedOutput: "4", isHidden: false },
      { input: "1 1\n0", expectedOutput: "0", isHidden: true },
      { input: "1 5\n11111", expectedOutput: "12", isHidden: true },
      { input: "3 3\n111\n101\n111", expectedOutput: "16", isHidden: true },
      { input: "2 2\n11\n11", expectedOutput: "8", isHidden: true },
      { input: "3 3\n101\n010\n101", expectedOutput: "20", isHidden: true },
      { input: "5 1\n1\n0\n1\n1\n1", expectedOutput: "12", isHidden: true },
      { input: PERIM_PERF, expectedOutput: "21864", isHidden: true },
    ],
    hints: [
      "Each land cell contributes 4 edges before looking at neighbours.",
      "Two land cells that share a side hide one edge in each of them.",
      "perimeter = 4 * (land cells) - 2 * (adjacent land pairs). Count right and down neighbours only so each pair is counted once.",
    ],
    editorial:
      "Every land cell has 4 sides. A side is not part of the perimeter exactly when the neighbouring cell on that side is land. So perimeter = 4 * land - 2 * (number of horizontally or vertically adjacent land pairs); count each pair once by only looking right and down. Time O(R * C), space O(1) beyond the input.",
    solutions: {
      javascript: code`
        function solve(input) {
          const lines = input.split("\n").map((s) => s.trim()).filter(Boolean);
          const [R, C] = lines[0].split(/\s+/).map(Number);
          let total = 0;
          for (let i = 0; i < R; i++) {
            for (let j = 0; j < C; j++) {
              if (lines[1 + i][j] !== "1") continue;
              total += 4;
              if (i + 1 < R && lines[2 + i][j] === "1") total -= 2;
              if (j + 1 < C && lines[1 + i][j + 1] === "1") total -= 2;
            }
          }
          return String(total);
        }
      `,
      python: code`
        def solve(input_str):
            lines = [s.strip() for s in input_str.split("\n") if s.strip()]
            R, C = map(int, lines[0].split())
            grid = lines[1:1 + R]
            total = 0
            for i in range(R):
                for j in range(C):
                    if grid[i][j] != "1":
                        continue
                    total += 4
                    if i + 1 < R and grid[i + 1][j] == "1":
                        total -= 2
                    if j + 1 < C and grid[i][j + 1] == "1":
                        total -= 2
            return str(total)
      `,
    },
  },
  {
    title: "Breadth-First Traversal of a Graph",
    difficulty: "Easy",
    companies: ["Amazon", "Flipkart", "Microsoft"],
    description:
      "You are given an undirected graph with vertices `0..n-1`. Run a breadth-first search starting from vertex `0`. Whenever a vertex is expanded, visit its unvisited neighbours in **increasing label order**.\n\nPrint the vertices in the order in which they are first visited. Only vertices reachable from `0` appear in the output.",
    constraints:
      "1 <= n <= 2000\n0 <= m <= 5000\nNo self-loops and no repeated edges.",
    inputFormat:
      "Line 1: two integers `n m`.\nNext `m` lines: two integers `u v` describing an undirected edge.",
    outputFormat:
      "The visited vertices in BFS order, separated by single spaces.",
    examples: [
      { input: "5 4\n0 1\n0 2\n0 3\n2 4", output: "0 1 2 3 4", explanation: "Vertex 0 has neighbours 1, 2, 3. Expanding 2 reveals 4, so the order is 0 1 2 3 4." },
      { input: "4 2\n0 2\n1 3", output: "0 2", explanation: "Vertices 1 and 3 are in a different component from 0, so they are never reached." },
    ],
    testCases: [
      { input: "5 4\n0 1\n0 2\n0 3\n2 4", expectedOutput: "0 1 2 3 4", isHidden: false },
      { input: "4 2\n0 2\n1 3", expectedOutput: "0 2", isHidden: false },
      { input: "1 0", expectedOutput: "0", isHidden: true },
      { input: "6 7\n0 5\n0 1\n1 2\n5 2\n2 3\n3 4\n5 4", expectedOutput: "0 1 5 2 4 3", isHidden: true },
      { input: "5 4\n4 3\n3 2\n2 1\n1 0", expectedOutput: "0 1 2 3 4", isHidden: true },
      { input: "6 6\n0 3\n3 1\n1 4\n4 2\n2 5\n5 0", expectedOutput: "0 3 5 1 2 4", isHidden: true },
      { input: "5 10\n0 1\n0 2\n0 3\n0 4\n1 2\n1 3\n1 4\n2 3\n2 4\n3 4", expectedOutput: "0 1 2 3 4", isHidden: true },
      { input: BFS_PERF, expectedOutput: "0 217 1038 1299 988 1193 1311 1370 1403 84 207 549 1042 1335 24 118 920 1091 139 289 404 844 1307 1377 83 127 235 280 547 1085 1384 369 403 581 1135 1321 384 845 294 414 545 809 909 997 33 816 881 929 957 1045 1316 282 534 995 1296 426 427 444 1303 1367 410 479 696 737 1070 1180 1322 961 1089 1154 1178 1185 120 134 796 258 588 1046 1092 1438 221 349 1065 1247 1060 1228 1310 18 1034 1430 1477 291 1187 1416 468 1127 1286 1499 86 199 238 378 523 934 73 959 977 1062 279 656 259 813 1411 1496 82 144 732 935 1005 126 539 613 833 1173 142 494 754 873 1465 1047 1471 434 521 1119 1227 1443 1476 459 647 735 163 169 1208 1233 376 507 850 1069 368 710 830 1473 707 1029 1032 1373 9 582 1205 1459 188 870 1220 161 400 575 739 1188 1249 447 580 608 1288 308 1327 1498 2 269 835 1073 1118 1385 561 653 674 691 1470 260 888 1037 17 715 789 933 1364 39 228 518 741 1035 1314 1463 950 1425 85 550 771 978 250 628 1169 1468 72 219 254 481 324 607 659 962 1116 62 1009 1076 1378 867 965 996 1484 106 153 237 358 377 408 1454 345 466 791 984 1021 1039 190 817 923 1176 1254 348 491 156 320 366 699 1023 1175 1401 113 1267 591 1109 103 138 346 483 1424 198 323 536 287 695 938 1271 448 457 556 747 1256 1490 406 987 1339 201 357 900 167 712 312 23 746 841 843 885 1323 569 453 531 773 1102 1159 1382 46 179 1081 441 998 1439 697 824 1153 1334 1353 1457 262 960 1143 314 440 1018 1190 1328 329 386 596 1133 989 1387 469 412 1452 477 1130 330 1402 164 1261 1421 1483 69 1478 1435 372 1237 1338 49 1458 1152 1391 1410 1414 1093 225 716 825 982 1317 1474 125 648 1101 36 335 458 942 584 717 1294 1388 183 214 876 211 619 114 714 1144 21 148 724 606 757 852 1449 285 456 1255 1383 293 859 945 1386 155 913 991 478 804 1461 665 1031 19 902 1226 832 851 1379 611 734 898 1189 667 806 640 1448 351 416 396 402 415 1058 509 476 568 1041 1325 1348 1423 192 350 361 718 1262 55 604 709 756 1215 92 143 538 1277 1446 1141 1287 108 150 265 277 112 571 943 186 1014 1290 99 774 1170 1250 409 799 3 928 1000 388 602 533 768 1117 63 966 1221 842 1467 948 487 976 1124 42 109 1177 772 776 344 632 890 1113 60 191 633 32 785 1095 895 1324 782 924 336 222 401 473 1453 119 135 1280 16 302 1216 117 430 703 801 1207 8 673 904 374 527 925 940 1368 333 485 926 387 698 1239 664 678 711 1068 276 375 811 66 1442 688 1156 700 193 311 915 519 1103 268 939 243 493 954 1276 1381 814 905 947 1016 1151 1157 1494 692 826 1482 503 185 158 337 253 1405 7 35 812 271 499 765 232 286 317 828 983 1192 1418 1480 728 1417 48 1164 1212 767 1206 1292 681 764 1163 1349 625 682 59 296 1044 1259 1495 202 677 1390 1469 497 546 635 1283 1308 555 572 1084 1281 1363 363 567 1137 184 304 182 689 763 1114 807 862 1217 26 566 637 241 437 956 1354 68 146 97 1191 1420 327 786 1125 1393 1302 815 1232 210 899 1094 322 422 649 1001 1055 53 299 1315 74 110 623 1054 1174 1396 442 537 886 1012 1309 510 310 1245 332 882 1078 1214 1257 1295 290 694 994 524 731 1071 1161 165 605 1312 736 1087 1199 29 51 244 249 500 600 837 15 236 511 1110 356 760 1051 157 1002 1400 234 12 590 1200 743 672 973 1282 212 1122 284 858 911 951 1155 1196 492 540 738 174 451 462 777 398 1006 56 431 1352 484 766 1033 79 246 251 421 432 865 985 1003 326 663 910 1240 252 562 1230 31 1210 1456 355 614 393 669 1433 1167 661 1487 362 1160 1008 1158 603 955 1203 1475 40 1289 461 744 1236 90 172 429 553 1406 1472 168 1319 883 896 822 1360 506 1126 482 1195 1407 787 634 758 1332 542 1028 180 1088 405 154 1279 1404 245 275 576 1213 1346 1451 78 91 515 1285 364 742 1186 1481 215 872 930 897 729 548 1359 373 528 668 1397 75 1395 1096 1345 725 1375 630 1270 1361 645 670 1252 617 65 879 391 980 1426 263 1224 181 810 229 318 513 1201 281 676 1300 1275 123 52 719 1260 300 495 1266 130 216 162 981 1027 1142 1392 1082 684 836 1182 1243 1298 610 839 175 1399 266 471 974 1090 1183 1 1074 1485 4 43 203 1129 564 325 1013 224 449 272 490 1059 1342 1052 418 871 595 34 901 917 597 891 1437 70 209 1148 151 834 1011 820 131 160 1100 399 233 1075 1132 407 80 95 1202 1181 439 775 111 171 520 615 1273 1374 76 223 650 1269 1415 313 535 419 218 570 166 1010 1112 798 1140 1293 921 1336 489 196 1067 1450 321 532 705 101 443 89 1333 1166 1242 1479 579 529 116 436 794 598 208 1409 551 829 912 1447 927 1330 463 420 1231 601 638 371 894 1394 558 953 1355 685 857 1376 1111 1428 44 128 454 748 856 338 283 354 919 149 1145 1248 87 189 616 878 1251 1362 884 986 496 342 1440 589 1057 297 298 1278 240 683 800 1301 803 257 353 25 50 488 423 1072 465 671 1022 105 205 380 848 438 264 631 152 347 908 860 874 1063 93 197 690 752 1222 805 1061 753 1238 122 1138 903 720 586 45 14 722 1427 1444 624 749 530 868 892 6 41 1136 1372 970 204 115 255 866 96 1264 592 627 1079 340 137 247 652 316 10 176 1422 849 1097 1134 381 140 1340 173 365 1318 1462 853 61 383 1241 1343 1099 58 147 213 1024 761 855 288 1398 516 1492 554 863 1048 1121 124 559 28 740 57 693 1347 1219 932 823 1419 446 1441 98 585 657 315 797 931 343 397 889 1104 1108 1223 644 464 733 979 100 1184 574 1326 818 395 328 1020 1026 1351 936 1253 1297 67 445 587 77 54 565 552 1365 1445 305 1086 1171 701 750 1105 200 708 687 704 1304 104 370 907 1244 367 435 599 1329 522 941 999 392 1358 1179 620 893 424 1331 937 1025 1366 267 968 1493 360 512 525 331 334 1464 178 906 1380 573 194 307 1412 261 802 1019 1209 1491 646 1123 612 1049 560 918 1165 621 557 467 107 1356 944 1083 1036 1434 517 1225 239 1168 1313 846 949 1235 1107 177 319 819 1147 563 847 417 577 1320 793 385 274 808 270 1172 292 1150 486 1455 64 854 136 594 827 958 759 861 880 666 784 821 967 1218 686 309 501 352 1486 242 639 359 1291 1115 514 1077 94 877 922 195 475 11 706 341 1050 339 544 914 295 1007 838 1080 502 455 655 1146 1106 428 636 840 379 301 680 504 390 1284 159 1341 662 226 992 713 792 133 762 187 654 609 723 541 474 1246 702 1043 1194 425 1344 578 1337 145 81 1139 1429 1197 643 1066 206 1204 1466 22 508 303 887 1162 869 27 593 141 498 1017 1131 1357 788 1497 121 1305 526 972 470 170 273 778 675 1350 727 779 641 71 452 1030 1128 755 505 13 745 946 1234 726 382 964 875 278 1369 1488 1274 1098 88 460 975 971 1258 963 220 450 38 781 132 1460 916 1056 1389 129 1211 1432 1015 618 583 780 433 472 770 1413 651 543 248 413 227 831 642 1120 622 411 1064 993 660 952 5 480 231 256 790 47 1436 626 969 679 102 751", isHidden: true },
    ],
    hints: [
      "Use a queue: pop a vertex, push its unvisited neighbours.",
      "Sort every adjacency list ascending before the search so neighbours are always taken in label order.",
      "Mark a vertex visited when you push it (not when you pop it) so it enters the queue only once.",
    ],
    editorial:
      "Build adjacency lists, sort each ascending, then run a standard queue-based BFS from vertex 0, marking vertices visited at the moment they are enqueued. The order of dequeuing is the BFS order. Time O(n + m log m) for sorting, space O(n + m).",
    solutions: {
      javascript: code`
        function solve(input) {
          const t = input.split(/\s+/).filter(Boolean).map(Number);
          const n = t[0], m = t[1];
          const adj = Array.from({ length: n }, () => []);
          for (let i = 0; i < m; i++) {
            const u = t[2 + 2 * i], v = t[3 + 2 * i];
            adj[u].push(v);
            adj[v].push(u);
          }
          for (const list of adj) list.sort((a, b) => a - b);
          const seen = new Array(n).fill(false);
          const order = [0];
          seen[0] = true;
          for (let head = 0; head < order.length; head++) {
            for (const v of adj[order[head]]) {
              if (!seen[v]) {
                seen[v] = true;
                order.push(v);
              }
            }
          }
          return order.join(" ");
        }
      `,
      python: code`
        from collections import deque

        def solve(input_str):
            t = list(map(int, input_str.split()))
            n, m = t[0], t[1]
            adj = [[] for _ in range(n)]
            for i in range(m):
                u, v = t[2 + 2 * i], t[3 + 2 * i]
                adj[u].append(v)
                adj[v].append(u)
            for lst in adj:
                lst.sort()
            seen = [False] * n
            seen[0] = True
            queue = deque([0])
            order = []
            while queue:
                u = queue.popleft()
                order.append(u)
                for v in adj[u]:
                    if not seen[v]:
                        seen[v] = True
                        queue.append(v)
            return " ".join(map(str, order))
      `,
    },
  },
  {
    title: "Depth-First Traversal of a Graph",
    difficulty: "Easy",
    companies: ["Amazon", "Flipkart", "Zoho"],
    description:
      "You are given an undirected graph with vertices `0..n-1`. Run a depth-first search starting from vertex `0`. At each vertex, go to the **smallest-labelled unvisited neighbour** first, and backtrack when none is left.\n\nPrint the vertices in the order of their first visit (the DFS preorder). Only vertices reachable from `0` appear in the output.",
    constraints:
      "1 <= n <= 3000\n0 <= m <= 6000\nNo self-loops and no repeated edges.",
    inputFormat:
      "Line 1: two integers `n m`.\nNext `m` lines: two integers `u v` describing an undirected edge.",
    outputFormat:
      "The visited vertices in DFS preorder, separated by single spaces.",
    examples: [
      { input: "5 5\n0 1\n0 2\n1 3\n2 3\n3 4", output: "0 1 3 2 4", explanation: "From 0 go to 1, then 3 (smallest unvisited neighbour of 1). At 3 the smallest unvisited neighbour is 2, and only then 4." },
      { input: "4 2\n0 2\n1 3", output: "0 2", explanation: "Vertices 1 and 3 live in a different component from 0." },
    ],
    testCases: [
      { input: "5 5\n0 1\n0 2\n1 3\n2 3\n3 4", expectedOutput: "0 1 3 2 4", isHidden: false },
      { input: "4 2\n0 2\n1 3", expectedOutput: "0 2", isHidden: false },
      { input: "1 0", expectedOutput: "0", isHidden: true },
      { input: "6 7\n0 5\n0 1\n1 2\n5 2\n2 3\n3 4\n5 4", expectedOutput: "0 1 2 3 4 5", isHidden: true },
      { input: "5 4\n4 3\n3 2\n2 1\n1 0", expectedOutput: "0 1 2 3 4", isHidden: true },
      { input: "7 6\n0 1\n0 2\n1 3\n1 4\n2 5\n2 6", expectedOutput: "0 1 3 4 2 5 6", isHidden: true },
      { input: "6 8\n0 4\n4 5\n5 1\n1 0\n0 2\n2 3\n3 4\n2 5", expectedOutput: "0 1 5 2 3 4", isHidden: true },
      { input: DFS_PERF, expectedOutput: "0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 47 48 49 50 51 52 53 54 55 56 57 58 59 60 61 62 63 64 65 66 67 68 69 70 71 72 73 74 75 76 77 78 79 80 81 82 83 84 85 86 87 88 89 90 91 92 93 94 95 96 97 98 99 100 101 102 103 104 105 106 107 108 109 110 111 112 113 114 115 116 117 118 119 120 121 122 123 124 125 126 127 128 129 130 131 132 133 134 135 136 137 138 139 140 141 142 143 144 145 146 147 148 149 150 151 152 153 154 155 156 157 158 159 160 161 162 163 164 165 166 167 168 169 170 171 172 173 174 175 176 177 178 179 180 181 182 183 184 185 186 187 188 189 190 191 192 193 194 195 196 197 198 199 200 201 202 203 204 205 206 207 208 209 210 211 212 213 214 215 216 217 218 219 220 221 222 223 224 225 226 227 228 229 230 231 232 233 234 235 236 237 238 239 240 241 242 243 244 245 246 247 248 249 250 251 252 253 254 255 256 257 258 259 260 261 262 263 264 265 266 267 268 269 270 271 272 273 274 275 276 277 278 279 280 281 282 283 284 285 286 287 288 289 290 291 292 293 294 295 296 297 298 299 300 301 302 303 304 305 306 307 308 309 310 311 312 313 314 315 316 317 318 319 320 321 322 323 324 325 326 327 328 329 330 331 332 333 334 335 336 337 338 339 340 341 342 343 344 345 346 347 348 349 350 351 352 353 354 355 356 357 358 359 360 361 362 363 364 365 366 367 368 369 370 371 372 373 374 375 376 377 378 379 380 381 382 383 384 385 386 387 388 389 390 391 392 393 394 395 396 397 398 399 400 401 402 403 404 405 406 407 408 409 410 411 412 413 414 415 416 417 418 419 420 421 422 423 424 425 426 427 428 429 430 431 432 433 434 435 436 437 438 439 440 441 442 443 444 445 446 447 448 449 450 451 452 453 454 455 456 457 458 459 460 461 462 463 464 465 466 467 468 469 470 471 472 473 474 475 476 477 478 479 480 481 482 483 484 485 486 487 488 489 490 491 492 493 494 495 496 497 498 499 500 501 502 503 504 505 506 507 508 509 510 511 512 513 514 515 516 517 518 519 520 521 522 523 524 525 526 527 528 529 530 531 532 533 534 535 536 537 538 539 540 541 542 543 544 545 546 547 548 549 550 551 552 553 554 555 556 557 558 559 560 561 562 563 564 565 566 567 568 569 570 571 572 573 574 575 576 577 578 579 580 581 582 583 584 585 586 587 588 589 590 591 592 593 594 595 596 597 598 599 600 601 602 603 604 605 606 607 608 609 610 611 612 613 614 615 616 617 618 619 620 621 622 623 624 625 626 627 628 629 630 631 632 633 634 635 636 637 638 639 640 641 642 643 644 645 646 647 648 649 650 651 652 653 654 655 656 657 658 659 660 661 662 663 664 665 666 667 668 669 670 671 672 673 674 675 676 677 678 679 680 681 682 683 684 685 686 687 688 689 690 691 692 693 694 695 696 697 698 699 700 701 702 703 704 705 706 707 708 709 710 711 712 713 714 715 716 717 718 719 720 721 722 723 724 725 726 727 728 729 730 731 732 733 734 735 736 737 738 739 740 741 742 743 744 745 746 747 748 749 750 751 752 753 754 755 756 757 758 759 760 761 762 763 764 765 766 767 768 769 770 771 772 773 774 775 776 777 778 779 780 781 782 783 784 785 786 787 788 789 790 791 792 793 794 795 796 797 798 799 800 801 802 803 804 805 806 807 808 809 810 811 812 813 814 815 816 817 818 819 820 821 822 823 824 825 826 827 828 829 830 831 832 833 834 835 836 837 838 839 840 841 842 843 844 845 846 847 848 849 850 851 852 853 854 855 856 857 858 859 860 861 862 863 864 865 866 867 868 869 870 871 872 873 874 875 876 877 878 879 880 881 882 883 884 885 886 887 888 889 890 891 892 893 894 895 896 897 898 899 900 901 902 903 904 905 906 907 908 909 910 911 912 913 914 915 916 917 918 919 920 921 922 923 924 925 926 927 928 929 930 931 932 933 934 935 936 937 938 939 940 941 942 943 944 945 946 947 948 949 950 951 952 953 954 955 956 957 958 959 960 961 962 963 964 965 966 967 968 969 970 971 972 973 974 975 976 977 978 979 980 981 982 983 984 985 986 987 988 989 990 991 992 993 994 995 996 997 998 999 1000 1001 1002 1003 1004 1005 1006 1007 1008 1009 1010 1011 1012 1013 1014 1015 1016 1017 1018 1019 1020 1021 1022 1023 1024 1025 1026 1027 1028 1029 1030 1031 1032 1033 1034 1035 1036 1037 1038 1039 1040 1041 1042 1043 1044 1045 1046 1047 1048 1049 1050 1051 1052 1053 1054 1055 1056 1057 1058 1059 1060 1061 1062 1063 1064 1065 1066 1067 1068 1069 1070 1071 1072 1073 1074 1075 1076 1077 1078 1079 1080 1081 1082 1083 1084 1085 1086 1087 1088 1089 1090 1091 1092 1093 1094 1095 1096 1097 1098 1099 1100 1101 1102 1103 1104 1105 1106 1107 1108 1109 1110 1111 1112 1113 1114 1115 1116 1117 1118 1119 1120 1121 1122 1123 1124 1125 1126 1127 1128 1129 1130 1131 1132 1133 1134 1135 1136 1137 1138 1139 1140 1141 1142 1143 1144 1145 1146 1147 1148 1149 1150 1151 1152 1153 1154 1155 1156 1157 1158 1159 1160 1161 1162 1163 1164 1165 1166 1167 1168 1169 1170 1171 1172 1173 1174 1175 1176 1177 1178 1179 1180 1181 1182 1183 1184 1185 1186 1187 1188 1189 1190 1191 1192 1193 1194 1195 1196 1197 1198 1199 1200 1201 1202 1203 1204 1205 1206 1207 1208 1209 1210 1211 1212 1213 1214 1215 1216 1217 1218 1219 1220 1221 1222 1223 1224 1225 1226 1227 1228 1229 1230 1231 1232 1233 1234 1235 1236 1237 1238 1239 1240 1241 1242 1243 1244 1245 1246 1247 1248 1249 1250 1251 1252 1253 1254 1255 1256 1257 1258 1259 1260 1261 1262 1263 1264 1265 1266 1267 1268 1269 1270 1271 1272 1273 1274 1275 1276 1277 1278 1279 1280 1281 1282 1283 1284 1285 1286 1287 1288 1289 1290 1291 1292 1293 1294 1295 1296 1297 1298 1299 1300 1301 1302 1303 1304 1305 1306 1307 1308 1309 1310 1311 1312 1313 1314 1315 1316 1317 1318 1319 1320 1321 1322 1323 1324 1325 1326 1327 1328 1329 1330 1331 1332 1333 1334 1335 1336 1337 1338 1339 1340 1341 1342 1343 1344 1345 1346 1347 1348 1349 1350 1351 1352 1353 1354 1355 1356 1357 1358 1359 1360 1361 1362 1363 1364 1365 1366 1367 1368 1369 1370 1371 1372 1373 1374 1375 1376 1377 1378 1379 1380 1381 1382 1383 1384 1385 1386 1387 1388 1389 1390 1391 1392 1393 1394 1395 1396 1397 1398 1399 1400 1401 1402 1403 1404 1405 1406 1407 1408 1409 1410 1411 1412 1413 1414 1415 1416 1417 1418 1419 1420 1421 1422 1423 1424 1425 1426 1427 1428 1429 1430 1431 1432 1433 1434 1435 1436 1437 1438 1439 1440 1441 1442 1443 1444 1445 1446 1447 1448 1449 1450 1451 1452 1453 1454 1455 1456 1457 1458 1459 1460 1461 1462 1463 1464 1465 1466 1467 1468 1469 1470 1471 1472 1473 1474 1475 1476 1477 1478 1479 1480 1481 1482 1483 1484 1485 1486 1487 1488 1489 1490 1491 1492 1493 1494 1495 1496 1497 1498 1499 1500 1501 1502 1503 1504 1505 1506 1507 1508 1509 1510 1511 1512 1513 1514 1515 1516 1517 1518 1519 1520 1521 1522 1523 1524 1525 1526 1527 1528 1529 1530 1531 1532 1533 1534 1535 1536 1537 1538 1539 1540 1541 1542 1543 1544 1545 1546 1547 1548 1549 1550 1551 1552 1553 1554 1555 1556 1557 1558 1559 1560 1561 1562 1563 1564 1565 1566 1567 1568 1569 1570 1571 1572 1573 1574 1575 1576 1577 1578 1579 1580 1581 1582 1583 1584 1585 1586 1587 1588 1589 1590 1591 1592 1593 1594 1595 1596 1597 1598 1599 1600 1601 1602 1603 1604 1605 1606 1607 1608 1609 1610 1611 1612 1613 1614 1615 1616 1617 1618 1619 1620 1621 1622 1623 1624 1625 1626 1627 1628 1629 1630 1631 1632 1633 1634 1635 1636 1637 1638 1639 1640 1641 1642 1643 1644 1645 1646 1647 1648 1649 1650 1651 1652 1653 1654 1655 1656 1657 1658 1659 1660 1661 1662 1663 1664 1665 1666 1667 1668 1669 1670 1671 1672 1673 1674 1675 1676 1677 1678 1679 1680 1681 1682 1683 1684 1685 1686 1687 1688 1689 1690 1691 1692 1693 1694 1695 1696 1697 1698 1699 1700 1701 1702 1703 1704 1705 1706 1707 1708 1709 1710 1711 1712 1713 1714 1715 1716 1717 1718 1719 1720 1721 1722 1723 1724 1725 1726 1727 1728 1729 1730 1731 1732 1733 1734 1735 1736 1737 1738 1739 1740 1741 1742 1743 1744 1745 1746 1747 1748 1749 1750 1751 1752 1753 1754 1755 1756 1757 1758 1759 1760 1761 1762 1763 1764 1765 1766 1767 1768 1769 1770 1771 1772 1773 1774 1775 1776 1777 1778 1779 1780 1781 1782 1783 1784 1785 1786 1787 1788 1789 1790 1791 1792 1793 1794 1795 1796 1797 1798 1799 1800 1801 1802 1803 1804 1805 1806 1807 1808 1809 1810 1811 1812 1813 1814 1815 1816 1817 1818 1819 1820 1821 1822 1823 1824 1825 1826 1827 1828 1829 1830 1831 1832 1833 1834 1835 1836 1837 1838 1839 1840 1841 1842 1843 1844 1845 1846 1847 1848 1849 1850 1851 1852 1853 1854 1855 1856 1857 1858 1859 1860 1861 1862 1863 1864 1865 1866 1867 1868 1869 1870 1871 1872 1873 1874 1875 1876 1877 1878 1879 1880 1881 1882 1883 1884 1885 1886 1887 1888 1889 1890 1891 1892 1893 1894 1895 1896 1897 1898 1899 1900 1901 1902 1903 1904 1905 1906 1907 1908 1909 1910 1911 1912 1913 1914 1915 1916 1917 1918 1919 1920 1921 1922 1923 1924 1925 1926 1927 1928 1929 1930 1931 1932 1933 1934 1935 1936 1937 1938 1939 1940 1941 1942 1943 1944 1945 1946 1947 1948 1949 1950 1951 1952 1953 1954 1955 1956 1957 1958 1959 1960 1961 1962 1963 1964 1965 1966 1967 1968 1969 1970 1971 1972 1973 1974 1975 1976 1977 1978 1979 1980 1981 1982 1983 1984 1985 1986 1987 1988 1989 1990 1991 1992 1993 1994 1995 1996 1997 1998 1999 2000 2001 2002 2003 2004 2005 2006 2007 2008 2009 2010 2011 2012 2013 2014 2015 2016 2017 2018 2019 2020 2021 2022 2023 2024 2025 2026 2027 2028 2029 2030 2031 2032 2033 2034 2035 2036 2037 2038 2039 2040 2041 2042 2043 2044 2045 2046 2047 2048 2049 2050 2051 2052 2053 2054 2055 2056 2057 2058 2059 2060 2061 2062 2063 2064 2065 2066 2067 2068 2069 2070 2071 2072 2073 2074 2075 2076 2077 2078 2079 2080 2081 2082 2083 2084 2085 2086 2087 2088 2089 2090 2091 2092 2093 2094 2095 2096 2097 2098 2099 2100 2101 2102 2103 2104 2105 2106 2107 2108 2109 2110 2111 2112 2113 2114 2115 2116 2117 2118 2119 2120 2121 2122 2123 2124 2125 2126 2127 2128 2129 2130 2131 2132 2133 2134 2135 2136 2137 2138 2139 2140 2141 2142 2143 2144 2145 2146 2147 2148 2149 2150 2151 2152 2153 2154 2155 2156 2157 2158 2159 2160 2161 2162 2163 2164 2165 2166 2167 2168 2169 2170 2171 2172 2173 2174 2175 2176 2177 2178 2179 2180 2181 2182 2183 2184 2185 2186 2187 2188 2189 2190 2191 2192 2193 2194 2195 2196 2197 2198 2199 2200 2201 2202 2203 2204 2205 2206 2207 2208 2209 2210 2211 2212 2213 2214 2215 2216 2217 2218 2219 2220 2221 2222 2223 2224 2225 2226 2227 2228 2229 2230 2231 2232 2233 2234 2235 2236 2237 2238 2239 2240 2241 2242 2243 2244 2245 2246 2247 2248 2249 2250 2251 2252 2253 2254 2255 2256 2257 2258 2259 2260 2261 2262 2263 2264 2265 2266 2267 2268 2269 2270 2271 2272 2273 2274 2275 2276 2277 2278 2279 2280 2281 2282 2283 2284 2285 2286 2287 2288 2289 2290 2291 2292 2293 2294 2295 2296 2297 2298 2299 2300 2301 2302 2303 2304 2305 2306 2307 2308 2309 2310 2311 2312 2313 2314 2315 2316 2317 2318 2319 2320 2321 2322 2323 2324 2325 2326 2327 2328 2329 2330 2331 2332 2333 2334 2335 2336 2337 2338 2339 2340 2341 2342 2343 2344 2345 2346 2347 2348 2349 2350 2351 2352 2353 2354 2355 2356 2357 2358 2359 2360 2361 2362 2363 2364 2365 2366 2367 2368 2369 2370 2371 2372 2373 2374 2375 2376 2377 2378 2379 2380 2381 2382 2383 2384 2385 2386 2387 2388 2389 2390 2391 2392 2393 2394 2395 2396 2397 2398 2399 2400 2401 2402 2403 2404 2405 2406 2407 2408 2409 2410 2411 2412 2413 2414 2415 2416 2417 2418 2419 2420 2421 2422 2423 2424 2425 2426 2427 2428 2429 2430 2431 2432 2433 2434 2435 2436 2437 2438 2439 2440 2441 2442 2443 2444 2445 2446 2447 2448 2449 2450 2451 2452 2453 2454 2455 2456 2457 2458 2459 2460 2461 2462 2463 2464 2465 2466 2467 2468 2469 2470 2471 2472 2473 2474 2475 2476 2477 2478 2479 2480 2481 2482 2483 2484 2485 2486 2487 2488 2489 2490 2491 2492 2493 2494 2495 2496 2497 2498 2499", isHidden: true },
    ],
    hints: [
      "Recursion is the natural fit, but the path graph in a test can be 3000 deep, so consider an explicit stack.",
      "Sort adjacency lists ascending. For an iterative version keep a pointer into each vertex's list.",
      "Push 0. Repeatedly look at the top vertex: advance its pointer to the next unvisited neighbour and push it, or pop when the list is exhausted. Record a vertex when it is first pushed.",
    ],
    editorial:
      "Build sorted adjacency lists. Use an explicit stack together with a per-vertex index into its adjacency list: look at the top vertex, advance past visited neighbours, and either descend into the first unvisited neighbour (recording it) or pop. This reproduces recursive preorder exactly and avoids stack overflow. Time O(n + m log m), space O(n + m).",
    solutions: {
      javascript: code`
        function solve(input) {
          const t = input.split(/\s+/).filter(Boolean).map(Number);
          const n = t[0], m = t[1];
          const adj = Array.from({ length: n }, () => []);
          for (let i = 0; i < m; i++) {
            const u = t[2 + 2 * i], v = t[3 + 2 * i];
            adj[u].push(v);
            adj[v].push(u);
          }
          for (const list of adj) list.sort((a, b) => a - b);
          const seen = new Array(n).fill(false);
          const ptr = new Array(n).fill(0);
          const order = [0];
          const stack = [0];
          seen[0] = true;
          while (stack.length) {
            const u = stack[stack.length - 1];
            while (ptr[u] < adj[u].length && seen[adj[u][ptr[u]]]) ptr[u]++;
            if (ptr[u] === adj[u].length) {
              stack.pop();
            } else {
              const v = adj[u][ptr[u]++];
              seen[v] = true;
              order.push(v);
              stack.push(v);
            }
          }
          return order.join(" ");
        }
      `,
      python: code`
        def solve(input_str):
            t = list(map(int, input_str.split()))
            n, m = t[0], t[1]
            adj = [[] for _ in range(n)]
            for i in range(m):
                u, v = t[2 + 2 * i], t[3 + 2 * i]
                adj[u].append(v)
                adj[v].append(u)
            for lst in adj:
                lst.sort()
            seen = [False] * n
            ptr = [0] * n
            seen[0] = True
            order = [0]
            stack = [0]
            while stack:
                u = stack[-1]
                while ptr[u] < len(adj[u]) and seen[adj[u][ptr[u]]]:
                    ptr[u] += 1
                if ptr[u] == len(adj[u]):
                    stack.pop()
                else:
                    v = adj[u][ptr[u]]
                    ptr[u] += 1
                    seen[v] = True
                    order.append(v)
                    stack.append(v)
            return " ".join(map(str, order))
      `,
    },
  },
  {
    title: "Employee Importance",
    difficulty: "Easy",
    companies: ["Amazon", "Uber"],
    description:
      "A company stores each employee as a record: a unique `id`, an `importance` value, and the ids of that employee's **direct** subordinates. Every employee has at most one direct manager, so the structure is a forest.\n\nGiven the target employee's id, print the total importance of that employee plus all of their direct and indirect subordinates.",
    constraints:
      "1 <= n <= 2000\nids are unique integers, 0 <= importance <= 100\nEvery listed subordinate id exists, and there are no cycles.",
    inputFormat:
      "Line 1: the number of employees `n`.\nNext `n` lines: `id importance k s1 s2 ... sk` where `k` is the number of direct subordinates and `s1..sk` are their ids.\nLast line: the target id.",
    outputFormat:
      "A single integer: the total importance.",
    examples: [
      { input: "3\n1 5 2 2 3\n2 3 0\n3 3 0\n1", output: "11", explanation: "Employee 1 (importance 5) has subordinates 2 and 3 (importance 3 each): 5 + 3 + 3 = 11." },
      { input: "1\n10 7 0\n10", output: "7", explanation: "The only employee has no subordinates, so the answer is their own importance." },
    ],
    testCases: [
      { input: "3\n1 5 2 2 3\n2 3 0\n3 3 0\n1", expectedOutput: "11", isHidden: false },
      { input: "1\n10 7 0\n10", expectedOutput: "7", isHidden: false },
      { input: "3\n1 5 2 2 3\n2 3 0\n3 3 0\n2", expectedOutput: "3", isHidden: true },
      { input: "4\n7 1 1 9\n9 2 1 4\n4 3 1 5\n5 4 0\n9", expectedOutput: "9", isHidden: true },
      { input: "5\n10 0 3 20 30 40\n20 0 0\n30 0 0\n40 0 0\n50 9 0\n10", expectedOutput: "0", isHidden: true },
      { input: "4\n1000 100 2 5 6\n5 50 0\n6 25 1 8\n8 5 0\n6", expectedOutput: "30", isHidden: true },
      { input: EMP_PERF, expectedOutput: "48989", isHidden: true },
    ],
    hints: [
      "Treat employees as nodes of a tree: an edge goes from a manager to each direct subordinate.",
      "Store employees in a map from id to record, because ids need not be 1..n.",
      "Traverse from the target with a stack (or queue), adding each visited employee's importance. No visited set is needed because the structure is a tree.",
    ],
    editorial:
      "Index the records by id, then do a DFS/BFS from the target employee, summing importance of every node you pop and pushing its direct subordinates. Each employee is visited at most once, so the time is O(n) and space O(n). An explicit stack avoids deep recursion on long management chains.",
    solutions: {
      javascript: code`
        function solve(input) {
          const t = input.split(/\s+/).filter(Boolean).map(Number);
          const n = t[0];
          let p = 1;
          const importance = new Map();
          const subs = new Map();
          for (let i = 0; i < n; i++) {
            const id = t[p], w = t[p + 1], k = t[p + 2];
            importance.set(id, w);
            subs.set(id, t.slice(p + 3, p + 3 + k));
            p += 3 + k;
          }
          const stack = [t[p]];
          let total = 0;
          while (stack.length) {
            const u = stack.pop();
            total += importance.get(u);
            for (const v of subs.get(u)) stack.push(v);
          }
          return String(total);
        }
      `,
      python: code`
        def solve(input_str):
            t = list(map(int, input_str.split()))
            n = t[0]
            p = 1
            importance = {}
            subs = {}
            for _ in range(n):
                eid, w, k = t[p], t[p + 1], t[p + 2]
                importance[eid] = w
                subs[eid] = t[p + 3:p + 3 + k]
                p += 3 + k
            stack = [t[p]]
            total = 0
            while stack:
                u = stack.pop()
                total += importance[u]
                stack.extend(subs[u])
            return str(total)
      `,
    },
  },
  {
    title: "Shortest Path in an Unweighted Graph",
    difficulty: "Easy",
    companies: ["Amazon", "Flipkart", "Microsoft"],
    description:
      "You are given an undirected, unweighted graph with vertices `0..n-1` and a source vertex `src`. For every vertex, print the minimum number of edges on a path from `src` to that vertex, or `-1` if it cannot be reached.",
    constraints:
      "1 <= n <= 2000\n0 <= m <= 6000\n0 <= src < n\nNo self-loops and no repeated edges.",
    inputFormat:
      "Line 1: two integers `n m`.\nNext `m` lines: two integers `u v` (an undirected edge).\nLast line: the source vertex `src`.",
    outputFormat:
      "`n` integers separated by spaces: the distance from `src` to vertex 0, 1, ..., n-1 (`-1` when unreachable).",
    examples: [
      { input: "6 6\n0 1\n0 2\n1 3\n2 3\n3 4\n4 5\n0", output: "0 1 1 2 3 4", explanation: "Vertex 3 is reached in two edges (0-1-3 or 0-2-3), vertex 4 in three and vertex 5 in four." },
      { input: "5 3\n0 1\n1 2\n3 4\n2", output: "2 1 0 -1 -1", explanation: "Starting at 2: vertex 1 is one edge away, vertex 0 two edges away, and 3 and 4 are in another component." },
    ],
    testCases: [
      { input: "6 6\n0 1\n0 2\n1 3\n2 3\n3 4\n4 5\n0", expectedOutput: "0 1 1 2 3 4", isHidden: false },
      { input: "5 3\n0 1\n1 2\n3 4\n2", expectedOutput: "2 1 0 -1 -1", isHidden: false },
      { input: "1 0\n0", expectedOutput: "0", isHidden: true },
      { input: "4 0\n3", expectedOutput: "-1 -1 -1 0", isHidden: true },
      { input: "5 4\n0 1\n1 2\n2 3\n3 4\n4", expectedOutput: "4 3 2 1 0", isHidden: true },
      { input: "6 7\n0 1\n0 2\n1 3\n2 3\n3 4\n4 5\n5 0\n3", expectedOutput: "2 1 1 0 1 2", isHidden: true },
      { input: "7 6\n0 1\n0 2\n0 3\n3 4\n4 5\n5 6\n6", expectedOutput: "4 5 5 3 2 1 0", isHidden: true },
      { input: SPU_PERF, expectedOutput: "9 7 7 5 7 8 7 7 8 8 9 7 6 7 8 5 6 8 6 6 6 7 -1 7 5 8 9 8 8 7 6 9 6 7 9 6 7 7 4 7 7 6 9 7 7 6 8 -1 5 -1 7 9 8 7 5 7 5 -1 5 8 9 10 6 7 7 9 6 10 7 8 7 6 6 7 6 -1 5 9 7 10 8 7 7 8 7 7 8 6 5 -1 7 8 7 8 8 9 8 8 6 7 6 7 6 7 -1 6 9 10 7 -1 7 7 6 5 5 -1 6 8 11 5 10 6 5 6 5 7 10 1 7 7 4 6 8 7 -1 7 4 5 -1 5 8 2 7 6 7 7 7 7 6 5 7 -1 7 7 8 -1 5 7 4 8 8 4 5 6 4 9 6 5 8 -1 5 5 6 7 -1 9 4 9 7 6 9 7 6 5 -1 8 7 5 -1 7 6 7 6 7 4 8 8 -1 7 8 10 7 8 8 9 4 7 10 7 8 7 6 8 2 -1 3 8 6 8 3 -1 8 10 9 7 -1 6 7 5 5 6 6 6 2 8 6 8 8 7 6 8 6 2 7 6 9 -1 7 4 8 7 6 6 6 7 10 7 7 7 6 5 3 8 6 9 7 8 8 8 7 5 9 7 -1 6 7 6 6 7 7 8 -1 -1 6 9 -1 7 5 7 6 8 7 6 8 7 7 8 7 8 5 8 6 -1 8 7 5 6 1 8 7 7 5 8 7 7 7 7 9 9 6 4 7 6 6 8 9 8 9 8 6 5 8 7 6 6 6 -1 3 7 6 7 7 8 8 7 6 8 6 8 8 7 5 7 7 5 9 6 6 6 5 7 7 5 7 7 8 8 4 7 3 7 7 9 7 -1 8 8 5 9 11 8 8 7 7 8 7 6 9 7 9 8 5 5 -1 -1 0 3 -1 8 7 9 6 7 6 5 6 -1 8 5 5 8 10 8 7 6 -1 7 7 7 6 8 6 6 5 8 6 5 7 8 5 7 7 9 11 -1 4 5 7 -1 9 -1 7 8 8 5 5 9 7 6 7 8 6 10 9 5 7 6 5 8 -1 6 10 6 7 7 -1 7 6 8 6 7 7 -1 5 7 7 6 8 4 6 7 8 6 6 7 8 6 4 9 7 -1 6 7 7 7 7 8 7 11 6 5 6 9 7 7 7 8 6 4 7 7 8 5 7 -1 -1 9 5 7 7 7 9 7 7 8 7 6 8 6 5 -1 3 7 7 4 5 -1 8 6 8 7 7 6 7 7 8 -1 7 7 8 -1 6 4 6 7 -1 7 7 7 11 4 6 -1 6 6 -1 9 10 8 6 6 -1 -1 -1 7 4 6 7 8 8 9 4 7 8 7 9 6 4 -1 6 -1 6 6 7 6 7 6 5 9 2 7 8 -1 8 -1 6 7 4 4 5 5 6 8 6 5 9 7 9 9 -1 9 7 7 9 7 8 8 9 7 -1 6 7 8 8 -1 6 4 9 7 7 8 8 -1 10 7 -1 9 6 5 5 8 7 6 -1 7 5 9 7 8 4 6 9 9 8 5 6 7 7 8 7 5 4 6 7 8 4 7 8 7 3 6 5 7 5 6 6 7 10 5 5 7 9 8 -1 5 -1 6 7 8 7 7 7 7 4 9 6 8 5 -1 6 2 5 -1 6 7 -1 8 7 11 7 6 6 -1 4 3 7 9 8 -1 7 5 7 5 8 8 6 7 5 6 5 7 6 6 7 8 4 7 6 1 7 9 7 8 6 7 -1 -1 -1 7 6 8 -1 9 6 7 6 8 -1 9 9 10 8 8 7 7 3 10 7 6 7 4 8 6 5 6 3 6 5 6 7 8 7 5 8 5 8 8 -1 7 6 6 7 6 7 7 5 9 7 7 4 6 -1 7 9 6 12 6 7 8 6 7 7 8 6 7 8 6 6 8 9 9 -1 6 9 7 7 5 8 -1 8 -1 5 5 4 6 8 7 8 7 7 7 9 3 6 8 6 9 8 8 4 4 7 4 -1 7 5 7 9 4 5 7 -1 4 8 6 2 9 8 6 5 6 8 7 7 8 7 6 4 8 7 8 7 -1 7 7 -1 7 7 6 -1 7 -1 4 7 8 9 8 8 9 7 5 8 6 8 -1 6 9 4 8 6 6 -1 8 3 9 7 8 7 5 8 6 7 5 6 6 7 7 9 5 5 8 10 3 6 7 8 5 5 8 7 6 8 4 5 7 6 3 8 3 -1 7 8 -1 6 6 7 7 5 8 6 9 3 5 8 8 8 9 9 -1 -1 1 6 11 7 6 8 5 6 6 7 9 7 8 7 8 8 5 9 6 8 -1 6 9 5 7 7 8 6 4 9 4 10 8 3 -1 8 8 7 3 8 6 6 8 7 7 6 5 5 8 8 8 8 5 8 7 6 5 7 10 6 6 6 5 -1 5 5 8 6 8 7 6 8 6 7 5 8 7 9 8 7 10 9 -1 8 7 -1 -1 -1 6 5 9 8 7 7 10 11 6 6 7 8 4 8 8 7 6 7 9 9 9 7 8 7 7 5 7 7 8 8 6 6 9 8 5 9 9 7 5 -1 9 -1 6 8 6 6 -1 -1 7 10 7 6 8 6 6 8 -1 6 7 5 6 10 7 7 6 10 7 6 6 5 7 6 5 2 7 7 7 -1 6 7 6 6 3 8 6 -1 8 7 7 7 8 6 6 6 5 9 -1 7 5 7 8 6 8 10 5 3 4 6 7 6 8 7 2 5 6 7 7 8 9 7 6 7 8 6 7 -1 7 5 7 7 8 7 6 7 8 -1 8 5 8 6 4 6 -1 4 9 5 5 -1 6 6 9 8 10 4 9 7 8 8 6 6 4 4 4 4 7 7 7 7 7 7 7 5 9 8 6 9 6 5 9 6 7 8 6 9 7 4 4 8 6 6 7 7 7 7 7 7 7 7 7 7 6 4 -1 5 -1 5 7 7 5 -1 6 8 6 6 7 3 -1 6 11 10 7 9 6 -1 6 8 -1 9 8 6 7 6 7 6 7 -1 4 5 7 10 11 -1 -1 8 8 7 9 5 3 9 6 9 6 8 6 8 9 7 7 7 6 10 6 -1 8 7 -1 8 -1 5 8 9 6 6 7 -1 7 8 9 8 8 2 5 -1 4 -1 7 7 6 -1 6 5 6 5 10 8 8 6 8 7 8 7 -1 3 -1 8 8 4 -1 7 7 7 7 7 6 8 5 10 8 5 4 8 7 -1 -1 8 8 7 6 9 -1 8 7 7 6 7 8 4 6 8 7 7 8 5 3 7 6 6 4 8 7 -1 6 6 -1 4 7 5 9 7 -1 8 -1 8 6 7 8 11 5 8 7 6 7 -1 4 10 7 4 8 -1 7 8 5 -1 7 8 7 6 7 8 -1 6 7 7 3 9 6 6 5 8 8 6 8 7 8 7 7 10 7 5 8 -1 7 5 -1 6 9 8 5 -1 7 8 -1 6 5 6 5 -1 6 7 6 8", isHidden: true },
    ],
    hints: [
      "Because every edge costs 1, the first time you reach a vertex is already the shortest way to it.",
      "Use a queue and an array of distances initialised to -1.",
      "When popping u, every unvisited neighbour v gets dist[v] = dist[u] + 1 and is pushed.",
    ],
    editorial:
      "BFS from the source finds shortest paths in unweighted graphs because it explores vertices in non-decreasing distance order. Initialise all distances to -1, set dist[src] = 0, and relax each unvisited neighbour with dist[u] + 1. Time O(n + m), space O(n + m).",
    solutions: {
      javascript: code`
        function solve(input) {
          const t = input.split(/\s+/).filter(Boolean).map(Number);
          const n = t[0], m = t[1];
          const adj = Array.from({ length: n }, () => []);
          for (let i = 0; i < m; i++) {
            const u = t[2 + 2 * i], v = t[3 + 2 * i];
            adj[u].push(v);
            adj[v].push(u);
          }
          const src = t[2 + 2 * m];
          const dist = new Array(n).fill(-1);
          dist[src] = 0;
          const queue = [src];
          for (let head = 0; head < queue.length; head++) {
            const u = queue[head];
            for (const v of adj[u]) {
              if (dist[v] === -1) {
                dist[v] = dist[u] + 1;
                queue.push(v);
              }
            }
          }
          return dist.join(" ");
        }
      `,
      python: code`
        from collections import deque

        def solve(input_str):
            t = list(map(int, input_str.split()))
            n, m = t[0], t[1]
            adj = [[] for _ in range(n)]
            for i in range(m):
                u, v = t[2 + 2 * i], t[3 + 2 * i]
                adj[u].append(v)
                adj[v].append(u)
            src = t[2 + 2 * m]
            dist = [-1] * n
            dist[src] = 0
            queue = deque([src])
            while queue:
                u = queue.popleft()
                for v in adj[u]:
                    if dist[v] == -1:
                        dist[v] = dist[u] + 1
                        queue.append(v)
            return " ".join(map(str, dist))
      `,
    },
  },
  {
    title: "Pacific Atlantic Water Flow",
    difficulty: "Medium",
    companies: ["Google", "Amazon", "Meta"],
    description:
      "An island is divided into an `R x C` grid of cells, each with a height. The Pacific Ocean touches the **top row and left column**; the Atlantic Ocean touches the **bottom row and right column**.\n\nRain falling on a cell flows to an adjacent cell (up, down, left or right) whose height is **less than or equal** to the current cell's height, and it may continue flowing from there. Water that reaches any cell on an ocean's border flows into that ocean.\n\nPrint the **number of cells** from which rain can reach both oceans.",
    constraints:
      "1 <= R, C <= 120\n0 <= height <= 10^5",
    inputFormat:
      "Line 1: two integers `R C`.\nNext `R` lines: `C` space-separated integers (the heights).",
    outputFormat:
      "A single integer: how many cells can drain to both oceans.",
    examples: [
      { input: "5 5\n1 2 2 3 5\n3 2 3 4 4\n2 4 5 3 1\n6 7 1 4 5\n5 1 1 2 4", output: "7", explanation: "Seven cells (for example the 7 in the bottom-left and the 5 in the top-right) can reach both oceans." },
      { input: "1 1\n1", output: "1", explanation: "A single cell touches both oceans at once." },
    ],
    testCases: [
      { input: "5 5\n1 2 2 3 5\n3 2 3 4 4\n2 4 5 3 1\n6 7 1 4 5\n5 1 1 2 4", expectedOutput: "7", isHidden: false },
      { input: "1 1\n1", expectedOutput: "1", isHidden: false },
      { input: "1 4\n3 1 4 1", expectedOutput: "4", isHidden: true },
      { input: "2 2\n1 1\n1 1", expectedOutput: "4", isHidden: true },
      { input: "3 3\n1 1 1\n1 9 1\n1 1 1", expectedOutput: "9", isHidden: true },
      { input: "3 3\n9 8 7\n6 5 4\n3 2 1", expectedOutput: "5", isHidden: true },
      { input: "3 3\n1 2 3\n2 3 4\n3 4 5", expectedOutput: "5", isHidden: true },
      { input: "4 1\n5\n4\n3\n2", expectedOutput: "4", isHidden: true },
      { input: PAC_PERF, expectedOutput: "12", isHidden: true },
    ],
    hints: [
      "Checking each cell separately with a flood fill costs O((R*C)^2). Reverse the direction of the search.",
      "Start from every Pacific border cell and walk uphill (to neighbours with height >= current). Everything you reach can drain to the Pacific. Do the same from the Atlantic border.",
      "The answer is the number of cells reached by both searches.",
    ],
    editorial:
      "Reverse the flow: water can go from A to B when h[B] <= h[A], so from an ocean you move to neighbours that are at least as high. Run one multi-source BFS from all Pacific border cells and one from all Atlantic border cells, marking reachable cells, and count cells marked by both. Time O(R*C), space O(R*C).",
    solutions: {
      javascript: code`
        function solve(input) {
          const lines = input.split("\n").map((s) => s.trim()).filter(Boolean);
          const [R, C] = lines[0].split(/\s+/).map(Number);
          const h = [];
          for (let i = 0; i < R; i++) h.push(lines[1 + i].split(/\s+/).map(Number));
          const mark = (starts) => {
            const seen = Array.from({ length: R }, () => new Array(C).fill(false));
            const queue = [];
            for (const [r, c] of starts) {
              if (!seen[r][c]) {
                seen[r][c] = true;
                queue.push([r, c]);
              }
            }
            for (let head = 0; head < queue.length; head++) {
              const [r, c] = queue[head];
              for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const x = r + dr, y = c + dc;
                if (x >= 0 && x < R && y >= 0 && y < C && !seen[x][y] && h[x][y] >= h[r][c]) {
                  seen[x][y] = true;
                  queue.push([x, y]);
                }
              }
            }
            return seen;
          };
          const pacific = [], atlantic = [];
          for (let r = 0; r < R; r++) {
            pacific.push([r, 0]);
            atlantic.push([r, C - 1]);
          }
          for (let c = 0; c < C; c++) {
            pacific.push([0, c]);
            atlantic.push([R - 1, c]);
          }
          const p = mark(pacific), a = mark(atlantic);
          let count = 0;
          for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (p[r][c] && a[r][c]) count++;
          return String(count);
        }
      `,
      python: code`
        from collections import deque

        def solve(input_str):
            lines = [s.strip() for s in input_str.split("\n") if s.strip()]
            R, C = map(int, lines[0].split())
            h = [list(map(int, lines[1 + i].split())) for i in range(R)]

            def mark(starts):
                seen = [[False] * C for _ in range(R)]
                queue = deque()
                for r, c in starts:
                    if not seen[r][c]:
                        seen[r][c] = True
                        queue.append((r, c))
                while queue:
                    r, c = queue.popleft()
                    for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        x, y = r + dr, c + dc
                        if 0 <= x < R and 0 <= y < C and not seen[x][y] and h[x][y] >= h[r][c]:
                            seen[x][y] = True
                            queue.append((x, y))
                return seen

            pacific = [(r, 0) for r in range(R)] + [(0, c) for c in range(C)]
            atlantic = [(r, C - 1) for r in range(R)] + [(R - 1, c) for c in range(C)]
            p, a = mark(pacific), mark(atlantic)
            return str(sum(1 for r in range(R) for c in range(C) if p[r][c] and a[r][c]))
      `,
    },
  },
  {
    title: "Surrounded Regions",
    difficulty: "Medium",
    companies: ["Amazon", "Google", "Meta", "Microsoft"],
    description:
      "A board is an `R x C` grid of `X` and `O` characters. A region is a group of `O` cells connected horizontally or vertically. A region is **surrounded** when none of its cells lies on the border of the board (first/last row or first/last column).\n\nCapture every surrounded region by turning all of its `O` cells into `X`. Regions that touch the border are left untouched. Print the resulting board.",
    constraints:
      "1 <= R, C <= 150\nEach cell is `X` or `O`.",
    inputFormat:
      "Line 1: two integers `R C`.\nNext `R` lines: a string of `C` characters, each `X` or `O`.",
    outputFormat:
      "`R` lines, each a string of `C` characters: the board after capturing.",
    examples: [
      { input: "4 4\nXXXX\nXOOX\nXXOX\nXOXX", output: "XXXX\nXXXX\nXXXX\nXOXX", explanation: "The O at the bottom row touches the border and survives; the three connected inner O's are fully enclosed and are captured." },
      { input: "1 1\nO", output: "O", explanation: "A lone O is on the border, so nothing is captured." },
    ],
    testCases: [
      { input: "4 4\nXXXX\nXOOX\nXXOX\nXOXX", expectedOutput: "XXXX\nXXXX\nXXXX\nXOXX", isHidden: false },
      { input: "1 1\nO", expectedOutput: "O", isHidden: false },
      { input: "1 1\nX", expectedOutput: "X", isHidden: true },
      { input: "3 3\nXXX\nXOX\nXXX", expectedOutput: "XXX\nXXX\nXXX", isHidden: true },
      { input: "3 3\nOOO\nOXO\nOOO", expectedOutput: "OOO\nOXO\nOOO", isHidden: true },
      { input: "5 5\nOXXXO\nXOOOX\nXOXOX\nXOOOX\nOXXXO", expectedOutput: "OXXXO\nXXXXX\nXXXXX\nXXXXX\nOXXXO", isHidden: true },
      { input: "4 5\nXOXXX\nXOOXX\nXXOXX\nXXXXX", expectedOutput: "XOXXX\nXOOXX\nXXOXX\nXXXXX", isHidden: true },
      { input: "2 4\nOOOO\nOOOO", expectedOutput: "OOOO\nOOOO", isHidden: true },
      { input: "3 4\nXXXX\nXOOX\nXXXX", expectedOutput: "XXXX\nXXXX\nXXXX", isHidden: true },
      { input: SURR_PERF, expectedOutput: "OXOOOOOXOOXXOOOXOXOXXXXXXOXOOXOXOOXOOOOXXXXOOXXXOOXOOOOOOOXXXOOOOXXXXOXOOXXXOXOXXOXOOOXOOXXOXOOOOOOXOXOXXXOXXOXOXXOXOXOXXOOXXOXXOOXOXOXXOOXXOOXOOXXOXO\nXXOXOOOXOOXXOXXOOXOOOXXOXXOOOOOOOOOOOXXOOOXOOXXXOXOOXOXOOOOXXOOXXXOOXOOOOXXOOXXXXXXOOOOOXXOOXXOXXXOOOOOXXXOXXOOOOXOXOOXOOXOXXOXOXOOOOXXXOXXOOXOOOXOXXX\nXOOXXXOOXOXXXXXOOOOOXXOOOOXXOXXXOOOOOOXOOOOOOOXOXOOXXXXXXOXXXOXOOOOXXOOXXXXXOXXXXXXOOOXOOOXOXOOXOOXOOXXXXXOOXXXXXXXOOOOOOOOOXOOOOOOXXXXXXXXXOXOOXOOXXX\nOXOOOXOOXOOXOOOOXXOOXXXXOXOOOOXOOXOOOOOXOOOOOXOOOXOOXXXXXOXXXXXXXOOOOOXXXXOOOOXXXXXXXOOXOOXOXOOOOXXOXXXXXXXXXXOXOXOOOXOXXXOXXOXOOXOXOOXXXXXXOXXOXOXOXO\nOXOOOOXOXXOOOOOOXOXOXXXXOOOOXOXOXXOOXOOOOOOOOOOOXXOXXXXXOOXXXXXXXXXOOXXXXXOOOOXXXXXXXXXXXOXOXOOXXXOOOXXXXXXXXXOOOOOXXXXXXXXXXOXOXXOXXOXXXXXXOXOOOOOOXX\nOOXXOXXOOXXOOOOOOOXOXXXXXXOOXXOOOXOXXOXXOOOOOXOOXXOOOXOOOXXXXXXXXXOOOXXXXXOXXXXXXXXXXOOOOOXXOOOOXXOXXXXXXXXXXXXOXOXXXXXXXXXXXXOXXXXOOOXXXXXXOOOXXXXXOO\nOOOOOXXXOOOXOOOXXOOXOOXXXOOXXXOXOOOXOOXXOXOXXXOXOXOOOXOOXXXXXXXXXXXOXXXXXXXXXXXXXXXXXXOOOOXXOXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOXXXOOOOXXXXXXXXOOOOOX\nOOOXOOXOOOXOOOOXXXOXXOOXXOOOXOOOOXOOXOXOOXXXXXXOOOXOOXOOXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXXOOOOOOOXOXXXXXXXXOXOXX\nXOOOOXXXXOXXXOXXXOOOXXOOOXXOOOOOOXOXXXXOXXXXXXXOOOOOXXXOOOOXXOXXOOXXXXXXXXXXXXXXXXXXXXOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOXOXOXOOXXXXXXXXXXOO\nOOXOXXXXOOOOOXXXXOOXOOXOOOXXXXOXXXOXOOXXOOOXXOXOOXXOXXXXOOOOXOOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXOXOXOOOOXXXXXXXXXXXXO\nXOXXXXXOXOXXOOXXOOXOOOOXXOOXOOOXOOOOOOOXOOOXOOOOOOOOOXXOOXXOOXOOOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOXXOOXXXXXXXXXXOOO\nOXOOXXXOXOOOXXXXXXOOXOOOXOXXOXXXOXOXOXOOOXOXXXOOOXOXXXOOOXXOXOOOXXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOXXXOOXXXXXXXXXXOXO\nOOOXXXOOOXOOOOOOXXOOXOOOXOOOOOOXXXOXXOOOXXOOOXOOXXOXXOOOOOXOOOXXXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXOOXXOXXXXXXXXXOOO\nOXOOXXXOOOOOOOXOOOOXOOXXXOOOOOOOOOXXXXXXOOOOOOXOOOOOXXOOXXXXOXXXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOXXOOOOXXXXXXXXXXOX\nXXXOOXXOOOXOXOOOXOOOOOXOXXOOXOXOXXXXXXXXXXXXOXXXOOOXXXOXXXXXOOXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOOOOXXXXXXXXXXXOX\nXXOOXXXXXOXOOOOXXOOXOXOOXOOOOOOXXXXXXXXXXXXXOOXXXOXXXXXOXXXXXOOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOXOOOOXXXXXXXXXXX\nOXXXXXXXXXXXXXOOOOXOOOXOOOXXOOXXXXXXXXXXXXXXXXXXXOOXXXXOOXOOOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOXOOXXOOXXXXXXXXXXXO\nOOOXXXXXXXXOOOOXXXXXOOXXXOOXOOXXXXXXXXXXXXXXXXXXXXXXOOOOXOXOOXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOXOOOOXXXXXXXXXXXXX\nOOOXXXXXXXXXOXXXXXXOOXXXXXOOXOOXXXXXXXXXXXXXXXXXXXXXXXXOOOXOXXXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOXOOXOXXXXXXXXOXXX\nOXXXXXXXXXXXXXXXXXXOOOXXXXXOXOOXXXXXXXXXXXXXXXXXXXXXXXXXOOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXXXXXOOOXOOXXXOXOXXX\nOXXXXXXXXXXXXXXXXXXOXOOOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOXXXXOOOOOXXXOOOOOX\nOOXXXXXXXXXXXXXXXXXOOXXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOXOXXXOXOXOXXXOOXXOO\nOXXXXXXXXXXXXXXXXXXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOXXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOXXXXXOXXXXXXXXOXX\nXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOXOXXXXOXOOOXXXXOOOOX\nXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOXXXXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXXOXXOOXXXXOOXXOOXOO\nXXXXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXOXOOXXOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXXOXOXOOOOOOOXXXOOXXXXOXOOXXXO\nOXXXOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOXOOXOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOOOOOXXOXOOXOOXOXXOOOXXXXXX\nXXXXXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOXOXXOXXOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOXXOOOOOOXXXOOOXOOOOOOOOOXOXOXO\nOOOOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOXXXXXOOXOXOXOOXOOXOOOOOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXOOOOOOXXOXXOXOXOXOXOOXXOXOOOOO\nOXOOXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXXXOOOOOXOXOOOOOOOOOXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXXXOOXOXXXOOXOOOOOOXOXXXXOOXOXXXO\nXOOXOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOXXOXOXOOOOOOOOOOOOXXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXOOOOXOOXXXOOOXXOOXXXXXXOOOOOOXOO\nXOOXXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXOOXXOXOXOXOXXOOOXOOXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOOXOOOXOOXXXXXXXOXXOOOOXXOXOXOXXX\nOOOXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOXOOXXXXXXXOXOOOOOOXOOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOXXOOXOOOXOOOXXXXXOOOOOOXOXOXOOO\nOXOXXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXOXOOXXXXXOOOOOXOXOOXXXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOXOXOOOOOOXXXXXXXXOXXOOOOOOOOXX\nOXXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOXXOOOOXOXOOOXXOOOOOOOOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOXOXXXOXXXXOOXXXXOOOOXOXOXOOOXOOO\nOOOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXOOOOOOOXOOXXOOOOOXOOXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOOXXXXXXXXXXXXXXOXXXOXXXXOXXXXO\nXOOXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOXXXOOOXXXXOOXXXXOOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOXXXXXXXXXXXXXXOOOOXXOOOXXXXOXXXX\nOXOOXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOOXOOXXXXXOOXOOOXOOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOXXXXXXXXXXXXXXXOXXOXXXOOXXXOOXXOO\nOOOXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXOOOXXOOOXOXXXOXOXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOXOOOXXXXX\nOOXXXOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOOXOOOXOXXXOXOXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOXOOOXXX\nXXOOOXOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXOOOOOOXOOOOXOXOXXOXXXXXXXXXXXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOXXXOOOOOO\nOXOOXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOXOXOOXXOOXOOOOXOOXXXXXXXXXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOXXOXOXXXXXXOOOOO\nOOOXXXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOXOXXXOXOXOOOOXOXOXXXXXXXXXXOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOOOOOXXXXOXXOOOO\nXOXXXXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXOOOOOOXOOOXOOOOOOXXXXXOXXXXOOOOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXXOOOXXXXOOXOOOXO\nOOOOOXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOXOOXOXOOXOOXOOXXXOXOOOOXXXOXOOOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOXOOOOOOXXX\nOXXOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXXOOOOOXOOOOOOOOXOOOOOXXXOOXXXOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOXOXOOXOXXXXXO\nXXXXXXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXXOOOOXOOOOOOXOOXOXOOXXOXXXXXOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXOOXXOOXOXOOXO\nXXXXXOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOOOOOXXXXXXOXOOXOOOOOOOXXXXOOOOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOXXXOOOXOXOO\nOOXXOOOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOXOXXOOOOXXXXXXOXXXOXOXOOOXOOOXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXXXXXXXOOOOOX\nOOXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOXOOOXOOOOOXXXXOXOXOOXXOXOXOOXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXXXXXXXOXOOOO\nOOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOOXOOOOOXXXXXXOOOOXXXOOOXOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOXOOX\nXXOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOXXOOOOOXOOXOOXXXXXXOXOXOXOOOXOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXOOO\nOXXOOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOXXOOXOXOXOOOXXOXOXOXXOOOOOOOXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXO\nOXOOXXOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOXOOOXOOOOXXOOOOOOOOXOXOXOXOOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOO\nXXOXXXOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOXXOOOXOXOXXXXOOXOXOOOXXOXOOXOXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX\nOOOXXXXXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXOOOXXXXXOXXXXXXXXOOXXOOOXOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXO\nXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOXXOOOOOXXXXOOXXOOOXXXOOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXO\nXXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOXOOOOXXXXXXOOOXOXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX\nXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOOXXXXXXOOOXXOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX\nXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXOOOXXXXXXXXXOOOOXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX\nOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOXXXXXOOOOOXOXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX\nOOXXXXXXXXXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOXXXXOOOOOOXXXOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOXO\nOOXXXXXXXXXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOXOOOOOXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOO\nXXXXXXXXXXOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOXXXOOOOXOXOOOOOXXXXXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXOX\nOOXXXXXXXOOXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOXOOXXOOOXOXOXOOXXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOO\nOOOXXXXXOOOXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXOOOOOOXOOXXOXOOOOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOXOX\nOXOOXOXXXOXXXOXXXXXXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXXXOXXOOOOOOOOOXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOXOOXXOO\nXOOOXOXXXOXXXXXXXXOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOXXOOOOOOOOXOXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOXOOOO\nXXXOOOOXXOOOOXXXXXOXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOXOXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOXOOXXOXOO\nOXXXXXXXXOOOOOOXOXOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXXOOOOOOXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOXXOOXOXXO\nOXXXOOOXOXOOOXOOOOOXOXXXXXXXXXXXOXXXXXXXXXXXXXXXXXXXXXOOOOOOXXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXXOOXXXXOOXX\nXXXXXXOOOOOOOXOXXXXOOOXXXXXXXXOOOOXXXXXXXXXXXXXXXXXXXXOXXOXOOXXOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXOXOOOXXXXXOOX\nXXXXXXOOXXOOXXXXOOOOXOOXXXXXXXOXXXXXXXXXXXXXXXXXXXXXXOOXXOOXOXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOXOXXXXXXXOX\nXXXXXXXXXXXXXXXXXXXOOOXXXXXXXXOXXXXXXXXXXXXXXXXXXOOOOOXOOOOOXOOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOXOOXOXXXXOXXXX\nXXXXXXXXXXXXXXXXXXXXOOOXXXXOOXOXXXXXXXXXXXXXXXXXXXOXOXOOOXOOOOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXOXXXOOOOOXXOOXOO\nXOOXXXXXXXXXXXXXXXOOOOXXXXXXOOOOXXXXXXXXXXXXXXXXXXXOOOOXXXXXOOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOXXXXOOXOXXXOXOX\nOOXXXXXXXXXXXOOXXOOOXOXXOOXXXOOOOOOOOOXXXXXXXXXXXXXXOXOXXXXXOOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOXOOXXOOOXOXXXOXXX\nOOXXXXXXXXXXXXOOOOOXOXOOOOXOOOOXXOOOOXOXXXXXXXXOOXOOXXXXXXXOOXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXOOOXXOOOOOOXXXOXXO\nOXOOXXOXXXXXXOOXOOOOOOOOOOXOXOOXXXXOOOOOXOXXXOOOOXOOXXXXXXXOOXXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXXXOOXOXXXXXXOOOO\nOOOOOOOXXXXXXXXXXOXOOOOOOOOOXXOXXXXOXOOOOOXXOOXOOOOXXXXXOXOOOXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOXXXOOXXXXXXXXXXXX\nXOOXXOOOOXXXXOXXOOXXXOOOXOXXOOXXXOXXOOXXOOOXOOXOXXOXXXXOOOOOXOXOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXOOXOOOXOXXXXXXXOXX\nXOOOOOOOXOXXXOOOXXOOOXXOXOXOOXXXOOOOOOOOOXOOOXOXOXXXOXOOXXXXOOOXXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOXXXOOXXXXXXOOOO\nXOXOXOOXOOOXOOOOOOXOOOXOXXXOOOOOXOXOOXOXOOOOOXOXOOXXOOOOOOXXXXOXOXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXOOOOOOXXXOXXOOXXX\nXXOOOOXOOXOOOOXOOOXOXXXOXXXOXXXOOOXXOXXXXXOXOXOOOXOOOXOXXXXXOOOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOXXXXXXXXXOOOXOOOX\nXOOXXOXOXXXXXXOOOXXOOOOXXXOOXOOOXOXXXXXXOOOOXXXOOXOOXOOXOOOOOXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXXXXXXXXXXXXOXOXXOO\nOOXXXXXOXXXXXXOOXXOOXOOXXOOOXOOOXXXXXOOOOOOXOOOOXOOXOXXOOXXOOOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOOOO\nOOXXXXXXXXXXXOXOOOXOOXOOOOXXOOOOXOOXXOXOXOXOOOOOOOOOOOXOOOOXOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOO\nOXXXXXXXXXXXOOOOOOOOOXOXXXXOOOXOOOOOXXXXXOOOXOXXXOOOXOXOOOXOOOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOO\nXXXXXXOXXXXXXOOOXOXOXXXXXXXXOXXXXOXOXOXOXOOXXXXXXXOXXOOOOOOXOXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXO\nOOXXOXOOXXXXOOXXXOXXXXXXXXXXXXXXXXOOXOOOXOXXXXOXXOOOXXOXOXOOOXXOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX\nOXXOOOOOOXXOXOOOXOXXXXXXXXXXXXXXXXXOOOOOOXXXXXOOOOXOOOXXXXXXXXOOXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXXXXXXXXXXXXXOX\nXXXXOOOOOOOOXOOXXXXXXXXXXXXXXXXXXXXXXXOOOOOXXOOOOXOXXOOXXXXXXXOOOXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOXOXXXXXXXXXXOO\nOOXXOXXOOXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXXXOXOOOOOXXOXXXXXXOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOXXXXXXXXXXXX\nOOXOOXXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXXXXXXXXXXXXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOXXXXXXXXOOXO\nOOOOOXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOXXXXXXOOOOO\nXOXXXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOXXXXXXXXXO\nXOOOOOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOXXOXXXXXXXXXOO\nXXOXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOXOOXXXXXXOOOX\nOXOOXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOXOOXOOXXXXXOXOO\nXOOOOXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOXOXXXXXXXXOOOX\nOOXXOXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOOXXXXOOXOX\nXXOOOXOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOXXOOXOXOXO\nOOXOXOOXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOOOOXOOO\nXOOXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOXOXOXXXXX\nXOOXOXXXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOXOOOXXXXX\nXXOOOXXOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXXXOXXXXXX\nXXOXOOXOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXXXOXX\nXOOOOOOOXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOXX\nXXOXXOXOOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXOOOXXX\nOOXXXXXXXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOOOO\nOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOXX\nOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOXXXO\nOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXXOOOOOXXO\nOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOOOOXXO\nXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXOOXX\nOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOXXOXX\nOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOXOXXXOXO\nOXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOXXOO\nXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOXOXOOO\nOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOXOOOO\nXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXXXXX\nXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOXXOOXOOXXXXOXXXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXO\nXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOXOOOOXOOXOXOOOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOO\nOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXOXXOXXOOXOOOOXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXO\nXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXOXOOOOOOOOOXOXXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX\nXXXXXXXXXXXXXXXXXXXXOXXXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXOXOOOXOOOOXOOOOOXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX\nOXXXXXXXXXXXXXXXXXXXOXXXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOOXXOOXXXOOOOOOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX\nOXXXXXXXXXXXXXXXXXOOOOXXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOOXOOOXXOOOOOOXXXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXO\nXXXXXXXXXXXXXXXXXXXXOXXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXXXXXOXXXXOXXXXOOXXOOOOXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOXXO\nXXXXXXXXXXXXXXXXXXXXOOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOOXOOOXXOOOXXXXXOOOXXOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOO\nOXXXXXXXXXXXXXXXXXOOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXOOOOOOXXOOOXOXXXXXOXOOXOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXOX\nOXOOXXXXXXXXXXXXXOOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOXOOXOOOOOXOOXXXOXOOXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXOO\nOOOXXXXXXXXXXXOOOOOXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOXOXXOOOXXXOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOO\nXOOOXXXXXXOXXXOOXOOXOOXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOOXOXOOXOXXXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXO\nXOOOOOXXXOOXOXXXXOOXOOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOXOOOOOXXXOOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX\nXOOOOOXXXOOOOXXXXXOOXOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOXOXOOXXXOOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXXXXO\nOXOOXOOXOOOXXXXXXXOOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOXOOOOOOXOXXXOOXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOXXXOO\nOXOXXXOOOOOOOXXXXXOOXXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXOXXXOOXXOXOXOOOOXXXOOOOOOXXXXXXXXXXXXXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOXOXOOX\nXXOXXXOXOOOOOXXOXOOOXXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOXXOXXXOOOOOOXXOOOOOOXXOXXXXXXXXXXXXXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOXOOOXOXX\nXXXXXXOOXOOXOOXOOOXXOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXOXOXXXOXXXOOOOOOOXOOOOXOOOOOOXXXXXXXXXXXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOXOXOOXOO\nOXXXXOOOXXXXOOOOXOXXOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOXXXOXOXXOOOOXXXOOOOXXOXXOOOXXXXXXXXXOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOXOOOOOXXXXO\nXXXOOXXXXXXXOOOOXXXXOOXXXXXXXXXXXXXXXXXXXXXXXXXOOXOXOOOOOOOOOOXOXXOOOOOOOOXOOOXXXXXXXXXXOOOOXXXXXXXXXXXXXXXXXXXXXXOOOOXXXXXXXXXXXXXXXXXXXXOOXOXOXOXXXO\nOOOOOOXXXXXXXOXOXXXXXOOXXXXXXXXXXXXXXXXXXXXXXXXXOOOXOOXXOXXOXOOOXOOOOXOXXXOOOXXXXXXXXXXXXXOOOOXXXXXXXXXXXXXXXXXOOOOXXOOXXXXXXXXXXXXXXXXOXOXOOXOOOOOXOO\nXXOXOXXXXXXXXOOOOXXOOOOXXXXXXXXXXXXXXXXXXXXXXXXXXOOXXOOOXOXOXOXOXOOOOOXXOOOXOXXXXXXXXXXXXXXOXOXXXXXXXXXXXXXXXXOOXXOXOXOOXXXXXXXXXXXXXOOOOOXXXOOOXOOXOX\nOXOOXOXXXXXXXXOOOOOOOXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOOOXOXOOXXOOXOXOOXXXOOXXXXXXXXXXXXXOOOXOOXOXXOXXXXXXXXXOXXXXXOOOOOXXXXXXXXXXXOOXOXXXXOOOOOOOOOX\nXXXXOOXOXXXXXXXXOOXOXXXXXXXXXXOOXXXXXXXXXXXXXXXXXXXXXOXOOXXXXXOOOOOOOOOOOXOXOXXXXXXXXXXXXOXOOOOOXOOOOOXXXXXXXOOXXXOOOOOOOXXXXXXXXXXXXOOXOOXXXXOOXXXOOO\nXXXOOOOOXXXXXXXOOXXXXXXXXXXXXXXOOXXXXOXXXXXXXXXXXXOOOOXXXXOOXOOOOOXXOOOXXXOOXXXXXXXXXXXXOOOXOOOOOOXXOOXXXXXXXOOXXXXXOOXOOXXXXXXXXXXOOOOOXOOOXXOXXXXXXX\nOOXOOOOXXXOXXXOOXXXXOOOXXOXXXXXOXXXXXOXXXXXXXOOXXXOXXOOOXOXOOOXXXXOOOOXXXOOOXOXXXXXXXXXOOXXOOXXOXOOXOOXXXXXOOOOOXXOOXOOXXXXXXXOXXXXXOOOOXOOXXXOOXXXXXO\nXOOOOOXXOXOOXOOOOXOOXOOOXOOOXXOOXOOOXOOXXXXXOOOXXXOOXOOOXOOOXOOXXXOOOOXXXOXOOOOOXOXXXXXOOXXOOXOOOXXOXOOOOXOOXOOXXOOOXOXOOXXXXOOOXOXXOXOXOOOXXOOXOOOXOO\nXOOOOOXXOXOXXXOOOXOOOOOOOOXXXOOOOOOOXOOXXXXOXXOOXOOOXOOXOXXXXOXXOXOOXXOXXOOOXOXOOOXOXXOOXXOOOOXXOOXOXOOXOXOOXOOXOXXOOOOOOXOOXXXOXOOOOXXOOOXOOXOOOXOOOX", isHidden: true },
    ],
    hints: [
      "Deciding for every region whether it reaches the border is awkward. Flip the question: which O cells are safe?",
      "Every O on the border is safe, and so is every O connected to one. Run a BFS/DFS from all border O's and mark everything reachable as safe.",
      "Afterwards every unmarked O becomes X. Use an iterative search so a 150x150 board cannot overflow the recursion stack.",
    ],
    editorial:
      "Do a multi-source BFS from every border 'O', marking the connected O cells as safe. Then scan the grid: an 'O' that is not marked is surrounded and becomes 'X'. Time O(R*C), space O(R*C) for the queue and marks.",
    solutions: {
      javascript: code`
        function solve(input) {
          const lines = input.split("\n").map((s) => s.trim()).filter(Boolean);
          const [R, C] = lines[0].split(/\s+/).map(Number);
          const g = [];
          for (let i = 0; i < R; i++) g.push(lines[1 + i].split(""));
          const safe = Array.from({ length: R }, () => new Array(C).fill(false));
          const queue = [];
          const add = (r, c) => {
            if (g[r][c] === "O" && !safe[r][c]) {
              safe[r][c] = true;
              queue.push([r, c]);
            }
          };
          for (let r = 0; r < R; r++) {
            add(r, 0);
            add(r, C - 1);
          }
          for (let c = 0; c < C; c++) {
            add(0, c);
            add(R - 1, c);
          }
          for (let head = 0; head < queue.length; head++) {
            const [r, c] = queue[head];
            if (r > 0) add(r - 1, c);
            if (r + 1 < R) add(r + 1, c);
            if (c > 0) add(r, c - 1);
            if (c + 1 < C) add(r, c + 1);
          }
          const out = [];
          for (let r = 0; r < R; r++) {
            let row = "";
            for (let c = 0; c < C; c++) row += g[r][c] === "O" && !safe[r][c] ? "X" : g[r][c];
            out.push(row);
          }
          return out.join("\n");
        }
      `,
      python: code`
        from collections import deque

        def solve(input_str):
            lines = [s.strip() for s in input_str.split("\n") if s.strip()]
            R, C = map(int, lines[0].split())
            g = lines[1:1 + R]
            safe = [[False] * C for _ in range(R)]
            queue = deque()

            def add(r, c):
                if g[r][c] == "O" and not safe[r][c]:
                    safe[r][c] = True
                    queue.append((r, c))

            for r in range(R):
                add(r, 0)
                add(r, C - 1)
            for c in range(C):
                add(0, c)
                add(R - 1, c)
            while queue:
                r, c = queue.popleft()
                if r > 0:
                    add(r - 1, c)
                if r + 1 < R:
                    add(r + 1, c)
                if c > 0:
                    add(r, c - 1)
                if c + 1 < C:
                    add(r, c + 1)
            out = []
            for r in range(R):
                out.append("".join("X" if g[r][c] == "O" and not safe[r][c] else g[r][c] for c in range(C)))
            return "\n".join(out)
      `,
    },
  },
  {
    title: "Shortest Path in Binary Matrix",
    difficulty: "Medium",
    companies: ["Amazon", "Google", "Meta", "Uber"],
    description:
      "You are given an `n x n` grid of `0` (open) and `1` (blocked). A clear path runs from the top-left cell `(0, 0)` to the bottom-right cell `(n-1, n-1)`, moving between cells that share an edge **or a corner** (8 directions), and every cell on the path must be `0`.\n\nPrint the length of the shortest clear path, counted as the **number of cells** on it (including both ends), or `-1` if no clear path exists.",
    constraints:
      "1 <= n <= 300\nEach cell is `0` or `1`.",
    inputFormat:
      "Line 1: the integer `n`.\nNext `n` lines: a string of `n` characters, each `0` or `1`.",
    outputFormat:
      "A single integer: the number of cells in the shortest clear path, or `-1`.",
    examples: [
      { input: "2\n01\n10", output: "2", explanation: "Move diagonally from (0,0) to (1,1): two cells on the path." },
      { input: "3\n000\n110\n110", output: "4", explanation: "Go right along the top row, then down the right column (or cut the corner at the end): four cells in total." },
    ],
    testCases: [
      { input: "2\n01\n10", expectedOutput: "2", isHidden: false },
      { input: "3\n000\n110\n110", expectedOutput: "4", isHidden: false },
      { input: "1\n0", expectedOutput: "1", isHidden: true },
      { input: "1\n1", expectedOutput: "-1", isHidden: true },
      { input: "3\n100\n010\n000", expectedOutput: "-1", isHidden: true },
      { input: "3\n010\n010\n010", expectedOutput: "-1", isHidden: true },
      { input: "4\n0001\n1001\n1100\n0110", expectedOutput: "4", isHidden: true },
      { input: "5\n00000\n11110\n00000\n01111\n00000", expectedOutput: "13", isHidden: true },
      { input: "3\n000\n000\n000", expectedOutput: "3", isHidden: true },
      { input: BIN_PERF, expectedOutput: "339", isHidden: true },
    ],
    hints: [
      "All moves cost the same, so think of the grid as an unweighted graph with up to 8 neighbours per cell.",
      "Breadth-first search from (0,0) reaches each cell first along a shortest path. Check that the start and end are open.",
      "Store the path length (in cells) together with the position in the queue, or keep a distance grid, and mark cells as visited when they are enqueued.",
    ],
    editorial:
      "Treat open cells as nodes with edges to their 8 open neighbours and run BFS from the top-left cell, starting with length 1. If the start or end is blocked the answer is -1. The first time the bottom-right cell is dequeued its distance is minimal. Time O(n^2), space O(n^2).",
    solutions: {
      javascript: code`
        function solve(input) {
          const lines = input.split("\n").map((s) => s.trim()).filter(Boolean);
          const n = Number(lines[0]);
          const g = lines.slice(1, 1 + n);
          if (g[0][0] === "1" || g[n - 1][n - 1] === "1") return "-1";
          const dist = Array.from({ length: n }, () => new Array(n).fill(0));
          dist[0][0] = 1;
          const queue = [[0, 0]];
          for (let head = 0; head < queue.length; head++) {
            const [r, c] = queue[head];
            if (r === n - 1 && c === n - 1) return String(dist[r][c]);
            for (let dr = -1; dr <= 1; dr++) {
              for (let dc = -1; dc <= 1; dc++) {
                const x = r + dr, y = c + dc;
                if (x >= 0 && x < n && y >= 0 && y < n && g[x][y] === "0" && dist[x][y] === 0) {
                  dist[x][y] = dist[r][c] + 1;
                  queue.push([x, y]);
                }
              }
            }
          }
          return "-1";
        }
      `,
      python: code`
        from collections import deque

        def solve(input_str):
            lines = [s.strip() for s in input_str.split("\n") if s.strip()]
            n = int(lines[0])
            g = lines[1:1 + n]
            if g[0][0] == "1" or g[n - 1][n - 1] == "1":
                return "-1"
            dist = [[0] * n for _ in range(n)]
            dist[0][0] = 1
            queue = deque([(0, 0)])
            while queue:
                r, c = queue.popleft()
                if r == n - 1 and c == n - 1:
                    return str(dist[r][c])
                for dr in (-1, 0, 1):
                    for dc in (-1, 0, 1):
                        x, y = r + dr, c + dc
                        if 0 <= x < n and 0 <= y < n and g[x][y] == "0" and dist[x][y] == 0:
                            dist[x][y] = dist[r][c] + 1
                            queue.append((x, y))
            return "-1"
      `,
    },
  },
  {
    title: "Is Graph Bipartite?",
    difficulty: "Medium",
    companies: ["Meta", "Google", "Amazon"],
    description:
      "An undirected graph is **bipartite** if its vertices can be split into two groups so that every edge joins a vertex of one group to a vertex of the other (no edge has both ends in the same group).\n\nYou are given an undirected graph with vertices `0..n-1`; it may be disconnected. Print `true` if it is bipartite and `false` otherwise.",
    constraints:
      "1 <= n <= 2000\n0 <= m <= 6000\nNo self-loops and no repeated edges.",
    inputFormat:
      "Line 1: two integers `n m`.\nNext `m` lines: two integers `u v` (an undirected edge).",
    outputFormat:
      "`true` or `false`.",
    examples: [
      { input: "4 4\n0 1\n1 2\n2 3\n3 0", output: "true", explanation: "Colour 0 and 2 red, 1 and 3 blue: every edge of the 4-cycle joins different colours." },
      { input: "3 3\n0 1\n1 2\n2 0", output: "false", explanation: "A triangle is an odd cycle, so it can never be 2-coloured." },
    ],
    testCases: [
      { input: "4 4\n0 1\n1 2\n2 3\n3 0", expectedOutput: "true", isHidden: false },
      { input: "3 3\n0 1\n1 2\n2 0", expectedOutput: "false", isHidden: false },
      { input: "1 0", expectedOutput: "true", isHidden: true },
      { input: "5 2\n0 1\n3 4", expectedOutput: "true", isHidden: true },
      { input: "6 5\n0 1\n2 3\n3 4\n4 5\n5 3", expectedOutput: "false", isHidden: true },
      { input: "6 9\n0 3\n0 4\n0 5\n1 3\n1 4\n1 5\n2 3\n2 4\n2 5", expectedOutput: "true", isHidden: true },
      { input: "6 7\n0 1\n1 2\n2 3\n3 4\n4 5\n5 0\n0 2", expectedOutput: "false", isHidden: true },
      { input: "7 6\n0 1\n0 2\n0 3\n0 4\n0 5\n0 6", expectedOutput: "true", isHidden: true },
      { input: BIP_RAND_PERF, expectedOutput: "true", isHidden: true },
      { input: BIP_CYCLE_PERF, expectedOutput: "false", isHidden: true },
    ],
    hints: [
      "Try to give every vertex one of two colours so that each edge has different colours at its ends.",
      "Start a BFS from every still-uncoloured vertex (the graph may be disconnected), give neighbours the opposite colour, and look for an edge whose ends already have the same colour.",
      "Equivalently, a graph is bipartite exactly when it contains no odd-length cycle.",
    ],
    editorial:
      "Colour vertices with BFS: the start of each component gets colour 0, and every neighbour gets the opposite colour. If an edge ever joins two vertices of the same colour, an odd cycle exists and the answer is false. Repeat for every uncoloured vertex so disconnected components are covered. Time O(n + m), space O(n + m).",
    solutions: {
      javascript: code`
        function solve(input) {
          const t = input.split(/\s+/).filter(Boolean).map(Number);
          const n = t[0], m = t[1];
          const adj = Array.from({ length: n }, () => []);
          for (let i = 0; i < m; i++) {
            const u = t[2 + 2 * i], v = t[3 + 2 * i];
            adj[u].push(v);
            adj[v].push(u);
          }
          const color = new Array(n).fill(-1);
          for (let s = 0; s < n; s++) {
            if (color[s] !== -1) continue;
            color[s] = 0;
            const queue = [s];
            for (let head = 0; head < queue.length; head++) {
              const u = queue[head];
              for (const v of adj[u]) {
                if (color[v] === -1) {
                  color[v] = 1 - color[u];
                  queue.push(v);
                } else if (color[v] === color[u]) {
                  return "false";
                }
              }
            }
          }
          return "true";
        }
      `,
      python: code`
        from collections import deque

        def solve(input_str):
            t = list(map(int, input_str.split()))
            n, m = t[0], t[1]
            adj = [[] for _ in range(n)]
            for i in range(m):
                u, v = t[2 + 2 * i], t[3 + 2 * i]
                adj[u].append(v)
                adj[v].append(u)
            color = [-1] * n
            for s in range(n):
                if color[s] != -1:
                    continue
                color[s] = 0
                queue = deque([s])
                while queue:
                    u = queue.popleft()
                    for v in adj[u]:
                        if color[v] == -1:
                            color[v] = 1 - color[u]
                            queue.append(v)
                        elif color[v] == color[u]:
                            return "false"
            return "true"
      `,
    },
  },
  {
    title: "Detect Cycle in a Directed Graph",
    difficulty: "Medium",
    companies: ["Amazon", "Microsoft", "Flipkart"],
    description:
      "You are given a directed graph with vertices `0..n-1`. Print `true` if it contains at least one directed cycle (a path that starts and ends at the same vertex, following edge directions), and `false` otherwise.\n\nA self-loop `u -> u` counts as a cycle. No directed edge is listed twice.",
    constraints:
      "1 <= n <= 2000\n0 <= m <= 6000",
    inputFormat:
      "Line 1: two integers `n m`.\nNext `m` lines: two integers `u v` meaning a directed edge `u -> v`.",
    outputFormat:
      "`true` if a directed cycle exists, else `false`.",
    examples: [
      { input: "4 4\n0 1\n1 2\n2 3\n3 1", output: "true", explanation: "Vertices 1 -> 2 -> 3 -> 1 form a directed cycle." },
      { input: "4 4\n0 1\n0 2\n1 3\n2 3", output: "false", explanation: "Two different paths reach vertex 3, but there is no way to return to a vertex, so the graph is acyclic." },
    ],
    testCases: [
      { input: "4 4\n0 1\n1 2\n2 3\n3 1", expectedOutput: "true", isHidden: false },
      { input: "4 4\n0 1\n0 2\n1 3\n2 3", expectedOutput: "false", isHidden: false },
      { input: "1 0", expectedOutput: "false", isHidden: true },
      { input: "1 1\n0 0", expectedOutput: "true", isHidden: true },
      { input: "2 2\n0 1\n1 0", expectedOutput: "true", isHidden: true },
      { input: "5 3\n0 1\n2 3\n3 4", expectedOutput: "false", isHidden: true },
      { input: "3 3\n0 1\n1 2\n0 2", expectedOutput: "false", isHidden: true },
      { input: "6 7\n0 1\n1 2\n3 4\n4 5\n5 3\n2 3\n0 5", expectedOutput: "true", isHidden: true },
      { input: DCYC_DAG_PERF, expectedOutput: "false", isHidden: true },
      { input: DCYC_LONG_PERF, expectedOutput: "true", isHidden: true },
    ],
    hints: [
      "An undirected visited-set is not enough: in a directed graph two paths can reach the same vertex without forming a cycle (see the diamond example).",
      "Kahn's algorithm: repeatedly remove vertices with in-degree 0. If some vertices can never be removed, they lie on or behind a cycle.",
      "The graph has a cycle exactly when the number of removed vertices is smaller than n.",
    ],
    editorial:
      "Use Kahn's topological sort: compute in-degrees, enqueue every vertex with in-degree 0, and repeatedly pop a vertex, decrementing the in-degree of its out-neighbours and enqueueing those that reach 0. If fewer than n vertices are popped, the remaining ones are on a cycle (or depend on one), so the graph is cyclic. It is iterative, so deep graphs are safe. Time O(n + m), space O(n + m).",
    solutions: {
      javascript: code`
        function solve(input) {
          const t = input.split(/\s+/).filter(Boolean).map(Number);
          const n = t[0], m = t[1];
          const adj = Array.from({ length: n }, () => []);
          const indeg = new Array(n).fill(0);
          for (let i = 0; i < m; i++) {
            const u = t[2 + 2 * i], v = t[3 + 2 * i];
            adj[u].push(v);
            indeg[v]++;
          }
          const queue = [];
          for (let v = 0; v < n; v++) if (indeg[v] === 0) queue.push(v);
          for (let head = 0; head < queue.length; head++) {
            for (const v of adj[queue[head]]) {
              if (--indeg[v] === 0) queue.push(v);
            }
          }
          return queue.length < n ? "true" : "false";
        }
      `,
      python: code`
        from collections import deque

        def solve(input_str):
            t = list(map(int, input_str.split()))
            n, m = t[0], t[1]
            adj = [[] for _ in range(n)]
            indeg = [0] * n
            for i in range(m):
                u, v = t[2 + 2 * i], t[3 + 2 * i]
                adj[u].append(v)
                indeg[v] += 1
            queue = deque(v for v in range(n) if indeg[v] == 0)
            removed = 0
            while queue:
                u = queue.popleft()
                removed += 1
                for v in adj[u]:
                    indeg[v] -= 1
                    if indeg[v] == 0:
                        queue.append(v)
            return "true" if removed < n else "false"
      `,
    },
  },
  {
    title: "Topological Sort of a DAG",
    difficulty: "Medium",
    companies: ["Amazon", "Meta", "Google", "Microsoft"],
    description:
      "You are given a directed graph with vertices `0..n-1`, where an edge `u v` means that `u` must appear **before** `v`. Print a topological ordering of all vertices.\n\nMany orderings may be valid, so to make the answer unique print the **lexicographically smallest** one: among all vertices that are currently allowed to come next, always choose the smallest label. If the graph contains a cycle, no ordering exists and you must print `-1`.",
    constraints:
      "1 <= n <= 2000\n0 <= m <= 6000\nNo self-loops and no repeated edges.",
    inputFormat:
      "Line 1: two integers `n m`.\nNext `m` lines: two integers `u v` meaning `u` must come before `v`.",
    outputFormat:
      "The `n` vertices in the chosen order, separated by single spaces, or `-1` if the graph has a cycle.",
    examples: [
      { input: "6 6\n5 2\n5 0\n4 0\n4 1\n2 3\n3 1", output: "4 5 0 2 3 1", explanation: "Vertices 4 and 5 have no prerequisites; take 4, then 5, which frees 0 and 2, and so on, always taking the smallest available vertex." },
      { input: "3 3\n0 1\n1 2\n2 0", output: "-1", explanation: "The three vertices form a directed cycle, so no valid order exists." },
    ],
    testCases: [
      { input: "6 6\n5 2\n5 0\n4 0\n4 1\n2 3\n3 1", expectedOutput: "4 5 0 2 3 1", isHidden: false },
      { input: "3 3\n0 1\n1 2\n2 0", expectedOutput: "-1", isHidden: false },
      { input: "1 0", expectedOutput: "0", isHidden: true },
      { input: "3 0", expectedOutput: "0 1 2", isHidden: true },
      { input: "4 3\n3 2\n2 1\n1 0", expectedOutput: "3 2 1 0", isHidden: true },
      { input: "5 4\n0 4\n1 4\n2 4\n3 4", expectedOutput: "0 1 2 3 4", isHidden: true },
      { input: "4 4\n0 1\n1 2\n2 1\n3 0", expectedOutput: "-1", isHidden: true },
      { input: "5 3\n4 0\n3 1\n2 4", expectedOutput: "2 3 1 4 0", isHidden: true },
      { input: TOPO_PERF, expectedOutput: "3 4 8 11 14 16 19 23 29 31 33 35 36 41 43 49 52 68 69 78 79 83 87 93 97 102 107 116 120 126 129 139 99 145 147 148 152 157 158 172 177 184 190 193 194 133 195 201 208 215 217 231 232 239 251 253 262 269 273 275 278 279 281 285 292 297 299 300 303 308 310 315 325 330 331 336 338 340 349 355 362 363 365 164 370 376 379 385 389 394 395 413 422 423 424 427 344 428 429 430 432 434 438 10 392 440 445 454 459 467 471 475 476 478 72 485 9 488 493 494 496 499 503 504 509 517 519 408 520 530 305 531 533 282 538 540 543 544 550 552 557 561 563 570 577 586 117 588 597 599 602 396 248 480 606 608 609 611 614 514 619 621 435 626 635 638 639 298 383 640 566 643 650 659 663 665 668 670 673 675 677 342 678 688 695 698 228 20 138 702 703 225 286 708 709 715 329 391 718 720 721 722 724 733 739 744 546 755 759 483 760 762 768 770 776 778 782 786 787 788 798 804 813 822 824 831 832 549 583 833 834 835 836 844 848 864 866 867 283 814 576 527 869 653 874 880 887 274 508 889 876 894 896 903 907 908 50 914 154 915 917 921 927 930 931 936 938 942 952 954 962 963 444 373 969 976 983 986 992 994 997 998 1002 1005 1007 1008 1014 1018 1020 1026 1027 1032 1033 767 1038 1041 206 890 1043 1054 1055 757 1056 1059 463 1066 1069 1072 1082 1085 1094 420 847 771 1064 1079 1096 1101 1105 1109 729 1114 326 1024 1036 1122 1 610 910 1015 1126 1128 996 1131 956 1134 1144 1145 1147 1075 1149 1152 1154 311 697 828 1087 1165 403 284 46 736 924 1167 290 573 94 858 959 1093 477 1171 1176 790 636 1179 1182 62 55 450 156 752 1183 1184 375 1188 1189 144 1190 1191 86 1192 302 348 751 1195 1206 1207 1210 1217 559 742 1006 1218 1221 1222 1224 1225 89 1231 899 1233 73 1132 1236 304 965 1211 1241 1219 1244 1245 1249 1254 203 1103 1255 719 1256 1257 59 594 1031 1071 1261 1264 1019 1265 1267 1272 1276 1277 792 795 957 711 1278 1282 1284 1288 229 399 1102 1290 1291 1292 1293 1295 1296 81 741 1298 1299 1301 1305 1306 1311 525 1315 1316 27 1318 1319 1321 1324 1213 1326 359 1327 1329 1330 1078 1331 12 207 277 632 321 1336 805 1338 1342 1347 1348 1353 1355 1361 1363 1373 1380 1385 1387 1386 972 707 1394 1400 256 801 1263 1402 1398 1409 1411 1412 1098 1413 1415 63 803 911 38 1416 121 1417 799 975 1220 318 1418 1420 1421 1422 1423 71 170 1424 851 294 1425 1426 809 1427 925 1429 1253 1431 1439 1440 1452 1454 1455 386 1456 316 474 781 1461 1464 343 1465 1466 973 1469 319 691 1470 226 1472 693 1442 1478 1479 1480 1484 1485 1487 1488 406 1489 1492 1496 1285 1414 1499 1503 1062 1504 21 180 218 951 696 1507 352 823 1235 1252 1513 1516 1517 324 1017 1275 1077 1518 1458 1519 1524 1526 1531 1538 1539 1540 584 1544 1545 1547 651 1553 1554 1555 1561 704 1566 534 1567 490 1546 1083 667 1448 1525 1569 802 513 1146 1571 60 617 1573 1574 1575 1577 618 1580 1023 1586 1588 717 77 1589 1591 238 1594 1597 1601 1603 1604 466 1125 637 821 686 1250 1345 657 1497 1563 1584 1606 489 1608 587 1609 605 1613 1616 1624 1339 1627 185 893 1638 374 934 993 1645 647 168 411 970 1646 629 863 1647 171 1576 1639 1227 24 1648 1652 1657 1660 1661 1052 1436 1552 1663 1669 507 181 288 1578 1596 1631 1670 939 991 1376 1672 1675 1676 104 183 320 865 850 980 1039 1113 1343 1438 800 1677 1468 1678 977 1683 1684 1686 879 53 1383 1689 1228 1021 1691 1693 1694 1695 1193 689 350 1696 535 1701 1702 1703 1707 1709 1710 1713 1715 134 367 607 839 676 916 1717 1720 859 1262 1723 1641 1558 1724 1726 425 1139 1258 249 1729 345 473 1731 1733 1735 1738 827 1530 664 1739 967 1740 314 684 1741 1742 1747 421 522 642 426 783 625 455 337 1133 1389 1748 1749 815 153 142 1247 1248 1040 1359 1751 1029 1752 149 240 950 220 958 1238 1665 1754 1761 1334 1635 1762 1309 1765 1767 743 840 1163 1401 1679 378 1681 1769 1770 1774 1199 415 1775 837 1150 224 554 568 70 596 1266 1772 1743 178 1323 1777 732 1781 1785 166 214 1788 1371 236 1790 369 1212 75 1794 446 985 468 1100 306 1164 1787 495 487 646 357 775 1142 1175 909 1047 1307 1356 1798 1803 1809 1778 433 1810 84 1232 1721 1732 1812 1598 558 765 7 777 1388 1814 1816 125 579 1104 1473 1736 1817 1821 1823 1046 656 1827 1828 211 536 1831 1832 1833 723 1834 1168 1835 470 270 551 1141 76 1543 458 578 96 353 612 1239 1829 1838 1080 1392 1534 1840 1160 1841 1664 681 700 204 272 920 1166 1375 419 1406 644 1673 1773 838 1800 1541 1842 1501 763 1844 961 946 1000 1003 1174 462 662 877 1481 1490 356 401 1570 1494 1654 1668 1845 400 439 734 829 945 1172 1476 1847 891 1850 784 1853 1855 873 884 1337 518 1857 1859 64 1862 1863 1852 42 537 937 1535 484 1716 1865 346 1854 1868 1185 1869 510 521 182 868 960 1314 1522 1872 846 1112 1873 1875 1876 1214 1877 1568 1878 1643 1879 221 191 380 448 569 1084 409 1157 1882 1884 1885 90 250 234 1209 252 202 1268 1303 1886 1889 1891 1892 966 592 988 1099 115 1274 1894 1030 179 1119 219 1508 1602 1637 624 261 555 1795 1763 1864 1896 1897 1899 1900 1901 1903 143 1904 1905 407 571 1381 106 287 1486 1906 436 511 85 524 849 854 807 904 1012 39 1127 1302 1434 1441 1216 1506 1618 301 1581 1650 1430 1768 1819 1822 1910 34 137 714 806 1115 796 1379 1599 1045 1649 461 1482 1755 1782 1861 1564 1913 794 242 431 1556 905 1592 358 1658 1475 1614 1895 1914 634 1916 296 523 1215 1341 1917 1918 404 1919 74 260 978 30 2 1058 883 1208 1358 1201 1404 1711 1883 1921 1922 108 123 604 1925 679 47 1923 151 1926 1815 1820 1930 1548 1620 1644 1931 5 280 402 390 317 497 753 591 968 1013 1243 457 1395 1634 1750 366 928 1793 1932 441 447 627 1312 1050 1135 1320 1281 1449 825 1001 773 897 397 1200 1659 1699 1551 1734 1779 237 1799 1081 1874 1933 1837 1934 947 645 1368 539 1935 1937 633 1939 582 213 335 593 603 808 900 628 875 529 769 1091 1391 372 816 878 1037 1097 1279 1514 500 347 1117 1259 1560 1445 1640 264 574 1680 1690 1728 1746 1758 1808 1846 1028 1818 1615 1902 227 1447 1510 1908 512 361 13 443 613 690 360 747 785 812 933 940 999 1180 136 1203 1286 1399 155 259 307 465 1130 1283 1308 1410 141 532 1520 323 1633 754 1169 48 1744 28 333 652 1067 293 95 1170 1297 669 1582 1143 328 1197 1757 929 1108 1437 1559 381 706 1826 1909 82 1941 932 1177 233 658 1230 1942 1944 1945 737 852 901 982 1161 674 1186 1351 1365 1390 1527 1204 1370 1162 1625 132 1502 1642 1947 451 384 1491 830 266 479 1137 556 1500 1697 1789 1887 1948 1698 1628 1949 562 1443 327 526 1824 1322 1950 1952 486 1953 990 949 1954 1956 749 750 923 1357 65 1044 1116 1432 1958 25 1271 1959 567 1354 1366 1784 1961 1198 1590 699 40 1962 80 845 1405 187 1419 1792 730 109 481 1965 560 780 127 987 1317 322 1335 1407 1202 1550 1372 1685 1070 1187 341 1811 1807 1911 1963 118 174 377 654 731 1151 1120 1289 1360 44 212 230 110 491 922 979 1205 271 989 1063 1194 748 1304 1444 1457 1460 725 1346 1049 1350 1396 1034 1617 1086 163 1621 1704 1802 1951 1967 268 1332 1968 1969 735 1004 1622 1495 235 418 623 1653 564 1839 1971 1972 1612 1140 1242 506 57 701 1973 572 1974 1048 1805 1611 1976 103 119 575 616 738 761 312 872 51 130 745 18 758 943 1095 1155 1237 1397 417 631 6 902 856 826 1467 726 1462 565 1483 1521 1528 1662 1849 1860 135 712 1977 245 176 501 581 774 1042 1061 1076 692 1010 1378 881 655 895 1893 598 622 941 161 1408 1623 1692 1796 1978 88 666 258 705 0 265 200 416 944 995 1011 1505 590 1557 926 585 1377 1583 1605 128 1630 437 1382 1714 1766 1783 1836 1848 1870 542 853 953 687 1016 1880 1940 860 162 1068 37 974 1328 1340 223 1813 886 1946 45 1955 981 1975 871 1979 1393 1980 197 469 820 861 276 862 1106 1107 791 1459 1523 955 1260 1549 1626 449 1246 387 1226 1451 1595 1667 67 175 124 198 528 818 1671 1737 1760 1705 1791 1136 1888 1515 1981 1982 32 1057 906 111 122 948 589 1159 1983 313 1364 247 1138 1403 1632 1938 58 502 649 789 216 740 1173 167 17 1181 842 1333 1572 460 189 1619 1706 1780 1446 548 1936 1984 694 1453 1435 1587 1825 1851 857 1943 1985 1987 393 15 841 1477 1463 1920 1988 1989 1990 1991 452 1992 100 169 246 541 1092 371 412 1280 1367 332 1536 793 1655 98 682 56 334 210 553 309 641 160 660 680 885 1025 1111 672 101 159 1196 1471 1579 1593 150 1273 1718 919 464 1745 1898 1928 810 1629 1856 1964 728 1966 105 295 971 1636 196 1927 1970 1993 1719 241 131 1129 1529 1994 1995 482 257 727 255 1158 1384 1753 1313 1996 199 188 1997 91 1998 291 685 267 683 764 54 140 772 173 855 165 779 892 984 710 1022 1229 1325 1344 888 1450 1240 1512 368 1537 339 1607 1651 1656 1352 1666 1674 453 630 1270 414 913 1088 1474 61 263 1712 1722 1759 22 66 209 1771 515 1776 1786 1804 713 1493 1511 492 797 1223 1682 1688 472 545 1178 1687 1806 92 1858 1871 1881 398 819 405 498 661 964 442 648 817 766 1009 1053 1118 1287 1300 192 1369 870 918 1294 1585 1600 716 1234 112 146 26 671 756 1153 1610 1708 1730 882 1035 1156 1251 1756 1123 516 1089 1269 811 1310 1700 601 1764 289 1797 1801 1830 1843 1051 1148 1433 1907 1924 114 244 354 505 912 1065 388 1349 1362 186 205 113 580 600 898 1090 1374 1498 1727 1866 382 1867 1565 1890 254 615 1124 595 1509 1533 1542 243 364 351 843 456 1110 1073 1562 1725 1915 746 1929 620 1121 1957 935 1074 1060 1428 1532 222 1960 410 1912 1986 547 1999", isHidden: true },
    ],
    hints: [
      "A vertex can be placed once all vertices that must precede it are placed: track the in-degree of each vertex.",
      "Kahn's algorithm with a plain queue produces some valid order, but not necessarily the smallest one.",
      "Keep the vertices with in-degree 0 in a min-heap and always pop the smallest. If fewer than n vertices come out, print -1.",
    ],
    editorial:
      "Run Kahn's algorithm but store the currently available vertices (in-degree 0) in a min-heap. Always popping the smallest available label yields the lexicographically smallest topological order. If the output has fewer than n vertices, a cycle blocked the rest and the answer is -1. Time O((n + m) log n), space O(n + m).",
    solutions: {
      javascript: code`
        class MinHeap {
          constructor() { this.a = []; }
          get size() { return this.a.length; }
          push(item) {
            const a = this.a;
            a.push(item);
            let i = a.length - 1;
            while (i > 0) {
              const p = (i - 1) >> 1;
              if (a[p][0] <= a[i][0]) break;
              [a[p], a[i]] = [a[i], a[p]];
              i = p;
            }
          }
          pop() {
            const a = this.a;
            const top = a[0];
            const last = a.pop();
            if (a.length) {
              a[0] = last;
              let i = 0;
              for (;;) {
                let s = i;
                const l = 2 * i + 1, r = l + 1;
                if (l < a.length && a[l][0] < a[s][0]) s = l;
                if (r < a.length && a[r][0] < a[s][0]) s = r;
                if (s === i) break;
                [a[s], a[i]] = [a[i], a[s]];
                i = s;
              }
            }
            return top;
          }
        }

        function solve(input) {
          const t = input.split(/\s+/).filter(Boolean).map(Number);
          const n = t[0], m = t[1];
          const adj = Array.from({ length: n }, () => []);
          const indeg = new Array(n).fill(0);
          for (let i = 0; i < m; i++) {
            const u = t[2 + 2 * i], v = t[3 + 2 * i];
            adj[u].push(v);
            indeg[v]++;
          }
          const heap = new MinHeap();
          for (let v = 0; v < n; v++) if (indeg[v] === 0) heap.push([v]);
          const order = [];
          while (heap.size) {
            const [u] = heap.pop();
            order.push(u);
            for (const v of adj[u]) {
              if (--indeg[v] === 0) heap.push([v]);
            }
          }
          return order.length === n ? order.join(" ") : "-1";
        }
      `,
      python: code`
        import heapq

        def solve(input_str):
            t = list(map(int, input_str.split()))
            n, m = t[0], t[1]
            adj = [[] for _ in range(n)]
            indeg = [0] * n
            for i in range(m):
                u, v = t[2 + 2 * i], t[3 + 2 * i]
                adj[u].append(v)
                indeg[v] += 1
            heap = [v for v in range(n) if indeg[v] == 0]
            heapq.heapify(heap)
            order = []
            while heap:
                u = heapq.heappop(heap)
                order.append(u)
                for v in adj[u]:
                    indeg[v] -= 1
                    if indeg[v] == 0:
                        heapq.heappush(heap, v)
            return " ".join(map(str, order)) if len(order) == n else "-1"
      `,
    },
  },
  {
    title: "Dijkstra's Shortest Path",
    difficulty: "Medium",
    companies: ["Amazon", "Flipkart", "Microsoft"],
    description:
      "You are given an undirected, weighted graph with vertices `0..n-1` and a source vertex `src`. Every edge weight is a positive integer. For every vertex print the length of the shortest path from `src`, or `-1` if the vertex is not reachable.",
    constraints:
      "1 <= n <= 1000\n0 <= m <= 5000\n1 <= weight <= 1000\n0 <= src < n\nNo self-loops and no repeated edges.",
    inputFormat:
      "Line 1: two integers `n m`.\nNext `m` lines: three integers `u v w` (an undirected edge of weight `w`).\nLast line: the source vertex `src`.",
    outputFormat:
      "`n` integers separated by spaces: shortest distance from `src` to vertex 0, 1, ..., n-1 (`-1` when unreachable).",
    examples: [
      { input: "5 6\n0 1 4\n0 2 1\n2 1 2\n1 3 1\n2 3 5\n3 4 3\n0", output: "0 3 1 4 7", explanation: "The best route to vertex 1 is 0 -> 2 -> 1 with weight 1 + 2 = 3, and to vertex 4 it is 0 -> 2 -> 1 -> 3 -> 4 with weight 7." },
      { input: "4 2\n0 1 5\n2 3 1\n3", output: "-1 -1 1 0", explanation: "Only vertices 2 and 3 are connected to the source 3." },
    ],
    testCases: [
      { input: "5 6\n0 1 4\n0 2 1\n2 1 2\n1 3 1\n2 3 5\n3 4 3\n0", expectedOutput: "0 3 1 4 7", isHidden: false },
      { input: "4 2\n0 1 5\n2 3 1\n3", expectedOutput: "-1 -1 1 0", isHidden: false },
      { input: "1 0\n0", expectedOutput: "0", isHidden: true },
      { input: "3 3\n0 1 10\n1 2 10\n0 2 25\n0", expectedOutput: "0 10 20", isHidden: true },
      { input: "4 4\n0 1 1\n1 3 1\n0 2 1\n2 3 1\n3", expectedOutput: "2 1 1 0", isHidden: true },
      { input: "5 4\n0 1 1000\n1 2 1000\n2 3 1000\n3 4 1000\n2", expectedOutput: "2000 1000 0 1000 2000", isHidden: true },
      { input: "3 0\n1", expectedOutput: "-1 0 -1", isHidden: true },
      { input: "6 7\n0 1 7\n0 2 9\n0 5 14\n1 2 10\n1 3 15\n2 3 11\n2 5 2\n0", expectedOutput: "0 7 9 20 -1 11", isHidden: true },
      { input: DIJ_PERF, expectedOutput: "940 1193 910 727 536 892 700 789 870 762 705 335 1036 845 566 615 636 557 942 1095 589 831 677 768 615 1004 614 1227 656 1014 912 876 517 931 590 803 861 602 592 984 1464 684 813 835 724 753 776 696 204 653 920 930 648 636 925 970 980 999 1079 907 615 1065 582 691 894 613 1281 414 600 515 496 702 571 722 556 442 1088 820 291 775 871 1084 572 1168 1041 989 508 562 443 976 949 820 897 1068 894 746 811 1158 191 850 953 954 881 907 1265 793 720 728 952 609 919 701 611 1058 521 955 612 714 420 667 1070 1250 933 882 755 878 978 874 1118 545 816 1009 1056 758 1099 919 536 705 920 804 583 793 766 609 785 213 733 1073 1076 931 933 531 683 712 842 831 845 894 1026 1037 725 611 510 670 914 780 1006 639 1287 389 889 813 658 1061 755 1075 603 952 548 1142 835 525 706 692 1085 974 711 901 944 903 555 636 650 1159 857 1063 727 696 126 472 762 727 794 647 693 1072 817 691 396 744 201 1005 679 1423 731 1016 985 631 859 330 497 651 620 699 539 674 645 805 791 489 557 822 784 1012 887 745 934 532 556 745 857 926 968 1291 638 210 844 713 1042 759 812 1138 541 971 804 730 431 754 745 670 679 586 260 989 954 644 759 955 828 609 1042 1088 1039 899 754 738 669 829 668 952 708 520 587 518 1094 826 701 764 1361 692 206 958 730 988 821 625 1066 948 828 537 1189 540 874 739 526 717 552 840 513 491 562 601 670 1455 249 616 1570 855 481 364 789 693 633 780 742 625 463 746 487 591 751 596 789 846 559 828 829 227 833 1280 786 874 669 620 1098 675 789 1003 1041 863 138 752 652 831 539 1099 976 701 615 903 948 274 828 493 995 973 1466 1280 679 621 814 671 911 760 1059 880 803 728 827 14 793 918 718 849 596 692 1551 1025 838 957 970 779 1339 814 719 802 606 790 689 551 913 409 608 535 430 716 911 908 640 634 898 450 747 924 603 781 423 650 873 561 1103 689 727 1212 500 623 549 799 869 738 747 885 650 790 834 841 401 763 926 460 843 1070 1160 745 584 989 604 807 821 893 971 839 817 774 764 658 768 706 847 997 636 912 699 1112 768 1108 764 832 875 831 539 659 903 504 563 963 695 307 1245 689 417 784 793 801 922 1046 931 1217 819 797 1126 1019 1054 945 819 1039 730 950 767 1053 822 449 802 570 1117 1183 912 699 731 612 833 996 677 707 554 579 922 797 635 888 779 717 754 1102 1186 1487 731 616 0 768 785 883 963 833 708 561 790 995 987 192 932 886 1287 830 604 768 1178 934 810 991 783 777 772 623 875 1007 642 1053 1109 769 798 723 448 631 732 819 841 658 814 994 641 497 715 821 759 1100 340 1004 882 558 845 964 834 841 962 690 1099 728 739 877 763 677 745 805 644 814 689 563 957 711 571 975 493 929 614 1047 775 827 763 969 975 1214 948 869 579 521 960 557 721 884 389 878 641 550 622 432 931 632 870 764 1415 886 835 829 1474 744 922 758 944 671 695 818 1140 802 762 885 916 899 934 644 829 525 548 800 709 1003 800 156 1034 194 1068 22 932 949 704 686 829 769 839 981 617 734 790 794 785 885 434 540 978 769 697 1273 556 613 1141 749 884 915 707 539 802 960 787 741 560 838 847 694 781 702 955 944 916 737 514 1043 831 1140 743 1194 840 570 564 884 730 709 648 921 883 708 984 525 827 681 1309 993 735 1001 643 965 875 849 701 149 838 638 1072 733 654 731 409 1044 368 930 409 820 692 1185 629 494 808 1103 1031 813 989 936 711 481 867 536 765 661 1084 787 927 320 649 1220 795 563 1072 838 480 890 177 750 445 817 773 810 700 773 763 515 209 531 778 677 890 941 991 850 818 444 848 758 822 772 982 984 954 981 1264 803 1087 1073 634 644 637 387 145 647 1099 880 696 613 445 708 822 638 700 752 1119 998 851 869 685 797 804 1052 711 759 917 756 1010 443 1046 635 748 798 1047 634 520 941 1507 843 873 876 973 849 772 842 1029 866 506 665 1211 435 576 692 593 377 763 928 654 1142 672 977 1267 681 680 788 453 750 916 849 1029 1048 804 742 739 651 753 571 778 641 1122 895 856 899 872 632 899 773 879 712 833 724 873 655 827 714 785 584 832 716 599 699 726 747 254 1106 717 765 984 1246 1057 802 800 760 779 424 722 931 666 874 762 708 1110 472 734 343 494 1012 841 971 370 1153 778 623 815 763 635 1008 837 855 809 432 630 1139 823 972 895 676 923 835 704 927 700 755 710 803 709 462 647 760 692 774 993 709 983 720 543 331 813 1164 720 1071 927 660 1003 825 1117 871 929 880 742 563 723 448 749 854 812 672 979 1324 677 623 728 155", isHidden: true },
    ],
    hints: [
      "BFS no longer works because edges have different weights.",
      "Greedily settle the unsettled vertex with the smallest tentative distance, then relax all of its edges. A min-heap keeps this fast.",
      "Push (distance, vertex) into a priority queue and skip stale entries whose distance is larger than the recorded best.",
    ],
    editorial:
      "Dijkstra's algorithm: keep tentative distances (initially infinity, 0 for the source) in a min-heap keyed by distance. Pop the closest vertex u; if the popped distance is stale, skip it; otherwise relax each edge (u, v, w) with dist[u] + w. Because all weights are positive, a popped vertex's distance is final. Time O((n + m) log n), space O(n + m).",
    solutions: {
      javascript: code`
        class MinHeap {
          constructor() { this.a = []; }
          get size() { return this.a.length; }
          push(item) {
            const a = this.a;
            a.push(item);
            let i = a.length - 1;
            while (i > 0) {
              const p = (i - 1) >> 1;
              if (a[p][0] <= a[i][0]) break;
              [a[p], a[i]] = [a[i], a[p]];
              i = p;
            }
          }
          pop() {
            const a = this.a;
            const top = a[0];
            const last = a.pop();
            if (a.length) {
              a[0] = last;
              let i = 0;
              for (;;) {
                let s = i;
                const l = 2 * i + 1, r = l + 1;
                if (l < a.length && a[l][0] < a[s][0]) s = l;
                if (r < a.length && a[r][0] < a[s][0]) s = r;
                if (s === i) break;
                [a[s], a[i]] = [a[i], a[s]];
                i = s;
              }
            }
            return top;
          }
        }

        function solve(input) {
          const t = input.split(/\s+/).filter(Boolean).map(Number);
          const n = t[0], m = t[1];
          const adj = Array.from({ length: n }, () => []);
          for (let i = 0; i < m; i++) {
            const u = t[2 + 3 * i], v = t[3 + 3 * i], w = t[4 + 3 * i];
            adj[u].push([v, w]);
            adj[v].push([u, w]);
          }
          const src = t[2 + 3 * m];
          const dist = new Array(n).fill(Infinity);
          dist[src] = 0;
          const heap = new MinHeap();
          heap.push([0, src]);
          while (heap.size) {
            const [d, u] = heap.pop();
            if (d > dist[u]) continue;
            for (const [v, w] of adj[u]) {
              if (d + w < dist[v]) {
                dist[v] = d + w;
                heap.push([dist[v], v]);
              }
            }
          }
          return dist.map((x) => (x === Infinity ? -1 : x)).join(" ");
        }
      `,
      python: code`
        import heapq

        def solve(input_str):
            t = list(map(int, input_str.split()))
            n, m = t[0], t[1]
            adj = [[] for _ in range(n)]
            for i in range(m):
                u, v, w = t[2 + 3 * i], t[3 + 3 * i], t[4 + 3 * i]
                adj[u].append((v, w))
                adj[v].append((u, w))
            src = t[2 + 3 * m]
            INF = float("inf")
            dist = [INF] * n
            dist[src] = 0
            heap = [(0, src)]
            while heap:
                d, u = heapq.heappop(heap)
                if d > dist[u]:
                    continue
                for v, w in adj[u]:
                    if d + w < dist[v]:
                        dist[v] = d + w
                        heapq.heappush(heap, (dist[v], v))
            return " ".join("-1" if x == INF else str(x) for x in dist)
      `,
    },
  },
];
