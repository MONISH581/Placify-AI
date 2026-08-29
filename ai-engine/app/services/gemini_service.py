import os
from typing import Dict, Any, List

from dotenv import load_dotenv

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Lazy-loaded Google GenAI client
client = None
if GEMINI_API_KEY:
    try:
        from google import genai
        client = genai.Client(api_key=GEMINI_API_KEY)
        print("[GeminiService] Initialized Google GenAI Client successfully.")
    except Exception as e:
        print(f"[GeminiService] Error initializing Google GenAI Client: {e}")

MODEL_NAME = "gemini-3.6-flash"

def generate_mentor_response(prompt: str, context: str, student_profile: dict) -> str:
    if not client:
        return (
            "💡 [Placify AI Mentor - Demo Mode]\n"
            "To unlock live AI explanations, configure your GEMINI_API_KEY in the environment.\n\n"
            f"**Retrieved Knowledge Context:**\n{context}\n\n"
            "**Hint:** Focus on understanding the core time/space invariants before coding."
        )

    system_instruction = f"""
    You are the Placify AI Coding Mentor.
    
    Student Profile:
    - Target Company: {student_profile.get('target_companies', ['Top Tech'])}
    - Target Role: {student_profile.get('target_role', 'Software Engineer')}
    - Weak Subjects: {student_profile.get('weak_topics', [])}
    
    Retrieved Context (from Placify Knowledge Base):
    {context}
    
    CRITICAL RULE: Do NOT give direct full answers to coding problems. Provide progressive hints, explain concepts, and point out logical gaps.
    """

    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=system_instruction + "\n\nStudent Question:\n" + prompt
        )
        return response.text
    except Exception as e:
        return f"Error connecting to Gemini API: {str(e)}"

def generate_mock_interview_question(topic: str, difficulty: str, past_questions: list) -> str:
    if not client:
        return f"Explain the key architectural differences between a Process and a Thread in Operating Systems. [Demo Mode: {difficulty} {topic}]"

    system_instruction = f"""
    You are a principal technical interviewer at a top tech firm.
    Generate a concise {difficulty} interview question focusing on {topic}.
    Do NOT repeat these questions: {past_questions}.
    Return ONLY the question text.
    """
    try:
        response = client.models.generate_content(model=MODEL_NAME, contents=system_instruction)
        return response.text.strip()
    except Exception as e:
        return f"Explain {topic} fundamentals and time complexity tradeoffs."

def evaluate_interview_answer(question: str, answer: str) -> dict:
    if not client:
        return {
            "score": 7,
            "feedback": "Solid structural explanation. To achieve top score, mention edge cases and exact space complexity bounds. (Demo mode)",
            "is_demo_mode": True
        }

    prompt = f"""
    Evaluate this candidate's interview answer.
    Question: {question}
    Answer: {answer}
    
    Return evaluation strictly in format:
    Score: [0-10]
    Feedback: [Your detailed constructive feedback]
    """
    try:
        response = client.models.generate_content(model=MODEL_NAME, contents=prompt)
        text = response.text.strip()
        lines = text.split("\n")
        score = 6
        feedback = text
        for line in lines:
            if line.startswith("Score:"):
                try:
                    score = int(line.replace("Score:", "").strip())
                except:
                    pass
            elif line.startswith("Feedback:"):
                feedback = line.replace("Feedback:", "").strip()
        return {"score": score, "feedback": feedback, "is_demo_mode": False}
    except Exception as e:
        return {"score": 5, "feedback": f"API Error during evaluation: {str(e)}", "is_demo_mode": True}

def analyze_code(code: str, language: str, problem_description: str) -> str:
    if not client:
        return (
            "🔍 [Code Analysis - Demo Mode]\n"
            "- Time Complexity: O(N)\n"
            "- Space Complexity: O(1)\n"
            "- Suggestion: Verify zero-length array input and handle potential boundary overflow."
        )

    system_instruction = f"""
    You are an expert software reviewer.
    Problem Description: {problem_description}
    Language: {language}
    
    Analyze the code for correctness, time/space complexity, edge cases, and optimizations.
    Do NOT provide complete code replacement. Point out key improvements.
    
    Code:
    {code}
    """
    try:
        response = client.models.generate_content(model=MODEL_NAME, contents=system_instruction)
        return response.text
    except Exception as e:
        return f"Error analyzing code: {str(e)}"

def analyze_resume(resume_text: str, target_role: str) -> dict:
    if not client:
        return {
            "score": 78,
            "feedback": "Strong project titles. Add quantifiable metrics (e.g. % performance increase, active users) to elevate ATS match. (Demo mode)",
            "is_demo_mode": True
        }

    prompt = f"""
    Analyze this resume for a {target_role} position.
    Check ATS keyword matching, impact metrics, and formatting.
    
    Resume Text:
    {resume_text}
    
    Format:
    Score: [0-100]
    Feedback: [Constructive feedback]
    """
    try:
        response = client.models.generate_content(model=MODEL_NAME, contents=prompt)
        text = response.text.strip()
        lines = text.split("\n")
        score = 70
        feedback = text
        for line in lines:
            if line.startswith("Score:"):
                try:
                    score = int(line.replace("Score:", "").strip())
                except:
                    pass
            elif line.startswith("Feedback:"):
                feedback = line.replace("Feedback:", "").strip()
        return {"score": score, "feedback": feedback, "is_demo_mode": False}
    except Exception as e:
        return {"score": 50, "feedback": f"Analysis Error: {str(e)}", "is_demo_mode": True}

def generate_career_roadmap(student_profile: dict) -> str:
    if not client:
        return (
            "📌 [Placify Career Roadmap - Demo Mode]\n"
            "1. Week 1-2: Master Array & Hashing patterns.\n"
            "2. Week 3-4: Focus on Trees & Graph Traversals (BFS/DFS).\n"
            "3. Week 5-6: Practice OS multithreading and DBMS index tuning.\n"
            "4. Week 7-8: Complete 3 AI Mock Technical Interviews."
        )

    system_instruction = f"""
    Generate a tailored career learning roadmap based on:
    Target Role: {student_profile.get('target_role', 'SDE')}
    Target Companies: {student_profile.get('target_companies', ['Top Tech'])}
    Weak Topics: {student_profile.get('weak_topics', [])}
    Strong Topics: {student_profile.get('strong_topics', [])}
    """
    try:
        response = client.models.generate_content(model=MODEL_NAME, contents=system_instruction)
        return response.text
    except Exception as e:
        return f"Error generating roadmap: {str(e)}"
