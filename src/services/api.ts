/**
 * Centralized API client for the Placify frontend.
 *
 * - Attaches `Authorization: Bearer <token>` to authenticated requests.
 * - Always returns a discriminated result (`ok: true` with typed data, or `ok: false` with an error message).
 * - A 2xx response that is not JSON is treated as an error (e.g. an HTML fallback page).
 * - Only a 401 from a request that actually carried the current token clears the session and notifies
 *   listeners registered with `onUnauthorized` (the auth provider logs the user out).
 * - Supports per-request timeouts and caller-provided AbortSignals.
 */

import type { MeResponse } from '../types';

const TOKEN_KEY = 'placify_auth_token';
const DEFAULT_TIMEOUT_MS = 10_000;

export function getStoredToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Storage unavailable (private mode / blocked); the session will last for this page only.
  }
}

export function removeStoredToken(): void {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Global unauthorized handling
// ---------------------------------------------------------------------------

type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

/** Registers a callback fired when an authenticated request is rejected with 401. Returns an unsubscribe fn. */
export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

function handleUnauthorized(sentToken: string): void {
  // Ignore stale 401s from a token that has since been replaced (e.g. the user logged in again).
  if (getStoredToken() !== sentToken) return;
  removeStoredToken();
  unauthorizedListeners.forEach((listener) => {
    try {
      listener();
    } catch (err) {
      console.error('Unauthorized listener failed:', err);
    }
  });
}

// ---------------------------------------------------------------------------
// Core fetch helper
// ---------------------------------------------------------------------------

export interface ApiOptions extends Omit<RequestInit, 'body' | 'headers'> {
  /** Request body. Strings/FormData are sent as-is; anything else is JSON-serialized. */
  body?: unknown;
  headers?: Record<string, string>;
  /** Abort the request after this many milliseconds (default 10s). */
  timeoutMs?: number;
  /** Attach the stored bearer token (default true). Set false for login/register. */
  auth?: boolean;
}

export interface ApiSuccess<T> {
  ok: true;
  status: number;
  data: T;
}

export interface ApiFailure {
  ok: false;
  /** HTTP status, or 0 for network errors / timeouts / cancellations. */
  status: number;
  error: string;
  details?: unknown;
  /** Parsed JSON error body, when the server sent one. */
  payload?: unknown;
  timedOut?: boolean;
  aborted?: boolean;
}

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function defaultErrorMessage(status: number): string {
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403) return 'You do not have permission to perform this action.';
  if (status === 404) return 'The requested resource was not found.';
  if (status === 409) return 'This action conflicts with the current state. Please refresh and try again.';
  if (status === 429) return 'Too many requests. Please wait a moment and try again.';
  if (status === 503) return 'This service is temporarily unavailable.';
  if (status >= 500) return `The server encountered an error (HTTP ${status}).`;
  return `Request failed (HTTP ${status}).`;
}

export async function apiFetch<T>(endpoint: string, options: ApiOptions = {}): Promise<ApiResult<T>> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    headers = {},
    auth = true,
    body,
    signal: externalSignal,
    ...rest
  } = options;

  // Read the token synchronously so callers can safely clear it right after starting a request.
  const token = auth ? getStoredToken() : null;

  const reqHeaders: Record<string, string> = { Accept: 'application/json', ...headers };
  let reqBody: BodyInit | undefined;
  if (body !== undefined) {
    if (typeof body === 'string' || body instanceof FormData) {
      reqBody = body;
    } else {
      reqBody = JSON.stringify(body);
    }
    if (!(body instanceof FormData) && !reqHeaders['Content-Type']) {
      reqHeaders['Content-Type'] = 'application/json';
    }
  }
  if (token) {
    reqHeaders.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const forwardAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener('abort', forwardAbort, { once: true });
  }

  try {
    const response = await fetch(endpoint, {
      ...rest,
      headers: reqHeaders,
      body: reqBody,
      signal: controller.signal,
    });

    const contentType = response.headers.get('content-type') ?? '';
    const isJson = contentType.includes('application/json');
    let payload: unknown = null;
    let parsed = false;
    if (isJson) {
      try {
        payload = await response.json();
        parsed = true;
      } catch {
        parsed = false;
      }
    } else {
      await response.text().catch(() => '');
    }

    if (!response.ok) {
      if (response.status === 401 && token) {
        handleUnauthorized(token);
      }
      const serverMessage =
        isRecord(payload) && typeof payload.error === 'string'
          ? payload.error
          : isRecord(payload) && typeof payload.message === 'string'
            ? payload.message
            : null;
      return {
        ok: false,
        status: response.status,
        error: serverMessage || defaultErrorMessage(response.status),
        details: isRecord(payload) ? payload.details : undefined,
        payload: payload ?? undefined,
      };
    }

    if (response.status === 204) {
      return { ok: true, status: 204, data: null as T };
    }

    if (!isJson || !parsed) {
      return {
        ok: false,
        status: response.status,
        error: 'The server returned an unexpected (non-JSON) response. Is the API server running?',
      };
    }

    return { ok: true, status: response.status, data: payload as T };
  } catch {
    if (timedOut) {
      return { ok: false, status: 0, error: 'The request timed out. Please try again.', timedOut: true };
    }
    if (externalSignal?.aborted) {
      return { ok: false, status: 0, error: 'Request cancelled.', aborted: true };
    }
    return { ok: false, status: 0, error: 'Network error: could not reach the Placify server.' };
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener('abort', forwardAbort);
  }
}

type MethodOptions = Omit<ApiOptions, 'method' | 'body'>;

/** Typed convenience wrappers around apiFetch. */
export const api = {
  get: <T>(endpoint: string, options?: MethodOptions) => apiFetch<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, body?: unknown, options?: MethodOptions) =>
    apiFetch<T>(endpoint, { ...options, method: 'POST', body }),
  put: <T>(endpoint: string, body?: unknown, options?: MethodOptions) =>
    apiFetch<T>(endpoint, { ...options, method: 'PUT', body }),
  delete: <T>(endpoint: string, options?: MethodOptions) => apiFetch<T>(endpoint, { ...options, method: 'DELETE' }),
};

/** Formats an API failure, including validation details when the server provides them. */
export function describeApiError(result: ApiFailure): string {
  const { details } = result;
  if (Array.isArray(details) && details.length > 0) {
    const parts = details
      .map((item) => {
        if (typeof item === 'string') return item;
        if (isRecord(item) && typeof item.message === 'string') {
          const path = Array.isArray(item.path) ? item.path.join('.') : typeof item.path === 'string' ? item.path : '';
          return path ? `${path}: ${item.message}` : item.message;
        }
        return null;
      })
      .filter((part): part is string => Boolean(part));
    if (parts.length > 0) return `${result.error} (${parts.join('; ')})`;
  }
  if (typeof details === 'string' && details.trim()) return `${result.error} (${details})`;
  return result.error;
}

/**
 * Rehydrates the current user from the stored token (GET /api/auth/me).
 * Never clears the token itself: only a 401 does (via apiFetch). Network errors, timeouts
 * and 5xx responses leave the token in place so the app can offer a retry.
 */
export async function getCurrentUserFromServer(): Promise<ApiResult<MeResponse>> {
  if (!getStoredToken()) {
    return { ok: false, status: 401, error: 'Not signed in.' };
  }
  return api.get<MeResponse>('/api/auth/me', { timeoutMs: 8000 });
}
