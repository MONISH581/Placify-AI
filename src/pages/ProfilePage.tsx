/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Award, ShieldCheck } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useRequiredUser } from '../context/AuthContext';
import { Sparkles as HeroSparkles, Flame as HeroFlame, CheckSquare as HeroCheckSquare, Target as HeroTarget } from 'lucide-react';
import { PageHero } from '../components/PageHero';
import { BadgeShelf } from '../components/illustrations/Badges';

function SectionLabel({ children }: { children: string }) {
  return <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-slate-500">{children}</p>;
}

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
    <div className="space-y-10">
      <PageHero
        titleId="profile-heading"
        eyebrow="Account"
        title={user.username}
        byline={user.email}
        tags={[user.isAdmin ? 'Admin' : 'Student', ...(user.verified ? ['Verified'] : [])]}
        stats={[
          { icon: HeroSparkles, value: `${user.xp}`, label: `XP · level ${user.level}` },
          { icon: HeroCheckSquare, value: `${solvedCount}`, label: 'problems solved' },
          { icon: HeroTarget, value: `${user.accuracy}%`, label: 'accuracy' },
          { icon: HeroFlame, value: `${user.streak}`, label: user.streak === 1 ? 'day streak' : 'days streak' },
        ]}
      />

      <section>
        <SectionLabel>Progress</SectionLabel>
        <h2 className="mb-4 mt-1 font-heading text-xl font-bold text-white">Placement metrics</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-6 md:grid-cols-3">
          {metrics.map((metric) => (
            <div key={metric.label}>
              <dt className="font-mono text-[11px] font-semibold uppercase tracking-widest text-slate-500">{metric.label}</dt>
              <dd className={`mt-1 font-heading text-2xl font-bold ${metric.accent ? 'text-cyan-400' : 'text-white'}`}>{metric.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <SectionLabel>Achievements</SectionLabel>
        <h2 className="mb-3 mt-1 flex items-center gap-2 font-heading text-xl font-bold text-white">
          <Award className="h-5 w-5 text-cyan-400" aria-hidden="true" /> Badges
        </h2>
        <BadgeShelf owned={badges} />
      </section>

      <section>
        <SectionLabel>Account</SectionLabel>
        <h2 className="mb-3 mt-1 font-heading text-xl font-bold text-white">Details</h2>
        <dl className="grid max-w-xl grid-cols-[6.5rem_minmax(0,1fr)] sm:grid-cols-[8rem_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm">
          <dt className="text-slate-400">Email</dt>
          <dd className="break-all text-white">{user.email}</dd>
          <dt className="text-slate-400">Status</dt>
          <dd className={user.verified ? 'inline-flex items-center gap-2 text-emerald-400' : 'text-slate-300'}>
            {user.verified && <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
            {user.verified ? 'Verified' : 'Not verified'}
          </dd>
          <dt className="text-slate-400">Role</dt>
          <dd className="text-white">{user.isAdmin ? 'Admin' : 'Student'}</dd>
          {user.lastActiveDate && (
            <>
              <dt className="text-slate-400">Last active</dt>
              <dd className="text-white">{user.lastActiveDate}</dd>
            </>
          )}
        </dl>
      </section>
    </div>
  );
}
