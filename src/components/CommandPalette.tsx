import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CornerDownLeft, Search } from 'lucide-react';
import { navItems } from './Navigation';
import { useAuth } from '../context/AuthContext';

/** Ctrl/Cmd+K page switcher. Controlled by AppLayout so the sidebar can open it too. */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    // The account page is listed once, under both names people search for.
    const all = navItems
      .filter((item) => !item.adminOnly || user?.isAdmin)
      .map(({ path, label }) => ({ path, label: path === '/profile' ? 'Profile & account' : label }));
    const q = query.trim().toLowerCase();
    return q ? all.filter((item) => item.label.toLowerCase().includes(q)) : all;
  }, [query, user?.isAdmin]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => setActive(0), [query]);

  if (!open) return null;

  const go = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 px-4 pt-[15vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Jump to a page"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="w-full max-w-md overflow-hidden rounded-lg border border-slate-800 bg-card">
        <div className="flex items-center gap-2 border-b border-slate-800 px-3">
          <Search className="h-4 w-4 text-slate-500" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') onClose();
              else if (event.key === 'ArrowDown') {
                event.preventDefault();
                setActive((index) => Math.min(index + 1, results.length - 1));
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActive((index) => Math.max(index - 1, 0));
              } else if (event.key === 'Enter' && results[active]) go(results[active].path);
            }}
            placeholder="Jump to a page..."
            aria-label="Search pages"
            className="h-11 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
          />
        </div>
        <ul className="max-h-72 overflow-y-auto p-1.5">
          {results.length === 0 && <li className="px-3 py-4 text-xs text-slate-400">No matching page.</li>}
          {results.map((item, index) => (
            <li key={item.path}>
              <button
                type="button"
                onClick={() => go(item.path)}
                onMouseEnter={() => setActive(index)}
                className={`flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 text-left text-sm ${
                  index === active ? 'bg-slate-900 text-white' : 'text-slate-300'
                }`}
              >
                {item.label}
                {index === active && <CornerDownLeft className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
