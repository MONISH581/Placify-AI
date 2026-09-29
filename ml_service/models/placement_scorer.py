"""
placement_scorer.py
Placement-readiness classifier.

DEMO MODEL: there is no real placement-outcome data, so it is trained on the
synthetic cohort from data/generate_training_data.py. Responses are flagged
is_demo=true by the API.

Features: xp, level, streak, accuracy (0-100), problems_solved, submission_count.
Output:   probability of "placement ready"; score = round(probability * 100)
          (no extra xp/streak/accuracy bonuses on top of the model output).

Model selection: candidate models are compared with stratified k-fold CV on the
TRAINING split only. The winner is refit on the training split and its metrics
are reported on the held-out test split, which played no part in selection.
"""

import logging
import math
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

if __package__ in (None, ""):
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
from sklearn.base import clone
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, roc_auc_score
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from core import config
from core.bundle import PLACEMENT_FILE, save_bundle
from data.generate_training_data import PLACEMENT_CSV, PLACEMENT_FEATURES, readiness_signal

logger = logging.getLogger("placify.placement")

FEATURES = PLACEMENT_FEATURES
TARGET = "placement_ready"
HEURISTIC_MODEL_NAME = "heuristic-fallback"


def _candidates(seed: int) -> Dict[str, Any]:
    return {
        "LogisticRegression": Pipeline([
            ("scaler", StandardScaler()),
            ("clf", LogisticRegression(max_iter=2000, random_state=seed)),
        ]),
        "RandomForestClassifier": RandomForestClassifier(
            n_estimators=200, max_depth=10, min_samples_leaf=3, random_state=seed, n_jobs=-1,
        ),
        "HistGradientBoostingClassifier": HistGradientBoostingClassifier(
            max_iter=150, max_depth=4, learning_rate=0.05, early_stopping=False, random_state=seed,
        ),
    }


def train(csv_path: Optional[Path] = None, models_dir: Optional[Path] = None,
          cv_folds: int = 5, seed: int = 42) -> Dict[str, Any]:
    csv_path = Path(csv_path or config.generated_data_dir() / PLACEMENT_CSV)
    if not csv_path.is_file():
        raise FileNotFoundError(f"Placement training data not found: {csv_path}")

    df = pd.read_csv(csv_path)
    missing = [c for c in FEATURES + [TARGET] if c not in df.columns]
    if missing:
        raise ValueError(f"Placement training data is missing columns {missing}")

    X = df[FEATURES].fillna(0)
    y = df[TARGET].astype(int)
    logger.info("Placement: %d samples, class balance %s", len(df), y.value_counts().to_dict())

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=seed, stratify=y
    )
    cv = StratifiedKFold(n_splits=cv_folds, shuffle=True, random_state=seed)

    cv_results: Dict[str, float] = {}
    candidates = _candidates(seed)
    for name, estimator in candidates.items():
        scores = cross_val_score(estimator, X_train, y_train, cv=cv, scoring="roc_auc")
        cv_results[name] = float(scores.mean())
        logger.info("Placement CV (train split) %-30s ROC-AUC %.4f +/- %.4f",
                    name, scores.mean(), scores.std())

    best_name = max(cv_results, key=cv_results.get)
    best = clone(candidates[best_name]).fit(X_train, y_train)

    proba = best.predict_proba(X_test)[:, list(best.classes_).index(1)]
    pred = (proba >= 0.5).astype(int)
    metrics = {
        "selected_by": f"{cv_folds}-fold CV ROC-AUC on the training split",
        "cv_roc_auc": round(cv_results[best_name], 4),
        "test_accuracy": round(float(accuracy_score(y_test, pred)), 4),
        "test_roc_auc": round(float(roc_auc_score(y_test, proba)), 4),
        "train_size": int(len(X_train)),
        "test_size": int(len(X_test)),
    }
    logger.info("Placement selected %s; held-out test accuracy %.4f, ROC-AUC %.4f",
                best_name, metrics["test_accuracy"], metrics["test_roc_auc"])

    out = Path(models_dir or config.models_dir()) / PLACEMENT_FILE
    save_bundle(out, {"model": best, "features": FEATURES, "metrics": metrics}, model_name=best_name)
    logger.info("Placement model saved to %s", out)
    return {"model_name": best_name, **metrics}


def _to_score(probability: float) -> int:
    """round(probability * 100), half-up, clamped to 0-100."""
    return int(min(100, max(0, math.floor(probability * 100 + 0.5))))


def predict(bundle: Dict[str, Any], user_features: Dict[str, Any]) -> Dict[str, Any]:
    model = bundle["model"]
    features = bundle["features"]
    row = [[float(user_features.get(f) or 0) for f in features]]
    X = pd.DataFrame(row, columns=features)

    proba = model.predict_proba(X)[0]
    classes = list(model.classes_)
    ready_prob = float(proba[classes.index(1)]) if 1 in classes else 0.0
    probability = round(min(1.0, max(0.0, ready_prob)), 4)

    return {
        "placement_ready": probability >= 0.5,
        "score": _to_score(probability),
        "probability": probability,
        "model": bundle["model_name"],
    }


def heuristic_predict(user_features: Dict[str, Any]) -> Dict[str, Any]:
    """
    Documented fallback used only when no trained placement model is available:
    the probability is the deterministic readiness_signal() (the same weighted,
    normalised signals used to label the synthetic training cohort, without noise).
    """
    probability = round(min(1.0, max(0.0, readiness_signal(user_features))), 4)
    return {
        "placement_ready": probability >= 0.5,
        "score": _to_score(probability),
        "probability": probability,
        "model": HEURISTIC_MODEL_NAME,
    }


def insights(user_features: Dict[str, Any]) -> List[str]:
    """Actionable, rule-based feedback shown next to the score."""
    tips = []
    if float(user_features.get("problems_solved") or 0) < 30:
        tips.append("[Practice] Solve at least 30 DSA problems to strengthen your profile.")
    if float(user_features.get("streak") or 0) < 15:
        tips.append("[Consistency] Maintain a daily streak of 15+ days to demonstrate consistency.")
    if float(user_features.get("accuracy") or 0) < 70:
        tips.append("[Accuracy] Improve submission accuracy - test edge cases before submitting.")
    if float(user_features.get("xp") or 0) < 2000:
        tips.append("[XP] Earn more XP by solving Medium and Hard problems.")
    if not tips:
        tips.append("[Profile] Strong profile - keep practising mock interviews to stay sharp.")
    return tips


if __name__ == "__main__":
    config.setup_logging()
    train()
