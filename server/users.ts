/**
 * User helpers: the public user shape, XP/level/streak bookkeeping and badge awards.
 */

import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./db";
import { HttpError, todayUtc } from "./http";

type Db = PrismaClient | Prisma.TransactionClient;

export interface PublicUser {
  id: string;
  email: string;
  username: string;
  isAdmin: boolean;
  xp: number;
  level: number;
  streak: number;
  lastActiveDate: string;
  accuracy: number;
  verified: boolean;
  problemsSolved: string[];
  badges: string[];
}

const publicUserInclude = {
  problemsSolved: { select: { id: true } },
  badges: { select: { name: true }, orderBy: { awardedAt: "asc" } },
} satisfies Prisma.UserInclude;

type UserWithRelations = Prisma.UserGetPayload<{ include: typeof publicUserInclude }>;

/** The stored streak only changes on activity; a streak whose last day is before yesterday is already broken. */
export function effectiveStreak(user: { streak: number; lastActiveDate: string }, today = todayUtc()): number {
  if (user.lastActiveDate === today) return user.streak;
  const yesterday = new Date(`${today}T00:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return user.lastActiveDate === yesterday.toISOString().slice(0, 10) ? user.streak : 0;
}

function toPublicUser(user: UserWithRelations): PublicUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    isAdmin: user.isAdmin,
    xp: user.xp,
    level: user.level,
    streak: effectiveStreak(user),
    lastActiveDate: user.lastActiveDate,
    accuracy: user.accuracy,
    verified: user.verified,
    problemsSolved: user.problemsSolved.map((p) => p.id),
    badges: user.badges.map((b) => b.name),
  };
}

/** Loads the public user object (never includes the password hash). Throws 401 if the user is gone. */
export async function getPublicUser(userId: string, db: Db = prisma): Promise<PublicUser> {
  const user = await db.user.findUnique({ where: { id: userId }, include: publicUserInclude });
  if (!user) throw new HttpError(401, "User account no longer exists");
  return toPublicUser(user);
}

export function levelForXp(xp: number): number {
  return Math.floor(Math.max(0, xp) / 500) + 1;
}

/** Streak rule: same day -> unchanged, consecutive day -> +1, otherwise restart at 1. */
export function nextStreak(lastActiveDate: string, currentStreak: number, today = todayUtc()): number {
  if (lastActiveDate === today) return Math.max(1, currentStreak);
  const yesterday = new Date(`${today}T00:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  if (lastActiveDate === yesterday.toISOString().slice(0, 10)) return Math.max(0, currentStreak) + 1;
  return 1;
}

/**
 * Adds XP (may be 0) and records activity for today (streak bookkeeping).
 * Must be called inside the caller's per-user lock/transaction.
 */
export async function recordActivity(db: Db, userId: string, xpDelta: number, extra: Prisma.UserUpdateInput = {}) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { xp: true, streak: true, lastActiveDate: true } });
  if (!user) throw new HttpError(401, "User account no longer exists");
  const today = todayUtc();
  const xp = user.xp + Math.max(0, xpDelta);
  return db.user.update({
    where: { id: userId },
    data: {
      ...extra,
      xp,
      level: levelForXp(xp),
      streak: nextStreak(user.lastActiveDate, user.streak, today),
      lastActiveDate: today,
    },
  });
}

interface BadgeDefinition {
  name: string;
  description: string;
  icon: string;
  criteria: string;
}

