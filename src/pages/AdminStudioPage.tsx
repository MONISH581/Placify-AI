/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Code2, LayoutDashboard, Loader2, MessageSquare, Pencil, RefreshCw, Search, Trash2, Trophy, Users } from 'lucide-react';
import { ProblemForm } from '../components/admin/ProblemForm';
import { difficultyTextClass } from '../components/arena/difficulty';
import { ErrorAlert } from '../components/StatusMessages';
import { useAppData } from '../context/AppDataContext';
import { api, describeApiError } from '../services/api';
import type { HealthStatus, Problem, ProblemInput } from '../types';
import { Settings as HeroSettings } from 'lucide-react';
import { PageHero } from '../components/PageHero';
import { ContestsAdmin } from '../components/admin/ContestsAdmin';
import { DiscussionsAdmin } from '../components/admin/DiscussionsAdmin';
import { OverviewStats } from '../components/admin/OverviewStats';
import { UsersAdmin } from '../components/admin/UsersAdmin';

type HealthState =
  | { state: 'loading' }
  | { state: 'ready'; httpStatus: number; data: HealthStatus }
  | { state: 'error'; httpStatus: number; message: string; data: HealthStatus | null };

function isHealthStatus(value: unknown): value is HealthStatus {
  return typeof value === 'object' && value !== null && typeof (value as { status?: unknown }).status === 'string';
}

function SectionLabel({ children }: { children: string }) {
  return <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-slate-500">{children}</p>;
}

function toneFor(value: string | boolean | undefined): { text: string; dot: string } {
  const up = { text: 'text-emerald-400', dot: 'bg-emerald-400' };
  const warn = { text: 'text-amber-400', dot: 'bg-amber-400' };
  const down = { text: 'text-rose-400', dot: 'bg-rose-400' };
  if (value === true) return up;
  if (value === false || value === undefined) return down;
  const normalized = value.toLowerCase();
  if (['ok', 'up', 'healthy', 'connected', 'online', 'ready', 'configured', 'gemini'].includes(normalized)) return up;
  if (['degraded', 'partial', 'disabled', 'not configured'].includes(normalized)) return warn;
  return down;
}

