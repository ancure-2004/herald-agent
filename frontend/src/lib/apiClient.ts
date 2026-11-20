import { env } from "@/config/env";
import { z } from "zod";

/**
 * Structured backend error envelope matching the backend's uniform error schema:
 * { error: { code, message, request_id, details } }
 */
export interface BackendErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
    request_id?: string;
    details?: unknown;
  };
  detail?: string | unknown;
}

/**
 * Enhanced ApiError with structured error fields (code, request_id, details).
 */
export class ApiError extends Error {
  status: number;
  code?: string;
  requestId?: string;
  details?: unknown;
  data?: unknown;

  constructor(
    message: string,
    status: number,
    data?: unknown,
    code?: string,
    requestId?: string,
    details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    this.code = code;
    this.requestId = requestId;
    this.details = details;
  }
}

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  skipDedupe?: boolean;
  disableCache?: boolean;
  requestId?: string;
  validate?: (data: unknown) => unknown;
}

interface CacheEntry {
  etag: string;
  data: unknown;
  timestamp: number;
}

// In-memory SWR / ETag client cache
const etagCache = new Map<string, CacheEntry>();

// In-flight GET request deduplication map
const inFlightRequests = new Map<string, Promise<unknown>>();

/**
 * Generate a unique client request ID for tracing and error correlation.
 */
export function generateRequestId(): string {
  const rand = Math.random().toString(36).substring(2, 10);
  const time = Date.now().toString(36);
  return `req-${time}-${rand}`;
}

/**
 * Clear the client-side ETag / SWR cache.
 */
export function clearApiCache(): void {
  etagCache.clear();
}

/**
 * Invalidate cached entries matching a specific URL prefix.
 */
export function invalidateCachePrefix(prefix: string): void {
  for (const key of etagCache.keys()) {
    if (key.includes(prefix)) {
      etagCache.delete(key);
    }
  }
}

/**
 * Lightweight client-side input validation helpers to reject invalid payloads
 * before dispatching network requests.
 */
export const validators = {
  /**
   * Basic validation for lead payloads.
   */
  lead: (data: unknown): unknown => {
    if (!data || typeof data !== "object") {
      throw new ApiError("Lead payload must be a non-null object", 422, null, "VALIDATION_ERROR");
    }
    const d = data as Record<string, unknown>;
    if ("name" in d && (typeof d.name !== "string" || !d.name.trim())) {
      throw new ApiError("Lead name cannot be empty", 422, null, "VALIDATION_ERROR");
    }
    if ("primary_phone" in d && d.primary_phone !== null && typeof d.primary_phone !== "string") {
      throw new ApiError("Lead primary_phone must be a string or null", 422, null, "VALIDATION_ERROR");
    }
    return data;
  },

  /**
   * Basic validation for message payloads.
   */
  message: (data: unknown): unknown => {
    if (!data || typeof data !== "object") {
      throw new ApiError("Message payload must be a non-null object", 422, null, "VALIDATION_ERROR");
    }
    const d = data as Record<string, unknown>;
    if (!d.text || typeof d.text !== "string" || !d.text.trim()) {
      throw new ApiError("Message text cannot be empty", 422, null, "VALIDATION_ERROR");
    }
    return data;
  },

  /**
   * Basic validation for job payloads.
   */
  job: (data: unknown): unknown => {
    if (!data || typeof data !== "object") {
      throw new ApiError("Job payload must be a non-null object", 422, null, "VALIDATION_ERROR");
    }
    return data;
  },

  /**
   * Generic schema validator leveraging Zod schemas.
   */
  schema: <T>(schema: z.ZodType<T>, data: unknown): T => {
    const result = schema.safeParse(data);
    if (!result.success) {
      const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
      throw new ApiError(`Validation failed: ${issues}`, 422, result.error.format(), "VALIDATION_ERROR");
    }
    return result.data;
  },
};

/**
 * Execute a single HTTP request with timeout, ETag caching, and error envelope parsing.
 */
