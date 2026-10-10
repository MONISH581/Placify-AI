import React from 'react';
import { renderInline } from './inlineMarkdown';

/**
 * Renders learning-content strings that may contain simple HTML (e.g. imported tutorial text such as
 * "<h1>HTML: Introduction</h1><p>...</p>") or plain text with **bold** / `code`.
 *
 * Safety: the string is parsed with DOMParser into an inert document and rebuilt as React elements from a
 * tag allowlist. No attributes are copied except a vetted href on links, and nothing is ever assigned via
 * innerHTML, so scripts, event handlers and styles in untrusted content cannot run.
 */

const HAS_HTML = /<\/?(h[1-6]|p|ul|ol|li|b|strong|i|em|code|pre|br|a|table|tr|td|th|thead|tbody|blockquote|div|span)\b[^>]*>/i;

const TAG_CLASSES: Record<string, string> = {
  h1: 'mt-1 font-heading text-xl font-bold text-white',
  h2: 'mt-5 font-heading text-lg font-bold text-white',
  h3: 'mt-4 font-heading text-base font-bold text-white',
  h4: 'mt-3 text-sm font-bold uppercase tracking-wider text-white',
  h5: 'mt-3 text-sm font-bold text-white',
  h6: 'mt-3 text-sm font-bold text-white',
  p: 'leading-relaxed',
  ul: 'list-disc space-y-1 pl-5',
  ol: 'list-decimal space-y-1 pl-5',
  li: 'leading-relaxed',
  blockquote: 'border-l-2 border-cyan-400 pl-3 text-slate-300',
  table: 'w-full border-collapse text-left text-xs',
  th: 'border border-slate-800 bg-slate-900 px-2 py-1 font-semibold text-white',
  td: 'border border-slate-800 px-2 py-1',
  strong: 'font-bold text-white',
  b: 'font-bold text-white',
};

const BLOCK_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'li', 'blockquote', 'div', 'table', 'thead', 'tbody', 'tr', 'td', 'th']);
const PASSTHROUGH = new Set(['i', 'em', 'span', 'thead', 'tbody', 'tr', 'td', 'th', 'div', 'table']);
const DROP = new Set(['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta', 'form', 'input', 'button', 'svg', 'img', 'video', 'audio']);

function safeHref(href: string | null): string | null {
  if (!href) return null;
  try {
    const url = new URL(href, 'https://placeholder.invalid');
    return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? href : null;
  } catch {
    return null;
  }
}

function convert(node: Node, key: string, inCode: boolean): React.ReactNode {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? '';
    return inCode ? text : renderInline(text);
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  if (DROP.has(tag)) return null;

  const children = Array.from(el.childNodes).map((child, index) => convert(child, `${key}.${index}`, inCode || tag === 'code' || tag === 'pre'));

  if (tag === 'br') return <br key={key} />;

  if (tag === 'pre') {
    return (
      <pre key={key} className="overflow-x-auto whitespace-pre rounded-md bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-cyan-300">
        {el.textContent}
      </pre>
    );
  }
  if (tag === 'code') {
    return (
      <code key={key} className="rounded bg-slate-950 px-1.5 py-0.5 font-mono text-[11px] text-cyan-300">
        {children}
      </code>
    );
  }
  if (tag === 'a') {
    const href = safeHref(el.getAttribute('href'));
    return href ? (
      <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline underline-offset-2">
        {children}
      </a>
    ) : (
      <React.Fragment key={key}>{children}</React.Fragment>
    );
  }

  if (PASSTHROUGH.has(tag) && !TAG_CLASSES[tag]) {
    return tag === 'span' || tag === 'i' || tag === 'em'
      ? React.createElement(tag === 'span' ? 'span' : 'em', { key }, children)
      : React.createElement(tag, { key }, children);
  }

  const allowed = tag in TAG_CLASSES || BLOCK_TAGS.has(tag) || tag === 'b' || tag === 'strong';
  if (!allowed) return <React.Fragment key={key}>{children}</React.Fragment>;
  return React.createElement(tag, { key, className: TAG_CLASSES[tag] }, children);
}

/** Renders a content string as safe React nodes (HTML subset or inline markdown). */
export function renderRichText(text: string | undefined | null): React.ReactNode {
  if (!text) return null;
  if (!HAS_HTML.test(text)) {
    return <p className="whitespace-pre-wrap leading-relaxed">{renderInline(text)}</p>;
  }
  const doc = new DOMParser().parseFromString(text, 'text/html');
  const nodes = Array.from(doc.body.childNodes).map((child, index) => convert(child, String(index), false));
  return <div className="space-y-3">{nodes}</div>;
}
