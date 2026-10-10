/**
 * End-to-end API tests (node:test, run with `npm test`).
 *
 * Creates a throw-away SQLite database in the OS temp dir, pushes the Prisma schema, seeds it, and starts
 * server.ts as a child process on a random port with CODE_RUNNER=local and an unreachable ML service
 * (so every ML fallback path is exercised). The server is always killed in `after`, even on failure.
 */

import assert from "node:assert/strict";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { hashPassword, verifyPassword } from "../server/passwords";

const ROOT = process.cwd();
const JWT_SECRET = crypto.randomBytes(32).toString("hex");
const INTERNAL_API_KEY = crypto.randomBytes(24).toString("hex");
const TWO_SUM = "prob-arrays-two-sum";

let tmpDir = "";
let baseUrl = "";
let server: ChildProcess | null = null;
let serverLog = "";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address() as net.AddressInfo;
      srv.close(() => resolve(port));
    });
  });
}

function runNode(args: string[], env: NodeJS.ProcessEnv, label: string) {
  const result = spawnSync(process.execPath, args, { cwd: ROOT, env, encoding: "utf8", timeout: 180_000 });
  if (result.status !== 0) {
    throw new Error(`${label} failed (exit ${result.status}):\n${result.stdout}\n${result.stderr}`);
  }
}

function killServer(): Promise<void> {
  const child = server;
  server = null;
  if (!child || child.exitCode !== null || !child.pid) return Promise.resolve();
  return new Promise((resolve) => {
    const done = setTimeout(resolve, 5000);
    child.once("exit", () => {
      clearTimeout(done);
      resolve();
    });
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      child.kill("SIGKILL");
    }
  });
}

interface ApiResponse<T = any> {
  status: number;
  body: T;
  headers: Headers;
}

async function api<T = any>(
  method: string,
  urlPath: string,
  options: { token?: string; body?: unknown; rawBody?: string; headers?: Record<string, string> } = {}
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = { ...(options.headers ?? {}) };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  let body: string | undefined;
  if (options.rawBody !== undefined) {
    body = options.rawBody;
    headers["Content-Type"] ??= "application/json";
  } else if (options.body !== undefined) {
    body = JSON.stringify(options.body);
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${baseUrl}${urlPath}`, { method, headers, body });
  const text = await res.text();
  let parsed: unknown = text;
  if ((res.headers.get("content-type") ?? "").includes("application/json")) parsed = JSON.parse(text);
  return { status: res.status, body: parsed as T, headers: res.headers };
}

async function login(identifier: string, password: string) {
  const res = await api("POST", "/api/auth/login", { body: { email: identifier, password } });
  assert.equal(res.status, 200, `login ${identifier}: ${JSON.stringify(res.body)}`);
  return res.body as { token: string; user: any };
}

let userCounter = 0;
async function registerUser(prefix = "user") {
  userCounter++;
  const username = `${prefix}${userCounter}_${crypto.randomBytes(3).toString("hex")}`;
  const res = await api("POST", "/api/auth/register", {
    body: { email: `${username}@example.com`, username, password: "secret123" },
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body as { token: string; user: any };
}

function submit(token: string, problemId: string, language: string, code: string, isSubmission: boolean) {
  return api("POST", `/api/problems/${problemId}/submit`, { token, body: { language, code, isSubmission } });
}

function assertPublicUser(user: any) {
  assert.ok(user && typeof user === "object", "user object expected");
  for (const key of ["id", "email", "username", "isAdmin", "xp", "level", "streak", "lastActiveDate", "accuracy", "verified"]) {
    assert.ok(key in user, `user.${key} missing`);
  }
  assert.ok(Array.isArray(user.problemsSolved), "user.problemsSolved must be an array");
  assert.ok(Array.isArray(user.badges), "user.badges must be an array");
  assert.ok(!("password" in user), "user must never include password");
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

before(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "placify-test-"));
  const dbFile = path.join(tmpDir, "test.db").replace(/\\/g, "/");
  const port = await freePort();
  const unusedMlPort = await freePort();
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: "test",
    DATABASE_URL: `file:${dbFile}`,
    HOST: "127.0.0.1",
    PORT: String(port),
    JWT_SECRET,
    INTERNAL_API_KEY,
    CODE_RUNNER: "local",
    ML_SERVICE_URL: `http://127.0.0.1:${unusedMlPort}`,
    GEMINI_API_KEY: "",
    JUDGE0_API_URL: "",
    JUDGE0_API_KEY: "",
    JUDGE0_API_HOST: "",
    ALLOWED_ORIGINS: "http://localhost:3000",
    RATE_LIMIT_AUTH_MAX: "1000",
    RATE_LIMIT_AI_MAX: "1000",
  };

  const prismaCli = path.join(ROOT, "node_modules", "prisma", "build", "index.js");
  runNode([prismaCli, "db", "push", "--skip-generate", "--accept-data-loss"], env, "prisma db push");
  runNode(["--import", "tsx", "seed-db.ts"], env, "seed");
  // Seeding twice must be idempotent.
  runNode(["--import", "tsx", "seed-db.ts"], env, "seed (second run)");

  server = spawn(process.execPath, ["--import", "tsx", "server.ts"], { cwd: ROOT, env, stdio: ["ignore", "pipe", "pipe"] });
  server.stdout?.on("data", (d) => (serverLog += d.toString()));
  server.stderr?.on("data", (d) => (serverLog += d.toString()));
  baseUrl = `http://127.0.0.1:${port}`;

  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`server exited early:\n${serverLog}`);
    try {
      const res = await fetch(`${baseUrl}/api/health`);
      if (res.status === 200) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`server did not become healthy:\n${serverLog}`);
});

