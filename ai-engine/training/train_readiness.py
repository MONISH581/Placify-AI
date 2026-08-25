import os
import pickle
import json
# pyrefly: ignore [missing-import]
import numpy as np
import pandas as pd
from datetime import datetime, timezone
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

try:
    from training.features import FEATURE_NAMES
    from training.generate_demo_dataset import generate_correlated_demo_dataset, DATASET_PATH
except ImportError:
    from features import FEATURE_NAMES
    from generate_demo_dataset import generate_correlated_demo_dataset, DATASET_PATH

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODEL_DIR, exist_ok=True)
MODEL_PATH = os.path.join(MODEL_DIR, "readiness_rf_v1.pkl")
METRICS_PATH = os.path.join(MODEL_DIR, "readiness_v1_metrics.json")

def train_readiness_v1():
    print("--- Training Placify Readiness Model v1 ---")
    if not os.path.exists(DATASET_PATH):
        print("Demo dataset not found. Generating demo dataset...")
        df = generate_correlated_demo_dataset()
    else:
        df = pd.read_csv(DATASET_PATH)
        print(f"Loaded existing dataset from {DATASET_PATH} ({len(df)} records)")

    X = df[FEATURE_NAMES].values
    y = df["target_readiness"].values

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    print(f"Training RandomForestRegressor on {len(X_train)} samples with {X.shape[1]} features...")
    model = RandomForestRegressor(n_estimators=120, max_depth=12, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
    r2 = r2_score(y_test, y_pred)

    metrics = {
        "model_name": "readiness_rf_v1",
        "version": "v1",
        "status": "ACTIVE",
        "dataset_type": "DEMO_SYNTHETIC",
        "dataset_size": int(len(df)),
        "num_features": int(X.shape[1]),
        "mae": float(round(mae, 4)),
        "rmse": float(round(rmse, 4)),
        "r2": float(round(r2, 4)),
        "model_path": MODEL_PATH,
        "training_timestamp": datetime.now(timezone.utc).isoformat(),
    }

    print("Model Evaluation Metrics:")
    print(f"  MAE:  {metrics['mae']}")
    print(f"  RMSE: {metrics['rmse']}")
    print(f"  R²:   {metrics['r2']}")

    print(f"Saving model artifact to: {MODEL_PATH}")
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(model, f)

    print(f"Saving evaluation metrics to: {METRICS_PATH}")
    with open(METRICS_PATH, "w") as f:
        json.dump(metrics, f, indent=2)

    print("--- Model v1 Training Successfully Completed ---")
    return metrics, model

if __name__ == "__main__":
    train_readiness_v1()
