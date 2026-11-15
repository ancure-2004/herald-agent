"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Archive,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Compass,
  Flame,
  Gauge,
  Home,
  Layers,
  LayoutGrid,
  MessageSquare,
  Moon,
  PanelLeft,
  PanelLeftClose,
  PhoneCall,
  Send,
  Settings,
  ShieldCheck,
  Sliders,
  Sun,
  Table as TableIcon,
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
  } = useCRM();

  const [profileMenuOpen, setProfileMenuOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const isCockpit = surface === "cockpit" || activeTab === "autopilot";
  const currentHustle = hustles.find((h) => h.id === activeHustleId);

  // Close profile dropdown on click outside or Esc key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
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

  // Shared Compact Popover Content (w-56 with tight padding)
  const renderProfilePopover = (positionClasses: string) => (
    <div
      className={`${positionClasses} w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl p-1.5 z-50 duration-150 space-y-1.5`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 p-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="w-7 h-7 rounded-lg bg-zinc-900 dark:bg-white flex items-center justify-center font-bold text-white dark:text-zinc-900 text-[11px] shadow-xs shrink-0">
          AT
        </div>
        <div className="min-w-0">
          <div className="text-xs font-bold text-slate-900 dark:text-white truncate">Captain Ankur</div>
          <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Lead Operator
          </div>
        </div>
      </div>

      {/* Active Hustle Details */}
      <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-0.5">
        <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400">
          Active Hustle
        </div>
        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
          {currentHustle?.name || "Dental Clinic Websites"}
        </div>
        <div className="text-[10px] font-mono font-bold text-zinc-900 dark:text-white pt-0.5">
          ₹{(currentHustle?.deal_value_inr || 25000).toLocaleString()} INR
        </div>
      </div>

      {/* Action Menu Items */}
      <div className="space-y-0.5 pt-0.5">
        <button
          type="button"
          onClick={() => {
            setActiveTab("settings");
            setProfileMenuOpen(false);
          }}
          className="w-full flex items-center justify-between py-1.5 px-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-2">
            <Settings className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300 group-hover:rotate-45 transition-transform" />
            <span>Settings</span>
          </div>
          <ChevronRight className="w-3 h-3 text-slate-400" />
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("settings");
            setProfileMenuOpen(false);
          }}
          className="w-full flex items-center justify-between py-1.5 px-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-indigo-500" />
            <span>Hustle Settings</span>
          </div>
          <ChevronRight className="w-3 h-3 text-slate-400" />
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("sprint");
            setProfileMenuOpen(false);
          }}
          className="w-full flex items-center justify-between py-1.5 px-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Day Schedule</span>
          </div>
          <ChevronRight className="w-3 h-3 text-slate-400" />
        </button>

        <button
          type="button"
          onClick={() => {
            notify("Telemetry diagnostic report saved to system log.");
            setProfileMenuOpen(false);
          }}
          className="w-full flex items-center justify-between py-1.5 px-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Diagnostics</span>
          </div>
          <span className="text-[10px] font-mono font-bold text-emerald-500">OK</span>
        </button>

        {/* Light / Dark Mode Toggle Row */}
        <button
          type="button"
          onClick={() => {
            toggleDarkMode();
          }}
          className="w-full flex items-center justify-between py-1.5 px-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            {isDarkMode ? (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
            )}
            <span>{isDarkMode ? "Light Mode" : "Dark Mode"}</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 uppercase">
            {isDarkMode ? "Dark" : "Light"}
          </span>
        </button>
      </div>
    </div>
  );

  // -------------------------------------------------------------
  // CLOSED / COLLAPSED SIDEBAR DOCK
  // -------------------------------------------------------------
  if (sidebarCollapsed) {
    const collapsedItems = isCockpit ? cockpitNav : managementNav;

    return (
      <aside className="w-18 shrink-0 m-3 h-[calc(100dvh-1.5rem)] rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-2.5 flex flex-col justify-start items-center transition-all duration-200 z-20 relative">
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
        <div className="w-8 my-3 border-t border-slate-100 dark:border-slate-800" />

        {/* Navigation Icons Grouped Right Below Divider (No middle gap!) */}
        <nav className="flex flex-col items-center gap-2">
          {collapsedItems.map((item) => {
            const Icon = item.icon;
            const active = isCockpit
              ? cockpitTab === item.id
              : activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (isCockpit) {
                    setCockpitTab(item.id as any);
                  } else {
                    setActiveTab(item.id as CRMTab);
                    if (item.id === "board") setPipelineBoardExpanded(true);
                  }
                }}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer relative group ${
                  active
                    ? "bg-zinc-900 text-white shadow-sm dark:bg-white dark:text-zinc-900 scale-105"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
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

        {/* Bottom Footer Block: Pushed to bottom via mt-auto */}
        <div
          ref={dropdownRef}
          className="mt-auto flex flex-col items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 w-full relative"
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
            AT
          </button>

          {/* Compact Popover anchored to the right of the collapsed dock */}
          {profileMenuOpen &&
            renderProfilePopover(
              "absolute bottom-0 left-full ml-3 animate-in fade-in slide-in-from-left-2"
            )}
        </div>
      </aside>
    );
  }

  // -------------------------------------------------------------
  // OPEN SIDEBAR
  // -------------------------------------------------------------
  return (
    <aside className="w-64 shrink-0 m-3 h-[calc(100dvh-1.5rem)] rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-3.5 flex flex-col justify-start transition-all duration-200 z-20 relative">
      {/* Top Header: Brand Logo + Workspace Name + Collapse Toggle */}
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center font-bold text-xs shadow-xs">
            FM
          </div>
          <div>
            <div className="text-xs font-bold text-zinc-900 dark:text-white leading-tight">
              FirstMate
            </div>
            <div className="text-[10px] text-slate-400 font-medium leading-tight">
              CRM Workspace
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
      <div className="my-3 border-t border-slate-100 dark:border-slate-800" />

      {/* Navigation Menu Grouped at Top */}
      <div className="overflow-y-auto no-scrollbar pr-0.5">
        <div className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
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
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
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
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
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
                      <div className="ml-4 pl-2.5 border-l-2 border-slate-200 dark:border-slate-800 space-y-0.5 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
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
                                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/40"
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
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
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

      {/* Bottom Footer Block: Pushed to bottom via mt-auto */}
      <div
        ref={dropdownRef}
        className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5 shrink-0 relative"
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

        {/* User Profile Footer Row */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setProfileMenuOpen((prev) => !prev)}
            className="flex items-center gap-2.5 min-w-0 cursor-pointer group text-left flex-1 py-1 px-1 rounded-xl hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-colors"
            title="Captain Profile & Settings"
            aria-expanded={profileMenuOpen}
          >
            <div className="w-8 h-8 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center font-bold text-xs shadow-xs group-hover:ring-2 group-hover:ring-zinc-400 transition-all shrink-0">
              AT
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate">
                Ankur Tyagi
              </div>
              <div className="text-[10px] text-slate-400 font-medium truncate">
                CRM Architect
              </div>
            </div>
          </button>

          {/* Chevron Arrow Button opening popover anchored cleanly above footer */}
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

        {/* Compact Profile Popover (w-56) anchored above the footer */}
        {profileMenuOpen &&
          renderProfilePopover(
            "absolute bottom-full left-0 mb-2 animate-in fade-in slide-in-from-bottom-2"
          )}
      </div>
    </aside>
  );
}
