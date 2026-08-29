"""
rag_pipeline.py
RAG (Retrieval-Augmented Generation) pipeline for the Placify AI Mentor.

Steps:
1. Build/load a FAISS vector index from Placify knowledge chunks
2. On query: encode question → retrieve top-K relevant chunks
3. Compose context → generate answer via Gemini API or local rule-based fallback

Requires: sentence-transformers, faiss-cpu
"""

import os
import json
import numpy as np

RAG_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(os.path.dirname(RAG_DIR), "saved_models")
CHUNKS_FILE = os.path.join(RAG_DIR, "knowledge_chunks.json")
INDEX_FILE = os.path.join(MODELS_DIR, "faiss_index.bin")
METADATA_FILE = os.path.join(MODELS_DIR, "rag_metadata.json")
os.makedirs(MODELS_DIR, exist_ok=True)

# Singleton encoder (lazy-loaded)
_encoder = None
_index = None
_metadata = None


def _get_encoder():
    global _encoder
    if _encoder is None:
        from sentence_transformers import SentenceTransformer
        _encoder = SentenceTransformer("all-MiniLM-L6-v2")
        print("[RAG] Sentence encoder loaded: all-MiniLM-L6-v2")
    return _encoder


def build_index(chunks: list = None) -> bool:
    """
    Build (or rebuild) the FAISS index from knowledge chunks.
    Returns True on success.
    """
    global _index, _metadata

    try:
        import faiss

        if chunks is None:
            if not os.path.exists(CHUNKS_FILE):
                from rag.knowledge_builder import build_knowledge_chunks, save_chunks
                chunks = build_knowledge_chunks()
                save_chunks(chunks)
            else:
                with open(CHUNKS_FILE, "r", encoding="utf-8") as f:
                    chunks = json.load(f)

        if not chunks:
            print("[RAG] No chunks to index!")
            return False

        encoder = _get_encoder()
        texts = [c["text"] for c in chunks]
        print(f"[RAG] Encoding {len(texts)} chunks...")
        embeddings = encoder.encode(texts, batch_size=32, show_progress_bar=True, convert_to_numpy=True)
        embeddings = embeddings.astype("float32")

        # Normalize for cosine similarity
        faiss.normalize_L2(embeddings)

        # Inner product index (with normalized vectors = cosine similarity)
        dim = embeddings.shape[1]
        index = faiss.IndexFlatIP(dim)
        index.add(embeddings)

        # Save
        faiss.write_index(index, INDEX_FILE)
        with open(METADATA_FILE, "w", encoding="utf-8") as f:
            json.dump(chunks, f, ensure_ascii=False)

        _index = index
        _metadata = chunks
        print(f"[RAG] FAISS index built: {index.ntotal} vectors (dim={dim}) → {INDEX_FILE}")
        return True

    except Exception as e:
        print(f"[RAG] Index build failed: {e}")
        return False


def load_index() -> bool:
    """Load existing FAISS index + metadata from disk."""
    global _index, _metadata

    try:
        import faiss

        if not os.path.exists(INDEX_FILE) or not os.path.exists(METADATA_FILE):
            print("[RAG] No existing index found, building now...")
            return build_index()

        _index = faiss.read_index(INDEX_FILE)
        with open(METADATA_FILE, "r", encoding="utf-8") as f:
            _metadata = json.load(f)

        print(f"[RAG] Loaded FAISS index: {_index.ntotal} vectors")
        return True
    except Exception as e:
        print(f"[RAG] Load index failed: {e}")
        return False


