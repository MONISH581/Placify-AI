/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, CheckCircle2, CheckSquare, Code2, Layers, Search } from 'lucide-react';
import { MediaRow } from '../components/MediaRow';
import { iconForTags } from '../utils/topicIcon';
import { PageHero } from '../components/PageHero';
import { EmptyState } from '../components/illustrations/Scenes';
import { CompanyMark } from '../components/illustrations/Covers';
import { difficultyTextClass } from '../components/arena/difficulty';
import { ErrorAlert, LoadingBlock } from '../components/StatusMessages';
import { useAppData } from '../context/AppDataContext';
import { useRequiredUser } from '../context/AuthContext';
import { companyForTag, groupProblemsByCompany } from '../data/companies';

const PREVIEW_COUNT = 6;

function SectionLabel({ children }: { children: string }) {
  return <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-slate-500">{children}</p>;
}

export default function CompanyPrepPage() {
  const user = useRequiredUser();
  const navigate = useNavigate();
  const { problems, problemsLoading, problemsError, reloadProblems } = useAppData();
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => groupProblemsByCompany(problems), [problems]);
  const visibleGroups = groups.filter((group) => group.company.toLowerCase().includes(query.trim().toLowerCase()));
  const solvedIds = user.problemsSolved ?? [];

  const tagged = useMemo(() => new Set(groups.flatMap((group) => group.problems.map((problem) => problem.id))), [groups]);
  const taggedSolved = Array.from(tagged).filter((id) => solvedIds.includes(id)).length;
  const difficultyCounts = useMemo(() => {
    const counts = { Easy: 0, Medium: 0, Hard: 0 };
    for (const group of groups) {
      for (const problem of group.problems) {
        if (problem.difficulty in counts) counts[problem.difficulty] += 1;
      }
    }
    return counts;
  }, [groups]);
  const topTopics = useMemo(() => {
    const counts = new Map<string, number>();
    for (const group of groups) {
      for (const problem of group.problems) {
        for (const tag of problem.tags ?? []) {
          if (!companyForTag(tag)) counts.set(tag, (counts.get(tag) ?? 0) + 1);
        }
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([tag]) => tag);
  }, [groups]);

  return (
    <div className="space-y-8">
      <PageHero
        titleId="company-heading"
        eyebrow="Prepare"
        title="Company Prep"
        subtitle="Every problem below comes from the live problem bank. Open one to solve it in the Coding Arena."
        tags={groups.slice(0, 4).map((group) => group.company)}
        stats={[
          { icon: Building2, value: String(groups.length), label: 'companies' },
          { icon: Code2, value: String(tagged.size), label: 'tagged problems' },
          { icon: CheckSquare, value: `${taggedSolved}/${tagged.size}`, label: 'solved' },
        ]}
        progress={{ value: taggedSolved, max: Math.max(tagged.size, 1), label: 'Company problems solved' }}
      />

      {problemsError && <ErrorAlert message={`Could not load problems: ${problemsError}`} onRetry={() => void reloadProblems()} />}
      {problemsLoading && problems.length === 0 && <LoadingBlock label="Loading problems..." />}

      {!problemsLoading && visibleGroups.length === 0 && !problemsError && (
        <EmptyState
          variant="search"
          title={groups.length === 0 ? 'No company problems yet' : 'No companies match your search'}
          hint={groups.length === 0 ? 'Problems tagged with a company will show up here.' : 'Try a different company name.'}
        />
      )}

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-10">
          <div className="relative w-full max-w-xs">
            <label htmlFor="company-search" className="sr-only">
              Search companies
            </label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              id="company-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search companies..."
              className="h-10 w-full rounded-md bg-slate-900 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-500 focus:ring-1 focus:ring-cyan-400"
            />
          </div>

          {visibleGroups.map((group, index) => {
            const isExpanded = Boolean(expanded[group.company]);
            const shown = isExpanded ? group.problems : group.problems.slice(0, PREVIEW_COUNT);
            const solvedInGroup = group.problems.filter((problem) => solvedIds.includes(problem.id)).length;
            return (
              <section key={group.company} aria-labelledby={`company-${index}`}>
                <SectionLabel>{`Company ${index + 1} · ${solvedInGroup}/${group.problems.length} solved`}</SectionLabel>
                <h2 id={`company-${index}`} className="mb-4 mt-2 flex items-center gap-3 font-heading text-xl font-bold text-white">
                  <CompanyMark name={group.company} size={40} />
                  {group.company}
                </h2>

                <ul className="space-y-2">
                  {shown.map((problem) => {
                    const solved = solvedIds.includes(problem.id);
                    const topics = (problem.tags ?? []).filter((tag) => !companyForTag(tag)).slice(0, 2);
                    return (
                      <li key={problem.id}>
                        <MediaRow
                          title={problem.title}
                          icon={iconForTags(problem.tags)}
                          meta={topics.join(' · ') || undefined}
                          onOpen={() => navigate(`/arena/${encodeURIComponent(problem.id)}`)}
                          status={
                            <>
                              {solved && <CheckCircle2 className="h-4 w-4 text-slate-400" aria-label="Solved" />}
                              <span className={`font-mono text-xs font-semibold ${difficultyTextClass(problem.difficulty)}`}>{problem.difficulty}</span>
                            </>
                          }
                        />
                      </li>
                    );
                  })}
                </ul>

                {group.problems.length > PREVIEW_COUNT && (
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    onClick={() => setExpanded((prev) => ({ ...prev, [group.company]: !prev[group.company] }))}
                    className="mt-3 cursor-pointer font-mono text-[11px] font-semibold uppercase tracking-wider text-cyan-400 hover:underline"
                  >
                    {isExpanded ? 'Show fewer' : `Show all ${group.problems.length} problems`}
                  </button>
                )}
              </section>
            );
          })}
        </div>

        <aside className="space-y-8 lg:sticky lg:top-6 lg:self-start">
          <section>
            <SectionLabel>About</SectionLabel>
            <h2 className="mb-2 mt-1 font-heading text-sm font-bold uppercase tracking-wider text-white">Company bank</h2>
            <p className="text-sm leading-relaxed text-slate-300">
              Practise the problems each company is known to ask. Start with the easier ones to build speed, then move to the
              harder ones to prepare for onsite rounds.
            </p>
          </section>

          <section>
            <SectionLabel>Details</SectionLabel>
            <h2 className="mb-3 mt-1 font-heading text-sm font-bold uppercase tracking-wider text-white">Breakdown</h2>
            <ul className="space-y-2.5 text-sm text-slate-300">
              <li className="flex items-center gap-2.5">
                <Building2 className="h-4 w-4 text-slate-500" strokeWidth={1.5} aria-hidden="true" />
                {groups.length} companies
              </li>
              <li className="flex items-center gap-2.5">
                <Layers className="h-4 w-4 text-slate-500" strokeWidth={1.5} aria-hidden="true" />
                <span>
                  <span className={difficultyTextClass('Easy')}>{difficultyCounts.Easy} easy</span> ·{' '}
                  <span className={difficultyTextClass('Medium')}>{difficultyCounts.Medium} medium</span> ·{' '}
                  <span className={difficultyTextClass('Hard')}>{difficultyCounts.Hard} hard</span>
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckSquare className="h-4 w-4 text-slate-500" strokeWidth={1.5} aria-hidden="true" />
                {taggedSolved} of {tagged.size} solved
              </li>
            </ul>
          </section>

          {topTopics.length > 0 && (
            <section>
              <SectionLabel>Topics</SectionLabel>
              <h2 className="mb-3 mt-1 font-heading text-sm font-bold uppercase tracking-wider text-white">Most common</h2>
              <ul className="flex flex-wrap gap-2">
                {topTopics.map((topic) => (
                  <li key={topic} className="rounded bg-slate-900 px-2.5 py-1 font-mono text-[11px] font-semibold text-slate-300">
                    {topic}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
