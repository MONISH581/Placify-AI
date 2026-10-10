/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Code, Maximize2, Minimize2 } from 'lucide-react';
import { ProblemList } from '../components/arena/ProblemList';
import { ProblemWorkspace } from '../components/arena/ProblemWorkspace';
import { QuickStart, type QuickStartItem } from '../components/arena/QuickStart';
import { LoadingBlock } from '../components/StatusMessages';
import { useAppData } from '../context/AppDataContext';
import { useAuth, useRequiredUser } from '../context/AuthContext';
import { api } from '../services/api';
import { LANGUAGES, type Language, type LanguageMap, type Problem, type Submission, type User } from '../types';
import { readSessionJSON, readSessionString, writeSessionJSON, writeSessionString } from '../utils/storage';
import { CheckSquare as HeroCheckSquare, Target as HeroTarget, Flame as HeroFlame, Code2 as HeroCode2 } from 'lucide-react';
import { PageHero } from '../components/PageHero';

const LANGUAGE_KEY = 'placify.arena.language';
const LAST_PROBLEM_KEY = 'placify.arena.lastProblem';
const FOCUS_KEY = 'placify.arena.focus';

/** Neutral templates used only when a problem has no starter code for a language. */
const FALLBACK_TEMPLATES: LanguageMap = {
  javascript: 'function solve(input) {\n  // Parse the input and return the answer as a string.\n  return "";\n}\n',
  python: 'def solve(input_str):\n    # Parse the input and return the answer as a string.\n    return ""\n',
  java: 'public class Solution {\n    public static String solve(String input) {\n        // Parse the input and return the answer as a string.\n        return "";\n    }\n}\n',
  cpp: '#include <string>\nusing namespace std;\n\nstring solve(string input) {\n    // Parse the input and return the answer as a string.\n    return "";\n}\n',
  c: '#include <stdlib.h>\n\nchar* solve(char* input) {\n    /* Parse the input and return the answer as a string. */\n    return "";\n}\n',
};

function isLanguage(value: string | null): value is Language {
  return LANGUAGES.some((language) => language.id === value);
}

function starterCodeFor(problem: Problem, language: Language): string {
  const starter = problem.starterCode?.[language];
  return typeof starter === 'string' && starter.trim() ? starter : FALLBACK_TEMPLATES[language];
}

