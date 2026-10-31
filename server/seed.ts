/**
 * Database seed helper:
 *   - seedProblems: upserts the curated problem bank into SQLite via Prisma
 *   - seedDemoData: creates/updates demo accounts, submissions, contests and discussions
 *   - seedDatabase: runs both (demo data included outside production or when User table is empty)
 */

import { type PrismaClient } from "@prisma/client";
import { PROBLEM_BANK, STARTER_CODE } from "./data/problemBank";
import { hashPassword } from "./passwords";

export const DEMO_ACCOUNTS = {
  student: { email: "student@placify.com", username: "student", password: "student123" },
  admin: { email: "admin@placify.com", username: "admin", password: "admin123" },
};

function daysAgo(days: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

function hoursFromNow(hours: number): Date {
  return new Date(Date.now() + hours * 3_600_000);
}

export async function seedProblems(prisma: PrismaClient) {
  try {
    const removed = await prisma.problem.deleteMany({
      where: { title: { startsWith: "Sample " }, id: { startsWith: "prob-" } },
    });
    if (removed.count) console.log(`[seed] removed ${removed.count} placeholder problems`);
  } catch {
    /* ignore */
  }

  for (const p of PROBLEM_BANK) {
    const data = {
      title: p.title,
      difficulty: p.difficulty,
      description: p.description,
      constraints: p.constraints,
      inputFormat: p.inputFormat,
      outputFormat: p.outputFormat,
      editorial: p.editorial,
      tags: JSON.stringify(p.tags),
      examples: JSON.stringify(p.examples),
      testCases: JSON.stringify(p.testCases),
      hints: JSON.stringify(p.hints),
      starterCode: JSON.stringify(STARTER_CODE),
      solutions: JSON.stringify(p.solutions),
    };
    await prisma.problem.upsert({ where: { id: p.id }, update: data, create: { id: p.id, ...data } });
  }
  console.log(`[seed] upserted ${PROBLEM_BANK.length} problems`);
}

export async function seedDemoData(prisma: PrismaClient) {
  const today = new Date().toISOString().slice(0, 10);

  const student = await prisma.user.upsert({
    where: { email: DEMO_ACCOUNTS.student.email },
    update: { password: await hashPassword(DEMO_ACCOUNTS.student.password), isAdmin: false },
    create: {
      email: DEMO_ACCOUNTS.student.email,
      username: DEMO_ACCOUNTS.student.username,
      password: await hashPassword(DEMO_ACCOUNTS.student.password),
      isAdmin: false,
      xp: 40,
      level: 1,
      streak: 1,
      lastActiveDate: today,
      accuracy: 67,
      verified: true,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: DEMO_ACCOUNTS.admin.email },
    update: { password: await hashPassword(DEMO_ACCOUNTS.admin.password), isAdmin: true },
    create: {
      email: DEMO_ACCOUNTS.admin.email,
      username: DEMO_ACCOUNTS.admin.username,
      password: await hashPassword(DEMO_ACCOUNTS.admin.password),
      isAdmin: true,
      xp: 0,
      level: 1,
      streak: 1,
      lastActiveDate: today,
      accuracy: 0,
      verified: true,
    },
  });

  console.log(`[seed] demo accounts: ${student.email} / ${DEMO_ACCOUNTS.student.password}, ${admin.email} / ${DEMO_ACCOUNTS.admin.password}`);

  const byId = new Map(PROBLEM_BANK.map((p) => [p.id, p]));
  const sampleSubmissions = [
    { id: "seed-sub-1", problemId: "prob-arrays-two-sum", status: "Accepted", xpEarned: 20, days: 2 },
    { id: "seed-sub-2", problemId: "prob-arrays-3sum", status: "Wrong Answer", xpEarned: 0, days: 1 },
    { id: "seed-sub-3", problemId: "prob-stacks-valid-parentheses", status: "Accepted", xpEarned: 20, days: 0 },
  ];
  for (const s of sampleSubmissions) {
    const problem = byId.get(s.problemId);
    if (!problem) continue;
    const accepted = s.status === "Accepted";
    await prisma.submission.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        userId: student.id,
        problemId: s.problemId,
        language: "javascript",
        code: accepted ? problem.solutions.javascript : STARTER_CODE.javascript,
        status: s.status,
        errorMessage: accepted ? null : "Wrong Answer on test case 1.",
        submittedAt: daysAgo(s.days).toISOString(),
        xpEarned: s.xpEarned,
        aiReview: null,
      },
    });
    if (accepted) {
      await prisma.user.update({ where: { id: student.id }, data: { problemsSolved: { connect: { id: s.problemId } } } });
    }
  }

  await prisma.badge.upsert({
    where: { userId_name: { userId: student.id, name: "First Solve" } },
    update: {},
    create: { userId: student.id, name: "First Solve", description: "Solved your first coding problem.", icon: "Award", criteria: "problems_solved>=1" },
  });

  const contests = [
    {
      id: "contest-1",
      title: "Placify Weekly Challenge #1",
      description: "A 90-minute contest covering arrays, hashing and stacks. Solve as many problems as you can.",
      startTime: hoursFromNow(72).toISOString(),
      durationMinutes: 90,
      problems: ["prob-arrays-two-sum", "prob-hashing-longest-consecutive-sequence", "prob-stacks-largest-rectangle-in-histogram"],
    },
    {
      id: "contest-2",
      title: "Placify Trees & Queues Sprint",
      description: "Three tree and queue problems in 60 minutes - great practice for on-campus coding rounds.",
      startTime: hoursFromNow(-240).toISOString(),
      durationMinutes: 60,
      problems: ["prob-trees-invert-binary-tree", "prob-queues-design-circular-queue", "prob-trees-binary-tree-level-order-traversal"],
    },
    {
      id: "contest-3",
      title: "Placify Hashing Blitz",
      description: "A 3-hour open contest on hashing and arrays. It is running now, so jump in any time before it closes.",
      startTime: hoursFromNow(-1).toISOString(),
      durationMinutes: 180,
      problems: ["prob-arrays-two-sum", "prob-hashing-longest-consecutive-sequence", "prob-stacks-largest-rectangle-in-histogram"],
    },
  ];
  for (const c of contests) {
    const data = { title: c.title, description: c.description, durationMinutes: c.durationMinutes, problems: JSON.stringify(c.problems) };
    await prisma.contest.upsert({ where: { id: c.id }, update: { ...data, startTime: c.startTime }, create: { id: c.id, startTime: c.startTime, ...data } });
  }

  const threads = [
    {
      id: "seed-disc-1",
      title: "How I prepared for my first technical interview",
      content:
        "I focused on arrays, hashing and trees for three weeks, solving two problems a day and explaining each solution out loud. Mock interviews helped me get comfortable thinking aloud. What worked for you?",
      category: "Interview Experience",
      createdAt: daysAgo(2).toISOString(),
    },
    {
      id: "seed-disc-2",
      title: "Two pointers vs hash map for Two Sum?",
      content: "The hash map solution is O(n) but uses extra memory. When would you prefer sorting + two pointers instead?",
      category: "DSA",
      createdAt: daysAgo(1).toISOString(),
    },
  ];
  for (const t of threads) {
    await prisma.discussionThread.upsert({
      where: { id: t.id },
      update: {},
      create: { ...t, userId: student.id, username: student.username, likes: 0, likedBy: "[]" },
    });
  }

  await prisma.reply.upsert({
    where: { id: "seed-reply-1" },
    update: {},
    create: {
      id: "seed-reply-1",
      threadId: "seed-disc-2",
      userId: admin.id,
      username: admin.username,
      content: "Sorting + two pointers wins when you need O(1) extra space or the array is already sorted - but you lose the original indices.",
      createdAt: daysAgo(0).toISOString(),
    },
  });

  console.log("[seed] demo submissions, contests and discussions ready");
}

export async function seedDatabase(prisma: PrismaClient) {
  await seedProblems(prisma);
  const isProduction = process.env.NODE_ENV === "production";
  let userCount = 0;
  try {
    userCount = await prisma.user.count();
  } catch {
    /* table may not exist yet */
  }
  const shouldSeedDemo = !isProduction || process.env.SEED_DEMO_DATA === "true" || userCount === 0;
  if (shouldSeedDemo) {
    await seedDemoData(prisma);
  } else {
    console.log("[seed] NODE_ENV=production: skipping demo accounts (set SEED_DEMO_DATA=true to include them)");
  }
}
