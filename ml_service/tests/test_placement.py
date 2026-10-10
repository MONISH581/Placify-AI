"""Placement-readiness demo model: feature parity, monotonicity, sanity, compatibility, insights."""

import joblib
import pandas as pd
import pytest
import sklearn

from conftest import AUTH, PROBLEMS

BANK = 21          # size of the app's problem bank when this was written
CURRICULUM = 432   # topics across the learning tracks


def user(**overrides):
    profile = {"problems_solved": 0, "total_problems": BANK, "submission_count": 0, "accuracy": 0,
               "streak": 0, "interview_average": None, "topics_completed": 0, "total_topics": CURRICULUM}
    profile.update(overrides)
    return profile


NEW_USER = user()
DEMO_STUDENT = user(problems_solved=2, submission_count=3, accuracy=67, streak=1)
MID_USER = user(problems_solved=8, submission_count=14, accuracy=70, streak=5, interview_average=60,
                topics_completed=20)
STRONG_USER = user(problems_solved=17, submission_count=24, accuracy=85, streak=10, interview_average=80)
PROFILES = [NEW_USER, DEMO_STUDENT, MID_USER, STRONG_USER]


def _score(client, payload):
    response = client.post("/ml/placement-score", json=payload, headers=AUTH)
    assert response.status_code == 200, response.text
    return response.json()


def _scorers(registry):
    from models import placement_scorer

    return {
        "model": lambda profile: placement_scorer.predict(registry.placement, profile),
        "heuristic": placement_scorer.heuristic_predict,
    }


# --- Feature parity ----------------------------------------------------------
def test_training_and_inference_use_the_same_features(trained, registry):
    from core import config
    from core.placement_features import FEATURE_VERSION, FEATURES, engineer_features
    from data.generate_training_data import PLACEMENT_CSV, PLACEMENT_RAW_COLUMNS

    assert not {"xp", "level"} & set(FEATURES)
    assert list(engineer_features(DEMO_STUDENT)) == FEATURES
    assert list(engineer_features({})) == FEATURES  # legacy / empty payloads too
    assert registry.placement["features"] == FEATURES
    assert registry.placement["feature_version"] == FEATURE_VERSION

    # Every training row is reproduced exactly by the inference code path from its raw values.
    df = pd.read_csv(config.generated_data_dir() / PLACEMENT_CSV)
    for row in df.head(500).to_dict("records"):
        raw = {column: row[column] for column in PLACEMENT_RAW_COLUMNS}
        raw["accuracy"] = row["accuracy"]
        raw["interview_average"] = row["interview_average"] if row["has_interview"] else None
        assert engineer_features(raw) == pytest.approx({f: row[f] for f in FEATURES})


def test_xp_and_level_do_not_change_the_score(client):
    low = _score(client, {**DEMO_STUDENT, "xp": 0, "level": 1})
    high = _score(client, {**DEMO_STUDENT, "xp": 90_000, "level": 99})
    assert low["probability"] == high["probability"]


def test_score_is_relative_to_the_bank_size(client):
    small = _score(client, user(problems_solved=10, total_problems=20, submission_count=16, accuracy=75,
                                streak=5, topics_completed=10, total_topics=100))
    large = _score(client, user(problems_solved=100, total_problems=200, submission_count=160, accuracy=75,
                                streak=5, topics_completed=40, total_topics=400))
    assert small["probability"] == large["probability"]


# --- Monotonicity ------------------------------------------------------------
SWEEPS = {
    "problems_solved": [0, 1, 2, 5, 8, 11, 14, 17, 19, 21],
    "accuracy": [0, 20, 35, 50, 60, 70, 80, 90, 100],
    "interview_average": [0, 20, 35, 50, 60, 70, 80, 90, 100],
    "streak": [0, 1, 3, 7, 14, 21, 30, 90],
    "topics_completed": [0, 5, 22, 44, 80, 108, 250, 432],
    "submission_count": [0, 1, 3, 6, 10, 21, 32, 63, 100],
}


@pytest.mark.parametrize("field", list(SWEEPS))
def test_more_progress_never_lowers_the_score(registry, field):
    for name, scorer in _scorers(registry).items():
        for base in PROFILES:
            probabilities = [scorer({**base, field: value})["probability"] for value in SWEEPS[field]]
            assert all(b >= a for a, b in zip(probabilities, probabilities[1:])), (name, field, base, probabilities)


def test_a_good_mock_interview_raises_the_score(registry):
    for name, scorer in _scorers(registry).items():
        for base in (NEW_USER, DEMO_STUDENT, user(problems_solved=11, submission_count=16, accuracy=72, streak=4)):
            before = scorer(base)["probability"]
            after = scorer({**base, "interview_average": 75})["probability"]
            assert after > before, (name, base, before, after)


