"use client";

import React, { useState } from "react";
import { Sparkles, Check } from "lucide-react";
import { WarmViewModel } from "@/lib/adapters/warm";

export default function ComfortWorkflow({ siteConfig }: { siteConfig: WarmViewModel }) {
  const [activeStep, setActiveStep] = useState(0);
  const phases = siteConfig.comfortPhases || siteConfig.sedationPhases || [];
  if (!phases.length) return null;

  return (
    <section id="comfort-protocol" className="py-16 sm:py-24 bg-white relative overflow-hidden">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#FFE4E6_1px,transparent_1px)] [background-size:24px_24px] opacity-40 -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-50 text-rose-700 text-xs sm:text-sm font-bold border border-rose-200">
            <Sparkles className="w-3.5 h-3.5 text-rose-600" />
            <span>The Patient Comfort Protocol</span>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-plum-950 tracking-tight">
            How We Turn Dental Anxiety Into <br className="hidden sm:inline" />
            <span className="italic text-rose-600">Peaceful Tranquility</span>
          </h2>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
            Whether it is an atraumatic wisdom tooth removal or a restorative root canal, our 4-phase comfort roadmap ensures you remain relaxed, comfortable, and in total control.
          </p>
        </div>

        {/* 4 Interactive Phase Selector Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-12 mb-8">
          {phases.map((phase, index: number) => {
            const isSelected = activeStep === index;
            return (
              <button
                key={phase.step}
                type="button"
                onClick={() => setActiveStep(index)}
                className={`p-3.5 sm:p-5 rounded-2xl text-left transition-all duration-300 relative border ${
                  isSelected
                    ? "bg-gradient-to-br from-plum-950 to-plum-900 text-white border-plum-900 shadow-xl scale-[1.02] ring-2 ring-rose-300"
                    : "bg-rose-50/50 hover:bg-rose-100/60 text-slate-800 border-rose-100 hover:border-rose-200 shadow-sm"
                }`}
              >
                <div className="flex flex-col items-start gap-1 mb-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <span
                    className={`whitespace-nowrap text-[10px] sm:text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                      isSelected
                        ? "bg-rose-500 text-white"
                        : "bg-white text-plum-950 border border-rose-200"
                    }`}
                  >
                    PHASE {phase.step}
                  </span>
                  <span className={`text-[10px] text-slate-500 font-medium ${isSelected ? "text-rose-200" : "text-slate-500"}`}>
                    {phase.duration}
                  </span>
                </div>
                <h3 className={`font-serif text-sm sm:text-base font-bold mt-1 ${isSelected ? "text-white" : "text-plum-950"}`}>
                  {phase.title}
                </h3>
                <p className={`text-xs mt-1 truncate ${isSelected ? "text-rose-100/90" : "text-slate-500"}`}>
                  {phase.subtitle}
                </p>

                {isSelected && (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-plum-900 rotate-45 hidden md:block" />
                )}
              </button>
            );
          })}
        </div>

        {/* Active Phase Deep Dive Card */}
        {phases[activeStep] && (
          <div className="bg-gradient-to-br from-cream-50 to-white rounded-3xl border border-rose-200/90 p-6 sm:p-10 shadow-xl transition-all duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              {/* Left Details */}
              <div className="lg:col-span-7 space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 mb-4">
                  <span className="w-12 h-12 rounded-2xl bg-plum-900 text-white flex items-center justify-center font-serif text-xl font-bold shadow-md shrink-0">
                    {phases[activeStep].step}
                  </span>
                  <div className="flex flex-col items-start">
                    <span className="px-3 py-1 bg-rose-100/80 rounded-full font-bold text-xs text-rose-800 tracking-wider mb-1.5">
                      Phase {phases[activeStep].step} of 04
                    </span>
                    <h3 className="font-serif text-2xl sm:text-3xl font-bold text-plum-950 leading-tight">
                      {phases[activeStep].title}
                    </h3>
                  </div>
                </div>

                <p className="text-slate-700 text-base sm:text-lg leading-relaxed">
                  {phases[activeStep].description}
                </p>

                {/* 2 Feature Callout Boxes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-3.5 sm:p-5 rounded-2xl bg-white border border-rose-100 shadow-sm space-y-3">
                    <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-800 font-bold text-xs">
                      PATIENT SENSORY FEEL
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                      {phases[activeStep].sensoryNote}
                    </p>
                  </div>

                  <div className="p-3.5 sm:p-5 rounded-2xl bg-white border border-purple-100 shadow-sm space-y-3">
                    <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-800 font-bold text-xs">
                      CLINICAL SAFEGUARD
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                      {phases[activeStep].keySafeguard}
                    </p>
                  </div>
                </div>

                {/* Action Button */}
                <div className="pt-2 flex flex-wrap items-center gap-4">
                  <a
                    href={`https://wa.me/${siteConfig.whatsapp}?text=${encodeURIComponent(`Hi ${siteConfig.doctorName}, I am interested in learning more about the comfort-focused care for my treatment.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-plum-900 hover:bg-plum-950 text-white text-xs sm:text-sm font-bold shadow-md transition-all"
                  >
                    <span>Discuss Treatment Comfort with {siteConfig.doctorName}</span>
                    <svg className="w-4 h-4 text-rose-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </a>
                  <span className="text-xs text-slate-500 font-medium">
                    Confidential Consultation
                  </span>
                </div>
              </div>

              {/* Right Illustration / Reassurance Visual */}
              <div className="lg:col-span-5">
                <div className="relative rounded-2xl overflow-hidden bg-white p-6 border border-rose-200/80 shadow-lg space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-rose-100">
                    <h4 className="font-serif font-bold text-base text-plum-950">Patient Comfort Standard</h4>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      Comfort Focused
                    </span>
                  </div>

                  <div className="space-y-3 text-xs sm:text-sm text-slate-600">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3.5 h-3.5 text-rose-700" />
                      </span>
                      <span><strong>No Surprise Jumps:</strong> We explain each sensation before starting.</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3.5 h-3.5 text-rose-700" />
                      </span>
                      <span><strong>Stop Signal:</strong> Raise your left hand anytime to pause immediately.</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3.5 h-3.5 text-rose-700" />
                      </span>
                      <span><strong>Noise-Dampening:</strong> Soothing acoustic ambiance and gentle music.</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3.5 h-3.5 text-rose-700" />
                      </span>
                      <span><strong>Sterilization Protocol:</strong> Sealed sterile instrumentation.</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-rose-100 bg-rose-50/60 -mx-6 -mb-6 p-4 text-center">
                    <p className="text-xs font-bold text-plum-950">
                      Questions about your dental treatment?
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {siteConfig.doctorName} will personally answer your concerns over WhatsApp.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </section>
  );
}
