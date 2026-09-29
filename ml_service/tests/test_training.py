"""Problem bank access, training data, model bundles and the training pipeline."""

import logging
import sqlite3

import joblib
import pytest
import scipy.sparse as sp
import sklearn

from conftest import PROBLEMS, SOURCE_TREE_BEFORE, _snapshot_source_tree, create_problem_db


# --- Problem bank ------------------------------------------------------------
def test_problem_bank_reads_sqlite_and_parses_tags(trained):
    from core.problem_bank import load_problems

    problems = load_problems()
    assert [p["id"] for p in problems] == sorted(p[0] for p in PROBLEMS)
    two_sum = next(p for p in problems if p["id"] == "prob-arrays-two-sum")
    assert two_sum["tags"] == ["Arrays", "Hashing"]
    assert two_sum["difficulty"] == "Easy"
    assert two_sum["hints"] == ["Store complements while scanning"]


def test_missing_problem_bank_tells_user_to_run_setup(tmp_path):
    from core.problem_bank import ProblemBankError, load_problems

    with pytest.raises(ProblemBankError, match="npm run setup"):
        load_problems(tmp_path / "nope.db")


def test_empty_problem_bank_tells_user_to_run_setup(tmp_path):
    from core.problem_bank import ProblemBankError, load_problems

    empty = create_problem_db(tmp_path / "empty.db", problems=[])
    with pytest.raises(ProblemBankError, match="npm run setup"):
        load_problems(empty)

    no_table = tmp_path / "no_table.db"
    sqlite3.connect(no_table).close()
    with pytest.raises(ProblemBankError, match="npm run setup"):
        load_problems(no_table)


def test_database_url_is_resolved_relative_to_prisma_dir(monkeypatch):
    from core import config
    from core.problem_bank import resolve_db_path

    monkeypatch.delenv("PLACIFY_DB_PATH")
    monkeypatch.setenv("DATABASE_URL", "file:./dev.db")
    assert resolve_db_path() == (config.PRISMA_DIR / "dev.db").resolve()


# --- Training data -----------------------------------------------------------
def test_placement_data_is_synthetic_balanced_and_app_relative(tmp_path):
    from core.placement_features import FEATURES, NEUTRAL_INTERVIEW
    from data.generate_training_data import generate_placement_data

    df = generate_placement_data(n_samples=400, out_dir=tmp_path)
    assert len(df) == 400
    assert df["placement_ready"].mean() == 0.5  # balanced exactly
    assert set(FEATURES) <= set(df.columns)
    assert not {"xp", "level"} & set(df.columns)
    for ratio in ("solved_ratio", "streak_sig", "topic_ratio"):
        assert df[ratio].between(0, 1).all()
    assert df["accuracy"].between(0, 100).all() and df["interview_average"].between(0, 100).all()
    assert df["practice_volume"].between(0, 3).all()
    assert set(df["has_interview"].unique()) == {0.0, 1.0}
    assert (df.loc[df["has_interview"] == 0, "interview_average"] == NEUTRAL_INTERVIEW).all()
    assert df["problems_solved"].le(df["total_problems"]).all()
    # Realistic spread: many beginners, some strong users, many bank sizes.
    assert (df["readiness_signal"] < 0.25).mean() >= 0.2
    assert (df["readiness_signal"] > 0.6).mean() >= 0.1
    assert df["total_problems"].nunique() > 20
    assert (tmp_path / "placement_training.csv").is_file()

    again = generate_placement_data(n_samples=400, out_dir=tmp_path / "again")
    assert again.equals(df)  # deterministic for a given seed


def test_difficulty_examples_have_no_duplicates_or_conflicts():
    from data import generate_training_data as gen

    examples = gen.EASY_SYNTHETIC + gen.MEDIUM_SYNTHETIC + gen.HARD_SYNTHETIC
    gen.validate_difficulty_examples(examples)
    histogram = [label for text, label in examples if "histogram" in text.lower()]
    assert histogram and set(histogram) == {"Hard"}

    with pytest.raises(ValueError, match="Conflicting"):
        gen.validate_difficulty_examples([("Reverse a string", "Easy"), ("reverse a  string", "Hard")])


# --- Bundles -----------------------------------------------------------------
def test_every_bundle_records_model_name_and_sklearn_version(trained):
    from core import config
    from core.bundle import DIFFICULTY_FILE, PLACEMENT_FILE, RECOMMENDER_FILE

    for filename in (PLACEMENT_FILE, DIFFICULTY_FILE, RECOMMENDER_FILE):
        bundle = joblib.load(config.models_dir() / filename)
        assert bundle["model_name"]
        assert bundle["sklearn_version"] == sklearn.__version__


def test_models_selected_on_train_split_with_held_out_metrics(trained):
    for step in ("placement", "difficulty"):
        details = trained[step]["details"]
        assert "training split" in details["selected_by"]
        assert 0.0 <= details["test_accuracy"] <= 1.0
        assert details["test_size"] > 0


def test_recommender_bundle_is_lean_and_sparse(trained):
    from core import config
    from core.bundle import RECOMMENDER_FILE

    bundle = joblib.load(config.models_dir() / RECOMMENDER_FILE)
    assert "content_sim" not in bundle and "user_item" not in bundle
    assert sp.issparse(bundle["matrix"])
    assert bundle["matrix"].shape[0] == len(PROBLEMS) == len(bundle["items"])


def test_loading_bundle_from_other_sklearn_version_warns(tmp_path, caplog):
    from core.bundle import load_bundle

    path = tmp_path / "old.pkl"
    joblib.dump({"model": None, "model_name": "X", "sklearn_version": "0.0.1"}, path)
    with caplog.at_level(logging.WARNING, logger="placify.bundle"):
        load_bundle(path, "test")
    assert any("0.0.1" in record.getMessage() for record in caplog.records)


# --- Pipeline ----------------------------------------------------------------
def test_only_missing_skips_current_artifacts_and_detects_new_problems(trained):
    from models import train_all

    status = train_all.artifact_status()
    assert all(status.values())
    results = train_all.run_training(only_missing=True)
    assert all(r["ok"] and r["skipped"] for r in results.values())

    # A changed problem bank makes the recommender and RAG index stale.
    create_problem_db(trained_db_path(), problems=PROBLEMS[:-1])
    try:
        stale = train_all.artifact_status()
        assert stale["recommender"] is False and stale["rag"] is False
        assert stale["placement"] is True and stale["difficulty"] is True
    finally:
        create_problem_db(trained_db_path())


def trained_db_path():
    from core.problem_bank import resolve_db_path

    return resolve_db_path()


def test_training_never_touches_source_files(trained, client):
    assert _snapshot_source_tree() == SOURCE_TREE_BEFORE
