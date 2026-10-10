import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../services/api';
import type { DashboardAnalytics, Problem } from '../types';
import { useAuth } from './AuthContext';

interface AppDataContextValue {
  problems: Problem[];
  problemsLoading: boolean;
  problemsError: string | null;
  reloadProblems: () => Promise<void>;

  /** Server-computed analytics; the single source for the readiness score across the app. */
  analytics: DashboardAnalytics | null;
  analyticsLoading: boolean;
  analyticsError: string | null;
  refreshAnalytics: () => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [problems, setProblems] = useState<Problem[]>([]);
  const [problemsLoading, setProblemsLoading] = useState(true);
  const [problemsError, setProblemsError] = useState<string | null>(null);

  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  const problemsRequest = useRef(0);
  const analyticsRequest = useRef(0);
  const currentUserId = useRef<string | null>(userId);
  currentUserId.current = userId;

  const reloadProblems = useCallback(async () => {
    const requestId = ++problemsRequest.current;
    setProblemsLoading(true);
    setProblemsError(null);
    try {
      const result = await api.get<Problem[]>('/api/problems');
      if (requestId !== problemsRequest.current) return;
      if (result.ok && Array.isArray(result.data)) {
        setProblems(result.data);
      } else {
        setProblemsError(result.ok ? 'Unexpected problem list format from server.' : result.error);
      }
    } finally {
      if (requestId === problemsRequest.current) setProblemsLoading(false);
    }
  }, []);

  const fetchAnalytics = useCallback(async (forUserId: string) => {
    const requestId = ++analyticsRequest.current;
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      const result = await api.get<DashboardAnalytics>('/api/dashboard/analytics', { timeoutMs: 20_000 });
      // Drop stale responses (newer request, logout, or account switch).
      if (requestId !== analyticsRequest.current || currentUserId.current !== forUserId) return;
      if (result.ok && result.data?.readiness) {
        setAnalytics(result.data);
      } else {
        setAnalyticsError(result.ok ? 'Unexpected analytics format from server.' : result.error);
      }
    } finally {
      if (requestId === analyticsRequest.current) setAnalyticsLoading(false);
    }
  }, []);

  const refreshAnalytics = useCallback(async () => {
    if (currentUserId.current) await fetchAnalytics(currentUserId.current);
  }, [fetchAnalytics]);

  useEffect(() => {
    void reloadProblems();
  }, [reloadProblems]);

  useEffect(() => {
    if (!userId) {
      analyticsRequest.current += 1;
      setAnalytics(null);
      setAnalyticsError(null);
      setAnalyticsLoading(false);
      return;
    }
    void fetchAnalytics(userId);
  }, [userId, fetchAnalytics]);

  const value = useMemo<AppDataContextValue>(
    () => ({
      problems,
      problemsLoading,
      problemsError,
      reloadProblems,
      analytics,
      analyticsLoading,
      analyticsError,
      refreshAnalytics,
    }),
    [problems, problemsLoading, problemsError, reloadProblems, analytics, analyticsLoading, analyticsError, refreshAnalytics],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used inside <AppDataProvider>');
  return ctx;
}
