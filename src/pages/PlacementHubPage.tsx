/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Database, FileText, Layers, Network, Percent, RotateCcw } from 'lucide-react';
import { useRequiredUser } from '../context/AuthContext';
import { placementSubjects, type SubjectModule } from '../data/placementHub';
import { BookOpen as HeroBookOpen, HelpCircle as HeroHelpCircle, Layers as HeroLayers } from 'lucide-react';
import { PageHero } from '../components/PageHero';

const SUBJECT_ICONS: Record<string, React.ElementType> = {
  Database,
  Network,
  Layers,
  FileText,
  Percent,
};

function SubjectIcon({ name, className = 'h-5 w-5 text-cyan-400' }: { name: string; className?: string }) {
  const Icon = SUBJECT_ICONS[name] ?? FileText;
  return <Icon className={className} aria-hidden="true" />;
}

function SectionLabel({ label, title }: { label: string; title: string }) {
  return (
    <>
      <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-slate-500">{label}</p>
      <h2 className="mt-1 mb-3 font-heading text-xl font-bold text-white">{title}</h2>
    </>
  );
}

/** Empty-state text: admins get a pointer to the admin page, students just see that nothing is available. */
function EmptyContent({ what, isAdmin }: { what: string; isAdmin: boolean }) {
  return (
    <p className="text-sm text-slate-400">
      No {what} in this subject yet.
      {isAdmin && (
        <>
          {' '}
          Placement Hub content ships with the app; coding problems can be managed in{' '}
          <Link to="/admin" className="font-semibold text-cyan-400 hover:underline">
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
    <div className="space-y-10">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <section id="subject-notes-card">
          <SectionLabel label="Read" title="Revision notes" />
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{subject.notes}</p>
        </section>

        <section className="flex flex-col" id="flash-card-pane">
          <SectionLabel label="Revise" title={`Flashcards (${cards.length > 0 ? `${cardIndex + 1}/${cards.length}` : '0/0'})`} />

          {cards.length === 0 ? (
            <div className="rounded-md bg-slate-900 p-4">
              <EmptyContent what="revision cards" isAdmin={isAdmin} />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setFlipped((value) => !value)}
              aria-label={flipped ? 'Show question' : 'Show answer'}
              className="flex min-h-[160px] cursor-pointer items-center justify-center rounded-md bg-slate-900 px-5 py-8 text-center transition-colors hover:bg-slate-800"
            >
              {flipped ? (
                <span className="font-mono text-sm leading-relaxed text-cyan-400">{cards[cardIndex]?.back}</span>
              ) : (
                <span className="text-lg font-semibold leading-relaxed text-white">{cards[cardIndex]?.front}</span>
              )}
            </button>
          )}

          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-400">{cards.length > 0 ? 'Click the card to flip it' : ''}</span>
            <button
              type="button"
              id="flashcard-next-btn"
              onClick={nextCard}
              disabled={cards.length === 0}
              className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" /> Next card
            </button>
          </div>
        </section>

        <section className="flex flex-col gap-6" id="hub-mcq-box">
          {mcqs.length === 0 ? (
            <div>
              <SectionLabel label="Test" title="Practice MCQ" />
              <EmptyContent what="practice MCQs" isAdmin={isAdmin} />
            </div>
          ) : (
            mcqs.map((mcq, qIndex) => {
              const selected = answers[qIndex];
              const isChecked = Boolean(checked[qIndex]);
              return (
                <fieldset key={qIndex} className="space-y-3">
                  <legend className="w-full">
                    <SectionLabel label="Test" title={`Practice MCQ ${mcqs.length > 1 ? `${qIndex + 1}/${mcqs.length}` : ''}`.trim()} />
                  </legend>
                  <p className="text-sm font-semibold leading-normal text-white">{mcq.question}</p>

                  <div className="space-y-2">
                    {mcq.options.map((option, oIndex) => {
                      const isChosen = selected === oIndex;
                      const isCorrect = oIndex === mcq.answerIndex;
                      let style = 'text-slate-300';
                      if (isChecked) {
                        if (isCorrect) style = 'text-emerald-400';
                        else if (isChosen) style = 'text-rose-400';
                      } else if (isChosen) {
                        style = 'text-white ring-1 ring-cyan-400';
                      }
                      return (
                        <button
                          type="button"
                          key={oIndex}
                          disabled={isChecked}
                          aria-pressed={isChosen}
                          onClick={() => setAnswers((prev) => ({ ...prev, [qIndex]: oIndex }))}
                          className={`flex w-full cursor-pointer items-center gap-3 rounded-md bg-slate-900 px-4 py-3 text-left text-sm transition-colors hover:bg-slate-800 disabled:cursor-default ${style}`}
                        >
                          <span className="font-mono text-[11px] font-semibold text-slate-400">{oIndex + 1}</span>
                          <span>{option}</span>
                        </button>
                      );
                    })}
                  </div>

                  {isChecked && (
                    <div className="flex items-start gap-2 rounded-md bg-slate-900 p-3 text-sm leading-normal text-slate-300" role="status">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" aria-hidden="true" />
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
                      className="cursor-pointer rounded-md bg-cyan-400 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
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
                      className="cursor-pointer rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
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

      <p className="border-l-2 border-cyan-400 pl-3 text-sm leading-relaxed text-slate-300" id="placement-tip-block">
        <span className="mb-1 block text-sm font-semibold text-cyan-400">Revision tip</span>
        Practice here is for self-assessment only. To earn XP, solve problems in the Coding Arena, complete learning-track
        quizzes, or finish a mock interview.
      </p>
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
    <div className="space-y-8" id="placement-hub-container">
      <PageHero
        titleId="placement-heading"
        eyebrow="Prepare"
        title="Placement Hub"
        subtitle="Revise the core subjects interviewers ask about, with notes, flashcards and multiple-choice questions."
        tags={placementSubjects.map((subject) => subject.title)}
        stats={[
          { icon: HeroLayers, value: String(placementSubjects.length), label: 'subjects' },
          { icon: HeroBookOpen, value: String(placementSubjects.reduce((sum, subject) => sum + (subject.cards?.length ?? 0), 0)), label: 'flashcards' },
          { icon: HeroHelpCircle, value: String(placementSubjects.reduce((sum, subject) => sum + (subject.mcqs?.length ?? 0), 0)), label: 'MCQs' },
        ]}
      />
      <div className="flex gap-2.5 overflow-x-auto p-1 pb-2" id="hub-subjects-tabs" role="tablist" aria-label="Subjects">
        {placementSubjects.map((subject) => {
          const isSelected = subject.id === selectedSubject.id;
          return (
            <button
              type="button"
              role="tab"
              aria-selected={isSelected}
              key={subject.id}
              onClick={() => setSelectedSubjectId(subject.id)}
              className={`flex shrink-0 cursor-pointer items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-4 text-left transition-all ${
                isSelected
                  ? 'bg-cyan-400 text-black shadow-md'
                  : 'bg-slate-900 text-slate-300 ring-1 ring-inset ring-slate-800 hover:-translate-y-px hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full ${isSelected ? 'bg-black/15' : 'bg-cyan-400/15'}`}
              >
                <SubjectIcon name={subject.icon} className={`h-4 w-4 ${isSelected ? 'text-black' : 'text-cyan-400'}`} />
              </span>
              <span className="whitespace-nowrap text-sm font-semibold">{subject.title}</span>
            </button>
          );
        })}
      </div>

      {/* key resets card/MCQ progress when switching subjects */}
      <SubjectStudy key={selectedSubject.id} subject={selectedSubject} isAdmin={user.isAdmin} />
    </div>
  );
}
