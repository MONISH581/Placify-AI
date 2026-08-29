"""
generate_training_data.py
Generates synthetic but realistic training datasets for all Placify ML models.
Reads server-db.json for real problem/user data and augments with synthetic samples.
"""

import json
import random
import os
import numpy as np
import pandas as pd

# Resolve path to server-db.json (two levels up from ml_service/data/)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB_FILE = os.path.join(BASE_DIR, "server-db.json")
OUT_DIR = os.path.dirname(os.path.abspath(__file__))

random.seed(42)
np.random.seed(42)


# ─────────────────────────────────────────────────────────────────────────────
# Load real DB data
# ─────────────────────────────────────────────────────────────────────────────
def load_db():
    if os.path.exists(DB_FILE):
        with open(DB_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    print(f"[WARN] server-db.json not found at {DB_FILE}, using empty DB.")
    return {"users": [], "problems": [], "submissions": []}


# ─────────────────────────────────────────────────────────────────────────────
# 1. Placement Readiness Training Data
# ─────────────────────────────────────────────────────────────────────────────
def generate_placement_data(db, n_synthetic=800):
    rows = []

    # Real users from DB
    for user in db.get("users", []):
        solved = len(user.get("problemsSolved", []))
        subs = [s for s in db.get("submissions", []) if s.get("userId") == user.get("id")]
        easy = sum(1 for s in subs if s.get("status") == "Accepted")
        rows.append({
            "xp": user.get("xp", 0),
            "level": user.get("level", 1),
            "streak": user.get("streak", 0),
            "accuracy": user.get("accuracy", 50),
            "problems_solved": solved,
            "submission_count": len(subs),
            "placement_ready": 1 if user.get("xp", 0) > 1000 and solved > 5 else 0
        })

    # Synthetic users
    for _ in range(n_synthetic):
        level = random.randint(1, 20)
        streak = random.randint(0, 200)
        problems_solved = random.randint(0, 300)
        accuracy = random.randint(30, 100)
        xp = level * random.randint(300, 700) + problems_solved * random.randint(5, 30)
        submission_count = problems_solved + random.randint(0, 50)

        # Heuristic label: placement ready if strong across key signals
        score = (
            (xp > 2000) * 2 +
            (problems_solved > 50) * 2 +
            (streak > 20) * 1 +
            (accuracy > 70) * 1 +
            (level >= 5) * 1
        )
        placement_ready = 1 if score >= 4 else 0

        rows.append({
            "xp": xp,
            "level": level,
            "streak": streak,
            "accuracy": accuracy,
            "problems_solved": problems_solved,
            "submission_count": submission_count,
            "placement_ready": placement_ready
        })

    df = pd.DataFrame(rows)
    out_path = os.path.join(OUT_DIR, "placement_training.csv")
    df.to_csv(out_path, index=False)
    print(f"[OK] Placement data: {len(df)} rows → {out_path}")
    return df


# ─────────────────────────────────────────────────────────────────────────────
# 2. Problem Difficulty Training Data
# ─────────────────────────────────────────────────────────────────────────────
def generate_difficulty_data(db):
    rows = []
    problems = db.get("problems", [])

    for prob in problems:
        title = prob.get("title", "")
        desc = prob.get("description", "")
        tags = " ".join(prob.get("tags", []))
        constraints = prob.get("constraints", "")
        hints_text = " ".join(prob.get("hints", []))
        text = f"{title} {tags} {desc} {constraints} {hints_text}"
        difficulty = prob.get("difficulty", "Easy")
        rows.append({"text": text.strip(), "difficulty": difficulty})

    # Additional hand-crafted synthetic examples for diversity
    synthetic = [
        # Easy
        ("sort array find max element basic loop", "Easy"),
        ("check palindrome string reverse compare", "Easy"),
        ("fibonacci sequence recursive base case", "Easy"),
        ("find duplicate element in array hash", "Easy"),
        ("count vowels consonants in string", "Easy"),
        ("sum of digits number modulo", "Easy"),
        ("linear search array index return", "Easy"),
        ("check prime number divisibility", "Easy"),
        ("reverse integer negative overflow", "Easy"),
        ("bubble sort swap array iteration", "Easy"),

        # Medium
        ("sliding window maximum subarray dynamic hash map", "Medium"),
        ("binary search rotated sorted array mid pivot", "Medium"),
        ("merge intervals sort overlap boundary check", "Medium"),
        ("two sum hash table constant time lookup", "Medium"),
        ("longest common subsequence dp memoization", "Medium"),
        ("number of islands BFS DFS graph connected component", "Medium"),
        ("construct binary tree inorder postorder recursion", "Medium"),
        ("LRU cache doubly linked list hash map O(1)", "Medium"),
        ("coin change dynamic programming tabulation minimum", "Medium"),
        ("word break string dp trie dictionary", "Medium"),

        # Hard
        ("serialize deserialize binary tree BFS level order complex", "Hard"),
        ("word ladder BFS bidirectional shortest path transformation", "Hard"),
        ("trapping rain water stack monotonic two pointers O(n)", "Hard"),
        ("edit distance levenshtein DP three states transition", "Hard"),
        ("regular expression matching wildcard backtrack DP", "Hard"),
        ("N queens backtracking column diagonal safe placement", "Hard"),
        ("maximum flow min cut ford fulkerson graph augmenting path", "Hard"),
        ("alien dictionary topological sort BFS Kahn cycle detect", "Hard"),
        ("skyline problem multiset sweep line segment event", "Hard"),
        ("minimum window substring sliding frequency hash", "Hard"),
    ]
    for text, diff in synthetic:
        rows.append({"text": text, "difficulty": diff})

    df = pd.DataFrame(rows)
    out_path = os.path.join(OUT_DIR, "difficulty_training.csv")
    df.to_csv(out_path, index=False)
    print(f"[OK] Difficulty data: {len(df)} rows → {out_path}")
    return df


# ─────────────────────────────────────────────────────────────────────────────
# 3. Problem Recommendation Interaction Data
# ─────────────────────────────────────────────────────────────────────────────
def generate_recommendation_data(db, n_users=200):
    problems = db.get("problems", [])
    prob_ids = [p["id"] for p in problems[:100]]  # Use first 100 for tractability

    rows = []
    # Real users
    for user in db.get("users", []):
        uid = user.get("id", "")
        for pid in user.get("problemsSolved", []):
            if pid in prob_ids:
                rows.append({"user_id": uid, "problem_id": pid, "solved": 1})

    # Synthetic users
    for i in range(n_users):
        uid = f"synthetic-user-{i}"
        # Simulate that users of certain "level" tend to solve certain difficulty clusters
        level = random.randint(1, 10)
        n_solved = random.randint(1, min(30, len(prob_ids)))
        solved_probs = random.sample(prob_ids, n_solved)
        for pid in solved_probs:
            rows.append({"user_id": uid, "problem_id": pid, "solved": 1})

    df = pd.DataFrame(rows).drop_duplicates()
    out_path = os.path.join(OUT_DIR, "recommendation_interactions.csv")
    df.to_csv(out_path, index=False)
    print(f"[OK] Recommendation data: {len(df)} rows → {out_path}")
    return df


# ─────────────────────────────────────────────────────────────────────────────
# 4. Save Problem Metadata (for recommender content features)
# ─────────────────────────────────────────────────────────────────────────────
def save_problem_metadata(db):
    problems = db.get("problems", [])
    rows = []
    for prob in problems:
        tags = " ".join(prob.get("tags", []))
        text = f"{prob.get('title', '')} {tags} {prob.get('description', '')} {prob.get('difficulty', '')}"
        rows.append({
            "problem_id": prob.get("id", ""),
            "title": prob.get("title", ""),
            "difficulty": prob.get("difficulty", "Easy"),
            "tags": tags,
            "text": text.strip()
        })
    df = pd.DataFrame(rows)
    out_path = os.path.join(OUT_DIR, "problem_metadata.csv")
    df.to_csv(out_path, index=False)
    print(f"[OK] Problem metadata: {len(df)} rows → {out_path}")
    return df


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 60)
    print("Placify ML — Training Data Generator")
    print("=" * 60)
    db = load_db()
    print(f"[DB] Users: {len(db.get('users', []))}, Problems: {len(db.get('problems', []))}, Submissions: {len(db.get('submissions', []))}")

    generate_placement_data(db)
    generate_difficulty_data(db)
    generate_recommendation_data(db)
    save_problem_metadata(db)

    print("=" * 60)
    print("[DONE] All training datasets generated successfully!")
    print("=" * 60)
