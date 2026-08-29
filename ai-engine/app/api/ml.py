from fastapi import APIRouter
from pydantic import BaseModel
from app.ml.recommender import recommender
from app.ml.readiness import readiness_predictor

router = APIRouter()

class RecommendationRequest(BaseModel):
    level: int
    accuracy: int
    time_spent: int

@router.post("/next-topic")
def predict_next_topic(req: RecommendationRequest):
    topic = recommender.predict_next_topic(req.level, req.accuracy, req.time_spent)
    return {"recommended_topic": topic}

class ReadinessRequest(BaseModel):
    coding_score: float
    mock_interview_score: float
    resume_score: float
    aptitude_score: float
    attendance: float
    daily_study_time: float
    projects_completed: int

@router.post("/readiness")
def predict_readiness(req: ReadinessRequest):
    result = readiness_predictor.predict_readiness(
        req.coding_score,
        req.mock_interview_score,
        req.resume_score,
        req.aptitude_score,
        req.attendance,
        req.daily_study_time,
        req.projects_completed
    )
    return result
