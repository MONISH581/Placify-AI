"""
core/bundle.py
Persistence helpers for trained model bundles and generated JSON artifacts.

Every bundle is a dict that records the model name and the scikit-learn version
it was trained with, so a version drift is visible in the logs at load time.
Writes are atomic (temp file + os.replace) so a crash never leaves a half-written
model where the service would pick it up.
"""

import json
import logging
import os
import warnings
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

import joblib
import sklearn

logger = logging.getLogger("placify.bundle")

PLACEMENT_FILE = "placement_model.pkl"
DIFFICULTY_FILE = "difficulty_model.pkl"
RECOMMENDER_FILE = "recommender_model.pkl"
RAG_INDEX_FILE = "faiss_index.bin"
RAG_METADATA_FILE = "rag_metadata.json"


def save_bundle(path: Path, payload: Dict[str, Any], model_name: str) -> Path:
    bundle = dict(payload)
    bundle["model_name"] = model_name
    bundle["sklearn_version"] = sklearn.__version__
    bundle["trained_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + ".tmp")
    joblib.dump(bundle, tmp)
    os.replace(tmp, path)
    return path


def load_bundle(path: Path, kind: str) -> Dict[str, Any]:
    bundle = joblib.load(path)
    if not isinstance(bundle, dict) or "model_name" not in bundle:
        raise ValueError(f"{Path(path).name} is not a Placify model bundle (retrain it)")
    saved = bundle.get("sklearn_version")
    if saved != sklearn.__version__:
        logger.warning(
            "%s model was trained with scikit-learn %s but %s is installed; "
            "retrain with `python models/train_all.py` to avoid incompatibilities",
            kind, saved or "unknown", sklearn.__version__,
        )
    return bundle


def bundle_is_current(path: Path, expect: Optional[Dict[str, Any]] = None) -> bool:
    """True if the bundle exists, loads, matches the running scikit-learn version and
    has every key/value in `expect` (e.g. the problem-bank fingerprint it was built from)."""
    path = Path(path)
    if not path.is_file():
        return False
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            bundle = joblib.load(path)
    except Exception:
        return False
    if not isinstance(bundle, dict) or "model_name" not in bundle:
        return False
    if bundle.get("sklearn_version") != sklearn.__version__:
        return False
    return all(bundle.get(key) == value for key, value in (expect or {}).items())


def write_json_atomic(path: Path, data: Any, indent: int = 2) -> Path:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + ".tmp")
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=indent, ensure_ascii=False)
    os.replace(tmp, path)
    return path
