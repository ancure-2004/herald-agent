"use client";

import React from "react";
import { DispatchEngineSettings } from "../types";
import { Shield, Clock, Sliders, CheckCircle2, Pause, Play } from "lucide-react";

interface SafetyControlsCardProps {
  settings: DispatchEngineSettings;
  onUpdateSettings: (settings: Partial<DispatchEngineSettings>) => void;
}

export const SafetyControlsCard: React.FC<SafetyControlsCardProps> = ({
  settings,
  onUpdateSettings,
}) => {
  return (
    <div className="p-4 rounded-xl bg-[#111215] border border-white/[0.08] shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Safety &amp; Pacing Controls
          </h3>
        </div>

        {/* Master Queue Switch */}
        <button
          onClick={() => onUpdateSettings({ masterQueueRunning: !settings.masterQueueRunning })}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm transition-all ${
            settings.masterQueueRunning
              ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30"
              : "bg-slate-800 hover:bg-slate-700 text-slate-300"
          }`}
        >
          {settings.masterQueueRunning ? (
            <>
              <Play className="w-3 h-3 fill-white" />
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
          <select
            value={settings.batchSizeLimit}
            onChange={(e) => onUpdateSettings({ batchSizeLimit: parseInt(e.target.value) })}
            className="w-full px-2.5 py-1.5 bg-[#17181D] border border-white/[0.08] rounded-md text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
          >
            <option value={10}>10 Leads per burst</option>
            <option value={25}>25 Leads per burst</option>
            <option value={50}>50 Leads per burst (Standard)</option>
            <option value={100}>100 Leads per burst (High volume)</option>
          </select>
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
