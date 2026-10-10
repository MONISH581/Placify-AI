import { INK, Panel, SURFACE, paletteFor } from './Scenes';

export type Mood = 'sleepy' | 'neutral' | 'happy' | 'cheer';

/** Map the readiness score (0-100, or null while loading) to the mascot's mood. */
export function moodForScore(score: number | null | undefined): Mood {
  if (typeof score !== 'number') return 'neutral';
  if (score < 25) return 'sleepy';
  if (score < 50) return 'neutral';
  if (score < 75) return 'happy';
  return 'cheer';
}

const MESSAGES: Record<Mood, string> = {
  sleepy: "Let's warm up!",
  neutral: 'Keep going!',
  happy: 'Nice progress!',
  cheer: "You're ready!",
};

/** "Pip", the dashboard mascot: a small robot whose face and speech bubble follow the readiness score. */
export function ReadinessMascot({ score, className = '' }: { score: number | null | undefined; className?: string }) {
  const p = paletteFor('dashboard');
  const mood = moodForScore(score);
  const eye = (cx: number) => {
    if (mood === 'sleepy') return <path d={`M${cx - 9} 118 q9 7 18 0`} fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />;
    if (mood === 'cheer') return <path d={`M${cx - 9} 122 q9 -12 18 0`} fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />;
    return <circle cx={cx} cy="116" r={mood === 'happy' ? 7 : 6} fill={INK} />;
  };
  const mouth =
    mood === 'sleepy' ? (
      <path d="M142 142 h16" stroke={INK} strokeWidth="4" strokeLinecap="round" />
    ) : mood === 'neutral' ? (
      <path d="M138 142 q12 6 24 0" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
    ) : (
      <path d="M134 138 q16 22 32 0 z" fill={INK} />
    );

  return (
    <svg className={className} viewBox="0 0 400 290" fill="none" role="presentation" aria-hidden="true" focusable="false">
      <ellipse cx="150" cy="262" rx="78" ry="9" fill={INK} opacity="0.1" />
      <g transform="translate(228 30)">
        <Panel x={0} y={0} w={140} h={54} r={18} />
        <path d="M24 54 l-14 18 l32 -18 z" fill={SURFACE} stroke={INK} strokeOpacity="0.14" />
        <rect x="23" y="52" width="20" height="4" fill={SURFACE} />
        <text x="70" y="33" textAnchor="middle" fontFamily="system-ui, sans-serif" fontSize="15" fontWeight="700" fill={INK}>
          {MESSAGES[mood]}
        </text>
      </g>
      <line x1="150" y1="64" x2="150" y2="84" stroke={INK} strokeOpacity="0.5" strokeWidth="4" strokeLinecap="round" />
      <circle cx="150" cy="58" r="9" fill={mood === 'sleepy' ? p.d : p.b} className={mood === 'cheer' ? 'animate-blink' : undefined} />
      <rect x="86" y="84" width="128" height="100" rx="30" fill={p.a} />
      <rect x="100" y="98" width="100" height="72" rx="22" fill="#ffffff" opacity="0.95" />
      {eye(128)}
      {eye(172)}
      {mouth}
      {mood !== 'sleepy' && (
        <>
          <circle cx="112" cy="136" r="6" fill={p.c} opacity="0.6" />
          <circle cx="188" cy="136" r="6" fill={p.c} opacity="0.6" />
        </>
      )}
      <rect x="104" y="184" width="92" height="56" rx="20" fill={p.c} />
      <rect x="126" y="198" width="48" height="10" rx="5" fill="#ffffff" opacity="0.8" />
      <rect x="132" y="216" width="36" height="8" rx="4" fill="#ffffff" opacity="0.45" />
      <path d="M104 204 q-26 -4 -24 -30" stroke={p.a} strokeWidth="14" strokeLinecap="round" fill="none" />
      <path d={mood === 'cheer' ? 'M196 204 q30 -4 30 -52' : 'M196 204 q26 -4 24 -30'} stroke={p.a} strokeWidth="14" strokeLinecap="round" fill="none" />
      <rect x="116" y="238" width="26" height="20" rx="8" fill={p.d} />
      <rect x="158" y="238" width="26" height="20" rx="8" fill={p.d} />
      {mood === 'sleepy' && (
        <g fill={INK} opacity="0.55" fontFamily="system-ui, sans-serif" fontWeight="700">
          <text x="232" y="112" fontSize="22" className="animate-blink">z</text>
          <text x="250" y="92" fontSize="16" className="animate-blink">z</text>
        </g>
      )}
      {mood === 'cheer' && (
        <g>
          <path d="M254 130 l5 10 11 1 -8 8 2 11 -10 -6 -10 6 2 -11 -8 -8 11 -1 z" fill={p.b} />
          <circle cx="44" cy="120" r="6" fill={p.c} />
          <circle cx="64" cy="76" r="4" fill={p.d} />
        </g>
      )}
    </svg>
  );
}
