'use client';

import Image from "next/image";
import { Clock, Check, Sparkles } from "lucide-react";
import { ModernViewModel } from "@/lib/adapters/modern";
import { getServiceIcon } from "@/lib/icons";

export default function AestheticSpectrumGrid({ siteConfig }: { siteConfig: ModernViewModel }) {
  if (!siteConfig.services || siteConfig.services.length === 0) {
    return null;
  }

  return (
    <section id="spectrum" className="py-16 sm:py-24 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-bold tracking-widest uppercase text-gold-600 block">
            Clinical Artistry & Micro-Dentistry
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-charcoal-900">
            The Aesthetic Care Spectrum
          </h2>
          <p className="text-sm sm:text-base text-charcoal-600 font-light leading-relaxed">
            Every procedure at {siteConfig.clinicName} is tailored to your unique facial proportions using modern clinical precision, advanced materials, and gentle care.
          </p>
        </div>

        {/* 6-Card Aesthetic Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {(siteConfig.services || []).map((service) => {
            const depictingImage = service.depictingImage;
            const ServiceIcon = getServiceIcon(service.category, service.id, service.title);

            return (
              <div
                key={service.id || service.title || service.name}
                className="group rounded-3xl bg-slateIce-50 border border-slate-200/80 hover:border-gold-400 hover:bg-white p-6 sm:p-7 transition-all duration-300 shadow-card-soft hover:shadow-luxury flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Image & Badges: Map image only when depicting, otherwise lucide icon */}
                  {depictingImage ? (
                    <div className="relative h-48 sm:h-52 w-full rounded-2xl overflow-hidden bg-slate-200">
                      <Image
                        src={depictingImage.src}
                        alt={depictingImage.alt}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950/60 via-transparent to-transparent" />
                      
                      {/* Top Badge */}
                      <div className="absolute top-3 left-3 right-3 flex justify-start">
                        <span className="px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-charcoal-900/90 text-gold-300 backdrop-blur-sm border border-gold-500/30 max-w-full truncate">
                          {service.category || 'Specialized Care'}
                        </span>
                      </div>

                      {/* Duration Chip */}
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] font-medium text-white/90 gap-2">
                        <span className="bg-charcoal-900/80 px-2.5 py-1 rounded-lg backdrop-blur-xs truncate max-w-[65%] flex items-center gap-1.5">
                          <Clock className="w-3 h-3 shrink-0 text-amber-400" />
                          <span>{service.recoveryTime || 'Standard Consultation'}</span>
                        </span>
                        {service.badge && (
                          <span className="bg-gold-400 text-charcoal-950 px-2.5 py-1 rounded-lg font-bold shrink-0 shadow-xs">
                            {service.badge}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="relative h-48 sm:h-52 w-full rounded-2xl overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200/80 border border-slate-200 flex flex-col justify-between p-4 group-hover:border-gold-300 transition-colors">
                      {/* Top Category Badge */}
                      <div className="flex justify-start">
                        <span className="px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white text-charcoal-800 border border-slate-200 shadow-2xs max-w-full truncate">
                          {service.category || 'Specialized Care'}
                        </span>
                      </div>

                      {/* Centered Lucide Icon */}
                      <div className="flex items-center justify-center my-auto">
                        <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-gold-600 border border-slate-200/80 group-hover:scale-110 transition-transform">
                          <ServiceIcon className="w-7 h-7" />
                        </div>
                      </div>

                      {/* Duration Chip */}
                      <div className="flex items-center justify-between text-[11px] font-medium text-slate-700 gap-2">
                        <span className="bg-white/90 px-2.5 py-1 rounded-lg border border-slate-200 truncate max-w-[65%] shadow-2xs flex items-center gap-1.5">
                          <Clock className="w-3 h-3 shrink-0 text-slate-500" />
                          <span>{service.recoveryTime || 'Standard Consultation'}</span>
                        </span>
                        {service.badge && (
                          <span className="bg-gold-400 text-charcoal-950 px-2.5 py-1 rounded-lg font-bold shrink-0 shadow-xs">
                            {service.badge}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                {/* Title & Subtitle */}
                <div>
                  <h3 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                    {service.title || service.name}
                  </h3>
                </div>

                {/* Description */}
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                  {service.description}
                </p>

                {/* Key Benefits List */}
                {service.keyBenefits && service.keyBenefits.length > 0 && (
                  <ul className="space-y-1.5 pt-2 border-t border-slate-200">
                    {service.keyBenefits.map((b: string, idx: number) => (
                      <li key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-amber-600 font-bold shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

                {/* Bottom Action CTA */}
                <div className="pt-6 mt-4">
                  <a
                    href={`https://wa.me/${siteConfig.whatsapp}?text=${encodeURIComponent(
                      `Hi ${siteConfig.doctorName || 'Doctor'}, I would like to consult regarding ${service.name || service.title} at ${siteConfig.clinicName}.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-5 rounded-xl text-sm font-bold text-charcoal-900 bg-gold-400 hover:bg-gold-300 border border-gold-400 hover:border-gold-300 transition-all flex items-center justify-center gap-2 shadow-xs"
                  >
                    <span className="truncate">Book Consult</span>
                    <Sparkles className="w-3.5 h-3.5 text-charcoal-900 shrink-0" />
                  </a>
                </div>
            </div>
          );
        })}
      </div>

        {/* Bottom Consultation Strip */}
        <div className="p-6 sm:p-8 rounded-3xl bg-charcoal-900 text-white border border-gold-500/30 flex flex-col md:flex-row items-center justify-between gap-6 shadow-luxury">
          <div className="space-y-1 text-center md:text-left">
            <h4 className="font-serif text-xl sm:text-2xl font-bold text-gold-300">
              Personalized Facial Smile Simulation
            </h4>
            <p className="text-xs sm:text-sm text-slate-300 font-light max-w-xl">
              Unsure if veneers, bonding, or aligners are right for you? Experience our non-invasive 3D trial smile scan before making any decision.
            </p>
          </div>
          <a
            href="#scheduler"
            className="w-full sm:w-auto px-5 py-3.5 rounded-xl text-sm sm:text-base font-bold text-charcoal-950 bg-gold-400 hover:bg-gold-300 shadow-md transition-all whitespace-normal sm:whitespace-nowrap text-center"
          >
            Claim 3D Smile Trial Slot
          </a>
        </div>

      </div>
    </section>
  );
}

