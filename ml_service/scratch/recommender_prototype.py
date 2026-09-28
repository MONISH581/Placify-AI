"""
scratch/recommender_prototype.py
Full experiment for Problem Recommender:
1. Generate interactions across all 500 problems with realistic track/difficulty clustering.
2. Compute TF-IDF content similarity and Item-Item CF matrix.
3. Fast vectorized hybrid recommendation without .todense().
4. Offline leave-one-out evaluation.
5. Topic personalization test (Arrays, Graphs, DP).
6. Difficulty progression test (Beginner, Intermediate, Advanced).
7. Duplicate exclusion test.
8. Cold start test.
9. Latency benchmark.
"""

import json
import os
import random
import time
import numpy as np
import pandas as pd
from collections import defaultdict
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from scipy.sparse import csr_matrix

random.seed(42)
np.random.seed(42)

# Load data
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ml_service", "data")
DB_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "server-db.json")

with open(DB_FILE, "r", encoding="utf-8") as f:
    db = json.load(f)

problems = db.get("problems", [])
all_prob_ids = [p["id"] for p in problems]
prob_by_id = {p["id"]: p for p in problems}

print(f"Total problems loaded: {len(problems)}")

# 1. Define tracks and cluster problems
tracks = {
    "linear_dsa": ["Arrays", "Strings", "Two Pointers", "Sliding Window", "Hashing"],
    "hierarchical": ["Linked Lists", "Stacks", "Queues", "Trees", "Binary Search Trees"],
    "graphs_heaps": ["Graphs", "Trees", "Heaps", "Segment Trees", "Tries"],
    "algo_dp": ["Recursion", "Backtracking", "Dynamic Programming", "Greedy Algorithms", "Bit Manipulation", "Advanced Interview Problems"]
}

# Map each problem to its topics and difficulties
prob_topics = defaultdict(list)
probs_by_topic = defaultdict(list)
probs_by_diff = defaultdict(list)

for p in problems:
    pid = p["id"]
    diff = p.get("difficulty", "Easy")
    probs_by_diff[diff].append(pid)
    for tag in p.get("tags", []):
        probs_by_topic[tag].append(pid)
        prob_topics[pid].append(tag)

# Generate synthetic interactions covering all 500 problems
def generate_synthetic_interactions(n_users=350):
    rows = []
    track_names = list(tracks.keys())
    
    # Real users first
    for user in db.get("users", []):
        uid = user.get("id", "")
        for pid in user.get("problemsSolved", []):
            if pid in prob_by_id:
                rows.append({"user_id": uid, "problem_id": pid, "solved": 1})

    # To guarantee 100% coverage, ensure each problem is solved by at least 3 users
    all_unassigned = set(all_prob_ids)
    
    for i in range(n_users):
        uid = f"synthetic-user-{i}"
        user_tier = random.choices(["Beginner", "Intermediate", "Advanced"], weights=[0.40, 0.40, 0.20])[0]
        
        # Difficulty sampling weights based on tier
        if user_tier == "Beginner":
            diff_weights = {"Easy": 0.65, "Medium": 0.30, "Hard": 0.05}
            n_solved = random.randint(8, 20)
        elif user_tier == "Intermediate":
            diff_weights = {"Easy": 0.25, "Medium": 0.55, "Hard": 0.20}
            n_solved = random.randint(15, 30)
        else: # Advanced
            diff_weights = {"Easy": 0.10, "Medium": 0.45, "Hard": 0.45}
            n_solved = random.randint(20, 40)

        # Primary track for this user (70% probability to pick from primary track)
        primary_track = random.choice(track_names)
        track_topics = tracks[primary_track]
        
        track_pool = []
        for t in track_topics:
            track_pool.extend(probs_by_topic[t])
        track_pool = list(set(track_pool))
        
        # Build candidate pool for this user with weights
        # Blend: 70% from user's track, 30% from general pool
        user_probs = set()
        
        # Guarantee coverage: periodically inject unassigned problems
        if all_unassigned and random.random() < 0.3:
            unassigned_pick = random.sample(list(all_unassigned), min(2, len(all_unassigned)))
            for up in unassigned_pick:
                user_probs.add(up)
                all_unassigned.discard(up)
                
        # Draw remaining from track and general pools matching difficulty
        attempts = 0
        while len(user_probs) < n_solved and attempts < 150:
            attempts += 1
            # Pick source: track pool vs general pool
            if random.random() < 0.75 and track_pool:
                cand_id = random.choice(track_pool)
            else:
                cand_id = random.choice(all_prob_ids)
                
            cand_diff = prob_by_id[cand_id].get("difficulty", "Easy")
            # Acceptance probability based on difficulty
            if random.random() < diff_weights[cand_diff]:
                user_probs.add(cand_id)
                all_unassigned.discard(cand_id)
                
        for pid in user_probs:
            rows.append({"user_id": uid, "problem_id": pid, "solved": 1})
            
    # If any problems still unassigned, assign them to a few users
    for pid in list(all_unassigned):
        for _ in range(3):
            random_user = f"synthetic-user-{random.randint(0, n_users - 1)}"
            rows.append({"user_id": random_user, "problem_id": pid, "solved": 1})

    df = pd.DataFrame(rows).drop_duplicates()
    return df

