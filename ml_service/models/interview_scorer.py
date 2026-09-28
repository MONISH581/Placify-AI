"""
interview_scorer.py
Scores mock interview answers using:
1. Sentence-Transformers (all-MiniLM-L6-v2) semantic similarity vs reference answers
2. Keyword density + length heuristics as fallback / booster

Requires: pip install sentence-transformers
"""

import os
import re
import joblib
import numpy as np
from typing import Optional

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "saved_models")
os.makedirs(MODELS_DIR, exist_ok=True)

# ─────────────────────────────────────────────────────────────────────────────
# Reference Answer Bank — curated ideal answers for common question types
# ─────────────────────────────────────────────────────────────────────────────
REFERENCE_ANSWERS = {
    # Technical
    "sql nosql database": [
        "SQL databases use structured schemas with tables, ACID transactions, and are ideal for relational data. NoSQL supports flexible schemas, horizontal scaling, and works well for unstructured or high-volume data. Choose SQL for consistency-critical apps and NoSQL for scalability-focused use cases.",
        "Relational databases like MySQL use SQL with joins and foreign keys. NoSQL like MongoDB uses documents. SQL has ACID compliance while NoSQL offers eventual consistency and horizontal sharding."
    ],
    "process scheduling operating system": [
        "The OS scheduler decides which process runs next. Round-robin gives equal time slices to each process. Priority scheduling assigns CPU to highest-priority processes. Preemptive scheduling allows interruption; non-preemptive does not. Modern OS uses multilevel feedback queues.",
        "CPU scheduling algorithms include FCFS, SJF, Round Robin, and Priority Scheduling. Round Robin is fair with fixed time quanta. Priority scheduling may cause starvation, solved by aging."
    ],
    "rate limiter api design": [
        "A rate limiter can be implemented using a token bucket or sliding window counter. For 10 req/sec, use a sliding window with a Redis counter per user, decrementing and checking before each request. Return 429 Too Many Requests when the limit is exceeded.",
        "Use a fixed window counter or leaky bucket algorithm. Redis INCR with TTL provides atomic counting. Token bucket refills tokens at a fixed rate and rejects requests when empty."
    ],
    "system design": [
        "System design requires identifying requirements, estimating scale, designing the data model, choosing between SQL and NoSQL, planning APIs, considering caching layers like Redis, load balancers, CDN for static assets, and monitoring.",
        "Break down into frontend, backend, database, cache, and messaging layers. Consider scalability, availability, partition tolerance (CAP theorem), and eventual consistency."
    ],
    "dynamic programming": [
        "Dynamic programming breaks problems into overlapping subproblems and stores solutions to avoid recomputation. It uses either top-down memoization with recursion or bottom-up tabulation. Classic examples include Fibonacci, knapsack, and longest common subsequence.",
        "DP optimizes by caching repeated subproblem results. Define state, transition, and base case. Memoization uses a hash map; tabulation uses a 2D array."
    ],
    # HR / Behavioral
    "tell me about yourself": [
        "I am a computer science student with strong foundations in data structures, algorithms, and full-stack development. I have built multiple projects including web apps and ML models. I am passionate about solving real-world problems with technology and am looking to contribute to a strong engineering team.",
        "I'm a final-year engineering student specializing in software development. I've worked on projects using React, Node.js, and Python. My key achievement is building a placement preparation platform. I thrive in collaborative environments."
    ],
    "conflict group project": [
        "During a group project, a teammate and I disagreed on the system architecture. I scheduled a meeting to discuss both approaches objectively with data to support my view. We reached a consensus by combining both ideas, which improved the final design. I learned that respectful technical debate leads to better outcomes.",
        "I faced a conflict over task prioritization. I listened actively to my teammate's concerns, shared my reasoning, and we agreed on a compromise. The key was staying focused on the project goal rather than personal positions."
    ],
    "negative criticism": [
        "I received critical feedback from my professor on my code quality during a review. Initially I felt defensive, but I took time to reflect, reviewed clean code principles, and revised my submission. The experience made me more open to feedback and I now seek code reviews proactively.",
        "I got criticism for missing edge cases in my implementation. I treated it as a learning opportunity, added thorough test coverage, and improved my systematic thinking. I now approach problems by listing edge cases upfront."
    ],
    "lead team compressed deadline": [
        "I break the work into clear milestones, assign tasks based on individual strengths, set up daily standups to track blockers, and escalate risks early. I prioritize features by impact, cut scope where necessary, and keep morale high by celebrating small wins.",
        "Communication and prioritization are key. I create a task board, identify critical path items, parallelize work where possible, and maintain a risk log to address issues before they become blockers."
    ],
    "project failed": [
        "I built a web scraper that broke frequently due to website DOM changes. I underestimated the maintenance cost and overestimated reliability. Key indicators were increasing error rates and time spent on fixes vs new features. I learned to evaluate technical debt upfront and document brittle dependencies.",
        "My team's app launch failed due to poor performance under load. We hadn't load-tested properly. I learned to always include performance testing in the definition of done and plan for production-level traffic from day one."
    ],
    # Generic fallback
    "default": [
        "A strong answer demonstrates technical depth, clear communication, concrete examples, and structured thinking. It includes relevant terminology and shows practical understanding beyond theoretical knowledge.",
        "Good responses are concise, specific, and backed by real examples. They show problem-solving ability, self-awareness, and alignment with the role's requirements."
    ]
}


