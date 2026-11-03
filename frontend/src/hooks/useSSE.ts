import { useEffect, useRef } from "react";
import { env } from "@/config/env";

export interface SSEMessagePayload {
  type: string;
  line?: string;
  seq?: number;
  title?: string;
  message?: string;
  [key: string]: unknown;
}

export function useSSE({
  onTerminalLog,
  onLiveEvent,
  onRefreshTrigger,
}: {
  onTerminalLog?: (line: string, seq?: number) => void;
  onLiveEvent?: (line: string) => void;
  onRefreshTrigger?: () => void;
}) {
  const lastLogSeqRef = useRef<number>(0);

  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource(`${env.NEXT_PUBLIC_API_BASE_URL}/api/events`);
      es.onmessage = (event) => {
        try {
          const data: SSEMessagePayload = JSON.parse(event.data);
          if (data.type === "terminal_log" && data.line) {
            if (typeof data.seq === "number" && data.seq > lastLogSeqRef.current) {
              lastLogSeqRef.current = data.seq;
            }
            onTerminalLog?.(data.line, data.seq);
            return;
          }

          const line = `[${new Date().toLocaleTimeString()}] ${data.type}: ${data.title || data.message || "Event"}`;
          onLiveEvent?.(line);

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
            onRefreshTrigger?.();
          }
        } catch {
          // ignore parsing error
        }
      };
      es.onerror = () => {
        // SSE disconnected, browser will retry automatically
      };
    } catch {
      // ignore
    }

    return () => {
      es?.close();
    };
  }, [onTerminalLog, onLiveEvent, onRefreshTrigger]);
}
