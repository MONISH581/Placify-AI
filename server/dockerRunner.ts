/**
 * Docker sandbox backend for CODE_RUNNER=docker (no third-party account needed).
 *
 * Every submission runs in its own short-lived container of RUNNER_IMAGE (default placify-runner:1, built from
 * deploy/runner with `npm run runner:build`). The job (harnessed source + test INPUTS, never the expected
 * outputs) is streamed to the container's stdin; the in-container driver (deploy/runner/driver.py) compiles
 * once, runs each test in a fresh process with a per-test timeout and prints one JSON result document.
 * Output comparison stays in server/codeRunner.ts, exactly as for the other runners.
 *
 * The job travels over stdin rather than a bind mount on purpose: a mounted job file would stay readable by
 * the user program for the whole run (letting test 1 read - and print - every hidden input), and bind mounts
 * need host paths, which break when this server itself runs in a container next to the Docker socket.
 * No temporary files are created on the host.
 *
 * Container hardening (see dockerRunArgs): no network (and no DNS server), read-only root file system,
 * 64 MB /tmp tmpfs, 256 MB RAM with no swap, 1 CPU, 64 PIDs, all capabilities dropped, no-new-privileges,
 * non-root user, no SysV / POSIX IPC and no /dev/shm, no core dumps. Nothing from the server environment is
 * passed in. The server enforces an overall deadline and force-kills the container by its unique name; the
 * driver also enforces its own budgets, so an orphaned container (e.g. after a server crash) exits on its own.
 */

import { execFile, spawn } from "child_process";
import crypto from "crypto";
import { config } from "./config";
import { RunnerFailureError, RunnerUnavailableError } from "./runnerErrors";

export const DOCKER_PROTOCOL = 1;
export const SANDBOX_USER = "10001:10001";
export const SANDBOX_MEMORY_MB = 256;

const MAX_RESULT_BYTES = 32 * 1024 * 1024;
const MAX_DOCKER_STDERR = 8 * 1024;
/** Container start-up + per-test bookkeeping allowance on top of the driver's own compile/test budgets. */
const HOST_DEADLINE_MARGIN_MS = 20_000;
const DOCKER_CLI_TIMEOUT_MS = 20_000;
const READY_TTL_MS = 60_000;
const UNAVAILABLE_TTL_MS = 5_000;

export type SandboxLanguage = "javascript" | "python" | "java" | "cpp" | "c";

export interface SandboxJob {
  language: SandboxLanguage;
  /** Complete program (user code already wrapped in the language harness). */
  source: string;
  inputs: string[];
  timeLimitMs: number;
  totalLimitMs: number;
  compileLimitMs: number;
  outputLimitBytes: number;
  stderrLimitBytes: number;
  /** Stop after the first test that exits abnormally (submit mode). Timeouts always stop the batch. */
  stopOnError: boolean;
}

export interface SandboxRunResult {
  exitCode: number | null;
  signal: string | null;
  timedOut: boolean;
  outputLimit: boolean;
  oomKilled: boolean;
  stdout: string;
  stderr: string;
  timeMs: number;
  memoryKb: number | null;
}

export interface SandboxBatchResult {
  compile: { ok: boolean; output: string; timeMs: number; timedOut: boolean };
  results: SandboxRunResult[];
  budgetExceeded: boolean;
  /** Host-side wall time of the whole `docker run`, including container start-up. */
  wallMs: number;
}

export interface DockerRunnerStatus {
  status: "ready" | "unavailable";
  /** Human-readable reason when unavailable (operator-facing; may mention docker / the image). */
  detail?: string;
}

// ---------------------------------------------------------------------------
// docker CLI plumbing
// ---------------------------------------------------------------------------

/**
 * Environment for the docker CLI process. The CLI never forwards its environment into containers (we pass no
 * -e / --env-file), but secrets are stripped anyway so they cannot end up in a container by accident.
 */
function dockerCliEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (/SECRET|PASSWORD|TOKEN|API_KEY|_KEY$|DATABASE_URL|JUDGE0|GEMINI/i.test(key) && !/^DOCKER_/i.test(key)) continue;
    env[key] = value;
  }
  return env;
}

