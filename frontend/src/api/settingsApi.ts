import { apiFetch } from "@/lib/api/client";
import type { Hustle } from "@/types";

export interface AutomationSettings {
  automation_enabled?: boolean;
  min_delay_seconds?: number;
  max_delay_seconds?: number;
  batch_size?: number;
  mode?: string;
  [key: string]: unknown;
}

export interface AISettings {
  provider: "auto" | "local_cli" | "gemini" | "groq";
  gemini_api_key?: string;
  groq_api_key?: string;
  has_gemini_key: boolean;
  has_groq_key: boolean;
  has_local_cli: boolean;
}

export interface AITestResponse {
  ok: boolean;
  provider: string;
  model?: string;
  message: string;
  sample_response?: unknown;
}

export const settingsApi = {
  getAutomation: (): Promise<AutomationSettings> =>
    apiFetch<AutomationSettings>("/api/settings/automation"),

  updateAutomation: (payload: Partial<AutomationSettings>): Promise<AutomationSettings> =>
    apiFetch<AutomationSettings>("/api/settings/automation", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  getAISettings: (): Promise<AISettings> =>
    apiFetch<AISettings>("/api/settings/ai"),

  updateAISettings: (payload: {
    provider?: string;
    gemini_api_key?: string;
    groq_api_key?: string;
  }): Promise<AISettings> =>
    apiFetch<AISettings>("/api/settings/ai", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  testAIConnection: (payload?: {
    provider?: string;
    api_key?: string;
  }): Promise<AITestResponse> =>
    apiFetch<AITestResponse>("/api/ai/test", {
      method: "POST",
      body: JSON.stringify(payload || {}),
    }),

  listHustles: (): Promise<Hustle[]> =>
    apiFetch<Hustle[]>("/api/hustles"),

  updateHustle: (id: number, payload: Partial<Hustle>): Promise<Hustle> =>
    apiFetch<Hustle>(`/api/hustles/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  setDayMode: (mode: string, hustleId?: number): Promise<{ ok: boolean; mode: string }> =>
    apiFetch<{ ok: boolean; mode: string }>("/api/schedule/day-mode", {
      method: "POST",
      body: JSON.stringify({ mode, ...(hustleId !== undefined ? { hustle_id: hustleId } : {}) }),
    }),
};
