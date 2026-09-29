"""
Placify sandbox driver - runs as PID 1 inside the placify-runner container.

Protocol (version 1)
--------------------
stdin : one JSON job document
        {"protocol": 1, "nonce": str, "language": "javascript|python|java|cpp|c", "source": str,
         "inputs": [str, ...], "timeLimitMs": int, "totalLimitMs": int, "compileLimitMs": int,
         "outputLimitBytes": int, "stderrLimitBytes": int, "stopOnError": bool}
stdout: one JSON result document (written once, at the very end)
        {"protocol": 1, "nonce": str, "compile": {"ok": bool, "output": str, "timeMs": int, "timedOut": bool},
         "results": [{"exitCode": int|null, "signal": str|null, "timedOut": bool, "outputLimit": bool,
                      "oomKilled": bool, "stdout": str, "stderr": str, "timeMs": int, "memoryKb": int|null}],
         "budgetExceeded": bool}
        or {"protocol": 1, "nonce": str, "error": str} when the job itself is invalid.

The source is already wrapped in the language harness by the server (server/codeRunner.ts), exactly as for
Judge0. Expected outputs are never sent into the container: the server compares outputs itself.

Isolation inside the container (on top of the docker flags set by the server):
 * The job arrives on stdin and is held in memory only. The driver marks itself non-dumpable, so user code
   (same uid) cannot read /proc/1/{fd,mem,environ}, i.e. it can neither read other tests' inputs nor write a
   forged result document to the container's stdout. As PID 1 it also cannot be killed from inside.
 * Every test runs in a fresh process session with rlimits and oom_score_adj=1000 (user code is always the
   OOM victim, never the driver). After each test every other process in the container is SIGKILLed
   (kill(-1)) and /tmp is wiped and rebuilt from the in-memory build artifacts, so nothing (files, background
   processes) survives from one test to the next.
"""

import ctypes
import json
import os
import resource
import selectors
import signal
import sys
import time

PROTOCOL = 1
TMP = "/tmp"
BUILD = "/tmp/build"
SRC = "/tmp/src"
WORK = "/tmp/work"
JAVA_HOME = "/usr/lib/jvm/default-jvm"
MAX_JOB_BYTES = 32 * 1024 * 1024
COMPILE_OUTPUT_LIMIT = 16 * 1024
OOM_EVENTS = "/sys/fs/cgroup/memory.events"
# RLIMIT_CORE=1 (not 0): when the host's kernel.core_pattern pipes cores to a helper (e.g. WSL2 / Docker
# Desktop: "|/wsl-capture-crash ...", systemd-coredump) the kernel ignores a 0 limit and would ship the crashing
# program's memory OUT of the container; a limit of exactly 1 makes it abort the dump. With a file pattern a
# 1-byte limit is below the minimum core size, so no core is written either.
NO_CORE = 1

USER_ENV = {
    "PATH": JAVA_HOME + "/bin:/usr/local/bin:/usr/bin:/bin",
    "HOME": WORK,
    "TMPDIR": WORK,
    "LANG": "C.UTF-8",
    "LC_ALL": "C.UTF-8",
    "JAVA_HOME": JAVA_HOME,
}

JAVA_RUN_FLAGS = ["-Xmx128m", "-Xss64m", "-XX:+UseSerialGC", "-XX:-UsePerfData", "-XX:TieredStopAtLevel=1", "-Xshare:auto"]
JAVAC_FLAGS = ["-J-Xmx160m", "-J-XX:+UseSerialGC", "-J-XX:-UsePerfData", "-J-XX:TieredStopAtLevel=1", "-J-Xshare:auto"]
if os.path.exists("/opt/runner/javac.jsa"):
    JAVAC_FLAGS.append("-J-XX:SharedArchiveFile=/opt/runner/javac.jsa")

# language -> (source file name, compile argv or None, run argv)
LANGUAGES = {
    "javascript": ("main.js", None, ["node", "--max-old-space-size=128", BUILD + "/main.js"]),
    "python": ("main.py", None, ["python3", "-I", "-B", "-X", "utf8", BUILD + "/main.py"]),
    "java": (
        "Main.java",
        ["javac", *JAVAC_FLAGS, "-encoding", "UTF-8", "-proc:none", "-nowarn", "-d", BUILD, SRC + "/Main.java"],
        ["java", *JAVA_RUN_FLAGS, "-cp", BUILD, "Main"],
    ),
    "cpp": (
        "main.cpp",
        ["g++", "-std=gnu++17", "-O2", "-pipe", "-o", BUILD + "/main", SRC + "/main.cpp", "-lm"],
        [BUILD + "/main"],
    ),
    "c": (
        "main.c",
        ["gcc", "-std=gnu11", "-O2", "-pipe", "-o", BUILD + "/main", SRC + "/main.c", "-lm"],
        [BUILD + "/main"],
    ),
}

