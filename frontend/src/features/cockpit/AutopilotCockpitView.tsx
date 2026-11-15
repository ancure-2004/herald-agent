"use client";

import React, { useEffect } from "react";
import { DiscoveryTab } from "./discovery/DiscoveryTab";
import { DemoFactoryTab } from "./demo-factory/DemoFactoryTab";
import { OutreachHubSubpage } from "./OutreachHubSubpage";
import { CockpitOverviewDashboard } from "./CockpitOverviewDashboard";
import { useCRM } from "@/context/CRMContext";

type CockpitTab = "attention" | "discovery" | "factory" | "outreach";

export const AutopilotCockpitView: React.FC = () => {
  const { cockpitTab, setCockpitTab } = useCRM();
  const activeTab: CockpitTab = (cockpitTab as CockpitTab) || "attention";

  // Keyboard navigation shortcuts: '1', '2', '3', '4' for top-level tabs (except in outreach where keys 1-4 are workflow shortcuts)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if (activeTab === "outreach") {
        return;
      }

      if (e.key === "1") {
        setCockpitTab("attention");
      } else if (e.key === "2") {
        setCockpitTab("discovery");
      } else if (e.key === "3") {
        setCockpitTab("factory");
      } else if (e.key === "4") {
        setCockpitTab("outreach");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, setCockpitTab]);

  return (
    <div className="h-full w-full flex flex-col bg-[#F7F7F5] dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-y-auto selection:bg-[#3B63FB] selection:text-white transition-colors duration-200">
      {/* Main Workspace Body */}
      <div className="max-w-[1480px] mx-auto w-full p-3 sm:p-4 flex-1 min-w-0">
        {activeTab === "attention" && (
          <CockpitOverviewDashboard onNavigate={setCockpitTab} />
        )}
        {activeTab === "discovery" && <DiscoveryTab />}
        {activeTab === "factory" && <DemoFactoryTab />}
        {activeTab === "outreach" && <OutreachHubSubpage />}
      </div>
    </div>
  );
};
