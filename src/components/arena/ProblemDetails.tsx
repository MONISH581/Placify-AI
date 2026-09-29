import { useState } from 'react';
import { Award, Copy, Eye, Lightbulb, Lock } from 'lucide-react';
import { LANGUAGES, type Language, type Problem } from '../../types';
import { difficultyBadgeClass } from './difficulty';

type DetailsTab = 'details' | 'editorial' | 'hints';

interface ProblemDetailsProps {
  problem: Problem;
  /** True once the user has an Accepted submission for this problem. */
  solved: boolean;
}

export function ProblemDetails({ problem, solved }: ProblemDetailsProps) {
  const [activeTab, setActiveTab] = useState<DetailsTab>('details');
  const [unlockedHints, setUnlockedHints] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [solutionLang, setSolutionLang] = useState<Language>('javascript');

  const hints = problem.hints ?? [];
  const canViewSolutions = solved || revealed;
  const solutionCode = problem.solutions?.[solutionLang] ?? '';

  const tabs: Array<{ id: DetailsTab; label: string }> = [
    { id: 'details', label: 'Problem' },
    { id: 'editorial', label: 'Editorial' },
    { id: 'hints', label: `Hints (${unlockedHints}/${hints.length})` },
  ];

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-slate-800 bg-[#161D2F] lg:col-span-6" id="left-problem-description">
      <div className="flex border-b border-slate-800 bg-slate-900/30 text-xs" id="arena-tabs" role="tablist" aria-label="Problem sections">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 cursor-pointer border-b-2 py-3 text-center font-semibold transition ${
              activeTab === tab.id ? 'border-cyan-400 bg-white/5 text-white' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="max-h-[500px] flex-1 overflow-y-auto p-5" id="selected-tab-content" role="tabpanel">
        {activeTab === 'details' && (
          <div className="space-y-4 font-sans" id="details-view">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold tracking-tight text-white">{problem.title}</h2>
              <span className={`shrink-0 rounded border px-2 py-0.5 font-mono text-[9px] ${difficultyBadgeClass(problem.difficulty)}`}>
                {problem.difficulty}
              </span>
            </div>

            <p className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-300">{problem.description}</p>

            {problem.constraints && (
              <div className="space-y-2 border-t border-white/5 pt-3">
                <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400">Constraints</h3>
                <pre className="whitespace-pre-wrap rounded-lg border border-white/5 bg-black/40 p-2.5 font-mono text-xs text-cyan-300">
                  {problem.constraints}
                </pre>
              </div>
            )}

            <div className="space-y-2">
              {problem.inputFormat && (
                <>
                  <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400">Input format</h3>
                  <p className="whitespace-pre-wrap rounded-lg border border-white/5 bg-black/20 p-2 text-xs leading-normal text-zinc-300">
                    {problem.inputFormat}
                  </p>
                </>
              )}
              {problem.outputFormat && (
                <>
                  <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400">Output format</h3>
                  <p className="whitespace-pre-wrap rounded-lg border border-white/5 bg-black/20 p-2 text-xs leading-normal text-zinc-300">
                    {problem.outputFormat}
                  </p>
                </>
              )}
            </div>

            {(problem.examples ?? []).map((example, index) => (
              <div key={index} className="space-y-2.5 rounded-xl border border-white/5 bg-black/10 p-3.5">
                <span className="font-mono text-[9px] font-bold uppercase text-cyan-400">Example {index + 1}</span>
                <div className="grid grid-cols-1 gap-4 font-mono text-xs sm:grid-cols-2">
                  <div>
                    <p className="mb-1.5 text-zinc-500">Input:</p>
                    <pre className="overflow-x-auto rounded-lg border border-white/5 bg-slate-950 p-2.5 text-zinc-300">{example.input}</pre>
                  </div>
                  <div>
                    <p className="mb-1.5 text-zinc-500">Expected output:</p>
                    <pre className="overflow-x-auto rounded-lg border border-white/5 bg-slate-950 p-2.5 text-zinc-300">{example.output}</pre>
                  </div>
                </div>
                {example.explanation && (
                  <p className="font-sans text-xs italic leading-normal text-zinc-400">
                    <strong>Explanation:</strong> {example.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'editorial' &&
          (canViewSolutions ? (
            <div className="space-y-4" id="editorial-view">
              <div className="mb-2 flex items-center gap-2">
                <Award className="h-5 w-5 text-cyan-400" aria-hidden="true" />
                <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-white">Editorial</h3>
              </div>
              <p className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-zinc-300">
                {problem.editorial || 'No editorial has been published for this problem yet.'}
              </p>

              <div className="space-y-3 border-t border-white/5 pt-4" id="editorial-solutions-block">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400">Reference solutions</h4>
                  <div className="flex flex-wrap gap-1.5" id="solution-lang-tabs">
                    {LANGUAGES.map((language) => (
                      <button
                        type="button"
                        key={language.id}
                        aria-pressed={solutionLang === language.id}
                        onClick={() => setSolutionLang(language.id)}
                        className={`cursor-pointer rounded border px-2 py-0.5 font-mono text-[10px] font-bold transition ${
                          solutionLang === language.id
                            ? 'border-cyan-500/20 bg-cyan-950/40 text-cyan-300'
                            : 'border-white/5 bg-black/20 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {language.id.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {solutionCode ? (
                  <div className="relative">
                    <pre className="max-h-[250px] overflow-x-auto rounded-xl border border-white/5 bg-slate-950 p-4 font-mono text-[11px] leading-relaxed text-cyan-300">
                      {solutionCode}
                    </pre>
                    <button
                      type="button"
                      onClick={() => void navigator.clipboard?.writeText(solutionCode).catch(() => undefined)}
                      aria-label="Copy solution"
                      className="absolute right-2.5 top-2.5 flex cursor-pointer items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[9px] text-zinc-300 transition hover:text-white"
                    >
                      <Copy className="h-3 w-3" aria-hidden="true" /> Copy
                    </button>
                  </div>
                ) : (
                  <p className="text-xs italic text-zinc-500">No reference solution for this language.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-10 text-center" id="editorial-locked">
              <Lock className="h-8 w-8 text-zinc-500" aria-hidden="true" />
              <p className="max-w-xs text-xs text-zinc-300">
                The editorial and reference solutions unlock after you get an <strong>Accepted</strong> submission.
              </p>
              <button
                type="button"
                onClick={() => setRevealed(true)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-zinc-200 transition hover:bg-white/10"
              >
                <Eye className="h-3.5 w-3.5" aria-hidden="true" /> Reveal anyway (spoilers)
              </button>
            </div>
          ))}

        {activeTab === 'hints' && (
          <div className="space-y-4 font-sans text-xs" id="hints-view">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <Lightbulb className="h-4 w-4 text-cyan-400" aria-hidden="true" />
              <h3 className="font-bold text-white">Progressive hints</h3>
            </div>
            <p className="text-xs leading-normal text-zinc-400">Unlock hints one at a time to avoid spoilers.</p>

            {hints.length === 0 ? (
              <p className="italic text-zinc-500">No hints are available for this problem.</p>
            ) : (
              <ol className="space-y-3">
                {hints.map((hint, index) => {
                  const level = index + 1;
                  const isUnlocked = unlockedHints >= level;
                  const isNext = unlockedHints === index;
                  return (
                    <li
                      key={index}
                      className={`rounded-xl border p-3 transition-all ${isUnlocked ? 'border-white/10 bg-black/20' : 'border-white/5 bg-black/40 opacity-70'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">Hint {level}</span>
                        {!isUnlocked && (
                          <button
                            type="button"
                            disabled={!isNext}
                            onClick={() => setUnlockedHints(level)}
                            className="cursor-pointer rounded-lg bg-cyan-400 px-3 py-1 text-[9px] font-black text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Unlock
                          </button>
                        )}
                      </div>
                      {isUnlocked && (
                        <p className="mt-2.5 whitespace-pre-wrap rounded-lg border border-white/5 bg-slate-950/60 p-2.5 font-mono text-[11px] leading-relaxed text-zinc-300">
                          {hint}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
