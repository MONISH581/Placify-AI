import fs from "fs";

async function runTests() {
  console.log("==========================================");
  console.log("PLACIFY INTEGRATION TEST SUITE");
  console.log("==========================================\n");

  const baseUrl = "http://localhost:3000";
  let passed = 0;
  let failed = 0;
  let user: any = null;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.log(`[FAIL] ${name}`);
      console.error("   ->", err.message);
      failed++;
    }
  }

  // 1. Auth Login
  await test("Auth Login", async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "monishsai581@gmail.com", password: "any" })
    });
    if (!res.ok) throw new Error("Login API failed");
    const data = await res.json();
    if (!data.success || !data.user) throw new Error("Invalid login response");
    user = data.user;
  });

  // 2. Dashboard Analytics
  await test("Dashboard Analytics", async () => {
    if (!user) throw new Error("No user context");
    const res = await fetch(`${baseUrl}/api/dashboard/analytics/${user.id}`);
    if (!res.ok) throw new Error(`Dashboard API returned ${res.status}`);
    const data = await res.json();
    if (!data.readiness || !data.recommendation) throw new Error("Missing AI insights");
  });

  // 3. Problem List
  let problemId = "prob-1";
  await test("Problem Listing", async () => {
    const res = await fetch(`${baseUrl}/api/problems`);
    if (!res.ok) throw new Error("Problems API failed");
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error("No problems returned");
    problemId = data[0].id;
  });

  // 4. Submit Code (Correct)
  await test("Code Submission (Correct)", async () => {
    const code = `function solve(input) {\n  // 0 1\n  // 1 2\n  return "0 1";\n}`;
    const res = await fetch(`${baseUrl}/api/problems/${problemId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
        language: "javascript",
        code,
        isSubmission: true
      })
    });
    if (!res.ok) throw new Error(`Submit API failed: ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error("Submission was not accepted when it should be");
  });

  // 5. Submit Code (Wrong)
  await test("Code Submission (Wrong)", async () => {
    const code = `function solve(input) {\n  return "wrong";\n}`;
    const res = await fetch(`${baseUrl}/api/problems/${problemId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
        language: "javascript",
        code,
        isSubmission: true
      })
    });
    const data = await res.json();
    if (data.success) throw new Error("Submission was accepted but it was wrong code");
  });

  // 6. AI Mentor Chat Proxy
  await test("AI Mentor Chat Proxy", async () => {
    const res = await fetch(`${baseUrl}/api/mentor/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "Explain arrays.",
        chatHistory: [],
        userId: user.id
      })
    });
    
    // Note: I changed the proxy in server.ts to route from /api/mentor/ask to /api/ai/mentor
    // Wait, let's verify if server.ts endpoint for the proxy itself was changed or just the fetch inside it.
    // In previous steps, I changed the `fetch` inside `app.post("/api/mentor/ask")`.
    // So the frontend still calls `/api/mentor/ask`.
    if (!res.ok) throw new Error(`Mentor API failed: ${res.status}`);
  });

  console.log("\n==========================================");
  console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log("==========================================");
}

runTests().catch(console.error);
