import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { useAppData } from '../../context/AppDataContext';
import { api, describeApiError } from '../../services/api';
import type { Contest, ContestInput } from '../../types';
import { ErrorAlert, LoadingBlock } from '../StatusMessages';
import { AdminHeading, Notice, adminButton, adminDanger, adminInput, adminLabel, adminPrimary } from './adminUi';

interface FormState {
  title: string;
  description: string;
  /** Value for <input type="datetime-local">, in the admin's local time. */
  start: string;
  duration: string;
  problems: string[];
}

/** ISO timestamp -> "YYYY-MM-DDTHH:mm" in local time, as datetime-local expects. */
function toLocalInput(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function emptyForm(): FormState {
  const soon = new Date(Date.now() + 24 * 3600_000);
  soon.setMinutes(0, 0, 0);
  return { title: '', description: '', start: toLocalInput(soon.toISOString()), duration: '90', problems: [] };
}

/** Create, edit and delete contests via /api/admin/contests. Reads the list from the public /api/contests. */
export function ContestsAdmin() {
  const { problems } = useAppData();
  const [contests, setContests] = useState<Contest[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [problemQuery, setProblemQuery] = useState('');

  const load = useCallback(async () => {
    setLoadError(null);
    const result = await api.get<Contest[]>('/api/contests');
    if (result.ok && Array.isArray(result.data)) setContests(result.data);
    else setLoadError(result.ok ? 'Unexpected response format.' : result.error);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const titleById = useMemo(() => new Map(problems.map((problem) => [problem.id, problem.title])), [problems]);
  const visibleProblems = useMemo(() => {
    const q = problemQuery.trim().toLowerCase();
    return q ? problems.filter((problem) => `${problem.title} ${(problem.tags ?? []).join(' ')}`.toLowerCase().includes(q)) : problems;
  }, [problems, problemQuery]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const toggleProblem = (id: string) =>
    set('problems', form.problems.includes(id) ? form.problems.filter((item) => item !== id) : [...form.problems, id]);

  const startEdit = (contest: Contest) => {
    setEditingId(contest.id);
    setForm({
      title: contest.title,
      description: contest.description,
      start: toLocalInput(contest.startTime),
      duration: String(contest.durationMinutes),
      problems: [...(contest.problems ?? [])],
    });
    setFormError(null);
    setNotice(null);
    document.getElementById('contest-form-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFormError(null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    const start = new Date(form.start);
    const duration = Number(form.duration);
    if (Number.isNaN(start.getTime())) return setFormError('Pick a valid start date and time.');
    if (!Number.isInteger(duration)) return setFormError('Duration must be a whole number of minutes.');
    const payload: ContestInput = {
      title: form.title.trim(),
      description: form.description.trim(),
      startTime: start.toISOString(),
      durationMinutes: duration,
      problems: form.problems,
    };
    setSaving(true);
    setFormError(null);
    setNotice(null);
    try {
      const result = editingId ? await api.put<Contest>(`/api/admin/contests/${encodeURIComponent(editingId)}`, payload) : await api.post<Contest>('/api/admin/contests', payload);
      if (!result.ok) {
        setFormError(describeApiError(result));
        return;
      }
      setNotice(editingId ? `Saved changes to "${payload.title}".` : `Created "${payload.title}".`);
      resetForm();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (contest: Contest) => {
    if (deleting) return;
    if (!window.confirm(`Delete the contest "${contest.title}"? Its ${contest.registrantsCount} registration(s) will be removed too.`)) return;
    setDeleting(contest.id);
    setNotice(null);
    try {
      const result = await api.delete<unknown>(`/api/admin/contests/${encodeURIComponent(contest.id)}`);
      if (!result.ok) {
        setFormError(`Could not delete "${contest.title}": ${describeApiError(result)}`);
        return;
      }
      if (editingId === contest.id) resetForm();
      setNotice(`Deleted "${contest.title}".`);
      await load();
    } finally {
      setDeleting(null);
    }
  };

  return (
    <section aria-labelledby="contests-admin-heading">
      <AdminHeading label="Events" title={`Contests${contests ? ` (${contests.length})` : ''}`} />
      <h2 id="contests-admin-heading" className="sr-only">
        Contests
      </h2>
      {notice && <Notice>{notice}</Notice>}
      {loadError && <ErrorAlert message={`Could not load contests: ${loadError}`} onRetry={() => void load()} className="mb-3" />}
      {!contests && !loadError && <LoadingBlock label="Loading contests..." />}

      {contests && (
        <ul className="mb-8 space-y-2">
          {contests.map((contest) => (
            <li key={contest.id} className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md px-4 py-3 ${editingId === contest.id ? 'bg-slate-800' : 'bg-slate-900'}`}>
              <div className="min-w-0 basis-full sm:basis-0 sm:flex-1">
                <p className="truncate text-sm font-semibold text-white">{contest.title}</p>
                <p className="truncate font-mono text-[11px] text-slate-400">
                  {new Date(contest.startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} · {contest.durationMinutes} min ·{' '}
                  {contest.problems?.length ?? 0} problems · {contest.registrantsCount} registered
                </p>
              </div>
              <div className="ml-auto flex shrink-0 gap-2">
                <button type="button" className={adminButton} onClick={() => startEdit(contest)} aria-label={`Edit ${contest.title}`}>
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
                </button>
                <button type="button" className={adminDanger} disabled={deleting !== null} onClick={() => void remove(contest)} aria-label={`Delete ${contest.title}`}>
                  {deleting === contest.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
                  Delete
                </button>
              </div>
            </li>
          ))}
          {contests.length === 0 && <li className="font-mono text-xs text-slate-400">No contests yet. Create the first one below.</li>}
        </ul>
      )}

      <div id="contest-form-anchor" className="scroll-mt-16 lg:scroll-mt-4">
        <form onSubmit={(event) => void submit(event)} className="space-y-4 rounded-md bg-slate-900 p-5" noValidate>
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-heading text-lg font-bold text-white">{editingId ? 'Edit contest' : 'Create a contest'}</h3>
            {editingId && (
              <button type="button" className={adminButton} onClick={resetForm}>
                <X className="h-3.5 w-3.5" aria-hidden="true" /> Cancel edit
              </button>
            )}
          </div>

          <div>
            <label htmlFor="contest-title" className={adminLabel}>
              Title
            </label>
            <input id="contest-title" value={form.title} onChange={(event) => set('title', event.target.value)} className={adminInput} placeholder="Placify Weekly Challenge #2" />
          </div>
          <div>
            <label htmlFor="contest-description" className={adminLabel}>
              Description
            </label>
            <textarea id="contest-description" rows={3} value={form.description} onChange={(event) => set('description', event.target.value)} className={adminInput} placeholder="What the contest covers and who it is for." />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="contest-start" className={adminLabel}>
                Starts
              </label>
              <input id="contest-start" type="datetime-local" value={form.start} onChange={(event) => set('start', event.target.value)} className={adminInput} />
            </div>
            <div>
              <label htmlFor="contest-duration" className={adminLabel}>
                Duration (minutes)
              </label>
              <input id="contest-duration" type="number" min={5} max={1440} value={form.duration} onChange={(event) => set('duration', event.target.value)} className={adminInput} />
            </div>
          </div>

          <fieldset>
            <legend className={adminLabel}>Problems ({form.problems.length} selected)</legend>
            {form.problems.length > 0 && (
              <ul className="mb-2 flex flex-wrap gap-1.5">
                {form.problems.map((id) => (
                  <li key={id}>
                    <button type="button" onClick={() => toggleProblem(id)} className="inline-flex cursor-pointer items-center gap-1 rounded bg-cyan-400/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-cyan-400 hover:bg-cyan-400/25" title="Remove from contest">
                      {titleById.get(id) ?? id} <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <input type="search" value={problemQuery} onChange={(event) => setProblemQuery(event.target.value)} placeholder="Filter problems..." className={`${adminInput} mb-2`} aria-label="Filter problems" />
            <ul className="max-h-48 space-y-0.5 overflow-auto rounded-md bg-slate-950 p-2">
              {visibleProblems.map((problem) => (
                <li key={problem.id}>
                  <label className="flex cursor-pointer items-center gap-2.5 rounded px-2 py-1 text-sm text-slate-300 hover:bg-slate-800">
                    <input type="checkbox" checked={form.problems.includes(problem.id)} onChange={() => toggleProblem(problem.id)} className="h-3.5 w-3.5 accent-cyan-400" />
                    <span className="min-w-0 flex-1 truncate">{problem.title}</span>
                    <span className="font-mono text-[10px] text-slate-500">{problem.difficulty}</span>
                  </label>
                </li>
              ))}
              {visibleProblems.length === 0 && <li className="px-2 py-1 font-mono text-xs text-slate-500">No problems match.</li>}
            </ul>
          </fieldset>

          {formError && <ErrorAlert message={formError} />}

          <button type="submit" disabled={saving} className={adminPrimary}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : editingId ? <Save className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
            {saving ? 'Saving...' : editingId ? 'Save changes' : 'Create contest'}
          </button>
        </form>
      </div>
    </section>
  );
}
