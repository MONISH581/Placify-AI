/**
 * Converters from Prisma rows (JSON-in-string columns) to the public API shapes.
 */

import type { Contest, DiscussionThread, MockInterview, Problem, Reply, Submission } from "@prisma/client";
import type { TestCase } from "./codeRunner";
import { safeJsonParse } from "./http";

export const CODE_LANGUAGES = ["javascript", "python", "java", "cpp", "c"] as const;
export type CodeMap = Record<(typeof CODE_LANGUAGES)[number], string>;

export interface ProblemExample {
  input: string;
  output: string;
  explanation?: string;
}

export function toCodeMap(raw: string | null | undefined): CodeMap {
  const parsed = safeJsonParse<Record<string, unknown>>(raw, {});
  const out = {} as CodeMap;
  for (const lang of CODE_LANGUAGES) {
    const value = parsed[lang];
    out[lang] = typeof value === "string" ? value : "";
  }
  return out;
}

function toStringArray(raw: string | null | undefined): string[] {
  const parsed = safeJsonParse<unknown>(raw, []);
  return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
}

export function parseTestCases(raw: string | null | undefined): TestCase[] {
  const parsed = safeJsonParse<unknown>(raw, []);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((t): t is Record<string, unknown> => typeof t === "object" && t !== null)
    .filter((t) => typeof t.input === "string" && typeof t.expectedOutput === "string")
    .map((t) => ({ input: t.input as string, expectedOutput: t.expectedOutput as string, isHidden: t.isHidden === true }));
}

export function parseTags(raw: string | null | undefined): string[] {
  return toStringArray(raw);
}

/**
 * Public problem shape. Hidden test cases are stripped unless `includeHidden` (admin views only).
 */
export function formatProblem(p: Problem, options: { includeHidden?: boolean } = {}) {
  const testCases = parseTestCases(p.testCases);
  const examples = safeJsonParse<unknown>(p.examples, []);
  return {
    id: p.id,
    title: p.title,
    difficulty: p.difficulty,
    description: p.description,
    constraints: p.constraints,
    inputFormat: p.inputFormat,
    outputFormat: p.outputFormat,
    editorial: p.editorial ?? "",
    tags: toStringArray(p.tags),
    examples: Array.isArray(examples) ? (examples as ProblemExample[]) : [],
    testCases: options.includeHidden ? testCases : testCases.filter((t) => !t.isHidden),
    hints: toStringArray(p.hints),
    starterCode: toCodeMap(p.starterCode),
    solutions: toCodeMap(p.solutions),
  };
}

export function formatSubmission(s: Submission & { problem?: { title: string } | null }) {
  return {
    id: s.id,
    userId: s.userId,
    problemId: s.problemId,
    problemTitle: s.problem?.title,
    language: s.language,
    code: s.code,
    status: s.status,
    errorMessage: s.errorMessage ?? "",
    timeComplexity: s.timeComplexity,
    memoryUsage: s.memoryUsage,
    xpEarned: s.xpEarned,
    aiReview: s.aiReview,
    submittedAt: s.submittedAt,
  };
}

export function formatInterview(mi: MockInterview) {
  return {
    id: mi.id,
    type: mi.type,
    status: mi.status,
    currentQuestionIndex: mi.currentQuestionIndex,
    questions: toStringArray(mi.questions),
    answers: toStringArray(mi.answers),
    scores: safeJsonParse<number[]>(mi.scores, []).filter((n) => typeof n === "number"),
    feedback: toStringArray(mi.feedback),
    overallScore: mi.overallScore,
    overallFeedback: mi.overallFeedback,
    createdAt: mi.createdAt,
  };
}

export function formatThread(t: DiscussionThread & { replies?: Reply[] }) {
  return {
    id: t.id,
    title: t.title,
    content: t.content,
    userId: t.userId,
    username: t.username,
    category: t.category,
    likes: t.likes,
    likedBy: toStringArray(t.likedBy),
    createdAt: t.createdAt,
    replies: (t.replies ?? [])
      .slice()
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((r) => ({ id: r.id, userId: r.userId, username: r.username, content: r.content, createdAt: r.createdAt })),
  };
}

export function formatContest(c: Contest & { _count?: { registrations: number } }, isRegistered: boolean) {
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    startTime: c.startTime,
    durationMinutes: c.durationMinutes,
    problems: toStringArray(c.problems),
    registrantsCount: c._count?.registrations ?? 0,
    isRegistered,
  };
}
