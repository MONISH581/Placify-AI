import { useNavigate } from 'react-router-dom';
import { Award, BarChart3, CheckCircle2, ChevronRight, ShieldCheck } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import type { User } from '../types';

/** Summary strip at the top of the dashboard. Readiness comes from the shared server analytics. */
export function ReadinessBand({ user }: { user: User }) {
  const navigate = useNavigate();
  const { analytics, problems } = useAppData();
  const solvedCount = (user.problemsSolved ?? []).length;
  const readiness = analytics?.readiness.score;
  const nextProblem = analytics?.recommendations[0];

  const stats = [
    { label: 'Readiness', value: typeof readiness === 'number' ? `${readiness}%` : '--', icon: ShieldCheck, color: 'text-cyan-400' },
    { label: 'Solved', value: `${solvedCount}/${problems.length}`, icon: CheckCircle2, color: 'text-cyan-600' },
    { label: 'XP level', value: `L${user.level}`, icon: Award, color: 'text-violet-400' },
    { label: 'Accuracy', value: `${user.accuracy}%`, icon: BarChart3, color: 'text-amber-400' },
  ];

  return (
    <section className="rounded-xl border border-slate-800 bg-[#161D2F] p-4 shadow-sm" aria-label="Progress summary">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-lg border border-slate-800/60 bg-slate-950/45 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase tracking-wide text-zinc-400">{stat.label}</span>
                <Icon className={`h-4 w-4 ${stat.color}`} aria-hidden="true" />
              </div>
              <p className="font-mono text-2xl font-black text-white">{stat.value}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-950 p-4 text-white">
        <div>
          <p className="text-sm font-bold">Next practice step</p>
          <p className="text-xs text-slate-300">
            {nextProblem
              ? `Recommended for you: ${nextProblem.title} (${nextProblem.difficulty}).`
              : 'Open the Coding Arena and pick a problem to keep your streak going.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(nextProblem ? `/arena/${encodeURIComponent(nextProblem.id)}` : '/arena')}
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-cyan-400 px-4 py-2 text-xs font-black text-black transition hover:bg-cyan-300"
        >
          Start practice
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
