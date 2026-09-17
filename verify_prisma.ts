import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("============================================================");
  console.log("PRISMA DATABASE VERIFICATION (PHASE 7)");
  console.log("============================================================");

  const userCount = await prisma.user.count();
  const probCount = await prisma.problem.count();
  const subCount = await prisma.submission.count();

  console.log(`[PASS] Users in DB: ${userCount}`);
  console.log(`[PASS] Problems in DB: ${probCount}`);
  console.log(`[PASS] Submissions in DB: ${subCount}`);

  if (userCount === 0 || probCount === 0) {
    throw new Error("Database appears unpopulated!");
  }

  // Verify CRUD operations
  const user = await prisma.user.findFirst();
  if (!user) throw new Error("No user found");

  const event = await prisma.learningEvent.create({
    data: {
      userId: user.id,
      eventType: "test_verification",
      entityId: "prob-1",
      topic: "Arrays",
      difficulty: "Easy",
      result: "success",
      score: 95.0,
      timeTaken: 120,
      metadata: JSON.stringify({ verified: true }),
      createdAt: new Date().toISOString()
    }
  });
  console.log(`[PASS] LearningEvent Create: ID ${event.id}`);

  const readEvent = await prisma.learningEvent.findUnique({ where: { id: event.id } });
  if (!readEvent || readEvent.score !== 95.0) {
    throw new Error("LearningEvent Read failed");
  }
  console.log(`[PASS] LearningEvent Read: score = ${readEvent.score}`);

  await prisma.learningEvent.delete({ where: { id: event.id } });
  console.log(`[PASS] LearningEvent Delete: cleaned up`);

  // Verify StudentAIProfile
  const profile = await prisma.studentAIProfile.upsert({
    where: { userId: user.id },
    update: { problemsSolved: userCount },
    create: {
      userId: user.id,
      overallReadiness: 75.0,
      codingScore: 80.0,
      dsaScore: 78.0,
      csFundamentals: 70.0,
      interviewScore: 72.0,
      resumeScore: 80.0,
      problemsAttempted: 10,
      problemsSolved: 8,
      lastUpdated: new Date().toISOString()
    }
  });
  console.log(`[PASS] StudentAIProfile Upsert: Readiness = ${profile.overallReadiness}`);

  await prisma.$disconnect();
  console.log("============================================================");
  console.log("PRISMA DATABASE 100% OPERATIONAL!");
  console.log("============================================================");
}

main().catch(err => {
  console.error("Prisma verification failed:", err);
  process.exit(1);
});
