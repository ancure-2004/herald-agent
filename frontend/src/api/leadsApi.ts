import { apiFetch } from "@/lib/api/client";
import type { CopilotSuggestion, Lead } from "@/types";

export interface ListLeadsParams {
  hustle_id?: number;
  stage_slug?: string;
  smart_view?: string;
  include_archived?: boolean;
  search?: string;
  status?: string;
}

export const leadsApi = {
  list: (params?: ListLeadsParams): Promise<Lead[]> => {
    const q = new URLSearchParams();
    if (params?.hustle_id !== undefined) q.set("hustle_id", String(params.hustle_id));
    if (params?.stage_slug) q.set("stage_slug", params.stage_slug);
    if (params?.smart_view) q.set("smart_view", params.smart_view);
    if (params?.include_archived !== undefined) q.set("include_archived", String(params.include_archived));
    if (params?.search) q.set("search", params.search);
    if (params?.status) q.set("status", params.status);
    const qs = q.toString();
    return apiFetch<Lead[]>(`/api/leads${qs ? `?${qs}` : ""}`);
  },

  get: (id: number): Promise<Lead> => apiFetch<Lead>(`/api/leads/${id}`),

  create: (payload: Partial<Lead>): Promise<Lead> =>
    apiFetch<Lead>("/api/leads", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  update: (id: number, payload: Partial<Lead>): Promise<Lead> =>
    apiFetch<Lead>(`/api/leads/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  approveSend: (id: number, channel = "whatsapp"): Promise<Lead> =>
    apiFetch<Lead>(`/api/leads/${id}/approve-send`, {
      method: "POST",
      body: JSON.stringify({ channel }),
    }),

  getReplyCopilot: (id: number): Promise<CopilotSuggestion[]> =>
    apiFetch<CopilotSuggestion[]>(`/api/leads/${id}/reply-copilot`),

  getRecordingStatus: (id: number): Promise<{ has_recording: boolean; size_mb?: number }> =>
    apiFetch<{ has_recording: boolean; size_mb?: number }>(`/api/leads/${id}/recording/status`),
};
