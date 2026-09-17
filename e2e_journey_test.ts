/**
 * e2e_journey_test.ts
 * End-to-End Validation covering all 5 user journeys and Express-FastAPI bridge.
 */

const BASE_URL = "http://localhost:3000";

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`[FAIL] ${name}`);
    console.error("   Error:", err.message);
    failed++;
  }
}

async function main() {
  console.log("============================================================");
  console.log("PLACIFY-AI MASTER E2E & BRIDGE VALIDATION (PHASES 6, 8, 9, 10)");
  console.log("============================================================\n");

  let authUser: any = null;

  // ── PART 1: AUTHENTICATION FLOW (PHASE 9) ──────────────────────────────────
  console.log("--- PART 1: AUTHENTICATION FLOW (PHASE 9) ---");

  // 1. Register
  const testUsername = `student_${Date.now()}`;
  const testEmail = `${testUsername}@example.com`;
  await test("Auth - Registration Flow", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        username: testUsername,
        password: "password123"
      })
    });
    if (!res.ok) throw new Error(`Register failed with status ${res.status}`);
    const data = await res.json();
    if (!data.success || !data.user) throw new Error("Invalid registration response");
    authUser = data.user;
  });

  // 2. Valid Login
  await test("Auth - Valid Login Flow", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: "password123"
      })
    });
    if (!res.ok) throw new Error(`Login failed with status ${res.status}`);
    const data = await res.json();
    if (!data.success || !data.user || data.user.id !== authUser.id) {
      throw new Error("Login failed to return expected user");
    }
  });

  // 3. Invalid Login
  await test("Auth - Invalid Credentials Rejection", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "nonexistent_user@invalid.com",
        password: "wrongpassword"
      })
    });
    if (res.status !== 401) throw new Error(`Expected HTTP 401, got ${res.status}`);
  });

  // ── PART 2: NODE/EXPRESS → FASTAPI PROXY BRIDGE (PHASE 6) ──────────────────
  console.log("\n--- PART 2: NODE/EXPRESS → FASTAPI PROXY BRIDGE (PHASE 6) ---");

  // Canonical Placement Proxy
  await test("Bridge - POST /api/predict/placement", async () => {
    const res = await fetch(`${BASE_URL}/api/predict/placement`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        xp: 1500,
        level: 3,
        streak: 10,
        accuracy: 75.0,
        problems_solved: 25,
        submission_count: 35
      })
    });
    if (!res.ok) throw new Error(`Bridge returned ${res.status}`);
    const data = await res.json();
    if (data.score === undefined || typeof data.placement_ready !== "boolean") {
      throw new Error("Invalid placement schema from bridge");
    }
  });

  // Canonical Difficulty Proxy
  await test("Bridge - POST /api/predict/difficulty", async () => {
    const res = await fetch(`${BASE_URL}/api/predict/difficulty`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Merge Intervals",
        description: "Merge all overlapping intervals",
        tags: ["intervals", "sorting"]
      })
    });
    if (!res.ok) throw new Error(`Bridge returned ${res.status}`);
    const data = await res.json();
    if (!data.difficulty || !["Easy", "Medium", "Hard"].includes(data.difficulty)) {
      throw new Error("Invalid difficulty classification from bridge");
    }
  });

  // Canonical Problem Recommendations Proxy
  await test("Bridge - POST /api/recommend/problems", async () => {
    const res = await fetch(`${BASE_URL}/api/recommend/problems`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        solved_ids: ["prob-1"],
        top_n: 4
      })
    });
    if (!res.ok) throw new Error(`Bridge returned ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.recommendations) || data.recommendations.length === 0) {
      throw new Error("No problem recommendations returned from bridge");
    }
  });

  // Canonical Interview Scoring Proxy
  await test("Bridge - POST /api/evaluate/interview", async () => {
    const res = await fetch(`${BASE_URL}/api/evaluate/interview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: "What is dynamic programming?",
        answer: "Dynamic programming solves problems by breaking them into overlapping subproblems and caching results."
      })
    });
    if (!res.ok) throw new Error(`Bridge returned ${res.status}`);
    const data = await res.json();
    if (data.score === undefined || !data.feedback) {
      throw new Error("Invalid interview scoring schema from bridge");
    }
  });

  // Canonical RAG Query Proxy
  await test("Bridge - POST /api/rag/query", async () => {
    const res = await fetch(`${BASE_URL}/api/rag/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: "How does the Python Global Interpreter Lock (GIL) affect multithreading?",
        top_k: 3
      })
    });
    if (!res.ok) throw new Error(`Bridge returned ${res.status}`);
    const data = await res.json();
    if (!data.answer || !Array.isArray(data.sources)) {
      throw new Error("Invalid RAG response from bridge");
    }
  });

  // Legacy Proxy Routes
  await test("Bridge - Legacy /api/ml/* and /api/rag/* Routes", async () => {
    const resPlacement = await fetch(`${BASE_URL}/api/ml/placement-score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ xp: 800, level: 2, streak: 5, accuracy: 60.0, problems_solved: 15, submission_count: 20 })
    });
    if (!resPlacement.ok) throw new Error("Legacy placement-score failed");

    const resRec = await fetch(`${BASE_URL}/api/ml/recommend-problems`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ solved_ids: [], top_n: 2 })
    });
    if (!resRec.ok) throw new Error("Legacy recommend-problems failed");

    const resDiff = await fetch(`${BASE_URL}/api/ml/difficulty-predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Reverse a linked list iteratively." })
    });
    if (!resDiff.ok) throw new Error("Legacy difficulty-predict failed");

    const resMentor = await fetch(`${BASE_URL}/api/rag/mentor-ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: "Explain binary trees.", top_k: 2 })
    });
    if (!resMentor.ok) throw new Error("Legacy mentor-ask failed");
  });

  // ── PART 3: COMPLETE 5 USER JOURNEYS (PHASE 10) ────────────────────────────
  console.log("\n--- PART 3: 5 REAL USER JOURNEYS (PHASE 10) ---");

  // FLOW 1: LOGIN
  await test("JOURNEY 1: User Login & Session Bootstrap", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: authUser.email, password: "password123" })
    });
    const data = await res.json();
    if (!data.success || !data.user) throw new Error("Login journey failed");
  });

  // FLOW 2: PLACEMENT DASHBOARD & READINESS
  await test("JOURNEY 2: Placement Readiness Analytics Calculation", async () => {
    const res = await fetch(`${BASE_URL}/api/dashboard/analytics/${authUser.id}`);
    if (!res.ok) throw new Error(`Dashboard API error ${res.status}`);
    const data = await res.json();
    if (!data.readiness || data.readiness.overall_readiness === undefined) {
      throw new Error("Missing ML readiness analytics in dashboard journey");
    }
  });

  // FLOW 3: CODING ARENA (RECOMMENDATION -> CODE -> SUBMISSION -> STATS)
  await test("JOURNEY 3: Coding Workflow (Select, Solve, Submit, Progress)", async () => {
    // 1. Get recommendation
    const recRes = await fetch(`${BASE_URL}/api/ai/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: authUser.id, solved_ids: [] })
    });
    if (!recRes.ok) throw new Error("Failed to get recommendation");

    // 2. Fetch problems and submit solution
    const probRes = await fetch(`${BASE_URL}/api/problems`);
    const problems = await probRes.json();
    if (!Array.isArray(problems) || problems.length === 0) throw new Error("No problems found");
    const problemId = problems[0].id;

    const code = `function solve(input) {\n  // 0 1\n  // 1 2\n  return "0 1";\n}`;
    const subRes = await fetch(`${BASE_URL}/api/problems/${problemId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: authUser.id,
        language: "javascript",
        code,
        isSubmission: true
      })
    });
    if (!subRes.ok) throw new Error(`Submission failed with status ${subRes.status}`);
    const subData = await subRes.json();
    if (!subData.submission || !subData.success) {
      throw new Error("Submission was not accepted");
    }

    // 3. Verify submission recorded
    const histRes = await fetch(`${BASE_URL}/api/submissions?userId=${authUser.id}`);
    const histData = await histRes.json();
    if (!Array.isArray(histData) || histData.length === 0) {
      throw new Error("Submission not found in user history");
    }
  });

  // FLOW 4: MOCK INTERVIEW (START -> QUESTION -> ANSWER -> ML EVALUATION -> FEEDBACK)
  await test("JOURNEY 4: Mock Interview Lifecycle & ML Evaluation", async () => {
    // 1. Start interview
    const startRes = await fetch(`${BASE_URL}/api/mock-interview/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "Technical", userId: authUser.id })
    });
    if (!startRes.ok) throw new Error("Mock interview start failed");
    const interview = await startRes.json();
    if (!interview.id || !interview.questions || interview.questions.length === 0) {
      throw new Error("Invalid interview session returned");
    }

    // 2. Submit answer to question 1
    const ansRes = await fetch(`${BASE_URL}/api/mock-interview/${interview.id}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answer: "Relational SQL databases use fixed schemas and ACID transactions for high consistency. NoSQL databases provide dynamic schemas, horizontal partitioning, and eventual consistency for high scale."
      })
    });
    if (!ansRes.ok) throw new Error("Interview answer submission failed");
    const updated = await ansRes.json();
    if (updated.scores.length === 0 || updated.feedback.length === 0) {
      throw new Error("Interview scoring did not record score/feedback");
    }
    const score = updated.scores[0];
    if (typeof score !== "number" || score < 0 || score > 100) {
      throw new Error(`Invalid interview score returned: ${score}`);
    }
  });

  // FLOW 5: RAG CAREER ASSISTANT
  await test("JOURNEY 5: RAG AI Career Mentor Retrieval & Response", async () => {
    const res = await fetch(`${BASE_URL}/api/mentor/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "What are the common algorithmic approaches to solve maximum subarray sum?",
        userId: authUser.id
      })
    });
    if (!res.ok) throw new Error(`Mentor query failed with status ${res.status}`);
    const data = await res.json();
    if (!data.text || data.text.length < 15) {
      throw new Error("Empty or invalid response from RAG Mentor");
    }
  });

  console.log("\n============================================================");
  console.log(`TOTAL E2E RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("============================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal E2E error:", err);
  process.exit(1);
});
