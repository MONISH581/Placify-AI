"""
difficulty_classifier.py
Trains a TF-IDF + LogisticRegression model to classify problem difficulty (Easy/Medium/Hard)
from the problem's title, tags, description, and constraints.
"""

import os
import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, accuracy_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "saved_models")
os.makedirs(MODELS_DIR, exist_ok=True)

LABEL_MAP = {"Easy": 0, "Medium": 1, "Hard": 2}
REVERSE_MAP = {0: "Easy", 1: "Medium", 2: "Hard"}


def train():
    csv_path = os.path.join(DATA_DIR, "difficulty_training.csv")
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Training data not found: {csv_path}\nRun generate_training_data.py first.")

    df = pd.read_csv(csv_path)
    df = df.dropna(subset=["text", "difficulty"])
    df = df[df["difficulty"].isin(["Easy", "Medium", "Hard"])]
    print(f"[Difficulty] Loaded {len(df)} samples")
    print(f"[Difficulty] Distribution:\n{df['difficulty'].value_counts()}")

    X = df["text"]
    y = df["difficulty"].map(LABEL_MAP)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    # TF-IDF + Logistic Regression
    lr_pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(
            max_features=8000,
            ngram_range=(1, 3),
            sublinear_tf=True,
            min_df=1,
            analyzer="word",
            token_pattern=r"(?u)\b\w+\b"
        )),
        ("clf", LogisticRegression(
            max_iter=1000,
            C=2.0,
            class_weight="balanced",
            solver="lbfgs",
            random_state=42
        ))
    ])

    lr_pipeline.fit(X_train, y_train)
    y_pred = lr_pipeline.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"[Difficulty] LogisticRegression Test Accuracy: {acc:.4f}")
    print(classification_report(y_test, y_pred, target_names=["Easy", "Medium", "Hard"]))

    # Cross-validation
    cv = cross_val_score(lr_pipeline, X, y, cv=5, scoring="accuracy")
    print(f"[Difficulty] 5-Fold CV Accuracy: {cv.mean():.4f} ± {cv.std():.4f}")

    # LinearSVC alternative
    svc_pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(
            max_features=8000,
            ngram_range=(1, 3),
            sublinear_tf=True,
            min_df=1
        )),
        ("clf", LinearSVC(C=1.0, class_weight="balanced", max_iter=2000, random_state=42))
    ])
    svc_pipeline.fit(X_train, y_train)
    svc_acc = accuracy_score(y_test, svc_pipeline.predict(X_test))
    print(f"[Difficulty] LinearSVC Test Accuracy: {svc_acc:.4f}")

    best = lr_pipeline if acc >= svc_acc else svc_pipeline
    model_path = os.path.join(MODELS_DIR, "difficulty_model.pkl")
    joblib.dump({"model": best, "label_map": LABEL_MAP, "reverse_map": REVERSE_MAP}, model_path)
    print(f"[Difficulty] Model saved → {model_path}")
    return best


def predict(model_data: dict, text: str) -> dict:
    """
    Predict difficulty of a problem from its text description.
    Returns: {"difficulty": "Easy"/"Medium"/"Hard", "confidence": float, "probabilities": {...}}
    """
    model = model_data["model"]
    reverse_map = model_data["reverse_map"]

    pred_label = int(model.predict([text])[0])
    difficulty = reverse_map[pred_label]

    # Get probabilities if available (LogisticRegression)
    probs = {}
    if hasattr(model, "predict_proba"):
        p = model.predict_proba([text])[0]
        probs = {reverse_map[i]: round(float(v), 4) for i, v in enumerate(p)}
        confidence = round(float(max(p)), 4)
    else:
        # LinearSVC - use decision function
        df_val = model.decision_function([text])[0]
        confidence = round(float(max(df_val)), 4)
        probs = {reverse_map[i]: round(float(v), 4) for i, v in enumerate(df_val)}

    return {
        "difficulty": difficulty,
        "confidence": confidence,
        "probabilities": probs,
        "model": "TF-IDF + LogisticRegression"
    }


if __name__ == "__main__":
    train()
