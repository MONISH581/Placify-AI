"""
placement_scorer.py
Placement-readiness classifier (DEMO MODEL).

There is no real placement-outcome data: the model is trained on the synthetic
cohort from data/generate_training_data.py and every API response is flagged
is_demo=true. The score is not a validated real-world prediction.

Features: app-relative, defined once in core/placement_features.py:
          solved_ratio, accuracy, streak_sig, interview_average + has_interview,
          topic_ratio, practice_volume. Raw xp / level are not inputs.
Output:   probability of "placement ready"; score = round(probability * 100)
          (no bonuses on top of the model output).

Model selection: only model families that can be kept monotone are candidates
(logistic regression; gradient boosting with monotonic constraints), and a probe
check rejects any fitted candidate whose score drops when a monotone feature
rises, so solving more, better accuracy or better interviews never lower the
score. Candidates are compared with stratified k-fold CV on the TRAINING split
only; the winner is refit on the training split and its metrics are reported on
the held-out test split, which played no part in selection.

The bundle stores the feature list and FEATURE_VERSION. A bundle saved by other
code (for example the old xp/level model) is treated as missing: main.py falls
back to the heuristic and `train_all.py --only-missing` retrains it.
"""

import logging
import math
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Mapping, Optional, Tuple

if __package__ in (None, ""):
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, brier_score_loss, roc_auc_score
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from core import config
from core.bundle import PLACEMENT_FILE, save_bundle
from core.placement_features import (
    ACCURACY_EVIDENCE_VOLUME, FEATURES, MONOTONE, NOISE_SCALE, READY_BAR,
    SIGNAL_WEIGHTS, SOLVED_FULL_CREDIT, STREAK_SATURATION_DAYS, TOPIC_FULL_CREDIT,
    accuracy_component, bundle_is_compatible, bundle_signature, engineer_features,
    heuristic_probability, interview_component, readiness_signal, resolve_counts, signal_components,
)
from data.generate_training_data import PLACEMENT_CSV, PLACEMENT_TARGET

logger = logging.getLogger("placify.placement")

TARGET = PLACEMENT_TARGET
HEURISTIC_MODEL_NAME = "heuristic-fallback"


# -----------------------------------------------------------------------------
# Training
# -----------------------------------------------------------------------------
def _candidates(seed: int) -> Dict[str, Any]:
    return {
        "LogisticRegression": Pipeline([
            ("scaler", StandardScaler()),
            ("clf", LogisticRegression(max_iter=2000, random_state=seed)),
        ]),
        # Shallow trees + monotonic constraints: smooth, well-calibrated and never
        # lower the score when a monotone feature rises.
        "HistGradientBoostingClassifier": HistGradientBoostingClassifier(
            max_iter=200, max_depth=2, learning_rate=0.05, min_samples_leaf=40,
            early_stopping=False, random_state=seed,
            monotonic_cst=[MONOTONE[f] for f in FEATURES],
        ),
    }


def _ready_proba(model: Any, X: pd.DataFrame) -> np.ndarray:
    return model.predict_proba(X)[:, list(model.classes_).index(1)]


def monotonicity_violations(model: Any, X_ref: pd.DataFrame, rows: int = 200,
                            steps: int = 11, seed: int = 0) -> List[str]:
    """Monotone-increasing features whose predicted probability ever drops when only
    that feature is raised (checked on a sample of reference rows over the value range)."""
    sample = X_ref.sample(n=min(rows, len(X_ref)), random_state=seed).reset_index(drop=True)
    violations = []
    for feature, direction in MONOTONE.items():
        if direction == 0:
            continue
        grid = np.linspace(X_ref[feature].min(), X_ref[feature].max(), steps)
        probe = pd.concat([sample.assign(**{feature: value}) for value in grid], ignore_index=True)
        proba = _ready_proba(model, probe[FEATURES]).reshape(steps, len(sample))
        if np.any(np.diff(proba, axis=0) * direction < -1e-9):
            violations.append(feature)
    return violations


