/**
 * Docker sandbox runner tests (node:test, run with `npm run test:runner`).
 *
 * Drives server/codeRunner.ts (judgeCode) with CODE_RUNNER=docker directly - no HTTP server - plus a few raw
 * programs through server/dockerRunner.ts (runInSandbox) to probe the container boundary itself.
 * Every test is skipped with a clear message when docker or the runner image (placify-runner:1 or
 * RUNNER_IMAGE) is not available: build it with `npm run runner:build`.
 */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { pathToFileURL } from "node:url";

const IMAGE = process.env.RUNNER_IMAGE || "placify-runner:1";
const JWT_SECRET = crypto.randomBytes(32).toString("hex");
const INTERNAL_API_KEY = crypto.randomBytes(24).toString("hex");
const CANARY = `canary-${crypto.randomBytes(8).toString("hex")}`;

function dockerUnavailableReason(): string | null {
  const r = spawnSync("docker", ["image", "inspect", "--format", "{{.Id}}", IMAGE], {
    encoding: "utf8",
    timeout: 30_000,
    windowsHide: true,
  });
  if (r.error) return `the docker CLI is not available (${r.error.message})`;
  if (r.status !== 0) {
    const reason = (r.stderr || "").trim().split(/\r?\n/)[0] || `exit code ${r.status}`;
    return `docker or the image "${IMAGE}" is unavailable (${reason}). Build it with \`npm run runner:build\``;
  }
  return null;
}

const skipReason = dockerUnavailableReason();
if (skipReason) console.log(`# SKIPPING docker runner tests: ${skipReason}`);
const skip = skipReason ? `docker runner unavailable: ${skipReason}` : false;

// Must be set before server/config.ts is (dynamically) imported. The secrets live in THIS process, which
// spawns the docker CLI: the tests prove they never reach user code.
Object.assign(process.env, {
  NODE_ENV: "test",
  CODE_RUNNER: "docker",
  RUNNER_IMAGE: IMAGE,
  JWT_SECRET,
  INTERNAL_API_KEY,
  JUDGE0_API_URL: "",
  GEMINI_API_KEY: "",
  PLACIFY_TEST_CANARY: CANARY,
});

type Runner = typeof import("../server/codeRunner");
type Sandbox = typeof import("../server/dockerRunner");
type Language = "javascript" | "python" | "java" | "cpp" | "c";

let runner: Runner;
let sandbox: Sandbox;
const latencies: { label: string; ms: number }[] = [];

const SUM_TESTS = [
  { input: "1 2\n", expectedOutput: "3", isHidden: false },
  { input: "40 2\n", expectedOutput: "42", isHidden: true },
  { input: "-5 5\n", expectedOutput: "0", isHidden: true },
];

async function judge(label: string, language: Language, code: string, mode: "run" | "submit" = "submit", tests = SUM_TESTS) {
  const started = Date.now();
  const outcome = await runner.judgeCode(language, code, tests, mode);
  latencies.push({ label: `${language} ${label}`, ms: Date.now() - started });
  assert.equal(outcome.runner, "docker");
  return outcome;
}

function raw(language: Language, source: string, inputs: string[], limits: { timeLimitMs?: number } = {}) {
  return sandbox.runInSandbox({
    language,
    source,
    inputs,
    timeLimitMs: limits.timeLimitMs ?? 3000,
    totalLimitMs: 30_000,
    compileLimitMs: 20_000,
    outputLimitBytes: 64 * 1024,
    stderrLimitBytes: 16 * 1024,
    stopOnError: false,
  });
}

function assertNoSecrets(text: string) {
  assert.ok(!text.includes(JWT_SECRET), "JWT_SECRET value leaked into the sandbox");
  assert.ok(!text.includes(INTERNAL_API_KEY), "INTERNAL_API_KEY value leaked into the sandbox");
  assert.ok(!text.includes(CANARY), "host environment leaked into the sandbox");
  for (const name of ["JWT_SECRET", "INTERNAL_API_KEY", "DATABASE_URL", "GEMINI_API_KEY", "PLACIFY_TEST_CANARY"]) {
    assert.ok(!text.includes(name), `${name} is visible inside the sandbox`);
  }
}

