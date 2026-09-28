"""
difficulty_classifier.py
Trains a TF-IDF + classifier model to classify problem difficulty (Easy/Medium/Hard)
from the problem's title, tags, description, and constraints.

Key design notes:
  - Training set is synthetic only (~300 samples, ~100 per class).
  - max_features=1500 prevents overfitting (8000 features on 240 training samples
    causes the model to memorise tokens rather than generalise).
  - Three pipelines are compared (LogReg, SVC, NaiveBayes) and the best by 5-fold CV
    is saved, making model selection robust on this small dataset.
"""

import os
import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC
from sklearn.naive_bayes import MultinomialNB
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
from sklearn.pipeline import Pipeline

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

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # ── Pipeline 1: TF-IDF + Logistic Regression ────────────────────────────
    # max_features=1500 prevents overfitting on ~300-sample dataset.
    # With 8000 features and 240 training samples the model memorises training
    # tokens and generalises poorly. 1500 retains the most informative terms.
    lr_pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(
            max_features=1500,
            ngram_range=(1, 3),
            sublinear_tf=True,
            min_df=1,
            analyzer="word",
            token_pattern=r"(?u)\b\w+\b"
        )),
        ("clf", LogisticRegression(
            max_iter=2000,
            C=1.0,
            class_weight="balanced",
            solver="lbfgs",
            random_state=42
        ))
    ])

    lr_pipeline.fit(X_train, y_train)
    y_pred_lr = lr_pipeline.predict(X_test)
    acc_lr = accuracy_score(y_test, y_pred_lr)
    cv_lr = cross_val_score(lr_pipeline, X, y, cv=5, scoring="accuracy")
    print(f"[Difficulty] LogisticRegression Test Accuracy: {acc_lr:.4f}")
    print(f"[Difficulty] LogisticRegression 5-Fold CV: {cv_lr.mean():.4f} +/- {cv_lr.std():.4f}")
    print(classification_report(y_test, y_pred_lr, target_names=["Easy", "Medium", "Hard"]))

    # ── Pipeline 2: TF-IDF + LinearSVC ──────────────────────────────────────
    svc_pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(
            max_features=1500,
            ngram_range=(1, 3),
            sublinear_tf=True,
            min_df=1,
            token_pattern=r"(?u)\b\w+\b"
        )),
        ("clf", LinearSVC(C=0.5, class_weight="balanced", max_iter=3000, random_state=42))
    ])
    svc_pipeline.fit(X_train, y_train)
    acc_svc = accuracy_score(y_test, svc_pipeline.predict(X_test))
    cv_svc = cross_val_score(svc_pipeline, X, y, cv=5, scoring="accuracy")
    print(f"[Difficulty] LinearSVC Test Accuracy: {acc_svc:.4f}")
    print(f"[Difficulty] LinearSVC 5-Fold CV: {cv_svc.mean():.4f} +/- {cv_svc.std():.4f}")

    # ── Pipeline 3: TF-IDF + Multinomial Naive Bayes ────────────────────────
    # MultinomialNB is a strong baseline for small text corpora.
    # sublinear_tf=False because NB needs raw TF (not log-TF) for valid probabilities.
    # alpha=0.1 (low smoothing) works well since our vocabulary is controlled.
    nb_pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(
            max_features=1500,
            ngram_range=(1, 2),
            sublinear_tf=False,
            min_df=1,
            token_pattern=r"(?u)\b\w+\b"
        )),
        ("clf", MultinomialNB(alpha=0.1))
    ])
    nb_pipeline.fit(X_train, y_train)
    acc_nb = accuracy_score(y_test, nb_pipeline.predict(X_test))
    cv_nb = cross_val_score(nb_pipeline, X, y, cv=5, scoring="accuracy")
    print(f"[Difficulty] MultinomialNB Test Accuracy: {acc_nb:.4f}")
    print(f"[Difficulty] MultinomialNB 5-Fold CV: {cv_nb.mean():.4f} +/- {cv_nb.std():.4f}")

    # ── Select best model by CV mean ────────────────────────────────────────
    # CV mean is more reliable than a single test split on a 300-sample dataset.
    candidates = [
        ("LogisticRegression", lr_pipeline, cv_lr.mean()),
        ("LinearSVC",          svc_pipeline, cv_svc.mean()),
        ("MultinomialNB",      nb_pipeline,  cv_nb.mean()),
    ]
    best_name, best, best_cv = max(candidates, key=lambda x: x[2])
    print(f"\n[Difficulty] Selected Best Model: {best_name} (5-Fold CV = {best_cv:.4f})")
    best_pred = best.predict(X_test)
    best_acc = accuracy_score(y_test, best_pred)
    print(f"[Difficulty] Best Model Test Accuracy: {best_acc:.4f}")
    print(classification_report(y_test, best_pred, target_names=["Easy", "Medium", "Hard"]))
    cm = confusion_matrix(y_test, best_pred)
    print(f"[Difficulty] Confusion Matrix (rows: true, cols: pred):\n{cm}")

    model_path = os.path.join(MODELS_DIR, "difficulty_model.pkl")
    joblib.dump({"model": best, "label_map": LABEL_MAP, "reverse_map": REVERSE_MAP}, model_path)
    print(f"[Difficulty] Model saved to {model_path}")
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

    # Get probabilities if available (LogisticRegression, MultinomialNB)
    probs = {}
    if hasattr(model, "predict_proba"):
        p = model.predict_proba([text])[0]
        probs = {reverse_map[i]: round(float(v), 4) for i, v in enumerate(p)}
        confidence = round(float(max(p)), 4)
    else:
        # LinearSVC — use decision function as a proxy
        df_val = model.decision_function([text])[0]
        confidence = round(float(max(df_val)), 4)
        probs = {reverse_map[i]: round(float(v), 4) for i, v in enumerate(df_val)}

    return {
        "difficulty": difficulty,
        "confidence": confidence,
        "probabilities": probs,
        "model": "TF-IDF + Classifier"
    }


if __name__ == "__main__":
    train()
