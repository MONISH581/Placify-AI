import {
  ArrowLeftRight,
  Binary,
  Boxes,
  Brackets,
  ChartNoAxesColumn,
  Flame,
  GitBranch,
  Hash,
  Layers,
  Link2,
  ListOrdered,
  MoveHorizontal,
  Network,
  Repeat,
  Route,
  Share2,
  Sparkles,
  Triangle,
  Type,
  Undo2,
  Zap,
  type LucideIcon,
} from 'lucide-react';

/** One icon per problem-bank category (names match PROBLEM_CATEGORIES in server/data/problemBank.ts). */
const TOPIC_ICONS: Record<string, LucideIcon> = {
  arrays: Brackets,
  strings: Type,
  'linked lists': Link2,
  stacks: Layers,
  queues: ListOrdered,
  hashing: Hash,
  trees: GitBranch,
  'binary search trees': GitBranch,
  heaps: Triangle,
  graphs: Share2,
  tries: Network,
  'segment trees': ChartNoAxesColumn,
  recursion: Repeat,
  backtracking: Undo2,
  'greedy algorithms': Zap,
  'dynamic programming': Boxes,
  'bit manipulation': Binary,
  'sliding window': MoveHorizontal,
  'two pointers': ArrowLeftRight,
  'advanced interview problems': Flame,
};

/** Icon for the first tag that is a known topic, so each problem row shows what it is about instead of a generic code glyph. */
export function iconForTags(tags: readonly string[] | undefined): LucideIcon {
  for (const tag of tags ?? []) {
    const icon = TOPIC_ICONS[tag.trim().toLowerCase()];
    if (icon) return icon;
  }
  return tags && tags.length > 0 ? Route : Sparkles;
}
