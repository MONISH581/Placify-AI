/**
 * Code runner: executes user solutions against test cases OUTSIDE the server process.
 *
 * Harness contract (all languages): the user's code defines `solve(input)` returning a string.
 * The harness reads stdin, calls solve(), and prints ONLY the return value to stdout (anything the
 * user prints goes to stderr). Trimmed stdout (with \r\n normalised) is compared to expectedOutput.
 *
 * Runners (selected by CODE_RUNNER, see config.ts):
 *  - "judge0": Judge0 CE / RapidAPI; all languages; every test case is a separate submission.
 *  - "docker": self-hosted sandbox (server/dockerRunner.ts + deploy/runner/): one locked-down container per
 *              submission (no network, read-only root fs, memory / CPU / PID limits, non-root, no
 *              capabilities); all languages; compiled once, every test case in a fresh process. The same
 *              harnessed source as for Judge0 is executed; outputs are compared here. No account needed.
 *  - "local":  DEVELOPMENT ONLY. JavaScript runs in a child `node --permission` process (no fs,
 *              child_process, workers or addons), Python in `python -I` with an audit-hook guard.
 *              Both run in a fresh temp dir with a stripped environment, a 3s timeout per test and a
 *              64KB output cap. This is defence-in-depth, NOT a hardened sandbox: use Docker or Judge0 in production.
 *  - "disabled": every run returns 503.
 */

import { spawn, execFile } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { config } from "./config";
import {
  assertDockerRunnerReady,
  checkDockerRunner,
  runInSandbox,
  SANDBOX_MEMORY_MB,
  type SandboxRunResult,
} from "./dockerRunner";
import { RunnerFailureError, RunnerUnavailableError } from "./runnerErrors";

export { RunnerFailureError, RunnerUnavailableError } from "./runnerErrors";

export const LANGUAGES = ["javascript", "python", "java", "cpp", "c"] as const;
export type Language = (typeof LANGUAGES)[number];

export type Verdict = "Accepted" | "Wrong Answer" | "Runtime Error" | "Time Limit Exceeded" | "Compilation Error";
export type CaseStatus = "Passed" | Exclude<Verdict, "Accepted">;

