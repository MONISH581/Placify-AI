import { ArrowRight } from 'lucide-react';
import type { Problem } from '../../types';
import { difficultyTextClass } from './difficulty';

export interface QuickStartItem {
  label: string;
  problem: Problem;
}

/** Strip above the problem table: pick up where you left off, the recommended problem, and today's daily problem. */
export function QuickStart({ items, onOpen }: { items: QuickStartItem[]; onOpen: (problemId: string) => void }) {
  if (items.length === 0) return null;
  return (
    <ul className="mb-6 grid gap-3 md:grid-cols-3" aria-label="Quick start">
      {items.map(({ label, problem }) => (
        <li key={label}>
          <button
            type="button"
            onClick={() => onOpen(problem.id)}
            className="group flex h-full w-full cursor-pointer items-center justify-between gap-3 rounded-md bg-slate-900 px-4 py-3 text-left ring-1 ring-slate-800 transition-colors hover:bg-slate-800"
          >
            <span className="min-w-0">
              <span className="block font-mono text-[10px] font-bold uppercase tracking-widest text-cyan-400">{label}</span>
              <span className="mt-0.5 block truncate text-sm font-semibold text-white">{problem.title}</span>
              <span className={`block font-mono text-[11px] font-semibold ${difficultyTextClass(problem.difficulty)}`}>{problem.difficulty}</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-white" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}
