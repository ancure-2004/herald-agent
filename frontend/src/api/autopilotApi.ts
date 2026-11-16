import { apiFetch } from "@/lib/api/client";
import type { RunLog } from "@/types";

export interface AutopilotStatusResponse {
  is_running: boolean;
  active_task: string | null;
  [key: string]: unknown;
}

export interface StopAutopilotResponse {
  status?: string;
  stopped?: boolean;
  run_id?: number | null;
  detail?: string;
}

export interface AutopilotDiscoverResponse {
  status: string;
  run_id?: number;
  newly_staged_count?: number;
  total_staged_count?: number;
  staging_ceiling?: number;
  locality?: string;
  waterfall_stats?: Record<string, unknown>;
  testing_mode?: boolean;
  async?: boolean;
  message?: string;
}

export interface AutopilotBuildBatchResponse {
  status: string;
  batch_size?: number;
  built_count?: number;
  failed_count?: number;
  remaining_staged_count?: number;
  testing_mode?: boolean;
  built_leads?: unknown[];
  failed_leads?: unknown[];
  async?: boolean;
  message?: string;
}

export interface ScoutRunResponse {
  discovered_new: number;
  enriched_leads: number;
  trace_logs: string[];
}

export interface AuditorRunResponse {
  verified_links_count: number;
  attached_videos_count: number;
  video_files?: string[];
  recorder_log?: string;
}

export interface CloserRunPayload {
  hustle_id: number;
  channel: "whatsapp" | "instagram" | "email";
  dry_run: boolean;
  clinic_id?: number;
  batch_id?: string;
}

export interface CloserRunResponse {
  channel: string;
  dry_run: boolean;
  drafted_hot_followups: number;
  dispatch_log: string;
}

export const autopilotApi = {
  getStatus: (hustleId = 1): Promise<AutopilotStatusResponse> =>
    apiFetch<AutopilotStatusResponse>(`/api/autopilot/status?hustle_id=${hustleId}`),

  getCockpitState: (hustleId = 1): Promise<{ is_running: boolean; active_task: string | null; [key: string]: unknown }> =>
    apiFetch<{ is_running: boolean; active_task: string | null; [key: string]: unknown }>(`/api/autopilot/cockpit-state?hustle_id=${hustleId}`),

  stop: (): Promise<StopAutopilotResponse> =>
    apiFetch<StopAutopilotResponse>("/api/autopilot/stop", { method: "POST" }),

  listRuns: (hustleId = 1): Promise<RunLog[]> =>
    apiFetch<RunLog[]>(`/api/runs?hustle_id=${hustleId}`),

  discover: (payload?: Record<string, unknown>): Promise<AutopilotDiscoverResponse> =>
    apiFetch<AutopilotDiscoverResponse>("/api/autopilot/discover", {
      method: "POST",
      body: JSON.stringify(payload || {}),
    }),

  buildBatch: (payload?: Record<string, unknown>): Promise<AutopilotBuildBatchResponse> =>
    apiFetch<AutopilotBuildBatchResponse>("/api/autopilot/build-batch", {
      method: "POST",
      body: JSON.stringify(payload || {}),
    }),

  runScoutAgent: (payload: { hustle_id: number; batch_size?: number }): Promise<ScoutRunResponse> =>
    apiFetch<ScoutRunResponse>("/api/agents/scout/run", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  runAuditorAgent: (payload: { hustle_id: number; record_video?: boolean }): Promise<AuditorRunResponse> =>
    apiFetch<AuditorRunResponse>("/api/agents/auditor/run", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  runCloserAgent: (payload: CloserRunPayload): Promise<CloserRunResponse> =>
    apiFetch<CloserRunResponse>("/api/agents/closer/run", {
      method: "POST",
      timeoutMs: 3600000,
      body: JSON.stringify(payload),
    }),

  triggerRefill: (payload: {
    hustle_id: number;
    batch_size: number;
    testing_mode: boolean;
    locality?: string;
  }): Promise<{ run_id: number; message: string; trace_logs?: string[] }> =>
    apiFetch<{ run_id: number; message: string; trace_logs?: string[] }>("/api/autopilot/trigger-refill", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  syncBatchLinks: (hustleId?: number): Promise<{ verified: number; total: number }> =>
    apiFetch<{ verified: number; total: number }>("/api/packages/sync-batch-json", {
      method: "POST",
      ...(hustleId !== undefined ? { body: JSON.stringify({ hustle_id: hustleId }) } : {}),
      timeoutMs: 300000,
    }),

  rebalanceBatches: (hustleId = 1, force = true): Promise<{ ok: boolean; [key: string]: unknown }> =>
    apiFetch<{ ok: boolean; [key: string]: unknown }>(
      `/api/batch/rebalance?hustle_id=${hustleId}&force_rebatch=${force}`,
      { method: "POST" }
    ),

  retryRecordings: (payload?: {
    hustle_id?: number;
    batch_id?: string;
    testing_mode?: boolean;
    async_mode?: boolean;
  }): Promise<{ status: string; retried_count: number; succeeded_count: number; failed_count: number }> =>
    apiFetch<{ status: string; retried_count: number; succeeded_count: number; failed_count: number }>(
      "/api/autopilot/retry-recordings",
      {
        method: "POST",
        body: JSON.stringify(payload || {}),
        timeoutMs: 3600000,
      }
    ),

  verifyLinks: (): Promise<{ verified_count: number; failed_count: number; total: number; verified_items: any[]; failed_items: any[] }> =>
    apiFetch<{ verified_count: number; failed_count: number; total: number; verified_items: any[]; failed_items: any[] }>(
      "/api/autopilot/verify-links",
      {
        method: "POST",
        timeoutMs: 300000,
      }
    ),
};
