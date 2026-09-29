"""
main.py - Placify ML FastAPI microservice.

Serves the trained models and the RAG mentor to the Node backend
(server-to-server). Every route except GET / and GET /health requires the
shared secret INTERNAL_API_KEY in the X-API-Key header; the service refuses to
start without it.

Run:  python main.py            (binds ML_HOST:ML_PORT, default 127.0.0.1:8000)
Train missing models first with: python models/train_all.py --only-missing
"""

import asyncio
import hmac
import logging
import os
import sys
from contextlib import asynccontextmanager
from typing import Dict, List, Literal, Optional

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import APIRouter, Depends, FastAPI, Header, HTTPException, Request  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.responses import JSONResponse  # noqa: E402
from pydantic import BaseModel, Field, field_validator, model_validator  # noqa: E402

from core import config, embeddings  # noqa: E402
from core.bundle import DIFFICULTY_FILE, PLACEMENT_FILE, RECOMMENDER_FILE, load_bundle  # noqa: E402
from core.problem_bank import ProblemBankError  # noqa: E402
from models import difficulty_classifier, interview_scorer, placement_scorer, problem_recommender  # noqa: E402
from models import train_all  # noqa: E402
from rag import rag_pipeline  # noqa: E402

logger = logging.getLogger("placify.ml")

SERVICE_NAME = "Placify ML API"
SERVICE_VERSION = "2.0.0"
TRAIN_HINT = "Train it with `python models/train_all.py` (or start.bat), or POST /admin/retrain."


# -----------------------------------------------------------------------------
# Model registry
# -----------------------------------------------------------------------------
class ModelRegistry:
    """Holds the loaded model bundles. Attribute swaps are atomic, so request
    handlers never see a half-loaded model while /admin/retrain reloads."""

    def __init__(self) -> None:
        self.placement: Optional[dict] = None
        self.difficulty: Optional[dict] = None
        self.recommender: Optional[dict] = None

    @staticmethod
    def _load(filename: str, kind: str) -> Optional[dict]:
        path = config.models_dir() / filename
        if not path.is_file():
            logger.warning("%s model not found at %s", kind, path)
            return None
        try:
            bundle = load_bundle(path, kind)
        except Exception:
            logger.exception("Failed to load %s model from %s", kind, path)
            return None
        logger.info("Loaded %s model: %s", kind, bundle["model_name"])
        return bundle

    def load_all(self) -> Dict[str, bool]:
        """Blocking: load every artifact that exists and log which ones are missing."""
        self.placement = self._load(PLACEMENT_FILE, "placement")
        self.difficulty = self._load(DIFFICULTY_FILE, "difficulty")
        self.recommender = self._load(RECOMMENDER_FILE, "recommender")
        embeddings.get_encoder()
        rag_pipeline.load_index()

        readiness = self.readiness()
        missing = [name for name, ready in readiness.items() if not ready]
        if missing:
            logger.warning("Models NOT available: %s. %s", ", ".join(missing), TRAIN_HINT)
            if "placement" in missing:
                logger.warning("Placement scores will use the documented heuristic-fallback.")
        else:
            logger.info("All models loaded.")
        return readiness

    def readiness(self) -> Dict[str, bool]:
        return {
            "placement": self.placement is not None,
            "recommender": self.recommender is not None,
            "difficulty": self.difficulty is not None,
            "interview": embeddings.is_ready(),
            "rag": rag_pipeline.is_ready(),
        }


registry = ModelRegistry()
_admin_lock = asyncio.Lock()


# -----------------------------------------------------------------------------
# Auth
# -----------------------------------------------------------------------------
def require_api_key(x_api_key: Optional[str] = Header(default=None, alias="X-API-Key")) -> None:
    expected = config.internal_api_key()
    if not expected or not x_api_key or not hmac.compare_digest(
        x_api_key.encode("utf-8"), expected.encode("utf-8")
    ):
        raise HTTPException(status_code=401, detail="Invalid or missing API key")


