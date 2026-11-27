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
  channel_limits: Record<string, any>;
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
  status?: string;
  is_lost?: boolean;
  is_won?: boolean;
  stage_slug?: string;
  stage_name?: string;
  needs_followup?: boolean;
  next_followup_at?: string | null;
  automation_enabled?: boolean;
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
  channel_limits: Record<string, any>;
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

export interface StructuredBuiltLead {
  id: number;
  name: string;
  slug: string;
  doctor: string;
  locality: string;
  phone: string;
  email?: string | null;
  fit_score: number;
  source_tier: string;
  choice_url?: string;
  demo_url?: string;
  verified_live?: boolean;
  http_200?: boolean;
  video_attached?: boolean;
}

export interface StructuredDroppedItem {
  name: string;
  reason: string;
  detail: string;
  tier: string;
}

export interface StructuredRunData {
  tiers_used?: string[];
  instagram_discovery_enabled?: boolean;
  built_leads?: StructuredBuiltLead[];
  dropped_items?: StructuredDroppedItem[];
  drop_counts?: Record<string, number>;
  verified_in_batch_json?: number;
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
  drop_reasons: Record<string, unknown> & { _structured?: StructuredRunData };
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

export type MainTab = "dashboard" | "board" | "table" | "sprint" | "autopilot" | "settings";

// Re-export cockpit types for centralized import
export type {
  NodeStatus,
  PipelineStepEvent,
  CockpitStateResponse,
  NodeInspectionData,
  BatchRunMetrics,
  OutreachLogEntry,
  DeliverabilityStatus,
  VerificationDetails,
  EnrichmentState,
  LeadEnrichment,
  DiscoveryLead,
  RunStatus,
  LogLevel,
  TemplateId,
  ClinicLeadRef,
  BuildStage,
  LogEntry,
  PreviewConfig,
  DemoRun,
  BatchJob,
  QueueItemStatus,
  PriorityLevel,
  QueueItem,
  DailyCapacityMetrics,
  MailboxAccount,
  DispatchEngineSettings,
} from "@/features/cockpit/types";
