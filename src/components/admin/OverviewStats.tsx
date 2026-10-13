import { useCallback, useEffect, useState } from 'react';
import { BookOpenCheck, CheckCircle2, Code2, MessageSquare, Mic, Send, ShieldCheck, Trophy, Users } from 'lucide-react';
import { api } from '../../services/api';
import type { AdminStats } from '../../types';
import { ErrorAlert, LoadingBlock } from '../StatusMessages';
import { AdminHeading } from './adminUi';

/** Platform totals from GET /api/admin/stats. */
export function OverviewStats() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const result = await api.get<AdminStats>('/api/admin/stats');
    if (result.ok) setStats(result.data);
    else setError(result.error);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) return <ErrorAlert message={`Could not load platform stats: ${error}`} onRetry={() => void load()} />;
  if (!stats) return <LoadingBlock label="Loading platform stats..." />;

  const cards = [
    { icon: Users, label: 'Users', value: stats.users, hint: `${stats.admins} admin${stats.admins === 1 ? '' : 's'}` },
    { icon: Code2, label: 'Problems', value: stats.problems, hint: 'in the bank' },
    { icon: Send, label: 'Submissions', value: stats.submissions, hint: `${stats.acceptedSubmissions} accepted` },
    { icon: CheckCircle2, label: 'Acceptance', value: `${stats.acceptanceRate}%`, hint: 'of all submissions' },
    { icon: Trophy, label: 'Contests', value: stats.contests, hint: 'scheduled' },
    { icon: MessageSquare, label: 'Discussions', value: stats.threads, hint: `${stats.replies} replies` },
    { icon: Mic, label: 'Mock interviews', value: stats.interviews, hint: 'started' },
    { icon: BookOpenCheck, label: 'Topics completed', value: stats.topicsCompleted, hint: 'across all tracks' },
  ];

  return (
    <section aria-labelledby="stats-heading">
      <AdminHeading label="Platform" title="At a glance" />
      <h2 id="stats-heading" className="sr-only">
        Platform totals
      </h2>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((card) => (
          <li key={card.label} className="rounded-md bg-slate-900 p-4 ring-1 ring-slate-800">
            <card.icon className="h-4 w-4 text-cyan-400" strokeWidth={1.75} aria-hidden="true" />
            <p className="mt-3 font-heading text-2xl font-bold leading-none text-white">{card.value}</p>
            <p className="mt-1.5 text-xs font-semibold text-slate-300">{card.label}</p>
            <p className="font-mono text-[11px] text-slate-500">{card.hint}</p>
          </li>
        ))}
      </ul>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Admins can manage problems, contests, users and discussions from the tabs above.
      </p>
    </section>
  );
}