export const BADGES = {
  firstSolve: { name: "First Solve", description: "Solved your first coding problem.", icon: "Award", criteria: "problems_solved>=1" },
  problemSolver: { name: "Problem Solver", description: "Solved 10 coding problems.", icon: "Trophy", criteria: "problems_solved>=10" },
  streak7: { name: "Consistency Streak", description: "Stayed active 7 days in a row.", icon: "Flame", criteria: "streak>=7" },
  interviewReady: { name: "Interview Starter", description: "Completed your first mock interview.", icon: "Mic", criteria: "interviews_completed>=1" },
  learner: { name: "Curious Learner", description: "Completed your first learning-track topic.", icon: "BookOpen", criteria: "topics_completed>=1" },
  problemCrusher: { name: "Problem Crusher", description: "Solved 25 coding problems.", icon: "Zap", criteria: "problems_solved>=25" },
  codeMaster: { name: "Code Master", description: "Solved 50 coding problems.", icon: "Code2", criteria: "problems_solved>=50" },
  streak14: { name: "Fortnight Focus", description: "Stayed active 14 days in a row.", icon: "CalendarCheck", criteria: "streak>=14" },
  interviewPro: { name: "Interview Pro", description: "Completed 5 mock interviews.", icon: "MessagesSquare", criteria: "interviews_completed>=5" },
  knowledgeSeeker: { name: "Knowledge Seeker", description: "Completed 10 learning-track topics.", icon: "GraduationCap", criteria: "topics_completed>=10" },
  contestEntrant: { name: "Contest Entrant", description: "Registered for your first contest.", icon: "Flag", criteria: "contests_registered>=1" },
  communityVoice: { name: "Community Voice", description: "Posted in the community discussions.", icon: "MessageCircle", criteria: "discussion_posts>=1" },
  risingStar: { name: "Rising Star", description: "Reached level 5.", icon: "Star", criteria: "level>=5" },
  xpHunter: { name: "XP Hunter", description: "Earned 1,000 XP.", icon: "Gem", criteria: "xp>=1000" },
  sharpshooter: { name: "Sharpshooter", description: "Solved 5 problems with at least 80% accuracy.", icon: "Crosshair", criteria: "problems_solved>=5&accuracy>=80" },
} satisfies Record<string, BadgeDefinition>;

/** Awards any milestone badges the user has earned but not yet received (idempotent). */
export async function awardEarnedBadges(db: Db, userId: string): Promise<void> {
  const [user, solved, interviews, topics, contests, threads, replies] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { streak: true, level: true, xp: true, accuracy: true, badges: { select: { name: true } } } }),
    db.problem.count({ where: { solvedByUsers: { some: { id: userId } } } }),
    db.mockInterview.count({ where: { userId, status: "Completed" } }),
    db.topicCompletion.count({ where: { userId } }),
    db.contestRegistration.count({ where: { userId } }),
    db.discussionThread.count({ where: { userId } }),
    db.reply.count({ where: { userId } }),
  ]);
  if (!user) return;
  const owned = new Set(user.badges.map((b) => b.name));
  const earned: BadgeDefinition[] = [];
  if (solved >= 1) earned.push(BADGES.firstSolve);
  if (solved >= 10) earned.push(BADGES.problemSolver);
  if (user.streak >= 7) earned.push(BADGES.streak7);
  if (interviews >= 1) earned.push(BADGES.interviewReady);
  if (topics >= 1) earned.push(BADGES.learner);
  if (solved >= 25) earned.push(BADGES.problemCrusher);
  if (solved >= 50) earned.push(BADGES.codeMaster);
  if (user.streak >= 14) earned.push(BADGES.streak14);
  if (interviews >= 5) earned.push(BADGES.interviewPro);
  if (topics >= 10) earned.push(BADGES.knowledgeSeeker);
  if (contests >= 1) earned.push(BADGES.contestEntrant);
  if (threads + replies >= 1) earned.push(BADGES.communityVoice);
  if (user.level >= 5) earned.push(BADGES.risingStar);
  if (user.xp >= 1000) earned.push(BADGES.xpHunter);
  if (solved >= 5 && user.accuracy >= 80) earned.push(BADGES.sharpshooter);
  for (const badge of earned) {
    if (owned.has(badge.name)) continue;
    await db.badge.upsert({
      where: { userId_name: { userId, name: badge.name } },
      update: {},
      create: { ...badge, userId },
    });
  }
}
