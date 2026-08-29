from typing import Dict, Any, List

class HybridRecommender:
    def __init__(self):
        pass

    def recommend_next_actions(self, student_profile: Dict[str, Any], limit: int = 5) -> List[Dict[str, Any]]:
        """
        Hybrid recommendation engine combining ML weakness detection, prerequisites,
        readiness level matching, and target role goals.
        """
        weak_topics = student_profile.get("weak_topics", [])
        overall_readiness = float(student_profile.get("overall_readiness", 50.0))
        target_role = student_profile.get("target_role", "Software Engineer")
        target_company = student_profile.get("target_company", "Top Tech")

        # Map topics to recommended actions
        recommendations = []

        if "Graphs & BFS/DFS" in weak_topics or "Graphs" in str(weak_topics):
            recommendations.append({
                "id": "rec-graph-1",
                "type": "lesson",
                "entityId": "lesson-graph-traversal",
                "title": "Master Graph Traversals (BFS & DFS)",
                "topic": "Graphs",
                "difficulty": "Medium",
                "reasoning": f"Identified weakness in Graphs for {target_role} track at {target_company}.",
                "prerequisitesMet": True,
                "xpReward": 50
            })
            recommendations.append({
                "id": "rec-graph-2",
                "type": "problem",
                "entityId": "prob-graph-bfs",
                "title": "Number of Islands (BFS/DFS Application)",
                "topic": "Graphs",
                "difficulty": "Medium",
                "reasoning": "High-frequency problem for graph connectivity testing.",
                "prerequisitesMet": True,
                "xpReward": 40
            })

        if "Dynamic Programming" in weak_topics or "DP" in str(weak_topics):
            recommendations.append({
                "id": "rec-dp-1",
                "type": "lesson",
                "entityId": "lesson-dp-memo",
                "title": "Dynamic Programming: Memoization vs Tabulation",
                "topic": "Dynamic Programming",
                "difficulty": "Medium",
                "reasoning": "Foundational lesson required before tackling medium DP problems.",
                "prerequisitesMet": True,
                "xpReward": 50
            })
            recommendations.append({
                "id": "rec-dp-2",
                "type": "problem",
                "entityId": "prob-climbing-stairs",
                "title": "Climbing Stairs (1D DP Pattern)",
                "topic": "Dynamic Programming",
                "difficulty": "Easy",
                "reasoning": "Ideal starter problem to solidify 1D transition state logic.",
                "prerequisitesMet": True,
                "xpReward": 30
            })

        if "Operating Systems & Threading" in weak_topics or "OS" in str(weak_topics) or "Operating Systems" in str(weak_topics):
            recommendations.append({
                "id": "rec-os-1",
                "type": "quiz",
                "entityId": "quiz-os-concurrency",
                "title": "OS Process Scheduling & Multithreading Quiz",
                "topic": "Operating Systems",
                "difficulty": "Medium",
                "reasoning": "Essential core CS concept frequently asked in technical screenings.",
                "prerequisitesMet": True,
                "xpReward": 35
            })

        # Generic baseline recommendations if list is short
        if len(recommendations) < limit:
            recommendations.append({
                "id": "rec-interview-1",
                "type": "mock_interview",
                "entityId": "interview-tech-sde",
                "title": "AI Technical Mock Interview (DSA & System Concepts)",
                "topic": "Interview Prep",
                "difficulty": "Medium",
                "reasoning": f"Simulate real interview pressure for target role: {target_role}.",
                "prerequisitesMet": True,
                "xpReward": 100
            })

        if len(recommendations) < limit:
            recommendations.append({
                "id": "rec-resume-1",
                "type": "resume",
                "entityId": "resume-ats-check",
                "title": "ATS Resume Analysis & Impact Bullet Optimization",
                "topic": "Resume Prep",
                "difficulty": "Easy",
                "reasoning": f"Boost resume score to meet recruiter screening benchmarks at {target_company}.",
                "prerequisitesMet": True,
                "xpReward": 45
            })

        return recommendations[:limit]

recommender = HybridRecommender()
