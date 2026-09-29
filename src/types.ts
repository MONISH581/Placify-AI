/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared frontend types. These mirror the Node HTTP API contract
 * (see CONTRACT.md "Node HTTP API"); keep them in sync with the server.
 */

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export type Language = 'javascript' | 'python' | 'java' | 'cpp' | 'c';

export const LANGUAGES: ReadonlyArray<{ id: Language; label: string }> = [
  { id: 'javascript', label: 'JavaScript (Node.js)' },
  { id: 'python', label: 'Python 3' },
  { id: 'java', label: 'Java' },
  { id: 'cpp', label: 'C++' },
  { id: 'c', label: 'C' },
];

export type LanguageMap = Record<Language, string>;

/** Public user object returned by every endpoint that returns `user`. */
export interface User {
  id: string;
  email: string;
  username: string;
  isAdmin: boolean;
  xp: number;
  level: number;
  streak: number;
  lastActiveDate: string | null;
  accuracy: number;
  verified: boolean;
  /** Problem ids the user has solved. */
  problemsSolved: string[];
  /** Badge names. */
  badges: string[];
}

export interface AuthResponse {
  success: boolean;
  user: User;
  token: string;
}

export interface MeResponse {
  success: boolean;
  user: User;
}

export interface ProblemExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface ProblemTestCase {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

export interface Problem {
  id: string;
  title: string;
  difficulty: Difficulty;
  description: string;
  constraints: string;
  inputFormat: string;
  outputFormat: string;
  editorial: string;
  tags: string[];
  examples: ProblemExample[];
  /** Only visible test cases are ever sent to the client. */
  testCases: ProblemTestCase[];
  hints: string[];
  starterCode: LanguageMap;
  solutions: LanguageMap;
}

/** Fields an admin may send to POST/PUT /api/problems. */
export interface ProblemInput {
  title: string;
  difficulty: Difficulty;
  description: string;
  constraints: string;
  inputFormat: string;
  outputFormat: string;
  editorial: string;
  tags: string[];
  examples: ProblemExample[];
  hints: string[];
  testCases?: ProblemTestCase[];
}

export type SubmissionStatus =
  | 'Accepted'
  | 'Wrong Answer'
  | 'Runtime Error'
  | 'Time Limit Exceeded'
  | 'Compilation Error';

export interface Submission {
  id: string;
  /** Present on GET /api/submissions items (used to filter per problem). */
  problemId?: string;
  status: SubmissionStatus;
  language: Language;
  errorMessage: string | null;
  timeComplexity: string | null;
  memoryUsage: string | null;
  xpEarned: number;
  aiReview: string | null;
  submittedAt: string;
}

export interface RunCaseResult {
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
}

/** POST /api/problems/:id/submit with isSubmission=false */
export interface RunResponse {
  run: true;
  success: boolean;
  results: RunCaseResult[];
  errorMessage?: string;
  /** Optional overall verdict of the run (e.g. "Compilation Error"). */
  status?: SubmissionStatus;
}

/** POST /api/problems/:id/submit with isSubmission=true */
export interface SubmitResponse {
  run: false;
  success: boolean;
  submission: Submission;
  xpEarned: number;
  firstSolve: boolean;
  user: User;
  /** Optional: number of test cases passed / total (hidden inputs are never echoed). */
  passedCount?: number;
  totalCount?: number;
}

export interface ReadinessSummary {
  score: number;
  placementReady: boolean;
  insights: string[];
  model: string;
  isDemo: boolean;
  source: 'ml' | 'fallback';
}

export interface ProblemRecommendation {
  id: string;
  title: string;
  difficulty: Difficulty;
  tags: string[];
}

export interface DashboardMetrics {
  xp: number;
  level: number;
  streak: number;
  accuracy: number;
  problemsSolved: number;
  totalSubmissions: number;
  interviewAverage: number | null;
}

export interface ActivityDay {
  /** YYYY-MM-DD */
  date: string;
  count: number;
}

/** GET /api/dashboard/analytics */
export interface DashboardAnalytics {
  readiness: ReadinessSummary;
  recommendations: ProblemRecommendation[];
  metrics: DashboardMetrics;
  strongTopics: string[];
  weakTopics: string[];
  /** Last 84 days, oldest first. */
  activity: ActivityDay[];
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface MentorSource {
  source: string;
  topic?: string;
  relevance?: number;
}

/** POST /api/mentor/ask */
export interface MentorResponse {
  text: string;
  sources: MentorSource[];
  source: 'ml' | 'fallback';
}

export interface TrackTopic {
  id: string;
  name: string;
  content: string;
}

export interface LearningTrack {
  id: string;
  name: string;
  color: string;
  logo: string;
  topics: TrackTopic[];
}

export interface TopicQuiz {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

/** GET /api/learning-tracks/:trackId/topics/:topicId */
export interface TopicPayload {
  name: string;
  theory: string;
  visualExplanation?: string;
  codeExamples: { title: string; code: string }[];
  practiceQuestions: string[];
  codingChallenges: { title: string; description: string; starterCode: string }[];
  quizzes: TopicQuiz[];
  interviewQuestions: { question: string; answer: string }[];
  /** Optional: set by the server when the current user already completed this topic. */
  completed?: boolean;
}

/** POST /api/learning-tracks/:trackId/topics/:topicId/complete */
export interface TopicCompletionResponse {
  xpEarned: number;
  alreadyCompleted: boolean;
  user: User;
  passed?: boolean;
  passingScore?: number;
}

/** POST /api/resume/analyze */
export interface ResumeAnalysis {
  atsScore: number;
  strengths: string[];
  improvements: string[];
  keywordsFound: string[];
  keywordsMissing: string[];
  summary: string;
  source: 'ai' | 'heuristic';
}

export interface Contest {
  id: string;
  title: string;
  description: string;
  startTime: string;
  durationMinutes: number;
  problems: string[];
  registrantsCount: number;
  isRegistered: boolean;
}

export const DISCUSSION_CATEGORIES = ['General', 'DSA', 'Interview Experience', 'Contests', 'Doubts'] as const;

export interface DiscussionReply {
  id: string;
  username: string;
  content: string;
  createdAt: string;
}

export interface DiscussionThread {
  id: string;
  title: string;
  content: string;
  username: string;
  category: string;
  likes: number;
  /** User ids that liked the thread. */
  likedBy: string[];
  createdAt: string;
  replies: DiscussionReply[];
}

export type InterviewType = 'Technical' | 'HR' | 'Behavioral';

export interface MockInterview {
  id: string;
  type: InterviewType;
  status: 'In Progress' | 'Completed';
  currentQuestionIndex: number;
  questions: string[];
  answers: string[];
  scores: number[];
  feedback: string[];
  overallScore: number | null;
  overallFeedback: string | null;
  xpEarned?: number;
  /** Present when the interview has just been completed. */
  user?: User;
}

/** GET /api/health */
export interface HealthStatus {
  status: string;
  node?: string;
  database?: string;
  mlService?: string;
  mlModels?: Record<string, boolean>;
  codeRunner?: string;
  aiProvider?: string;
  timestamp?: string;
}
