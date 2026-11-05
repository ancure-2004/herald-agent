'use client';

import Link from 'next/link';
import { Star, MessageSquare, Phone, MapPin, Clock } from 'lucide-react';
import { BaseClinicViewModel, TemplateTheme, THEME_STYLES } from './theme';

interface SharedFooterProps {
  siteConfig: BaseClinicViewModel;
  theme?: TemplateTheme;
}

export default function SharedFooter({ siteConfig, theme = 'modern' }: SharedFooterProps) {
  const displayServices = (siteConfig.services && siteConfig.services.length > 0)
    ? siteConfig.services.slice(0, 5)
    : [];

  const hours = Array.isArray(siteConfig.clinicHours) ? siteConfig.clinicHours : null;
  const styles = THEME_STYLES[theme];

  return (
    <footer className="bg-slate-950 text-white border-t border-slate-800 pt-12 pb-24 sm:pb-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8">
          
          {/* Col 1: Brand & Lead Doctor */}
          <div className="lg:col-span-5 space-y-4">
            <Link href="/" className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl ${styles.accentBg} ${theme === 'premium' ? 'text-white' : 'text-charcoal-950'} flex items-center justify-center font-serif text-xl font-bold`}>
                {(siteConfig.clinicName || 'D')[0]}
              </div>
              <div>
                <span className="font-sans font-bold text-base text-white block">
                  {siteConfig.clinicName}
                </span>
                <span className={`text-[10px] font-semibold tracking-wider uppercase ${styles.accentText} block`}>
                  {siteConfig.shortName}
                </span>
              </div>
            </Link>

            <p className="text-xs text-slate-400 font-normal leading-relaxed max-w-sm">
              Led by {siteConfig.doctorName} ({siteConfig.qualifications}). Providing gentle, conservative dentistry in {siteConfig.area || ''}.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-900 text-slate-300 border border-slate-800 flex items-center gap-1.5">
                <Star className={`w-3.5 h-3.5 ${styles.accentFill}`} />
                <span>{siteConfig.rating} Google Rating ({siteConfig.reviewCount} Reviews)</span>
              </span>
            </div>
            
            <div className="flex items-center gap-2 pt-1">
              <a
                href={`https://wa.me/${siteConfig.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors"
                aria-label="WhatsApp"
              >
                <MessageSquare className="w-4 h-4" />
              </a>
              <a
                href={`tel:${siteConfig.phoneRaw}`}
                className="p-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors"
                aria-label="Call Clinic"
              >
                <Phone className="w-4 h-4" />
              </a>
              <a
                href={siteConfig.directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors"
                aria-label="Directions"
              >
                <MapPin className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Col 2: Clinical Services */}
          {displayServices.length > 0 && (
            <div className="lg:col-span-4 space-y-3">
              <h4 className={`text-xs font-bold uppercase tracking-wider ${styles.accentText}`}>
                Dental Treatments
              </h4>
              <ul className="space-y-2 text-xs text-slate-300">
                {displayServices.map((srv, idx) => (
                  <li key={idx}>
                    <a href="#services" className="hover:text-white transition-colors">
                      {srv.name || srv.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Col 3: Location & Hours */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className={`text-xs font-bold uppercase tracking-wider ${styles.accentText}`}>
              Hours &amp; Location
            </h4>
            <div className="text-xs text-slate-300 space-y-2.5">
              <p className="leading-relaxed text-slate-400">{siteConfig.address}</p>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <span className="font-semibold text-white block border-b border-slate-800 pb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Timings:</span>
                </span>
                <div className="space-y-1 text-xs text-slate-300">
                  {siteConfig.hours?.verified && hours ? (
                    hours.map((h, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <span className="text-slate-400">{h.day}</span>
                        <span className="font-medium text-white">{h.time}</span>
                      </div>
                    ))
                  ) : (
                    <div className="space-y-1">
                      <div>Call to confirm timings</div>
                      <div className="flex items-center gap-2 pt-1 text-[11px]">
                        <a href={`tel:${siteConfig.phoneRaw}`} className="text-white underline">Call</a>
                        <span>•</span>
                        <a
                          href={`https://wa.me/${siteConfig.whatsapp}?text=${encodeURIComponent(
                            `Hi ${siteConfig.doctorName}, I would like to confirm consultation hours for ${siteConfig.clinicName}.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-400 underline"
                        >
                          WhatsApp
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            © {new Date().getFullYear()} {siteConfig.clinicName}. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <a href={siteConfig.directionsUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
              Google Maps Location
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
}
