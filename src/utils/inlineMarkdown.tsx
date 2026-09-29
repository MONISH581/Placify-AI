import React from 'react';

/**
 * Minimal, safe inline formatter for short strings: **bold** and `code` only.
 * Produces React elements (never HTML strings), so untrusted text cannot inject markup.
 */
export function renderInline(text: string | undefined | null): React.ReactNode {
  if (!text) return '';
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={index} className="font-bold text-[#DFBA73]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={index} className="rounded bg-slate-950 px-1.5 py-0.5 font-mono text-[11px] text-indigo-300">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}
