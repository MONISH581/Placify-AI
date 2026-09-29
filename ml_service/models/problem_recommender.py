"""
problem_recommender.py
Content-based problem recommender over the problem bank (SQLite, see
core/problem_bank.py).

- Each problem is represented by an L2-normalised TF-IDF vector of its title,
  tags and description (sparse CSR matrix, the only large object in the bundle).
- A user's profile is the mean vector of the problems they solved; unsolved
  problems are ranked by cosine similarity to it using sparse matrix-vector
  products (the problem matrix is never densified).
- Cold start (no solved problems, or none of the solved ids exist in the bank):
  easiest problems first.
"""

import logging
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

if __package__ in (None, ""):
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer

from core import config
from core.bundle import RECOMMENDER_FILE, save_bundle
from core.problem_bank import fingerprint, load_problems

logger = logging.getLogger("placify.recommender")

MODEL_NAME = "TF-IDF content-based recommender"
DIFFICULTY_RANK = {"Easy": 0, "Medium": 1, "Hard": 2}
COLD_START_SCORE = {"Easy": 0.9, "Medium": 0.6, "Hard": 0.3}


def _problem_text(problem: Dict[str, Any]) -> str:
    tags = " ".join(problem.get("tags") or [])
    # Tags are repeated so topic overlap weighs more than incidental description words.
    return f"{problem.get('title', '')} {tags} {tags} {problem.get('description', '')}".strip()


def train(problems: Optional[List[Dict[str, Any]]] = None,
          models_dir: Optional[Path] = None) -> Dict[str, Any]:
    problems = problems if problems is not None else load_problems()
    if not problems:
        raise ValueError("No problems to train the recommender on")

    vectorizer = TfidfVectorizer(
        max_features=5000, ngram_range=(1, 2), sublinear_tf=True, min_df=1, stop_words="english",
    )
    matrix = vectorizer.fit_transform([_problem_text(p) for p in problems]).tocsr().astype(np.float32)

    items = [
        {
            "problem_id": p["id"],
            "title": p["title"],
            "difficulty": p["difficulty"],
            "tags": list(p.get("tags") or []),
        }
        for p in problems
    ]
    index = {item["problem_id"]: i for i, item in enumerate(items)}

    out = Path(models_dir or config.models_dir()) / RECOMMENDER_FILE
    payload = {"matrix": matrix, "items": items, "index": index,
               "problem_fingerprint": fingerprint(problems)}
    save_bundle(out, payload, model_name=MODEL_NAME)
    logger.info("Recommender: %d problems, vocabulary %d terms, saved to %s",
                len(items), len(vectorizer.vocabulary_), out)
    return {"model_name": MODEL_NAME, "problems": len(items), "vocabulary": len(vectorizer.vocabulary_)}


def recommend(bundle: Dict[str, Any], solved_ids: List[str], top_n: int = 10,
              difficulty_filter: Optional[str] = None) -> Dict[str, Any]:
    """
    Returns {"recommendations": [{problem_id, title, difficulty, tags, score}],
             "strategy": "content" | "cold-start", "model": str}
    Solved problems are always excluded; unknown solved ids are ignored.
    """
    items = bundle["items"]
    matrix = bundle["matrix"]
    index = bundle["index"]

    solved = {str(s).strip() for s in (solved_ids or []) if str(s).strip()}
    known_rows = sorted(index[s] for s in solved if s in index)

    scores = None
    if known_rows:
        profile = np.asarray(matrix[known_rows].mean(axis=0)).ravel()  # 1 x vocab, small
        norm = float(np.linalg.norm(profile))
        if norm > 0:
            scores = np.asarray(matrix.dot(profile)).ravel() / norm  # rows are unit-norm -> cosine
    strategy = "content" if scores is not None else "cold-start"
    if scores is None:
        scores = np.array([COLD_START_SCORE.get(item["difficulty"], 0.5) for item in items])

    candidates = [
        i for i, item in enumerate(items)
        if item["problem_id"] not in solved
        and (not difficulty_filter or item["difficulty"] == difficulty_filter)
    ]
    candidates.sort(key=lambda i: (
        -float(scores[i]),
        DIFFICULTY_RANK.get(items[i]["difficulty"], 1),
        items[i]["problem_id"],
    ))

    recommendations = [
        {
            "problem_id": items[i]["problem_id"],
            "title": items[i]["title"],
            "difficulty": items[i]["difficulty"],
            "tags": list(items[i]["tags"]),
            "score": round(float(scores[i]), 4),
        }
        for i in candidates[:max(0, int(top_n))]
    ]
    return {"recommendations": recommendations, "strategy": strategy, "model": bundle["model_name"]}


if __name__ == "__main__":
    config.setup_logging()
    train()
