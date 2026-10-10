"""
Shared fixtures for the ML service tests.

The suite is hermetic: it builds a tiny SQLite problem bank, trains every model
into a temporary directory, and swaps the real SentenceTransformer for a
deterministic hashing encoder, so no network, no prisma/dev.db and no running
server are needed. Run from the repo root with:

    ml_service\\.venv\\Scripts\\python.exe -m pytest ml_service/tests -q
"""

import hashlib
import json
import os
import re
import shutil
import sqlite3
import sys
import tempfile
from pathlib import Path

import numpy as np
import pytest

ML_DIR = Path(__file__).resolve().parent.parent
if str(ML_DIR) not in sys.path:
    sys.path.insert(0, str(ML_DIR))

API_KEY = "test-internal-key-0123456789abcdef"
AUTH = {"X-API-Key": API_KEY}

# The environment must be in place before any service module reads it.
_TMP_ROOT = Path(tempfile.mkdtemp(prefix="placify-ml-tests-"))
DB_PATH = _TMP_ROOT / "problems.db"
os.environ.update({
    "INTERNAL_API_KEY": API_KEY,
    "GEMINI_API_KEY": "",
    "GEMINI_MODEL": "gemini-2.5-flash",
    "PLACIFY_MODELS_DIR": str(_TMP_ROOT / "models"),
    "PLACIFY_DATA_DIR": str(_TMP_ROOT / "data"),
    "PLACIFY_DB_PATH": str(DB_PATH),
    "ALLOWED_ORIGINS": "http://localhost:3000",
})
os.environ.pop("PLACIFY_ENABLE_DOCS", None)

_UNTRACKED_PARTS = {".venv", "__pycache__", ".pytest_cache", "saved_models", "generated"}


def _snapshot_source_tree():
    """mtime of every non-ignored file under ml_service (to prove training leaves them alone)."""
    snapshot = {}
    for path in ML_DIR.rglob("*"):
        if path.is_file() and not (set(path.relative_to(ML_DIR).parts) & _UNTRACKED_PARTS):
            snapshot[str(path)] = path.stat().st_mtime_ns
    return snapshot


SOURCE_TREE_BEFORE = _snapshot_source_tree()

PROBLEMS = [
    ("prob-arrays-two-sum", "Two Sum", "Easy",
     "Given an array of integers return the indices of two numbers that add up to a target using a hash map.",
     ["Arrays", "Hashing"], "Use a hash map from value to index.", ["Store complements while scanning"]),
    ("prob-arrays-maximum-subarray", "Maximum Subarray", "Medium",
     "Find the contiguous subarray with the largest sum using Kadane's algorithm.",
     ["Arrays", "Dynamic Programming"], "", ["Track the best sum ending at each index"]),
    ("prob-strings-valid-palindrome", "Valid Palindrome", "Easy",
     "Check whether a string is a palindrome after removing non-alphanumeric characters using two pointers.",
     ["Strings", "Two Pointers"], "", []),
    ("prob-strings-longest-substring", "Longest Substring Without Repeating Characters", "Medium",
     "Find the length of the longest substring without repeating characters using a sliding window.",
     ["Strings", "Sliding Window"], "Expand the right pointer and shrink on duplicates.", []),
    ("prob-graphs-number-of-islands", "Number of Islands", "Medium",
     "Count the islands in a grid of land and water using breadth first search on the graph of cells.",
     ["Graphs", "BFS"], "Flood fill each unvisited land cell.", []),
    ("prob-graphs-word-ladder", "Word Ladder", "Hard",
     "Find the shortest transformation sequence between two words using breadth first search on the graph of words.",
     ["Graphs", "BFS"], "", ["Treat each word as a graph node"]),
    ("prob-dp-climbing-stairs", "Climbing Stairs", "Easy",
     "Count the distinct ways to climb n stairs taking one or two steps using dynamic programming.",
     ["Dynamic Programming"], "", []),
    ("prob-dp-edit-distance", "Edit Distance", "Hard",
     "Compute the minimum insertions, deletions and substitutions to convert one string into another.",
     ["Dynamic Programming", "Strings"], "Classic 2D DP over prefixes.", []),
    ("prob-trees-maximum-depth", "Maximum Depth of Binary Tree", "Easy",
     "Return the maximum depth of a binary tree using recursive depth first search.",
     ["Trees", "DFS"], "", []),
    ("prob-trees-serialize-deserialize", "Serialize and Deserialize Binary Tree", "Hard",
     "Design an algorithm to serialize a binary tree to a string and deserialize it back.",
     ["Trees", "Design"], "", []),
    ("prob-heaps-kth-largest", "Kth Largest Element in an Array", "Medium",
     "Find the kth largest element in an unsorted array using a min-heap of size k.",
     ["Heaps", "Sorting"], "", []),
    ("prob-stacks-valid-parentheses", "Valid Parentheses", "Easy",
     "Determine whether a string of brackets is balanced using a stack.",
     ["Stacks", "Strings"], "", ["Push opening brackets, pop on closing ones"]),
]


