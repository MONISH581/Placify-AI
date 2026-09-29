import { Router, type RequestHandler } from "express";
import { Type, type Schema } from "@google/genai";
import { z } from "zod";
import { aiEnabled, generateJson } from "../ai";
import { authenticate, type AuthenticatedRequest } from "../auth";
import { languageTracks } from "../data/learningTracks";
import { getDynamicTopicPayload, type TopicPayload } from "../data/topicContent";
import { prisma } from "../db";
import { asyncHandler, HttpError, userLocks, validate, validateId } from "../http";
import { aiLimiter } from "../rateLimits";
import { awardEarnedBadges, getPublicUser, recordActivity } from "../users";

const TOPIC_XP = 15;
const PASSING_QUIZ_SCORE = 60;

const CompleteSchema = z.object({
  quizScore: z.number().int().min(0).max(100),
});

const TOPIC_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    theory: { type: Type.STRING },
    visualExplanation: { type: Type.STRING },
    codeExamples: {
      type: Type.ARRAY,
      items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, code: { type: Type.STRING } }, required: ["title", "code"] },
    },
    practiceQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
    codingChallenges: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { title: { type: Type.STRING }, description: { type: Type.STRING }, starterCode: { type: Type.STRING } },
        required: ["title", "description", "starterCode"],
      },
    },
    quizzes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          answerIndex: { type: Type.INTEGER },
          explanation: { type: Type.STRING },
        },
        required: ["question", "options", "answerIndex", "explanation"],
      },
    },
    interviewQuestions: {
      type: Type.ARRAY,
      items: { type: Type.OBJECT, properties: { question: { type: Type.STRING }, answer: { type: Type.STRING } }, required: ["question", "answer"] },
    },
  },
  required: ["name", "theory", "visualExplanation", "codeExamples", "practiceQuestions", "codingChallenges", "quizzes", "interviewQuestions"],
};

const TopicPayloadSchema = z.object({
  name: z.string(),
  theory: z.string().min(1),
  visualExplanation: z.string(),
  codeExamples: z.array(z.object({ title: z.string(), code: z.string() })).min(1),
  practiceQuestions: z.array(z.string()),
  codingChallenges: z.array(z.object({ title: z.string(), description: z.string(), starterCode: z.string() })),
  quizzes: z
    .array(z.object({ question: z.string(), options: z.array(z.string()).min(2), answerIndex: z.number().int().min(0), explanation: z.string() }))
    .min(1)
    .refine((qs) => qs.every((q) => q.answerIndex < q.options.length), "answerIndex out of range"),
  interviewQuestions: z.array(z.object({ question: z.string(), answer: z.string() })),
});

const topicCache = new Map<string, TopicPayload>();
const TOPIC_CACHE_LIMIT = 200;

function findTopic(trackId: string, topicId: string) {
  const track = languageTracks.find((t) => t.id === trackId);
  if (!track) throw new HttpError(404, "Track not found");
  const topic = track.topics.find((t) => t.id === topicId);
  if (!topic) throw new HttpError(404, "Topic not found");
  return { track, topic };
}

async function generateTopic(trackName: string, topicName: string, topicSummary: string): Promise<TopicPayload | null> {
  const prompt = `You are an expert programming educator for the "${trackName}" track.
Create a complete study module for the topic "${topicName}" (${topicSummary}).
Include: a detailed theory explanation (markdown allowed), an ASCII diagram, 2-4 code examples, 5-10 practice questions,
2-3 coding challenges (beginner to advanced) with starter code, exactly 5 multiple-choice quiz questions (4 options each, answerIndex is 0-based),
and 4-6 frequently asked interview questions with answers. Set "name" to "${topicName}".`;
  const raw = await generateJson<unknown>("learning topic", prompt, TOPIC_SCHEMA, 20_000);
  if (!raw) return null;
  const parsed = TopicPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    console.warn("[learning] AI topic payload did not match the expected shape; using static content");
    return null;
  }
  return { ...parsed.data, name: topicName };
}

const topicLimiter: RequestHandler = aiEnabled ? aiLimiter : (_req, _res, next) => next();

export const learningRouter = Router();

learningRouter.get("/", (_req, res) => {
  res.json(languageTracks);
});

learningRouter.get(
  "/:trackId/topics/:topicId",
  topicLimiter,
  asyncHandler(async (req, res) => {
    const trackId = validateId(req.params.trackId, "track id");
    const topicId = validateId(req.params.topicId, "topic id");
    const { track, topic } = findTopic(trackId, topicId);
    const cacheKey = `${trackId}/${topicId}`;

    const cached = topicCache.get(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }
    const generated = aiEnabled ? await generateTopic(track.name, topic.name, topic.content) : null;
    if (generated) {
      if (topicCache.size >= TOPIC_CACHE_LIMIT) topicCache.delete(topicCache.keys().next().value!);
      topicCache.set(cacheKey, generated);
      res.json(generated);
      return;
    }
    res.json(getDynamicTopicPayload(trackId, topicId, topic.name));
  })
);

learningRouter.post(
  "/:trackId/topics/:topicId/complete",
  authenticate,
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const trackId = validateId(req.params.trackId, "track id");
    const topicId = validateId(req.params.topicId, "topic id");
    findTopic(trackId, topicId);
    const { quizScore } = validate(CompleteSchema, req.body, "Invalid completion payload");
    const userId = req.user!.id;
    const passed = quizScore >= PASSING_QUIZ_SCORE;

    const result = await userLocks.run(userId, () =>
      prisma.$transaction(async (tx) => {
        const existing = await tx.topicCompletion.findUnique({
          where: { userId_trackId_topicId: { userId, trackId, topicId } },
        });
        if (existing) {
          if (quizScore > existing.quizScore) {
            await tx.topicCompletion.update({ where: { id: existing.id }, data: { quizScore } });
          }
          return { xpEarned: 0, alreadyCompleted: true, user: await getPublicUser(userId, tx) };
        }
        if (!passed) {
          return { xpEarned: 0, alreadyCompleted: false, user: await getPublicUser(userId, tx) };
        }
        await tx.topicCompletion.create({ data: { userId, trackId, topicId, quizScore, xpEarned: TOPIC_XP } });
        await recordActivity(tx, userId, TOPIC_XP);
        await awardEarnedBadges(tx, userId);
        return { xpEarned: TOPIC_XP, alreadyCompleted: false, user: await getPublicUser(userId, tx) };
      })
    );

    res.json({ ...result, passed, passingScore: PASSING_QUIZ_SCORE });
  })
);
