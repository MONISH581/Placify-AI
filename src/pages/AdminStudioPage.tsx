/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Loader2, Pencil, RefreshCw, Search, Trash2 } from 'lucide-react';
import { ProblemForm } from '../components/admin/ProblemForm';
import { difficultyBadgeClass } from '../components/arena/difficulty';
import { ErrorAlert } from '../components/StatusMessages';
import { useAppData } from '../context/AppDataContext';
import { api, describeApiError } from '../services/api';
import type { HealthStatus, Problem, ProblemInput } from '../types';

type HealthState =
  | { state: 'loading' }
  | { state: 'ready'; httpStatus: number; data: HealthStatus }
  | { state: 'error'; httpStatus: number; message: string; data: HealthStatus | null };

function isHealthStatus(value: unknown): value is HealthStatus {
  return typeof value === 'object' && value !== null && typeof (value as { status?: unknown }).status === 'string';
}

function toneFor(value: string | boolean | undefined): string {
  if (value === true) return 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10';
  if (value === false || value === undefined) return 'text-rose-300 border-rose-500/30 bg-rose-500/10';
  const normalized = value.toLowerCase();
  if (['ok', 'up', 'healthy', 'connected', 'online', 'ready', 'judge0', 'local', 'gemini'].includes(normalized)) return 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10';
  if (['degraded', 'partial', 'disabled', 'not configured'].includes(normalized)) return 'text-amber-300 border-amber-500/30 bg-amber-500/10';
  return 'text-rose-300 border-rose-500/30 bg-rose-500/10';
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
  const rows: Array<{ label: string; value: string | boolean | undefined }> = data
    ? [
        { label: 'Overall', value: data.status },
        { label: 'Node API', value: data.node ?? (health.state === 'ready' ? 'ok' : undefined) },
        { label: 'Database', value: data.database },
        { label: 'ML service', value: data.mlService },
        ...(data.codeRunner !== undefined ? [{ label: 'Code runner', value: data.codeRunner }] : []),
        ...(data.aiProvider !== undefined ? [{ label: 'AI provider', value: data.aiProvider }] : []),
      ]
    : [];

  return (
    <section className="rounded-xl border border-slate-800 bg-[#161D2F] p-6" aria-labelledby="health-heading">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id="health-heading" className="flex items-center gap-2 font-heading text-xl font-bold text-white">
          <Activity className="h-5 w-5 text-cyan-400" aria-hidden="true" /> Service health
        </h2>
        <button
          type="button"
          onClick={() => void check()}
          disabled={health.state === 'loading'}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/10 disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${health.state === 'loading' ? 'animate-spin' : ''}`} aria-hidden="true" />
          Refresh
        </button>
      </div>

      {health.state === 'loading' && (
        <p className="flex items-center gap-2 font-mono text-xs text-zinc-400" role="status">
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
        <div className="space-y-4">
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {rows.map((row) => (
              <div key={row.label} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                <dt className="font-mono text-[10px] font-bold uppercase text-zinc-500">{row.label}</dt>
                <dd className={`mt-1 inline-block rounded border px-2 py-0.5 font-mono text-xs font-bold ${toneFor(row.value)}`}>
                  {row.value === undefined ? 'unknown' : String(row.value)}
                </dd>
              </div>
            ))}
          </dl>
          {data.mlModels && (
            <div>
              <h3 className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500">ML models loaded</h3>
              <ul className="flex flex-wrap gap-2">
                {Object.entries(data.mlModels).map(([name, loaded]) => (
                  <li key={name} className={`rounded border px-2 py-0.5 font-mono text-[11px] ${toneFor(loaded)}`}>
                    {name}: {loaded ? 'loaded' : 'missing'}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <details className="text-xs text-zinc-400">
            <summary className="cursor-pointer font-mono">Raw response</summary>
            <pre className="mt-2 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-cyan-300">
              {JSON.stringify(data, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {checkedAt && health.state !== 'loading' && (
        <p className="mt-3 font-mono text-[10px] text-zinc-500">Last checked {checkedAt.toLocaleTimeString()}</p>
      )}
    </section>
  );
}

export default function AdminStudioPage() {
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    <div className="space-y-6">
      <HealthPanel />

      {notice && (
        <p role="status" className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-300">
          {notice.text}{' '}
          {notice.problemId && (
            <Link to={`/arena/${encodeURIComponent(notice.problemId)}`} className="font-bold underline">
              Open in Arena
            </Link>
          )}
        </p>
      )}

      <ProblemForm
        key={editing ? `edit-${editing.id}` : `new-${formKey}`}
        problem={editing}
        saving={saving}
        serverError={saveError}
        onSubmit={(payload) => void saveProblem(payload)}
        onCancel={cancelEdit}
      />

      <section className="rounded-xl border border-slate-800 bg-[#161D2F] p-6" aria-labelledby="problem-bank-heading">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 id="problem-bank-heading" className="font-heading text-lg font-bold text-white">
            Problem bank ({problems.length})
          </h2>
          <div className="relative w-full md:w-72">
            <label htmlFor="admin-problem-search" className="sr-only">
              Search problems
            </label>
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
            <input
              id="admin-problem-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by title, id or tag..."
              className="h-9 w-full rounded-lg border border-slate-800 bg-slate-950/40 pl-8 pr-3 text-xs text-white outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {problemsError && <ErrorAlert message={`Could not load problems: ${problemsError}`} onRetry={() => void reloadProblems()} className="mb-3" />}
        {deleteError && <ErrorAlert message={deleteError} className="mb-3" />}
        {problemsLoading && problems.length === 0 && <p className="font-mono text-xs text-zinc-400">Loading problems...</p>}

        {filtered.length > 0 && (
          <div className="max-h-[520px] overflow-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-900 font-mono text-[10px] uppercase text-zinc-400">
                <tr>
                  <th scope="col" className="px-3 py-2">Title</th>
                  <th scope="col" className="px-3 py-2">Difficulty</th>
                  <th scope="col" className="hidden px-3 py-2 md:table-cell">Tags</th>
                  <th scope="col" className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((problem) => (
                  <tr key={problem.id} className={`border-t border-slate-800 ${editing?.id === problem.id ? 'bg-cyan-500/5' : ''}`}>
                    <td className="px-3 py-2">
                      <span className="block font-bold text-white">{problem.title}</span>
                      <span className="block font-mono text-[9px] text-zinc-500">{problem.id}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`rounded border px-2 py-0.5 font-mono text-[9px] ${difficultyBadgeClass(problem.difficulty)}`}>{problem.difficulty}</span>
                    </td>
                    <td className="hidden px-3 py-2 font-mono text-[10px] text-zinc-400 md:table-cell">{(problem.tags ?? []).join(', ')}</td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => startEdit(problem)}
                          aria-label={`Edit ${problem.title}`}
                          className="cursor-pointer rounded-lg border border-white/10 p-1.5 text-zinc-300 hover:bg-white/10"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteProblem(problem)}
                          disabled={deleting !== null}
                          aria-label={`Delete ${problem.title}`}
                          className="cursor-pointer rounded-lg border border-rose-500/20 p-1.5 text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
                        >
                          {deleting === problem.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!problemsLoading && filtered.length === 0 && !problemsError && (
          <p className="font-mono text-xs text-zinc-400">{problems.length === 0 ? 'No problems yet.' : 'No problems match your search.'}</p>
        )}
      </section>

      <p className="text-[11px] text-zinc-500">
        Admin actions are authorized by the server; this page only hides controls from non-admin accounts.
      </p>
    </div>
  );
}
