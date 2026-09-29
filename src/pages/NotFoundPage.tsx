/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Link, useLocation } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function NotFoundPage() {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6 text-white">
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-white/10 bg-slate-950/70 p-8 text-center shadow-2xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-400">
          <Compass className="h-6 w-6" aria-hidden="true" />
        </div>
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-cyan-400">404</p>
        <h1 className="font-heading text-2xl font-bold">Page not found</h1>
        <p className="text-xs leading-relaxed text-zinc-400">
          There is nothing at <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-cyan-300">{location.pathname}</code>.
        </p>
        <Link
          to={user ? '/dashboard' : '/login'}
          className="inline-flex items-center justify-center rounded-xl bg-cyan-400 px-5 py-2.5 text-xs font-black text-black transition hover:bg-cyan-300"
        >
          {user ? 'Go to dashboard' : 'Go to sign in'}
        </Link>
      </div>
    </div>
  );
}
