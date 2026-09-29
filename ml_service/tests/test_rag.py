"""RAG mentor: local fallback, Gemini integration (mocked), retrieval."""

import json
import logging

import httpx
import pytest

from conftest import AUTH

HISTORY = [
    {"role": "user", "content": "I keep failing graph questions."},
    {"role": "assistant", "content": "Start with BFS and DFS templates."},
]


def _ask(client, **body):
    payload = {"question": "How should I practise graph BFS problems?", "top_k": 3}
    payload.update(body)
    return client.post("/rag/mentor-ask", json=payload, headers=AUTH)


def _assert_fallback(data):
    assert data["method"] == "RAG (local synthesis)"
    assert data["sources"], "fallback must still cite its sources"
    assert data["chunks_retrieved"] == len(data["sources"]) > 0
    for source in data["sources"]:
        assert set(source) == {"source", "topic", "relevance"}
    lowered = data["answer"].lower()
    assert "api key" not in lowered and "configure" not in lowered and "gemini" not in lowered


def test_mentor_without_gemini_returns_local_answer_with_sources(client):
    response = _ask(client, chat_history=HISTORY)
    assert response.status_code == 200
    _assert_fallback(response.json())


def test_mentor_validates_chat_history(client):
    assert _ask(client, chat_history=[{"role": "system", "content": "x"}]).status_code == 422
    assert _ask(client, question="   ").status_code == 422
    assert _ask(client, question="hi").status_code == 200


def _mock_gemini(monkeypatch, handler):
    from rag import rag_pipeline

    real_client = httpx.AsyncClient
    transport = httpx.MockTransport(handler)
    monkeypatch.setattr(rag_pipeline.httpx, "AsyncClient",
                        lambda **kwargs: real_client(transport=transport, **kwargs))


def test_mentor_uses_gemini_with_header_key_model_and_history(client, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-gemini-key")
    monkeypatch.setenv("GEMINI_MODEL", "gemini-test-model")
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["url"] = str(request.url)
        seen["key_header"] = request.headers.get("x-goog-api-key")
        seen["prompt"] = json.loads(request.content)["contents"][0]["parts"][0]["text"]
        return httpx.Response(200, json={"candidates": [{"content": {"parts": [{"text": "Use BFS templates."}]}}]})

    _mock_gemini(monkeypatch, handler)
    data = _ask(client, chat_history=HISTORY).json()

    assert data["method"] == "RAG + Gemini"
    assert data["answer"] == "Use BFS templates."
    assert data["sources"]
    assert seen["key_header"] == "test-gemini-key"
    assert "key=" not in seen["url"] and "test-gemini-key" not in seen["url"]
    assert "/models/gemini-test-model:generateContent" in seen["url"]
    assert "I keep failing graph questions." in seen["prompt"]
    assert "Start with BFS and DFS templates." in seen["prompt"]


def test_mentor_falls_back_when_gemini_errors(client, monkeypatch, caplog):
    monkeypatch.setenv("GEMINI_API_KEY", "test-gemini-key")
    _mock_gemini(monkeypatch, lambda request: httpx.Response(429, json={"error": "quota"}))

    with caplog.at_level(logging.WARNING, logger="placify.rag"):
        data = _ask(client).json()
    _assert_fallback(data)
    assert "temporarily unavailable" in data["answer"]
    assert any("HTTP 429" in record.getMessage() for record in caplog.records)


def test_mentor_falls_back_when_gemini_times_out(client, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-gemini-key")

    def handler(request):
        raise httpx.ReadTimeout("timed out", request=request)

    _mock_gemini(monkeypatch, handler)
    _assert_fallback(_ask(client).json())


def test_gemini_timeout_is_twelve_seconds():
    from rag import rag_pipeline

    assert rag_pipeline.GEMINI_TIMEOUT_SECONDS == 12.0


def test_prompt_includes_recent_chat_history_only():
    from rag import rag_pipeline

    history = [{"role": "user", "content": f"message {i}"} for i in range(15)]
    chunks = [{"source": "DSA", "topic": "Graphs", "text": "BFS explores level by level.", "score": 0.9}]
    prompt = rag_pipeline.build_prompt("What next?", chunks, history)
    assert "message 14" in prompt and "message 5" in prompt
    assert "message 4" not in prompt
    assert "BFS explores level by level." in prompt and "What next?" in prompt


def test_retrieve_returns_scored_chunks(client):
    response = client.post("/rag/retrieve", json={"question": "dynamic programming", "top_k": 4}, headers=AUTH)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == len(data["chunks"]) == 4
    for chunk in data["chunks"]:
        assert set(chunk) == {"text", "source", "topic", "score"}


def test_mentor_returns_503_when_index_missing(client, monkeypatch):
    from rag import rag_pipeline

    monkeypatch.setattr(rag_pipeline, "_state", None)
    assert _ask(client).status_code == 503
    assert client.post("/rag/retrieve", json={"question": "graphs"}, headers=AUTH).status_code == 503
    assert client.get("/health").json()["models"]["rag"] is False


@pytest.mark.parametrize("value", ["", "your_optional_gemini_api_key"])
def test_placeholder_gemini_key_counts_as_disabled(monkeypatch, value):
    from core import config

    monkeypatch.setenv("GEMINI_API_KEY", value)
    assert config.gemini_api_key() == ""