def create_problem_db(path: Path, problems=PROBLEMS) -> Path:
    """Minimal copy of the Prisma "Problem" table."""
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        path.unlink()
    conn = sqlite3.connect(path)
    conn.execute(
        'CREATE TABLE "Problem" ("id" TEXT PRIMARY KEY, "title" TEXT NOT NULL, '
        '"difficulty" TEXT NOT NULL, "description" TEXT NOT NULL, "constraints" TEXT NOT NULL, '
        '"inputFormat" TEXT NOT NULL DEFAULT \'\', "outputFormat" TEXT NOT NULL DEFAULT \'\', '
        '"editorial" TEXT, "tags" TEXT NOT NULL, "examples" TEXT NOT NULL DEFAULT \'[]\', '
        '"testCases" TEXT NOT NULL DEFAULT \'[]\', "hints" TEXT NOT NULL DEFAULT \'[]\')'
    )
    conn.executemany(
        'INSERT INTO "Problem" ("id", "title", "difficulty", "description", "constraints", '
        '"editorial", "tags", "hints") VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [(pid, title, diff, desc, "1 <= n <= 10^5", editorial or None, json.dumps(tags), json.dumps(hints))
         for pid, title, diff, desc, tags, editorial, hints in problems],
    )
    conn.commit()
    conn.close()
    return path


class FakeEncoder:
    """Deterministic bag-of-words hashing encoder standing in for SentenceTransformer."""

    dim = 256

    def encode(self, texts, batch_size=32, show_progress_bar=False, convert_to_numpy=True, **_):
        if isinstance(texts, str):
            texts = [texts]
        out = np.zeros((len(texts), self.dim), dtype=np.float32)
        for row, text in enumerate(texts):
            out[row, 0] = 0.05  # never an all-zero vector
            for token in re.findall(r"[a-z0-9]+", text.lower()):
                out[row, int(hashlib.md5(token.encode()).hexdigest(), 16) % self.dim] += 1.0
        return out


FAKE_ENCODER_NAME = "test-hash-encoder"


@pytest.fixture(scope="session")
def trained():
    """Problem DB + every model trained into the temp dirs (once per session)."""
    from core import embeddings
    from models import train_all

    create_problem_db(DB_PATH)
    embeddings.set_encoder(FakeEncoder(), name=FAKE_ENCODER_NAME)
    results = train_all.run_training()
    failed = {step: r for step, r in results.items() if not r["ok"]}
    assert not failed, f"training failed: {failed}"
    return results


@pytest.fixture(scope="session")
def client(trained):
    from fastapi.testclient import TestClient

    import main

    with TestClient(main.app) as test_client:
        yield test_client


@pytest.fixture
def registry(client):
    import main

    return main.registry


def pytest_sessionfinish(session, exitstatus):
    shutil.rmtree(_TMP_ROOT, ignore_errors=True)
