/**
 * One colour per page. The banner artwork is generated from the hue here, and the matching accent palette
 * (buttons, highlights, active markers) comes from the `[data-tone]` blocks in src/theme.css, which are
 * generated from the same table. If you add or change a page hue, regenerate that block with the same hues.
 */
export const PAGE_HUES: Record<string, number> = {
  dashboard: 217, // blue
  arena: 186, // cyan
  tracks: 250, // indigo
  contests: 356, // rose
  interview: 278, // violet
  resume: 332, // pink
  companies: 45, // amber
  placement: 305, // purple-pink
  career: 20, // orange
  community: 80, // lime
  profile: 130, // green
  admin: 158, // mint
};

/** The page key for a route (first path segment), or undefined for pages without their own colour. */
export function toneForPath(pathname: string): string | undefined {
  const first = pathname.split('/')[1];
  return first in PAGE_HUES ? first : undefined;
}

function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360;
  const sat = s / 100;
  const light = l / 100;
  const k = (n: number) => (n + hue / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const hex = (x: number) => Math.round(255 * x).toString(16).padStart(2, '0');
  return `#${hex(f(0))}${hex(f(8))}${hex(f(4))}`;
}

/** Four bright artwork colours and a glow derived from one hue, so banner art matches the page accent. */
export function heroPalette(tone: string | undefined): { arc: [string, string, string, string]; glow: string } {
  const h = tone !== undefined && tone in PAGE_HUES ? PAGE_HUES[tone] : 217;
  return {
    arc: [hslToHex(h - 45, 95, 62), hslToHex(h - 15, 95, 66), hslToHex(h + 25, 90, 72), hslToHex(h + 60, 90, 70)],
    glow: hslToHex(h, 85, 58),
  };
}
