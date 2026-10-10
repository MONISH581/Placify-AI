/**
 * Additional interview problems (company-tagged), grouped into four files to keep each one readable.
 * Each file exports a `category key -> specs` record; they are appended to the base categories in problemBank.ts.
 */

import type { ProblemSpec } from "../problemHelpers";
import { EXTRA_A } from "./extraA";
import { EXTRA_B } from "./extraB";
import { EXTRA_C } from "./extraC";
import { EXTRA_D } from "./extraD";
import { REAL_ARRAYS } from "./real/arrays";
import { REAL_STRINGS } from "./real/strings";
import { REAL_LINKEDLISTS } from "./real/linkedLists";
import { REAL_STACKS } from "./real/stacks";
import { REAL_QUEUES } from "./real/queues";
import { REAL_HASHING } from "./real/hashing";
import { REAL_TREES } from "./real/trees";
import { REAL_BST } from "./real/bst";
import { REAL_HEAPS } from "./real/heaps";
import { REAL_GRAPHS } from "./real/graphs";
import { REAL_TRIES } from "./real/tries";
import { REAL_SEGMENTTREES } from "./real/segmentTrees";
import { REAL_RECURSION } from "./real/recursion";
import { REAL_BACKTRACKING } from "./real/backtracking";
import { REAL_GREEDY } from "./real/greedy";
import { REAL_DP } from "./real/dp";
import { REAL_BITMANIPULATION } from "./real/bitManipulation";
import { REAL_SLIDINGWINDOW } from "./real/slidingWindow";
import { REAL_TWOPOINTERS } from "./real/twoPointers";
import { REAL_ADVANCED } from "./real/advanced";

function merge(...sources: Record<string, ProblemSpec[]>[]): Record<string, ProblemSpec[]> {
  const out: Record<string, ProblemSpec[]> = {};
  for (const source of sources) for (const [key, list] of Object.entries(source)) out[key] = [...(out[key] ?? []), ...list];
  return out;
}

/** The large company-tagged set, one file per category (server/data/problems/real/). */
const REAL_SPECS: Record<string, ProblemSpec[]> = {
  arrays: REAL_ARRAYS,
  strings: REAL_STRINGS,
  linkedLists: REAL_LINKEDLISTS,
  stacks: REAL_STACKS,
  queues: REAL_QUEUES,
  hashing: REAL_HASHING,
  trees: REAL_TREES,
  bst: REAL_BST,
  heaps: REAL_HEAPS,
  graphs: REAL_GRAPHS,
  tries: REAL_TRIES,
  segmentTrees: REAL_SEGMENTTREES,
  recursion: REAL_RECURSION,
  backtracking: REAL_BACKTRACKING,
  greedy: REAL_GREEDY,
  dp: REAL_DP,
  bitManipulation: REAL_BITMANIPULATION,
  slidingWindow: REAL_SLIDINGWINDOW,
  twoPointers: REAL_TWOPOINTERS,
  advanced: REAL_ADVANCED
};

export const EXTRA_SPECS = merge(EXTRA_A, EXTRA_B, EXTRA_C, EXTRA_D, REAL_SPECS);
