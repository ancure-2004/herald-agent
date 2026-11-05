"use client";

import React, { useState } from "react";
import { Sparkles, Check, ArrowRight, ShieldCheck } from "lucide-react";
import { ModernViewModel } from "@/lib/adapters/modern";

export default function ModernWorkflow({ siteConfig }: { siteConfig: ModernViewModel }) {
  const [activeStep, setActiveStep] = useState(0);
  const phases = siteConfig.alignerJourney || [];
  if (!phases.length) return null;

  return (
    <section id="aligner-journey" className="py-16 sm:py-24 bg-charcoal-950 text-white relative overflow-hidden">
      {/* Architectural Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#C5A880_1px,transparent_1px)] [background-size:28px_28px] opacity-10 -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gold-950/60 text-gold-300 text-xs sm:text-sm font-semibold border border-gold-800/60">
            <Sparkles className="w-3.5 h-3.5 text-gold-400" />
            <span>4-Stage Clinical Protocol</span>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-100">
            Precision Treatment Architecture <br className="hidden sm:inline" />
            <span className="italic text-gold-400">From Assessment to Perfection</span>
          </h2>
          <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
            Every step is deliberate, transparent, and built around your comfort. Explore how our 4-stage treatment roadmap delivers clinical excellence.
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
                    ? "bg-charcoal-900 text-white border-gold-500 shadow-xl scale-[1.02] ring-2 ring-gold-400/40"
                    : "bg-charcoal-900/50 hover:bg-charcoal-900/80 text-slate-300 border-charcoal-800 hover:border-slate-700 shadow-sm"
                }`}
              >
                <div className="flex flex-col items-start gap-1 mb-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <span
                    className={`whitespace-nowrap text-[10px] sm:text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                      isSelected
                        ? "bg-gold-400 text-charcoal-950"
                        : "bg-charcoal-800 text-gold-300 border border-charcoal-700"
                    }`}
                  >
                    PHASE {phase.step}
                  </span>
                  <span className={`text-[10px] font-medium ${isSelected ? "text-gold-300" : "text-slate-400"}`}>
                    {phase.duration || "Phase " + phase.step}
                  </span>
                </div>
                <h3 className={`font-serif text-sm sm:text-base font-bold mt-1 ${isSelected ? "text-white" : "text-slate-200"}`}>
                  {phase.title}
                </h3>
                <p className={`text-xs mt-1 truncate ${isSelected ? "text-gold-200/80" : "text-slate-400"}`}>
                  {phase.clinicalFocus || phase.deliverable || "Clinical care"}
                </p>

                {isSelected && (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-charcoal-900 border-r border-b border-gold-500 rotate-45 hidden md:block" />
                )}
              </button>
            );
          })}
        </div>

        {/* Active Phase Deep Dive Card */}
        {phases[activeStep] && (
          <div className="bg-charcoal-900 rounded-3xl border border-charcoal-800 p-6 sm:p-10 shadow-2xl transition-all duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              {/* Left Details */}
              <div className="lg:col-span-7 space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 mb-4">
                  <span className="w-12 h-12 rounded-2xl bg-gold-400 text-charcoal-950 flex items-center justify-center font-serif text-xl font-bold shadow-md shrink-0">
                    {phases[activeStep].step}
                  </span>
                  <div className="flex flex-col items-start">
                    <span className="px-3 py-1 bg-gold-950/80 border border-gold-800/80 rounded-full font-bold text-xs text-gold-300 tracking-wider mb-1.5">
                      Stage {phases[activeStep].step} of 04
                    </span>
                    <h3 className="font-serif text-2xl sm:text-3xl font-bold text-white leading-tight">
                      {phases[activeStep].title}
                    </h3>
                  </div>
                </div>

                <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
                  {phases[activeStep].description}
                </p>

                {/* 2 Feature Callout Boxes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-3.5 sm:p-5 rounded-2xl bg-charcoal-950/80 border border-charcoal-800 shadow-sm space-y-2">
                    <div className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-gold-950/80 border border-gold-700/60 text-gold-300 font-bold text-xs">
                      EXPECTED OUTCOME
                    </div>
                    <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed">
                      {phases[activeStep].deliverable || "Clear clinical progression and personalized patient attention."}
                    </p>
                  </div>

                  <div className="p-3.5 sm:p-5 rounded-2xl bg-charcoal-950/80 border border-charcoal-800 shadow-sm space-y-2">
                    <div className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 font-bold text-xs">
                      CLINICAL SAFEGUARD
                    </div>
                    <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed">
                      {phases[activeStep].clinicalFocus || "Supervised directly by lead dental surgeon."}
                    </p>
                  </div>
                </div>

                {/* Action Button */}
                <div className="pt-2 flex flex-wrap items-center gap-4">
                  <a
                    href={`https://wa.me/${siteConfig.whatsapp}?text=${encodeURIComponent(`Hi ${siteConfig.doctorName}, I would like to consult about the treatment roadmap at ${siteConfig.clinicName}.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gold-400 hover:bg-gold-300 text-charcoal-950 text-xs sm:text-sm font-bold shadow-md transition-all"
                  >
                    <span>Discuss Treatment Protocol with {siteConfig.doctorName}</span>
                    <ArrowRight className="w-4 h-4 text-charcoal-950" />
                  </a>
                  <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-gold-400" />
                    Zero Obligation Consultation
                  </span>
                </div>
              </div>

              {/* Right Illustration / Standard Safeguards */}
              <div className="lg:col-span-5">
                <div className="relative rounded-2xl overflow-hidden bg-charcoal-950/90 p-6 border border-charcoal-800 shadow-lg space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-charcoal-800">
                    <h4 className="font-serif font-bold text-base text-white">Clinical Commitment</h4>
                    <span className="text-xs font-bold text-gold-400 bg-gold-950/80 px-2.5 py-1 rounded-full border border-gold-800">
                      Standard of Care
                    </span>
                  </div>

                  <div className="space-y-3 text-xs sm:text-sm text-slate-300">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-gold-400/20 text-gold-400 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                      <span><strong>Doctor Led:</strong> Every case planned and performed directly by senior faculty.</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-gold-400/20 text-gold-400 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                      <span><strong>Painless Methods:</strong> Buffered anesthesia & atraumatic micro-instrumentation.</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-gold-400/20 text-gold-400 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                      <span><strong>No Hidden Charges:</strong> Upfront pricing blueprint provided before work starts.</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-gold-400/20 text-gold-400 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                      <span><strong>Autoclave Sterility:</strong> Sealed sterile kits opened in front of you.</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-charcoal-800 bg-charcoal-900/60 -mx-6 -mb-6 p-4 text-center">
                    <p className="text-xs font-bold text-gold-300">
                      Have questions about your treatment plan?
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {siteConfig.doctorName} will personally review your queries on WhatsApp.
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
