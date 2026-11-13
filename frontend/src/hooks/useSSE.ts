import { useEffect, useRef } from "react";
import { env } from "@/config/env";
import { PipelineStepEvent } from "@/features/cockpit/types";

export interface SSEMessagePayload {
  type: string;
  line?: string;
  seq?: number;
  title?: string;
  message?: string;
  event?: string;
  status?: string;
  [key: string]: unknown;
}

// Outreach/autopilot events that drive running-state UI (Stop buttons, badges, inbox refresh).
const OUTREACH_EVENTS = ["autopilot_started", "autopilot_stopped", "closer_complete", "outbox_sent", "message_sent"] as const;

export function useSSE({
  onTerminalLog,
  onLiveEvent,
  onRefreshTrigger,
  onPipelineStep,
  onOutreachEvent,
  enabled = true,
}: {
  onTerminalLog?: (line: string, seq?: number) => void;
  onLiveEvent?: (line: string) => void;
  onRefreshTrigger?: () => void;
  onPipelineStep?: (event: PipelineStepEvent) => void;
  onOutreachEvent?: (eventName: string, data: Record<string, unknown>) => void;
  enabled?: boolean;
} = {}) {
  const lastLogSeqRef = useRef<number>(0);

  // Store latest callbacks in refs so the SSE connection is never torn down
  // due to inline callbacks changing between renders.
  const onTerminalLogRef = useRef(onTerminalLog);
  const onLiveEventRef = useRef(onLiveEvent);
  const onRefreshTriggerRef = useRef(onRefreshTrigger);
  const onPipelineStepRef = useRef(onPipelineStep);
  const onOutreachEventRef = useRef(onOutreachEvent);

  useEffect(() => {
    onTerminalLogRef.current = onTerminalLog;
    onLiveEventRef.current = onLiveEvent;
    onRefreshTriggerRef.current = onRefreshTrigger;
    onPipelineStepRef.current = onPipelineStep;
    onOutreachEventRef.current = onOutreachEvent;
  });

  useEffect(() => {
    if (!enabled) return;

    let es: EventSource | null = null;
    let isCancelled = false;
    let retryCount = 0;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (isCancelled) return;

      try {
        es = new EventSource(`${env.NEXT_PUBLIC_API_BASE_URL}/api/events`);

        es.onopen = () => {
          retryCount = 0; // reset backoff on successful connection
        };

        es.onmessage = (event) => {
          try {
            const data: SSEMessagePayload = JSON.parse(event.data);

            // Ignore handshake connection message
            if (data.type === "connected" || data.event === "connected") {
              return;
            }

            if ((data.type === "terminal_log" || data.event === "terminal_log") && (data.line || data.message)) {
              if (typeof data.seq === "number" && data.seq > lastLogSeqRef.current) {
                lastLogSeqRef.current = data.seq;
              }
              const line = data.line || `[${String(data.service || "SYSTEM").toUpperCase()}] ${data.message || ""}`;
              onTerminalLogRef.current?.(line, data.seq);
              return;
            }

            if (data.type === "pipeline_step") {
              onPipelineStepRef.current?.(data as unknown as PipelineStepEvent);
            }

            if ((OUTREACH_EVENTS as readonly string[]).includes(data.type)) {
              onOutreachEventRef.current?.(data.type, data as unknown as Record<string, unknown>);
            }

            const line = `[${new Date().toLocaleTimeString()}] ${data.type || "Event"}: ${data.title || data.message || "Event"}`;
            onLiveEventRef.current?.(line);

            if (
              [
                "tracking_view",
                "reply_received",
                "run_complete",
                "outreach_sent",
                "autopilot_run",
                "scout_complete",
                "auditor_complete",
                "closer_complete",
              ].includes(data.type)
            ) {
              onRefreshTriggerRef.current?.();
            }
          } catch {
            // ignore parsing error
          }
        };

        // Attach dedicated event listeners for named SSE events from backend EventBus
        es.addEventListener("terminal_log", (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            if (typeof data.seq === "number" && data.seq > lastLogSeqRef.current) {
              lastLogSeqRef.current = data.seq;
            }
            const line =
              data.line ||
              `[${(data.service || data.source || "SYSTEM").toUpperCase()}] ${data.message || ""}`;
            onTerminalLogRef.current?.(line, data.seq);
          } catch {
            // ignore parsing error
          }
        });

        es.addEventListener("autopilot_state", (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            const line = `[${new Date().toLocaleTimeString()}] Autopilot State: ${data.is_running ? "Running" : "Idle"}`;
            onLiveEventRef.current?.(line);
          } catch {
            // ignore parsing error
          }
        });

        es.addEventListener("pipeline_step", (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            onPipelineStepRef.current?.(data as unknown as PipelineStepEvent);
          } catch {
            // ignore parsing error
          }
        });

        // Named SSE events that should trigger a data refresh (leads list, pipeline view).
        // onmessage only fires for unnamed events (no `event:` line), so these named
        // events must each have their own addEventListener — they would be silently
        // dropped otherwise.
        const REFRESH_EVENTS = [
          "tracking_view",
          "run_complete",
          "outreach_sent",
          "autopilot_run",
          "scout_complete",
          "auditor_complete",
          "closer_complete",
          "reply_received",
          "outbox_sent",
          "message_sent",
        ] as const;

        for (const evName of REFRESH_EVENTS) {
          es.addEventListener(evName, (event: MessageEvent) => {
            try {
              const data = JSON.parse(event.data);
              const line = `[${new Date().toLocaleTimeString()}] ${evName}: ${
                data.title || data.message || data.lead_name || evName
              }`;
              onLiveEventRef.current?.(line);
              onRefreshTriggerRef.current?.();
            } catch {
              // ignore parsing error
            }
          });
        }

        // heartbeat: keep-alive — no UI action needed
        for (const evName of OUTREACH_EVENTS) {
          es.addEventListener(evName, (event: MessageEvent) => {
            try {
              onOutreachEventRef.current?.(evName, JSON.parse(event.data));
            } catch {
              // ignore parsing error
            }
          });
        }

        es.addEventListener("heartbeat", () => {});

        es.onerror = () => {
          if (isCancelled) return;
          // Close immediately to manage backoff explicitly
          if (es) {
            es.close();
            es = null;
          }
          // Exponential backoff: 1s, 2s, 4s, 8s, 16s, up to 30s
          const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
          retryCount++;
          reconnectTimeout = setTimeout(connect, delay);
        };
      } catch {
        if (isCancelled) return;
        const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
        retryCount++;
        reconnectTimeout = setTimeout(connect, delay);
      }
    };

    connect();

    return () => {
      isCancelled = true;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (es) {
        es.close();
        es = null;
      }
    };
  }, [enabled]);
}
