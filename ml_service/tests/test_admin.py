"""/admin/retrain and /admin/rebuild-rag."""

from conftest import AUTH, PROBLEMS


def test_retrain_requires_key(client):
    assert client.post("/admin/retrain").status_code == 401
    assert client.post("/admin/retrain", headers={"X-API-Key": "nope"}).status_code == 401


def test_retrain_trains_and_reloads_models_in_process(client, registry):
    from rag import rag_pipeline

    before = (registry.placement, registry.difficulty, registry.recommender, rag_pipeline._state)
    response = client.post("/admin/retrain", headers=AUTH)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert set(data["details"]) == {"placement", "difficulty", "recommender", "rag"}
    assert all(step["ok"] and not step["skipped"] for step in data["details"].values())
    assert all(data["models"].values())
    after = (registry.placement, registry.difficulty, registry.recommender, rag_pipeline._state)
    assert all(new is not None and new is not old for new, old in zip(after, before))
    assert client.get("/health").json()["status"] == "ok"


def test_retrain_reports_failures_without_leaking_exceptions(client, monkeypatch):
    from models import train_all

    def boom():
        raise RuntimeError("secret internal detail")

    monkeypatch.setitem(train_all._RUNNERS, "difficulty", boom)
    data = client.post("/admin/retrain", headers=AUTH).json()
    assert data["success"] is False
    assert data["details"]["difficulty"]["ok"] is False
    assert "secret internal detail" not in str(data)
    assert data["details"]["placement"]["ok"] is True


def test_retrain_rejects_concurrent_runs(client, monkeypatch):
    import main

    class BusyLock:
        def locked(self):
            return True

    monkeypatch.setattr(main, "_admin_lock", BusyLock())
    assert client.post("/admin/retrain", headers=AUTH).status_code == 409
    assert client.post("/admin/rebuild-rag", headers=AUTH).status_code == 409


def test_rebuild_rag_indexes_learning_notes_and_problem_bank(client):
    from rag.knowledge_builder import LEARNING_TRACK_CONTENT

    response = client.post("/admin/rebuild-rag", headers=AUTH)
    assert response.status_code == 200
    assert response.json() == {"success": True,
                               "chunks_indexed": len(LEARNING_TRACK_CONTENT) + len(PROBLEMS)}


def test_rebuild_rag_without_problem_bank_gives_setup_hint(client, monkeypatch, tmp_path):
    monkeypatch.setenv("PLACIFY_DB_PATH", str(tmp_path / "missing.db"))
    response = client.post("/admin/rebuild-rag", headers=AUTH)
    assert response.status_code == 503
    assert "npm run setup" in response.json()["detail"]
    assert client.get("/health").json()["models"]["rag"] is True  # old index still served
