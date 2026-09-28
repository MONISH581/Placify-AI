import urllib.request
import urllib.error
import json
import sys

import io

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

BASE_URL = "http://127.0.0.1:8000"

def request(method, path, data=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode("utf-8")
            return resp.status, json.loads(content)
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")
        try:
            return e.code, json.loads(content)
        except Exception:
            return e.code, content
    except Exception as e:
        return 0, str(e)

print("=" * 60)
print("FASTAPI COMPREHENSIVE ENDPOINT TESTING (PHASE 5)")
print("=" * 60)

passed = 0
total = 0

def check(title, condition, details=""):
    global passed, total
    total += 1
    if condition:
        print(f"[PASS] [{total}] {title} {details}")
        passed += 1
    else:
        print(f"[FAIL] [{total}] {title} {details}")

# 1. Health & Root
status, res = request("GET", "/health")
check("GET /health", status == 200 and res.get("status") == "ok")

status, res = request("GET", "/")
check("GET /", status == 200 and res.get("status") in ("healthy", "degraded") and "models" in res)

# 2. Canonical: POST /predict/placement
placement_payload = {
    "xp": 1800,
    "level": 4,
    "streak": 12,
    "accuracy": 78.5,
    "problems_solved": 35,
    "submission_count": 48,
    "user_id": "test-user-1"
}
status, res = request("POST", "/predict/placement", placement_payload)
check("POST /predict/placement (Valid)", 
      status == 200 and 
      isinstance(res.get("placement_ready"), bool) and 
      0 <= res.get("score") <= 100 and 
      0.0 <= res.get("probability") <= 1.0 and 
      isinstance(res.get("insights"), list),
      f"-> score={res.get('score')}, ready={res.get('placement_ready')}")

# Invalid placement (accuracy > 100)
status, res = request("POST", "/predict/placement", {"accuracy": 150.0})
check("POST /predict/placement (Invalid validation)", status == 422, f"-> HTTP {status}")

# 3. Canonical: POST /predict/difficulty
diff_payload = {
    "title": "Two Sum",
    "description": "Given an array of integers nums and an integer target, return indices of two numbers that add up to target.",
    "tags": ["array", "hash table"]
}
status, res = request("POST", "/predict/difficulty", diff_payload)
check("POST /predict/difficulty (Valid)",
      status == 200 and 
      res.get("difficulty") in ("Easy", "Medium", "Hard") and 
      0.0 <= res.get("confidence") <= 1.0 and 
      isinstance(res.get("probabilities"), dict),
      f"-> difficulty={res.get('difficulty')} (conf={res.get('confidence')})")

# Invalid difficulty (empty text and description)
status, res = request("POST", "/predict/difficulty", {"text": ""})
check("POST /predict/difficulty (Empty rejection)", status in (400, 422), f"-> HTTP {status}")

# 4. Canonical: POST /recommend/problems
rec_payload = {
    "solved_ids": ["prob-1", "prob-2"],
    "top_n": 5,
    "difficulty_filter": "Easy"
}
status, res = request("POST", "/recommend/problems", rec_payload)
check("POST /recommend/problems (Valid)",
      status == 200 and 
      isinstance(res.get("recommendations"), list) and 
      len(res.get("recommendations")) > 0 and 
      all(r.get("difficulty") == "Easy" for r in res.get("recommendations")),
      f"-> {len(res.get('recommendations'))} recs returned")

# Invalid recommend (top_n exceeds max 50)
status, res = request("POST", "/recommend/problems", {"top_n": 100})
check("POST /recommend/problems (Validation bounds)", status == 422, f"-> HTTP {status}")

# 5. Canonical: POST /evaluate/interview
interview_payload = {
    "question": "Explain the difference between process and thread in operating systems.",
    "answer": "A process has its own address space and memory. A thread shares memory with other threads within the same process. Context switching is faster in threads.",
    "interview_type": "Technical"
}
status, res = request("POST", "/evaluate/interview", interview_payload)
check("POST /evaluate/interview (Valid)",
      status == 200 and 
      0 <= res.get("score") <= 100 and 
      len(res.get("feedback", "")) > 0 and 
      "method" in res,
      f"-> score={res.get('score')}/100, method={res.get('method')}")

# Invalid interview (empty question/answer)
status, res = request("POST", "/evaluate/interview", {"question": "", "answer": ""})
check("POST /evaluate/interview (Empty rejection)", status in (400, 422), f"-> HTTP {status}")

# 6. Canonical: POST /rag/query
rag_payload = {
    "question": "What is the time complexity of binary search and how does it work?",
    "top_k": 3
}
status, res = request("POST", "/rag/query", rag_payload)
check("POST /rag/query (Valid)",
      status == 200 and 
      len(res.get("answer", "")) > 10 and 
      isinstance(res.get("sources"), list),
      f"-> sources={len(res.get('sources'))}, method={res.get('method')}")

# Invalid RAG (too short question)
status, res = request("POST", "/rag/query", {"question": "hi"})
check("POST /rag/query (Short question rejection)", status in (400, 422), f"-> HTTP {status}")

# 7. Backward compatibility routes check
status, res = request("POST", "/ml/placement-score", placement_payload)
check("POST /ml/placement-score (Legacy)", status == 200 and "score" in res)

status, res = request("POST", "/ml/difficulty-predict", diff_payload)
check("POST /ml/difficulty-predict (Legacy)", status == 200 and "difficulty" in res)

status, res = request("POST", "/ml/recommend-problems", {"solved_ids": ["prob-1"], "top_n": 2})
check("POST /ml/recommend-problems (Legacy)", status == 200 and len(res.get("recommendations", [])) > 0)

status, res = request("POST", "/ml/interview-score", interview_payload)
check("POST /ml/interview-score (Legacy)", status == 200 and "score" in res)

status, res = request("POST", "/rag/mentor-ask", rag_payload)
check("POST /rag/mentor-ask (Legacy)", status == 200 and "answer" in res)

# 8. Node server /api/ai/* compatibility routes
status, res = request("POST", "/api/ai/readiness", {"xp": 1000, "level": 2})
check("POST /api/ai/readiness (Node compatibility)", status == 200 and "overall_readiness" in res)

status, res = request("POST", "/api/ai/recommend", {"solved_ids": []})
check("POST /api/ai/recommend (Node compatibility)", status == 200 and "recommended_topic" in res)

print("=" * 60)
print(f"FASTAPI TEST SUMMARY: {passed}/{total} Passed")
print("=" * 60)

if passed < total:
    sys.exit(1)
