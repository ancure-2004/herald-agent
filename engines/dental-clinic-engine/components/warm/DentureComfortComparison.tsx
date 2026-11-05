import React from "react";
import { WarmViewModel } from "@/lib/adapters/warm";

export default function DentureComfortComparison({ siteConfig }: { siteConfig: WarmViewModel }) {
  const isPediatric =
    siteConfig.clinicName?.toLowerCase().includes('pediatric') ||
    siteConfig.tagline?.toLowerCase().includes('pediatric') ||
    siteConfig.shortDescription?.toLowerCase().includes('pediatric') ||
    siteConfig.qualifications?.toLowerCase().includes('pedodont') ||
    siteConfig.doctorName?.toLowerCase().includes('pedodont') ||
    siteConfig.slug === 'dr-rohini-josan-malik';

  if (isPediatric || !siteConfig.dentureComparison?.length) return null;

  return (
    <section id="denture-comfort" className="py-16 sm:py-24 bg-gradient-to-b from-cream-50 via-white to-rose-50/40 border-b border-rose-100/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Title */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-plum-50 text-plum-900 text-xs sm:text-sm font-bold border border-plum-200">
            <span>🦷 Precision Prosthodontics & Senior Smile Care</span>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-plum-950 tracking-tight">
            Conventional Acrylic vs. <br className="hidden sm:inline" />
            <span className="italic text-rose-600">{siteConfig.shortName || siteConfig.clinicName} BPS Precision Dentures</span>
          </h2>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
            Say goodbye to loose dentures, sticky messy glue, and painful mouth ulcers. Discover how Bio-functional Prosthetic Systems (BPS) restore full chewing power and natural smile aesthetics.
          </p>
        </div>

        {/* Comparison Table / Matrix Card */}
        <div className="bg-white rounded-3xl border border-rose-200/90 shadow-xl overflow-hidden">
          
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-rose-100 bg-rose-50/50">
                  <th className="p-6 text-sm font-bold uppercase tracking-wider text-slate-600 w-1/4">
                    Comfort & Clinical Feature
                  </th>
                  <th className="p-6 text-sm font-bold uppercase tracking-wider text-slate-500 w-1/3 bg-slate-50/50">
                    Conventional Acrylic Dentures
                  </th>
                  <th className="p-6 text-sm font-bold uppercase tracking-wider text-plum-950 w-5/12 bg-gradient-to-r from-rose-100/70 to-plum-50">
                    <div className="flex items-center justify-between">
                      <span className="font-serif font-bold text-base text-plum-950">{siteConfig.shortName || siteConfig.clinicName} BPS Precision</span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-plum-900 text-white">Recommended</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-100 text-sm">
                {siteConfig.dentureComparison.map((row, idx) => (
                  <tr key={idx} className="hover:bg-rose-50/30 transition-colors">
                    <td className="p-6 font-bold text-plum-950 align-top">
                      {row.feature}
                      <span className="block text-xs font-normal text-slate-500 mt-1">
                        Impact: {row.benefit}
                      </span>
                    </td>
                    <td className="p-6 text-slate-500 bg-slate-50/30 align-top">
                      <div className="flex items-start gap-2.5">
                        <span className="text-rose-500 font-bold text-base mt-0.5">✕</span>
                        <span>{row.conventional}</span>
                      </div>
                    </td>
                    <td className="p-6 text-plum-950 font-medium bg-rose-50/20 align-top">
                      <div className="flex items-start gap-2.5">
                        <span className="text-emerald-600 font-bold text-base mt-0.5">✓</span>
                        <div>
                          <p className="font-semibold text-slate-900">{row.bpsPrecision}</p>
                          <span className="inline-block mt-2 text-xs font-bold text-rose-700 bg-rose-100/70 px-3 py-1 rounded-md">
                            ★ {row.benefit}
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card-Based Comparison View */}
          <div className="lg:hidden divide-y divide-rose-100">
            {siteConfig.dentureComparison.map((row, idx) => (
              <div key={idx} className="p-5 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                  <h3 className="font-serif font-bold text-base text-plum-950">{row.feature}</h3>
                  <span className="text-[11px] font-bold text-rose-700 bg-rose-100 px-3 py-1 rounded-full shrink-0">
                    {row.benefit}
                  </span>
                </div>

                {/* BPS Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-50 to-plum-50 border border-rose-200 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-plum-950 uppercase tracking-wide">
                    <span className="text-emerald-600 font-extrabold text-sm">✓</span>
                    <span>BPS Precision Dentures</span>
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-slate-800">
                    {row.bpsPrecision}
                  </p>
                </div>

                {/* Conventional Card */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-600 uppercase tracking-wide text-[11px]">
                    <span className="text-rose-500 font-bold">✕</span>
                    <span>Conventional Acrylic</span>
                  </div>
                  <p>{row.conventional}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Reassurance & Callout */}
          <div className="p-6 sm:p-8 bg-gradient-to-r from-plum-950 via-plum-900 to-rose-950 text-white flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center md:text-left">
              <h4 className="font-serif text-lg sm:text-xl font-bold text-rose-100">
                Considering New Dentures or Replacing Old, Loose Sets?
              </h4>
              <p className="text-xs sm:text-sm text-rose-200/80 max-w-xl">
                Book a relaxed, zero-obligation denture measurement & trial consultation with {siteConfig.doctorName} in {siteConfig.area || ''}.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <a
                href={`https://wa.me/${siteConfig.whatsapp}?text=${encodeURIComponent(`Hi ${siteConfig.doctorName}, I would like to consult for BPS Precision Dentures.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full md:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all text-center"
              >
                Book BPS Denture Trial
              </a>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}

