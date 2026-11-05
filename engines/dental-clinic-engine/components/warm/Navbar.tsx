'use client';
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import React, { useState } from "react";
import { Phone, MessageSquare, Clock, Heart, ShieldCheck } from "lucide-react";
import { WarmViewModel } from "@/lib/adapters/warm";
import { formatNavDoctorLabel } from "@/components/shared/theme";

export default function Navbar({ siteConfig }: { siteConfig: WarmViewModel }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 50);
  });

  const isPediatric =
    siteConfig.clinicName?.toLowerCase().includes('pediatric') ||
    siteConfig.tagline?.toLowerCase().includes('pediatric') ||
    siteConfig.shortDescription?.toLowerCase().includes('pediatric') ||
    siteConfig.qualifications?.toLowerCase().includes('pedodont') ||
    siteConfig.doctorName?.toLowerCase().includes('pedodont') ||
    siteConfig.slug === 'dr-rohini-josan-malik';

  const navLinks = [
    { label: "Gentle Care Approach", href: "#comfort-protocol" },
    ...(!isPediatric ? [{ label: "Dentures & Restorations", href: "#denture-comfort" }] : []),
    { label: "Treatments", href: "#cosmetic-suite" },
    { label: `About ${formatNavDoctorLabel(siteConfig.doctorName)}`, href: "#doctor-profile" },
    { label: "Reviews", href: "#reviews" },
  ];

  const hoursDisplay = siteConfig.hours?.verified
    ? (Array.isArray(siteConfig.clinicHours) && siteConfig.clinicHours[0]
      ? `${siteConfig.clinicHours[0].day}: ${siteConfig.clinicHours[0].time}`
      : 'Call to confirm timings')
    : 'Call to confirm timings';

  return (
    <>
      {/* Top Reassurance Announcement Banner */}
      <div className="bg-gradient-to-r from-plum-950 via-plum-900 to-plum-950 text-rose-100 pl-1.5 sm:pl-2.5 lg:pl-3.5 pr-3 sm:pr-6 lg:pr-8 py-1.5 text-xs border-b border-plum-800/60 relative z-[110]">
        <div className="max-w-[98%] 2xl:max-w-[1440px] mx-auto flex items-center justify-center md:justify-between gap-2">
          <div className="flex items-center space-x-2 truncate w-full md:w-auto justify-center md:justify-start">
            <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-200 border border-rose-400/30 shrink-0">
              <Heart className="w-3 h-3 text-rose-300" />
              <span>Gentle & Family Dentistry Clinic</span>
            </span>
            <span className="inline md:hidden text-rose-200/90 truncate text-[10px]">
              {siteConfig.area || ''} • {siteConfig.phone}
            </span>
            <span className="hidden md:inline text-rose-200/90 truncate">
              Personalized Dental Care &amp; Gentle Bedside Treatment • {siteConfig.area || ''}
            </span>
          </div>
          <div className="hidden md:flex items-center space-x-3 text-rose-200/90 text-xs shrink-0">
            <span className="hidden sm:inline-flex items-center gap-1 text-rose-300 font-medium">
              <Clock className="w-3 h-3 text-rose-300" />
              <span>{hoursDisplay}</span>
            </span>
            <a
              href={`tel:${siteConfig.phoneRaw}`}
              className="font-bold text-white hover:text-rose-200 transition-colors flex items-center gap-1 underline underline-offset-2"
            >
              <Phone className="w-3 h-3" />
              <span>{siteConfig.phone}</span>
            </a>
          </div>
        </div>
      </div>

      <div className="sticky top-0 z-[100] w-full">
      <motion.header
        layout
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className={`mx-auto ${isScrolled ? 'w-[calc(100%-2rem)] mt-2 sm:mt-4 rounded-full shadow-2xl backdrop-blur-xl border border-rose-200/80 bg-white/95' : 'w-full mt-0 bg-white/95 backdrop-blur-md border-b border-rose-100/80 shadow-sm'}`}
        style={{
          transitionProperty: 'background-color, box-shadow, border-color, border-radius',
          transitionDuration: '400ms',
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Main Navigation Bar */}
        <motion.nav layout className="w-full overflow-hidden" style={{ borderRadius: isScrolled ? 9999 : 0 }}>
          <div className="max-w-[98%] 2xl:max-w-[1440px] mx-auto pl-1.5 sm:pl-2.5 lg:pl-3.5 pr-3 sm:pr-6 lg:pr-8">
            <motion.div layout className="flex items-center justify-between" animate={{ height: isScrolled ? 60 : 72 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
              {/* Clinic Branding */}
              <a href="#" className="flex items-center gap-2.5 shrink-0 group min-w-0 max-w-[70%] sm:max-w-none pr-2">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-plum-900 to-rose-600 flex items-center justify-center text-white shadow-md shadow-plum-900/10 shrink-0 group-hover:scale-105 transition-transform duration-300">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-serif text-base sm:text-lg lg:text-xl font-bold tracking-tight text-plum-950 truncate">
                    {siteConfig.shortName || siteConfig.clinicName}
                  </span>
                  <span className="hidden 2xl:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-plum-100 text-plum-900 border border-plum-200">
                    {siteConfig.experience || 'Experienced'}
                  </span>
                </div>
                <span className="text-[10px] sm:text-xs text-slate-500 font-medium tracking-tight whitespace-nowrap truncate">
                  {siteConfig.area || ''}
                </span>
              </div>
            </a>

            {/* Desktop Navigation Items */}
            <div className="hidden lg:flex items-center space-x-1 xl:space-x-2 text-xs xl:text-sm font-semibold text-slate-700">{navLinks.map((item) => (<a key={item.href} href={item.href} className="px-2.5 py-2 rounded-lg hover:text-plum-900 hover:bg-rose-50/80 transition-colors whitespace-nowrap">{item.label}</a>))}</div>

            {/* Right CTAs */}
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <a
                href={`tel:${siteConfig.phoneRaw}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-plum-900 bg-plum-50 hover:bg-plum-100 rounded-full border border-plum-200/80 transition-all shadow-xs"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call Clinic</span>
              </a>

              <a
                href={`https://wa.me/${siteConfig.whatsapp}?text=${encodeURIComponent(`Hi ${siteConfig.doctorName}, I would like to consult about a dental treatment at ${siteConfig.clinicName}.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 rounded-full shadow-xs hover:shadow-md transition-all whitespace-nowrap"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp Booking</span>
              </a>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex items-center lg:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl text-plum-950 hover:bg-rose-50 border border-rose-200 transition-colors focus:outline-none"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </motion.div>
          </div>

      </motion.nav>
      </motion.header>

      {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-x-4 top-[85px] max-h-[80vh] overflow-y-auto bg-white border border-rose-200 px-4 pt-3 pb-6 space-y-3 shadow-2xl rounded-2xl animate-fade-in-up z-[110]">
            <div className="grid grid-cols-2 gap-2 pt-1 pb-3 border-b border-rose-100">
              <a
                href={`tel:${siteConfig.phoneRaw}`}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-plum-50 text-plum-950 text-xs font-bold rounded-xl border border-plum-200 text-center"
              >
                <Phone className="w-3.5 h-3.5 text-plum-900" />
                <span>Call Clinic</span>
              </a>
              <a
                href={`https://wa.me/${siteConfig.whatsapp}?text=${encodeURIComponent(`Hi ${siteConfig.doctorName}, I would like to book an appointment.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl text-center shadow-xs"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp Chat</span>
              </a>
            </div>

            <div className="flex flex-col space-y-1">{navLinks.map((item) => (<a key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-rose-50 hover:text-plum-900 rounded-lg transition-colors">{item.label}</a>))}</div>

            <div className="pt-2 text-xs text-slate-500 bg-rose-50/70 p-3 rounded-xl border border-rose-100">
              <p className="font-bold text-plum-950">{siteConfig.doctorName} • {siteConfig.qualifications}</p>
              <p className="mt-0.5">{siteConfig.address}</p>
              <p className="mt-1 font-semibold text-rose-700 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{hoursDisplay}</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

