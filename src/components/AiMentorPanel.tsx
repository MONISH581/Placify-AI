/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, HelpCircle, Loader2, MessageSquare, Send, Sparkles, User as UserIcon, X } from 'lucide-react';
import { askMentor } from '../services/mentor';
import { LazyMarkdown } from './LazyMarkdown';
import { MentorSources } from './MentorSources';
import type { ChatTurn, MentorSource } from '../types';

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: MentorSource[];
  fallback?: boolean;
  /** Local-only messages (greeting, errors) are not sent back as chat history. */
  localOnly?: boolean;
  isError?: boolean;
}

const PAGE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  arena: 'Coding Arena',
  tracks: 'Learning Tracks',
  placement: 'Placement Hub',
  interview: 'Mock Interview',
  resume: 'Resume ATS',
  companies: 'Company Prep',
  contests: 'Contests',
  community: 'Community',
  career: 'Career Roadmap',
  profile: 'Profile',
  admin: 'Admin Studio',
};

const PAGE_PROMPTS: Record<string, string[]> = {
  arena: [
    'Suggest a sliding window template',
    'Explain graph BFS vs DFS complexity',
    'How do I reduce the space complexity of recursion?',
  ],
  resume: [
    'How do I quantify internship bullet points?',
    'Which keywords matter for an SDE-1 resume?',
    'What makes a resume ATS-friendly?',
  ],
  companies: [
    'What do Google coding rounds focus on?',
    "Summarize Amazon's Leadership Principles",
    'How should I prepare for a service-company coding test?',
  ],
  tracks: [
    'Explain pointers and memory safety in C/C++',
    'When should I use a stack over a queue?',
    'Explain the JavaScript event loop',
  ],
  interview: [
    'How do I structure an answer with the STAR method?',
    'How should I answer "Tell me about yourself"?',
    'What do interviewers look for in system design answers?',
  ],
};

const DEFAULT_PROMPTS = [
  'Create a 4-week placement study plan',
  'How do I practice for behavioral interviews?',
  'Which DSA topics should I master first?',
];

let nextMessageId = 1;

export function AiMentorPanel() {
  const location = useLocation();
  const pageKey = location.pathname.split('/')[1] || 'dashboard';
  const pageLabel = PAGE_LABELS[pageKey] ?? 'Placify';
  const prompts = PAGE_PROMPTS[pageKey] ?? DEFAULT_PROMPTS;

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: nextMessageId++,
      role: 'assistant',
      content:
        'Hello! I am your Placify mentor. Ask me about programming concepts, algorithms, resumes, or interview preparation.',
      timestamp: new Date(),
      localOnly: true,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = async (text: string) => {
    const question = text.trim();
    if (!question || isLoading) return;

    const history: ChatTurn[] = messages
      .filter((message) => !message.localOnly)
      .map((message) => ({ role: message.role, content: message.content }));

    setMessages((prev) => [...prev, { id: nextMessageId++, role: 'user', content: question, timestamp: new Date() }]);
    setInput('');
    setIsLoading(true);

    try {
      const result = await askMentor(question, history);
      if (result.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: nextMessageId++,
            role: 'assistant',
            content: result.data.text,
            sources: result.data.sources,
            fallback: result.data.source === 'fallback',
            timestamp: new Date(),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: nextMessageId++,
            role: 'assistant',
            content: `Sorry, I could not answer that: ${result.error}`,
            timestamp: new Date(),
            localOnly: true,
            isError: true,
          },
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <motion.button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          aria-label={isOpen ? 'Close AI mentor' : 'Open AI mentor'}
          aria-expanded={isOpen}
          className="glow-cyan relative flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-lg shadow-cyan-500/20"
          id="ai-mentor-floating-btn"
        >
          <span className="absolute inset-0 animate-ping rounded-full bg-cyan-400 opacity-25" aria-hidden="true" />
          <MessageSquare className="h-6 w-6" aria-hidden="true" />
        </motion.button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="glass-panel fixed inset-y-0 right-0 z-50 flex w-full flex-col overflow-hidden text-white shadow-2xl sm:w-[460px]"
            id="ai-mentor-drawer"
            aria-label="AI mentor chat"
          >
            <header className="flex items-center justify-between border-b border-cyan-500/15 bg-black/40 p-5">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 text-white shadow-inner">
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-heading text-base font-bold tracking-tight">Placify AI Mentor</h3>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-cyan-300">Context: {pageLabel}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close AI mentor"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-zinc-400 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto scroll-smooth p-5" aria-live="polite">
              {messages.map((message) => {
                const isAssistant = message.role === 'assistant';
                return (
                  <div key={message.id} className={`flex gap-3 ${isAssistant ? 'justify-start' : 'justify-end'}`}>
                    {isAssistant && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-cyan-500/20 bg-zinc-950 text-cyan-300">
                        <Bot className="h-4 w-4" aria-hidden="true" />
                      </div>
                    )}
                    <div
                      className={`max-w-[82%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                        isAssistant
                          ? `rounded-tl-sm border bg-[#0a101f]/80 text-zinc-100 ${message.isError ? 'border-rose-500/30' : 'border-cyan-500/15'}`
                          : 'rounded-tr-sm border border-cyan-500/25 bg-gradient-to-r from-cyan-500/10 to-blue-600/15 text-cyan-100'
                      }`}
                    >
                      {isAssistant && !message.isError ? (
                        <LazyMarkdown>{message.content}</LazyMarkdown>
                      ) : (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      )}
                      {message.fallback && (
                        <p className="mt-2 font-mono text-[9px] text-amber-300/80">
                          Offline fallback answer (AI mentor service unavailable)
                        </p>
                      )}
                      {message.sources && <MentorSources sources={message.sources} />}
                      <span className="mt-1.5 block text-right font-mono text-[8px] text-zinc-500">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {!isAssistant && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-cyan-400 text-black">
                        <UserIcon className="h-4 w-4" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                );
              })}
              {isLoading && (
                <div className="flex justify-start gap-3" role="status">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-cyan-500/20 bg-zinc-950 text-cyan-300">
                    <Bot className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-cyan-500/15 bg-[#0a101f]/80 p-3.5 text-xs text-zinc-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" aria-hidden="true" />
                    Thinking...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <footer className="space-y-3 border-t border-cyan-500/15 bg-black/30 p-4">
              <div className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-400">
                <HelpCircle className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
                <span>Suggestions for {pageLabel}:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {prompts.map((prompt) => (
                  <button
                    type="button"
                    key={prompt}
                    onClick={() => void handleSend(prompt)}
                    disabled={isLoading}
                    className="cursor-pointer rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-left text-[10px] text-zinc-300 transition hover:border-cyan-500/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <form
                className="flex gap-2 pt-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleSend(input);
                }}
              >
                <label htmlFor="ai-mentor-input" className="sr-only">
                  Ask the AI mentor
                </label>
                <input
                  id="ai-mentor-input"
                  type="text"
                  value={input}
                  maxLength={2000}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Ask a technical or career question..."
                  className="flex-1 rounded-xl border border-cyan-500/20 bg-black/60 px-4 py-2.5 text-xs text-white outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/20"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  aria-label="Send message"
                  className="flex cursor-pointer items-center justify-center rounded-xl bg-cyan-400 px-4 text-xs font-bold text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                </button>
              </form>
            </footer>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
