"""
rag_pipeline.py
Retrieval-Augmented Generation for the Placify AI mentor.

1. build_index(): encode knowledge chunks with the shared sentence encoder and
   store a FAISS inner-product index (cosine on L2-normalised vectors) plus the
   chunk metadata in the models directory.
2. retrieve(): top-k chunks for a question (CPU-bound; async callers must run it
   via asyncio.to_thread).
3. answer_with_rag(): Gemini generation grounded on the retrieved chunks when
   GEMINI_API_KEY is set (12 s hard timeout), otherwise / on failure a local
   extractive answer built from the same chunks.
"""

import asyncio
import json
import logging
import os
import threading
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import httpx
import numpy as np

from core import config, embeddings
from core.bundle import RAG_INDEX_FILE, RAG_METADATA_FILE, write_json_atomic

logger = logging.getLogger("placify.rag")

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
GEMINI_TIMEOUT_SECONDS = 12.0
MAX_HISTORY_TURNS = 10
MAX_HISTORY_CHARS = 1000
CONTEXT_CHUNKS = 4

METHOD_GEMINI = "RAG + Gemini"
METHOD_LOCAL = "RAG (local synthesis)"
METHOD_NO_RETRIEVAL = "no-retrieval"


class RagUnavailable(RuntimeError):
    """The index is not loaded or the sentence encoder is unavailable."""


@dataclass(frozen=True)
class _IndexState:
    index: Any
    chunks: List[Dict[str, Any]]
    embedding_model: str


_state: Optional[_IndexState] = None
_build_lock = threading.Lock()


def _paths():
    directory = config.models_dir()
    return directory / RAG_INDEX_FILE, directory / RAG_METADATA_FILE


def is_ready() -> bool:
    return _state is not None and embeddings.is_ready()


def index_is_current(problem_fingerprint: Optional[str] = None) -> bool:
    """Index files exist, were built with the configured embedding model and (when a
    fingerprint is given) from the current problem bank."""
    index_path, meta_path = _paths()
    if not index_path.is_file() or not meta_path.is_file():
        return False
    try:
        with open(meta_path, "r", encoding="utf-8") as fh:
            meta = json.load(fh)
    except (OSError, ValueError):
        return False
    if not isinstance(meta, dict) or meta.get("embedding_model") != embeddings.encoder_name():
        return False
    return problem_fingerprint is None or meta.get("problem_fingerprint") == problem_fingerprint


def build_index(chunks: List[Dict[str, Any]], problem_fingerprint: Optional[str] = None) -> int:
    """Encode `chunks`, persist the FAISS index + metadata atomically, and activate it."""
    global _state
    import faiss

    if not chunks:
        raise ValueError("No knowledge chunks to index")
    encoder = embeddings.get_encoder()
    if encoder is None:
        raise RagUnavailable("sentence encoder unavailable")

    with _build_lock:
        texts = [c["text"] for c in chunks]
        logger.info("RAG: encoding %d chunks", len(texts))
        vectors = np.asarray(
            encoder.encode(texts, batch_size=32, show_progress_bar=False, convert_to_numpy=True),
            dtype="float32",
        )
        vectors = np.ascontiguousarray(vectors)
        faiss.normalize_L2(vectors)
        index = faiss.IndexFlatIP(vectors.shape[1])
        index.add(vectors)

        index_path, meta_path = _paths()
        tmp_index = index_path.with_name(index_path.name + ".tmp")
        faiss.write_index(index, str(tmp_index))
        os.replace(tmp_index, index_path)
        model_name = embeddings.encoder_name()
        write_json_atomic(meta_path, {
            "embedding_model": model_name,
            "dimension": int(vectors.shape[1]),
            "problem_fingerprint": problem_fingerprint,
            "chunks": chunks,
        }, indent=None)

        _state = _IndexState(index=index, chunks=list(chunks), embedding_model=model_name)
    logger.info("RAG: index built with %d vectors -> %s", index.ntotal, index_path)
    return int(index.ntotal)


