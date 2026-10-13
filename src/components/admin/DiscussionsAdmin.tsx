import { useCallback, useEffect, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { api, describeApiError } from '../../services/api';
import type { DiscussionThread } from '../../types';
import { ErrorAlert, LoadingBlock } from '../StatusMessages';
import { AdminHeading, Notice, adminDanger } from './adminUi';

/** Moderation: remove whole threads or single replies via /api/admin/discussions. */
export function DiscussionsAdmin() {
  const [threads, setThreads] = useState<DiscussionThread[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    const result = await api.get<DiscussionThread[]>('/api/discussions');
    if (result.ok && Array.isArray(result.data)) setThreads(result.data);
    else setLoadError(result.ok ? 'Unexpected response format.' : result.error);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (key: string, url: string, confirmText: string, doneText: string) => {
    if (busy || !window.confirm(confirmText)) return;
    setBusy(key);
    setActionError(null);
    setNotice(null);
    try {
      const result = await api.delete<unknown>(url);
      if (!result.ok) {
        setActionError(describeApiError(result));
        return;
      }
      setNotice(doneText);
      await load();
    } finally {
      setBusy(null);
    }
  };

  return (
    <section aria-labelledby="discussions-admin-heading">
      <AdminHeading label="Moderation" title={`Discussions${threads ? ` (${threads.length})` : ''}`} />
      <h2 id="discussions-admin-heading" className="sr-only">
        Discussions
      </h2>
      {notice && <Notice>{notice}</Notice>}
      {actionError && <ErrorAlert message={actionError} className="mb-3" />}
      {loadError && <ErrorAlert message={`Could not load discussions: ${loadError}`} onRetry={() => void load()} />}
      {!threads && !loadError && <LoadingBlock label="Loading discussions..." />}

      {threads && (
        <ul className="space-y-3">
          {threads.map((thread) => (
            <li key={thread.id} className="rounded-md bg-slate-900 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-[11px] text-slate-500">
                    {thread.category} · {thread.username} · {new Date(thread.createdAt).toLocaleString()}
                  </p>
                  <h3 className="mt-0.5 text-sm font-bold text-white">{thread.title}</h3>
                  <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs text-slate-300">{thread.content}</p>
                </div>
                <button
                  type="button"
                  className={`${adminDanger} shrink-0`}
                  disabled={busy !== null}
                  onClick={() =>
                    void remove(thread.id, `/api/admin/discussions/${encodeURIComponent(thread.id)}`, `Delete the thread "${thread.title}" and its ${thread.replies.length} repl${thread.replies.length === 1 ? 'y' : 'ies'}?`, `Deleted "${thread.title}".`)
                  }
                >
                  {busy === thread.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
                  Delete thread
                </button>
              </div>

              {thread.replies.length > 0 && (
                <ul className="mt-3 space-y-1.5 border-t border-slate-800 pt-3">
                  {thread.replies.map((reply) => (
                    <li key={reply.id} className="flex items-start justify-between gap-3 rounded bg-slate-950 px-3 py-2">
                      <p className="min-w-0 text-xs text-slate-300">
                        <span className="font-semibold text-white">{reply.username}</span>: <span className="whitespace-pre-wrap">{reply.content}</span>
                      </p>
                      <button
                        type="button"
                        className="shrink-0 cursor-pointer rounded p-1 text-slate-500 transition-colors hover:text-rose-400 disabled:opacity-50"
                        disabled={busy !== null}
                        aria-label={`Delete reply by ${reply.username}`}
                        title="Delete reply"
                        onClick={() =>
                          void remove(reply.id, `/api/admin/discussions/${encodeURIComponent(thread.id)}/replies/${encodeURIComponent(reply.id)}`, `Delete this reply by ${reply.username}?`, 'Reply deleted.')
                        }
                      >
                        {busy === reply.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
          {threads.length === 0 && <li className="font-mono text-xs text-slate-400">No discussions to moderate.</li>}
        </ul>
      )}
    </section>
  );
}
