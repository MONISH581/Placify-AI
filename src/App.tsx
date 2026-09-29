/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { Loader2, LogOut, RefreshCw, WifiOff } from 'lucide-react';

import { AuthProvider, useAuth } from './context/AuthContext';
import { AppDataProvider } from './context/AppDataContext';
import { RouteErrorBoundary } from './components/ErrorBoundary';
import { Navigation } from './components/Navigation';
import { AiMentorPanel } from './components/AiMentorPanel';
import { AdminRoute, ProtectedRoute } from './components/RouteGuards';
import { PageLoader } from './components/StatusMessages';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ArenaPage = lazy(() => import('./pages/ArenaPage'));
const LearningTracksPage = lazy(() => import('./pages/LearningTracksPage'));
const PlacementHubPage = lazy(() => import('./pages/PlacementHubPage'));
const MockInterviewPage = lazy(() => import('./pages/MockInterviewPage'));
const ResumeAnalyzerPage = lazy(() => import('./pages/ResumeAnalyzerPage'));
const CompanyPrepPage = lazy(() => import('./pages/CompanyPrepPage'));
const ContestsPage = lazy(() => import('./pages/ContestsPage'));
const CommunityPage = lazy(() => import('./pages/CommunityPage'));
const CareerRoadmapPage = lazy(() => import('./pages/CareerRoadmapPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AdminStudioPage = lazy(() => import('./pages/AdminStudioPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

/** Signed-in chrome (navigation + mentor) around the padded page container. */
function AppLayout() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-[#070C16] text-white selection:bg-cyan-400 selection:text-black">
      <Navigation />
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <RouteErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </RouteErrorBoundary>
      </main>
      {user && <AiMentorPanel />}
    </div>
  );
}

function FullScreenLoader() {
  return (
    <div role="status" className="flex min-h-screen items-center justify-center bg-[#070C16] text-cyan-400">
      <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
      <span className="sr-only">Restoring your session</span>
    </div>
  );
}

/** Shown when a stored token exists but the server could not confirm it (network error, timeout, 5xx). */
function SessionUnavailable() {
  const { sessionError, retrySession, logout } = useAuth();
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#070C16] p-6 text-white">
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-amber-500/20 bg-slate-950/80 p-6 text-center shadow-2xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400">
          <WifiOff className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="font-heading text-xl font-bold">Can't reach the Placify server</h1>
        <p className="text-xs leading-relaxed text-zinc-400">
          Your session is saved, but we could not verify it right now. Check that the server is running and try again.
        </p>
        {sessionError && (
          <p className="rounded-lg border border-white/5 bg-black/40 p-3 font-mono text-[10px] text-amber-200">{sessionError}</p>
        )}
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => void retrySession()}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-cyan-400 px-5 py-2.5 text-xs font-black text-black transition hover:bg-cyan-300"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Retry
          </button>
          <button
            type="button"
            onClick={logout}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { status } = useAuth();

  if (status === 'checking') return <FullScreenLoader />;
  if (status === 'unreachable') return <SessionUnavailable />;

  return (
    <RouteErrorBoundary>
      <Routes>
        {/* Login renders full-width, outside the padded app container. */}
        <Route
          path="/login"
          element={
            <Suspense fallback={<FullScreenLoader />}>
              <LoginPage />
            </Suspense>
          }
        />
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route element={<ProtectedRoute />}>
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="arena" element={<ArenaPage />} />
            <Route path="arena/:problemId" element={<ArenaPage />} />
            <Route path="tracks" element={<LearningTracksPage />} />
            <Route path="placement" element={<PlacementHubPage />} />
            <Route path="interview" element={<MockInterviewPage />} />
            <Route path="resume" element={<ResumeAnalyzerPage />} />
            <Route path="companies" element={<CompanyPrepPage />} />
            <Route path="contests" element={<ContestsPage />} />
            <Route path="community" element={<CommunityPage />} />
            <Route path="career" element={<CareerRoadmapPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route element={<AdminRoute />}>
              <Route path="admin" element={<AdminStudioPage />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </RouteErrorBoundary>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppDataProvider>
          <AppRoutes />
        </AppDataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
