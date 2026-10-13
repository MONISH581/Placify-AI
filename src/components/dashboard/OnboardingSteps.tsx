import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { SceneArt } from '../illustrations/Scenes';
import type { User } from '../../types';

const STEPS = [
  { key: 'solve', tone: 'arena', title: 'Solve a problem', hint: 'Run code against the real judge.', to: '/arena', badge: 'First Solve' },
  { key: 'learn', tone: 'tracks', title: 'Learn a topic', hint: 'Finish a lesson and pass its quiz.', to: '/tracks', badge: 'Curious Learner' },
  { key: 'interview', tone: 'interview', title: 'Try a mock interview', hint: 'Get scored feedback on your answers.', to: '/interview', badge: 'Interview Starter' },
] as const;

/** Three-step getting-started strip for new users. Hides itself once all three steps are done. */
export function OnboardingSteps({ user }: { user: User }) {
  const owned = new Set(user.badges ?? []);
  const done = (step: (typeof STEPS)[number]) => owned.has(step.badge) || (step.key === 'solve' && (user.problemsSolved ?? []).length > 0);
  const doneCount = STEPS.filter(done).length;
  if (doneCount === STEPS.length) return null;

  return (
    <section aria-labelledby="onboarding-heading">
      <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-slate-500">Getting started</p>
      <h2 id="onboarding-heading" className="mb-4 mt-1 font-heading text-xl font-bold text-white">
        Three steps to get going <span className="font-mono text-xs font-normal text-slate-500">{doneCount}/3</span>
      </h2>
      <ol className="grid gap-3 md:grid-cols-3">
        {STEPS.map((step, index) => {
          const complete = done(step);
          return (
            <li key={step.key}>
              <Link
                to={step.to}
                className={`group relative flex h-full flex-col overflow-hidden rounded-md bg-slate-900 transition-colors hover:bg-slate-800 ${complete ? 'opacity-70' : ''}`}
              >
                <div className="flex h-28 items-center justify-center bg-slate-800/60 py-2">
                  <SceneArt tone={step.tone} className="h-full w-auto transition-transform group-hover:scale-105" />
                </div>
                <div className="flex items-start gap-3 p-4">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold ${
                      complete ? 'bg-cyan-400 text-black' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {complete ? <CheckCircle2 className="h-4 w-4" aria-label="Done" /> : index + 1}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-white">{step.title}</span>
                    <span className="block text-xs text-slate-400">{step.hint}</span>
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
