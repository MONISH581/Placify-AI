import { useState } from 'react';
import { Code, Copy, Loader2, Play, RotateCcw, Send } from 'lucide-react';
import { api, describeApiError } from '../../services/api';
import { LANGUAGES, type Language, type Problem, type RunResponse, type Submission, type SubmitResponse, type User } from '../../types';
import { ProblemDetails } from './ProblemDetails';
import { ExecutionResult, type Execution } from './ExecutionResult';
import { statusTextClass } from './difficulty';

const SUBMIT_TIMEOUT_MS = 45_000;
const MAX_CODE_CHARS = 50_000;

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
 * Editor + judge panel for one problem. Rendered with key={problem.id} so hint/result state resets per problem,
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

  const acceptedNow = execution?.kind === 'submit' && execution.data.submission.status === 'Accepted';

  const execute = async (isSubmission: boolean) => {
    if (running) return;
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

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 xl:col-span-9" id="editor-grid">
      <ProblemDetails problem={problem} solved={solved || acceptedNow} />

      <div className="flex flex-col overflow-hidden rounded-xl border border-slate-800 bg-[#161D2F] lg:col-span-6" id="right-ide-editor">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-black/40 p-3" id="ide-config">
          <div className="flex items-center gap-2">
            <Code className="h-4 w-4 text-cyan-400" aria-hidden="true" />
            <span className="font-mono text-xs font-bold uppercase tracking-tight text-white">Editor</span>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="language-select" className="sr-only">
              Language
            </label>
            <select
              id="language-select"
              value={language}
              onChange={(event) => onLanguageChange(event.target.value as Language)}
              disabled={running !== null}
              className="rounded-lg border border-slate-800 bg-black px-2 py-1 text-[11px] text-white outline-none focus:border-cyan-400"
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
              className="cursor-pointer rounded-lg bg-slate-800 p-1 text-slate-300 transition hover:bg-slate-700"
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
              className="cursor-pointer rounded-lg bg-slate-800 p-1 text-slate-300 transition hover:bg-slate-700"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            {copied && <span className="font-mono text-[9px] text-cyan-300">Copied</span>}
          </div>
        </div>

        <div className="relative h-[400px] flex-1" id="custom-textarea-container">
          <label htmlFor="ide-textarea" className="sr-only">
            Code editor
          </label>
          <textarea
            id="ide-textarea"
            value={code}
            onChange={(event) => onCodeChange(event.target.value)}
            className="h-full w-full resize-none border-b border-slate-800 bg-[#0F172A] p-4 font-mono text-xs leading-relaxed text-cyan-300 outline-none"
            placeholder="// Write your solution here"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
          />
        </div>

        <div className="flex flex-col gap-3 bg-slate-950 p-4" id="actions-console">
          <div className="flex items-center gap-2" id="action-buttons-layout">
            <button
              type="button"
              onClick={() => void execute(false)}
              disabled={running !== null}
              id="run-code-btn"
              className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {running === 'run' ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Play className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />}
              {running === 'run' ? 'Running...' : 'Run visible tests'}
            </button>
            <button
              type="button"
              onClick={() => void execute(true)}
              disabled={running !== null}
              id="submit-code-btn"
              className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 py-2 text-xs font-black text-white shadow-lg shadow-cyan-500/10 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {running === 'submit' ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Send className="h-3.5 w-3.5" aria-hidden="true" />}
              {running === 'submit' ? 'Judging...' : 'Submit'}
            </button>
          </div>

          {execution && <ExecutionResult execution={execution} />}

          <div className="space-y-1.5 border-t border-white/5 pt-2" id="past-submissions">
            <span className="font-mono text-[8px] font-bold uppercase tracking-wider text-zinc-500">Your submissions for this problem</span>
            {submissionsError ? (
              <p className="flex items-center justify-between gap-2 font-mono text-[10px] text-rose-300">
                <span>Could not load submissions: {submissionsError}</span>
                <button type="button" onClick={onRetrySubmissions} className="cursor-pointer underline">
                  Retry
                </button>
              </p>
            ) : submissionsLoading && problemSubmissions.length === 0 ? (
              <p className="font-mono text-[10px] text-zinc-500">Loading...</p>
            ) : problemSubmissions.length === 0 ? (
              <p className="font-mono text-[10px] text-zinc-500">No submissions yet.</p>
            ) : (
              <ul className="no-scrollbar max-h-[100px] space-y-1.5 overflow-y-auto pr-1">
                {problemSubmissions.map((submission) => (
                  <li
                    key={submission.id}
                    className="flex items-center justify-between rounded-lg border border-white/5 bg-black/30 px-3 py-1.5 text-[10px]"
                  >
                    <span className="font-mono text-[9px] text-zinc-500">{new Date(submission.submittedAt).toLocaleString()}</span>
                    <span className="font-mono text-[9px] uppercase text-zinc-300">{submission.language}</span>
                    <span className={`font-mono font-bold ${statusTextClass(submission.status)}`}>{submission.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
