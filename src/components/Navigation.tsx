import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  BookOpen,
  BriefcaseBusiness,
  Building2,
  Code2,
  FileText,
  Flame,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';

export const navItems: Array<{
  path: string;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}> = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/arena', label: 'Coding Arena', icon: Code2 },
  { path: '/tracks', label: 'Learning Tracks', icon: BookOpen },
  { path: '/placement', label: 'Placement Hub', icon: GraduationCap },
  { path: '/interview', label: 'Mock Interview', icon: MessageSquare },
  { path: '/resume', label: 'Resume ATS', icon: FileText },
  { path: '/companies', label: 'Company Prep', icon: Building2 },
  { path: '/contests', label: 'Contests', icon: Trophy },
  { path: '/community', label: 'Community', icon: BriefcaseBusiness },
  { path: '/career', label: 'Career Roadmap', icon: Target },
  { path: '/profile', label: 'Profile', icon: UserRound },
  { path: '/admin', label: 'Admin Studio', icon: Settings, adminOnly: true },
];

export function Navigation() {
  const { user, logout } = useAuth();
  const { analytics } = useAppData();

  if (!user) return null;

  const readiness = analytics?.readiness.score;

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0B0F19]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
        <Link to="/dashboard" className="group flex cursor-pointer items-center gap-2.5" aria-label="Placify dashboard">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 font-black text-black shadow-lg shadow-cyan-500/20 transition-transform group-hover:scale-105">
            <Sparkles className="h-5 w-5 fill-current" aria-hidden="true" />
          </div>
          <div>
            <span className="font-heading text-lg font-black tracking-tight text-white">
              Placify<span className="text-cyan-400">.AI</span>
            </span>
            <span className="ml-2 hidden rounded-full border border-cyan-500/30 bg-cyan-950/40 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-cyan-300 sm:inline-block">
              {user.isAdmin ? 'ADMIN CONSOLE' : 'PLACEMENT ENGINE'}
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-3 md:flex">
            <div
              className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 font-mono text-xs font-bold text-emerald-300"
              title={
                analytics?.readiness.isDemo
                  ? 'Estimated placement readiness (demo model trained on synthetic data)'
                  : 'Estimated placement readiness'
              }
            >
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{typeof readiness === 'number' ? `${readiness}% ready` : 'Readiness --'}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 font-mono text-xs font-bold text-amber-400">
              <Flame className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
              <span>{user.streak}d streak</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 font-mono text-xs font-bold text-cyan-300">
              <span className="text-cyan-400">L{user.level}</span>
              <span>{user.xp} XP</span>
            </div>
          </div>

          <div className="flex items-center gap-2 border-l border-white/10 pl-4">
            <Link to="/profile" className="flex items-center gap-2 rounded-lg p-1 transition hover:bg-white/5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-400/20 font-mono text-xs font-black text-cyan-300">
                {user.username.slice(0, 2).toUpperCase()}
              </div>
              <span className="hidden text-xs font-bold text-white sm:inline-block">{user.username}</span>
            </Link>

            <button
              type="button"
              onClick={logout}
              title="Log out"
              aria-label="Log out"
              className="cursor-pointer rounded-lg p-2 text-zinc-400 transition hover:bg-rose-500/10 hover:text-rose-400"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <nav aria-label="Main" className="no-scrollbar overflow-x-auto border-t border-white/5 bg-black/20">
        <div className="mx-auto flex max-w-7xl px-4 md:px-6">
          {navItems.map((item) => {
            if (item.adminOnly && !user.isAdmin) return null;
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex shrink-0 cursor-pointer items-center gap-2 border-b-2 px-3.5 py-2.5 text-xs font-bold transition ${
                    isActive
                      ? 'border-cyan-400 bg-cyan-400/10 font-black text-cyan-300'
                      : 'border-transparent text-zinc-400 hover:border-white/20 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-cyan-400' : 'text-zinc-400'}`} aria-hidden="true" />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
