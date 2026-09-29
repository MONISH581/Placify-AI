/**
 * Centralised, validated runtime configuration.
 *
 * Secrets have NO fallbacks: the server refuses to start when JWT_SECRET or INTERNAL_API_KEY is missing
 * (run `npm run setup` to generate a .env with random values).
 */

import dotenv from "dotenv";

// Values already present in the process environment win over .env (dotenv never overrides them).
dotenv.config({ quiet: true });

const PLACEHOLDER_SECRETS = new Set([
  "your_jwt_secret_key_here",
  "your_internal_api_key_here",
  "change_me",
  "changeme",
  "secret",
]);

function fail(message: string): never {
  console.error(`\n[config] FATAL: ${message}\n`);
  process.exit(1);
}

function readSecret(name: string, minLength: number): string {
  const value = (process.env[name] || "").trim();
  if (!value) {
    fail(`${name} is not set. Run \`npm run setup\` to create a .env with generated secrets, or set ${name} manually.`);
  }
  if (PLACEHOLDER_SECRETS.has(value.toLowerCase())) {
    fail(`${name} still has the placeholder value from .env.example. Run \`npm run setup\` or set a random value.`);
  }
  if (value.length < minLength) {
    fail(`${name} must be at least ${minLength} characters long (use a random value, e.g. from \`npm run setup\`).`);
  }
  return value;
}

function readInt(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < min || n > max) {
    fail(`${name} must be an integer between ${min} and ${max} (got "${raw}").`);
  }
  return n;
}

function readString(name: string, fallback = ""): string {
  const raw = process.env[name];
  return raw === undefined ? fallback : raw.trim();
}

const NODE_ENV = readString("NODE_ENV", "development") || "development";
const isProduction = NODE_ENV === "production";

if (!process.env.DATABASE_URL) {
  // Relative SQLite paths are resolved by Prisma relative to prisma/schema.prisma -> prisma/dev.db
  process.env.DATABASE_URL = "file:./dev.db";
}

export type CodeRunnerKind = "judge0" | "local" | "disabled";

function resolveCodeRunner(judge0Url: string): CodeRunnerKind {
  const requested = readString("CODE_RUNNER").toLowerCase();
  if (requested === "judge0") return judge0Url ? "judge0" : "disabled";
  if (requested === "local") return "local";
  if (requested && requested !== "auto") {
    fail(`CODE_RUNNER must be "judge0", "local" or empty (got "${requested}").`);
  }
  if (judge0Url) return "judge0";
  return isProduction ? "disabled" : "local";
}

const judge0Url = readString("JUDGE0_API_URL").replace(/\/+$/, "");

export const config = {
  nodeEnv: NODE_ENV,
  isProduction,
  isTest: NODE_ENV === "test",
  port: readInt("PORT", 3000, 0, 65535),
  host: readString("HOST", "127.0.0.1") || "127.0.0.1",
  jwtSecret: readSecret("JWT_SECRET", 32),
  internalApiKey: readSecret("INTERNAL_API_KEY", 16),
  jwtTtlSeconds: 24 * 60 * 60,
  mlServiceUrl: (readString("ML_SERVICE_URL", "http://127.0.0.1:8000") || "http://127.0.0.1:8000").replace(/\/+$/, ""),
  allowedOrigins: readString("ALLOWED_ORIGINS", "http://localhost:3000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  geminiApiKey: readString("GEMINI_API_KEY"),
  geminiModel: readString("GEMINI_MODEL", "gemini-2.5-flash") || "gemini-2.5-flash",
  codeRunner: resolveCodeRunner(judge0Url),
  judge0: {
    url: judge0Url,
    apiKey: readString("JUDGE0_API_KEY"),
    apiHost: readString("JUDGE0_API_HOST"),
  },
  pythonBin: readString("PYTHON_BIN"),
  rateLimits: {
    authPerMinute: readInt("RATE_LIMIT_AUTH_MAX", 20, 1, 100000),
    aiPerMinute: readInt("RATE_LIMIT_AI_MAX", 30, 1, 100000),
  },
} as const;

export type AppConfig = typeof config;
