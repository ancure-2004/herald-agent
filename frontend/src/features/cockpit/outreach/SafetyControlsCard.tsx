"use client";

import React from "react";
import { Select } from "@/components/ui/Select";
import { DispatchEngineSettings } from "../types";
import { Shield, Clock, Sliders, CheckCircle2, Pause, Play } from "lucide-react";

interface SafetyControlsCardProps {
  settings: DispatchEngineSettings;
  onUpdateSettings: (settings: Partial<DispatchEngineSettings>) => void;
  /** When true the parent's live WA automation is running; overrides masterQueueRunning display */
  isLiveRunning?: boolean;
}

export const SafetyControlsCard: React.FC<SafetyControlsCardProps> = ({
  settings,
  onUpdateSettings,
  isLiveRunning = false,
}) => {
  // The displayed "active" state is the live subprocess running state if available,
  // otherwise fall back to the local settings toggle.
  const isActive = isLiveRunning || settings.masterQueueRunning;
  return (
    <div className="p-4 rounded-xl bg-[#111215] border border-white/[0.08] shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Safety &amp; Pacing Controls
          </h3>
        </div>

        {/* Master Queue Switch — wired to live WA automation */}
        <button
          onClick={() => onUpdateSettings({ masterQueueRunning: !isActive })}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm transition-all ${
            isActive
              ? "bg-emerald-600 hover:bg-rose-600 text-white shadow-emerald-900/30"
              : "bg-slate-800 hover:bg-slate-700 text-slate-300"
          }`}
          title={isActive ? "Click to stop WA automation" : "Click to start WA automation"}
        >
          {isActive ? (
            <>
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span>Queue: ACTIVE</span>
            </>
          ) : (
            <>
              <Pause className="w-3 h-3 fill-slate-300" />
              <span>Queue: PAUSED</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        {/* Jitter Slider */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-400">Randomized Jitter Delay</span>
            <span className="text-indigo-400 font-bold tabular-nums">
              {settings.minDelaySeconds}s - {settings.maxDelaySeconds}s
            </span>
          </div>
          <input
            type="range"
            min="60"
            max="600"
            step="15"
            value={settings.maxDelaySeconds}
            onChange={(e) => onUpdateSettings({ maxDelaySeconds: parseInt(e.target.value) })}
            className="w-full accent-indigo-500 bg-white/[0.1] h-1.5 rounded-lg cursor-pointer"
          />
          <div className="text-[10px] text-slate-500">
            Simulates natural human typing and sending intervals.
          </div>
        </div>

        {/* Batch Size Limiter */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-mono text-slate-400 block">
            Burst Release Batch Limiter
          </label>
          <Select
            value={String(settings.batchSizeLimit)}
            onChange={(val) => onUpdateSettings({ batchSizeLimit: parseInt(val) })}
            options={[
              { value: "10", label: "10 Leads per burst" },
              { value: "25", label: "25 Leads per burst" },
              { value: "50", label: "50 Leads per burst (Standard)" },
              { value: "100", label: "100 Leads per burst (High volume)" },
            ]}
            className="w-full"
            triggerClassName="!py-1.5 !px-2.5 font-mono !text-xs !bg-[#17181D] !border-white/[0.08] !text-white"
          />
          <div className="text-[10px] text-slate-500">
            Strict ceiling prevents sudden ESP spikes.
          </div>
        </div>

        {/* Sending Window */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Sending Window (Prospect Local)</span>
          </div>
          <div className="p-2 rounded-md bg-[#17181D] border border-white/[0.08] font-mono text-xs text-emerald-400 font-bold flex items-center justify-between">
            <span>{settings.sendingWindowStart} - {settings.sendingWindowEnd}</span>
            <span className="text-[10px] text-slate-400 font-sans font-normal">Active Today</span>
          </div>
          <div className="text-[10px] text-slate-500">
            Zero sends dispatched outside target working hours.
          </div>
        </div>
      </div>
    </div>
  );
};
