import { Activity } from 'lucide-react';
import type { ActivityDay } from '../types';

function levelFor(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}

const LEVEL_CLASSES = [
  'bg-white/5 border border-white/5',
  'bg-cyan-500/20 border border-cyan-500/10',
  'bg-cyan-500/35 border border-cyan-500/20',
  'bg-cyan-500/50 border border-cyan-500/35',
  'bg-cyan-400/75 border border-cyan-400/50',
];

/** Submission activity for the last N days (server data, oldest first). */
export function ActivityHeatmap({ activity }: { activity: ActivityDay[] }) {
  const total = activity.reduce((sum, day) => sum + (day.count || 0), 0);
  const activeDays = activity.filter((day) => day.count > 0).length;

  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border border-white/5 bg-[#0a101f]/60 p-5 shadow-xl backdrop-blur-md">
      <div className="mb-1 flex items-center justify-between text-xs">
        <h3 className="flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wider text-zinc-400">
          <Activity className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" /> Submission activity
        </h3>
        <span className="rounded border border-cyan-800/20 bg-cyan-950/40 px-2 py-0.5 font-mono text-[9px] font-bold uppercase text-cyan-300">
          {total} in {activity.length} days
        </span>
      </div>

      {activity.length === 0 ? (
        <p className="font-mono text-[10px] text-zinc-500">No activity recorded yet.</p>
      ) : (
        <div
          className="no-scrollbar grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto py-1"
          role="img"
          aria-label={`${total} submissions across ${activeDays} active days in the last ${activity.length} days`}
        >
          {activity.map((day) => (
            <div
              key={day.date}
              className={`h-3 w-3 rounded-sm ${LEVEL_CLASSES[levelFor(day.count)]}`}
              title={`${day.date}: ${day.count} submission${day.count === 1 ? '' : 's'}`}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-1 font-mono text-[8px] text-zinc-500">
        <span>{activity[0]?.date ?? ''}</span>
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span>Less</span>
          {LEVEL_CLASSES.map((cls) => (
            <div key={cls} className={`h-2 w-2 rounded-sm ${cls}`} />
          ))}
          <span>More</span>
        </div>
        <span>Today</span>
      </div>
    </div>
  );
}
