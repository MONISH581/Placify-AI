/**
 * Safe wrappers around Web Storage. Storage can be unavailable (private mode, blocked site data,
 * quota exceeded), so every access is guarded and failures degrade to in-memory behaviour.
 */

export function readSessionJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.sessionStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeSessionJSON(key: string, value: unknown): void {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore: buffers simply won't survive a reload.
  }
}

export function readSessionString(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeSessionString(key: string, value: string): void {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // ignore
  }
}
