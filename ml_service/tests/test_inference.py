"""Placement, difficulty, recommender and interview endpoints."""

import math

import pytest

from conftest import AUTH, PROBLEMS

DIFFICULTY_RANK = {"Easy": 0, "Medium": 1, "Hard": 2}
PROFILE = {"xp": 2500, "level": 6, "streak": 12, "accuracy": 68.5,
           "problems_solved": 40, "submission_count": 70, "user_id": "u-1"}


def _half_up(probability):
    return math.floor(probability * 100 + 0.5)


# --- Placement ---------------------------------------------------------------
def test_placement_score_shape_and_bounds(client, registry):
    response = client.post("/ml/placement-score", json=PROFILE, headers=AUTH)
    assert response.status_code == 200
    data = response.json()
    assert set(data) == {"placement_ready", "score", "probability", "insights", "model", "is_demo"}
    assert data["is_demo"] is True
    assert 0.0 <= data["probability"] <= 1.0
    assert 0 <= data["score"] <= 100
    assert data["score"] == _half_up(data["probability"])  # no hidden bonuses
    assert data["placement_ready"] == (data["probability"] >= 0.5)
    assert data["model"] == registry.placement["model_name"]
    assert data["model"] != "heuristic-fallback" and "Ensemble" not in data["model"]
    assert data["insights"] and all(isinstance(tip, str) and tip for tip in data["insights"])


def test_placement_strong_profile_beats_weak_profile(client):
    strong = {"xp": 9000, "level": 16, "streak": 90, "accuracy": 92,
              "problems_solved": 160, "submission_count": 200}
    weak = {"xp": 0, "level": 1, "streak": 0, "accuracy": 20, "problems_solved": 0, "submission_count": 0}
    p_strong = client.post("/ml/placement-score", json=strong, headers=AUTH).json()["probability"]
    p_weak = client.post("/ml/placement-score", json=weak, headers=AUTH).json()["probability"]
    assert p_strong > p_weak


def test_placement_uses_documented_heuristic_without_model(client, registry, monkeypatch):
    monkeypatch.setattr(registry, "placement", None)
    data = client.post("/ml/placement-score", json=PROFILE, headers=AUTH).json()
    assert data["model"] == "heuristic-fallback"
    assert data["is_demo"] is True
    assert data["score"] == _half_up(data["probability"])


@pytest.mark.parametrize("bad", [{"accuracy": 150}, {"level": 0}, {"xp": -1}])
def test_placement_rejects_out_of_range_input(client, bad):
    assert client.post("/ml/placement-score", json={**PROFILE, **bad}, headers=AUTH).status_code == 422


# --- Difficulty --------------------------------------------------------------
def _difficulty(client, **body):
    return client.post("/ml/difficulty-predict", json=body, headers=AUTH)


def test_difficulty_probabilities_are_a_distribution(client, registry):
    response = _difficulty(client, title="Largest rectangle",
                           description="Use a monotonic stack over histogram bars",
                           tags=["Stacks"], constraints="1 <= n <= 10^5")
    assert response.status_code == 200
    data = response.json()
    probs = data["probabilities"]
    assert set(probs) == {"Easy", "Medium", "Hard"}
    assert all(0.0 <= p <= 1.0 for p in probs.values())
    assert abs(sum(probs.values()) - 1.0) < 1e-6
    assert data["difficulty"] == max(probs, key=probs.get)
    assert data["confidence"] == probs[data["difficulty"]]
    assert data["model"] == registry.difficulty["model_name"]


def test_difficulty_separates_easy_and_hard_vocabulary(client):
    hard = _difficulty(client, description="Implement a persistent segment tree with lazy propagation "
                                           "and heavy-light decomposition for path queries").json()
    easy = _difficulty(client, description="Find the sum of all elements in an integer array "
                                           "using a simple loop").json()
    assert hard["probabilities"]["Hard"] > hard["probabilities"]["Easy"]
    assert easy["probabilities"]["Easy"] > easy["probabilities"]["Hard"]


def test_difficulty_requires_some_text(client):
    assert _difficulty(client, title="  ", description="", tags=[], constraints="").status_code == 422


def test_difficulty_returns_503_when_model_missing(client, registry, monkeypatch):
    monkeypatch.setattr(registry, "difficulty", None)
    response = _difficulty(client, title="Two Sum", description="hash map")
    assert response.status_code == 503
    assert "not trained" in response.json()["detail"]


# --- Recommender -------------------------------------------------------------
def _recommend(client, **body):
    return client.post("/ml/recommend-problems", json=body, headers=AUTH)


