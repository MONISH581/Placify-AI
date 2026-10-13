import { useState } from 'react';
import { Copy, Loader2, Play, RotateCcw, Send } from 'lucide-react';
import { api, describeApiError } from '../../services/api';
import { LANGUAGES, type Language, type Problem, type RunResponse, type Submission, type SubmitResponse, type User } from '../../types';
import { ProblemDetails } from './ProblemDetails';
import { ExecutionResult, type Execution } from './ExecutionResult';
import { statusTextClass } from './difficulty';

const SUBMIT_TIMEOUT_MS = 45_000;
const MAX_CODE_CHARS = 50_000;

type ConsoleTab = 'result' | 'submissions';

interface ProblemWorkspaceProps {
  problem: Problem;
  language: Language;
  onLanguageChange: (language: Language) => void;
  code: string;
  onCodeChange: (code: string) => void;
  onResetCode: () => void;
  solved: boolean;
  submissions: Submission[];
  submissionsLoading: boolean;
  submissionsError: string | null;
  onRetrySubmissions: () => void;
  /** Called with the authoritative server response after a judged submission. */
  onSubmitted: (user: User) => void;
}

/**
 * Solve screen body: problem on the left, editor on the right with Run/Submit in its header and a console
 * (results, submissions) underneath. Rendered with key={problem.id} so hint/result state resets per problem,
 * while switching language keeps hints, results and submission history intact.
 */
