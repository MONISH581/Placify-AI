"""
difficulty_classifier.py
TF-IDF text classifier for problem difficulty (Easy / Medium / Hard) from the
problem's title, tags, description and constraints.

- Trained on the curated, hand-labelled examples in data/generate_training_data.py.
- Candidates: LogisticRegression, LinearSVC wrapped in CalibratedClassifierCV (so it
  yields real probabilities), MultinomialNB. The winner is chosen by stratified
  k-fold CV on the TRAINING split only, refit on that split, and evaluated once on
  the held-out test split.
- predict() always returns probabilities in [0, 1] that sum to 1.
"""

import logging
import os
import sys
from pathlib import Path
from typing import Any, Dict, Optional

if __package__ in (None, ""):
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.calibration import CalibratedClassifierCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC

from core import config
from core.bundle import DIFFICULTY_FILE, save_bundle
from data.generate_training_data import DIFFICULTY_CSV

logger = logging.getLogger("placify.difficulty")

LABELS = ["Easy", "Medium", "Hard"]


def _tfidf(ngram_max: int = 3, sublinear: bool = True) -> TfidfVectorizer:
    # max_features=1500 keeps the vocabulary small relative to ~300 training examples.
    return TfidfVectorizer(
        max_features=1500,
        ngram_range=(1, ngram_max),
        sublinear_tf=sublinear,
        min_df=1,
        token_pattern=r"(?u)\b\w+\b",
    )


def _candidates(seed: int) -> Dict[str, Pipeline]:
    return {
        "TF-IDF + LogisticRegression": Pipeline([
            ("tfidf", _tfidf()),
            ("clf", LogisticRegression(max_iter=2000, C=1.0, class_weight="balanced",
                                       random_state=seed)),
        ]),
        "TF-IDF + LinearSVC (calibrated)": Pipeline([
            ("tfidf", _tfidf()),
            ("clf", CalibratedClassifierCV(
                estimator=LinearSVC(C=0.5, class_weight="balanced", max_iter=5000,
                                    random_state=seed),
                method="sigmoid",
                cv=3,
            )),
        ]),
        # Naive Bayes expects raw term frequencies, hence sublinear_tf=False.
        "TF-IDF + MultinomialNB": Pipeline([
            ("tfidf", _tfidf(ngram_max=2, sublinear=False)),
            ("clf", MultinomialNB(alpha=0.1)),
        ]),
    }


def train(csv_path: Optional[Path] = None, models_dir: Optional[Path] = None,
          cv_folds: int = 5, seed: int = 42) -> Dict[str, Any]:
    csv_path = Path(csv_path or config.generated_data_dir() / DIFFICULTY_CSV)
    if not csv_path.is_file():
        raise FileNotFoundError(f"Difficulty training data not found: {csv_path}")

    df = pd.read_csv(csv_path).dropna(subset=["text", "difficulty"])
    df = df[df["difficulty"].isin(LABELS)]
    logger.info("Difficulty: %d samples, distribution %s", len(df),
                df["difficulty"].value_counts().to_dict())

    X_train, X_test, y_train, y_test = train_test_split(
        df["text"], df["difficulty"], test_size=0.2, random_state=seed, stratify=df["difficulty"]
    )
    cv = StratifiedKFold(n_splits=cv_folds, shuffle=True, random_state=seed)

    cv_results: Dict[str, float] = {}
    candidates = _candidates(seed)
    for name, pipeline in candidates.items():
        scores = cross_val_score(pipeline, X_train, y_train, cv=cv, scoring="accuracy")
        cv_results[name] = float(scores.mean())
        logger.info("Difficulty CV (train split) %-32s accuracy %.4f +/- %.4f",
                    name, scores.mean(), scores.std())

    best_name = max(cv_results, key=cv_results.get)
    best = clone(candidates[best_name]).fit(X_train, y_train)

    y_pred = best.predict(X_test)
    metrics = {
        "selected_by": f"{cv_folds}-fold CV accuracy on the training split",
        "cv_accuracy": round(cv_results[best_name], 4),
        "test_accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
        "test_macro_f1": round(float(f1_score(y_test, y_pred, average="macro")), 4),
        "train_size": int(len(X_train)),
        "test_size": int(len(X_test)),
    }
    cm = confusion_matrix(y_test, y_pred, labels=LABELS)
    logger.info("Difficulty selected %s; held-out test accuracy %.4f, macro-F1 %.4f",
                best_name, metrics["test_accuracy"], metrics["test_macro_f1"])
    logger.info("Difficulty confusion matrix (rows=true, cols=pred, order %s): %s",
                LABELS, cm.tolist())

    out = Path(models_dir or config.models_dir()) / DIFFICULTY_FILE
    save_bundle(out, {"model": best, "labels": LABELS, "metrics": metrics}, model_name=best_name)
    logger.info("Difficulty model saved to %s", out)
    return {"model_name": best_name, **metrics}


def build_text(title: str = "", description: str = "", tags=None, constraints: str = "") -> str:
    tag_text = " ".join(t for t in (tags or []) if t)
    return " ".join(part.strip() for part in (title, tag_text, description, constraints) if part and part.strip())


def predict(bundle: Dict[str, Any], text: str) -> Dict[str, Any]:
    model = bundle["model"]
    raw = model.predict_proba([text])[0]
    by_class = {str(c): float(p) for c, p in zip(model.classes_, raw)}
    probs = np.array([max(0.0, by_class.get(label, 0.0)) for label in LABELS])
    total = probs.sum()
    probs = probs / total if total > 0 else np.full(len(LABELS), 1.0 / len(LABELS))

    rounded = [round(float(p), 4) for p in probs]
    top = int(np.argmax(probs))
    rounded[top] = round(rounded[top] + (1.0 - sum(rounded)), 4)  # make the sum exactly 1
    probabilities = {label: rounded[i] for i, label in enumerate(LABELS)}

    return {
        "difficulty": LABELS[top],
        "confidence": probabilities[LABELS[top]],
        "probabilities": probabilities,
        "model": bundle["model_name"],
    }


if __name__ == "__main__":
    config.setup_logging()
    train()
