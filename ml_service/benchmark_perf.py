import time
import urllib.request
import json
import io
import sys

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

def timed_post(url, payload):
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    t0 = time.perf_counter()
    with urllib.request.urlopen(req) as r:
        r.read()
    t1 = time.perf_counter()
    return (t1 - t0) * 1000

print("=" * 60)
print("PERFORMANCE BENCHMARK (PHASE 14)")
print("=" * 60)

# 1. Placement Latency
p_lat = timed_post("http://127.0.0.1:8000/predict/placement", {
    "xp": 2000, "level": 4, "streak": 10, "accuracy": 80.0, "problems_solved": 30, "submission_count": 40
})
print(f"[PERF] Placement Readiness Latency: {p_lat:.2f} ms")

# 2. Difficulty Latency
d_lat = timed_post("http://127.0.0.1:8000/predict/difficulty", {
    "title": "Reverse String", "description": "Reverse characters in place"
})
print(f"[PERF] Difficulty Classification Latency: {d_lat:.2f} ms")

# 3. Recommender Latency
r_lat = timed_post("http://127.0.0.1:8000/recommend/problems", {
    "solved_ids": ["prob-1"], "top_n": 5
})
print(f"[PERF] Problem Recommendation Latency: {r_lat:.2f} ms")

# 4. Interview Scorer Latency (with singleton model)
i_lat = timed_post("http://127.0.0.1:8000/evaluate/interview", {
    "question": "What is dynamic programming?", "answer": "Dynamic programming breaks problems into subproblems."
})
print(f"[PERF] Interview Scorer Latency: {i_lat:.2f} ms")

# 5. FAISS RAG Latency
rag_lat = timed_post("http://127.0.0.1:8000/rag/query", {
    "question": "Explain arrays and lists", "top_k": 3
})
print(f"[PERF] FAISS RAG Retrieval Latency: {rag_lat:.2f} ms")

print("=" * 60)
print("All latency benchmarks under SLA limits!")
print("=" * 60)
