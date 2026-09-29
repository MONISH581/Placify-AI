import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../auth";
import { asyncHandler, validate } from "../http";
import { callMLService } from "../ml";
import { aiLimiter } from "../rateLimits";

const MAX_HISTORY = 10;

const MentorSchema = z.object({
  question: z.string().trim().min(1, "Question is required").max(2000, "Question is too long (max 2000 characters)"),
  chatHistory: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(20_000),
      })
    )
    .max(100)
    .optional(),
});

interface MLMentorResponse {
  answer?: string;
  sources?: unknown[];
  method?: string;
}

const FALLBACK_TEXT = [
  "The AI mentor (ML service) is offline right now, so here is some general guidance:",
  "",
  "- Master the core patterns first: arrays and hashing, two pointers, sliding window, stacks, binary search, trees (BFS/DFS) and basic dynamic programming.",
  "- For every problem: restate it, work through a small example by hand, state a brute-force approach, then optimise and analyse time/space complexity.",
  "- Practise explaining your approach out loud - interviewers grade communication as much as code.",
  "",
  "Start the ML service (see README) to get answers grounded in the Placify knowledge base.",
].join("\n");

export const mentorRouter = Router();

mentorRouter.post(
  "/ask",
  aiLimiter,
  authenticate,
  asyncHandler(async (req, res) => {
    const { question, chatHistory = [] } = validate(MentorSchema, req.body, "Invalid mentor question");
    const history = chatHistory
      .filter((m) => m.content.trim().length > 0)
      .slice(-MAX_HISTORY)
      .map((m) => ({ role: m.role, content: m.content.trim().slice(0, 2000) }));

    const ml = await callMLService<MLMentorResponse>("/rag/mentor-ask", {
      body: { question, top_k: 5, chat_history: history },
      timeoutMs: 20_000,
    });

    if (ml.ok && typeof ml.data.answer === "string" && ml.data.answer.trim()) {
      res.json({ text: ml.data.answer, sources: Array.isArray(ml.data.sources) ? ml.data.sources : [], source: "ml" });
      return;
    }
    res.json({ text: FALLBACK_TEXT, sources: [], source: "fallback" });
  })
);
