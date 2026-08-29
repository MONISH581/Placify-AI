from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import google.generativeai as genai
import os
import json

router = APIRouter()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

model = genai.GenerativeModel('gemini-3.6-flash')

class RoadmapRequest(BaseModel):
    currentYear: str
    skills: str
    targetCompany: str
    targetRole: str
    dailyStudyHours: float = 2.0
    codingScore: float = 50.0
    interviewScore: float = 50.0

@router.post("/generate")
async def generate_roadmap(req: RoadmapRequest):
    if not GEMINI_API_KEY:
        return {
            "dailyPlan": ["Morning: Practice 1 Arrays problem", "Afternoon: Study OS Concurrency Notes", "Evening: Mock MCQs on Placify"],
            "weeklyPlan": [f"Week 1: Arrays & Hashing for {req.targetCompany}", "Week 2: Linked Lists & Two Pointers", "Week 3: Stack & DBMS Normalization", "Week 4: Mock Intership Test Prep"],
            "monthlyPlan": [f"Month 1: DSA Core foundation for {req.targetRole}", "Month 2: Core Engineering Subjects & DBMS", "Month 3: Full Project and Resume Analyzer Scan"],
            "generatedAt": "Demo mode"
        }

    try:
        prompt = f"""
        Generate a personalized placement preparation roadmap.
        
        Parameters:
        - Study Year: {req.currentYear}
        - Current Tech Skills: {req.skills}
        - Target Company: {req.targetCompany}
        - Target Role: {req.targetRole}
        - Daily Study Budget: {req.dailyStudyHours} hours
        - Coding Performance Score: {req.codingScore}/100
        - Mock Interview Score: {req.interviewScore}/100
        
        Provide your response in JSON format matching this schema:
        {{
          "dailyPlan": ["item 1", "item 2", "item 3"],
          "weeklyPlan": ["item 1", "item 2", ...],
          "monthlyPlan": ["item 1", "item 2", ...]
        }}
        """
        
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        
        data = json.loads(response.text)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
