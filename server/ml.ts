/**
 * Client for the Python ML microservice (ml_service/). Every call carries the shared
 * X-API-Key header; failures are returned as { ok: false } so callers can fall back.
 */

import { config } from "./config";

export type MLResult<T> = { ok: true; data: T } | { ok: false; error: string; status?: number };

let lastWarnAt = 0;

function warn(message: string) {
  // Avoid flooding the log when the ML service is simply not running.
  const now = Date.now();
  if (now - lastWarnAt > 30_000) {
    lastWarnAt = now;
    console.warn(`[ml] ${message}`);
  }
}

export async function callMLService<T = unknown>(
  endpoint: string,
  options: { method?: "GET" | "POST"; body?: unknown; timeoutMs?: number } = {}
): Promise<MLResult<T>> {
  const { method = "POST", body, timeoutMs = 5000 } = options;
  const url = `${config.mlServiceUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
  try {
    const response = await fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        "X-API-Key": config.internalApiKey,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      warn(`${method} ${endpoint} -> HTTP ${response.status} ${text.slice(0, 200)}`);
      return { ok: false, status: response.status, error: `ML service returned HTTP ${response.status}` };
    }
    const data = (await response.json()) as T;
    return { ok: true, data };
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    const message = name === "TimeoutError" || name === "AbortError" ? "request timed out" : "ML service unreachable";
    warn(`${method} ${endpoint} failed: ${message}`);
    return { ok: false, error: message };
  }
}

export interface MLHealth {
  status: string;
  models?: Record<string, boolean>;
}

export async function getMLHealth(): Promise<MLResult<MLHealth>> {
  return callMLService<MLHealth>("/health", { method: "GET", timeoutMs: 2000 });
}
