"use client";

import React from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { CRMProvider, useCRM } from "@/context/CRMContext";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { DashboardView } from "@/features/dashboard/DashboardView";
import { KanbanBoardView } from "@/features/board/KanbanBoardView";
import { LeadsTableView } from "@/features/table/LeadsTableView";
import { EveningSprintView } from "@/features/sprint/EveningSprintView";
import { AutopilotCockpitView } from "@/features/cockpit/AutopilotCockpitView";
import { HustleSettingsView } from "@/features/settings/HustleSettingsView";
import { LeadDetailModal } from "@/features/modals/LeadDetailModal";
import { AddLeadModal } from "@/features/modals/AddLeadModal";
import { ProblemReportModal } from "@/features/modals/ProblemReportModal";
import { CommandPaletteModal } from "@/features/modals/CommandPaletteModal";
import { AssistantDrawer } from "@/features/modals/AssistantDrawer";

function CRMContent() {
  const { activeTab, loading, toast } = useCRM();
  const isCockpit = activeTab === "autopilot";

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#FAF9F6] dark:bg-[#0B0C10] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Toast Notification Banner */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-2xl text-xs font-semibold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 border ${
            toast.type === "ok"
              ? "bg-emerald-600 text-white border-emerald-500 shadow-emerald-900/30"
              : "bg-rose-600 text-white border-rose-500 shadow-rose-900/30"
          }`}
        >
          {toast.type === "ok" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Top Header */}
      <Header />

      {/* Main Layout: Left Sidebar (isolated from Cockpit) + Center Workspace */}
      <div className="flex-1 flex overflow-hidden min-h-0 min-w-0">
        {!isCockpit && <Sidebar />}

        {/* Center Workspace Content */}
        <main className="flex-1 h-full overflow-y-auto p-4 sm:p-6 space-y-6 min-w-0">
          {loading ? (
            <div className="p-16 text-center text-sm text-slate-500 dark:text-slate-400">
              Loading Personal OS CRM...
            </div>
          ) : (
            <>
              {activeTab === "dashboard" && <DashboardView />}
              {activeTab === "board" && <KanbanBoardView />}
              {activeTab === "table" && <LeadsTableView />}
              {activeTab === "sprint" && <EveningSprintView />}
              {activeTab === "autopilot" && <AutopilotCockpitView />}
              {activeTab === "settings" && <HustleSettingsView />}
            </>
          )}
        </main>
      </div>

      {/* Modals & Drawers */}
      <LeadDetailModal />
      <AddLeadModal />
      <ProblemReportModal />
      <CommandPaletteModal />
      {!isCockpit && <AssistantDrawer />}
    </div>
  );
}

export default function PersonalOSCRM() {
  return (
    <CRMProvider>
      <CRMContent />
    </CRMProvider>
  );
}
