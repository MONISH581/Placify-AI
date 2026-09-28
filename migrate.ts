import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DB_FILE = path.join(process.cwd(), "server-db.json");

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  if (!fs.existsSync(DB_FILE)) {
    console.log("No server-db.json found to migrate.");
    return;
  }

  const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  console.log("Migrating data...");

  // Migrate Users
  const defaultPassHash = hashPassword("password123");
  for (const user of data.users || []) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        password: user.password ? hashPassword(user.password) : defaultPassHash,
      },
      create: {
        id: user.id,
        email: user.email,
        username: user.username,
        password: user.password ? hashPassword(user.password) : defaultPassHash,
        isAdmin: user.isAdmin || false,
        xp: user.xp || 0,
        level: user.level || 1,
        streak: user.streak || 0,
        lastActiveDate: user.lastActiveDate || "2026-01-01",
        accuracy: user.accuracy || 0,
        verified: user.verified || false,
      },
    });
  }
  console.log("Users migrated.");

  // Migrate Problems
  for (const prob of data.problems || []) {
    await prisma.problem.upsert({
      where: { id: prob.id },
      update: {},
      create: {
        id: prob.id,
        title: prob.title,
        difficulty: prob.difficulty,
        description: prob.description,
        constraints: prob.constraints || "None",
        inputFormat: prob.inputFormat || "",
        outputFormat: prob.outputFormat || "",
        editorial: prob.editorial || "",
        tags: JSON.stringify(prob.tags || []),
        examples: JSON.stringify(prob.examples || []),
        testCases: JSON.stringify(prob.testCases || []),
        hints: JSON.stringify(prob.hints || []),
      },
    });
  }
  console.log("Problems migrated.");

  // Migrate Submissions
  for (const sub of data.submissions || []) {
    await prisma.submission.upsert({
      where: { id: sub.id },
      update: {},
      create: {
        id: sub.id,
        language: sub.language,
        code: sub.code,
        status: sub.status,
        timeComplexity: sub.timeComplexity || "O(1)",
        memoryUsage: sub.memoryUsage || "10MB",
        errorMessage: sub.errorMessage || "",
        submittedAt: sub.submittedAt || new Date().toISOString(),
        xpEarned: sub.xpEarned || 0,
        aiReview: sub.aiReview || "",
        userId: sub.userId,
        problemId: sub.problemId,
      },
    });
  }
  console.log("Submissions migrated.");

  // Migrate Roadmaps
  for (const roadmap of data.roadmaps || []) {
    await prisma.roadmap.upsert({
      where: { id: roadmap.id },
      update: {},
      create: {
        id: roadmap.id || "roadmap-" + Date.now(),
        currentYear: roadmap.currentYear,
        skills: roadmap.skills,
        targetCompany: roadmap.targetCompany,
        targetRole: roadmap.targetRole,
        generatedAt: roadmap.generatedAt || new Date().toISOString(),
        dailyPlan: JSON.stringify(roadmap.dailyPlan || []),
        weeklyPlan: JSON.stringify(roadmap.weeklyPlan || []),
        monthlyPlan: JSON.stringify(roadmap.monthlyPlan || []),
        userId: roadmap.userId,
      },
    });
  }
  console.log("Roadmaps migrated.");

  // Migrate Discussions
  for (const disc of data.discussions || []) {
    let userId = disc.userId;
    const userExists = await prisma.user.findUnique({ where: { id: userId } });
    if (!userExists) {
      userId = "std-1";
    }
    await prisma.discussionThread.upsert({
      where: { id: disc.id },
      update: {},
      create: {
        id: disc.id,
        title: disc.title,
        content: disc.content,
        username: disc.username,
        category: disc.category,
        likes: disc.likes || 0,
        createdAt: disc.createdAt || new Date().toISOString(),
        likedBy: JSON.stringify(disc.likedBy || []),
        userId: userId,
      },
    });
    
    // Replies
    for (const reply of disc.replies || []) {
      await prisma.reply.upsert({
        where: { id: reply.id },
        update: {},
        create: {
          id: reply.id,
          username: reply.username,
          content: reply.content,
          createdAt: reply.createdAt || new Date().toISOString(),
          threadId: disc.id,
        }
      });
    }
  }
  console.log("Discussions migrated.");

  console.log("Migration complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
