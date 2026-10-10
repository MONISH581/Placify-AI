/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Link, useNavigate } from 'react-router-dom';
import { ActivityHeatmap } from '../components/ActivityHeatmap';
import { MediaRow } from '../components/MediaRow';
import { iconForTags } from '../utils/topicIcon';
import { ReadinessHero } from '../components/dashboard/ReadinessHero';
import { OnboardingSteps } from '../components/dashboard/OnboardingSteps';
import { BadgeShelf } from '../components/illustrations/Badges';
import { difficultyTextClass } from '../components/arena/difficulty';
import { useAppData } from '../context/AppDataContext';
import { useRequiredUser } from '../context/AuthContext';

const practiceLinks = [
  { title: 'Placement Hub', description: 'Revise OS, DBMS, networks, SQL and aptitude with flashcards and MCQs.', path: '/placement' },
  { title: 'Mock Interview', description: 'Answer Technical, HR or Behavioral questions and get scored feedback.', path: '/interview' },
  { title: 'Learning Tracks', description: 'Study a topic and pass its checkpoint quiz to mark it complete.', path: '/tracks' },
];

function SectionLabel({ children }: { children: string }) {
  return <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-slate-500">{children}</p>;
}

export default function DashboardPage() {
  const user = useRequiredUser();
  const navigate = useNavigate();
  const { analytics, analyticsLoading, analyticsError, refreshAnalytics, problems } = useAppData();

  const solvedIds = user.problemsSolved ?? [];
  const badges = user.badges ?? [];

  const readiness = analytics?.readiness ?? null;
  const recommendations = analytics?.recommendations ?? [];
  const next = recommendations[0] ?? problems.find((problem) => !solvedIds.includes(problem.id)) ?? null;

  const openProblem = (problemId: string) => navigate(`/arena/${encodeURIComponent(problemId)}`);

  return (
    <div className="space-y-10" id="dashboard-container">
      <ReadinessHero
        user={user}
        analytics={analytics}
        analyticsLoading={analyticsLoading}
        analyticsError={analyticsError}
        onRetry={() => void refreshAnalytics()}
        next={next ? { id: next.id, title: next.title } : null}
        onStart={openProblem}
        solvedCount={solvedIds.length}
        totalProblems={problems.length}
      />

      <OnboardingSteps user={user} />

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]" id="dashboard-content-split">
        <div className="space-y-10">
          <section id="ai-recommender-card" aria-labelledby="up-next-heading">
            <SectionLabel>Recommended for you</SectionLabel>
            <h2 id="up-next-heading" className="mb-4 mt-1 font-heading text-xl font-bold text-white">
              Up next
            </h2>
            {recommendations.length > 0 ? (
              <ul className="space-y-2">
                {recommendations.map((rec) => (
                  <li key={rec.id}>
                    <MediaRow
                      title={rec.title}
                      icon={iconForTags(rec.tags)}
                      meta={rec.tags.slice(0, 3).join(' · ')}
                      onOpen={() => openProblem(rec.id)}
                      status={<span className={`font-mono text-xs font-semibold ${difficultyTextClass(rec.difficulty)}`}>{rec.difficulty}</span>}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">
                {analyticsLoading ? 'Loading recommendations...' : 'No recommendations yet. Try a few problems in the Arena.'}
              </p>
            )}
          </section>

          <ActivityHeatmap activity={analytics?.activity ?? []} />

          <section aria-labelledby="balance-heading">
            <SectionLabel>Balance</SectionLabel>
            <h2 id="balance-heading" className="mb-1 mt-1 font-heading text-xl font-bold text-white">
              Keep your preparation balanced
            </h2>
            <p className="mb-4 text-sm text-slate-400">Short sessions across different skills beat long single-topic grinds.</p>
            <ul className="space-y-2">
              {practiceLinks.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="group flex items-center justify-between gap-4 rounded-md bg-slate-900 px-4 py-3 transition-colors hover:bg-slate-800"
                  >
                    <span>
                      <span className="block text-sm font-semibold text-white">{link.title}</span>
                      <span className="block text-xs text-slate-400">{link.description}</span>
                    </span>
                    <span className="shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" aria-hidden="true">
                      &rarr;
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-10" id="dashboard-right-col">
          <section id="placement-score-indicator" aria-labelledby="insights-heading">
            <SectionLabel>Readiness</SectionLabel>
            <h2 id="insights-heading" className="mb-3 mt-1 font-heading text-xl font-bold text-white">
              Notes
            </h2>
            {readiness && readiness.insights.length > 0 ? (
              <ul className="space-y-2 text-sm leading-relaxed text-slate-300">
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
              <p className="text-sm text-slate-400">{analyticsLoading ? 'Loading insights...' : 'No insights available yet.'}</p>
            )}
          </section>

          {analytics && (
            <section aria-labelledby="topics-heading">
              <SectionLabel>Skills</SectionLabel>
              <h2 id="topics-heading" className="mb-3 mt-1 font-heading text-xl font-bold text-white">
                Topics
              </h2>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="font-mono text-[11px] uppercase tracking-widest text-slate-500">Strong</dt>
                  <dd className="mt-0.5 text-emerald-400">
                    {analytics.strongTopics.length > 0 ? analytics.strongTopics.join(', ') : <span className="text-slate-400">Solve more problems to reveal strengths.</span>}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[11px] uppercase tracking-widest text-slate-500">Needs work</dt>
                  <dd className="mt-0.5 text-rose-400">
                    {analytics.weakTopics.length > 0 ? analytics.weakTopics.join(', ') : <span className="text-slate-400">None identified yet.</span>}
                  </dd>
                </div>
              </dl>
            </section>
          )}

          <section aria-labelledby="badges-heading">
            <SectionLabel>Achievements</SectionLabel>
            <h2 id="badges-heading" className="mb-3 mt-1 font-heading text-xl font-bold text-white">
              Badges <span className="font-mono text-xs font-normal text-slate-500">{badges.length}</span>
            </h2>
            <BadgeShelf owned={badges} compact />
          </section>
        </aside>
      </div>
    </div>
  );
}
