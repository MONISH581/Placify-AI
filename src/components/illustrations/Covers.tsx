import { useState } from 'react';

/** Generated cover art (learning-track covers) and company marks. Pure SVG/CSS, no image files. */

function hashOf(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

const TRACK_STYLE: Record<string, { hue: number; mark: string; snippet: [string, string, string] }> = {
  python: { hue: 215, mark: 'Py', snippet: ['def solve(n):', '  return n * 2', 'print(solve(21))'] },
  java: { hue: 18, mark: 'Jv', snippet: ['class Main {', '  void run() {}', '}'] },
  c: { hue: 235, mark: 'C', snippet: ['int main(void) {', '  return 0;', '}'] },
  cpp: { hue: 275, mark: 'C++', snippet: ['vector<int> v;', 'sort(v.begin(),', '     v.end());'] },
  javascript: { hue: 48, mark: 'JS', snippet: ['const sum = (a, b)', '  => a + b;', 'sum(2, 3);'] },
  w3schools: { hue: 152, mark: 'W3', snippet: ['<h1>Hello</h1>', '<p>Learn the', 'web basics</p>'] },
};

/** Cover card for a learning track: gradient, monogram, and a few lines of sample code. */
export function TrackCover({ id, className = '' }: { id: string; className?: string }) {
  const style = TRACK_STYLE[id] ?? { hue: hashOf(id) % 360, mark: id.slice(0, 2).toUpperCase(), snippet: ['// learn', '// practise', '// ship'] as [string, string, string] };
  const { hue } = style;
  const gradId = `track-${id.replace(/\W/g, '')}`;
  return (
    <svg className={className} viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice" role="presentation" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={`hsl(${hue} 70% 30%)`} />
          <stop offset="1" stopColor={`hsl(${hue + 35} 75% 52%)`} />
        </linearGradient>
      </defs>
      <rect width="160" height="90" fill={`url(#${gradId})`} />
      <circle cx="150" cy="86" r="48" fill="#ffffff" opacity="0.08" />
      <circle cx="150" cy="86" r="30" fill="#ffffff" opacity="0.1" />
      <circle cx="18" cy="8" r="20" fill="#ffffff" opacity="0.07" />
      <rect x="68" y="14" width="80" height="50" rx="7" fill="#000000" opacity="0.38" />
      <circle cx="76" cy="21" r="2" fill="#ff6b6b" />
      <circle cx="83" cy="21" r="2" fill="#ffd166" />
      <circle cx="90" cy="21" r="2" fill="#6bd18f" />
      {style.snippet.map((line, i) => (
        <text key={line} x="74" y={36 + i * 11} fontFamily="ui-monospace, monospace" fontSize="6.5" fill="#ffffff" opacity={i === 1 ? 0.95 : 0.7}>
          {line}
        </text>
      ))}
      <text x="14" y="58" fontFamily="system-ui, sans-serif" fontSize={style.mark.length > 2 ? 26 : 32} fontWeight="800" fill="#ffffff">
        {style.mark}
      </text>
      <rect x="14" y="66" width="30" height="3" rx="1.5" fill="#ffffff" opacity="0.6" />
    </svg>
  );
}

/** Logo files in public/logos, keyed by the canonical company names in data/companies.ts. */
const LOGO_FILES: Record<string, string> = {
  Google: 'google.svg',
  Microsoft: 'microsoft.svg',
  Amazon: 'amazon.svg',
  Meta: 'meta.svg',
  Netflix: 'netflix.svg',
  Apple: 'apple.svg',
  Uber: 'uber.svg',
  Lyft: 'lyft.svg',
  Airbnb: 'airbnb.svg',
  Adobe: 'adobe.png',
  Twitter: 'x.svg',
  Salesforce: 'salesforce.svg',
  Bloomberg: 'bloomberg.png',
  Atlassian: 'atlassian.svg',
  ByteDance: 'bytedance.svg',
  Oracle: 'oracle.png',
  Intel: 'intel.svg',
  Cisco: 'cisco.svg',
  Stripe: 'stripe.svg',
  Square: 'square.svg',
  PayPal: 'paypal.svg',
  'Goldman Sachs': 'goldmansachs.svg',
  TCS: 'tcs.svg',
  Infosys: 'infosys.svg',
  Wipro: 'wipro.svg',
  Accenture: 'accenture.svg',
  Flipkart: 'flipkart.png',
  Zoho: 'zoho.svg',
};

/** Company logo on a white tile. Falls back to a coloured monogram for unknown companies or if the file fails to load. */
export function CompanyMark({ name, size = 36 }: { name: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const file = LOGO_FILES[name];
  if (file && !failed) {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#ffffff] shadow-sm ring-1 ring-[#000000]/10"
        style={{ width: size, height: size, padding: size * 0.16 }}
      >
        <img
          src={`/logos/${file}`}
          alt={`${name} logo`}
          className="h-full w-full object-contain"
          loading="lazy"
          draggable={false}
          onError={() => setFailed(true)}
        />
      </span>
    );
  }
  const hue = hashOf(name) % 360;
  const letters = name.replace(/[^A-Za-z0-9 ]/g, '').trim().split(/\s+/).map((word) => word[0]).join('').slice(0, 2).toUpperCase() || '?';
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-lg font-heading font-extrabold text-white shadow-sm"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: `linear-gradient(135deg, hsl(${hue} 68% 36%), hsl(${hue + 30} 72% 52%))`,
      }}
    >
      {letters}
    </span>
  );
}
