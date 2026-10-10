import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, RotateCcw, Search, ShieldCheck, ShieldOff, Trash2 } from 'lucide-react';
import { useRequiredUser } from '../../context/AuthContext';
import { api, describeApiError } from '../../services/api';
import type { AdminUser } from '../../types';
import { ErrorAlert, LoadingBlock } from '../StatusMessages';
import { AdminHeading, Notice, adminButton, adminDanger, adminInput } from './adminUi';

/** User list with role changes, progress reset and account deletion. All calls hit /api/admin/users. */
export function UsersAdmin() {
  const me = useRequiredUser();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoadError(null);
    const result = await api.get<AdminUser[]>('/api/admin/users');
    if (result.ok && Array.isArray(result.data)) setUsers(result.data);
    else setLoadError(result.ok ? 'Unexpected response format.' : result.error);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!users) return [];
    return q ? users.filter((user) => `${user.username} ${user.email}`.toLowerCase().includes(q)) : users;
  }, [users, query]);

  const run = async (user: AdminUser, label: string, call: () => ReturnType<typeof api.post>) => {
    if (busy) return;
    setBusy(user.id);
    setActionError(null);
    setNotice(null);
    try {
      const result = await call();
      if (!result.ok) {
        setActionError(describeApiError(result));
        return;
      }
      setNotice(`${label} for ${user.username}.`);
      await load();
    } finally {
      setBusy(null);
    }
  };

  const toggleAdmin = (user: AdminUser) => {
    const next = !user.isAdmin;
    if (!window.confirm(`${next ? 'Give admin access to' : 'Remove admin access from'} ${user.username}?`)) return;
    void run(user, next ? 'Admin access granted' : 'Admin access removed', () => api.patch(`/api/admin/users/${encodeURIComponent(user.id)}`, { isAdmin: next }));
  };

  const resetProgress = (user: AdminUser) => {
    if (!window.confirm(`Reset ALL progress for ${user.username}? Submissions, badges, XP, interviews and topic completions will be erased.`)) return;
    void run(user, 'Progress reset', () => api.post(`/api/admin/users/${encodeURIComponent(user.id)}/reset-progress`));
  };

  const remove = (user: AdminUser) => {
    if (!window.confirm(`Permanently delete the account ${user.username} (${user.email})? This cannot be undone.`)) return;
    void run(user, 'Account deleted', () => api.delete(`/api/admin/users/${encodeURIComponent(user.id)}`));
  };

  return (
    <section aria-labelledby="users-heading">
      <AdminHeading
        label="Accounts"
        title={`Users${users ? ` (${users.length})` : ''}`}
        action={
          <div className="relative w-full md:w-72">
            <label htmlFor="admin-user-search" className="sr-only">
              Search users
            </label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input id="admin-user-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or email..." className={`${adminInput} bg-slate-900 pl-9`} />
          </div>
        }
      />
      <h2 id="users-heading" className="sr-only">
        Users
      </h2>

      {notice && <Notice>{notice}</Notice>}
      {actionError && <ErrorAlert message={actionError} className="mb-3" />}
      {loadError && <ErrorAlert message={`Could not load users: ${loadError}`} onRetry={() => void load()} />}
      {!users && !loadError && <LoadingBlock label="Loading users..." />}

      {users && (
        <ul className="max-h-[640px] space-y-2 overflow-auto">
          {filtered.map((user) => {
            const isMe = user.id === me.id;
            const working = busy === user.id;
            return (
              <li key={user.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-md bg-slate-900 px-4 py-3">
                <div className="min-w-0 basis-full sm:basis-0 sm:flex-1">
                  <p className="flex items-center gap-2 truncate text-sm font-semibold text-white">
                    {user.username}
                    {isMe && <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">you</span>}
                    {user.isAdmin && <span className="rounded bg-cyan-400/15 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-cyan-400">admin</span>}
                  </p>
                  <p className="truncate font-mono text-[11px] text-slate-400">{user.email}</p>
                </div>
                <p className="font-mono text-[11px] text-slate-400">
                  L{user.level} · {user.xp} XP · {user.solvedCount} solved · {user.submissionCount} submissions
                </p>
                <div className="ml-auto flex shrink-0 flex-wrap gap-2">
                  <button type="button" className={adminButton} disabled={isMe || busy !== null} onClick={() => toggleAdmin(user)} title={isMe ? 'You cannot change your own access' : undefined}>
                    {user.isAdmin ? <ShieldOff className="h-3.5 w-3.5" aria-hidden="true" /> : <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />}
                    {user.isAdmin ? 'Remove admin' : 'Make admin'}
                  </button>
                  <button type="button" className={adminButton} disabled={busy !== null} onClick={() => resetProgress(user)}>
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Reset progress
                  </button>
                  <button type="button" className={adminDanger} disabled={isMe || busy !== null} onClick={() => remove(user)} title={isMe ? 'You cannot delete your own account' : undefined}>
                    {working ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
          {filtered.length === 0 && <li className="font-mono text-xs text-slate-400">No users match your search.</li>}
        </ul>
      )}
    </section>
  );
}
