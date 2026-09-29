import { rateLimit } from "express-rate-limit";
import { config } from "./config";

function limiter(limit: number, message: string) {
  return rateLimit({
    windowMs: 60_000,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({ error: message });
    },
  });
}

/** Login / register: 20 requests per minute per IP by default (RATE_LIMIT_AUTH_MAX). */
export const authLimiter = limiter(config.rateLimits.authPerMinute, "Too many authentication attempts. Please wait a minute and try again.");

/** Code execution and AI-backed routes: 30 requests per minute per IP by default (RATE_LIMIT_AI_MAX). */
export const aiLimiter = limiter(config.rateLimits.aiPerMinute, "Too many requests. Please wait a minute and try again.");
