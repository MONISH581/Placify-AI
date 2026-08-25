from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.rag.chroma_store import rag_store
from app.services.gemini_service import generate_mentor_response
from typing import Dict, Any

router = APIRouter()

class AskMentorRequest(BaseModel):
    prompt: str
    student_id: str
    chat_history: list = []

# Mock memory cache for student profiles
MOCK_STUDENT_MEMORY = {
    "std-1": {
        "targetCompany": "Google",
        "weakSubjects": "Dynamic Programming",
        "level": 4
    }
}

@router.post("/ask")
async def ask_mentor(req: AskMentorRequest):
    # 1. Retrieve Student Memory
    memory = MOCK_STUDENT_MEMORY.get(req.student_id, {})
    
    # 2. Retrieve Context from ChromaDB
    context_docs = rag_store.search_all(req.prompt, n_results=1)
    context_str = "\n".join(context_docs)

    # 3. Generate Gemini Response
    try:
        response_text = generate_mentor_response(req.prompt, context_str, memory)
        return {"text": response_text, "context_used": context_docs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
