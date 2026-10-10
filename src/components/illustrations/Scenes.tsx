import type { ReactNode } from 'react';
import { heroPalette } from '../../utils/tones';

/**
 * Hand-drawn SVG scenes for the page banners, login screen and empty states. Everything is vector and inline:
 * accent colours come from the page hue (same table as the banner arc), surfaces come from the theme variables,
 * so each scene follows light/dark mode and the page colour without any image files.
 */

export interface Palette {
  a: string;
  b: string;
  c: string;
  d: string;
}

export function paletteFor(tone: string | undefined): Palette {
  const { arc } = heroPalette(tone);
  return { a: arc[0], b: arc[1], c: arc[2], d: arc[3] };
}

export const INK = 'var(--hero-fg, #101010)';
export const SURFACE = 'var(--card, #ffffff)';

/** A rounded card with a soft drop shadow, used as the base of every scene. */
export function Panel({ x, y, w, h, r = 14, fill = SURFACE }: { x: number; y: number; w: number; h: number; r?: number; fill?: string }) {
  return (
    <>
      <rect x={x + 4} y={y + 8} width={w} height={h} rx={r} fill={INK} opacity="0.1" />
      <rect x={x} y={y} width={w} height={h} rx={r} fill={fill} stroke={INK} strokeOpacity="0.14" />
    </>
  );
}

/** Skeleton text line. */
export function Line({ x, y, w, color = INK, opacity = 0.22 }: { x: number; y: number; w: number; color?: string; opacity?: number }) {
  return <rect x={x} y={y} width={w} height="7" rx="3.5" fill={color} opacity={opacity} />;
}

export function Check({ cx, cy, r = 14, color }: { cx: number; cy: number; r?: number; color: string }) {
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill={color} />
      <path
        d={`M${cx - r * 0.42} ${cy + r * 0.02} L${cx - r * 0.1} ${cy + r * 0.36} L${cx + r * 0.46} ${cy - r * 0.3}`}
        fill="none"
        stroke="#ffffff"
        strokeWidth={r * 0.22}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  );
}

export function Avatar({ cx, cy, r, color }: { cx: number; cy: number; r: number; color: string }) {
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill={color} opacity="0.28" />
      <circle cx={cx} cy={cy - r * 0.2} r={r * 0.34} fill={color} />
      <path d={`M${cx - r * 0.62} ${cy + r * 0.74} a${r * 0.62} ${r * 0.52} 0 0 1 ${r * 1.24} 0`} fill={color} />
    </>
  );
}

type SceneBody = (p: Palette) => ReactNode;

