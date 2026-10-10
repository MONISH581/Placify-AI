/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Briefcase, Loader2, MonitorSmartphone, Send, Trophy, Users } from 'lucide-react';
import { ErrorAlert } from '../components/StatusMessages';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { api, describeApiError } from '../services/api';
import type { InterviewType, MockInterview } from '../types';
import { MessageSquare as HeroMessageSquare } from 'lucide-react';
import { PageHero } from '../components/PageHero';
import { InterviewWaitingArt } from '../components/illustrations/ToolArt';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-slate-500">{children}</p>;
}

const MAX_ANSWER_CHARS = 5000;
const INTERVIEW_TIMEOUT_MS = 25_000;

const INTERVIEW_TYPES: Array<{ id: InterviewType; description: string; icon: React.ElementType }> = [
  { id: 'Technical', description: 'CS fundamentals, DSA and design trade-offs', icon: MonitorSmartphone },
  { id: 'HR', description: 'Motivation, career goals and culture fit', icon: Users },
  { id: 'Behavioral', description: 'Situational questions answered with STAR', icon: Briefcase },
];

/** Guards against partial payloads so the session view can index the arrays safely. */
function normalizeInterview(interview: MockInterview): MockInterview {
  const list = <T,>(value: T[] | undefined): T[] => (Array.isArray(value) ? value : []);
  return {
    ...interview,
    questions: list(interview.questions),
    answers: list(interview.answers),
    scores: list(interview.scores),
    feedback: list(interview.feedback),
    currentQuestionIndex: Number(interview.currentQuestionIndex) || 0,
    overallScore: typeof interview.overallScore === 'number' ? interview.overallScore : null,
    overallFeedback: interview.overallFeedback ?? null,
  };
}

