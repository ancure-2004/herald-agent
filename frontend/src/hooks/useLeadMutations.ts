import { useCallback } from "react";
import { leadsApi } from "@/api/leadsApi";
import type { Lead } from "@/types";

interface UseLeadMutationsOptions {
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  loadAll: () => Promise<void>;
  notify: (text: string, type?: "ok" | "err") => void;
}

export function useLeadMutations({ setLeads, loadAll, notify }: UseLeadMutationsOptions) {
  const handleStageChange = useCallback(
    async (lead: Lead, newStageId: number) => {
      if (lead.stage_id === newStageId) return;
      setLeads((prev) =>
        prev.map((l) => (l.id === lead.id ? { ...l, stage_id: newStageId } : l))
      );
      try {
        await leadsApi.update(lead.id, { stage_id: newStageId });
        notify(`Moved "${lead.name}" to next stage`);
        await loadAll();
      } catch (err) {
        notify(err instanceof Error ? err.message : "Failed to update stage", "err");
        await loadAll();
      }
    },
    [setLeads, loadAll, notify]
  );

  const handleApproveAndSend = useCallback(
    async (lead: Lead) => {
      try {
        await leadsApi.approveSend(lead.id, lead.preferred_channel || "whatsapp");
        notify(`Sent demo pitch to ${lead.name} via ${lead.preferred_channel || "WhatsApp"}`);
        await loadAll();
      } catch (err) {
        notify(err instanceof Error ? err.message : "Failed to approve and send", "err");
      }
    },
    [loadAll, notify]
  );

  return {
    handleStageChange,
    handleApproveAndSend,
  };
}
