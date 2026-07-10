/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  email: string;
  username: string;
  isAdmin?: boolean;
  xp: number;
  level: number;
  streak: number;
  lastActiveDate: string; // YYYY-MM-DD
  badges: string[]; // Badge IDs
  accuracy: number;
  problemsSolved: string[]; // Problem IDs
  verified?: boolean;
  roadmap?: Roadmap;
}

export interface Problem {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
  description: string;
  constraints: string;
  inputFormat: string;
  outputFormat: string;
  examples: {
    input: string;
    output: string;
    explanation?: string;
  }[];
  testCases: {
    input: string;
    expectedOutput: string;
    isHidden: boolean;
  }[];
  editorial?: string;
  hints: string[]; // Progression 0-4
}

export interface Submission {
  id: string;
  userId: string;
  problemId: string;
  language: string;
  code: string;
  status: 'Accepted' | 'Wrong Answer' | 'Time Limit Exceeded' | 'Runtime Error' | 'Pending';
  timeComplexity?: string;
  memoryUsage?: string;
  errorMessage?: string;
  submittedAt: string;
}

export interface Roadmap {
  userId: string;
  currentYear: string;
  skills: string;
  targetCompany: string;
  targetRole: string;
  dailyPlan: string[];
  weeklyPlan: string[];
  monthlyPlan: string[];
  generatedAt: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctOption: number; // Index 0-3
  explanation: string;
}

export interface Quiz {
  id: string;
  trackId: string; // e.g. "python-basics"
  title: string;
  questions: QuizQuestion[];
}

export interface Streak {
  userId: string;
  dates: string[]; // Array of YYYY-MM-DD
  currentStreak: number;
  maxStreak: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  criteria: string;
}

export interface Contest {
  id: string;
  title: string;
  description: string;
  startTime: string;
  durationMinutes: number;
  problems: string[]; // List of Problem IDs
  registrantsCount: number;
  participants: {
    userId: string;
    username: string;
    score: number;
    timeSpentSeconds: number;
  }[];
}

export interface MockInterview {
  id: string;
  userId: string;
  type: 'Technical' | 'HR' | 'Behavioral';
  status: 'In Progress' | 'Completed';
  currentQuestionIndex: number;
  questions: string[];
  answers: string[];
  scores: number[];
  feedback: string[];
  overallScore?: number;
  overallFeedback?: string;
  createdAt: string;
}

export interface DiscussionThread {
  id: string;
  title: string;
  content: string;
  userId: string;
  username: string;
  category: 'General' | 'DSA' | 'Interview Experience' | 'Contests' | 'Doubts';
  likes: number;
  likedBy: string[]; // List of User IDs
  replies: {
    id: string;
    userId: string;
    username: string;
    content: string;
    createdAt: string;
  }[];
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'contest' | 'streak' | 'recommendation' | 'general';
  read: boolean;
  createdAt: string;
}

export interface LearningModule {
  id: string; // e.g., "python-basics"
  trackId: string; // e.g., "python"
  title: string;
  notes: string;
  examples: string[];
}