export interface TestCase {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

export interface CaseResult {
  index: number;
  isHidden: boolean;
  passed: boolean;
  status: CaseStatus;
  /** Program output (normalised, truncated for display). */
  actual: string;
  /** Sanitised stderr / compiler output (truncated). */
  error: string;
  timeMs: number;
  memoryKb: number | null;
}

export interface JudgeOutcome {
  status: Verdict;
  cases: CaseResult[];
  totalCases: number;
  maxTimeMs: number;
  maxMemoryKb: number | null;
  runner: RunnerName;
}

type RunnerName = "local" | "judge0" | "docker";

export const TIME_LIMIT_MS = 3000;
const OUTPUT_LIMIT_BYTES = 64 * 1024;
const STDERR_LIMIT_BYTES = 16 * 1024;
const TOTAL_DEADLINE_MS = 30_000;
/** Docker runner: compile budget for Java / C++ / C (javac and g++ run inside the sandbox too). */
const COMPILE_LIMIT_MS = 20_000;
const DISPLAY_LIMIT = 2000;
const COMPILE_ERROR_EXIT = 86;
const MISSING_SOLVE_EXIT = 87;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function normalizeOutput(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

function truncate(text: string, limit = DISPLAY_LIMIT): string {
  return text.length > limit ? `${text.slice(0, limit)}\n... (truncated)` : text;
}

class Semaphore {
  private active = 0;
  private readonly queue: Array<() => void> = [];

  constructor(private readonly max: number, private readonly maxQueue: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active >= this.max) {
      if (this.queue.length >= this.maxQueue) {
        throw new RunnerUnavailableError("The code runner is busy. Please try again in a few seconds.");
      }
      await new Promise<void>((resolve) => this.queue.push(resolve));
    } else {
      this.active++;
    }
    try {
      return await fn();
    } finally {
      const next = this.queue.shift();
      if (next) next();
      else this.active--;
    }
  }
}

const localSlots = new Semaphore(4, 32);
const judge0Slots = new Semaphore(8, 64);
/** Each sandbox container gets 1 CPU and 256 MB, so at most 4 run at once (the rest queue). */
const dockerSlots = new Semaphore(4, 32);

// ---------------------------------------------------------------------------
// Harnesses
// ---------------------------------------------------------------------------

/** JS harness. Written in ES2017 so it also runs on Judge0's Node 12. */
function javascriptHarness(code: string): string {
  return `'use strict';
(function () {
  var vm = require('vm');
  var Module = require('module');
  var denied = ['child_process', 'cluster', 'worker_threads', 'net', 'tls', 'dgram', 'dns', 'http', 'https', 'http2',
    'inspector', 'repl', 'v8', 'vm', 'module', 'wasi', 'trace_events', 'sqlite'];
  function isDenied(id) { return denied.indexOf(String(id).replace(/^node:/, '')) !== -1; }
  function deny(id) { var e = new Error('Module "' + id + '" is not available in the Placify sandbox'); e.code = 'ERR_ACCESS_DENIED'; return e; }
  var originalLoad = Module._load;
  Module._load = function (request) {
    if (isDenied(request)) throw deny(request);
    return originalLoad.apply(this, arguments);
  };
  if (typeof process.getBuiltinModule === 'function') {
    var originalGetBuiltin = process.getBuiltinModule;
    process.getBuiltinModule = function (id) {
      if (isDenied(id)) throw deny(id);
      return originalGetBuiltin.call(process, id);
    };
  }
  ['fetch', 'WebSocket', 'EventSource'].forEach(function (name) {
    try { delete globalThis[name]; } catch (e) { /* ignore */ }
  });
  var writeResult = process.stdout.write.bind(process.stdout);
  var toStderr = function () { console.error.apply(console, arguments); };
  console.log = toStderr; console.info = toStderr; console.debug = toStderr;
  process.stdout.write = function () { return process.stderr.write.apply(process.stderr, arguments); };

  // Report errors without the harness / Node-internal stack frames.
  function report(err) {
    var text = err && err.stack ? String(err.stack) : String(err);
    text = text.split('\\n').filter(function (line) {
      return !/^\\s+at .*(main\\.js|node:|<anonymous>\\)?$)/.test(line) || /solution\\.js/.test(line);
    }).join('\\n');
    process.stderr.write(text + '\\n');
  }

  var source = ${JSON.stringify(code)};
  var input = require('fs').readFileSync(0, 'utf8');
  var script;
  try {
    script = new vm.Script(source, { filename: 'solution.js' });
  } catch (err) {
    report(err);
    process.exit(${COMPILE_ERROR_EXIT});
  }
  globalThis.require = function (id) { return require(id); };
  try {
    script.runInThisContext();
  } catch (err) {
    report(err);
    process.exit(1);
  }
  var solve = vm.runInThisContext('typeof solve === "function" ? solve : undefined');
  if (typeof solve !== 'function') {
    process.stderr.write('solve(input) is not defined. Define: function solve(input) { ... return "answer"; }');
    process.exit(${MISSING_SOLVE_EXIT});
  }
  Promise.resolve()
    .then(function () { return solve(input); })
    .then(function (result) {
      writeResult(result === undefined || result === null ? '' : String(result));
    }, function (err) {
      report(err);
      process.exitCode = 1;
    });
})();
`;
}

/** Python sandbox guard (local runner only). Audit hooks are defence-in-depth, not a security boundary. */
const PYTHON_GUARD = `
def _placify_install_guard():
    import os
    roots = []
    for p in (sys.prefix, sys.base_prefix, sys.exec_prefix, sys.base_exec_prefix, os.getcwd()):
        if p:
            roots.append(os.path.normcase(os.path.realpath(p)))
    roots = tuple(set(roots))
    blocked_events = frozenset((
        "os.system", "os.exec", "os.posix_spawn", "os.spawn", "os.fork", "os.forkpty", "os.kill", "os.killpg",
        "os.startfile", "subprocess.Popen", "_winapi.CreateProcess", "pty.spawn",
        "socket.__new__", "socket.connect", "socket.bind", "socket.getaddrinfo", "socket.sendto",
        "ctypes.dlopen", "ctypes.dlsym", "ctypes.cdata",
        "os.remove", "os.rmdir", "os.rename", "os.mkdir", "os.chmod", "os.chown", "os.link", "os.symlink",
        "os.truncate", "os.putenv", "os.unsetenv", "shutil.rmtree", "shutil.copyfile", "shutil.move",
        "winreg.OpenKey", "winreg.CreateKey", "winreg.ConnectRegistry", "urllib.Request", "webbrowser.open",
        "sqlite3.connect",
    ))
    blocked_modules = frozenset((
        "ctypes", "_ctypes", "subprocess", "_posixsubprocess", "multiprocessing", "_multiprocessing",
        "socket", "_socket", "ssl", "_ssl", "pty", "winreg", "_winreg", "gc", "sqlite3", "_sqlite3",
    ))
    write_flags = os.O_WRONLY | os.O_RDWR | os.O_APPEND | os.O_CREAT | os.O_TRUNC

    def allowed_path(path):
        if isinstance(path, int):
            return True
        try:
            real = os.path.normcase(os.path.realpath(os.fsdecode(path)))
        except Exception:
            return False
        return any(real == r or real.startswith(r + os.sep) for r in roots)

    def hook(event, args):
        if event == "open":
            path = args[0] if len(args) > 0 else None
            mode = args[1] if len(args) > 1 else None
            flags = args[2] if len(args) > 2 else None
            writing = (isinstance(mode, str) and any(c in mode for c in "wax+")) or (
                isinstance(flags, int) and (flags & write_flags) != 0)
            if writing or not allowed_path(path):
                raise PermissionError("File access is not allowed in the Placify sandbox")
        elif event in ("os.listdir", "os.scandir"):
            if args and not allowed_path(args[0] if args[0] is not None else "."):
                raise PermissionError("Directory listing is not allowed in the Placify sandbox")
        elif event == "import":
            name = str(args[0]).split(".")[0] if args else ""
            if name in blocked_modules:
                raise ImportError("Module '%s' is not available in the Placify sandbox" % name)
        elif event in blocked_events:
            raise PermissionError("'%s' is not allowed in the Placify sandbox" % event)

    sys.addaudithook(hook)
`;

function pythonHarness(code: string, withGuard: boolean): string {
  return `import linecache
import sys
import traceback
${withGuard ? PYTHON_GUARD : "def _placify_install_guard():\n    pass\n"}

def _placify_report(exc):
    frames = [f for f in traceback.extract_tb(exc.__traceback__) if f.filename == "solution.py"]
    lines = (["Traceback (most recent call last):\\n"] + traceback.format_list(frames)) if frames else []
    lines += traceback.format_exception_only(type(exc), exc)
    sys.stderr.write("".join(lines))


def _placify_main():
    for stream in (sys.stdin, sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass
    source = ${JSON.stringify(code)}
    try:
        compiled = compile(source, "solution.py", "exec")
    except (SyntaxError, ValueError) as exc:
        sys.stderr.write("".join(traceback.format_exception_only(type(exc), exc)))
        sys.exit(${COMPILE_ERROR_EXIT})
    linecache.cache["solution.py"] = (len(source), None, source.splitlines(True), "solution.py")
    data = sys.stdin.read()
    real_stdout = sys.stdout
    sys.stdout = sys.stderr
    _placify_install_guard()
    namespace = {"__name__": "solution", "__builtins__": __builtins__}
    try:
        exec(compiled, namespace)
        solve = namespace.get("solve")
        if not callable(solve):
            sys.stderr.write("solve(input_str) is not defined. Define: def solve(input_str): ... return 'answer'")
            sys.exit(${MISSING_SOLVE_EXIT})
        result = solve(data)
    except SystemExit:
        raise
    except BaseException as exc:
        _placify_report(exc)
        sys.exit(1)
    real_stdout.write("" if result is None else str(result))
    real_stdout.flush()

_placify_main()
`;
}

function javaHarness(code: string): string {
  const userCode = code.replace(/\bpublic\s+(final\s+)?class\s+Solution\b/, (_m, fin) => `${fin ?? ""}class Solution`);
  return `${userCode}

public class Main {
    public static void main(String[] args) throws Exception {
        byte[] placifyBytes = System.in.readAllBytes();
        String placifyInput = new String(placifyBytes, java.nio.charset.StandardCharsets.UTF_8);
        java.io.PrintStream placifyOut = new java.io.PrintStream(new java.io.FileOutputStream(java.io.FileDescriptor.out), true, "UTF-8");
        System.setOut(System.err);
        String placifyResult = Solution.solve(placifyInput);
        placifyOut.print(placifyResult == null ? "" : placifyResult);
        placifyOut.flush();
    }
}
`;
}

function cppHarness(code: string): string {
  return `#include <bits/stdc++.h>
using namespace std;

${code}

int main() {
    std::ios_base::sync_with_stdio(false);
    std::string placify_input((std::istreambuf_iterator<char>(std::cin)), std::istreambuf_iterator<char>());
    std::streambuf* placify_out = std::cout.rdbuf(std::cerr.rdbuf());
    std::string placify_result = solve(placify_input);
    std::cout.rdbuf(placify_out);
    std::cout << placify_result;
    std::cout.flush();
    return 0;
}
`;
}

function cHarness(code: string): string {
  return `#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>

${code}

int main(void) {
    size_t placify_cap = 1 << 16, placify_len = 0;
    int placify_ch;
    char *placify_buf = (char*) malloc(placify_cap);
    if (!placify_buf) return 1;
    while ((placify_ch = getchar()) != EOF) {
        if (placify_len + 1 >= placify_cap) {
            char *placify_next;
            placify_cap *= 2;
            placify_next = (char*) realloc(placify_buf, placify_cap);
            if (!placify_next) { free(placify_buf); return 1; }
            placify_buf = placify_next;
        }
        placify_buf[placify_len++] = (char) placify_ch;
    }
    placify_buf[placify_len] = '\\0';
    {
        char *placify_result = solve(placify_buf);
        fputs(placify_result ? placify_result : "", stdout);
    }
    return 0;
}
`;
}

// ---------------------------------------------------------------------------
// Execution primitives
// ---------------------------------------------------------------------------

type ExecKind = "ok" | "compile_error" | "runtime_error" | "timeout" | "output_limit";

interface ExecResult {
  kind: ExecKind;
  stdout: string;
  stderr: string;
  timeMs: number;
  memoryKb: number | null;
}

function killTree(pid: number | undefined, child: ReturnType<typeof spawn>) {
  if (!pid) return;
  if (process.platform === "win32") {
    try {
      const killer = spawn("taskkill", ["/pid", String(pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
      killer.on("error", () => child.kill());
    } catch {
      child.kill();
    }
  } else {
    try {
      process.kill(-pid, "SIGKILL");
    } catch {
      child.kill("SIGKILL");
    }
  }
}

function spawnLimited(
  command: string,
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv; input: string; timeoutMs: number }
): Promise<ExecResult & { exitCode: number | null; spawnError?: Error }> {
  return new Promise((resolve) => {
    const started = process.hrtime.bigint();
    const elapsed = () => Number((process.hrtime.bigint() - started) / 1_000_000n);
    let settled = false;
    let reason: "timeout" | "output_limit" | null = null;
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;

    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
      detached: process.platform !== "win32",
    });

    const finish = (exitCode: number | null, spawnError?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(hardStop);
      const out = Buffer.concat(stdout).toString("utf8");
      const err = Buffer.concat(stderr).toString("utf8");
      let kind: ExecKind = "ok";
      if (reason === "timeout") kind = "timeout";
      else if (reason === "output_limit") kind = "output_limit";
      else if (exitCode === COMPILE_ERROR_EXIT) kind = "compile_error";
      else if (exitCode !== 0) kind = "runtime_error";
      resolve({ kind, stdout: out, stderr: err, timeMs: elapsed(), memoryKb: null, exitCode, spawnError });
    };

    const stop = (why: "timeout" | "output_limit") => {
      if (reason) return;
      reason = why;
      killTree(child.pid, child);
    };

    const timer = setTimeout(() => stop("timeout"), options.timeoutMs);
    // Safety net: resolve even if the process tree refuses to close its pipes.
    const hardStop = setTimeout(() => finish(null), options.timeoutMs + 3000);

    child.stdout?.on("data", (chunk: Buffer) => {
      stdoutBytes += chunk.length;
      if (stdoutBytes > OUTPUT_LIMIT_BYTES) {
        stop("output_limit");
        return;
      }
      stdout.push(chunk);
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      if (stderrBytes < STDERR_LIMIT_BYTES) stderr.push(chunk.subarray(0, STDERR_LIMIT_BYTES - stderrBytes));
      stderrBytes += chunk.length;
    });
    child.stdin?.on("error", () => {
      /* EPIPE when the program exits without reading stdin */
    });
    child.on("error", (err) => finish(null, err));
    child.on("close", (code) => finish(code));
    child.stdin?.end(options.input);
  });
}

// ---------------------------------------------------------------------------
// Local runner (development only)
// ---------------------------------------------------------------------------

interface PythonCommand {
  command: string;
  prefixArgs: string[];
}

let pythonLookup: Promise<PythonCommand | null> | null = null;

function probePython(candidate: PythonCommand): Promise<boolean> {
  return new Promise((resolve) => {
    execFile(
      candidate.command,
      [...candidate.prefixArgs, "-c", "import sys; print('%d.%d' % sys.version_info[:2])"],
      { timeout: 8000, windowsHide: true },
      (err, stdout) => {
        if (err) return resolve(false);
        const match = /^3\.(\d+)/.exec(String(stdout).trim());
        resolve(Boolean(match && Number(match[1]) >= 8));
      }
    );
  });
}

function findPython(): Promise<PythonCommand | null> {
  if (!pythonLookup) {
    pythonLookup = (async () => {
      const candidates: PythonCommand[] = config.pythonBin
        ? [{ command: config.pythonBin, prefixArgs: [] }]
        : process.platform === "win32"
          ? [
              { command: "python", prefixArgs: [] },
              { command: "py", prefixArgs: ["-3"] },
            ]
          : [
              { command: "python3", prefixArgs: [] },
              { command: "python", prefixArgs: [] },
            ];
      for (const candidate of candidates) {
        if (await probePython(candidate)) return candidate;
      }
      console.warn("[code-runner] No Python 3.8+ interpreter found; Python submissions are unavailable on the local runner.");
      return null;
    })();
  }
  return pythonLookup;
}

function sandboxEnv(dir: string): NodeJS.ProcessEnv {
  // A fresh, minimal environment: secrets such as JWT_SECRET / INTERNAL_API_KEY are never inherited.
  const env: NodeJS.ProcessEnv = {
    TEMP: dir,
    TMP: dir,
    TMPDIR: dir,
    HOME: dir,
    USERPROFILE: dir,
    LANG: "C.UTF-8",
    PATH: process.env.PATH || process.env.Path || "",
  };
  if (process.platform === "win32") {
    env.SYSTEMROOT = process.env.SYSTEMROOT || process.env.SystemRoot || "C:\\Windows";
    env.WINDIR = process.env.WINDIR || env.SYSTEMROOT;
  }
  return env;
}

function sanitizeStderr(text: string, dir: string): string {
  let out = text.replace(/\r\n?/g, "\n");
  const variants = new Set([dir, dir.replace(/\\/g, "/"), dir.replace(/\//g, "\\")]);
  for (const v of variants) {
    if (v) out = out.split(v + path.sep).join("").split(v + "/").join("").split(v).join("");
  }
  return truncate(out.trim());
}

async function runLocal(
  language: Language,
  code: string,
  tests: TestCase[],
  mode: "run" | "submit"
): Promise<JudgeOutcome> {
  if (language !== "javascript" && language !== "python") {
    throw new RunnerUnavailableError(
      `${languageLabel(language)} is not supported by the local development runner. Use the Docker runner (CODE_RUNNER=docker) or Judge0 (JUDGE0_API_URL) to enable Java, C++ and C.`
    );
  }
  let command: string;
  let baseArgs: string[];
  let fileName: string;
  let source: string;
  if (language === "javascript") {
    command = process.execPath;
    baseArgs = ["--permission", "--max-old-space-size=128"];
    fileName = "main.js";
    source = javascriptHarness(code);
  } else {
    const python = await findPython();
    if (!python) {
      throw new RunnerUnavailableError("Python 3.8+ was not found on the server, so Python submissions cannot run. Set PYTHON_BIN or configure Judge0.");
    }
    command = python.command;
    baseArgs = [...python.prefixArgs, "-I", "-B", "-X", "utf8"];
    fileName = "main.py";
    source = pythonHarness(code, true);
  }

  return localSlots.run(async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "placify-run-"));
    try {
      await fs.writeFile(path.join(dir, fileName), source, "utf8");
      const env = sandboxEnv(dir);
      return await runCases(tests, mode, "local", async (input, remainingMs) => {
        const result = await spawnLimited(command, [...baseArgs, fileName], {
          cwd: dir,
          env,
          input,
          timeoutMs: Math.min(TIME_LIMIT_MS, remainingMs),
        });
        if (result.spawnError) {
          console.error(`[code-runner] failed to start ${language} process: ${result.spawnError.message}`);
          throw new RunnerFailureError("The code runner could not start the program.");
        }
        return { ...result, stderr: sanitizeStderr(result.stderr, dir) };
      });
    } finally {
      await fs.rm(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }).catch(() => undefined);
    }
  });
}

