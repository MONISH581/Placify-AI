/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Award, BookOpen, CheckCircle, ChevronRight, Code, Copy, HelpCircle, Trophy } from 'lucide-react';
import { ErrorAlert, LoadingBlock } from '../components/StatusMessages';
import { TopicMentor } from '../components/tracks/TopicMentor';
import { TopicQuizPanel } from '../components/tracks/TopicQuizPanel';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { renderInline } from '../utils/inlineMarkdown';
import type { LearningTrack, TopicPayload, TrackTopic, User } from '../types';

type ContentTab = 'theory' | 'examples' | 'challenges' | 'quiz' | 'faq';

interface TopicPhase {
  id: number;
  name: string;
  topics: TrackTopic[];
  startIdx: number;
}

const CONTENT_TABS: Array<{ id: ContentTab; label: string; icon: React.ElementType }> = [
  { id: 'theory', label: 'Theory', icon: BookOpen },
  { id: 'examples', label: 'Examples', icon: Code },
  { id: 'challenges', label: 'Challenges', icon: Award },
  { id: 'quiz', label: 'Quiz', icon: HelpCircle },
  { id: 'faq', label: 'Interview FAQ', icon: Trophy },
];

function buildPhases(track: LearningTrack): TopicPhase[] {
  const topics = track.topics ?? [];
  if (track.id === 'w3schools') {
    const groups = new Map<string, TrackTopic[]>();
    for (const topic of topics) {
      const groupName = topic.name.includes(':') ? topic.name.split(':')[0] : 'Core Tutorials';
      groups.set(groupName, [...(groups.get(groupName) ?? []), topic]);
    }
    let startIdx = 0;
    return Array.from(groups.entries()).map(([name, groupTopics], index) => {
      const phase = { id: index, name, topics: groupTopics, startIdx };
      startIdx += groupTopics.length;
      return phase;
    });
  }

  const size = Math.max(1, Math.ceil(topics.length / 4));
  const names = [
    'Phase 1: Essentials & Core Syntax',
    'Phase 2: Data Structures & Control',
    'Phase 3: OOP & Intermediate Concepts',
    'Phase 4: Concurrency & Capstone Projects',
  ];
  return names
    .map((name, index) => ({ id: index, name, topics: topics.slice(size * index, size * (index + 1)), startIdx: size * index }))
    .filter((phase) => phase.topics.length > 0);
}

/** Guards against partial payloads (e.g. AI-generated content missing a section). */
function normalizeTopic(payload: TopicPayload): TopicPayload {
  const list = <T,>(value: T[] | undefined): T[] => (Array.isArray(value) ? value : []);
  return {
    ...payload,
    theory: payload.theory ?? '',
    codeExamples: list(payload.codeExamples),
    practiceQuestions: list(payload.practiceQuestions),
    codingChallenges: list(payload.codingChallenges),
    quizzes: list(payload.quizzes).filter((quiz) => Array.isArray(quiz?.options)),
    interviewQuestions: list(payload.interviewQuestions),
  };
}

