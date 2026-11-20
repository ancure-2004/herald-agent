import { useCallback } from "react";
import { leadsApi } from "@/api/leadsApi";
import type { Lead } from "@/types";

interface UseLeadMutationsOptions {
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  loadAll: () => Promise<void>;
  notify: (textOrError: string | Error | unknown, type?: "ok" | "err") => void;
}

export function useLeadMutations({ setLeads, loadAll, notify }: UseLeadMutationsOptions) {
  /**
   * Optimistically change a lead's stage with clean rollback on failure.
   */
  const handleStageChange = useCallback(
    async (lead: Lead, newStageId: number) => {
      if (lead.stage_id === newStageId) return;

      let previousLeads: Lead[] = [];
      setLeads((prev) => {
        previousLeads = prev;
        return prev.map((l) => (l.id === lead.id ? { ...l, stage_id: newStageId } : l));
      });

      try {
        await leadsApi.update(lead.id, { stage_id: newStageId });
        notify(`Moved "${lead.name}" to next stage`, "ok");
      } catch (err: unknown) {
        // Clean rollback to previous state
        setLeads(previousLeads);
        notify(err instanceof Error ? err : "Failed to update stage", "err");
      }
    },
    [setLeads, notify]
  );

  /**
   * Optimistically edit/update a lead's attributes with clean rollback on failure.
   */
  const handleUpdateLead = useCallback(
    async (leadId: number, updates: Partial<Lead>) => {
      let previousLeads: Lead[] = [];
      setLeads((prev) => {
        previousLeads = prev;
        return prev.map((l) => (l.id === leadId ? { ...l, ...updates } : l));
      });

      try {
        await leadsApi.update(leadId, updates);
        notify("Lead updated successfully", "ok");
      } catch (err: unknown) {
        // Clean rollback to previous state
        setLeads(previousLeads);
        notify(err instanceof Error ? err : "Failed to update lead", "err");
      }
    },
    [setLeads, notify]
  );

  /**
   * Optimistically perform batch stage change for multiple leads with clean rollback.
   */
  const handleBatchStageChange = useCallback(
    async (leadIds: number[], newStageId: number) => {
      if (!leadIds.length) return;

      let previousLeads: Lead[] = [];
      const idSet = new Set(leadIds);
      setLeads((prev) => {
        previousLeads = prev;
        return prev.map((l) => (idSet.has(l.id) ? { ...l, stage_id: newStageId } : l));
      });

      try {
        await Promise.all(leadIds.map((id) => leadsApi.update(id, { stage_id: newStageId })));
        notify(`Successfully moved ${leadIds.length} leads to stage`, "ok");
      } catch (err: unknown) {
        // Clean rollback to previous state
        setLeads(previousLeads);
        notify(err instanceof Error ? err : "Batch stage update failed. Reverted changes.", "err");
      }
    },
    [setLeads, notify]
  );

  /**
   * Optimistically perform batch archive / unarchive for multiple leads with clean rollback.
   */
  const handleBatchArchive = useCallback(
    async (leadIds: number[], archive: boolean = true) => {
      if (!leadIds.length) return;

      let previousLeads: Lead[] = [];
      const idSet = new Set(leadIds);
      setLeads((prev) => {
        previousLeads = prev;
        return prev.map((l) => (idSet.has(l.id) ? { ...l, is_archived: archive } : l));
      });

      try {
        await Promise.all(leadIds.map((id) => leadsApi.update(id, { is_archived: archive })));
        notify(`Successfully ${archive ? "archived" : "restored"} ${leadIds.length} leads`, "ok");
      } catch (err: unknown) {
        // Clean rollback to previous state
        setLeads(previousLeads);
        notify(err instanceof Error ? err : "Batch archive operation failed. Reverted changes.", "err");
      }
    },
    [setLeads, notify]
  );

  /**
   * Optimistically approve and send pitch to a lead with rollback.
   */
  const handleApproveAndSend = useCallback(
    async (lead: Lead) => {
      let previousLeads: Lead[] = [];
      setLeads((prev) => {
        previousLeads = prev;
        return prev.map((l) =>
          l.id === lead.id
            ? { ...l, status: "contacted", stage_id: lead.stage_id ?? 1 }
            : l
        );
      });

      try {
        await leadsApi.approveSend(lead.id, lead.preferred_channel || "whatsapp");
        notify(`Sent demo pitch to ${lead.name} via ${lead.preferred_channel || "WhatsApp"}`, "ok");
        await loadAll();
      } catch (err: unknown) {
        setLeads(previousLeads);
        notify(err instanceof Error ? err : "Failed to approve and send", "err");
      }
    },
    [setLeads, loadAll, notify]
  );

  return {
    handleStageChange,
    handleUpdateLead,
    handleBatchStageChange,
    handleBatchArchive,
    handleApproveAndSend,
  };
}