after(async () => {
  await killServer();
  if (tmpDir) {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch {
      /* best effort (Windows may hold the SQLite file briefly) */
    }
  }
});

process.on("exit", () => {
  if (server?.pid && server.exitCode === null) {
    try {
      server.kill();
    } catch {
      /* ignore */
    }
  }
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("password hashing", () => {
  test("new hashes use pbkdf2$210000 and verify", async () => {
    const hash = await hashPassword("hunter22");
    assert.match(hash, /^pbkdf2\$210000\$[0-9a-f]+\$[0-9a-f]+$/);
    assert.deepEqual(await verifyPassword("hunter22", hash), { valid: true, needsRehash: false });
    assert.equal((await verifyPassword("wrong", hash)).valid, false);
  });

  test("legacy salt:hash (10000 iterations) still verifies and asks for a rehash", async () => {
    const salt = crypto.randomBytes(16).toString("hex");
    const legacy = `${salt}:${crypto.pbkdf2Sync("oldpass", salt, 10000, 64, "sha512").toString("hex")}`;
    assert.deepEqual(await verifyPassword("oldpass", legacy), { valid: true, needsRehash: true });
    assert.equal((await verifyPassword("nope", legacy)).valid, false);
    assert.equal((await verifyPassword("x", "garbage")).valid, false);
  });
});

describe("Judge0 runner (against a mock Judge0 server)", () => {
  // Runs in this test process: codeRunner is imported with CODE_RUNNER=judge0 pointing at a local mock.
  let mock: http.Server;
  let mode = "accept";
  const requests: { method?: string; url?: string; headers: http.IncomingHttpHeaders; body: any }[] = [];
  const tokens = new Map<string, unknown>();
  let runner: typeof import("../server/codeRunner");
  const tests = [
    { input: "1 2", expectedOutput: "3", isHidden: false },
    { input: "3 4", expectedOutput: "7", isHidden: true },
  ];

  before(async () => {
    mock = http.createServer((req, res) => {
      let raw = "";
      req.on("data", (d) => (raw += d));
      req.on("end", () => {
        const body = raw ? JSON.parse(raw) : null;
        requests.push({ method: req.method, url: req.url, headers: req.headers, body });
        const send = (status: number, payload: unknown) => {
          res.writeHead(status, { "Content-Type": "application/json" });
          res.end(JSON.stringify(payload));
        };
        const b64 = (s: string) => Buffer.from(s).toString("base64");
        if (req.method === "GET") return send(200, tokens.get(req.url!.split("/submissions/")[1].split("?")[0]));
        const stdin = Buffer.from(body.stdin, "base64").toString();
        const correct = b64(stdin === "1 2" ? "3\n" : "7");
        switch (mode) {
          case "accept":
            return send(201, { status: { id: 3 }, stdout: correct, time: "0.01", memory: 2048 });
          case "wrong":
            return send(201, { status: { id: 3 }, stdout: b64("999"), time: "0.01", memory: 2048 });
          case "tle":
            return send(201, { status: { id: 5 } });
          case "compile":
            return send(201, { status: { id: 6 }, compile_output: b64("error: ';' expected") });
          case "runtime":
            return send(201, { status: { id: 11 }, stderr: b64("Exception"), message: b64("Exited with error status 1") });
          case "queued": {
            const token = `t${requests.length}`;
            tokens.set(token, { status: { id: 3 }, stdout: correct });
            return send(201, { token, status: { id: 2 } });
          }
          case "internal":
            return send(201, { status: { id: 13, description: "Internal Error" } });
          default:
            return send(500, { error: "down" });
        }
      });
    });
    await new Promise<void>((resolve) => mock.listen(0, "127.0.0.1", () => resolve()));
    Object.assign(process.env, {
      NODE_ENV: "production",
      JWT_SECRET,
      INTERNAL_API_KEY,
      CODE_RUNNER: "",
      JUDGE0_API_URL: `http://127.0.0.1:${(mock.address() as net.AddressInfo).port}`,
      JUDGE0_API_KEY: "rapid-key",
      JUDGE0_API_HOST: "judge0.example.com",
      GEMINI_API_KEY: "",
    });
    runner = await import("../server/codeRunner");
  });

  after(() => new Promise<void>((resolve) => mock.close(() => resolve())));

  test("submits every test case with RapidAPI headers and maps statuses", async () => {
    const java = "public class Solution { public static String solve(String s) { return s; } }";
    const accepted = await runner.judgeCode("java", java, tests, "submit");
    assert.equal(accepted.status, "Accepted");
    assert.equal(accepted.runner, "judge0");
    assert.equal(requests.length, 2);
    assert.equal(requests[0].headers["x-rapidapi-key"], "rapid-key");
    assert.equal(requests[0].headers["x-rapidapi-host"], "judge0.example.com");
    assert.equal(requests[0].body.language_id, 62);
    const source = Buffer.from(requests[0].body.source_code, "base64").toString();
    assert.ok(source.includes("public class Main") && !source.includes("public class Solution"));

    const expectations: [string, string][] = [
      ["wrong", "Wrong Answer"],
      ["tle", "Time Limit Exceeded"],
      ["compile", "Compilation Error"],
      ["runtime", "Runtime Error"],
      ["queued", "Accepted"],
    ];
    for (const [m, status] of expectations) {
      mode = m;
      assert.equal((await runner.judgeCode("cpp", "string solve(string s) { return s; }", tests, "submit")).status, status, m);
    }
    assert.ok(requests.some((r) => r.method === "GET"), "queued submissions are polled");
  });

  test("Judge0 failures surface as errors, never as a fake verdict", async () => {
    for (const m of ["internal", "http500"]) {
      mode = m;
      await assert.rejects(runner.judgeCode("python", "def solve(s):\n    return s", tests, "submit"), runner.RunnerFailureError);
    }
  });
});

describe("platform basics", () => {
  test("health is 200 with ML offline", async () => {
    const res = await api("GET", "/api/health");
    assert.equal(res.status, 200);
    assert.equal(res.body.node, "online");
    assert.equal(res.body.database, "connected");
    assert.equal(res.body.mlService, "disconnected");
  });

  test("unknown /api route returns 404 JSON", async () => {
    const res = await api("GET", "/api/definitely-not-a-route");
    assert.equal(res.status, 404);
    assert.equal(typeof res.body.error, "string");
  });

  test("malformed JSON returns 400 JSON", async () => {
    const res = await api("POST", "/api/auth/login", { rawBody: "{not json" });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /json/i);
  });

  test("oversized body returns 413", async () => {
    const res = await api("POST", "/api/auth/login", { rawBody: JSON.stringify({ email: "a", password: "x".repeat(200_000) }) });
    assert.equal(res.status, 413);
  });
});

describe("authentication", () => {
  test("register returns token and full public user; privileged fields are ignored", async () => {
    const username = `newbie_${crypto.randomBytes(3).toString("hex")}`;
    const res = await api("POST", "/api/auth/register", {
      body: { email: `${username}@Example.com`, username, password: "secret123", isAdmin: true, xp: 99999 },
    });
    assert.equal(res.status, 201);
    assert.equal(typeof res.body.token, "string");
    assertPublicUser(res.body.user);
    assert.equal(res.body.user.isAdmin, false);
    assert.equal(res.body.user.xp, 0);
    assert.equal(res.body.user.email, `${username}@example.com`);

    const dup = await api("POST", "/api/auth/register", { body: { email: `${username}@example.com`, username, password: "secret123" } });
    assert.equal(dup.status, 409);
    const dupCase = await api("POST", "/api/auth/register", {
      body: { email: `other_${username}@example.com`, username: username.toUpperCase(), password: "secret123" },
    });
    assert.equal(dupCase.status, 409, "usernames are unique case-insensitively");
  });

  test("registration validation", async () => {
    assert.equal((await api("POST", "/api/auth/register", { body: { email: "bad", username: "okname", password: "secret123" } })).status, 400);
    assert.equal((await api("POST", "/api/auth/register", { body: { email: "a@b.co", username: "ok_name2", password: "123" } })).status, 400);
    assert.equal((await api("POST", "/api/auth/register", { body: {} })).status, 400);
  });

  test("admin cannot be obtained through a username", async () => {
    const reserved = await api("POST", "/api/auth/register", { body: { email: "fake-admin@example.com", username: "Admin", password: "secret123" } });
    assert.equal(reserved.status, 409);
    const lookalike = await registerUser("admin_");
    assert.equal(lookalike.user.isAdmin, false);
    const create = await api("POST", "/api/problems", { token: lookalike.token, body: { title: "x" } });
    assert.equal(create.status, 403);
  });

  test("demo accounts can log in by email or username", async () => {
    const student = await login("student@placify.com", "student123");
    assertPublicUser(student.user);
    assert.equal(student.user.isAdmin, false);
    assert.ok(student.user.problemsSolved.includes(TWO_SUM));
    const byUsername = await api("POST", "/api/auth/login", { body: { username: "student", password: "student123" } });
    assert.equal(byUsername.status, 200);
    const admin = await login("admin@placify.com", "admin123");
    assert.equal(admin.user.isAdmin, true);
  });

  test("wrong password and unknown user both return 401", async () => {
    const wrong = await api("POST", "/api/auth/login", { body: { email: "student@placify.com", password: "nope123" } });
    assert.equal(wrong.status, 401);
    const unknown = await api("POST", "/api/auth/login", { body: { email: "ghost@placify.com", password: "nope123" } });
    assert.equal(unknown.status, 401);
    assert.equal(wrong.body.error, unknown.body.error, "no user enumeration through messages");
  });

  test("/me requires a valid token", async () => {
    const { token } = await login("student@placify.com", "student123");
    const me = await api("GET", "/api/auth/me", { token });
    assert.equal(me.status, 200);
    assertPublicUser(me.body.user);

    assert.equal((await api("GET", "/api/auth/me")).status, 401);
    const [h, p] = token.split(".");
    assert.equal((await api("GET", "/api/auth/me", { token: `${h}.${p}.invalidsignature` })).status, 401);
    const noneHeader = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    assert.equal((await api("GET", "/api/auth/me", { token: `${noneHeader}.${p}.` })).status, 401);
    const forged = Buffer.from(JSON.stringify({ sub: "someone", exp: 9999999999 })).toString("base64url");
    assert.equal((await api("GET", "/api/auth/me", { token: `${h}.${forged}.${token.split(".")[2]}` })).status, 401);
  });

  test("protected routes return 401 without a token", async () => {
    const routes: [string, string][] = [
      ["GET", "/api/submissions"],
      ["GET", "/api/dashboard/analytics"],
      ["POST", "/api/mentor/ask"],
      ["POST", "/api/resume/analyze"],
      ["POST", "/api/mock-interview/start"],
      ["POST", `/api/problems/${TWO_SUM}/submit`],
      ["POST", "/api/discussions"],
      ["POST", "/api/contests/contest-1/register"],
      ["POST", "/api/learning-tracks/python/topics/py-intro/complete"],
      ["POST", "/api/problems"],
    ];
    for (const [method, url] of routes) {
      const res = await api(method, url, method === "GET" ? {} : { body: {} });
      assert.equal(res.status, 401, `${method} ${url} should be 401, got ${res.status}`);
    }
  });
});

describe("problems", () => {
  test("list hides hidden test cases and exposes starter code and solutions", async () => {
    const res = await api("GET", "/api/problems");
    assert.equal(res.status, 200);
    assert.ok(res.body.length >= 20);
    for (const p of res.body) {
      assert.ok(p.testCases.every((t: any) => t.isHidden === false), `${p.id} exposes hidden tests`);
      assert.ok(!/^Sample (Easy|Medium|Hard)/.test(p.title), "placeholder problems must be gone");
      assert.equal(typeof p.starterCode.javascript, "string");
      assert.ok(p.solutions.javascript.includes("function solve"));
      assert.ok(p.solutions.python.includes("def solve"));
      assert.notEqual(p.starterCode.javascript, p.solutions.javascript);
    }
    const single = await api("GET", `/api/problems/${TWO_SUM}`);
    assert.equal(single.status, 200);
    assert.equal(single.body.testCases.length, 2);
  });

  test("query validation and filters", async () => {
    assert.equal((await api("GET", "/api/problems?tag=a&tag=b")).status, 400);
    assert.equal((await api("GET", "/api/problems?difficulty=Impossible")).status, 400);
    const easy = await api("GET", "/api/problems?difficulty=Easy");
    assert.ok(easy.body.length > 0 && easy.body.every((p: any) => p.difficulty === "Easy"));
    const trees = await api("GET", "/api/problems?tag=Trees");
    assert.equal(trees.body.length, 3);
    const search = await api("GET", "/api/problems?search=palindrome");
    assert.equal(search.body.length, 1);
    assert.equal((await api("GET", "/api/problems/does-not-exist")).status, 404);
  });

  test("admin CRUD is admin-only and whitelists fields", async () => {
    const student = await login("student@placify.com", "student123");
    const admin = await login("admin@placify.com", "admin123");
    const payload = {
      title: "Sum Of Two Numbers",
      difficulty: "Easy",
      description: "Print a + b.",
      tags: ["Math"],
      testCases: [
        { input: "1 2", expectedOutput: "3", isHidden: false },
        { input: "40 2", expectedOutput: "42", isHidden: true },
      ],
    };
    assert.equal((await api("POST", "/api/problems", { token: student.token, body: payload })).status, 403);
    assert.equal((await api("PUT", `/api/problems/${TWO_SUM}`, { token: student.token, body: { title: "hacked" } })).status, 403);
    assert.equal((await api("DELETE", `/api/problems/${TWO_SUM}`, { token: student.token })).status, 403);

    assert.equal((await api("POST", "/api/problems", { token: admin.token, body: { ...payload, testCases: [] } })).status, 400);
    const created = await api("POST", "/api/problems", { token: admin.token, body: payload });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const id = created.body.id;
    assert.match(id, /^prob-math-sum-of-two-numbers/);

    const publicView = await api("GET", `/api/problems/${id}`);
    assert.equal(publicView.body.testCases.length, 1);
    assert.equal((await api("GET", `/api/problems/${id}/full`, { token: student.token })).status, 403);
    const adminView = await api("GET", `/api/problems/${id}/full`, { token: admin.token });
    assert.equal(adminView.body.testCases.length, 2);

    const updated = await api("PUT", `/api/problems/${id}`, {
      token: admin.token,
      body: { title: "Sum Of Two Integers", id: "prob-hijack", submissions: [] },
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.id, id);
    assert.equal(updated.body.title, "Sum Of Two Integers");
    assert.equal((await api("PUT", `/api/problems/${id}`, { token: admin.token, body: { difficulty: "Legendary" } })).status, 400);

    const solved = await submit(student.token, id, "javascript", "function solve(i){ const [a,b]=i.trim().split(/\\s+/).map(Number); return String(a+b); }", true);
    assert.equal(solved.body.submission.status, "Accepted");

    assert.equal((await api("DELETE", `/api/problems/${id}`, { token: admin.token })).status, 200);
    assert.equal((await api("GET", `/api/problems/${id}`)).status, 404);
  });
});

describe("code runner and submissions", () => {
  let token = "";
  let bankSolutions: Record<string, { javascript: string; python: string }> = {};
  let pythonAvailable = true;

  before(async () => {
    token = (await registerUser("coder")).token;
    const problems = await api("GET", "/api/problems");
    bankSolutions = Object.fromEntries(problems.body.map((p: any) => [p.id, p.solutions]));
  });

  test("invalid payloads are rejected with 400/404", async () => {
    assert.equal((await api("POST", `/api/problems/${TWO_SUM}/submit`, { token, body: {} })).status, 400);
    assert.equal((await submit(token, TWO_SUM, "cobol", "x", true)).status, 400);
    assert.equal((await submit(token, TWO_SUM, "javascript", "", true)).status, 400);
    assert.equal((await submit(token, "prob-missing", "javascript", "function solve(){}", true)).status, 404);
  });

  test("Run executes visible tests only and never awards XP or stores a submission", async () => {
    const before = (await api("GET", "/api/auth/me", { token })).body.user;
    const res = await submit(token, TWO_SUM, "javascript", bankSolutions[TWO_SUM].javascript, false);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.run, true);
    assert.equal(res.body.success, true);
    assert.equal(res.body.results.length, 2);
    assert.ok(res.body.results.every((r: any) => r.passed));
    const afterUser = (await api("GET", "/api/auth/me", { token })).body.user;
    assert.equal(afterUser.xp, before.xp);
    assert.deepEqual(afterUser.problemsSolved, []);
    assert.equal((await api("GET", "/api/submissions", { token })).body.length, 0);
  });

  test("correct JavaScript is Accepted; XP is awarded only on the first Accepted", async () => {
    const first = await submit(token, TWO_SUM, "javascript", bankSolutions[TWO_SUM].javascript, true);
    assert.equal(first.status, 200, JSON.stringify(first.body));
    assert.equal(first.body.run, false);
    assert.equal(first.body.submission.status, "Accepted");
    assert.equal(first.body.xpEarned, 20);
    assert.equal(first.body.firstSolve, true);
    assertPublicUser(first.body.user);
    assert.ok(first.body.user.problemsSolved.includes(TWO_SUM));
    assert.ok(first.body.user.badges.includes("First Solve"));
    const xpAfterFirst = first.body.user.xp;
    assert.equal(xpAfterFirst, 20);

    const second = await submit(token, TWO_SUM, "javascript", bankSolutions[TWO_SUM].javascript, true);
    assert.equal(second.body.submission.status, "Accepted");
    assert.equal(second.body.xpEarned, 0);
    assert.equal(second.body.firstSolve, false);
    assert.equal(second.body.user.xp, xpAfterFirst);
    assert.equal(second.body.user.accuracy, 100);
  });

  test("correct Python is Accepted", async (t) => {
    const res = await submit(token, "prob-stacks-valid-parentheses", "python", bankSolutions["prob-stacks-valid-parentheses"].python, true);
    if (res.status === 503) {
      pythonAvailable = false;
      t.skip("Python is not available on this machine");
      return;
    }
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.submission.status, "Accepted", res.body.submission.errorMessage);
    assert.equal(res.body.xpEarned, 20);
  });

  test("wrong answers are rejected and accuracy is recomputed", async () => {
    const res = await submit(token, "prob-strings-valid-anagram", "javascript", 'function solve(input) { return "true"; }', true);
    assert.equal(res.body.submission.status, "Wrong Answer");
    assert.equal(res.body.xpEarned, 0);
    assert.equal(res.body.success, false);
    assert.ok(!res.body.user.problemsSolved.includes("prob-strings-valid-anagram"));
    assert.ok(res.body.user.accuracy < 100);
  });

  test("literal-output cheats are not accepted and hidden tests are never echoed", async () => {
    // Mentions every expected output as a literal and hard-codes the visible answers.
    const cheat = `// "0 1" "1 2" "2 4"
function solve(input) { return input.startsWith("2 7") ? "0 1" : "1 2"; }`;
    const run = await submit(token, TWO_SUM, "javascript", cheat, false);
    assert.equal(run.body.success, true, "visible tests pass");
    const res = await submit(token, TWO_SUM, "javascript", cheat, true);
    assert.equal(res.body.submission.status, "Wrong Answer");
    const message: string = res.body.submission.errorMessage;
    assert.match(message, /hidden test case/);
    assert.ok(!message.includes("3 3") && !message.includes("-1 -2 -3"), "hidden inputs must not leak");
    assert.ok(!JSON.stringify(res.body).includes("-1 -2 -3 -4 -5"), "hidden inputs must not leak anywhere");

    const constant = await submit(token, "prob-stacks-valid-parentheses", "javascript", 'function solve() { return "true"; }', true);
    assert.equal(constant.body.submission.status, "Wrong Answer");
  });

  test("runtime and compilation errors are classified", async () => {
    const rte = await submit(token, TWO_SUM, "javascript", 'function solve() { throw new Error("boom"); }', false);
    assert.equal(rte.body.status, "Runtime Error");
    assert.match(rte.body.errorMessage, /boom/);
    assert.ok(!/main\.js|placify-run-/.test(rte.body.errorMessage), "harness internals must not leak");
    const ce = await submit(token, TWO_SUM, "javascript", "function solve( {", false);
    assert.equal(ce.body.status, "Compilation Error");
    if (pythonAvailable) {
      const pyCe = await submit(token, TWO_SUM, "python", "def solve(x)\n    return 1", false);
      assert.equal(pyCe.body.status, "Compilation Error");
      const pyRte = await submit(token, TWO_SUM, "python", "def solve(x):\n    return 1 // 0", false);
      assert.equal(pyRte.body.status, "Runtime Error");
      assert.match(pyRte.body.errorMessage, /ZeroDivisionError/);
    }
  });

  test("infinite loops hit the time limit and the server stays healthy", async () => {
    const started = Date.now();
    const res = await submit(token, TWO_SUM, "javascript", "function solve() { while (true) {} }", false);
    assert.equal(res.body.status, "Time Limit Exceeded");
    assert.ok(Date.now() - started < 15_000, "time limit must be enforced");
    assert.equal((await api("GET", "/api/health")).status, 200);
    const ok = await submit(token, TWO_SUM, "javascript", bankSolutions[TWO_SUM].javascript, false);
    assert.equal(ok.body.success, true);
  });

  test("JavaScript sandbox blocks child_process, fs and secrets", async () => {
    const code = `function solve() {
  const out = [];
  try { require("child_process").execSync("echo pwned"); out.push("cp:EXECUTED"); } catch (e) { out.push("cp:blocked"); }
  try { require("fs").writeFileSync("pwned.txt", "x"); out.push("fs:WROTE"); } catch (e) { out.push("fs:blocked"); }
  try { require("fs").readFileSync(${JSON.stringify(path.join(ROOT, "package.json"))}); out.push("read:READ"); } catch (e) { out.push("read:blocked"); }
  try { require("node:sqlite"); out.push("sqlite:LOADED"); } catch (e) { out.push("sqlite:blocked"); }
  try { require("net").connect(1, "127.0.0.1"); out.push("net:LOADED"); } catch (e) { out.push("net:blocked"); }
  out.push(JSON.stringify(process.env));
  return out.join("|");
}`;
    const res = await submit(token, TWO_SUM, "javascript", code, false);
    const actual: string = res.body.results[0].actual;
    assert.ok(actual.startsWith("cp:blocked|fs:blocked|read:blocked|sqlite:blocked|net:blocked|"), actual.slice(0, 200));
    assert.ok(!actual.includes(JWT_SECRET) && !actual.includes(INTERNAL_API_KEY), "secrets leaked to user code");
    assert.ok(!actual.includes("JWT_SECRET") && !actual.includes("DATABASE_URL"));
  });

  test("Python sandbox blocks subprocess, file writes and secrets", async (t) => {
    if (!pythonAvailable) return t.skip("Python is not available");
    const code = `import os
def solve(input_str):
    out = []
    try:
        import subprocess
        subprocess.run(["echo", "pwned"])
        out.append("sp:EXECUTED")
    except Exception:
        out.append("sp:blocked")
    try:
        open("pwned.txt", "w").write("x")
        out.append("fs:WROTE")
    except Exception:
        out.append("fs:blocked")
    try:
        os.system("echo pwned")
        out.append("sys:EXECUTED")
    except Exception:
        out.append("sys:blocked")
    try:
        open(${JSON.stringify(path.join(ROOT, "package.json"))}).read()
        out.append("read:READ")
    except Exception:
        out.append("read:blocked")
    out.append(repr(dict(os.environ)))
    return "|".join(out)
`;
    const res = await submit(token, TWO_SUM, "python", code, false);
    const actual: string = res.body.results[0].actual;
    assert.ok(actual.startsWith("sp:blocked|fs:blocked|sys:blocked|read:blocked|"), actual.slice(0, 300));
    assert.ok(!actual.includes(JWT_SECRET) && !actual.includes(INTERNAL_API_KEY), "secrets leaked to user code");
  });

  test("compiled languages need Judge0 on the local runner (503)", async () => {
    const res = await submit(token, TWO_SUM, "java", "public class Solution { public static String solve(String s) { return \"\"; } }", true);
    assert.equal(res.status, 503);
  });

  test("submissions list is newest first and belongs to the caller", async () => {
    const res = await api("GET", "/api/submissions", { token });
    assert.equal(res.status, 200);
    assert.ok(res.body.length >= 4);
    const times = res.body.map((s: any) => s.submittedAt);
    assert.deepEqual([...times].sort().reverse(), times);
  });

  test("every reference solution passes all of its test cases (JavaScript and Python)", async () => {
    const verifier = (await registerUser("verifier")).token;
    const failures: string[] = [];
    for (const [id, solutions] of Object.entries(bankSolutions)) {
      for (const language of pythonAvailable ? (["javascript", "python"] as const) : (["javascript"] as const)) {
        const res = await submit(verifier, id, language, solutions[language], true);
        if (res.body?.submission?.status !== "Accepted") failures.push(`${id} [${language}]: ${res.body?.submission?.errorMessage ?? res.status}`);
      }
    }
    assert.deepEqual(failures, []);
  });
});