export function ProblemWorkspace({
  problem,
  language,
  onLanguageChange,
  code,
  onCodeChange,
  onResetCode,
  solved,
  submissions,
  submissionsLoading,
  submissionsError,
  onRetrySubmissions,
  onSubmitted,
}: ProblemWorkspaceProps) {
  const [running, setRunning] = useState<'run' | 'submit' | null>(null);
  const [execution, setExecution] = useState<Execution | null>(null);
  const [copied, setCopied] = useState(false);
  const [consoleTab, setConsoleTab] = useState<ConsoleTab>('result');

  const acceptedNow = execution?.kind === 'submit' && execution.data.submission.status === 'Accepted';

  const execute = async (isSubmission: boolean) => {
    if (running) return;
    setConsoleTab('result');
    if (!code.trim()) {
      setExecution({ kind: 'error', message: 'Write some code before running it.' });
      return;
    }
    if (code.length > MAX_CODE_CHARS) {
      setExecution({ kind: 'error', message: `Code is too long (max ${MAX_CODE_CHARS.toLocaleString()} characters).` });
      return;
    }
    setRunning(isSubmission ? 'submit' : 'run');
    setExecution(null);
    try {
      const result = await api.post<RunResponse | SubmitResponse>(
        `/api/problems/${encodeURIComponent(problem.id)}/submit`,
        { language, code, isSubmission },
        { timeoutMs: SUBMIT_TIMEOUT_MS },
      );

      if (!result.ok) {
        const runnerUnavailable = result.status === 503;
        setExecution({
          kind: 'error',
          runnerUnavailable,
          message: runnerUnavailable
            ? `${result.error} The server has no code runner configured for ${language}. Try another language or ask an admin to configure CODE_RUNNER / Judge0.`
            : describeApiError(result),
        });
        return;
      }

      if (isSubmission) {
        const data = result.data as SubmitResponse;
        if (!data?.submission) {
          setExecution({ kind: 'error', message: 'The judge returned an unexpected response.' });
          return;
        }
        setExecution({ kind: 'submit', data: { ...data, xpEarned: Number(data.xpEarned) || 0, firstSolve: Boolean(data.firstSolve) } });
        if (data.user) onSubmitted(data.user);
      } else {
        const data = result.data as RunResponse;
        setExecution({ kind: 'run', data: { ...data, results: Array.isArray(data?.results) ? data.results : [] } });
      }
    } finally {
      setRunning(null);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable; ignore.
    }
  };

  const problemSubmissions = submissions.filter((submission) => submission.problemId === problem.id);

  const consoleTabs: Array<{ id: ConsoleTab; label: string }> = [
    { id: 'result', label: 'Result' },
    { id: 'submissions', label: `Submissions (${problemSubmissions.length})` },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 lg:h-[calc(100vh-10.5rem)] lg:min-h-[34rem] lg:grid-cols-[2fr_3fr]" id="editor-grid">
      <ProblemDetails problem={problem} solved={solved || acceptedNow} />

      <div className="flex min-h-[34rem] min-w-0 flex-col overflow-hidden rounded-md bg-slate-900 lg:min-h-0" id="right-ide-editor">
        <div className="flex flex-wrap items-center justify-between gap-2 p-3" id="ide-config">
          <div className="flex items-center gap-2">
            <label htmlFor="language-select" className="sr-only">
              Language
            </label>
            <select
              id="language-select"
              value={language}
              onChange={(event) => onLanguageChange(event.target.value as Language)}
              disabled={running !== null}
              className="h-8 rounded-md bg-slate-950 px-2 text-xs text-white outline-none focus:ring-1 focus:ring-cyan-400"
            >
              {LANGUAGES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void copyCode()}
              title="Copy code"
              aria-label="Copy code"
              className="cursor-pointer rounded-md bg-slate-800 p-2 text-slate-300 transition-colors hover:bg-slate-700"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Reset the editor to the starter code? Your changes for this language will be lost.')) onResetCode();
              }}
              title="Reset to starter code"
              aria-label="Reset to starter code"
              className="cursor-pointer rounded-md bg-slate-800 p-2 text-slate-300 transition-colors hover:bg-slate-700"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            {copied && <span className="font-mono text-[11px] text-cyan-400">Copied</span>}
          </div>

          <div className="flex items-center gap-2" id="action-buttons-layout">
            <button
              type="button"
              onClick={() => void execute(false)}
              disabled={running !== null}
              id="run-code-btn"
              className="flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-slate-800 px-3 text-xs font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {running === 'run' ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Play className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />}
              {running === 'run' ? 'Running...' : 'Run'}
            </button>
            <button
              type="button"
              onClick={() => void execute(true)}
              disabled={running !== null}
              id="submit-code-btn"
              className="flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-cyan-400 px-3 text-xs font-semibold text-black transition-colors hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {running === 'submit' ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Send className="h-3.5 w-3.5" aria-hidden="true" />}
              {running === 'submit' ? 'Judging...' : 'Submit'}
            </button>
          </div>
        </div>

        <div className="relative min-h-[14rem] flex-1" id="custom-textarea-container">
          <label htmlFor="ide-textarea" className="sr-only">
            Code editor
          </label>
          <textarea
            id="ide-textarea"
            value={code}
            onChange={(event) => onCodeChange(event.target.value)}
            className="h-full w-full resize-none bg-slate-950 p-4 font-mono text-[13px] leading-relaxed text-cyan-300 outline-none"
            placeholder="// Write your solution here"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
          />
        </div>

        <div className="flex h-56 shrink-0 flex-col border-t border-slate-800" id="actions-console">
          <div className="flex gap-4 px-4 pt-2" role="tablist" aria-label="Console">
            {consoleTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={consoleTab === tab.id}
                onClick={() => setConsoleTab(tab.id)}
                className={`cursor-pointer border-b-2 pb-1.5 font-mono text-[11px] font-semibold uppercase tracking-widest transition-colors ${
                  consoleTab === tab.id ? 'border-cyan-400 text-white' : 'border-transparent text-slate-500 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {consoleTab === 'result' &&
              (execution ? (
                <ExecutionResult execution={execution} />
              ) : (
                <p className="text-xs text-slate-400">Run your code to see test results here. Submit to have it judged against all tests.</p>
              ))}

            {consoleTab === 'submissions' && (
              <div id="past-submissions">
                {submissionsError ? (
                  <p className="flex items-center justify-between gap-2 font-mono text-[11px] text-rose-400">
                    <span>Could not load submissions: {submissionsError}</span>
                    <button type="button" onClick={onRetrySubmissions} className="cursor-pointer underline">
                      Retry
                    </button>
                  </p>
                ) : submissionsLoading && problemSubmissions.length === 0 ? (
                  <p className="text-xs text-slate-400">Loading...</p>
                ) : problemSubmissions.length === 0 ? (
                  <p className="text-xs text-slate-400">No submissions yet.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {problemSubmissions.map((submission) => (
                      <li
                        key={submission.id}
                        className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 rounded-md bg-slate-900 px-3 py-1.5 text-[11px]"
                      >
                        <span className="font-mono text-slate-400">{new Date(submission.submittedAt).toLocaleString()}</span>
                        <span className="font-mono uppercase text-slate-300">{submission.language}</span>
                        <span className={`font-mono font-bold ${statusTextClass(submission.status)}`}>{submission.status}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
