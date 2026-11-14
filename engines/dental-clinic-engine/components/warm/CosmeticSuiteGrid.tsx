import React from "react";
import Image from "next/image";
import { Sparkles, Check } from "lucide-react";
import { WarmViewModel } from "@/lib/adapters/warm";
import { getServiceIcon } from "@/lib/icons";

export default function CosmeticSuiteGrid({ siteConfig }: { siteConfig: WarmViewModel }) {
  if (!siteConfig.cosmeticServices?.length) return null;

  return (
    <section id="cosmetic-suite" className="py-16 sm:py-24 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-50 text-rose-700 text-xs sm:text-sm font-bold border border-rose-200">
            <Sparkles className="w-3.5 h-3.5 text-rose-600" />
            <span>Aesthetic &amp; Restorative Care</span>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-plum-950 tracking-tight">
            Specialized Care Suite at <br className="hidden sm:inline" />
            <span className="italic text-rose-600">{siteConfig.clinicName}</span>
          </h2>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
            From single-sitting painless root canals to intricate porcelain smile makeovers and trauma-free wisdom tooth removals, discover clinical precision tailored to your comfort.
          </p>
        </div>

        {/* 6 Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {siteConfig.cosmeticServices.map((service) => {
            const depictingImage = service.depictingImage;
            const ServiceIcon = getServiceIcon(service.category, service.id, service.title);

            return (
              <div
                key={service.id}
                className="group bg-white rounded-3xl border border-rose-100 shadow-sm hover:shadow-xl hover:border-rose-300 transition-all duration-300 flex flex-col overflow-hidden"
              >
                {/* Image or Icon Preview Container */}
                {depictingImage ? (
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                    <Image
                      src={depictingImage.src}
                      alt={depictingImage.alt}
                      fill
                      className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-plum-950/80 via-plum-950/20 to-transparent" />
                    
                    {/* Badges Over Image */}
                    <div className="absolute top-3 left-3">
                      <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/95 text-plum-950 backdrop-blur-md shadow-sm">
                        {service.category}
                      </span>
                    </div>

                    {service.badge && (
                      <div className="absolute top-3 right-3">
                        <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-600 text-white shadow-sm">
                          {service.badge}
                        </span>
                      </div>
                    )}

                    {/* Bottom Overlay Title */}
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <h3 className="font-serif text-lg font-bold leading-snug">
                        {service.title}
                      </h3>
                    </div>
                  </div>
                ) : (
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-rose-50/70 via-cream-50 to-rose-100/40 border-b border-rose-100 p-4 flex flex-col justify-between">
                    {/* Badges */}
                    <div className="flex items-center justify-between">
                      <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-bold bg-white text-plum-950 border border-rose-200/80 shadow-2xs">
                        {service.category}
                      </span>
                      {service.badge && (
                        <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-600 text-white shadow-2xs">
                          {service.badge}
                        </span>
                      )}
                    </div>

                    {/* Centered Lucide Icon */}
                    <div className="flex items-center justify-center my-auto">
                      <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-rose-600 border border-rose-200 group-hover:scale-110 transition-transform">
                        <ServiceIcon className="w-7 h-7" />
                      </div>
                    </div>

                    {/* Bottom Title */}
                    <div>
                      <h3 className="font-serif text-lg font-bold text-plum-950 leading-snug">
                        {service.title}
                      </h3>
                    </div>
                  </div>
                )}

              {/* Card Body */}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                <div className="space-y-4">
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {service.description}
                  </p>

                  {/* Key Benefits Checklist */}
                  <div className="space-y-2 pt-1">
                    <p className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                      Clinical Highlights:
                    </p>
                    <ul className="space-y-1.5 text-xs text-slate-700">
                      {(service.keyBenefits || []).map((benefit, bIdx) => (
                        <li key={bIdx} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-rose-600 font-bold shrink-0 mt-0.5" />
                          <span className="font-medium">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Metrics & Recovery Strip */}
                <div className="pt-4 border-t border-rose-100 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded-xl bg-rose-50/70">
                      <span className="block text-slate-400 font-medium">Comfort Level</span>
                      <span className="font-bold text-plum-950">{service.painScore}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-cream-100/80">
                      <span className="block text-slate-400 font-medium">Recovery Time</span>
                      <span className="font-bold text-plum-950">{service.recoveryTime}</span>
                    </div>
                  </div>

                  {/* Booking CTA Button */}
                  <a
                    href={`https://wa.me/${siteConfig.whatsapp}?text=${encodeURIComponent(`Hi ${siteConfig.doctorName}, I would like to inquire about ${service.title}.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-plum-50 hover:bg-plum-900 text-plum-950 hover:text-white font-bold text-xs transition-colors duration-200"
                  >
                    <span>Book {service.title}</span>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      </div>
    </section>
  );
}

