import os
import pickle
import json
import numpy as np
from typing import Dict, Any, List
from training.features import extract_readiness_features, FEATURE_NAMES

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "training", "models")
MODEL_PATH = os.path.join(MODEL_DIR, "readiness_rf_v1.pkl")
METRICS_PATH = os.path.join(MODEL_DIR, "readiness_v1_metrics.json")

class ReadinessPredictor:
    def __init__(self):
        self.model = None
        self.metrics = {}
        self.reload_model()

    def reload_model(self) -> bool:
        """Hot-reloads the ML model and evaluation metrics from disk."""
        loaded = False
        if os.path.exists(MODEL_PATH):
            try:
                with open(MODEL_PATH, "rb") as f:
                    self.model = pickle.load(f)
                loaded = True
                print(f"[ReadinessPredictor] Successfully loaded model from {MODEL_PATH}")
            except Exception as e:
                print(f"[ReadinessPredictor] Error loading model: {e}")
                self.model = None

        if os.path.exists(METRICS_PATH):
            try:
                with open(METRICS_PATH, "r") as f:
                    self.metrics = json.load(f)
            except Exception as e:
                print(f"[ReadinessPredictor] Error loading metrics: {e}")
                self.metrics = {}
        return loaded

    def predict_readiness(self, features: np.ndarray, student_profile: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Predicts overall placement readiness and generates detailed skill diagnostics.
        """
        if features.ndim == 1:
            features_2d = features.reshape(1, -1)
        else:
            features_2d = features

        # Ensure correct feature count
        if features_2d.shape[1] < len(FEATURE_NAMES):
            padded = np.zeros((1, len(FEATURE_NAMES)))
            padded[0, :features_2d.shape[1]] = features_2d[0]
            features_2d = padded

        if self.model is not None:
            try:
                pred = float(self.model.predict(features_2d)[0])
                overall = np.clip(pred, 0.0, 100.0)
                is_ml_pred = True
            except Exception as e:
                print(f"[ReadinessPredictor] Model predict error: {e}")
                overall = self._baseline_heuristic(features_2d[0])
                is_ml_pred = False
        else:
            overall = self._baseline_heuristic(features_2d[0])
            is_ml_pred = False

        # Extract individual feature dimensions
        coding_score = float(features_2d[0][0])
        dsa_score = float(features_2d[0][1])
        cs_fundamentals = float(features_2d[0][2])
        interview_score = float(features_2d[0][3])
        resume_score = float(features_2d[0][4])
        tm_arrays = float(features_2d[0][13]) if features_2d.shape[1] > 13 else 70.0
        tm_trees = float(features_2d[0][14]) if features_2d.shape[1] > 14 else 40.0
        tm_graphs = float(features_2d[0][15]) if features_2d.shape[1] > 15 else 35.0
        tm_dp = float(features_2d[0][16]) if features_2d.shape[1] > 16 else 30.0
        tm_os = float(features_2d[0][17]) if features_2d.shape[1] > 17 else 45.0

        weak_topics = []
        strong_topics = []

        if tm_arrays >= 70: strong_topics.append("Arrays & Hashing")
        else: weak_topics.append("Arrays & Hashing")

        if tm_trees >= 65: strong_topics.append("Trees & Binary Search Trees")
        else: weak_topics.append("Trees & Binary Search Trees")

        if tm_graphs >= 60: strong_topics.append("Graphs & BFS/DFS")
        else: weak_topics.append("Graphs & BFS/DFS")

        if tm_dp >= 60: strong_topics.append("Dynamic Programming")
        else: weak_topics.append("Dynamic Programming")

        if tm_os >= 65: strong_topics.append("Operating Systems & Threading")
        else: weak_topics.append("Operating Systems & Threading")

        if interview_score >= 70: strong_topics.append("Behavioral & Tech Interview")
        else: weak_topics.append("Behavioral & Tech Interview")

        if overall < 40: level = "Novice Candidate"
        elif overall < 65: level = "Intermediate SDE Candidate"
        elif overall < 85: level = "Competitive SDE Candidate"
        else: level = "Elite Tier-1 Ready"

        return {
            "overall_readiness": float(round(overall, 1)),
            "coding_readiness": float(round(coding_score, 1)),
            "dsa_score": float(round(dsa_score, 1)),
            "cs_fundamentals": float(round(cs_fundamentals, 1)),
            "interview_readiness": float(round(interview_score, 1)),
            "resume_readiness": float(round(resume_score, 1)),
            "confidence": 0.95 if is_ml_pred else 0.60,
            "is_ml_prediction": is_ml_pred,
            "expected_skill_level": level,
            "weak_topics": weak_topics[:3] if weak_topics else ["None"],
            "strong_topics": strong_topics[:3] if strong_topics else ["Basic Syntax"],
            "metrics": self.metrics
        }

    def _baseline_heuristic(self, f: np.ndarray) -> float:
        return float(np.clip((f[0] * 0.3) + (f[1] * 0.25) + (f[2] * 0.15) + (f[3] * 0.15) + (f[4] * 0.15), 0, 100))

readiness_predictor = ReadinessPredictor()
