"use client";

import React from "react";
import dynamic from "next/dynamic";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { CRMProvider, useCRM } from "@/context/CRMContext";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { DashboardView } from "@/features/dashboard/DashboardView";
import { Toast } from "@/components/ui/Toast";
import { KanbanSkeleton, TableSkeleton, DashboardSkeleton } from "@/components/ui/Skeleton";

// Dynamic imports with ssr: false for heavy views, modals, and drawers
const KanbanBoardView = dynamic(
  () => import("@/features/board/KanbanBoardView").then((mod) => mod.KanbanBoardView),
  { ssr: false, loading: () => <KanbanSkeleton /> }
);

const LeadsTableView = dynamic(
  () => import("@/features/table/LeadsTableView").then((mod) => mod.LeadsTableView),
  { ssr: false, loading: () => <TableSkeleton rows={8} columns={8} /> }
);

const WhatsAppInboxView = dynamic(
  () => import("@/features/inbox/WhatsAppInboxView").then((mod) => mod.WhatsAppInboxView),
  { ssr: false, loading: () => <TableSkeleton rows={6} columns={4} /> }
);

const CallsManagementView = dynamic(
  () => import("@/features/calls/CallsManagementView").then((mod) => mod.CallsManagementView),
  { ssr: false, loading: () => <TableSkeleton rows={6} columns={4} /> }
);

const EveningSprintView = dynamic(
  () => import("@/features/sprint/EveningSprintView").then((mod) => mod.EveningSprintView),
  { ssr: false, loading: () => <TableSkeleton rows={6} columns={4} /> }
);

const HustleSettingsView = dynamic(
  () => import("@/features/settings/HustleSettingsView").then((mod) => mod.HustleSettingsView),
  { ssr: false, loading: () => <TableSkeleton rows={6} columns={4} /> }
);

const AutopilotCockpitView = dynamic(
  () => import("@/features/cockpit/AutopilotCockpitView").then((mod) => mod.AutopilotCockpitView),
  { ssr: false, loading: () => <TableSkeleton rows={8} columns={6} /> }
);

const CommandPaletteModal = dynamic(
  () => import("@/features/modals/CommandPaletteModal").then((mod) => mod.CommandPaletteModal),
  { ssr: false }
);

const SettingsModal = dynamic(
  () => import("@/features/settings/SettingsModal").then((mod) => mod.SettingsModal),
  { ssr: false }
);

const AssistantDrawer = dynamic(
  () => import("@/features/modals/AssistantDrawer").then((mod) => mod.AssistantDrawer),
  { ssr: false }
);

const LeadDetailModal = dynamic(
  () => import("@/features/modals/LeadDetailModal").then((mod) => mod.LeadDetailModal),
  { ssr: false }
);

const AddLeadModal = dynamic(
  () => import("@/features/modals/AddLeadModal").then((mod) => mod.AddLeadModal),
  { ssr: false }
);

const ProblemReportModal = dynamic(
  () => import("@/features/modals/ProblemReportModal").then((mod) => mod.ProblemReportModal),
  { ssr: false }
);

const LogCallModal = dynamic(
  () => import("@/features/modals/LogCallModal").then((mod) => mod.LogCallModal),
  { ssr: false }
);

const LogReplyModal = dynamic(
  () => import("@/features/modals/LogReplyModal").then((mod) => mod.LogReplyModal),
  { ssr: false }
);

function CRMContent() {
  const {
    activeTab,
    loading,
    toast,
    closeToast,
    settingsModalOpen,
    cmdKOpen,
    selectedLeadId,
    newLeadModalOpen,
    problemModalOpen,
    logCallModalOpen,
    logReplyModalOpen,
  } = useCRM();
  const isCockpit = activeTab === "autopilot";

  return (
    <div className="h-[100dvh] w-full overflow-hidden flex bg-[#F1F3F6] dark:bg-[#09090B] text-slate-900 dark:text-zinc-100 transition-colors duration-200">
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
              ? "p-0 overflow-hidden bg-[#F1F3F6] dark:bg-[#09090B]"
              : activeTab === "inbox" || activeTab === "calls"
              ? "p-3 sm:p-4 overflow-hidden h-full bg-[#F1F3F6] dark:bg-[#09090B]"
              : activeTab === "dashboard"
              ? "overflow-y-auto no-scrollbar p-3 sm:p-3.5 sm:px-6 h-full bg-[#F1F3F6] dark:bg-[#09090B]"
              : "overflow-y-auto p-4 sm:p-6 space-y-6 bg-[#F1F3F6] dark:bg-[#09090B]"
          }`}
        >
          {loading ? (
            activeTab === "dashboard" ? (
              <DashboardSkeleton />
            ) : activeTab === "board" ? (
              <KanbanSkeleton />
            ) : (
              <TableSkeleton rows={8} columns={8} />
            )
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

      {/* Modals & Drawers - only mounted when activated */}
      {settingsModalOpen && <SettingsModal />}
      {cmdKOpen && <CommandPaletteModal />}
      {Boolean(selectedLeadId) && <LeadDetailModal />}
      {newLeadModalOpen && <AddLeadModal />}
      {problemModalOpen && <ProblemReportModal />}
      {logCallModalOpen && <LogCallModal />}
      {logReplyModalOpen && <LogReplyModal />}
      {!isCockpit && <AssistantDrawer />}
      <Toast toast={toast} onClose={closeToast} />
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
