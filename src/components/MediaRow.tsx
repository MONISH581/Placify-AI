import type { ElementType, ReactNode } from 'react';
import { Play } from 'lucide-react';

interface MediaRowProps {
  title: string;
  meta?: ReactNode;
  icon: ElementType;
  onOpen: () => void;
  /** Status shown before the play button, e.g. a tick or a difficulty label. */
  status?: ReactNode;
}

/** Wide lesson-style row: gradient thumbnail, title and meta, status, and a mint play button. */
export function MediaRow({ title, meta, icon: Icon, onOpen, status }: MediaRowProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full cursor-pointer items-stretch overflow-hidden rounded-md bg-slate-900 text-left transition-colors hover:bg-slate-800"
    >
      <span
        className="flex w-16 shrink-0 items-center justify-center text-[#2b2000] sm:w-20"
        style={{ background: 'linear-gradient(135deg, #fde68a 0%, #fcd34d 50%, #f9b72b 100%)' }}
        aria-hidden="true"
      >
        <Icon className="h-6 w-6" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col justify-center px-4 py-3">
        <span className="truncate text-sm font-semibold text-white">{title}</span>
        {meta && <span className="mt-0.5 truncate font-mono text-[11px] text-slate-400">{meta}</span>}
      </span>
      <span className="flex shrink-0 items-center gap-3 pr-4">
        {status}
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-400 text-black transition-transform group-hover:scale-110"
          aria-hidden="true"
        >
          <Play className="h-3 w-3 fill-current" />
        </span>
      </span>
    </button>
  );
}
