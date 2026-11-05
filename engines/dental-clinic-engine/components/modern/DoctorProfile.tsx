'use client';

import Image from "next/image";
import { ModernViewModel } from "@/lib/adapters/modern";

export default function DoctorProfile({ siteConfig }: { siteConfig: ModernViewModel }) {
  const isPediatric =
    siteConfig.clinicName?.toLowerCase().includes('pediatric') ||
    siteConfig.tagline?.toLowerCase().includes('pediatric') ||
    siteConfig.shortDescription?.toLowerCase().includes('pediatric') ||
    siteConfig.doctor?.title?.toLowerCase().includes('pedodont') ||
    siteConfig.slug === 'dr-rohini-josan-malik';

  const isTeam =
    siteConfig.leadDoctor?.toLowerCase().includes('team') ||
    siteConfig.doctorName?.toLowerCase().includes('team');

  return (
    <section id="doctor" className="py-16 sm:py-24 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* Left Column: Image with Architecture Frames */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              
              {/* Gold Framing Border */}
              <div className="absolute -inset-2 rounded-3xl bg-gradient-to-tr from-gold-400/40 via-slate-200 to-gold-200/40 -z-10 blur-xs" />

              <div className="relative rounded-2xl overflow-hidden bg-charcoal-900 border border-gold-500/30 shadow-luxury">
                <div className="relative h-96 sm:h-[460px] w-full">
                  <Image
                    src={isPediatric ? "/images/pediatric-care.jpg" : "/images/operatory-room.jpg"}
                    alt={isPediatric ? "Pediatric dental operatory and friendly consultation space" : "Clinical consultation operatory and treatment environment"}
                    fill
                    className="object-cover object-center"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950 via-charcoal-950/20 to-transparent" />
                </div>

                {/* Bottom Overlay Info */}
                <div className="absolute bottom-4 left-4 right-4 p-4 rounded-xl bg-charcoal-900/90 backdrop-blur-md border border-gold-400/30 text-white">
                  <div className="font-serif text-lg sm:text-xl font-bold text-gold-300">
                    {siteConfig.leadDoctor}
                  </div>
                  <div className="text-xs text-slate-300 font-medium">
                    {siteConfig.qualifications}
                  </div>
                  <div className="text-[11px] text-gold-400 mt-1 flex items-center gap-1">
                    <span>✦</span>
                    <span>{siteConfig.doctor.experience} Dedicated Clinical Care</span>
                  </div>
                </div>
              </div>

              {/* Floating Quality Stamp */}
              <div className="absolute -top-4 -right-4 bg-white px-3.5 py-2 rounded-2xl shadow-luxury border border-slate-200 flex items-center gap-2">
                <span className="text-xl">🏆</span>
                <div className="text-[11px] font-bold text-charcoal-900 leading-tight">
                  {siteConfig.qualifications || 'Lead Practitioner'}<br />
                  <span className="text-slate-500 font-normal">{siteConfig.doctor.experience}</span>
                </div>
              </div>

            </div>
          </div>

          {/* Right Column: Editorial Bio & Credentials */}
          <div className="lg:col-span-7 space-y-6">
            
            <div className="space-y-2">
              <span className="text-xs font-bold tracking-widest uppercase text-gold-600 block">
                {isTeam ? 'Meet The Clinical Team' : (isPediatric ? 'Meet The Pediatric Specialist' : 'Meet The Chief Dental Surgeon')}
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-charcoal-900">
                {siteConfig.leadDoctor}
              </h2>
              <p className="text-sm font-semibold text-charcoal-700">
                {siteConfig.doctor.qualifications} • {siteConfig.doctor.title}
              </p>
            </div>

            {/* Quote / Manifesto Box */}
            {siteConfig.doctor.philosophy && (
              <div className="p-5 sm:p-6 rounded-2xl bg-slateIce-100 border-l-4 border-gold-500 space-y-2">
                <span className="text-xs font-bold text-gold-700 uppercase tracking-wider block">
                  Clinical Philosophy
                </span>
                <p className="font-serif italic text-base sm:text-lg text-charcoal-800 leading-snug">
                  &ldquo;{siteConfig.doctor.philosophy}&rdquo;
                </p>
              </div>
            )}

            {/* Bio Paragraph */}
            {siteConfig.shortDescription && (
              <p className="text-sm sm:text-base text-charcoal-700 leading-relaxed font-light">
                {siteConfig.shortDescription}
              </p>
            )}

            {/* Credentials List */}
            <div className="space-y-2.5 pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-charcoal-900 block">
                Pedigree & Clinical Credentials:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(siteConfig.doctor.credentials || []).map((h, i: number) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-white border border-slate-200/90 flex items-start gap-2.5 text-xs text-charcoal-800 font-medium"
                  >
                    <span className="text-gold-600 font-bold mt-0.5">✦</span>
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <a
                href={`https://wa.me/${siteConfig.whatsapp}?text=${encodeURIComponent(
                  `Hi ${siteConfig.doctorName || 'Doctor'}, I would like to book a 1-on-1 consultation with you at ${siteConfig.clinicName}.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-5 py-3.5 rounded-xl text-sm sm:text-base font-bold text-charcoal-900 bg-gold-400 hover:bg-gold-300 shadow-sm transition-all text-center"
              >
                Book 1-on-1 with {siteConfig.doctorName} →
              </a>
              <a
                href={`tel:${siteConfig.phoneRaw}`}
                className="w-full sm:w-auto px-5 py-3.5 rounded-xl text-sm sm:text-base font-bold text-charcoal-800 bg-slate-100 hover:bg-slate-200 transition-all text-center"
              >
                Call Clinic Desk: {siteConfig.phone}
              </a>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}

