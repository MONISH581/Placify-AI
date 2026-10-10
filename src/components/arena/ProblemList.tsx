import { useMemo, useState } from 'react';
import { CheckCircle2, Search } from 'lucide-react';
import { companyForTag, groupProblemsByCompany } from '../../data/companies';
import { ErrorAlert } from '../StatusMessages';
import type { Difficulty, Problem } from '../../types';
import { difficultyTextClass } from './difficulty';

/** XP-gated topic regions (client-side gamification only; all problems remain reachable via search). */
const TOPIC_WORLDS = [
  { id: 'arrays', name: 'Array Valley', tags: ['Arrays', 'Two Pointers', 'Sliding Window', 'Hashing', 'Bit Manipulation'], requiredXp: 0 },
  { id: 'strings', name: 'String Sanctum', tags: ['Strings', 'Two Pointers', 'Tries'], requiredXp: 200 },
  { id: 'linear', name: 'Stack & Queue Yard', tags: ['Stack', 'Stacks', 'Queue', 'Queues', 'Linked Lists', 'Heaps'], requiredXp: 500 },
  { id: 'graphs', name: 'Graph & Tree Heights', tags: ['Trees', 'Binary Search Trees', 'Graphs', 'Segment Trees'], requiredXp: 900 },
  { id: 'dp', name: 'Recursion & DP Temple', tags: ['Recursion', 'Dynamic Programming', 'Backtracking', 'Greedy Algorithms', 'Advanced Interview Problems'], requiredXp: 1300 },
] as const;

const DIFFICULTY_FILTERS: Array<'All' | Difficulty> = ['All', 'Easy', 'Medium', 'Hard'];

interface ProblemListProps {
  problems: Problem[];
  solvedIds: string[];
  userXp: number;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onSelect: (problemId: string) => void;
}

const controlClass =
  'h-9 rounded-md bg-slate-900 px-3 text-sm text-white outline-none placeholder:text-slate-500 focus:ring-1 focus:ring-cyan-400';

/** Full-width problem table with all filters in one row. Clicking a row opens the solve screen. */
export function ProblemList({ problems, solvedIds, userXp, loading, error, onRetry, onSelect }: ProblemListProps) {
  const [search, setSearch] = useState('');
  const [worldId, setWorldId] = useState<string>('all');
  const [company, setCompany] = useState('All');
  const [difficulty, setDifficulty] = useState<'All' | Difficulty>('All');

  const companies = useMemo(
    () => groupProblemsByCompany(problems).map((group) => group.company).sort((a, b) => a.localeCompare(b)),
    [problems],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const world = TOPIC_WORLDS.find((item) => item.id === worldId);
    return problems.filter((problem) => {
      const tags = problem.tags ?? [];
      if (world && !tags.some((tag) => (world.tags as readonly string[]).includes(tag))) return false;
      if (difficulty !== 'All' && problem.difficulty !== difficulty) return false;
      if (company !== 'All' && !tags.some((tag) => tag.toLowerCase() === company.toLowerCase())) return false;
      if (query) {
        const haystack = `${problem.title} ${tags.join(' ')}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [problems, search, worldId, company, difficulty]);

  return (
    <section aria-labelledby="problem-bank-heading" id="problems-sidebar-list">
      <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-slate-500">All problems</p>
      <h2 id="problem-bank-heading" className="mb-4 mt-1 font-heading text-xl font-bold text-white">
        Problem bank
      </h2>

      <div className="mb-4 flex flex-wrap items-center gap-2" id="arena-filters">
        <div className="relative min-w-[14rem] flex-1">
          <label htmlFor="arena-problem-search" className="sr-only">
            Search problems
          </label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            id="arena-problem-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by title or tag..."
            className={`${controlClass} w-full pl-9`}
          />
        </div>

        <div className="flex gap-1" role="group" aria-label="Difficulty" id="sidebar-diff-filters">
          {DIFFICULTY_FILTERS.map((diff) => (
            <button
              type="button"
              key={diff}
              aria-pressed={difficulty === diff}
              onClick={() => setDifficulty(diff)}
              className={`h-9 cursor-pointer rounded-md px-3 text-sm font-semibold transition-colors ${
                difficulty === diff ? 'bg-cyan-400 text-black' : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {diff}
            </button>
          ))}
        </div>

        <label htmlFor="arena-topic-filter" className="sr-only">
          Topic
        </label>
        <select id="arena-topic-filter" value={worldId} onChange={(event) => setWorldId(event.target.value)} className={controlClass}>
          <option value="all">All topics</option>
          {TOPIC_WORLDS.map((world) => {
            const locked = userXp < world.requiredXp;
            return (
              <option key={world.id} value={world.id} disabled={locked}>
                {world.name}
                {locked ? ` (needs ${world.requiredXp} XP)` : ''}
              </option>
            );
          })}
        </select>

        <label htmlFor="sidebar-company-filter" className="sr-only">
          Company
        </label>
        <select id="sidebar-company-filter" value={company} onChange={(event) => setCompany(event.target.value)} className={controlClass}>
          <option value="All">All companies</option>
          {companies.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {error && <ErrorAlert message={error} onRetry={onRetry} />}

      {loading && problems.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">Loading problems...</p>
      ) : filtered.length > 0 ? (
        <div className="overflow-hidden rounded-md bg-slate-900" id="prob-items-list">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b-2 border-cyan-400 bg-slate-800 font-mono text-xs uppercase tracking-widest text-white">
                <th scope="col" className="w-12 px-4 py-3.5 font-bold">
                  <span className="sr-only">Status</span>
                </th>
                <th scope="col" className="px-2 py-3.5 font-bold">
                  Title
                </th>
                <th scope="col" className="hidden px-2 py-3.5 font-bold md:table-cell">
                  Topics
                </th>
                <th scope="col" className="w-28 px-4 py-3.5 text-right font-bold">
                  Difficulty
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((problem) => {
                const solved = solvedIds.includes(problem.id);
                const topics = (problem.tags ?? []).filter((tag) => !companyForTag(tag)).slice(0, 3);
                return (
                  <tr
                    key={problem.id}
                    id={`problem-row-${problem.id}`}
                    onClick={() => onSelect(problem.id)}
                    className="cursor-pointer border-t border-slate-800 transition-colors hover:bg-slate-800"
                  >
                    <td className="px-4 py-3">
                      {solved ? <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-label="Solved" /> : <span className="block h-4 w-4" />}
                    </td>
                    <td className="px-2 py-3">
                      <a
                        href={`/arena/${encodeURIComponent(problem.id)}`}
                        onClick={(event) => {
                          // Plain clicks navigate in-app (the row handler runs); modified clicks open a new tab untouched.
                          if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
                            event.stopPropagation();
                            return;
                          }
                          event.preventDefault();
                        }}
                        className="font-semibold text-white outline-none focus-visible:underline"
                      >
                        {problem.title}
                      </a>
                    </td>
                    <td className="hidden max-w-xs truncate px-2 py-3 font-mono text-[11px] text-slate-400 md:table-cell">{topics.join(' · ')}</td>
                    <td className={`px-4 py-3 text-right font-mono text-xs font-semibold ${difficultyTextClass(problem.difficulty)}`}>
                      {problem.difficulty}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="py-10 text-center text-sm text-slate-400">No matching problems.</p>
      )}

      <p className="mt-3 font-mono text-[11px] text-slate-500">
        {filtered.length} shown · {problems.length} total
      </p>
    </section>
  );
}
