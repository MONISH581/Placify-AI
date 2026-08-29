/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Award, CheckSquare, Sparkles, TrendingUp, Zap, Target, Flame, BrainCircuit, Activity } from 'lucide-react';

interface DashboardProps {
  user: {
    username: string;
    xp: number;
    level: number;
    streak: number;
    problemsSolved: string[];
    accuracy: number;
    badges: string[];
  };
  problems: any[];
  onSelectProblem: (prob: any) => void;
  onNavigate: (tab: string) => void;
}

export function Dashboard({ user, problems, onSelectProblem, onNavigate }: DashboardProps) {
  // Daily sprints states
  const [completedMorning, setCompletedMorning] = useState(false);
  const [completedAfternoon, setCompletedAfternoon] = useState(false);
  const [completedNight, setCompletedNight] = useState(false);
  const [testScore, setTestScore] = useState<string | null>(null);

  const totalPossibleProblems = problems.length || 500;
  const solvedCount = user.problemsSolved.length;
  const solvedPercent = Math.min(100, Math.round((solvedCount / Math.max(1, totalPossibleProblems)) * 100));

  // Placement readiness score dynamic calculation
  const solvedFactor = Math.min(35, solvedCount * 8);
  const xpFactor = Math.min(25, Math.round(user.xp / 40));
  const streakFactor = Math.min(20, user.streak * 3);
  const accuracyFactor = Math.min(20, Math.round(user.accuracy / 5));
  const fallbackReadinessScore = Math.min(100, solvedFactor + xpFactor + streakFactor + accuracyFactor);

  const [aiData, setAiData] = useState<any>(null);

  useEffect(() => {
    const payload = {
        user_id: "std-1",
        coding_score: user.accuracy,
        problems_solved: user.problemsSolved.length,
        average_time_secs: 1800,
        weak_topics: ["Trees", "Operating Systems"],
        strong_topics: ["Arrays", "Python", "OOP"]
    };

    // Fetch Readiness
    fetch(`/api/ai/readiness`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => setAiData(prev => ({ ...prev, readiness: data })))
      .catch(err => console.error("Error fetching AI Readiness:", err));
      
    // Fetch Recommendations
    fetch(`/api/ai/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => setAiData(prev => ({ ...prev, recommendation: data })))
      .catch(err => console.error("Error fetching AI Recommendation:", err));
  }, [user]);

  const readinessScore = aiData?.readiness?.overall_readiness !== undefined
    ? aiData.readiness.overall_readiness
    : fallbackReadinessScore;

  const interviewSuccess = aiData?.readiness?.interview_readiness !== undefined
    ? aiData.readiness.interview_readiness
    : 75;

  const skillLevel = aiData?.readiness?.expected_skill_level || "Competitive SDE";
  const weakAreas = aiData?.readiness?.weak_topics || ["None! Keep practicing."];
  const recommendedTopic = aiData?.recommendation?.[0]?.topic || "Strings & Two Pointers";

  const handleRunMockTest = (testName: string, setter: (val: boolean) => void) => {
    setter(true);
    const score = Math.floor(Math.random() * 25) + 75; // 75-99
    setTestScore(`Task Approved: Successfully submitted ${testName}! Performance score: ${score}/100 (+30 XP).`);
  };

  const dailyChallengeProblem = problems[0] || {
    id: "prob-1",
    title: "Two Sum",
    difficulty: "Easy",
    tags: ["Arrays", "Hashing"],
    description: "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`."
  };

  // Generate weighted mock contribution heatmap data (60 days)
  const heatmapDays = Array.from({ length: 60 }, (_, i) => {
    const levels = [0, 1, 2, 3, 4];
    const weights = [0.4, 0.35, 0.15, 0.08, 0.02];
    const r = Math.random();
    let level = 0;
    let cum = 0;
    for (let idx = 0; idx < levels.length; idx++) {
      cum += weights[idx];
      if (r <= cum) {
        level = levels[idx];
        break;
      }
    }
    return { day: i, level, count: level * 2 };
  });

  return (
    <div className="space-y-6" id="dashboard-container">
      {/* Expo Demo Student & Placify AI Readiness Banner */}
      <div className="bg-gradient-to-r from-[#0a101f]/90 via-[#0d162a]/90 to-[#0a101f]/90 border border-cyan-500/20 rounded-2xl p-6 backdrop-blur-md shadow-2xl relative overflow-hidden" id="expo-ai-banner">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px] font-mono font-bold tracking-wide uppercase flex items-center gap-1.5">
                <BrainCircuit className="w-3.5 h-3.5 animate-pulse" /> PLACIFY AI READINESS MODEL v1 (ACTIVE)
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/5 text-zinc-400 border border-white/10 text-[10px] font-mono">
                Dataset: DEMO_SYNTHETIC (2,500 Profiles)
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight font-heading flex items-center gap-2">
              AI Candidate Intelligence <span className="text-cyan-400 font-mono text-lg">• Alex (Demo SDE Profile)</span>
            </h1>
            <p className="text-zinc-400 text-xs font-sans leading-relaxed">
              Realtime ML readiness assessment trained on student performance metrics, solve speed, hint rates, and CS topic mastery.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="text-[10px] font-mono text-zinc-500 font-bold uppercase mr-1">Strengths:</span>
              {(aiData?.readiness?.strong_topics || ["Arrays & Hashing", "Python Syntax", "OOP Concepts"]).map((st: string, idx: number) => (
                <span key={idx} className="text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-mono font-medium">
                  ✓ {st}
                </span>
              ))}

              <span className="text-[10px] font-mono text-zinc-500 font-bold uppercase ml-3 mr-1">Weaknesses:</span>
              {(aiData?.readiness?.weak_topics || ["Graphs & BFS/DFS", "Dynamic Programming", "Operating Systems"]).map((wt: string, idx: number) => (
                <span key={idx} className="text-[10px] bg-rose-500/10 text-rose-300 border border-rose-500/20 px-2.5 py-0.5 rounded-full font-mono font-medium">
                  ⚠ {wt}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-6 bg-black/40 p-4 rounded-xl border border-white/5 shrink-0">
            <div className="text-center border-r border-white/10 pr-5">
              <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 font-mono">
                {readinessScore}%
              </div>
              <p className="text-[9px] font-mono text-cyan-300 uppercase font-bold mt-1">Readiness Score</p>
            </div>
            <div className="space-y-1 text-left text-[11px] font-mono">
              <div className="flex justify-between gap-4 text-zinc-300">
                <span className="text-zinc-500">DSA:</span>
                <span className="text-cyan-400 font-bold">{aiData?.readiness?.dsa_score || 78}%</span>
              </div>
              <div className="flex justify-between gap-4 text-zinc-300">
                <span className="text-zinc-500">Programming:</span>
                <span className="text-cyan-400 font-bold">{aiData?.readiness?.coding_readiness || 82}%</span>
              </div>
              <div className="flex justify-between gap-4 text-zinc-300">
                <span className="text-zinc-500">CS Fundamentals:</span>
                <span className="text-cyan-400 font-bold">{aiData?.readiness?.cs_fundamentals || 64}%</span>
              </div>
              <div className="flex justify-between gap-4 text-zinc-300">
                <span className="text-zinc-500">Interview / Resume:</span>
                <span className="text-cyan-400 font-bold">{interviewSuccess}% / {aiData?.readiness?.resume_readiness || 86}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Overview stats layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4" id="stats-grid">
        {[
          {
            id: 'stat-xp',
            title: 'TOTAL SCORE XP',
            value: user.xp,
            subtitle: `Level ${user.level} (${user.xp % 500} / 500 to next tier)`,
            icon: Sparkles,
            color: 'text-cyan-400',
            progress: (user.xp % 500) / 5
          },
          {
            id: 'stat-solved',
            title: 'SOLVED PROBLEMS',
            value: `${solvedCount} / ${totalPossibleProblems}`,
            subtitle: `${solvedPercent}% completion rate`,
            icon: CheckSquare,
            color: 'text-cyan-400',
            progress: solvedPercent
          },
          {
            id: 'stat-accuracy',
            title: 'SUBMISSIONS ACCURACY',
            value: `${user.accuracy}%`,
            subtitle: 'High quality indexing verified',
            icon: TrendingUp,
            color: 'text-cyan-400',
            progress: user.accuracy
          },
          {
            id: 'stat-badges',
            title: 'UNLOCKED BADGES',
            value: user.badges.length || 2,
            subtitle: 'Earned milestones',
            icon: Award,
            color: 'text-cyan-400',
            isBadge: true
          }
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.id}
              whileHover={{ y: -5, scale: 1.02, borderColor: 'rgba(6, 182, 212, 0.25)' }}
              transition={{ type: 'spring', damping: 20, stiffness: 250 }}
              className="bg-[#0a101f]/60 border border-white/5 rounded-2xl p-5 backdrop-blur-md transition-all shadow-lg flex flex-col justify-between"
              id={stat.id}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] text-zinc-500 font-bold tracking-wider font-mono">{stat.title}</p>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div className="text-2xl font-bold text-white font-heading tracking-tight">{stat.value}</div>
              
              {stat.progress !== undefined ? (
                <div className="w-full bg-white/5 h-1.5 mt-3 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-500" style={{ width: `${stat.progress}%` }}></div>
                </div>
              ) : stat.isBadge ? (
                <div className="flex gap-1.5 mt-3 overflow-x-auto py-0.5 no-scrollbar">
                  <span className="text-[8px] bg-cyan-400/10 text-cyan-300 font-mono px-2 py-0.5 rounded border border-cyan-400/20 shrink-0 font-bold">🎓 DSA STARTER</span>
                  <span className="text-[8px] bg-cyan-950/40 text-cyan-300 font-mono px-2 py-0.5 rounded border border-cyan-900/20 shrink-0 font-bold">🔥 STREAKER</span>
                </div>
              ) : null}
              
              <p className="text-[9px] text-zinc-400 mt-2 font-mono">{stat.subtitle}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Career Command Center Workspace grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dashboard-content-split">
        {/* Daily problem challenge & sprints */}
        <div className="lg:col-span-2 space-y-6 animate-fadeIn" id="dashboard-left-col">
               {/* Hero Problem of the Day */}
          <div className="bg-[#0a101f]/60 border border-white/5 rounded-2xl overflow-hidden flex flex-col hover:border-cyan-500/20 transition shadow-xl backdrop-blur-md" id="p_o_d_card">
            <div className="p-4 border-b border-white/5 bg-black/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="animate-pulse w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                <h2 className="text-[10px] font-bold text-white uppercase tracking-wider font-mono">Daily Placement Sprint</h2>
              </div>
              <div className="flex gap-2">
                <span className="px-2 py-0.5 rounded-md bg-cyan-400/10 text-cyan-300 border border-cyan-400/15 text-[9px] font-bold font-mono">{dailyChallengeProblem.difficulty}</span>
                <span className="px-2 py-0.5 rounded-md bg-white/5 text-zinc-400 text-[9px] font-bold font-mono">Arrays</span>
              </div>
            </div>
            
            <div className="p-6">
              <h1 className="text-xl font-bold text-white mb-2 font-heading tracking-tight">{dailyChallengeProblem.title}</h1>
              <p className="text-zinc-355 text-xs leading-relaxed mb-4 font-sans">
                {dailyChallengeProblem.description}
              </p>
              
              <div className="bg-black/40 rounded-xl p-4.5 font-mono text-[11px] text-cyan-300 border border-white/5">
                <span className="text-zinc-555 block mb-1.5">// Code execution example:</span>
                <p>Input: nums = [2, 7, 11, 15], target = 9</p>
                <p>Output: [0, 1]</p>
              </div>
            </div>

            <div className="p-4 bg-black/10 border-t border-white/5 flex items-center justify-between">
              <span className="text-[10px] text-zinc-500 font-mono">Time Complexity Goal: <span className="text-cyan-300 font-bold">O(N) Hash Table</span></span>
              <button 
                id="solve-daily-challenge-btn"
                onClick={() => onSelectProblem(dailyChallengeProblem)}
                className="px-5 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 hover:brightness-110 text-white font-black rounded-xl text-xs transition cursor-pointer shadow-md shadow-cyan-500/10"
              >
                Solve in Arena
              </button>
            </div>
          </div>

          {/* Daily Placement Sprint */}
          <div className="border border-white/5 bg-[#0a101f]/60 rounded-2xl p-5 backdrop-blur-md shadow-xl" id="daily-placement-tests">
            <div className="flex items-center justify-between mb-4.5">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-heading">Micro Sprint Schedulers</h3>
                <p className="text-[10px] text-zinc-450 mt-1">Duolingo-style micro-testing to maintain Daily streak criteria</p>
              </div>
              <span className="text-[8px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/20 font-mono font-bold">REALTIME SYNCED</span>
            </div>

            {testScore && (
              <div className="mb-4 text-xs bg-cyan-950/85 border border-cyan-500/30 text-cyan-300 p-3 rounded-xl flex items-start gap-2 animate-slideDown" id="test-feedback-bubble">
                <Zap className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5 animate-bounce" />
                <p className="font-mono text-[10px] leading-normal">{testScore}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { name: '🌞 Morning Aptitude', desc: 'Quantitative sequence maps, weights.', active: completedMorning, setter: setCompletedMorning },
                { name: '🌤️ Afternoon Systems', desc: 'OS process paging, mutex locks.', active: completedAfternoon, setter: setCompletedAfternoon },
                { name: '🌙 Night DB Query', desc: 'SQL schema aggregates, partition keys.', active: completedNight, setter: setCompletedNight }
              ].map((sprint, idx) => (
                <div key={idx} className={`p-4 rounded-xl border transition-all duration-300 ${sprint.active ? 'bg-cyan-950/10 border-cyan-500/20 text-cyan-300' : 'bg-black/25 border-white/5 hover:border-cyan-550/20'}`}>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[11px] font-bold">{sprint.name}</span>
                    {sprint.active ? (
                      <span className="text-[8px] text-cyan-400 font-mono font-bold">DONE</span>
                    ) : (
                      <span className="text-[8px] bg-white/5 text-zinc-400 px-1.5 py-0.5 rounded font-mono">3-5 Mins</span>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-400 mb-3.5 leading-normal">{sprint.desc}</p>
                  <button
                    onClick={() => handleRunMockTest(sprint.name, sprint.setter)}
                    disabled={sprint.active}
                    className={`w-full py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      sprint.active 
                        ? 'bg-cyan-950/20 text-cyan-500 border border-cyan-500/10 cursor-not-allowed' 
                        : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                    }`}
                  >
                    {sprint.active ? 'Completed' : 'Start Task'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: Readiness circular analytics & AI recommender */}
        <div className="space-y-6" id="dashboard-right-col">
          
          {/* Readiness gauge analytics */}
          <div className="border border-white/5 bg-[#0a101f]/60 rounded-2xl p-5 backdrop-blur-md shadow-xl flex flex-col" id="placement-score-indicator">
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-4 font-mono">Command Center Diagnostics</h3>
            <div className="flex items-center gap-4.5">
              {/* Circular gauge */}
              <div className="relative w-18 h-18 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="36" cy="36" r="30" stroke="rgba(255,255,255,0.05)" strokeWidth="6" fill="transparent" />
                  <circle 
                    cx="36" 
                    cy="36" 
                    r="30" 
                    stroke="url(#readinessGrad)" 
                    strokeWidth="6" 
                    fill="transparent" 
                    strokeDasharray={2 * Math.PI * 30}
                    strokeDashoffset={2 * Math.PI * 30 * (1 - readinessScore / 100)}
                    className="transition-all duration-1000 ease-out"
                  />
                  <defs>
                    <linearGradient id="readinessGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                  </defs>
                </svg>
                <span className="absolute text-xs font-mono font-black text-cyan-300">{readinessScore}%</span>
              </div>
              <div className="text-xs space-y-1">
                <p className="font-bold text-white flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-cyan-400" />
                  Status: "{skillLevel}"
                </p>
                <p className="text-zinc-450 text-[10px] leading-normal">
                  Interview Success: <strong>{interviewSuccess}%</strong>.
                </p>
                <p className="text-zinc-450 text-[9px] leading-normal font-mono">
                  Weak Areas: {weakAreas.join(", ")}
                </p>
              </div>
          </div>
          
          {/* Interactive Submissions Heatmap */}
          <div className="flex flex-col gap-2.5 bg-[#0a101f]/60 border border-white/5 rounded-2xl p-5 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-mono text-zinc-400 uppercase font-bold text-[9px] tracking-wider flex items-center gap-1">
                <Activity className="h-3.5 w-3.5 text-cyan-400" /> Coding matrix consistency
              </span>
              <span className="text-[9px] text-cyan-300 bg-cyan-950/40 border border-cyan-800/20 px-2 py-0.5 rounded font-mono uppercase font-bold">Active streak</span>
            </div>
            
            <div className="grid grid-flow-col grid-rows-4 gap-1 overflow-x-auto py-1 no-scrollbar">
              {heatmapDays.map((day) => {
                let bgClass = 'bg-white/5 border border-white/5';
                if (day.level === 1) bgClass = 'bg-cyan-500/20 border border-cyan-500/10';
                if (day.level === 2) bgClass = 'bg-cyan-500/40 border border-cyan-500/25';
                if (day.level === 3) bgClass = 'bg-cyan-500/30 border border-cyan-500/20';
                if (day.level === 4) bgClass = 'bg-cyan-500/60 border border-cyan-500/45 glow-cyan';
                return (
                  <div
                    key={day.day}
                    className={`h-3 w-3 rounded-sm transition-all duration-300 hover:scale-125 ${bgClass}`}
                    title={`Day ${day.day + 1}: ${day.count} active submissions`}
                  />
                );
              })}
            </div>
            <div className="flex justify-between items-center text-[8px] text-zinc-550 font-mono pt-1">
              <span>60 days ago</span>
              <div className="flex items-center gap-1.5">
                <span>Less</span>
                <div className="h-2 w-2 rounded-sm bg-white/5" />
                <div className="h-2 w-2 rounded-sm bg-cyan-500/20" />
                <div className="h-2 w-2 rounded-sm bg-cyan-500/40" />
                <div className="h-2 w-2 rounded-sm bg-cyan-500/30" />
                <div className="h-2 w-2 rounded-sm bg-cyan-500/60" />
                <span>More</span>
              </div>
              <span>Today</span>
            </div>
          </div>
 
          {/* Smart AI Recommender Engine */}
          <div className="border border-white/5 bg-[#0a101f]/60 rounded-2xl p-5 backdrop-blur-md shadow-xl flex flex-col" id="ai-recommender-card">
            <div className="flex items-center gap-2 mb-3.5">
              <BrainCircuit className="w-4 h-4 text-cyan-400" />
              <h3 className="text-[10px] font-bold text-white uppercase tracking-wider font-heading">AI Command Recommendations</h3>
            </div>
            
            <div className="space-y-3 text-xs">
              <div className="bg-gradient-to-r from-cyan-500/5 to-blue-500/5 border border-cyan-550/15 rounded-xl p-3.5 space-y-1.5">
                <span className="text-cyan-300 text-[9px] font-bold block font-mono uppercase tracking-wider">🎯 CORE STRATEGY SUGGESTION</span>
                <p className="text-zinc-355 leading-relaxed text-[11px] font-sans">
                  The AI Engine predicts that your optimal learning path next is to study <strong>{recommendedTopic}</strong>. Focus on problems matching this tag.
                </p>
                <button
                  onClick={() => onNavigate('arena')}
                  className="text-cyan-300 hover:underline font-bold block text-[10px] font-mono tracking-tight text-left cursor-pointer mt-1"
                >
                  GO TO ARENA &rarr;
                </button>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 space-y-1.5">
                <span className="text-cyan-400 text-[9px] font-bold block font-mono uppercase tracking-wider">⚡ SIMULATION TARGET</span>
                <p className="text-zinc-350 leading-relaxed text-[11px] font-sans">
                  Execute the AI Mock technical interview session to benchmark compiler and OS scheduling communication speed indices.
                </p>
                <button
                  onClick={() => onNavigate('interview')}
                  className="text-cyan-400 hover:underline font-bold block text-[10px] font-mono tracking-tight text-left cursor-pointer mt-1"
                >
                  LAUNCH MOCK ASSESSOR &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
