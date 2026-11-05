import Image from "next/image";
import { Leaf, MapPin, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";

export default function ParkViewSanctuary({ siteConfig }: { siteConfig: any }) {
  return (
    <section id="sanctuary" className="py-24 bg-[#F4EFEA] text-stone-900 relative overflow-hidden border-b border-stone-200/80">
      
      {/* Subtle Green & Amber Glow Highlights */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/3 w-[600px] h-[600px] bg-emerald-100/40 rounded-full blur-[140px]" />
        <div className="absolute top-0 right-10 w-[400px] h-[400px] bg-amber-100/50 rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-white text-emerald-800 border border-emerald-200 shadow-xs uppercase tracking-widest">
            <Leaf className="w-3.5 h-3.5 text-emerald-700" />
            <span>Calm Clinical Environment & Comfort</span>
          </div>

          <h2 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-stone-900 tracking-tight">
            A Peaceful Practice Setting in{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-800 via-amber-700 to-amber-900">
              {siteConfig.sanctuaryTitle || siteConfig.area || 'the Neighborhood'}
            </span>
          </h2>

          <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
            Step into a welcoming, relaxed setting designed for patient comfort. {siteConfig.clinicName} is focused on gentle bedside care and transparent treatment explanations so you feel completely at ease.
          </p>
        </div>

        {/* 2-Column Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left: Sanctuary Features Grid */}
          <div className="lg:col-span-6 space-y-4">
            {(siteConfig.sanctuaryFeatures || []).map((feat: any, i: number) => (
              <div
                key={i}
                className="p-5 sm:p-6 rounded-3xl bg-white border border-stone-200 hover:border-emerald-300 transition-all duration-300 flex items-start gap-4 shadow-xs hover:shadow-md"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-emerald-700" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-display font-bold text-base sm:text-lg text-stone-900">
                    {feat.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                    {feat.desc || feat.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Right: Clinic Visual & Location Badge */}
          <div className="lg:col-span-6 space-y-6">
            
            <div className="relative aspect-[4/3] rounded-3xl overflow-hidden border border-stone-200 bg-stone-100 shadow-xl group">
              <Image
                src="/images/operatory-room.jpg"
                alt={`${siteConfig.clinicName} dental treatment environment`}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 via-stone-900/20 to-transparent" />

              {/* Park Overlook Badge */}
              <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md border border-emerald-200 px-3 py-1.5 rounded-full text-xs font-semibold text-emerald-800 flex items-center gap-2 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                <span>{siteConfig.landmark || siteConfig.area}</span>
              </div>

              {/* Bottom Address Info Box */}
              <div className="absolute bottom-4 inset-x-4 p-4 rounded-2xl bg-white/95 backdrop-blur-xl border border-stone-200 space-y-1 text-xs shadow-md">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span>{siteConfig.address}</span>
                  </span>
                  <span className="text-amber-800 font-semibold text-[10px]">
                    {siteConfig.area || ''}
                  </span>
                </div>
                {siteConfig.landmark && (
                  <p className="text-stone-600 text-[11px]">
                    Landmark: {siteConfig.landmark}
                  </p>
                )}
              </div>
            </div>

            {/* Quick Experience Assurance */}
            <div className="p-6 rounded-2xl bg-white border border-amber-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <div className="text-xs font-bold text-stone-900">Attentive 1-on-1 Consultation</div>
                <div className="text-[11px] text-stone-500">Unhurried consultations with {siteConfig.doctorName}</div>
              </div>

              <a
                href="#scheduler"
                className="min-h-[48px] px-6 py-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 transition-all shadow-md shrink-0 flex items-center justify-center gap-1.5"
              >
                <span>Reserve Your Time</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}

