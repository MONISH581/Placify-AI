"""
train_all.py
Master training script -- runs all ML model training in sequence.
Run this ONCE after installing requirements to build all saved models.
"""

import os
import sys
import time

# Force UTF-8 output on Windows to avoid cp1252 encode errors
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

BANNER = """
============================================================
   Placify AI -- ML Model Training Pipeline
   Training: Placement Scorer, Difficulty Classifier,
             Problem Recommender, Interview Scorer, RAG
============================================================
"""


def run_step(name: str, fn):
    print(f"\n{'='*60}")
    print(f"  STEP: {name}")
    print(f"{'='*60}")
    start = time.time()
    try:
        result = fn()
        elapsed = time.time() - start
        print(f"  ✅ {name} completed in {elapsed:.1f}s")
        return True
    except Exception as e:
        print(f"  ❌ {name} FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    print(BANNER)

    results = {}

    # ── Step 1: Generate training data ────────────────────────────────────────
    def step_generate_data():
        from data.generate_training_data import load_db, generate_placement_data
        from data.generate_training_data import generate_difficulty_data, generate_recommendation_data
        from data.generate_training_data import save_problem_metadata

        db = load_db()
        generate_placement_data(db)
        generate_difficulty_data(db)
        generate_recommendation_data(db)
        save_problem_metadata(db)

    results["data_generation"] = run_step("Training Data Generation", step_generate_data)

    # ── Step 2: Train Placement Scorer ────────────────────────────────────────
    def step_placement():
        from models.placement_scorer import train
        train()

    results["placement_scorer"] = run_step("Placement Readiness Model (RandomForest)", step_placement)

    # ── Step 3: Train Difficulty Classifier ───────────────────────────────────
    def step_difficulty():
        from models.difficulty_classifier import train
        train()

    results["difficulty_classifier"] = run_step("Difficulty Classifier (TF-IDF + LogReg)", step_difficulty)

    # ── Step 4: Train Problem Recommender ─────────────────────────────────────
    def step_recommender():
        from models.problem_recommender import train
        train()

    results["problem_recommender"] = run_step("Problem Recommender (Content-Based)", step_recommender)

    # ── Step 5: Build RAG Knowledge Base ──────────────────────────────────────
    def step_rag_knowledge():
        from rag.knowledge_builder import build_knowledge_chunks, save_chunks
        chunks = build_knowledge_chunks()
        save_chunks(chunks)
        print(f"  Knowledge base: {len(chunks)} chunks saved.")

    results["rag_knowledge"] = run_step("RAG Knowledge Base Builder", step_rag_knowledge)

    # ── Step 6: Build FAISS Index ─────────────────────────────────────────────
    def step_faiss():
        from rag.rag_pipeline import build_index
        success = build_index()
        if not success:
            raise RuntimeError("FAISS index build failed")

    results["faiss_index"] = run_step("FAISS Vector Index (sentence-transformers)", step_faiss)

    # ── Step 7: Test Interview Scorer (no training needed) ────────────────────
    def step_interview():
        from models.interview_scorer import score_answer
        result = score_answer(
            "What is dynamic programming?",
            "Dynamic programming breaks problems into subproblems and stores solutions for reuse. It uses memoization or tabulation."
        )
        print(f"  Test score: {result['score']}/100, method: {result['method']}")

    results["interview_scorer"] = run_step("Interview Scorer (sentence-transformers test)", step_interview)

    # ── Summary ────────────────────────────────────────────────────────────────
    print(f"\n{'='*60}")
    print("  TRAINING SUMMARY")
    print(f"{'='*60}")
    all_passed = True
    for step, ok in results.items():
        status = "✅ PASS" if ok else "❌ FAIL"
        print(f"  {status}  {step}")
        if not ok:
            all_passed = False

    print(f"\n{'='*60}")
    if all_passed:
        print("  🎉 ALL MODELS TRAINED SUCCESSFULLY!")
        print("  Run 'python main.py' to start the ML API server on port 8000.")
    else:
        print("  ⚠️  Some models failed. Check errors above.")
    print(f"{'='*60}\n")

    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
