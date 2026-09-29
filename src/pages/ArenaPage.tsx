/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Code } from 'lucide-react';
import { ProblemList } from '../components/arena/ProblemList';
import { ProblemWorkspace } from '../components/arena/ProblemWorkspace';
import { LoadingBlock } from '../components/StatusMessages';
import { useAppData } from '../context/AppDataContext';
import { useAuth, useRequiredUser } from '../context/AuthContext';
import { api } from '../services/api';
import { LANGUAGES, type Language, type LanguageMap, type Problem, type Submission, type User } from '../types';
import { readSessionJSON, readSessionString, writeSessionJSON, writeSessionString } from '../utils/storage';

const LANGUAGE_KEY = 'placify.arena.language';

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
  const { problems, problemsLoading, problemsError, reloadProblems, refreshAnalytics } = useAppData();
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

  let workspace: React.ReactNode;
  if (selectedProblem) {
    workspace = (
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
  } else if (problemId && problemsLoading) {
    workspace = <LoadingBlock label="Loading problem..." className="xl:col-span-9" />;
  } else {
    const notFound = Boolean(problemId) && !problemsLoading;
    workspace = (
      <div
        className="flex min-h-[450px] flex-col items-center justify-center rounded-2xl border border-white/5 bg-[#0a101f]/60 p-12 backdrop-blur-md xl:col-span-9"
        id="empty-state-arena"
      >
        <div className="glow-cyan mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-400">
          <Code className="h-6 w-6" aria-hidden="true" />
        </div>
        {notFound ? (
          <>
            <h2 className="mb-1 text-sm font-bold text-white">Problem not found</h2>
            <p className="max-w-sm text-center text-xs leading-relaxed text-zinc-400">
              {problemsError
                ? `The problem list could not be loaded: ${problemsError}`
                : 'This problem does not exist or was removed. Pick another one from the list.'}
            </p>
            <Link to="/arena" className="mt-4 text-xs font-bold text-cyan-300 hover:underline">
              Back to the Arena
            </Link>
          </>
        ) : (
          <>
            <h2 className="mb-1 text-sm font-bold text-white">Choose a problem</h2>
            <p className="max-w-sm text-center text-xs leading-relaxed text-zinc-400">
              Select a problem from the list to open the editor.
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="grid min-h-[650px] grid-cols-1 gap-6 xl:grid-cols-12" id="coding-arena-layout">
      <ProblemList
        problems={problems}
        selectedId={selectedProblem?.id ?? null}
        solvedIds={solvedIds}
        userXp={user.xp}
        loading={problemsLoading}
        error={problemsError}
        onRetry={() => void reloadProblems()}
        onSelect={(id) => navigate(`/arena/${encodeURIComponent(id)}`)}
      />
      {workspace}
    </div>
  );
}