inter_df = generate_synthetic_interactions()
print(f"Generated {len(inter_df)} interaction rows across {inter_df['user_id'].nunique()} users")
print(f"Unique problems in interactions: {inter_df['problem_id'].nunique()} / {len(all_prob_ids)}")

# 2. Build Recommender model data
prob_meta_path = os.path.join(DATA_DIR, "problem_metadata.csv")
prob_df = pd.read_csv(prob_meta_path).fillna("")
prob_ids = prob_df["problem_id"].tolist()
prob_idx_map = {pid: i for i, pid in enumerate(prob_ids)}

# TF-IDF Content Matrix
tfidf = TfidfVectorizer(
    max_features=5000,
    ngram_range=(1, 2),
    sublinear_tf=True,
    min_df=1,
    stop_words="english"
)
tfidf_matrix = tfidf.fit_transform(prob_df["text"])
content_sim_matrix = cosine_similarity(tfidf_matrix).astype(np.float32)

# User-Item Matrix
user_ids = inter_df["user_id"].unique().tolist()
user_idx_map = {uid: i for i, uid in enumerate(user_ids)}

rows, cols, data = [], [], []
for _, row in inter_df.iterrows():
    uid = row["user_id"]
    pid = row["problem_id"]
    if uid in user_idx_map and pid in prob_idx_map:
        rows.append(user_idx_map[uid])
        cols.append(prob_idx_map[pid])
        data.append(1.0)

user_item = csr_matrix((data, (rows, cols)), shape=(len(user_ids), len(prob_ids)), dtype=np.float32)
# Item-Item similarity matrix
item_sim_matrix = cosine_similarity(user_item.T).astype(np.float32)

# Precomputed fast lookups for zero pandas .iloc latency
titles_list = prob_df["title"].tolist()
diffs_list = prob_df["difficulty"].tolist()
tags_list = prob_df["tags"].tolist()

# Precompute difficulty mapping: Easy: 1, Medium: 2, Hard: 3
diff_int_map = {"Easy": 1, "Medium": 2, "Hard": 3}
prob_diff_ints = np.array([diff_int_map.get(d, 1) for d in diffs_list], dtype=np.int32)

# Item popularity for cold-start (number of solves normalized)
solve_counts = np.asarray(user_item.sum(axis=0)).flatten()
max_solves = solve_counts.max() if solve_counts.max() > 0 else 1.0
popularity_scores = (solve_counts / max_solves).astype(np.float32)

print(f"Content sim matrix: {content_sim_matrix.shape}")
print(f"Item sim matrix: {item_sim_matrix.shape}")

model_data = {
    "tfidf": tfidf,
    "tfidf_matrix": tfidf_matrix,
    "content_sim": content_sim_matrix,
    "item_sim": item_sim_matrix,
    "user_item": user_item,
    "user_ids": user_ids,
    "prob_ids": prob_ids,
    "prob_idx_map": prob_idx_map,
    "prob_df": prob_df,
    "titles_list": titles_list,
    "diffs_list": diffs_list,
    "tags_list": tags_list,
    "prob_diff_ints": prob_diff_ints,
    "popularity_scores": popularity_scores,
}

