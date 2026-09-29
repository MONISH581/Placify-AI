import { Router } from "express";
import { authenticate, type AuthenticatedRequest } from "../auth";
import { languageTracks } from "../data/learningTracks";
import { COMPANIES } from "../data/problemBank";
import { prisma } from "../db";
import { parseTags } from "../format";
import { asyncHandler, clamp, HttpError, todayUtc } from "../http";
import { callMLService } from "../ml";
import { effectiveStreak } from "../users";

interface MLPlacementResponse {
  placement_ready?: boolean;
  score?: number;
  probability?: number;
  insights?: unknown;
  model?: string;
}

interface MLRecommendResponse {
  recommendations?: { problem_id?: string }[];
}

const DIFFICULTY_ORDER: Record<string, number> = { Easy: 0, Medium: 1, Hard: 2 };
const COMPANY_SET = new Set(COMPANIES.map((c) => c.toLowerCase()));
const ACTIVITY_DAYS = 84;

// ---------------------------------------------------------------------------
// Placement readiness (demo). The ML service scores readiness with a model trained on
// SYNTHETIC users, using features measured against this app (share of the problem bank
// solved, share of learning-track topics finished, ...). When it is offline we use the
// same formula as its documented heuristic fallback (ml_service/core/placement_features.py
// and models/placement_scorer.py), so the numbers roughly agree. Keep the constants in sync.
// ---------------------------------------------------------------------------

/** Topics across all learning tracks (the curriculum the topic share is measured against). */
const TRACK_TOPIC_KEYS = new Set(languageTracks.flatMap((track) => track.topics.map((topic) => `${track.id}/${topic.id}`)));
const TOTAL_TOPICS = TRACK_TOPIC_KEYS.size;

export interface ReadinessInput {
  problemsSolved: number;
  totalProblems: number;
  submissionCount: number;
  accuracy: number;
  streak: number;
  interviewAverage: number | null;
  topicsCompleted: number;
  totalTopics: number;
}

type ReadinessPart = "solved" | "accuracy" | "interview" | "streak" | "topics" | "practice";

const READINESS_WEIGHTS: Record<ReadinessPart, number> = { solved: 0.35, accuracy: 0.2, interview: 0.15, streak: 0.1, topics: 0.1, practice: 0.1 };
const SOLVED_FULL_CREDIT = 0.8; // share of the bank
const TOPIC_FULL_CREDIT = 0.25; // share of the curriculum
const STREAK_FULL_DAYS = 30;
const ACCURACY_EVIDENCE_VOLUME = 0.25; // accuracy counts fully after submissions >= 25% of the bank
const FALLBACK_CENTER = 0.42;
const FALLBACK_SCALE = 0.13;

const unit = (n: number) => clamp(n, 0, 1);
const accuracyPart = (accuracy: number, practiceVolume: number) => unit((clamp(accuracy, 0, 100) - 30) / 60) * unit(practiceVolume / ACCURACY_EVIDENCE_VOLUME);
const interviewPart = (average: number | null) => (average === null ? 0 : unit((clamp(average, 0, 100) - 30) / 55));

function readinessParts(m: ReadinessInput): Record<ReadinessPart, number> {
  const bank = Math.max(m.totalProblems, 1);
  const practiceVolume = Math.min(Math.max(m.submissionCount, 0) / bank, 3);
  return {
    solved: unit(unit(m.problemsSolved / bank) / SOLVED_FULL_CREDIT),
    accuracy: accuracyPart(m.accuracy, practiceVolume),
    interview: interviewPart(m.interviewAverage),
    streak: clamp(m.streak, 0, STREAK_FULL_DAYS) / STREAK_FULL_DAYS,
    topics: m.totalTopics > 0 ? unit(unit(m.topicsCompleted / m.totalTopics) / TOPIC_FULL_CREDIT) : 0,
    practice: unit(practiceVolume / 1.5),
  };
}

const plural = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;

/** First milestone share whose count is still ahead of `done`, e.g. 25% of a 21-problem bank = 6. */
function nextMilestone(done: number, total: number, shares: number[]): { share: number; target: number } | null {
  for (const share of shares) {
    const target = Math.max(1, Math.ceil(share * total - 1e-9));
    if (done < target) return { share, target };
  }
  return null;
}

