import { Suspense, lazy } from 'react';

const Markdown = lazy(() => import('./Markdown'));

/** Lazy-loaded Markdown renderer with a plain-text fallback while the chunk loads. */
export function LazyMarkdown({ children, className = '' }: { children: string; className?: string }) {
  return (
    <Suspense fallback={<p className={`whitespace-pre-wrap ${className}`}>{children}</p>}>
      <Markdown className={className}>{children}</Markdown>
    </Suspense>
  );
}
