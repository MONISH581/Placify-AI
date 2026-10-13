/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { careerPaths } from '../data/roadmaps';
import { Target as HeroTarget } from 'lucide-react';
import { PageHero } from '../components/PageHero';
import { NamedIcon } from '../components/NamedIcon';
import { EmptyState } from '../components/illustrations/Scenes';

/** Must be a real id from src/data/roadmaps.ts. */
const DEFAULT_PATH_ID = 'fullstack-enterprise';

function SectionLabel({ children }: { children: string }) {
  return <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-slate-500">{children}</p>;
}

export default function CareerRoadmapPage() {
  const [selectedPathId, setSelectedPathId] = useState(() =>
    careerPaths.some((path) => path.id === DEFAULT_PATH_ID) ? DEFAULT_PATH_ID : careerPaths[0]?.id ?? '',
  );
  const activePath = careerPaths.find((path) => path.id === selectedPathId) ?? careerPaths[0];

  if (!activePath) {
    return <EmptyState variant="inbox" title="No career paths available" />;
  }

  return (
    <div className="space-y-10">
      <PageHero
        titleId="career-heading"
        eyebrow="Grow"
        title="Career Roadmap"
        subtitle="Pick a target role and follow a step-by-step plan of skills, projects and milestones."
        stats={[{ icon: HeroTarget, value: String(careerPaths.length), label: 'career tracks' }]}
      />
      <section>
        <SectionLabel>Target career track</SectionLabel>
        <div className="mt-2 flex flex-wrap gap-2.5 p-1" id="career-path-select" role="group" aria-label="Target career track">
          {careerPaths.map((path) => {
            const isSelected = path.id === activePath.id;
            return (
              <button
                type="button"
                key={path.id}
                aria-pressed={isSelected}
                onClick={() => setSelectedPathId(path.id)}
                className={`flex shrink-0 cursor-pointer items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-4 text-left transition-all ${
                  isSelected
                    ? 'bg-cyan-400 text-black shadow-md'
                    : 'bg-slate-900 text-slate-300 ring-1 ring-inset ring-slate-800 hover:-translate-y-px hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${isSelected ? 'bg-black/15' : 'bg-cyan-400/15'}`}
                  aria-hidden="true"
                >
                  <NamedIcon name={path.icon} className={`h-4 w-4 ${isSelected ? 'text-black' : 'text-cyan-400'}`} />
                </span>
                <span className="whitespace-nowrap text-sm font-semibold">{path.title}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SectionLabel>{activePath.role}</SectionLabel>
            <h2 className="mb-2 mt-1 font-heading text-xl font-bold text-white">{activePath.title}</h2>
            <p className="text-sm leading-relaxed text-slate-300">{activePath.description}</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {activePath.skills.map((skill) => (
                <li key={skill} className="rounded-md bg-slate-900 px-2.5 py-1 font-mono text-xs text-cyan-400">
                  {skill}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-md bg-slate-900 p-4">
            <h2 className="font-mono text-[11px] font-semibold uppercase tracking-widest text-slate-500">Example target companies</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {activePath.targetCompanies.map((company) => (
                <li key={company} className="rounded-md bg-slate-800 px-2.5 py-1 font-mono text-xs font-semibold text-slate-300">
                  {company}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section>
        <SectionLabel>Plan</SectionLabel>
        <h2 className="mb-5 mt-1 font-heading text-xl font-bold text-white">Roadmap steps</h2>
        <ol className="ml-1.5 max-w-3xl border-l border-slate-800">
          {activePath.milestones.map((milestone, index) => (
            <li key={milestone.id} className="relative pb-8 pl-6 last:pb-0">
              <span className="absolute -left-[4.5px] top-2 h-2 w-2 rounded-full bg-cyan-400" aria-hidden="true" />
              <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-cyan-400">Step {index + 1}</p>
              <h3 className="mt-1 font-heading text-lg font-bold text-white">{milestone.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-300">{milestone.description}</p>
              {milestone.skills.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {milestone.skills.map((skill) => (
                    <li key={skill} className="rounded-md bg-slate-900 px-2.5 py-1 font-mono text-xs text-slate-300">
                      {skill}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