SIGNAL_NAMES = {int(s): s.name for s in signal.Signals}

try:
    _LIBC = ctypes.CDLL(None, use_errno=True)
except OSError:  # pragma: no cover - musl always provides the symbols via the main program
    _LIBC = None


def set_dumpable(value):
    if _LIBC is not None:
        _LIBC.prctl(4, value, 0, 0, 0)  # PR_SET_DUMPABLE


# ---------------------------------------------------------------------------
# Filesystem state
# ---------------------------------------------------------------------------


def wipe(root):
    """
    Empties `root` (the /tmp tmpfs). Iterative and path-length safe: every sub-directory is first moved up to
    `root` under a unique name and processed there, so arbitrarily deep trees left by user code need neither
    recursion nor long paths. Permissions the program removed are restored first.
    """
    tag = ".wipe-%s-" % os.urandom(6).hex()
    counter = 0
    queue = []
    for entry in os.scandir(root):
        if entry.is_dir(follow_symlinks=False):
            queue.append(entry.path)
        else:
            os.unlink(entry.path)
    while queue:
        path = queue.pop()
        os.chmod(path, 0o700)
        for entry in list(os.scandir(path)):
            if entry.is_dir(follow_symlinks=False):
                os.chmod(entry.path, 0o700)  # a moved directory must be writable (its ".." entry changes)
                counter += 1
                target = os.path.join(root, tag + str(counter))
                os.rename(entry.path, target)
                queue.append(target)
            else:
                os.unlink(entry.path)
        os.rmdir(path)


def snapshot(path):
    files = {}
    for root, _dirs, names in os.walk(path):
        for name in names:
            full = os.path.join(root, name)
            with open(full, "rb") as handle:
                files[os.path.relpath(full, path)] = (handle.read(), os.stat(full).st_mode & 0o111 != 0)
    return files


def restore(files):
    """Gives every test the same pristine /tmp: the build artifacts plus an empty working directory."""
    wipe(TMP)
    os.mkdir(BUILD, 0o755)
    for rel, (data, executable) in files.items():
        full = os.path.join(BUILD, rel)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        fd = os.open(full, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o555 if executable else 0o444)
        try:
            view = memoryview(data)
            while view:
                view = view[os.write(fd, view):]
        finally:
            os.close(fd)
    for root, dirs, _names in os.walk(BUILD):
        for d in dirs:
            os.chmod(os.path.join(root, d), 0o555)
    os.chmod(BUILD, 0o555)
    os.mkdir(WORK, 0o700)


def oom_kills():
    try:
        with open(OOM_EVENTS) as handle:
            for line in handle:
                key, _, value = line.partition(" ")
                if key == "oom_kill":
                    return int(value)
    except (OSError, ValueError):
        pass
    return -1


# ---------------------------------------------------------------------------
# Processes
# ---------------------------------------------------------------------------


def kill_all():
    """SIGKILLs every other process in the container (PID 1 is exempt from kill(-1)) and reaps them."""
    deadline = time.monotonic() + 3
    while True:
        try:
            os.kill(-1, signal.SIGKILL)
        except (ProcessLookupError, PermissionError):
            pass
        try:
            while os.waitpid(-1, os.WNOHANG)[0] != 0:
                pass
        except ChildProcessError:
            return
        if time.monotonic() > deadline:
            return
        time.sleep(0.001)


def child_setup(cwd, limits):
    """Runs in the forked child before exec."""
    os.setsid()
    for sig in (signal.SIGPIPE, signal.SIGXFSZ, signal.SIGINT, signal.SIGTERM, signal.SIGCHLD, signal.SIGHUP):
        signal.signal(sig, signal.SIG_DFL)
    for res, value in limits:
        soft, hard = resource.getrlimit(res)
        if hard != resource.RLIM_INFINITY:
            value = min(value, hard)
        resource.setrlimit(res, (value, value if res != resource.RLIMIT_STACK else hard))
    set_dumpable(1)  # regains ownership of /proc/self so oom_score_adj can be raised (exec resets it anyway)
    try:
        with open("/proc/self/oom_score_adj", "w") as handle:
            handle.write("1000")
    except OSError:
        pass
    os.chdir(cwd)