function HealthPanel() {
  const [health, setHealth] = useState<HealthState>({ state: 'loading' });
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  const check = useCallback(async () => {
    setHealth({ state: 'loading' });
    const result = await api.get<HealthStatus>('/api/health', { timeoutMs: 8000 });
    setCheckedAt(new Date());
    if (result.ok && isHealthStatus(result.data)) {
      setHealth({ state: 'ready', httpStatus: result.status, data: result.data });
    } else if (result.ok) {
      setHealth({ state: 'error', httpStatus: result.status, message: 'Unexpected health payload.', data: null });
    } else {
      setHealth({
        state: 'error',
        httpStatus: result.status,
        message: result.status === 0 ? `Node server unreachable: ${result.error}` : result.error,
        data: isHealthStatus(result.payload) ? result.payload : null,
      });
    }
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  const data = health.state === 'loading' ? null : health.data;
  const rows: Array<{ label: string; value: string | boolean | undefined; status?: string | boolean }> = data
    ? [
        { label: 'Overall', value: data.status },
        { label: 'Node API', value: data.node ?? (health.state === 'ready' ? 'ok' : undefined) },
        { label: 'Database', value: data.database },
        { label: 'ML service', value: data.mlService },
        ...(data.codeRunner !== undefined
          ? [
              {
                label: 'Code runner',
                value: data.codeRunnerStatus ? `${data.codeRunner}: ${data.codeRunnerStatus}` : data.codeRunner,
                status: data.codeRunnerStatus ?? data.codeRunner,
              },
            ]
          : []),
        ...(data.aiProvider !== undefined ? [{ label: 'AI provider', value: data.aiProvider }] : []),
      ]
    : [];

  return (
    <section aria-labelledby="health-heading">
      <SectionLabel>Platform</SectionLabel>
      <div className="mb-3 mt-1 flex items-center justify-between gap-3">
        <h2 id="health-heading" className="flex items-center gap-2 font-heading text-xl font-bold text-white">
          <Activity className="h-5 w-5 text-cyan-400" aria-hidden="true" /> Service health
        </h2>
        <button
          type="button"
          onClick={() => void check()}
          disabled={health.state === 'loading'}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${health.state === 'loading' ? 'animate-spin' : ''}`} aria-hidden="true" />
          Refresh
        </button>
      </div>

      {health.state === 'loading' && (
        <p className="flex items-center gap-2 font-mono text-xs text-slate-400" role="status">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Checking services...
        </p>
      )}

      {health.state === 'error' && (
        <ErrorAlert
          message={`${health.message}${health.httpStatus ? ` (HTTP ${health.httpStatus})` : ''}`}
          onRetry={() => void check()}
          className="mb-4"
        />
      )}

      {data && (
        <div className="space-y-4 rounded-md bg-slate-900 p-4">
          <dl className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
            {rows.map((row) => {
              const tone = toneFor(row.status ?? row.value);
              return (
                <div key={row.label} className="flex items-center gap-3 rounded-md bg-slate-800 px-3 py-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${tone.dot}`} aria-hidden="true" />
                  <dt className="text-sm text-white">{row.label}</dt>
                  <dd className={`ml-auto font-mono text-xs ${tone.text}`}>{row.value === undefined ? 'unknown' : String(row.value)}</dd>
                </div>
              );
            })}
          </dl>
          {data.codeRunnerDetail && data.codeRunnerStatus === 'unavailable' && (
            <p className="rounded-md bg-slate-800 px-3 py-2 font-mono text-xs text-amber-400">Code runner: {data.codeRunnerDetail}</p>
          )}
          {data.mlModels && (
            <div>
              <h3 className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-widest text-slate-500">ML models loaded</h3>
              <ul className="flex flex-wrap gap-2">
                {Object.entries(data.mlModels).map(([name, loaded]) => (
                  <li key={name} className="flex items-center gap-2 rounded-md bg-slate-800 px-2.5 py-1 font-mono text-[11px] text-slate-300">
                    <span className={`h-1.5 w-1.5 rounded-full ${toneFor(loaded).dot}`} aria-hidden="true" />
                    {name}: {loaded ? 'loaded' : 'missing'}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <details className="text-xs text-slate-400">
            <summary className="cursor-pointer font-mono">Raw response</summary>
            <pre className="mt-2 overflow-x-auto rounded-md bg-slate-950 p-4 font-mono text-xs text-slate-300">
              {JSON.stringify(data, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {checkedAt && health.state !== 'loading' && (
        <p className="mt-3 font-mono text-[11px] text-slate-400">Last checked {checkedAt.toLocaleTimeString()}</p>
      )}
    </section>
  );
}

function ProblemsTab() {
  const { problems, problemsLoading, problemsError, reloadProblems } = useAppData();
  const [editing, setEditing] = useState<Problem | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; problemId?: string } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [formKey, setFormKey] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return problems;
    return problems.filter((problem) => `${problem.title} ${problem.id} ${(problem.tags ?? []).join(' ')}`.toLowerCase().includes(q));
  }, [problems, query]);

  const startEdit = (problem: Problem) => {
    setEditing(problem);
    setSaveError(null);
    setNotice(null);
    document.getElementById('problem-form-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const cancelEdit = () => {
    setEditing(null);
    setSaveError(null);
  };

  const saveProblem = async (payload: ProblemInput) => {
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    setNotice(null);
    try {
      const result = editing
        ? await api.put<Problem>(`/api/problems/${encodeURIComponent(editing.id)}`, payload)
        : await api.post<Problem>('/api/problems', payload);
      if (!result.ok) {
        setSaveError(describeApiError(result));
        return;
      }
      const savedId = result.data?.id ?? editing?.id;
      setNotice({ text: editing ? `Saved changes to "${payload.title}".` : `Created "${payload.title}".`, problemId: savedId });
      setEditing(null);
      setFormKey((key) => key + 1);
      await reloadProblems();
    } finally {
      setSaving(false);
    }
  };

  const deleteProblem = async (problem: Problem) => {
    if (deleting) return;
    if (!window.confirm(`Delete "${problem.title}"? This cannot be undone.`)) return;
    setDeleting(problem.id);
    setDeleteError(null);
    setNotice(null);
    try {
      const result = await api.delete<unknown>(`/api/problems/${encodeURIComponent(problem.id)}`);
      if (!result.ok) {
        setDeleteError(`Could not delete "${problem.title}": ${describeApiError(result)}`);
        return;
      }
      if (editing?.id === problem.id) setEditing(null);
      setNotice({ text: `Deleted "${problem.title}".` });
      await reloadProblems();
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-8">

      {notice && (
        <p role="status" className="rounded-md bg-slate-900 px-4 py-3 text-sm text-emerald-400">
          {notice.text}{' '}
          {notice.problemId && (
            <Link to={`/arena/${encodeURIComponent(notice.problemId)}`} className="font-bold underline">
              Open in Arena
            </Link>
          )}
        </p>
      )}

      <div id="problem-form-anchor" className="scroll-mt-16 lg:scroll-mt-4">
        <ProblemForm
          key={editing ? `edit-${editing.id}` : `new-${formKey}`}
          problem={editing}
          saving={saving}
          serverError={saveError}
          onSubmit={(payload) => void saveProblem(payload)}
          onCancel={cancelEdit}
        />
      </div>

      <section aria-labelledby="problem-bank-heading">
        <SectionLabel>Content</SectionLabel>
        <div className="mb-3 mt-1 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 id="problem-bank-heading" className="font-heading text-xl font-bold text-white">
            Problem bank ({problems.length})
          </h2>
          <div className="relative w-full md:w-72">
            <label htmlFor="admin-problem-search" className="sr-only">
              Search problems
            </label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              id="admin-problem-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by title, id or tag..."
              className="w-full rounded-md border-0 bg-slate-900 py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-500 focus:ring-1 focus:ring-cyan-400"
            />
          </div>
        </div>

        {problemsError && <ErrorAlert message={`Could not load problems: ${problemsError}`} onRetry={() => void reloadProblems()} className="mb-3" />}
        {deleteError && <ErrorAlert message={deleteError} className="mb-3" />}
        {problemsLoading && problems.length === 0 && <p className="font-mono text-xs text-slate-400">Loading problems...</p>}

        {filtered.length > 0 && (
          <ul className="max-h-[520px] space-y-2 overflow-auto">
            {filtered.map((problem) => (
              <li
                key={problem.id}
                className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md px-4 py-3 hover:bg-slate-800 ${editing?.id === problem.id ? 'bg-slate-800' : 'bg-slate-900'}`}
              >
                <div className="min-w-0 basis-full sm:basis-0 sm:flex-1">
                  <span className="block truncate text-sm font-semibold text-white">{problem.title}</span>
                  <span className="block truncate font-mono text-[11px] text-slate-400">
                    {problem.id}
                    {(problem.tags ?? []).length > 0 && ` · ${(problem.tags ?? []).join(', ')}`}
                  </span>
                </div>
                <span className={`font-mono text-xs font-semibold ${difficultyTextClass(problem.difficulty)}`}>{problem.difficulty}</span>
                <div className="ml-auto flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(problem)}
                    aria-label={`Edit ${problem.title}`}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-950"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteProblem(problem)}
                    disabled={deleting !== null}
                    aria-label={`Delete ${problem.title}`}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-slate-800 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-slate-950 disabled:opacity-50"
                  >
                    {deleting === problem.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {!problemsLoading && filtered.length === 0 && !problemsError && (
          <p className="font-mono text-xs text-slate-400">{problems.length === 0 ? 'No problems yet.' : 'No problems match your search.'}</p>
        )}
      </section>

    </div>
  );
}

type AdminTab = 'overview' | 'problems' | 'contests' | 'users' | 'discussions';

const ADMIN_TABS: Array<{ id: AdminTab; label: string; icon: React.ElementType }> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'problems', label: 'Problems', icon: Code2 },
  { id: 'contests', label: 'Contests', icon: Trophy },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'discussions', label: 'Discussions', icon: MessageSquare },
];

export default function AdminStudioPage() {
  const { problems } = useAppData();
  const [tab, setTab] = useState<AdminTab>('overview');

  return (
    <div className="space-y-8">
      <PageHero
        titleId="admin-heading"
        eyebrow="Settings"
        title="Admin Studio"
        subtitle="Manage problems, contests, users and discussions, and check the health of the platform services."
        stats={[{ icon: HeroSettings, value: String(problems.length), label: 'problems in the bank' }]}
      />

      <div className="no-scrollbar -mt-2 flex gap-1 overflow-x-auto border-b border-slate-800" role="tablist" aria-label="Admin sections">
        {ADMIN_TABS.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(item.id)}
              className={`-mb-px flex shrink-0 cursor-pointer items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                active ? 'border-cyan-400 text-white' : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <item.icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              {item.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel">
        {tab === 'overview' && (
          <div className="space-y-10">
            <OverviewStats />
            <HealthPanel />
          </div>
        )}
        {tab === 'problems' && <ProblemsTab />}
        {tab === 'contests' && <ContestsAdmin />}
        {tab === 'users' && <UsersAdmin />}
        {tab === 'discussions' && <DiscussionsAdmin />}
      </div>

      <p className="text-xs text-slate-400">Admin actions are authorized by the server; this page only hides controls from non-admin accounts.</p>
    </div>
  );
}
