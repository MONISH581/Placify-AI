/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ChevronRight,
  Code2,
  FileText,
  Flame,
  GraduationCap,
  LayoutDashboard,
  Loader2,
  Lock,
  LogOut,
  MessageSquare,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  UserRound,
} from 'lucide-react';

import { CodingArena } from './components/CodingArena';
import { Dashboard } from './components/Dashboard';
import { LearningTracks } from './components/LearningTracks';
import { MockInterview } from './components/MockInterview';
import { PlacementHub } from './components/PlacementHub';
import { ResumeAnalyzer } from './components/ResumeAnalyzer';
import { companyData } from './data/companyPreparation';
import { placementSubjects, SubjectModule } from './data/placementHub';
import { careerPaths } from './data/roadmaps';
import type { User } from './types';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'motion/react';
import { AICoreVisual, ParticleCanvas, CountUp } from './components/AICoreVisual';
import { AiMentorPanel } from './components/AiMentorPanel';

type AppTab =
  | 'dashboard'
  | 'arena'
  | 'tracks'
  | 'placement'
  | 'interview'
  | 'resume'
  | 'companies'
  | 'contests'
  | 'community'
  | 'career'
  | 'profile'
  | 'admin';

const demoStudent = {
  email: 'monishsai581@gmail.com',
  password: 'student',
};

const demoAdmin = {
  email: 'admin@placify.com',
  password: 'admin',
};

const navItems: Array<{ id: AppTab; label: string; icon: React.ElementType; adminOnly?: boolean }> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'arena', label: 'Coding Arena', icon: Code2 },
  { id: 'tracks', label: 'Learning Tracks', icon: BookOpen },
  { id: 'placement', label: 'Placement Hub', icon: GraduationCap },
  { id: 'interview', label: 'Mock Interview', icon: MessageSquare },
  { id: 'resume', label: 'Resume ATS', icon: FileText },
  { id: 'companies', label: 'Company Prep', icon: Building2 },
  { id: 'contests', label: 'Contests', icon: Trophy },
  { id: 'community', label: 'Community', icon: BriefcaseBusiness },
  { id: 'career', label: 'Career Roadmap', icon: Target },
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'admin', label: 'Admin Studio', icon: Settings, adminOnly: true },
];

const tabCopy: Record<AppTab, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Student Command Center',
    subtitle: 'Live readiness, daily sprint, recommendations, and next coding task.',
  },
  arena: {
    title: 'Coding Arena',
    subtitle: 'Placify Judge problem solving with hints, editorials, submissions, and XP.',
  },
  tracks: {
    title: 'Learning Tracks',
    subtitle: 'Structured concepts, quizzes, examples, and AI-assisted explanations.',
  },
  placement: {
    title: 'Placement Hub',
    subtitle: 'OS, DBMS, CN, OOP, aptitude, flashcards, and checkpoint MCQs.',
  },
  interview: {
    title: 'AI Mock Interview',
    subtitle: 'Technical, HR, and behavioral practice with scorecards.',
  },
  resume: {
    title: 'Resume ATS Lab',
    subtitle: 'Scan resume content, find missing keywords, and improve placement fit.',
  },
  companies: {
    title: 'Company Preparation',
    subtitle: 'Targeted question sets, aptitude tests, and student interview experiences.',
  },
  contests: {
    title: 'Campus Contests',
    subtitle: 'Register for weekly placement contests and track competition readiness.',
  },
  community: {
    title: 'Student Community',
    subtitle: 'Ask doubts, share interview experiences, and discuss preparation plans.',
  },
  career: {
    title: 'Career Roadmap',
    subtitle: 'Choose a target role and follow milestone-based preparation paths.',
  },
  profile: {
    title: 'Placement Profile',
    subtitle: 'Account, progress, badges, and readiness summary.',
  },
  admin: {
    title: 'Admin Studio',
    subtitle: 'Create coding problems for students and coordinators.',
  },
};