def load_index() -> bool:
    """Load the persisted index. Returns False (and logs why) if missing or stale."""
    global _state
    import faiss

    index_path, meta_path = _paths()
    if not index_path.is_file() or not meta_path.is_file():
        logger.warning("RAG: no index at %s (run train_all.py or POST /admin/rebuild-rag)", index_path)
        _state = None
        return False
    try:
        with open(meta_path, "r", encoding="utf-8") as fh:
            meta = json.load(fh)
        if not isinstance(meta, dict) or not isinstance(meta.get("chunks"), list):
            logger.warning("RAG: %s has an outdated format; rebuild the index", meta_path.name)
            _state = None
            return False
        if meta.get("embedding_model") != embeddings.encoder_name():
            logger.warning("RAG: index was built with %s but the encoder is %s; rebuild the index",
                           meta.get("embedding_model"), embeddings.encoder_name())
            _state = None
            return False
        index = faiss.read_index(str(index_path))
        if index.ntotal != len(meta["chunks"]):
            logger.warning("RAG: index/metadata size mismatch; rebuild the index")
            _state = None
            return False
    except Exception:
        logger.exception("RAG: failed to load index from %s", index_path)
        _state = None
        return False

    _state = _IndexState(index=index, chunks=meta["chunks"], embedding_model=meta["embedding_model"])
    logger.info("RAG: loaded index with %d vectors", index.ntotal)
    return True


def retrieve(query: str, top_k: int = 5) -> List[Dict[str, Any]]:
    """Blocking: encodes the query and searches the index."""
    import faiss

    state = _state
    if state is None:
        raise RagUnavailable("RAG index not loaded")
    encoder = embeddings.get_encoder()
    if encoder is None:
        raise RagUnavailable("sentence encoder unavailable")

    query_vec = np.ascontiguousarray(
        np.asarray(encoder.encode([query], convert_to_numpy=True, show_progress_bar=False), dtype="float32")
    )
    faiss.normalize_L2(query_vec)
    k = max(1, min(int(top_k), state.index.ntotal))
    scores, indices = state.index.search(query_vec, k)

    results = []
    for score, idx in zip(scores[0], indices[0]):
        if idx < 0 or idx >= len(state.chunks):
            continue
        chunk = state.chunks[idx]
        results.append({
            "text": chunk.get("text", ""),
            "source": chunk.get("source", "Knowledge Base"),
            "topic": chunk.get("topic", "General"),
            "score": round(float(score), 4),
        })
    return results


def _format_history(chat_history: Optional[List[Dict[str, str]]]) -> str:
    lines = []
    for turn in (chat_history or [])[-MAX_HISTORY_TURNS:]:
        content = " ".join(str(turn.get("content", "")).split())[:MAX_HISTORY_CHARS]
        if not content:
            continue
        speaker = "Coach" if turn.get("role") == "assistant" else "Student"
        lines.append(f"{speaker}: {content}")
    return "\n".join(lines)


def build_prompt(question: str, chunks: List[Dict[str, Any]],
                 chat_history: Optional[List[Dict[str, str]]] = None) -> str:
    context = "\n\n".join(
        f"[Source {i}: {c['source']} - {c['topic']}]\n{c['text'][:600]}"
        for i, c in enumerate(chunks[:CONTEXT_CHUNKS], 1)
    )
    history = _format_history(chat_history)
    history_block = f"Conversation so far (oldest first):\n{history}\n\n" if history else ""
    return (
        "You are the Placify AI Placement Coach. Answer the student's latest question using the "
        "provided context and the conversation so far. If the context does not cover the question, "
        "say so briefly and give general, accurate guidance. Be concise, structured and educational; "
        "use bullet points where helpful.\n\n"
        f"Context:\n{context}\n\n"
        f"{history_block}"
        f"Student question: {question}\n\n"
        "Answer:"
    )


