/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { NotFoundArt } from '../components/illustrations/Scenes';

export default function NotFoundPage() {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6 text-white">
      <div className="w-full max-w-md space-y-4 rounded-lg border border-white/10 bg-slate-950/70 p-8 text-center ">
        <NotFoundArt className="mx-auto h-36 w-full max-w-[16rem]" />
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-cyan-400">404</p>
        <h1 className="font-heading text-2xl font-bold">Page not found</h1>
        <p className="text-xs leading-relaxed text-zinc-400">
          There is nothing at <code className="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-cyan-300">{location.pathname}</code>.
        </p>
        <Link
          to={user ? '/dashboard' : '/login'}
          className="inline-flex items-center justify-center rounded-lg bg-cyan-400 px-5 py-2.5 text-xs font-bold text-black transition hover:bg-cyan-300"
        >
          {user ? 'Go to dashboard' : 'Go to sign in'}
        </Link>
      </div>
    </div>
  );
}