# 3. Recommendation Function
def fast_recommend(model_data: dict, solved_ids: list, top_n: int = 10, difficulty_filter: str = None) -> list:
    prob_ids = model_data["prob_ids"]
    prob_idx_map = model_data["prob_idx_map"]
    content_sim = model_data["content_sim"]
    item_sim = model_data["item_sim"]
    titles_list = model_data["titles_list"]
    diffs_list = model_data["diffs_list"]
    tags_list = model_data["tags_list"]
    prob_diff_ints = model_data["prob_diff_ints"]
    popularity_scores = model_data["popularity_scores"]

    solved_set = set(solved_ids)
    n_problems = len(prob_ids)

    # Valid solved indices
    solved_indices = [prob_idx_map[pid] for pid in solved_ids if pid in prob_idx_map]

    # Boolean mask of unsolved
    unsolved_mask = np.ones(n_problems, dtype=bool)
    if solved_indices:
        unsolved_mask[solved_indices] = False

    if not np.any(unsolved_mask):
        return []

    # Difficulty affinity scoring
    if solved_indices:
        solved_diffs = prob_diff_ints[solved_indices]
        avg_diff = solved_diffs.mean()
        # Profile detection:
        # Beginner (avg_diff < 1.6): Easy preferred (1.0), Med (0.75), Hard (0.25)
        # Intermediate (1.6 <= avg_diff <= 2.3): Med preferred (1.0), Easy (0.65), Hard (0.70)
        # Advanced (avg_diff > 2.3): Hard preferred (1.0), Med (0.80), Easy (0.35)
        if avg_diff < 1.6:
            diff_weights = np.where(prob_diff_ints == 1, 1.0, np.where(prob_diff_ints == 2, 0.75, 0.25))
        elif avg_diff <= 2.3:
            diff_weights = np.where(prob_diff_ints == 2, 1.0, np.where(prob_diff_ints == 3, 0.70, 0.65))
        else:
            diff_weights = np.where(prob_diff_ints == 3, 1.0, np.where(prob_diff_ints == 2, 0.80, 0.35))

        # Content score
        content_score = content_sim[solved_indices].mean(axis=0)
        # Collab score
        collab_score = item_sim[solved_indices].mean(axis=0)

        # Hybrid final score
        # 0.50 Content + 0.30 Collaborative + 0.20 Difficulty Affinity
        final_scores = (0.50 * content_score) + (0.30 * collab_score) + (0.20 * diff_weights)
    else:
        # Cold start: Easy first, blend with popularity
        # Beginner default: Easy=1.0, Med=0.65, Hard=0.30
        diff_weights = np.where(prob_diff_ints == 1, 1.0, np.where(prob_diff_ints == 2, 0.65, 0.30))
        final_scores = 0.70 * diff_weights + 0.30 * popularity_scores

    # Extract eligible candidate indices
    unsolved_indices = np.where(unsolved_mask)[0]

    # Apply difficulty filter if provided
    if difficulty_filter in ("Easy", "Medium", "Hard"):
        target_diff_int = diff_int_map.get(difficulty_filter, 1)
        unsolved_indices = unsolved_indices[prob_diff_ints[unsolved_indices] == target_diff_int]

    if len(unsolved_indices) == 0:
        return []

    # Rank candidate indices
    cand_scores = final_scores[unsolved_indices]
    if len(unsolved_indices) > top_n:
        # Argpartition for top_n selection followed by sorting top_n
        top_sub_idx = np.argpartition(cand_scores, -top_n)[-top_n:]
        sorted_sub_idx = top_sub_idx[np.argsort(-cand_scores[top_sub_idx])]
        top_indices = unsolved_indices[sorted_sub_idx]
    else:
        sorted_sub_idx = np.argsort(-cand_scores)
        top_indices = unsolved_indices[sorted_sub_idx]

    recommendations = [
        {
            "problem_id": prob_ids[idx],
            "title": titles_list[idx],
            "difficulty": diffs_list[idx],
            "tags": tags_list[idx],
            "score": round(float(final_scores[idx]), 4)
        }
        for idx in top_indices
    ]
    return recommendations[:top_n]

print("\nRunning quick sanity check on recommend:")
sample_rec = fast_recommend(model_data, solved_ids=["two-sum"], top_n=5)
print("Top 5 for two-sum:")
for r in sample_rec:
    print(f"  [{r['difficulty']}] {r['title']} (Score: {r['score']}) - Tags: {r['tags']}")

