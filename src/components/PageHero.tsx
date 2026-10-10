import type { ElementType, ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { heroPalette, toneForPath } from '../utils/tones';
import { SceneArt } from './illustrations/Scenes';

export interface HeroStat {
  icon: ElementType;
  value: string;
  label: string;
}

interface PageHeroProps {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  tags?: string[];
  stats?: HeroStat[];
  progress?: { value: number; max: number; label: string };
  action?: ReactNode;
  titleId?: string;
  /** Small back link above the title, like "< Courses" in the reference. */
  back?: { label: string; to: string };
  /** Person line under the title: avatar initials plus a name. */
  byline?: string;
  /** Keep the title in sentence case instead of uppercase (for personal greetings). */
  plainTitle?: boolean;
  /** Replaces the page's default banner illustration (e.g. the dashboard mascot). Sized to the banner height. */
  art?: ReactNode;
}

/** Abstract curved-glass artwork on the right of the banner (pure SVG, no image assets). */
function HeroArt({ tone }: { tone: string | undefined }) {
  const { arc, glow } = heroPalette(tone);
  return (
    <svg
      className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-[55%] sm:block"
      viewBox="0 0 600 340"
      preserveAspectRatio="xMaxYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="hero-arc" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor={arc[0]} />
          <stop offset="0.45" stopColor={arc[1]} />
          <stop offset="0.75" stopColor={arc[2]} />
          <stop offset="1" stopColor={arc[3]} />
        </linearGradient>
        <radialGradient id="hero-glow" cx="0.75" cy="0.4" r="0.7">
          <stop offset="0" stopColor={glow} stopOpacity="0.5" />
          <stop offset="1" stopColor={glow} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="600" height="340" fill="url(#hero-glow)" />
      <ellipse cx="560" cy="250" rx="330" ry="360" fill="none" stroke="url(#hero-arc)" strokeWidth="26" opacity="0.9" />
      <ellipse cx="590" cy="250" rx="330" ry="360" fill="none" stroke="url(#hero-arc)" strokeWidth="4" opacity="0.5" />
      <ellipse cx="620" cy="260" rx="300" ry="360" style={{ fill: 'var(--hero-inner)' }} />
    </svg>
  );
}

function StatStrip({ stats }: { stats: HeroStat[] }) {
  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-1">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className="flex items-center gap-2.5">
            <Icon className="hero-muted h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            <div className="text-[13px]">
              <dd className="inline font-semibold">{stat.value}</dd> <dt className="hero-muted inline">{stat.label}</dt>
            </div>
          </div>
        );
      })}
    </dl>
  );
}

function ProgressBar({ progress, className }: { progress: { value: number; max: number; label: string }; className: string }) {
  const percent = progress.max > 0 ? Math.min(100, (progress.value / progress.max) * 100) : 0;
  return (
    <div
      className={`hero-track overflow-hidden rounded-full ${className}`}
      role="progressbar"
      aria-label={progress.label}
      aria-valuenow={progress.value}
      aria-valuemin={0}
      aria-valuemax={progress.max}
    >
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${percent}%`, background: 'var(--c-cyan-400)' }} />
    </div>
  );
}

/** Banner at the top of a page: eyebrow, bold title, stat strip and a thin progress bar. */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  tags,
  stats,
  progress,
  action,
  titleId,
  back,
  byline,
  plainTitle,
  art,
}: PageHeroProps) {
  const tone = toneForPath(useLocation().pathname);

  return (
    <section aria-labelledby={titleId} className="hero relative mb-8 flex h-[14rem] flex-col overflow-hidden rounded-2xl px-5 pb-4 pt-5 md:px-7">
      <HeroArt tone={tone} />
      <div className="pointer-events-none absolute right-10 top-0 hidden h-full items-center xl:flex">
        <div className="animate-float h-[78%] max-h-full">{art ?? <SceneArt tone={tone} className="h-full w-auto" />}</div>
      </div>
      <div className="relative flex flex-1 flex-col">
        {back && (
          <Link to={back.to} className="hero-muted inline-flex items-center gap-1 text-sm transition-opacity hover:opacity-80">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            {back.label}
          </Link>
        )}
        {eyebrow && <p className="hero-muted font-mono text-[11px] uppercase tracking-widest">{eyebrow}</p>}
        <h1
          id={titleId}
          className={`mt-1 max-w-2xl font-heading text-xl font-bold leading-[1.1] md:text-[1.6rem] ${plainTitle ? '' : 'uppercase'}`}
        >
          {title}
        </h1>
        {byline && (
          <p className="mt-3 flex items-center gap-2.5 text-sm">
            <span className="hero-chip flex h-7 w-7 items-center justify-center rounded-full font-mono text-[10px] font-bold uppercase">
              {byline.slice(0, 2)}
            </span>
            {byline}
          </p>
        )}
        {subtitle && <div className="hero-muted mt-1.5 line-clamp-2 max-w-xl text-[13px] leading-snug">{subtitle}</div>}

        {(tags?.length || action) && (
          <div className="mt-3 flex max-w-xl flex-wrap items-center gap-2.5">
            {action}
            {tags?.slice(0, 3).map((tag) => (
              <span key={tag} className="hero-chip rounded px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto pt-2">
          {stats && stats.length > 0 && <StatStrip stats={stats} />}
          {progress && <ProgressBar progress={progress} className="mt-2.5 h-1 max-w-xl" />}
        </div>
      </div>
    </section>
  );
}
