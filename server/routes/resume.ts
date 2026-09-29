import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../auth";
import { asyncHandler, validate } from "../http";
import { aiLimiter } from "../rateLimits";
import { analyzeResume } from "../resumeAnalyzer";

const ResumeSchema = z.object({
  resumeText: z
    .string()
    .trim()
    .min(30, "Resume text is too short (paste at least a few lines)")
    .max(20_000, "Resume text is too long (max 20,000 characters)"),
  targetRole: z.string().trim().max(100).optional(),
});

export const resumeRouter = Router();

resumeRouter.post(
  "/analyze",
  aiLimiter,
  authenticate,
  asyncHandler(async (req, res) => {
    const { resumeText, targetRole } = validate(ResumeSchema, req.body, "Invalid resume payload");
    res.json(await analyzeResume(resumeText, targetRole));
  })
);
