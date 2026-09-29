/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { AlertCircle, CheckCircle, FileText, ListTodo, Loader2, Sparkles } from 'lucide-react';
import { ErrorAlert } from '../components/StatusMessages';
import { api, describeApiError } from '../services/api';
import type { ResumeAnalysis } from '../types';

const MAX_RESUME_CHARS = 20_000;
const MAX_ROLE_CHARS = 100;

/** Fictional sample resume (no real personal data). */
const SAMPLE_RESUME = `Jordan Sample
jordan.sample@example.com

Education
B.Tech in Computer Science, Example Institute of Technology (2022 - 2026), CGPA 8.4/10

Experience
Backend Engineering Intern, Example Labs (May 2025 - Aug 2025)
- Built REST APIs with Node.js and Express serving 5k daily requests
- Reduced average query latency by 30% by adding MySQL indexes
- Wrote unit tests with Jest, raising coverage from 45% to 80%

Projects
- Task tracker: React + TypeScript front end with a PostgreSQL-backed API
- Chat service: WebSocket server with Redis pub/sub

Skills
JavaScript, TypeScript, Python, Java, React, Node.js, Express, SQL, Git, Docker`;

function KeywordList({ items, tone }: { items: string[]; tone: 'good' | 'bad' }) {
  if (items.length === 0) return <p className="text-[11px] italic text-slate-500">None</p>;
  const cls =
    tone === 'good' ? 'border-emerald-500/15 bg-emerald-950/25 text-emerald-300' : 'border-red-500/15 bg-red-950/25 text-red-400';
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((keyword, index) => (
        <li key={`${keyword}-${index}`} className={`rounded-md border px-2 py-0.5 font-mono text-xs ${cls}`}>
          {keyword}
        </li>
      ))}
    </ul>
  );
}

function normalizeAnalysis(data: ResumeAnalysis): ResumeAnalysis {
  const list = (value: unknown): string[] => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []);
  return {
    atsScore: Math.max(0, Math.min(100, Math.round(Number(data.atsScore) || 0))),
    strengths: list(data.strengths),
    improvements: list(data.improvements),
    keywordsFound: list(data.keywordsFound),
    keywordsMissing: list(data.keywordsMissing),
    summary: typeof data.summary === 'string' ? data.summary : '',
    source: data.source === 'ai' ? 'ai' : 'heuristic',
  };
}