// ---------------------------------------------------------------------------
// Judge0 runner
// ---------------------------------------------------------------------------

const JUDGE0_LANGUAGE_IDS: Record<Language, number> = {
  javascript: 63, // Node.js 12
  python: 71, // Python 3.8
  java: 62, // OpenJDK 13
  cpp: 54, // GCC 9.2
  c: 50, // GCC 9.2
};

const JUDGE0_FIELDS = "token,stdout,stderr,compile_output,message,status,time,memory";
const JUDGE0_CALL_TIMEOUT_MS = 10_000;

interface Judge0Response {
  token?: string;
  stdout?: string | null;
  stderr?: string | null;
  compile_output?: string | null;
  message?: string | null;
  status?: { id: number; description?: string };
  time?: string | null;
  memory?: number | null;
}

function b64(text: string) {
  return Buffer.from(text, "utf8").toString("base64");
}

function unb64(text: string | null | undefined) {
  return text ? Buffer.from(text, "base64").toString("utf8") : "";
}

function judge0Headers(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (config.judge0.apiKey) headers["X-RapidAPI-Key"] = config.judge0.apiKey;
  if (config.judge0.apiHost) headers["X-RapidAPI-Host"] = config.judge0.apiHost;
  return headers;
}

async function judge0Fetch(url: string, init: RequestInit): Promise<Judge0Response> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, headers: judge0Headers(), signal: AbortSignal.timeout(JUDGE0_CALL_TIMEOUT_MS) });
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    console.error(`[code-runner] Judge0 request failed: ${name === "TimeoutError" ? "timeout" : String(err)}`);
    throw new RunnerFailureError("The Judge0 code runner did not respond. Please try again later.");
  }
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error(`[code-runner] Judge0 HTTP ${response.status}: ${body.slice(0, 300)}`);
    throw new RunnerFailureError(`The Judge0 code runner returned HTTP ${response.status}.`);
  }
  return (await response.json()) as Judge0Response;
}

