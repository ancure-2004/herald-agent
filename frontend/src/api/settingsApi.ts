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

export const settingsApi = {
  getAutomation: (): Promise<AutomationSettings> =>
    apiFetch<AutomationSettings>("/api/settings/automation"),

  updateAutomation: (payload: Partial<AutomationSettings>): Promise<AutomationSettings> =>
    apiFetch<AutomationSettings>("/api/settings/automation", {
      method: "PATCH",
      body: JSON.stringify(payload),
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