# 4. Offline Leave-One-Out Evaluation
def evaluate_leave_one_out(model_data, inter_df, min_solved=5, num_eval_users=100):
    user_groups = inter_df.groupby("user_id")["problem_id"].apply(list)
    eligible_users = [uid for uid, pids in user_groups.items() if len(pids) >= min_solved]
    
    if len(eligible_users) > num_eval_users:
        eval_users = random.sample(eligible_users, num_eval_users)
    else:
        eval_users = eligible_users

    # Protocol 1: Standard benchmark (test positive + 99 random negative items)
    # Protocol 2: Full catalog (ranking test positive against all remaining 450+ items)
    
    p1_hits, p1_prec, p1_rec, p1_ndcg = [], [], [], []
    p2_hits, p2_prec, p2_rec, p2_ndcg = [], [], [], []
    
    prob_ids = model_data["prob_ids"]
    prob_idx_map = model_data["prob_idx_map"]
    
    for uid in eval_users:
        solved_list = user_groups[uid]
        # Pick 1 random held-out item as ground truth positive
        test_item = random.choice(solved_list)
        train_solved = [p for p in solved_list if p != test_item]
        
        # Protocol 2: Recommend top-5 from catalog
        recs_p2 = fast_recommend(model_data, solved_ids=train_solved, top_n=5)
        rec_ids_p2 = [r["problem_id"] for r in recs_p2]
        
        hit_p2 = 1.0 if test_item in rec_ids_p2 else 0.0
        p2_hits.append(hit_p2)
        p2_prec.append(hit_p2 / 5.0)
        p2_rec.append(hit_p2 / 1.0) # 1 positive item held out
        if hit_p2:
            rank = rec_ids_p2.index(test_item) + 1
            p2_ndcg.append(1.0 / np.log2(rank + 1))
        else:
            p2_ndcg.append(0.0)

        # Protocol 1: Rank test item against 99 random unvisited items
        all_unsolved = [pid for pid in prob_ids if pid not in solved_list]
        negatives = random.sample(all_unsolved, min(99, len(all_unsolved)))
        candidates_p1 = [test_item] + negatives
        
        # Calculate scores for candidate items using model logic
        solved_indices = [prob_idx_map[pid] for pid in train_solved if pid in prob_idx_map]
        cand_indices = [prob_idx_map[pid] for pid in candidates_p1 if pid in prob_idx_map]
        
        # Hybrid scores for candidates
        solved_diffs = model_data["prob_diff_ints"][solved_indices]
        avg_diff = solved_diffs.mean()
        if avg_diff < 1.6:
            diff_weights = np.where(model_data["prob_diff_ints"] == 1, 1.0, np.where(model_data["prob_diff_ints"] == 2, 0.75, 0.25))
        elif avg_diff <= 2.3:
            diff_weights = np.where(model_data["prob_diff_ints"] == 2, 1.0, np.where(model_data["prob_diff_ints"] == 3, 0.70, 0.65))
        else:
            diff_weights = np.where(model_data["prob_diff_ints"] == 3, 1.0, np.where(model_data["prob_diff_ints"] == 2, 0.80, 0.35))

        c_score = model_data["content_sim"][solved_indices].mean(axis=0)[cand_indices]
        collab_score = model_data["item_sim"][solved_indices].mean(axis=0)[cand_indices]
        d_score = diff_weights[cand_indices]
        
        cand_final = 0.50 * c_score + 0.30 * collab_score + 0.20 * d_score
        
        # Top-5 among the 100 candidate items
        top5_sub = np.argsort(-cand_final)[:5]
        top5_cands = [candidates_p1[idx] for idx in top5_sub]
        
        hit_p1 = 1.0 if test_item in top5_cands else 0.0
        p1_hits.append(hit_p1)
        p1_prec.append(hit_p1 / 5.0)
        p1_rec.append(hit_p1 / 1.0)
        if hit_p1:
            rank = top5_cands.index(test_item) + 1
            p1_ndcg.append(1.0 / np.log2(rank + 1))
        else:
            p1_ndcg.append(0.0)

    print("\n" + "="*60)
    print(f"OFFLINE EVALUATION ({len(eval_users)} users with >= {min_solved} solved problems):")
    print("="*60)
    print(f"Protocol 1 (Standard IR benchmark: 1 test item vs 99 negatives):")
    print(f"  HitRate@5   : {np.mean(p1_hits):.4f} ({np.mean(p1_hits)*100:.1f}%)")
    print(f"  Precision@5 : {np.mean(p1_prec):.4f}")
    print(f"  Recall@5    : {np.mean(p1_rec):.4f}")
    print(f"  NDCG@5      : {np.mean(p1_ndcg):.4f}")
    print(f"\nProtocol 2 (Full Catalog: 1 test item vs entire 480+ item catalog):")
    print(f"  HitRate@5   : {np.mean(p2_hits):.4f} ({np.mean(p2_hits)*100:.1f}%)")
    print(f"  Precision@5 : {np.mean(p2_prec):.4f}")
    print(f"  Recall@5    : {np.mean(p2_rec):.4f}")
    print(f"  NDCG@5      : {np.mean(p2_ndcg):.4f}")
    print("="*60)

