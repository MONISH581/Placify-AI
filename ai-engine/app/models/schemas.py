from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class StudentProfileDTO(BaseModel):
    user_id: str
    overall_readiness: float = 0.0
    coding_score: float = 0.0
    dsa_score: float = 0.0
    cs_fundamentals: float = 0.0
    interview_score: float = 0.0
    resume_score: float = 0.0
    problems_attempted: int = 0
    problems_solved: int = 0
    hints_used: int = 0
    average_time_secs: float = 0.0
    strong_topics: List[str] = Field(default_factory=list)
    weak_topics: List[str] = Field(default_factory=list)
    target_companies: List[str] = Field(default_factory=list)
    target_role: str = ""

class LearningEventDTO(BaseModel):
    user_id: str
    event_type: str
    entity_id: str
    topic: Optional[str] = None
    difficulty: Optional[str] = None
    result: Optional[str] = None
    score: Optional[float] = None
    time_taken: Optional[int] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    timestamp: Optional[str] = None

class FeedbackDTO(BaseModel):
    user_id: str
    recommendation_id: str
    action: str  # "completed", "skipped", "failed"
    reward: Optional[float] = None
    timestamp: Optional[str] = None