/** App-relative tips, most valuable first (mirrors placement_scorer.insights). */
function readinessInsights(m: ReadinessInput, parts: Record<ReadinessPart, number>): string[] {
  const tips: { gain: number; text: string }[] = [];
  const bank = Math.max(m.totalProblems, 1);
  const practiceVolume = Math.min(m.submissionCount / bank, 3);
  const pct = (share: number) => `${Math.round(share * 100)}%`;

  const solved = m.totalProblems > 0 ? nextMilestone(m.problemsSolved, m.totalProblems, [0.25, 0.5, SOLVED_FULL_CREDIT]) : null;
  if (solved) {
    const gain = READINESS_WEIGHTS.solved * (Math.min(1, solved.target / m.totalProblems / SOLVED_FULL_CREDIT) - parts.solved);
    tips.push({ gain, text: `[Practice] Solve ${plural(solved.target - m.problemsSolved, "more Arena problem")} to reach ${pct(solved.share)} of the bank (${m.problemsSolved}/${m.totalProblems} solved).` });
  }
  if (m.interviewAverage === null) {
    tips.push({ gain: READINESS_WEIGHTS.interview * interviewPart(70), text: `[Interview] Complete a mock interview to include interview performance in your readiness (it carries ${pct(READINESS_WEIGHTS.interview)} of the weight).` });
  } else if (m.interviewAverage < 70) {
    tips.push({
      gain: READINESS_WEIGHTS.interview * (interviewPart(70) - parts.interview),
      text: `[Interview] Your mock-interview average is ${Math.round(m.interviewAverage)}/100 - aim for 70+ by explaining your approach, complexity and edge cases.`,
    });
  }
  const evidenceNeeded = Math.max(1, Math.ceil(ACCURACY_EVIDENCE_VOLUME * bank - 1e-9));
  if (m.submissionCount > 0 && m.accuracy < 70) {
    tips.push({
      gain: READINESS_WEIGHTS.accuracy * (accuracyPart(70, practiceVolume) - parts.accuracy),
      text: `[Accuracy] ${Math.round(m.accuracy)}% of your submissions are accepted - use Run on edge cases before Submit to push it past 70%.`,
    });
  } else if (m.submissionCount > 0 && m.submissionCount < evidenceNeeded) {
    tips.push({
      gain: READINESS_WEIGHTS.accuracy * (accuracyPart(m.accuracy, ACCURACY_EVIDENCE_VOLUME) - parts.accuracy),
      text: `[Accuracy] Your ${Math.round(m.accuracy)}% accuracy counts fully after ${evidenceNeeded} graded submissions (${m.submissionCount} so far).`,
    });
  }
  const topics = m.totalTopics > 0 ? nextMilestone(m.topicsCompleted, m.totalTopics, [0.05, 0.1, TOPIC_FULL_CREDIT]) : null;
  if (topics) {
    const gain = READINESS_WEIGHTS.topics * (Math.min(1, topics.target / m.totalTopics / TOPIC_FULL_CREDIT) - parts.topics);
    tips.push({ gain, text: `[Learning] Finish ${plural(topics.target - m.topicsCompleted, "more learning-track topic")} to reach ${pct(topics.share)} of the curriculum (${m.topicsCompleted}/${m.totalTopics} done).` });
  }
  if (m.streak < 7) {
    tips.push({ gain: READINESS_WEIGHTS.streak * (7 / STREAK_FULL_DAYS - parts.streak), text: `[Consistency] Practise daily to grow your streak from ${m.streak} to 7 days (consistency credit maxes out at ${STREAK_FULL_DAYS} days).` });
  } else if (m.streak < STREAK_FULL_DAYS) {
    tips.push({ gain: READINESS_WEIGHTS.streak * (1 - parts.streak), text: `[Consistency] Keep your ${m.streak}-day streak going - consistency credit maxes out at ${STREAK_FULL_DAYS} days.` });
  }

  const messages = tips.filter((t) => t.gain > 0).sort((a, b) => b.gain - a.gain).slice(0, 4).map((t) => t.text);
  return messages.length ? messages : ["[Profile] Strong profile - keep taking mock interviews and new Arena problems to stay sharp."];
}

/** Transparent local estimate used when the ML service is unavailable (same formula as its heuristic fallback). Exported for tests. */
export function fallbackReadiness(m: ReadinessInput) {
  const parts = readinessParts(m);
  const signal = (Object.keys(READINESS_WEIGHTS) as ReadinessPart[]).reduce((sum, key) => sum + READINESS_WEIGHTS[key] * parts[key], 0);
  const probability = 1 / (1 + Math.exp(-(signal - FALLBACK_CENTER) / FALLBACK_SCALE));
  const score = Math.round(clamp(probability * 100, 0, 100));
  const insights = [...readinessInsights(m, parts), "Estimated locally because the ML service is offline."];
  return { score, placementReady: probability >= 0.5, insights, model: "local-heuristic", isDemo: true as const, source: "fallback" as const };
}

