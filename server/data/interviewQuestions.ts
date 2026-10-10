/**
 * Mock interview question sets (5 per interview type). `keywords` drive the local heuristic scorer
 * that is used when the ML interview-scoring service is unavailable.
 */

export const INTERVIEW_TYPES = ["Technical", "HR", "Behavioral"] as const;
export type InterviewType = (typeof INTERVIEW_TYPES)[number];

export interface InterviewQuestion {
  question: string;
  keywords: string[];
}

export const INTERVIEW_QUESTIONS: Record<InterviewType, InterviewQuestion[]> = {
  Technical: [
    {
      question: "Explain the difference between SQL and NoSQL databases. When would you choose each?",
      keywords: ["schema", "relational", "table", "document", "key-value", "acid", "scal", "join", "consisten", "transaction"],
    },
    {
      question: "What is the time complexity of searching in a hash table, and what happens when collisions occur?",
      keywords: ["o(1)", "average", "worst", "o(n)", "collision", "chaining", "open addressing", "load factor", "rehash", "hash function"],
    },
    {
      question: "Describe how a process differs from a thread, and how the operating system schedules them.",
      keywords: ["memory", "address space", "share", "context switch", "scheduler", "round-robin", "priority", "stack", "concurren", "lightweight"],
    },
    {
      question: "How would you design a rate limiter for a public REST API?",
      keywords: ["token bucket", "leaky bucket", "sliding window", "fixed window", "redis", "per user", "ip", "429", "distributed", "counter"],
    },
    {
      question: "What happens, step by step, when you type a URL into a browser and press Enter?",
      keywords: ["dns", "tcp", "handshake", "tls", "http", "request", "server", "response", "render", "cache"],
    },
  ],
  HR: [
    {
      question: "Tell me about yourself.",
      keywords: ["student", "degree", "experience", "project", "skill", "intern", "passion", "goal", "team", "learn"],
    },
    {
      question: "Why do you want to join our company?",
      keywords: ["mission", "product", "culture", "growth", "learn", "impact", "values", "team", "technology", "customers"],
    },
    {
      question: "What are your greatest strengths and one weakness you are working on?",
      keywords: ["strength", "weakness", "improv", "example", "feedback", "working on", "learn", "organized", "communicat", "detail"],
    },
    {
      question: "Where do you see yourself in five years?",
      keywords: ["grow", "lead", "skill", "responsib", "expert", "contribut", "career", "learn", "mentor", "goal"],
    },
    {
      question: "Are you comfortable with relocation, shifts, or a service agreement if required?",
      keywords: ["yes", "comfortable", "flexible", "open", "willing", "understand", "commit", "adapt", "relocat", "team"],
    },
  ],
  Behavioral: [
    {
      question: "Describe a time you had a conflict with a teammate. How did you resolve it?",
      keywords: ["situation", "task", "action", "result", "listen", "communicat", "compromise", "understand", "resolved", "team"],
    },
    {
      question: "Tell me about a project that failed or did not go as planned. What did you learn?",
      keywords: ["situation", "mistake", "learn", "result", "action", "responsib", "improv", "deadline", "feedback", "next time"],
    },
    {
      question: "Give an example of a time you took initiative without being asked.",
      keywords: ["initiative", "noticed", "proposed", "action", "result", "impact", "improv", "automat", "owner", "team"],
    },
    {
      question: "Describe a situation where you had to meet a tight deadline.",
      keywords: ["deadline", "priorit", "plan", "time", "result", "delivered", "team", "pressure", "action", "task"],
    },
    {
      question: "Tell me about a time you had to learn a new technology quickly.",
      keywords: ["learn", "documentation", "tutorial", "practice", "project", "result", "week", "applied", "build", "quickly"],
    },
  ],
};

export function questionsFor(type: InterviewType): string[] {
  return INTERVIEW_QUESTIONS[type].map((q) => q.question);
}

/**
 * Deterministic fallback scorer: answer length + coverage of expected keywords (+ STAR structure for
 * behavioural answers). Clearly labelled as heuristic in the returned feedback.
 */
export function heuristicInterviewScore(type: InterviewType, question: string, answer: string): { score: number; feedback: string } {
  const entry = INTERVIEW_QUESTIONS[type].find((q) => q.question === question);
  const text = answer.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean).length;
  const keywords = entry?.keywords ?? [];
  const matched = keywords.filter((k) => text.includes(k));

  const lengthScore = words >= 120 ? 40 : words >= 60 ? 32 : words >= 30 ? 22 : words >= 12 ? 12 : 4;
  const keywordScore = keywords.length ? Math.round((Math.min(matched.length, 5) / 5) * 45) : 25;
  const hasExample = /\b(for example|for instance|when i|i (built|led|worked|created|implemented|resolved))\b/.test(text) ? 10 : 0;
  const hasNumbers = /\d/.test(text) ? 5 : 0;
  const score = Math.max(0, Math.min(100, lengthScore + keywordScore + hasExample + hasNumbers));

  const tips: string[] = [];
  if (words < 30) tips.push("Expand your answer - aim for 60-150 words with concrete detail.");
  if (matched.length < 3 && keywords.length) tips.push(`Consider covering: ${keywords.filter((k) => !matched.includes(k)).slice(0, 3).join(", ")}.`);
  if (!hasExample) tips.push(type === "Technical" ? "Add a concrete example or trade-off." : "Use the STAR format (Situation, Task, Action, Result) with a real example.");
  if (!hasNumbers && type !== "Technical") tips.push("Quantify the outcome where possible.");

  const feedback = `[Heuristic score - ML scoring service unavailable] ${
    score >= 75 ? "Strong, well-structured answer." : score >= 50 ? "Reasonable answer with room to add depth." : "The answer needs more depth and structure."
  }${tips.length ? " " + tips.join(" ") : ""}`;
  return { score, feedback };
}
