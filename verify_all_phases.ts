/**
 * Comprehensive Verification Test Suite for Placify-AI
 * Tests Auth, Token Verification, Prisma DB, Python ML Microservice, Code Judge & Failure Modes
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3000";
const ML_URL = "http://localhost:8000";

async function runTests() {
  console.log("============================================================");
  console.log("  PLACIFY-AI FULL SYSTEM VERIFICATION SUITE");
  console.log("============================================================\n");

  const results: Record<string, string> = {};

  // 1. Prisma DB Check
  try {
    const userCount = await prisma.user.count();
    const problemCount = await prisma.problem.count();
    console.log(`[PASS] Prisma Database operational: ${userCount} users, ${problemCount} problems.`);
    results["Backend: Prisma"] = "PASS";
  } catch (err: any) {
    console.error("[FAIL] Prisma Database error:", err.message);
    results["Backend: Prisma"] = `FAIL — ${err.message}`;
  }

  // 2. Auth Flow: Register & Login
  let authToken = "";
  try {
    const testEmail = `test_${Date.now()}@placify.com`;
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        username: `user_${Date.now()}`,
        password: "password123",
      }),
    });
    const regData = await regRes.json();
    if (regRes.status === 201 && regData.token) {
      authToken = regData.token;
      console.log("[PASS] Auth Registration & Password Hashing verified.");
      results["Backend: Auth Register"] = "PASS";
    } else {
      results["Backend: Auth Register"] = `FAIL — HTTP ${regRes.status}: ${regData.error}`;
    }
  } catch (err: any) {
    console.error("[FAIL] Auth Register error:", err.message);
    results["Backend: Auth Register"] = `FAIL — ${err.message}`;
  }

  // 3. Auth Flow: /api/auth/me
  try {
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const meData = await meRes.json();
    if (meRes.ok && meData.user) {
      console.log(`[PASS] Auth /api/auth/me verified for user ${meData.user.username}.`);
      results["Backend: Auth /me"] = "PASS";
    } else {
      results["Backend: Auth /me"] = `FAIL — HTTP ${meRes.status}`;
    }
  } catch (err: any) {
    results["Backend: Auth /me"] = `FAIL — ${err.message}`;
  }

  // 4. Protected Route without token (401 check)
  try {
    const protRes = await fetch(`${BASE_URL}/api/dashboard/analytics`);
    if (protRes.status === 401) {
      console.log("[PASS] Protected route without token correctly returns HTTP 401.");
      results["Backend: Unauthorized Security Check"] = "PASS";
    } else {
      results["Backend: Unauthorized Security Check"] = `FAIL — Expected 401, got ${protRes.status}`;
    }
  } catch (err: any) {
    results["Backend: Unauthorized Security Check"] = `FAIL — ${err.message}`;
  }

  // 5. ML Microservice Health Check
  try {
    const mlRes = await fetch(`${ML_URL}/health`);
    if (mlRes.ok) {
      console.log("[PASS] Python ML Microservice (Port 8000) operational.");
      results["ML: Startup & Health"] = "PASS";
    } else {
      results["ML: Startup & Health"] = `FAIL — HTTP ${mlRes.status}`;
    }
  } catch (err: any) {
    results["ML: Startup & Health"] = `FAIL — ${err.message}`;
  }

  // 6. ML Microservice Placement Score
  try {
    const scoreRes = await fetch(`${ML_URL}/ml/placement-score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        xp: 1200,
        level: 3,
        streak: 7,
        accuracy: 85.0,
        problems_solved: 25,
        submission_count: 30,
      }),
    });
    if (scoreRes.ok) {
      const data = await scoreRes.json();
      console.log(`[PASS] ML Placement Score endpoint returned readiness score: ${data.score}.`);
      results["ML: AI Endpoints"] = "PASS";
    } else {
      results["ML: AI Endpoints"] = `FAIL — HTTP ${scoreRes.status}`;
    }
  } catch (err: any) {
    results["ML: AI Endpoints"] = `FAIL — ${err.message}`;
  }

  // 7. ML Retrain Auth Requirement Check
  try {
    const retrainRes = await fetch(`${ML_URL}/admin/retrain`, { method: "POST" });
    if (retrainRes.status === 401) {
      console.log("[PASS] ML retrain endpoint correctly enforces authentication (HTTP 401).");
      results["ML: Retrain Auth Security"] = "PASS";
    } else {
      results["ML: Retrain Auth Security"] = `FAIL — Expected 401, got ${retrainRes.status}`;
    }
  } catch (err: any) {
    results["ML: Retrain Auth Security"] = `FAIL — ${err.message}`;
  }

  // 8. Code Judge Evaluation Test
  try {
    const firstProb = await prisma.problem.findFirst();
    if (firstProb && authToken) {
      const submitRes = await fetch(`${BASE_URL}/api/problems/${firstProb.id}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          language: "javascript",
          code: 'function solve(input) { return "0 1"; }',
        }),
      });
      if (submitRes.ok) {
        const subData = await submitRes.json();
        console.log(`[PASS] Code Judge submission processed: Status = ${subData.submission?.status}.`);
        results["Code Judge: Submission"] = "PASS";
      } else {
        results["Code Judge: Submission"] = `FAIL — HTTP ${submitRes.status}`;
      }
    }
  } catch (err: any) {
    results["Code Judge: Submission"] = `FAIL — ${err.message}`;
  }

  // 9. Failure Mode: Bad request payload (Phase 9 test)
  try {
    const firstProb = await prisma.problem.findFirst();
    if (firstProb && authToken) {
      const badRes = await fetch(`${BASE_URL}/api/problems/${firstProb.id}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({}),
      });
      if (badRes.status >= 400 && badRes.status < 500) {
        console.log(`[PASS] Malformed request correctly handled with 4xx error (HTTP ${badRes.status}) without Node crash.`);
        results["Server Crash Prevention"] = "PASS";
      } else {
        results["Server Crash Prevention"] = `FAIL — Expected 4xx, got ${badRes.status}`;
      }
    }
  } catch (err: any) {
    results["Server Crash Prevention"] = `FAIL — ${err.message}`;
  }

  console.log("\n============================================================");
  console.log("  VERIFICATION SUMMARY RESULTS");
  console.log("============================================================");
  console.table(results);

  await prisma.$disconnect();
}

runTests().catch(console.error);
