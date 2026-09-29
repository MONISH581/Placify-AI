import { AlertTriangle, CheckCircle2, ServerOff, Sparkles, XCircle } from 'lucide-react';
import { LazyMarkdown } from '../LazyMarkdown';
import type { RunResponse, SubmitResponse } from '../../types';
import { statusTextClass } from './difficulty';

export type Execution =
  | { kind: 'run'; data: RunResponse }
  | { kind: 'submit'; data: SubmitResponse }
  | { kind: 'error'; message: string; runnerUnavailable?: boolean };

function RunResults({ data }: { data: RunResponse }) {
  const results = data.results ?? [];
  const passed = results.filter((result) => result.passed).length;
  const allPassed = results.length > 0 && passed === results.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-zinc-500">Run · visible test cases</span>
        <span className={`flex items-center gap-1.5 font-mono font-bold ${allPassed ? 'text-emerald-400' : 'text-rose-400'}`}>
          {allPassed ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <XCircle className="h-4 w-4" aria-hidden="true" />}
          {data.status && data.status !== 'Accepted' && results.length === 0 ? data.status : `${passed}/${results.length} passed`}
        </span>
      </div>

      {data.errorMessage && (
        <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border border-rose-500/10 bg-rose-950/20 p-2.5 font-mono text-[10px] leading-normal text-rose-300">
          {data.errorMessage}
        </pre>
      )}

      {results.length > 0 && (
        <div className="max-h-64 overflow-auto rounded-lg border border-white/5">
          <table className="w-full border-collapse text-left font-mono text-[10px]">
            <caption className="sr-only">Results for visible test cases</caption>
            <thead className="sticky top-0 bg-slate-900 text-zinc-400">
              <tr>
                <th scope="col" className="px-2 py-1.5">#</th>
                <th scope="col" className="px-2 py-1.5">Input</th>
                <th scope="col" className="px-2 py-1.5">Expected</th>
                <th scope="col" className="px-2 py-1.5">Actual</th>
                <th scope="col" className="px-2 py-1.5">Result</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result, index) => (
                <tr key={index} className="border-t border-white/5 align-top">
                  <td className="px-2 py-1.5 text-zinc-500">{index + 1}</td>
                  <td className="px-2 py-1.5">
                    <pre className="whitespace-pre-wrap break-all text-zinc-300">{result.input}</pre>
                  </td>
                  <td className="px-2 py-1.5">
                    <pre className="whitespace-pre-wrap break-all text-zinc-300">{result.expected}</pre>
                  </td>
                  <td className="px-2 py-1.5">
                    <pre className={`whitespace-pre-wrap break-all ${result.passed ? 'text-zinc-300' : 'text-rose-300'}`}>{result.actual}</pre>
                  </td>
                  <td className={`px-2 py-1.5 font-bold ${result.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {result.passed ? 'Passed' : 'Failed'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="font-mono text-[9px] text-zinc-500">Run checks visible tests only and never awards XP. Submit to be judged on all tests.</p>
    </div>
  );
}

function SubmitResults({ data }: { data: SubmitResponse }) {
  const { submission, xpEarned, firstSolve } = data;
  const accepted = submission.status === 'Accepted';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-zinc-500">Submission verdict</span>
        <span className={`flex items-center gap-1.5 font-mono font-bold ${statusTextClass(submission.status)}`}>
          {accepted ? <Sparkles className="h-4 w-4" aria-hidden="true" /> : <XCircle className="h-4 w-4" aria-hidden="true" />}
          {submission.status}
          {xpEarned > 0 && <span className="text-cyan-300">(+{xpEarned} XP)</span>}
        </span>
      </div>

      {typeof data.passedCount === 'number' && typeof data.totalCount === 'number' && (
        <p className="font-mono text-[10px] text-zinc-400">
          Passed {data.passedCount}/{data.totalCount} test cases
        </p>
      )}

      {accepted && (
        <p className="font-mono text-[10px] text-zinc-400">
          {firstSolve ? 'First solve! The editorial is now unlocked.' : 'Already solved before, so no additional XP was awarded.'}
        </p>
      )}

      {(submission.timeComplexity || submission.memoryUsage) && (
        <div className="grid grid-cols-2 gap-2 border-y border-white/5 py-2 font-mono text-[10px]">
          {submission.timeComplexity && (
            <div>
              <p className="text-zinc-500">Time complexity (estimate):</p>
              <p className="font-bold text-white">{submission.timeComplexity}</p>
            </div>
          )}
          {submission.memoryUsage && (
            <div>
              <p className="text-zinc-500">Memory:</p>
              <p className="font-bold text-white">{submission.memoryUsage}</p>
            </div>
          )}
        </div>
      )}

      {submission.errorMessage && (
        <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border border-rose-500/10 bg-rose-950/20 p-2.5 font-mono text-[10px] leading-normal text-rose-300">
          {submission.errorMessage}
        </pre>
      )}

      {submission.aiReview && (
        <div className="rounded-lg border border-cyan-500/15 bg-cyan-500/5 p-3 text-[11px] leading-normal text-zinc-300" id="ai-reviewer-feedback">
          <span className="mb-1 block font-mono text-[8px] font-bold text-cyan-400">AI CODE REVIEW</span>
          <LazyMarkdown>{submission.aiReview}</LazyMarkdown>
        </div>
      )}
    </div>
  );
}

export function ExecutionResult({ execution }: { execution: Execution }) {
  return (
    <div
      className="mt-1 space-y-2 rounded-xl border border-white/10 bg-black/40 p-4 text-xs shadow-inner"
      id="sandbox-result-card"
      role="status"
      aria-live="polite"
    >
      {execution.kind === 'run' && <RunResults data={execution.data} />}
      {execution.kind === 'submit' && <SubmitResults data={execution.data} />}
      {execution.kind === 'error' && (
        <div className="flex items-start gap-2 text-rose-300">
          {execution.runnerUnavailable ? (
            <ServerOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <div className="space-y-1">
            <p className={`font-bold ${execution.runnerUnavailable ? 'text-amber-300' : ''}`}>
              {execution.runnerUnavailable ? 'Code runner unavailable' : 'Could not run your code'}
            </p>
            <p className="font-mono text-[10px] leading-normal">{execution.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
