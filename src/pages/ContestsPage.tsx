/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Clock, ListChecks, Loader2, Users } from 'lucide-react';
import { ErrorAlert, LoadingBlock } from '../components/StatusMessages';
import { useRequiredUser } from '../context/AuthContext';
import { api, describeApiError } from '../services/api';
import type { Contest } from '../types';
import { Trophy as HeroTrophy } from 'lucide-react';
import { PageHero } from '../components/PageHero';
import { EmptyState } from '../components/illustrations/Scenes';

type ContestPhase = 'Upcoming' | 'Live' | 'Ended';

const MINUTE = 60_000;

function phaseOf(start: Date, durationMinutes: number, now: number): ContestPhase {
  if (Number.isNaN(start.getTime())) return 'Upcoming';
  if (now < start.getTime()) return 'Upcoming';
  return now < start.getTime() + durationMinutes * MINUTE ? 'Live' : 'Ended';
}

interface PhaseStyle {
  dot: string;
  text: string;
  bar: string;
  badge: string;
  ring: string;
  card: string;
  chip: string;
  tile: string;
  rings: string;
  heading: string;
}

const PHASE_STYLE: Record<ContestPhase, PhaseStyle> = {
  Upcoming: {
    dot: 'bg-[#EC6FA4]',
    text: 'text-[#C2255C] dark:text-[#F783AC]',
    bar: 'bg-[#F27FAF]',
    badge: 'bg-[#F783AC]/15',
    ring: 'ring-[#F783AC]/40',
    card: 'from-[#F9A8C9]/[0.30] via-slate-900 to-slate-900 dark:from-[#8A1F4D]/[0.45]',
    chip: 'bg-[#F783AC]/15 text-[#B8205A] dark:bg-[#B8326A]/25 dark:text-[#FBB6D1]',
    tile: 'bg-[#F9B4D0] text-[#6B1635] dark:bg-[#7A1F4A] dark:text-[#FFD6E6]',
    rings: 'border-[#F783AC]/30',
    heading: 'Upcoming',
  },
  Live: {
    dot: 'bg-[#6FCF97]',
    text: 'text-[#1F8A4C] dark:text-[#6FCF97]',
    bar: 'bg-[#7DD6A3]',
    badge: 'bg-[#6FCF97]/15',
    ring: 'ring-[#6FCF97]/40',
    card: 'from-[#A8E6C1]/[0.30] via-slate-900 to-slate-900 dark:from-[#14532D]/[0.55]',
    chip: 'bg-[#6FCF97]/15 text-[#1B7A44] dark:bg-[#1F7A4A]/30 dark:text-[#A8E6C1]',
    tile: 'bg-[#B5EACB] text-[#124A2B] dark:bg-[#1B5E3A] dark:text-[#CFF5DF]',
    rings: 'border-[#6FCF97]/30',
    heading: 'Live now',
  },
  Ended: {
    dot: 'bg-slate-600',
    text: 'text-slate-400',
    bar: 'bg-slate-600',
    badge: 'bg-slate-800',
    ring: 'ring-slate-800',
    card: 'from-slate-700/30 via-slate-900 to-slate-900',
    chip: 'bg-slate-800 text-slate-300',
    tile: 'bg-slate-700 text-slate-200',
    rings: 'border-slate-700/40',
    heading: 'Past',
  },
};

const PHASE_ORDER: ContestPhase[] = ['Live', 'Upcoming', 'Ended'];

/** "2d 4h", "3h 20m" or "12m": the two largest non-zero units of a duration. */
function formatSpan(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / MINUTE));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

/** Topic of a problem id such as "prob-arrays-two-sum" -> "Arrays". */
function topicOf(problemId: string): string | null {
  const [prefix, topic] = problemId.split('-');
  if (prefix !== 'prob' || !topic) return null;
  return topic.charAt(0).toUpperCase() + topic.slice(1);
}

