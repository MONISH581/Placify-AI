/**
 * resilience_test.ts
 * Tests negative edge cases, empty bodies, unknown IDs, and graceful degradation.
 */

const BASE_URL = "http://localhost:3000";

let passed = 0;
let total = 0;

function check(name: string, condition: boolean, detail: string = "") {
  total++;
  if (condition) {
    console.log(`[PASS] [${total}] ${name} ${detail}`);
    passed++;
  } else {
    console.log(`[FAIL] [${total}] ${name} ${detail}`);
  }
}

async function testResilience() {
  console.log("============================================================");
  console.log("RESILIENCE & GRACEFUL ERROR HANDLING (PHASE 13)");
  console.log("============================================================");

  // 1. Unknown Problem ID
  try {
    const res = await fetch(`${BASE_URL}/api/problems/non_existent_problem_xyz/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "code", language: "javascript" })
    });
    check("Unknown Problem ID -> 404", res.status === 404, `(HTTP ${res.status})`);
  } catch (e: any) {
    check("Unknown Problem ID -> 404", false, e.message);
  }

  // 2. Empty code submission
  try {
    const probRes = await fetch(`${BASE_URL}/api/problems`);
    const probs = await probRes.json();
    const pid = probs[0].id;
    const res = await fetch(`${BASE_URL}/api/problems/${pid}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "", language: "javascript" })
    });
    const data = await res.json();
    check("Empty Code Submission Rejection", data.success === false, `(success=${data.success})`);
  } catch (e: any) {
    check("Empty Code Submission Rejection", false, e.message);
  }

  // 3. Unknown Interview ID
  try {
    const res = await fetch(`${BASE_URL}/api/mock-interview/unknown-interview-999/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer: "test answer" })
    });
    check("Unknown Interview ID -> 404", res.status === 404, `(HTTP ${res.status})`);
  } catch (e: any) {
    check("Unknown Interview ID -> 404", false, e.message);
  }

  // 4. Missing required prompt in Mentor Ask
  try {
    const res = await fetch(`${BASE_URL}/api/mentor/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    check("Empty Mentor Prompt -> 400", res.status === 400, `(HTTP ${res.status})`);
  } catch (e: any) {
    check("Empty Mentor Prompt -> 400", false, e.message);
  }

  // 5. Dashboard analytics with unknown user -> 404
  try {
    const res = await fetch(`${BASE_URL}/api/dashboard/analytics/completely_unknown_user_999`);
    check("Unknown User Dashboard -> 404", res.status === 404, `(HTTP ${res.status})`);
  } catch (e: any) {
    check("Unknown User Dashboard -> 404", false, e.message);
  }

  // 6. Invalid Discussion Thread Creation (Missing title/content)
  try {
    const res = await fetch(`${BASE_URL}/api/discussions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "" })
    });
    check("Empty Discussion Rejection -> 400", res.status === 400, `(HTTP ${res.status})`);
  } catch (e: any) {
    check("Empty Discussion Rejection -> 400", false, e.message);
  }

  console.log("============================================================");
  console.log(`RESILIENCE TEST SUMMARY: ${passed}/${total} Passed`);
  console.log("============================================================");

  if (passed < total) process.exit(1);
}

testResilience().catch(err => {
  console.error("Fatal resilience test error:", err);
  process.exit(1);
});