def execute(argv, stdin_data, timeout_s, stdout_limit, stderr_limit, limits):
    in_r, in_w = os.pipe()
    out_r, out_w = os.pipe()
    err_r, err_w = os.pipe()
    oom_before = oom_kills()
    started = time.monotonic()
    pid = os.fork()
    if pid == 0:  # child
        try:
            os.dup2(in_r, 0)
            os.dup2(out_w, 1)
            os.dup2(err_w, 2)
            # Every other descriptor the driver owns is O_CLOEXEC (PEP 446), so exec drops it.
            for fd in (in_r, in_w, out_r, out_w, err_r, err_w):
                os.close(fd)
            child_setup(WORK, limits)
            os.execvpe(argv[0], argv, USER_ENV)
        except BaseException as exc:  # noqa: BLE001 - report anything that prevents exec
            try:
                os.write(2, ("sandbox: cannot start %s: %s\n" % (argv[0], exc)).encode())
            finally:
                os._exit(127)
    os.close(in_r)
    os.close(out_w)
    os.close(err_w)

    deadline = started + timeout_s
    stdout = bytearray()
    stderr = bytearray()
    stdout_total = 0
    timed_out = False
    output_limit = False
    status = None
    rusage = None
    exited_at = None
    pending = memoryview(stdin_data)

    sel = selectors.DefaultSelector()
    for fd in (out_r, err_r):
        os.set_blocking(fd, False)
        sel.register(fd, selectors.EVENT_READ)
    if pending:
        os.set_blocking(in_w, False)
        sel.register(in_w, selectors.EVENT_WRITE)
    else:
        os.close(in_w)

    def close(fd):
        sel.unregister(fd)
        os.close(fd)

    while True:
        now = time.monotonic()
        if status is None:
            wpid, wstatus, wusage = os.wait4(pid, os.WNOHANG)
            if wpid == pid:
                status, rusage, exited_at = wstatus, wusage, now
        readers = [key.fd for key in sel.get_map().values() if key.events & selectors.EVENT_READ]
        if status is not None and (not readers or now - exited_at > 0.1):
            break  # exited; pipes drained (or still held open by a detached grandchild)
        if now >= deadline:
            timed_out = status is None
            break
        if not sel.get_map():
            time.sleep(0.005)
            continue
        for key, _mask in sel.select(min(deadline - now, 0.02)):
            fd = key.fd
            if fd == in_w:
                try:
                    written = os.write(in_w, pending[:65536])
                    pending = pending[written:]
                    if not pending:
                        close(in_w)
                except BlockingIOError:
                    pass
                except OSError:  # EPIPE: the program exited without reading all of its input
                    close(in_w)
                continue
            try:
                chunk = os.read(fd, 65536)
            except BlockingIOError:
                continue
            if not chunk:
                close(fd)
            elif fd == out_r:
                stdout_total += len(chunk)
                if stdout_total > stdout_limit:
                    output_limit = True
                else:
                    stdout += chunk
            elif len(stderr) < stderr_limit:
                stderr += chunk[: stderr_limit - len(stderr)]
        if output_limit:
            break

    finished = time.monotonic() if exited_at is None else exited_at
    if status is None:
        os.kill(-1, signal.SIGKILL)
        _, status, rusage = os.wait4(pid, 0)
    kill_all()
    for key in list(sel.get_map().values()):
        close(key.fd)
    sel.close()

    exit_code = os.WEXITSTATUS(status) if os.WIFEXITED(status) else None
    sig = SIGNAL_NAMES.get(os.WTERMSIG(status), str(os.WTERMSIG(status))) if os.WIFSIGNALED(status) else None
    oom_after = oom_kills()
    return {
        "exitCode": exit_code,
        "signal": sig,
        "timedOut": timed_out,
        "outputLimit": output_limit,
        "oomKilled": bool(sig == "SIGKILL" and not timed_out and not output_limit and oom_after > oom_before >= 0),
        "stdout": stdout.decode("utf-8", "replace"),
        "stderr": stderr.decode("utf-8", "replace"),
        "timeMs": int(round((finished - started) * 1000)),
        "memoryKb": int(rusage.ru_maxrss) if rusage is not None else None,
    }


# ---------------------------------------------------------------------------
# Job
# ---------------------------------------------------------------------------


def read_job():
    chunks = []
    total = 0
    while True:
        chunk = os.read(0, 1 << 20)
        if not chunk:
            break
        total += len(chunk)
        if total > MAX_JOB_BYTES:
            raise ValueError("job too large")
        chunks.append(chunk)
    # Nothing else ever reads from the driver's stdin.
    devnull = os.open("/dev/null", os.O_RDONLY)
    os.dup2(devnull, 0)
    os.close(devnull)
    return json.loads(b"".join(chunks).decode("utf-8"))


