/**
 * Optional Google Gemini integration. Disabled (all helpers return null) when GEMINI_API_KEY is empty.
 * Every call is bounded by a timeout and failures are logged, never thrown to the caller.
 */

import { GoogleGenAI, type Schema } from "@google/genai";
import { config } from "./config";

const client = config.geminiApiKey ? new GoogleGenAI({ apiKey: config.geminiApiKey }) : null;

export const aiEnabled = client !== null;

async function generate(
  label: string,
  prompt: string,
  timeoutMs: number,
  jsonSchema?: Schema
): Promise<string | null> {
  if (!client) return null;
  const controller = new AbortController();
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve(null);
    }, timeoutMs);
  });
  const request = client.models
    .generateContent({
      model: config.geminiModel,
      contents: prompt,
      config: {
        abortSignal: controller.signal,
        ...(jsonSchema ? { responseMimeType: "application/json", responseSchema: jsonSchema } : {}),
      },
    })
    .then((res) => res.text ?? null)
    .catch((err: unknown) => {
      if (!controller.signal.aborted) {
        console.warn(`[ai] ${label} failed: ${err instanceof Error ? err.message : String(err)}`);
      }
      return null;
    });
  try {
    const text = await Promise.race([request, timeout]);
    if (text === null && controller.signal.aborted) {
      console.warn(`[ai] ${label} timed out after ${timeoutMs}ms`);
    }
    return text && text.trim() ? text : null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function generateText(label: string, prompt: string, timeoutMs: number): Promise<string | null> {
  return generate(label, prompt, timeoutMs);
}

/** Returns the parsed JSON object, or null when AI is disabled, times out, or returns invalid JSON. */
export async function generateJson<T>(label: string, prompt: string, schema: Schema, timeoutMs: number): Promise<T | null> {
  const text = await generate(label, prompt, timeoutMs, schema);
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    console.warn(`[ai] ${label} returned invalid JSON`);
    return null;
  }
}
