/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Database, FileText, Layers, Network, Percent, RotateCcw, Sparkles } from 'lucide-react';
import { useRequiredUser } from '../context/AuthContext';
import { placementSubjects, type SubjectModule } from '../data/placementHub';

const SUBJECT_ICONS: Record<string, React.ElementType> = {
  Database,
  Network,
  Layers,
  FileText,
  Percent,
};

function SubjectIcon({ name }: { name: string }) {
  const Icon = SUBJECT_ICONS[name] ?? FileText;
  return <Icon className="h-5 w-5 text-indigo-400" aria-hidden="true" />;
}

/** Empty-state text: admins get a pointer to the admin page, students just see that nothing is available. */
function EmptyContent({ what, isAdmin }: { what: string; isAdmin: boolean }) {
  return (
    <p className="text-xs italic text-zinc-500">
      No {what} in this subject yet.
      {isAdmin && (
        <>
          {' '}
          Placement Hub content ships with the app; coding problems can be managed in{' '}
          <Link to="/admin" className="font-bold text-cyan-300 not-italic hover:underline">
            Admin Studio
          </Link>
          .
        </>
      )}
    </p>
  );
}

function SubjectStudy({ subject, isAdmin }: { subject: SubjectModule; isAdmin: boolean }) {
  const cards = subject.cards ?? [];
  const mcqs = subject.mcqs ?? [];
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  const nextCard = () => {
    if (cards.length === 0) return;
    setFlipped(false);
    setCardIndex((index) => (index + 1) % cards.length);
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="flex flex-col gap-4 lg:col-span-4">
        <section className="rounded-xl border border-slate-800 bg-[#161D2F] p-5" id="subject-notes-card">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
            <Sparkles className="h-4 w-4 text-cyan-400" aria-hidden="true" /> Revision notes
          </h2>
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-300">{subject.notes}</p>
        </section>
      </div>

      <div className="space-y-6 lg:col-span-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <section className="flex min-h-[220px] flex-col justify-between rounded-xl border border-slate-800 bg-[#161D2F] p-5" id="flash-card-pane">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-[10px] uppercase tracking-widest text-slate-400">
                Flashcards ({cards.length > 0 ? `${cardIndex + 1}/${cards.length}` : '0/0'})
              </h3>
            </div>

            {cards.length === 0 ? (
              <div className="my-4 py-8">
                <EmptyContent what="revision cards" isAdmin={isAdmin} />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setFlipped((value) => !value)}
                aria-label={flipped ? 'Show question' : 'Show answer'}
                className="my-4 flex min-h-[100px] cursor-pointer items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-8 text-center transition-all duration-300"
              >
                {flipped ? (
                  <span className="font-mono text-xs leading-relaxed text-cyan-400">{cards[cardIndex]?.back}</span>
                ) : (
                  <span className="text-sm font-bold leading-relaxed text-white">{cards[cardIndex]?.front}</span>
                )}
              </button>
            )}

            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500">{cards.length > 0 ? 'Click the card to flip it' : ''}</span>
              <button
                type="button"
                id="flashcard-next-btn"
                onClick={nextCard}
                disabled={cards.length === 0}
                className="flex cursor-pointer items-center gap-1 rounded bg-slate-800 p-1 px-3 text-xs text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCcw className="h-3 w-3 text-slate-400" aria-hidden="true" /> Next card
              </button>
            </div>
          </section>

          <section className="flex flex-col gap-6 rounded-xl border border-slate-800 bg-[#161D2F] p-5" id="hub-mcq-box">
            {mcqs.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center py-10 text-center">
                <EmptyContent what="practice MCQs" isAdmin={isAdmin} />
              </div>
            ) : (
              mcqs.map((mcq, qIndex) => {
                const selected = answers[qIndex];
                const isChecked = Boolean(checked[qIndex]);
                return (
                  <fieldset key={qIndex} className="flex flex-col justify-between space-y-4">
                    <legend className="mb-2 w-full border-b border-slate-800 pb-2 text-[10px] uppercase tracking-widest text-slate-400">
                      Practice MCQ {mcqs.length > 1 ? `${qIndex + 1}/${mcqs.length}` : ''}
                    </legend>
                    <p className="text-xs font-bold leading-normal text-white">{mcq.question}</p>

                    <div className="space-y-2">
                      {mcq.options.map((option, oIndex) => {
                        const isChosen = selected === oIndex;
                        const isCorrect = oIndex === mcq.answerIndex;
                        let style = 'bg-slate-900 border-slate-800 text-slate-300';
                        if (isChecked) {
                          if (isCorrect) style = 'bg-cyan-950/40 border-cyan-500 text-cyan-400';
                          else if (isChosen) style = 'bg-red-950/40 border-red-500 text-red-400';
                        } else if (isChosen) {
                          style = 'bg-indigo-950/40 border-indigo-500 text-indigo-300';
                        }
                        return (
                          <button
                            type="button"
                            key={oIndex}
                            disabled={isChecked}
                            aria-pressed={isChosen}
                            onClick={() => setAnswers((prev) => ({ ...prev, [qIndex]: oIndex }))}
                            className={`flex w-full cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-left text-xs transition disabled:cursor-default ${style}`}
                          >
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-slate-800 bg-slate-950 text-[10px] font-bold text-slate-400">
                              {oIndex + 1}
                            </span>
                            <span>{option}</span>
                          </button>
                        );
                      })}
                    </div>

                    {isChecked && (
                      <div className="flex items-start gap-1.5 rounded-lg border border-slate-900 bg-slate-950 p-2.5 text-[11px] leading-normal text-slate-400" role="status">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" aria-hidden="true" />
                        <p>
                          <strong>{selected === mcq.answerIndex ? 'Correct.' : 'Not quite.'}</strong> {mcq.explanation}
                        </p>
                      </div>
                    )}

                    {!isChecked ? (
                      <button
                        type="button"
                        onClick={() => setChecked((prev) => ({ ...prev, [qIndex]: true }))}
                        disabled={selected === undefined}
                        id={qIndex === 0 ? 'mcq-validate-btn' : undefined}
                        className="w-full cursor-pointer rounded bg-indigo-600 py-1.5 text-xs font-bold text-white transition-all hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-400"
                      >
                        Check answer
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setChecked((prev) => ({ ...prev, [qIndex]: false }));
                          setAnswers((prev) => {
                            const next = { ...prev };
                            delete next[qIndex];
                            return next;
                          });
                        }}
                        className="w-full cursor-pointer rounded bg-slate-800 py-1.5 text-xs font-bold text-slate-200 transition hover:bg-slate-700"
                      >
                        Try again
                      </button>
                    )}
                  </fieldset>
                );
              })
            )}
          </section>
        </div>

        <p className="rounded-xl border border-indigo-500/20 bg-indigo-950/10 p-4 text-xs leading-relaxed text-slate-300" id="placement-tip-block">
          <span className="mb-1 block text-xs font-bold text-indigo-400">Revision tip</span>
          Practice here is for self-assessment only. To earn XP, solve problems in the Coding Arena, complete learning-track
          quizzes, or finish a mock interview.
        </p>
      </div>
    </div>
  );
}

