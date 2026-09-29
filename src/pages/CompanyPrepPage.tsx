/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, CheckCircle2, Search } from 'lucide-react';
import { difficultyBadgeClass } from '../components/arena/difficulty';
import { ErrorAlert, LoadingBlock } from '../components/StatusMessages';
import { useAppData } from '../context/AppDataContext';
import { useRequiredUser } from '../context/AuthContext';
import { companyForTag, groupProblemsByCompany } from '../data/companies';

const PREVIEW_COUNT = 6;

export default function CompanyPrepPage() {
  const user = useRequiredUser();
  const navigate = useNavigate();
  const { problems, problemsLoading, problemsError, reloadProblems } = useAppData();
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => groupProblemsByCompany(problems), [problems]);
  const visibleGroups = groups.filter((group) => group.company.toLowerCase().includes(query.trim().toLowerCase()));
  const solvedIds = user.problemsSolved ?? [];

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-[#161D2F] p-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-cyan-400">Company prep</p>
          <h1 className="font-heading text-2xl font-bold text-white">Problems tagged by company</h1>
          <p className="mt-1 text-sm text-slate-300">
            Every problem below comes from the live problem bank. Open one to solve it in the Coding Arena.
          </p>
        </div>
        <div className="relative w-full md:w-64">
          <label htmlFor="company-search" className="sr-only">
            Search companies
          </label>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
          <input
            id="company-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search companies..."
            className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950/40 pl-8 pr-3 text-xs text-white outline-none focus:border-cyan-500"
          />
        </div>
      </section>

      {problemsError && <ErrorAlert message={`Could not load problems: ${problemsError}`} onRetry={() => void reloadProblems()} />}
      {problemsLoading && problems.length === 0 && <LoadingBlock label="Loading problems..." />}

      {!problemsLoading && visibleGroups.length === 0 && !problemsError && (
        <p className="rounded-xl border border-slate-800 bg-[#161D2F] p-6 text-sm text-slate-400">
          {groups.length === 0 ? 'No problems are tagged with a company yet.' : 'No companies match your search.'}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {visibleGroups.map((group) => {
          const isExpanded = Boolean(expanded[group.company]);
          const shown = isExpanded ? group.problems : group.problems.slice(0, PREVIEW_COUNT);
          const solvedInGroup = group.problems.filter((problem) => solvedIds.includes(problem.id)).length;
          return (
            <article
              key={group.company}
              className="flex flex-col justify-between rounded-2xl border border-white/5 bg-[#0a101f]/60 p-6 shadow-xl backdrop-blur-md"
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-cyan-400" aria-hidden="true" />
                  <h2 className="font-heading text-lg font-bold leading-normal text-white">{group.company}</h2>
                </div>
                <span className="rounded-xl border border-cyan-500/30 bg-cyan-950/30 px-3 py-1 font-mono text-[9px] font-black text-cyan-300">
                  {solvedInGroup}/{group.problems.length} SOLVED
                </span>
              </div>

              <ul className="space-y-2.5">
                {shown.map((problem) => {
                  const solved = solvedIds.includes(problem.id);
                  const topics = (problem.tags ?? []).filter((tag) => !companyForTag(tag)).slice(0, 2);
                  return (
                    <li key={problem.id}>
                      <button
                        type="button"
                        onClick={() => navigate(`/arena/${encodeURIComponent(problem.id)}`)}
                        className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/5 bg-black/20 p-3 text-left transition hover:border-cyan-500/20"
                      >
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5 text-xs font-bold text-white">
                            {solved && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-cyan-400" aria-label="Solved" />}
                            <span className="truncate">{problem.title}</span>
                          </span>
                          {topics.length > 0 && <span className="mt-0.5 block font-mono text-[9px] text-zinc-400">{topics.join(' · ')}</span>}
                        </span>
                        <span className={`shrink-0 rounded-md border px-2 py-0.5 font-mono text-[8px] font-bold ${difficultyBadgeClass(problem.difficulty)}`}>
                          {problem.difficulty}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {group.problems.length > PREVIEW_COUNT && (
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  onClick={() => setExpanded((prev) => ({ ...prev, [group.company]: !prev[group.company] }))}
                  className="mt-3 cursor-pointer self-start font-mono text-[10px] font-bold text-cyan-300 hover:underline"
                >
                  {isExpanded ? 'Show fewer' : `Show all ${group.problems.length} problems`}
                </button>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
