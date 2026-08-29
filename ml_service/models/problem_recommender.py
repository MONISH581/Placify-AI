"""
problem_recommender.py
Content-based + collaborative filtering problem recommender.
Uses TF-IDF embeddings of problem text + user solved history to recommend next problems.
"""

import os
import joblib
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from scipy.sparse import csr_matrix

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "saved_models")
os.makedirs(MODELS_DIR, exist_ok=True)


def train():
    # Load problem metadata
    prob_path = os.path.join(DATA_DIR, "problem_metadata.csv")
    inter_path = os.path.join(DATA_DIR, "recommendation_interactions.csv")

    if not os.path.exists(prob_path):
        raise FileNotFoundError(f"Problem metadata not found: {prob_path}")

    prob_df = pd.read_csv(prob_path).fillna("")
    print(f"[Recommender] Loaded {len(prob_df)} problems")

    # ── Content-Based: TF-IDF over problem text ──────────────────────────────
    tfidf = TfidfVectorizer(
        max_features=5000,
        ngram_range=(1, 2),
        sublinear_tf=True,
        min_df=1,
        stop_words="english"
    )
    tfidf_matrix = tfidf.fit_transform(prob_df["text"])
    content_sim = cosine_similarity(tfidf_matrix)

    print(f"[Recommender] TF-IDF matrix: {tfidf_matrix.shape}, Content sim matrix: {content_sim.shape}")

    # ── Collaborative Filtering: User-Item Matrix ─────────────────────────────
    user_item = None
    user_ids = []
    if os.path.exists(inter_path):
        inter_df = pd.read_csv(inter_path)
        prob_ids = prob_df["problem_id"].tolist()
        user_ids = inter_df["user_id"].unique().tolist()

        prob_idx = {pid: i for i, pid in enumerate(prob_ids)}
        user_idx = {uid: i for i, uid in enumerate(user_ids)}

        rows, cols, data = [], [], []
        for _, row in inter_df.iterrows():
            uid = row["user_id"]
            pid = row["problem_id"]
            if uid in user_idx and pid in prob_idx:
                rows.append(user_idx[uid])
                cols.append(prob_idx[pid])
                data.append(1.0)

        user_item = csr_matrix(
            (data, (rows, cols)),
            shape=(len(user_ids), len(prob_ids))
        )
        print(f"[Recommender] User-Item matrix: {user_item.shape}")

    model_data = {
        "tfidf": tfidf,
        "tfidf_matrix": tfidf_matrix,
        "content_sim": content_sim,
        "user_item": user_item,
        "user_ids": user_ids,
        "prob_ids": prob_df["problem_id"].tolist(),
        "prob_df": prob_df
    }

    model_path = os.path.join(MODELS_DIR, "recommender_model.pkl")
    joblib.dump(model_data, model_path)
    print(f"[Recommender] Model saved → {model_path}")
    return model_data


def recommend(model_data: dict, solved_ids: list, top_n: int = 10, difficulty_filter: str = None) -> list:
    """
    Recommend top_n problems based on solved history.
    Uses content-based similarity: averages TF-IDF vectors of solved problems,
    then ranks all unsolved problems by cosine similarity.

    Returns list of dicts: [{"problem_id": ..., "title": ..., "difficulty": ..., "score": ...}]
    """
    prob_df = model_data["prob_df"]
    tfidf_matrix = model_data["tfidf_matrix"]
    prob_ids = model_data["prob_ids"]

    solved_set = set(solved_ids)
    unsolved_mask = [pid not in solved_set for pid in prob_ids]

    if not any(unsolved_mask):
        return []

    # Average TF-IDF vector of solved problems as user preference profile
    solved_indices = [i for i, pid in enumerate(prob_ids) if pid in solved_set]

    if solved_indices:
        user_profile = np.asarray(tfidf_matrix[solved_indices].mean(axis=0))
        all_vecs = np.asarray(tfidf_matrix.todense())
        sims = cosine_similarity(user_profile, all_vecs)[0]
    else:
        # Cold start: rank by difficulty order (Easy first)
        diff_order = {"Easy": 0.9, "Medium": 0.6, "Hard": 0.3}
        sims = np.array([diff_order.get(prob_df.iloc[i]["difficulty"], 0.5) for i in range(len(prob_ids))])

    # Filter unsolved
    candidates = [
        {
            "problem_id": prob_ids[i],
            "title": prob_df.iloc[i]["title"],
            "difficulty": prob_df.iloc[i]["difficulty"],
            "tags": prob_df.iloc[i]["tags"],
            "score": round(float(sims[i]), 4)
        }
        for i in range(len(prob_ids))
        if unsolved_mask[i]
    ]

    # Optional difficulty filter
    if difficulty_filter and difficulty_filter in ("Easy", "Medium", "Hard"):
        candidates = [c for c in candidates if c["difficulty"] == difficulty_filter]

    # Sort by similarity score descending
    candidates.sort(key=lambda x: x["score"], reverse=True)
    return candidates[:top_n]


if __name__ == "__main__":
    train()
