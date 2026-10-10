import type { ReactNode } from 'react';

/** The milestone badges the server can award (see BADGES in server/users.ts); names must match exactly. */
export const BADGE_CATALOG: ReadonlyArray<{ name: string; how: string; hue: number }> = [
  { name: 'First Solve', how: 'Solve your first coding problem', hue: 150 },
  { name: 'Problem Solver', how: 'Solve 10 coding problems', hue: 45 },
  { name: 'Consistency Streak', how: 'Stay active 7 days in a row', hue: 18 },
  { name: 'Interview Starter', how: 'Complete a mock interview', hue: 268 },
  { name: 'Curious Learner', how: 'Finish a learning-track topic', hue: 205 },
  { name: 'Problem Crusher', how: 'Solve 25 coding problems', hue: 340 },
  { name: 'Code Master', how: 'Solve 50 coding problems', hue: 190 },
  { name: 'Fortnight Focus', how: 'Stay active 14 days in a row', hue: 28 },
  { name: 'Interview Pro', how: 'Complete 5 mock interviews', hue: 290 },
  { name: 'Knowledge Seeker', how: 'Finish 10 learning-track topics', hue: 225 },
  { name: 'Contest Entrant', how: 'Register for a contest', hue: 90 },
  { name: 'Community Voice', how: 'Post or reply in the community', hue: 320 },
  { name: 'Rising Star', how: 'Reach level 5', hue: 52 },
  { name: 'XP Hunter', how: 'Earn 1,000 XP', hue: 170 },
  { name: 'Sharpshooter', how: 'Solve 5 problems at 80%+ accuracy', hue: 0 },
];

