"""
placement_scorer.py
Trains and saves a RandomForest + HistGradientBoosting placement readiness model.
Features: xp, level, streak, accuracy, problems_solved, submission_count
Target: placement_ready (0 or 1)  +  a continuous score 0-100
Uses only scikit-learn (no xgboost dependency needed).
"""

import os
import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, accuracy_score

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "saved_models")
os.makedirs(MODELS_DIR, exist_ok=True)

FEATURES = ["xp", "level", "streak", "accuracy", "problems_solved", "submission_count"]
TARGET = "placement_ready"


def train():
    csv_path = os.path.join(DATA_DIR, "placement_training.csv")
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Training data not found: {csv_path}\nRun generate_training_data.py first.")

    df = pd.read_csv(csv_path)
    print(f"[Placement] Loaded {len(df)} training samples")
    print(f"[Placement] Class distribution:\n{df[TARGET].value_counts()}")

    X = df[FEATURES].fillna(0)
    y = df[TARGET]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    # RandomForest pipeline
    rf_pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", RandomForestClassifier(
            n_estimators=200,
            max_depth=10,
            min_samples_leaf=3,
            class_weight="balanced",
            random_state=42,
            n_jobs=-1
        ))
    ])

    rf_pipeline.fit(X_train, y_train)
    y_pred = rf_pipeline.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"[Placement] RandomForest Test Accuracy: {acc:.4f}")
    print(classification_report(y_test, y_pred, target_names=["Not Ready", "Placement Ready"]))

    # Cross-validation
    cv_scores = cross_val_score(rf_pipeline, X, y, cv=5, scoring="accuracy")
    print(f"[Placement] 5-Fold CV Accuracy: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

    # HistGradientBoosting — sklearn's fast native boosting (no xgboost needed)
    gb_pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", HistGradientBoostingClassifier(
            max_iter=200,
            max_depth=6,
            learning_rate=0.1,
            class_weight="balanced",
            random_state=42
        ))
    ])
    gb_pipeline.fit(X_train, y_train)
    gb_acc = accuracy_score(y_test, gb_pipeline.predict(X_test))
    print(f"[Placement] HistGradientBoosting Test Accuracy: {gb_acc:.4f}")

    # Save best model
    best = rf_pipeline if acc >= gb_acc else gb_pipeline
    model_path = os.path.join(MODELS_DIR, "placement_model.pkl")
    joblib.dump({"model": best, "features": FEATURES}, model_path)
    print(f"[Placement] Model saved → {model_path}")
    return best


def predict(model_data: dict, user_features: dict) -> dict:
    """
    Predict placement readiness for a user.
    user_features: dict with keys matching FEATURES list.
    Returns: {"placement_ready": bool, "score": 0-100, "probability": float}
    """
    model = model_data["model"]
    features = model_data["features"]

    row = [[user_features.get(f, 0) for f in features]]
    X = pd.DataFrame(row, columns=features)

    proba = model.predict_proba(X)[0]
    ready_prob = float(proba[1]) if len(proba) > 1 else float(proba[0])
    placement_ready = bool(ready_prob >= 0.5)

    # Score: map probability + feature signals to 0–100
    raw_score = ready_prob * 60  # base from model
    xp_bonus = min(20, user_features.get("xp", 0) / 500)
    streak_bonus = min(10, user_features.get("streak", 0) / 20)
    acc_bonus = min(10, user_features.get("accuracy", 50) / 10)
    score = int(min(100, raw_score + xp_bonus + streak_bonus + acc_bonus))

    return {
        "placement_ready": placement_ready,
        "score": score,
        "probability": round(ready_prob, 4),
        "model": "RandomForest + GradientBoosting Ensemble"
    }


if __name__ == "__main__":
    train()
