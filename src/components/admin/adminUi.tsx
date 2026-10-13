import type { ReactNode } from 'react';

/** Shared look for the Admin Studio sections. */
export const adminInput =
  'w-full rounded-md bg-slate-950 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:ring-1 focus:ring-cyan-400';

export const adminLabel = 'mb-1 block font-mono text-[11px] font-semibold uppercase tracking-widest text-slate-500';

export const adminButton =
  'inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50';

export const adminDanger =
  'inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-slate-800 px-3 py-1.5 text-xs font-semibold text-rose-400 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50';

export const adminPrimary =
  'inline-flex cursor-pointer items-center gap-2 rounded-md bg-cyan-400 px-4 py-2 text-sm font-semibold text-black transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60';

export function AdminHeading({ label, title, action }: { label: string; title: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-slate-500">{label}</p>
        <h2 className="mt-1 font-heading text-xl font-bold text-white">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="mb-4 rounded-md bg-slate-900 px-4 py-3 text-sm text-emerald-400">
      {children}
    </p>
  );
}
