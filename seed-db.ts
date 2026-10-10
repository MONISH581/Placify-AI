/**
 * Idempotent database seed (run with `npm run seed`, also called by `npm run setup`).
 *
 * - Upserts the curated problem bank (server/data/problemBank.ts) and removes legacy placeholder problems.
 * - Outside production: upserts the demo accounts, sample submissions, a contest and discussion threads.
 *
 * Writes directly through Prisma to the database in DATABASE_URL (default prisma/dev.db).
 */

import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PROBLEM_BANK, STARTER_CODE } from "./server/data/problemBank";
import { hashPassword } from "./server/passwords";

dotenv.config({ quiet: true });
if (!process.env.DATABASE_URL) process.env.DATABASE_URL = "file:./dev.db";

const prisma = new PrismaClient();
const isProduction = process.env.NODE_ENV === "production";

const DEMO_ACCOUNTS = {
  student: { email: "student@placify.com", username: "student", password: "student123" },
  admin: { email: "admin@placify.com", username: "admin", password: "admin123" },
};

function daysAgo(days: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

async function seedProblems() {
  // Legacy placeholder problems ("Sample Easy ARRAYS", ...) from older seeds are removed; submissions cascade.
  const removed = await prisma.problem.deleteMany({ where: { title: { startsWith: "Sample " }, id: { startsWith: "prob-" } } });
  if (removed.count) console.log(`[seed] removed ${removed.count} placeholder problems`);

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

async function seedDemoData() {
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
    const problem = byId.get(s.problemId)!;
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
      startTime: daysAgo(-3).toISOString(),
      durationMinutes: 90,
      problems: ["prob-arrays-two-sum", "prob-hashing-longest-consecutive-sequence", "prob-stacks-largest-rectangle-in-histogram"],
    },
    {
      id: "contest-2",
      title: "Placify Trees & Queues Sprint",
      description: "Three tree and queue problems in 60 minutes - great practice for on-campus coding rounds.",
      startTime: daysAgo(-10).toISOString(),
      durationMinutes: 60,
      problems: ["prob-trees-invert-binary-tree", "prob-queues-design-circular-queue", "prob-trees-binary-tree-level-order-traversal"],
    },
  ];
  for (const c of contests) {
    const missing = c.problems.filter((id) => !byId.has(id));
    if (missing.length) throw new Error(`Contest ${c.id} references unknown problems: ${missing.join(", ")}`);
    const data = { title: c.title, description: c.description, durationMinutes: c.durationMinutes, problems: JSON.stringify(c.problems) };
    await prisma.contest.upsert({ where: { id: c.id }, update: data, create: { id: c.id, startTime: c.startTime, ...data } });
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

async function main() {
  await seedProblems();
  if (isProduction) {
    console.log("[seed] NODE_ENV=production: skipping demo accounts and sample data");
  } else {
    await seedDemoData();
  }
}

main()
  .catch((err) => {
    if (err && typeof err === "object" && "code" in err && err.code === "P2021") {
      console.error("[seed] failed: the database schema is missing. Run `npm run setup` (or `npx prisma db push`) first.");
    } else {
      console.error("[seed] failed:", err);
    }
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