function harnessFor(language: Language, code: string, local: boolean): string {
  switch (language) {
    case "javascript":
      return javascriptHarness(code);
    case "python":
      return pythonHarness(code, local);
    case "java":
      return javaHarness(code);
    case "cpp":
      return cppHarness(code);
    case "c":
      return cHarness(code);
  }
}

async function judge0Execute(language: Language, source: string, input: string): Promise<ExecResult> {
  const base = config.judge0.url;
  let data = await judge0Fetch(`${base}/submissions?base64_encoded=true&wait=true&fields=${JUDGE0_FIELDS}`, {
    method: "POST",
    body: JSON.stringify({
      source_code: b64(source),
      language_id: JUDGE0_LANGUAGE_IDS[language],
      stdin: b64(input),
      cpu_time_limit: TIME_LIMIT_MS / 1000,
      wall_time_limit: (TIME_LIMIT_MS / 1000) * 2,
      memory_limit: 256_000,
    }),
  });

  // Some Judge0 deployments ignore wait=true; poll until the submission leaves the queue.
  const deadline = Date.now() + JUDGE0_CALL_TIMEOUT_MS;
  while (data.status && (data.status.id === 1 || data.status.id === 2)) {
    if (!data.token || Date.now() > deadline) {
      throw new RunnerFailureError("The Judge0 code runner did not finish in time. Please try again later.");
    }
    await new Promise((r) => setTimeout(r, 500));
    data = await judge0Fetch(`${base}/submissions/${encodeURIComponent(data.token)}?base64_encoded=true&fields=${JUDGE0_FIELDS}`, {
      method: "GET",
    });
  }

  const statusId = data.status?.id ?? 13;
  const stdout = unb64(data.stdout);
  const stderr = [unb64(data.compile_output), unb64(data.stderr), unb64(data.message)].filter(Boolean).join("\n");
  const timeMs = data.time ? Math.round(Number.parseFloat(data.time) * 1000) : 0;
  const memoryKb = typeof data.memory === "number" ? data.memory : null;
  let kind: ExecKind;
  if (statusId === 3 || statusId === 4) kind = "ok";
  else if (statusId === 5) kind = "timeout";
  else if (statusId === 6) kind = "compile_error";
  else if (statusId >= 7 && statusId <= 12) kind = "runtime_error";
  else {
    console.error(`[code-runner] Judge0 status ${statusId} (${data.status?.description ?? "unknown"})`);
    throw new RunnerFailureError("The Judge0 code runner reported an internal error. Please try again later.");
  }
  // Our harness exits with a dedicated code when user code fails to compile (JS/Python).
  if (kind === "runtime_error" && /exit(ed)? with (status|code) 86|status 86/i.test(unb64(data.message))) {
    kind = "compile_error";
  }
  return { kind, stdout: Buffer.byteLength(stdout) > OUTPUT_LIMIT_BYTES ? stdout.slice(0, OUTPUT_LIMIT_BYTES) : stdout, stderr: truncate(stderr.trim()), timeMs, memoryKb };
}

