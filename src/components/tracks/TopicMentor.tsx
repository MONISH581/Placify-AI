import { useState } from 'react';
import { Loader2, MessageSquare, Send } from 'lucide-react';
import { askMentor } from '../../services/mentor';
import { LazyMarkdown } from '../LazyMarkdown';
import { MentorSources } from '../MentorSources';
import type { ChatTurn, MentorSource } from '../../types';

interface TopicMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: MentorSource[];
  isError?: boolean;
}

/**
 * Topic-scoped mentor chat. Render with key={`${trackId}:${topicId}`} so history resets per topic.
 */
export function TopicMentor({ trackName, topicName }: { trackName: string; topicName: string }) {
  const [messages, setMessages] = useState<TopicMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const send = async () => {
    const question = input.trim();
    if (!question || loading) return;
    const history: ChatTurn[] = messages
      .filter((message) => !message.isError)
      .map((message) => ({ role: message.role, content: message.content }));
    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setInput('');
    setLoading(true);
    try {
      // The API caps questions at 2000 characters, including this context prefix.
      const contextual = `I am studying "${topicName}" in the "${trackName}" track. ${question}`.slice(0, 2000);
      const result = await askMentor(contextual, history);
      setMessages((prev) => [
        ...prev,
        result.ok
          ? { role: 'assistant', content: result.data.text, sources: result.data.sources }
          : { role: 'assistant', content: `Sorry, I could not answer that: ${result.error}`, isError: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-4 overflow-hidden rounded-xl border border-slate-800 bg-[#161D2F] p-5" id="topic-mentor-widget">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <MessageSquare className="h-5 w-5 text-cyan-400" aria-hidden="true" />
        <div>
          <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-white">Topic mentor</h4>
          <span className="font-mono text-[9px] text-cyan-300">Ask about "{topicName}"</span>
        </div>
      </div>

      <div
        className="max-h-[260px] space-y-3 overflow-y-auto rounded-lg border border-slate-900 bg-slate-950/50 p-4"
        id="topic-mentor-logs"
        aria-live="polite"
      >
        {messages.length === 0 && (
          <p className="text-[11px] text-slate-400">Ask me anything about "{topicName}" and I will explain it step by step.</p>
        )}
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-lg p-3 text-[11px] leading-relaxed ${
                message.role === 'user'
                  ? 'border border-indigo-500/20 bg-indigo-950/40 text-white'
                  : `border bg-slate-900/60 text-slate-300 ${message.isError ? 'border-rose-500/30' : 'border-slate-800'}`
              }`}
            >
              {message.role === 'assistant' && !message.isError ? (
                <LazyMarkdown>{message.content}</LazyMarkdown>
              ) : (
                <p className="whitespace-pre-wrap">{message.content}</p>
              )}
              {message.sources && <MentorSources sources={message.sources} />}
            </div>
          </div>
        ))}
        {loading && (
          <p className="flex items-center gap-2 text-[11px] text-slate-400" role="status">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" aria-hidden="true" /> Thinking...
          </p>
        )}
      </div>

      <form
        className="flex gap-2"
        id="topic-mentor-input-layout"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <label htmlFor="topic-mentor-input" className="sr-only">
          Ask the topic mentor
        </label>
        <input
          id="topic-mentor-input"
          type="text"
          value={input}
          maxLength={2000}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask the mentor to clarify a step..."
          className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-cyan-400"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Send question"
          className="flex cursor-pointer items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Send className="h-3.5 w-3.5" aria-hidden="true" />}
        </button>
      </form>
    </section>
  );
}
