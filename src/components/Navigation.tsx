import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Code2,
  BookOpen,
  GraduationCap,
  MessageSquare,
  FileText,
  Building2,
  Trophy,
  BriefcaseBusiness,
  Target,
  UserRound,
  Settings,
  Flame,
  LogOut,
  Sparkles,
} from "lucide-react";
import type { User } from "../types";

export type AppTab =
  | "dashboard"
  | "arena"
  | "tracks"
  | "placement"
  | "interview"
  | "resume"
  | "companies"
  | "contests"
  | "community"
  | "career"
  | "profile"
  | "admin";

interface NavigationProps {
  user: User | null;
  readinessScore: number;
  onLogout: () => void;
}

export const navItems: Array<{
  id: AppTab;
  path: string;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}> = [
  { id: "dashboard", path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "arena", path: "/arena", label: "Coding Arena", icon: Code2 },
  { id: "tracks", path: "/tracks", label: "Learning Tracks", icon: BookOpen },
  { id: "placement", path: "/placement", label: "Placement Hub", icon: GraduationCap },
  { id: "interview", path: "/interview", label: "Mock Interview", icon: MessageSquare },
  { id: "resume", path: "/resume", label: "Resume ATS", icon: FileText },
  { id: "companies", path: "/companies", label: "Company Prep", icon: Building2 },
  { id: "contests", path: "/contests", label: "Contests", icon: Trophy },
  { id: "community", path: "/community", label: "Community", icon: BriefcaseBusiness },
  { id: "career", path: "/career", label: "Career Roadmap", icon: Target },
  { id: "profile", path: "/profile", label: "Profile", icon: UserRound },
  { id: "admin", path: "/admin", label: "Admin Studio", icon: Settings, adminOnly: true },
];

export function Navigation({ user, readinessScore, onLogout }: NavigationProps) {
  const location = useLocation();

  if (!user) return null;

  const activeItem = navItems.find((item) => item.path === location.pathname) || navItems[0];

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0B0F19]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
        {/* Brand logo */}
        <Link to="/dashboard" className="flex items-center gap-2.5 group cursor-pointer">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-black font-black shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <Sparkles className="h-5 w-5 fill-current" />
          </div>
          <div>
            <span className="font-heading text-lg font-black tracking-tight text-white">
              Placify<span className="text-cyan-400">.AI</span>
            </span>
            <span className="ml-2 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-2 py-0.5 text-[9px] font-bold font-mono text-cyan-300 uppercase tracking-widest hidden sm:inline-block">
              {user.isAdmin ? "ADMIN CONSOLE" : "PLACEMENT ENGINE"}
            </span>
          </div>
        </Link>

        {/* User Status Strip */}
        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-3 md:flex">
            <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-400 font-mono">
              <Flame className="h-3.5 w-3.5 fill-current" />
              <span>{user.streak}d streak</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-xs font-bold text-cyan-300 font-mono">
              <span className="text-cyan-400">L{user.level}</span>
              <span>{user.xp} XP</span>
            </div>
          </div>

          <div className="flex items-center gap-2 border-l border-white/10 pl-4">
            <Link
              to="/profile"
              className="flex items-center gap-2 rounded-lg p-1 hover:bg-white/5 transition"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400/20 text-xs font-black text-cyan-300 font-mono border border-cyan-400/30">
                {user.username.slice(0, 2).toUpperCase()}
              </div>
              <span className="text-xs font-bold text-white hidden sm:inline-block">{user.username}</span>
            </Link>

            <button
              type="button"
              onClick={onLogout}
              title="Logout session"
              className="rounded-lg p-2 text-zinc-400 hover:bg-rose-500/10 hover:text-rose-400 transition cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Nav Bar */}
      <nav className="overflow-x-auto border-t border-white/5 bg-black/20 no-scrollbar">
        <div className="mx-auto flex max-w-7xl px-4 md:px-6">
          {navItems.map((item) => {
            if (item.adminOnly && !user.isAdmin) return null;
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.id}
                to={item.path}
                className={`flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-2.5 text-xs font-bold transition cursor-pointer ${
                  isActive
                    ? "border-cyan-400 bg-cyan-400/10 text-cyan-300 font-black"
                    : "border-transparent text-zinc-400 hover:border-white/20 hover:text-white"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-cyan-400" : "text-zinc-400"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