async function runJudge0(language: Language, code: string, tests: TestCase[], mode: "run" | "submit"): Promise<JudgeOutcome> {
  const source = harnessFor(language, code, false);
  return judge0Slots.run(() => runCases(tests, mode, "judge0", (input) => judge0Execute(language, source, input)));
}

// ---------------------------------------------------------------------------
// Docker sandbox runner
// ---------------------------------------------------------------------------

const SIGNAL_NOTES: Record<string, string> = {
  SIGSEGV: "Segmentation fault (invalid memory access or stack overflow).",
  SIGABRT: "The program aborted.",
  SIGFPE: "Arithmetic error (for example an integer division by zero).",
  SIGBUS: "Bus error (invalid memory access).",
  SIGILL: "Illegal instruction.",
  SIGXFSZ: "File size limit exceeded.",
  SIGKILL: "The program was killed.",
};

function sanitizeSandboxText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/\/tmp\/(?:build|src|work)\//g, "")
    .trim();
}

function sandboxExecResult(language: Language, r: SandboxRunResult, budgetNote: boolean): ExecResult {
  let kind: ExecKind;
  let note = "";
  if (r.timedOut || r.signal === "SIGXCPU") {
    kind = "timeout";
    if (budgetNote) note = "Total execution time limit exceeded.";
  } else if (r.outputLimit) {
    kind = "output_limit";
  } else if (r.exitCode === 0) {
    kind = "ok";
  } else if (r.exitCode === COMPILE_ERROR_EXIT && (language === "javascript" || language === "python")) {
    kind = "compile_error"; // the JS / Python harness reports syntax errors with this exit code
  } else {
    if (r.exitCode === 127 && r.stderr.startsWith("sandbox: cannot start")) {
      console.error(`[code-runner] ${r.stderr.trim()}`);
      throw new RunnerFailureError("The code runner could not start the program.");
    }
    kind = "runtime_error";
    if (r.oomKilled) note = `Memory limit exceeded (${SANDBOX_MEMORY_MB} MB): the program was killed.`;
    else if (/JavaScript heap out of memory/.test(r.stderr)) note = "Memory limit exceeded (JavaScript heap).";
    else if (r.signal) note = SIGNAL_NOTES[r.signal] ?? `The program was terminated by ${r.signal}.`;
  }
  // Truncate the program's stderr first so the explanatory note is always visible.
  const stderr = [truncate(sanitizeSandboxText(r.stderr)), note].filter(Boolean).join("\n");
  return {
    kind,
    stdout: r.stdout,
    stderr,
    timeMs: r.timeMs,
    memoryKb: typeof r.memoryKb === "number" ? r.memoryKb : null,
  };
}

