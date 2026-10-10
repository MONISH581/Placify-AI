import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  BookOpen,
  Building2,
  Code2,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Search,
  Settings,
  Sun,
  Target,
  Trophy,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

export interface NavGroup {
  label: string;
  icon: React.ElementType;
  items: NavItem[];
}

export const topItems: NavItem[] = [{ path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }];

export const navGroups: NavGroup[] = [
  {
    label: 'Practice',
    icon: Code2,
    items: [
      { path: '/arena', label: 'Coding Arena', icon: Code2 },
      { path: '/tracks', label: 'Learning Tracks', icon: BookOpen },
      { path: '/contests', label: 'Contests', icon: Trophy },
    ],
  },
  {
    label: 'Prepare',
    icon: GraduationCap,
    items: [
      { path: '/interview', label: 'Mock Interview', icon: MessageSquare },
      { path: '/resume', label: 'Resume ATS', icon: FileText },
      { path: '/companies', label: 'Company Prep', icon: Building2 },
      { path: '/placement', label: 'Placement Hub', icon: GraduationCap },
    ],
  },
  {
    label: 'Grow',
    icon: Target,
    items: [
      { path: '/career', label: 'Career Roadmap', icon: Target },
      { path: '/community', label: 'Community', icon: Users },
    ],
  },
];

export const footerItems: NavItem[] = [
  { path: '/admin', label: 'Settings', icon: Settings, adminOnly: true },
  { path: '/profile', label: 'Account', icon: UserRound },
];

export const navItems: NavItem[] = [...topItems, ...navGroups.flatMap((group) => group.items), ...footerItems];

function Wordmark() {
  return (
    <Link to="/dashboard" className="flex items-center" aria-label="Placify home">
      <span className="font-heading text-xl font-bold leading-none tracking-tight text-white">Placify</span>
    </Link>
  );
}

function SideLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  return (
    <NavLink
      to={item.path}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
          isActive ? 'bg-slate-900 font-semibold text-white' : 'text-slate-400 hover:bg-slate-900/60 hover:text-white'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <item.icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'text-cyan-400' : ''}`} strokeWidth={1.5} aria-hidden="true" />
          <span className="truncate">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

function SectionLabel({ children, icon: Icon }: { children: string; icon?: React.ElementType }) {
  return (
    <p className="mb-2 mt-6 flex items-center gap-2 rounded-lg bg-cyan-400/10 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-400">
      {Icon && <Icon className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" />}
      {children}
    </p>
  );
}

function SidebarBody({ onNavigate, onOpenPalette }: { onNavigate?: () => void; onOpenPalette: () => void }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  if (!user) return null;

  return (
    <div className="flex h-full flex-col">
      <div className="px-6 pb-5 pt-6">
        <Wordmark />
      </div>

      <button
        type="button"
        onClick={onOpenPalette}
        className="mx-3 mb-4 flex cursor-pointer items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-left text-xs text-slate-400 transition hover:text-white"
      >
        <Search className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="flex-1">Jump to...</span>
        <kbd className="rounded border border-slate-700 px-1 font-mono text-[10px]">Ctrl K</kbd>
      </button>

      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 pb-3">
        <ul className="space-y-0.5">
          {topItems.map((item) => (
            <li key={item.path}>
              <SideLink item={item} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>

        {navGroups.map((group) => (
          <div key={group.label}>
            <SectionLabel icon={group.icon}>{group.label}</SectionLabel>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.path}>
                  <SideLink item={item} onNavigate={onNavigate} />
                </li>
              ))}
            </ul>
          </div>
        ))}

        {user.isAdmin && (
          <div>
            <SectionLabel icon={Settings}>Admin</SectionLabel>
            <ul>
              {footerItems
                .filter((item) => item.adminOnly)
                .map((item) => (
                  <li key={item.path}>
                    <SideLink item={item} onNavigate={onNavigate} />
                  </li>
                ))}
            </ul>
          </div>
        )}
      </nav>

      <div className="flex items-center gap-1 border-t border-slate-800 p-3">
        <Link
          to="/profile"
          onClick={onNavigate}
          aria-label="Open your account"
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-slate-900"
        >
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold uppercase text-white"
            aria-hidden="true"
          >
            {user.username.slice(0, 2)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-white">{user.username}</span>
            <span className="block text-[11px] text-slate-500">Level {user.level}</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          className="cursor-pointer rounded-md p-2 text-slate-400 transition hover:text-white"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
        </button>
        <button
          type="button"
          onClick={logout}
          title="Log out"
          aria-label="Log out"
          className="cursor-pointer rounded-md p-2 text-slate-400 transition hover:text-rose-400"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/** Fixed black sidebar on desktop; a slim top bar with a slide-in drawer on small screens. */
export function Navigation({ onOpenPalette }: { onOpenPalette: () => void }) {
  const { user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setDrawerOpen(false), [location.pathname]);

  if (!user) return null;

  return (
    <>
      <aside id="app-sidebar" className="fixed inset-y-0 left-0 z-30 hidden w-60 bg-paper lg:block">
        <SidebarBody onOpenPalette={onOpenPalette} />
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between bg-paper px-4 py-2.5 lg:hidden">
        <Wordmark />
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onOpenPalette}
            aria-label="Jump to a page"
            className="cursor-pointer rounded-md p-2 text-slate-300 hover:bg-slate-900"
          >
            <Search className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="cursor-pointer rounded-md p-2 text-slate-300 hover:bg-slate-900"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </header>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 cursor-pointer bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-64 bg-paper">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
              className="absolute right-2 top-3 z-10 cursor-pointer rounded-md p-1.5 text-slate-400 hover:bg-slate-900"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
            <SidebarBody
              onNavigate={() => setDrawerOpen(false)}
              onOpenPalette={() => {
                setDrawerOpen(false);
                onOpenPalette();
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
