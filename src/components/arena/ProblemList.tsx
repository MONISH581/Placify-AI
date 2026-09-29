import { useMemo, useState } from 'react';
import { CheckCircle2, Lock, Search } from 'lucide-react';
import { groupProblemsByCompany } from '../../data/companies';
import { ErrorAlert } from '../StatusMessages';
import type { Difficulty, Problem } from '../../types';
import { difficultyBadgeClass } from './difficulty';

/** XP-gated topic regions (client-side gamification only; all problems remain reachable via search). */
const TOPIC_WORLDS = [
  { id: 'arrays', name: 'Array Valley', tags: ['Arrays', 'Two Pointers', 'Sliding Window', 'Hashing'], requiredXp: 0 },
  { id: 'strings', name: 'String Sanctum', tags: ['Strings', 'Two Pointers', 'Tries'], requiredXp: 200 },
  { id: 'linear', name: 'Stack & Queue Yard', tags: ['Stack', 'Stacks', 'Queue', 'Queues', 'Linked Lists', 'Heaps'], requiredXp: 500 },
  { id: 'graphs', name: 'Graph & Tree Heights', tags: ['Trees', 'Binary Search Trees', 'Graphs', 'Segment Trees'], requiredXp: 900 },
  { id: 'dp', name: 'Recursion & DP Temple', tags: ['Recursion', 'Dynamic Programming', 'Backtracking', 'Greedy Algorithms'], requiredXp: 1300 },
] as const;

const DIFFICULTY_FILTERS: Array<'All' | Difficulty> = ['All', 'Easy', 'Medium', 'Hard'];

interface ProblemListProps {
  problems: Problem[];
  selectedId: string | null;
  solvedIds: string[];
  userXp: number;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onSelect: (problemId: string) => void;
}

export function ProblemList({ problems, selectedId, solvedIds, userXp, loading, error, onRetry, onSelect }: ProblemListProps) {
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
    <div
      className="flex h-[750px] flex-col gap-4 overflow-hidden rounded-2xl border border-white/5 bg-[#0a0f1e]/80 p-4 shadow-xl backdrop-blur-md xl:col-span-3"
      id="problems-sidebar-list"
    >
      <div>
        <h2 className="mb-1 font-mono text-xs font-bold uppercase tracking-wider text-white">Problem bank</h2>
        <p className="text-[10px] text-zinc-400">Search, filter by company or difficulty, or explore topic regions.</p>
      </div>

      <div className="relative">
        <label htmlFor="arena-problem-search" className="sr-only">
          Search problems
        </label>
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
        <input
          id="arena-problem-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by title or tag..."
          className="w-full rounded-lg border border-white/5 bg-black/45 py-1.5 pl-8 pr-2.5 text-xs text-white outline-none transition focus:border-cyan-400"
        />
      </div>

      <div className="border-b border-white/5 pb-3">
        <span className="mb-2 block font-mono text-[9px] font-bold uppercase tracking-widest text-zinc-500">Topic regions</span>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            aria-pressed={worldId === 'all'}
            onClick={() => setWorldId('all')}
            className={`cursor-pointer rounded-xl border p-2 text-center font-mono text-[9px] font-bold transition ${
              worldId === 'all' ? 'border-cyan-400 bg-cyan-400/10 text-cyan-300' : 'border-white/5 bg-black/20 text-zinc-400 hover:text-white'
            }`}
          >
            All regions
          </button>
          {TOPIC_WORLDS.map((world) => {
            const locked = userXp < world.requiredXp;
            const active = worldId === world.id;
            return (
              <button
                type="button"
                key={world.id}
                disabled={locked}
                aria-pressed={active}
                onClick={() => setWorldId(world.id)}
                title={locked ? `Requires ${world.requiredXp} XP (you have ${userXp} XP)` : world.name}
                className={`relative flex items-center justify-center gap-1 overflow-hidden rounded-xl border p-2 font-mono text-[9px] font-bold transition ${
                  locked
                    ? 'cursor-not-allowed border-white/5 bg-black/40 text-zinc-500 opacity-50'
                    : active
                      ? 'cursor-pointer border-cyan-400 bg-cyan-400/10 text-cyan-300'
                      : 'cursor-pointer border-white/5 bg-black/20 text-zinc-400 hover:border-white/10 hover:text-white'
                }`}
              >
                <span className="truncate">{world.name}</span>
                {locked && <Lock className="h-2.5 w-2.5 shrink-0" aria-label="Locked" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3 border-b border-white/5 pb-3" id="arena-filters">
        <div className="space-y-1">
          <label htmlFor="sidebar-company-filter" className="block font-mono text-[8px] font-bold uppercase tracking-widest text-zinc-500">
            Company
          </label>
          <select
            id="sidebar-company-filter"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            className="w-full rounded-lg border border-white/5 bg-black/45 px-2.5 py-1.5 text-xs text-white outline-none transition focus:border-cyan-400"
          >
            <option value="All">All companies</option>
            {companies.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="space-y-1">
          <legend className="block font-mono text-[8px] font-bold uppercase tracking-widest text-zinc-500">Difficulty</legend>
          <div className="grid grid-cols-4 gap-1" id="sidebar-diff-filters">
            {DIFFICULTY_FILTERS.map((diff) => (
              <button
                type="button"
                key={diff}
                aria-pressed={difficulty === diff}
                onClick={() => setDifficulty(diff)}
                className={`cursor-pointer rounded border py-1 font-mono text-[9px] font-bold transition ${
                  difficulty === diff ? 'border-transparent bg-cyan-400 text-black' : 'border-white/5 bg-black/25 text-zinc-400 hover:text-white'
                }`}
              >
                {diff}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="flex items-center justify-between px-1 font-mono text-[10px] text-zinc-500">
        <span>{filtered.length} shown</span>
        <span>{problems.length} total</span>
      </div>

      <div className="flex-1 space-y-1.5 overflow-y-auto pr-1 font-sans" id="prob-items-list">
        {error && <ErrorAlert message={error} onRetry={onRetry} />}
        {loading && problems.length === 0 ? (
          <p className="py-10 text-center font-mono text-[10px] text-zinc-500">Loading problems...</p>
        ) : filtered.length > 0 ? (
          <ul className="space-y-1.5">
            {filtered.map((problem) => {
              const solved = solvedIds.includes(problem.id);
              return (
                <li key={problem.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(problem.id)}
                    id={`problem-row-${problem.id}`}
                    aria-current={selectedId === problem.id ? 'true' : undefined}
                    className={`flex w-full cursor-pointer flex-col gap-2 rounded-xl border p-3.5 text-left transition ${
                      selectedId === problem.id
                        ? 'border-cyan-400 bg-cyan-400/5 text-white shadow-lg'
                        : 'border-white/5 bg-black/25 text-zinc-300 hover:border-white/10'
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5">
                        {solved && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-cyan-400" aria-label="Solved" />}
                        <span className="truncate text-xs font-semibold leading-normal">{problem.title}</span>
                      </span>
                      <span className={`shrink-0 rounded-md border px-2 py-0.5 font-mono text-[8px] ${difficultyBadgeClass(problem.difficulty)}`}>
                        {problem.difficulty}
                      </span>
                    </span>
                    <span className="flex flex-wrap gap-1">
                      {(problem.tags ?? []).slice(0, 3).map((tag) => (
                        <span key={tag} className="rounded border border-white/5 bg-white/5 px-1.5 py-0.5 font-mono text-[8px] text-zinc-400">
                          {tag}
                        </span>
                      ))}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="py-10 text-center font-mono text-[10px] text-zinc-500">No matching problems.</p>
        )}
      </div>
    </div>
  );
}
