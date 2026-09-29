/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Heart, Loader2, MessageCircle, Plus, Send } from 'lucide-react';
import { ErrorAlert, LoadingBlock } from '../components/StatusMessages';
import { useRequiredUser } from '../context/AuthContext';
import { api, describeApiError } from '../services/api';
import { DISCUSSION_CATEGORIES, type DiscussionThread } from '../types';

const TITLE_MIN = 3;
const TITLE_MAX = 200;
const CONTENT_MAX = 5000;
const REPLY_MAX = 2000;

function normalizeThread(thread: DiscussionThread): DiscussionThread {
  return {
    ...thread,
    likes: Number(thread.likes) || 0,
    likedBy: Array.isArray(thread.likedBy) ? thread.likedBy : [],
    replies: Array.isArray(thread.replies) ? thread.replies : [],
  };
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

type Flags = Record<string, boolean>;

function withFlag(flags: Flags, id: string, value: boolean): Flags {
  const next = { ...flags };
  if (value) next[id] = true;
  else delete next[id];
  return next;
}

export default function CommunityPage() {
  const user = useRequiredUser();

  const [threads, setThreads] = useState<DiscussionThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<string>('Doubts');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [openReplies, setOpenReplies] = useState<Flags>({});
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyPending, setReplyPending] = useState<Flags>({});
  const [likePending, setLikePending] = useState<Flags>({});
  const [threadErrors, setThreadErrors] = useState<Record<string, string>>({});

  const loadThreads = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await api.get<DiscussionThread[]>('/api/discussions');
      if (result.ok && Array.isArray(result.data)) setThreads(result.data.map(normalizeThread));
      else setLoadError(result.ok ? 'Unexpected response format.' : result.error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  const replaceThread = (updated: DiscussionThread) => {
    const normalized = normalizeThread(updated);
    setThreads((prev) => prev.map((thread) => (thread.id === normalized.id ? normalized : thread)));
  };

  const setThreadError = (threadId: string, message: string | null) => {
    setThreadErrors((prev) => {
      const next = { ...prev };
      if (message) next[threadId] = message;
      else delete next[threadId];
      return next;
    });
  };

  const createThread = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    if (trimmedTitle.length < TITLE_MIN || trimmedTitle.length > TITLE_MAX) {
      setFormError(`Title must be between ${TITLE_MIN} and ${TITLE_MAX} characters.`);
      return;
    }
    if (!trimmedContent || trimmedContent.length > CONTENT_MAX) {
      setFormError(`Please write between 1 and ${CONTENT_MAX} characters.`);
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const result = await api.post<DiscussionThread>('/api/discussions', {
        title: trimmedTitle,
        content: trimmedContent,
        category,
      });
      if (result.ok && result.data?.id) {
        const created = normalizeThread(result.data);
        setThreads((prev) => [created, ...prev]);
        // Only clear the form once the server accepted the thread.
        setTitle('');
        setContent('');
      } else {
        setFormError(result.ok ? 'Unexpected response from the server.' : describeApiError(result));
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleLike = async (thread: DiscussionThread) => {
    if (likePending[thread.id]) return;
    const snapshot = { likes: thread.likes, likedBy: thread.likedBy };
    const liked = thread.likedBy.includes(user.id);

    // Optimistic update, reconciled with (or reverted to) server state below.
    setThreads((prev) =>
      prev.map((item) =>
        item.id === thread.id
          ? {
              ...item,
              likes: Math.max(0, item.likes + (liked ? -1 : 1)),
              likedBy: liked ? item.likedBy.filter((id) => id !== user.id) : [...item.likedBy, user.id],
            }
          : item,
      ),
    );
    setLikePending((prev) => withFlag(prev, thread.id, true));
    setThreadError(thread.id, null);
    try {
      const result = await api.post<DiscussionThread>(`/api/discussions/${encodeURIComponent(thread.id)}/like`);
      if (result.ok && result.data?.id) {
        replaceThread(result.data);
      } else {
        setThreads((prev) => prev.map((item) => (item.id === thread.id ? { ...item, ...snapshot } : item)));
        setThreadError(thread.id, result.ok ? 'Unexpected response from the server.' : describeApiError(result));
      }
    } finally {
      setLikePending((prev) => withFlag(prev, thread.id, false));
    }
  };

  const submitReply = async (threadId: string) => {
    if (replyPending[threadId]) return;
    const draft = (replyDrafts[threadId] ?? '').trim();
    if (!draft || draft.length > REPLY_MAX) {
      setThreadError(threadId, `Replies must be between 1 and ${REPLY_MAX} characters.`);
      return;
    }
    setReplyPending((prev) => withFlag(prev, threadId, true));
    setThreadError(threadId, null);
    try {
      const result = await api.post<DiscussionThread>(`/api/discussions/${encodeURIComponent(threadId)}/reply`, { content: draft });
      if (result.ok && result.data?.id) {
        replaceThread(result.data);
        setReplyDrafts((prev) => ({ ...prev, [threadId]: '' }));
      } else {
        setThreadError(threadId, result.ok ? 'Unexpected response from the server.' : describeApiError(result));
      }
    } finally {
      setReplyPending((prev) => withFlag(prev, threadId, false));
    }
  };

  const fieldClass = 'w-full rounded-lg border border-slate-800 bg-slate-950/40 text-xs text-white outline-none focus:border-cyan-500';
  const labelClass = 'mb-1 block font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400';

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
      <form onSubmit={createThread} className="h-fit rounded-xl border border-slate-800 bg-[#161D2F] p-5 shadow-sm xl:col-span-4" noValidate>
        <h1 className="font-heading text-lg font-bold text-white">Start a discussion</h1>
        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor="thread-title" className={labelClass}>
              Title
            </label>
            <input
              id="thread-title"
              value={title}
              maxLength={TITLE_MAX}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Thread title"
              className={`h-11 px-3 ${fieldClass}`}
            />
          </div>
          <div>
            <label htmlFor="thread-category" className={labelClass}>
              Category
            </label>
            <select
              id="thread-category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className={`h-11 px-3 font-mono ${fieldClass}`}
            >
              {DISCUSSION_CATEGORIES.map((item) => (
                <option key={item} value={item} className="bg-[#161D2F] text-white">
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="thread-content" className={labelClass}>
                Details
              </label>
              <span className="font-mono text-[10px] text-zinc-500">
                {content.length}/{CONTENT_MAX}
              </span>
            </div>
            <textarea
              id="thread-content"
              value={content}
              maxLength={CONTENT_MAX}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Describe your question or placement experience..."
              className={`h-36 resize-none p-3 font-sans ${fieldClass}`}
            />
          </div>

          {formError && <ErrorAlert message={formError} />}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-cyan-400 px-4 py-2.5 text-xs font-black text-black transition hover:bg-cyan-300 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
            {saving ? 'Publishing...' : 'Publish thread'}
          </button>
        </div>
      </form>

      <div className="space-y-3 xl:col-span-8">
        {loadError && <ErrorAlert message={`Could not load discussions: ${loadError}`} onRetry={() => void loadThreads()} />}
        {loading && threads.length === 0 && <LoadingBlock label="Loading discussions..." />}
        {!loading && !loadError && threads.length === 0 && (
          <p className="rounded-xl border border-slate-800 bg-[#161D2F] p-6 text-sm text-slate-400">No discussions yet. Start the first one!</p>
        )}

        {threads.map((thread) => {
          const liked = thread.likedBy.includes(user.id);
          const repliesOpen = Boolean(openReplies[thread.id]);
          const draft = replyDrafts[thread.id] ?? '';
          const replyInputId = `reply-${thread.id}`;
          return (
            <article key={thread.id} className="rounded-xl border border-slate-800 bg-[#161D2F] p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-wide text-cyan-400">{thread.category}</p>
                  <h2 className="mt-1 font-heading text-lg font-bold text-white">{thread.title}</h2>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-slate-300">{thread.content}</p>
              <p className="mt-3 font-mono text-[10px] text-zinc-500">
                Posted by {thread.username}
                {formatDate(thread.createdAt) && ` · ${formatDate(thread.createdAt)}`}
              </p>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void toggleLike(thread)}
                  disabled={Boolean(likePending[thread.id])}
                  aria-pressed={liked}
                  aria-label={liked ? 'Unlike thread' : 'Like thread'}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-xs font-bold transition disabled:cursor-wait ${
                    liked ? 'border-rose-500/30 bg-rose-500/10 text-rose-300' : 'border-slate-800 bg-slate-950 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Heart className={`h-3.5 w-3.5 ${liked ? 'fill-current' : ''}`} aria-hidden="true" />
                  {thread.likes}
                </button>
                <button
                  type="button"
                  aria-expanded={repliesOpen}
                  onClick={() => setOpenReplies((prev) => withFlag(prev, thread.id, !prev[thread.id]))}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 font-mono text-xs font-bold text-zinc-400 transition hover:text-white"
                >
                  <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  {thread.replies.length} {thread.replies.length === 1 ? 'reply' : 'replies'}
                </button>
              </div>

              {threadErrors[thread.id] && <ErrorAlert message={threadErrors[thread.id]} className="mt-3" />}

              {repliesOpen && (
                <div className="mt-4 space-y-3 border-t border-slate-800 pt-3">
                  {thread.replies.length > 0 && (
                    <ul className="space-y-2">
                      {thread.replies.map((reply) => (
                        <li key={reply.id} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                          <p className="whitespace-pre-wrap text-xs text-slate-300">{reply.content}</p>
                          <p className="mt-1 font-mono text-[9px] text-zinc-500">
                            {reply.username}
                            {formatDate(reply.createdAt) && ` · ${formatDate(reply.createdAt)}`}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                  <form
                    className="flex gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void submitReply(thread.id);
                    }}
                  >
                    <label htmlFor={replyInputId} className="sr-only">
                      Reply to {thread.title}
                    </label>
                    <input
                      id={replyInputId}
                      value={draft}
                      maxLength={REPLY_MAX}
                      onChange={(event) => setReplyDrafts((prev) => ({ ...prev, [thread.id]: event.target.value }))}
                      placeholder="Write a reply..."
                      className={`h-9 flex-1 px-3 ${fieldClass}`}
                    />
                    <button
                      type="submit"
                      disabled={Boolean(replyPending[thread.id]) || !draft.trim()}
                      aria-label="Post reply"
                      className="flex cursor-pointer items-center justify-center rounded-lg bg-cyan-400 px-3 text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {replyPending[thread.id] ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
                    </button>
                  </form>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
