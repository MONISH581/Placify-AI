/**
 * Express application: security middleware, JSON parsing and all /api routes.
 * Static/Vite serving and the error handler are attached by server.ts.
 */

import express, { type NextFunction, type Request, type Response } from "express";
import { config } from "./config";
import { HttpError } from "./http";
import { authLimiter } from "./rateLimits";
import { authRouter } from "./routes/auth";
import { contestsRouter } from "./routes/contests";
import { dashboardRouter } from "./routes/dashboard";
import { discussionsRouter } from "./routes/discussions";
import { healthRouter } from "./routes/health";
import { interviewsRouter } from "./routes/interviews";
import { learningRouter } from "./routes/learning";
import { mentorRouter } from "./routes/mentor";
import { problemsRouter, submissionsRouter } from "./routes/problems";
import { resumeRouter } from "./routes/resume";

function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
}

/** Minimal CORS: only origins listed in ALLOWED_ORIGINS get CORS headers (same-origin needs none). */
function cors(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  if (origin && config.allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Max-Age", "600");
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
  }
  next();
}

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(securityHeaders);

  const api = express.Router();
  api.use(cors);
  api.use(express.json({ limit: "100kb" }));

  api.use("/health", healthRouter);
  api.use("/auth/login", authLimiter);
  api.use("/auth/register", authLimiter);
  api.use("/auth", authRouter);
  api.use("/problems", problemsRouter);
  api.use("/submissions", submissionsRouter);
  api.use("/dashboard", dashboardRouter);
  api.use("/mentor", mentorRouter);
  api.use("/learning-tracks", learningRouter);
  api.use("/resume", resumeRouter);
  api.use("/contests", contestsRouter);
  api.use("/discussions", discussionsRouter);
  api.use("/mock-interview", interviewsRouter);

  // Unknown API routes must never fall through to the SPA's index.html.
  api.use((req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.baseUrl}${req.path}` });
  });

  app.use("/api", api);
  return app;
}

/** Final error handler: honours HTTP status on known errors, hides internals in production. */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const e = (err ?? {}) as { status?: number; statusCode?: number; expose?: boolean; message?: string; details?: unknown; type?: string };
  let status = Number(e.status ?? e.statusCode ?? 500);
  if (!Number.isInteger(status) || status < 400 || status > 599) status = 500;

  const intentional = err instanceof HttpError;
  if (status >= 500 && !intentional) {
    console.error(`[error] ${req.method} ${req.originalUrl}:`, err);
  }
  if (res.headersSent) {
    res.end();
    return;
  }

  let message: string;
  if (e.type === "entity.parse.failed") message = "Malformed JSON request body";
  else if (e.type === "entity.too.large") message = "Request body is too large";
  else if (intentional && e.message) message = e.message;
  else if (status < 500 && e.expose !== false && e.message) message = e.message;
  else if (status < 500) message = "Bad request";
  else message = config.isProduction ? "Internal server error" : e.message || "Internal server error";

  res.status(status).json({ error: message, ...(status < 500 && e.details !== undefined ? { details: e.details } : {}) });
}
