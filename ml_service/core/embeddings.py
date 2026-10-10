"""
core/embeddings.py
The ONE SentenceTransformer instance shared by the RAG pipeline and the
interview scorer.

Loading is lazy and thread-safe. A failed load is cached, so an unavailable
model (no network on first run, broken torch install, ...) is reported once
instead of being retried on every request; reset() clears that state (used by
/admin/retrain so an operator can recover without restarting).
"""

import logging
import os
import threading
from typing import Any, Optional

from core import config

logger = logging.getLogger("placify.embeddings")

_lock = threading.Lock()
_encoder: Optional[Any] = None
_encoder_name: Optional[str] = None
_load_failed = False


def get_encoder() -> Optional[Any]:
    """Return the shared encoder, loading it on first use. None if it cannot be loaded."""
    global _encoder, _encoder_name, _load_failed
    if _encoder is not None:
        return _encoder
    if _load_failed:
        return None
    with _lock:
        if _encoder is not None:
            return _encoder
        if _load_failed:
            return None
        name = config.embedding_model_name()
        os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")  # noisy on Windows
        os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
        try:
            from sentence_transformers import SentenceTransformer

            logger.info("Loading sentence encoder %s (downloaded once on first use)", name)
            _encoder = SentenceTransformer(name, device="cpu")
            _encoder_name = name
            logger.info("Sentence encoder ready: %s", name)
        except Exception:
            logger.exception(
                "Sentence encoder %s could not be loaded; interview scoring and RAG are "
                "unavailable until it loads (POST /admin/retrain retries)", name,
            )
            _load_failed = True
            return None
    return _encoder


def encoder_name() -> str:
    return _encoder_name or config.embedding_model_name()


def is_ready() -> bool:
    return _encoder is not None


def reset() -> None:
    """Forget a cached load failure so the next get_encoder() call retries."""
    global _load_failed
    with _lock:
        _load_failed = False


def set_encoder(encoder: Optional[Any], name: str = "custom") -> None:
    """Inject an encoder (used by tests to avoid downloading the real model)."""
    global _encoder, _encoder_name, _load_failed
    with _lock:
        _encoder = encoder
        _encoder_name = name if encoder is not None else None
        _load_failed = False
