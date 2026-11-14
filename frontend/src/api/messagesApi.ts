import { apiFetch } from "@/lib/api/client";
import type { Message } from "@/types";

export interface SendMessagePayload {
  text: string;
  channel?: string;
  automation?: boolean;
}

export interface SendMessageResponse {
  status: string;
  message_id: number;
  wa_url?: string;
  delivery_status: string;
}

export interface LogReplyPayload {
  raw_text: string;
  channel?: string;
  received_at?: string;
}

export interface LogReplyResponse {
  lead_id: number;
  created_count: number;
  suggestions: Array<{ category: string; text: string; tone: string }>;
}

export const messagesApi = {
  list: (leadId: number): Promise<Message[]> =>
    apiFetch<Message[]>(`/api/leads/${leadId}/messages`),

  append: (leadId: number, payload: Partial<Message>): Promise<Message> =>
    apiFetch<Message>(`/api/leads/${leadId}/messages`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  send: (leadId: number, payload: SendMessagePayload): Promise<SendMessageResponse> =>
    apiFetch<SendMessageResponse>(`/api/leads/${leadId}/messages/send`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  logReply: (leadId: number, payload: LogReplyPayload): Promise<LogReplyResponse> =>
    apiFetch<LogReplyResponse>(`/api/leads/${leadId}/messages/log-reply`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getReplySuggestions: (leadId: number): Promise<{ lead_id: number; suggestions: Array<{ category: string; text: string; tone: string }> }> =>
    apiFetch(`/api/leads/${leadId}/reply-suggestions`),
};