export default function LearningTracksPage() {
  const { updateUser } = useAuth();
  const { refreshAnalytics } = useAppData();

  const [tracks, setTracks] = useState<LearningTrack[]>([]);
  const [tracksLoading, setTracksLoading] = useState(true);
  const [tracksError, setTracksError] = useState<string | null>(null);

  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [activeTopicIndex, setActiveTopicIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<ContentTab>('theory');
  const [expandedPhases, setExpandedPhases] = useState<Record<number, boolean>>({ 0: true });

  const [topicDetails, setTopicDetails] = useState<TopicPayload | null>(null);
  const [topicLoading, setTopicLoading] = useState(false);
  const [topicError, setTopicError] = useState<string | null>(null);
  const [topicReload, setTopicReload] = useState(0);

  /** `${trackId}:${topicId}` for topics completed during this visit (server remains the source of truth). */
  const [completedTopics, setCompletedTopics] = useState<Set<string>>(() => new Set());

  const selectedTrack = tracks.find((track) => track.id === selectedTrackId) ?? null;
  const activeTopic = selectedTrack?.topics[activeTopicIndex] ?? null;
  const phases = useMemo(() => (selectedTrack ? buildPhases(selectedTrack) : []), [selectedTrack]);

  const loadTracks = useCallback(async () => {
    setTracksLoading(true);
    setTracksError(null);
    try {
      const result = await api.get<LearningTrack[]>('/api/learning-tracks');
      if (result.ok && Array.isArray(result.data)) {
        const data = result.data.map((track) => ({ ...track, topics: Array.isArray(track.topics) ? track.topics : [] }));
        setTracks(data);
        setSelectedTrackId((current) => current ?? data[0]?.id ?? null);
      } else {
        setTracksError(result.ok ? 'Unexpected response format.' : result.error);
      }
    } finally {
      setTracksLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTracks();
  }, [loadTracks]);

  // Keep the phase containing the active topic expanded.
  useEffect(() => {
    const activePhase = phases.find(
      (phase) => activeTopicIndex >= phase.startIdx && activeTopicIndex < phase.startIdx + phase.topics.length,
    );
    if (activePhase) setExpandedPhases((prev) => (prev[activePhase.id] ? prev : { ...prev, [activePhase.id]: true }));
  }, [phases, activeTopicIndex]);

  // Fetch topic content; abort stale requests when the topic changes quickly.
  const trackIdForFetch = selectedTrack?.id ?? null;
  const topicIdForFetch = activeTopic?.id ?? null;
  useEffect(() => {
    if (!trackIdForFetch || !topicIdForFetch) return;
    const controller = new AbortController();
    setTopicLoading(true);
    setTopicError(null);
    setTopicDetails(null);

    void api
      .get<TopicPayload>(
        `/api/learning-tracks/${encodeURIComponent(trackIdForFetch)}/topics/${encodeURIComponent(topicIdForFetch)}`,
        { signal: controller.signal, timeoutMs: 30_000 },
      )
      .then((result) => {
        if (controller.signal.aborted) return;
        if (result.ok && result.data) {
          const payload = normalizeTopic(result.data);
          setTopicDetails(payload);
          if (payload.completed) {
            setCompletedTopics((prev) => new Set(prev).add(`${trackIdForFetch}:${topicIdForFetch}`));
          }
        } else {
          setTopicError(result.ok ? 'Unexpected response format.' : result.error);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setTopicLoading(false);
      });

    return () => controller.abort();
  }, [trackIdForFetch, topicIdForFetch, topicReload]);

  const selectTrack = (trackId: string) => {
    setSelectedTrackId(trackId);
    setActiveTopicIndex(0);
    setActiveTab('theory');
    setExpandedPhases({ 0: true });
  };

  const selectTopic = (index: number) => {
    setActiveTopicIndex(index);
    setActiveTab('theory');
  };

  const handleTopicCompleted = (user: User) => {
    updateUser(user);
    if (selectedTrack && activeTopic) {
      setCompletedTopics((prev) => new Set(prev).add(`${selectedTrack.id}:${activeTopic.id}`));
    }
    void refreshAnalytics();
  };

  const topicKey = selectedTrack && activeTopic ? `${selectedTrack.id}:${activeTopic.id}` : '';
  const isLastTopic = !selectedTrack || activeTopicIndex >= selectedTrack.topics.length - 1;

  return (
    <div className="animate-fadeIn space-y-5" id="learning-tracks-container">
      <div className="rounded-lg border border-slate-800 bg-[#161D2F] p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-cyan-400">Tutorial library</p>
            <h1 className="font-heading text-2xl font-bold text-white">Learning tracks</h1>
            <p className="mt-1 text-sm text-slate-300">
              Browse topic indexes, then study theory, examples, practice tasks, a checkpoint quiz and interview FAQs.
            </p>
          </div>
          <div className="rounded-lg bg-slate-950 px-4 py-3 text-white">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Topics in track</p>
            <p className="text-2xl font-black">{selectedTrack?.topics.length ?? 0}</p>
          </div>
        </div>
      </div>

      {tracksError && <ErrorAlert message={`Could not load learning tracks: ${tracksError}`} onRetry={() => void loadTracks()} />}
      {tracksLoading && tracks.length === 0 && <LoadingBlock label="Loading learning tracks..." />}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6" id="tracks-selector">
        {tracks.map((track) => {
          const isSelected = track.id === selectedTrackId;
          return (
            <button
              type="button"
              key={track.id}
              onClick={() => selectTrack(track.id)}
              aria-pressed={isSelected}
              id={`track-button-${track.id}`}
              className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition ${
                isSelected
                  ? 'border-cyan-500/50 bg-slate-950 text-white shadow-md shadow-slate-950/10'
                  : 'border-slate-800 bg-[#161D2F] text-slate-300 hover:border-cyan-500 hover:text-white'
              }`}
            >
              <span className="text-xl font-black" aria-hidden="true">
                {track.logo}
              </span>
              <span className="font-sans text-xs font-bold tracking-tight">{track.name}</span>
            </button>
          );
        })}
      </div>

      {selectedTrack && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12" id="track-details-split">
          <nav className="space-y-3 lg:col-span-3" id="track-sidebar" aria-label="Curriculum">
            <h2 className="px-1 font-mono text-xs font-bold uppercase tracking-widest text-cyan-400">Curriculum</h2>
            <div className="max-h-[600px] space-y-3 overflow-y-auto pr-1" id="syllabus-index">
              {phases.map((phase) => {
                const isExpanded = Boolean(expandedPhases[phase.id]);
                return (
                  <div key={phase.id} className="space-y-1.5 overflow-hidden rounded-lg border border-slate-800 bg-[#161D2F] p-2 shadow-sm">
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      onClick={() => setExpandedPhases((prev) => ({ ...prev, [phase.id]: !prev[phase.id] }))}
                      className="flex w-full cursor-pointer items-center justify-between px-2 py-1.5 text-left font-mono text-xs font-bold text-slate-200 hover:text-cyan-400"
                    >
                      <span className="max-w-[90%] truncate">{phase.name}</span>
                      <ChevronRight
                        className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90 text-cyan-400' : 'text-slate-400'}`}
                        aria-hidden="true"
                      />
                    </button>

                    {isExpanded && (
                      <ul className="animate-slideDown space-y-1 px-1 pb-1">
                        {phase.topics.map((topic, subIdx) => {
                          const index = phase.startIdx + subIdx;
                          const isActive = index === activeTopicIndex;
                          const done = completedTopics.has(`${selectedTrack.id}:${topic.id}`);
                          const label =
                            selectedTrack.id === 'w3schools' && topic.name.includes(':')
                              ? topic.name.split(':').slice(1).join(':').trim()
                              : topic.name;
                          return (
                            <li key={topic.id}>
                              <button
                                type="button"
                                aria-current={isActive ? 'true' : undefined}
                                onClick={() => selectTopic(index)}
                                className={`flex w-full cursor-pointer items-center justify-between rounded-lg border p-2.5 text-left transition ${
                                  isActive
                                    ? 'border-cyan-500/50 bg-cyan-950/45 font-semibold text-cyan-300'
                                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700 hover:text-white'
                                }`}
                              >
                                <span className="max-w-[85%] truncate text-[10px]">{label}</span>
                                {done ? (
                                  <CheckCircle className="h-3 w-3 shrink-0 text-emerald-400" aria-label="Completed" />
                                ) : (
                                  <ChevronRight className="h-3 w-3 shrink-0" aria-hidden="true" />
                                )}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </nav>

          <div className="space-y-6 lg:col-span-9" id="track-curriculum-content">
            {topicLoading ? (
              <LoadingBlock label="Loading topic material..." className="min-h-[400px]" />
            ) : topicError ? (
              <ErrorAlert message={`Could not load this topic: ${topicError}`} onRetry={() => setTopicReload((n) => n + 1)} />
            ) : topicDetails && selectedTrack && activeTopic ? (
              <div className="space-y-6">
                <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#161D2F]" id="workspace-core-card">
                  <div className="flex overflow-x-auto border-b border-slate-800 bg-slate-900/30 font-mono text-xs" id="concept-tabs" role="tablist">
                    {CONTENT_TABS.map((tab) => {
                      const Icon = tab.icon;
                      const isTabActive = activeTab === tab.id;
                      return (
                        <button
                          type="button"
                          key={tab.id}
                          role="tab"
                          aria-selected={isTabActive}
                          onClick={() => setActiveTab(tab.id)}
                          className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap border-b-2 px-2 py-3 text-center font-semibold transition ${
                            isTabActive ? 'border-cyan-400 bg-slate-800/10 text-cyan-300' : 'border-transparent text-slate-400 hover:text-white'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="max-h-[550px] overflow-y-auto p-6 text-[13px] leading-relaxed text-slate-200" id="workspace-tab-contents" role="tabpanel">
                    {activeTab === 'theory' && (
                      <div className="space-y-6" id="theory-tab-view">
                        <div className="space-y-3">
                          <h2 className="font-mono text-lg font-bold text-white">{topicDetails.name || activeTopic.name}</h2>
                          <p className="whitespace-pre-wrap leading-relaxed text-slate-200">{renderInline(topicDetails.theory)}</p>
                        </div>
                        {topicDetails.visualExplanation && (
                          <div className="space-y-2 border-t border-slate-800 pt-4" id="visual-segment">
                            <span className="font-mono text-xs font-bold uppercase tracking-widest text-slate-400">Visual overview</span>
                            <pre className="overflow-x-auto whitespace-pre rounded-lg border border-slate-800 bg-slate-950 p-4 font-mono text-[11px] text-cyan-300">
                              {topicDetails.visualExplanation}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'examples' && (
                      <div className="space-y-5" id="examples-tab-view">
                        <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-white">Code examples</h3>
                        {topicDetails.codeExamples.length === 0 && <p className="text-xs italic text-slate-400">No examples for this topic.</p>}
                        {topicDetails.codeExamples.map((example, index) => (
                          <div key={index} className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                            <span className="block text-xs font-bold text-cyan-400">{example.title}</span>
                            <div className="relative">
                              <pre className="overflow-x-auto whitespace-pre-wrap rounded border border-slate-800 bg-slate-950 p-3 font-mono text-[11px] text-cyan-300">
                                {example.code}
                              </pre>
                              <button
                                type="button"
                                onClick={() => void navigator.clipboard?.writeText(example.code).catch(() => undefined)}
                                aria-label={`Copy ${example.title}`}
                                className="absolute right-2 top-2 flex cursor-pointer items-center gap-1 rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700"
                              >
                                <Copy className="h-3 w-3" aria-hidden="true" /> Copy
                              </button>
                            </div>
                          </div>
                        ))}

                        {topicDetails.practiceQuestions.length > 0 && (
                          <div className="mt-5 space-y-2 rounded-xl border border-cyan-500/15 bg-indigo-950/10 p-4">
                            <span className="block font-mono text-xs font-bold uppercase tracking-wider text-cyan-400">Practice exercises</span>
                            <ul className="list-disc space-y-2 pl-4">
                              {topicDetails.practiceQuestions.map((question, index) => (
                                <li key={index} className="text-[13px] text-slate-200">
                                  {renderInline(question)}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'challenges' && (
                      <div className="space-y-5" id="challenges-tab-view">
                        <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-white">Coding challenges</h3>
                        {topicDetails.codingChallenges.length === 0 && (
                          <p className="text-xs italic text-slate-400">No challenges for this topic.</p>
                        )}
                        {topicDetails.codingChallenges.map((challenge, index) => (
                          <div key={index} className="space-y-3 rounded-xl border border-slate-800 bg-[#0F172A] p-5">
                            <span className="text-xs font-bold uppercase tracking-wider text-white">{challenge.title}</span>
                            <p className="whitespace-pre-wrap text-slate-300">{challenge.description}</p>
                            {challenge.starterCode && (
                              <div className="space-y-1.5">
                                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">Starter template</span>
                                <pre className="overflow-x-auto whitespace-pre-wrap rounded border border-slate-900 bg-slate-950 p-3.5 font-mono text-[11px] text-indigo-400">
                                  {challenge.starterCode}
                                </pre>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Kept mounted (hidden) so answers and the completion result survive tab switches. */}
                    <div hidden={activeTab !== 'quiz'}>
                      <TopicQuizPanel
                        key={topicKey}
                        trackId={selectedTrack.id}
                        topicId={activeTopic.id}
                        quizzes={topicDetails.quizzes}
                        alreadyCompleted={completedTopics.has(topicKey)}
                        onCompleted={handleTopicCompleted}
                      />
                    </div>

                    {activeTab === 'faq' && (
                      <div className="space-y-4" id="faq-tab-view">
                        <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-white">Interview FAQ</h3>
                        {topicDetails.interviewQuestions.length === 0 && (
                          <p className="text-xs italic text-slate-400">No interview questions for this topic.</p>
                        )}
                        {topicDetails.interviewQuestions.map((qna, index) => (
                          <div key={index} className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                            <p className="flex items-start gap-1.5 font-mono text-xs font-bold text-white">
                              <span className="font-bold text-cyan-400">Q:</span> {qna.question}
                            </p>
                            <p className="pl-4 text-slate-300">{qna.answer}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end border-t border-slate-800 bg-slate-950 p-4">
                    <button
                      type="button"
                      onClick={() => selectTopic(activeTopicIndex + 1)}
                      disabled={isLastTopic}
                      className="cursor-pointer rounded-lg bg-cyan-400 px-5 py-2 font-mono text-xs font-bold text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next topic &rarr;
                    </button>
                  </div>
                </div>

                <TopicMentor key={topicKey} trackName={selectedTrack.name} topicName={activeTopic.name} />
              </div>
            ) : (
              <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-slate-800 bg-[#161D2F] p-20">
                <BookOpen className="mb-4 h-12 w-12 text-slate-600" aria-hidden="true" />
                <h3 className="mb-1 text-sm font-bold text-white">Select a topic from the curriculum</h3>
                <p className="text-center text-xs text-slate-400">Work through the topics in order and pass each checkpoint quiz.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
