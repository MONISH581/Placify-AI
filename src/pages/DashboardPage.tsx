/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useNavigate } from 'react-router-dom';
import {
  Award,
  BookOpen,
  BrainCircuit,
  CheckSquare,
  ChevronRight,
  GraduationCap,
  Loader2,
  MessageSquare,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { ActivityHeatmap } from '../components/ActivityHeatmap';
import { ReadinessBand } from '../components/ReadinessBand';
import { ErrorAlert } from '../components/StatusMessages';
import { useAppData } from '../context/AppDataContext';
import { useRequiredUser } from '../context/AuthContext';
import type { Difficulty } from '../types';

const difficultyBadge: Record<Difficulty, string> = {
  Easy: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-300',
  Medium: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
  Hard: 'border-rose-500/20 bg-rose-500/10 text-rose-300',
};

const quickActions = [
  {
    title: 'Placement Hub',
    description: 'Revise OS, DBMS, networks, SQL and aptitude with flashcards and MCQs.',
    path: '/placement',
    icon: GraduationCap,
  },
  {
    title: 'Mock Interview',
    description: 'Answer Technical, HR or Behavioral questions and get scored feedback.',
    path: '/interview',
    icon: MessageSquare,
  },
  {
    title: 'Learning Tracks',
    description: 'Study a topic and pass its checkpoint quiz to mark it complete.',
    path: '/tracks',
    icon: BookOpen,
  },
];

export default function DashboardPage() {
  const user = useRequiredUser();
  const navigate = useNavigate();
  const { analytics, analyticsLoading, analyticsError, refreshAnalytics, problems } = useAppData();

  const solvedIds = user.problemsSolved ?? [];
  const badges = user.badges ?? [];
  const solvedCount = solvedIds.length;
  const totalProblems = problems.length;
  const solvedPercent = totalProblems > 0 ? Math.min(100, Math.round((solvedCount / totalProblems) * 100)) : 0;

  const readiness = analytics?.readiness ?? null;
  const recommendations = analytics?.recommendations ?? [];
  const featuredRecommendation = recommendations[0] ?? null;
  const featuredProblem = featuredRecommendation
    ? problems.find((problem) => problem.id === featuredRecommendation.id) ?? null
    : problems.find((problem) => !solvedIds.includes(problem.id)) ?? null;
  const featured = featuredRecommendation ?? featuredProblem;

  const openProblem = (problemId: string) => navigate(`/arena/${encodeURIComponent(problemId)}`);

  const stats = [
    {
      id: 'stat-xp',
      title: 'TOTAL XP',
      value: String(user.xp),
      subtitle: `Level ${user.level} · ${user.streak}-day streak`,
      icon: Sparkles,
    },
    {
      id: 'stat-solved',
      title: 'SOLVED PROBLEMS',
      value: `${solvedCount} / ${totalProblems}`,
      subtitle: `${solvedPercent}% of the problem bank`,
      icon: CheckSquare,
      progress: solvedPercent,
    },
    {
      id: 'stat-accuracy',
      title: 'SUBMISSION ACCURACY',
      value: `${user.accuracy}%`,
      subtitle: analytics ? `${analytics.metrics.totalSubmissions} submissions in total` : 'Accepted / total submissions',
      icon: TrendingUp,
      progress: Math.max(0, Math.min(100, user.accuracy)),
    },
    {
      id: 'stat-interview',
      title: 'MOCK INTERVIEW AVG',
      value:
        analytics?.metrics.interviewAverage !== null && analytics?.metrics.interviewAverage !== undefined
          ? `${Math.round(analytics.metrics.interviewAverage)}%`
          : '--',
      subtitle: 'Average score of completed interviews',
      icon: MessageSquare,
    },
  ];

  return (
    <div className="space-y-6" id="dashboard-container">
      <ReadinessBand user={user} />

      {/* Readiness banner */}
      <section
        className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-[#0a101f]/90 via-[#0d162a]/90 to-[#0a101f]/90 p-6 shadow-2xl backdrop-blur-md"
        aria-labelledby="readiness-heading"
      >
        <div className="relative z-10 flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-2xl space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-cyan-400">
                <BrainCircuit className="h-3.5 w-3.5" aria-hidden="true" />
                {readiness ? `Model: ${readiness.model}` : 'Readiness model'}
              </span>
              {readiness?.isDemo && (
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 font-mono text-[10px] text-amber-300">
                  Demo model trained on synthetic data
                </span>
              )}
              {readiness?.source === 'fallback' && (
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 font-mono text-[10px] text-zinc-300">
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
              <ErrorAlert message={`Could not load analytics: ${analyticsError}`} onRetry={() => void refreshAnalytics()} />
            )}

            {analytics && (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <span className="mr-1 font-mono text-[10px] font-bold uppercase text-zinc-500">Strengths:</span>
                {analytics.strongTopics.length > 0 ? (
                  analytics.strongTopics.map((topic) => (
                    <span
                      key={topic}
                      className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10px] font-medium text-emerald-300"
                    >
                      {topic}
                    </span>
                  ))
                ) : (
                  <span className="font-mono text-[10px] text-zinc-500">Solve more problems to reveal strengths</span>
                )}

                <span className="ml-3 mr-1 font-mono text-[10px] font-bold uppercase text-zinc-500">Needs work:</span>
                {analytics.weakTopics.length > 0 ? (
                  analytics.weakTopics.map((topic) => (
                    <span
                      key={topic}
                      className="rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-0.5 font-mono text-[10px] font-medium text-rose-300"
                    >
                      {topic}
                    </span>
                  ))
                ) : (
                  <span className="font-mono text-[10px] text-zinc-500">None identified yet</span>
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
                  <p className="mt-1 font-mono text-[9px] font-bold uppercase text-cyan-300">Readiness score</p>
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

      {/* Overview stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4" id="stats-grid">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.id}
              id={stat.id}
              className="flex flex-col justify-between rounded-2xl border border-white/5 bg-[#0a101f]/60 p-5 shadow-lg backdrop-blur-md transition-all hover:border-cyan-500/25"
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="font-mono text-[9px] font-bold tracking-wider text-zinc-500">{stat.title}</p>
                <Icon className="h-4 w-4 text-cyan-400" aria-hidden="true" />
              </div>
              <div className="font-heading text-2xl font-bold tracking-tight text-white">{stat.value}</div>
              {stat.progress !== undefined && (
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                    style={{ width: `${stat.progress}%` }}
                  />
                </div>
              )}
              <p className="mt-2 font-mono text-[9px] text-zinc-400">{stat.subtitle}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3" id="dashboard-content-split">
        <div className="space-y-6 lg:col-span-2" id="dashboard-left-col">
          {/* Recommended next problem */}
          <section className="flex flex-col overflow-hidden rounded-2xl border border-white/5 bg-[#0a101f]/60 shadow-xl backdrop-blur-md transition hover:border-cyan-500/20">
            <div className="flex items-center justify-between border-b border-white/5 bg-black/20 p-4">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-cyan-400" aria-hidden="true" />
                <h2 className="font-mono text-[10px] font-bold uppercase tracking-wider text-white">
                  {featuredRecommendation ? 'Recommended next problem' : 'Next unsolved problem'}
                </h2>
              </div>
              {featured && (
                <div className="flex gap-2">
                  <span className={`rounded-md border px-2 py-0.5 font-mono text-[9px] font-bold ${difficultyBadge[featured.difficulty]}`}>
                    {featured.difficulty}
                  </span>
                  {featured.tags[0] && (
                    <span className="rounded-md bg-white/5 px-2 py-0.5 font-mono text-[9px] font-bold text-zinc-400">
                      {featured.tags[0]}
                    </span>
                  )}
                </div>
              )}
            </div>

            {featured ? (
              <>
                <div className="p-6">
                  <h3 className="mb-2 font-heading text-xl font-bold tracking-tight text-white">{featured.title}</h3>
                  {featuredProblem?.description && (
                    <p className="line-clamp-4 whitespace-pre-wrap font-sans text-xs leading-relaxed text-zinc-300">
                      {featuredProblem.description}
                    </p>
                  )}
                  {featuredProblem?.examples?.[0] && (
                    <div className="mt-4 rounded-xl border border-white/5 bg-black/40 p-4 font-mono text-[11px] text-cyan-300">
                      <p className="whitespace-pre-wrap">Input: {featuredProblem.examples[0].input}</p>
                      <p className="whitespace-pre-wrap">Output: {featuredProblem.examples[0].output}</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-end border-t border-white/5 bg-black/10 p-4">
                  <button
                    type="button"
                    id="solve-daily-challenge-btn"
                    onClick={() => openProblem(featured.id)}
                    className="cursor-pointer rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-2 text-xs font-black text-white shadow-md shadow-cyan-500/10 transition hover:brightness-110"
                  >
                    Solve in Arena
                  </button>
                </div>
              </>
            ) : (
              <p className="p-6 text-xs text-zinc-400">
                {problems.length === 0 ? 'No problems are available yet.' : 'You have solved every problem in the bank. Nice work!'}
              </p>
            )}
          </section>

          {/* Quick actions to real features */}
          <section className="rounded-2xl border border-white/5 bg-[#0a101f]/60 p-5 shadow-xl backdrop-blur-md">
            <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-white">Keep your preparation balanced</h2>
            <p className="mt-1 text-[10px] text-zinc-400">Short sessions across different skills beat long single-topic grinds.</p>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    type="button"
                    key={action.path}
                    onClick={() => navigate(action.path)}
                    className="group cursor-pointer rounded-xl border border-white/5 bg-black/25 p-4 text-left transition hover:border-cyan-500/30"
                  >
                    <span className="mb-2 flex items-center gap-2 text-[11px] font-bold text-white">
                      <Icon className="h-4 w-4 text-cyan-400" aria-hidden="true" />
                      {action.title}
                    </span>
                    <span className="block text-[10px] leading-normal text-zinc-400">{action.description}</span>
                    <span className="mt-3 inline-flex items-center gap-1 font-mono text-[10px] font-bold text-cyan-300 group-hover:underline">
                      Open <ChevronRight className="h-3 w-3" aria-hidden="true" />
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Badges */}
          <section className="rounded-2xl border border-white/5 bg-[#0a101f]/60 p-5 shadow-xl backdrop-blur-md">
            <h2 className="flex items-center gap-2 font-heading text-xs font-bold uppercase tracking-wider text-white">
              <Award className="h-4 w-4 text-cyan-400" aria-hidden="true" /> Badges ({badges.length})
            </h2>
            {badges.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {badges.map((badge) => (
                  <li
                    key={badge}
                    className="rounded border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan-300"
                  >
                    {badge}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[11px] text-zinc-400">No badges yet. Solve problems and keep your streak to earn them.</p>
            )}
          </section>
        </div>

        <div className="space-y-6" id="dashboard-right-col">
          {/* Insights */}
          <section className="flex flex-col rounded-2xl border border-white/5 bg-[#0a101f]/60 p-5 shadow-xl backdrop-blur-md" id="placement-score-indicator">
            <h2 className="mb-4 flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              <Target className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" /> Readiness insights
            </h2>
            {readiness && readiness.insights.length > 0 ? (
              <ul className="space-y-2 text-[11px] leading-relaxed text-zinc-300">
                {readiness.insights.map((insight, index) => (
                  <li key={`${index}-${insight}`} className="flex gap-2">
                    <span className="text-cyan-400" aria-hidden="true">
                      &rarr;
                    </span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-zinc-500">{analyticsLoading ? 'Loading insights...' : 'No insights available yet.'}</p>
            )}
          </section>

          <ActivityHeatmap activity={analytics?.activity ?? []} />

          {/* Recommendations */}
          <section className="flex flex-col rounded-2xl border border-white/5 bg-[#0a101f]/60 p-5 shadow-xl backdrop-blur-md" id="ai-recommender-card">
            <div className="mb-3.5 flex items-center gap-2">
              <BrainCircuit className="h-4 w-4 text-cyan-400" aria-hidden="true" />
              <h2 className="font-heading text-[10px] font-bold uppercase tracking-wider text-white">Recommended problems</h2>
            </div>
            {recommendations.length > 0 ? (
              <ul className="space-y-2">
                {recommendations.map((rec) => (
                  <li key={rec.id}>
                    <button
                      type="button"
                      onClick={() => openProblem(rec.id)}
                      className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-white/5 bg-black/20 p-3 text-left transition hover:border-cyan-500/30"
                    >
                      <span>
                        <span className="block text-xs font-bold text-white">{rec.title}</span>
                        <span className="block font-mono text-[9px] text-zinc-500">{rec.tags.slice(0, 3).join(' · ')}</span>
                      </span>
                      <span className={`shrink-0 rounded-md border px-2 py-0.5 font-mono text-[9px] font-bold ${difficultyBadge[rec.difficulty]}`}>
                        {rec.difficulty}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-zinc-500">
                {analyticsLoading ? 'Loading recommendations...' : 'No recommendations yet. Try a few problems in the Arena.'}
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