describe("mock interviews", () => {
  test("question sets differ by type and invalid types are rejected", async () => {
    const { token } = await registerUser("interviewee");
    const tech = await api("POST", "/api/mock-interview/start", { token, body: { type: "Technical" } });
    const hr = await api("POST", "/api/mock-interview/start", { token, body: { type: "HR" } });
    const behavioral = await api("POST", "/api/mock-interview/start", { token, body: { type: "Behavioral" } });
    assert.equal(tech.body.questions.length, 5);
    assert.equal(hr.body.questions.length, 5);
    assert.notDeepEqual(tech.body.questions, hr.body.questions);
    assert.notDeepEqual(hr.body.questions, behavioral.body.questions);
    assert.equal((await api("POST", "/api/mock-interview/start", { token, body: { type: "Chess" } })).status, 400);
  });

  test("owner-only answers, completion awards 30 XP once, completed interview returns 409", async () => {
    const owner = await registerUser("owner");
    const intruder = await registerUser("intruder");
    const started = await api("POST", "/api/mock-interview/start", { token: owner.token, body: { type: "Behavioral" } });
    const id = started.body.id;

    const idor = await api("POST", `/api/mock-interview/${id}/answer`, { token: intruder.token, body: { answer: "I take over." } });
    assert.equal(idor.status, 404);
    assert.equal((await api("POST", `/api/mock-interview/${id}/answer`, { token: owner.token, body: { answer: "" } })).status, 400);

    let last: any;
    for (let i = 0; i < 5; i++) {
      last = await api("POST", `/api/mock-interview/${id}/answer`, {
        token: owner.token,
        body: { answer: "In my last project the situation was a tight deadline; I planned tasks, communicated with the team and we delivered 2 days early." },
      });
      assert.equal(last.status, 200, JSON.stringify(last.body));
      assert.ok(last.body.scores.every((s: number) => s >= 0 && s <= 100));
    }
    assert.equal(last.body.status, "Completed");
    assert.equal(typeof last.body.overallScore, "number");
    assert.equal(last.body.xpEarned, 30);
    assertPublicUser(last.body.user);
    assert.equal(last.body.user.xp, 30);
    assert.match(last.body.feedback[0], /heuristic/i, "ML-offline scores must be labelled");

    const again = await api("POST", `/api/mock-interview/${id}/answer`, { token: owner.token, body: { answer: "more" } });
    assert.equal(again.status, 409);
    assert.equal((await api("GET", "/api/auth/me", { token: owner.token })).body.user.xp, 30);
  });
});

