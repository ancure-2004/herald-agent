"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Archive,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Compass,
  Cpu,
  Flame,
  Gauge,
  Home,
  Layers,
  LayoutGrid,
  MessageSquare,
  Moon,
  Palette,
  PanelLeft,
  PanelLeftClose,
  PhoneCall,
  Send,
  Settings,
  ShieldCheck,
  Sliders,
  Sparkles,
  Sun,
  Table as TableIcon,
  User,
} from "lucide-react";
import { useCRM, CRMTab } from "@/context/CRMContext";

export function Sidebar() {
  const {
    sidebarCollapsed,
    setSidebarCollapsed,
    activeTab,
    setActiveTab,
    surface,
    setSurface,
    cockpitTab,
    setCockpitTab,
    pipelineBoardExpanded,
    setPipelineBoardExpanded,
    activeSmartView,
    setActiveSmartView,
    globalAutomationEnabled,
    toggleGlobalAutomation,
    hustles,
    activeHustleId,
    notify,
    isDarkMode,
    toggleDarkMode,
    settingsTab,
    setSettingsTab,
    setSettingsModalOpen,
    handleBackToWorkspace,
    operatorProfile,
  } = useCRM();

  const [profileMenuOpen, setProfileMenuOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const collapsedDropdownRef = useRef<HTMLDivElement | null>(null);

  const isSettings = activeTab === "settings";
  const isCockpit = surface === "cockpit" || activeTab === "autopilot";
  const currentHustle = hustles.find((h) => h.id === activeHustleId);

  // Close profile dropdown on click outside or Esc key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideOpen = dropdownRef.current?.contains(target);
      const insideCollapsed = collapsedDropdownRef.current?.contains(target);
      if (!insideOpen && !insideCollapsed) {
        setProfileMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setProfileMenuOpen(false);
      }
    };
    if (profileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileMenuOpen]);

  // Strict Surface Separation: Exactly one home per feature
  const managementNav = [
    { id: "dashboard", label: "Overview", icon: Home },
    { id: "inbox", label: "Inbox / WhatsApp", icon: MessageSquare },
    { id: "board", label: "Kanban Board", icon: LayoutGrid },
    { id: "table", label: "Leads Table", icon: TableIcon },
    { id: "calls", label: "Call Briefs", icon: PhoneCall },
  ];

  const cockpitNav = [
    { id: "attention", label: "Attention & Velocity", icon: Gauge },
    { id: "discovery", label: "Discovery Engine", icon: Compass },
    { id: "factory", label: "Demo Factory", icon: Layers },
    { id: "outreach", label: "Outreach Automation", icon: Send },
  ];

  const settingsNav = [
    { id: "blueprint", label: "Hustle & Blueprint", icon: Sparkles },
    { id: "waterfall", label: "Discovery Waterfall", icon: Layers },
    { id: "quotas", label: "Quotas & Safety Caps", icon: Sliders },
    { id: "mcp", label: "MCP & Integrations", icon: Cpu },
    { id: "appearance", label: "Appearance & UI", icon: Palette },
    { id: "profile", label: "Operator Profile", icon: User },
  ];

  // Shared Compact Popover Content (premium dark grayish styling)
  const renderProfilePopover = (positionClasses: string) => (
    <div
      className={`${positionClasses} rounded-2xl bg-[#242529] border border-zinc-700/80 shadow-2xl shadow-black/40 p-2 z-50 text-zinc-100 space-y-2`}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 p-1.5 pb-2.5 border-b border-zinc-700/70">
        <div className="w-8 h-8 rounded-xl bg-white text-zinc-950 flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
          {operatorProfile?.initials || "AT"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-white truncate">
            {operatorProfile?.name || "Ankur Tyagi"}
          </div>
          <div className="text-[10px] font-mono text-emerald-400 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="truncate">{operatorProfile?.role || "CRM Architect"}</span>
          </div>
        </div>
      </div>

      {/* Active Hustle Details */}
      <div className="p-2.5 rounded-xl bg-zinc-800/80 border border-zinc-700/60 space-y-1">
        <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-400">
          Active Hustle
        </div>
        <div className="text-xs font-bold text-white truncate">
          {currentHustle?.name || "Dental Clinic Websites"}
        </div>
        <div className="text-[11px] font-mono font-bold text-zinc-300 pt-0.5">
          ₹{(currentHustle?.deal_value_inr || 25000).toLocaleString()} INR
        </div>
      </div>

      {/* Action Menu Items */}
      <div className="space-y-0.5 pt-0.5">
        <button
          type="button"
          onClick={() => {
            setSettingsModalOpen(true);
            setProfileMenuOpen(false);
          }}
          className="w-full flex items-center justify-between py-2 px-2.5 rounded-xl text-xs font-medium text-zinc-200 hover:text-white hover:bg-zinc-700/60 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-2.5">
            <Settings className="w-4 h-4 text-zinc-400 group-hover:text-white group-hover:rotate-45 transition-transform" />
            <span>Settings</span>
          </div>
          <span className="text-[10px] font-mono text-zinc-400 group-hover:text-zinc-200">⌘,</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("sprint");
            setProfileMenuOpen(false);
          }}
          className="w-full flex items-center justify-between py-2 px-2.5 rounded-xl text-xs font-medium text-zinc-200 hover:text-white hover:bg-zinc-700/60 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Day Schedule</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300" />
        </button>

        <button
          type="button"
          onClick={() => {
            notify("Telemetry diagnostic report saved to system log.");
            setProfileMenuOpen(false);
          }}
          className="w-full flex items-center justify-between py-2 px-2.5 rounded-xl text-xs font-medium text-zinc-200 hover:text-white hover:bg-zinc-700/60 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Diagnostics</span>
          </div>
          <span className="text-[10px] font-mono font-bold text-emerald-400">OK</span>
        </button>

        {/* Light / Dark Mode Toggle Row */}
        <button
          type="button"
          onClick={(e) => {
            toggleDarkMode(e);
          }}
          className="w-full flex items-center justify-between py-2 px-2.5 rounded-xl text-xs font-medium text-zinc-200 hover:text-white hover:bg-zinc-700/60 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-2.5">
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-zinc-400 group-hover:text-white" />
            )}
            <span>{isDarkMode ? "Light Mode" : "Dark Mode"}</span>
          </div>
          <span className="text-[10px] font-mono text-zinc-400 uppercase font-semibold">
            {isDarkMode ? "Dark" : "Light"}
          </span>
        </button>
      </div>
    </div>
  );

  // -------------------------------------------------------------
  // COLLAPSED SIDEBAR CONTENT RENDERER
  // -------------------------------------------------------------
  const renderCollapsedContent = () => {
    const collapsedItems = isSettings ? settingsNav : isCockpit ? cockpitNav : managementNav;

    return (
      <div className="flex flex-col justify-between items-center w-full h-full">
        <div className="flex flex-col items-center w-full">
          {/* Top: Logo + Expand Toggle */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center font-bold text-xs shadow-xs">
              FM
            </div>

            <button
              type="button"
              onClick={() => setSidebarCollapsed(false)}
              className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              title="Expand Sidebar"
              aria-label="Expand Sidebar"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Compact Divider */}
          <div className="w-8 my-3 border-t border-slate-100 dark:border-[#27272A]" />

          {/* If Settings is active, show crisp Back to Workspace button */}
          {isSettings && (
            <button
              type="button"
              onClick={handleBackToWorkspace}
              className="w-10 h-10 mb-2 rounded-xl flex items-center justify-center bg-slate-100 hover:bg-zinc-900 hover:text-white dark:bg-zinc-800 dark:hover:bg-zinc-100 dark:hover:text-zinc-900 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
              title="Back to Workspace"
              aria-label="Back to Workspace"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          {/* Navigation Icons Grouped Right Below Divider (No middle gap!) */}
          <nav className="flex flex-col items-center gap-2">
            {collapsedItems.map((item) => {
              const Icon = item.icon;
              const active = isSettings
                ? settingsTab === item.id
                : isCockpit
                ? cockpitTab === item.id
                : activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (isSettings) {
                      setSettingsTab(item.id);
                    } else if (isCockpit) {
                      setCockpitTab(item.id as any);
                    } else {
                      setActiveTab(item.id as CRMTab);
                      if (item.id === "board") setPipelineBoardExpanded(true);
                    }
                  }}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer relative group ${
                    active
                      ? "bg-zinc-900 text-white shadow-sm dark:bg-white dark:text-zinc-900 scale-105"
                      : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                  title={item.label}
                  aria-label={item.label}
                >
                  <Icon className="w-4 h-4" />
                  {active && (
                    <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-4 rounded-full bg-zinc-900 dark:bg-white" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Footer Block: Pushed to bottom via mt-auto */}
        <div
          ref={collapsedDropdownRef}
          className="mt-auto flex flex-col items-center gap-2 pt-2 border-t border-slate-100 dark:border-[#27272A] w-full relative"
        >
          {/* Autopilot Indicator Button with crisp emerald dot */}
          <button
            type="button"
            onClick={toggleGlobalAutomation}
            className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all cursor-pointer relative ${
              globalAutomationEnabled
                ? "bg-zinc-900 text-white border-zinc-700 dark:bg-white dark:text-zinc-900"
                : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
            }`}
            title={
              globalAutomationEnabled
                ? "Autopilot Active (Click to pause)"
                : "Autopilot Paused (Click to activate)"
            }
            aria-label="Toggle Autopilot"
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                globalAutomationEnabled
                  ? "bg-emerald-500 ring-4 ring-emerald-500/15"
                  : "bg-amber-500 ring-4 ring-amber-500/15"
              }`}
            />
          </button>

          {/* User Profile Avatar (Click to open compact Popover) */}
          <button
            type="button"
            onClick={() => setProfileMenuOpen((prev) => !prev)}
            className="w-9 h-9 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center font-bold text-xs shadow-xs hover:ring-2 hover:ring-zinc-400 transition-all cursor-pointer"
            title="Captain Profile & Settings"
            aria-label="User Profile"
            aria-expanded={profileMenuOpen}
          >
            {operatorProfile?.initials || "AT"}
          </button>

          {/* Compact Popover anchored to the right side of the collapsed dock */}
          {profileMenuOpen &&
            renderProfilePopover(
              "absolute left-full bottom-0 ml-3 w-64 animate-in fade-in slide-in-from-left-2 duration-150"
            )}
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------
  // EXPANDED SIDEBAR CONTENT RENDERER
  // -------------------------------------------------------------
  const renderExpandedContent = () => (
    <div className="flex flex-col justify-between w-full h-full min-w-0">
      {/* Top Header: Brand Logo + Workspace Name + Collapse Toggle */}
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center font-bold text-xs shadow-xs">
            H
          </div>
          <div>
            <div className="text-xs font-bold text-zinc-900 dark:text-white leading-tight">
              Herald
            </div>
            <div className="text-[10px] text-slate-400 font-medium leading-tight">
              {isSettings ? "Workspace Settings" : "Operations Workspace"}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setSidebarCollapsed(true)}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
          title="Collapse Sidebar"
          aria-label="Collapse Sidebar"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* Compact Divider */}
      <div className="my-3 border-t border-slate-100 dark:border-[#27272A]" />

      {/* Navigation Menu Grouped at Top */}
      <div className="overflow-y-auto no-scrollbar pr-0.5">
        {isSettings ? (
          <div>
            {/* Top Action Button: Back to Workspace */}
            <button
              type="button"
              onClick={handleBackToWorkspace}
              className="w-full bg-slate-100 hover:bg-zinc-900 hover:text-white dark:bg-zinc-800 dark:hover:bg-zinc-100 dark:hover:text-zinc-900 text-zinc-800 dark:text-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold flex items-center gap-2 transition-colors mb-4 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Workspace</span>
            </button>

            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              Settings &amp; Preferences
            </div>

            <nav className="space-y-1">
              {settingsNav.map((item) => {
                const Icon = item.icon;
                const active = settingsTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSettingsTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      active
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-xl font-medium shadow-xs"
                        : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        ) : (
          <div>
            <div className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              {isCockpit ? "Cockpit Flight Deck" : "CRM Management"}
            </div>

            <nav className="space-y-1">
              {isCockpit ? (
                /* COCKPIT NAVIGATION: 4 COCKPIT TABS */
                <div className="space-y-1">
                  {cockpitNav.map((item) => {
                    const Icon = item.icon;
                    const active = cockpitTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setCockpitTab(item.id as any)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          active
                            ? "bg-zinc-900 text-white shadow-sm dark:bg-white dark:text-zinc-900"
                            : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* MANAGEMENT NAVIGATION: DASHBOARD, INBOX, CALLS, BOARD, TABLE */
                managementNav.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;

                  if (item.id === "board") {
                    return (
                      <div key="board" className="space-y-1">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab("board");
                            setPipelineBoardExpanded((prev) =>
                              activeTab === "board" ? !prev : true
                            );
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            active
                              ? "bg-zinc-900 text-white shadow-sm dark:bg-white dark:text-zinc-900"
                              : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </div>
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setPipelineBoardExpanded(!pipelineBoardExpanded);
                            }}
                            className="p-1 rounded-md hover:bg-white/20 transition-colors"
                          >
                            {pipelineBoardExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                            )}
                          </div>
                        </button>

                        {/* Sub-menu of Smart Queues */}
                        {pipelineBoardExpanded && (
                          <div className="ml-4 pl-2.5 border-l-2 border-slate-200 dark:border-[#27272A] space-y-0.5 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                            {[
                              { slug: "all_active", label: "All Active Pipeline", icon: LayoutGrid },
                              { slug: "review_tray", label: "Review Tray (Ready)", icon: CheckCircle2 },
                              { slug: "due_today", label: "Due Today & Overdue", icon: Clock },
                              { slug: "hot_intent", label: "Hot Demo Viewers", icon: Flame },
                              { slug: "replied_warm", label: "Active Replies", icon: MessageSquare },
                              { slug: "archived", label: "Archived & DNC", icon: Archive },
                            ].map((v) => {
                              const SubIcon = v.icon;
                              const isSubActive =
                                activeTab === "board" && activeSmartView === v.slug;
                              return (
                                <button
                                  key={v.slug}
                                  type="button"
                                  onClick={() => {
                                    setActiveSmartView(v.slug);
                                    setActiveTab("board");
                                  }}
                                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer relative group ${
                                    isSubActive
                                      ? "bg-slate-100 text-slate-900 font-medium dark:bg-white/[0.1] dark:text-white"
                                      : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/40"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                        isSubActive
                                          ? "bg-zinc-900 dark:bg-white"
                                          : "bg-slate-300 dark:bg-slate-600"
                                      }`}
                                    />
                                    <SubIcon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                    <span className="truncate">{v.label}</span>
                                  </div>
                                  {isSubActive && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-white shrink-0" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id as CRMTab)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        active
                          ? "bg-zinc-900 text-white shadow-sm dark:bg-white dark:text-zinc-900"
                          : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })
              )}
            </nav>
          </div>
        )}
      </div>

      {/* Bottom Footer Block: Pushed to bottom via mt-auto */}
      <div
        ref={dropdownRef}
        className="mt-auto pt-3 border-t border-slate-100 dark:border-[#27272A] space-y-2.5 shrink-0"
      >
        {/* Compact Autopilot Status Card with crisp emerald dot */}
        <div className="bg-zinc-900 text-white dark:bg-zinc-800 rounded-xl p-2.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                globalAutomationEnabled
                  ? "bg-emerald-500 ring-4 ring-emerald-500/15"
                  : "bg-amber-500 ring-4 ring-amber-500/15"
              }`}
            />
            <div className="truncate">
              <div className="text-[11px] font-bold leading-tight truncate">
                {globalAutomationEnabled ? "Autopilot Active" : "Autopilot Paused"}
              </div>
              <div className="text-[9px] text-zinc-400 leading-tight">
                {globalAutomationEnabled ? "Outreach & guards live" : "Manual review mode"}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleGlobalAutomation}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors shrink-0 ${
              globalAutomationEnabled
                ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                : "bg-emerald-600 hover:bg-emerald-500 text-white"
            }`}
          >
            {globalAutomationEnabled ? "Pause" : "Enable"}
          </button>
        </div>

        {/* User Profile Footer Row with relative popover wrapper */}
        <div className="pt-2 border-t border-slate-100 dark:border-[#27272A]/80 relative">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setProfileMenuOpen((prev) => !prev)}
              className="flex items-center gap-2.5 min-w-0 cursor-pointer group text-left flex-1 py-1 px-1 rounded-xl hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-colors"
              title="Captain Profile & Settings"
              aria-expanded={profileMenuOpen}
            >
              <div className="w-8 h-8 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center font-bold text-xs shadow-xs group-hover:ring-2 group-hover:ring-zinc-400 transition-all shrink-0">
                {operatorProfile?.initials || "AT"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate">
                  {operatorProfile?.name || "Ankur Tyagi"}
                </div>
                <div className="text-[10px] text-slate-400 font-medium truncate">
                  {operatorProfile?.role || "CRM Architect"}
                </div>
              </div>
            </button>

            {/* Chevron Arrow Button opening popover anchored cleanly above account button */}
            <button
              type="button"
              onClick={() => setProfileMenuOpen((prev) => !prev)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Toggle Profile Menu"
              aria-label="Toggle Profile Menu"
            >
              <ChevronUp
                className={`w-4 h-4 transition-transform duration-200 ${
                  profileMenuOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>

          {/* Compact Profile Popover anchored right above account button aligned with sidebar edges */}
          {profileMenuOpen &&
            renderProfilePopover(
              "absolute left-0 right-0 bottom-full mb-2 animate-in fade-in slide-in-from-bottom-2 duration-150"
            )}
        </div>
      </div>
    </div>
  );

  return (
    <aside
      className={`shrink-0 m-3 h-[calc(100dvh-1.5rem)] rounded-2xl border border-slate-200/80 dark:border-[#27272A] bg-white dark:bg-[#18181B] shadow-sm flex flex-col justify-start transition-all duration-200 z-20 relative ${
        sidebarCollapsed
          ? "w-18 p-2.5 items-center"
          : "w-18 md:w-64 p-2.5 md:p-3.5 items-center md:items-stretch"
      }`}
    >
      {sidebarCollapsed ? (
        renderCollapsedContent()
      ) : (
        <>
          <div className="w-full h-full flex flex-col md:hidden">
            {renderCollapsedContent()}
          </div>
          <div className="w-full h-full hidden md:flex flex-col min-w-0">
            {renderExpandedContent()}
          </div>
        </>
      )}
    </aside>
  );
}
