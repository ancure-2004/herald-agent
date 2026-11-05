import Image from "next/image";
import { UserCheck, Phone, ArrowRight } from "lucide-react";
import { PremiumViewModel } from "@/lib/adapters/premium";

export default function DoctorProfile({ siteConfig }: { siteConfig: PremiumViewModel }) {
  const isPediatric =
    siteConfig.clinicName?.toLowerCase().includes('pediatric') ||
    siteConfig.tagline?.toLowerCase().includes('pediatric') ||
    siteConfig.shortDescription?.toLowerCase().includes('pediatric') ||
    siteConfig.qualifications?.toLowerCase().includes('pedodont') ||
    siteConfig.doctorName?.toLowerCase().includes('pedodont') ||
    siteConfig.slug === 'dr-rohini-josan-malik';

  const doc = siteConfig.doctorProfile;
  const docName = doc.name || siteConfig.doctorName || siteConfig.leadDoctor || 'Doctor';
  const docDegrees = doc.degrees || siteConfig.qualifications || 'BDS • Dental Surgeon';
  const docExperience = doc.experience || siteConfig.experience || '10+ Years Dedicated Clinical Practice';
  const docPhilosophyTitle = doc.philosophyTitle || (siteConfig.doctor?.philosophy ? `“${siteConfig.doctor.philosophy}”` : "“Dedicated to gentle, transparent, and patient-first dentistry.”");
  const docPhilosophyBody = doc.philosophyBody || (siteConfig.doctor?.philosophy ? [siteConfig.doctor.philosophy] : [siteConfig.shortDescription || 'Dedicated to gentle, transparent, and patient-first clinical care.']);
  const docHighlights = doc.highlights || [];

  return (
    <section id="doctor" className="py-24 bg-[#FAF8F5] text-stone-900 relative overflow-hidden border-b border-stone-200/80">
      
      {/* Background Subtle Amber Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-10 w-[500px] h-[500px] bg-amber-100/60 rounded-full blur-[140px]" />
        <div className="absolute bottom-10 right-10 w-[450px] h-[450px] bg-stone-200/50 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-white text-amber-800 border border-amber-200 shadow-xs uppercase tracking-widest">
            <UserCheck className="w-3.5 h-3.5 text-amber-700" />
            <span>{isPediatric ? 'Lead Pediatric Specialist' : 'Lead Dental Surgeon'}</span>
          </div>

          <h2 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-stone-900 tracking-tight">
            Clinical Philosophy &amp; <span className="gold-gradient-text">Experience</span>
          </h2>

          <p className="text-sm sm:text-base text-stone-600">
            Meet {docName} ({docDegrees}) - dedicated to conservative restorative dentistry, gentle clinical care, and patient comfort in {siteConfig.area || 'Delhi'} for over {siteConfig.experience || 'a decade'}.
          </p>
        </div>

        {/* Main 2-Column Doctor Feature */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left: Doctor Visual Card & Credentials Badge */}
          <div className="lg:col-span-5 space-y-6">
            <div className="relative aspect-[3/4] rounded-3xl overflow-hidden border border-amber-200 bg-stone-100 shadow-xl group">
              <Image
                src={isPediatric ? "/images/pediatric-care.jpg" : "/images/hero-clinic.jpg"}
                alt={isPediatric ? "Pediatric clinical operatory and patient consultation suite" : "Modern clinical operatory and patient consultation suite"}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 via-stone-900/20 to-transparent" />

              {/* Top Floating Badge */}
              <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md border border-amber-200 px-3.5 py-1.5 rounded-full text-xs font-bold text-amber-900 shadow-sm">
                {docExperience}
              </div>

              {/* Bottom Doctor Credential Pill */}
              <div className="absolute bottom-4 inset-x-4 p-5 rounded-2xl bg-white/95 backdrop-blur-xl border border-stone-200 space-y-1 shadow-lg">
                <h3 className="font-display font-black text-xl text-stone-900">
                  {docName}
                </h3>
                <p className="text-xs text-amber-800 font-semibold">
                  {docDegrees}
                </p>
                <div className="text-[11px] text-stone-500 pt-1 flex items-center justify-between">
                  <span>{siteConfig.area || ''}</span>
                  <span className="text-emerald-700 font-bold">● Accepting Appointments</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Deep Philosophy, Clinical Standards & Highlights */}
          <div className="lg:col-span-7 space-y-7">
            
            {/* Signature Philosophy Block */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white border border-amber-200 shadow-md space-y-3">
              <span className="text-[11px] font-mono uppercase text-amber-800 tracking-wider block font-bold">
                Clinical Creed
              </span>
              <blockquote className="font-display font-bold text-lg sm:text-xl text-stone-900 italic leading-relaxed">
                {docPhilosophyTitle}
              </blockquote>
            </div>

            {/* Narrative Explanation */}
            <div className="space-y-4 text-sm text-stone-600 leading-relaxed">
              {docPhilosophyBody.map((paragraph: string, idx: number) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>

            {/* Credentials & Milestones Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              {docHighlights.map((h, i: number) => (
                <div key={i} className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-1">
                  <div className="text-[10px] font-mono uppercase text-amber-800 tracking-wider font-semibold">
                    {h.label}
                  </div>
                  <div className="text-xs font-bold text-stone-900">
                    {h.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Direct Consultation Trigger */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <a
                href="#scheduler"
                className="w-full sm:w-auto min-h-[56px] px-8 py-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-amber-600 via-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 transition-all shadow-md text-center flex items-center justify-center gap-2"
              >
                <span>Schedule Consultation with {docName}</span>
                <ArrowRight className="w-4 h-4" />
              </a>

              <a
                href={`tel:${siteConfig.phoneRaw}`}
                className="w-full sm:w-auto min-h-[56px] px-6 py-4 rounded-xl text-xs sm:text-sm font-bold text-stone-800 bg-white hover:bg-stone-50 border border-stone-200 transition-all text-center shadow-xs flex items-center justify-center gap-2"
              >
                <Phone className="w-4 h-4 text-amber-800" />
                <span>Call {siteConfig.phone}</span>
              </a>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}

