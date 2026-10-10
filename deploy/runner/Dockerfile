# Placify code-runner sandbox image (CODE_RUNNER=docker).
#
#   docker build -t placify-runner:1 deploy/runner        (or: npm run runner:build)
#
# One short-lived container per submission. The server starts it with --network none, --read-only, a small
# /tmp tmpfs, memory / CPU / PID limits, --cap-drop ALL, no-new-privileges and a non-root user
# (see server/dockerRunner.ts). driver.py receives the job on stdin, compiles once, runs every test in a
# fresh process with a per-test timeout and prints a single JSON result document.
FROM alpine:3.20

LABEL org.opencontainers.image.title="placify-runner" \
      org.opencontainers.image.description="Sandbox for Placify code submissions (JavaScript, Python, Java, C++, C)"

# nodejs 20, python 3.12, OpenJDK 21, gcc/g++ 13.
RUN apk add --no-cache nodejs python3 openjdk21-jdk g++ gcc musl-dev \
 && rm -rf /usr/lib/jvm/default-jvm/jmods /usr/lib/jvm/default-jvm/demo /usr/lib/jvm/default-jvm/man \
 && (/usr/lib/jvm/default-jvm/bin/java -Xshare:dump > /dev/null 2>&1 || true)

ENV PATH="/usr/lib/jvm/default-jvm/bin:${PATH}" \
    JAVA_HOME="/usr/lib/jvm/default-jvm" \
    LANG="C.UTF-8"

# Precompiled <bits/stdc++.h> (same flags as the driver uses) and a class-data archive for javac:
# both cut compile time for C++ / Java submissions roughly in half.
RUN set -eu; \
    header="$(echo '#include <bits/stdc++.h>' | g++ -std=gnu++17 -x c++ -E -H - 2>&1 >/dev/null | grep 'bits/stdc++.h$' | head -n1 | sed 's/^\.* //')"; \
    g++ -std=gnu++17 -O2 -x c++-header "$header" -o "$header.gch"; \
    mkdir -p /opt/runner /tmp/cds; \
    printf 'import java.util.*;\npublic class Main { public static void main(String[] a) throws Exception { Map<String,Integer> m = new HashMap<>(); System.out.println(new String(System.in.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8) + m + List.of(1).stream().map(x -> x + 1).toList()); } }\n' > /tmp/cds/Main.java; \
    javac -J-Xmx160m -J-XX:+UseSerialGC -J-XX:-UsePerfData -J-XX:TieredStopAtLevel=1 -J-XX:ArchiveClassesAtExit=/opt/runner/javac.jsa \
      -encoding UTF-8 -proc:none -nowarn -d /tmp/cds /tmp/cds/Main.java; \
    rm -rf /tmp/cds

# Unprivileged sandbox user (the server also passes --user 10001:10001 explicitly).
RUN addgroup -S -g 10001 runner && adduser -S -D -H -u 10001 -G runner -h /tmp/work -s /sbin/nologin runner

COPY driver.py /opt/runner/driver.py
RUN chmod 0755 /opt/runner && chmod 0444 /opt/runner/driver.py /opt/runner/javac.jsa

USER 10001:10001
WORKDIR /tmp
# Exec form: the driver is PID 1, so user code cannot signal it and every orphan is re-parented to it.
ENTRYPOINT ["python3", "-I", "-B", "-S", "/opt/runner/driver.py"]
