import { env } from "@/config/env";

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
}

export async function apiClient<T>(
  path: string,
  options?: RequestOptions
): Promise<T> {
  const url = `${env.NEXT_PUBLIC_API_BASE_URL}${path}`;
  const timeoutMs = options?.timeoutMs || 25000;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  const signal = options?.signal
    ? options.signal
    : controller.signal;

  try {
    // Auth token placeholder (for future JWT or cookie integration)
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options?.headers as Record<string, string> || {}),
    };

    const res = await fetch(url, {
      ...options,
      signal,
      headers,
    });

    clearTimeout(id);

    if (!res.ok) {
      let errMessage = `Request failed with HTTP ${res.status}`;
      let errData: unknown = null;
      try {
        const body = await res.json();
        errData = body;
        if (body.detail) {
          errMessage = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
        } else if (body.error?.message) {
          errMessage = body.error.message;
        }
      } catch {
        // Fall back to status text
      }
      throw new ApiError(errMessage, res.status, errData);
    }

    if (res.status === 204) {
      return {} as T;
    }

    return (await res.json()) as T;
  } catch (err: unknown) {
    clearTimeout(id);
    if (err instanceof ApiError) {
      throw err;
    }
    if (err instanceof Error) {
      if (err.name === "AbortError") {
        throw new ApiError("Request timed out or was aborted", 408);
      }
      throw new ApiError(err.message, 500);
    }
    throw new ApiError("Unknown network error", 500);
  }
}

// Backward-compatible alias for existing imports
export const apiFetch = apiClient;
