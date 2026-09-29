import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  apiFetch,
  getCurrentUserFromServer,
  getStoredToken,
  onUnauthorized,
  removeStoredToken,
  setStoredToken,
} from '../services/api';
import type { User } from '../types';

/**
 * - checking: validating a stored token with the server
 * - authenticated: user loaded
 * - anonymous: no (valid) token
 * - unreachable: a token exists but the server could not be reached / errored (token kept, retry offered)
 */
export type AuthStatus = 'checking' | 'authenticated' | 'anonymous' | 'unreachable';

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  /** Error from the last failed session check (status "unreachable"). */
  sessionError: string | null;
  completeLogin: (user: User, token: string) => void;
  logout: () => void;
  /** Replace the current user with an authoritative copy returned by the server. */
  updateUser: (user: User) => void;
  /** Re-fetch /api/auth/me; keeps the current user on non-401 failures. */
  refreshUser: () => Promise<void>;
  /** Retry the startup session check (used from the "server unreachable" screen). */
  retrySession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Guards against partial user payloads so render code can rely on array/number fields. */
export function normalizeUser(user: User): User {
  return {
    ...user,
    isAdmin: Boolean(user.isAdmin),
    verified: Boolean(user.verified),
    xp: Number(user.xp) || 0,
    level: Number(user.level) || 1,
    streak: Number(user.streak) || 0,
    accuracy: Number(user.accuracy) || 0,
    lastActiveDate: user.lastActiveDate ?? null,
    problemsSolved: Array.isArray(user.problemsSolved) ? user.problemsSolved : [],
    badges: Array.isArray(user.badges) ? user.badges : [],
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>(() => (getStoredToken() ? 'checking' : 'anonymous'));
  const [sessionError, setSessionError] = useState<string | null>(null);
  // Incremented on login/logout so late /me responses cannot resurrect or clobber a session.
  const sessionVersion = useRef(0);

  const checkSession = useCallback(async () => {
    if (!getStoredToken()) {
      setUser(null);
      setStatus('anonymous');
      return;
    }
    const version = sessionVersion.current;
    setStatus('checking');
    setSessionError(null);
    const result = await getCurrentUserFromServer();
    if (version !== sessionVersion.current) return;

    if (result.ok && result.data?.user) {
      setUser(normalizeUser(result.data.user));
      setStatus('authenticated');
    } else if (!result.ok && result.status === 401) {
      // apiFetch already removed the token.
      setUser(null);
      setStatus('anonymous');
    } else {
      setUser(null);
      setSessionError(result.ok ? 'The server returned an unexpected session payload.' : result.error);
      setStatus('unreachable');
    }
  }, []);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  useEffect(
    () =>
      onUnauthorized(() => {
        sessionVersion.current += 1;
        setUser(null);
        setStatus('anonymous');
      }),
    [],
  );

  const completeLogin = useCallback((nextUser: User, token: string) => {
    sessionVersion.current += 1;
    setStoredToken(token);
    setSessionError(null);
    setUser(normalizeUser(nextUser));
    setStatus('authenticated');
  }, []);

  const logout = useCallback(() => {
    sessionVersion.current += 1;
    if (getStoredToken()) {
      // Best-effort server-side logout; the token is read synchronously before we clear it.
      void apiFetch<{ success: boolean }>('/api/auth/logout', { method: 'POST', timeoutMs: 5000 });
    }
    removeStoredToken();
    setUser(null);
    setSessionError(null);
    setStatus('anonymous');
  }, []);

  const updateUser = useCallback((nextUser: User) => {
    // Only refresh the signed-in user; never resurrect a session that was logged out while a request was in flight.
    setUser((current) => (current && current.id === nextUser.id ? normalizeUser(nextUser) : current));
  }, []);

  const refreshUser = useCallback(async () => {
    const version = sessionVersion.current;
    const result = await getCurrentUserFromServer();
    if (version !== sessionVersion.current) return;
    if (result.ok && result.data?.user) {
      setUser(normalizeUser(result.data.user));
    }
    // 401 is handled by the global unauthorized listener; other failures keep the current user.
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      sessionError,
      completeLogin,
      logout,
      updateUser,
      refreshUser,
      retrySession: checkSession,
    }),
    [user, status, sessionError, completeLogin, logout, updateUser, refreshUser, checkSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** For components rendered only behind <ProtectedRoute>: returns the signed-in user. */
export function useRequiredUser(): User {
  const { user } = useAuth();
  if (!user) throw new Error('useRequiredUser called without an authenticated user');
  return user;
}