/** Glyph for each badge, drawn in a 0..48 box and centred in the medal. */
const GLYPHS: Record<string, ReactNode> = {
  'First Solve': <path d="M12 25 L21 34 L37 15" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />,
  'Problem Solver': (
    <>
      <path d="M14 12 h20 v10 a10 10 0 0 1 -20 0 z" fill="#ffffff" />
      <path d="M14 15 h-6 a6 6 0 0 0 6 9 M34 15 h6 a6 6 0 0 1 -6 9" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
      <rect x="21" y="30" width="6" height="6" fill="#ffffff" />
      <rect x="15" y="36" width="18" height="4" rx="2" fill="#ffffff" />
    </>
  ),
  'Consistency Streak': <path d="M25 8 C 27 18, 38 20, 36 31 C 35 38, 29 42, 24 42 C 18 42, 12 38, 12 30 C 12 25, 15 22, 17 19 C 18 23, 20 24, 21 24 C 21 17, 22 12, 25 8 z" fill="#ffffff" />,
  'Interview Starter': (
    <>
      <rect x="19" y="8" width="10" height="20" rx="5" fill="#ffffff" />
      <path d="M13 24 a11 11 0 0 0 22 0 M24 35 v6" fill="none" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
    </>
  ),
  'Curious Learner': (
    <>
      <path d="M24 14 C 18 10, 11 10, 8 12 v24 c3 -2 10 -2 16 2 c6 -4 13 -4 16 -2 v-24 c-3 -2 -10 -2 -16 2 z" fill="#ffffff" />
      <path d="M24 14 v24" stroke="#00000033" strokeWidth="2" />
    </>
  ),
  'Problem Crusher': <path d="M27 6 L12 28 h10 l-3 14 L36 20 H26 z" fill="#ffffff" strokeLinejoin="round" />,
  'Code Master': <path d="M18 14 L8 24 L18 34 M30 14 L40 24 L30 34 M27 11 L21 37" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />,
  'Fortnight Focus': (
    <>
      <rect x="8" y="11" width="32" height="29" rx="5" fill="#ffffff" />
      <rect x="8" y="11" width="32" height="9" rx="4" fill="#00000033" />
      <path d="M16 7 v7 M32 7 v7" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M16 30 L22 35 L33 24" fill="none" stroke="#00000055" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  'Interview Pro': (
    <>
      <path d="M10 10 h28 a4 4 0 0 1 4 4 v16 a4 4 0 0 1 -4 4 H23 l-9 8 v-8 h-4 a4 4 0 0 1 -4 -4 V14 a4 4 0 0 1 4 -4 z" fill="#ffffff" />
      <path d="M15 20 h18 M15 26 h11" stroke="#00000044" strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  'Knowledge Seeker': (
    <>
      <path d="M24 9 L3 20 L24 31 L45 20 z" fill="#ffffff" />
      <path d="M12 26 v8 c0 3 5 6 12 6 s12 -3 12 -6 v-8 L24 33 z" fill="#ffffff" />
      <path d="M42 22 v12" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  'Contest Entrant': (
    <>
      <rect x="10" y="7" width="4" height="35" rx="2" fill="#ffffff" />
      <path d="M14 9 H39 L32 18 L39 27 H14 z" fill="#ffffff" />
    </>
  ),
  'Community Voice': (
    <>
      <path d="M24 8 C14 8 7 14 7 22 c0 4 2 8 5 10 l-2 8 l9 -5 c2 1 3 1 5 1 c10 0 17 -6 17 -14 S34 8 24 8 z" fill="#ffffff" />
      <circle cx="17" cy="22" r="2.5" fill="#00000044" />
      <circle cx="24" cy="22" r="2.5" fill="#00000044" />
      <circle cx="31" cy="22" r="2.5" fill="#00000044" />
    </>
  ),
  'XP Hunter': (
    <>
      <path d="M15 9 H33 L43 20 L24 41 L5 20 z" fill="#ffffff" strokeLinejoin="round" />
      <path d="M5 20 H43 M15 9 L20 20 L24 41 L28 20 L33 9 M20 20 L24 9 L28 20" fill="none" stroke="#00000033" strokeWidth="2" strokeLinejoin="round" />
    </>
  ),
  Sharpshooter: (
    <>
      <circle cx="24" cy="24" r="16" fill="none" stroke="#ffffff" strokeWidth="4" />
      <circle cx="24" cy="24" r="8" fill="none" stroke="#ffffff" strokeWidth="4" />
      <circle cx="24" cy="24" r="2.5" fill="#ffffff" />
      <path d="M24 3 v9 M24 36 v9 M3 24 h9 M36 24 h9" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  'Rising Star': <path d="M24 5 L29.6 17.4 L43 19 L33 28.2 L35.8 41.5 L24 34.8 L12.2 41.5 L15 28.2 L5 19 L18.4 17.4 z" fill="#ffffff" strokeLinejoin="round" />,
};

/** A hexagonal medal. Earned medals are coloured; locked ones are grey with a padlock. */
export function BadgeMedal({ name, earned, size = 72 }: { name: string; earned: boolean; size?: number }) {
  const hue = BADGE_CATALOG.find((badge) => badge.name === name)?.hue ?? 200;
  const gradId = `badge-${hue}-${earned ? 'on' : 'off'}`;
  const top = earned ? `hsl(${hue} 85% 62%)` : 'var(--c-slate-700, #c9c9c6)';
  const bottom = earned ? `hsl(${hue + 20} 80% 40%)` : 'var(--c-slate-600, #a0a0a0)';
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" role="img" aria-label={`${name}, ${earned ? 'earned' : 'locked'}`}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={bottom} />
        </linearGradient>
      </defs>
      <path d="M36 4 L64 20 V52 L36 68 L8 52 V20 z" fill={`url(#${gradId})`} />
      <path d="M36 4 L64 20 V52 L36 68 L8 52 V20 z" fill="none" stroke="#ffffff" strokeOpacity={earned ? 0.5 : 0.25} strokeWidth="2" />
      <path d="M36 11 L58 24 V48 L36 61 L14 48 V24 z" fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1.5" />
      <g transform="translate(12 12)" opacity={earned ? 1 : 0.35}>
        {GLYPHS[name] ?? GLYPHS['First Solve']}
      </g>
      {!earned && (
        <g>
          <circle cx="54" cy="54" r="12" fill="var(--card, #ffffff)" stroke="var(--c-slate-600, #a0a0a0)" strokeWidth="2" />
          <rect x="48.5" y="52" width="11" height="8" rx="2" fill="var(--c-slate-500, #6b6b6b)" />
          <path d="M51 52 v-3 a3 3 0 0 1 6 0 v3" fill="none" stroke="var(--c-slate-500, #6b6b6b)" strokeWidth="2" />
        </g>
      )}
    </svg>
  );
}

/** Every badge in the catalogue as a shelf; unearned ones are greyed out with the hint on how to get them. */
export function BadgeShelf({ owned, compact = false }: { owned: readonly string[]; compact?: boolean }) {
  const ownedSet = new Set(owned);
  return (
    <ul className={`grid gap-3 ${compact ? 'grid-cols-3 sm:grid-cols-5 lg:grid-cols-3 xl:grid-cols-5' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'}`}>
      {BADGE_CATALOG.map((badge) => {
        const earned = ownedSet.has(badge.name);
        return (
          <li
            key={badge.name}
            title={badge.how}
            className={`flex flex-col items-center gap-1.5 rounded-md bg-slate-900 p-3 text-center ${earned ? 'animate-popIn' : ''}`}
          >
            <BadgeMedal name={badge.name} earned={earned} size={compact ? 52 : 72} />
            <span className={`font-mono text-[11px] font-semibold leading-tight ${earned ? 'text-white' : 'text-slate-500'}`}>{badge.name}</span>
            {!compact && <span className="text-[11px] leading-snug text-slate-400">{earned ? 'Earned' : badge.how}</span>}
          </li>
        );
      })}
    </ul>
  );
}
