"""
main.py — Placify ML FastAPI Microservice
Serves all trained ML models + RAG pipeline via REST API.
Runs on port 8000. Node.js server proxies to this service.
"""

import os
import sys
import json
import asyncio
from typing import Optional, List
from contextlib import asynccontextmanager

import joblib
import numpy as np
import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# ─── Path setup ──────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)
load_dotenv(os.path.join(os.path.dirname(BASE_DIR), ".env"))

MODELS_DIR = os.path.join(BASE_DIR, "saved_models")
os.makedirs(MODELS_DIR, exist_ok=True)

# ─── Model registry (loaded at startup) ──────────────────────────────────────
_models = {}


def load_model(name: str, filename: str) -> bool:
    path = os.path.join(MODELS_DIR, filename)
    if os.path.exists(path):
        try:
            _models[name] = joblib.load(path)
            print(f"[ML] [OK] Loaded model: {name} <- {filename}")
            return True
        except Exception as e:
            print(f"[ML] [ERROR] Failed to load {name}: {e}")
    else:
        print(f"[ML] [WARN] Model not found: {filename} (run train_all.py first)")
    return False


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load all models at startup."""
    print("\n" + "=" * 60)
    print("  Placify ML Service — Starting Up")
    print("=" * 60)

    load_model("placement", "placement_model.pkl")
    load_model("difficulty", "difficulty_model.pkl")
    load_model("recommender", "recommender_model.pkl")

    # RAG index — lazy, try loading
    try:
        from rag.rag_pipeline import load_index
        load_index()
        _models["rag_ready"] = True
        print("[RAG] [OK] FAISS index loaded")
    except Exception as e:
        print(f"[RAG] [WARN] RAG index not ready: {e}")
        _models["rag_ready"] = False

    print("=" * 60)
    print("  All models loaded. Server ready at http://localhost:8000")
    print("=" * 60 + "\n")

    yield  # App runs here

    print("[ML] Shutting down ML service.")


# ─── FastAPI App ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="Placify ML API",
    description="ML microservice: placement scorer, problem recommender, difficulty classifier, interview scorer, RAG mentor",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Request / Response Models ────────────────────────────────────────────────
class PlacementRequest(BaseModel):
    xp: int = Field(default=0, ge=0)
    level: int = Field(default=1, ge=1)
    streak: int = Field(default=0, ge=0)
    accuracy: float = Field(default=50.0, ge=0, le=100)
    problems_solved: int = Field(default=0, ge=0)
    submission_count: int = Field(default=0, ge=0)
    user_id: Optional[str] = None


class RecommendRequest(BaseModel):
    user_id: Optional[str] = None
    solved_ids: List[str] = Field(default_factory=list)
    top_n: int = Field(default=10, ge=1, le=50)
    difficulty_filter: Optional[str] = None  # "Easy", "Medium", "Hard"


class DifficultyRequest(BaseModel):
    title: str = ""
    description: str = ""
    tags: List[str] = Field(default_factory=list)
    constraints: str = ""


class InterviewScoreRequest(BaseModel):
    question: str
    answer: str
    interview_type: Optional[str] = "Technical"


class RAGRequest(BaseModel):
    question: str
    top_k: int = Field(default=5, ge=1, le=10)
    chat_history: Optional[List[dict]] = None


# ─── Health Check ─────────────────────────────────────────────────────────────
@app.get("/")
def root():
    models_status = {
        "placement_scorer": "placement" in _models,
        "difficulty_classifier": "difficulty" in _models,
        "problem_recommender": "recommender" in _models,
        "interview_scorer": True,  # Always available (no pkl needed)
        "rag_pipeline": _models.get("rag_ready", False)
    }
    all_ready = all(models_status.values())
    return {
        "service": "Placify ML API",
        "version": "1.0.0",
        "status": "healthy" if all_ready else "degraded",
        "models": models_status
    }


@app.get("/health")
def health():
    return {"status": "ok"}


# ─── 1. Placement Readiness Scorer ───────────────────────────────────────────
@app.post("/ml/placement-score")
def placement_score(req: PlacementRequest):
    """
    Predict placement readiness score for a student.
    Returns: placement_ready (bool), score (0-100), probability, insights
    """
    from models.placement_scorer import predict

    # Fallback if model not loaded
    if "placement" not in _models:
        # Heuristic fallback
        score = min(100, int(
            (req.xp / 100) * 0.3 +
            (req.problems_solved * 2) +
            (req.streak * 0.5) +
            req.accuracy * 0.3
        ))
        return {
            "placement_ready": score >= 55,
            "score": score,
            "probability": score / 100,
            "insights": _get_insights(req.dict(), score),
            "model": "heuristic-fallback"
        }

    result = predict(_models["placement"], req.dict())
    result["insights"] = _get_insights(req.dict(), result["score"])
    return result


def _get_insights(features: dict, score: int) -> list:
    insights = []
    if features.get("problems_solved", 0) < 30:
        insights.append("📚 Solve at least 30 more DSA problems to strengthen your profile.")
    if features.get("streak", 0) < 15:
        insights.append("🔥 Maintain a daily streak of 15+ days to demonstrate consistency.")
    if features.get("accuracy", 0) < 70:
        insights.append("🎯 Improve submission accuracy — focus on testing edge cases before submitting.")
    if features.get("xp", 0) < 2000:
        insights.append("⭐ Earn more XP by solving Medium and Hard problems.")
    if not insights:
        insights.append("🚀 Excellent profile! You're well-prepared for placement interviews.")
    return insights


# ─── 2. Problem Recommender ───────────────────────────────────────────────────
@app.post("/ml/recommend-problems")
def recommend_problems(req: RecommendRequest):
    """
    Recommend next DSA problems based on user's solved history.
    Returns list of recommended problems with relevance scores.
    """
    from models.problem_recommender import recommend

    if "recommender" not in _models:
        return {
            "recommendations": [],
            "message": "Recommender model not loaded. Run train_all.py first.",
            "model": "unavailable"
        }

    recs = recommend(
        _models["recommender"],
        solved_ids=req.solved_ids,
        top_n=req.top_n,
        difficulty_filter=req.difficulty_filter
    )

    return {
        "recommendations": recs,
        "total": len(recs),
        "model": "TF-IDF Content-Based Recommender",
        "solved_count": len(req.solved_ids)
    }


# ─── 3. Difficulty Classifier ────────────────────────────────────────────────
@app.post("/ml/difficulty-predict")
def predict_difficulty(req: DifficultyRequest):
    """
    Predict problem difficulty from title, description, tags.
    Returns: difficulty (Easy/Medium/Hard), confidence, probabilities
    """
    from models.difficulty_classifier import predict

    if "difficulty" not in _models:
        return {
            "difficulty": "Medium",
            "confidence": 0.5,
            "probabilities": {"Easy": 0.33, "Medium": 0.34, "Hard": 0.33},
            "model": "unavailable-fallback"
        }

    text = f"{req.title} {' '.join(req.tags)} {req.description} {req.constraints}".strip()
    if not text:
        raise HTTPException(status_code=400, detail="Provide at least a title or description.")

    return predict(_models["difficulty"], text)


# ─── 4. Interview Answer Scorer ───────────────────────────────────────────────
@app.post("/ml/interview-score")
def interview_score(req: InterviewScoreRequest):
    """
    Score a mock interview answer using semantic similarity.
    Returns: score (0-100), feedback, semantic_similarity, method
    """
    from models.interview_scorer import score_answer

    if not req.question or not req.answer:
        raise HTTPException(status_code=400, detail="Both question and answer are required.")

    result = score_answer(req.question, req.answer)
    result["interview_type"] = req.interview_type
    return result


# ─── 5. RAG Mentor ────────────────────────────────────────────────────────────
@app.post("/rag/mentor-ask")
async def rag_mentor(req: RAGRequest):
    """
    RAG-powered AI Mentor: retrieves relevant context from Placify knowledge base
    and generates a structured answer.
    """
    if not req.question or len(req.question.strip()) < 3:
        raise HTTPException(status_code=400, detail="Question must be at least 3 characters.")

    if not _models.get("rag_ready", False):
        # Trigger lazy build
        try:
            from rag.rag_pipeline import build_index
            success = build_index()
            _models["rag_ready"] = success
        except Exception as e:
            return {
                "answer": "The RAG mentor is initializing. Please try again in a moment.",
                "sources": [],
                "method": "initializing",
                "error": str(e)
            }

    from rag.rag_pipeline import answer_with_rag
    gemini_key = os.getenv("GEMINI_API_KEY")
    result = await answer_with_rag(req.question, gemini_api_key=gemini_key, top_k=req.top_k)
    return result


# ─── 6. RAG Retrieve (debug / admin) ──────────────────────────────────────────
@app.post("/rag/retrieve")
def rag_retrieve(req: RAGRequest):
    """Retrieve raw chunks for a query (for debugging/admin)."""
    from rag.rag_pipeline import retrieve
    chunks = retrieve(req.question, top_k=req.top_k)
    return {"chunks": chunks, "total": len(chunks)}


# ─── 7. Re-train trigger (admin) ──────────────────────────────────────────────
@app.post("/admin/retrain")
async def retrain():
    """Trigger full model retraining (admin endpoint)."""
    async def _retrain():
        import subprocess
        result = subprocess.run(
            [sys.executable, os.path.join(BASE_DIR, "models", "train_all.py")],
            capture_output=True, text=True, cwd=BASE_DIR
        )
        return result.returncode == 0, result.stdout, result.stderr

    success, out, err = await asyncio.to_thread(_retrain)
    return {
        "success": success,
        "message": "Retraining completed." if success else "Retraining failed.",
        "stdout": out[-2000:] if out else "",
        "stderr": err[-1000:] if err else ""
    }


# ─── 8. Rebuild RAG index (admin) ─────────────────────────────────────────────
@app.post("/admin/rebuild-rag")
async def rebuild_rag():
    """Rebuild the FAISS RAG index."""
    from rag.knowledge_builder import build_knowledge_chunks, save_chunks
    from rag.rag_pipeline import build_index

    chunks = build_knowledge_chunks()
    save_chunks(chunks)
    success = build_index(chunks)
    if success:
        _models["rag_ready"] = True
    return {"success": success, "chunks_indexed": len(chunks)}


# ─── Run ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info"
    )
