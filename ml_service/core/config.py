"""
core/config.py
Central configuration for the Placify ML service.

The environment is loaded from the repository-root .env using an absolute path,
so behaviour does not depend on the current working directory. Variables that are
already set in the process environment take precedence over .env values.

Path overrides (used by the test-suite and by deployments):
  PLACIFY_MODELS_DIR  trained model bundles + FAISS index   (default: ml_service/saved_models)
  PLACIFY_DATA_DIR    generated datasets + knowledge chunks (default: ml_service/data/generated)
  PLACIFY_DB_PATH     SQLite problem bank                    (default: DATABASE_URL from .env,
                                                              resolved relative to prisma/)
"""

import logging
import os
import shutil
import sys
from pathlib import Path
from typing import List

from dotenv import load_dotenv

ML_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = ML_DIR.parent
PRISMA_DIR = ROOT_DIR / "prisma"
ENV_FILE = ROOT_DIR / ".env"

DEFAULT_GEMINI_MODEL = "gemini-2.5-flash"
DEFAULT_EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

# Values copied verbatim from .env.example are treated as "not configured".
_PLACEHOLDER_PREFIXES = ("your_", "changeme", "change-me", "<")

_env_loaded = False

# joblib/loky shells out to `wmic` to count physical cores; wmic no longer exists on
# Windows 11, which prints a warning plus a traceback on every training run. Giving
# loky an explicit (physical-core sized) limit skips that probe entirely.
if sys.platform == "win32" and shutil.which("wmic") is None:
    os.environ.setdefault("LOKY_MAX_CPU_COUNT", str(max(1, (os.cpu_count() or 2) // 2)))


def load_env() -> None:
    """Load the root .env once (never overriding variables already in the environment)."""
    global _env_loaded
    if _env_loaded:
        return
    if ENV_FILE.is_file():
        load_dotenv(ENV_FILE, override=False)
    _env_loaded = True


def env(name: str, default: str = "") -> str:
    load_env()
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip()


def _is_placeholder(value: str) -> bool:
    return value.lower().startswith(_PLACEHOLDER_PREFIXES)


def _dir_from_env(var: str, default: Path) -> Path:
    raw = env(var)
    path = Path(raw).expanduser() if raw else default
    if not path.is_absolute():
        path = ML_DIR / path
    path = path.resolve()
    path.mkdir(parents=True, exist_ok=True)
    return path


def models_dir() -> Path:
    return _dir_from_env("PLACIFY_MODELS_DIR", ML_DIR / "saved_models")


def generated_data_dir() -> Path:
    return _dir_from_env("PLACIFY_DATA_DIR", ML_DIR / "data" / "generated")


def internal_api_key() -> str:
    """Shared secret Node sends in X-API-Key. Empty string means 'not configured'."""
    key = env("INTERNAL_API_KEY")
    if not key or _is_placeholder(key):
        return ""
    return key


def gemini_api_key() -> str:
    key = env("GEMINI_API_KEY")
    if not key or _is_placeholder(key):
        return ""
    return key


def gemini_model() -> str:
    return env("GEMINI_MODEL") or DEFAULT_GEMINI_MODEL


def embedding_model_name() -> str:
    return env("PLACIFY_EMBEDDING_MODEL") or DEFAULT_EMBEDDING_MODEL


def ml_host() -> str:
    return env("ML_HOST") or "127.0.0.1"


def ml_port() -> int:
    raw = env("ML_PORT") or "8000"
    try:
        port = int(raw)
    except ValueError:
        raise ValueError(f"ML_PORT must be an integer, got {raw!r}") from None
    if not 1 <= port <= 65535:
        raise ValueError(f"ML_PORT out of range: {port}")
    return port


def allowed_origins() -> List[str]:
    """CORS origins. Node talks to this service server-to-server, so this is only a
    browser safety net; wildcard origins are never honoured."""
    raw = env("ALLOWED_ORIGINS") or "http://localhost:3000"
    origins = [o.strip().rstrip("/") for o in raw.split(",") if o.strip()]
    return [o for o in origins if o != "*"]


def setup_logging(level: int = logging.INFO) -> None:
    """Configure plain ASCII-safe console logging for entry points (server, training)."""
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(errors="replace")  # never crash a cp1252 console
        except Exception:
            pass
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)-7s [%(name)s] %(message)s",
        datefmt="%H:%M:%S",
    )
    logging.getLogger("faiss.loader").setLevel(logging.WARNING)  # CPU-feature probing chatter