/** Per-language programs. `probe` returns "net:...|dns:...|write:...|tmp:...|env:<dump>". */
interface Programs {
  ok: string;
  wrong: string;
  runtime: string;
  runtimePattern: RegExp;
  compile: string;
  tle: string;
  forkBomb: string;
  memoryHog: string;
  outputFlood: string;
  printFlood: string;
  probe?: string;
}

const PROGRAMS: Record<Language, Programs> = {
  javascript: {
    ok: 'function solve(input) { const [a, b] = input.trim().split(/\\s+/).map(Number); return String(a + b); }',
    wrong: 'function solve(input) { const [a, b] = input.trim().split(/\\s+/).map(Number); return String(a + b + 1); }',
    runtime: 'function solve() { throw new Error("boom"); }',
    runtimePattern: /boom/,
    compile: "function solve( {",
    tle: "function solve() { while (true) {} }",
    // child_process is denied by the JS harness; the container-level fork bomb is covered by a raw program below.
    forkBomb: 'function solve() { require("child_process").execSync(":(){ :|:& };:"); return "0"; }',
    memoryHog: "function solve() { const keep = []; while (true) keep.push(new Array(1 << 20).fill(7)); }",
    outputFlood: 'function solve() { return "x".repeat(10 * 1024 * 1024); }',
    printFlood:
      'function solve(input) { for (let i = 0; i < 100000; i++) console.log("flood ".repeat(20)); const [a, b] = input.trim().split(/\\s+/).map(Number); return String(a + b); }',
  },
  python: {
    ok: "def solve(input_str):\n    a, b = map(int, input_str.split())\n    return str(a + b)\n",
    wrong: "def solve(input_str):\n    a, b = map(int, input_str.split())\n    return str(a + b + 1)\n",
    runtime: "def solve(input_str):\n    return 1 // 0\n",
    runtimePattern: /ZeroDivisionError/,
    compile: "def solve(input_str)\n    return 1\n",
    tle: "def solve(input_str):\n    while True:\n        pass\n",
    forkBomb: "import os\ndef solve(input_str):\n    while True:\n        try:\n            os.fork()\n        except OSError:\n            pass\n",
    memoryHog: "def solve(input_str):\n    keep = []\n    while True:\n        keep.append(b'x' * (8 * 1024 * 1024))\n",
    outputFlood: "def solve(input_str):\n    return 'x' * (10 * 1024 * 1024)\n",
    printFlood:
      "def solve(input_str):\n    for _ in range(100000):\n        print('flood ' * 20)\n    a, b = map(int, input_str.split())\n    return str(a + b)\n",
    probe: `import os, socket
def solve(input_str):
    out = []
    try:
        socket.create_connection(("1.1.1.1", 80), timeout=2).close()
        out.append("net:CONNECTED")
    except OSError:
        out.append("net:blocked")
    try:
        socket.getaddrinfo("example.com", 80)
        out.append("dns:RESOLVED")
    except OSError:
        out.append("dns:blocked")
    wrote = []
    for p in ("/opt/runner/pwned", "/etc/pwned", "/home/pwned", "/pwned", "/usr/bin/pwned"):
        try:
            with open(p, "w") as f:
                f.write("x")
            wrote.append(p)
        except OSError:
            pass
    out.append("write:" + (",".join(wrote) or "blocked"))
    with open("/tmp/work/ok.txt", "w") as f:
        f.write("x")
    out.append("tmp:ok")
    out.append("env:" + repr(dict(os.environ)))
    return "|".join(out)
`,
  },
  java: {
    ok:
      "import java.util.*;\n\npublic class Solution {\n    public static String solve(String input) {\n        String[] p = input.trim().split(\"\\\\s+\");\n        return String.valueOf(Long.parseLong(p[0]) + Long.parseLong(p[1]));\n    }\n}\n",
    wrong:
      "public class Solution {\n    public static String solve(String input) {\n        String[] p = input.trim().split(\"\\\\s+\");\n        return String.valueOf(Long.parseLong(p[0]) + Long.parseLong(p[1]) + 1);\n    }\n}\n",
    runtime: 'public class Solution {\n    public static String solve(String input) {\n        throw new IllegalStateException("boom");\n    }\n}\n',
    runtimePattern: /IllegalStateException: boom/,
    compile: "public class Solution {\n    public static String solve(String input) {\n        return 1\n    }\n}\n",
    tle: "public class Solution {\n    public static String solve(String input) {\n        while (true) { }\n    }\n}\n",
    forkBomb:
      'public class Solution {\n    public static String solve(String input) throws Exception {\n        new ProcessBuilder("sh", "-c", "b(){ b | b & }; b").start();\n        java.util.List<Process> keep = new java.util.ArrayList<>();\n        while (true) keep.add(new ProcessBuilder("sleep", "60").start());\n    }\n}\n',
    memoryHog:
      "import java.util.*;\n\npublic class Solution {\n    public static String solve(String input) {\n        List<long[]> keep = new ArrayList<>();\n        while (true) keep.add(new long[1 << 20]);\n    }\n}\n",
    outputFlood: 'public class Solution {\n    public static String solve(String input) {\n        return "x".repeat(10 * 1024 * 1024);\n    }\n}\n',
    printFlood:
      'public class Solution {\n    public static String solve(String input) {\n        for (int i = 0; i < 100000; i++) System.out.println("flood ".repeat(20));\n        String[] p = input.trim().split("\\\\s+");\n        return String.valueOf(Long.parseLong(p[0]) + Long.parseLong(p[1]));\n    }\n}\n',
    probe: `import java.io.*;
import java.net.*;
import java.nio.file.*;

public class Solution {
    public static String solve(String input) throws Exception {
        StringBuilder out = new StringBuilder();
        try (Socket s = new Socket()) {
            s.connect(new InetSocketAddress("1.1.1.1", 80), 2000);
            out.append("net:CONNECTED");
        } catch (IOException e) {
            out.append("net:blocked");
        }
        try {
            InetAddress.getByName("example.com");
            out.append("|dns:RESOLVED");
        } catch (IOException e) {
            out.append("|dns:blocked");
        }
        String wrote = "";
        for (String p : new String[] {"/opt/runner/pwned", "/etc/pwned", "/pwned"}) {
            try {
                Files.writeString(Path.of(p), "x");
                wrote += p + ",";
            } catch (IOException | SecurityException e) {
                // expected
            }
        }
        out.append("|write:").append(wrote.isEmpty() ? "blocked" : wrote);
        Files.writeString(Path.of("/tmp/work/ok.txt"), "x");
        out.append("|tmp:ok|env:").append(System.getenv());
        return out.toString();
    }
}
`,
  },
  cpp: {
    ok: "string solve(string input) {\n    long long a, b;\n    stringstream ss(input);\n    ss >> a >> b;\n    return to_string(a + b);\n}\n",
    wrong: "string solve(string input) {\n    long long a, b;\n    stringstream ss(input);\n    ss >> a >> b;\n    return to_string(a + b + 1);\n}\n",
    runtime: "string solve(string input) {\n    vector<int> v;\n    return to_string(v.at(input.size() + 5));\n}\n",
    runtimePattern: /out_of_range|aborted/i,
    compile: "string solve(string input) {\n    return 1\n}\n",
    tle: "string solve(string input) {\n    volatile long long x = 0;\n    while (true) x++;\n    return input;\n}\n",
    forkBomb: "#include <unistd.h>\nstring solve(string input) {\n    while (true) fork();\n    return input;\n}\n",
    memoryHog: "string solve(string input) {\n    vector<string> keep;\n    while (true) keep.emplace_back(16 << 20, 'x');\n    return input;\n}\n",
    outputFlood: "string solve(string input) {\n    return string(10 << 20, 'x');\n}\n",
    printFlood:
      "string solve(string input) {\n    for (int i = 0; i < 100000; i++) cout << string(120, 'f') << '\\n';\n    long long a, b;\n    stringstream ss(input);\n    ss >> a >> b;\n    return to_string(a + b);\n}\n",
    probe: `#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <netdb.h>
#include <unistd.h>
extern char **environ;
string solve(string input) {
    string out;
    int fd = socket(AF_INET, SOCK_STREAM, 0);
    sockaddr_in addr{};
    addr.sin_family = AF_INET;
    addr.sin_port = htons(80);
    inet_pton(AF_INET, "1.1.1.1", &addr.sin_addr);
    out += (fd >= 0 && connect(fd, (sockaddr*)&addr, sizeof addr) == 0) ? "net:CONNECTED" : "net:blocked";
    if (fd >= 0) close(fd);
    addrinfo* res = nullptr;
    out += getaddrinfo("example.com", "80", nullptr, &res) == 0 ? "|dns:RESOLVED" : "|dns:blocked";
    string wrote;
    for (const char* p : {"/opt/runner/pwned", "/etc/pwned", "/pwned"}) {
        FILE* f = fopen(p, "w");
        if (f) { wrote += p; wrote += ","; fclose(f); }
    }
    out += "|write:" + (wrote.empty() ? string("blocked") : wrote);
    FILE* t = fopen("/tmp/work/ok.txt", "w");
    out += t ? "|tmp:ok" : "|tmp:FAILED";
    if (t) fclose(t);
    out += "|env:";
    for (char** e = environ; *e; e++) { out += *e; out += ";"; }
    return out;
}
`,
  },
  c: {
    ok: 'char* solve(char* input) {\n    static char out[64];\n    long long a, b;\n    sscanf(input, "%lld %lld", &a, &b);\n    sprintf(out, "%lld", a + b);\n    return out;\n}\n',
    wrong: 'char* solve(char* input) {\n    static char out[64];\n    long long a, b;\n    sscanf(input, "%lld %lld", &a, &b);\n    sprintf(out, "%lld", a + b + 1);\n    return out;\n}\n',
    // The pointer is NULL at run time but not provably so (GCC would turn a constant NULL store into a trap).
    runtime: "char* solve(char* input) {\n    volatile int *p = (volatile int *)(long)(input[0] == 127);\n    *p = 1;\n    return input;\n}\n",
    runtimePattern: /Segmentation fault/,
    compile: "char* solve(char* input) {\n    return 1\n}\n",
    tle: "char* solve(char* input) {\n    volatile long long x = 0;\n    for (;;) x++;\n    return input;\n}\n",
    forkBomb: "#include <unistd.h>\nchar* solve(char* input) {\n    for (;;) fork();\n    return input;\n}\n",
    memoryHog:
      "char* solve(char* input) {\n    for (;;) {\n        char *p = malloc(16 << 20);\n        if (!p) abort();\n        memset(p, 1, 16 << 20);\n    }\n    return input;\n}\n",
    outputFlood: "char* solve(char* input) {\n    size_t n = 10u << 20;\n    char *s = malloc(n + 1);\n    memset(s, 'x', n);\n    s[n] = 0;\n    return s;\n}\n",
    printFlood:
      'char* solve(char* input) {\n    static char out[64];\n    long long a, b;\n    for (int i = 0; i < 100000; i++) fprintf(stderr, "%s\\n", "flood flood flood flood flood flood flood flood flood flood flood flood");\n    sscanf(input, "%lld %lld", &a, &b);\n    sprintf(out, "%lld", a + b);\n    return out;\n}\n',
    probe: `#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <netdb.h>
#include <unistd.h>
extern char **environ;
static char out[1 << 16];
char* solve(char* input) {
    int fd = socket(AF_INET, SOCK_STREAM, 0);
    struct sockaddr_in addr;
    memset(&addr, 0, sizeof addr);
    addr.sin_family = AF_INET;
    addr.sin_port = htons(80);
    inet_pton(AF_INET, "1.1.1.1", &addr.sin_addr);
    strcat(out, (fd >= 0 && connect(fd, (struct sockaddr*)&addr, sizeof addr) == 0) ? "net:CONNECTED" : "net:blocked");
    if (fd >= 0) close(fd);
    struct addrinfo* res = NULL;
    strcat(out, getaddrinfo("example.com", "80", NULL, &res) == 0 ? "|dns:RESOLVED" : "|dns:blocked");
    const char* paths[] = {"/opt/runner/pwned", "/etc/pwned", "/pwned"};
    int wrote = 0;
    for (int i = 0; i < 3; i++) {
        FILE* f = fopen(paths[i], "w");
        if (f) { wrote = 1; fclose(f); }
    }
    strcat(out, wrote ? "|write:WROTE" : "|write:blocked");
    FILE* t = fopen("/tmp/work/ok.txt", "w");
    strcat(out, t ? "|tmp:ok" : "|tmp:FAILED");
    if (t) fclose(t);
    strcat(out, "|env:");
    for (char** e = environ; *e && strlen(out) < sizeof out - 512; e++) { strcat(out, *e); strcat(out, ";"); }
    return out;
}
`,
  },
};