def test_recommendations_exclude_solved_problems(client):
    solved = ["prob-arrays-two-sum", "prob-strings-valid-palindrome"]
    response = _recommend(client, solved_ids=solved, top_n=5, user_id="u-1")
    assert response.status_code == 200
    data = response.json()
    assert data["strategy"] == "content"
    assert data["solved_count"] == 2
    assert data["total"] == len(data["recommendations"]) == 5
    ids = [r["problem_id"] for r in data["recommendations"]]
    assert not set(ids) & set(solved)
    for rec in data["recommendations"]:
        assert set(rec) == {"problem_id", "title", "difficulty", "tags", "score"}
        assert isinstance(rec["tags"], list)
        assert rec["difficulty"] in DIFFICULTY_RANK
    scores = [r["score"] for r in data["recommendations"]]
    assert scores == sorted(scores, reverse=True)


def test_recommendations_follow_content_similarity(client):
    data = _recommend(client, solved_ids=["prob-graphs-number-of-islands"], top_n=3).json()
    assert "prob-graphs-word-ladder" in [r["problem_id"] for r in data["recommendations"]]


def test_cold_start_returns_easiest_first(client):
    data = _recommend(client, solved_ids=[], top_n=len(PROBLEMS)).json()
    assert data["strategy"] == "cold-start"
    ranks = [DIFFICULTY_RANK[r["difficulty"]] for r in data["recommendations"]]
    assert ranks == sorted(ranks)
    assert data["recommendations"][0]["difficulty"] == "Easy"
    assert len(data["recommendations"]) == len(PROBLEMS)


def test_unknown_solved_ids_fall_back_to_cold_start(client):
    response = _recommend(client, solved_ids=["prob-does-not-exist", ""], top_n=4)
    assert response.status_code == 200
    data = response.json()
    assert data["strategy"] == "cold-start"
    assert data["solved_count"] == 1
    assert data["recommendations"][0]["difficulty"] == "Easy"


def test_difficulty_filter_and_all_solved(client):
    hard = _recommend(client, solved_ids=["prob-arrays-two-sum"], top_n=10, difficulty_filter="hard").json()
    assert hard["recommendations"] and all(r["difficulty"] == "Hard" for r in hard["recommendations"])

    everything = [p[0] for p in PROBLEMS]
    data = _recommend(client, solved_ids=everything, top_n=10).json()
    assert data["recommendations"] == [] and data["total"] == 0

    assert _recommend(client, solved_ids=[], difficulty_filter="Impossible").status_code == 422


def test_recommender_returns_503_when_model_missing(client, registry, monkeypatch):
    monkeypatch.setattr(registry, "recommender", None)
    assert _recommend(client, solved_ids=[]).status_code == 503


# --- Interview scorer --------------------------------------------------------
ANSWER = ("Dynamic programming breaks a problem into overlapping subproblems and stores their results "
          "using memoization or tabulation, which turns exponential recursion into polynomial time.")


def _interview(client, **body):
    payload = {"question": "What is dynamic programming?", "answer": ANSWER, "interview_type": "Technical"}
    payload.update(body)
    return client.post("/ml/interview-score", json=payload, headers=AUTH)


def test_interview_score_bounds_and_determinism(client):
    first = _interview(client)
    second = _interview(client)
    assert first.status_code == 200
    data = first.json()
    assert data == second.json()
    assert 0 <= data["score"] <= 100
    assert 0.0 <= data["semantic_similarity"] <= 1.0
    assert data["feedback"] and data["method"]
    assert data["interview_type"] == "Technical"


def test_interview_behavioral_and_short_answers(client):
    behavioral = _interview(client, question="Tell me about a conflict in a group project",
                            answer="I listened to my teammate, we compared both designs with data "
                                   "and agreed on a compromise that shipped on time.",
                            interview_type="behavioral").json()
    assert 0 <= behavioral["score"] <= 100 and behavioral["interview_type"] == "Behavioral"

    short = _interview(client, answer="no idea").json()
    assert short["score"] == 0 and short["method"] == "too-short"


@pytest.mark.parametrize("field", ["question", "answer"])
def test_interview_rejects_blank_fields(client, field):
    assert _interview(client, **{field: "   "}).status_code == 422


def test_interview_returns_503_when_encoder_unavailable(client, monkeypatch):
    from core import embeddings

    monkeypatch.setattr(embeddings, "get_encoder", lambda: None)
    response = _interview(client)
    assert response.status_code == 503
    assert "encoder" in response.json()["detail"]
