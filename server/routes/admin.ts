import { Router } from "express";
import { z } from "zod";
import { authenticate, requireAdmin, type AuthenticatedRequest } from "../auth";
import { prisma } from "../db";
import { formatContest } from "../format";
import { asyncHandler, HttpError, validate, validateId } from "../http";

/**
 * Admin-only management API. Everything here sits behind authenticate + requireAdmin; the Admin Studio page is a
 * convenience on top, the permission check lives on the server.
 */
export const adminRouter = Router();
adminRouter.use(authenticate, requireAdmin);

// ---------- Overview ----------

adminRouter.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    const [users, admins, problems, submissions, accepted, contests, threads, replies, interviews, topics] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isAdmin: true } }),
      prisma.problem.count(),
      prisma.submission.count(),
      prisma.submission.count({ where: { status: "Accepted" } }),
      prisma.contest.count(),
      prisma.discussionThread.count(),
      prisma.reply.count(),
      prisma.mockInterview.count(),
      prisma.topicCompletion.count(),
    ]);
    res.json({
      users,
      admins,
      problems,
      submissions,
      acceptedSubmissions: accepted,
      acceptanceRate: submissions > 0 ? Math.round((accepted / submissions) * 100) : 0,
      contests,
      threads,
      replies,
      interviews,
      topicsCompleted: topics,
    });
  })
);

// ---------- Users ----------

adminRouter.get(
  "/users",
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      orderBy: [{ isAdmin: "desc" }, { xp: "desc" }, { username: "asc" }],
      take: 500,
      select: {
        id: true,
        email: true,
        username: true,
        isAdmin: true,
        xp: true,
        level: true,
        streak: true,
        accuracy: true,
        lastActiveDate: true,
        _count: { select: { problemsSolved: true, submissions: true } },
      },
    });
    res.json(
      users.map(({ _count, ...user }) => ({ ...user, solvedCount: _count.problemsSolved, submissionCount: _count.submissions }))
    );
  })
);

const UserPatchSchema = z.object({ isAdmin: z.boolean() });

adminRouter.patch(
  "/users/:id",
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const id = validateId(req.params.id, "user id");
    const { isAdmin } = validate(UserPatchSchema, req.body, "Invalid user update");
    if (id === req.user!.id) throw new HttpError(400, "You cannot change your own admin access.");
    const target = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!target) throw new HttpError(404, "User not found");
    await prisma.user.update({ where: { id }, data: { isAdmin } });
    res.json({ success: true });
  })
);

adminRouter.post(
  "/users/:id/reset-progress",
  asyncHandler(async (req, res) => {
    const id = validateId(req.params.id, "user id");
    const target = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!target) throw new HttpError(404, "User not found");
    await prisma.$transaction([
      prisma.submission.deleteMany({ where: { userId: id } }),
      prisma.badge.deleteMany({ where: { userId: id } }),
      prisma.topicCompletion.deleteMany({ where: { userId: id } }),
      prisma.mockInterview.deleteMany({ where: { userId: id } }),
      prisma.user.update({
        where: { id },
        data: { xp: 0, level: 1, streak: 0, accuracy: 0, problemsSolved: { set: [] } },
      }),
    ]);
    res.json({ success: true });
  })
);

adminRouter.delete(
  "/users/:id",
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const id = validateId(req.params.id, "user id");
    if (id === req.user!.id) throw new HttpError(400, "You cannot delete your own account.");
    const target = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!target) throw new HttpError(404, "User not found");
    await prisma.user.delete({ where: { id } });
    res.json({ success: true });
  })
);

// ---------- Contests ----------

const ContestSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(120, "Title is too long"),
  description: z.string().trim().min(1, "Description is required").max(1000, "Description is too long"),
  startTime: z
    .string()
    .refine((value) => !Number.isNaN(new Date(value).getTime()), "Start time must be a valid date"),
  durationMinutes: z.number().int().min(5, "Minimum duration is 5 minutes").max(1440, "Maximum duration is 24 hours"),
  problems: z.array(z.string().min(1).max(128)).min(1, "Pick at least one problem").max(20, "At most 20 problems"),
});

async function assertProblemsExist(ids: string[]) {
  const found = await prisma.problem.findMany({ where: { id: { in: ids } }, select: { id: true } });
  if (found.length !== new Set(ids).size) throw new HttpError(400, "One or more selected problems no longer exist.");
}

adminRouter.post(
  "/contests",
  asyncHandler(async (req, res) => {
    const data = validate(ContestSchema, req.body, "Invalid contest");
    await assertProblemsExist(data.problems);
    const created = await prisma.contest.create({
      data: {
        title: data.title,
        description: data.description,
        startTime: new Date(data.startTime).toISOString(),
        durationMinutes: data.durationMinutes,
        problems: JSON.stringify([...new Set(data.problems)]),
      },
      include: { _count: { select: { registrations: true } } },
    });
    res.status(201).json(formatContest(created, false));
  })
);

adminRouter.put(
  "/contests/:id",
  asyncHandler(async (req, res) => {
    const id = validateId(req.params.id, "contest id");
    const data = validate(ContestSchema, req.body, "Invalid contest");
    const existing = await prisma.contest.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new HttpError(404, "Contest not found");
    await assertProblemsExist(data.problems);
    const updated = await prisma.contest.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        startTime: new Date(data.startTime).toISOString(),
        durationMinutes: data.durationMinutes,
        problems: JSON.stringify([...new Set(data.problems)]),
      },
      include: { _count: { select: { registrations: true } } },
    });
    res.json(formatContest(updated, false));
  })
);

adminRouter.delete(
  "/contests/:id",
  asyncHandler(async (req, res) => {
    const id = validateId(req.params.id, "contest id");
    const existing = await prisma.contest.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new HttpError(404, "Contest not found");
    await prisma.contest.delete({ where: { id } });
    res.json({ success: true });
  })
);

// ---------- Discussion moderation ----------

adminRouter.delete(
  "/discussions/:id",
  asyncHandler(async (req, res) => {
    const id = validateId(req.params.id, "thread id");
    const existing = await prisma.discussionThread.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new HttpError(404, "Discussion thread not found");
    await prisma.discussionThread.delete({ where: { id } });
    res.json({ success: true });
  })
);

adminRouter.delete(
  "/discussions/:threadId/replies/:replyId",
  asyncHandler(async (req, res) => {
    const threadId = validateId(req.params.threadId, "thread id");
    const replyId = validateId(req.params.replyId, "reply id");
    const reply = await prisma.reply.findFirst({ where: { id: replyId, threadId }, select: { id: true } });
    if (!reply) throw new HttpError(404, "Reply not found");
    await prisma.reply.delete({ where: { id: replyId } });
    res.json({ success: true });
  })
);
