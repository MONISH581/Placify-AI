/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Terminal, Lightbulb, Play, Send, CheckCircle2, XCircle, ChevronRight, HelpCircle, Code, Award, Copy, Lock, ShieldAlert, Sparkles, AwardIcon, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Problem {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
  description: string;
  constraints: string;
  inputFormat: string;
  outputFormat: string;
  examples: { input: string; output: string; explanation?: string }[];
  hints: string[];
  editorial: string;
  solutions?: {
    python?: string;
    java?: string;
    c?: string;
    cpp?: string;
    javascript?: string;
  };
  starterCode?: {
    python?: string;
    java?: string;
    c?: string;
    cpp?: string;
    javascript?: string;
  };
}

interface CodingArenaProps {
  problems: Problem[];
  selectedProblem: Problem | null;
  onSelectProblem: (prob: Problem) => void;
  userId: string;
  onSubmissionSuccess: (xpGained: number, problemId?: string) => void;
  solvedProblemIds: string[];
  userXp?: number;
}

export function CodingArena({
  problems,
  selectedProblem,
  onSelectProblem,
  userId,
  onSubmissionSuccess,
  solvedProblemIds = [],
  userXp = 0
}: CodingArenaProps) {
  const [lang, setLang] = useState('javascript');
  const [code, setCode] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'editorial' | 'hints'>('details');
  const [unlockedHintLevel, setUnlockedHintLevel] = useState(0); // 0 means none, up to 5
  const [submissionsHistory, setSubmissionsHistory] = useState<any[]>([]);
  const [activeSolutionLanguage, setActiveSolutionLanguage] = useState('javascript');
  const [selectedTopic, setSelectedTopic] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [selectedCompany, setSelectedCompany] = useState('All');

  // Gamified Topic Worlds
  const [activeWorldId, setActiveWorldId] = useState('all');

  const topicWorlds = [
    { id: 'arrays', name: 'Array Valley', tags: ['Arrays', 'Two Pointers', 'Sliding Window'], requiredXp: 0, icon: '🏔️', color: 'border-cyan-500/20 text-cyan-400' },
    { id: 'strings', name: 'String Sanctum', tags: ['Strings', 'Two Pointers'], requiredXp: 200, icon: '📜', color: 'border-cyan-500/20 text-cyan-450' },
    { id: 'linear', name: 'Linear Queue/Stack', tags: ['Stack', 'Queue', 'Linked Lists', 'Heaps'], requiredXp: 500, icon: '⚙️', color: 'border-indigo-500/20 text-indigo-400' },
    { id: 'graphs', name: 'Graph & Tree Heights', tags: ['Trees', 'Graphs'], requiredXp: 900, icon: '🌳', color: 'border-cyan-500/20 text-cyan-300' },
    { id: 'dp', name: 'Recursion & DP Temple', tags: ['Recursion', 'Dynamic Programming', 'Backtracking'], requiredXp: 1300, icon: '⛩️', color: 'border-rose-500/20 text-rose-400' }
  ];

  const topicsList = [
    'All', 'Arrays', 'Strings', 'Linked Lists', 'Stacks', 'Queues', 'Hashing', 'Trees', 
    'Binary Search Trees', 'Heaps', 'Graphs', 'Recursion', 'Backtracking', 'Greedy Algorithms', 
    'Dynamic Programming', 'Tries', 'Segment Trees', 'Bit Manipulation', 'Sliding Window', 
    'Two Pointers', 'Advanced Interview Problems'
  ];

  const defaultTemplates: Record<string, string> = {
    javascript: `// Write clean JavaScript below\nfunction solve(input) {\n    // Implement your logic here\n    console.log("Processing input: ", input);\n    return "0 1";\n}`,
    python: `# Python solution\ndef solve(input_str):\n    # TODO: Implement algorithm\n    return "0 1"`,
    java: `// Java solution\npublic class Solution {\n    public static String solve(String input) {\n        // Enter computation details\n        return "0 1";\n    }\n}`,
    cpp: `// C++ implementation\n#include <iostream>\nusing namespace std;\n\nstring solve(string input) {\n    return "0 1";\n}`,
    c: `// C implementation\n#include <stdio.h>\n#include <stdlib.h>\n\nchar* solve(char* input) {\n    // Implement logic here\n    return "0 1";\n}`
  };

  useEffect(() => {
    if (selectedProblem) {
      const problemStarter = selectedProblem.starterCode?.[lang];
      setCode(problemStarter || defaultTemplates[lang] || defaultTemplates['javascript']);
      setUnlockedHintLevel(0);
      setSubmissionResult(null);
      fetchSubmissions();
    }
  }, [selectedProblem, lang]);

  const fetchSubmissions = async () => {
    if (!selectedProblem) return;
    try {
      const res = await fetch(`/api/submissions?userId=${userId}`);
      const data = await res.json();
      const filtered = data.filter((s: any) => s.problemId === selectedProblem.id);
      setSubmissionsHistory(filtered);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRunCode = async (isSubmit: boolean) => {
    if (!selectedProblem) return;
    setIsRunning(true);
    setSubmissionResult(null);

    try {
      const res = await fetch(`/api/problems/${selectedProblem.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          language: lang,
          code,
          isSubmission: isSubmit
        })
      });
      const data = await res.json();
      setSubmissionResult(data);
      
      if (isSubmit && data.success) {
        onSubmissionSuccess(data.submission?.xpEarned || 20, selectedProblem.id);
      }
      fetchSubmissions();
    } catch (err) {
      console.error(err);
      setSubmissionResult({ error: "Code runtime connection timed out" });
    } finally {
      setIsRunning(false);
    }
  };

  const copyTemplate = () => {
    navigator.clipboard.writeText(code);
  };

  const getDiffBadge = (diff: string) => {
    switch (diff) {
      case 'Easy': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'Medium': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'Hard': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-slate-500/10 text-slate-300';
    }
  };

  const companyList = Array.from(new Set(
    problems
      .flatMap((prob) => prob.tags || [])
      .filter((tag) => !topicsList.includes(tag) && tag !== 'Company Wise')
  )).sort();

  const filteredProblems = problems.filter((prob) => {
    // Topic World Filter
    if (activeWorldId !== 'all') {
      const worldObj = topicWorlds.find(w => w.id === activeWorldId);
      if (worldObj) {
        const matchesWorld = prob.tags.some(tag => worldObj.tags.includes(tag));
        if (!matchesWorld) return false;
      }
    }
    const matchesTopic = selectedTopic === 'All' || prob.tags.includes(selectedTopic);
    const matchesDifficulty = selectedDifficulty === 'All' || prob.difficulty === selectedDifficulty;
    const matchesCompany = selectedCompany === 'All' || prob.tags.includes(selectedCompany);
    return matchesTopic && matchesDifficulty && matchesCompany;
  });

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 min-h-[650px]" id="coding-arena-layout">
      {/* Problems sidebar list */}
      <div className="xl:col-span-3 flex flex-col gap-4 bg-[#0a0f1e]/80 border border-white/5 p-4.5 rounded-2xl h-[750px] overflow-hidden shadow-xl backdrop-blur-md" id="problems-sidebar-list">
        <div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1 font-mono">Placify Universe</h3>
          <p className="text-[10px] text-zinc-400">Unlock worlds and target company assessment challenges.</p>
        </div>
        {/* Gamified Topic Worlds Selector */}
        <div className="border-b border-white/5 pb-3">
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-mono block mb-2">Topic Regions</span>
          <div className="grid grid-cols-2 gap-1.5">
            <div
              onClick={() => setActiveWorldId('all')}
              className={`p-2 rounded-xl border text-center cursor-pointer transition flex items-center gap-1.5 justify-center ${
                activeWorldId === 'all'
                  ? 'border-cyan-400 bg-cyan-400/10 text-cyan-300'
                  : 'bg-black/20 border-white/5 text-zinc-400 hover:text-white'
              }`}
            >
              <span className="text-xs">🌌</span>
              <span className="text-[9px] font-bold font-mono">All Sectors</span>
            </div>
            {topicWorlds.map((w) => {
              const isLocked = userXp < w.requiredXp;
              const isActive = activeWorldId === w.id;
              return (
                <div
                  key={w.id}
                  onClick={() => { if (!isLocked) setActiveWorldId(w.id); }}
                  className={`p-2 rounded-xl border relative overflow-hidden transition flex items-center gap-1.5 justify-center cursor-pointer ${
                    isLocked 
                      ? 'opacity-40 cursor-not-allowed bg-black/40 border-white/5 text-zinc-500' 
                      : isActive
                        ? 'border-cyan-400 bg-cyan-400/10 text-cyan-300'
                        : 'bg-black/20 border-white/5 text-zinc-400 hover:border-white/10 hover:text-white'
                  }`}
                  title={isLocked ? `Locked: Requires ${w.requiredXp} XP (You have ${userXp} XP)` : w.name}
                >
                  <span className="text-xs">{w.icon}</span>
                  <span className="text-[9px] font-bold font-mono truncate max-w-[50px]">{w.name.split(' ')[0]}</span>
                  {isLocked && <Lock className="w-2.5 h-2.5 text-zinc-500 absolute top-1 right-1" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Filters Panel */}
        <div className="space-y-3 pb-3 border-b border-white/5" id="arena-filters">
          <div className="space-y-1">
            <label className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest block font-mono">Company Filter</label>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full bg-black/45 border border-white/5 text-xs px-2.5 py-1.5 rounded-lg text-white outline-none focus:border-cyan-400 transition"
              id="sidebar-company-filter"
            >
              <option value="All">All Companies</option>
              {companyList.map(company => (
                <option key={company} value={company}>{company}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest block font-mono">Difficulty</label>
            <div className="grid grid-cols-4 gap-1" id="sidebar-diff-filters">
              {['All', 'Easy', 'Medium', 'Hard'].map((diff) => (
                <button
                  key={diff}
                  onClick={() => setSelectedDifficulty(diff)}
                  className={`py-1 text-[9px] font-bold border rounded transition font-mono ${
                    selectedDifficulty === diff
                      ? 'bg-cyan-400 border-transparent text-black'
                      : 'bg-black/25 border-white/5 text-zinc-400 hover:text-white'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* List Frame */}
        <div className="flex items-center justify-between text-[10px] text-zinc-550 font-mono px-1">
          <span>{filteredProblems.length} available</span>
          <span>{problems.length} total</span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 font-sans" id="prob-items-list">
          {filteredProblems.length > 0 ? (
            filteredProblems.map((prob) => (
              <div
                key={prob.id}
                onClick={() => onSelectProblem(prob)}
                id={`problem-row-${prob.id}`}
                className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col gap-2 ${
                  selectedProblem?.id === prob.id
                    ? 'border-cyan-400 bg-cyan-400/5 text-white shadow-lg'
                    : 'bg-black/25 border-white/5 text-zinc-300 hover:border-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                    {solvedProblemIds.includes(prob.id) && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    )}
                    <span className="text-xs font-semibold leading-normal truncate">{prob.title}</span>
                  </div>
                  <span className={`text-[8px] px-2 py-0.5 rounded-md border font-mono ${getDiffBadge(prob.difficulty)}`}>
                    {prob.difficulty}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {prob.tags.slice(0, 3).map((tg, i) => (
                    <span key={i} className="text-[8px] bg-white/5 border border-white/5 px-1.5 py-0.5 rounded text-zinc-400 font-mono">{tg}</span>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center text-zinc-500">
              <span className="text-2xl mb-1">🔍</span>
              <p className="text-[9px] font-mono leading-normal">No matching challenges.</p>
            </div>
          )}
        </div>
      </div>

      {/* Main editor split columns */}
      {selectedProblem ? (
        <div className="xl:col-span-9 grid grid-cols-1 lg:grid-cols-12 gap-5" id="editor-grid">
          {/* Left panel: Details, editorials, hint unlock */}
          <div className="lg:col-span-6 flex flex-col bg-[#161D2F] border border-slate-800 rounded-xl overflow-hidden" id="left-problem-description">
            <div className="border-b border-slate-800 bg-slate-900/30 flex text-xs" id="arena-tabs">
              <button
                id="tab-details-btn"
                onClick={() => setActiveTab('details')}
                className={`flex-1 py-3 text-center font-semibold border-b-2 transition ${
                  activeTab === 'details' ? 'border-cyan-450 text-white bg-white/5' : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Problem Details
              </button>
              <button
                id="tab-editorial-btn"
                onClick={() => setActiveTab('editorial')}
                className={`flex-1 py-3 text-center font-semibold border-b-2 transition ${
                  activeTab === 'editorial' ? 'border-cyan-450 text-white bg-white/5' : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Editorial Guide
              </button>
              <button
                id="tab-hints-btn"
                onClick={() => setActiveTab('hints')}
                className={`flex-1 py-3 text-center font-semibold border-b-2 transition ${
                  activeTab === 'hints' ? 'border-cyan-450 text-white bg-white/5' : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Hints ({unlockedHintLevel}/5)
              </button>
            </div>

            {/* Tab content frames */}
            <div className="flex-1 p-5 overflow-y-auto max-h-[500px]" id="selected-tab-content">
              {activeTab === 'details' && (
                <div className="space-y-4 font-sans" id="details-view">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white tracking-tight">{selectedProblem.title}</h2>
                    <span className={`text-[9px] px-2 py-0.5 rounded border font-mono ${getDiffBadge(selectedProblem.difficulty)}`}>
                      {selectedProblem.difficulty}
                    </span>
                  </div>

                  <p className="text-zinc-300 text-xs leading-relaxed whitespace-pre-wrap">{selectedProblem.description}</p>

                  <div className="space-y-2 border-t border-white/5 pt-3">
                    <h4 className="text-[10px] font-bold text-zinc-450 uppercase tracking-widest font-mono">Constraints</h4>
                    <pre className="text-xs bg-black/40 p-2.5 rounded-lg font-mono text-cyan-300 border border-white/5">{selectedProblem.constraints}</pre>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-zinc-450 uppercase tracking-widest font-mono">Input Format</h4>
                    <p className="text-xs text-zinc-300 bg-black/20 p-2 rounded-lg border border-white/5 leading-normal">{selectedProblem.inputFormat}</p>
                    <h4 className="text-[10px] font-bold text-zinc-450 uppercase tracking-widest font-mono">Output Format</h4>
                    <p className="text-xs text-zinc-300 bg-black/20 p-2 rounded-lg border border-white/5 leading-normal">{selectedProblem.outputFormat}</p>
                  </div>

                  {selectedProblem.examples && selectedProblem.examples.map((ex, idx) => (
                    <div key={idx} className="border border-white/5 bg-black/10 rounded-xl p-3.5 space-y-2.5">
                      <span className="text-[9px] font-bold text-cyan-400 font-mono uppercase">Example {idx + 1}</span>
                      <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                        <div>
                          <p className="text-zinc-550 mb-1.5">Input:</p>
                          <pre className="bg-slate-950 p-2.5 rounded-lg text-zinc-300 overflow-x-auto border border-white/5">{ex.input}</pre>
                        </div>
                        <div>
                          <p className="text-zinc-550 mb-1.5">Expected Output:</p>
                          <pre className="bg-slate-950 p-2.5 rounded-lg text-zinc-300 overflow-x-auto border border-white/5">{ex.output}</pre>
                        </div>
                      </div>
                      {ex.explanation && (
                        <p className="text-xs text-zinc-400 italic font-sans leading-normal"><strong>Explanation:</strong> {ex.explanation}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'editorial' && (
                <div className="space-y-4" id="editorial-view">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-5 h-5 text-cyan-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider font-heading">SDE Official Solution Breakdown</h3>
                  </div>
                  <p className="text-zinc-300 text-xs leading-relaxed whitespace-pre-wrap leading-normal font-sans">
                    {selectedProblem.editorial || "No editorial uploaded yet."}
                  </p>

                  <div className="border-t border-white/5 pt-4 space-y-3" id="editorial-solutions-block">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-bold text-zinc-555 uppercase tracking-widest font-mono">Official solutions</h4>
                      <div className="flex gap-1.5" id="solution-lang-tabs">
                        {['javascript', 'python', 'java', 'cpp', 'c'].map((solLang) => (
                          <button
                            key={solLang}
                            onClick={() => setActiveSolutionLanguage(solLang)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border font-mono transition ${
                              activeSolutionLanguage === solLang
                                ? 'bg-cyan-950/40 border-cyan-500/20 text-cyan-300'
                                : 'bg-black/20 border-white/5 text-zinc-450 hover:text-white'
                            }`}
                          >
                            {solLang.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    {selectedProblem.solutions && selectedProblem.solutions[activeSolutionLanguage as keyof typeof selectedProblem.solutions] ? (
                      <div className="relative">
                        <pre className="bg-slate-950 p-4 rounded-xl border border-white/5 font-mono text-[11px] text-cyan-300 overflow-x-auto max-h-[250px] leading-relaxed">
                          {selectedProblem.solutions[activeSolutionLanguage as keyof typeof selectedProblem.solutions]}
                        </pre>
                        <button
                          onClick={() => navigator.clipboard.writeText(selectedProblem.solutions?.[activeSolutionLanguage as keyof typeof selectedProblem.solutions] || '')}
                          className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-white/5 text-[9px] text-zinc-300 hover:text-white rounded-lg border border-white/10 transition cursor-pointer"
                        >
                          Copy
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500 italic">No solution stub provided for this compiler track.</p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'hints' && (
                <div className="space-y-4 text-xs font-sans" id="hints-view">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-cyan-400" />
                      <h4 className="font-bold text-white">Interactive Hints Timeline</h4>
                    </div>
                    <span className="text-[10px] text-zinc-550 font-mono">Unlock level {unlockedHintLevel}/5</span>
                  </div>

                  <p className="text-zinc-450 text-xs leading-normal">
                    Prevent direct spoilers! Unlock progressive logical layers sequentially.
                  </p>

                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((lvl) => {
                      const labels = [
                        "Level 1: General Clue",
                        "Level 2: Standard Paradigm Approach",
                        "Level 3: Exact Algorithmic Method",
                        "Level 4: Pseudo Code Invariant",
                        "Level 5: Solution Stub Clue"
                      ];
                      
                      const isUnlocked = unlockedHintLevel >= lvl;

                      return (
                        <div key={lvl} className={`p-3 rounded-xl border transition-all duration-300 ${
                          isUnlocked ? 'bg-black/20 border-white/10' : 'bg-black/40 border-white/5 opacity-60'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white text-xs">{labels[lvl - 1]}</span>
                            {!isUnlocked && (
                              <button
                                onClick={() => setUnlockedHintLevel(lvl)}
                                className="text-[9px] bg-cyan-400 hover:bg-cyan-300 text-black font-black py-1 px-3 rounded-lg transition cursor-pointer shadow shadow-cyan-500/10"
                              >
                                Unlock Hint
                              </button>
                            )}
                          </div>
                          {isUnlocked && (
                            <p className="mt-2.5 text-zinc-300 whitespace-pre-wrap font-mono text-[11px] bg-slate-950/60 p-2.5 rounded-lg border border-white/5 leading-relaxed">
                              {selectedProblem.hints?.[lvl - 1] || "Extra hints details pending update."}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right panel: Editor environment */}
          <div className="lg:col-span-6 flex flex-col bg-[#161D2F] border border-slate-800 rounded-xl overflow-hidden" id="right-ide-editor">
            {/* Environment controls header */}
            <div className="p-3 bg-black/40 border-b border-slate-800 flex items-center justify-between" id="ide-config">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white uppercase tracking-tight font-mono">Active Compiler Workspace</span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                  className="bg-black border border-slate-800 text-[11px] px-2 py-1 rounded-lg text-white outline-none focus:border-cyan-400"
                  id="language-select"
                >
                  <option value="javascript">JavaScript (Node.js)</option>
                  <option value="python">Python 3</option>
                  <option value="java">Java 17 JDK</option>
                  <option value="cpp">C++ (G++ GCC)</option>
                  <option value="c">C (GCC Compiler)</option>
                </select>
                <button
                  onClick={copyTemplate}
                  title="Copy code template"
                  className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-350 rounded-lg transition cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Custom Interactive Text-Area Editor Code Block */}
            <div className="relative flex-1 h-[400px]" id="custom-textarea-container">
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full h-full p-4 bg-[#0F172A] text-cyan-300 font-mono text-xs leading-relaxed outline-none border-b border-slate-800 resize-none"
                placeholder="// Enter computational code here"
                spellCheck="false"
                id="ide-textarea"
              />
              <span className="absolute bottom-2 right-2 text-[8px] text-zinc-555 font-mono">Sandboxed virtual execution environment</span>
            </div>

            {/* Execution Buttons & Judge Output Log */}
            <div className="p-4 bg-slate-950 flex flex-col gap-3" id="actions-console">
              {isRunning ? (
                <div className="flex items-center justify-center gap-2.5 text-xs text-cyan-400 py-2 font-mono">
                  <Loader2 className="h-4 w-4 animate-spin" /> Sandboxing compiler outputs via AI reviewer... Please wait...
                </div>
              ) : (
                <div className="flex items-center gap-2" id="action-buttons-layout">
                  <button
                    onClick={() => handleRunCode(false)}
                    id="run-code-btn"
                    className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 text-cyan-400" /> Run Test cases
                  </button>
                  <button
                    onClick={() => handleRunCode(true)}
                    id="submit-code-btn"
                    className="flex-1 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 hover:brightness-110 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/10"
                  >
                    <Send className="w-3.5 h-3.5" /> Submit to Judge
                  </button>
                </div>
              )}

              {/* Submissions verdict dashboard */}
              <AnimatePresence>
                {submissionResult && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="border border-white/10 rounded-xl p-4.5 text-xs space-y-2 mt-1 bg-black/40 shadow-inner" 
                    id="sandbox-result-card"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold uppercase tracking-wider text-zinc-500 text-[9px] font-mono">Verdict Telemetry</span>
                      {submissionResult.success || submissionResult.submission?.status === "Accepted" ? (
                        <span className="text-cyan-400 font-bold flex items-center gap-1.5 font-mono">
                          <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" /> ACCEPTED (+20 XP)
                        </span>
                      ) : (
                        <span className="text-rose-400 font-bold flex items-center gap-1.5 font-mono">
                          <XCircle className="w-4 h-4" /> WRONG ANSWER
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono py-2 border-y border-white/5">
                      <div>
                        <p className="text-zinc-550">Runtime Overhead:</p>
                        <p className="text-white font-bold">{submissionResult.submission?.timeComplexity || submissionResult.analysis?.estimatedTimeComplexity || "O(N)"}</p>
                      </div>
                      <div>
                        <p className="text-zinc-550">Memory Heap Segment:</p>
                        <p className="text-white font-bold">{submissionResult.submission?.memoryUsage || submissionResult.analysis?.estimatedMemoryUsage || "12.4 MB"}</p>
                      </div>
                    </div>

                    {submissionResult.analysis?.feedback && (
                      <div className="bg-cyan-550/5 border border-cyan-500/15 p-3 rounded-lg text-[10px] text-zinc-300 leading-normal" id="ai-reviewer-feedback">
                        <span className="text-cyan-400 font-bold font-mono text-[8px] block mb-1">AI CODE INSTRUCTOR REVIEW:</span>
                        {submissionResult.analysis.feedback}
                      </div>
                    )}

                    {submissionResult.error && (
                      <p className="text-rose-450 bg-rose-950/20 p-2.5 rounded-lg border border-rose-500/10 font-mono text-[10px] leading-normal">{submissionResult.error}</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              
              {submissionsHistory.length > 0 && (
                <div className="border-t border-white/5 pt-2 space-y-1.5 animate-fadeIn" id="past-submissions">
                  <span className="text-[8px] text-zinc-500 uppercase font-bold tracking-wider font-mono">Recent submission logs</span>
                  <div className="max-h-[80px] overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
                    {submissionsHistory.map((sh, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[10px] bg-black/30 border border-white/5 px-3 py-1.5 rounded-lg">
                        <span className="text-zinc-500 font-mono text-[9px]">{new Date(sh.submittedAt).toLocaleTimeString()}</span>
                        <span className="text-zinc-300 uppercase font-mono text-[9px]">{sh.language}</span>
                        <span className={sh.status === 'Accepted' ? 'text-cyan-400 font-bold font-mono' : 'text-rose-455 font-mono'}>{sh.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="xl:col-span-9 flex flex-col items-center justify-center p-12 bg-[#0a101f]/60 border border-white/5 rounded-2xl min-h-[450px] backdrop-blur-md" id="empty-state-arena">
          <div className="h-14 w-14 rounded-2xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center text-cyan-400 glow-cyan mb-5">
            <Code className="w-6 h-6 animate-pulse" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">Enter Placify Arena Sandbox</h3>
          <p className="text-xs text-zinc-400 max-w-sm text-center leading-relaxed">Select a placement challenge in the left panel to initialize your active coding editor workspace.</p>
        </div>
      )}
    </div>
  );
}