function difficultyClass(diff: string) {
  if (diff === 'Easy') return 'border-cyan-500/30 bg-cyan-950/30 text-cyan-400';
  if (diff === 'Medium') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-rose-200 bg-rose-50 text-rose-700';
}

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('placify.session');
    return saved ? JSON.parse(saved) : null;
  });
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [selectedPathId, setSelectedPathId] = useState('faang-sde');
  const [problems, setProblems] = useState<any[]>([]);
  const [contests, setContests] = useState<any[]>([]);
  const [discussions, setDiscussions] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<SubjectModule[]>(placementSubjects);
  const [selectedProblem, setSelectedProblem] = useState<any | null>(null);
  const [registeredContestIds, setRegisteredContestIds] = useState<string[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataError, setDataError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) {
      localStorage.setItem('placify.session', JSON.stringify(user));
    } else {
      localStorage.removeItem('placify.session');
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadPlatformData();
  }, [user?.id]);

  const activePath = useMemo(
    () => careerPaths.find((path) => path.id === selectedPathId) || careerPaths[0],
    [selectedPathId],
  );

  const filteredProblems = useMemo(() => {
    const value = searchTerm.trim().toLowerCase();
    if (!value) return problems;
    return problems.filter((problem) => {
      const tags = Array.isArray(problem.tags) ? problem.tags.join(' ') : '';
      return `${problem.title} ${problem.difficulty} ${tags}`.toLowerCase().includes(value);
    });
  }, [problems, searchTerm]);

  const readinessScore = useMemo(() => {
    if (!user) return 0;
    const solvedFactor = Math.min(35, user.problemsSolved.length * 6);
    const xpFactor = Math.min(25, Math.round(user.xp / 120));
    const streakFactor = Math.min(20, user.streak);
    const accuracyFactor = Math.min(20, Math.round(user.accuracy / 5));
    return Math.min(100, solvedFactor + xpFactor + streakFactor + accuracyFactor);
  }, [user]);

  const loadPlatformData = async () => {
    setIsLoadingData(true);
    setDataError('');
    try {
      const [problemRes, contestRes, discussionRes] = await Promise.all([
        fetch('/api/problems'),
        fetch('/api/contests'),
        fetch('/api/discussions'),
      ]);

      if (!problemRes.ok || !contestRes.ok || !discussionRes.ok) {
        throw new Error('Unable to load one or more platform feeds.');
      }

      const [problemList, contestList, discussionList] = await Promise.all([
        problemRes.json(),
        contestRes.json(),
        discussionRes.json(),
      ]);

      setProblems(problemList);
      setContests(contestList);
      setDiscussions(discussionList);
      setSelectedProblem((current) => current || problemList[0] || null);
    } catch (err) {
      console.error(err);
      setDataError('Some live data could not be loaded. Check the local server and try again.');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleAuthenticated = (nextUser: User) => {
    setUser(nextUser);
    setActiveTab('dashboard');
    setSelectedProblem(null);
  };

  const handleLogout = () => {
    setUser(null);
    setProblems([]);
    setContests([]);
    setDiscussions([]);
    setSelectedProblem(null);
  };

  const handleAddXp = (amount: number, solvedProblemId?: string) => {
    setUser((current) => {
      if (!current) return current;
      const nextXp = current.xp + amount;
      const nextSolved = solvedProblemId && !current.problemsSolved.includes(solvedProblemId)
        ? [...current.problemsSolved, solvedProblemId]
        : current.problemsSolved;

      return {
        ...current,
        xp: nextXp,
        level: Math.floor(nextXp / 500) + 1,
        problemsSolved: nextSolved,
      };
    });
  };

  const handleSelectProblem = (problem: any) => {
    setSelectedProblem(problem);
    setActiveTab('arena');
  };

  const handleRegisterContest = async (contestId: string) => {
    if (registeredContestIds.includes(contestId)) return;
    await fetch(`/api/contests/${contestId}/register`, { method: 'POST' });
    setRegisteredContestIds((current) => [...current, contestId]);
    await loadPlatformData();
  };

  if (!user) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  const visibleNav = navItems.filter((item) => !item.adminOnly || user.isAdmin);
  const currentCopy = tabCopy[activeTab];

  return (
    <div className="min-h-screen bg-[#030712] text-white premium-grid">
      <div className="flex min-h-screen bg-black/10">
        {/* Glassmorphic Sidebar */}
        <aside className="hidden w-72 shrink-0 border-r border-white/5 bg-[#050b14]/85 backdrop-blur-xl lg:flex lg:flex-col">
          <div className="border-b border-white/5 p-5 bg-black/20">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 text-sm font-black text-white shadow-lg shadow-cyan-500/20">
                P
              </div>
              <div>
                <p className="font-heading text-lg font-bold tracking-tight text-white">Placify.ai</p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-cyan-400 font-mono">Career Command OS</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto p-4">
            {visibleNav.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left text-xs font-bold transition duration-200 cursor-pointer ${
                    active
                      ? 'border-cyan-400 bg-cyan-400/10 text-cyan-300 shadow-md shadow-cyan-500/5 glow-cyan'
                      : 'border-transparent text-zinc-400 hover:border-white/10 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="border-t border-white/5 p-4 bg-black/10">
            <div className="rounded-xl border border-cyan-500/20 bg-[#050b14]/50 p-4 backdrop-blur-md">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 font-mono">OS readiness</span>
                <span className="text-xs font-black text-cyan-300 font-mono">{readinessScore}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/5 p-[1px]">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-400 transition-all duration-500" style={{ width: `${readinessScore}%` }} />
              </div>
            </div>
          </div>
        </aside>

        {/* Main Workspace Frame */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Glassmorphic Header */}
          <header className="sticky top-0 z-30 border-b border-white/5 bg-slate-950/45 px-6 py-4.5 backdrop-blur-xl flex flex-col justify-between">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 text-sm font-black text-white lg:hidden">
                  P
                </div>
                <div className="min-w-0">
                  <h1 className="font-heading text-lg font-bold tracking-tight text-white md:text-xl">
                    {currentCopy.title}
                  </h1>
                  <p className="truncate text-xs text-zinc-400 font-sans mt-0.5">{currentCopy.subtitle}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[220px] flex-1 md:flex-none">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-550" />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search problems, tags..."
                    className="h-10 w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 text-xs text-white outline-none transition focus:border-cyan-400 focus:bg-black/30"
                  />
                </div>
                <div className="hidden items-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-950/20 px-3.5 py-2 text-xs font-bold text-cyan-300 md:flex font-mono">
                  <Flame className="h-4 w-4 text-cyan-400 animate-pulse" />
                  {user.streak} day streak
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-bold text-zinc-300 transition hover:border-white hover:text-white cursor-pointer"
                  title="Log out"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            </div>

            {/* Mobile Nav Options */}
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {visibleNav.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`shrink-0 rounded-lg border px-3.5 py-2 text-[10px] font-bold transition cursor-pointer ${
                    activeTab === item.id
                      ? 'border-cyan-400 bg-cyan-400/10 text-cyan-300'
                      : 'border-white/5 bg-white/5 text-zinc-400 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </header>

          {/* Main workspace view content */}
          <main className="flex-1 overflow-y-auto p-6 md:p-8">
            {dataError && (
              <div className="mb-6 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs font-bold text-rose-400">
                {dataError}
              </div>
            )}

            {isLoadingData && problems.length === 0 ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-white/5 bg-[#121624]/60 backdrop-blur-md">
                <Loader2 className="mb-3 h-8 w-8 animate-spin text-amber-400" />
                <p className="text-xs font-bold text-zinc-400 font-mono">Provisioning placement data...</p>
              </div>
            ) : (
              <TabContent
                activeTab={activeTab}
                user={user}
                readinessScore={readinessScore}
                problems={filteredProblems}
                allProblems={problems}
                contests={contests}
                discussions={discussions}
                subjects={subjects}
                selectedProblem={selectedProblem}
                selectedPathId={selectedPathId}
                activePath={activePath}
                registeredContestIds={registeredContestIds}
                onNavigate={setActiveTab}
                onSelectProblem={handleSelectProblem}
                onSetSelectedProblem={setSelectedProblem}
                onAddXp={handleAddXp}
                onRegisterContest={handleRegisterContest}
                onReloadData={loadPlatformData}
                onSetSelectedPathId={setSelectedPathId}
                onSetSubjects={setSubjects}
              />
            )}
          </main>
        </div>
      </div>

      {/* Persistent slide-out SDE AI Mentor */}
      <AiMentorPanel userId={user.id} activeTab={activeTab} />
    </div>
  );
}

function VisionProDisplay() {
  const containerRef = useRef<HTMLDivElement>(null);
  const card1Ref = useRef<HTMLDivElement>(null);
  const card2Ref = useRef<HTMLDivElement>(null);

  const [coords1, setCoords1] = useState({ x: 0, y: 0 });
  const [coords2, setCoords2] = useState({ x: 0, y: 0 });
  const [hover1, setHover1] = useState(false);
  const [hover2, setHover2] = useState(false);

  const rotateXVal = useMotionValue(0);
  const rotateYVal = useMotionValue(0);

  const rotateX = useSpring(rotateXVal, { damping: 25, stiffness: 120 });
  const rotateY = useSpring(rotateYVal, { damping: 25, stiffness: 120 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const x = (e.clientX - rect.left) / width - 0.5;
    const y = (e.clientY - rect.top) / height - 0.5;

    rotateXVal.set(-y * 12);
    rotateYVal.set(x * 12);
  };

  const handleCard1MouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = card1Ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords1({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setHover1(true);
  };

  const handleCard2MouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = card2Ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords2({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setHover2(true);
  };

  const handleMouseLeave = () => {
    rotateXVal.set(0);
    rotateYVal.set(0);
    setHover1(false);
    setHover2(false);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full h-[500px] flex items-center justify-center select-none"
      style={{ perspective: 1200 }}
    >
      {/* Ambient background glows */}
      <div className="absolute w-72 h-72 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none -top-10 -right-10 animate-pulse" />
      <div className="absolute w-72 h-72 rounded-full bg-blue-600/10 blur-3xl pointer-events-none -bottom-10 -left-10" />

      {/* Giant background 'P' */}
      <div className="absolute text-[30rem] font-black text-white/5 font-heading pointer-events-none select-none z-0 translate-x-20 leading-none">
        P
      </div>

      {/* 3D Transform Wrapper */}
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
        className="relative w-full h-full flex items-center justify-center z-10"
      >
        {/* Card 1: LIVE READINESS (Top Right/Back Layer) */}
        <motion.div
          ref={card1Ref}
          onMouseMove={handleCard1MouseMove}
          onMouseEnter={() => setHover1(true)}
          onMouseLeave={() => setHover1(false)}
          style={{ 
            transform: 'translateZ(15px)',
            boxShadow: '0 30px 100px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.12), inset 0 -1px 0 rgba(255, 255, 255, 0.05)'
          }}
          className="absolute right-4 top-12 w-[340px] rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-3xl transition-all duration-300 hover:border-cyan-400/35 overflow-hidden cursor-default"
        >
          {/* Spotlight glass glare effect */}
          <div
            className="pointer-events-none absolute inset-0 z-0 rounded-3xl transition-opacity duration-300"
            style={{
              opacity: hover1 ? 1 : 0,
              background: `radial-gradient(300px circle at ${coords1.x}px ${coords1.y}px, rgba(6, 182, 212, 0.12), transparent 80%)`
            }}
          />

          <div className="relative z-10">
            {/* Header: Title and Percentage */}
            <div className="mb-6 flex items-center justify-between">
              <span className="text-[10px] font-black tracking-widest text-zinc-300 uppercase font-mono">
                LIVE READINESS
              </span>
              <span className="rounded-lg bg-gradient-to-r from-cyan-400 to-cyan-500 px-2.5 py-1 text-xs font-black text-black font-mono shadow-sm">
                92%
              </span>
            </div>

            {/* Sprint List Items */}
            <div className="space-y-3">
              {[
                { name: 'Amazon DP Sprint', id: '01' },
                { name: 'W3 CSS Grid', id: '02' },
                { name: 'Dynamic Programming', id: '03' },
                { name: 'Recursion BFS/DFS', id: '04' }
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 py-3 hover:border-cyan-500/20 hover:bg-white/10 transition duration-200"
                >
                  <span className="text-xs font-bold text-zinc-200">{item.name}</span>
                  <span className="text-[10px] font-black text-cyan-400 font-mono">{item.id}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Card 2: COMPANY-WISE QUEUE (Bottom Left/Front Layer, Overlapping) */}
        <motion.div
          ref={card2Ref}
          onMouseMove={handleCard2MouseMove}
          onMouseEnter={() => setHover2(true)}
          onMouseLeave={() => setHover2(false)}
          style={{ 
            transform: 'translateZ(45px)',
            boxShadow: '0 30px 100px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.12), inset 0 -1px 0 rgba(255, 255, 255, 0.05)'
          }}
          className="absolute left-4 bottom-12 w-[340px] rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-3xl transition-all duration-300 hover:border-cyan-400/35 overflow-hidden cursor-default"
        >
          {/* Spotlight glass glare effect */}
          <div
            className="pointer-events-none absolute inset-0 z-0 rounded-3xl transition-opacity duration-300"
            style={{
              opacity: hover2 ? 1 : 0,
              background: `radial-gradient(300px circle at ${coords2.x}px ${coords2.y}px, rgba(6, 182, 212, 0.12), transparent 80%)`
            }}
          />

          <div className="relative z-10 space-y-3">
            <span className="text-[10px] font-black tracking-widest text-cyan-400 uppercase font-mono">
              COMPANY-WISE QUEUE
            </span>
            <h3 className="font-heading text-xl font-bold text-white tracking-tight leading-snug">
              Google Graph Route Planner
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans font-medium">
              Graphs, BFS, DFS, connected components
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: (user: User) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState(demoStudent.email);
  const [username, setUsername] = useState('student');
  const [password, setPassword] = useState('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  const handleMouseMoveCoords = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const submitAuth = async (event?: React.FormEvent, demo?: typeof demoStudent) => {
    event?.preventDefault();
    setLoading(true);
    setError('');

    const payload = demo
      ? demo
      : mode === 'login'
        ? { email, password }
        : { email, username, password };

    try {
      const res = await fetch(mode === 'login' || demo ? '/api/auth/login' : '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed.');
      onAuthenticated(data.user);
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const tickerCompanies = [
    { name: 'Google', logo: '🔍' },
    { name: 'Amazon', logo: '📦' },
    { name: 'Microsoft', logo: '💻' },
    { name: 'Meta', logo: '👥' },
    { name: 'Apple', logo: '🍏' },
    { name: 'Netflix', logo: '🎬' },
    { name: 'NVIDIA', logo: '🎮' },
    { name: 'Stripe', logo: '💳' },
    { name: 'Adobe', logo: '🎨' },
    { name: 'Goldman Sachs', logo: '📊' },
    { name: 'Oracle', logo: '🗄️' },
    { name: 'TCS', logo: '💼' }
  ];

  return (
    <div 
      className="min-h-screen bg-[#030712] text-white relative overflow-hidden font-sans"
      onMouseMove={handleMouseMoveCoords}
    >
      {/* Background Interactive Lighting Spotlight */}
      <div
        className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300 hidden md:block"
        style={{
          background: `radial-gradient(750px circle at ${coords.x}px ${coords.y}px, rgba(6, 182, 212, 0.05), transparent 80%)`
        }}
      />

      {/* Floating Particles Core */}
      <ParticleCanvas />

      <section className="relative min-h-screen overflow-hidden flex flex-col justify-between">
        {/* Header Navigation */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 25 }}
          className="relative z-20 flex items-center justify-between px-6 py-6 md:px-12 backdrop-blur-sm bg-black/10 border-b border-white/5"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-lg font-black text-black shadow-lg">
              P
            </div>
            <div>
              <p className="font-heading text-xl font-bold tracking-tight text-white leading-none">Placify.ai</p>
              <p className="text-[8px] font-bold uppercase tracking-widest text-cyan-400 font-mono mt-1">PREMIUM PLACEMENT SUITE</p>
            </div>
          </div>
          <a
            href="#login"
            className="rounded-xl border border-white/15 bg-white/5 px-6 py-2 text-xs font-bold text-white backdrop-blur transition hover:bg-white hover:text-slate-950 hover:border-white shadow-sm"
          >
            Login
          </a>
        </motion.header>

        {/* Hero Section */}
        <div className="relative z-10 mx-auto grid min-h-[calc(100vh-140px)] max-w-7xl grid-cols-1 items-center gap-12 px-6 py-12 md:px-12 lg:grid-cols-12">
          {/* Hero Left Content */}
          <div className="lg:col-span-7 space-y-6">
            <motion.span 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', damping: 20 }}
              className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/30 px-3.5 py-1.5 text-[9px] font-bold uppercase tracking-widest text-cyan-400 font-mono shadow-sm glow-cyan"
            >
              <Sparkles className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
              STUDENT CAREER OPERATING SYSTEM
            </motion.span>
            
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', damping: 22, delay: 0.1 }}
              className="font-heading text-4xl font-extrabold tracking-tight md:text-[52px] leading-[1.15] text-white"
            >
              Placify Judge for coding, placements, and career launches.
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', damping: 25, delay: 0.2 }}
              className="max-w-xl text-sm leading-relaxed text-zinc-400 font-sans"
            >
              A polished practice platform with 500 placement problems, W3Schools-style learning, company-wise prep, mock interviews, resume ATS checks, and student progress intelligence.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', damping: 25, delay: 0.3 }}
              className="flex flex-wrap gap-4 pt-2"
            >
              <a
                href="#login"
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-6 py-3 text-xs font-bold text-black shadow-lg transition hover:bg-zinc-200 cursor-pointer"
              >
                Enter platform <ChevronRight className="h-4 w-4" />
              </a>
              <a
                href="#product-preview"
                className="rounded-xl border border-white/15 bg-transparent px-6 py-3 text-xs font-bold text-white hover:bg-white/5 transition cursor-pointer"
              >
                View features
              </a>
            </motion.div>

            {/* Dashboard counters */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', damping: 25, delay: 0.4 }}
              className="grid grid-cols-3 gap-4 max-w-lg pt-6"
            >
              {[
                { value: 500, label: 'PROBLEMS', isCountUp: true },
                { value: 'W3', label: 'TOPIC MAP', isCountUp: false },
                { value: 32, label: 'COMPANIES', isCountUp: true }
              ].map((stat, idx) => (
                <div key={idx} className="rounded-2xl border border-white/5 bg-[#0a101f]/40 p-4.5 backdrop-blur-md glow-cyan">
                  <p className="text-2xl font-black text-white font-mono">
                    {stat.isCountUp ? <CountUp end={stat.value as number} /> : stat.value}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mt-1 font-mono">{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Hero Right: Overlapping glass cards display */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 20, delay: 0.2 }}
            className="relative w-full h-[500px] lg:col-span-5 flex items-center justify-center"
          >
            <VisionProDisplay />
          </motion.div>
        </div>

        {/* Scrolling company logo cloud ticker */}
        <div className="relative overflow-hidden w-full py-8 border-y border-white/5 bg-black/30 backdrop-blur-sm z-10">
          <div className="animate-ticker flex gap-16 items-center">
            {/* Duplicate to allow endless cycle */}
            {[...tickerCompanies, ...tickerCompanies].map((company, index) => (
              <div key={index} className="flex items-center gap-3 text-zinc-400 font-bold hover:text-white transition select-none cursor-default">
                <span className="text-2xl">{company.logo}</span>
                <span className="text-xs font-mono tracking-widest uppercase">{company.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

        <section id="product-preview" className="relative z-10 border-b border-white/5 bg-black/25 px-6 py-20 md:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest font-mono">WORKSPACE SUITE</span>
            <h2 className="font-heading text-3xl font-bold tracking-tight text-white md:text-4xl">Engineered for Technical Mastery</h2>
            <p className="text-sm text-zinc-400">Placify provides a highly structured operating framework covering every layer of the recruitment funnel.</p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              ['Placify Judge', 'Timed coding arena, progressive hints, editorials, and sandboxed test cases.', 'Code2'],
              ['Gamified Topics Map', 'Syllabus tracks covering Python, Java, C++, SQL, and core CS fundamentals.', 'BookOpen'],
              ['Mock Assessment loops', 'Simulated interactive behavioral, HR, and technical coaching panels.', 'MessageSquare'],
              ['Resume ATS Scans', 'ATS compatibility scoring, skills gaps matching, and formatting advice.', 'FileText'],
            ].map(([title, body, icon], idx) => (
              <motion.div 
                key={title} 
                whileHover={{ y: -8, scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="rounded-2xl border border-white/5 bg-[#0a101f]/60 p-6 shadow-xl backdrop-blur-md flex flex-col justify-between hover:border-cyan-500/20 transition-all cursor-default"
              >
                <div className="space-y-4">
                  <div className="h-10 w-10 rounded-xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center text-cyan-400 glow-cyan">
                    {icon === 'Code2' ? <Code2 className="h-5 w-5" /> : icon === 'BookOpen' ? <BookOpen className="h-5 w-5" /> : icon === 'MessageSquare' ? <MessageSquare className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                  </div>
                  <h3 className="font-heading text-lg font-bold text-white">{title}</h3>
                  <p className="text-xs leading-relaxed text-zinc-400">{body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Login Section */}
      <section id="login" className="relative z-10 min-h-screen flex items-center px-6 py-20 md:px-12 bg-black/10">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-2 w-full">
          <div className="space-y-4">
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest font-mono">SECURE AUTHENTICATION</span>
            <h2 className="font-heading text-3xl font-bold tracking-tight text-white md:text-5xl">
              Initialize Your Command Console.
            </h2>
            <p className="max-w-md text-sm leading-relaxed text-zinc-400 font-sans">
              Log in utilizing the pre-configured demo student profile to check student interfaces, or access coordinators study plans inside the admin studio.
            </p>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', damping: 25 }}
            className="rounded-2xl border border-white/15 bg-slate-950/45 p-8 shadow-2xl backdrop-blur-xl max-w-md w-full ml-auto hover:border-cyan-500/10 transition-all"
          >
            <div className="mb-6 flex rounded-xl bg-white/5 p-1 border border-white/5">
              {(['login', 'register'] as const).map((nextMode) => (
                <button
                  key={nextMode}
                  type="button"
                  onClick={() => setMode(nextMode)}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold capitalize transition cursor-pointer ${
                    mode === nextMode ? 'bg-cyan-400 text-black shadow-sm font-black' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {nextMode}
                </button>
              ))}
            </div>

            <form className="space-y-4" onSubmit={submitAuth}>
              {mode === 'register' && (
                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-mono">Username</span>
                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-xs outline-none text-white transition focus:border-cyan-400 focus:bg-black/40"
                    placeholder="sde_pioneer"
                  />
                </label>
              )}

              <label className="block">
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-mono">Email or Username</span>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-xs outline-none text-white transition focus:border-cyan-400 focus:bg-black/40"
                  placeholder="candidate@placify.ai"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-mono">Security Pin / Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-xs outline-none text-white transition focus:border-cyan-400 focus:bg-black/40"
                  placeholder="••••••••"
                />
              </label>

              {error && (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3.5 py-2.5 text-xs font-semibold text-rose-400">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-xs font-black text-white transition hover:brightness-110 disabled:opacity-60 cursor-pointer shadow-md shadow-cyan-500/10"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                {mode === 'login' ? 'Access Command Console' : 'Initialize Account'}
              </button>
            </form>

            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/5 pt-5">
              <button
                type="button"
                onClick={() => submitAuth(undefined, demoStudent)}
                className="rounded-xl border border-white/5 bg-white/5 px-3 py-2.5 text-[10px] font-bold text-zinc-400 transition hover:border-cyan-400/30 hover:text-white cursor-pointer"
              >
                Student Demo
              </button>
              <button
                type="button"
                onClick={() => submitAuth(undefined, demoAdmin)}
                className="rounded-xl border border-white/5 bg-white/5 px-3 py-2.5 text-[10px] font-bold text-zinc-400 transition hover:border-cyan-400/30 hover:text-white cursor-pointer"
              >
                Admin Coordinator
              </button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

function TabContent(props: {
  activeTab: AppTab;
  user: User;
  readinessScore: number;
  problems: any[];
  allProblems: any[];
  contests: any[];
  discussions: any[];
  subjects: SubjectModule[];
  selectedProblem: any | null;
  selectedPathId: string;
  activePath: (typeof careerPaths)[number];
  registeredContestIds: string[];
  onNavigate: (tab: AppTab) => void;
  onSelectProblem: (problem: any) => void;
  onSetSelectedProblem: (problem: any | null) => void;
  onAddXp: (xp: number, solvedProblemId?: string) => void;
  onRegisterContest: (contestId: string) => void;
  onReloadData: () => void;
  onSetSelectedPathId: (id: string) => void;
  onSetSubjects: React.Dispatch<React.SetStateAction<SubjectModule[]>>;
}) {
  const {
    activeTab,
    user,
    readinessScore,
    problems,
    allProblems,
    contests,
    discussions,
    subjects,
    selectedProblem,
    selectedPathId,
    activePath,
    registeredContestIds,
    onNavigate,
    onSelectProblem,
    onSetSelectedProblem,
    onAddXp,
    onRegisterContest,
    onReloadData,
    onSetSelectedPathId,
  } = props;

  if (activeTab === 'dashboard') {
    return (
      <div className="space-y-5">
        <ReadinessBand user={user} readinessScore={readinessScore} problems={allProblems} onNavigate={onNavigate} />
        <Dashboard user={user} problems={problems} onSelectProblem={onSelectProblem} onNavigate={onNavigate as any} />
      </div>
    );
  }

  if (activeTab === 'arena') {
    return (
      <CodingArena
        problems={problems}
        selectedProblem={selectedProblem}
        onSelectProblem={onSetSelectedProblem}
        userId={user.id}
        onSubmissionSuccess={onAddXp}
        solvedProblemIds={user.problemsSolved}
        userXp={user.xp}
      />
    );
  }

  if (activeTab === 'tracks') return <LearningTracks onAddXp={onAddXp} />;
  if (activeTab === 'placement') return <PlacementHub onAddXp={onAddXp} subjects={subjects} />;
  if (activeTab === 'interview') return <MockInterview userId={user.id} onAddXp={onAddXp} />;
  if (activeTab === 'resume') return <ResumeAnalyzer />;
  if (activeTab === 'companies') return <CompanyPrep onSelectProblem={onSelectProblem} onNavigate={onNavigate} />;
  if (activeTab === 'contests') {
    return (
      <ContestsView
        contests={contests}
        registeredContestIds={registeredContestIds}
        onRegisterContest={onRegisterContest}
      />
    );
  }
  if (activeTab === 'community') {
    return <CommunityView user={user} discussions={discussions} onReloadData={onReloadData} />;
  }
  if (activeTab === 'career') {
    return (
      <CareerRoadmap
        activePath={activePath}
        selectedPathId={selectedPathId}
        onSetSelectedPathId={onSetSelectedPathId}
      />
    );
  }
  if (activeTab === 'profile') {
    return <ProfileView user={user} readinessScore={readinessScore} problems={allProblems} />;
  }
  return <AdminStudio onReloadData={onReloadData} onNavigate={onNavigate} />;
}

function ReadinessBand({
  user,
  readinessScore,
  problems,
  onNavigate,
}: {
  user: User;
  readinessScore: number;
  problems: any[];
  onNavigate: (tab: AppTab) => void;
}) {
  const stats = [
    { label: 'Readiness', value: `${readinessScore}%`, icon: ShieldCheck, color: 'text-cyan-400' },
    { label: 'Solved', value: `${user.problemsSolved.length}/${problems.length || 0}`, icon: CheckCircle2, color: 'text-cyan-600' },
    { label: 'XP level', value: `L${user.level}`, icon: Award, color: 'text-violet-600' },
    { label: 'Accuracy', value: `${user.accuracy}%`, icon: BarChart3, color: 'text-amber-600' },
  ];

  return (
    <section className="rounded-lg border border-slate-800 bg-[#161D2F] p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-lg border border-slate-800/60 bg-slate-955/45 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-zinc-400">{stat.label}</span>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <p className="text-2xl font-black text-white">{stat.value}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-950 p-4 text-white">
        <div>
          <p className="text-sm font-bold">Next best move</p>
          <p className="text-sm text-slate-300">Solve one medium problem, complete one subject MCQ, and run one resume scan today.</p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('arena')}
          className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-slate-100"
        >
          Start practice
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}

function CompanyPrep({ onSelectProblem, onNavigate }: { onSelectProblem: (problem: any) => void; onNavigate?: (tab: any) => void }) {
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);
  const [loadingStudyPlan, setLoadingStudyPlan] = useState<string | null>(null);
  const [studyPlans, setStudyPlans] = useState<Record<string, any>>({});

  const generatePlan = async (companyId: string, companyName: string) => {
    setLoadingStudyPlan(companyId);
    try {
      const res = await fetch('/api/roadmap/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentYear: '3rd Year',
          skills: 'Data Structures, Arrays, Strings, basic system APIs',
          targetCompany: companyName,
          targetRole: 'Software Engineer SDE-1'
        })
      });
      const data = await res.json();
      setStudyPlans(prev => ({ ...prev, [companyId]: data }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStudyPlan(null);
    }
  };

  const getCompanyTimeline = (companyId: string) => {
    switch (companyId) {
      case 'google':
        return [
          { round: 'Round 1: Screening', text: 'Online coding challenge on basic trees/graphs.' },
          { round: 'Round 2: Technical L1', text: 'Deep dive on Directed Acyclic Graph paths and complexity.' },
          { round: 'Round 3: Technical L2', text: 'Binary tree recursion, boundary constraints and heaps.' },
          { round: 'Round 4: Googleyness', text: 'Behavioral situation scenarios and leadership fit.' }
        ];
      case 'amazon':
        return [
          { round: 'Round 1: OA Assess', text: 'Aptitude tests plus 2 medium algorithms.' },
          { round: 'Round 2: SDE Coding', text: 'DP optimization structures and dynamic arrays.' },
          { round: 'Round 3: System Design', text: 'LRU cache mechanics and high throughput indices.' },
          { round: 'Round 4: Leadership', text: 'STAR scenarios addressing Amazon leadership principles.' }
        ];
      case 'infosys':
        return [
          { round: 'Round 1: OA Hack', text: 'InfyTQ assessment covering Java/Python MCQ.' },
          { round: 'Round 2: Interview', text: 'Java exception hierarchy and relational queries.' }
        ];
      default:
        return [
          { round: 'Round 1: Aptitude', text: 'Quantitative standard deviation, clocks, matrices.' },
          { round: 'Round 2: SDE Practice', text: 'C command args, strings reverse loops.' },
          { round: 'Round 3: Panel HR', text: 'Collaboration checks, projects outline and verify.' }
        ];
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {companyData.map((company) => {
          const isExpanded = expandedCompany === company.id;
          const plan = studyPlans[company.id];

          return (
            <motion.article               className="rounded-2xl border border-white/5 bg-[#0a101f]/60 p-6 shadow-xl backdrop-blur-md flex flex-col justify-between hover:border-cyan-500/10 transition-all cursor-default"
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{company.logo}</span>
                    <h2 className="font-heading text-lg font-bold text-white leading-normal">{company.name}</h2>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-mono mt-1">
                    {company.questions.length} curated problems | {company.aptitudeTests.length} aptitude matrices
                  </p>
                </div>
                <span className={`rounded-xl border px-3 py-1 text-[9px] font-black font-mono ${company.bgColor}`}>
                  {company.id.toUpperCase()} TRACK
                </span>
              </div>

              {/* Curated Questions Mini-Stack */}
              <div className="space-y-2.5">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-mono block">Curated Questions</span>
                {company.questions.map((question) => (
                  <div 
                    key={question.title} 
                    onClick={() => onSelectProblem({
                      id: `company-${company.id}-${question.title.toLowerCase().replace(/\s+/g, '-')}`,
                      title: question.title,
                      difficulty: question.difficulty,
                      tags: [company.name, question.type],
                      description: `Practice this standard ${company.name} interview challenge: ${question.title}. Provide an optimal implementation.`,
                      constraints: 'Time limit: 1.0s, Space limit: 256MB.',
                      inputFormat: 'Standard interview input structure.',
                      outputFormat: 'Print the computed response.',
                      examples: [{ input: 'sample data', output: 'expected answer' }],
                      hints: ['Evaluate structural dimensions.', 'Leverage caching maps.'],
                      editorial: 'Analyze edge cases and track stack overflows.'
                    })}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-black/20 p-3 hover:border-cyan-500/20 transition cursor-pointer"
                  >
                    <div>
                      <p className="text-xs font-bold text-white">{question.title}</p>
                      <p className="text-[9px] text-zinc-400 font-mono mt-0.5">{question.type}</p>
                    </div>
                    <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[8px] font-bold font-mono ${difficultyClass(question.difficulty)}`}>
                      {question.difficulty}
                    </span>
                  </div>
                ))}
              </div>

              {/* Toggle Expand Details */}
              <div className="mt-4 border-t border-white/5 pt-4">
                <button
                  type="button"
                  onClick={() => setExpandedCompany(isExpanded ? null : company.id)}
                  className="text-xs text-cyan-400 hover:underline font-bold font-mono flex items-center gap-1 cursor-pointer"
                >
                  {isExpanded ? 'Hide recruitment details' : 'Review interview timelines & AI study plans'} &rarr;
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 space-y-4 overflow-hidden border-t border-white/5 pt-4 text-xs"
                    >
                      {/* Timeline */}
                      <div className="space-y-2">
                        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-mono block">Interview Process Map</span>
                        <div className="relative border-l-2 border-white/5 pl-4 ml-1 space-y-3.5">
                          {getCompanyTimeline(company.id).map((step, idx) => (
                            <div key={idx} className="relative">
                              <span className="absolute -left-[21px] top-0 h-2.5 w-2.5 rounded-full bg-cyan-400 border-2 border-black" />
                              <p className="font-bold text-white text-[11px] leading-none">{step.round}</p>
                              <p className="text-zinc-400 text-[10px] mt-1">{step.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Experiences / Interview Signals */}
                      <div className="rounded-xl bg-black/20 border border-white/5 p-3.5 space-y-1.5">
                        <span className="text-[9px] font-mono text-zinc-500 uppercase font-bold tracking-wider">Recruiter Signal feedback</span>
                        <p className="text-zinc-350 text-[11px] leading-relaxed italic">
                          "{company.experiences[0]?.text || "Signal details pending updates."}"
                        </p>
                        <span className="text-[9px] text-cyan-400 font-mono block text-right">— {company.experiences[0]?.studentName || "Anonymous Candidate"} ({company.experiences[0]?.rating})</span>
                      </div>

                      {/* AI Generated Study Plan */}
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Custom SDE Study Plan</span>
                          {!plan && (
                            <button
                              type="button"
                              onClick={() => generatePlan(company.id, company.name)}
                              disabled={loadingStudyPlan === company.id}
                              className="px-2.5 py-1 bg-white/5 border border-white/10 hover:border-cyan-400/30 text-white rounded-lg text-[9px] font-bold font-mono transition cursor-pointer"
                            >
                              {loadingStudyPlan === company.id ? 'Structuring plan...' : 'Generate AI Study Plan'}
                            </button>
                          )}
                        </div>

                        {loadingStudyPlan === company.id && (
                          <div className="flex items-center justify-center py-6 text-zinc-400 gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                            <span className="font-mono text-[10px]">Calling SDE Roadmap APIs...</span>
                          </div>
                        )}

                        {plan && (
                          <div className="rounded-xl border border-cyan-500/10 bg-cyan-950/20 p-4 space-y-3 animate-slideDown">
                            <div>
                              <span className="text-[8px] font-mono text-cyan-300 uppercase font-bold">Recommended Daily sprint:</span>
                              <ul className="list-disc pl-4 mt-1 text-[10px] text-zinc-300 space-y-1">
                                {plan.dailyPlan?.map((item: string, i: number) => <li key={i}>{item}</li>)}
                              </ul>
                            </div>
                            <div>
                              <span className="text-[8px] font-mono text-cyan-300 uppercase font-bold">Weekly Milestones:</span>
                              <ul className="list-disc pl-4 mt-1 text-[10px] text-zinc-300 space-y-1">
                                {plan.weeklyPlan?.map((item: string, i: number) => <li key={i}>{item}</li>)}
                              </ul>
                            </div>
                            <span className="text-[8px] text-zinc-550 block text-right font-mono">Synced: {new Date(plan.generatedAt).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>

                      {/* Launch Mock Interview Specific to Company */}
                      {onNavigate && (
                        <button
                          type="button"
                          onClick={() => onNavigate('interview')}
                          className="w-full py-2 bg-gradient-to-r from-cyan-400 to-blue-500 hover:brightness-110 text-white text-[10px] font-black rounded-lg transition text-center flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="h-3.5 w-3.5" /> Initialize Simulated Mock Interview round
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.article>
          );
        })}
      </div>
    </div>
  );
}

function ContestsView({
  contests,
  registeredContestIds,
  onRegisterContest,
}: {
  contests: any[];
  registeredContestIds: string[];
  onRegisterContest: (contestId: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {contests.map((contest) => {
        const registered = registeredContestIds.includes(contest.id);
        return (
          <article key={contest.id} className="rounded-lg border border-slate-800 bg-[#161D2F] p-5 shadow-sm hover:border-cyan-500/20 transition-all">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-heading text-xl font-bold text-white">{contest.title}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-350">{contest.description}</p>
              </div>
              <span className="rounded-lg border border-cyan-500/30 bg-cyan-950/30 px-3 py-1 text-xs font-black text-cyan-400">
                {contest.durationMinutes} min
              </span>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <Metric label="Problems" value={contest.problems?.length || 0} />
              <Metric label="Registered" value={contest.registrantsCount || 0} />
              <Metric label="Starts" value={new Date(contest.startTime).toLocaleDateString()} />
            </div>
            <button
              type="button"
              disabled={registered}
              onClick={() => onRegisterContest(contest.id)}
              className="mt-5 w-full rounded-lg bg-slate-900 border border-slate-800 px-4 py-2 text-sm font-black text-white transition hover:bg-slate-850 disabled:bg-cyan-600"
            >
              {registered ? 'Registered' : 'Register for contest'}
            </button>
          </article>
        );
      })}
    </div>
  );
}

function CommunityView({
  user,
  discussions,
  onReloadData,
}: {
  user: User;
  discussions: any[];
  onReloadData: () => void;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Doubts');
  const [saving, setSaving] = useState(false);

  const createThread = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    await fetch('/api/discussions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        content,
        category,
        userId: user.id,
        username: user.username,
      }),
    });
    setTitle('');
    setContent('');
    setSaving(false);
    onReloadData();
  };

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
      <form onSubmit={createThread} className="rounded-lg border border-slate-800 bg-[#161D2F] p-5 shadow-sm xl:col-span-4">
        <h2 className="font-heading text-lg font-bold text-white">Start a thread</h2>
        <div className="mt-4 space-y-3">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Question title"
            className="h-11 w-full rounded-lg border border-slate-800 bg-slate-950/40 text-white px-3 text-sm outline-none focus:border-cyan-500"
          />
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="h-11 w-full rounded-lg border border-slate-800 bg-slate-950/40 text-white px-3 text-sm outline-none focus:border-cyan-500"
          >
            {['General', 'DSA', 'Interview Experience', 'Contests', 'Doubts'].map((item) => (
              <option key={item} value={item} className="bg-[#161D2F] text-white">{item}</option>
            ))}
          </select>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Share the full doubt or experience..."
            className="h-36 w-full rounded-lg border border-slate-800 bg-slate-950/40 text-white p-3 text-sm outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-650 hover:bg-indigo-600 px-4 py-2 text-sm font-black text-white disabled:opacity-60 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Publish thread
          </button>
        </div>
      </form>

      <div className="space-y-3 xl:col-span-8">
        {discussions.map((thread) => (
          <article key={thread.id} className="rounded-lg border border-slate-800 bg-[#161D2F] p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-cyan-400">{thread.category}</p>
                <h3 className="mt-1 font-heading text-lg font-bold text-white">{thread.title}</h3>
              </div>
              <span className="rounded-lg bg-slate-950 border border-slate-800 px-2 py-1 text-xs font-bold text-zinc-400">
                {thread.likes || 0} likes
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-250">{thread.content}</p>
            <p className="mt-3 text-xs font-semibold text-zinc-450">
              Posted by {thread.username} - {thread.replies?.length || 0} replies
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}

function CareerRoadmap({
  activePath,
  selectedPathId,
  onSetSelectedPathId,
}: {
  activePath: (typeof careerPaths)[number];
  selectedPathId: string;
  onSetSelectedPathId: (id: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-slate-800 bg-[#161D2F] p-5 shadow-sm">
        <label className="block max-w-sm">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-400">Target career path</span>
          <select
            value={selectedPathId}
            onChange={(event) => onSetSelectedPathId(event.target.value)}
            className="h-11 w-full rounded-lg border border-slate-800 bg-slate-950/40 text-white px-3 text-sm font-bold outline-none focus:border-cyan-500"
          >
            {careerPaths.map((path) => (
              <option key={path.id} value={path.id} className="bg-[#161D2F] text-white">{path.title}</option>
            ))}
          </select>
        </label>
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="font-heading text-2xl font-bold text-white">{activePath.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-350">{activePath.description}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">Target companies</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {activePath.targetCompanies.map((company) => (
                <span key={company} className="rounded-md border border-slate-800 bg-slate-900 px-2 py-1 text-xs font-bold text-zinc-300">
                  {company}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {activePath.milestones.map((milestone) => (
          <article key={milestone.id} className="rounded-lg border border-slate-800 bg-[#161D2F] p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-heading text-lg font-bold text-white">{milestone.title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-350">{milestone.description}</p>
              </div>
              <span className={`rounded-lg px-2 py-1 text-xs font-black border ${
                milestone.status === 'completed'
                  ? 'bg-cyan-950/30 border-cyan-500/30 text-cyan-400'
                  : milestone.status === 'unlocked'
                    ? 'bg-cyan-950/30 border-cyan-500/30 text-cyan-400'
                    : 'bg-slate-900 border-slate-800 text-slate-450'
              }`}>
                {milestone.status}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {milestone.skills.map((skill) => (
                <span key={skill} className="rounded-md border border-slate-800 bg-slate-900 px-2 py-1 text-xs font-bold text-zinc-350">
                  {skill}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ProfileView({ user, readinessScore, problems }: { user: User; readinessScore: number; problems: any[] }) {
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
      <section className="rounded-lg border border-slate-800 bg-[#161D2F] p-6 shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-950 text-xl font-black text-white">
          {user.username.slice(0, 2).toUpperCase()}
        </div>
        <h2 className="mt-4 font-heading text-2xl font-bold text-white">{user.username}</h2>
        <p className="text-sm text-slate-400">{user.email}</p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-950/30 px-3 py-1 text-sm font-bold text-cyan-400">
          <ShieldCheck className="h-4 w-4" />
          Verified student
        </div>
      </section>

      <section className="rounded-lg border border-slate-800 bg-[#161D2F] p-6 shadow-sm xl:col-span-2">
        <h3 className="font-heading text-xl font-bold text-white">Progress summary</h3>
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric label="Readiness" value={`${readinessScore}%`} />
          <Metric label="XP" value={user.xp} />
          <Metric label="Level" value={user.level} />
          <Metric label="Solved" value={`${user.problemsSolved.length}/${problems.length}`} />
        </div>
        <div className="mt-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-400">Badges</p>
          <div className="flex flex-wrap gap-2">
            {(user.badges.length ? user.badges : ['starter']).map((badge) => (
              <span key={badge} className="rounded-lg border border-violet-500/30 bg-violet-950/30 px-3 py-1 text-xs font-black text-violet-400">
                {badge}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function AdminStudio({
  onReloadData,
  onNavigate,
}: {
  onReloadData: () => void;
  onNavigate: (tab: AppTab) => void;
}) {
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [tags, setTags] = useState('Arrays, Hashing');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const createProblem = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setSaving(true);
    await fetch('/api/problems', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        difficulty,
        tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        description,
        constraints: '1 <= n <= 100000',
        inputFormat: 'Read input from stdin.',
        outputFormat: 'Print the required answer.',
        examples: [{ input: '1 2 3', output: '6', explanation: 'Sample demonstration.' }],
        testCases: [{ input: '1 2 3', expectedOutput: '6', isHidden: false }],
        hints: ['Parse input carefully.', 'Choose a suitable data structure.', 'Optimize time complexity.'],
        editorial: 'Explain the brute force approach, optimize it, then state time and space complexity.',
      }),
    });
    setTitle('');
    setDescription('');
    setSaving(false);
    await onReloadData();
    onNavigate('arena');
  };

  return (
    <form onSubmit={createProblem} className="max-w-3xl rounded-lg border border-slate-800 bg-[#161D2F] p-6 shadow-sm">
      <h2 className="font-heading text-xl font-bold text-white">Create a placement problem</h2>
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <label>
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-400 font-mono">Title</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="h-11 w-full rounded-lg border border-slate-800 bg-slate-950/40 text-white px-3 text-sm outline-none focus:border-cyan-500"
          />
        </label>
        <label>
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-400 font-mono">Difficulty</span>
          <select
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value as 'Easy' | 'Medium' | 'Hard')}
            className="h-11 w-full rounded-lg border border-slate-800 bg-slate-950/40 text-white px-3 text-sm outline-none focus:border-cyan-500"
          >
            <option className="bg-[#161D2F] text-white">Easy</option>
            <option className="bg-[#161D2F] text-white">Medium</option>
            <option className="bg-[#161D2F] text-white">Hard</option>
          </select>
        </label>
      </div>
      <label className="mt-4 block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-400 font-mono">Tags</span>
        <input
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          className="h-11 w-full rounded-lg border border-slate-800 bg-slate-950/40 text-white px-3 text-sm outline-none focus:border-cyan-500"
        />
      </label>
      <label className="mt-4 block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-400 font-mono">Problem statement</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="h-40 w-full rounded-lg border border-slate-800 bg-slate-950/40 text-white p-3 text-sm outline-none focus:border-cyan-500"
        />
      </label>
      <button
        type="submit"
        disabled={saving}
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-650 hover:bg-indigo-600 px-4 py-2 text-sm font-black text-white disabled:opacity-60 cursor-pointer"
      >
        <Plus className="h-4 w-4" />
        Save problem
      </button>
    </form>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-800/80 bg-slate-950/45 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}