def train(csv_path: Optional[Path] = None, models_dir: Optional[Path] = None,
          cv_folds: int = 5, seed: int = 42) -> Dict[str, Any]:
    csv_path = Path(csv_path or config.generated_data_dir() / PLACEMENT_CSV)
    if not csv_path.is_file():
        raise FileNotFoundError(f"Placement training data not found: {csv_path}")

    df = pd.read_csv(csv_path)
    missing = [c for c in FEATURES + [TARGET] if c not in df.columns]
    if missing:
        raise ValueError(f"Placement training data is missing columns {missing} (regenerate it)")

    X = df[FEATURES].astype(float)
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

    best_name, best = None, None
    for name in sorted(cv_results, key=cv_results.get, reverse=True):
        fitted = clone(candidates[name]).fit(X_train, y_train)
        violations = monotonicity_violations(fitted, X_train, seed=seed)
        if violations:
            logger.warning("Placement %s rejected: not monotone in %s", name, violations)
            continue
        best_name, best = name, fitted
        break
    if best is None:
        raise RuntimeError("no placement candidate passed the monotonicity check")

    proba = _ready_proba(best, X_test)
    pred = (proba >= 0.5).astype(int)
    fallback = np.array([heuristic_probability(readiness_signal(row)) for row in X_test.to_dict("records")])
    metrics = {
        "selected_by": f"{cv_folds}-fold CV ROC-AUC on the training split (monotone candidates only)",
        "cv_roc_auc": round(cv_results[best_name], 4),
        "test_accuracy": round(float(accuracy_score(y_test, pred)), 4),
        "test_roc_auc": round(float(roc_auc_score(y_test, proba)), 4),
        "test_brier": round(float(brier_score_loss(y_test, proba)), 4),
        "test_mean_abs_diff_vs_heuristic": round(float(np.abs(proba - fallback).mean()), 4),
        "train_size": int(len(X_train)),
        "test_size": int(len(X_test)),
        "data": "synthetic cohort (demo model; not validated on real placement outcomes)",
    }
    logger.info("Placement selected %s; held-out test accuracy %.4f, ROC-AUC %.4f, Brier %.4f, "
                "mean |model - heuristic fallback| %.4f", best_name, metrics["test_accuracy"],
                metrics["test_roc_auc"], metrics["test_brier"], metrics["test_mean_abs_diff_vs_heuristic"])

    out = Path(models_dir or config.models_dir()) / PLACEMENT_FILE
    save_bundle(out, {
        "model": best,
        **bundle_signature(),
        "metrics": metrics,
        "signal_weights": dict(SIGNAL_WEIGHTS),
        "label_rule": {"ready_bar": READY_BAR, "noise_scale": NOISE_SCALE},
    }, model_name=best_name)
    logger.info("Placement model saved to %s (features v%s: %s)", out,
                bundle_signature()["feature_version"], ", ".join(FEATURES))
    return {"model_name": best_name, **metrics}


# -----------------------------------------------------------------------------
# Inference
# -----------------------------------------------------------------------------
def _to_score(probability: float) -> int:
    """round(probability * 100), half-up, clamped to 0-100."""
    return int(min(100, max(0, math.floor(probability * 100 + 0.5))))


def _result(probability: float, model_name: str) -> Dict[str, Any]:
    probability = round(min(1.0, max(0.0, probability)), 4)
    return {
        "placement_ready": probability >= 0.5,
        "score": _to_score(probability),
        "probability": probability,
        "model": model_name,
    }


def is_compatible(bundle: Optional[Mapping[str, Any]]) -> bool:
    """True when a loaded bundle was trained on the features this code computes."""
    return bundle_is_compatible(bundle)


def predict(bundle: Dict[str, Any], user_features: Mapping[str, Any]) -> Dict[str, Any]:
    if not is_compatible(bundle):
        raise ValueError("placement bundle was trained on a different feature set (retrain it)")
    features = engineer_features(user_features)
    columns = bundle["features"]
    X = pd.DataFrame([[features[f] for f in columns]], columns=columns)
    model = bundle["model"]
    classes = list(model.classes_)
    ready_prob = float(model.predict_proba(X)[0][classes.index(1)]) if 1 in classes else 0.0
    return _result(ready_prob, bundle["model_name"])


def heuristic_predict(user_features: Mapping[str, Any]) -> Dict[str, Any]:
    """
    Documented fallback used only when no compatible trained model is available:
    probability = 1 / (1 + exp(-(signal - 0.42) / 0.13)), where signal is the same
    readiness_signal() that labels the synthetic cohort. The curve is centred where
    the class-balanced model puts 50 %, so fallback and model scores roughly agree.
    """
    signal = readiness_signal(engineer_features(user_features))
    return _result(heuristic_probability(signal), HEURISTIC_MODEL_NAME)


# -----------------------------------------------------------------------------
# Insights
# -----------------------------------------------------------------------------
MAX_INSIGHTS = 4
SOLVED_MILESTONES = (0.25, 0.50, SOLVED_FULL_CREDIT)
TOPIC_MILESTONES = (0.05, 0.10, TOPIC_FULL_CREDIT)
ACCURACY_TARGET = 70
INTERVIEW_TARGET = 70
STREAK_TARGET = 7


def _count(n: int, noun: str) -> str:
    return f"{n} {noun}{'' if n == 1 else 's'}"


def _next_milestone(done: int, total: int, milestones: Tuple[float, ...]) -> Optional[Tuple[float, int]]:
    """First milestone share whose count (ceil(share * total)) is still ahead of `done`."""
    for share in milestones:
        target = max(1, math.ceil(share * total - 1e-9))
        if done < target:
            return share, target
    return None