def retrieve(query: str, top_k: int = 5) -> list:
    """
    Retrieve the top_k most relevant knowledge chunks for a query.
    Returns list of {"text": ..., "source": ..., "topic": ..., "score": ...}
    """
    global _index, _metadata

    if _index is None or _metadata is None:
        if not load_index():
            return []

    try:
        import faiss
        encoder = _get_encoder()
        q_emb = encoder.encode([query], convert_to_numpy=True).astype("float32")
        faiss.normalize_L2(q_emb)

        scores, indices = _index.search(q_emb, min(top_k, _index.ntotal))
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < 0 or idx >= len(_metadata):
                continue
            chunk = _metadata[idx]
            results.append({
                "text": chunk.get("text", ""),
                "source": chunk.get("source", ""),
                "topic": chunk.get("topic", ""),
                "score": round(float(score), 4)
            })
        return results
    except Exception as e:
        print(f"[RAG] Retrieval error: {e}")
        return []


async def answer_with_rag(question: str, gemini_api_key: str = None, top_k: int = 5) -> dict:
    """
    Full RAG pipeline:
    1. Retrieve relevant chunks
    2. Compose context
    3. Generate answer via Gemini or local fallback
    """
    retrieved = retrieve(question, top_k=top_k)

    if not retrieved:
        return {
            "answer": "I couldn't find relevant information. Please try rephrasing your question.",
            "sources": [],
            "method": "no-retrieval"
        }

    # Compose context
    context_parts = []
    for i, chunk in enumerate(retrieved[:4], 1):
        context_parts.append(f"[Source {i}: {chunk['source']} — {chunk['topic']}]\n{chunk['text'][:500]}")
    context = "\n\n".join(context_parts)

    sources = [{"source": c["source"], "topic": c["topic"], "relevance": c["score"]} for c in retrieved]

    # Try Gemini API if key provided
    if gemini_api_key:
        try:
            import httpx
            prompt = f"""You are the Placify AI Placement Coach. Answer the student's question using ONLY the provided context.
Be concise, structured, and educational. Use bullet points where helpful.

Context:
{context}

Student Question: {question}

Answer:"""
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_api_key}",
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 512}
                    }
                )
                if response.status_code == 200:
                    data = response.json()
                    text = data["candidates"][0]["content"]["parts"][0]["text"]
                    return {
                        "answer": text.strip(),
                        "sources": sources,
                        "method": "RAG + Gemini",
                        "chunks_retrieved": len(retrieved)
                    }
        except Exception as e:
            print(f"[RAG] Gemini call failed: {e}, using local fallback")

    # Local fallback: synthesize answer from retrieved chunks
    fallback_answer = _synthesize_locally(question, retrieved)
    return {
        "answer": fallback_answer,
        "sources": sources,
        "method": "RAG (local synthesis)",
        "chunks_retrieved": len(retrieved)
    }


def _synthesize_locally(question: str, chunks: list) -> str:
    """
    Rule-based local synthesis when Gemini is unavailable.
    Extracts key sentences from retrieved chunks.
    """
    q_lower = question.lower()
    lines = []
    lines.append(f"**Answer based on Placify Knowledge Base:**\n")

    for chunk in chunks[:3]:
        topic = chunk.get("topic", "")
        text = chunk.get("text", "")
        source = chunk.get("source", "")

        # Extract the most relevant part of chunk text (skip source prefix)
        content = text
        if "] " in content:
            content = content.split("] ", 1)[-1]

        # Take first 2-3 sentences
        sentences = [s.strip() for s in content.replace("\n", " ").split(". ") if len(s.strip()) > 20]
        snippet = ". ".join(sentences[:3]) + "."

        lines.append(f"**{topic}** *(from {source})*")
        lines.append(snippet)
        lines.append("")

    lines.append("---")
    lines.append("*Tip: Configure your Gemini API key for more detailed, personalized answers.*")
    return "\n".join(lines)


if __name__ == "__main__":
    import asyncio

    # Build index
    success = build_index()
    if success:
        print("\n[RAG] Testing retrieval...")
        results = retrieve("What is dynamic programming?", top_k=3)
        for r in results:
            print(f"  [{r['score']:.3f}] {r['topic']} — {r['text'][:100]}...")
