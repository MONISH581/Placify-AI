import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, LayoutDashboard, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** When any of these values change while an error is shown, the boundary resets (e.g. the route path). */
  resetKeys?: ReadonlyArray<unknown>;
  /** Navigate to the dashboard. Defaults to a full page load of /dashboard (usable outside the router). */
  onGoHome?: () => void;
  /** "page" renders inside the layout; "fullscreen" is used for the top-level boundary. */
  variant?: 'page' | 'fullscreen';
}

interface ErrorBoundaryState {
  error: Error | null;
}

function keysChanged(prev: ReadonlyArray<unknown> = [], next: ReadonlyArray<unknown> = []): boolean {
  return prev.length !== next.length || prev.some((value, index) => !Object.is(value, next[index]));
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { error: null };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught rendering error in component tree:', error, errorInfo);
  }

  public componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.error && keysChanged(prevProps.resetKeys, this.props.resetKeys)) {
      this.reset();
    }
  }

  private reset = () => {
    this.setState({ error: null });
  };

  private goHome = () => {
    this.reset();
    if (this.props.onGoHome) this.props.onGoHome();
    else window.location.assign('/dashboard');
  };

  public render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const fullscreen = this.props.variant === 'fullscreen';
    return (
      <div
        role="alert"
        className={`flex items-center justify-center p-6 text-white ${fullscreen ? 'min-h-screen bg-[#070C16]' : 'min-h-[400px]'}`}
      >
        <div className="w-full max-w-md space-y-4 rounded-2xl border border-rose-500/20 bg-slate-950/80 p-6 text-center shadow-2xl backdrop-blur-xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 className="font-heading text-xl font-bold">Something went wrong</h2>
          <p className="text-xs leading-relaxed text-zinc-400">
            An unexpected interface error occurred. You can try again or head back to your dashboard.
          </p>
          <div className="overflow-x-auto rounded-lg border border-white/5 bg-black/40 p-3 text-left font-mono text-[10px] text-rose-300">
            {error.message || 'Unknown error'}
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={this.reset}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-cyan-400 px-5 py-2.5 text-xs font-black text-black transition hover:bg-cyan-300"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Try again
            </button>
            <button
              type="button"
              onClick={this.goHome}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-white/10"
            >
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
              Go to dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }
}

/** Error boundary for use inside the router: resets on route change and navigates client-side. */
export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <ErrorBoundary resetKeys={[location.pathname]} onGoHome={() => navigate('/dashboard')}>
      {children}
    </ErrorBoundary>
  );
}
