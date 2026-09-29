import { Router } from "express";
import { z } from "zod";
import { authenticate, type AuthenticatedRequest } from "../auth";
import { prisma } from "../db";
import { formatThread } from "../format";
import { asyncHandler, HttpError, resourceLocks, safeJsonParse, validate, validateId } from "../http";

export const DISCUSSION_CATEGORIES = ["General", "DSA", "Interview Experience", "Contests", "Doubts"] as const;

const ThreadSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(200, "Title is too long"),
  content: z.string().trim().min(1, "Content is required").max(5000, "Content is too long (max 5000 characters)"),
  category: z.enum(DISCUSSION_CATEGORIES).default("General"),
});

const ReplySchema = z.object({
  content: z.string().trim().min(1, "Reply cannot be empty").max(2000, "Reply is too long (max 2000 characters)"),
});

async function loadThread(id: string) {
  const thread = await prisma.discussionThread.findUnique({ where: { id }, include: { replies: true } });
  if (!thread) throw new HttpError(404, "Discussion thread not found");
  return thread;
}

export const discussionsRouter = Router();

discussionsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const threads = await prisma.discussionThread.findMany({
      include: { replies: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json(threads.map(formatThread));
  })
);

discussionsRouter.post(
  "/",
  authenticate,
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const { title, content, category } = validate(ThreadSchema, req.body, "Invalid discussion thread");
    const created = await prisma.discussionThread.create({
      data: {
        title,
        content,
        category,
        username: req.user!.username,
        userId: req.user!.id,
        likes: 0,
        likedBy: "[]",
        createdAt: new Date().toISOString(),
      },
      include: { replies: true },
    });
    res.status(201).json(formatThread(created));
  })
);

discussionsRouter.post(
  "/:id/reply",
  authenticate,
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const id = validateId(req.params.id, "thread id");
    const { content } = validate(ReplySchema, req.body, "Invalid reply");
    await loadThread(id);
    await prisma.reply.create({
      data: { threadId: id, content, username: req.user!.username, userId: req.user!.id, createdAt: new Date().toISOString() },
    });
    res.json(formatThread(await loadThread(id)));
  })
);

discussionsRouter.post(
  "/:id/like",
  authenticate,
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const id = validateId(req.params.id, "thread id");
    const userId = req.user!.id;
    const thread = await resourceLocks.run(`thread:${id}`, async () => {
      const current = await loadThread(id);
      const likedBy = new Set(safeJsonParse<string[]>(current.likedBy, []).filter((v) => typeof v === "string"));
      if (likedBy.has(userId)) likedBy.delete(userId);
      else likedBy.add(userId);
      return prisma.discussionThread.update({
        where: { id },
        data: { likedBy: JSON.stringify([...likedBy]), likes: likedBy.size },
        include: { replies: true },
      });
    });
    res.json(formatThread(thread));
  })
);
