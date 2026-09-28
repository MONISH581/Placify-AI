import urllib.request
import json
import sys

def test_endpoint(name, url, data=None):
    req = urllib.request.Request(url, headers={'Content-Type': 'application/json'})
    if data:
        req.data = json.dumps(data).encode('utf-8')
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode('utf-8')
            print(f"[PASS] {name} ({url}) -> HTTP {resp.status}")
            print(f"       Response: {content[:150]}...")
            return True
    except Exception as e:
        print(f"[FAIL] {name} ({url}) -> Error: {e}")
        return False

print("="*60)
print("Placify ML API Endpoints Health & Functional Check")
print("="*60)

results = [
    test_endpoint("Root / Model Status", "http://127.0.0.1:8000/"),
    test_endpoint("Health Check", "http://127.0.0.1:8000/health"),
    test_endpoint("Placement Score", "http://127.0.0.1:8000/ml/placement-score", {
        "xp": 1500, "level": 3, "streak": 10, "accuracy": 75.0, "problems_solved": 40, "submission_count": 55
    }),
    test_endpoint("Problem Recommender", "http://127.0.0.1:8000/ml/recommend-problems", {
        "solved_ids": ["prob-1", "prob-2"], "top_n": 3
    }),
    test_endpoint("Difficulty Classifier", "http://127.0.0.1:8000/ml/difficulty-predict", {
        "title": "Two Sum", "description": "Given an array of integers find two numbers that sum to target", "tags": ["array", "hash table"]
    }),
    test_endpoint("Interview Scorer", "http://127.0.0.1:8000/ml/interview-score", {
        "question": "What is dynamic programming?",
        "answer": "Dynamic programming breaks problems into subproblems and stores solutions for reuse using memoization or tabulation."
    }),
    test_endpoint("RAG Retrieve", "http://127.0.0.1:8000/rag/retrieve", {
        "question": "dynamic programming memoization", "top_k": 2
    })
]

print("="*60)
passed = sum(results)
total = len(results)
print(f"Summary: {passed}/{total} endpoints passed.")
print("="*60)

if passed < total:
    sys.exit(1)
