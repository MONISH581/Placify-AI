/**
 * One-time (and idempotent) local setup, cross-platform:
 *   1. create .env from .env.example if missing, generating random JWT_SECRET / INTERNAL_API_KEY
 *      (also fills them in an existing .env where they are empty or placeholders)
 *   2. npx prisma db push   (create / update the SQLite schema)
 *   3. npx prisma generate
 *   4. seed the database (seed-db.ts)
 *
 * Usage: npm run setup
 */

import crypto from "crypto";
import { spawnSync } from "child_process";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

const root = process.cwd();
const envPath = path.join(root, ".env");
const examplePath = path.join(root, ".env.example");
const PLACEHOLDERS = new Set(["", "your_jwt_secret_key_here", "your_internal_api_key_here", "change_me", "changeme"]);

function log(message: string) {
  console.log(`[setup] ${message}`);
}

function ensureEnvFile() {
  let content: string;
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, "utf8");
    log(".env already exists - keeping existing values");
  } else {
    if (!fs.existsSync(examplePath)) throw new Error(".env.example not found - run this from the project root");
    content = fs.readFileSync(examplePath, "utf8");
    log("created .env from .env.example");
  }

  const secrets: Record<string, () => string> = {
    JWT_SECRET: () => crypto.randomBytes(48).toString("hex"),
    INTERNAL_API_KEY: () => crypto.randomBytes(32).toString("hex"),
  };
  for (const [key, generate] of Object.entries(secrets)) {
    const pattern = new RegExp(`^${key}=(.*)$`, "m");
    const match = pattern.exec(content);
    const current = match ? match[1].trim().replace(/^["']|["']$/g, "") : "";
    if (match && !PLACEHOLDERS.has(current.toLowerCase())) continue;
    const line = `${key}=${generate()}`;
    content = match ? content.replace(pattern, line) : `${content.trimEnd()}\n${line}\n`;
    log(`generated a random ${key}`);
  }
  fs.writeFileSync(envPath, content, "utf8");
}

function childEnv(): NodeJS.ProcessEnv {
  // Values from .env, overridden by the real environment; DATABASE_URL defaults to prisma/dev.db.
  const fromFile = dotenv.parse(fs.readFileSync(envPath, "utf8"));
  const env: NodeJS.ProcessEnv = { ...fromFile, ...process.env };
  if (!env.DATABASE_URL) env.DATABASE_URL = "file:./dev.db";
  return env;
}

function run(label: string, args: string[]) {
  log(label);
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: "inherit", env: childEnv() });
  if (result.status !== 0) {
    throw new Error(`${label} failed (exit code ${result.status ?? "unknown"})`);
  }
}

function main() {
  const major = Number(process.versions.node.split(".")[0]);
  if (major < 20) throw new Error(`Node.js 20+ is required (found ${process.versions.node})`);

  ensureEnvFile();
  const prismaCli = path.join(root, "node_modules", "prisma", "build", "index.js");
  if (!fs.existsSync(prismaCli)) throw new Error("Prisma CLI not found - run `npm install` first");

  // --accept-data-loss: the SQLite dev DB may contain tables from older schema versions that were removed.
  run("applying database schema (prisma db push)", [prismaCli, "db", "push", "--skip-generate", "--accept-data-loss"]);
  run("generating Prisma client (prisma generate)", [prismaCli, "generate"]);
  run("seeding database", ["--import", "tsx", "seed-db.ts"]);
  log("done. Start the ML service (ml_service/start.bat or see README) and then `npm run dev`.");
}

try {
  main();
} catch (err) {
  console.error(`[setup] ERROR: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
