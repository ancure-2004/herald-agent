"use client";

import React from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { CRMProvider, useCRM } from "@/context/CRMContext";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { DashboardView } from "@/features/dashboard/DashboardView";
import { WhatsAppInboxView } from "@/features/inbox/WhatsAppInboxView";
import { CallsManagementView } from "@/features/calls/CallsManagementView";
import { KanbanBoardView } from "@/features/board/KanbanBoardView";
import { LeadsTableView } from "@/features/table/LeadsTableView";
import { EveningSprintView } from "@/features/sprint/EveningSprintView";
import { AutopilotCockpitView } from "@/features/cockpit/AutopilotCockpitView";
import { HustleSettingsView } from "@/features/settings/HustleSettingsView";
import { LeadDetailModal } from "@/features/modals/LeadDetailModal";
import { AddLeadModal } from "@/features/modals/AddLeadModal";
import { ProblemReportModal } from "@/features/modals/ProblemReportModal";
import { AssistantDrawer } from "@/features/modals/AssistantDrawer";
import { LogCallModal } from "@/features/modals/LogCallModal";
import { LogReplyModal } from "@/features/modals/LogReplyModal";
import { CommandPaletteModal } from "@/features/modals/CommandPaletteModal";
import { SettingsModal } from "@/features/settings/SettingsModal";

function CRMContent() {
  const { activeTab, loading, toast } = useCRM();
  const isCockpit = activeTab === "autopilot";

  return (
    <div className="h-[100dvh] w-full overflow-hidden flex bg-[#F1F3F6] dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
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

      {/* Full-Height Left Sidebar */}
      <Sidebar />

      {/* Right Column: Floating Header + Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Floating Top Header Bar */}
        <Header />

        {/* Center Workspace Content */}
        <main
          className={`flex-1 min-h-0 min-w-0 ${
            isCockpit
              ? "p-0 overflow-hidden bg-[#F1F3F6] dark:bg-slate-950"
              : activeTab === "inbox" || activeTab === "calls"
              ? "p-3 sm:p-4 overflow-hidden h-full bg-[#F1F3F6] dark:bg-slate-950"
              : activeTab === "dashboard"
              ? "overflow-y-auto no-scrollbar p-3 sm:p-3.5 sm:px-6 h-full bg-[#F1F3F6] dark:bg-[#0B0F17]"
              : "overflow-y-auto p-4 sm:p-6 space-y-6 bg-[#F1F3F6] dark:bg-slate-950"
          }`}
        >
          {loading ? (
            <div className="p-8 sm:p-16 text-center text-sm text-slate-500 dark:text-slate-400">
              Loading Herald Operations Engine...
            </div>
          ) : (
            <>
              {activeTab === "dashboard" && <DashboardView />}
              {activeTab === "inbox" && <WhatsAppInboxView />}
              {activeTab === "calls" && <CallsManagementView />}
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
      <SettingsModal />
      <CommandPaletteModal />
      <LeadDetailModal />
      <AddLeadModal />
      <ProblemReportModal />
      <LogCallModal />
      <LogReplyModal />
      {!isCockpit && <AssistantDrawer />}
    </div>
  );
}

export default function HeraldApp() {
  return (
    <CRMProvider>
      <CRMContent />
    </CRMProvider>
  );
}