async function runDocker(language: Language, code: string, tests: TestCase[], mode: "run" | "submit"): Promise<JudgeOutcome> {
  await assertDockerRunnerReady();
  // Same harnessed program as for Judge0: the container itself is the security boundary.
  const source = harnessFor(language, code, false);
  return dockerSlots.run(async () => {
    const batch = await runInSandbox({
      language,
      source,
      inputs: tests.map((t) => t.input),
      timeLimitMs: TIME_LIMIT_MS,
      totalLimitMs: TOTAL_DEADLINE_MS,
      compileLimitMs: COMPILE_LIMIT_MS,
      outputLimitBytes: OUTPUT_LIMIT_BYTES,
      stderrLimitBytes: STDERR_LIMIT_BYTES,
      stopOnError: mode === "submit",
    });
    return runCases(tests, mode, "docker", async (_input, _remainingMs, index) => {
      if (!batch.compile.ok) {
        return {
          kind: "compile_error",
          stdout: "",
          stderr: truncate(sanitizeSandboxText(batch.compile.output) || "The code could not be compiled."),
          timeMs: batch.compile.timeMs,
          memoryKb: null,
        };
      }
      const result = batch.results[index];
      if (!result) {
        if (batch.budgetExceeded) {
          return { kind: "timeout", stdout: "", stderr: "Total execution time limit exceeded.", timeMs: 0, memoryKb: null };
        }
        throw new RunnerFailureError("The code runner returned an incomplete result. Please try again later.");
      }
      const lastRun = index === batch.results.length - 1;
      return sandboxExecResult(language, result, batch.budgetExceeded && lastRun);
    });
  });
}