async def _call_gemini(prompt: str, api_key: str, model: str) -> Optional[str]:
    generation_config: Dict[str, Any] = {"temperature": 0.3, "maxOutputTokens": 1024}
    if "2.5-flash" in model:
        generation_config["thinkingConfig"] = {"thinkingBudget": 0}  # keep latency low
    payload = {"contents": [{"role": "user", "parts": [{"text": prompt}]}],
               "generationConfig": generation_config}

    async def _post() -> httpx.Response:
        async with httpx.AsyncClient(timeout=httpx.Timeout(GEMINI_TIMEOUT_SECONDS)) as client:
            return await client.post(
                GEMINI_URL.format(model=model),
                headers={"x-goog-api-key": api_key, "Content-Type": "application/json"},
                json=payload,
            )

    try:
        response = await asyncio.wait_for(_post(), timeout=GEMINI_TIMEOUT_SECONDS)
    except asyncio.TimeoutError:
        logger.warning("Gemini (%s) timed out after %.0fs", model, GEMINI_TIMEOUT_SECONDS)
        return None
    except httpx.HTTPError as exc:
        logger.warning("Gemini (%s) request failed: %s", model, exc.__class__.__name__)
        return None

    if response.status_code != 200:
        logger.warning("Gemini (%s) returned HTTP %d: %s", model, response.status_code,
                       " ".join(response.text.split())[:300])
        return None
    try:
        data = response.json()
        candidate = data["candidates"][0]
        text = "".join(part.get("text", "") for part in candidate["content"]["parts"]).strip()
    except (ValueError, KeyError, IndexError, TypeError):
        logger.warning("Gemini (%s) response contained no text", model)
        return None
    return text or None


def synthesize_locally(chunks: List[Dict[str, Any]], note: str) -> str:
    """Extractive answer from the top retrieved chunks."""
    lines = ["**Answer based on the Placify knowledge base:**", ""]
    for chunk in chunks[:3]:
        topic = chunk.get("topic", "")
        content = chunk.get("text", "")
        if "] " in content:
            content = content.split("] ", 1)[-1]  # drop the "[source]" prefix
        if topic and content.startswith(f"{topic}:"):
            content = content[len(topic) + 1:].strip()  # the topic is already the heading
        sentences = [s.strip() for s in content.replace("\n", " ").split(". ") if len(s.strip()) > 20]
        snippet = ". ".join(sentences[:3]).rstrip(".") + "." if sentences else content.strip()
        lines.append(f"**{topic or 'General'}** *(from {chunk.get('source', 'Knowledge Base')})*")
        lines.append(snippet)
        lines.append("")
    lines.append("---")
    lines.append(f"*{note}*")
    return "\n".join(lines)


async def answer_with_rag(question: str, top_k: int = 5,
                          chat_history: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
    retrieved = await asyncio.to_thread(retrieve, question, top_k)
    if not retrieved:
        return {
            "answer": "I couldn't find relevant information in the knowledge base. Try rephrasing your question.",
            "sources": [],
            "method": METHOD_NO_RETRIEVAL,
            "chunks_retrieved": 0,
        }

    sources = [{"source": c["source"], "topic": c["topic"], "relevance": c["score"]} for c in retrieved]

    api_key = config.gemini_api_key()
    if api_key:
        prompt = build_prompt(question, retrieved, chat_history)
        text = await _call_gemini(prompt, api_key, config.gemini_model())
        if text:
            return {"answer": text, "sources": sources, "method": METHOD_GEMINI,
                    "chunks_retrieved": len(retrieved)}
        note = ("The AI answer generator is temporarily unavailable, so this answer was "
                "assembled directly from the knowledge base.")
    else:
        note = "This answer was assembled directly from the Placify knowledge base."

    return {"answer": synthesize_locally(retrieved, note), "sources": sources,
            "method": METHOD_LOCAL, "chunks_retrieved": len(retrieved)}