def ensure_api_key_configured() -> None:
    if not config.internal_api_key():
        message = (
            "INTERNAL_API_KEY is not set (or still has the .env.example placeholder). "
            f"Set it in {config.ENV_FILE} (run `npm run setup`) - refusing to start."
        )
        logger.critical(message)
        raise RuntimeError(message)


# -----------------------------------------------------------------------------
# App
# -----------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_api_key_configured()
    logger.info("%s %s starting (models dir %s)", SERVICE_NAME, SERVICE_VERSION, config.models_dir())
    await asyncio.to_thread(registry.load_all)
    yield
    logger.info("%s shutting down", SERVICE_NAME)


_docs_enabled = config.env("PLACIFY_ENABLE_DOCS") == "1"
app = FastAPI(
    title=SERVICE_NAME,
    version=SERVICE_VERSION,
    lifespan=lifespan,
    docs_url="/docs" if _docs_enabled else None,
    redoc_url=None,
    openapi_url="/openapi.json" if _docs_enabled else None,
)

# Node calls this service server-to-server; CORS is only a browser safety net.
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.allowed_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-API-Key"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    # The traceback is logged server-side by uvicorn; clients only get a generic message.
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


protected = APIRouter(dependencies=[Depends(require_api_key)])


# -----------------------------------------------------------------------------
# Schemas
# -----------------------------------------------------------------------------
class PlacementRequest(BaseModel):
    xp: int = Field(default=0, ge=0, le=100_000_000)
    level: int = Field(default=1, ge=1, le=10_000)
    streak: int = Field(default=0, ge=0, le=100_000)
    accuracy: float = Field(default=0.0, ge=0.0, le=100.0, description="Submission accuracy, 0-100")
    problems_solved: int = Field(default=0, ge=0, le=1_000_000)
    submission_count: int = Field(default=0, ge=0, le=10_000_000)
    user_id: Optional[str] = Field(default=None, max_length=128)


class PlacementResponse(BaseModel):
    placement_ready: bool
    score: int = Field(ge=0, le=100)
    probability: float = Field(ge=0.0, le=1.0)
    insights: List[str]
    model: str
    is_demo: bool = True


class RecommendRequest(BaseModel):
    solved_ids: List[str] = Field(default_factory=list, max_length=10_000)
    top_n: int = Field(default=10, ge=1, le=50)
    difficulty_filter: Optional[str] = None
    user_id: Optional[str] = Field(default=None, max_length=128)

    @field_validator("difficulty_filter")
    @classmethod
    def _difficulty(cls, value: Optional[str]) -> Optional[str]:
        if value is None or not value.strip():
            return None
        value = value.strip().capitalize()
        if value not in ("Easy", "Medium", "Hard"):
            raise ValueError("difficulty_filter must be 'Easy', 'Medium' or 'Hard'")
        return value


class ProblemRecommendation(BaseModel):
    problem_id: str
    title: str
    difficulty: str
    tags: List[str]
    score: float


class RecommendResponse(BaseModel):
    recommendations: List[ProblemRecommendation]
    total: int
    model: str
    solved_count: int
    strategy: Literal["content", "cold-start"]


class DifficultyRequest(BaseModel):
    title: str = Field(default="", max_length=500)
    description: str = Field(default="", max_length=20_000)
    tags: List[str] = Field(default_factory=list, max_length=50)
    constraints: str = Field(default="", max_length=5_000)

    @model_validator(mode="after")
    def _has_text(self) -> "DifficultyRequest":
        if not difficulty_classifier.build_text(self.title, self.description, self.tags, self.constraints):
            raise ValueError("Provide at least a title or description")
        return self


class DifficultyResponse(BaseModel):
    difficulty: Literal["Easy", "Medium", "Hard"]
    confidence: float = Field(ge=0.0, le=1.0)
    probabilities: Dict[str, float]
    model: str


class InterviewScoreRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2_000)
    answer: str = Field(min_length=1, max_length=5_000)
    interview_type: str = Field(default="Technical", max_length=32)

    @field_validator("question", "answer")
    @classmethod
    def _not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("must not be blank")
        return value.strip()


