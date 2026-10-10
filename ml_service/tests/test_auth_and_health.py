"""Authentication, startup guard, CORS and /health."""

import pytest
from fastapi.testclient import TestClient

from conftest import API_KEY, AUTH

EXPECTED_MODELS = {"placement", "recommender", "difficulty", "interview", "rag"}

PROTECTED = [
    ("/ml/placement-score", {"xp": 100, "level": 2, "streak": 1, "accuracy": 50,
                             "problems_solved": 3, "submission_count": 5}),
    ("/ml/recommend-problems", {"solved_ids": [], "top_n": 3}),
    ("/ml/difficulty-predict", {"title": "Two Sum", "description": "Find two numbers adding to target",
                                "tags": ["Arrays"], "constraints": ""}),
    ("/ml/interview-score", {"question": "What is dynamic programming?",
                             "answer": "It caches overlapping subproblem results.",
                             "interview_type": "Technical"}),
    ("/rag/mentor-ask", {"question": "How do I prepare for graphs?", "top_k": 3}),
    ("/rag/retrieve", {"question": "dynamic programming", "top_k": 2}),
    ("/admin/retrain", None),
    ("/admin/rebuild-rag", None),
]


@pytest.mark.parametrize("path,body", PROTECTED, ids=[p for p, _ in PROTECTED])
def test_protected_routes_reject_missing_key(client, path, body):
    response = client.post(path, json=body)
    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid or missing API key"}


@pytest.mark.parametrize("path,body", PROTECTED, ids=[p for p, _ in PROTECTED])
def test_protected_routes_reject_wrong_key(client, path, body):
    response = client.post(path, json=body, headers={"X-API-Key": API_KEY + "x"})
    assert response.status_code == 401


@pytest.mark.parametrize("path,body", PROTECTED[:6], ids=[p for p, _ in PROTECTED[:6]])
def test_inference_routes_accept_valid_key(client, path, body):
    assert client.post(path, json=body, headers=AUTH).status_code == 200


def test_health_is_public_and_reports_every_model(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert set(data["models"]) == EXPECTED_MODELS
    assert all(value is True for value in data["models"].values())


def test_root_is_public(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_health_is_degraded_when_a_model_is_missing(client, registry, monkeypatch):
    monkeypatch.setattr(registry, "difficulty", None)
    data = client.get("/health").json()
    assert data["status"] == "degraded"
    assert data["models"]["difficulty"] is False
    assert data["models"]["placement"] is True


def test_docs_and_openapi_are_not_exposed(client):
    assert client.get("/docs").status_code == 404
    assert client.get("/openapi.json").status_code == 404


def test_removed_duplicate_and_legacy_routes_are_gone(client):
    for path in ("/predict/placement", "/predict/difficulty", "/recommend/problems",
                 "/evaluate/interview", "/rag/query", "/api/ai/readiness", "/api/ai/mentor"):
        assert client.post(path, json={}, headers=AUTH).status_code == 404, path


@pytest.mark.parametrize("value", ["", "your_internal_api_key_here"])
def test_service_refuses_to_start_without_api_key(trained, monkeypatch, value):
    import main

    monkeypatch.setenv("INTERNAL_API_KEY", value)
    with pytest.raises(RuntimeError, match="INTERNAL_API_KEY"):
        with TestClient(main.app):
            pass
    with pytest.raises(SystemExit) as excinfo:
        main.main()
    assert excinfo.value.code == 1


def test_cors_never_allows_unknown_origins_or_credentials(client):
    preflight = {"Access-Control-Request-Method": "POST"}
    evil = client.options("/ml/placement-score", headers={"Origin": "https://evil.example", **preflight})
    assert "access-control-allow-origin" not in evil.headers

    allowed = client.options("/ml/placement-score", headers={"Origin": "http://localhost:3000", **preflight})
    assert allowed.headers.get("access-control-allow-origin") == "http://localhost:3000"
    assert "access-control-allow-credentials" not in allowed.headers
