import os
import pickle
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import json
from datetime import datetime, timezone

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODEL_DIR, exist_ok=True)
MODEL_PATH = os.path.join(MODEL_DIR, "recommender_rf_v1.pkl")
METRICS_PATH = os.path.join(MODEL_DIR, "recommender_metrics.json")

def generate_synthetic_data(num_samples=1000):
    """
    Generates synthetic training data since we don't have enough real student data yet.
    For the baseline recommender, we might want to predict the topic category to recommend next.
    Features: [coding_score, interview_score, problems_solved]
    """
    np.random.seed(42)
    
    coding_score = np.random.uniform(0, 100, num_samples)
    interview_score = np.random.uniform(0, 100, num_samples)
    problems_solved = np.random.uniform(0, 500, num_samples)
    
    X = np.column_stack([coding_score, interview_score, problems_solved])
    
    # Let's say target classes are 0 to 4 (representing 5 broad categories of topics)
    y = np.random.randint(0, 5, num_samples)
    
    return X, y

def train_recommender_model():
    print("Generating synthetic data for Recommender Model...")
    X, y = generate_synthetic_data(2000)
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training RandomForestClassifier...")
    model = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
    model.fit(X_train, y_train)
    
    print("Evaluating model...")
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    metrics = {
        "accuracy": round(accuracy, 4),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    print(f"Metrics: {metrics}")
    
    print(f"Saving model to {MODEL_PATH}...")
    with open(MODEL_PATH, 'wb') as f:
        pickle.dump(model, f)
        
    with open(METRICS_PATH, 'w') as f:
        json.dump(metrics, f, indent=2)
        
    print("Training complete.")

if __name__ == "__main__":
    train_recommender_model()
