/**
 * Centralized API Fetch Helper for Placify Frontend
 * - Automatically attaches Authorization: Bearer <token>
 * - Enforces response.ok check and safe JSON parsing
 * - Provides consistent error handling and timeout support
 */

const TOKEN_KEY = "placify_auth_token";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export interface ApiOptions extends RequestInit {
  timeoutMs?: number;
}

export interface ApiResponse<T = any> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

export async function apiFetch<T = any>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  const { timeoutMs = 10000, headers = {}, ...restOptions } = options;

  const token = getStoredToken();
  const reqHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string>),
  };

  if (token) {
    reqHeaders["Authorization"] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      ...restOptions,
      headers: reqHeaders,
      signal: controller.signal,
    });
    clearTimeout(timer);

    let parsedData: any = null;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      parsedData = await response.json().catch(() => null);
    } else {
      const text = await response.text().catch(() => "");
      parsedData = text ? { message: text } : null;
    }

    if (!response.ok) {
      const errorMessage =
        (parsedData && (parsedData.error || parsedData.message)) ||
        `HTTP Error ${response.status}`;
      return {
        ok: false,
        status: response.status,
        error: errorMessage,
        data: parsedData,
      };
    }

    return {
      ok: true,
      status: response.status,
      data: parsedData as T,
    };
  } catch (err: any) {
    clearTimeout(timer);
    const errorMsg =
      err.name === "AbortError"
        ? "Request timed out. Please try again."
        : err.message || "Network request failed.";
    return {
      ok: false,
      status: 0,
      error: errorMsg,
    };
  }
}

/**
 * Rehydrates current user profile from server using stored token (/api/auth/me)
 */
export async function getCurrentUserFromServer(): Promise<ApiResponse<{ success: boolean; user: any }>> {
  const token = getStoredToken();
  if (!token) {
    return { ok: false, status: 401, error: "No stored auth token" };
  }
  const result = await apiFetch<{ success: boolean; user: any }>("/api/auth/me", {
    method: "GET",
  });
  if (!result.ok) {
    removeStoredToken();
  }
  return result;
}