function lastNDates(n: number): string[] {
  const today = new Date(`${todayUtc()}T00:00:00Z`);
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export const dashboardRouter = Router();

dashboardRouter.get(
  "/analytics",
  authenticate,
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { problemsSolved: { select: { id: true } } },
    });
    if (!user) throw new HttpError(401, "User account no longer exists");

    const [submissions, interviews, problems, topicCompletions] = await Promise.all([
      prisma.submission.findMany({
        where: { userId },
        select: { status: true, submittedAt: true, problemId: true, problem: { select: { tags: true } } },
      }),
      prisma.mockInterview.findMany({ where: { userId, status: "Completed" }, select: { overallScore: true } }),
      prisma.problem.findMany({ select: { id: true, title: true, difficulty: true, tags: true } }),
      prisma.topicCompletion.findMany({ where: { userId }, select: { trackId: true, topicId: true } }),
    ]);

    const solvedIds = user.problemsSolved.map((p) => p.id);
    const streak = effectiveStreak(user);
    const solvedSet = new Set(solvedIds);
    const metrics = {
      xp: user.xp,
      level: user.level,
      streak,
      accuracy: user.accuracy,
      problemsSolved: solvedIds.length,
      totalSubmissions: submissions.length,
      interviewAverage: (() => {
        const scores = interviews.map((i) => i.overallScore).filter((s): s is number => typeof s === "number");
        return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
      })(),
    };

    // Readiness is measured against this app: the share of the problem bank solved and of
    // the learning-track curriculum finished (completions of since-removed topics are ignored).
    const readinessInput: ReadinessInput = {
      problemsSolved: solvedIds.length,
      totalProblems: problems.length,
      submissionCount: submissions.length,
      accuracy: user.accuracy,
      streak,
      interviewAverage: metrics.interviewAverage,
      topicsCompleted: topicCompletions.filter((c) => TRACK_TOPIC_KEYS.has(`${c.trackId}/${c.topicId}`)).length,
      totalTopics: TOTAL_TOPICS,
    };

    const [readinessRes, recommendRes] = await Promise.all([
      callMLService<MLPlacementResponse>("/ml/placement-score", {
        body: {
          xp: user.xp, // xp / level are still sent for older ML services; the model ignores them
          level: user.level,
          streak,
          accuracy: user.accuracy,
          problems_solved: readinessInput.problemsSolved,
          submission_count: readinessInput.submissionCount,
          total_problems: readinessInput.totalProblems,
          interview_average: readinessInput.interviewAverage,
          topics_completed: readinessInput.topicsCompleted,
          total_topics: readinessInput.totalTopics,
          user_id: user.id,
        },
      }),
      callMLService<MLRecommendResponse>("/ml/recommend-problems", {
        body: { solved_ids: solvedIds, top_n: 10, user_id: user.id },
      }),
    ]);

    let readiness;
    if (readinessRes.ok && typeof readinessRes.data?.score === "number") {
      const d = readinessRes.data;
      readiness = {
        score: Math.round(clamp(d.score!, 0, 100)),
        placementReady: Boolean(d.placement_ready),
        insights: Array.isArray(d.insights) ? d.insights.filter((i): i is string => typeof i === "string") : [],
        model: typeof d.model === "string" ? d.model : "ml-service",
        isDemo: true as const,
        source: "ml" as const,
      };
    } else {
      readiness = fallbackReadiness(readinessInput);
    }

    const problemById = new Map(problems.map((p) => [p.id, p]));
    const toRecommendation = (p: (typeof problems)[number]) => ({ id: p.id, title: p.title, difficulty: p.difficulty, tags: parseTags(p.tags) });
    let recommendations: ReturnType<typeof toRecommendation>[] = [];
    if (recommendRes.ok && Array.isArray(recommendRes.data?.recommendations)) {
      const seen = new Set<string>();
      for (const rec of recommendRes.data!.recommendations!) {
        const id = typeof rec?.problem_id === "string" ? rec.problem_id : "";
        const problem = problemById.get(id);
        if (!problem || solvedSet.has(id) || seen.has(id)) continue;
        seen.add(id);
        recommendations.push(toRecommendation(problem));
        if (recommendations.length >= 5) break;
      }
    }
    if (recommendations.length === 0) {
      recommendations = problems
        .filter((p) => !solvedSet.has(p.id))
        .sort((a, b) => (DIFFICULTY_ORDER[a.difficulty] ?? 3) - (DIFFICULTY_ORDER[b.difficulty] ?? 3) || a.title.localeCompare(b.title))
        .slice(0, 5)
        .map(toRecommendation);
    }

    // Topic strength from submission outcomes (company tags are not topics).
    const topicStats = new Map<string, { accepted: number; failed: number }>();
    for (const s of submissions) {
      const topics = parseTags(s.problem?.tags).filter((t) => !COMPANY_SET.has(t.toLowerCase()));
      for (const topic of topics) {
        const stat = topicStats.get(topic) ?? { accepted: 0, failed: 0 };
        if (s.status === "Accepted") stat.accepted++;
        else stat.failed++;
        topicStats.set(topic, stat);
      }
    }
    const entries = [...topicStats.entries()];
    const strongTopics = entries
      .filter(([, s]) => s.accepted > 0 && s.accepted >= s.failed)
      .sort((a, b) => b[1].accepted - a[1].accepted || a[0].localeCompare(b[0]))
      .slice(0, 5)
      .map(([t]) => t);
    const weakTopics = entries
      .filter(([, s]) => s.failed > s.accepted)
      .sort((a, b) => b[1].failed - b[1].accepted - (a[1].failed - a[1].accepted) || a[0].localeCompare(b[0]))
      .slice(0, 5)
      .map(([t]) => t);

    const days = lastNDates(ACTIVITY_DAYS);
    const counts = new Map(days.map((d) => [d, 0]));
    for (const s of submissions) {
      const day = s.submittedAt.slice(0, 10);
      if (counts.has(day)) counts.set(day, counts.get(day)! + 1);
    }
    const activity = days.map((date) => ({ date, count: counts.get(date)! }));

    res.json({ readiness, recommendations, metrics, strongTopics, weakTopics, activity });
  })
);
