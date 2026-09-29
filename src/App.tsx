/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
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
  MessageSquare,
  Plus,
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
import { ErrorBoundary } from './components/ErrorBoundary';
import { Navigation } from './components/Navigation';
import { companyData } from './data/companyPreparation';
import { placementSubjects, SubjectModule } from './data/placementHub';
import { careerPaths } from './data/roadmaps';
import type { User } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { ParticleCanvas, CountUp } from './components/AICoreVisual';
import { AiMentorPanel } from './components/AiMentorPanel';
import {
  apiFetch,
  getStoredToken,
  setStoredToken,
  removeStoredToken,
  getCurrentUserFromServer,
} from './services/api';

const demoStudent = {
  email: 'student@placify.com',
  password: 'student',
};

const demoAdmin = {
  email: 'admin@placify.com',
  password: 'admin',
};

function LoginPage({ onLoginSuccess }: { onLoginSuccess: (user: User, token: string) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('student@placify.com');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const submitAuth = async (event?: React.FormEvent, preset?: { email: string; password: string }) => {
    if (event) event.preventDefault();
    setError(null);

    const targetEmail = preset?.email || email;
    const targetPassword = preset?.password || password;

    if (!targetEmail || !targetPassword) {
      setError('Please provide email/username and password');
      return;
    }

    setLoading(true);
    const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';

    const payload =
      mode === 'register'
        ? { email: targetEmail, username: username || targetEmail.split('@')[0], password: targetPassword }
        : { email: targetEmail, password: targetPassword };

    const res = await apiFetch<{ success: boolean; user: User; token: string }>(endpoint, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    setLoading(false);

    if (res.ok && res.data?.user && res.data?.token) {
      onLoginSuccess(res.data.user, res.data.token);
      navigate('/dashboard');
    } else {
      setError(res.error || 'Authentication failed. Check server status.');
    }
  };

  const tickerCompanies = [
    { name: 'GOOGLE', logo: '🌐' },
    { name: 'AMAZON', logo: '📦' },
    { name: 'MICROSOFT', logo: '💻' },
    { name: 'META', logo: '♾️' },
    { name: 'APPLE', logo: '🍎' },
    { name: 'NETFLIX', logo: '🍿' },
    { name: 'UBER', logo: '🚗' },
    { name: 'STRIPE', logo: '💳' },
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#070C16] text-white selection:bg-cyan-400 selection:text-black">
      <ParticleCanvas />

      {/* Hero section */}
      <section className="relative z-10 px-6 pt-12 pb-20 md:px-12 lg:pt-16">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-950/40 px-3.5 py-1.5 text-xs font-semibold text-cyan-300 backdrop-blur-md glow-cyan font-mono">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
              <span>NEXT-GEN RECRUITMENT INTELLIGENCE</span>
            </div>

            <h1 className="font-heading text-4xl font-extrabold tracking-tight text-white md:text-6xl lg:text-7xl leading-[1.08]">
              Architect Your <br />
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-500 bg-clip-text text-transparent">
                SDE Placement Output
              </span>
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-zinc-400 font-sans">
              Placify evaluates code accuracy, structures AI roadmaps, measures placement probability, and delivers sandboxed assessment loops.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <a
                href="#login"
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-6 py-3 text-xs font-bold text-black shadow-lg transition hover:bg-zinc-200 cursor-pointer"
              >
                Enter platform <ChevronRight className="h-4 w-4" />
              </a>
            </div>

            <div className="grid grid-cols-3 gap-4 max-w-lg pt-6">
              {[
                { value: 500, label: 'PROBLEMS', isCountUp: true },
                { value: 'W3', label: 'TOPIC MAP', isCountUp: false },
                { value: 32, label: 'COMPANIES', isCountUp: true },
              ].map((stat, idx) => (
                <div key={idx} className="rounded-2xl border border-white/5 bg-[#0a101f]/40 p-4.5 backdrop-blur-md">
                  <p className="text-2xl font-black text-white font-mono">
                    {stat.isCountUp ? <CountUp end={stat.value as number} /> : stat.value}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mt-1 font-mono">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative w-full lg:col-span-5 flex items-center justify-center">
            <div className="rounded-2xl border border-white/15 bg-slate-950/60 p-8 shadow-2xl backdrop-blur-xl max-w-md w-full" id="login">
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

              <form className="space-y-4" onSubmit={(e) => submitAuth(e)}>
                {mode === 'register' && (
                  <label className="block">
                    <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-mono">Username</span>
                    <input
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-xs outline-none text-white transition focus:border-cyan-400"
                      placeholder="sde_pioneer"
                    />
                  </label>
                )}

                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-mono">Email / Username</span>
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-xs outline-none text-white transition focus:border-cyan-400"
                    placeholder="candidate@placify.com"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-mono">Password</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-xs outline-none text-white transition focus:border-cyan-400"
                    placeholder="••••••••"
                  />
                </label>

                {error && (
                  <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3.5 py-2.5 text-xs font-semibold text-rose-400 font-mono">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-xs font-black text-white transition hover:brightness-110 disabled:opacity-60 cursor-pointer shadow-md"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  {mode === 'login' ? 'Access Platform' : 'Initialize Account'}
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
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ReadinessBand({
  user,
  readinessScore,
  problemsCount,
  onStartPractice,
}: {
  user: User;
  readinessScore: number;
  problemsCount: number;
  onStartPractice: () => void;
}) {
  const stats = [
    { label: 'Readiness', value: `${readinessScore}%`, icon: ShieldCheck, color: 'text-cyan-400' },
    { label: 'Solved', value: `${user.problemsSolved.length}/${problemsCount}`, icon: CheckCircle2, color: 'text-cyan-600' },
    { label: 'XP level', value: `L${user.level}`, icon: Award, color: 'text-violet-400' },
    { label: 'Accuracy', value: `${user.accuracy}%`, icon: BarChart3, color: 'text-amber-400' },
  ];

  return (
    <section className="rounded-xl border border-slate-800 bg-[#161D2F] p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-lg border border-slate-800/60 bg-slate-950/45 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-zinc-400 font-mono">{stat.label}</span>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <p className="text-2xl font-black text-white font-mono">{stat.value}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-950 p-4 text-white">
        <div>
          <p className="text-sm font-bold">Recommended SDE Sprint</p>
          <p className="text-xs text-slate-300">Solve one medium problem, review system paging, and run one mock interview today.</p>
        </div>
        <button
          type="button"
          onClick={onStartPractice}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-4 py-2 text-xs font-black text-black transition hover:bg-cyan-300 cursor-pointer"
        >
          Start Practice
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </section>
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
          <article key={contest.id} className="rounded-xl border border-slate-800 bg-[#161D2F] p-5 shadow-sm hover:border-cyan-500/20 transition-all">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-heading text-xl font-bold text-white">{contest.title}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-350">{contest.description}</p>
              </div>
              <span className="rounded-lg border border-cyan-500/30 bg-cyan-950/30 px-3 py-1 text-xs font-black text-cyan-400 font-mono">
                {contest.durationMinutes} min
              </span>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-center">
                <p className="text-[10px] text-zinc-500 font-mono font-bold uppercase">Problems</p>
                <p className="text-lg font-black text-white font-mono">{contest.problems?.length || 0}</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-center">
                <p className="text-[10px] text-zinc-500 font-mono font-bold uppercase">Registrants</p>
                <p className="text-lg font-black text-white font-mono">{contest.registrantsCount || 0}</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-center">
                <p className="text-[10px] text-zinc-500 font-mono font-bold uppercase">Starts</p>
                <p className="text-xs font-black text-white font-mono mt-1">{new Date(contest.startTime).toLocaleDateString()}</p>
              </div>
            </div>
            <button
              type="button"
              disabled={registered}
              onClick={() => onRegisterContest(contest.id)}
              className="mt-5 w-full rounded-lg bg-slate-900 border border-slate-800 px-4 py-2 text-sm font-black text-white transition hover:bg-slate-800 disabled:bg-cyan-600 cursor-pointer"
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
    await apiFetch('/api/discussions', {
      method: 'POST',
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
      <form onSubmit={createThread} className="rounded-xl border border-slate-800 bg-[#161D2F] p-5 shadow-sm xl:col-span-4">
        <h2 className="font-heading text-lg font-bold text-white">Start a Discussion</h2>
        <div className="mt-4 space-y-3">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Thread title"
            className="h-11 w-full rounded-lg border border-slate-800 bg-slate-950/40 text-white px-3 text-xs outline-none focus:border-cyan-500"
          />
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="h-11 w-full rounded-lg border border-slate-800 bg-slate-950/40 text-white px-3 text-xs outline-none focus:border-cyan-500 font-mono"
          >
            {['General', 'DSA', 'Interview Experience', 'Contests', 'Doubts'].map((item) => (
              <option key={item} value={item} className="bg-[#161D2F] text-white">{item}</option>
            ))}
          </select>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Describe your technical question or placement experience..."
            className="h-36 w-full rounded-lg border border-slate-800 bg-slate-950/40 text-white p-3 text-xs outline-none focus:border-cyan-500 resize-none font-sans"
          />
          <button
            type="submit"
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-400 text-black font-black px-4 py-2.5 text-xs transition hover:bg-cyan-300 disabled:opacity-60 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Publish Thread
          </button>
        </div>
      </form>

      <div className="space-y-3 xl:col-span-8">
        {discussions.map((thread) => (
          <article key={thread.id} className="rounded-xl border border-slate-800 bg-[#161D2F] p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-cyan-400 font-mono">{thread.category}</p>
                <h3 className="mt-1 font-heading text-lg font-bold text-white">{thread.title}</h3>
              </div>
              <span className="rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1 text-xs font-bold text-zinc-400 font-mono">
                {thread.likes || 0} likes
              </span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-300 whitespace-pre-wrap">{thread.content}</p>
            <p className="mt-3 text-[10px] font-mono text-zinc-500">
              Posted by {thread.username} · {thread.replies?.length || 0} replies
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}

function CompanyPrep({ onSelectProblem }: { onSelectProblem: (problem: any) => void }) {
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {companyData.map((company) => {
          const isExpanded = expandedCompany === company.id;

          return (
            <article key={company.id} className="rounded-2xl border border-white/5 bg-[#0a101f]/60 p-6 shadow-xl backdrop-blur-md flex flex-col justify-between">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{company.logo}</span>
                    <h2 className="font-heading text-lg font-bold text-white leading-normal">{company.name}</h2>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-mono mt-1">
                    {company.questions.length} curated problems
                  </p>
                </div>
                <span className={`rounded-xl border px-3 py-1 text-[9px] font-black font-mono ${company.bgColor}`}>
                  {company.id.toUpperCase()} TRACK
                </span>
              </div>

              <div className="space-y-2.5">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-mono block">Curated Questions</span>
                {company.questions.map((question, qIdx) => (
                  <div
                    key={qIdx}
                    onClick={() => {
                      onSelectProblem({
                        id: `prob-bank-00${(qIdx % 10) + 1}`,
                        title: `${company.name} ${question.title}`,
                        difficulty: question.difficulty,
                        tags: [company.name, question.type],
                        description: `Solve this ${company.name} interview problem: ${question.title}.`,
                        constraints: '1 <= N <= 10^5',
                        inputFormat: 'Compact assessment input.',
                        outputFormat: 'Expected computed output.',
                        examples: [{ input: 'sample', output: 'true' }],
                        hints: ['Check data bounds.', 'Optimize time complexity.'],
                        editorial: 'Use standard algorithm approach.'
                      });
                    }}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-black/20 p-3 hover:border-cyan-500/20 transition cursor-pointer"
                  >
                    <div>
                      <p className="text-xs font-bold text-white">{question.title}</p>
                      <p className="text-[9px] text-zinc-400 font-mono mt-0.5">{question.type}</p>
                    </div>
                    <span className="shrink-0 rounded-md border border-cyan-500/30 bg-cyan-950/30 px-2 py-0.5 text-[8px] font-bold font-mono text-cyan-400">
                      {question.difficulty}
                    </span>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
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
      <div className="rounded-xl border border-slate-800 bg-[#161D2F] p-5 shadow-sm">
        <label className="block max-w-sm">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-400 font-mono">Target Career Track</span>
          <select
            value={selectedPathId}
            onChange={(event) => onSetSelectedPathId(event.target.value)}
            className="h-11 w-full rounded-lg border border-slate-800 bg-slate-950/40 text-white px-3 text-xs font-bold outline-none focus:border-cyan-500 font-mono"
          >
            {careerPaths.map((path) => (
              <option key={path.id} value={path.id} className="bg-[#161D2F] text-white">{path.title}</option>
            ))}
          </select>
        </label>
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="font-heading text-2xl font-bold text-white">{activePath.title}</h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-350">{activePath.description}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-zinc-400 font-mono">Target Companies</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {activePath.targetCompanies.map((company) => (
                <span key={company} className="rounded-md border border-slate-800 bg-slate-900 px-2 py-1 text-[10px] font-bold text-zinc-300 font-mono">
                  {company}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {activePath.milestones.map((milestone) => (
          <article key={milestone.id} className="rounded-xl border border-slate-800 bg-[#161D2F] p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-heading text-lg font-bold text-white">{milestone.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-350">{milestone.description}</p>
              </div>
              <span className="rounded-lg px-2.5 py-1 text-[10px] font-mono font-bold bg-cyan-950/30 border border-cyan-500/30 text-cyan-400 uppercase">
                {milestone.status}
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ProfileView({ user, readinessScore, problemsCount }: { user: User; readinessScore: number; problemsCount: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
      <section className="rounded-xl border border-slate-800 bg-[#161D2F] p-6 shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-cyan-400/20 text-xl font-black text-cyan-300 border border-cyan-400/30 font-mono">
          {user.username.slice(0, 2).toUpperCase()}
        </div>
        <h2 className="mt-4 font-heading text-2xl font-bold text-white">{user.username}</h2>
        <p className="text-xs text-slate-400 font-mono">{user.email}</p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-950/30 px-3 py-1 text-xs font-bold text-cyan-400 font-mono">
          <ShieldCheck className="h-4 w-4" />
          <span>Verified Student</span>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-[#161D2F] p-6 shadow-sm xl:col-span-2">
        <h3 className="font-heading text-lg font-bold text-white mb-4">Placement Performance Metrics</h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-mono">Readiness Score</p>
            <p className="text-2xl font-black text-cyan-400 font-mono mt-1">{readinessScore}%</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-mono">Problems Solved</p>
            <p className="text-2xl font-black text-white font-mono mt-1">{user.problemsSolved.length}/{problemsCount}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-mono">Experience XP</p>
            <p className="text-2xl font-black text-white font-mono mt-1">{user.xp}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-mono">Submission Accuracy</p>
            <p className="text-2xl font-black text-white font-mono mt-1">{user.accuracy}%</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function AdminStudio({ onReloadData }: { onReloadData: () => void }) {
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    apiFetch('/api/health').then((res) => {
      if (res.ok) setStatus(res.data);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-800 bg-[#161D2F] p-6">
        <h2 className="font-heading text-xl font-bold text-white mb-2">Placify Microservice Health Status</h2>
        {status ? (
          <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-cyan-300">
            {JSON.stringify(status, null, 2)}
          </pre>
        ) : (
          <p className="text-xs text-zinc-400 font-mono">Checking microservices...</p>
        )}
      </div>
    </div>
  );
}

export function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [problems, setProblems] = useState<any[]>([]);
  const [contests, setContests] = useState<any[]>([]);
  const [discussions, setDiscussions] = useState<any[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<any | null>(null);
  const [selectedPathId, setSelectedPathId] = useState('fullstack');
  const [registeredContestIds, setRegisteredContestIds] = useState<string[]>([]);
  const [readinessScore, setReadinessScore] = useState(78);

  const activePath = careerPaths.find((p) => p.id === selectedPathId) || careerPaths[0];

  const loadData = async () => {
    const [probRes, contestRes, discRes] = await Promise.all([
      apiFetch('/api/problems'),
      apiFetch('/api/contests'),
      apiFetch('/api/discussions'),
    ]);

    if (probRes.ok && Array.isArray(probRes.data)) setProblems(probRes.data);
    if (contestRes.ok && Array.isArray(contestRes.data)) setContests(contestRes.data);
    if (discRes.ok && Array.isArray(discRes.data)) setDiscussions(discRes.data);
  };

  useEffect(() => {
    // Rehydrate authenticated user on startup via /api/auth/me
    const token = getStoredToken();
    if (token) {
      getCurrentUserFromServer().then((res) => {
        if (res.ok && res.data?.user) {
          setUser(res.data.user);
        } else {
          removeStoredToken();
          setUser(null);
        }
        setInitializing(false);
      });
    } else {
      setInitializing(false);
    }

    loadData();
  }, []);

  const handleLoginSuccess = (authenticatedUser: User, token: string) => {
    setStoredToken(token);
    setUser(authenticatedUser);
  };

  const handleLogout = () => {
    removeStoredToken();
    setUser(null);
  };

  const handleAddXp = async (xpReward: number) => {
    // Refresh user details from server to ensure server is authoritative source of XP
    const res = await getCurrentUserFromServer();
    if (res.ok && res.data?.user) {
      setUser(res.data.user);
    }
  };

  const handleRegisterContest = async (contestId: string) => {
    const res = await apiFetch(`/api/contests/${contestId}/register`, { method: 'POST' });
    if (res.ok) {
      setRegisteredContestIds((prev) => [...prev, contestId]);
      loadData();
    }
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-[#070C16] flex items-center justify-center text-cyan-400">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070C16] text-white selection:bg-cyan-400 selection:text-black">
      <Navigation user={user} readinessScore={readinessScore} onLogout={handleLogout} />

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <ErrorBoundary>
          <Routes>
            <Route
              path="/login"
              element={user ? <Navigate to="/dashboard" replace /> : <LoginPage onLoginSuccess={handleLoginSuccess} />}
            />
            <Route
              path="/dashboard"
              element={
                user ? (
                  <div className="space-y-5">
                    <ReadinessBand
                      user={user}
                      readinessScore={readinessScore}
                      problemsCount={problems.length}
                      onStartPractice={() => {}}
                    />
                    <Dashboard
                      user={user}
                      problems={problems}
                      onSelectProblem={(prob) => setSelectedProblem(prob)}
                      onNavigate={() => {}}
                    />
                  </div>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="/arena"
              element={
                user ? (
                  <CodingArena
                    problems={problems}
                    selectedProblem={selectedProblem}
                    onSelectProblem={(prob) => setSelectedProblem(prob)}
                    userId={user.id}
                    onSubmissionSuccess={handleAddXp}
                    solvedProblemIds={user.problemsSolved}
                    userXp={user.xp}
                  />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route path="/tracks" element={user ? <LearningTracks onAddXp={handleAddXp} /> : <Navigate to="/login" replace />} />
            <Route path="/placement" element={user ? <PlacementHub onAddXp={handleAddXp} subjects={placementSubjects} /> : <Navigate to="/login" replace />} />
            <Route path="/interview" element={user ? <MockInterview userId={user.id} onAddXp={handleAddXp} /> : <Navigate to="/login" replace />} />
            <Route path="/resume" element={user ? <ResumeAnalyzer /> : <Navigate to="/login" replace />} />
            <Route path="/companies" element={user ? <CompanyPrep onSelectProblem={(prob) => setSelectedProblem(prob)} /> : <Navigate to="/login" replace />} />
            <Route
              path="/contests"
              element={
                user ? (
                  <ContestsView
                    contests={contests}
                    registeredContestIds={registeredContestIds}
                    onRegisterContest={handleRegisterContest}
                  />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="/community"
              element={user ? <CommunityView user={user} discussions={discussions} onReloadData={loadData} /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/career"
              element={
                user ? (
                  <CareerRoadmap
                    activePath={activePath}
                    selectedPathId={selectedPathId}
                    onSetSelectedPathId={setSelectedPathId}
                  />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="/profile"
              element={user ? <ProfileView user={user} readinessScore={readinessScore} problemsCount={problems.length} /> : <Navigate to="/login" replace />}
            />
            <Route path="/admin" element={user && user.isAdmin ? <AdminStudio onReloadData={loadData} /> : <Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
          </Routes>
        </ErrorBoundary>
      </main>

      {user && <AiMentorPanel user={user} />}
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
