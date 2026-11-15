"use client";

import React, { useEffect } from "react";
import { DiscoveryTab } from "./discovery/DiscoveryTab";
import { DemoFactoryTab } from "./demo-factory/DemoFactoryTab";
import { OutreachHubSubpage } from "./OutreachHubSubpage";
import { AttentionVelocityDashboard } from "./AttentionVelocityDashboard";
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
    <div className="h-full w-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-y-auto selection:bg-indigo-500 selection:text-white transition-colors duration-200">
      {/* Main Workspace Body */}
      <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 flex-1">
        {activeTab === "attention" && <AttentionVelocityDashboard />}
        {activeTab === "discovery" && <DiscoveryTab />}
        {activeTab === "factory" && <DemoFactoryTab />}
        {activeTab === "outreach" && <OutreachHubSubpage />}
      </div>
    </div>
  );
};
