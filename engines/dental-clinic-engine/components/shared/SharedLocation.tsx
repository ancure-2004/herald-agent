'use client';

import { MapPin, Navigation, Phone, MessageSquare, Clock } from 'lucide-react';
import { BaseClinicViewModel, TemplateTheme, THEME_STYLES } from './theme';

interface SharedLocationProps {
  siteConfig: BaseClinicViewModel;
  theme?: TemplateTheme;
}

export default function SharedLocation({ siteConfig, theme = 'modern' }: SharedLocationProps) {
  const styles = THEME_STYLES[theme];

  return (
    <section id="location" className="py-16 sm:py-20 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className={`text-xs font-bold ${styles.accentText} uppercase tracking-wider block`}>
            Location &amp; Timings
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900">
            Visit the Practice in {siteConfig.area || ''}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-normal">
            Accessible patient consultation with clear directions and neighborhood parking.
          </p>
        </div>

        {/* 2-Column Location & Hours Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Left Column: Address, Hours, & Contact Cards */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-5">
            
            {/* Address Card */}
            <div className={`p-6 rounded-3xl ${styles.sectionBg} border border-slate-200 space-y-4 shadow-xs`}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                  <MapPin className={`w-5 h-5 ${styles.accentText}`} />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-slate-900">
                    {siteConfig.clinicName}
                  </h3>
                  <p className={`text-xs font-semibold ${styles.accentText} mt-0.5`}>
                    {siteConfig.area || ''}
                  </p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                {siteConfig.address}
              </p>

              {siteConfig.landmark && (
                <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>Landmark: {siteConfig.landmark}</span>
                </div>
              )}

              <div className="pt-1">
                <a
                  href={siteConfig.directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full py-3 px-4 text-center text-xs sm:text-sm font-bold ${styles.primaryButton} rounded-xl shadow-xs transition-all flex items-center justify-center gap-2`}
                >
                  <Navigation className="w-4 h-4" />
                  <span>Get Driving Directions</span>
                </a>
              </div>
            </div>

            {/* Operating Hours Table */}
            <div className={`p-6 rounded-3xl ${styles.sectionBg} border border-slate-200 space-y-3 shadow-xs`}>
              <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
                <Clock className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Consultation Hours
                </span>
              </div>

              {siteConfig.hours?.verified ? (
                <div className="space-y-1.5 pt-1">
                  {Array.isArray(siteConfig.clinicHours) && siteConfig.clinicHours.map((h, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80 text-xs"
                    >
                      <span className="font-medium text-slate-700">{h.day}</span>
                      <span className={`font-bold ${styles.accentText}`}>{h.time}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-white border border-slate-200 text-center space-y-2.5">
                  <div className="text-xs font-bold text-slate-800">
                    Call to confirm timings
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <a
                      href={`tel:${siteConfig.phoneRaw}`}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                    >
                      Call {siteConfig.phone}
                    </a>
                    <a
                      href={`https://wa.me/${siteConfig.whatsapp}?text=${encodeURIComponent(
                        `Hi ${siteConfig.doctorName}, I would like to confirm consultation hours for ${siteConfig.clinicName}.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 transition-colors"
                    >
                      WhatsApp
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Contact Strip */}
            <div className="grid grid-cols-2 gap-3">
              <a
                href={`tel:${siteConfig.phoneRaw}`}
                className="p-3.5 rounded-2xl bg-slate-900 text-white text-center hover:bg-slate-800 transition-all space-y-0.5 shadow-xs flex flex-col items-center justify-center"
              >
                <div className="flex items-center gap-1.5 text-xs text-slate-300">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>Call Reception</span>
                </div>
                <div className={`font-bold text-xs sm:text-sm ${styles.accentText}`}>
                  {siteConfig.phone}
                </div>
              </a>
              <a
                href={`https://wa.me/${siteConfig.whatsapp}?text=${encodeURIComponent(
                  `Hi ${siteConfig.doctorName}, I'm reaching out from your website to visit ${siteConfig.clinicName}.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3.5 rounded-2xl bg-emerald-800 text-white text-center hover:bg-emerald-900 transition-all space-y-0.5 shadow-xs flex flex-col items-center justify-center"
              >
                <div className="flex items-center gap-1.5 text-xs text-emerald-200">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-300" />
                  <span>WhatsApp Line</span>
                </div>
                <div className="font-bold text-xs sm:text-sm text-white">
                  Direct Response
                </div>
              </a>
            </div>

          </div>

          {/* Right Column: Google Maps Live Embed */}
          <div className="lg:col-span-7 rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100 min-h-[380px] sm:min-h-[460px] relative">
            <iframe
              src={siteConfig.mapEmbedUrl}
              style={{ border: 0, minHeight: '380px', width: '100%', height: '100%' }}
              allowFullScreen={false}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={`${siteConfig.clinicName} Google Map Location`}
              className="w-full h-full object-cover"
            />
          </div>

        </div>

      </div>
    </section>
  );
}
