export type NodeStatus = "IDLE" | "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED";

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