/** Container-level probe for JavaScript without the harness (whose module denylist would mask the container). */
const JS_RAW_PROBE = `
const fs = require("fs");
const out = [];
(async () => {
  try { await fetch("http://1.1.1.1/", { signal: AbortSignal.timeout(2000) }); out.push("net:CONNECTED"); }
  catch { out.push("net:blocked"); }
  const dnsOk = await require("dns").promises.lookup("example.com").then(() => true, () => false);
  out.push(dnsOk ? "dns:RESOLVED" : "dns:blocked");
  const wrote = [];
  for (const p of ["/opt/runner/pwned", "/etc/pwned", "/home/pwned", "/pwned"]) {
    try { fs.writeFileSync(p, "x"); wrote.push(p); } catch {}
  }
  out.push("write:" + (wrote.join(",") || "blocked"));
  fs.writeFileSync("/tmp/work/ok.txt", "x");
  out.push("tmp:ok");
  out.push("env:" + JSON.stringify(process.env));
  process.stdout.write(out.join("|"));
})();
`;

function assertProbe(text: string) {
  assert.match(text, /^net:blocked\|dns:blocked\|write:blocked\|tmp:ok\|env:/, text.slice(0, 300));
  assertNoSecrets(text);
}

before(async () => {
  if (skip) return;
  runner = await import("../server/codeRunner");
  sandbox = await import("../server/dockerRunner");
});