const SCENES: Record<string, SceneBody> = {
  dashboard: (p) => (
    <>
      <Panel x={40} y={50} w={220} h={170} />
      <Line x={60} y={70} w={70} />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={64 + i * 36} y={196 - [40, 72, 56, 100, 124][i]} width="22" height={[40, 72, 56, 100, 124][i]} rx="5" fill={[p.d, p.c, p.b, p.a, p.a][i]} />
      ))}
      <Panel x={236} y={96} w={130} h={140} r={18} />
      <circle cx="301" cy="158" r="40" fill="none" stroke={INK} strokeOpacity="0.1" strokeWidth="12" />
      <circle cx="301" cy="158" r="40" fill="none" stroke={p.a} strokeWidth="12" strokeLinecap="round" strokeDasharray="190 252" transform="rotate(-90 301 158)" />
      <Line x={271} y={210} w={60} opacity={0.2} />
    </>
  ),
  arena: (p) => (
    <>
      <Panel x={30} y={44} w={280} h={190} />
      <circle cx="52" cy="66" r="5" fill={p.a} />
      <circle cx="70" cy="66" r="5" fill={p.c} />
      <circle cx="88" cy="66" r="5" fill={p.d} />
      <Line x={52} y={92} w={90} color={p.a} opacity={0.9} />
      <Line x={72} y={112} w={140} color={p.c} opacity={0.85} />
      <Line x={72} y={132} w={110} opacity={0.25} />
      <Line x={92} y={152} w={150} color={p.d} opacity={0.85} />
      <Line x={72} y={172} w={80} opacity={0.25} />
      <Line x={52} y={192} w={60} color={p.b} opacity={0.9} />
      <Panel x={230} y={160} w={130} h={78} r={16} />
      <Check cx={262} cy={199} r={15} color={p.b} />
      <Line x={286} y={188} w={56} opacity={0.3} />
      <Line x={286} y={206} w={36} opacity={0.18} />
    </>
  ),
  tracks: (p) => (
    <>
      <Panel x={64} y={162} w={250} h={52} r={12} fill={p.d} />
      <Panel x={50} y={110} w={250} h={52} r={12} fill={p.c} />
      <Panel x={78} y={58} w={250} h={52} r={12} fill={p.a} />
      {[58, 110, 162].map((y, i) => (
        <g key={y}>
          <rect x={[98, 70, 84][i]} y={y + 17} width="90" height="8" rx="4" fill="#ffffff" opacity="0.85" />
          <rect x={[98, 70, 84][i] + 100} y={y + 17} width="50" height="8" rx="4" fill="#ffffff" opacity="0.4" />
        </g>
      ))}
      <path d="M330 90 C 372 120, 372 170, 330 200" fill="none" stroke={p.b} strokeWidth="3" strokeDasharray="2 9" strokeLinecap="round" />
      <Check cx={330} cy={210} r={16} color={p.b} />
    </>
  ),
  contests: (p) => (
    <>
      {/* leaderboard panel */}
      <Panel x={46} y={34} w={308} h={214} r={18} />
      <rect x="70" y="58" width="92" height="22" rx="11" fill={p.a} opacity="0.16" />
      <circle cx="84" cy="69" r="4" fill={p.a} />
      <Line x={95} y={65.5} w={52} color={p.a} opacity={0.7} />
      <Line x={262} y={65.5} w={66} opacity={0.2} />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          {i === 0 && <rect x="64" y={96} width="272" height="40" rx="12" fill={p.a} opacity="0.12" />}
          <circle cx="88" cy={116 + i * 46} r="12" fill={i === 0 ? p.a : INK} opacity={i === 0 ? 1 : 0.1} />
          <text x="88" y={121 + i * 46} textAnchor="middle" fontSize="13" fontWeight="700" fill={i === 0 ? '#ffffff' : INK} fontFamily="inherit">
            {i + 1}
          </text>
          <Avatar cx={124} cy={116 + i * 46} r={13} color={[p.b, p.c, p.d][i]} />
          <Line x={148} y={106 + i * 46} w={[92, 76, 64][i]} opacity={0.34} />
          <Line x={148} y={120 + i * 46} w={[56, 48, 40][i]} opacity={0.16} />
          <rect x="262" y={112 + i * 46} width="66" height="8" rx="4" fill={INK} opacity="0.1" />
          <rect x="262" y={112 + i * 46} width={[60, 46, 34][i]} height="8" rx="4" fill={p.a} opacity={[1, 0.7, 0.5][i]} />
        </g>
      ))}
      {/* timer badge */}
      <circle cx="338" cy="236" r="26" fill={SURFACE} stroke={p.b} strokeWidth="5" />
      <path d="M338 236 V220" stroke={INK} strokeWidth="4" strokeLinecap="round" opacity="0.75" />
      <path d="M338 236 L350 243" stroke={p.a} strokeWidth="4" strokeLinecap="round" />
      <circle cx="338" cy="236" r="3.5" fill={p.a} />
    </>
  ),
  interview: (p) => (
    <>
      <Panel x={30} y={50} w={210} h={74} r={20} />
      <Avatar cx={64} cy={87} r={20} color={p.a} />
      <Line x={96} y={74} w={110} opacity={0.3} />
      <Line x={96} y={94} w={80} opacity={0.18} />
      <rect x="150" y="146" width="210" height="74" rx="20" fill={p.a} />
      <Line x={172} y={170} w={130} color="#ffffff" opacity={0.85} />
      <Line x={172} y={190} w={90} color="#ffffff" opacity={0.5} />
      <circle cx="338" cy="60" r="24" fill={p.c} />
      <rect x="331" y="46" width="14" height="22" rx="7" fill="#ffffff" />
      <path d="M326 62 a12 12 0 0 0 24 0" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
      <path d="M338 76 v8" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  resume: (p) => (
    <>
      <Panel x={80} y={36} w={190} h={236} />
      <Avatar cx={118} cy={80} r={22} color={p.a} />
      <Line x={150} y={68} w={90} opacity={0.35} />
      <Line x={150} y={88} w={60} opacity={0.2} />
      <rect x="100" y="120" width="150" height="3" rx="1.5" fill={INK} opacity="0.12" />
      <Line x={100} y={138} w={150} opacity={0.18} />
      <Line x={100} y={156} w={120} opacity={0.18} />
      <Line x={100} y={174} w={140} opacity={0.18} />
      <rect x="100" y="200" width="52" height="18" rx="9" fill={p.c} opacity="0.9" />
      <rect x="160" y="200" width="44" height="18" rx="9" fill={p.d} opacity="0.9" />
      <rect x="212" y="200" width="38" height="18" rx="9" fill={p.b} opacity="0.9" />
      <Check cx={266} cy={66} r={24} color={p.b} />
      <circle cx="304" cy="206" r="30" fill="none" stroke={p.a} strokeWidth="9" />
      <path d="M326 228 l26 26" stroke={p.a} strokeWidth="11" strokeLinecap="round" />
    </>
  ),
  companies: (p) => (
    <>
      <rect x="20" y="236" width="360" height="6" rx="3" fill={INK} opacity="0.18" />
      {[
        { x: 40, w: 70, h: 110, c: p.c },
        { x: 124, w: 90, h: 180, c: p.a },
        { x: 228, w: 70, h: 140, c: p.d },
        { x: 308, w: 56, h: 90, c: p.b },
      ].map((b) => (
        <g key={b.x}>
          <rect x={b.x} y={236 - b.h} width={b.w} height={b.h} rx="6" fill={b.c} />
          {Array.from({ length: Math.floor(b.h / 32) }, (_, row) =>
            Array.from({ length: b.w > 60 ? 3 : 2 }, (_, col) => (
              <rect key={`${row}-${col}`} x={b.x + 12 + col * (b.w > 60 ? 22 : 20)} y={236 - b.h + 14 + row * 30} width="11" height="16" rx="2.5" fill="#ffffff" opacity={(row + col) % 3 === 0 ? 0.9 : 0.4} />
            )),
          )}
        </g>
      ))}
    </>
  ),
  placement: (p) => (
    <>
      <circle cx="270" cy="120" r="82" fill="none" stroke={p.d} strokeWidth="14" opacity="0.55" />
      <circle cx="270" cy="120" r="54" fill="none" stroke={p.c} strokeWidth="14" opacity="0.8" />
      <circle cx="270" cy="120" r="26" fill={p.a} />
      <path d="M270 120 L345 50" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <path d="M345 50 l-4 -16 l20 6 z" fill={p.b} />
      <rect x="40" y="150" width="170" height="104" rx="16" fill={p.a} />
      <path d="M92 150 v-14 a12 12 0 0 1 12 -12 h42 a12 12 0 0 1 12 12 v14" fill="none" stroke={p.a} strokeWidth="10" />
      <rect x="40" y="192" width="170" height="10" fill="#ffffff" opacity="0.4" />
      <rect x="115" y="186" width="20" height="22" rx="5" fill={p.b} />
    </>
  ),
  career: (p) => (
    <>
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={40 + i * 74} y={206 - i * 42} width="80" height={30 + i * 42} rx="8" fill={[p.d, p.c, p.b, p.a][i]} />
      ))}
      <path d="M62 188 C 120 150, 180 140, 226 112 S 300 76, 330 52" fill="none" stroke={INK} strokeOpacity="0.4" strokeWidth="3" strokeDasharray="3 9" strokeLinecap="round" />
      <path d="M330 80 v-52" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <path d="M332 30 h42 l-10 14 10 14 h-42 z" fill={p.a} />
    </>
  ),
  community: (p) => (
    <>
      <Panel x={30} y={52} w={170} h={64} r={18} />
      <Avatar cx={62} cy={84} r={18} color={p.a} />
      <Line x={90} y={74} w={80} opacity={0.3} />
      <Line x={90} y={92} w={56} opacity={0.18} />
      <Panel x={190} y={112} w={170} h={64} r={18} />
      <Avatar cx={222} cy={144} r={18} color={p.c} />
      <Line x={250} y={134} w={80} opacity={0.3} />
      <Line x={250} y={152} w={50} opacity={0.18} />
      <Panel x={64} y={174} w={170} h={64} r={18} />
      <Avatar cx={96} cy={206} r={18} color={p.d} />
      <Line x={124} y={196} w={80} opacity={0.3} />
      <Line x={124} y={214} w={60} opacity={0.18} />
      <circle cx="338" cy="68" r="16" fill={p.b} />
      <path d="M330 68 l6 6 10 -12" fill="none" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  profile: (p) => (
    <>
      <Panel x={50} y={60} w={290} h={170} r={20} />
      <rect x="50" y="60" width="290" height="52" rx="20" fill={p.a} opacity="0.9" />
      <rect x="50" y="94" width="290" height="18" fill={p.a} opacity="0.9" />
      <circle cx="110" cy="124" r="32" fill={SURFACE} />
      <Avatar cx={110} cy={124} r={28} color={p.c} />
      <Line x={160} y={126} w={110} opacity={0.35} />
      <Line x={160} y={146} w={70} opacity={0.2} />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={72 + i * 90} y={180} width="76" height="32" rx="10" fill={[p.b, p.c, p.d][i]} opacity="0.85" />
          <rect x={84 + i * 90} y={192} width="40" height="8" rx="4" fill="#ffffff" opacity="0.85" />
        </g>
      ))}
    </>
  ),
  admin: (p) => (
    <>
      <Panel x={50} y={46} w={290} h={196} />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x="80" y={86 + i * 52} width="230" height="8" rx="4" fill={INK} opacity="0.12" />
          <rect x="80" y={86 + i * 52} width={[150, 90, 190][i]} height="8" rx="4" fill={[p.a, p.c, p.d][i]} />
          <circle cx={80 + [150, 90, 190][i]} cy={90 + i * 52} r="12" fill={SURFACE} stroke={[p.a, p.c, p.d][i]} strokeWidth="4" />
        </g>
      ))}
      <Check cx={326} cy={60} r={18} color={p.b} />
    </>
  ),
};