/** `docker run` arguments (everything between `run` and the image name). */
export function dockerRunArgs(containerName: string): string[] {
  return [
    "--rm",
    "--interactive", // the job document is streamed on stdin
    "--name", containerName,
    "--label", "placify.runner=1",
    "--pull", "never",
    "--network", "none",
    "--read-only",
    "--tmpfs", "/tmp:rw,exec,nosuid,nodev,size=64m",
    "--memory", `${SANDBOX_MEMORY_MB}m`,
    "--memory-swap", `${SANDBOX_MEMORY_MB}m`,
    "--cpus", "1",
    "--pids-limit", "64",
    "--cap-drop", "ALL",
    "--security-opt", "no-new-privileges",
    "--user", SANDBOX_USER,
    "--ipc", "none", // private IPC namespace without /dev/shm ...
    "--sysctl", "kernel.shmmni=0", // ... and without SysV shared memory,
    "--sysctl", "kernel.msgmni=0", // message queues,
    "--sysctl", "kernel.sem=0 0 0 0", // semaphores
    "--sysctl", "fs.mqueue.queues_max=0", // and POSIX message queues (no state can survive between tests)
    // No DNS server (fail fast instead of waiting 5s for an unreachable resolver).
    "--dns", "127.0.0.1",
    "--dns-option", "timeout:1",
    "--dns-option", "attempts:1",
    // 1, not 0: a piped kernel.core_pattern (WSL2, systemd-coredump) ignores 0 but aborts the dump at 1.
    "--ulimit", "core=1:1",
    "--ulimit", "nofile=1024:1024",
    "--oom-score-adj", "500",
    "--hostname", "sandbox",
    "--log-driver", "none",
    "--workdir", "/tmp",
  ];
}

interface CliResult {
  code: number | null;
  stdout: string;
  stderr: string;
  /** errno code when the CLI could not be started at all (e.g. ENOENT). */
  spawnError?: string;
  timedOut?: boolean;
}

function dockerCli(args: string[], timeoutMs = DOCKER_CLI_TIMEOUT_MS): Promise<CliResult> {
  return new Promise((resolve) => {
    execFile(
      "docker",
      args,
      { env: dockerCliEnv(), timeout: timeoutMs, windowsHide: true, maxBuffer: 1024 * 1024 },
      (error, stdout, stderr) => {
        const out = { stdout: String(stdout), stderr: String(stderr) };
        if (!error) return resolve({ code: 0, ...out });
        if (typeof error.code === "number") return resolve({ code: error.code, ...out });
        resolve({
          code: null,
          ...out,
          spawnError: typeof error.code === "string" ? error.code : undefined,
          timedOut: error.killed === true,
        });
      }
    );
  });
}

function firstLine(text: string): string {
  return (
    text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find(Boolean) ?? ""
  ).slice(0, 300);
}

function describeCliFailure(result: CliResult): string {
  if (result.spawnError === "ENOENT") {
    return "the docker CLI was not found in PATH. Install Docker Engine / Docker Desktop, or unset CODE_RUNNER=docker.";
  }
  if (result.timedOut) return "docker did not respond in time. Is the Docker daemon running?";
  const message = firstLine(result.stderr) || `docker exited with code ${result.code}`;
  if (/no such image|unable to find image/i.test(message)) {
    return config.runnerImage === "placify-runner:1"
      ? `the runner image "${config.runnerImage}" was not found. Build it with \`npm run runner:build\` (docker build -t placify-runner:1 deploy/runner).`
      : `the runner image "${config.runnerImage}" was not found. Build it with \`docker build -t ${config.runnerImage} deploy/runner\` (\`npm run runner:build\` builds the default placify-runner:1) or pull it from your registry.`;
  }
  if (/cannot connect|error during connect|is the docker daemon running|docker\.sock|dockerDesktopLinuxEngine|docker_engine/i.test(message)) {
    return `the Docker daemon is not reachable (${message}). Start Docker and try again.`;
  }
  return message;
}

/** RunnerFailureError carrying an operator-facing reason (logged; only shown to users outside production). */
function failure(message: string, detail: string): RunnerFailureError {
  return Object.assign(new RunnerFailureError(message), { detail });
}

