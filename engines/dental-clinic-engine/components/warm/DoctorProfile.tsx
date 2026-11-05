import React from "react";
import { UserCheck, GraduationCap, Clock, CreditCard, MapPin, Check } from "lucide-react";
import { WarmViewModel } from "@/lib/adapters/warm";

export default function DoctorProfile({ siteConfig }: { siteConfig: WarmViewModel }) {
  return (
    <section id="doctor-profile" className="py-16 sm:py-24 bg-gradient-to-b from-cream-50 via-rose-50/30 to-white border-b border-rose-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="bg-white rounded-3xl border border-rose-200/80 shadow-xl overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Column: Doctor Spotlight & Imagery */}
            <div className="lg:col-span-5 p-6 sm:p-10 bg-slate-900 text-white flex flex-col justify-between h-full relative overflow-hidden">
              <div className="relative z-10 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-400/30 text-rose-200 text-xs font-semibold">
                  <UserCheck className="w-3.5 h-3.5 text-rose-400" />
                  <span>Lead Dental Surgeon &amp; Practitioner</span>
                </div>

                <div className="space-y-2">
                  <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-white">
                    {siteConfig.doctor?.name || siteConfig.doctorName}
                  </h2>
                  <p className="text-rose-200 font-semibold text-sm sm:text-base">
                    {siteConfig.doctor?.qualifications || siteConfig.qualifications}
                  </p>
                  <p className="text-xs text-rose-300/90 font-medium">
                    {siteConfig.doctor?.experience || siteConfig.experience || 'Experienced Practice'} • {siteConfig.doctor?.consultationFee || siteConfig.consultationFee || 'OPD Consultation'}
                  </p>
                </div>

                {/* Pedigree Badges */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/10">
                    <GraduationCap className="w-5 h-5 text-rose-300 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-white">Professional Dental Surgeon</p>
                      <p className="text-[11px] text-rose-200">{siteConfig.qualifications || 'BDS'} - Clinical Training</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/10">
                    <Clock className="w-5 h-5 text-rose-300 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-white">{siteConfig.doctor?.experience || siteConfig.experience || 'Clinical Experience'}</p>
                      <p className="text-[11px] text-rose-200">General &amp; Aesthetic Dental Care</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/10">
                    <CreditCard className="w-5 h-5 text-rose-300 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-white">{siteConfig.doctor?.consultationFee || siteConfig.consultationFee || 'Standard OPD Fee'}</p>
                      <p className="text-[11px] text-rose-200">Transparent &amp; Ethical Patient Care</p>
                    </div>
                  </div>
                </div>

                {/* Consultation Availability */}
                <div className="pt-4 border-t border-plum-800/80 text-xs text-rose-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-rose-300" /> {siteConfig.area || 'Clinic Practice'}</span>
                  <span className="font-bold text-white">
                    {siteConfig.hours?.verified
                      ? (Array.isArray(siteConfig.clinicHours) && siteConfig.clinicHours[0]
                        ? `${siteConfig.clinicHours[0].day}: ${siteConfig.clinicHours[0].time}`
                        : 'Call to confirm timings')
                      : 'Call to confirm timings'}
                  </span>
                </div>
              </div>

            </div>

            {/* Right Column: Philosophy & Clinical Excellence */}
            <div className="lg:col-span-7 p-6 sm:p-10 space-y-6">
              <div className="space-y-3">
                <span className="text-xs font-bold text-rose-600 uppercase tracking-widest">
                  Clinical Philosophy &amp; Empathy
                </span>
                <h3 className="font-serif text-2xl sm:text-3xl font-bold text-plum-950 leading-snug">
                  &ldquo;A dental clinic should be a sanctuary of comfort, not a source of anxiety.&rdquo;
                </h3>
              </div>

              <blockquote className="p-4 sm:p-5 rounded-2xl bg-rose-50/70 border-l-4 border-rose-500 text-slate-700 italic text-sm sm:text-base leading-relaxed">
                &ldquo;{siteConfig.doctor?.philosophy || 'Dedicated to providing compassionate, gentle, and high quality dental care for every patient.'}&rdquo;
              </blockquote>

              {/* Verified Credentials Checklist */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Doctor Credentials &amp; Practice Standards:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm text-slate-700">
                  {(siteConfig.doctor?.credentials || [
                    'BDS Qualified Dental Surgeon',
                    'Sterilization Protocol Adherence',
                    'Gentle Patient-First Approach',
                    'Transparent Treatment Planning',
                  ]).map((cred: string, cIdx: number) => (
                    <div key={cIdx} className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-emerald-700" />
                      </span>
                      <span className="font-medium">{cred}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTAs */}
              <div className="pt-4 border-t border-rose-100 flex flex-wrap items-center gap-4">
                <a
                  href={`https://wa.me/${siteConfig.whatsapp}?text=${encodeURIComponent(`Hi ${siteConfig.doctorName}, I would like to book a personal consultation with you at ${siteConfig.clinicName}.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-plum-900 hover:bg-plum-950 text-white text-xs sm:text-sm font-bold shadow-md transition-all"
                >
                  <span>Book Consultation with {siteConfig.doctorName}</span>
                  <svg className="w-4 h-4 text-rose-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </a>

                <a
                  href={`tel:${siteConfig.phoneRaw}`}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-plum-900 text-xs sm:text-sm font-bold border border-rose-200 transition-colors"
                >
                  <span>📞 Call: {siteConfig.phone}</span>
                </a>
              </div>

            </div>

          </div>
        </div>

      </div>
    </section>
  );
}