/** Banner illustration for a page, picked by its route key (see PAGE_HUES). Falls back to the dashboard scene. */
export function SceneArt({ tone, className = '' }: { tone: string | undefined; className?: string }) {
  const palette = paletteFor(tone);
  const body = (tone !== undefined && SCENES[tone]) || SCENES.dashboard;
  return (
    <svg className={className} viewBox="0 0 400 290" fill="none" role="presentation" aria-hidden="true" focusable="false">
      {body(palette)}
    </svg>
  );
}

/** Wide composite for the login screen: a code window, a readiness gauge and floating achievement chips. */
export function LoginArt({ className = '' }: { className?: string }) {
  const p = paletteFor('profile');
  return (
    <svg className={className} viewBox="0 0 520 300" fill="none" role="presentation" aria-hidden="true" focusable="false">
      <ellipse cx="270" cy="150" rx="240" ry="130" fill={p.a} opacity="0.1" />
      <Panel x={20} y={36} w={300} h={206} r={16} />
      <circle cx="44" cy="62" r="5" fill={p.a} />
      <circle cx="62" cy="62" r="5" fill={p.c} />
      <circle cx="80" cy="62" r="5" fill={p.d} />
      <Line x={44} y={92} w={80} color={p.a} opacity={0.9} />
      <Line x={64} y={112} w={150} color={p.c} opacity={0.85} />
      <Line x={64} y={132} w={110} opacity={0.25} />
      <Line x={84} y={152} w={170} color={p.d} opacity={0.85} />
      <Line x={64} y={172} w={90} opacity={0.25} />
      <Line x={44} y={192} w={56} color={p.b} opacity={0.9} />
      <rect x="44" y="214" width="120" height="10" rx="5" fill={INK} opacity="0.08" />
      <Panel x={300} y={70} w={190} h={150} r={18} />
      <circle cx="395" cy="140" r="42" fill="none" stroke={INK} strokeOpacity="0.1" strokeWidth="13" />
      <circle cx="395" cy="140" r="42" fill="none" stroke={p.b} strokeWidth="13" strokeLinecap="round" strokeDasharray="190 264" transform="rotate(-90 395 140)" />
      <Line x={365} y={196} w={60} opacity={0.22} />
      <Panel x={256} y={196} w={140} h={54} r={14} />
      <Check cx={284} cy={223} r={13} color={p.a} />
      <Line x={308} y={212} w={70} opacity={0.3} />
      <Line x={308} y={229} w={46} opacity={0.18} />
      <Panel x={380} y={20} w={116} h={44} r={22} />
      <circle cx="404" cy="42" r="10" fill={p.c} />
      <Line x={422} y={38} w={56} opacity={0.3} />
    </svg>
  );
}