async function executeRequest<T>(
  fullUrl: string,
  options?: RequestOptions,
  requestId?: string
): Promise<T> {
  const timeoutMs = options?.timeoutMs ?? 25000;
  const isGet = !options?.method || options.method.toUpperCase() === "GET";
  const reqId = requestId || options?.requestId || generateRequestId();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  if (options?.signal) {
    if (options.signal.aborted) {
      controller.abort();
    } else {
      options.signal.addEventListener("abort", () => controller.abort(), { once: true });
    }
  }

  // Pre-validate body if validator provided
  if (options?.validate && options?.body) {
    try {
      const parsedBody = typeof options.body === "string" ? JSON.parse(options.body) : options.body;
      options.validate(parsedBody);
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof ApiError) throw err;
      throw new ApiError(
        `Pre-validation error: ${err instanceof Error ? err.message : String(err)}`,
        422,
        null,
        "VALIDATION_ERROR"
      );
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Request-ID": reqId,
    ...(options?.headers as Record<string, string> || {}),
  };

  // ETag support: send If-None-Match if we have a cached version
  const cacheKey = fullUrl;
  if (isGet && !options?.disableCache) {
    const cached = etagCache.get(cacheKey);
    if (cached?.etag) {
      headers["If-None-Match"] = cached.etag;
    }
  }

  try {
    const res = await fetch(fullUrl, {
      ...options,
      signal: controller.signal,
      headers,
    });

    clearTimeout(timer);

    // 304 Not Modified: return cached data
    if (res.status === 304 && isGet) {
      const cached = etagCache.get(cacheKey);
      if (cached) {
        return cached.data as T;
      }
    }

    if (!res.ok) {
      let errMessage = `Request failed with HTTP ${res.status}`;
      let errCode: string | undefined = undefined;
      let errRequestId: string | undefined = res.headers.get("x-request-id") || reqId;
      let errDetails: unknown = undefined;
      let errData: unknown = null;

      try {
        const body = (await res.json()) as BackendErrorEnvelope;
        errData = body;
        if (body?.error) {
          if (body.error.message) errMessage = body.error.message;
          if (body.error.code) errCode = body.error.code;
          if (body.error.request_id) errRequestId = body.error.request_id;
          if (body.error.details) errDetails = body.error.details;
        } else if (body?.detail) {
          errMessage = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
        }
      } catch {
        if (res.statusText) {
          errMessage = res.statusText;
        }
      }

      throw new ApiError(errMessage, res.status, errData, errCode, errRequestId, errDetails);
    }

    if (res.status === 204) {
      return {} as T;
    }

    const data = (await res.json()) as T;

    // Cache ETag if present on successful GET
    if (isGet && !options?.disableCache) {
      const etag = res.headers.get("ETag") || res.headers.get("etag");
      if (etag) {
        etagCache.set(cacheKey, {
          etag,
          data,
          timestamp: Date.now(),
        });
      }
    }

    // Invalidate related cache on mutating operations (POST, PUT, PATCH, DELETE)
    if (!isGet) {
      const basePath = fullUrl.split("?")[0];
      invalidateCachePrefix(basePath);
    }

    return data;
  } catch (err: unknown) {
    clearTimeout(timer);
    if (err instanceof ApiError) {
      throw err;
    }
    if (err instanceof Error) {
      if (err.name === "AbortError") {
        throw new ApiError("Request timed out or was aborted", 408, null, "TIMEOUT_ERROR", reqId);
      }
      throw new ApiError(err.message, 500, null, "NETWORK_ERROR", reqId);
    }
    throw new ApiError("Unknown network error", 500, null, "UNKNOWN_ERROR", reqId);
  }
}

/**
 * Centralized fetch interceptor with base URL, timeout, request-ID propagation,
 * structured error parsing, in-flight GET deduplication, and SWR/ETag caching.
 */
export async function apiClient<T>(
  path: string,
  options?: RequestOptions
): Promise<T> {
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("http://") || path.startsWith("https://")
    ? path
    : `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  const isGet = !options?.method || options.method.toUpperCase() === "GET";

  // In-flight GET request deduplication
  if (isGet && !options?.skipDedupe) {
    const dedupeKey = `GET:${normalizedPath}`;
    const existing = inFlightRequests.get(dedupeKey);
    if (existing) {
      return existing as Promise<T>;
    }

    const promise = (async () => {
      try {
        return await executeRequest<T>(normalizedPath, options);
      } finally {
        inFlightRequests.delete(dedupeKey);
      }
    })();

    inFlightRequests.set(dedupeKey, promise);
    return promise;
  }

  return executeRequest<T>(normalizedPath, options);
}

// Backward-compatible alias for existing callers
export const apiFetch = apiClient;
