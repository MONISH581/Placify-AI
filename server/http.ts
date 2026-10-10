/**
 * Small HTTP helpers shared by all routers: typed errors, async handler wrapper,
 * zod-based request validation and a per-key async mutex.
 */

import type { NextFunction, Request, RequestHandler, Response } from "express";
import { z } from "zod";

export class HttpError extends Error {
  readonly status: number;
  readonly details?: unknown;
  readonly expose = true;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

/** Wraps an async route handler so rejected promises reach the Express error handler. */
export function asyncHandler<Req extends Request = Request>(
  fn: (req: Req, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    fn(req as Req, res, next).catch(next);
  };
}

function formatIssues(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

/** Parses `data` with `schema`, throwing a 400 HttpError (with issue details) on failure. */
export function validate<S extends z.ZodType>(schema: S, data: unknown, message = "Invalid request payload"): z.infer<S> {
  const result = schema.safeParse(data ?? {});
  if (!result.success) {
    throw new HttpError(400, message, formatIssues(result.error));
  }
  return result.data;
}

/** Route/path parameter id: bounded, printable, no path tricks. */
export const idParam = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_.:-]+$/, "Invalid id");

export function validateId(value: unknown, what = "id"): string {
  return validate(idParam, value, `Invalid ${what}`);
}

/**
 * Serialises async work per key (e.g. per user id) inside this process, so read-modify-write
 * sequences such as "award XP on first accepted submission" cannot interleave.
 */
export class KeyedMutex {
  private readonly tails = new Map<string, Promise<void>>();

  async run<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(key) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const tail = previous.then(() => current);
    this.tails.set(key, tail);
    try {
      await previous;
      return await fn();
    } finally {
      release();
      if (this.tails.get(key) === tail) this.tails.delete(key);
    }
  }
}

export const userLocks = new KeyedMutex();
export const resourceLocks = new KeyedMutex();

/** Returns today's date as YYYY-MM-DD (UTC). */
export function todayUtc(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Resolves with `fallback` if `promise` does not settle within `ms` (the promise itself is left to settle). */
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    const value = JSON.parse(raw);
    return value === null || value === undefined ? fallback : (value as T);
  } catch {
    return fallback;
  }
}

export function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}
