"""
interview_scorer.py
Scores mock-interview answers (0-100, deterministic):
  - up to 70 points: best cosine similarity between the answer and curated reference
    answers, using the shared sentence encoder (core/embeddings.py);
  - up to 30 points: keyword coverage + answer length heuristic.

No training step is needed. If the sentence encoder cannot be loaded the scorer
raises ScorerUnavailable (the API answers 503) instead of returning a fake score.
"""

import logging
import re
import threading
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

from core import embeddings

logger = logging.getLogger("placify.interview")

INTERVIEW_TYPES = ("Technical", "HR", "Behavioral")
MIN_ANSWER_WORDS = 3
SEMANTIC_POINTS = 70.0
KEYWORD_POINTS = 30.0


class ScorerUnavailable(RuntimeError):
    """The sentence encoder is not available."""


# -----------------------------------------------------------------------------
# Reference answer bank: curated ideal answers for common question types
# -----------------------------------------------------------------------------
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

BEHAVIORAL_DEFAULT = [
    "A strong behavioral answer follows the STAR format: it describes the situation and task, the specific actions the candidate personally took, and a measurable result, then reflects on what was learned.",
    "Good responses are honest and specific, give a concrete example from a real project or team, show ownership and communication, and end with the outcome and the lesson learned.",
]

TECH_KEYWORDS = {
    "sql", "nosql", "database", "index", "join", "transaction", "acid",
    "algorithm", "complexity", "dynamic", "recursion", "graph", "tree",
    "thread", "process", "memory", "cache", "api", "rest", "http",
    "design", "scale", "distributed", "microservice", "load", "queue",
    "sort", "search", "hash", "pointer", "stack", "heap",
    "oop", "class", "inheritance", "polymorphism", "interface",
    "communication", "teamwork", "conflict", "project", "deadline", "learn",
    "challenge", "goal", "achievement", "experience", "feedback", "result",
}

_ref_cache: Dict[Tuple[int, str], np.ndarray] = {}
_ref_lock = threading.Lock()


def normalize_interview_type(value: Optional[str]) -> str:
    text = (value or "").strip().lower()
    for kind in INTERVIEW_TYPES:
        if kind.lower() == text:
            return kind
    return "Technical"


def _match_reference_bank(question: str, interview_type: str) -> Tuple[str, List[str]]:
    q_lower = question.lower()
    for key, refs in REFERENCE_ANSWERS.items():
        if key == "default":
            continue
        key_words = key.split()
        if sum(1 for w in key_words if w in q_lower) >= max(1, len(key_words) // 2):
            return key, refs
    if interview_type in ("HR", "Behavioral"):
        return "behavioral-default", BEHAVIORAL_DEFAULT
    return "default", REFERENCE_ANSWERS["default"]


def _keyword_score(answer: str) -> float:
    """Keyword coverage + length, both clamped, so the result is always in [0, 1]."""
    words = re.findall(r"[a-z0-9+#]+", answer.lower())
    unique = set(words)
    density = min(1.0, 10.0 * len(unique & TECH_KEYWORDS) / max(1, len(unique)))
    length = min(1.0, len(words) / 80.0)
    return 0.5 * density + 0.5 * length


def _unit(vectors: Any) -> np.ndarray:
    arr = np.asarray(vectors, dtype=np.float32)
    if arr.ndim == 1:
        arr = arr.reshape(1, -1)
    norms = np.linalg.norm(arr, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return arr / norms


def _reference_embeddings(encoder: Any, key: str, refs: List[str]) -> np.ndarray:
    cache_key = (id(encoder), key)
    with _ref_lock:
        cached = _ref_cache.get(cache_key)
    if cached is None:
        cached = _unit(encoder.encode(refs, convert_to_numpy=True, show_progress_bar=False))
        with _ref_lock:
            _ref_cache[cache_key] = cached
    return cached


def _feedback(total: int) -> str:
    if total >= 80:
        return "Excellent response! Strong depth, well-structured, and uses relevant terminology."
    if total >= 60:
        return "Good answer. Add more specific examples or technical terminology to strengthen it."
    if total >= 40:
        return ("Fair attempt. The answer covers some points but lacks depth. "
                "Try structuring it as situation, approach, result.")
    return ("The answer needs more detail and relevant terminology. Review the core concepts "
            "and practise the STAR format for behavioral questions.")


def score_answer(question: str, answer: str, interview_type: str = "Technical",
                 encoder: Any = None) -> Dict[str, Any]:
    """Returns {"score": 0-100, "feedback": str, "semantic_similarity": 0-1, "method": str}."""
    question = (question or "").strip()
    answer = (answer or "").strip()
    if not question:
        raise ValueError("question must not be empty")
    interview_type = normalize_interview_type(interview_type)

    if len(answer.split()) < MIN_ANSWER_WORDS:
        return {
            "score": 0,
            "feedback": "Answer is too short. Please provide a detailed response.",
            "semantic_similarity": 0.0,
            "method": "too-short",
        }

    encoder = encoder or embeddings.get_encoder()
    if encoder is None:
        raise ScorerUnavailable("sentence encoder unavailable")

    key, refs = _match_reference_bank(question, interview_type)
    ref_vecs = _reference_embeddings(encoder, key, refs)
    answer_vec = _unit(encoder.encode([answer], convert_to_numpy=True, show_progress_bar=False))
    similarity = float(np.max(ref_vecs @ answer_vec[0]))
    similarity = min(1.0, max(0.0, similarity))

    total = SEMANTIC_POINTS * similarity + KEYWORD_POINTS * _keyword_score(answer)
    score = int(min(100, max(0, round(total))))
    return {
        "score": score,
        "feedback": _feedback(score),
        "semantic_similarity": round(similarity, 4),
        "method": embeddings.encoder_name(),
    }
