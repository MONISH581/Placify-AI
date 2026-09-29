/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { ErrorAlert, LoadingBlock } from '../components/StatusMessages';
import { useRequiredUser } from '../context/AuthContext';
import { api, describeApiError } from '../services/api';
import type { Contest } from '../types';

export default function ContestsPage() {
  const user = useRequiredUser();
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const requestRef = useRef(0);

  const loadContests = useCallback(async () => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setLoadError(null);
    try {
      // The token is attached automatically so the server can compute isRegistered for this user.
      const result = await api.get<Contest[]>('/api/contests');
      if (requestId !== requestRef.current) return;
      if (result.ok && Array.isArray(result.data)) setContests(result.data);
      else setLoadError(result.ok ? 'Unexpected response format.' : result.error);
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, []);

  // Reload (and drop any previous user's registration state) whenever the signed-in user changes.
  useEffect(() => {
    setContests([]);
    setPending({});
    setErrors({});
    void loadContests();
  }, [loadContests, user.id]);

  const register = async (contestId: string) => {
    if (pending[contestId]) return;
    setPending((prev) => ({ ...prev, [contestId]: true }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[contestId];
      return next;
    });
    try {
      const result = await api.post<Contest>(`/api/contests/${encodeURIComponent(contestId)}/register`);
      if (result.ok && result.data?.id) {
        const updated = result.data;
        setContests((prev) =>
          prev.map((contest) =>
            contest.id === updated.id ? { ...contest, ...updated, isRegistered: updated.isRegistered ?? true } : contest,
          ),
        );
      } else {
        setErrors((prev) => ({ ...prev, [contestId]: result.ok ? 'Unexpected response from the server.' : describeApiError(result) }));
      }
    } finally {
      setPending((prev) => {
        const next = { ...prev };
        delete next[contestId];
        return next;
      });
    }
  };

  if (loading && contests.length === 0) return <LoadingBlock label="Loading contests..." />;

  return (
    <div className="space-y-4">
      {loadError && <ErrorAlert message={`Could not load contests: ${loadError}`} onRetry={() => void loadContests()} />}
      {!loadError && contests.length === 0 && (
        <p className="rounded-xl border border-slate-800 bg-[#161D2F] p-6 text-sm text-slate-400">No contests are scheduled right now.</p>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {contests.map((contest) => {
          const isPending = Boolean(pending[contest.id]);
          const start = new Date(contest.startTime);
          const startLabel = Number.isNaN(start.getTime()) ? 'TBA' : start.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
          return (
            <article key={contest.id} className="rounded-xl border border-slate-800 bg-[#161D2F] p-5 shadow-sm transition-all hover:border-cyan-500/20">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-heading text-xl font-bold text-white">{contest.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-300">{contest.description}</p>
                </div>
                <span className="shrink-0 rounded-lg border border-cyan-500/30 bg-cyan-950/30 px-3 py-1 font-mono text-xs font-black text-cyan-400">
                  {contest.durationMinutes} min
                </span>
              </div>
              <dl className="mt-5 grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-center">
                  <dt className="font-mono text-[10px] font-bold uppercase text-zinc-500">Problems</dt>
                  <dd className="font-mono text-lg font-black text-white">{contest.problems?.length ?? 0}</dd>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-center">
                  <dt className="font-mono text-[10px] font-bold uppercase text-zinc-500">Registrants</dt>
                  <dd className="font-mono text-lg font-black text-white">{contest.registrantsCount ?? 0}</dd>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-center">
                  <dt className="font-mono text-[10px] font-bold uppercase text-zinc-500">Starts</dt>
                  <dd className="mt-1 font-mono text-xs font-black text-white">{startLabel}</dd>
                </div>
              </dl>

              {errors[contest.id] && <ErrorAlert message={errors[contest.id]} className="mt-4" />}

              <button
                type="button"
                disabled={contest.isRegistered || isPending}
                onClick={() => void register(contest.id)}
                className={`mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-black transition disabled:cursor-not-allowed ${
                  contest.isRegistered
                    ? 'border-cyan-500/40 bg-cyan-600/20 text-cyan-300'
                    : 'border-slate-800 bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60'
                }`}
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {contest.isRegistered && <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                {contest.isRegistered ? 'Registered' : isPending ? 'Registering...' : 'Register for contest'}
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
