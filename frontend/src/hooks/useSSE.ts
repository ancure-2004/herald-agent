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

export function useSSE({
  onTerminalLog,
  onLiveEvent,
  onRefreshTrigger,
  onPipelineStep,
  enabled = true,
}: {
  onTerminalLog?: (line: string, seq?: number) => void;
  onLiveEvent?: (line: string) => void;
  onRefreshTrigger?: () => void;
  onPipelineStep?: (event: PipelineStepEvent) => void;
  enabled?: boolean;
} = {}) {
  const lastLogSeqRef = useRef<number>(0);

  // Store latest callbacks in refs so the SSE connection is never torn down
  // due to inline callbacks changing between renders.
  const onTerminalLogRef = useRef(onTerminalLog);
  const onLiveEventRef = useRef(onLiveEvent);
  const onRefreshTriggerRef = useRef(onRefreshTrigger);
  const onPipelineStepRef = useRef(onPipelineStep);

  useEffect(() => {
    onTerminalLogRef.current = onTerminalLog;
    onLiveEventRef.current = onLiveEvent;
    onRefreshTriggerRef.current = onRefreshTrigger;
    onPipelineStepRef.current = onPipelineStep;
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

            if (data.type === "terminal_log" && data.line) {
              if (typeof data.seq === "number" && data.seq > lastLogSeqRef.current) {
                lastLogSeqRef.current = data.seq;
              }
              onTerminalLogRef.current?.(data.line, data.seq);
              return;
            }

            if (data.type === "pipeline_step") {
              onPipelineStepRef.current?.(data as unknown as PipelineStepEvent);
            }

            const line = `[${new Date().toLocaleTimeString()}] ${data.type}: ${data.title || data.message || "Event"}`;
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