// ---------------------------------------------------------------------------
// Running a batch
// ---------------------------------------------------------------------------

function killContainer(name: string): Promise<void> {
  return dockerCli(["kill", name], 15_000).then(() => undefined);
}

/**
 * Runs one job in a fresh container. Throws RunnerUnavailableError when docker / the image is missing and
 * RunnerFailureError for any other infrastructure problem. Never returns a verdict it did not observe.
 */
export function runInSandbox(job: SandboxJob, options: { hostDeadlineMs?: number } = {}): Promise<SandboxBatchResult> {
  const name = `placify-run-${crypto.randomBytes(8).toString("hex")}`;
  const nonce = crypto.randomBytes(16).toString("hex");
  const args = ["run", ...dockerRunArgs(name), config.runnerImage];
  const hostDeadlineMs = options.hostDeadlineMs ?? job.compileLimitMs + job.totalLimitMs + HOST_DEADLINE_MARGIN_MS;
  const started = Date.now();

  return new Promise<SandboxBatchResult>((resolve, reject) => {
    let settled = false;
    let hostKilled = false;
    let stdoutBytes = 0;
    let overflow = false;
    const stdout: Buffer[] = [];
    let stderr = "";

    const child = spawn("docker", args, { env: dockerCliEnv(), stdio: ["pipe", "pipe", "pipe"], windowsHide: true });

    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      clearTimeout(hardStop);
      fn();
    };

    const forceStop = (reason: "deadline" | "overflow") => {
      if (hostKilled) return;
      hostKilled = true;
      if (reason === "deadline") console.error(`[code-runner] container ${name} exceeded the ${hostDeadlineMs}ms deadline; killing it`);
      void killContainer(name).finally(() => {
        // The CLI exits once the container is gone; make sure it does even if the daemon misbehaves.
        setTimeout(() => child.kill("SIGKILL"), 5_000).unref();
      });
    };

    const deadline = setTimeout(() => forceStop("deadline"), hostDeadlineMs);
    // Last resort: settle even if neither the container nor the CLI ever exit.
    const hardStop = setTimeout(() => {
      child.kill("SIGKILL");
      settle(() => reject(new RunnerFailureError("The code runner did not finish in time. Please try again later.")));
    }, hostDeadlineMs + 30_000);

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutBytes += chunk.length;
      if (stdoutBytes > MAX_RESULT_BYTES) {
        overflow = true;
        forceStop("overflow");
        return;
      }
      stdout.push(chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      if (stderr.length < MAX_DOCKER_STDERR) stderr += chunk.toString("utf8").slice(0, MAX_DOCKER_STDERR - stderr.length);
    });
    child.stdin.on("error", () => {
      /* EPIPE when docker fails before reading the job */
    });

    child.on("error", (err: NodeJS.ErrnoException) => {
      settle(() => {
        if (err.code === "ENOENT") {
          markUnavailable(describeCliFailure({ code: null, stdout: "", stderr: "", spawnError: err.code }));
          reject(new RunnerUnavailableError(unavailableMessage()));
        } else {
          console.error(`[code-runner] failed to start docker: ${err.message}`);
          reject(failure("The code runner could not be started. Please try again later.", `failed to start docker: ${err.message}`));
        }
      });
    });

    child.on("close", (code) => {
      settle(() => {
        const wallMs = Date.now() - started;
        if (hostKilled) {
          reject(
            overflow
              ? failure("The code runner produced an oversized result.", `result larger than ${MAX_RESULT_BYTES} bytes`)
              : failure("The code runner did not finish in time. Please try again later.", `container exceeded the ${hostDeadlineMs}ms deadline`)
          );
          return;
        }
        const text = Buffer.concat(stdout).toString("utf8");
        const lastLine = text.trimEnd().split("\n").pop() ?? "";
        let doc: any = null;
        try {
          doc = lastLine ? JSON.parse(lastLine) : null;
        } catch {
          doc = null;
        }
        if (!doc || doc.nonce !== nonce || doc.protocol !== DOCKER_PROTOCOL) {
          const reason = describeCliFailure({ code, stdout: "", stderr });
          if (code === 125 && /runner image|not reachable|not found in PATH/.test(reason)) {
            markUnavailable(reason);
            reject(new RunnerUnavailableError(unavailableMessage()));
            return;
          }
          console.error(`[code-runner] sandbox ${name} returned no valid result (exit ${code}): ${reason}`);
          reject(failure("The code runner failed to execute the program. Please try again later.", `docker exit ${code}: ${reason}`));
          return;
        }
        if (typeof doc.error === "string") {
          console.error(`[code-runner] sandbox driver error: ${doc.error}`);
          reject(failure("The code runner failed to execute the program. Please try again later.", `driver error: ${doc.error}`));
          return;
        }
        resolve({
          compile: doc.compile,
          results: Array.isArray(doc.results) ? doc.results : [],
          budgetExceeded: Boolean(doc.budgetExceeded),
          wallMs,
        });
      });
    });

    child.stdin.end(JSON.stringify({ protocol: DOCKER_PROTOCOL, nonce, ...job }));
  });
}

