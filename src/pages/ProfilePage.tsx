/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Award, ShieldCheck } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useRequiredUser } from '../context/AuthContext';

export default function ProfilePage() {
  const user = useRequiredUser();
  const { analytics, problems } = useAppData();
  const solvedCount = (user.problemsSolved ?? []).length;
  const badges = user.badges ?? [];
  const readiness = analytics?.readiness.score;

  const metrics = [
    { label: 'Readiness score', value: typeof readiness === 'number' ? `${readiness}%` : '--', accent: true },
    { label: 'Problems solved', value: `${solvedCount}/${problems.length}` },
    { label: 'Experience XP', value: String(user.xp) },
    { label: 'Level', value: `L${user.level}` },
    { label: 'Submission accuracy', value: `${user.accuracy}%` },
    { label: 'Current streak', value: `${user.streak} days` },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
      <section className="rounded-xl border border-slate-800 bg-[#161D2F] p-6 shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/20 font-mono text-xl font-black text-cyan-300">
          {user.username.slice(0, 2).toUpperCase()}
        </div>
        <h1 className="mt-4 font-heading text-2xl font-bold text-white">{user.username}</h1>
        <p className="font-mono text-xs text-slate-400">{user.email}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {user.verified && (
            <span className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-950/30 px-3 py-1 font-mono text-xs font-bold text-cyan-400">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Verified
            </span>
          )}
          {user.isAdmin && (
            <span className="inline-flex items-center gap-2 rounded-lg border border-violet-500/30 bg-violet-950/30 px-3 py-1 font-mono text-xs font-bold text-violet-300">
              Admin
            </span>
          )}
        </div>
        {user.lastActiveDate && <p className="mt-4 font-mono text-[10px] text-zinc-500">Last active: {user.lastActiveDate}</p>}
      </section>

      <section className="rounded-xl border border-slate-800 bg-[#161D2F] p-6 shadow-sm xl:col-span-2">
        <h2 className="mb-4 font-heading text-lg font-bold text-white">Placement metrics</h2>
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-lg border border-slate-800 bg-slate-950 p-4">
              <dt className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500">{metric.label}</dt>
              <dd className={`mt-1 font-mono text-2xl font-black ${metric.accent ? 'text-cyan-400' : 'text-white'}`}>{metric.value}</dd>
            </div>
          ))}
        </dl>

        <h2 className="mb-3 mt-6 flex items-center gap-2 font-heading text-sm font-bold text-white">
          <Award className="h-4 w-4 text-cyan-400" aria-hidden="true" /> Badges
        </h2>
        {badges.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {badges.map((badge) => (
              <li key={badge} className="rounded border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan-300">
                {badge}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-400">No badges earned yet.</p>
        )}
      </section>
    </div>
  );
}
