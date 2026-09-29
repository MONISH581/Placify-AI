/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Briefcase, Loader2, MonitorSmartphone, Send, Sparkles, Trophy, Users } from 'lucide-react';
import { ErrorAlert } from '../components/StatusMessages';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { api, describeApiError } from '../services/api';
import type { InterviewType, MockInterview } from '../types';

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
      <div className="space-y-6" id="mock-interview-container">
        <div className="mx-auto max-w-2xl rounded-xl border border-slate-800 bg-[#161D2F] p-6" id="prep-params">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-400" aria-hidden="true" />
            <h1 className="text-sm font-bold uppercase tracking-wider text-white">Mock interview</h1>
          </div>

          <p className="mb-6 text-xs leading-relaxed text-slate-300">
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
                    className={`cursor-pointer rounded-xl border p-4 text-center transition ${
                      active ? 'border-indigo-500 bg-indigo-950/40 font-semibold text-indigo-300' : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Icon className="mx-auto mb-1 h-5 w-5" aria-hidden="true" />
                    <span className="block text-xs">{type.id}</span>
                    <span className="mt-1 block text-[10px] font-normal text-slate-500">{type.description}</span>
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
            className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500 disabled:opacity-60"
          >
            {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
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
    <div className="space-y-6" id="mock-interview-container">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {session.status === 'In Progress' && !staleSession ? (
            <section className="space-y-4 rounded-xl border border-slate-800 bg-[#161D2F] p-5" id="active-session-block">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="rounded border border-indigo-500/20 bg-indigo-950/65 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-indigo-300">
                  {session.type} interview
                </span>
                <span className="font-mono text-[10px] text-slate-400">
                  Question {questionIndex + 1} of {session.questions.length}
                </span>
              </div>

              {typeof lastScore === 'number' && (
                <div className="rounded-lg border border-cyan-500/15 bg-cyan-950/20 p-3 text-[11px] text-slate-300" role="status">
                  <p className="font-mono font-bold text-cyan-300">Previous answer: {lastScore}/100</p>
                  {lastFeedback && <p className="mt-1 whitespace-pre-wrap">{lastFeedback}</p>}
                </div>
              )}

              <div className="my-2 rounded-xl border border-slate-900 bg-slate-950 p-4">
                <p className="mb-1 font-sans text-[10px] font-bold uppercase italic tracking-wider text-indigo-400">Interviewer question</p>
                <p className="text-sm font-semibold leading-relaxed text-white">{session.questions[questionIndex]}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="interview-textarea" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Your answer
                  </label>
                  <span className={`font-mono text-[10px] ${currentAnswer.length > MAX_ANSWER_CHARS ? 'text-rose-400' : 'text-slate-500'}`}>
                    {currentAnswer.length}/{MAX_ANSWER_CHARS}
                  </span>
                </div>
                <textarea
                  id="interview-textarea"
                  value={currentAnswer}
                  maxLength={MAX_ANSWER_CHARS}
                  onChange={(event) => setCurrentAnswer(event.target.value)}
                  placeholder="Structure your answer clearly and cite concrete outcomes where you can..."
                  className="h-[150px] w-full resize-none rounded-xl border border-slate-800 bg-slate-900 p-3 font-sans text-xs text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>

              {error && <ErrorAlert message={error} />}

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={resetSession}
                  disabled={isLoading}
                  className="cursor-pointer rounded-lg bg-slate-800 px-3.5 py-1.5 text-xs text-slate-200 transition hover:bg-slate-700 disabled:opacity-50"
                >
                  End interview
                </button>
                <button
                  type="button"
                  onClick={() => void submitAnswer()}
                  disabled={!currentAnswer.trim() || isLoading}
                  className="flex cursor-pointer items-center gap-1 rounded-lg bg-indigo-600 px-5 py-1.5 text-xs font-bold text-white shadow shadow-indigo-600/30 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Send className="h-3.5 w-3.5" aria-hidden="true" />}
                  {isLoading ? 'Scoring...' : 'Submit answer'}
                </button>
              </div>
            </section>
          ) : staleSession ? (
            <section className="space-y-4 rounded-xl border border-slate-800 bg-[#161D2F] p-6">
              {error && <ErrorAlert message={error} />}
              <button
                type="button"
                onClick={resetSession}
                className="w-full cursor-pointer rounded-lg bg-indigo-600 py-2 text-xs font-bold text-white transition hover:bg-indigo-500"
              >
                Start a new interview
              </button>
            </section>
          ) : (
            <section className="space-y-6 rounded-xl border border-slate-800 bg-[#161D2F] p-6" id="completed-report-view">
              <div className="space-y-2 text-center">
                <Trophy className="mx-auto h-8 w-8 text-amber-400" aria-hidden="true" />
                <h2 className="text-lg font-bold text-white">Interview complete</h2>
                <p className="text-xs text-slate-400">Here is how your answers were scored.</p>
                {xpEarned > 0 && <p className="font-mono text-xs font-bold text-cyan-300">+{xpEarned} XP</p>}
              </div>

              <div className="grid grid-cols-1 gap-4 border-y border-slate-800 py-4 md:grid-cols-2">
                <div className="rounded-xl bg-slate-900 p-4 text-center">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Overall score</p>
                  <div className="mb-2 font-mono text-5xl font-bold text-white">{overallScore !== null ? `${overallScore}%` : '--'}</div>
                  {overallScore !== null && (
                    <span
                      className={`rounded border px-2 py-0.5 font-mono text-xs font-semibold ${
                        overallScore >= 60 ? 'border-cyan-500/20 bg-cyan-900/30 text-cyan-300' : 'border-amber-500/20 bg-amber-900/30 text-amber-300'
                      }`}
                    >
                      {overallScore >= 60 ? 'Strong performance' : 'Needs more practice'}
                    </span>
                  )}
                </div>

                <div className="flex flex-col justify-center rounded-xl bg-slate-900 p-4">
                  <p className="mb-1 text-xs font-semibold text-indigo-400">Summary</p>
                  <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-slate-300">
                    {session.overallFeedback || 'No summary was provided.'}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Answer scorecard</h3>
                {session.questions.map((question, index) => (
                  <div key={index} className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs">
                    <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-1 text-[11px] font-semibold">
                      <span className="text-slate-300">
                        Q{index + 1}: {question}
                      </span>
                      <span className="shrink-0 font-mono text-indigo-400">
                        {typeof session.scores[index] === 'number' ? `${session.scores[index]}/100` : '--'}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-[11px] text-slate-300">
                      <strong>Your answer:</strong> {session.answers[index] ?? '(not answered)'}
                    </p>
                    {session.feedback[index] && (
                      <p className="whitespace-pre-wrap rounded bg-cyan-950/20 p-2 font-mono text-[11px] leading-normal text-cyan-400">
                        <strong>Feedback:</strong> {session.feedback[index]}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={resetSession}
                className="w-full cursor-pointer rounded-lg bg-slate-800 py-2 text-xs font-bold text-slate-200 transition hover:bg-slate-700"
              >
                Start another interview
              </button>
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <div className="space-y-3 rounded-xl border border-slate-800 bg-[#161D2F] p-4 text-xs" id="interviewer-insiders">
            <span className="block text-[10px] font-bold uppercase text-indigo-400">Answering tips</span>
            <p className="text-[11px] leading-relaxed text-slate-300">
              Structure behavioral answers with the <strong>STAR</strong> method:
            </p>
            <ul className="space-y-2 border-l-2 border-slate-800 pl-2 font-mono text-[11px] text-slate-400">
              <li>
                <strong>S</strong>ituation: the context
              </li>
              <li>
                <strong>T</strong>ask: the goal or challenge
              </li>
              <li>
                <strong>A</strong>ction: what you specifically did
              </li>
              <li>
                <strong>R</strong>esult: measurable outcomes
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