export default function PlacementHubPage() {
  const user = useRequiredUser();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(placementSubjects[0]?.id ?? '');
  const selectedSubject = placementSubjects.find((subject) => subject.id === selectedSubjectId) ?? placementSubjects[0];

  if (!selectedSubject) {
    return <p className="text-sm text-slate-400">No placement subjects are available.</p>;
  }

  return (
    <div className="space-y-6" id="placement-hub-container">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5" id="hub-subjects-tabs" role="tablist" aria-label="Subjects">
        {placementSubjects.map((subject) => {
          const isSelected = subject.id === selectedSubject.id;
          return (
            <button
              type="button"
              role="tab"
              aria-selected={isSelected}
              key={subject.id}
              onClick={() => setSelectedSubjectId(subject.id)}
              className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border p-3.5 text-center transition ${
                isSelected ? 'border-indigo-500 bg-indigo-950/40 text-white' : 'border-slate-800 bg-[#161D2F] text-slate-300 hover:border-slate-700'
              }`}
            >
              <SubjectIcon name={subject.icon} />
              <span className="mt-1 font-sans text-xs font-bold">{subject.title}</span>
            </button>
          );
        })}
      </div>

      {/* key resets card/MCQ progress when switching subjects */}
      <SubjectStudy key={selectedSubject.id} subject={selectedSubject} isAdmin={user.isAdmin} />
    </div>
  );
}
