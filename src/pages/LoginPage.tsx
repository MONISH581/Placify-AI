/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { ErrorAlert } from '../components/StatusMessages';
import { LoginArt } from '../components/illustrations/Scenes';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import { groupProblemsByCompany } from '../data/companies';
import { api } from '../services/api';
import { LANGUAGES, type AuthResponse } from '../types';

/** Seeded demo accounts (see CONTRACT.md "Demo accounts"). */
const DEMO_ACCOUNTS = {
  student: { identifier: 'student@placify.com', password: 'student123' },
  admin: { identifier: 'admin@placify.com', password: 'admin123' },
} as const;

type Mode = 'login' | 'register';

interface LocationState {
  from?: { pathname?: string; search?: string; hash?: string };
}

function resolveRedirect(state: unknown): string {
  const from = (state as LocationState | null)?.from;
  const pathname = from?.pathname;
  if (!pathname || pathname === '/login' || !pathname.startsWith('/')) return '/dashboard';
  return `${pathname}${from?.search ?? ''}${from?.hash ?? ''}`;
}

const inputClass =
  'h-11 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none transition focus:border-cyan-400';
const labelClass = 'mb-1.5 block text-xs font-semibold text-slate-300';

export default function LoginPage() {
  const { user, completeLogin } = useAuth();
  const { problems } = useAppData();
  const location = useLocation();
  const redirectTo = resolveRedirect(location.state);

  const [mode, setMode] = useState<Mode>('login');
  const [identifier, setIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const companyCount = useMemo(() => groupProblemsByCompany(problems).length, [problems]);

  if (user) {
    return <Navigate to={redirectTo} replace />;
  }

  const login = async (loginIdentifier: string, loginPassword: string) => {
    const trimmed = loginIdentifier.trim();
    if (!trimmed || !loginPassword) {
      setError('Please enter your email/username and password.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const payload = trimmed.includes('@')
        ? { email: trimmed, password: loginPassword }
        : { username: trimmed, password: loginPassword };
      const result = await api.post<AuthResponse>('/api/auth/login', payload, { auth: false });
      if (result.ok && result.data?.user && result.data?.token) {
        completeLogin(result.data.user, result.data.token);
      } else {
        setError(result.ok ? 'Unexpected response from the server.' : result.error);
      }
    } finally {
      setLoading(false);
    }
  };

  const register = async () => {
    const email = identifier.trim();
    const name = username.trim();
    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!/^[A-Za-z0-9_.-]{3,30}$/.test(name)) {
      setError("Username must be 3-30 characters: letters, digits, '.', '_' or '-'.");
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await api.post<AuthResponse>(
        '/api/auth/register',
        { email, username: name, password },
        { auth: false },
      );
      if (result.ok && result.data?.user && result.data?.token) {
        completeLogin(result.data.user, result.data.token);
      } else {
        setError(result.ok ? 'Unexpected response from the server.' : result.error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    void (mode === 'register' ? register() : login(identifier, password));
  };

  // Demo buttons always log in (never register), regardless of the selected tab.
  const loginAsDemo = (account: keyof typeof DEMO_ACCOUNTS) => {
    if (loading) return;
    const { identifier: demoIdentifier, password: demoPassword } = DEMO_ACCOUNTS[account];
    setMode('login');
    setIdentifier(demoIdentifier);
    setPassword(demoPassword);
    void login(demoIdentifier, demoPassword);
  };

  const stats = [
    { value: problems.length, label: 'problems' },
    { value: companyCount, label: 'companies' },
    { value: LANGUAGES.length, label: 'languages' },
  ];

  return (
    <div className="grid min-h-screen grid-cols-1 bg-paper text-white lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <section className="flex flex-col justify-between border-b border-slate-800 px-6 py-10 md:px-14 lg:border-b-0 lg:border-r lg:py-14">
        <p className="font-heading text-2xl font-semibold">Placify</p>

        <div className="my-14 max-w-xl lg:my-0">
          <h1 className="font-heading text-4xl font-semibold leading-[1.1] md:text-5xl">
            A steady place to prepare for your first software job.
          </h1>
          <p className="mt-5 text-base leading-relaxed text-slate-300">
            Solve problems against a real judge, work through learning tracks, rehearse interviews, check your resume, and see an
            estimated readiness score move as you practise.
          </p>

          <LoginArt className="mt-8 hidden w-full max-w-md md:block" />

          <dl className="mt-8 flex gap-10">
            {stats.map((stat) => (
              <div key={stat.label}>
                <dd className="font-heading text-3xl font-semibold">{stat.value}</dd>
                <dt className="font-mono text-[11px] uppercase tracking-widest text-slate-500">{stat.label}</dt>
              </div>
            ))}
          </dl>
        </div>

        <p className="hidden text-xs text-slate-500 lg:block">The readiness score is a practice signal, not a hiring prediction.</p>
      </section>

      <section className="flex items-center justify-center px-6 py-12 md:px-14" id="login">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex gap-6 border-b border-slate-800" role="tablist" aria-label="Authentication mode">
            {(['login', 'register'] as const).map((nextMode) => (
              <button
                key={nextMode}
                type="button"
                role="tab"
                aria-selected={mode === nextMode}
                onClick={() => {
                  setMode(nextMode);
                  setError(null);
                }}
                className={`-mb-px cursor-pointer border-b-2 pb-2 text-sm font-semibold transition-colors ${
                  mode === nextMode ? 'border-cyan-400 text-white' : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                {nextMode === 'login' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div>
              <label htmlFor="auth-identifier" className={labelClass}>
                {mode === 'register' ? 'Email' : 'Email or username'}
              </label>
              <input
                id="auth-identifier"
                type={mode === 'register' ? 'email' : 'text'}
                autoComplete={mode === 'register' ? 'email' : 'username'}
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                className={inputClass}
                placeholder={mode === 'register' ? 'you@example.com' : 'you@example.com or username'}
              />
            </div>

            {mode === 'register' && (
              <div>
                <label htmlFor="auth-username" className={labelClass}>
                  Username
                </label>
                <input
                  id="auth-username"
                  autoComplete="nickname"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className={inputClass}
                  placeholder="sde_pioneer"
                />
              </div>
            )}

            <div>
              <label htmlFor="auth-password" className={labelClass}>
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={inputClass}
                placeholder={mode === 'register' ? 'At least 6 characters' : '********'}
              />
            </div>

            {error && <ErrorAlert message={error} />}

            <button
              type="submit"
              disabled={loading}
              className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-cyan-400 text-sm font-semibold text-black transition-colors hover:bg-cyan-300 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div className="mt-8 border-t border-slate-800 pt-5">
            <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-slate-500">Just looking around?</p>
            <div className="flex gap-4 text-sm">
              <button
                type="button"
                disabled={loading}
                onClick={() => loginAsDemo('student')}
                className="cursor-pointer font-semibold text-cyan-400 underline-offset-2 hover:underline disabled:opacity-60"
              >
                Student demo
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => loginAsDemo('admin')}
                className="cursor-pointer font-semibold text-cyan-400 underline-offset-2 hover:underline disabled:opacity-60"
              >
                Admin demo
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
