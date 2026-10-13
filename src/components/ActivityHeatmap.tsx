import type { ActivityDay } from '../types';

function levelFor(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}

/** One-colour ramp: quiet squares that darken with volume. */
const LEVEL_CLASSES = ['bg-slate-900', 'bg-cyan-900', 'bg-cyan-700', 'bg-cyan-500', 'bg-cyan-300'];

/** Submission activity for the last N days (server data, oldest first). */
export function ActivityHeatmap({ activity }: { activity: ActivityDay[] }) {
  const total = activity.reduce((sum, day) => sum + (day.count || 0), 0);
  const activeDays = activity.filter((day) => day.count > 0).length;

  return (
    <section aria-labelledby="activity-heading">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-slate-500">Consistency</p>
          <h2 id="activity-heading" className="mt-1 font-heading text-xl font-bold text-white">
            Activity
          </h2>
        </div>
        <span className="font-mono text-[11px] text-slate-400">
          {total} submissions in {activity.length} days
        </span>
      </div>

      {activity.length === 0 ? (
        <p className="text-sm text-slate-400">No activity recorded yet. Submit a solution and it shows up here.</p>
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

      <div className="flex items-center justify-between pt-2 font-mono text-[11px] text-slate-500">
        <span>{activity[0]?.date ?? ''}</span>
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span>Less</span>
          {LEVEL_CLASSES.map((cls) => (
            <div key={cls} className={`h-2.5 w-2.5 rounded-sm ${cls}`} />
          ))}
          <span>More</span>
        </div>
        <span>Today</span>
      </div>
    </section>
  );
}