# --- Sanity ------------------------------------------------------------------
def test_strong_user_scores_high(client, registry, monkeypatch):
    data = _score(client, STRONG_USER)
    assert data["score"] >= 70 and data["placement_ready"] is True
    assert data["model"] == registry.placement["model_name"]

    monkeypatch.setattr(registry, "placement", None)
    fallback = _score(client, STRONG_USER)
    assert fallback["model"] == "heuristic-fallback" and fallback["score"] >= 70


def test_brand_new_user_scores_low(client, registry, monkeypatch):
    data = _score(client, NEW_USER)
    assert data["score"] <= 25 and data["placement_ready"] is False

    monkeypatch.setattr(registry, "placement", None)
    assert _score(client, NEW_USER)["score"] <= 25


def test_solving_the_whole_bank_is_rewarded(client):
    everything = _score(client, user(problems_solved=BANK, submission_count=30, accuracy=75, streak=3))
    assert everything["score"] >= 50


def test_model_and_heuristic_fallback_roughly_agree(trained, registry):
    assert trained["placement"]["details"]["test_mean_abs_diff_vs_heuristic"] <= 0.08
    scorers = _scorers(registry)
    for profile in PROFILES:
        model = scorers["model"](profile)["score"]
        heuristic = scorers["heuristic"](profile)["score"]
        assert abs(model - heuristic) <= 20, (profile, model, heuristic)


# --- Backwards compatibility -------------------------------------------------
LEGACY = {"xp": 1200, "level": 4, "streak": 3, "accuracy": 60, "problems_solved": 6,
          "submission_count": 10, "user_id": "u-legacy"}


def test_legacy_payload_without_new_fields_still_works(client, registry, monkeypatch):
    data = _score(client, LEGACY)
    assert data["model"] == registry.placement["model_name"]
    assert 0 <= data["score"] <= 100 and data["is_demo"] is True
    # Without total_problems the score is measured against the service's own problem bank.
    assert any(f"(6/{len(PROBLEMS)} solved)" in tip for tip in data["insights"])

    from core.placement_features import DEFAULT_TOTAL_PROBLEMS

    monkeypatch.setattr(registry, "recommender", None)
    data = _score(client, LEGACY)
    assert any(f"(6/{DEFAULT_TOTAL_PROBLEMS} solved)" in tip for tip in data["insights"])


def test_explicit_null_interview_means_no_interview(client):
    assert _score(client, {**DEMO_STUDENT, "interview_average": None}) == _score(
        client, {k: v for k, v in DEMO_STUDENT.items() if k != "interview_average"})


# --- Insights ----------------------------------------------------------------
def test_insights_are_app_relative_and_actionable(client):
    tips = _score(client, DEMO_STUDENT)["insights"]
    assert 1 <= len(tips) <= 4
    assert "[Practice] Solve 4 more Arena problems to reach 25% of the bank (2/21 solved)." in tips
    assert any(tip.startswith("[Interview] Complete a mock interview") for tip in tips)
    assert any("more learning-track topics" in tip and "(0/432 done)" in tip for tip in tips)
    assert not any("30 DSA problems" in tip or "XP" in tip for tip in tips)

    mid = _score(client, MID_USER)["insights"]
    assert any("(8/21 solved)" in tip and "50% of the bank" in tip for tip in mid)
    assert any("mock-interview average is 60/100" in tip for tip in mid)

    strong = _score(client, STRONG_USER)["insights"]
    assert not any(tip.startswith("[Practice]") for tip in strong)  # 17/21 already earns full credit


def test_insights_for_a_complete_profile(client):
    done = user(problems_solved=BANK, submission_count=40, accuracy=92, streak=45, interview_average=90,
                topics_completed=120)
    assert _score(client, done)["insights"] == [
        "[Profile] Strong profile - keep taking mock interviews and new Arena problems to stay sharp."
    ]


# --- Stale bundles -----------------------------------------------------------
def test_bundle_with_old_features_is_treated_as_missing(trained, tmp_path, monkeypatch):
    import main
    from core import config
    from core.bundle import PLACEMENT_FILE
    from core.placement_features import FEATURE_VERSION
    from models import train_all

    monkeypatch.setattr(config, "models_dir", lambda: tmp_path)
    old = {"model": None, "features": ["xp", "level", "streak", "accuracy", "problems_solved", "submission_count"],
           "metrics": {}, "model_name": "RandomForestClassifier", "sklearn_version": sklearn.__version__}
    joblib.dump(old, tmp_path / PLACEMENT_FILE)

    assert main.ModelRegistry.load_placement() is None  # service uses the heuristic instead
    assert train_all.artifact_status()["placement"] is False

    results = train_all.run_training(only_missing=True, steps=["placement"])
    assert results["placement"]["ok"] and not results["placement"]["skipped"]
    assert train_all.artifact_status()["placement"] is True
    assert main.ModelRegistry.load_placement()["feature_version"] == FEATURE_VERSION
