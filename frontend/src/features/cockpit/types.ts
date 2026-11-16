// ============================================================================
// AUTOPILOT COCKPIT DATA CONTRACTS & INTERFACES
// ============================================================================

// ----------------------------------------------------------------------------
// Legacy Contracts (Preserved for CRMContext and useSSE compatibility)
// ----------------------------------------------------------------------------
export type NodeStatus = "IDLE" | "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED" | "WAITING_FOR_REVIEW";

export interface PipelineStepEvent {
  type: "pipeline_step";
  node_id: "node-1" | "node-2" | "node-3" | "node-4" | "node-5" | "node-6";
  step_name: "DISCOVERY" | "VERIFICATION" | "RESEARCH" | "SCAFFOLD" | "WALKTHROUGH" | "REVIEW_TRAY";
  status: NodeStatus;
  clinic_name?: string;
  latency_ms?: number;
  metrics?: {
    processed?: number;
    total?: number;
    badge_text?: string;
  };
  payload?: Array<Record<string, unknown>> | Record<string, unknown>;
  error?: {
    hasError: boolean;
    message?: string;
    exceptionName?: string;
  } | null;
  timestamp: string;
}

export interface CockpitStateResponse {
  is_running: boolean;
  current_run_id: number | null;
  active_node_id: string | null;
  nodes: NodeInspectionData[];
  metrics: BatchRunMetrics;
}

export interface NodeInspectionData {
  id: number;
  stepNumber: number;
  name: string;
  title: string;
  subtitle: string;
  tools: string;
  status: NodeStatus;
  badge: string;
  progressText: string;
  logicDescription: string;
  duration?: string;
  startedAt?: string;
  payload: Array<Record<string, unknown>>;
  error: {
    hasError: boolean;
    exceptionName?: string;
    message?: string;
    httpCode?: number | string;
    lineNumber?: number;
    traceSnippet?: string;
  } | null;
}

export interface BatchRunMetrics {
  runId: string;
  triggeredAgo: string;
  status: "IN_PROGRESS" | "COMPLETED" | "FAILED";
  targetRequested: number;
  candidateFound: number;
  verifiedNoSite: number;
  droppedCount: number;
  enrichedDossiers: number;
  demosBuilt: number;
  reviewTrayReady: number;
  stagedPoolCount?: number;
  stagedCeiling?: number;
  duration: string;
  recentLead: {
    id: number;
    name: string;
    doctor: string;
    locality: string;
    phone: string;
    fitScore: number;
    previewLinks: {
      modern: string;
      warm: string;
      lux: string;
    };
  };
}

export interface OutreachTelemetryState {
  whatsapp: {
    status: "ACTIVE" | "PAUSED" | "LIMIT_REACHED";
    windowState: string;
    sentToday: number;
    dailyLimit: number;
    pacingDelay: string;
    currentTarget: {
      name: string;
      doctor: string;
      phone: string;
      action: string;
      demoSlug: string;
    };
  };
  email: {
    status: "ACTIVE" | "WARMING" | "PAUSED";
    domainWarmup: string;
    sentToday: number;
    dailyLimit: number;
    pacingDelay: string;
    currentTarget: {
      name: string;
      doctor: string;
      email: string;
      action: string;
      choicePage: string;
    };
  };
  instagram: {
    status: "STANDBY" | "TRIGGERED" | "OFF";
    protocolRule: string;
    sentToday: number;
    dailyLimit: number;
    lastTriggerReason: string;
    fallbackLead: {
      name: string;
      handle: string;
      action: string;
      videoAttached: boolean;
    };
  };
}

export interface OutreachLogEntry {
  id: string;
  timestamp: string;
  channel: "WA" | "EMAIL" | "IG" | "FALLBACK" | "DB" | "SYSTEM";
  level: "info" | "success" | "warn" | "error";
  message: string;
  meta?: Record<string, unknown>;
}

// ----------------------------------------------------------------------------
// TAB 1: Lead Discovery & Verification Models (Clay Pattern)
// ----------------------------------------------------------------------------
export type DeliverabilityStatus = "deliverable" | "risky" | "invalid" | "pending";

export interface VerificationDetails {
  status: DeliverabilityStatus;
  confidenceScore: number; // 0 - 100
  smtpCheck: "passed" | "failed" | "timeout";
  mxRecordValid: boolean;
  mxHost: string;
  isCatchAll: boolean;
  isDisposable: boolean;
  isRoleAccount: boolean;
  isFreeProvider: boolean;
  verifiedAt: string; // ISO 8601 UTC
  provider: "Debounce" | "Hunter" | "ZeroBounce" | "CustomSMTP";
}

export type EnrichmentState = "idle" | "queued" | "running" | "success" | "failed";

export interface LeadEnrichment {
  state: EnrichmentState;
  provider?: string;
  lastUpdated?: string;
  errorMessage?: string;
  techStack?: string[];
  headcount?: string;
  annualRevenue?: string;
  decisionMakerTitle?: string;
  linkedinUrl?: string;
}

