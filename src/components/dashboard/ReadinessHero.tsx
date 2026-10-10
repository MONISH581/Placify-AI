import { ArrowRight, CheckSquare, Flame, MessageSquare, Target } from 'lucide-react';
import { ErrorAlert } from '../StatusMessages';
import { PageHero, type HeroStat } from '../PageHero';
import { ReadinessMascot } from '../illustrations/Mascot';
import type { ProblemRecommendation, User } from '../../types';
import type { useAppData } from '../../context/AppDataContext';

type Analytics = ReturnType<typeof useAppData>['analytics'];

interface ReadinessHeroProps {
  user: User;
  analytics: Analytics;
  analyticsLoading: boolean;
  analyticsError: string | null;
  onRetry: () => void;
  /** The one thing to do today (recommended or next unsolved problem). */
  next: Pick<ProblemRecommendation, 'id' | 'title'> | null;
  onStart: (problemId: string) => void;
  solvedCount: number;
  totalProblems: number;
}

/** Top banner of the dashboard: where you stand, today's one action, and the headline numbers. */
export function ReadinessHero({
  user,
  analytics,
  analyticsLoading,
  analyticsError,
  onRetry,
  next,
  onStart,
  solvedCount,
  totalProblems,
}: ReadinessHeroProps) {
  const readiness = analytics?.readiness ?? null;
  const weak = analytics?.weakTopics[0];
  const interviewAverage = analytics?.metrics.interviewAverage;

  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

  const title = readiness
    ? `${user.username}, you're ${readiness.score}% ready`
    : analyticsLoading
      ? `Good to see you, ${user.username}`
      : `Welcome back, ${user.username}`;

  const plan = next
    ? weak
      ? `Today: work on ${weak.toLowerCase()}, starting with "${next.title}".`
      : `Today: start with "${next.title}".`
    : 'You have solved every problem in the bank. Revisit a mock interview or a learning track.';

  const stats: HeroStat[] = [
    { icon: CheckSquare, value: `${solvedCount}/${totalProblems}`, label: 'problems solved' },
    { icon: Target, value: `${user.accuracy}%`, label: 'accuracy' },
    {
      icon: MessageSquare,
      value: interviewAverage !== null && interviewAverage !== undefined ? `${Math.round(interviewAverage)}%` : '--',
      label: 'interview avg',
    },
    { icon: Flame, value: `${user.streak}`, label: user.streak === 1 ? 'day streak' : 'days streak' },
  ];

  return (
    <>
      <PageHero
        titleId="today-heading"
        plainTitle
        art={<ReadinessMascot score={readiness?.score ?? null} className="h-full w-auto" />}
        eyebrow={today}
        title={title}
        subtitle={
          <>
            <p>{plan}</p>
            {readiness && (
              <p className="mt-1 text-xs opacity-80">
                {readiness.placementReady ? 'On track for placements.' : 'Keep practising to move readiness up.'}
                {readiness.isDemo && ' Demo model trained on synthetic data, not a hiring prediction.'}
                {readiness.source === 'fallback' && ' ML service unavailable, using a fallback formula.'}
              </p>
            )}
          </>
        }
        action={
          next ? (
            <button
              type="button"
              onClick={() => onStart(next.id)}
              className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-cyan-400 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-cyan-300"
            >
              Start <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : undefined
        }
        stats={stats}
        progress={{ value: readiness?.score ?? 0, max: 100, label: 'Placement readiness' }}
      />
      {analyticsError && (
        <div className="mb-6">
          <ErrorAlert message={`Could not load analytics: ${analyticsError}`} onRetry={onRetry} />
        </div>
      )}
    </>
  );
}
