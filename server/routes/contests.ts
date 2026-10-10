import { Router } from "express";
import { authenticate, optionalAuth, type AuthenticatedRequest } from "../auth";
import { prisma } from "../db";
import { formatContest } from "../format";
import { asyncHandler, HttpError, validateId } from "../http";

export const contestsRouter = Router();

contestsRouter.get(
  "/",
  optionalAuth,
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const contests = await prisma.contest.findMany({
      orderBy: { startTime: "asc" },
      include: { _count: { select: { registrations: true } } },
    });
    const registered = req.user
      ? new Set(
          (
            await prisma.contestRegistration.findMany({ where: { userId: req.user.id }, select: { contestId: true } })
          ).map((r) => r.contestId)
        )
      : new Set<string>();
    res.json(contests.map((c) => formatContest(c, registered.has(c.id))));
  })
);

contestsRouter.post(
  "/:id/register",
  authenticate,
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const contestId = validateId(req.params.id, "contest id");
    const userId = req.user!.id;
    const contest = await prisma.contest.findUnique({ where: { id: contestId }, select: { id: true } });
    if (!contest) throw new HttpError(404, "Contest not found");

    // Idempotent: registering twice keeps a single row (unique on contestId + userId).
    await prisma.contestRegistration.upsert({
      where: { contestId_userId: { contestId, userId } },
      update: {},
      create: { contestId, userId },
    });
    const updated = await prisma.contest.findUniqueOrThrow({
      where: { id: contestId },
      include: { _count: { select: { registrations: true } } },
    });
    res.json(formatContest(updated, true));
  })
);
