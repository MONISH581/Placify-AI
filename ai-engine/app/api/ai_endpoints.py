from fastapi import APIRouter, HTTPException, Depends, Security
from fastapi.security.api_key import APIKeyHeader
from app.models.schemas import StudentProfileDTO, LearningEventDTO
from app.ml.readiness import readiness_predictor
from app.ml.recommender import recommender
from app.services import gemini_service
from app.rag.chroma_store import rag_store
import os
import numpy as np
from training.features import extract_readiness_features

router = APIRouter()

# Simple internal API Key auth for Node server -> FastAPI communication
API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

def get_api_key(api_key_header: str = Security(api_key_header)):
    expected_api_key = os.getenv("INTERNAL_API_KEY", "placify_internal_secret")
    # For dev mode, if not provided, we just warn. In prod, enforce.
    if api_key_header != expected_api_key and os.getenv("ENV") == "production":
        raise HTTPException(status_code=403, detail="Could not validate credentials")
    return api_key_header

@router.post("/readiness")
def get_readiness(profile: StudentProfileDTO, api_key: str = Depends(get_api_key)):
    # Convert DTO to dict
    prof_dict = profile.model_dump()
    # Mock recent events for now (in reality, fetch from Node API or DB)
    recent_events = [] 
    features = extract_readiness_features(prof_dict, recent_events)
    return readiness_predictor.predict_readiness(features)

@router.post("/recommend")
def get_recommendations(profile: StudentProfileDTO, api_key: str = Depends(get_api_key)):
    prof_dict = profile.model_dump()
    return recommender.recommend_next_actions(prof_dict)

@router.post("/mentor")
def ask_mentor(data: dict, api_key: str = Depends(get_api_key)):
    prompt = data.get("prompt", "")
    profile = data.get("profile", {})
    topic = data.get("topic", "general")
    
    # RAG Retrieval
    context_docs = rag_store.semantic_search(prompt, topic=topic)
    context_str = "\n".join([doc["content"] for doc in context_docs])
    
    response = gemini_service.generate_mentor_response(prompt, context_str, profile)
    return {"response": response}

@router.post("/interview")
def mock_interview(data: dict, api_key: str = Depends(get_api_key)):
    action = data.get("action")
    if action == "generate_question":
        topic = data.get("topic", "Data Structures")
        difficulty = data.get("difficulty", "Medium")
        past_qs = data.get("past_questions", [])
        q = gemini_service.generate_mock_interview_question(topic, difficulty, past_qs)
        return {"question": q}
    elif action == "evaluate_answer":
        question = data.get("question", "")
        answer = data.get("answer", "")
        eval_res = gemini_service.evaluate_interview_answer(question, answer)
        return eval_res
    raise HTTPException(status_code=400, detail="Invalid action")

@router.post("/code-analysis")
def analyze_code(data: dict, api_key: str = Depends(get_api_key)):
    code = data.get("code", "")
    lang = data.get("language", "javascript")
    desc = data.get("problem_description", "")
    res = gemini_service.analyze_code(code, lang, desc)
    return {"analysis": res}

@router.post("/resume-analysis")
def analyze_resume(data: dict, api_key: str = Depends(get_api_key)):
    resume_text = data.get("resume_text", "")
    role = data.get("target_role", "Software Engineer")
    res = gemini_service.analyze_resume(resume_text, role)
    return res

@router.post("/roadmap")
def generate_roadmap(profile: StudentProfileDTO, api_key: str = Depends(get_api_key)):
    res = gemini_service.generate_career_roadmap(profile.model_dump())
    return {"roadmap": res}