// ---------------------------------------------------------------------------
// Shared test loop
// ---------------------------------------------------------------------------

async function runCases(
  tests: TestCase[],
  mode: "run" | "submit",
  runner: RunnerName,
  execute: (input: string, remainingMs: number, index: number) => Promise<ExecResult>
): Promise<JudgeOutcome> {
  const cases: CaseResult[] = [];
  const started = Date.now();
  let verdict: Verdict = "Accepted";
  let maxTimeMs = 0;
  let maxMemoryKb: number | null = null;

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    const remaining = TOTAL_DEADLINE_MS - (Date.now() - started);
    let status: CaseStatus;
    let actual = "";
    let error = "";
    let timeMs = 0;
    let memoryKb: number | null = null;

    if (remaining <= 0) {
      status = "Time Limit Exceeded";
      error = "Total execution time limit exceeded.";
    } else {
      const exec = await execute(test.input, remaining, i);
      timeMs = exec.timeMs;
      memoryKb = exec.memoryKb;
      actual = normalizeOutput(exec.stdout);
      error = exec.stderr;
      switch (exec.kind) {
        case "ok":
          status = actual === normalizeOutput(test.expectedOutput) ? "Passed" : "Wrong Answer";
          break;
        case "timeout":
          status = "Time Limit Exceeded";
          break;
        case "output_limit":
          status = "Runtime Error";
          error = `Output limit exceeded (${OUTPUT_LIMIT_BYTES / 1024}KB).`;
          break;
        case "compile_error":
          status = "Compilation Error";
          break;
        default:
          status = "Runtime Error";
      }
    }

    maxTimeMs = Math.max(maxTimeMs, timeMs);
    if (memoryKb !== null) maxMemoryKb = Math.max(maxMemoryKb ?? 0, memoryKb);
    cases.push({
      index: i,
      isHidden: test.isHidden,
      passed: status === "Passed",
      status,
      actual: truncate(actual),
      error,
      timeMs,
      memoryKb,
    });

    if (status !== "Passed") {
      if (verdict === "Accepted") verdict = status;
      const fatal = status === "Compilation Error" || status === "Time Limit Exceeded";
      if (mode === "submit" || fatal) break;
    }
  }

  return { status: verdict, cases, totalCases: tests.length, maxTimeMs, maxMemoryKb, runner };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function languageLabel(language: Language): string {
  return { javascript: "JavaScript", python: "Python", java: "Java", cpp: "C++", c: "C" }[language];
}