after(() => {
  if (latencies.length === 0) return;
  const sorted = [...latencies].sort((a, b) => a.ms - b.ms);
  const pick = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))].ms;
  console.log(`# docker runner latency over ${sorted.length} submissions: p50 ${pick(0.5)}ms, p90 ${pick(0.9)}ms, max ${pick(1)}ms`);
  const byLanguage = new Map<string, number[]>();
  for (const { label, ms } of latencies) {
    if (!/ (accepted)$/.test(label)) continue;
    const lang = label.split(" ")[0];
    byLanguage.set(lang, [...(byLanguage.get(lang) ?? []), ms]);
  }
  for (const [lang, values] of byLanguage) console.log(`#   ${lang} accepted submission (3 tests): ${values.join(", ")}ms`);
});

describe("docker runner availability", { skip }, () => {
  test("health reports the docker runner as ready", async () => {
    assert.equal(runner.describeRunner(), "docker");
    const health = await runner.runnerHealth();
    assert.equal(health.status, "ready", health.detail);
  });

  test("a missing runner image is reported clearly (health detail + HTTP 503 error)", () => {
    const codeRunnerUrl = pathToFileURL(path.resolve("server/codeRunner.ts")).href;
    const script = `const r = await import(${JSON.stringify(codeRunnerUrl)});
const health = await r.runnerHealth();
let error = "";
try {
  await r.judgeCode("python", "def solve(s):\\n    return s", [{ input: "1", expectedOutput: "1", isHidden: false }], "run");
} catch (e) {
  error = (e instanceof r.RunnerUnavailableError ? "unavailable: " : "other: ") + e.message;
}
console.log(JSON.stringify({ health, error }));`;
    const res = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", script], {
      env: { ...process.env, RUNNER_IMAGE: "placify-runner:missing-test-tag" },
      encoding: "utf8",
      timeout: 60_000,
      windowsHide: true,
    });
    const out = JSON.parse(res.stdout.trim().split("\n").pop() || "{}");
    assert.equal(out.health?.status, "unavailable", res.stdout + res.stderr);
    assert.match(out.health.detail, /runner image "placify-runner:missing-test-tag" was not found.*npm run runner:build/);
    assert.match(out.error, /^unavailable: .*npm run runner:build/);
  });
});

