/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { CheckCircle, ListTodo, Loader2, Sparkles } from 'lucide-react';
import { ErrorAlert } from '../components/StatusMessages';
import { api, describeApiError } from '../services/api';
import type { ResumeAnalysis } from '../types';
import { FileText as HeroFileText } from 'lucide-react';
import { PageHero } from '../components/PageHero';
import { ResumeScanArt } from '../components/illustrations/ToolArt';

function SectionLabel({ children }: { children: string }) {
  return <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-slate-500">{children}</p>;
}

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
  if (items.length === 0) return <p className="text-xs italic text-slate-400">None</p>;
  const cls =
    tone === 'good' ? 'text-emerald-400' : 'text-rose-400';
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((keyword, index) => (
        <li key={`${keyword}-${index}`} className={`rounded bg-slate-900 px-2.5 py-1 font-mono text-xs ${cls}`}>
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
    <div className="space-y-8" id="resume-analyzer-layout">
      <PageHero
        titleId="resume-heading"
        eyebrow="Prepare"
        title="Resume ATS Analyzer"
        subtitle="Paste your resume and a target role to see an ATS score, matching keywords and concrete improvements."
        tags={['ATS score', 'Keywords', 'Improvements']}
        stats={[{ icon: HeroFileText, value: analysis ? `${analysis.atsScore}/100` : '--', label: 'ATS score' }]}
      />
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div>
          <section id="resume-input-pane">
            <div className="flex items-start justify-between gap-2">
              <div>
                <SectionLabel>Input</SectionLabel>
                <h2 className="mb-2 mt-1 font-heading text-xl font-bold text-white">Resume ATS check</h2>
              </div>
              <button
                type="button"
                onClick={() => setResumeText(SAMPLE_RESUME)}
                className="cursor-pointer rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
              >
                Insert sample resume
              </button>
            </div>

            <p className="mb-4 text-sm leading-normal text-slate-400">
              Paste the plain text of your resume. We estimate how well it parses for applicant tracking systems and which
              keywords are present or missing.
            </p>

            <div className="space-y-3 rounded-md bg-slate-900 p-4">
              <div>
                <label htmlFor="resume-target-role" className="mb-1 block font-mono text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                  Target role (optional)
                </label>
                <input
                  id="resume-target-role"
                  value={targetRole}
                  maxLength={MAX_ROLE_CHARS}
                  onChange={(event) => setTargetRole(event.target.value)}
                  placeholder="e.g. Software Engineer, Data Analyst"
                  className="h-10 w-full rounded-md border-0 bg-slate-950 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:ring-1 focus:ring-cyan-400"
                />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label htmlFor="resume-textarea" className="block font-mono text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                    Resume text
                  </label>
                  <span className={`font-mono text-xs ${overLimit ? 'font-bold text-rose-400' : 'text-slate-400'}`}>
                    {resumeText.length.toLocaleString()}/{MAX_RESUME_CHARS.toLocaleString()}
                  </span>
                </div>
                <textarea
                  id="resume-textarea"
                  value={resumeText}
                  onChange={(event) => setResumeText(event.target.value)}
                  placeholder="Paste the plain-text contents of your resume here..."
                  aria-invalid={overLimit}
                  className={`h-[280px] w-full resize-none rounded-md border-0 bg-slate-950 px-3 py-2 text-sm leading-relaxed text-white outline-none placeholder:text-slate-500 focus:ring-1 ${
                    overLimit ? 'ring-1 ring-rose-400 focus:ring-rose-400' : 'focus:ring-cyan-400'
                  }`}
                />
              </div>

              {error && <ErrorAlert message={error} />}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleAnalyze()}
                  disabled={isLoading || !resumeText.trim() || overLimit}
                  id="analyze-resume-btn"
                  className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md bg-cyan-400 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  {isLoading ? 'Analyzing...' : 'Analyze resume'}
                </button>
              </div>
            </div>
          </section>
        </div>

        <div aria-live="polite">
          {analysis ? (
            <section className="space-y-8" id="analysis-report-box">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <SectionLabel>Report</SectionLabel>
                  <h2 className="mt-1 font-heading text-xl font-bold text-white">ATS score (estimate)</h2>
                </div>
                <span className="rounded bg-slate-900 px-2.5 py-1 font-mono text-xs font-semibold text-cyan-400">
                  {analysis.source === 'ai' ? 'AI analysis' : 'Heuristic analysis'}
                </span>
              </div>

              <div>
                <div className="font-heading text-5xl font-bold text-white">{analysis.atsScore}%</div>
                <div
                  className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-800"
                  role="progressbar"
                  aria-valuenow={analysis.atsScore}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="ATS score"
                >
                  <div className="h-full bg-cyan-400" style={{ width: `${analysis.atsScore}%` }} />
                </div>
              </div>

              {analysis.summary && (
                <p className="rounded-md bg-slate-900 p-4 text-sm leading-relaxed text-slate-300">{analysis.summary}</p>
              )}

              <div>
                <h3 className="mb-3 flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" /> Strengths
                </h3>
                {analysis.strengths.length > 0 ? (
                  <ul className="space-y-2 text-sm text-slate-300">
                    {analysis.strengths.map((item, index) => (
                      <li key={index} className="flex items-start gap-2.5">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" aria-hidden="true" />
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs italic text-slate-400">None identified</p>
                )}
              </div>

              <div>
                <h3 className="mb-3 flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" /> Suggested improvements
                </h3>
                {analysis.improvements.length > 0 ? (
                  <ul className="space-y-2 text-sm text-slate-300">
                    {analysis.improvements.map((item, index) => (
                      <li key={index} className="flex items-start gap-2.5">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" aria-hidden="true" />
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs italic text-slate-400">No suggestions</p>
                )}
              </div>

              <div>
                <h3 className="mb-3 flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" /> Keywords found
                </h3>
                <KeywordList items={analysis.keywordsFound} tone="good" />
              </div>

              <div>
                <h3 className="mb-3 flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                  <ListTodo className="h-3.5 w-3.5 text-rose-400" aria-hidden="true" /> Keywords missing
                </h3>
                <KeywordList items={analysis.keywordsMissing} tone="bad" />
              </div>
            </section>
          ) : (
            <div className="flex min-h-[300px] flex-col items-center justify-center text-center" id="empty-state">
              <ResumeScanArt scanning={isLoading} className="mb-2 h-44 w-auto max-w-full" />
              <p className="mb-1 text-sm font-semibold text-white">{isLoading ? 'Analyzing your resume...' : 'No report yet'}</p>
              <p className="max-w-xs text-sm text-slate-400">Paste your resume and run the analysis to see your report here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