/** Month on top, big day below, plus the start time, on a solid phase-coloured tile. */
function DateTile({ date, timeLabel, phase }: { date: Date; timeLabel: string; phase: ContestPhase }) {
  const style = PHASE_STYLE[phase];
  const valid = !Number.isNaN(date.getTime());
  return (
    <div className={`flex w-14 shrink-0 flex-col items-center justify-center rounded-lg py-1.5 text-center ${style.tile}`}>
      <span className="font-mono text-[10px] font-bold uppercase tracking-widest opacity-80">
        {valid ? date.toLocaleString([], { month: 'short' }) : 'TBA'}
      </span>
      <span className="font-heading text-2xl font-extrabold leading-none">{valid ? date.getDate() : '--'}</span>
      <span className="mt-0.5 font-mono text-[10px] font-semibold opacity-80">{timeLabel}</span>
    </div>
  );
}

/** Right-hand status block: a countdown (upcoming), time left plus progress (live) or time since (ended). */
function StatusBlock({ phase, start, durationMinutes, now }: { phase: ContestPhase; start: Date; durationMinutes: number; now: number }) {
  const style = PHASE_STYLE[phase];
  if (Number.isNaN(start.getTime())) return null;
  const end = start.getTime() + durationMinutes * MINUTE;
  const label = phase === 'Upcoming' ? 'Starts in' : phase === 'Live' ? 'Ends in' : 'Ended';
  const value = phase === 'Upcoming' ? formatSpan(start.getTime() - now) : phase === 'Live' ? formatSpan(end - now) : `${formatSpan(now - end)} ago`;
  const progress = Math.min(100, Math.max(0, ((now - start.getTime()) / (durationMinutes * MINUTE)) * 100));
  return (
    <div>
      <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`font-heading text-base font-bold leading-tight ${style.text}`}>{value}</p>
      {phase === 'Live' && (
        <div
          className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-800"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Contest progress"
        >
          <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}

export default function ContestsPage() {
  const user = useRequiredUser();
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const requestRef = useRef(0);
  const [now, setNow] = useState(() => Date.now());

  // Keeps countdowns and live progress fresh without refetching.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const loadContests = useCallback(async () => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setLoadError(null);
    try {
      // The token is attached automatically so the server can compute isRegistered for this user.
      const result = await api.get<Contest[]>('/api/contests');
      if (requestId !== requestRef.current) return;
      if (result.ok && Array.isArray(result.data)) {
        setContests(result.data);
        setNow(Date.now());
      } else setLoadError(result.ok ? 'Unexpected response format.' : result.error);
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, []);

  // Reload (and drop any previous user's registration state) whenever the signed-in user changes.
  useEffect(() => {
    setContests([]);
    setPending({});
    setErrors({});
    void loadContests();
  }, [loadContests, user.id]);

  const register = async (contestId: string) => {
    if (pending[contestId]) return;
    setPending((prev) => ({ ...prev, [contestId]: true }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[contestId];
      return next;
    });
    try {
      const result = await api.post<Contest>(`/api/contests/${encodeURIComponent(contestId)}/register`);
      if (result.ok && result.data?.id) {
        const updated = result.data;
        setContests((prev) =>
          prev.map((contest) =>
            contest.id === updated.id ? { ...contest, ...updated, isRegistered: updated.isRegistered ?? true } : contest,
          ),
        );
      } else {
        setErrors((prev) => ({ ...prev, [contestId]: result.ok ? 'Unexpected response from the server.' : describeApiError(result) }));
      }
    } finally {
      setPending((prev) => {
        const next = { ...prev };
        delete next[contestId];
        return next;
      });
    }
  };

  if (loading && contests.length === 0) return <LoadingBlock label="Loading contests..." />;

  const withPhase = contests.map((contest) => {
    const start = new Date(contest.startTime);
    return { contest, start, phase: phaseOf(start, contest.durationMinutes, now) };
  });
  const startMs = (item: { start: Date }) => (Number.isNaN(item.start.getTime()) ? Infinity : item.start.getTime());
  const groups = PHASE_ORDER.map((phase) => ({
    phase,
    items: withPhase
      .filter((item) => item.phase === phase)
      // Soonest first, except past contests which read most recent first.
      .sort((a, b) => (phase === 'Ended' ? startMs(b) - startMs(a) : startMs(a) - startMs(b))),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="space-y-8">
      <PageHero
        titleId="contests-heading"
        eyebrow="Practice"
        title="Contests"
        subtitle="Join scheduled timed contests and compete with other learners."
        stats={[{ icon: HeroTrophy, value: String(contests.length), label: contests.length === 1 ? 'contest' : 'contests' }]}
      />
      {loadError && <ErrorAlert message={`Could not load contests: ${loadError}`} onRetry={() => void loadContests()} />}
      {!loadError && contests.length === 0 && (
        <EmptyState variant="inbox" title="No contests scheduled" hint="Check back soon for the next timed contest." />
      )}

      {groups.map((group) => {
        const groupStyle = PHASE_STYLE[group.phase];
        return (
          <section key={group.phase} aria-label={groupStyle.heading} className="space-y-2">
            <h2 className={`flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest ${groupStyle.text}`}>
              <span className={`h-2 w-2 rounded-full ${groupStyle.dot}`} aria-hidden="true" />
              {groupStyle.heading}
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300">{group.items.length}</span>
            </h2>

            {group.items.map(({ contest, start, phase }) => {
              const isPending = Boolean(pending[contest.id]);
              const phaseStyle = PHASE_STYLE[phase];
              const timeLabel = Number.isNaN(start.getTime()) ? 'time TBA' : start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
              const facts = [
                { icon: Clock, text: `${contest.durationMinutes} min` },
                { icon: ListChecks, text: `${contest.problems?.length ?? 0} problems` },
                { icon: Users, text: `${contest.registrantsCount ?? 0} registered` },
              ];
              const topics = Array.from(new Set((contest.problems ?? []).map(topicOf).filter((topic): topic is string => Boolean(topic))));
              const tags = [...facts.map((fact) => ({ key: fact.text, icon: fact.icon, text: fact.text })), ...topics.map((topic) => ({ key: topic, icon: null, text: topic }))];
              return (
                <article
                  key={contest.id}
                  className={`relative flex flex-col gap-3 overflow-hidden rounded-lg bg-gradient-to-r ${phaseStyle.card} py-3 pl-5 pr-4 ring-1 ring-inset ${phaseStyle.ring} transition-colors hover:ring-2 sm:flex-row sm:items-center`}
                >
                  <span className={`absolute inset-y-0 left-0 w-1 ${phaseStyle.bar}`} aria-hidden="true" />

                  <DateTile date={start} timeLabel={timeLabel} phase={phase} />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <h3 className="font-heading text-base font-bold leading-snug text-white">{contest.title}</h3>
                      <p
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-px font-mono text-[10px] font-semibold uppercase tracking-widest ${phaseStyle.badge} ${phaseStyle.text}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${phaseStyle.dot}`} aria-hidden="true" />
                        {phase}
                      </p>
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">{contest.description}</p>
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {tags.map((tag) => (
                        <li
                          key={tag.key}
                          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${tag.icon ? phaseStyle.chip : 'bg-slate-800/80 text-slate-300'}`}
                        >
                          {tag.icon && <tag.icon className="h-3 w-3" aria-hidden="true" />}
                          {tag.text}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex shrink-0 flex-col gap-2 sm:w-40 sm:border-l sm:border-slate-700/60 sm:pl-4">
                    <StatusBlock phase={phase} start={start} durationMinutes={contest.durationMinutes} now={now} />
                    {errors[contest.id] && <ErrorAlert message={errors[contest.id]} />}
                    <button
                      type="button"
                      disabled={contest.isRegistered || isPending}
                      onClick={() => void register(contest.id)}
                      className={`flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed ${
                        contest.isRegistered
                          ? 'bg-emerald-400/10 text-emerald-400 ring-1 ring-inset ring-emerald-400/30'
                          : 'bg-[#F9B4D0] text-[#6B1635] hover:brightness-95 disabled:opacity-60 dark:bg-[#8A1F4D] dark:text-[#FFD6E6]'
                      }`}
                    >
                      {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                      {contest.isRegistered && <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
                      {contest.isRegistered ? 'Registered' : isPending ? 'Registering...' : 'Register'}
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
