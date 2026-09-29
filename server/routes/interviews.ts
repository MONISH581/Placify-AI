import { Router } from "express";
import { z } from "zod";
import { authenticate, type AuthenticatedRequest } from "../auth";
import { heuristicInterviewScore, INTERVIEW_TYPES, questionsFor, type InterviewType } from "../data/interviewQuestions";
import { prisma } from "../db";
import { formatInterview } from "../format";
import { asyncHandler, clamp, HttpError, safeJsonParse, userLocks, validate, validateId } from "../http";
import { callMLService } from "../ml";
import { aiLimiter } from "../rateLimits";
import { awardEarnedBadges, getPublicUser, recordActivity } from "../users";

const INTERVIEW_XP = 30;

const StartSchema = z.object({ type: z.enum(INTERVIEW_TYPES) });
const AnswerSchema = z.object({
  answer: z.string().trim().min(1, "Answer cannot be empty").max(5000, "Answer is too long (max 5000 characters)"),
});

interface MLInterviewScore {
  score?: number;
  feedback?: string;
}

function overallFeedbackFor(score: number): string {
  if (score >= 80) return "Excellent interview - clear, well-structured answers with relevant detail.";
  if (score >= 60) return "Good effort. Add more concrete examples, trade-offs and measurable outcomes to stand out.";
  if (score >= 40) return "Fair attempt. Structure answers (e.g. STAR for behavioural questions) and cover the key concepts in more depth.";
  return "Needs practice. Review the fundamentals behind each question and rehearse longer, structured answers.";
}

export const interviewsRouter = Router();

interviewsRouter.post(
  "/start",
  authenticate,
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const { type } = validate(StartSchema, req.body, "Invalid interview type");
    const interview = await prisma.mockInterview.create({
      data: {
        userId: req.user!.id,
        type,
        status: "In Progress",
        currentQuestionIndex: 0,
        questions: JSON.stringify(questionsFor(type)),
        answers: "[]",
        scores: "[]",
        feedback: "[]",
        createdAt: new Date().toISOString(),
      },
    });
    res.status(201).json(formatInterview(interview));
  })
);

interviewsRouter.post(
  "/:id/answer",
  aiLimiter,
  authenticate,
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const id = validateId(req.params.id, "interview id");
    const { answer } = validate(AnswerSchema, req.body, "Invalid answer");
    const userId = req.user!.id;

    // Ownership is part of the lookup: another user's interview is indistinguishable from a missing one.
    const interview = await prisma.mockInterview.findFirst({ where: { id, userId } });
    if (!interview) throw new HttpError(404, "Interview not found");
    if (interview.status === "Completed") throw new HttpError(409, "This interview is already completed");

    const questions = safeJsonParse<string[]>(interview.questions, []);
    const index = interview.currentQuestionIndex;
    const question = questions[index];
    if (typeof question !== "string") throw new HttpError(409, "This interview has no remaining questions");
    const type = (INTERVIEW_TYPES as readonly string[]).includes(interview.type) ? (interview.type as InterviewType) : "Technical";

    const ml = await callMLService<MLInterviewScore>("/ml/interview-score", {
      body: { question, answer, interview_type: type },
      timeoutMs: 10_000,
    });
    let score: number;
    let feedback: string;
    if (ml.ok && typeof ml.data.score === "number" && Number.isFinite(ml.data.score)) {
      score = Math.round(clamp(ml.data.score, 0, 100));
      feedback = typeof ml.data.feedback === "string" && ml.data.feedback.trim() ? ml.data.feedback : "Answer scored.";
    } else {
      ({ score, feedback } = heuristicInterviewScore(type, question, answer));
    }

    const result = await userLocks.run(userId, () =>
      prisma.$transaction(async (tx) => {
        const answers = [...safeJsonParse<string[]>(interview.answers, []), answer];
        const scores = [...safeJsonParse<number[]>(interview.scores, []), score];
        const feedbacks = [...safeJsonParse<string[]>(interview.feedback, []), feedback];
        const completed = index >= questions.length - 1;
        const overallScore = completed ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

        // Optimistic concurrency: only apply if nobody answered this question in the meantime.
        const applied = await tx.mockInterview.updateMany({
          where: { id, userId, status: "In Progress", currentQuestionIndex: index },
          data: {
            answers: JSON.stringify(answers),
            scores: JSON.stringify(scores),
            feedback: JSON.stringify(feedbacks),
            currentQuestionIndex: completed ? index : index + 1,
            status: completed ? "Completed" : "In Progress",
            overallScore,
            overallFeedback: completed && overallScore !== null ? overallFeedbackFor(overallScore) : null,
            xpEarned: completed ? INTERVIEW_XP : 0,
          },
        });
        if (applied.count !== 1) throw new HttpError(409, "This question was already answered. Refresh the interview.");

        const updated = await tx.mockInterview.findUniqueOrThrow({ where: { id } });
        if (!completed) return { interview: formatInterview(updated) };

        await recordActivity(tx, userId, INTERVIEW_XP);
        await awardEarnedBadges(tx, userId);
        return { interview: formatInterview(updated), xpEarned: INTERVIEW_XP, user: await getPublicUser(userId, tx) };
      })
    );

    res.json({ ...result.interview, ...("xpEarned" in result ? { xpEarned: result.xpEarned, user: result.user } : {}) });
  })
);
