"""
train_all.py
Training pipeline for every Placify ML artifact.

    python models/train_all.py                 # (re)train everything
    python models/train_all.py --only-missing  # train only missing/stale artifacts (used by start.bat)

Steps (each independent; one failing does not stop the others):
  placement    synthetic cohort -> placement readiness classifier
  difficulty   curated examples -> difficulty classifier
  recommender  problem bank (prisma/dev.db) -> content-based recommender
  rag          learning notes + problem bank -> FAISS index (needs the sentence encoder)

All outputs go to gitignored locations (saved_models/, data/generated/ or the
PLACIFY_MODELS_DIR / PLACIFY_DATA_DIR overrides). Exit code 1 if any step failed.
"""

import argparse
import logging
import os
import sys
import time
from typing import Callable, Dict, Iterable, List, Optional

if __package__ in (None, ""):
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core import config, embeddings
from core.bundle import DIFFICULTY_FILE, PLACEMENT_FILE, RECOMMENDER_FILE, bundle_is_current
from core.problem_bank import ProblemBankError, fingerprint, load_problems
from rag import knowledge_builder, rag_pipeline

logger = logging.getLogger("placify.train")

STEPS = ("placement", "difficulty", "recommender", "rag")


def _train_placement() -> Dict:
    from data.generate_training_data import generate_placement_data
    from models import placement_scorer

    generate_placement_data()
    return placement_scorer.train()


def _train_difficulty() -> Dict:
    from data.generate_training_data import generate_difficulty_data
    from models import difficulty_classifier

    generate_difficulty_data()
    return difficulty_classifier.train()


def _train_recommender() -> Dict:
    from models import problem_recommender

    return problem_recommender.train()


def build_rag() -> Dict:
    """Rebuild the knowledge chunks from the problem bank and (re)index them."""
    problems = load_problems()  # fail fast (with a setup hint) before loading the encoder
    if embeddings.get_encoder() is None:
        raise rag_pipeline.RagUnavailable(
            "sentence encoder unavailable (the first run needs internet access to download "
            f"{config.embedding_model_name()})"
        )
    chunks = knowledge_builder.build_knowledge_chunks(problems)
    knowledge_builder.save_chunks(chunks)
    return {"chunks_indexed": rag_pipeline.build_index(chunks, problem_fingerprint=fingerprint(problems))}


_RUNNERS: Dict[str, Callable[[], Dict]] = {
    "placement": _train_placement,
    "difficulty": _train_difficulty,
    "recommender": _train_recommender,
    "rag": build_rag,
}


def artifact_status() -> Dict[str, bool]:
    """
    True when an artifact exists, loads, matches the installed library versions and
    (for the recommender / RAG index) was built from the current problem bank.
    """
    try:
        bank = fingerprint(load_problems())
    except ProblemBankError:
        bank = None  # cannot compare; the training step itself reports the problem
    bank_expect = {"problem_fingerprint": bank} if bank else None

    models = config.models_dir()
    return {
        "placement": bundle_is_current(models / PLACEMENT_FILE),
        "difficulty": bundle_is_current(models / DIFFICULTY_FILE),
        "recommender": bundle_is_current(models / RECOMMENDER_FILE, expect=bank_expect),
        "rag": rag_pipeline.index_is_current(problem_fingerprint=bank),
    }


def run_training(only_missing: bool = False, steps: Optional[Iterable[str]] = None) -> Dict[str, Dict]:
    """
    Run the requested steps and return {step: {"ok", "skipped", "seconds", "error"?, "details"?}}.
    Error strings are safe to return to API callers (no exception text).
    """
    selected: List[str] = [s for s in (steps or STEPS) if s in _RUNNERS]
    status = artifact_status() if only_missing else {}
    results: Dict[str, Dict] = {}

    for step in selected:
        if only_missing and status.get(step):
            logger.info("[%s] up to date, skipping", step)
            results[step] = {"ok": True, "skipped": True, "seconds": 0.0}
            continue
        logger.info("[%s] training ...", step)
        start = time.perf_counter()
        try:
            details = _RUNNERS[step]() or {}
            results[step] = {"ok": True, "skipped": False,
                             "seconds": round(time.perf_counter() - start, 1), "details": details}
            logger.info("[%s] done in %.1fs", step, results[step]["seconds"])
        except ProblemBankError as exc:
            logger.error("[%s] FAILED: %s", step, exc)
            results[step] = {"ok": False, "skipped": False,
                             "seconds": round(time.perf_counter() - start, 1),
                             "error": "problem bank unavailable - run `npm run setup` first"}
        except rag_pipeline.RagUnavailable as exc:
            logger.error("[%s] FAILED: %s", step, exc)
            results[step] = {"ok": False, "skipped": False,
                             "seconds": round(time.perf_counter() - start, 1),
                             "error": "sentence encoder unavailable - see ML service logs"}
        except Exception:
            logger.exception("[%s] FAILED", step)
            results[step] = {"ok": False, "skipped": False,
                             "seconds": round(time.perf_counter() - start, 1),
                             "error": "training failed - see ML service logs"}
    return results


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Train Placify ML models")
    parser.add_argument("--only-missing", action="store_true",
                        help="only train artifacts that are missing or stale")
    parser.add_argument("--steps", default=",".join(STEPS),
                        help=f"comma-separated subset of: {', '.join(STEPS)}")
    args = parser.parse_args(argv)

    config.setup_logging()
    steps = [s.strip() for s in args.steps.split(",") if s.strip()]
    unknown = [s for s in steps if s not in STEPS]
    if unknown:
        parser.error(f"unknown steps: {unknown}")

    logger.info("Placify ML training (models -> %s, data -> %s)",
                config.models_dir(), config.generated_data_dir())
    results = run_training(only_missing=args.only_missing, steps=steps)

    logger.info("Training summary:")
    for step, result in results.items():
        state = "SKIP (up to date)" if result.get("skipped") else ("OK" if result["ok"] else "FAIL")
        suffix = f" - {result['error']}" if result.get("error") else ""
        logger.info("  %-12s %s%s", step, state, suffix)

    failed = [s for s, r in results.items() if not r["ok"]]
    if failed:
        logger.error("Some steps failed: %s", ", ".join(failed))
        return 1
    logger.info("All requested models are ready.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
