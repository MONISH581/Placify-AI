import { BookMarked } from 'lucide-react';
import type { MentorSource } from '../types';

/** Lists the knowledge-base sources the mentor used for an answer. */
export function MentorSources({ sources }: { sources: MentorSource[] }) {
  if (sources.length === 0) return null;
  return (
    <div className="mt-2 border-t border-white/5 pt-2">
      <p className="mb-1 flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wider text-zinc-500">
        <BookMarked className="h-3 w-3" aria-hidden="true" /> Sources
      </p>
      <ul className="flex flex-wrap gap-1">
        {sources.map((source, index) => (
          <li
            key={`${source.source}-${index}`}
            className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[9px] text-zinc-300"
            title={typeof source.relevance === 'number' ? `Relevance ${source.relevance.toFixed(2)}` : undefined}
          >
            {source.topic ? `${source.topic} · ${source.source}` : source.source}
          </li>
        ))}
      </ul>
    </div>
  );
}