export default function ResumeAnalyzerPage() {
  const [resumeText, setResumeText] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const overLimit = resumeText.length > MAX_RESUME_CHARS;

  const handleAnalyze = async () => {
    if (isLoading) return;
    if (!resumeText.trim()) {
      setError('Paste your resume text first.');
      return;
    }
    if (overLimit) {
      setError(`Resume text is limited to ${MAX_RESUME_CHARS.toLocaleString()} characters.`);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const role = targetRole.trim();
      const result = await api.post<ResumeAnalysis>(
        '/api/resume/analyze',
        role ? { resumeText, targetRole: role } : { resumeText },
        { timeoutMs: 30_000 },
      );
      if (result.ok && result.data) {
        setAnalysis(normalizeAnalysis(result.data));
      } else {
        setError(result.ok ? 'Unexpected response from the server.' : describeApiError(result));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6" id="resume-analyzer-layout">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-6">
          <section className="rounded-xl border border-slate-800 bg-[#161D2F] p-5" id="resume-input-pane">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-400" aria-hidden="true" />
                <h1 className="text-sm font-bold uppercase tracking-wider text-white">Resume ATS check</h1>
              </div>
              <button
                type="button"
                onClick={() => setResumeText(SAMPLE_RESUME)}
                className="cursor-pointer rounded-lg bg-slate-800 px-2 py-1 text-[10px] font-semibold text-slate-300 hover:bg-slate-700"
              >
                Insert sample resume
              </button>
            </div>

            <p className="mb-4 text-xs leading-normal text-slate-400">
              Paste the plain text of your resume. We estimate how well it parses for applicant tracking systems and which
              keywords are present or missing.
            </p>

            <label htmlFor="resume-target-role" className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Target role (optional)
            </label>
            <input
              id="resume-target-role"
              value={targetRole}
              maxLength={MAX_ROLE_CHARS}
              onChange={(event) => setTargetRole(event.target.value)}
              placeholder="e.g. Software Engineer, Data Analyst"
              className="mb-3 h-9 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 text-xs text-slate-200 outline-none focus:border-indigo-500"
            />

            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="resume-textarea" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Resume text
              </label>
              <span className={`font-mono text-[10px] ${overLimit ? 'font-bold text-rose-400' : 'text-slate-500'}`}>
                {resumeText.length.toLocaleString()}/{MAX_RESUME_CHARS.toLocaleString()}
              </span>
            </div>
            <textarea
              id="resume-textarea"
              value={resumeText}
              onChange={(event) => setResumeText(event.target.value)}
              placeholder="Paste the plain-text contents of your resume here..."
              aria-invalid={overLimit}
              className={`h-[280px] w-full resize-none rounded-xl border bg-slate-900 p-3 font-sans text-xs leading-relaxed text-slate-200 outline-none ${
                overLimit ? 'border-rose-500' : 'border-slate-800 focus:border-indigo-500'
              }`}
            />

            {error && <ErrorAlert message={error} className="mt-3" />}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => void handleAnalyze()}
                disabled={isLoading || !resumeText.trim() || overLimit}
                id="analyze-resume-btn"
                className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-indigo-600 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                {isLoading ? 'Analyzing...' : 'Analyze resume'}
              </button>
            </div>
          </section>
        </div>

        <div className="space-y-4 lg:col-span-6" aria-live="polite">
          {analysis ? (
            <section className="space-y-5 rounded-xl border border-slate-800 bg-[#161D2F] p-5" id="analysis-report-box">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h2 className="font-mono text-[10px] font-bold uppercase tracking-widest text-indigo-300">Report</h2>
                <span className="rounded border border-cyan-500/20 bg-cyan-950/40 px-2.5 py-0.5 font-mono text-xs text-cyan-400">
                  {analysis.source === 'ai' ? 'AI analysis' : 'Heuristic analysis'}
                </span>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-center">
                <p className="mb-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">ATS score (estimate)</p>
                <div className="mb-1 font-mono text-3xl font-bold text-white">{analysis.atsScore}%</div>
                <div
                  className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800"
                  role="progressbar"
                  aria-valuenow={analysis.atsScore}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="ATS score"
                >
                  <div className="h-full bg-indigo-500" style={{ width: `${analysis.atsScore}%` }} />
                </div>
              </div>

              {analysis.summary && (
                <p className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 font-sans text-xs leading-relaxed text-slate-300">
                  {analysis.summary}
                </p>
              )}

              <div className="space-y-1.5">
                <h3 className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-emerald-400">
                  <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" /> Strengths
                </h3>
                {analysis.strengths.length > 0 ? (
                  <ul className="list-disc space-y-1 pl-5 text-xs text-slate-300">
                    {analysis.strengths.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] italic text-slate-500">None identified</p>
                )}
              </div>

              <div className="space-y-1.5">
                <h3 className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-indigo-400">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Suggested improvements
                </h3>
                {analysis.improvements.length > 0 ? (
                  <ul className="space-y-2 pl-2 font-sans text-xs text-slate-300">
                    {analysis.improvements.map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="shrink-0 select-none text-indigo-400" aria-hidden="true">
                          &rarr;
                        </span>
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] italic text-slate-500">No suggestions</p>
                )}
              </div>

              <div className="space-y-1.5 border-t border-slate-800 pt-3">
                <h3 className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" /> Keywords found
                </h3>
                <KeywordList items={analysis.keywordsFound} tone="good" />
              </div>

              <div className="space-y-1.5">
                <h3 className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                  <ListTodo className="h-3.5 w-3.5" aria-hidden="true" /> Keywords missing
                </h3>
                <KeywordList items={analysis.keywordsMissing} tone="bad" />
              </div>
            </section>
          ) : (
            <div
              className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-xl border border-slate-800 bg-[#161D2F] p-12 text-center"
              id="empty-state"
            >
              {isLoading ? (
                <Loader2 className="mb-2 h-10 w-10 animate-spin text-indigo-400" aria-hidden="true" />
              ) : (
                <AlertCircle className="mb-2 h-10 w-10 text-slate-700" aria-hidden="true" />
              )}
              <p className="mb-1 text-xs font-bold text-white">{isLoading ? 'Analyzing your resume...' : 'No report yet'}</p>
              <p className="max-w-xs text-xs text-slate-400">Paste your resume and run the analysis to see your report here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