export function describeRunner(): string {
  return config.codeRunner;
}

export interface RunnerHealth {
  /** ready: can execute code; configured: Judge0 (not probed); unavailable: docker / image missing; disabled. */
  status: "ready" | "configured" | "unavailable" | "disabled";
  detail?: string;
}

/** Runner availability for /api/health and the startup log (the docker check is cached). */
export async function runnerHealth(): Promise<RunnerHealth> {
  switch (config.codeRunner) {
    case "docker":
      return checkDockerRunner();
    case "judge0":
      return { status: "configured" };
    case "local":
      return { status: "ready" };
    default:
      return { status: "disabled" };
  }
}

/**
 * Runs `code` against `tests`. In "submit" mode it stops at the first failing case;
 * in "run" mode it reports every case (stopping only on compile errors / timeouts).
 */
export async function judgeCode(language: Language, code: string, tests: TestCase[], mode: "run" | "submit"): Promise<JudgeOutcome> {
  if (tests.length === 0) {
    throw new Error("judgeCode requires at least one test case");
  }
  switch (config.codeRunner) {
    case "judge0":
      return runJudge0(language, code, tests, mode);
    case "docker":
      return runDocker(language, code, tests, mode);
    case "local":
      return runLocal(language, code, tests, mode);
    default:
      throw new RunnerUnavailableError(
        "Code execution is disabled on this server. Configure the Docker runner (CODE_RUNNER=docker) or Judge0 (JUDGE0_API_URL) to enable submissions."
      );
  }
}