_st_model = None

def _get_model():
    """Lazy-load sentence-transformers model (cached singleton)."""
    global _st_model
    if _st_model is None:
        try:
            from sentence_transformers import SentenceTransformer
            _st_model = SentenceTransformer("all-MiniLM-L6-v2")
        except Exception as e:
            print(f"[InterviewScorer] sentence-transformers unavailable: {e}")
            return None
    return _st_model


def _match_reference_bank(question: str) -> list:
    """Find the best matching reference answers for the question."""
    q_lower = question.lower()
    for key, refs in REFERENCE_ANSWERS.items():
        if key == "default":
            continue
        key_words = key.split()
        if sum(1 for w in key_words if w in q_lower) >= max(1, len(key_words) // 2):
            return refs
    return REFERENCE_ANSWERS["default"]


def _keyword_score(answer: str, question: str) -> float:
    """Heuristic keyword scoring: 0.0 – 1.0"""
    tech_keywords = {
        "sql", "nosql", "database", "index", "join", "transaction", "acid",
        "algorithm", "complexity", "dynamic", "recursion", "graph", "tree",
        "thread", "process", "memory", "cache", "api", "rest", "http",
        "design", "scale", "distributed", "microservice", "load", "queue",
        "sort", "search", "hash", "pointer", "stack", "heap",
        "oop", "class", "inheritance", "polymorphism", "interface",
        "communication", "teamwork", "conflict", "project", "deadline", "learn",
        "challenge", "goal", "achievement", "experience", "feedback"
    }
    words = set(re.findall(r"\b\w+\b", answer.lower()))
    matched = words & tech_keywords
    keyword_density = len(matched) / max(1, len(words))

    # Penalize very short answers
    word_count = len(answer.split())
    length_score = min(1.0, word_count / 80)

    return 0.5 * keyword_density * 10 + 0.5 * length_score


def score_answer(question: str, answer: str) -> dict:
    """
    Score an interview answer against reference answers.
    Returns: {"score": 0-100, "feedback": str, "semantic_similarity": float}
    """
    if not answer or len(answer.strip()) < 5:
        return {
            "score": 0,
            "feedback": "Answer is too short or empty. Please provide a detailed response.",
            "semantic_similarity": 0.0,
            "method": "empty_answer"
        }

    references = _match_reference_bank(question)

    # Try semantic scoring with sentence-transformers
    try:
        model = _get_model()
        if model:
            from sklearn.metrics.pairwise import cosine_similarity
            answer_emb = model.encode([answer])
            ref_embs = model.encode(references)
            sims = cosine_similarity(answer_emb, ref_embs)[0]
            best_sim = float(np.max(sims))
            semantic_score = best_sim * 70  # max 70 points from semantics

            # Add keyword bonus
            kw_bonus = _keyword_score(answer, question) * 30  # max 30 points
            total = int(min(100, semantic_score + kw_bonus))

            # Feedback
            if total >= 80:
                feedback = "Excellent response! Strong technical depth, well-structured, and relevant terminology used."
            elif total >= 60:
                feedback = "Good answer. Consider adding more specific examples or technical terminology to strengthen it."
            elif total >= 40:
                feedback = "Fair attempt. The answer covers some points but lacks depth. Try to structure with: situation, approach, result."
            else:
                feedback = "The answer needs more detail and relevant terminology. Study the core concepts and practice STAR format for behavioral questions."

            return {
                "score": total,
                "feedback": feedback,
                "semantic_similarity": round(best_sim, 4),
                "method": "sentence-transformers/all-MiniLM-L6-v2"
            }
    except Exception as e:
        print(f"[InterviewScorer] Semantic scoring error: {e}, falling back to keyword scoring")

    # Fallback: pure keyword + length heuristic
    kw = _keyword_score(answer, question)
    fallback_score = int(min(100, 50 + kw * 50))
    return {
        "score": fallback_score,
        "feedback": "Scored using keyword analysis. Add more specific technical terminology and concrete examples for a better score.",
        "semantic_similarity": 0.0,
        "method": "keyword-heuristic"
    }


if __name__ == "__main__":
    # Quick test
    q = "Explain the key differences between SQL and NoSQL databases."
    a = "SQL uses tables and schemas and is good for structured data. NoSQL is flexible and scales horizontally."
    result = score_answer(q, a)
    print(f"Score: {result['score']}/100")
    print(f"Method: {result['method']}")
    print(f"Feedback: {result['feedback']}")