class InterviewScoreResponse(BaseModel):
    score: int = Field(ge=0, le=100)
    feedback: str
    semantic_similarity: float = Field(ge=0.0, le=1.0)
    method: str
    interview_type: str


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=5_000)


class RAGRequest(BaseModel):
    question: str = Field(min_length=1, max_length=4_000)
    top_k: int = Field(default=5, ge=1, le=10)
    chat_history: Optional[List[ChatTurn]] = Field(default=None, max_length=20)

    @field_validator("question")
    @classmethod
    def _question(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("question must not be blank")
        return value.strip()


class RAGSource(BaseModel):
    source: str
    topic: str
    relevance: float


class RAGResponse(BaseModel):
    answer: str
    sources: List[RAGSource]
    method: str
    chunks_retrieved: int


class RetrieveRequest(BaseModel):
    question: str = Field(min_length=1, max_length=4_000)
    top_k: int = Field(default=5, ge=1, le=20)


# -----------------------------------------------------------------------------
# Public routes
# -----------------------------------------------------------------------------
def _status(readiness: Dict[str, bool]) -> str:
    return "ok" if all(readiness.values()) else "degraded"


@app.get("/", tags=["Health"])
def root():
    return {"service": SERVICE_NAME, "version": SERVICE_VERSION, "status": _status(registry.readiness())}


@app.get("/health", tags=["Health"])
def health():
    readiness = registry.readiness()
    return {"status": _status(readiness), "models": readiness}


# -----------------------------------------------------------------------------
# Inference routes (X-API-Key required). Sync handlers run in FastAPI's threadpool.
# -----------------------------------------------------------------------------
@protected.post("/ml/placement-score", response_model=PlacementResponse, tags=["Placement"])
def placement_score(req: PlacementRequest):
    features = req.model_dump(exclude={"user_id"})
    bundle = registry.placement
    try:
        if bundle is None:
            result = placement_scorer.heuristic_predict(features)
        else:
            result = placement_scorer.predict(bundle, features)
    except Exception:
        logger.exception("Placement scoring failed")
        raise HTTPException(status_code=500, detail="Placement scoring failed") from None
    return PlacementResponse(**result, insights=placement_scorer.insights(features), is_demo=True)


@protected.post("/ml/recommend-problems", response_model=RecommendResponse, tags=["Recommendations"])
def recommend_problems(req: RecommendRequest):
    bundle = registry.recommender
    if bundle is None:
        raise HTTPException(status_code=503, detail=f"Problem recommender is not trained. {TRAIN_HINT}")
    try:
        result = problem_recommender.recommend(bundle, req.solved_ids, req.top_n, req.difficulty_filter)
    except Exception:
        logger.exception("Recommendation failed")
        raise HTTPException(status_code=500, detail="Recommendation failed") from None
    recs = result["recommendations"]
    return RecommendResponse(
        recommendations=recs,
        total=len(recs),
        model=result["model"],
        solved_count=len({s.strip() for s in req.solved_ids if s and s.strip()}),
        strategy=result["strategy"],
    )


@protected.post("/ml/difficulty-predict", response_model=DifficultyResponse, tags=["Difficulty"])
def difficulty_predict(req: DifficultyRequest):
    bundle = registry.difficulty
    if bundle is None:
        raise HTTPException(status_code=503, detail=f"Difficulty classifier is not trained. {TRAIN_HINT}")
    text = difficulty_classifier.build_text(req.title, req.description, req.tags, req.constraints)
    try:
        return difficulty_classifier.predict(bundle, text)
    except Exception:
        logger.exception("Difficulty prediction failed")
        raise HTTPException(status_code=500, detail="Difficulty prediction failed") from None


@protected.post("/ml/interview-score", response_model=InterviewScoreResponse, tags=["Interview"])
def interview_score(req: InterviewScoreRequest):
    interview_type = interview_scorer.normalize_interview_type(req.interview_type)
    try:
        result = interview_scorer.score_answer(req.question, req.answer, interview_type)
    except interview_scorer.ScorerUnavailable:
        raise HTTPException(
            status_code=503,
            detail="Interview scorer unavailable: the sentence encoder could not be loaded.",
        ) from None
    except Exception:
        logger.exception("Interview scoring failed")
        raise HTTPException(status_code=500, detail="Interview scoring failed") from None
    return InterviewScoreResponse(**result, interview_type=interview_type)


_RAG_NOT_READY = "AI mentor knowledge index is not ready. " + TRAIN_HINT


@protected.post("/rag/mentor-ask", response_model=RAGResponse, tags=["RAG"])
async def mentor_ask(req: RAGRequest):
    if not rag_pipeline.is_ready():
        raise HTTPException(status_code=503, detail=_RAG_NOT_READY)
    history = [turn.model_dump() for turn in req.chat_history or []]
    try:
        result = await rag_pipeline.answer_with_rag(req.question, top_k=req.top_k, chat_history=history)
    except rag_pipeline.RagUnavailable:
        raise HTTPException(status_code=503, detail=_RAG_NOT_READY) from None
    except Exception:
        logger.exception("RAG mentor query failed")
        raise HTTPException(status_code=500, detail="Mentor query failed") from None
    return result


@protected.post("/rag/retrieve", tags=["RAG"])
async def rag_retrieve(req: RetrieveRequest):
    """Raw retrieval results (debugging / admin tooling)."""
    if not rag_pipeline.is_ready():
        raise HTTPException(status_code=503, detail=_RAG_NOT_READY)
    try:
        chunks = await asyncio.to_thread(rag_pipeline.retrieve, req.question.strip(), req.top_k)
    except rag_pipeline.RagUnavailable:
        raise HTTPException(status_code=503, detail=_RAG_NOT_READY) from None
    return {"chunks": chunks, "total": len(chunks)}


# -----------------------------------------------------------------------------
# Admin routes (X-API-Key required)
# -----------------------------------------------------------------------------
def _busy() -> HTTPException:
    return HTTPException(status_code=409, detail="A retrain or RAG rebuild is already running")


@protected.post("/admin/retrain", tags=["Admin"])
async def retrain():
    """Retrain every model in a worker thread, then reload all models + the RAG index in-process."""
    if _admin_lock.locked():
        raise _busy()
    async with _admin_lock:
        embeddings.reset()  # allow a previously failed encoder load to be retried
        details = await asyncio.to_thread(train_all.run_training, False)
        readiness = await asyncio.to_thread(registry.load_all)
    success = all(step["ok"] for step in details.values())
    return {
        "success": success,
        "message": "Retraining completed; models reloaded." if success
        else "Retraining finished with failures; successfully trained models were reloaded.",
        "details": details,
        "models": readiness,
    }


@protected.post("/admin/rebuild-rag", tags=["Admin"])
async def rebuild_rag():
    """Rebuild the knowledge chunks from the problem bank and re-index them."""
    if _admin_lock.locked():
        raise _busy()
    async with _admin_lock:
        embeddings.reset()
        try:
            result = await asyncio.to_thread(train_all.build_rag)
        except ProblemBankError as exc:
            logger.error("RAG rebuild failed: %s", exc)
            raise HTTPException(status_code=503,
                                detail="Problem bank unavailable - run `npm run setup` first.") from None
        except rag_pipeline.RagUnavailable:
            raise HTTPException(status_code=503,
                                detail="Sentence encoder unavailable - see ML service logs.") from None
        except Exception:
            logger.exception("RAG rebuild failed")
            raise HTTPException(status_code=500, detail="RAG rebuild failed") from None
    return {"success": True, "chunks_indexed": result["chunks_indexed"]}


app.include_router(protected)


def main() -> None:
    import uvicorn

    config.setup_logging()
    try:
        ensure_api_key_configured()  # logs the reason itself
    except RuntimeError:
        sys.exit(1)
    try:
        host, port = config.ml_host(), config.ml_port()
    except ValueError as exc:
        logger.critical("%s", exc)
        sys.exit(1)
    logger.info("Listening on http://%s:%d", host, port)
    uvicorn.run(app, host=host, port=port, reload=False, log_level="info")


if __name__ == "__main__":
    main()
