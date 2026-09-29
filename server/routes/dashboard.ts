import { Router } from "express";
import { authenticate, type AuthenticatedRequest } from "../auth";
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

interface ReadinessInput {
  xp: number;
  level: number;
  streak: number;
  accuracy: number;
  problemsSolved: number;
  submissionCount: number;
}

/** Transparent local estimate used when the ML service is unavailable. */
function fallbackReadiness(m: ReadinessInput) {
  const solvedPart = Math.min(1, m.problemsSolved / 30) * 40;
  const accuracyPart = (clamp(m.accuracy, 0, 100) / 100) * 25;
  const streakPart = Math.min(1, m.streak / 30) * 15;
  const xpPart = Math.min(1, m.xp / 3000) * 20;
  const score = Math.round(clamp(solvedPart + accuracyPart + streakPart + xpPart, 0, 100));
  const insights: string[] = [];
  if (m.problemsSolved < 10) insights.push(`Solve more problems: ${m.problemsSolved} solved so far, aim for 30+ across all topics.`);
  if (m.submissionCount >= 5 && m.accuracy < 60) insights.push(`Accuracy is ${m.accuracy}%. Test edge cases with Run before you Submit.`);
  if (m.streak < 7) insights.push("Build a daily practice streak - consistency is a strong readiness signal.");
  if (insights.length === 0) insights.push("Great consistency. Keep pushing Medium and Hard problems and practise mock interviews.");
  insights.push("Estimated locally because the ML service is offline.");
  return { score, placementReady: score >= 70, insights, model: "local-heuristic", isDemo: true as const, source: "fallback" as const };
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

    const [submissions, interviews, problems] = await Promise.all([
      prisma.submission.findMany({
        where: { userId },
        select: { status: true, submittedAt: true, problemId: true, problem: { select: { tags: true } } },
      }),
      prisma.mockInterview.findMany({ where: { userId, status: "Completed" }, select: { overallScore: true } }),
      prisma.problem.findMany({ select: { id: true, title: true, difficulty: true, tags: true } }),
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

    const [readinessRes, recommendRes] = await Promise.all([
      callMLService<MLPlacementResponse>("/ml/placement-score", {
        body: {
          xp: user.xp,
          level: user.level,
          streak,
          accuracy: user.accuracy,
          problems_solved: solvedIds.length,
          submission_count: submissions.length,
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
      readiness = fallbackReadiness({
        xp: user.xp,
        level: user.level,
        streak,
        accuracy: user.accuracy,
        problemsSolved: solvedIds.length,
        submissionCount: submissions.length,
      });
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
