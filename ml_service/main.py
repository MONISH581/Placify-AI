"""
main.py - Placify ML FastAPI Microservice
Serves all trained ML models + RAG pipeline via REST API.
Runs on port 8000. Node.js server proxies to this service.
"""

import os
import sys
import json
import asyncio
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager

import joblib
import numpy as np
import uvicorn
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator
from dotenv import load_dotenv

# --- Path setup --------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)
load_dotenv(os.path.join(os.path.dirname(BASE_DIR), ".env"))

MODELS_DIR = os.path.join(BASE_DIR, "saved_models")
os.makedirs(MODELS_DIR, exist_ok=True)

# --- Model registry (loaded at startup) --------------------------------------
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
    print("  Placify ML Service - Starting Up")
    print("=" * 60)

    load_model("placement", "placement_model.pkl")
    load_model("difficulty", "difficulty_model.pkl")
    load_model("recommender", "recommender_model.pkl")

    # Pre-warm sentence-transformer model for interview scorer
    try:
        from models.interview_scorer import _get_model
        _get_model()
        print("[ML] [OK] Interview scorer pre-warmed")
    except Exception as e:
        print(f"[ML] [WARN] Interview scorer pre-warm: {e}")

    # RAG index - lazy, try loading
    try:
        from rag.rag_pipeline import load_index
        if load_index():
            _models["rag_ready"] = True
            print("[RAG] [OK] FAISS index loaded")
        else:
            _models["rag_ready"] = False
            print("[RAG] [WARN] FAISS index load returned False")
    except Exception as e:
        print(f"[RAG] [WARN] RAG index not ready: {e}")
        _models["rag_ready"] = False

    print("=" * 60)
    print("  All models checked. Server ready at http://localhost:8000")
    print("=" * 60 + "\n")

    yield  # App runs here

    print("[ML] Shutting down ML service.")


