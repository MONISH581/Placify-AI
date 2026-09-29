/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ChevronRight, Loader2, Lock, Sparkles } from 'lucide-react';
import { ParticleCanvas, CountUp } from '../components/HeroEffects';
import { ErrorAlert } from '../components/StatusMessages';
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
  'h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-xs text-white outline-none transition focus:border-cyan-400';
const labelClass = 'mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500';

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
    { value: problems.length, label: 'PROBLEMS' },
    { value: companyCount, label: 'COMPANIES' },
    { value: LANGUAGES.length, label: 'LANGUAGES' },
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#070C16] text-white selection:bg-cyan-400 selection:text-black">
      <ParticleCanvas />

      <section className="relative z-10 px-6 pb-20 pt-12 md:px-12 lg:pt-16">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            <div className="glow-cyan inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-950/40 px-3.5 py-1.5 font-mono text-xs font-semibold text-cyan-300 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 animate-pulse text-cyan-400" aria-hidden="true" />
              <span>PLACEMENT PREPARATION PLATFORM</span>
            </div>

            <h1 className="font-heading text-4xl font-extrabold leading-[1.08] tracking-tight text-white md:text-6xl lg:text-7xl">
              Prepare for your <br />
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-500 bg-clip-text text-transparent">
                SDE placement
              </span>
            </h1>

            <p className="max-w-xl font-sans text-base leading-relaxed text-zinc-400">
              Practice coding problems with a real judge, study learning tracks, run mock interviews, check your resume, and
              track an estimated placement-readiness score.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <a
                href="#login"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-white px-6 py-3 text-xs font-bold text-black shadow-lg transition hover:bg-zinc-200"
              >
                Enter platform <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>

            <div className="grid max-w-lg grid-cols-3 gap-4 pt-6">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/5 bg-[#0a101f]/40 p-4 backdrop-blur-md">
                  <p className="font-mono text-2xl font-black text-white">
                    <CountUp end={stat.value} />
                  </p>
                  <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex w-full items-center justify-center lg:col-span-5">
            <div
              className="w-full max-w-md rounded-2xl border border-white/15 bg-slate-950/60 p-8 shadow-2xl backdrop-blur-xl"
              id="login"
            >
              <div className="mb-6 flex rounded-xl border border-white/5 bg-white/5 p-1" role="tablist" aria-label="Authentication mode">
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
                    className={`flex-1 cursor-pointer rounded-lg px-3 py-2 text-xs font-bold capitalize transition ${
                      mode === nextMode ? 'bg-cyan-400 font-black text-black shadow-sm' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {nextMode}
                  </button>
                ))}
              </div>

              <form className="space-y-4" onSubmit={handleSubmit} noValidate>
                <div>
                  <label htmlFor="auth-identifier" className={labelClass}>
                    {mode === 'register' ? 'Email' : 'Email / Username'}
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
                  className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-xs font-black text-white shadow-md transition hover:brightness-110 disabled:opacity-60"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Lock className="h-4 w-4" aria-hidden="true" />}
                  {mode === 'login' ? 'Sign in' : 'Create account'}
                </button>
              </form>

              <div className="mt-6 border-t border-white/5 pt-5">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-zinc-500">Demo accounts</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => loginAsDemo('student')}
                    className="cursor-pointer rounded-xl border border-white/5 bg-white/5 px-3 py-2.5 text-[10px] font-bold text-zinc-400 transition hover:border-cyan-400/30 hover:text-white disabled:opacity-60"
                  >
                    Student demo
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => loginAsDemo('admin')}
                    className="cursor-pointer rounded-xl border border-white/5 bg-white/5 px-3 py-2.5 text-[10px] font-bold text-zinc-400 transition hover:border-cyan-400/30 hover:text-white disabled:opacity-60"
                  >
                    Admin demo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
