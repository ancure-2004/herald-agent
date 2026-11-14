import { useCallback, useState } from "react";
import { useSSE } from "./useSSE";
import type { PipelineStepEvent } from "@/types";

interface UseSSEEventsOptions {
  appendTerminalLines: (lines: string[]) => void;
  loadAll: () => Promise<void>;
  onOutreachChange: (isRunning: boolean, channel: "whatsapp" | "email" | "instagram" | null) => void;
}

export function useSSEEvents({ appendTerminalLines, loadAll, onOutreachChange }: UseSSEEventsOptions) {
  const [liveFeed, setLiveFeed] = useState<string[]>([]);
  const [latestPipelineStep, setLatestPipelineStep] = useState<PipelineStepEvent | null>(null);

  const handleTerminalLog = useCallback(
    (line: string) => appendTerminalLines([line]),
    [appendTerminalLines]
  );

  const handleLiveEvent = useCallback(
    (line: string) => setLiveFeed((prev) => [line, ...prev].slice(0, 30)),
    []
  );

  const handleRefreshTrigger = useCallback(() => {
    loadAll();
  }, [loadAll]);

  useSSE({
    onTerminalLog: handleTerminalLog,
    onLiveEvent: handleLiveEvent,
    onRefreshTrigger: handleRefreshTrigger,
    onPipelineStep: (step) => setLatestPipelineStep(step),
    onOutreachEvent: (evName, data) => {
      if (evName === "autopilot_started" && data.task === "closer") {
        const ch = String(data.channel || "").toLowerCase();
        onOutreachChange(true, ch === "whatsapp" || ch === "email" || ch === "instagram" ? ch : null);
      } else if (evName === "autopilot_stopped" || evName === "closer_complete") {
        onOutreachChange(false, null);
      }
    },
  });

  return {
    liveFeed,
    setLiveFeed,
    latestPipelineStep,
    setLatestPipelineStep,
  };
}