// ---------------------------------------------------------------------------
// Availability (startup check, /api/health, submissions)
// ---------------------------------------------------------------------------

let cached: { status: DockerRunnerStatus; at: number } | null = null;
let inflight: Promise<DockerRunnerStatus> | null = null;
let smokeTested = false;

function markUnavailable(detail: string) {
  cached = { status: { status: "unavailable", detail }, at: Date.now() };
}

function unavailableMessage(): string {
  const detail = cached?.status.detail;
  return config.isProduction || !detail
    ? "The code runner is temporarily unavailable. Please try again later."
    : `The Docker code runner is unavailable: ${detail}`;
}

async function probe(): Promise<DockerRunnerStatus> {
  const inspect = await dockerCli(["image", "inspect", "--format", "{{.Id}}", config.runnerImage]);
  if (inspect.code !== 0) return { status: "unavailable", detail: describeCliFailure(inspect) };
  if (!smokeTested) {
    // End-to-end self-test (once per process): proves the daemon accepts every sandbox flag.
    try {
      const batch = await runInSandbox({
        language: "javascript",
        source: "process.stdout.write(require('fs').readFileSync(0, 'utf8').trim() + ':ok');",
        inputs: ["placify"],
        timeLimitMs: 10_000,
        totalLimitMs: 10_000,
        compileLimitMs: 1_000,
        outputLimitBytes: 1024,
        stderrLimitBytes: 1024,
        stopOnError: true,
      });
      const out = batch.results[0];
      if (!out || out.stdout !== "placify:ok") {
        return { status: "unavailable", detail: `sandbox self-test failed: ${JSON.stringify(out ?? batch.compile).slice(0, 300)}` };
      }
      smokeTested = true;
    } catch (err) {
      const detail =
        err instanceof RunnerUnavailableError
          ? cached?.status.detail // set by markUnavailable() just now
          : (err as { detail?: string }).detail;
      return { status: "unavailable", detail: `sandbox self-test failed: ${detail ?? (err as Error).message}` };
    }
  }
  return { status: "ready" };
}

function refresh(): Promise<DockerRunnerStatus> {
  if (!inflight) {
    inflight = probe()
      .catch((err: Error): DockerRunnerStatus => ({ status: "unavailable", detail: err.message }))
      .then((status) => {
        cached = { status, at: Date.now() };
        return status;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/**
 * Cached availability check. "unavailable" is re-probed after 5s (a freshly built image is picked up without a
 * restart); a stale "ready" (60s) is served immediately while it is re-validated in the background, so
 * submissions never wait for the probe once the runner has worked.
 */
export function checkDockerRunner(options: { force?: boolean } = {}): Promise<DockerRunnerStatus> {
  if (options.force || !cached) return refresh();
  const age = Date.now() - cached.at;
  if (cached.status.status === "ready") {
    if (age >= READY_TTL_MS) void refresh();
    return Promise.resolve(cached.status);
  }
  return age < UNAVAILABLE_TTL_MS ? Promise.resolve(cached.status) : refresh();
}

/** Throws RunnerUnavailableError (HTTP 503) with a clear reason when the sandbox cannot be used. */
export async function assertDockerRunnerReady(): Promise<void> {
  const status = await checkDockerRunner();
  if (status.status !== "ready") throw new RunnerUnavailableError(unavailableMessage());
}
