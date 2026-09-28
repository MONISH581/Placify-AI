import os
import json
import joblib
import faiss
import numpy as np

models_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "saved_models")

print("=" * 60)
print("Placify ML Artifact Verification")
print("=" * 60)

# 1. Placement Model
p_path = os.path.join(models_dir, "placement_model.pkl")
assert os.path.exists(p_path) and os.path.getsize(p_path) > 0, "Missing placement_model.pkl"
p_obj = joblib.load(p_path)
assert "model" in p_obj and "features" in p_obj
from models.placement_scorer import predict as p_predict
p_res = p_predict(p_obj, {"xp": 2500, "level": 5, "streak": 20, "accuracy": 80.0, "problems_solved": 45, "submission_count": 60})
print(f"[OK] 1. Placement Model Loaded ({os.path.getsize(p_path)} bytes)")
print(f"     Prediction: score={p_res['score']}, ready={p_res['placement_ready']}, prob={p_res['probability']}")

# 2. Difficulty Model
d_path = os.path.join(models_dir, "difficulty_model.pkl")
assert os.path.exists(d_path) and os.path.getsize(d_path) > 0, "Missing difficulty_model.pkl"
d_obj = joblib.load(d_path)
assert "model" in d_obj and "label_map" in d_obj
from models.difficulty_classifier import predict as d_predict
d_res = d_predict(d_obj, "Given an array find the maximum element using a loop")
print(f"[OK] 2. Difficulty Model Loaded ({os.path.getsize(d_path)} bytes)")
print(f"     Prediction: difficulty={d_res['difficulty']}, confidence={d_res['confidence']}")

# 3. Recommender Model
r_path = os.path.join(models_dir, "recommender_model.pkl")
assert os.path.exists(r_path) and os.path.getsize(r_path) > 0, "Missing recommender_model.pkl"
r_obj = joblib.load(r_path)
assert "prob_df" in r_obj and "tfidf_matrix" in r_obj
from models.problem_recommender import recommend as r_recommend
r_res = r_recommend(r_obj, solved_ids=["prob-1"], top_n=3)
print(f"[OK] 3. Recommender Model Loaded ({os.path.getsize(r_path)} bytes)")
print(f"     Recommendations: {len(r_res)} returned -> top: '{r_res[0]['title']}' (score: {r_res[0]['score']})")

# 4. FAISS Index
f_path = os.path.join(models_dir, "faiss_index.bin")
assert os.path.exists(f_path) and os.path.getsize(f_path) > 0, "Missing faiss_index.bin"
index = faiss.read_index(f_path)
print(f"[OK] 4. FAISS Index Loaded ({os.path.getsize(f_path)} bytes)")
print(f"     Index: total={index.ntotal} vectors, dimension={index.d}")
assert index.ntotal == 192 and index.d == 384

# 5. RAG Metadata
m_path = os.path.join(models_dir, "rag_metadata.json")
assert os.path.exists(m_path) and os.path.getsize(m_path) > 0, "Missing rag_metadata.json"
with open(m_path, "r", encoding="utf-8") as f:
    meta = json.load(f)
print(f"[OK] 5. RAG Metadata Loaded ({os.path.getsize(m_path)} bytes)")
print(f"     Chunks: {len(meta)} chunks, first topic: '{meta[0].get('topic')}'")
assert len(meta) == 192

# 6. Interview Scorer
from models.interview_scorer import score_answer
s_res = score_answer("What is dynamic programming?", "Dynamic programming breaks problems into subproblems and stores solutions.")
print(f"[OK] 6. Interview Scorer Functional")
print(f"     Score: {s_res['score']}/100, method: {s_res['method']}, feedback: {s_res['feedback'][:50]}...")

print("=" * 60)
print("ALL 5 ARTIFACTS + INTERVIEW SCORER 100% VERIFIED!")
print("=" * 60)