# --- FastAPI App --------------------------------------------------------------
app = FastAPI(
    title="Placify ML API",
    description="ML microservice: placement scorer, problem recommender, difficulty classifier, interview scorer, RAG mentor",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Request / Response Models ------------------------------------------------

# 1. Placement Readiness
class PlacementRequest(BaseModel):
    xp: int = Field(default=0, ge=0, description="Total user experience points")
    level: int = Field(default=1, ge=1, description="Current user level (minimum 1)")
    streak: int = Field(default=0, ge=0, description="Daily problem streak count")
    accuracy: float = Field(default=50.0, ge=0.0, le=100.0, description="Submission accuracy percentage (0-100)")
    problems_solved: int = Field(default=0, ge=0, description="Total problems solved")
    submission_count: int = Field(default=0, ge=0, description="Total submission attempts")
    user_id: Optional[str] = Field(default=None, description="Optional user identifier")


class PlacementResponse(BaseModel):
    placement_ready: bool
    score: int = Field(ge=0, le=100)
    probability: float = Field(ge=0.0, le=1.0)
    insights: List[str] = Field(default_factory=list)
    model: str


# 2. Problem Recommender
class RecommendRequest(BaseModel):
    user_id: Optional[str] = Field(default=None, description="User ID for personalized recommendations")
    solved_ids: List[str] = Field(default_factory=list, description="List of problem IDs already solved")
    top_n: int = Field(default=10, ge=1, le=50, description="Number of recommendations to return (1-50)")
    difficulty_filter: Optional[str] = Field(default=None, description="Optional difficulty filter: 'Easy', 'Medium', 'Hard'")

    @field_validator("difficulty_filter")
    @classmethod
    def validate_difficulty(cls, v: Optional[str]) -> Optional[str]:
        if v is None or not v.strip():
            return None
        v_title = v.strip().capitalize()
        if v_title not in ("Easy", "Medium", "Hard"):
            raise ValueError("difficulty_filter must be one of 'Easy', 'Medium', or 'Hard'")
        return v_title


class ProblemRecommendation(BaseModel):
    problem_id: str
    title: str
    difficulty: str
    tags: Optional[str] = ""
    score: float


class RecommendResponse(BaseModel):
    recommendations: List[ProblemRecommendation]
    total: int
    model: str
    solved_count: int
    user_id: Optional[str] = None


# 3. Difficulty Classifier
class DifficultyRequest(BaseModel):
    text: Optional[str] = Field(default=None, description="Full problem text description")
    title: Optional[str] = Field(default="", description="Problem title")
    description: Optional[str] = Field(default="", description="Detailed problem statement")
    tags: Optional[List[str]] = Field(default_factory=list, description="List of tags or categories")
    constraints: Optional[str] = Field(default="", description="Problem constraints and limits")


class DifficultyResponse(BaseModel):
    difficulty: str
    confidence: float
    probabilities: Dict[str, float]
    model: str


# 4. Interview Scorer
class InterviewScoreRequest(BaseModel):
    question: str = Field(..., description="The interview question asked")
    answer: str = Field(..., description="The student's response")
    interview_type: Optional[str] = Field(default="Technical", description="Type of interview (e.g. Technical, Behavioral)")


class InterviewScoreResponse(BaseModel):
    score: int = Field(ge=0, le=100)
    feedback: str
    semantic_similarity: float
    method: str
    interview_type: Optional[str] = "Technical"


# 5. RAG Mentor
class RAGRequest(BaseModel):
    question: str = Field(..., description="Student's question (at least 3 characters)")
    top_k: int = Field(default=5, ge=1, le=10, description="Number of knowledge chunks to retrieve")
    chat_history: Optional[List[dict]] = Field(default=None, description="Optional conversational chat history")


class RAGSource(BaseModel):
    source: str
    topic: str
    relevance: float


class RAGResponse(BaseModel):
    answer: str
    sources: List[RAGSource] = Field(default_factory=list)
    method: str
    chunks_retrieved: int = 0


# --- Health Check & Root ------------------------------------------------------
@app.get("/", tags=["Health"])
def root():
    models_status = {
        "placement_scorer": "placement" in _models,
        "difficulty_classifier": "difficulty" in _models,
        "problem_recommender": "recommender" in _models,
        "interview_scorer": True,  # Always available (sentence-transformers / keyword fallback)
        "rag_pipeline": _models.get("rag_ready", False)
    }
    all_ready = all(models_status.values())
    return {
        "service": "Placify ML API",
        "version": "1.0.0",
        "status": "healthy" if all_ready else "degraded",
        "models": models_status
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}


# --- Core Inference Handlers -------------------------------------------------

def _get_insights(features: dict, score: int) -> list:
    """Generate ASCII-safe actionable feedback based on user profile."""
    insights = []
    if features.get("problems_solved", 0) < 30:
        insights.append("[Practice] Solve at least 30 more DSA problems to strengthen your profile.")
    if features.get("streak", 0) < 15:
        insights.append("[Consistency] Maintain a daily streak of 15+ days to demonstrate consistency.")
    if features.get("accuracy", 0) < 70:
        insights.append("[Accuracy] Improve submission accuracy - focus on testing edge cases before submitting.")
    if features.get("xp", 0) < 2000:
        insights.append("[XP] Earn more XP by solving Medium and Hard problems.")
    if not insights:
        insights.append("[Profile] Excellent profile! You are well-prepared for placement interviews.")
    return insights


def _handle_placement_score(req: PlacementRequest) -> PlacementResponse:
    from models.placement_scorer import predict

    # Model inference
    if "placement" in _models:
        try:
            req_dict = req.model_dump()
            result = predict(_models["placement"], req_dict)
            insights = _get_insights(req_dict, result["score"])
            return PlacementResponse(
                placement_ready=result["placement_ready"],
                score=result["score"],
                probability=result["probability"],
                insights=insights,
                model=result.get("model", "RandomForest + GradientBoosting Ensemble")
            )
        except Exception as e:
            print(f"[ML] [ERROR] Placement inference failed: {e}")
            raise HTTPException(status_code=500, detail=f"Placement inference failed: {str(e)}")

    # Heuristic fallback if model not loaded
    score = min(100, int(
        (req.xp / 100) * 0.3 +
        (req.problems_solved * 2) +
        (req.streak * 0.5) +
        req.accuracy * 0.3
    ))
    return PlacementResponse(
        placement_ready=score >= 55,
        score=score,
        probability=round(score / 100.0, 4),
        insights=_get_insights(req.model_dump(), score),
        model="heuristic-fallback"
    )


def _handle_difficulty_predict(req: DifficultyRequest) -> DifficultyResponse:
    from models.difficulty_classifier import predict

    # Extract text from either explicit text or combination of title, tags, description, constraints
    if req.text and req.text.strip():
        text = req.text.strip()
    else:
        tags_str = " ".join(req.tags) if req.tags else ""
        text = f"{req.title or ''} {tags_str} {req.description or ''} {req.constraints or ''}".strip()

    if not text:
        raise HTTPException(status_code=400, detail="Problem description/text cannot be empty.")

    if "difficulty" in _models:
        try:
            result = predict(_models["difficulty"], text)
            return DifficultyResponse(
                difficulty=result["difficulty"],
                confidence=result["confidence"],
                probabilities=result["probabilities"],
                model=result.get("model", "TF-IDF + Classifier")
            )
        except Exception as e:
            print(f"[ML] [ERROR] Difficulty prediction failed: {e}")
            raise HTTPException(status_code=500, detail=f"Difficulty prediction failed: {str(e)}")

    # Fallback if model not loaded
    return DifficultyResponse(
        difficulty="Medium",
        confidence=0.5,
        probabilities={"Easy": 0.33, "Medium": 0.34, "Hard": 0.33},
        model="unavailable-fallback"
    )


def _handle_problem_recommend(req: RecommendRequest) -> RecommendResponse:
    from models.problem_recommender import recommend

    if "recommender" not in _models:
        raise HTTPException(
            status_code=503,
            detail="Recommender model not loaded. Run train_all.py first."
        )

    try:
        recs = recommend(
            _models["recommender"],
            solved_ids=req.solved_ids,
            top_n=req.top_n,
            difficulty_filter=req.difficulty_filter
        )

        formatted_recs = [
            ProblemRecommendation(
                problem_id=r["problem_id"],
                title=r["title"],
                difficulty=r["difficulty"],
                tags=r.get("tags", ""),
                score=r["score"]
            )
            for r in recs
        ]

        return RecommendResponse(
            recommendations=formatted_recs,
            total=len(formatted_recs),
            model="TF-IDF Content-Based Recommender",
            solved_count=len(req.solved_ids),
            user_id=req.user_id
        )
    except Exception as e:
        print(f"[ML] [ERROR] Recommendation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Recommendation failed: {str(e)}")


def _handle_interview_score(req: InterviewScoreRequest) -> InterviewScoreResponse:
    from models.interview_scorer import score_answer

    if not req.question or not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    if not req.answer or not req.answer.strip():
        raise HTTPException(status_code=400, detail="Answer cannot be empty.")

    try:
        result = score_answer(req.question.strip(), req.answer.strip())
        return InterviewScoreResponse(
            score=result["score"],
            feedback=result["feedback"],
            semantic_similarity=result["semantic_similarity"],
            method=result["method"],
            interview_type=req.interview_type or "Technical"
        )
    except Exception as e:
        print(f"[ML] [ERROR] Interview scoring failed: {e}")
        raise HTTPException(status_code=500, detail=f"Interview scoring failed: {str(e)}")


async def _handle_rag_query(req: RAGRequest) -> RAGResponse:
    if not req.question or len(req.question.strip()) < 3:
        raise HTTPException(status_code=400, detail="Question must be at least 3 characters.")

    if not _models.get("rag_ready", False):
        # Attempt lazy index build/load
        try:
            from rag.rag_pipeline import build_index
            success = build_index()
            _models["rag_ready"] = success
        except Exception as e:
            print(f"[RAG] [WARN] Lazy index initialization failed: {e}")

    try:
        from rag.rag_pipeline import answer_with_rag
        gemini_key = os.getenv("GEMINI_API_KEY")
        result = await answer_with_rag(req.question.strip(), gemini_api_key=gemini_key, top_k=req.top_k)

        raw_sources = result.get("sources", [])
        sources = [
            RAGSource(
                source=s.get("source", "Knowledge Base"),
                topic=s.get("topic", "General"),
                relevance=s.get("relevance", 0.0)
            )
            for s in raw_sources
        ]

        return RAGResponse(
            answer=result.get("answer", ""),
            sources=sources,
            method=result.get("method", "RAG"),
            chunks_retrieved=result.get("chunks_retrieved", len(sources))
        )
    except Exception as e:
        print(f"[RAG] [ERROR] Query failed: {e}")
        raise HTTPException(status_code=500, detail=f"RAG query execution failed: {str(e)}")


# ==============================================================================
# 1. Placement Readiness Scorer Endpoints
# ==============================================================================
@app.post("/predict/placement", response_model=PlacementResponse, tags=["Placement"])
def predict_placement(req: PlacementRequest):
    """
    Canonical sprint endpoint for predicting placement readiness.
    Accepts: xp, level, streak, accuracy, problems_solved, submission_count, user_id.
    Returns: placement_ready, score (0-100), probability, insights, model name.
    """
    return _handle_placement_score(req)


@app.post("/ml/placement-score", response_model=PlacementResponse, tags=["Placement"])
def placement_score_legacy(req: PlacementRequest):
    """Backward-compatible route for placement readiness."""
    return _handle_placement_score(req)


# ==============================================================================
# 2. Difficulty Classifier Endpoints
# ==============================================================================
@app.post("/predict/difficulty", response_model=DifficultyResponse, tags=["Difficulty"])
def predict_difficulty(req: DifficultyRequest):
    """
    Canonical sprint endpoint for classifying DSA problem difficulty.
    Accepts: text (or title, tags, description, constraints).
    Returns: difficulty (Easy/Medium/Hard), confidence, probabilities, model name.
    """
    return _handle_difficulty_predict(req)


@app.post("/ml/difficulty-predict", response_model=DifficultyResponse, tags=["Difficulty"])
def difficulty_predict_legacy(req: DifficultyRequest):
    """Backward-compatible route for difficulty classification."""
    return _handle_difficulty_predict(req)


# ==============================================================================
# 3. Problem Recommender Endpoints
# ==============================================================================
@app.post("/recommend/problems", response_model=RecommendResponse, tags=["Recommendations"])
def recommend_problems(req: RecommendRequest):
    """
    Canonical sprint endpoint for recommending next problems.
    Accepts: solved_ids, top_n (1-50), difficulty_filter ('Easy', 'Medium', 'Hard'), user_id.
    Returns: ranked recommended problems with similarity scores.
    """
    return _handle_problem_recommend(req)


@app.post("/ml/recommend-problems", response_model=RecommendResponse, tags=["Recommendations"])
def recommend_problems_legacy(req: RecommendRequest):
    """Backward-compatible route for problem recommendations."""
    return _handle_problem_recommend(req)


# ==============================================================================
# 4. Interview Answer Scorer Endpoints
# ==============================================================================
@app.post("/evaluate/interview", response_model=InterviewScoreResponse, tags=["Interview"])
def evaluate_interview(req: InterviewScoreRequest):
    """
    Canonical sprint endpoint for scoring mock interview answers.
    Accepts: question, answer, interview_type.
    Returns: score (0-100), feedback, semantic_similarity, method.
    """
    return _handle_interview_score(req)


@app.post("/ml/interview-score", response_model=InterviewScoreResponse, tags=["Interview"])
def interview_score_legacy(req: InterviewScoreRequest):
    """Backward-compatible route for interview answer scoring."""
    return _handle_interview_score(req)


# ==============================================================================
# 5. RAG Mentor Endpoints
# ==============================================================================
@app.post("/rag/query", response_model=RAGResponse, tags=["RAG"])
async def rag_query(req: RAGRequest):
    """
    Canonical sprint endpoint for RAG AI Mentor queries.
    Retrieves context from the FAISS vector index and synthesizes an answer.
    """
    return await _handle_rag_query(req)


@app.post("/rag/mentor-ask", response_model=RAGResponse, tags=["RAG"])
async def rag_mentor_legacy(req: RAGRequest):
    """Backward-compatible route for RAG mentor queries."""
    return await _handle_rag_query(req)


@app.post("/rag/retrieve", tags=["RAG"])
def rag_retrieve(req: RAGRequest):
    """Retrieve raw chunks for a query (for debugging/admin)."""
    from rag.rag_pipeline import retrieve
    chunks = retrieve(req.question, top_k=req.top_k)
    return {"chunks": chunks, "total": len(chunks)}


# ==============================================================================
# 6. Admin Endpoints
# ==============================================================================
@app.post("/admin/retrain", tags=["Admin"])
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


@app.post("/admin/rebuild-rag", tags=["Admin"])
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


# ==============================================================================
# 7. Legacy /api/ai/* Compatibility Layer
# ==============================================================================
@app.post("/api/ai/readiness", tags=["Legacy AI"])
def legacy_ai_readiness(data: dict):
    """Compatibility route for legacy Node server calls to /api/ai/readiness."""
    req = PlacementRequest(
        xp=int(data.get("xp", 0) or 0),
        level=int(data.get("level", 1) or 1),
        streak=int(data.get("streak", 0) or 0),
        accuracy=float(data.get("accuracy", 50.0) or 50.0),
        problems_solved=int(data.get("problems_solved", data.get("problemsSolved", 0)) or 0),
        submission_count=int(data.get("submission_count", data.get("submissionCount", 0)) or 0),
        user_id=data.get("user_id", data.get("userId"))
    )
    res = _handle_placement_score(req)
    # Return structure expected by legacy caller + canonical fields
    return {
        "overall_readiness": float(res.score),
        "coding_readiness": float(res.score),
        "dsa_score": float(res.score),
        "placement_ready": res.placement_ready,
        "score": res.score,
        "probability": res.probability,
        "insights": res.insights,
        "model": res.model
    }


@app.post("/api/ai/recommend", tags=["Legacy AI"])
def legacy_ai_recommend(data: dict):
    """Compatibility route for legacy Node server calls to /api/ai/recommend."""
    req = RecommendRequest(
        user_id=data.get("user_id"),
        solved_ids=data.get("solved_ids", []),
        top_n=int(data.get("top_n", 5)),
        difficulty_filter=data.get("difficulty_filter")
    )
    res = _handle_problem_recommend(req)
    recommended_topic = res.recommendations[0].title if res.recommendations else "Arrays & Hashing"
    return {
        "recommendations": [r.model_dump() for r in res.recommendations],
        "recommended_topic": recommended_topic,
        "total": res.total,
        "model": res.model
    }


@app.post("/api/ai/mentor", tags=["Legacy AI"])
async def legacy_ai_mentor(data: dict):
    """Compatibility route for legacy Node server calls to /api/ai/mentor."""
    question = data.get("prompt") or data.get("question") or "How can I improve my placement readiness?"
    req = RAGRequest(question=question, top_k=int(data.get("top_k", 5)))
    res = await _handle_rag_query(req)
    return {
        "response": res.answer,
        "answer": res.answer,
        "sources": [s.model_dump() for s in res.sources],
        "method": res.method
    }


@app.post("/api/ai/interview", tags=["Legacy AI"])
def legacy_ai_interview(data: dict):
    """Compatibility route for legacy Node server calls to /api/ai/interview."""
    action = data.get("action", "evaluate_answer")
    if action == "evaluate_answer":
        req = InterviewScoreRequest(
            question=data.get("question", "Explain technical concept"),
            answer=data.get("answer", ""),
            interview_type=data.get("interview_type", "Technical")
        )
        res = _handle_interview_score(req)
        return res.model_dump()
    return {
        "question": "Explain the difference between an Array and a Linked List, and their time complexities.",
        "topic": data.get("topic", "Data Structures"),
        "difficulty": data.get("difficulty", "Medium")
    }


@app.post("/api/ai/roadmap", tags=["Legacy AI"])
def legacy_ai_roadmap(data: dict):
    """Compatibility route for legacy Node server calls to /api/ai/roadmap."""
    role = data.get("target_role", "Software Development Engineer (SDE)")
    return {
        "roadmap": [
            {"step": 1, "topic": "DSA Fundamentals (Arrays, Strings, Hash Maps)", "duration": "Weeks 1-2"},
            {"step": 2, "topic": "Linear Structures (Linked Lists, Stacks, Queues)", "duration": "Weeks 3-4"},
            {"step": 3, "topic": "Trees, Graphs & BFS/DFS", "duration": "Weeks 5-7"},
            {"step": 4, "topic": "Dynamic Programming & Greedy Algorithms", "duration": "Weeks 8-10"},
            {"step": 5, "topic": "System Design, CS Fundamentals & Mock Interviews", "duration": "Weeks 11-12"}
        ],
        "target_role": role,
        "status": "ready"
    }


# --- Run ----------------------------------------------------------------------
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info"
    )
