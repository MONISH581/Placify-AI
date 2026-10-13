/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Award, BookOpen, Check, CheckCircle, ChevronRight, Code, Copy, HelpCircle, Trophy } from 'lucide-react';
import { NamedIcon } from '../components/NamedIcon';
import { PageHero } from '../components/PageHero';
import { ErrorAlert, LoadingBlock } from '../components/StatusMessages';
import { TopicMentor } from '../components/tracks/TopicMentor';
import { TopicQuizPanel } from '../components/tracks/TopicQuizPanel';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { renderInline } from '../utils/inlineMarkdown';
import { renderRichText } from '../utils/richText';
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

/** Splits "Phase 1: Essentials & Core Syntax" into a small eyebrow and a wrappable title. */
function splitPhaseName(name: string, id: number): { eyebrow: string; title: string } {
  const match = /^(Phase\s+\d+)\s*:\s*(.+)$/i.exec(name);
  return match ? { eyebrow: match[1], title: match[2] } : { eyebrow: `Section ${id + 1}`, title: name };
}

function buildPhases(track: LearningTrack): TopicPhase[] {
  const topics = track.topics ?? [];
  if (track.id === 'w3schools' || track.grouped) {
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
      <PageHero
        titleId="tracks-heading"
        eyebrow="Tutorial library"
        title={selectedTrack ? selectedTrack.name : 'Learning tracks'}
        subtitle="Browse topic indexes, then study theory, examples, practice tasks, a checkpoint quiz and interview FAQs."
        stats={[{ icon: BookOpen, value: String(selectedTrack?.topics.length ?? 0), label: 'topics in this track' }]}
      />

      {tracksError && <ErrorAlert message={`Could not load learning tracks: ${tracksError}`} onRetry={() => void loadTracks()} />}
      {tracksLoading && tracks.length === 0 && <LoadingBlock label="Loading learning tracks..." />}

      <div className="flex flex-wrap gap-2.5 p-1" id="tracks-selector" role="group" aria-label="Learning tracks">
        {tracks.map((track) => {
          const isSelected = track.id === selectedTrackId;
          return (
            <button
              type="button"
              key={track.id}
              onClick={() => selectTrack(track.id)}
              aria-pressed={isSelected}
              id={`track-button-${track.id}`}
              className={`flex shrink-0 cursor-pointer items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-4 text-left transition-all ${
                isSelected
                  ? 'bg-cyan-400 text-black shadow-md'
                  : 'bg-slate-900 text-slate-300 ring-1 ring-inset ring-slate-800 hover:-translate-y-px hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold leading-none tracking-tight ${isSelected ? 'bg-black/15' : 'bg-cyan-400/15'}`}
                aria-hidden="true"
              >
                <NamedIcon name={track.logo} className={`h-4 w-4 ${isSelected ? 'text-black' : 'text-cyan-400'}`} fallbackText />
              </span>
              <span className="whitespace-nowrap text-sm font-semibold">{track.name}</span>
            </button>
          );
        })}
      </div>

      {selectedTrack && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12" id="track-details-split">
          <nav className="space-y-3 lg:col-span-3" id="track-sidebar" aria-label="Curriculum">
            <div className="px-1">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-slate-500">Syllabus</p>
              <h2 className="mt-1 font-heading text-xl font-bold text-white">Curriculum</h2>
            </div>

            {(() => {
              const total = selectedTrack.topics.length;
              const doneCount = selectedTrack.topics.filter((topic) => completedTopics.has(`${selectedTrack.id}:${topic.id}`)).length;
              const percent = total > 0 ? Math.round((doneCount / total) * 100) : 0;
              const nextIndex = selectedTrack.topics.findIndex((topic) => !completedTopics.has(`${selectedTrack.id}:${topic.id}`));
              const nextTopic = nextIndex >= 0 ? selectedTrack.topics[nextIndex] : null;
              return (
                <div className="rounded-md bg-slate-900 p-4 ring-1 ring-slate-800">
                  <div className="flex items-end justify-between">
                    <p className="font-heading text-3xl font-extrabold leading-none text-white">
                      {percent}
                      <span className="text-lg text-slate-400">%</span>
                    </p>
                    <p className="font-mono text-[11px] text-slate-400">
                      {doneCount}/{total} topics
                    </p>
                  </div>
                  <div
                    className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800"
                    role="progressbar"
                    aria-label="Track progress"
                    aria-valuenow={percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div className="h-full rounded-full bg-cyan-400 transition-[width] duration-500" style={{ width: `${percent}%` }} />
                  </div>
                  {nextTopic ? (
                    <button
                      type="button"
                      onClick={() => selectTopic(nextIndex)}
                      className="group mt-3 flex w-full cursor-pointer items-center justify-between gap-2 rounded-md bg-cyan-400 px-3 py-2 text-left text-xs font-semibold text-black transition hover:brightness-110"
                    >
                      <span className="min-w-0">
                        <span className="block font-mono text-[10px] font-bold uppercase tracking-widest opacity-70">
                          {doneCount === 0 ? 'Start' : 'Continue'}
                        </span>
                        <span className="block truncate">{nextTopic.name.replace(/^[^:]+:\s*/, '')}</span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </button>
                  ) : (
                    <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                      <CheckCircle className="h-4 w-4" aria-hidden="true" /> Track complete
                    </p>
                  )}
                </div>
              );
            })()}

            <div className="max-h-[600px] space-y-3 overflow-y-auto pr-1" id="syllabus-index">
              {phases.map((phase) => {
                const isExpanded = Boolean(expandedPhases[phase.id]);
                const { eyebrow, title } = splitPhaseName(phase.name, phase.id);
                const phaseDone = phase.topics.filter((topic) => completedTopics.has(`${selectedTrack.id}:${topic.id}`)).length;
                const phasePercent = Math.round((phaseDone / phase.topics.length) * 100);
                const phaseComplete = phaseDone === phase.topics.length;
                return (
                  <div key={phase.id} className="overflow-hidden rounded-md bg-slate-900 ring-1 ring-slate-800">
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      onClick={() => setExpandedPhases((prev) => ({ ...prev, [phase.id]: !prev[phase.id] }))}
                      className="group w-full cursor-pointer px-3.5 pb-3 pt-3 text-left transition-colors hover:bg-slate-800/60"
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block font-mono text-[10px] font-bold uppercase tracking-widest text-cyan-400">{eyebrow}</span>
                          <span className="mt-0.5 block text-[13px] font-bold leading-snug text-white">{title}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2 pt-0.5">
                          {phaseComplete ? (
                            <CheckCircle className="h-4 w-4 text-emerald-400" aria-label="Phase complete" />
                          ) : (
                            <span className="font-mono text-[11px] text-slate-400">
                              {phaseDone}/{phase.topics.length}
                            </span>
                          )}
                          <ChevronRight
                            className={`h-3.5 w-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-90 text-cyan-400' : 'text-slate-400'}`}
                            aria-hidden="true"
                          />
                        </span>
                      </span>
                      <span className="mt-2.5 block h-1 overflow-hidden rounded-full bg-slate-800" aria-hidden="true">
                        <span
                          className={`block h-full rounded-full transition-[width] duration-500 ${phaseComplete ? 'bg-emerald-400' : 'bg-cyan-400'}`}
                          style={{ width: `${phasePercent}%` }}
                        />
                      </span>
                    </button>

                    {isExpanded && (
                      <ul className="animate-slideDown border-t border-slate-800 px-1.5 py-2">
                        {phase.topics.map((topic, subIdx) => {
                          const index = phase.startIdx + subIdx;
                          const isActive = index === activeTopicIndex;
                          const done = completedTopics.has(`${selectedTrack.id}:${topic.id}`);
                          const isFirst = subIdx === 0;
                          const isLast = subIdx === phase.topics.length - 1;
                          const label =
                            (selectedTrack.id === 'w3schools' || selectedTrack.grouped) && topic.name.includes(':')
                              ? topic.name.split(':').slice(1).join(':').trim()
                              : topic.name;
                          return (
                            <li key={topic.id} className="relative">
                              <span
                                className={`absolute left-[18px] w-px ${isFirst ? 'top-1/2' : 'top-0'} ${isLast ? 'bottom-1/2' : 'bottom-0'} ${
                                  done ? 'bg-cyan-400/60' : 'bg-slate-700'
                                }`}
                                aria-hidden="true"
                              />
                              <span
                                className={`absolute left-[10px] top-1/2 z-10 flex h-[17px] w-[17px] -translate-y-1/2 items-center justify-center rounded-full transition-all ${
                                  done
                                    ? 'bg-cyan-400 text-black'
                                    : isActive
                                      ? 'bg-slate-900 ring-2 ring-cyan-400'
                                      : 'bg-slate-900 ring-2 ring-slate-600'
                                }`}
                                aria-hidden="true"
                              >
                                {done ? <Check className="h-2.5 w-2.5" strokeWidth={4} /> : isActive ? <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" /> : null}
                              </span>
                              <button
                                type="button"
                                aria-current={isActive ? 'true' : undefined}
                                onClick={() => selectTopic(index)}
                                className={`flex w-full cursor-pointer items-center rounded-md py-2 pl-9 pr-2.5 text-left transition-colors ${
                                  isActive ? 'bg-slate-800 font-semibold text-white' : 'text-slate-400 hover:bg-slate-800/70 hover:text-white'
                                }`}
                              >
                                <span className="text-xs leading-snug">{label}</span>
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
                <div className="overflow-hidden rounded-md bg-slate-900" id="workspace-core-card">
                  <div className="border-b border-slate-800 bg-slate-900/30 px-2 py-2 sm:px-6">
                    <div className="no-scrollbar flex overflow-x-auto px-1 pb-4 pt-5" id="concept-tabs" role="tablist" aria-label="Topic sections">
                      {CONTENT_TABS.map((tab, index) => {
                        const Icon = tab.icon;
                        const activeIndex = CONTENT_TABS.findIndex((t) => t.id === activeTab);
                        const isTabActive = index === activeIndex;
                        const isPassed = index < activeIndex;
                        return (
                          <button
                            type="button"
                            key={tab.id}
                            role="tab"
                            aria-selected={isTabActive}
                            onClick={() => setActiveTab(tab.id)}
                            className="group relative flex min-w-[5.5rem] flex-1 cursor-pointer flex-col items-center gap-2 text-center"
                          >
                            {index > 0 && (
                              <span
                                className={`absolute left-0 right-1/2 top-[1.125rem] h-0.5 -translate-y-1/2 transition-colors duration-300 ${
                                  index <= activeIndex ? 'bg-cyan-400' : 'bg-slate-700'
                                }`}
                                aria-hidden="true"
                              />
                            )}
                            {index < CONTENT_TABS.length - 1 && (
                              <span
                                className={`absolute left-1/2 right-0 top-[1.125rem] h-0.5 -translate-y-1/2 transition-colors duration-300 ${
                                  index < activeIndex ? 'bg-cyan-400' : 'bg-slate-700'
                                }`}
                                aria-hidden="true"
                              />
                            )}
                            <span
                              className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300 ${
                                isTabActive
                                  ? 'scale-110 bg-cyan-400 text-black shadow-lg ring-4 ring-cyan-400/25'
                                  : isPassed
                                    ? 'bg-slate-900 text-cyan-400 ring-2 ring-cyan-400'
                                    : 'bg-slate-800 text-slate-400 ring-2 ring-slate-700 group-hover:text-white group-hover:ring-slate-500'
                              }`}
                            >
                              <Icon className="h-4 w-4" aria-hidden="true" />
                            </span>
                            <span
                              className={`text-xs font-semibold transition-colors ${
                                isTabActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                              }`}
                            >
                              {tab.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="max-h-[550px] overflow-y-auto p-4 text-[13px] sm:p-6 leading-relaxed text-slate-200" id="workspace-tab-contents" role="tabpanel">
                    {activeTab === 'theory' && (
                      <div className="space-y-6" id="theory-tab-view">
                        <div className="space-y-3">
                          {!/^\s*<h1/i.test(topicDetails.theory ?? '') && (
                            <h2 className="font-heading text-xl font-bold text-white">{topicDetails.name || activeTopic.name}</h2>
                          )}
                          <div className="text-slate-200">{renderRichText(topicDetails.theory)}</div>
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
                          <div key={index} className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/95 p-4">
                            <span className="block text-xs font-bold text-cyan-400">{example.title}</span>
                            <div className="relative">
                              <pre className="overflow-x-auto whitespace-pre-wrap rounded border border-slate-800 bg-slate-950 p-3 font-mono text-[11px] text-cyan-300">
                                {example.code}
                              </pre>
                              <button
                                type="button"
                                onClick={() => void navigator.clipboard?.writeText(example.code).catch(() => undefined)}
                                aria-label={`Copy ${example.title}`}
                                className="absolute right-2 top-2 flex cursor-pointer items-center gap-1 rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300 hover:bg-slate-700"
                              >
                                <Copy className="h-3 w-3" aria-hidden="true" /> Copy
                              </button>
                            </div>
                          </div>
                        ))}

                        {topicDetails.practiceQuestions.length > 0 && (
                          <div className="mt-5 space-y-2 rounded-lg border border-cyan-500/15 bg-indigo-950/10 p-4">
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
                          <div key={index} className="space-y-3 rounded-lg border border-slate-800 bg-card p-5">
                            <span className="text-xs font-bold uppercase tracking-wider text-white">{challenge.title}</span>
                            <div className="text-slate-300">{renderRichText(challenge.description)}</div>
                            {challenge.starterCode && (
                              <div className="space-y-1.5">
                                <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-slate-400">Starter template</span>
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
                          <div key={index} className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/95 p-4">
                            <p className="flex items-start gap-1.5 font-mono text-xs font-bold text-white">
                              <span className="font-bold text-cyan-400">Q:</span> {qna.question}
                            </p>
                            <div className="pl-4 text-slate-300">{renderRichText(qna.answer)}</div>
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
              <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-slate-800 bg-card p-20">
                <BookOpen className="mb-4 h-12 w-12 text-slate-500" aria-hidden="true" />
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
