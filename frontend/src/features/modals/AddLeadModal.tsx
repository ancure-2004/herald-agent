"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import { useCRM } from "@/context/CRMContext";
import { apiFetch } from "@/lib/api/client";

export function AddLeadModal() {
  const {
    newLeadModalOpen,
    setNewLeadModalOpen,
    activeHustle,
    activeHustleId,
    notify,
    loadAll,
  } = useCRM();

  const [newLeadName, setNewLeadName] = useState<string>("");
  const [newLeadDoctor, setNewLeadDoctor] = useState<string>("");
  const [newLeadLocality, setNewLeadLocality] = useState<string>("");
  const [newLeadPhone, setNewLeadPhone] = useState<string>("");
  const [newLeadIg, setNewLeadIg] = useState<string>("");
  const [newLeadNextAction, setNewLeadNextAction] = useState<string>(
    "Verify website status & build 3 demo previews"
  );

  if (!newLeadModalOpen) return null;

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName.trim()) {
      notify("Clinic / Lead name is required", "err");
      return;
    }

    try {
      const firstStage = activeHustle?.stages[0]?.id || 1;
      const defaultDue = new Date(Date.now() + 2 * 86400000).toISOString();
      await apiFetch("/api/leads", {
        method: "POST",
        body: JSON.stringify({
          hustle_id: activeHustleId,
          stage_id: firstStage,
          name: newLeadName.trim(),
          doctor_name: newLeadDoctor.trim(),
          locality: newLeadLocality.trim(),
          primary_phone: newLeadPhone.trim() || null,
          instagram_handle: newLeadIg.trim() || null,
          next_action: newLeadNextAction.trim(),
          next_action_due_at: defaultDue,
          fit_score: 85,
          fit_reasons: ["Manual intake lead", "Targeted dental clinic"],
          intent_score: 50,
        }),
      });

      notify(`Added "${newLeadName}" to pipeline`);
      setNewLeadModalOpen(false);
      setNewLeadName("");
      setNewLeadDoctor("");
      setNewLeadLocality("");
      setNewLeadPhone("");
      setNewLeadIg("");
      loadAll();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to add lead", "err");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/[0.12] rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Add New Clinic Lead</h3>
          <button
            onClick={() => setNewLeadModalOpen(false)}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleCreateLead} className="space-y-3 text-xs">
          <div>
            <label className="text-slate-600 dark:text-slate-400 font-medium">Clinic Name *</label>
            <input
              type="text"
              required
              value={newLeadName}
              onChange={(e) => setNewLeadName(e.target.value)}
              placeholder="e.g. Apex Dental Studio"
              className="w-full mt-1 bg-slate-50 dark:bg-[#0E1017] border border-slate-200 dark:border-white/[0.1] rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-600 dark:text-slate-400 font-medium">Doctor Name</label>
              <input
                type="text"
                value={newLeadDoctor}
                onChange={(e) => setNewLeadDoctor(e.target.value)}
                placeholder="Dr. Sharma"
                className="w-full mt-1 bg-slate-50 dark:bg-[#0E1017] border border-slate-200 dark:border-white/[0.1] rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-slate-600 dark:text-slate-400 font-medium">Locality / City</label>
              <input
                type="text"
                value={newLeadLocality}
                onChange={(e) => setNewLeadLocality(e.target.value)}
                placeholder="Indiranagar, BLR"
                className="w-full mt-1 bg-slate-50 dark:bg-[#0E1017] border border-slate-200 dark:border-white/[0.1] rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-600 dark:text-slate-400 font-medium">Primary Phone</label>
              <input
                type="text"
                value={newLeadPhone}
                onChange={(e) => setNewLeadPhone(e.target.value)}
                placeholder="+91..."
                className="w-full mt-1 bg-slate-50 dark:bg-[#0E1017] border border-slate-200 dark:border-white/[0.1] rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-slate-600 dark:text-slate-400 font-medium">Instagram Handle</label>
              <input
                type="text"
                value={newLeadIg}
                onChange={(e) => setNewLeadIg(e.target.value)}
                placeholder="apexdental_blr"
                className="w-full mt-1 bg-slate-50 dark:bg-[#0E1017] border border-slate-200 dark:border-white/[0.1] rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-600 dark:text-slate-400 font-medium">Initial Mandatory Next Step</label>
            <input
              type="text"
              value={newLeadNextAction}
              onChange={(e) => setNewLeadNextAction(e.target.value)}
              className="w-full mt-1 bg-slate-50 dark:bg-[#0E1017] border border-slate-200 dark:border-white/[0.1] rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setNewLeadModalOpen(false)}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md shadow-indigo-600/30 cursor-pointer"
            >
              Add to Pipeline
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
