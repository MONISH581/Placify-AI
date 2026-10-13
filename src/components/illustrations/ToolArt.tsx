import { Avatar, INK, Line, Panel, SURFACE, paletteFor } from './Scenes';

/** Mock-interview scene: the interviewer waits with a typing indicator while a candidate answer bubble sits ready. */
export function InterviewWaitingArt({ className = '' }: { className?: string }) {
  const p = paletteFor('interview');
  return (
    <svg className={className} viewBox="0 0 400 220" fill="none" role="presentation" aria-hidden="true" focusable="false">
      <ellipse cx="200" cy="110" rx="180" ry="90" fill={p.a} opacity="0.09" />
      <Panel x={26} y={26} w={250} h={78} r={22} />
      <Avatar cx={66} cy={65} r={24} color={p.a} />
      <Line x={104} y={50} w={120} opacity={0.3} />
      <Line x={104} y={70} w={86} opacity={0.18} />
      <rect x="130" y="124" width="244" height="72" rx="22" fill={p.a} />
      <circle cx="170" cy="160" r="7" fill="#ffffff" className="animate-blink" />
      <circle cx="196" cy="160" r="7" fill="#ffffff" className="animate-blink" style={{ animationDelay: '0.2s' }} />
      <circle cx="222" cy="160" r="7" fill="#ffffff" className="animate-blink" style={{ animationDelay: '0.4s' }} />
      <Line x={252} y={156} w={90} color="#ffffff" opacity={0.45} />
      <circle cx="350" cy="52" r="22" fill={p.c} />
      <rect x="343.5" y="39" width="13" height="20" rx="6.5" fill="#ffffff" />
      <path d="M338 54 a12 12 0 0 0 24 0 M350 66 v7" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Resume scene: a document with a scan line sweeping over it. The scan animates only while `scanning` is true. */
export function ResumeScanArt({ scanning = false, className = '' }: { scanning?: boolean; className?: string }) {
  const p = paletteFor('resume');
  return (
    <svg className={className} viewBox="0 0 240 220" fill="none" role="presentation" aria-hidden="true" focusable="false">
      <ellipse cx="120" cy="110" rx="110" ry="90" fill={p.a} opacity="0.09" />
      <Panel x={50} y={14} w={140} h={190} r={14} />
      <Avatar cx={84} cy={50} r={17} color={p.a} />
      <Line x={110} y={40} w={62} opacity={0.35} />
      <Line x={110} y={57} w={42} opacity={0.2} />
      <rect x="68" y="82" width="104" height="3" rx="1.5" fill={INK} opacity="0.12" />
      <Line x={68} y={98} w={104} opacity={0.18} />
      <Line x={68} y={114} w={86} opacity={0.18} />
      <Line x={68} y={130} w={98} opacity={0.18} />
      <rect x="68" y="150" width="36" height="14" rx="7" fill={p.c} opacity="0.9" />
      <rect x="110" y="150" width="30" height="14" rx="7" fill={p.d} opacity="0.9" />
      <rect x="146" y="150" width="26" height="14" rx="7" fill={p.b} opacity="0.9" />
      <g className={scanning ? 'animate-scan' : undefined}>
        <rect x="42" y="18" width="156" height="5" rx="2.5" fill={p.b} opacity={scanning ? 0.9 : 0.5} />
        <rect x="42" y="14" width="156" height="14" rx="4" fill={p.b} opacity={scanning ? 0.18 : 0.08} />
      </g>
      <circle cx="196" cy="176" r="18" fill={SURFACE} stroke={p.a} strokeWidth="6" />
      <path d="M209 189 l16 16" stroke={p.a} strokeWidth="8" strokeLinecap="round" />
    </svg>
  );
}
