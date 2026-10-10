"""
core/problem_bank.py
Read-only access to the Placify problem bank: the Prisma SQLite database
(default prisma/dev.db), table "Problem".

The ML service never writes to this database. It is the single source of truth
for the recommender and the RAG knowledge base (the old server-db.json is gone).
"""

import hashlib
import json
import logging
import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Optional

from core import config

logger = logging.getLogger("placify.problem_bank")

SETUP_HINT = (
    "Run `npm run setup` from the project root first "
    "(it creates prisma/dev.db and seeds the problem bank)."
)

REQUIRED_COLUMNS = ("id", "title", "difficulty", "description", "tags", "constraints")
OPTIONAL_COLUMNS = ("editorial", "hints")
DIFFICULTIES = ("Easy", "Medium", "Hard")


class ProblemBankError(RuntimeError):
    """The problem bank database is missing, unreadable or empty."""


def resolve_db_path() -> Path:
    """PLACIFY_DB_PATH wins; otherwise DATABASE_URL (Prisma 'file:' URL, relative to prisma/)."""
    explicit = config.env("PLACIFY_DB_PATH")
    if explicit:
        path = Path(explicit).expanduser()
        return (path if path.is_absolute() else config.ROOT_DIR / path).resolve()

    url = (config.env("DATABASE_URL") or "file:./dev.db").strip().strip('"').strip("'")
    if not url.startswith("file:"):
        raise ProblemBankError(
            "DATABASE_URL is not a SQLite 'file:' URL; set PLACIFY_DB_PATH to the problem bank file."
        )
    raw = url[len("file:"):].split("?", 1)[0]
    path = Path(raw)
    if not path.is_absolute():
        path = config.PRISMA_DIR / path
    return path.resolve()


def _parse_list(value: Any) -> List[str]:
    """Tags/hints are stored as JSON string arrays; tolerate plain comma-separated text."""
    if value is None:
        return []
    if isinstance(value, (list, tuple)):
        items = value
    else:
        text = str(value).strip()
        if not text:
            return []
        try:
            parsed = json.loads(text)
            items = parsed if isinstance(parsed, list) else [parsed]
        except ValueError:
            items = text.split(",")
    return [str(item).strip() for item in items if str(item).strip()]


def normalize_difficulty(value: Any) -> str:
    text = str(value or "").strip().capitalize()
    return text if text in DIFFICULTIES else "Medium"


def fingerprint(problems: List[Dict[str, Any]]) -> str:
    """Stable hash of the problem bank content, used to detect stale trained artifacts."""
    payload = json.dumps(problems, sort_keys=True, ensure_ascii=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode("ascii")).hexdigest()


def load_problems(db_path: Optional[Path] = None) -> List[Dict[str, Any]]:
    """
    Return every problem as
    {id, title, difficulty, description, tags: [str], constraints, editorial, hints: [str]}
    ordered by id. Raises ProblemBankError with a setup hint if the DB is missing or empty.
    """
    path = Path(db_path) if db_path else resolve_db_path()
    if not path.is_file():
        raise ProblemBankError(f"Problem database not found at {path}. {SETUP_HINT}")

    try:
        conn = sqlite3.connect(f"{path.as_uri()}?mode=ro", uri=True)
    except sqlite3.Error as exc:
        raise ProblemBankError(f"Could not open problem database {path}: {exc}. {SETUP_HINT}") from exc

    try:
        columns = {row[1] for row in conn.execute('PRAGMA table_info("Problem")')}
        if not columns:
            raise ProblemBankError(f'Table "Problem" not found in {path}. {SETUP_HINT}')
        missing = [c for c in REQUIRED_COLUMNS if c not in columns]
        if missing:
            raise ProblemBankError(
                f'Table "Problem" in {path} is missing columns {missing}. {SETUP_HINT}'
            )
        selected = list(REQUIRED_COLUMNS) + [c for c in OPTIONAL_COLUMNS if c in columns]
        column_sql = ", ".join(f'"{c}"' for c in selected)
        rows = conn.execute(f'SELECT {column_sql} FROM "Problem" ORDER BY "id"').fetchall()
    except sqlite3.Error as exc:
        raise ProblemBankError(f"Could not read problems from {path}: {exc}. {SETUP_HINT}") from exc
    finally:
        conn.close()

    problems: List[Dict[str, Any]] = []
    for row in rows:
        record = dict(zip(selected, row))
        pid = str(record.get("id") or "").strip()
        if not pid:
            continue
        problems.append({
            "id": pid,
            "title": str(record.get("title") or "").strip() or pid,
            "difficulty": normalize_difficulty(record.get("difficulty")),
            "description": str(record.get("description") or ""),
            "tags": _parse_list(record.get("tags")),
            "constraints": str(record.get("constraints") or ""),
            "editorial": str(record.get("editorial") or ""),
            "hints": _parse_list(record.get("hints")),
        })

    if not problems:
        raise ProblemBankError(f"The problem bank at {path} has no problems. {SETUP_HINT}")

    logger.info("Loaded %d problems from %s", len(problems), path)
    return problems
