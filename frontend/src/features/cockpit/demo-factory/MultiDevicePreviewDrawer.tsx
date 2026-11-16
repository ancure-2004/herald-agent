"use client";

import React, { useState } from "react";
import { DemoRun } from "../types";
import {
  X,
  Smartphone,
  Tablet,
  Monitor,
  Maximize2,
  ExternalLink,
  QrCode,
  ShieldCheck,
  Check,
  Copy,
  Layers,
  Sparkles,
  Palette,
  RotateCw,
} from "lucide-react";

interface MultiDevicePreviewDrawerProps {
  run: DemoRun | null;
  isOpen: boolean;
  onClose: () => void;
}

type DeviceType = "mobile" | "tablet" | "desktop" | "fullscreen";
type ThemeMode = "choice" | "modern" | "premium" | "warm";

export const MultiDevicePreviewDrawer: React.FC<MultiDevicePreviewDrawerProps> = ({
  run,
  isOpen,
  onClose,
}) => {
  const [device, setDevice] = useState<DeviceType>("mobile");
  const [theme, setTheme] = useState<ThemeMode>("modern");
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [iframeKey, setIframeKey] = useState<number>(0);

  if (!isOpen || !run || !run.preview) return null;

  const slug = run.clinic.website || run.clinic.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const baseUrl = "http://localhost:3001";

  const getThemeUrl = (selectedTheme: ThemeMode): string => {
    if (selectedTheme === "choice") {
      return run.preview?.choiceUrl || `${baseUrl}/demo/${slug}`;
    } else if (selectedTheme === "premium") {
      return run.preview?.premiumUrl || `${baseUrl}/premium/${slug}`;
    } else if (selectedTheme === "warm") {
      return run.preview?.warmUrl || `${baseUrl}/warm/${slug}`;
    }
    return run.preview?.modernUrl || `${baseUrl}/modern/${slug}`;
  };

  const currentUrl = getThemeUrl(theme);

  const getViewportDimensions = () => {
    switch (device) {
      case "mobile":
        return { width: 375, height: 780, label: "iPhone 15 Pro (375 x 780)" };
      case "tablet":
        return { width: 768, height: 960, label: "iPad Mini (768 x 960)" };
      case "desktop":
        return { width: 1100, height: 700, label: "Desktop Viewport (1100 x 700)" };
      case "fullscreen":
      default:
        return { width: "100%", height: "100%", label: "100% Responsive Fluid" };
    }
  };

  const dim = getViewportDimensions();

  const handleCopy = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefreshIframe = () => {
    setIframeKey((prev) => prev + 1);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      <div className="w-full max-w-[min(94vw,1320px)] h-full bg-[#0E1015] border-l border-white/[0.1] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Drawer Header Toolbar */}
        <div className="h-14 px-4 bg-[#141721] border-b border-white/[0.08] flex items-center justify-between gap-4 flex-wrap">
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
                <span className="max-w-[280px] sm:max-w-md truncate">{currentUrl}</span>
                <button onClick={handleCopy} className="text-slate-500 hover:text-white cursor-pointer" title="Copy URL">
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>

          {/* Theme Selector Strip */}
          <div className="flex items-center p-1 rounded-xl bg-[#1C1E24] border border-white/[0.08] text-xs">
            <button
              onClick={() => setTheme("choice")}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                theme === "choice"
                  ? "bg-indigo-600 text-white font-semibold shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Choice Landing Page (/demo/<slug>)"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Choice Page</span>
            </button>

            <button
              onClick={() => setTheme("modern")}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                theme === "modern"
                  ? "bg-indigo-600 text-white font-semibold shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Modern Luxury Theme (/modern/<slug>)"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Modern</span>
            </button>

            <button
              onClick={() => setTheme("premium")}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                theme === "premium"
                  ? "bg-indigo-600 text-white font-semibold shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Premium Gold Aesthetic Theme (/premium/<slug>)"
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Premium</span>
            </button>

            <button
              onClick={() => setTheme("warm")}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                theme === "warm"
                  ? "bg-indigo-600 text-white font-semibold shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Warm Boutique Aesthetic Theme (/warm/<slug>)"
            >
              <span>Warm</span>
            </button>
          </div>

          {/* Device Segmented Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-[#1C1E24] border border-white/[0.08] text-xs">
            <button
              onClick={() => setDevice("mobile")}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                device === "mobile" ? "bg-[#292C35] text-white shadow-xs font-semibold" : "text-slate-400 hover:text-white"
              }`}
              title="Mobile (375x780)"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Mobile</span>
            </button>

            <button
              onClick={() => setDevice("tablet")}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                device === "tablet" ? "bg-[#292C35] text-white shadow-xs font-semibold" : "text-slate-400 hover:text-white"
              }`}
              title="Tablet (768x960)"
            >
              <Tablet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Tablet</span>
            </button>

            <button
              onClick={() => setDevice("desktop")}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                device === "desktop" ? "bg-[#292C35] text-white shadow-xs font-semibold" : "text-slate-400 hover:text-white"
              }`}
              title="Desktop (1100x700)"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Desktop</span>
            </button>

            <button
              onClick={() => setDevice("fullscreen")}
              className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
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
              onClick={handleRefreshIframe}
              className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Refresh Iframe"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowQrModal(true)}
              className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Show QR Code for Phone Test"
            >
              <QrCode className="w-4 h-4" />
            </button>

            <a
              href={currentUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white transition-colors"
              title="Open in New Tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition-colors ml-2 cursor-pointer"
              title="Close Drawer (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Workbench Stage Canvas */}
        <div className="flex-1 bg-[#090A0C] p-4 sm:p-6 flex flex-col items-center justify-center overflow-auto relative">
          {/* Bezel Container */}
          <div
            style={{
              width: typeof dim.width === "number" ? `${dim.width}px` : dim.width,
              height: typeof dim.height === "number" ? `${dim.height}px` : dim.height,
              maxWidth: "100%",
              maxHeight: "100%",
            }}
            className={`transition-all duration-200 bg-[#141721] rounded-2xl border-4 border-slate-800 shadow-2xl overflow-hidden flex flex-col relative ${
              device === "mobile" ? "ring-8 ring-slate-900/80 rounded-[32px]" : device === "tablet" ? "ring-8 ring-slate-900/60" : ""
            }`}
          >
            {/* Device Top Bezel & URL bar */}
            <div className="h-8 bg-slate-900 px-3 flex items-center justify-between text-[11px] font-mono text-slate-400 border-b border-white/[0.06] select-none shrink-0">
              <span className="flex items-center gap-1.5 truncate">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">{currentUrl}</span>
              </span>
              <span className="text-[10px] text-slate-500 shrink-0 ml-2">{dim.label}</span>
            </div>

            {/* Real Interactive Iframe Loading http://localhost:3001 */}
            <div className="flex-1 w-full h-full bg-white relative">
              <iframe
                key={iframeKey}
                src={currentUrl}
                title={`${run.clinic.name} Live Demo Preview`}
                className="w-full h-full border-0"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
              />
            </div>
          </div>
        </div>

        {/* QR Code Modal */}
        {showQrModal && (
          <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-[#17181D] border border-white/[0.12] rounded-2xl p-5 max-w-xs w-full text-center space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-indigo-400" />
                  Scan to Test on Mobile
                </h4>
                <button onClick={() => setShowQrModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* QR Representation */}
              <div className="w-48 h-48 mx-auto bg-white p-3 rounded-xl flex items-center justify-center shadow-inner">
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

              <p className="text-[11px] text-slate-400 font-mono truncate px-1">
                {currentUrl}
              </p>

              <button
                onClick={() => setShowQrModal(false)}
                className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer transition-colors"
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
