/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { careerPaths } from '../data/roadmaps';

/** Must be a real id from src/data/roadmaps.ts. */
const DEFAULT_PATH_ID = 'fullstack-enterprise';

export default function CareerRoadmapPage() {
  const [selectedPathId, setSelectedPathId] = useState(() =>
    careerPaths.some((path) => path.id === DEFAULT_PATH_ID) ? DEFAULT_PATH_ID : careerPaths[0]?.id ?? '',
  );
  const activePath = careerPaths.find((path) => path.id === selectedPathId) ?? careerPaths[0];

  if (!activePath) {
    return <p className="text-sm text-slate-400">No career paths are available.</p>;
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-800 bg-[#161D2F] p-5 shadow-sm">
        <label htmlFor="career-path-select" className="mb-1 block font-mono text-xs font-bold uppercase tracking-wide text-zinc-400">
          Target career track
        </label>
        <select
          id="career-path-select"
          value={activePath.id}
          onChange={(event) => setSelectedPathId(event.target.value)}
          className="h-11 w-full max-w-sm rounded-lg border border-slate-800 bg-slate-950/40 px-3 font-mono text-xs font-bold text-white outline-none focus:border-cyan-500"
        >
          {careerPaths.map((path) => (
            <option key={path.id} value={path.id} className="bg-[#161D2F] text-white">
              {path.title}
            </option>
          ))}
        </select>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h1 className="font-heading text-2xl font-bold text-white">{activePath.title}</h1>
            <p className="mt-1 font-mono text-[11px] text-cyan-300">{activePath.role}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">{activePath.description}</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {activePath.skills.map((skill) => (
                <li key={skill} className="rounded-md border border-cyan-500/20 bg-cyan-950/20 px-2 py-1 font-mono text-[10px] text-cyan-300">
                  {skill}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
            <h2 className="font-mono text-xs font-bold uppercase tracking-wide text-zinc-400">Example target companies</h2>
            <ul className="mt-2 flex flex-wrap gap-2">
              {activePath.targetCompanies.map((company) => (
                <li key={company} className="rounded-md border border-slate-800 bg-slate-900 px-2 py-1 font-mono text-[10px] font-bold text-zinc-300">
                  {company}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <ol className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {activePath.milestones.map((milestone, index) => (
          <li key={milestone.id} className="rounded-xl border border-slate-800 bg-[#161D2F] p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-heading text-lg font-bold text-white">{milestone.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">{milestone.description}</p>
              </div>
              <span className="shrink-0 rounded-lg border border-cyan-500/30 bg-cyan-950/30 px-2.5 py-1 font-mono text-[10px] font-bold uppercase text-cyan-400">
                Step {index + 1}
              </span>
            </div>
            {milestone.skills.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {milestone.skills.map((skill) => (
                  <li key={skill} className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[9px] text-zinc-300">
                    {skill}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
