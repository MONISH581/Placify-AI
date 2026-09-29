"""
core/placement_features.py
Feature engineering and readiness signal for the placement-readiness DEMO model.

This module is the single definition of the model inputs. Training
(data/generate_training_data.py -> models/placement_scorer.py) and inference
(main.py -> placement_scorer.predict) both call engineer_features(), so the two
paths cannot drift apart.

App-relative features
---------------------
Readiness is measured against THIS app, not against absolute counts: solving
20 problems means a lot when the Arena has 21 problems and little when it has
2,000. The raw request values are turned into these features:

  solved_ratio       problems_solved / max(total_problems, 1), clipped to 0-1
  accuracy           accepted / graded submissions, 0-100
  streak_sig         min(streak, 30) / 30 (consistency saturates at 30 days)
  interview_average  mock-interview average 0-100; 50 (neutral) when the user
                     has no completed interview ...
  has_interview      ... and this indicator says whether it was observed
  topic_ratio        topics_completed / max(total_topics, 1), clipped to 0-1
  practice_volume    min(submission_count / max(total_problems, 1), 3)

Raw xp and level are NOT inputs: they are derived from the activity above and
their scale grows with the size of the problem bank.

This is a demo model trained on synthetic users. None of the weights below are
fitted to real placement outcomes.
"""

import math
from typing import Any, Dict, List, Mapping, Optional

# Bump when FEATURES or their definitions change: saved bundles with a different
# version are treated as missing and retrained (train_all --only-missing).
FEATURE_VERSION = 2

FEATURES: List[str] = [
    "solved_ratio",
    "accuracy",
    "streak_sig",
    "interview_average",
    "has_interview",
    "topic_ratio",
    "practice_volume",
]

# +1: the score must never go down when this feature goes up. 0: unconstrained.
# has_interview is unconstrained: a very poor interview is not better than none.
MONOTONE: Dict[str, int] = {
    "solved_ratio": 1,
    "accuracy": 1,
    "streak_sig": 1,
    "interview_average": 1,
    "has_interview": 0,
    "topic_ratio": 1,
    "practice_volume": 1,
}

NEUTRAL_INTERVIEW = 50.0          # imputed interview_average when has_interview == 0
STREAK_SATURATION_DAYS = 30
PRACTICE_VOLUME_CAP = 3.0
DEFAULT_TOTAL_PROBLEMS = 50       # only for legacy callers that omit total_problems
                                  # (main.py prefers the size of its own problem bank)

# --- readiness signal ---------------------------------------------------------
# Each component is normalised to [0, 1]; the signal is their weighted sum.
SIGNAL_WEIGHTS: Dict[str, float] = {
    "solved": 0.35,      # share of the Arena bank solved; full credit at 80 %
    "accuracy": 0.20,    # 30 % -> 0, 90 % -> 1, scaled by how much evidence there is
    "interview": 0.15,   # mock-interview average 30 -> 0, 85 -> 1; 0 without an interview
    "streak": 0.10,      # streak_sig (full credit at 30 days)
    "topics": 0.10,      # learning-track topics; full credit at 25 % of the curriculum
    "practice": 0.10,    # submissions per bank problem; full credit at 1.5x the bank
}
SOLVED_FULL_CREDIT = 0.80
ACCURACY_FLOOR, ACCURACY_FULL = 30.0, 90.0
ACCURACY_EVIDENCE_VOLUME = 0.25   # accuracy counts fully after submissions >= 25 % of the bank
INTERVIEW_FLOOR, INTERVIEW_FULL = 30.0, 85.0
TOPIC_FULL_CREDIT = 0.25
PRACTICE_FULL_CREDIT = 1.5

# --- label rule / heuristic link ---------------------------------------------
# Synthetic label: ready = signal + Logistic(0, NOISE_SCALE) >= READY_BAR.
# The raw cohort is beginner-heavy (~18 % ready), so the generator down-samples the
# majority class to 50/50. That raises the prior odds and moves the trained model's
# 50 % point to signal ~= READY_BAR - NOISE_SCALE * ln(not_ready / ready) ~= 0.42,
# which is the centre the heuristic fallback uses.
READY_BAR = 0.62
NOISE_SCALE = 0.13
FALLBACK_CENTER = 0.42


