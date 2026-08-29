import sys
import os
from fastapi import APIRouter, Depends, HTTPException, Security
from fastapi.security.api_key import APIKeyHeader

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from training.train_readiness import train_readiness_v1
from app.ml.readiness import readiness_predictor

router = APIRouter()

API_KEY_NAME = "X-Admin-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

def get_admin_api_key(api_key_header: str = Security(api_key_header)):
    expected_api_key = os.getenv("ADMIN_API_KEY", "placify_admin_secret_key")
    if os.getenv("ENV") == "production" and api_key_header != expected_api_key:
        raise HTTPException(status_code=403, detail="Could not validate admin credentials")
    return api_key_header

@router.post("/reload-model")
def reload_model(api_key: str = Depends(get_admin_api_key)):
    success = readiness_predictor.reload_model()
    return {
        "status": "success" if success else "failed",
        "message": "Readiness ML model hot-reloaded successfully" if success else "Failed to load model file",
        "metrics": readiness_predictor.metrics
    }

@router.post("/train/readiness")
def trigger_train_readiness(api_key: str = Depends(get_admin_api_key)):
    try:
        metrics, model = train_readiness_v1()
        readiness_predictor.reload_model()
        return {
            "status": "success",
            "message": "Readiness v1 model trained and hot-reloaded into memory!",
            "metrics": metrics
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/model-status")
def get_model_status(api_key: str = Depends(get_admin_api_key)):
    model_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "training", "models")
    readiness_exists = os.path.exists(os.path.join(model_dir, "readiness_rf_v1.pkl"))
    return {
        "readiness_model_loaded": readiness_predictor.model is not None,
        "readiness_model_file_exists": readiness_exists,
        "metrics": readiness_predictor.metrics,
        "model_dir": model_dir
    }