type EmptyVariant = 'search' | 'inbox' | 'code';

/** Small illustration for "nothing here" states. */
function EmptyArt({ variant }: { variant: EmptyVariant }) {
  const p = paletteFor('profile');
  return (
    <svg className="mx-auto h-24 w-36" viewBox="0 0 160 110" fill="none" role="presentation" aria-hidden="true" focusable="false">
      <ellipse cx="80" cy="98" rx="52" ry="6" fill={INK} opacity="0.08" />
      {variant === 'search' && (
        <>
          <Panel x={26} y={16} w={90} h={66} r={10} />
          <Line x={40} y={32} w={50} opacity={0.25} />
          <Line x={40} y={48} w={36} opacity={0.15} />
          <circle cx="104" cy="62" r="22" fill={SURFACE} stroke={p.a} strokeWidth="7" />
          <path d="M120 78 l20 20" stroke={p.a} strokeWidth="9" strokeLinecap="round" />
          <path d="M96 62 h16" stroke={p.c} strokeWidth="4" strokeLinecap="round" />
        </>
      )}
      {variant === 'inbox' && (
        <>
          <Panel x={30} y={30} w={100} h={58} r={10} />
          <path d="M30 56 h30 l8 12 h24 l8 -12 h30" fill="none" stroke={INK} strokeOpacity="0.2" strokeWidth="3" strokeLinejoin="round" />
          <rect x="52" y="10" width="56" height="34" rx="8" fill={p.c} />
          <Line x={62} y={22} w={36} color="#ffffff" opacity={0.85} />
          <circle cx="126" cy="26" r="8" fill={p.b} />
        </>
      )}
      {variant === 'code' && (
        <>
          <Panel x={24} y={14} w={112} h={70} r={10} />
          <path d="M58 40 l-14 12 14 12 M102 40 l14 12 -14 12" fill="none" stroke={p.a} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M86 36 l-12 32" stroke={p.c} strokeWidth="5" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

/** Illustration plus a short message. Replaces the plain grey one-liners in empty lists. */
export function EmptyState({
  variant = 'inbox',
  title,
  hint,
  className = '',
}: {
  variant?: EmptyVariant;
  title: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center gap-1 py-8 text-center ${className}`}>
      <EmptyArt variant={variant} />
      <p className="mt-2 text-sm font-semibold text-white">{title}</p>
      {hint && <p className="max-w-xs text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

/** Larger "lost" illustration for the 404 page. */
export function NotFoundArt({ className = '' }: { className?: string }) {
  const p = paletteFor('profile');
  return (
    <svg className={className} viewBox="0 0 300 180" fill="none" role="presentation" aria-hidden="true" focusable="false">
      <ellipse cx="150" cy="166" rx="110" ry="9" fill={INK} opacity="0.08" />
      <Panel x={40} y={20} w={220} h={124} r={14} />
      <circle cx="62" cy="40" r="5" fill={p.a} />
      <circle cx="80" cy="40" r="5" fill={p.c} />
      <circle cx="98" cy="40" r="5" fill={p.d} />
      <text x="150" y="108" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="54" fontWeight="700" fill={p.a}>
        404
      </text>
      <Line x={70} y={124} w={90} opacity={0.2} />
      <circle cx="238" cy="118" r="26" fill={SURFACE} stroke={p.b} strokeWidth="8" />
      <path d="M257 137 l22 22" stroke={p.b} strokeWidth="10" strokeLinecap="round" />
      <path d="M230 110 l16 16 M246 110 l-16 16" stroke={p.c} strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