describe("contests", () => {
  test("registration is idempotent and isRegistered reflects the caller", async () => {
    const { token } = await registerUser("contestant");
    const anon = await api("GET", "/api/contests");
    assert.equal(anon.status, 200);
    const contest = anon.body.find((c: any) => c.id === "contest-1");
    assert.ok(contest && contest.isRegistered === false);
    const baseline = contest.registrantsCount;

    const first = await api("POST", "/api/contests/contest-1/register", { token });
    assert.equal(first.status, 200);
    assert.equal(first.body.registrantsCount, baseline + 1);
    assert.equal(first.body.isRegistered, true);
    const second = await api("POST", "/api/contests/contest-1/register", { token });
    assert.equal(second.body.registrantsCount, baseline + 1);

    const mine = await api("GET", "/api/contests", { token });
    assert.equal(mine.body.find((c: any) => c.id === "contest-1").isRegistered, true);
    const withBadToken = await api("GET", "/api/contests", { token: "garbage" });
    assert.equal(withBadToken.status, 200);
    assert.equal((await api("POST", "/api/contests/nope/register", { token })).status, 404);
  });
});

describe("discussions", () => {
  test("create, reply and toggle likes", async () => {
    const { token, user } = await registerUser("poster");
    const list = await api("GET", "/api/discussions");
    assert.ok(list.body.length >= 2, "seeded threads expected");

    assert.equal((await api("POST", "/api/discussions", { token, body: { title: "Hi", content: "x" } })).status, 400);
    assert.equal((await api("POST", "/api/discussions", { token, body: { title: "Valid title", content: "x", category: "Memes" } })).status, 400);
    const created = await api("POST", "/api/discussions", { token, body: { title: "Graph BFS question", content: "When should I use BFS?", category: "DSA" } });
    assert.equal(created.status, 201);
    assert.equal(created.body.username, user.username);

    const reply = await api("POST", `/api/discussions/${created.body.id}/reply`, { token, body: { content: "Use BFS for shortest paths in unweighted graphs." } });
    assert.equal(reply.status, 200);
    assert.equal(reply.body.replies.length, 1);
    assert.equal(reply.body.replies[0].username, user.username);

    const liked = await api("POST", `/api/discussions/${created.body.id}/like`, { token });
    assert.equal(liked.body.likes, 1);
    assert.deepEqual(liked.body.likedBy, [user.id]);
    const unliked = await api("POST", `/api/discussions/${created.body.id}/like`, { token });
    assert.equal(unliked.body.likes, 0);
    assert.equal((await api("POST", "/api/discussions/nope/reply", { token, body: { content: "x" } })).status, 404);
  });
});