def run_job(job):
    language = job["language"]
    if language not in LANGUAGES:
        raise ValueError("unsupported language")
    file_name, compile_argv, run_argv = LANGUAGES[language]
    source = job["source"].encode("utf-8")
    inputs = [str(i).encode("utf-8") for i in job["inputs"]]
    time_limit = max(0.1, int(job["timeLimitMs"]) / 1000)
    total_limit = max(0.1, int(job["totalLimitMs"]) / 1000)
    compile_limit = max(1.0, int(job["compileLimitMs"]) / 1000)
    stdout_limit = int(job["outputLimitBytes"])
    stderr_limit = int(job["stderrLimitBytes"])
    stop_on_error = bool(job.get("stopOnError"))
    limits = [
        (resource.RLIMIT_CORE, NO_CORE),
        (resource.RLIMIT_NOFILE, 256),
        (resource.RLIMIT_FSIZE, 32 * 1024 * 1024),
        (resource.RLIMIT_CPU, int(time_limit) + 2),
        (resource.RLIMIT_STACK, 64 * 1024 * 1024),
    ]

    compile_info = {"ok": True, "output": "", "timeMs": 0, "timedOut": False}
    wipe(TMP)
    if compile_argv is None:
        artifacts = {file_name: (source, False)}
    else:
        os.mkdir(BUILD, 0o755)
        os.mkdir(SRC, 0o755)
        os.mkdir(WORK, 0o700)
        with open(os.path.join(SRC, file_name), "wb") as handle:
            handle.write(source)
        compile_limits = [
            (resource.RLIMIT_CORE, NO_CORE),
            (resource.RLIMIT_FSIZE, 32 * 1024 * 1024),
            (resource.RLIMIT_CPU, int(compile_limit) + 2),
        ]
        result = execute(compile_argv, b"", compile_limit, COMPILE_OUTPUT_LIMIT, COMPILE_OUTPUT_LIMIT, compile_limits)
        output = (result["stdout"] + result["stderr"]).strip()
        ok = result["exitCode"] == 0 and not result["timedOut"]
        if result["timedOut"]:
            output = (output + "\n" if output else "") + "Compilation timed out after %ds." % compile_limit
        elif result["oomKilled"] or (result["signal"] and not output):
            output = (output + "\n" if output else "") + "The compiler was killed (%s)." % (
                "memory limit exceeded" if result["oomKilled"] else result["signal"])
        compile_info = {"ok": ok, "output": output, "timeMs": result["timeMs"], "timedOut": result["timedOut"]}
        if not ok:
            return {"compile": compile_info, "results": [], "budgetExceeded": False}
        artifacts = snapshot(BUILD)

    results = []
    budget_exceeded = False
    polluted = None
    started = time.monotonic()
    for data in inputs:
        remaining = total_limit - (time.monotonic() - started)
        if remaining <= 0:
            budget_exceeded = True
            break
        if polluted is None:
            try:
                restore(artifacts)
            except (OSError, RecursionError) as exc:
                # Only possible when the previous test deliberately left an unremovable mess (e.g. thousands of
                # nested directories): this and every later test is that submission's runtime error, not a
                # runner failure.
                polluted = {
                    "exitCode": None, "signal": None, "timedOut": False, "outputLimit": False, "oomKilled": False,
                    "stdout": "", "timeMs": 0, "memoryKb": None,
                    "stderr": "Not run: the sandbox could not be reset after the previous test (%s) because the "
                              "program left files in /tmp that cannot be cleaned up." % type(exc).__name__,
                }
        if polluted is not None:
            results.append(dict(polluted))
            if stop_on_error:
                break
            continue
        timeout = min(time_limit, remaining)
        result = execute(run_argv, data, timeout, stdout_limit, stderr_limit, limits)
        if result["timedOut"] and timeout < time_limit:
            budget_exceeded = True
        results.append(result)
        failed = result["exitCode"] != 0 or result["timedOut"] or result["outputLimit"]
        if result["timedOut"] or (stop_on_error and failed) or budget_exceeded:
            break
    return {"compile": compile_info, "results": results, "budgetExceeded": budget_exceeded}


def emit(document):
    data = (json.dumps(document, ensure_ascii=True, separators=(",", ":")) + "\n").encode("ascii")
    view = memoryview(data)
    while view:
        view = view[os.write(1, view):]


def main():
    set_dumpable(0)
    # The driver never needs these; ignore them so a stray signal cannot interrupt it (PID 1 semantics
    # already make it immune to signals sent from inside the container).
    for sig in (signal.SIGTERM, signal.SIGINT, signal.SIGHUP, signal.SIGPIPE):
        signal.signal(sig, signal.SIG_IGN)
    nonce = ""
    try:
        job = read_job()
        nonce = str(job.get("nonce", ""))
        if job.get("protocol") != PROTOCOL:
            raise ValueError("unsupported protocol version")
        document = run_job(job)
    except Exception as exc:  # noqa: BLE001 - reported to the server as an infrastructure error
        kill_all()
        emit({"protocol": PROTOCOL, "nonce": nonce, "error": "%s: %s" % (type(exc).__name__, exc)})
        return 0
    document.update({"protocol": PROTOCOL, "nonce": nonce})
    emit(document)
    return 0


if __name__ == "__main__":
    sys.exit(main())
