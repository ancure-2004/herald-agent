"use client";

import React, { useState } from "react";
import { DemoRun } from "../types";
import {
  X,
  Smartphone,
  Tablet,
  Monitor,
  Maximize2,
  RotateCw,
  ExternalLink,
  QrCode,
  ShieldCheck,
  Check,
  Copy,
} from "lucide-react";

interface MultiDevicePreviewDrawerProps {
  run: DemoRun | null;
  isOpen: boolean;
  onClose: () => void;
}

type DeviceType = "mobile" | "tablet" | "desktop" | "fullscreen";

export const MultiDevicePreviewDrawer: React.FC<MultiDevicePreviewDrawerProps> = ({
  run,
  isOpen,
  onClose,
}) => {
  const [device, setDevice] = useState<DeviceType>("mobile");
  const [zoom, setZoom] = useState<number>(100);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen || !run || !run.preview) return null;

  const getViewportDimensions = () => {
    switch (device) {
      case "mobile":
        return { width: 375, height: 812, label: "iPhone 15 Pro (375 x 812)" };
      case "tablet":
        return { width: 768, height: 1024, label: "iPad Mini (768 x 1024)" };
      case "desktop":
        return { width: 1100, height: 720, label: "Desktop Viewport (1100 x 720)" };
      case "fullscreen":
      default:
        return { width: "100%", height: "100%", label: "100% Responsive Fluid" };
    }
  };

  const dim = getViewportDimensions();

  const handleCopy = () => {
    if (run.preview) {
      navigator.clipboard.writeText(run.preview.ephemeralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      <div className="w-full max-w-[min(94vw,1280px)] h-full bg-[#0E1015] border-l border-white/[0.1] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Drawer Header Toolbar */}
        <div className="h-14 px-4 bg-[#141721] border-b border-white/[0.08] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>{run.clinic.name}</span>
                <span className="font-mono text-[10px] text-slate-400 bg-white/[0.05] px-1.5 py-0.5 rounded border border-white/[0.08]">
                  {run.templateId}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
                <span>{run.preview.ephemeralUrl}</span>
                <button onClick={handleCopy} className="text-slate-500 hover:text-white" title="Copy URL">
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>

          {/* Device Segmented Switcher */}
          <div className="flex items-center p-1 rounded-lg bg-[#1C1E24] border border-white/[0.08] text-xs">
            <button
              onClick={() => setDevice("mobile")}
              className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors ${
                device === "mobile" ? "bg-[#292C35] text-white shadow-xs" : "text-slate-400 hover:text-white"
              }`}
              title="Mobile (375x812)"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Mobile</span>
            </button>

            <button
              onClick={() => setDevice("tablet")}
              className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors ${
                device === "tablet" ? "bg-[#292C35] text-white shadow-xs" : "text-slate-400 hover:text-white"
              }`}
              title="Tablet (768x1024)"
            >
              <Tablet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Tablet</span>
            </button>

            <button
              onClick={() => setDevice("desktop")}
              className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors ${
                device === "desktop" ? "bg-[#292C35] text-white shadow-xs" : "text-slate-400 hover:text-white"
              }`}
              title="Desktop (1100x720)"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Desktop</span>
            </button>

            <button
              onClick={() => setDevice("fullscreen")}
              className={`px-2 py-1 rounded transition-colors ${
                device === "fullscreen" ? "bg-[#292C35] text-white shadow-xs" : "text-slate-400 hover:text-white"
              }`}
              title="Full Screen Fluid"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Action Utilities & Close */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowQrModal(true)}
              className="p-1.5 rounded-md bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white transition-colors"
              title="Show QR Code for Phone Test"
            >
              <QrCode className="w-4 h-4" />
            </button>

            <a
              href={run.preview.ephemeralUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-md bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white transition-colors"
              title="Open in New Tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            <button
              onClick={onClose}
              className="p-1.5 rounded-md bg-white/[0.05] hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition-colors ml-2"
              title="Close Drawer (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Workbench Stage Canvas */}
        <div className="flex-1 bg-[#090A0C] p-6 flex flex-col items-center justify-center overflow-auto relative">
          {/* Bezel Container */}
          <div
            style={{
              width: typeof dim.width === "number" ? `${dim.width}px` : dim.width,
              height: typeof dim.height === "number" ? `${dim.height}px` : dim.height,
              transform: `scale(${zoom / 100})`,
              transformOrigin: "center center",
            }}
            className={`transition-all duration-200 bg-[#141721] rounded-2xl border-4 border-slate-800 shadow-2xl overflow-hidden flex flex-col relative ${
              device === "mobile" ? "ring-8 ring-slate-900/80" : ""
            }`}
          >
            {/* Mock Device Top Bezel */}
            <div className="h-7 bg-slate-900 px-3 flex items-center justify-between text-[10px] font-mono text-slate-400 border-b border-white/[0.06] select-none">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                https://demos.homieslab.com
              </span>
              <span>{dim.label}</span>
            </div>

            {/* Simulated Live Dental Template Landing Page */}
            <div className="flex-1 bg-gradient-to-b from-slate-950 via-slate-900 to-black p-6 overflow-y-auto text-slate-100 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="font-bold text-sm text-indigo-400">{run.clinic.name}</div>
                  <div className="text-[10px] font-mono text-slate-400">Delhi NCR Clinic</div>
                </div>

                <div className="space-y-2 py-4">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Bespoke High-Converting Architecture
                  </span>
                  <h2 className="text-xl font-black text-white tracking-tight">
                    World-Class Aesthetic &amp; Implant Dentistry
                  </h2>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Designed specifically for {run.clinic.name}. Featuring automated WhatsApp 1-tap booking, verified doctor credentials, and 3D treatment showcases.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] space-y-2">
                  <div className="text-xs font-semibold text-slate-200">Featured Consultation Offerings</div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-300">
                    <div className="p-2 rounded bg-white/[0.03] border border-white/[0.05]">&bull; Dental Implants</div>
                    <div className="p-2 rounded bg-white/[0.03] border border-white/[0.05]">&bull; Invisalign Ortho</div>
                    <div className="p-2 rounded bg-white/[0.03] border border-white/[0.05]">&bull; Laser Whitening</div>
                    <div className="p-2 rounded bg-white/[0.03] border border-white/[0.05]">&bull; Smile Makeover</div>
                  </div>
                </div>
              </div>

              <div className="pt-6 space-y-2">
                <button className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2">
                  <span>Book WhatsApp Consultation</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
                <div className="text-center text-[10px] font-mono text-slate-500">
                  Lighthouse 99/100 &bull; SSR Edge Rendered &bull; Mobile Ready
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* QR Code Modal */}
        {showQrModal && (
          <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-[#17181D] border border-white/[0.12] rounded-xl p-5 max-w-xs w-full text-center space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-indigo-400" />
                  Scan to Test on Mobile
                </h4>
                <button onClick={() => setShowQrModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* QR Representation */}
              <div className="w-48 h-48 mx-auto bg-white p-3 rounded-lg flex items-center justify-center">
                <div className="w-full h-full border-4 border-black p-2 flex flex-col justify-between">
                  <div className="flex justify-between">
                    <div className="w-8 h-8 bg-black"></div>
                    <div className="w-8 h-8 bg-black"></div>
                  </div>
                  <div className="text-[10px] font-mono text-black font-bold text-center">
                    QR DEMO LINK
                  </div>
                  <div className="flex justify-between">
                    <div className="w-8 h-8 bg-black"></div>
                    <div className="w-8 h-8 bg-black/40"></div>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 font-mono truncate">
                {run.preview.ephemeralUrl}
              </p>

              <button
                onClick={() => setShowQrModal(false)}
                className="w-full py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