describe("dashboard, mentor, resume and learning", () => {
  test("analytics has the documented shape with ML fallbacks", async () => {
    const { token } = await login("student@placify.com", "student123");
    const res = await api("GET", "/api/dashboard/analytics", { token });
    assert.equal(res.status, 200);
    const { readiness, recommendations, metrics, strongTopics, weakTopics, activity } = res.body;
    assert.equal(readiness.source, "fallback");
    assert.ok(readiness.score >= 0 && readiness.score <= 100);
    assert.equal(typeof readiness.placementReady, "boolean");
    assert.ok(Array.isArray(readiness.insights));
    assert.ok(Array.isArray(recommendations) && recommendations.length > 0);
    for (const r of recommendations) {
      assert.ok(r.id && r.title && r.difficulty && Array.isArray(r.tags));
    }
    assert.ok(!recommendations.some((r: any) => r.id === TWO_SUM), "solved problems are not recommended");
    for (const key of ["xp", "level", "streak", "accuracy", "problemsSolved", "totalSubmissions", "interviewAverage"]) {
      assert.ok(key in metrics, `metrics.${key} missing`);
    }
    assert.ok(Array.isArray(strongTopics) && Array.isArray(weakTopics));
    assert.equal(activity.length, 84);
    assert.equal(activity[83].date, new Date().toISOString().slice(0, 10));
    assert.ok(activity.every((a: any) => typeof a.count === "number"));
  });

  test("mentor falls back when the ML service is offline", async () => {
    const { token } = await registerUser("mentee");
    assert.equal((await api("POST", "/api/mentor/ask", { token, body: { question: "" } })).status, 400);
    const history = Array.from({ length: 14 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: `message ${i}` }));
    const res = await api("POST", "/api/mentor/ask", { token, body: { question: "How do I learn DP?", chatHistory: history } });
    assert.equal(res.status, 200);
    assert.equal(res.body.source, "fallback");
    assert.equal(typeof res.body.text, "string");
    assert.ok(Array.isArray(res.body.sources));
  });

  test("resume analysis returns the heuristic shape", async () => {
    const { token } = await registerUser("candidate");
    assert.equal((await api("POST", "/api/resume/analyze", { token, body: { resumeText: "too short" } })).status, 400);
    const resumeText = `Jane Doe  jane@example.com  +91 98765 43210  github.com/jane  linkedin.com/in/jane
EDUCATION
B.Tech Computer Science, 2025
SKILLS
JavaScript, TypeScript, React, Node.js, Express, SQL, Git, Docker
EXPERIENCE
Software Intern - built a REST API serving 2,000 users and reduced latency by 35%.
PROJECTS
Developed a React dashboard; automated deployments with GitHub Actions.`;
    const res = await api("POST", "/api/resume/analyze", { token, body: { resumeText, targetRole: "Full Stack Developer" } });
    assert.equal(res.status, 200);
    assert.equal(res.body.source, "heuristic");
    assert.ok(res.body.atsScore >= 0 && res.body.atsScore <= 100);
    for (const key of ["strengths", "improvements", "keywordsFound", "keywordsMissing"]) assert.ok(Array.isArray(res.body[key]), key);
    assert.ok(res.body.keywordsFound.includes("React"));
    assert.equal(typeof res.body.summary, "string");
  });

  test("learning tracks, topic payload and one-time completion XP", async () => {
    const tracks = await api("GET", "/api/learning-tracks");
    assert.equal(tracks.status, 200);
    assert.ok(tracks.body.length > 0 && tracks.body[0].topics.length > 0);
    const track = tracks.body[0];
    const topic = track.topics[0];

    const payload = await api("GET", `/api/learning-tracks/${track.id}/topics/${topic.id}`);
    assert.equal(payload.status, 200);
    for (const key of ["name", "theory", "visualExplanation", "codeExamples", "practiceQuestions", "codingChallenges", "quizzes", "interviewQuestions"]) {
      assert.ok(key in payload.body, `topic.${key} missing`);
    }
    assert.equal((await api("GET", `/api/learning-tracks/${track.id}/topics/nope`)).status, 404);
    assert.equal((await api("GET", "/api/learning-tracks/nope/topics/nope")).status, 404);

    const { token } = await registerUser("learner");
    const url = `/api/learning-tracks/${track.id}/topics/${topic.id}/complete`;
    assert.equal((await api("POST", url, { token, body: { quizScore: 150 } })).status, 400);
    const failed = await api("POST", url, { token, body: { quizScore: 30 } });
    assert.equal(failed.body.xpEarned, 0);
    assert.equal(failed.body.alreadyCompleted, false);
    const first = await api("POST", url, { token, body: { quizScore: 80 } });
    assert.equal(first.status, 200);
    assert.equal(first.body.xpEarned, 15);
    assert.equal(first.body.alreadyCompleted, false);
    assertPublicUser(first.body.user);
    assert.equal(first.body.user.xp, 15);
    const second = await api("POST", url, { token, body: { quizScore: 100 } });
    assert.equal(second.body.xpEarned, 0);
    assert.equal(second.body.alreadyCompleted, true);
    assert.equal(second.body.user.xp, 15);
  });
});
