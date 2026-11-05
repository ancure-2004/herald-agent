'use client';

import Image from "next/image";
import { MessageCircle, MapPin, Sparkles, ShieldCheck, Award, ArrowRight, Star, CheckCircle2 } from "lucide-react";
import { ModernViewModel } from "@/lib/adapters/modern";

export default function StudioEditorialHero({ siteConfig }: { siteConfig: ModernViewModel }) {
  const heroMetrics = siteConfig.heroMetrics && siteConfig.heroMetrics.length > 0
    ? siteConfig.heroMetrics
    : [
        ...(siteConfig.rating ? [{ number: `${siteConfig.rating} / 5.0`, label: siteConfig.reviewCount ? `${siteConfig.reviewCount} Reviews` : 'Patient Reviews', note: 'Google Rating' }] : []),
        ...(siteConfig.consultationFee ? [{ number: siteConfig.consultationFee, label: 'OPD Consultation', note: 'Standard consultation fee' }] : []),
        ...(siteConfig.experience ? [{ number: siteConfig.experience, label: 'Clinical Practice', note: 'Dedicated clinical care' }] : []),
      ];

  const isPediatric =
    siteConfig.clinicName?.toLowerCase().includes('pediatric') ||
    siteConfig.tagline?.toLowerCase().includes('pediatric') ||
    siteConfig.shortDescription?.toLowerCase().includes('pediatric') ||
    siteConfig.qualifications?.toLowerCase().includes('pedodont') ||
    siteConfig.leadDoctor?.toLowerCase().includes('pedodont') ||
    siteConfig.slug === 'dr-rohini-josan-malik';

  return (
    <section className="relative bg-slate-50 py-12 sm:py-20 lg:py-24 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Editorial Manifesto & Call to Action */}
          <div className="lg:col-span-7 space-y-6 sm:space-y-8">
            
            {/* Clean Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-amber-300 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-[11px] sm:text-xs font-bold tracking-wider uppercase text-slate-900">
                {isPediatric ? 'Pediatric & Family Dentistry' : 'Aesthetic & Restorative Dentistry'}
              </span>
            </div>

            {/* Main Headline */}
            <div className="space-y-3">
              <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-[1.12]">
                {isPediatric ? (
                  <>
                    Gentle Care for <span className="italic font-normal text-amber-600">Growing Smiles</span> &amp; Fear-Free Visits.
                  </>
                ) : (
                  <>
                    Confident Smiles with <span className="italic font-normal text-amber-600">Clinical Focus</span> &amp; Gentle Care.
                  </>
                )}
              </h1>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl font-normal">
                {isPediatric
                  ? `Specialized pediatric dental care and gentle preventive treatments in ${siteConfig.area || 'your area'}, led by `
                  : `Personalized aesthetic dentistry and gentle restorative care in ${siteConfig.area || 'your area'}, led by `}
                <strong className="font-semibold text-slate-900">{siteConfig.leadDoctor}</strong> ({siteConfig.qualifications}).
              </p>
            </div>

            {/* CTAs - Moved Above the Fold for Superior Mobile Flow */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-1">
              <a
                href="#scheduler"
                className="w-full sm:w-auto px-5 py-3.5 rounded-2xl text-sm sm:text-base font-bold text-charcoal-900 bg-gold-400 hover:bg-gold-300 shadow-gold-glow transition-all flex items-center justify-center gap-2 group text-center"
              >
                <span>Reserve Smile Consultation</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
              <a
                href={`https://wa.me/${siteConfig.whatsapp}?text=${encodeURIComponent(
                  `Hi ${siteConfig.doctorName}, I'm interested in ${isPediatric ? 'pediatric dental consultations' : 'aesthetic dental treatments'} at ${siteConfig.clinicName}.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-5 py-3.5 rounded-2xl text-sm sm:text-base font-bold text-charcoal-900 bg-white hover:bg-slate-50 border border-slate-300 transition-all flex items-center justify-center gap-2 text-center"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>Quick WhatsApp Chat</span>
              </a>
            </div>

            {/* Trust Metrics Bar - Exactly 3 Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3.5 py-2">
              {heroMetrics.slice(0, 3).map((metric, idx: number) => {
                const isRating = metric.number.includes('★') || metric.number.includes('5.') || metric.label.toLowerCase().includes('rating');
                return (
                  <div
                    key={idx}
                    className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-gold-400 hover:shadow-sm transition-all flex flex-col justify-between min-w-0"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-serif text-lg sm:text-2xl font-bold text-charcoal-900 tracking-tight break-words">
                        {isRating && <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400 shrink-0" />}
                        <span className="break-words">{metric.number}</span>
                      </div>
                      <div className="text-xs sm:text-xs text-charcoal-800 font-bold leading-snug mt-1 break-words">
                        {metric.label}
                      </div>
                    </div>
                    {isRating ? (
                      <div className="text-[11px] sm:text-[10px] text-amber-700 font-bold leading-tight mt-2 pt-2 border-t border-slate-100 flex items-center gap-1">
                        <div className="flex text-amber-500 shrink-0">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                        <span className="ml-0.5 break-words">{metric.note || 'Verified Reviews'}</span>
                      </div>
                    ) : (
                      metric.note && (
                        <div className="text-[11px] sm:text-[10px] text-slate-500 font-medium leading-tight mt-2 pt-2 border-t border-slate-100 flex items-center gap-1 min-w-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0" />
                          <span className="break-words">{metric.note}</span>
                        </div>
                      )
                    )}
                  </div>
                );
              })}
            </div>

            {/* Micro Location Assurance */}
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{siteConfig.address || siteConfig.area}</span>
              {siteConfig.clinicHours && (
                <>
                  <span>•</span>
                  <span className="text-emerald-700 font-semibold">
                    {siteConfig.hours?.verified
                      ? (typeof siteConfig.clinicHours === 'string'
                        ? siteConfig.clinicHours
                        : (Array.isArray(siteConfig.clinicHours) ? siteConfig.clinicHours[0]?.time || 'Call to confirm timings' : 'Call to confirm timings'))
                      : 'Call to confirm timings'}
                  </span>
                </>
              )}
            </div>

          </div>

          {/* Right Column: Digital Smile Design Preview Showcase */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              
              {/* Decorative Frame */}
              <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-gold-300/40 via-slate-200 to-gold-400/30 blur-sm -z-10" />

              {/* Main Image Card */}
              <div className="relative rounded-2xl overflow-hidden bg-charcoal-950 border border-gold-500/30 shadow-elevated">
                <div className="relative h-96 sm:h-[440px] w-full">
                  <Image
                    src={isPediatric ? "/images/pediatric-care.jpg" : "/images/smile-transformation.jpg"}
                    alt={isPediatric ? "Pediatric dental care and child friendly clinic environment" : "Aesthetic smile design and alignment illustration"}
                    fill
                    className="object-cover object-center"
                    priority
                  />
                  {/* Gradient Overlay for Text Legibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950 via-charcoal-950/20 to-transparent" />
                </div>

                {/* Floating Architectural Badge */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                  <div className="px-3 py-1.5 rounded-full bg-charcoal-900/90 backdrop-blur-md border border-gold-500/40 text-[10px] sm:text-xs font-bold text-gold-300 shadow-md flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-gold-400" />
                    <span>{isPediatric ? 'Pediatric Dentistry' : 'Precision Dentistry'}</span>
                  </div>
                  <div className="px-2.5 py-1 rounded-full bg-emerald-900/90 backdrop-blur-md border border-emerald-500/40 text-[10px] font-bold text-emerald-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isPediatric ? 'Fear-Free Visits' : 'Gentle Care'}</span>
                  </div>
                </div>

              </div>

              {/* Floating Pill: Doctor Experience (Bottom Left) */}
              <div className="absolute -bottom-5 -left-3 sm:-left-5 bg-charcoal-900/95 backdrop-blur-md border border-slate-700/80 shadow-luxury text-white p-3 sm:p-3.5 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center font-bold text-lg">
                  <Award className="w-5 h-5 text-gold-400" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">{siteConfig.doctorName}</div>
                  <div className="text-[10px] text-slate-300 font-medium">{siteConfig.qualifications}</div>
                </div>
              </div>

              {/* Floating Pill: Verified Google 5-Star Rating (Top Right) */}
              <div className="absolute -top-4 -right-3 sm:-right-4 bg-white/95 backdrop-blur-md border border-gold-400/50 shadow-luxury p-2.5 sm:p-3 rounded-2xl flex items-center gap-2.5 z-20">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500 font-bold">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-serif font-bold text-charcoal-950">{siteConfig.rating || '5.0'} Rating</span>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  </div>
                  <div className="text-[10px] text-slate-500 font-semibold">{siteConfig.reviewCount ? `${siteConfig.reviewCount} Reviews` : 'Google Verified'}</div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