export interface DiscoveryLead {
  id: string;
  companyName: string;
  companyWebsite: string;
  companyDomain: string;
  faviconUrl?: string;
  contactName: string;
  contactTitle: string;
  contactEmail: string;
  phone?: string;
  verification: VerificationDetails;
  enrichment: LeadEnrichment;
  industry: string;
  location: string;
  tags: string[];
  demoReady: boolean;
  createdAt: string;
}

// ----------------------------------------------------------------------------
// TAB 2: Demo Factory & Build Log Models (Trigger.dev / Vercel Pattern)
// ----------------------------------------------------------------------------
export type RunStatus =
  | "QUEUED"
  | "SCAFFOLDING"
  | "BUILDING"
  | "DEPLOYING"
  | "READY"
  | "FAILED"
  | "CANCELED";

export type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

export type TemplateId =
  | "clinical-modern"
  | "boutique-aesthetic"
  | "high-tech-surgical"
  | "pediatric-playful";

export interface ClinicLeadRef {
  id: string;
  name: string;
  city: string;
  state: string;
  phone: string;
  website?: string;
  primaryColor?: string;
  leadScore: number;
}

export interface BuildStage {
  id: string;
  name: string;
  key: "scaffold" | "ingest" | "synthesize" | "compile" | "deploy";
  status: RunStatus;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  errorMessage?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;      // ISO 8601
  deltaMs: number;        // Milliseconds from run start
  level: LogLevel;
  stream: "stdout" | "stderr" | "system";
  message: string;
  stageKey?: string;
}

export interface PreviewConfig {
  ephemeralUrl: string;
  expiresAt: string;      // ISO 8601
  isPermanent: boolean;
  sslVerified: boolean;
  choiceUrl?: string;
  modernUrl?: string;
  premiumUrl?: string;
  warmUrl?: string;
  videoFilePath?: string;
  lighthouseScore?: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
  thumbnailUrl?: string;
}

export interface DemoRun {
  id: string;             // e.g. "run_8f2a1b9c"
  batchId?: string;
  clinic: ClinicLeadRef;
  templateId: TemplateId;
  status: RunStatus;
  versionTag: string;     // e.g. "v1.4.2" or commit SHA "8f2a1b9"
  triggeredBy: {
    type: "manual" | "batch" | "autopilot_trigger" | "webhook";
    authorName: string;
  };
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  totalDurationMs?: number;
  stages: BuildStage[];
  logs: LogEntry[];
  preview?: PreviewConfig;
  error?: {
    stage: string;
    message: string;
    stackTrace?: string;
    codeFrame?: string;
  };
}

export interface BatchJob {
  id: string;
  name: string;
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  inProgressRuns: number;
  concurrency: number;
  createdAt: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  runIds: string[];
}

// ----------------------------------------------------------------------------
// TAB 3: Outreach Dispatch & Quota Models (Instantly.ai Pattern)
// ----------------------------------------------------------------------------
export type QueueItemStatus =
  | "scheduled"
  | "sending"
  | "throttled"
  | "paused"
  | "sent"
  | "failed";

export type PriorityLevel = "P1_high" | "P2_standard" | "P3_low";

export interface QueueItem {
  id: string;
  leadId: string;
  leadName: string;
  companyName: string;
  verifiedEmail: string;
  verificationStatus: DeliverabilityStatus;
  campaignId: string;
  campaignName: string;
  sequenceStep: number;        // e.g. 1, 2, 3
  totalSequenceSteps: number;  // e.g. 3
  stepTitle: string;           // e.g. "Interactive Demo Link"
  demoUrl?: string;
  scheduledSendTime: string;   // ISO 8601 UTC
  prospectTimezone: string;    // e.g. "America/New_York"
  sendingMailboxId: string;
  sendingMailboxEmail: string;
  status: QueueItemStatus;
  priority: PriorityLevel;
  throttleBackoffMinutes?: number;
  failureReason?: string;
  sentAt?: string;
  retryCount: number;
}

export interface DailyCapacityMetrics {
  totalDailyCap: number;                 // e.g. 500
  totalSentToday: number;                // e.g. 340
  warmupSentToday: number;               // e.g. 120
  campaignSentToday: number;             // e.g. 220
  inFlightScheduled: number;             // e.g. 80
  remainingSafeHeadroom: number;         // e.g. 80
  overallUtilizationPercentage: number;  // e.g. 68%
}

export interface MailboxAccount {
  id: string;
  email: string;
  provider: "google" | "microsoft" | "smtp";
  dailyCap: number;
  sentToday: number;
  warmupActive: boolean;
  healthScore: number;                   // 0 - 100
  status: "active" | "warning" | "paused" | "auth_error";
}

export interface DispatchEngineSettings {
  masterQueueRunning: boolean;
  minDelaySeconds: number;               // e.g. 120
  maxDelaySeconds: number;               // e.g. 300
  batchSizeLimit: number;                // e.g. 50
  sendingWindowStart: string;            // e.g. "09:00"
  sendingWindowEnd: string;              // e.g. "17:30"
  respectProspectTimezone: boolean;
  slowRampActive: boolean;
}
