

import Image from "next/image";
import { Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import { PremiumViewModel } from "@/lib/adapters/premium";

export default function Services({ siteConfig }: { siteConfig: PremiumViewModel }) {
  const services = siteConfig.clinicalServices || siteConfig.services || [];
  if (!services.length) return null;

  return (
    <section id="services" className="py-24 bg-[#F4EFEA] text-stone-900 relative overflow-hidden border-b border-stone-200/80">
      
      {/* Background ambient lighting */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 right-10 w-[500px] h-[500px] bg-amber-100/50 rounded-full blur-[130px]" />
        <div className="absolute bottom-0 left-10 w-[450px] h-[450px] bg-stone-200/50 rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-white text-amber-800 border border-amber-200 shadow-xs uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            <span>Comprehensive Clinical Care</span>
          </div>

          <h2 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-stone-900 tracking-tight">
            High-Precision Clinical &amp; <span className="gold-gradient-text">Restorative Dentistry</span>
          </h2>

          <p className="text-sm sm:text-base text-stone-600">
            From single-visit rotary endodontics and dental restorations to extractions and scaling, every treatment is delivered with clinical care and gentle bedside manner.
          </p>
        </div>

        {/* Clinical Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {services.map((service, idx: number) => {
            const depictingImage = service.depictingImage;
            return (
              <div
                key={service.id || idx}
                className="rounded-3xl bg-white border border-stone-200 hover:border-amber-400 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md group"
              >
                {/* Service Gallery Image Banner */}
                {depictingImage && (
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-stone-100">
                    <Image
                      src={depictingImage.src}
                      alt={depictingImage.alt}
                      fill
                      className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-transparent to-transparent" />
                    
                    {service.badge && (
                      <div className="absolute top-3 right-3">
                        <span className="text-[11px] font-mono font-bold text-amber-900 bg-white/95 px-2.5 py-1 rounded-full border border-amber-200 shadow-xs backdrop-blur-xs">
                          {service.badge}
                        </span>
                      </div>
                    )}

                    {service.category && (
                      <div className="absolute bottom-3 left-3">
                        <span className="text-[11px] font-bold text-white bg-stone-900/80 px-2.5 py-1 rounded-lg backdrop-blur-xs">
                          {service.category}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="p-7 space-y-4 flex-grow flex flex-col justify-between">
                  <div>
                    {!depictingImage && (
                      <div className="flex items-center justify-between mb-3">
                        {service.badge && (
                          <span className="text-[11px] font-mono font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                            {service.badge}
                          </span>
                        )}
                        {service.category && (
                          <span className="text-[11px] font-medium text-stone-500">
                            {service.category}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Title */}
                    <h3 className="font-display text-lg font-bold text-stone-900 leading-snug group-hover:text-amber-800 transition-colors">
                      {service.title || service.name}
                    </h3>

                    {/* Description */}
                    <p className="text-xs sm:text-sm text-stone-600 leading-relaxed mt-2">
                      {service.description}
                    </p>
                  </div>

                {/* Key Benefits Checklist */}
                {service.keyBenefits && service.keyBenefits.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-stone-100 text-xs text-stone-700">
                    {service.keyBenefits.map((h: string, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                )}

              </div>

              {/* Consultation Link */}
              <div className="pt-3 border-t border-stone-100">
                <a
                  href={`https://wa.me/${siteConfig.whatsapp}?text=Hi%20${encodeURIComponent(siteConfig.doctorName || 'Doctor')},%20I%20would%20like%20to%20schedule%20an%20appointment%20for%20${encodeURIComponent(service.title || service.name)}.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full min-h-[46px] py-2.5 px-3 rounded-xl text-xs font-bold text-stone-800 bg-[#FAF8F5] hover:bg-amber-600 hover:text-white border border-stone-200 hover:border-amber-600 transition-all text-center flex items-center justify-center gap-1.5"
                >
                  <span>Book Appointment</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>

            </div>
          );
        })}
        </div>

      </div>
    </section>
  );
}

