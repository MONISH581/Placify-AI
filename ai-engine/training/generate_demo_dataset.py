import os
import numpy as np
import pandas as pd

try:
    from training.features import FEATURE_NAMES
except ImportError:
    from features import FEATURE_NAMES

DATASET_PATH = os.path.join(os.path.dirname(__file__), "demo_training_dataset.csv")

def generate_correlated_demo_dataset(num_samples=2500, random_seed=42):
    """
    Generates a realistic, correlated demo dataset for training Placify Readiness Model v1.
    Metadata: dataset_type = DEMO_SYNTHETIC
    """
    np.random.seed(random_seed)
    
    records = []
    
    num_strong = int(num_samples * 0.25)
    num_average = int(num_samples * 0.50)
    num_weak = num_samples - num_strong - num_average
    
    def generate_profile(archetype):
        if archetype == "strong":
            coding_score = np.random.uniform(75, 98)
            dsa_score = np.random.uniform(70, 96)
            cs_fundamentals = np.random.uniform(65, 95)
            interview_score = np.random.uniform(75, 95)
            resume_score = np.random.uniform(80, 98)
            problems_solved = np.random.randint(150, 450)
            problems_attempted = int(problems_solved * np.random.uniform(1.05, 1.25))
            avg_time = np.random.uniform(300, 1200)
            hints_used = np.random.randint(0, max(2, int(problems_solved * 0.15 + 1)))
            quiz_average = np.random.uniform(75, 98)
            coding_streak = np.random.randint(10, 60)
            learning_velocity = np.random.uniform(12, 35)
            tm_arrays = np.random.uniform(80, 100)
            tm_trees = np.random.uniform(70, 95)
            tm_graphs = np.random.uniform(65, 90)
            tm_dp = np.random.uniform(60, 85)
            tm_os = np.random.uniform(70, 95)
            
        elif archetype == "average":
            coding_score = np.random.uniform(50, 78)
            dsa_score = np.random.uniform(45, 75)
            cs_fundamentals = np.random.uniform(45, 75)
            interview_score = np.random.uniform(50, 75)
            resume_score = np.random.uniform(55, 80)
            problems_solved = np.random.randint(40, 160)
            problems_attempted = int(problems_solved * np.random.uniform(1.2, 1.6))
            avg_time = np.random.uniform(900, 2400)
            hints_used = np.random.randint(2, max(4, int(problems_solved * 0.4 + 2)))
            quiz_average = np.random.uniform(55, 78)
            coding_streak = np.random.randint(2, 15)
            learning_velocity = np.random.uniform(5, 15)
            tm_arrays = np.random.uniform(60, 85)
            tm_trees = np.random.uniform(45, 70)
            tm_graphs = np.random.uniform(35, 60)
            tm_dp = np.random.uniform(30, 55)
            tm_os = np.random.uniform(50, 75)
            
        else: # weak
            coding_score = np.random.uniform(15, 52)
            dsa_score = np.random.uniform(10, 48)
            cs_fundamentals = np.random.uniform(20, 50)
            interview_score = np.random.uniform(20, 50)
            resume_score = np.random.uniform(30, 60)
            problems_solved = np.random.randint(5, 45)
            problems_attempted = int(problems_solved * np.random.uniform(1.5, 3.0))
            avg_time = np.random.uniform(1800, 3600)
            high_hints = max(11, int(problems_solved * 0.8 + 15))
            hints_used = np.random.randint(5, high_hints)
            quiz_average = np.random.uniform(25, 55)
            coding_streak = np.random.randint(0, 4)
            learning_velocity = np.random.uniform(1, 6)
            tm_arrays = np.random.uniform(30, 60)
            tm_trees = np.random.uniform(10, 40)
            tm_graphs = np.random.uniform(10, 35)
            tm_dp = np.random.uniform(5, 30)
            tm_os = np.random.uniform(20, 48)

        solve_rate = problems_solved / max(problems_attempted, 1)
        
        target_readiness = (
            (coding_score * 0.25) +
            (dsa_score * 0.20) +
            (cs_fundamentals * 0.15) +
            (interview_score * 0.15) +
            (resume_score * 0.10) +
            (quiz_average * 0.10) +
            (min(problems_solved / 2.0, 100) * 0.05)
        )
        
        target_readiness += np.random.normal(0, 2.0)
        target_readiness = float(np.clip(target_readiness, 0.0, 100.0))
        
        row = [
            coding_score, dsa_score, cs_fundamentals, interview_score, resume_score,
            problems_solved, problems_attempted, solve_rate, avg_time, hints_used,
            quiz_average, coding_streak, learning_velocity,
            tm_arrays, tm_trees, tm_graphs, tm_dp, tm_os,
            target_readiness
        ]
        return row

    for _ in range(num_strong):
        records.append(generate_profile("strong"))
    for _ in range(num_average):
        records.append(generate_profile("average"))
    for _ in range(num_weak):
        records.append(generate_profile("weak"))

    columns = FEATURE_NAMES + ["target_readiness"]
    df = pd.DataFrame(records, columns=columns)
    df = df.sample(frac=1.0, random_state=random_seed).reset_index(drop=True)
    
    df.to_csv(DATASET_PATH, index=False)
    print(f"Generated demo dataset with {len(df)} samples at: {DATASET_PATH}")
    print(f"Dataset Metadata: dataset_type = DEMO_SYNTHETIC")
    return df

if __name__ == "__main__":
    generate_correlated_demo_dataset()
