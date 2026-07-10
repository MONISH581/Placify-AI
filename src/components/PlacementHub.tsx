/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Database, FileText, Network, Layers, RotateCcw, AlertCircle, Info, Percent, Sparkles } from 'lucide-react';
import { placementSubjects, SubjectModule } from '../data/placementHub';

interface PlacementHubProps {
  onAddXp: (xp: number) => void;
  subjects?: SubjectModule[];
}

export function PlacementHub({ onAddXp, subjects = placementSubjects }: PlacementHubProps) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || "os");
  
  // Resolve subject dynamically based on ID
  const selectedSubject = subjects.find(s => s.id === selectedSubjectId) || subjects[0] || placementSubjects[0];
  
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [checkedAnswer, setCheckedAnswer] = useState(false);

  // Helper to resolve icon elements dynamic
  const getSubjectIcon = (iconName: string) => {
    switch (iconName) {
      case 'Database': return <Database className="w-5 h-5 text-indigo-400" />;
      case 'Network': return <Network className="w-5 h-5 text-indigo-400" />;
      case 'Layers': return <Layers className="w-5 h-5 text-indigo-400" />;
      case 'FileText': return <FileText className="w-5 h-5 text-indigo-400" />;
      case 'Percent': return <Percent className="w-5 h-5 text-indigo-400" />;
      default: return <FileText className="w-5 h-5 text-indigo-400" />;
    }
  };

  const handleNextCard = () => {
    if (!selectedSubject.cards || selectedSubject.cards.length === 0) return;
    setIsFlipped(false);
    setTimeout(() => {
      setActiveCardIndex((activeCardIndex + 1) % selectedSubject.cards.length);
    }, 150);
  };

  const handleCheckAnswer = (correctIndex: number) => {
    if (selectedAnswer === null) return;
    setCheckedAnswer(true);
    if (selectedAnswer === correctIndex) {
      onAddXp(25);
    }
  };

  return (
    <div className="space-y-6" id="placement-hub-container">
      {/* Subject Selector Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3" id="hub-subjects-tabs">
        {subjects.map((sub) => {
          const isSelected = sub.id === selectedSubjectId;
          return (
            <div
              key={sub.id}
              onClick={() => {
                setSelectedSubjectId(sub.id);
                setActiveCardIndex(0);
                setIsFlipped(false);
                setSelectedAnswer(null);
                setCheckedAnswer(false);
              }}
              className={`p-3.5 rounded-xl border cursor-pointer text-center transition flex flex-col items-center gap-1 ${
                isSelected
                  ? 'bg-indigo-950/40 border-indigo-500 text-white'
                  : 'bg-[#161D2F] border-slate-850 text-slate-300 hover:border-slate-800'
              }`}
            >
              {getSubjectIcon(sub.icon)}
              <span className="text-xs font-bold font-sans mt-1">{sub.title}</span>
            </div>
          );
        })}
      </div>

      {/* Main Study Grid Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Topic summary notes */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-[#161D2F] border border-slate-800 rounded-xl p-5" id="subject-notes-card">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" /> Executive Placement Notes
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedSubject.notes}</p>
          </div>

          <div className="bg-cyan-950/10 border border-cyan-500/20 rounded-xl p-4 text-xs space-y-2">
            <span className="text-cyan-400 font-bold block">🚨 FAANG FACTOID</span>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              DBMS transactions and index algorithms (B-Trees / B+ Trees) are recurrently asked in Amazon and Oracle L2 systems architecture reviews. Keep active revision cards close!
            </p>
          </div>
        </div>

        {/* Dynamic Interactive Flashcards in the center column */}
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Flashcard card element */}
            <div className="bg-[#161D2F] border border-slate-800 rounded-xl p-5 flex flex-col justify-between min-h-[220px]" id="flash-card-pane">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  Active Flashcard revision ({selectedSubject.cards && selectedSubject.cards.length > 0 ? `${activeCardIndex + 1}/${selectedSubject.cards.length}` : '0/0'})
                </span>
                <span className="text-[9px] text-[#A5B4FC] bg-[#312E81] border border-[#4338CA] px-2 py-0.5 rounded uppercase font-bold">Concept check</span>
              </div>

              {/* Card center logic with flip click triggers */}
              <div
                onClick={() => {
                  if (selectedSubject.cards && selectedSubject.cards.length > 0) {
                    setIsFlipped(!isFlipped);
                  }
                }}
                className="my-4 py-8 px-4 text-center cursor-pointer bg-slate-900/60 rounded-xl border border-slate-800 flex items-center justify-center transition-all duration-300 transform min-h-[100px]"
              >
                {!selectedSubject.cards || selectedSubject.cards.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">No revision cards deploy in this sector. Add one via Admin Controls!</p>
                ) : isFlipped ? (
                  <p className="text-xs font-mono text-cyan-400 leading-relaxed">
                    {selectedSubject.cards[activeCardIndex]?.back}
                  </p>
                ) : (
                  <p className="text-sm font-bold text-white leading-relaxed">
                    {selectedSubject.cards[activeCardIndex]?.front}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500">
                  {selectedSubject.cards && selectedSubject.cards.length > 0 ? "💡 Click the box above to Flip Card" : "No cards deployed"}
                </span>
                <button
                  id="flashcard-next-btn"
                  onClick={handleNextCard}
                  disabled={!selectedSubject.cards || selectedSubject.cards.length === 0}
                  className="p-1 px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-200 text-xs rounded transition flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3 text-slate-400" /> Next Card
                </button>
              </div>
            </div>

            {/* Inline Multiple Choice Checkpoint MCQs */}
            <div className="bg-[#161D2F] border border-slate-800 rounded-xl p-5 flex flex-col justify-between" id="hub-mcq-box">
              {!selectedSubject.mcqs || selectedSubject.mcqs.length === 0 ? (
                <div className="text-center py-10 flex flex-col items-center justify-center h-full">
                  <p className="text-xs text-zinc-500 italic">No scenario MCQs deployed in this sector. Add one via Admin Controls!</p>
                </div>
              ) : (
                selectedSubject.mcqs.map((q, qIndex) => (
                  <div key={qIndex} className="space-y-4 flex flex-col justify-between h-full">
                    <div className="border-b border-slate-800 pb-2">
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest">Core MCQ Scenario Check</span>
                    </div>

                    <p className="text-xs font-bold text-white leading-normal">{q.question}</p>

                    <div className="space-y-2">
                      {q.options.map((opt, oIdx) => {
                        const isChosen = selectedAnswer === oIdx;
                        const isThisCorrect = oIdx === q.answerIndex;
                        let optionStyle = 'bg-slate-900 border-slate-800 text-slate-300';
                        
                        if (checkedAnswer) {
                          if (isThisCorrect) {
                            optionStyle = 'bg-cyan-950/40 border-cyan-500 text-cyan-400';
                          } else if (isChosen) {
                            optionStyle = 'bg-red-950/40 border-red-500 text-red-400';
                          }
                        } else if (isChosen) {
                          optionStyle = 'bg-indigo-950/40 border-indigo-500 text-indigo-300';
                        }

                        return (
                          <div
                            key={oIdx}
                            onClick={() => {
                              if (!checkedAnswer) {
                                setSelectedAnswer(oIdx);
                              }
                            }}
                            className={`p-2.5 rounded-lg border text-xs cursor-pointer transition flex items-center gap-2 ${optionStyle}`}
                          >
                            <span className="w-4 h-4 rounded-full bg-slate-950 text-[10px] text-slate-400 font-bold border border-slate-800 flex items-center justify-center">
                              {oIdx + 1}
                            </span>
                            <span>{opt}</span>
                          </div>
                        );
                      })}
                    </div>

                    {checkedAnswer && (
                      <div className="bg-slate-950 border border-slate-900 p-2.5 rounded-lg text-[11px] text-slate-400 flex items-start gap-1.5 leading-normal">
                        <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                        <p><strong>Rationale:</strong> {q.explanation}</p>
                      </div>
                    )}

                    {!checkedAnswer ? (
                      <button
                        onClick={() => handleCheckAnswer(q.answerIndex)}
                        disabled={selectedAnswer === null}
                        id="mcq-validate-btn"
                        className={`w-full py-1.5 rounded text-xs font-bold transition-all ${
                          selectedAnswer === null 
                            ? 'bg-slate-800 text-slate-400 cursor-not-allowed' 
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                        }`}
                      >
                        Verify Assessment MCQ
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedAnswer(null);
                          setCheckedAnswer(false);
                        }}
                        className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-bold transition"
                      >
                        Retry MCQ Question
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
          
          <div className="p-4 bg-indigo-950/10 border border-indigo-500/20 rounded-xl" id="placement-tip-block">
            <span className="text-indigo-400 text-xs font-bold block mb-1">💡 QUICK REVISION TIP</span>
            <p className="text-xs text-slate-300 leading-relaxed">
              Operating Systems questions focus heavily on Semaphores vs Mutex locks, CPU Scheduling policies (FCFS, Priority scheduling), and Cache performance matrices. Use the flashcards section to verify terms.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
