/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  BookOpen, CheckCircle, HelpCircle, Code, ChevronRight, 
  Award, Trophy, Info, Loader2, Sparkles, Send, MessageSquare 
} from 'lucide-react';

interface LearningTracksProps {
  onAddXp: (xp: number) => void;
}

type TopicPhase = {
  id: number;
  name: string;
  topics: any[];
  startIdx: number;
};

export function LearningTracks({ onAddXp }: LearningTracksProps) {
  const [tracks, setTracks] = useState<any[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<any | null>(null);
  const [activeTopicIndex, setActiveTopicIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'theory' | 'examples' | 'challenges' | 'quiz' | 'faq'>('theory');

  // Helper to format bold text and inline code backticks in theories and quizzes
  const renderMarkdown = (text: string) => {
    if (!text) return '';
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-[#DFBA73] font-bold">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} className="bg-slate-950 px-1.5 py-0.5 rounded text-indigo-300 font-mono text-[11px]">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  // Dynamic content state
  const [topicDetails, setTopicDetails] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // Quiz states
  const [selectedQuizOptions, setSelectedQuizOptions] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  // Local AI Mentor states
  const [mentorChat, setMentorChat] = useState<Array<{ sender: 'user' | 'ai'; msg: string }>>([
    { sender: 'ai', msg: "Ask me any questions about this concept, and I will explain step-by-step!" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const [expandedPhases, setExpandedPhases] = useState<Record<number, boolean>>({ 0: true });

  const getPhasesForTrack = (topics: any[]): TopicPhase[] => {
    if (!topics) return [];
    if (selectedTrack?.id === 'w3schools') {
      const groups = topics.reduce<Record<string, any[]>>((acc, topic: any) => {
        const groupName = topic.name.includes(':') ? topic.name.split(':')[0] : 'Core Tutorials';
        acc[groupName] = acc[groupName] || [];
        acc[groupName].push(topic);
        return acc;
      }, {});

      let startIdx = 0;
      return Object.entries(groups).map(([name, groupTopics], index): TopicPhase => {
        const phase = {
          id: index,
          name,
          topics: groupTopics,
          startIdx
        };
        startIdx += groupTopics.length;
        return phase;
      });
    }

    const total = topics.length;
    const size = Math.ceil(total / 4);
    return [
      { id: 0, name: "Phase 1: Essentials & Core Syntax", topics: topics.slice(0, size), startIdx: 0 },
      { id: 1, name: "Phase 2: Data Structures & Control", topics: topics.slice(size, size * 2), startIdx: size },
      { id: 2, name: "Phase 3: OOP & Intermediate Concepts", topics: topics.slice(size * 2, size * 3), startIdx: size * 2 },
      { id: 3, name: "Phase 4: Concurrency & Capstone Projects", topics: topics.slice(size * 3), startIdx: size * 3 }
    ];
  };

  useEffect(() => {
    if (selectedTrack && selectedTrack.topics) {
      if (selectedTrack.id === 'w3schools') {
        const phases = getPhasesForTrack(selectedTrack.topics);
        const activePhase = phases.find((phase) => activeTopicIndex >= phase.startIdx && activeTopicIndex < phase.startIdx + phase.topics.length);
        if (activePhase) {
          setExpandedPhases(prev => ({ ...prev, [activePhase.id]: true }));
        }
        return;
      }
      const size = Math.ceil(selectedTrack.topics.length / 4);
      const activePhaseId = Math.min(3, Math.floor(activeTopicIndex / size));
      setExpandedPhases(prev => ({ ...prev, [activePhaseId]: true }));
    }
  }, [activeTopicIndex, selectedTrack]);

  // Fetch all learning tracks on mount
  useEffect(() => {
    const fetchTracks = async () => {
      try {
        const res = await fetch('/api/learning-tracks');
        const data = await res.json();
        setTracks(data);
        if (data && data.length > 0) {
          setSelectedTrack(data[0]);
        }
      } catch (err) {
        console.error("Failed to fetch tracks:", err);
      }
    };
    fetchTracks();
  }, []);

  // Fetch topic details when selected track or topic changes
  useEffect(() => {
    if (!selectedTrack) return;
    const topic = selectedTrack.topics[activeTopicIndex];
    if (!topic) return;

    const fetchTopicDetails = async () => {
      setLoading(true);
      setTopicDetails(null);
      setQuizSubmitted(false);
      setSelectedQuizOptions({});
      setQuizScore(0);
      setMentorChat([
        { sender: 'ai', msg: `Ask me anything about "${topic.name}", and I will help you debug or explain the logic!` }
      ]);
      try {
        const res = await fetch(`/api/learning-tracks/${selectedTrack.id}/topics/${topic.id}`);
        const data = await res.json();
        setTopicDetails(data);
      } catch (err) {
        console.error("Failed to fetch topic details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTopicDetails();
  }, [selectedTrack, activeTopicIndex]);

  const handleNextTopic = () => {
    if (selectedTrack && activeTopicIndex < selectedTrack.topics.length - 1) {
      setActiveTopicIndex(activeTopicIndex + 1);
      setActiveTab('theory');
    }
  };

  const handleSelectQuizOption = (qIdx: number, oIdx: number) => {
    if (quizSubmitted) return;
    setSelectedQuizOptions({ ...selectedQuizOptions, [qIdx]: oIdx });
  };

  const handleSubmitQuiz = () => {
    if (!topicDetails || !topicDetails.quizzes) return;
    setQuizSubmitted(true);
    let correct = 0;
    topicDetails.quizzes.forEach((q: any, idx: number) => {
      if (selectedQuizOptions[idx] === q.answerIndex) {
        correct++;
      }
    });
    setQuizScore(correct);
    const xp = correct * 10;
    if (xp > 0) {
      onAddXp(xp);
    }
  };

  const handleSendMentorMessage = async () => {
    if (!chatInput.trim() || !topicDetails) return;
    const userMsg = chatInput;
    setMentorChat(prev => [...prev, { sender: 'user', msg: userMsg }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/mentor/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `We are learning "${topicDetails.name}" inside the "${selectedTrack?.name}" track. Student query: "${userMsg}"`
        })
      });
      const data = await res.json();
      setMentorChat(prev => [...prev, { sender: 'ai', msg: data.text }]);
    } catch (err) {
      console.error(err);
      setMentorChat(prev => [...prev, { sender: 'ai', msg: "Sorry, I am facing connectivity issues. Please try again." }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn" id="learning-tracks-container">
      <div className="rounded-lg border border-slate-800 bg-[#161D2F] p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-cyan-400">Tutorial library</p>
            <h2 className="font-heading text-2xl font-bold text-white">W3Schools-style topic map plus placement tracks</h2>
            <p className="mt-1 text-sm text-slate-350">Browse full topic indexes, then open theory, examples, practice tasks, quizzes, and interview FAQs.</p>
          </div>
          <div className="rounded-lg bg-slate-950 px-4 py-3 text-white">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Active topics</p>
            <p className="text-2xl font-black">{selectedTrack?.topics?.length || 0}</p>
          </div>
        </div>
      </div>

      {/* Track selector buttons */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3" id="tracks-selector">
        {tracks.map((trk) => {
          const isSelected = selectedTrack && trk.id === selectedTrack.id;
          return (
            <div
              key={trk.id}
              onClick={() => {
                setSelectedTrack(trk);
                setActiveTopicIndex(0);
                setActiveTab('theory');
              }}
              id={`track-button-${trk.id}`}
              className={`p-3 rounded-lg border cursor-pointer text-center transition flex flex-col items-center gap-1.5 ${
                isSelected 
                  ? 'bg-slate-950 border-cyan-500/50 text-white shadow-md shadow-slate-950/10' 
                  : 'bg-[#161D2F] border-slate-800 text-slate-300 hover:border-cyan-500 hover:text-white'
              }`}
            >
              <span className="text-xl font-black">{trk.logo}</span>
              <span className="text-xs font-bold font-sans tracking-tight">{trk.name}</span>
            </div>
          );
        })}
      </div>

      {selectedTrack && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="track-details-split">
          {/* Syllabus Sidebar */}
          <div className="lg:col-span-3 space-y-3" id="track-sidebar">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest px-1 font-mono">Curriculum Syllabus</h3>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1" id="syllabus-index">
              {getPhasesForTrack(selectedTrack.topics).map((phase) => {
                const isExpanded = expandedPhases[phase.id];
                return (
                  <div key={phase.id} className="space-y-1.5 border border-slate-800 bg-[#161D2F] rounded-lg overflow-hidden p-2 transition shadow-sm">
                    <button
                      onClick={() => setExpandedPhases(prev => ({ ...prev, [phase.id]: !prev[phase.id] }))}
                      className="w-full flex items-center justify-between text-left px-2 py-1.5 text-xs font-bold font-mono text-slate-200 hover:text-cyan-400"
                    >
                      <span className="truncate max-w-[90%]">{phase.name}</span>
                      <ChevronRight className={`w-3.5 h-3.5 shrink-0 transform transition-transform duration-200 ${isExpanded ? 'rotate-90 text-cyan-400' : 'text-slate-400'}`} />
                    </button>

                    {isExpanded && (
                      <div className="space-y-1 pl-1 pr-1 pb-1 animate-slideDown">
                        {phase.topics.map((t: any, subIdx: number) => {
                          const originalIdx = phase.startIdx + subIdx;
                          const isActive = originalIdx === activeTopicIndex;
                          return (
                            <div
                              key={t.id}
                              onClick={() => {
                                setActiveTopicIndex(originalIdx);
                                setActiveTab('theory');
                              }}
                              className={`p-2.5 rounded-lg border text-left cursor-pointer transition flex items-center justify-between ${
                                isActive
                                  ? 'bg-cyan-950/45 border-cyan-500/50 text-cyan-300 font-semibold'
                                  : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                              }`}
                            >
                              <span className="text-[10px] truncate max-w-[85%]">{selectedTrack.id === 'w3schools' && t.name.includes(':') ? t.name.split(':').slice(1).join(':').trim() : t.name}</span>
                              <ChevronRight className="w-3 h-3 shrink-0" />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Curriculum Content Workspace */}
          <div className="lg:col-span-9 space-y-6" id="track-curriculum-content">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-20 bg-[#161D2F] border border-slate-800 rounded-xl min-h-[400px]">
                <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mb-4" />
                <span className="text-sm text-slate-400 font-mono">Assembling curriculum materials...</span>
              </div>
            ) : topicDetails ? (
              <div className="space-y-6">
                <div className="bg-[#161D2F] border border-slate-800 rounded-xl overflow-hidden" id="workspace-core-card">
                  {/* Dynamic Concept Tabs */}
                  <div className="border-b border-slate-800 bg-slate-900/30 flex text-xs font-mono" id="concept-tabs">
                    {[
                      { id: 'theory', label: 'Theory & Visuals', icon: BookOpen },
                      { id: 'examples', label: 'Code Examples', icon: Code },
                      { id: 'challenges', label: 'Challenges', icon: Award },
                      { id: 'quiz', label: 'Checkpoint Quiz', icon: HelpCircle },
                      { id: 'faq', label: 'Interview FAQ', icon: Trophy }
                    ].map((tab) => {
                      const Icon = tab.icon;
                      const isTabActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as any)}
                          className={`flex-1 py-3 text-center font-semibold border-b-2 transition flex items-center justify-center gap-1.5 ${
                            isTabActive 
                              ? 'border-cyan-400 text-cyan-300 bg-slate-800/10' 
                              : 'border-transparent text-slate-400 hover:text-white'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Tab contents */}
                  <div className="p-6 text-[13px] text-slate-200 leading-relaxed max-h-[550px] overflow-y-auto" id="workspace-tab-contents">
                    
                    {/* Theory & Visuals Tab */}
                    {activeTab === 'theory' && (
                      <div className="space-y-6" id="theory-tab-view">
                        <div className="space-y-3">
                          <h2 className="text-lg font-bold text-white font-mono">{topicDetails.name} Explanation</h2>
                          <p className="whitespace-pre-wrap leading-relaxed text-slate-200">{renderMarkdown(topicDetails.theory)}</p>
                        </div>

                        {topicDetails.visualExplanation && (
                          <div className="space-y-2 border-t border-slate-800 pt-4" id="visual-segment">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Visual Structure Flow</span>
                            <pre className="bg-slate-950 p-4 rounded-lg border border-slate-850 font-mono text-[11px] text-cyan-300 overflow-x-auto whitespace-pre">
                              {topicDetails.visualExplanation}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Code Examples Tab */}
                    {activeTab === 'examples' && (
                      <div className="space-y-5" id="examples-tab-view">
                        <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">Functional Examples</h3>
                        {topicDetails.codeExamples && topicDetails.codeExamples.map((ex: any, idx: number) => (
                          <div key={idx} className="space-y-2 bg-slate-950/40 p-4 rounded-lg border border-slate-800">
                            <span className="text-xs font-bold text-cyan-400 block">{ex.title}</span>
                            <div className="relative">
                              <pre className="bg-slate-950 p-3 rounded border border-slate-850 font-mono text-[11px] text-cyan-300 overflow-x-auto whitespace-pre-wrap">
                                {ex.code}
                              </pre>
                              <button
                                onClick={() => navigator.clipboard.writeText(ex.code)}
                                className="absolute top-2 right-2 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] text-slate-300 rounded"
                              >
                                Copy
                              </button>
                            </div>
                          </div>
                        ))}

                        {topicDetails.practiceQuestions && (
                          <div className="mt-5 p-4 bg-indigo-950/10 border border-cyan-500/15 rounded-xl space-y-2">
                            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block font-mono">Recommended Sandbox Exercises (5 Working Problems)</span>
                            <ul className="list-disc pl-4 space-y-2">
                              {topicDetails.practiceQuestions.map((q: string, idx: number) => (
                                <li key={idx} className="text-slate-200 text-[13px]">{renderMarkdown(q)}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Challenges Tab */}
                    {activeTab === 'challenges' && (
                      <div className="space-y-5" id="challenges-tab-view">
                        <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">Active Concept Coding Challenges</h3>
                        {topicDetails.codingChallenges && topicDetails.codingChallenges.map((ch: any, idx: number) => (
                          <div key={idx} className="space-y-3 bg-[#0F172A] p-5 rounded-xl border border-slate-850">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white uppercase text-xs tracking-wider">{ch.title}</span>
                              <span className="text-[9px] bg-indigo-950 border border-indigo-500/30 px-2 py-0.5 rounded text-indigo-300 font-mono">XP: +30</span>
                            </div>
                            <p className="text-slate-300 whitespace-pre-wrap">{ch.description}</p>
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Starter Workspace Template</span>
                              <pre className="bg-slate-950 p-3.5 rounded border border-slate-900 font-mono text-[11px] text-indigo-400 overflow-x-auto whitespace-pre-wrap">
                                {ch.starterCode}
                              </pre>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Checkpoint Quiz Tab */}
                    {activeTab === 'quiz' && (
                      <div className="space-y-6" id="quiz-tab-view">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                          <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">Topic Assessment Checkpoint</h3>
                          {quizSubmitted && (
                            <span className="text-xs bg-cyan-400/10 border border-cyan-400/20 px-2.5 py-0.5 rounded text-cyan-300 font-bold font-mono">
                              SCORE: {quizScore} / {topicDetails.quizzes.length}
                            </span>
                          )}
                        </div>

                        {topicDetails.quizzes && topicDetails.quizzes.map((q: any, qIdx: number) => {
                          const chosen = selectedQuizOptions[qIdx];
                          const hasChosen = chosen !== undefined;

                          return (
                            <div key={qIdx} className="space-y-4 pb-6 border-b border-slate-800 last:border-0 last:pb-0" id={`quiz-q-${qIdx}`}>
                              <p className="font-bold text-white text-[13px] leading-normal">
                                Q{qIdx + 1}: {renderMarkdown(q.question)}
                              </p>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {q.options.map((opt: string, oIdx: number) => {
                                  const isThisChosen = chosen === oIdx;
                                  const isThisCorrect = oIdx === q.answerIndex;
                                  
                                  let optionStyle = 'bg-slate-900/60 border-slate-800 text-slate-200 hover:border-slate-700 hover:text-white';
                                  if (quizSubmitted) {
                                    if (isThisCorrect) {
                                      optionStyle = 'bg-cyan-955/40 border-cyan-500 text-cyan-300 font-semibold';
                                    } else if (isThisChosen) {
                                      optionStyle = 'bg-red-950/40 border-red-500 text-red-300';
                                    }
                                  } else if (isThisChosen) {
                                    optionStyle = 'bg-indigo-950/50 border-indigo-500 text-indigo-200 font-semibold';
                                  }

                                  return (
                                    <div
                                      key={oIdx}
                                      onClick={() => handleSelectQuizOption(qIdx, oIdx)}
                                      className={`p-3 rounded-lg border cursor-pointer transition flex items-center gap-2 text-[13px] ${optionStyle}`}
                                    >
                                      <span className="w-5 h-5 rounded-full bg-slate-950/80 text-[10px] font-bold flex items-center justify-center border border-slate-800">
                                        {String.fromCharCode(65 + oIdx)}
                                      </span>
                                      <span>{opt}</span>
                                    </div>
                                  );
                                })}
                              </div>

                              {quizSubmitted && (
                                <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-900 text-slate-200 flex items-start gap-2 text-[12px] leading-normal">
                                  <Info className="w-4 h-4 text-cyan-450 shrink-0 mt-0.5" />
                                  <p>{renderMarkdown(q.explanation)}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        <div className="flex items-center justify-end border-t border-slate-800 pt-4">
                          {quizSubmitted ? (
                            <button
                              onClick={() => {
                                setQuizSubmitted(false);
                                setSelectedQuizOptions({});
                                setQuizScore(0);
                              }}
                              className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition font-mono"
                            >
                              Reset Checkpoint
                            </button>
                          ) : (
                            <button
                              onClick={handleSubmitQuiz}
                              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition font-mono shadow-lg shadow-indigo-600/20"
                            >
                              Submit Quiz Checkpoint
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Interview FAQ Tab */}
                    {activeTab === 'faq' && (
                      <div className="space-y-4" id="faq-tab-view">
                        <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">Concept Interview Frequently Asked Questions</h3>
                        {topicDetails.interviewQuestions && topicDetails.interviewQuestions.map((qna: any, idx: number) => (
                          <div key={idx} className="p-4 bg-slate-950/40 rounded-lg border border-slate-800 space-y-2">
                            <span className="font-bold text-white font-mono flex items-start gap-1.5 text-xs">
                              <span className="text-cyan-400 font-bold">Q:</span> {qna.question}
                            </span>
                            <p className="text-slate-300 pl-4">{qna.answer}</p>
                          </div>
                        ))}
                      </div>
                    )}

                  </div>

                  {/* Navigation footer */}
                  <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
                    <button
                      onClick={handleNextTopic}
                      className="px-5 py-2 bg-cyan-400 hover:bg-cyan-300 text-black rounded-lg text-xs font-bold transition font-mono"
                    >
                      Next Concept &rarr;
                    </button>
                  </div>
                </div>

                {/* Floating AI Topic Assistant widget */}
                <div className="bg-[#161D2F] border border-slate-800 rounded-xl overflow-hidden p-5 space-y-4" id="topic-mentor-widget">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                    <MessageSquare className="w-5 h-5 text-cyan-450" />
                    <div>
                      <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider">Dynamic Concept AI Mentor</h4>
                      <span className="text-[9px] text-cyan-300 font-mono">Sandbox Advisor Active</span>
                    </div>
                  </div>

                  <div className="space-y-3 max-h-[200px] overflow-y-auto bg-slate-950/50 p-4 rounded-lg border border-slate-900" id="topic-mentor-logs">
                    {mentorChat.map((chat, idx) => (
                      <div key={idx} className={`flex ${chat.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`p-3 rounded-lg max-w-[80%] leading-relaxed ${
                          chat.sender === 'user' 
                            ? 'bg-indigo-950/40 border border-indigo-500/20 text-white text-[11px]' 
                            : 'bg-slate-900/60 border border-slate-800 text-slate-300 text-[11px]'
                        }`}>
                          {chat.msg}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2" id="topic-mentor-input-layout">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSendMentorMessage(); }}
                      placeholder="Ask the AI mentor to clarify a logic step..."
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-cyan-400"
                    />
                    <button
                      onClick={handleSendMentorMessage}
                      disabled={chatLoading}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-850 text-white rounded-lg text-xs font-bold transition flex items-center justify-center"
                    >
                      {chatLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-20 bg-[#161D2F] border border-slate-800 rounded-xl min-h-[400px]">
                <BookOpen className="w-12 h-12 text-slate-600 mb-4" />
                <h3 className="text-sm font-bold text-white mb-1">Select a concept on the left syllabus</h3>
                <p className="text-xs text-slate-400 text-center">Complete the curriculum outline systematically to receive badges and streak XP.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
