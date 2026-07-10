/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sparkles, Mic, Play, Send, CheckCircle, BarChart2, ShieldCheck, HelpCircle, ChevronRight, MessageSquare } from 'lucide-react';

interface MockInterviewProps {
  userId: string;
  onAddXp: (xp: number) => void;
}

export function MockInterview({ userId, onAddXp }: MockInterviewProps) {
  const [interviewType, setInterviewType] = useState<'Technical' | 'HR' | 'Behavioral'>('Technical');
  const [session, setSession] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [voiceRecording, setVoiceRecording] = useState(false);

  const startInterview = async () => {
    setIsLoading(true);
    setSession(null);
    try {
      const res = await fetch("/api/mock-interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: interviewType, userId })
      });
      const data = await res.json();
      setSession(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimulateVoiceInput = () => {
    setVoiceRecording(true);
    setTimeout(() => {
      let speechPhrase = "";
      if (interviewType === "Technical") {
        speechPhrase = "We should prioritize SQL indices when lookups are frequent. However, inserts will write slower. A heap hash allocation can speed queries to constant time O(1).";
      } else {
        speechPhrase = "I prioritize standard team milestones, keep active daily checklists, and clear communicative blocks early through agile guidelines and active feedback loop structures.";
      }
      setCurrentAnswer(speechPhrase);
      setVoiceRecording(false);
    }, 1500);
  };

  const submitAnswer = async () => {
    if (!session || !currentAnswer.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/mock-interview/${session.id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: currentAnswer })
      });
      const data = await res.json();
      setSession(data);
      setCurrentAnswer('');

      // Add small reward XP per answer
      onAddXp(20);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6" id="mock-interview-container">
      {!session ? (
        <div className="max-w-2xl mx-auto bg-[#161D2F] border border-slate-800 rounded-xl p-6" id="prep-params">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">AI Interactive Mock Interview</h3>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed mb-6">
            Recruitment screens involve HR culture review, engineering design questions, and behavioural conflict patterns. Choose a workspace session category to launch a simulated interactive evaluation loop.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            {(['Technical', 'HR', 'Behavioral'] as const).map((type) => (
              <div
                key={type}
                onClick={() => setInterviewType(type)}
                className={`p-4 rounded-xl border cursor-pointer transition text-center ${
                  interviewType === type
                    ? 'bg-indigo-950/40 border-indigo-500 text-indigo-300 font-semibold'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="text-xl mb-1">{type === 'Technical' ? '🖥️' : type === 'HR' ? '👥' : '📈'}</div>
                <div className="text-xs">{type} Assessment</div>
              </div>
            ))}
          </div>

          <button
            onClick={startInterview}
            disabled={isLoading}
            id="start-mock-btn"
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/30"
          >
            {isLoading ? "Provisioning..." : "Launch Mock Assessment"}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main active answering block */}
          <div className="lg:col-span-2 space-y-6">
            {session.status === 'In Progress' ? (
              <div className="bg-[#161D2F] border border-slate-800 rounded-xl p-5 space-y-4" id="active-session-block">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-[10px] text-indigo-300 bg-indigo-950/65 px-2 py-0.5 rounded border border-indigo-500/20 uppercase font-mono font-bold">
                    {session.type} Interview Series - Active
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Question {session.currentQuestionIndex + 1} of {session.questions.length}
                  </span>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 my-2">
                  <p className="text-xs text-indigo-400 font-sans italic mb-1 uppercase tracking-wider text-[10px] font-bold">Interviewer Question:</p>
                  <p className="text-sm font-semibold text-white leading-relaxed">
                    "{session.questions[session.currentQuestionIndex]}"
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Your Answer Response Output:</label>
                  <textarea
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    placeholder="Provide a standard tech summary, citing quantitative outcomes where applicable..."
                    className="w-full h-[150px] p-3 text-xs bg-slate-900 border border-slate-800 rounded-xl outline-none text-slate-200 font-sans resize-none"
                    spellCheck="false"
                    id="interview-textarea"
                  />
                </div>

                {/* Simulated Speech-to-text Audio activation */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={handleSimulateVoiceInput}
                    disabled={voiceRecording || isLoading}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition-all flex items-center gap-1.5"
                  >
                    <Mic className={`w-3.5 h-3.5 ${voiceRecording ? 'text-red-500 animate-pulse' : 'text-slate-400'}`} />
                    {voiceRecording ? "Capturing Voice..." : "AI Voice Input"}
                  </button>

                  <button
                    onClick={submitAnswer}
                    disabled={!currentAnswer.trim() || isLoading}
                    className="px-5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow shadow-indigo-600/30"
                  >
                    <Send className="w-3.5 h-3.5" /> {isLoading ? "Analyzing..." : "Submit Answer"}
                  </button>
                </div>
              </div>
            ) : (
              /* Completed Interview Score Summary Report */
              <div className="bg-[#161D2F] border border-slate-800 rounded-xl p-6 space-y-6" id="completed-report-view">
                <div className="text-center space-y-2">
                  <span className="text-3xl">🏆</span>
                  <h2 className="text-lg font-bold text-white">Mock Interview Finished!</h2>
                  <p className="text-xs text-slate-400">Our HR evaluation models processed your answers successfully.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 border-y border-slate-800">
                  <div className="bg-slate-900 p-4 rounded-xl text-center">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1">AGGREGATE SUITABILITY SCORE</p>
                    <div className="text-5xl font-mono font-bold text-white mb-2">{session.overallScore}%</div>
                    <span className="text-xs bg-cyan-900/30 text-cyan-300 font-semibold px-2 py-0.5 rounded border border-cyan-500/20 font-mono">PASSED</span>
                  </div>

                  <div className="bg-slate-900 p-4 rounded-xl flex flex-col justify-center">
                    <p className="text-xs font-semibold text-indigo-400 mb-1">AI Career Advisor Summary:</p>
                    <p className="text-[11px] text-slate-300 leading-relaxed italic">
                      "{session.overallFeedback}"
                    </p>
                  </div>
                </div>

                {/* Granular Question-by-Question feedbacks list */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Detailed Answers Scorecard</h4>
                  {session.questions.map((q: string, idx: number) => (
                    <div key={idx} className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 text-xs space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-semibold border-b border-slate-850 pb-1">
                        <span className="text-slate-400">Q{idx + 1}: {q.substring(0, 45)}...</span>
                        <span className="text-indigo-400 font-mono">Score: {session.scores[idx]}/100</span>
                      </div>
                      <p className="text-slate-300 text-[11px]"><strong>Your Ans:</strong> "{session.answers[idx]}"</p>
                      <p className="text-cyan-400 bg-cyan-950/20 p-2 rounded text-[11px] font-mono whitespace-pre-wrap leading-normal">
                        <strong>Feedback suggestions:</strong> {session.feedback[idx]}
                      </p>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setSession(null)}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition"
                >
                  Close & Prepare New Mock Interview
                </button>
              </div>
            )}
          </div>

          {/* Right sidebar interview tips column */}
          <div className="space-y-4">
            <div className="border border-slate-800 bg-[#161D2F] rounded-xl p-4 text-xs space-y-3" id="interviewer-insiders">
              <span className="text-indigo-400 font-bold block uppercase text-[10px]">Interviewer Guidelines</span>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                Always structure answers using the <strong>STAR Technique</strong> for behavioral panels:
              </p>
              <ul className="space-y-2 text-[11px] text-slate-400 font-mono pl-2 border-l-2 border-slate-800">
                <li>• <strong>S</strong>ituation: Context details</li>
                <li>• <strong>T</strong>ask: Core challenge goal</li>
                <li>• <strong>A</strong>ction: Precise actions</li>
                <li>• <strong>R</strong>esult: Quantitative metric outputs</li>
              </ul>
            </div>
            
            <div className="border border-slate-800 bg-slate-900/40 rounded-xl p-4 text-xs space-y-2">
              <span className="text-cyan-400 font-bold block uppercase text-[10px]">Speech Recorder Simulated tip</span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Click <strong>AI Voice Input</strong> to simulate capturing speech via browser microphones. It injects a highly coherent candidate response for testing.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