export default function MockInterviewPage() {
  const { updateUser } = useAuth();
  const { refreshAnalytics } = useAppData();

  const [interviewType, setInterviewType] = useState<InterviewType>('Technical');
  const [session, setSession] = useState<MockInterview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [error, setError] = useState<string | null>(null);
  /** Set when the server reports the interview is already completed (409). */
  const [staleSession, setStaleSession] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);

  const startInterview = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);
    setStaleSession(false);
    setXpEarned(0);
    try {
      const result = await api.post<MockInterview>('/api/mock-interview/start', { type: interviewType }, { timeoutMs: INTERVIEW_TIMEOUT_MS });
      if (result.ok && result.data?.id && Array.isArray(result.data.questions)) {
        setSession(normalizeInterview(result.data));
        setCurrentAnswer('');
      } else {
        setError(result.ok ? 'The server returned an invalid interview.' : describeApiError(result));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!session || isLoading) return;
    const answer = currentAnswer.trim();
    if (!answer) {
      setError('Please write an answer before submitting.');
      return;
    }
    if (answer.length > MAX_ANSWER_CHARS) {
      setError(`Answers are limited to ${MAX_ANSWER_CHARS} characters.`);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.post<MockInterview>(
        `/api/mock-interview/${encodeURIComponent(session.id)}/answer`,
        { answer },
        { timeoutMs: INTERVIEW_TIMEOUT_MS },
      );
      if (!result.ok) {
        if (result.status === 409) {
          setStaleSession(true);
          // 409: the interview was already completed (or this question was answered elsewhere).
          setError(`${result.error || 'This interview has already been completed.'} Start a new interview to keep practicing.`);
        } else {
          setError(describeApiError(result));
        }
        return;
      }
      const updated = normalizeInterview(result.data);
      setSession(updated);
      setCurrentAnswer('');
      if (updated.status === 'Completed') {
        setXpEarned(Number(updated.xpEarned) || 0);
        if (updated.user) updateUser(updated.user);
        void refreshAnalytics();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetSession = () => {
    setSession(null);
    setCurrentAnswer('');
    setError(null);
    setStaleSession(false);
    setXpEarned(0);
  };


  if (!session) {
    return (
      <div className="space-y-8" id="mock-interview-container">
        <PageHero
          titleId="interview-heading"
          eyebrow="Prepare"
          title="Mock Interview"
          subtitle="Answer a short series of questions, get a score and feedback on each answer, and an overall summary at the end."
          tags={['Technical', 'HR', 'Behavioral']}
          stats={[{ icon: HeroMessageSquare, value: '3', label: 'interview types' }]}
        />
        <div className="mx-auto max-w-2xl" id="prep-params">
          <InterviewWaitingArt className="mx-auto mb-6 h-44 w-auto max-w-full" />
          <SectionLabel>Setup</SectionLabel>
          <h2 className="mb-2 mt-1 font-heading text-xl font-bold text-white">Mock interview</h2>
          <p className="mb-5 text-sm leading-relaxed text-slate-300">
            Pick an interview type. You will answer a short series of questions and receive a score and feedback for each
            answer, plus an overall summary at the end.
          </p>

          <fieldset className="mb-6">
            <legend className="sr-only">Interview type</legend>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {INTERVIEW_TYPES.map((type) => {
                const Icon = type.icon;
                const active = interviewType === type.id;
                return (
                  <button
                    type="button"
                    key={type.id}
                    aria-pressed={active}
                    onClick={() => setInterviewType(type.id)}
                    className={`cursor-pointer rounded-md bg-slate-900 p-4 text-left transition-colors hover:bg-slate-800 ${
                      active ? 'ring-1 ring-cyan-400' : ''
                    }`}
                  >
                    <Icon className={`mb-2 h-5 w-5 ${active ? 'text-cyan-400' : 'text-slate-400'}`} aria-hidden="true" />
                    <span className="block text-sm font-semibold text-white">{type.id}</span>
                    <span className="mt-1 block text-xs font-normal text-slate-400">{type.description}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {error && <ErrorAlert message={error} className="mb-4" />}

          <button
            type="button"
            onClick={() => void startInterview()}
            disabled={isLoading}
            id="start-mock-btn"
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-cyan-400 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-cyan-300 disabled:opacity-60"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {isLoading ? 'Starting...' : `Start ${interviewType} interview`}
          </button>
        </div>
      </div>
    );
  }

  const questionIndex = Math.min(session.currentQuestionIndex, Math.max(0, session.questions.length - 1));
  const lastAnsweredIndex = session.answers.length - 1;
  const lastScore = lastAnsweredIndex >= 0 ? session.scores[lastAnsweredIndex] : undefined;
  const lastFeedback = lastAnsweredIndex >= 0 ? session.feedback[lastAnsweredIndex] : undefined;
  const overallScore = session.overallScore ?? null;

  return (
    <div className="space-y-8" id="mock-interview-container">
      <PageHero
        titleId="interview-heading"
        eyebrow="Prepare"
        title="Mock Interview"
        subtitle="Answer a short series of questions, get a score and feedback on each answer, and an overall summary at the end."
        tags={['Technical', 'HR', 'Behavioral']}
        stats={[{ icon: HeroMessageSquare, value: '3', label: 'interview types' }]}
      />
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-8">
          {session.status === 'In Progress' && !staleSession ? (
            <section className="space-y-6" id="active-session-block">
              <div className="flex items-center justify-between">
                <SectionLabel>{session.type} interview</SectionLabel>
                <span className="font-mono text-xs text-slate-400">
                  Question {questionIndex + 1} of {session.questions.length}
                </span>
              </div>

              {typeof lastScore === 'number' && (
                <div className="rounded-md bg-slate-900 p-4 text-sm text-slate-300" role="status">
                  <p className="font-mono font-semibold text-cyan-400">Previous answer: {lastScore}/100</p>
                  {lastFeedback && <p className="mt-1 whitespace-pre-wrap">{lastFeedback}</p>}
                </div>
              )}

              <div>
                <SectionLabel>Interviewer question</SectionLabel>
                <p className="mt-2 font-heading text-xl font-bold leading-snug text-white">{session.questions[questionIndex]}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="interview-textarea" className="font-mono text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                    Your answer
                  </label>
                  <span className={`font-mono text-xs ${currentAnswer.length > MAX_ANSWER_CHARS ? 'text-rose-400' : 'text-slate-400'}`}>
                    {currentAnswer.length}/{MAX_ANSWER_CHARS}
                  </span>
                </div>
                <textarea
                  id="interview-textarea"
                  value={currentAnswer}
                  maxLength={MAX_ANSWER_CHARS}
                  onChange={(event) => setCurrentAnswer(event.target.value)}
                  placeholder="Structure your answer clearly and cite concrete outcomes where you can..."
                  className="h-[180px] w-full resize-none rounded-md border-0 bg-slate-900 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:ring-1 focus:ring-cyan-400"
                />
              </div>

              {error && <ErrorAlert message={error} />}

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={resetSession}
                  disabled={isLoading}
                  className="cursor-pointer rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
                >
                  End interview
                </button>
                <button
                  type="button"
                  onClick={() => void submitAnswer()}
                  disabled={!currentAnswer.trim() || isLoading}
                  className="flex cursor-pointer items-center gap-2 rounded-md bg-cyan-400 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
                  {isLoading ? 'Scoring...' : 'Submit answer'}
                </button>
              </div>
            </section>
          ) : staleSession ? (
            <section className="space-y-4">
              {error && <ErrorAlert message={error} />}
              <button
                type="button"
                onClick={resetSession}
                className="w-full cursor-pointer rounded-md bg-cyan-400 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-cyan-300"
              >
                Start a new interview
              </button>
            </section>
          ) : (
            <section className="space-y-8" id="completed-report-view">
              <div>
                <Trophy className="mb-2 h-6 w-6 text-amber-400" aria-hidden="true" />
                <SectionLabel>Result</SectionLabel>
                <h2 className="mb-1 mt-1 font-heading text-xl font-bold text-white">Interview complete</h2>
                <p className="text-sm text-slate-400">Here is how your answers were scored.</p>
                {xpEarned > 0 && <p className="mt-1 font-mono text-sm font-semibold text-cyan-400">+{xpEarned} XP</p>}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-md bg-slate-900 p-4">
                  <SectionLabel>Overall score</SectionLabel>
                  <div className="mt-2 font-heading text-5xl font-bold text-white">{overallScore !== null ? `${overallScore}%` : '--'}</div>
                  {overallScore !== null && (
                    <>
                      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                        <div className="h-full bg-cyan-400" style={{ width: `${Math.max(0, Math.min(100, overallScore))}%` }} />
                      </div>
                      <p className={`mt-2 font-mono text-xs font-semibold ${overallScore >= 60 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {overallScore >= 60 ? 'Strong performance' : 'Needs more practice'}
                      </p>
                    </>
                  )}
                </div>

                <div className="rounded-md bg-slate-900 p-4">
                  <SectionLabel>Summary</SectionLabel>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                    {session.overallFeedback || 'No summary was provided.'}
                  </p>
                </div>
              </div>

              <div>
                <SectionLabel>Review</SectionLabel>
                <h3 className="mb-3 mt-1 font-heading text-xl font-bold text-white">Answer scorecard</h3>
                <div className="space-y-2">
                  {session.questions.map((question, index) => (
                    <div key={index} className="space-y-2 rounded-md bg-slate-900 p-4 text-sm">
                      <div className="flex items-start justify-between gap-3 font-semibold">
                        <span className="text-white">
                          Q{index + 1}: {question}
                        </span>
                        <span className="shrink-0 font-mono text-cyan-400">
                          {typeof session.scores[index] === 'number' ? `${session.scores[index]}/100` : '--'}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-slate-300">
                        <strong>Your answer:</strong> {session.answers[index] ?? '(not answered)'}
                      </p>
                      {session.feedback[index] && (
                        <p className="whitespace-pre-wrap rounded-md bg-slate-800 p-3 leading-normal text-slate-300">
                          <strong className="text-cyan-400">Feedback:</strong> {session.feedback[index]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={resetSession}
                className="w-full cursor-pointer rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
              >
                Start another interview
              </button>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <section id="interviewer-insiders">
            <InterviewWaitingArt className="mb-4 h-32 w-auto" />
            <SectionLabel>Tips</SectionLabel>
            <h2 className="mb-3 mt-1 font-heading text-xl font-bold text-white">Answering tips</h2>
            <p className="mb-3 text-sm leading-relaxed text-slate-300">
              Structure behavioral answers with the <strong>STAR</strong> method:
            </p>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>
                <strong className="text-cyan-400">S</strong>ituation: the context
              </li>
              <li>
                <strong className="text-cyan-400">T</strong>ask: the goal or challenge
              </li>
              <li>
                <strong className="text-cyan-400">A</strong>ction: what you specifically did
              </li>
              <li>
                <strong className="text-cyan-400">R</strong>esult: measurable outcomes
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
