export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Stage {
  id: number;
  hustle_id: number;
  slug: string;
  name: string;
  order: number;
  color: string;
  is_won: boolean;
  is_lost: boolean;
}

export interface SmartView {
  id: number;
  hustle_id: number;
  slug: string;
  name: string;
  icon: string;
  filter_spec: Record<string, unknown>;
  sort_order: number;
  is_pinned: boolean;
}

export interface Hustle {
  id: number;
  slug: string;
  name: string;
  description: string;
  proof_asset_type: string;
  search_query: string;
  pipeline_steps: string[];
  allowed_channels: string[];
  channel_limits: Record<string, number>;
  channel_goals: Record<string, number>;
  minimum_stock_days: number;
  ai_field_questions: Array<{ key: string; question: string }>;
  custom_field_defs: Array<{ key: string; label: string; type: string }>;
  autonomy_mode: "copilot" | "autopilot";
  deal_value_inr: number;
  is_active: boolean;
  stages: Stage[];
  smart_views: SmartView[];
}

export interface LeadFact {
  id: number;
  lead_id: number;
  field: string;
  value: string;
  source: string;
  confidence: number;
  verified_by_two_sources: boolean;
  checked_at: string;
}

export interface Package {
  id: number;
  lead_id: number;
  version: number;
  asset_links: Record<string, string>;
  video_file_path: string;
  video_size_mb: number;
  clinic_payload: Record<string, unknown>;
  quality_score: number;
  self_check_passed: boolean;
  self_check_report: Record<string, boolean>;
  status: string;
  sent_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface Message {
  id: number;
  lead_id: number;
  channel: string;
  direction: "outbound" | "inbound" | "internal_note";
  text: string;
  template_used: string;
  ai_label: string;
  created_at: string;
}

export interface TrackingEvent {
  id: number;
  lead_id: number;
  package_id: number | null;
  event_type: string;
  section: string;
  design_chosen: string;
  duration_seconds: number;
  is_bot: boolean;
  created_at: string;
}

export interface Commitment {
  id: number;
  lead_id: number;
  who_owes_it: string;
  what: string;
  raw_phrase: string;
  due_at: string;
  status: string;
  created_at: string;
}

export interface Lead {
  id: number;
  hustle_id: number;
  stage_id: number;
  slug: string;
  name: string;
  doctor_name: string;
  locality: string;
  city: string;
  address: string;
  primary_phone: string | null;
  phones: string[];
  email: string | null;
  instagram_handle: string | null;
  preferred_channel: string;
  fit_score: number;
  fit_reasons: string[];
  intent_score: number;
  intent_reasons: string[];
  next_action: string | null;
  next_action_due_at: string | null;
  do_not_contact: boolean;
  do_not_contact_reason: string;
  is_archived: boolean;
  archive_reason: string;
  custom_fields: Record<string, string>;
  ai_fields: Record<string, unknown>;
  what_changed_summary: string;
  deal_value_inr: number;
  created_at: string;
  updated_at: string;
  facts: LeadFact[];
  packages: Package[];
  messages: Message[];
  events: TrackingEvent[];
  commitments: Commitment[];
}

export interface StockPlan {
  hustle_id: number;
  hustle_name: string;
  daily_send_goal: number;
  minimum_stock_days: number;
  upcoming_away_or_off_days: number;
  effective_buffer_days: number;
  required_ready_packages: number;
  current_ready_packages: number;
  shortfall: number;
  needs_refill: boolean;
  upcoming_schedule: Array<{ date: string; mode: string }>;
  today_channel_sends: Record<string, number>;
  channel_limits: Record<string, number>;
  channel_goals: Record<string, number>;
}

export interface SprintTask {
  lead_id: number;
  lead_name: string;
  doctor_name: string;
  locality: string;
  stage: string;
  action_type: string;
  next_action: string;
  estimated_minutes: number;
  fit_score: number;
  intent_score: number;
  expected_value_inr: number;
  priority_score: number;
}

export interface SprintPlan {
  budget_minutes: number;
  allocated_minutes: number;
  total_expected_value_inr: number;
  tasks: SprintTask[];
}

export interface RunLog {
  id: number;
  hustle_id: number;
  job_id: number | null;
  job_type: string;
  status: string;
  count_found: number;
  count_passed: number;
  count_dropped: number;
  drop_reasons: Record<string, number>;
  errors: string[];
  trace_logs: string[];
  started_at: string;
  finished_at: string | null;
}

export interface CopilotSuggestion {
  objection_label: string;
  lang: string;
  wins: number;
  text: string;
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    let errDetail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body.detail) errDetail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch {
      // ignore
    }
    throw new Error(errDetail);
  }
  return res.json();
}
