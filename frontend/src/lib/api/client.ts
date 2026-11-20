/**
 * Re-export centralized apiClient from lib/apiClient for backward compatibility.
 */
export * from "../apiClient";
export {
  apiClient,
  apiFetch,
  ApiError,
  validators,
  clearApiCache,
  invalidateCachePrefix,
  generateRequestId,
} from "../apiClient";
export type { RequestOptions, BackendErrorEnvelope } from "../apiClient";
