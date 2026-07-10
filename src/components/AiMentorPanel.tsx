/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Sparkles, Loader2, Bot, User, HelpCircle, Terminal } from 'lucide-react';

interface AiMentorPanelProps {
  userId: string;
  activeTab: string;
}

interface Message {
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

export function AiMentorPanel({ userId, activeTab }: AiMentorPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'ai',
      text: "Hello! I am your Placify SDE Advisor. Ask me anything about programming concepts, dynamic algorithms, resume optimization, or target company interview loops!",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Context-aware prompt suggestions
  const getContextPrompts = () => {
    switch (activeTab) {
      case 'arena':
        return [
          "Suggest a sliding window template code",
          "Explain graph BFS vs DFS complexity",
          "Optimize space complexity of recursive calls"
        ];
      case 'resume':
        return [
          "How to quantify engineering internship bullets",
          "What keywords will boost SDE-1 ATS score?",
          "Review formatting for clean CV standards"
        ];
      case 'companies':
        return [
          "What is Google's Graph round expectations?",
          "Summarize Amazon's Leadership Principles",
          "Explain TCS Digital advanced coding round format"
        ];
      case 'tracks':
        return [
          "Clarify memory pointer safety in C/C++",
          "When should I use a stack over a queue?",
          "Explain asynchronous event loops in JS"
        ];
      default:
        return [
          "Generate a 4-week SDE placement study plan",
          "How do I practice for behavioral interviews?",
          "Recommend top DSA topics to master first"
        ];
    }
  };

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;
    
    const userMsg: Message = {
      sender: 'user',
      text: textToSend,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/mentor/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `User is viewing the "${activeTab}" tab. Query: "${textToSend}"`
        })
      });
      const data = await response.json();
      
      const aiMsg: Message = {
        sender: 'ai',
        text: data.text || "I apologize, but I encountered an issue parsing that query. Please try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        sender: 'ai',
        text: "I am experiencing connectivity issues. Please verify the backend status and try again.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Trigger Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-lg shadow-cyan-500/20 glow-cyan cursor-pointer"
          id="ai-mentor-floating-btn"
        >
          <span className="absolute inset-0 rounded-full bg-cyan-400 opacity-25 animate-ping"></span>
          <MessageSquare className="h-6 w-6" />
        </motion.button>
      </div>

      {/* Side Slide-out Chat Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed inset-y-0 right-0 z-50 w-full sm:w-[460px] glass-panel shadow-2xl flex flex-col overflow-hidden text-white"
            id="ai-mentor-drawer"
          >
            {/* Header */}
            <header className="p-5 border-b border-cyan-500/15 flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 text-white shadow-inner">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-heading text-base font-bold tracking-tight">Placify AI SDE Mentor</h3>
                  <span className="text-[9px] font-mono text-cyan-300 tracking-wider uppercase">Active Intelligence Engine</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            {/* Chat Messages Log */}
            <main className="flex-1 overflow-y-auto p-5 space-y-4 scroll-smooth">
              {messages.map((msg, index) => {
                const isAI = msg.sender === 'ai';
                return (
                  <div key={index} className={`flex gap-3 ${isAI ? 'justify-start' : 'justify-end'}`}>
                    {isAI && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-950 border border-cyan-500/20 text-cyan-300">
                        <Bot className="h-4 w-4" />
                      </div>
                    )}
                    <div
                      className={`p-3.5 rounded-2xl max-w-[82%] text-xs leading-relaxed ${
                        isAI
                          ? 'bg-[#0a101f]/80 border border-cyan-500/15 text-zinc-100 rounded-tl-sm'
                          : 'bg-gradient-to-r from-cyan-500/10 to-blue-600/15 border border-cyan-500/25 text-cyan-100 rounded-tr-sm'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                      <span className="block text-[8px] text-zinc-500 mt-1.5 font-mono text-right">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {!isAI && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-cyan-400 text-black">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                );
              })}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-950 border border-cyan-500/20 text-cyan-300">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#0a101f]/80 border border-cyan-500/15 text-zinc-400 text-xs flex items-center gap-2 rounded-tl-sm">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
                    Analyzing codebase context & requirements...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </main>

            {/* Suggestions Footer */}
            <footer className="p-4 border-t border-cyan-500/15 bg-black/30 space-y-3">
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-mono">
                <HelpCircle className="h-3.5 w-3.5 text-cyan-400" />
                <span>Suggestions based on active tab:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {getContextPrompts().map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(prompt)}
                    className="text-[10px] text-zinc-300 hover:text-white bg-white/5 border border-white/10 hover:border-cyan-500/30 px-2.5 py-1 rounded-md text-left transition cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Chat Input Bar */}
              <div className="flex gap-2 pt-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSend(input); }}
                  placeholder="Ask a technical or career query..."
                  className="flex-1 bg-black/60 border border-cyan-500/20 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/20"
                />
                <button
                  onClick={() => handleSend(input)}
                  disabled={!input.trim() || isLoading}
                  className="px-4 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed text-black rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </footer>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
