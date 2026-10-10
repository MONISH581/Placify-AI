import { BrainCircuit, Loader2 } from 'lucide-react';
import { ErrorAlert } from '../StatusMessages';
import type { User } from '../../types';
import type { useAppData } from '../../context/AppDataContext';

type Analytics = ReturnType<typeof useAppData>['analytics'];

interface ReadinessHeroProps {
  user: User;
  analytics: Analytics;
  analyticsLoading: boolean;
  analyticsError: string | null;
  onRetry: () => void;
  solvedCount: number;
}

/** Welcome banner with the readiness score, model badges and strong/weak topics. */
export function ReadinessHero({ user, analytics, analyticsLoading, analyticsError, onRetry, solvedCount }: ReadinessHeroProps) {
  const readiness = analytics?.readiness ?? null;
  return (
      <section
        className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-[#0a101f]/90 via-[#0d162a]/90 to-[#0a101f]/90 p-6 shadow-2xl"
        aria-labelledby="readiness-heading"
      >
        <div className="relative z-10 flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-2xl space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wide text-cyan-400">
                <BrainCircuit className="h-3.5 w-3.5" aria-hidden="true" />
                {readiness ? `Model: ${readiness.model}` : 'Readiness model'}
              </span>
              {readiness?.isDemo && (
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 font-mono text-[11px] text-amber-300">
                  Demo model trained on synthetic data
                </span>
              )}
              {readiness?.source === 'fallback' && (
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 font-mono text-[11px] text-zinc-300">
                  Fallback estimate (ML service unavailable)
                </span>
              )}
            </div>
            <h1 id="readiness-heading" className="font-heading text-2xl font-black tracking-tight text-white">
              Welcome back, <span className="text-cyan-400">{user.username}</span>
            </h1>
            <p className="font-sans text-xs leading-relaxed text-zinc-400">
              Your readiness score is a demo estimate based on the share of the problem bank you have solved, your accuracy,
              streak, mock-interview scores, completed learning topics and practice volume. Treat it as a practice signal,
              not a hiring prediction.
            </p>

            {analyticsError && (
              <ErrorAlert message={`Could not load analytics: ${analyticsError}`} onRetry={onRetry} />
            )}

            {analytics && (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <span className="mr-1 font-mono text-[11px] font-bold uppercase text-zinc-400">Strengths:</span>
                {analytics.strongTopics.length > 0 ? (
                  analytics.strongTopics.map((topic) => (
                    <span
                      key={topic}
                      className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[11px] font-medium text-emerald-300"
                    >
                      {topic}
                    </span>
                  ))
                ) : (
                  <span className="font-mono text-[11px] text-zinc-400">Solve more problems to reveal strengths</span>
                )}

                <span className="ml-3 mr-1 font-mono text-[11px] font-bold uppercase text-zinc-400">Needs work:</span>
                {analytics.weakTopics.length > 0 ? (
                  analytics.weakTopics.map((topic) => (
                    <span
                      key={topic}
                      className="rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-0.5 font-mono text-[11px] font-medium text-rose-300"
                    >
                      {topic}
                    </span>
                  ))
                ) : (
                  <span className="font-mono text-[11px] text-zinc-400">None identified yet</span>
                )}
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-6 rounded-xl border border-white/5 bg-black/40 p-4">
            {analyticsLoading && !analytics ? (
              <div className="flex items-center gap-2 font-mono text-xs text-cyan-300" role="status">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Computing readiness...
              </div>
            ) : (
              <>
                <div className="border-r border-white/10 pr-5 text-center">
                  <div className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text font-mono text-3xl font-black text-transparent">
                    {readiness ? `${readiness.score}%` : '--'}
                  </div>
                  <p className="mt-1 font-mono text-[11px] font-bold uppercase text-cyan-300">Readiness score</p>
                </div>
                <div className="space-y-1 text-left font-mono text-[11px]">
                  <p className={readiness?.placementReady ? 'font-bold text-emerald-300' : 'font-bold text-amber-300'}>
                    {readiness ? (readiness.placementReady ? 'On track for placements' : 'Keep practicing') : 'No estimate yet'}
                  </p>
                  <p className="text-zinc-400">Solved: {analytics?.metrics.problemsSolved ?? solvedCount}</p>
                  <p className="text-zinc-400">Streak: {analytics?.metrics.streak ?? user.streak} days</p>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
  );
}