evaluate_leave_one_out(model_data, inter_df)

# 5. Topic Personalization Test
print("\n--- Topic Personalization Test ---")
array_probs = probs_by_topic["Arrays"][:5]
graph_probs = probs_by_topic["Graphs"][:5]
dp_probs = probs_by_topic["Dynamic Programming"][:5]

array_recs = fast_recommend(model_data, solved_ids=array_probs, top_n=5)
graph_recs = fast_recommend(model_data, solved_ids=graph_probs, top_n=5)
dp_recs = fast_recommend(model_data, solved_ids=dp_probs, top_n=5)

array_ids = set(r["problem_id"] for r in array_recs)
graph_ids = set(r["problem_id"] for r in graph_recs)
dp_ids = set(r["problem_id"] for r in dp_recs)

overlap_ag = len(array_ids & graph_ids) / 5.0
overlap_ad = len(array_ids & dp_ids) / 5.0
overlap_gd = len(graph_ids & dp_ids) / 5.0
avg_overlap = (overlap_ag + overlap_ad + overlap_gd) / 3.0

print(f"Array recs: {[r['title'] for r in array_recs]}")
print(f"Graph recs: {[r['title'] for r in graph_recs]}")
print(f"DP recs:    {[r['title'] for r in dp_recs]}")
print(f"Cross-topic overlap: Array/Graph: {overlap_ag*100:.1f}%, Array/DP: {overlap_ad*100:.1f}%, Graph/DP: {overlap_gd*100:.1f}%")
print(f"Average cross-topic overlap: {avg_overlap*100:.1f}% (Target: <= 20%)")

# 6. Difficulty Progression Test
print("\n--- Difficulty Progression Test ---")
easy_pool = probs_by_diff["Easy"][:8]
med_pool = probs_by_diff["Medium"][:8]
hard_pool = probs_by_diff["Hard"][:8]

beginner_recs = fast_recommend(model_data, solved_ids=easy_pool, top_n=5)
intermediate_recs = fast_recommend(model_data, solved_ids=med_pool, top_n=5)
advanced_recs = fast_recommend(model_data, solved_ids=hard_pool, top_n=5)

from collections import Counter
print(f"Beginner top-5 diffs:     {Counter([r['difficulty'] for r in beginner_recs])}")
print(f"Intermediate top-5 diffs: {Counter([r['difficulty'] for r in intermediate_recs])}")
print(f"Advanced top-5 diffs:     {Counter([r['difficulty'] for r in advanced_recs])}")

# 7. Duplicate Exclusion Test
print("\n--- Duplicate Exclusion Test ---")
test_solved = array_probs + graph_probs
recs = fast_recommend(model_data, solved_ids=test_solved, top_n=10)
rec_ids = [r["problem_id"] for r in recs]
duplicates = set(rec_ids) & set(test_solved)
print(f"Solved count: {len(test_solved)}, Recommended count: {len(recs)}")
print(f"Duplicates found: {len(duplicates)} (Expected: 0) -> Duplicate exclusion: {100.0 if len(duplicates) == 0 else 0.0}%")

# 8. Cold Start Test
print("\n--- Cold Start Test ---")
cold_recs = fast_recommend(model_data, solved_ids=[], top_n=5)
print(f"Cold start recs count: {len(cold_recs)}")
print("Cold start problems:")
for r in cold_recs:
    print(f"  [{r['difficulty']}] {r['title']} (Score: {r['score']})")
all_fields_present = all("problem_id" in r and "title" in r and "difficulty" in r and "tags" in r and "score" in r for r in cold_recs)
print(f"All required fields present: {all_fields_present}")

# 9. Latency Benchmark
print("\n--- Latency Benchmark (100 runs) ---")
times = []
for _ in range(100):
    sample_solved = random.sample(all_prob_ids, random.randint(1, 20))
    t0 = time.perf_counter()
    _ = fast_recommend(model_data, solved_ids=sample_solved, top_n=10)
    t1 = time.perf_counter()
    times.append((t1 - t0) * 1000.0)

mean_lat = np.mean(times)
p50_lat = np.percentile(times, 50)
p95_lat = np.percentile(times, 95)
print(f"Mean latency:   {mean_lat:.2f} ms")
print(f"Median (p50):   {p50_lat:.2f} ms")
print(f"p95 latency:    {p95_lat:.2f} ms")
print(f"Latency target <= 15 ms: {'PASSED' if p95_lat <= 15.0 else 'FAILED'}")
