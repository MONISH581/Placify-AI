import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';

export function ErrorAlert({
  message,
  onRetry,
  retryLabel = 'Retry',
  className = '',
}: {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={`flex items-start justify-between gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-300 ${className}`}
    >
      <span className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="font-mono leading-relaxed">{message}</span>
      </span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-rose-400/30 px-2 py-1 text-[10px] font-bold text-rose-200 transition hover:bg-rose-500/20"
        >
          <RefreshCw className="h-3 w-3" aria-hidden="true" />
          {retryLabel}
        </button>
      )}
    </div>
  );
}

export function LoadingBlock({ label = 'Loading...', className = '' }: { label?: string; className?: string }) {
  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-800 bg-[#161D2F] p-10 text-cyan-400 ${className}`}
    >
      <Loader2 className="h-7 w-7 animate-spin" aria-hidden="true" />
      <span className="font-mono text-xs text-slate-400">{label}</span>
    </div>
  );
}

export function PageLoader() {
  return (
    <div role="status" className="flex min-h-[40vh] items-center justify-center text-cyan-400">
      <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
      <span className="sr-only">Loading page</span>
    </div>
  );
}
