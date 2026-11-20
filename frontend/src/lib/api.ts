export { env } from "@/config/env";
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export * from "@/types";
export * from "./apiClient";
export * from "./api/client";
