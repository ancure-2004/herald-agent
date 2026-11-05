import React from "react";
import Image from "next/image";
import { Heart, Star, Zap } from "lucide-react";
import { WarmViewModel } from "@/lib/adapters/warm";

export default function FearFreeHero({ siteConfig }: { siteConfig: WarmViewModel }) {
  const isPediatric =
    siteConfig.clinicName?.toLowerCase().includes('pediatric') ||
    siteConfig.tagline?.toLowerCase().includes('pediatric') ||
    siteConfig.shortDescription?.toLowerCase().includes('pediatric') ||
    siteConfig.qualifications?.toLowerCase().includes('pedodont') ||
    siteConfig.doctorName?.toLowerCase().includes('pedodont') ||
    siteConfig.slug === 'dr-rohini-josan-malik';

  return (
    <section className="relative bg-gradient-to-b from-rose-50/60 via-white to-rose-50/30 pt-10 pb-16 lg:pt-16 lg:pb-24 border-b border-rose-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Reassuring Copy & Action CTAs */}
          <div className="lg:col-span-7 space-y-6 sm:space-y-8 text-center lg:text-left">
            {/* Clean Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-rose-200 text-slate-800 text-xs sm:text-sm font-semibold mx-auto lg:mx-0 shadow-2xs">
              <Heart className="w-3.5 h-3.5 text-rose-600 fill-rose-600" />
              <span>{isPediatric ? 'Pediatric & Family Dentistry' : 'Comfort-First Dental Care'}</span>
              <span className="text-slate-300">•</span>
              <span className="text-rose-700 font-medium">{siteConfig.area || ''}</span>
            </div>

            {/* Main Headline */}
            <div className="space-y-3">
              <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-bold text-slate-900 leading-[1.18] tracking-tight">
                {isPediatric ? (
                  <>
                    Gentle Pediatric Care. <br className="hidden sm:inline" />
                    <span className="text-rose-600 italic">
                      Happy Smiles.
                    </span>{" "}
                    Fear-Free Visits.
                  </>
                ) : (
                  <>
                    Gentle Dentistry. <br className="hidden sm:inline" />
                    <span className="text-rose-600 italic">
                      Compassionate Care.
                    </span>{" "}
                    Calm Visits.
                  </>
                )}
              </h1>
              <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0 font-normal leading-relaxed">
                {isPediatric ? 'Child-focused pediatric dentistry with gentle behavioral guidance and comfort. Led by ' : 'Patient-centered dental care focused on gentle techniques and comfort. Led by '}
                <strong className="text-slate-900 font-semibold">{siteConfig.doctorName} ({siteConfig.qualifications})</strong> in {siteConfig.area || 'Delhi'}.
              </p>
            </div>

            {/* CTAs & Direct Access */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <a
                href="#scheduler"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 text-sm sm:text-base font-bold text-white bg-gradient-to-r from-plum-900 via-plum-950 to-rose-900 hover:from-plum-950 hover:to-plum-900 rounded-2xl shadow-lg shadow-plum-950/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
              >
                <span>Book Comfort Appointment</span>
                <svg className="w-4 h-4 text-rose-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>

              <a
                href={`https://wa.me/${siteConfig.whatsapp}?text=${encodeURIComponent(`Hi ${siteConfig.doctorName}, I have an inquiry regarding gentle dental treatments at ${siteConfig.shortName || siteConfig.clinicName}.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-4 text-sm sm:text-base font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100/90 rounded-2xl border border-emerald-300/80 shadow-sm transition-all"
              >
                <svg className="w-5 h-5 text-emerald-600 fill-current" viewBox="0 0 24 24">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.299.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.174.086.275.072.376-.043.101-.116.433-.506.549-.68.116-.173.231-.145.39-.086s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824zm-3.392-12.416c-5.514 0-10 4.486-10 10 0 1.845.503 3.578 1.381 5.072l-1.468 5.372 5.549-1.455c1.439.789 3.084 1.233 4.838 1.233 5.514 0 10-4.486 10-10s-4.486-10-10-10z" />
                </svg>
                <span>WhatsApp {siteConfig.doctorName}</span>
              </a>
            </div>

            {/* Verified Patient Trust Strip */}
            <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-slate-600 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <div className="flex text-amber-400 gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="font-bold text-plum-950">{siteConfig.rating || '5.0'} / 5.0 Rating</span>
                {siteConfig.reviewCount ? (
                  <span className="text-slate-400">
                    ({String(siteConfig.reviewCount).endsWith('+') ? siteConfig.reviewCount : `${siteConfig.reviewCount}+`} Google Reviews)
                  </span>
                ) : null}
              </div>
              <div className="h-4 w-px bg-slate-300 hidden sm:block" />
              <div className="flex items-center gap-1.5 text-slate-700">
                <span className="font-bold text-plum-900">{siteConfig.experience || 'Experienced'}</span> Clinical Practice
              </div>
            </div>
          </div>

          {/* Right Column: Visual Operatory & Clinical Card */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Main Image Card */}
              <div className="relative rounded-3xl overflow-hidden bg-white border border-rose-200 shadow-md">
                <div className="relative aspect-[4/3] sm:aspect-[4/3] w-full overflow-hidden bg-slate-100">
                  <Image
                    src={isPediatric ? "/images/pediatric-care.jpg" : "/images/hero-clinic.jpg"}
                    alt={isPediatric ? "Warm and friendly pediatric dental operatory" : "Modern clinical dental operatory and patient consultation chair"}
                    fill
                    className="object-cover object-center transform hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-plum-950/80 via-plum-950/20 to-transparent" />
                  
                  {/* Bottom Image Overlay Text */}
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded bg-rose-600/90 text-white inline-block mb-1">
                      {isPediatric ? 'Child-Friendly Environment' : 'Calm Operatory Environment'}
                    </span>
                    <h3 className="font-serif text-lg font-bold">
                      {isPediatric ? 'Positive Dental Introductions & Specialized Care' : 'Thoughtful Clinical Care & Sterilization Standards'}
                    </h3>
                    <p className="text-xs text-rose-100/90 mt-0.5">
                      {isPediatric ? 'Sensory-adapted, anxiety-free treatments for children.' : 'Sealed sterile instruments for thorough infection control.'}
                    </p>
                  </div>
                </div>

                {/* Lower Card Detail Box */}
                <div className="p-5 bg-white space-y-3">
                  <div className="flex items-center justify-between text-xs pb-3 border-b border-rose-100">
                    <span className="text-slate-500 font-medium">Lead Practitioner:</span>
                    <span className="font-bold text-plum-950">{siteConfig.doctorName} ({siteConfig.qualifications || 'BDS'})</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-100">
                      <span className="block text-base font-bold text-plum-950">
                        {siteConfig.reviewCount ? (String(siteConfig.reviewCount).endsWith('+') ? siteConfig.reviewCount : `${siteConfig.reviewCount}+`) : 'Verified'}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">{siteConfig.rating || '5.0'} / 5.0 Rating</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-100">
                      <span className="block text-base font-bold text-plum-950">
                        {siteConfig.consultationFee || 'Standard'}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">OPD Consultation</span>
                    </div>
                  </div>

                  {/* Immediate Emergency Notice */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-plum-950 to-plum-900 text-white text-xs">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-rose-300 shrink-0" />
                      <div>
                        <p className="font-bold">Dental Emergency or Pain?</p>
                        <p className="text-[11px] text-rose-200">Priority relief consultation</p>
                      </div>
                    </div>
                    <a
                      href={`tel:${siteConfig.phoneRaw}`}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 font-bold text-[11px] transition-colors"
                    >
                      Call Now
                    </a>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