for (const language of ["javascript", "python", "java", "cpp", "c"] as const) {
  const p = PROGRAMS[language];
  const compiled = language === "java" || language === "cpp" || language === "c";

  describe(`docker runner: ${language}`, { skip, concurrency: 4 }, () => {
    test("correct solution is Accepted (all tests, hidden included)", async () => {
      const outcome = await judge("accepted", language, p.ok);
      assert.equal(outcome.status, "Accepted", JSON.stringify(outcome.cases));
      assert.equal(outcome.cases.length, SUM_TESTS.length);
      assert.ok(outcome.cases.every((c) => c.passed && c.status === "Passed"));
      assert.ok(outcome.maxMemoryKb !== null && outcome.maxMemoryKb > 0, "memory usage is reported");
    });

    test("wrong answer", async () => {
      const outcome = await judge("wrong", language, p.wrong);
      assert.equal(outcome.status, "Wrong Answer");
      assert.equal(outcome.cases.length, 1, "submit mode stops at the first failing case");
      assert.equal(outcome.cases[0].actual, "4");
    });

    test("runtime error is classified with a useful message", async () => {
      const outcome = await judge("runtime", language, p.runtime, "run");
      assert.equal(outcome.status, "Runtime Error");
      assert.equal(outcome.cases.length, SUM_TESTS.length, "run mode reports every case");
      assert.match(outcome.cases[0].error, p.runtimePattern);
      assert.ok(!/\/tmp\/(build|src|work)\//.test(outcome.cases[0].error), "sandbox paths are stripped");
    });

    test(`${compiled ? "compile" : "syntax"} error is a Compilation Error`, async () => {
      const outcome = await judge("compile", language, p.compile, "run");
      assert.equal(outcome.status, "Compilation Error");
      assert.equal(outcome.cases.length, 1);
      assert.ok(outcome.cases[0].error.length > 0, "compiler output is shown");
      assert.ok(!/\/tmp\/(build|src|work)\//.test(outcome.cases[0].error), "sandbox paths are stripped");
    });

    test("infinite loop hits the time limit while other submissions keep working", async () => {
      const started = Date.now();
      const [tle, ok] = await Promise.all([judge("tle", language, p.tle, "run"), judge("accepted-during-tle", language, p.ok, "run")]);
      assert.equal(tle.status, "Time Limit Exceeded");
      assert.equal(tle.cases.length, 1, "a timeout stops the batch");
      assert.equal(ok.status, "Accepted");
      assert.ok(Date.now() - started < 20_000, "the time limit is enforced");
    });

    test("network, file-system writes outside /tmp and host secrets are blocked", async () => {
      let text: string;
      if (language === "javascript") {
        const batch = await raw("javascript", JS_RAW_PROBE, ["probe"]);
        text = batch.results[0].stdout;
      } else {
        const outcome = await judge("probe", language, p.probe!, "run", [{ input: "probe", expectedOutput: "", isHidden: false }]);
        assert.equal(outcome.cases[0].status, "Wrong Answer", outcome.cases[0].error);
        text = outcome.cases[0].actual;
        assert.ok(!text.includes("(truncated)"), "the whole probe output is visible");
      }
      assertProbe(text);
    });

    test("fork bomb is contained by the PID limit and cleaned up", async () => {
      const started = Date.now();
      const outcome = await judge("fork-bomb", language, p.forkBomb, "run");
      assert.ok(["Time Limit Exceeded", "Runtime Error"].includes(outcome.status), outcome.status);
      assert.ok(Date.now() - started < 30_000);
      const after = await judge("accepted-after-fork-bomb", language, p.ok, "run");
      assert.equal(after.status, "Accepted");
    });

    test("memory hog is killed (256 MB limit)", async () => {
      const outcome = await judge("memory-hog", language, p.memoryHog, "run", [SUM_TESTS[0]]);
      assert.equal(outcome.status, "Runtime Error", JSON.stringify(outcome.cases[0]).slice(0, 500));
      assert.match(outcome.cases[0].error, /memory|OutOfMemoryError|MemoryError|bad_alloc|killed|aborted/i);
    });

    test("output flood is capped", async () => {
      const flood = await judge("stdout-flood", language, p.outputFlood, "run", [SUM_TESTS[0]]);
      assert.equal(flood.status, "Runtime Error");
      assert.match(flood.cases[0].error, /Output limit exceeded/);
      assert.ok(flood.cases[0].actual.length <= 2100);

      const prints = await judge("print-flood", language, p.printFlood, "run", [SUM_TESTS[0]]);
      assert.ok(["Accepted", "Time Limit Exceeded"].includes(prints.status), prints.status);
      assert.ok(prints.cases[0].error.length <= 2100, "stderr is capped");
    });
  });
}

describe("docker runner: container isolation", { skip }, () => {
  test("JavaScript fork bomb (raw child_process) is contained and nothing survives into the next test", async () => {
    const source = `
const input = require("fs").readFileSync(0, "utf8").trim();
if (input === "bomb") {
  require("child_process").spawn("sh", ["-c", "b(){ b | b & }; b"], { stdio: "ignore", detached: true });
  const end = Date.now() + 1500; while (Date.now() < end) {}
  process.stdout.write("bombed");
} else {
  const procs = require("fs").readdirSync("/proc").filter((d) => /^\\d+$/.test(d));
  process.stdout.write("procs:" + procs.length);
}`;
    const batch = await raw("javascript", source, ["bomb", "check"]);
    assert.equal(batch.results.length, 2);
    assert.equal(batch.results[1].stdout, "procs:2", "only the driver (PID 1) and the program itself may exist");
  });

  test("a test cannot read other tests' inputs, forge results, kill the driver or leave state behind", async () => {
    const hidden = `HIDDEN-${crypto.randomBytes(6).toString("hex")}`;
    const source = `import glob, os, sys, time
data = sys.stdin.read().strip()
out = []
if data == "check":
    files = sorted(p for p in glob.glob("/tmp/**", recursive=True) if p != "/tmp/" and not p.startswith("/tmp/build"))
    out.append("files:" + ",".join(files))
    stash = []
    for p in files:
        if os.path.isfile(p):
            with open(p, errors="replace") as f:
                stash.append(f.read())
    out.append("stash:" + "".join(stash))
    out.append("procs:" + str(len([p for p in os.listdir("/proc") if p.isdigit()])))
else:
    for p in ("/tmp/stash.txt", "/tmp/work/stash.txt"):
        with open(p, "w") as f:
            f.write(data)
    if os.fork() == 0:
        os.setsid()
        if os.fork() == 0:
            time.sleep(60)
        os._exit(0)
    for path in ("/proc/1/fd/0", "/proc/1/environ", "/proc/1/mem"):
        try:
            with open(path, "rb") as f:
                out.append(path + ":READ:" + repr(f.read(1 << 16)))
        except OSError as e:
            out.append(path + ":" + type(e).__name__)
    try:
        os.listdir("/proc/1/fd")
        out.append("fdlist:READ")
    except OSError as e:
        out.append("fdlist:" + type(e).__name__)
    try:
        with open("/proc/1/fd/1", "w") as f:
            f.write('{"protocol":1,"nonce":"forged","results":[]}\\n')
        out.append("forge:WROTE")
    except OSError as e:
        out.append("forge:" + type(e).__name__)
    os.kill(1, 9)
    out.append("uid:%d" % os.getuid())
    with open("/proc/self/status") as f:
        status = dict(line.split(":", 1) for line in f.read().splitlines() if ":" in line)
    out.append("caps:" + status["CapEff"].strip() + " nnp:" + status["NoNewPrivs"].strip() + " seccomp:" + status["Seccomp"].strip())
    for p in ("memory.max", "memory.swap.max", "pids.max", "cpu.max"):
        try:
            with open("/sys/fs/cgroup/" + p) as f:
                out.append(p + "=" + f.read().strip())
        except OSError:
            out.append(p + "=?")
print("|".join(out))
`;
    const batch = await raw("python", source, ["first", hidden, "check"]);
    assert.equal(batch.results.length, 3, "the driver survived kill(1, SIGKILL) and reported every test");
    const first = batch.results[0].stdout;
    assert.ok(!first.includes(hidden), "hidden input readable from another test");
    assert.match(first, /\/proc\/1\/fd\/0:PermissionError/);
    assert.match(first, /\/proc\/1\/environ:PermissionError/);
    assert.match(first, /\/proc\/1\/mem:PermissionError/);
    assert.match(first, /fdlist:PermissionError/);
    assert.match(first, /forge:PermissionError/);
    assert.match(first, /uid:10001/);
    assert.match(first, /caps:0000000000000000 nnp:1 seccomp:2/);
    assert.match(first, /memory\.max=268435456/);
    assert.match(first, /memory\.swap\.max=0/);
    assert.match(first, /pids\.max=64/);
    assert.match(first, /cpu\.max=100000 100000/);
    const check = batch.results[2].stdout.trim();
    assert.equal(check, "files:/tmp/work|stash:|procs:2", "state leaked between tests");
    assert.ok(!check.includes(hidden));
  });

  test("/tmp is fully reset between tests, even after deep nesting and removed permissions", async () => {
    const source = `import os, sys
data = sys.stdin.read().strip()
if data == "mess":
    os.chdir("/tmp/work")
    for _ in range(3000):
        os.mkdir("d")
        os.chdir("d")
    with open("deep.txt", "w") as f:
        f.write("x")
    os.chdir("/tmp/work")
    os.mkdir("locked")
    with open("locked/f", "w") as f:
        f.write("x")
    os.chmod("locked", 0)
    os.chmod("/tmp/work", 0o500)
    os.chmod("/tmp/build", 0o700)
    os.chmod("/tmp/build/main.py", 0o600)
    with open("/tmp/build/main.py", "a") as f:
        f.write("\\nprint('TAMPERED')\\n")
    print("messed")
else:
    print("clean:" + ",".join(sorted(os.listdir("/tmp"))) + ":" + ",".join(os.listdir("/tmp/work")))
`;
    const batch = await raw("python", source, ["mess", "check"]);
    assert.equal(batch.results[0].stdout.trim(), "messed", batch.results[0].stderr);
    assert.equal(batch.results[1].stdout.trim(), "clean:build,work:", batch.results[1].stderr);
  });

  test("the server-side deadline force-kills a container that runs too long", async () => {
    const started = Date.now();
    await assert.rejects(
      sandbox.runInSandbox(
        {
          language: "python",
          source: "import time\ntime.sleep(120)\n",
          inputs: ["x"],
          timeLimitMs: 120_000, // the in-container limit would not fire in time...
          totalLimitMs: 120_000,
          compileLimitMs: 1_000,
          outputLimitBytes: 1024,
          stderrLimitBytes: 1024,
          stopOnError: true,
        },
        { hostDeadlineMs: 4_000 } // ...so the host deadline must `docker kill` it.
      ),
      (err: Error) => err instanceof runner.RunnerFailureError && /did not finish in time/.test(err.message)
    );
    assert.ok(Date.now() - started < 20_000, "the container was not killed at the host deadline");
  });

  test("the server environment is never passed to the docker CLI's containers", async () => {
    const batch = await raw("python", "import os\nprint(repr(dict(os.environ)))\n", ["x"]);
    const text = batch.results[0].stdout;
    assertNoSecrets(text);
    assert.match(text, /'HOME': '\/tmp\/work'/);
  });
});

describe("docker runner: seeded reference solutions", { skip, concurrency: 4 }, () => {
  const ids = [
    "prob-arrays-two-sum",
    "prob-arrays-best-time-to-buy-and-sell-stock",
    "prob-stacks-valid-parentheses",
    "prob-trees-binary-tree-level-order-traversal",
    "prob-graphs-number-of-islands",
    "prob-dp-coin-change",
  ];
  let bank: typeof import("../server/data/problemBank").PROBLEM_BANK = [];

  before(async () => {
    bank = (await import("../server/data/problemBank")).PROBLEM_BANK;
  });

  test("the selected problems exist in the bank", () => {
    const found = ids.filter((id) => bank.some((p) => p.id === id));
    assert.ok(found.length >= 4, `expected most of ${ids.join(", ")} in the problem bank, found ${found.join(", ")}`);
  });

  for (const id of ids) {
    test(`${id}: JavaScript, Python (and Java when present) reference solutions are Accepted`, async (t) => {
      const problem = bank.find((p) => p.id === id);
      if (!problem) return t.skip(`${id} is not in the problem bank any more`);
      const languages = (["javascript", "python", "java", "cpp", "c"] as const).filter((l) => problem.solutions[l]);
      for (const language of languages) {
        const outcome = await judge(`bank ${id}`, language, problem.solutions[language], "submit", problem.testCases);
        assert.equal(outcome.status, "Accepted", `${id} [${language}]: ${JSON.stringify(outcome.cases.find((c) => !c.passed))}`);
        assert.equal(outcome.cases.length, problem.testCases.length);
      }
    });
  }
});

describe("docker runner: cleanup", { skip }, () => {
  test("no sandbox containers are left behind", async () => {
    const deadline = Date.now() + 15_000;
    let left = "";
    while (Date.now() < deadline) {
      const r = spawnSync("docker", ["ps", "-a", "--filter", "label=placify.runner=1", "--format", "{{.Names}}"], {
        encoding: "utf8",
        windowsHide: true,
      });
      left = r.stdout.trim();
      if (!left) break;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    assert.equal(left, "", `leftover containers: ${left}`);
  });
});
