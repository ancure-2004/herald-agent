'use client';

import { ShieldCheck, Sparkles, Clock, MapPin, Award, CheckCircle2, MessageSquare, Phone, ArrowRight } from "lucide-react";
import { PremiumViewModel } from "@/lib/adapters/premium";

export default function EditorialAestheticHero({ siteConfig }: { siteConfig: PremiumViewModel }) {
  return (
    <section className="relative min-h-[80vh] bg-[#FAF8F5] text-stone-900 overflow-hidden flex items-center border-b border-stone-200/80">
      
      {/* Background Soothing Ambient Texture */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e7e5e430_1px,transparent_1px),linear-gradient(to_bottom,#e7e5e430_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* Left Column: Minimalist Editorial Content */}
          <div className="lg:col-span-7 space-y-6 z-10">
            
            {/* Top Minimal Badges */}
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200/80 shadow-xs uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                Comprehensive Dental Care
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>{siteConfig.area ? `Serving ${siteConfig.area}` : 'Neighborhood Dental Practice'}</span>
              </span>
            </div>

            {/* Headline & Subtitle */}
            <div className="space-y-3">
              <h1 className="font-display font-black text-3xl sm:text-5xl lg:text-6xl text-stone-900 leading-[1.12] tracking-tight">
                Precision Dental Care. <span className="gold-gradient-text">Restorative &amp; Family Health.</span>
              </h1>
              <p className="text-sm sm:text-base text-stone-600 font-normal leading-relaxed max-w-xl">
                Conservative Restorations, Gentle Root Canal Therapy &amp; Patient-First Dental Care by {siteConfig.doctorName} ({siteConfig.qualifications || 'BDS'}) - {siteConfig.area || ''}&apos;s trusted clinic.
              </p>
            </div>

            {/* VIP CTA Block */}
            <div className="pt-2 space-y-3 max-w-lg">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <a
                  href="#scheduler"
                  className="min-h-[52px] px-8 py-3.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 rounded-xl shadow-md text-center transition-all flex items-center justify-center gap-2"
                >
                  <span>Schedule Consultation</span>
                  <ArrowRight className="w-4 h-4" />
                </a>

                <a
                  href={`https://wa.me/${siteConfig.whatsapp}?text=${encodeURIComponent(
                    `Hi ${siteConfig.doctorName}, I would like to reserve a dental consultation at ${siteConfig.clinicName}.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[52px] px-6 py-3.5 text-xs sm:text-sm font-bold text-stone-800 bg-white hover:bg-stone-50 border border-stone-200 rounded-xl text-center transition-all shadow-xs flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <span>WhatsApp Message</span>
                </a>
              </div>

              <div className="text-[11px] text-stone-500 flex items-center gap-2">
                <Award className="w-3.5 h-3.5 text-amber-600" />
                <span>Led by {siteConfig.leadDoctor} ({siteConfig.qualifications})</span>
              </div>
            </div>

            {/* Clean Metrics Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 pt-2 max-w-lg">
              <div className="p-3.5 rounded-2xl bg-white border border-stone-200/80 shadow-xs space-y-0.5">
                <div className="font-display font-black text-lg sm:text-xl text-amber-700">
                  {siteConfig.consultationFee || '₹200'}
                </div>
                <div className="text-[11px] font-bold text-stone-800">OPD Consultation</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-white border border-stone-200/80 shadow-xs space-y-0.5">
                <div className="font-display font-black text-lg sm:text-xl text-stone-900">{siteConfig.rating || '5.0'} / 5.0</div>
                <div className="text-[11px] font-bold text-stone-800">
                  {siteConfig.reviewCount ? (String(siteConfig.reviewCount).endsWith('+') ? siteConfig.reviewCount : `${siteConfig.reviewCount}+`) : ''} Reviews
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-white border border-stone-200/80 shadow-xs space-y-0.5">
                <div className="font-display font-black text-lg sm:text-xl text-stone-900">{siteConfig.experience || '10+ Yrs'}</div>
                <div className="text-[11px] font-bold text-stone-800">Clinical Practice</div>
              </div>
            </div>

          </div>

          {/* Right Column: Clinical Pillars Card */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              
              <div className="rounded-3xl p-6 sm:p-7 bg-white border border-stone-200/90 shadow-xl space-y-5">
                
                {/* Visual Header */}
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800">
                      <ShieldCheck className="w-4 h-4 text-amber-700" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-stone-900">
                        {siteConfig.clinicName}
                      </h3>
                      <p className="text-[11px] text-stone-500">{siteConfig.area || ''}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Verified Practice
                  </span>
                </div>

                {/* Verified Claims / Focus Highlights */}
                {siteConfig.claims && siteConfig.claims.length > 0 ? (
                  <div className="space-y-3">
                    {siteConfig.claims
                      .filter((c) => c.status === 'VERIFIED' || c.status === 'SAFE_TO_GENERATE')
                      .slice(0, 3)
                      .map((claim, idx: number) => {
                        const text = claim.text;
                        return (
                          <div key={idx} className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-stone-100 flex items-start gap-3">
                            <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <p className="text-xs text-stone-800 leading-relaxed font-medium">
                              {text}
                            </p>
                          </div>
                        );
                      })}
                  </div>
                ) : null}

                {/* Quick Doctor Summary Strip */}
                <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-stone-400" />
                    <span>
                      {siteConfig.hours?.verified
                        ? (Array.isArray(siteConfig.clinicHours) && siteConfig.clinicHours[0]
                          ? `${siteConfig.clinicHours[0].day}: ${siteConfig.clinicHours[0].time}`
                          : 'Call to confirm timings')
                        : 'Call to confirm timings'}
                    </span>
                  </div>
                  <a
                    href={`tel:${siteConfig.phoneRaw}`}
                    className="font-bold text-amber-800 hover:underline flex items-center gap-1"
                  >
                    <Phone className="w-3 h-3" />
                    <span>Call Clinic</span>
                  </a>
                </div>

              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

