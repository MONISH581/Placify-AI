import ReactMarkdown, { type Components } from 'react-markdown';

const components: Components = {
  a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
};

/**
 * Renders untrusted Markdown (e.g. AI answers) safely: raw HTML is skipped (no rehype-raw),
 * and react-markdown's default URL transform strips unsafe protocols.
 * Default export so it can be lazy-loaded and kept out of the main bundle.
 */
export default function Markdown({ children, className = '' }: { children: string; className?: string }) {
  return (
    <div className={`md-content ${className}`}>
      <ReactMarkdown skipHtml components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