export default function ArenaPage() {
  const user = useRequiredUser();
  const { updateUser } = useAuth();
  const { problems, problemsLoading, problemsError, reloadProblems, refreshAnalytics, analytics } = useAppData();
  const { problemId } = useParams<{ problemId: string }>();
  const navigate = useNavigate();

  const selectedProblem = problemId ? problems.find((problem) => problem.id === problemId) ?? null : null;
  const solvedIds = user.problemsSolved ?? [];

  // Language preference (per tab session).
  const [language, setLanguage] = useState<Language>(() => {
    const stored = readSessionString(LANGUAGE_KEY);
    return isLanguage(stored) ? stored : 'javascript';
  });
  useEffect(() => writeSessionString(LANGUAGE_KEY, language), [language]);

  // Code buffers keyed by `${problemId}:${language}`, persisted per user in sessionStorage.
  const buffersKey = `placify.arena.buffers.${user.id}`;
  const [buffers, setBuffers] = useState<Record<string, string>>(() => readSessionJSON<Record<string, string>>(buffersKey, {}));
  useEffect(() => writeSessionJSON(buffersKey, buffers), [buffersKey, buffers]);

  const bufferKey = selectedProblem ? `${selectedProblem.id}:${language}` : null;
  const code = selectedProblem && bufferKey ? buffers[bufferKey] ?? starterCodeFor(selectedProblem, language) : '';

  const setCode = (value: string) => {
    if (!bufferKey) return;
    setBuffers((prev) => ({ ...prev, [bufferKey]: value }));
  };

  const resetCode = () => {
    if (!bufferKey) return;
    setBuffers((prev) => {
      const next = { ...prev };
      delete next[bufferKey];
      return next;
    });
  };

  // Submission history: fetched once, refreshed after each judged submission (not on language/problem switch).
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(true);
  const [submissionsError, setSubmissionsError] = useState<string | null>(null);
  const submissionsRequest = useRef(0);

  const loadSubmissions = useCallback(async () => {
    const requestId = ++submissionsRequest.current;
    setSubmissionsLoading(true);
    setSubmissionsError(null);
    try {
      const result = await api.get<Submission[]>('/api/submissions');
      if (requestId !== submissionsRequest.current) return;
      if (result.ok && Array.isArray(result.data)) setSubmissions(result.data);
      else setSubmissionsError(result.ok ? 'Unexpected response format.' : result.error);
    } finally {
      if (requestId === submissionsRequest.current) setSubmissionsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSubmissions();
  }, [loadSubmissions, user.id]);

  const handleSubmitted = (nextUser: User) => {
    updateUser(nextUser);
    void loadSubmissions();
    void refreshAnalytics();
  };

  // Remember the last opened problem so the list screen can offer "Continue".
  const selectedId = selectedProblem?.id;
  useEffect(() => {
    if (selectedId) writeSessionString(LAST_PROBLEM_KEY, selectedId);
  }, [selectedId]);

  // Back on the list screen: pull fresh recommendations so they reflect what was just solved.
  useEffect(() => {
    if (!problemId) void refreshAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemId]);

  // Focus mode hides the sidebar (see html[data-focus] rules in index.css) so problem and editor fill the screen.
  const [focus, setFocus] = useState(() => readSessionString(FOCUS_KEY) === '1');
  const solving = Boolean(problemId);
  useEffect(() => {
    writeSessionString(FOCUS_KEY, focus ? '1' : '0');
    if (solving && focus) document.documentElement.dataset.focus = 'true';
    else delete document.documentElement.dataset.focus;
    return () => {
      delete document.documentElement.dataset.focus;
    };
  }, [focus, solving]);

  const openProblem = (id: string) => navigate(`/arena/${encodeURIComponent(id)}`);

  // ---- Solve screen: no banner, no list ----
  if (problemId) {
    const index = selectedProblem ? problems.findIndex((problem) => problem.id === selectedProblem.id) : -1;
    const prev = index > 0 ? problems[index - 1] : null;
    const next = index >= 0 && index < problems.length - 1 ? problems[index + 1] : null;
    const arrowClass =
      'flex h-8 w-8 cursor-pointer items-center justify-center rounded-md bg-slate-900 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40';

    let body: React.ReactNode;
    if (selectedProblem) {
      body = (
        <ProblemWorkspace
          key={selectedProblem.id}
          problem={selectedProblem}
          language={language}
          onLanguageChange={setLanguage}
          code={code}
          onCodeChange={setCode}
          onResetCode={resetCode}
          solved={solvedIds.includes(selectedProblem.id)}
          submissions={submissions}
          submissionsLoading={submissionsLoading}
          submissionsError={submissionsError}
          onRetrySubmissions={() => void loadSubmissions()}
          onSubmitted={handleSubmitted}
        />
      );
    } else if (problemsLoading) {
      body = <LoadingBlock label="Loading problem..." />;
    } else {
      body = (
        <div className="flex min-h-[450px] flex-col items-center justify-center rounded-lg bg-card p-12" id="empty-state-arena">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-400">
            <Code className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 className="mb-1 text-sm font-bold text-white">Problem not found</h2>
          <p className="max-w-sm text-center text-xs leading-relaxed text-zinc-400">
            {problemsError
              ? `The problem list could not be loaded: ${problemsError}`
              : 'This problem does not exist or was removed. Pick another one from the list.'}
          </p>
          <Link to="/arena" className="mt-4 text-xs font-bold text-cyan-300 hover:underline">
            Back to all problems
          </Link>
        </div>
      );
    }

    return (
      <div id="coding-arena-solve">
        <div className="mb-3 flex items-center justify-between gap-3">
          <Link to="/arena" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-300 transition-colors hover:text-white">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            All problems
          </Link>
          <div className="flex items-center gap-1.5">
            {index >= 0 && (
              <span className="mr-1 font-mono text-[11px] text-slate-500">
                {index + 1} / {problems.length}
              </span>
            )}
            <button type="button" className={arrowClass} disabled={!prev} onClick={() => prev && openProblem(prev.id)} aria-label="Previous problem" title={prev ? `Previous: ${prev.title}` : undefined}>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button type="button" className={arrowClass} disabled={!next} onClick={() => next && openProblem(next.id)} aria-label="Next problem" title={next ? `Next: ${next.title}` : undefined}>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              className={`${arrowClass} hidden lg:flex`}
              onClick={() => setFocus((value) => !value)}
              aria-pressed={focus}
              aria-label={focus ? 'Exit focus mode' : 'Enter focus mode'}
              title={focus ? 'Exit focus mode' : 'Focus mode: hide the sidebar'}
            >
              {focus ? <Minimize2 className="h-4 w-4" aria-hidden="true" /> : <Maximize2 className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
        </div>
        {body}
      </div>
    );
  }

  // ---- List screen: banner, quick start and the full-width table ----
  const solvedSet = new Set(solvedIds);
  const unsolved = problems.filter((problem) => !solvedSet.has(problem.id));

  const lastId = readSessionString(LAST_PROBLEM_KEY);
  const last = lastId ? unsolved.find((problem) => problem.id === lastId) : undefined;

  // Recommended: the first server recommendation you have not solved yet. If the server has none left (or is
  // unavailable), fall back to the next unsolved problem at a difficulty that matches how many you have solved.
  const fromServer = (analytics?.recommendations ?? [])
    .map((rec) => unsolved.find((problem) => problem.id === rec.id))
    .find((problem) => problem !== undefined);
  const targetDifficulty = solvedIds.length < 6 ? 'Easy' : solvedIds.length < 18 ? 'Medium' : 'Hard';
  const recommended = fromServer ?? unsolved.find((problem) => problem.difficulty === targetDifficulty) ?? unsolved[0];

  // Daily problem: rotates with the date, skips what you already solved and never repeats the other two cards.
  const dayNumber = Math.floor(Date.now() / 86_400_000);
  const exclude = new Set([last?.id, recommended?.id]);
  let daily: Problem | undefined;
  for (let offset = 0; offset < problems.length && !daily; offset += 1) {
    const candidate = problems[(dayNumber + offset) % problems.length];
    if (!solvedSet.has(candidate.id) && !exclude.has(candidate.id)) daily = candidate;
  }

  const quickStart: QuickStartItem[] = [];
  const taken = new Set<string>();
  for (const [label, problem] of [
    ['Continue', last],
    ['Recommended', recommended],
    ['Daily problem', daily],
  ] as const) {
    if (problem && !taken.has(problem.id)) {
      taken.add(problem.id);
      quickStart.push({ label, problem });
    }
  }

  return (
    <>
      <PageHero
        titleId="arena-heading"
        eyebrow="Practice"
        title="Coding Arena"
        subtitle="Solve problems against a real judge, run them in your language of choice and get AI feedback on your code."
        tags={['Real judge', `${LANGUAGES.length} languages`, 'AI code review']}
        stats={[
          { icon: HeroCheckSquare, value: `${solvedIds.length}/${problems.length}`, label: 'problems solved' },
          { icon: HeroTarget, value: `${user.accuracy}%`, label: 'accuracy' },
          { icon: HeroFlame, value: `${user.streak}`, label: user.streak === 1 ? 'day streak' : 'days streak' },
        ]}
        progress={{ value: solvedIds.length, max: Math.max(problems.length, 1), label: 'Problem bank solved' }}
      />
      <QuickStart items={quickStart} onOpen={openProblem} />
      <ProblemList
        problems={problems}
        solvedIds={solvedIds}
        userXp={user.xp}
        loading={problemsLoading}
        error={problemsError}
        onRetry={() => void reloadProblems()}
        onSelect={openProblem}
      />
    </>
  );
}