def insights(user_features: Mapping[str, Any]) -> List[str]:
    """
    Actionable, app-relative tips computed from the request (counts are relative
    to this app's problem bank and learning tracks). Each tip carries the readiness
    signal it would add; the MAX_INSIGHTS most valuable ones are returned first.
    """
    raw = resolve_counts(user_features)
    features = engineer_features(user_features)
    now = signal_components(features)
    tips: List[Tuple[float, str]] = []

    # Arena problems: next milestone of the bank (25 %, 50 %, 80 % = full credit).
    solved, bank = raw["problems_solved"], raw["total_problems"]
    if bank > 0:
        milestone = _next_milestone(solved, bank, SOLVED_MILESTONES)
        if milestone:
            share, target = milestone
            gain = SIGNAL_WEIGHTS["solved"] * (min(1.0, target / bank / SOLVED_FULL_CREDIT) - now["solved"])
            tips.append((gain, f"[Practice] Solve {_count(target - solved, 'more Arena problem')} to reach "
                               f"{share:.0%} of the bank ({solved}/{bank} solved)."))

    # Mock interviews.
    interview = raw["interview_average"]
    if interview is None:
        gain = SIGNAL_WEIGHTS["interview"] * interview_component(INTERVIEW_TARGET, 1.0)
        tips.append((gain, "[Interview] Complete a mock interview to include interview performance "
                           f"in your readiness (it carries {SIGNAL_WEIGHTS['interview']:.0%} of the weight)."))
    elif interview < INTERVIEW_TARGET:
        gain = SIGNAL_WEIGHTS["interview"] * (interview_component(INTERVIEW_TARGET, 1.0) - now["interview"])
        tips.append((gain, f"[Interview] Your mock-interview average is {interview:.0f}/100 - aim for "
                           f"{INTERVIEW_TARGET}+ by explaining your approach, complexity and edge cases."))

    # Accuracy (only meaningful once there are graded submissions).
    submissions, accuracy = raw["submission_count"], raw["accuracy"]
    practice = features["practice_volume"]
    evidence_needed = max(1, math.ceil(ACCURACY_EVIDENCE_VOLUME * max(bank, 1) - 1e-9))
    if submissions > 0 and accuracy < ACCURACY_TARGET:
        gain = SIGNAL_WEIGHTS["accuracy"] * (accuracy_component(ACCURACY_TARGET, practice) - now["accuracy"])
        tips.append((gain, f"[Accuracy] {accuracy:.0f}% of your submissions are accepted - use Run on edge "
                           f"cases before Submit to push it past {ACCURACY_TARGET}%."))
    elif 0 < submissions < evidence_needed:
        full = accuracy_component(accuracy, ACCURACY_EVIDENCE_VOLUME)
        gain = SIGNAL_WEIGHTS["accuracy"] * (full - now["accuracy"])
        tips.append((gain, f"[Accuracy] Your {accuracy:.0f}% accuracy counts fully after {evidence_needed} "
                           f"graded submissions ({submissions} so far)."))

    # Learning-track topics: next milestone of the curriculum (5 %, 10 %, 25 % = full credit).
    done, curriculum = raw["topics_completed"], raw["total_topics"]
    if curriculum > 0:
        milestone = _next_milestone(done, curriculum, TOPIC_MILESTONES)
        if milestone:
            share, target = milestone
            gain = SIGNAL_WEIGHTS["topics"] * (min(1.0, target / curriculum / TOPIC_FULL_CREDIT) - now["topics"])
            tips.append((gain, f"[Learning] Finish {_count(target - done, 'more learning-track topic')} to "
                               f"reach {share:.0%} of the curriculum ({done}/{curriculum} done)."))

    # Consistency.
    streak = raw["streak"]
    if streak < STREAK_TARGET:
        gain = SIGNAL_WEIGHTS["streak"] * (STREAK_TARGET / STREAK_SATURATION_DAYS - now["streak"])
        tips.append((gain, f"[Consistency] Practise daily to grow your streak from {streak} to {STREAK_TARGET} "
                           f"days (consistency credit maxes out at {STREAK_SATURATION_DAYS} days)."))
    elif streak < STREAK_SATURATION_DAYS:
        gain = SIGNAL_WEIGHTS["streak"] * (1.0 - now["streak"])
        tips.append((gain, f"[Consistency] Keep your {streak}-day streak going - consistency credit maxes "
                           f"out at {STREAK_SATURATION_DAYS} days."))

    tips.sort(key=lambda tip: tip[0], reverse=True)
    messages = [text for gain, text in tips if gain > 0][:MAX_INSIGHTS]
    if not messages:
        messages.append("[Profile] Strong profile - keep taking mock interviews and new Arena problems "
                        "to stay sharp.")
    return messages


if __name__ == "__main__":
    config.setup_logging()
    train()
