"use client";

import React, { useState } from "react";
import { sendDemoEvent } from "./ViewTracker";

interface DemoSwitcherClientProps {
  slug: string;
  clinicName: string;
  doctorName: string;
  isExpired: boolean;
  builderWhatsAppNumber?: string;
}

export default function DemoSwitcherClient({
  slug,
  clinicName,
  doctorName,
  isExpired,
  builderWhatsAppNumber = "919582390243",
}: DemoSwitcherClientProps) {
  const [activeDesign, setActiveDesign] = useState<"modern" | "premium" | "warm">("modern");
  const [chosenToast, setChosenToast] = useState<string>("");

  if (isExpired) {
    const reactivateText = encodeURIComponent(
      `Hi Ankur, please re-open the 3 website design previews for ${clinicName}.`
    );
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-6">
        <div className="max-w-md w-full rounded-2xl bg-slate-900 border border-slate-800 p-8 text-center space-y-5 shadow-2xl">
          <div className="text-xs font-semibold uppercase tracking-widest text-amber-400">
            Preview Window Closed
          </div>
          <h1 className="text-2xl font-bold text-white">{clinicName}</h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Namaste {doctorName || "Doctor"}, this 7-day private preview link has expired. Tap below on WhatsApp and we will re-activate all three custom designs for your practice immediately.
          </p>
          <a
            href={`https://wa.me/${builderWhatsAppNumber}?text=${reactivateText}`}
            onClick={() => sendDemoEvent(slug, "whatsapp_tap", "expired_reactivate", "expired", 0)}
            className="block w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors"
          >
            Re-Activate Live Preview on WhatsApp
          </a>
        </div>
      </div>
    );
  }

  const handleSelectDesign = (d: "modern" | "premium" | "warm") => {
    setActiveDesign(d);
    sendDemoEvent(slug, "design_choice", "top_switcher", d, 10);
  };

  const handleChooseThisDesign = () => {
    sendDemoEvent(slug, "whatsapp_tap", "choose_cta", activeDesign, 15);
    setChosenToast(`Logged '${activeDesign.toUpperCase()}' as your preferred style!`);
    const msg = encodeURIComponent(
      `Hi Ankur, I reviewed the website previews for ${clinicName} and liked the ${activeDesign.toUpperCase()} design best. Let's discuss next steps.`
    );
    window.open(`https://wa.me/${builderWhatsAppNumber}?text=${msg}`, "_blank");
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-white">
      {/* Top Floating Choose-Your-Design Switcher Bar */}
      <header className="h-14 px-4 bg-slate-950/95 border-b border-slate-800 flex items-center justify-between gap-3 sticky top-0 z-50">
        <div className="flex items-center gap-2 truncate">
          <span className="font-bold text-sm text-white truncate">{clinicName}</span>
          <span className="hidden md:inline text-xs text-slate-400">• Select Your Preferred Style</span>
        </div>

        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1">
          {[
            { id: "modern", label: "1. Modern" },
            { id: "premium", label: "2. Premium" },
            { id: "warm", label: "3. Warm" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleSelectDesign(tab.id as "modern" | "premium" | "warm")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeDesign === tab.id
                  ? "bg-teal-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/${activeDesign}/${slug}`}
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-block px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-200"
          >
            Full Tab ↗
          </a>
          <button
            onClick={handleChooseThisDesign}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow"
          >
            Choose {activeDesign.charAt(0).toUpperCase() + activeDesign.slice(1)} on WhatsApp
          </button>
        </div>
      </header>

      {chosenToast && (
        <div className="bg-emerald-900/90 text-emerald-100 text-xs py-1.5 px-4 text-center">
          {chosenToast}
        </div>
      )}

      {/* Full-Viewport Live Design Frame */}
      <iframe
        key={activeDesign}
        src={`/${activeDesign}/${slug}`}
        title={`${clinicName} - ${activeDesign} preview`}
        className="flex-1 w-full border-0 bg-white min-h-[calc(100vh-56px)]"
      />
    </div>
  );
}
