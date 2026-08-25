import numpy as np
import pandas as pd
from typing import List, Dict, Any

FEATURE_NAMES = [
    "coding_score",
    "dsa_score",
    "cs_fundamentals",
    "interview_score",
    "resume_score",
    "problems_solved",
    "problems_attempted",
    "solve_rate",
    "avg_time",
    "hints_used",
    "quiz_average",
    "coding_streak",
    "learning_velocity",
    "topic_mastery_arrays",
    "topic_mastery_trees",
    "topic_mastery_graphs",
    "topic_mastery_dp",
    "topic_mastery_os"
]

def extract_readiness_features(student_profile: Dict[str, Any], recent_events: List[Dict[str, Any]] = None) -> np.ndarray:
    """
    Extracts standardized features for the readiness ML model from a student profile and their learning events.
    Returns 1D numpy array of 18 feature values.
    """
    recent_events = recent_events or []
    
    coding_score = float(student_profile.get("coding_score", 50.0))
    dsa_score = float(student_profile.get("dsa_score", 50.0))
    cs_fundamentals = float(student_profile.get("cs_fundamentals", 50.0))
    interview_score = float(student_profile.get("interview_score", 50.0))
    resume_score = float(student_profile.get("resume_score", 50.0))
    
    problems_solved = float(student_profile.get("problems_solved", 0))
    problems_attempted = float(student_profile.get("problems_attempted", max(problems_solved, 1)))
    solve_rate = float(problems_solved / max(problems_attempted, 1.0))
    
    avg_time = float(student_profile.get("average_time_secs", 1200.0))
    hints_used = float(student_profile.get("hints_used", 0))
    quiz_average = float(student_profile.get("quiz_average", 60.0))
    coding_streak = float(student_profile.get("streak", student_profile.get("coding_streak", 1)))
    
    # Calculate learning velocity from recent events (e.g. event count)
    learning_velocity = float(len(recent_events)) if recent_events else float(student_profile.get("learning_velocity", 5.0))
    
    topic_mastery = student_profile.get("topic_mastery", {})
    if isinstance(topic_mastery, str):
        import json
        try:
            topic_mastery = json.loads(topic_mastery)
        except Exception:
            topic_mastery = {}
            
    tm_arrays = float(topic_mastery.get("Arrays", topic_mastery.get("arrays", 70.0)))
    tm_trees = float(topic_mastery.get("Trees", topic_mastery.get("trees", 40.0)))
    tm_graphs = float(topic_mastery.get("Graphs", topic_mastery.get("graphs", 35.0)))
    tm_dp = float(topic_mastery.get("DP", topic_mastery.get("Dynamic Programming", 30.0)))
    tm_os = float(topic_mastery.get("OS", topic_mastery.get("Operating Systems", 45.0)))
    
    features = [
        coding_score,
        dsa_score,
        cs_fundamentals,
        interview_score,
        resume_score,
        problems_solved,
        problems_attempted,
        solve_rate,
        avg_time,
        hints_used,
        quiz_average,
        coding_streak,
        learning_velocity,
        tm_arrays,
        tm_trees,
        tm_graphs,
        tm_dp,
        tm_os
    ]
    
    return np.array(features, dtype=np.float32)

def normalize_features(X: np.ndarray, scaler=None) -> np.ndarray:
    """Normalizes feature vectors."""
    if scaler:
        return scaler.transform(X)
    min_vals = np.min(X, axis=0)
    max_vals = np.max(X, axis=0)
    diff = max_vals - min_vals
    diff[diff == 0] = 1e-9
    return (X - min_vals) / diff