def _num(value: Any, default: float = 0.0) -> float:
    """float(value), or default for None / NaN / non-numeric input."""
    if value is None:
        return default
    try:
        number = float(value)
    except (TypeError, ValueError):
        return default
    return default if math.isnan(number) else number


def _clip(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return min(high, max(low, value))


def interview_observed(value: Any) -> bool:
    return value is not None and not (isinstance(value, float) and math.isnan(value))


def resolve_counts(raw: Mapping[str, Any]) -> Dict[str, Any]:
    """Raw request values as clean numbers (missing totals resolved to their defaults)."""
    total_problems = raw.get("total_problems")
    total_topics = raw.get("total_topics")
    interview = raw.get("interview_average")
    return {
        "problems_solved": max(0, int(_num(raw.get("problems_solved")))),
        "total_problems": max(0, int(_num(total_problems, DEFAULT_TOTAL_PROBLEMS))),
        "submission_count": max(0, int(_num(raw.get("submission_count")))),
        "accuracy": _clip(_num(raw.get("accuracy")), 0.0, 100.0),
        "streak": max(0, int(_num(raw.get("streak")))),
        "interview_average": _clip(_num(interview), 0.0, 100.0) if interview_observed(interview) else None,
        "topics_completed": max(0, int(_num(raw.get("topics_completed")))),
        "total_topics": max(0, int(_num(total_topics))),
    }


def engineer_features(raw: Mapping[str, Any]) -> Dict[str, float]:
    """Raw request/cohort values -> the model's feature dict (keys in FEATURES order)."""
    c = resolve_counts(raw)
    bank = max(c["total_problems"], 1)
    has_interview = c["interview_average"] is not None
    return {
        "solved_ratio": _clip(c["problems_solved"] / bank),
        "accuracy": c["accuracy"],
        "streak_sig": min(c["streak"], STREAK_SATURATION_DAYS) / STREAK_SATURATION_DAYS,
        "interview_average": c["interview_average"] if has_interview else NEUTRAL_INTERVIEW,
        "has_interview": 1.0 if has_interview else 0.0,
        "topic_ratio": _clip(c["topics_completed"] / c["total_topics"]) if c["total_topics"] > 0 else 0.0,
        "practice_volume": min(c["submission_count"] / bank, PRACTICE_VOLUME_CAP),
    }


def accuracy_component(accuracy: float, practice_volume: float) -> float:
    evidence = _clip(practice_volume / ACCURACY_EVIDENCE_VOLUME)
    return _clip((accuracy - ACCURACY_FLOOR) / (ACCURACY_FULL - ACCURACY_FLOOR)) * evidence


def interview_component(interview_average: float, has_interview: float) -> float:
    if has_interview < 0.5:
        return 0.0
    return _clip((interview_average - INTERVIEW_FLOOR) / (INTERVIEW_FULL - INTERVIEW_FLOOR))


def signal_components(features: Mapping[str, float]) -> Dict[str, float]:
    """Each readiness component in [0, 1] (keys match SIGNAL_WEIGHTS)."""
    return {
        "solved": _clip(features["solved_ratio"] / SOLVED_FULL_CREDIT),
        "accuracy": accuracy_component(features["accuracy"], features["practice_volume"]),
        "interview": interview_component(features["interview_average"], features["has_interview"]),
        "streak": _clip(features["streak_sig"]),
        "topics": _clip(features["topic_ratio"] / TOPIC_FULL_CREDIT),
        "practice": _clip(features["practice_volume"] / PRACTICE_FULL_CREDIT),
    }


def readiness_signal(features: Mapping[str, float]) -> float:
    """Deterministic 0-1 readiness signal from ENGINEERED features (see SIGNAL_WEIGHTS)."""
    components = signal_components(features)
    return sum(SIGNAL_WEIGHTS[name] * components[name] for name in SIGNAL_WEIGHTS)


def heuristic_probability(signal: float) -> float:
    """The documented fallback link: logistic curve centred where the trained model sits."""
    return 1.0 / (1.0 + math.exp(-(signal - FALLBACK_CENTER) / NOISE_SCALE))


def bundle_signature() -> Dict[str, Any]:
    """Keys a saved placement bundle must carry to be usable by this code."""
    return {"features": list(FEATURES), "feature_version": FEATURE_VERSION}


def bundle_is_compatible(bundle: Optional[Mapping[str, Any]]) -> bool:
    if not bundle:
        return False
    return all(bundle.get(key) == value for key, value in bundle_signature().items())
