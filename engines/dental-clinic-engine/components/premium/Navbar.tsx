'use client';

import { useState } from "react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { Phone, MapPin, MessageSquare, Calendar } from "lucide-react";
import { PremiumViewModel } from "@/lib/adapters/premium";
import { formatNavDoctorLabel } from "@/components/shared/theme";

export default function Navbar({ siteConfig }: { siteConfig: PremiumViewModel }) {
  const [open, setOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 50);
  });

  return (
    <>
      {/* Top Announcement Bar */}
      <div className="bg-[#F4EFEA] border-b border-amber-200/60 text-stone-700 px-4 py-1.5 md:py-1 text-[10px] md:text-[11px] w-full relative z-[110]">
        <div className="w-full px-4 sm:px-6 flex items-center justify-center md:justify-between gap-4">
          <div className="flex items-center gap-2 truncate w-full md:w-auto justify-center md:justify-start">
            <span className="hidden md:flex bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full border border-amber-300 text-[10px] uppercase tracking-wider items-center gap-1.5 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
              {siteConfig.shortName || siteConfig.clinicName}
            </span>
            <span className="truncate text-stone-700 text-[10px] md:text-xs hidden md:inline">
              {siteConfig.tagline || 'Family Dental Care & Gentle Restorative Dentistry'} • {siteConfig.area || ''}
            </span>
            <span className="truncate text-stone-700 text-[10px] font-bold md:hidden text-center flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0" />
              {siteConfig.shortName || siteConfig.clinicName} • {siteConfig.doctorName}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-4 shrink-0 text-[11px]">
            {siteConfig.area && (
              <span className="hidden md:inline-flex items-center gap-1 text-stone-600 font-medium">
                <MapPin className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>{siteConfig.area}</span>
              </span>
            )}
            <a
              href={`tel:${siteConfig.phoneRaw}`}
              className="font-bold text-amber-800 hover:text-amber-950 transition-colors flex items-center gap-1"
            >
              <Phone className="w-3 h-3 text-amber-700 shrink-0" />
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
        className={`mx-auto ${isScrolled ? 'w-[calc(100%-2rem)] mt-2 sm:mt-4 rounded-full shadow-2xl backdrop-blur-xl border border-amber-200/50 bg-white/95' : 'w-full mt-0 bg-white/95 backdrop-blur-xl border-b border-stone-200 shadow-xs'}`}
        style={{
          transitionProperty: 'background-color, box-shadow, border-color, border-radius',
          transitionDuration: '400ms',
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'hidden'
        }}
      >
        {/* Main Navigation Bar */}
        <motion.div layout className="w-full px-4 sm:px-6 lg:px-8">
          <motion.div layout className="flex items-center justify-between" animate={{ paddingTop: isScrolled ? 10 : 16, paddingBottom: isScrolled ? 10 : 16 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
          
          {/* Brand Logo & Title */}
          <a href="#" className="flex items-center gap-3 sm:gap-3.5 group min-w-0 max-w-[70%] sm:max-w-none">
            <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-600 to-amber-800 p-[1px] shadow-sm transition-transform group-hover:scale-105 shrink-0">
              <div className="w-full h-full bg-white rounded-[15px] flex items-center justify-center shadow-inner">
                <span className="font-display font-black text-base sm:text-lg gold-gradient-text tracking-tighter">
                  {(siteConfig.shortName || siteConfig.clinicName || 'D').slice(0, 2).toUpperCase()}
                </span>
              </div>
            </div>
            <div className="flex flex-col justify-center min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-display font-extrabold text-sm sm:text-base lg:text-lg text-stone-900 tracking-tight truncate">
                  {siteConfig.shortName || siteConfig.clinicName}
                </span>
              </div>
              <span className="font-medium text-[11px] text-stone-600 mt-0.5 tracking-wide truncate">
                <span className="hidden md:inline">{siteConfig.leadDoctor} • Dental Surgeon</span>
                <span className="md:hidden">{siteConfig.area}</span>
              </span>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold text-stone-700">
            <a href="#services" className="hover:text-amber-700 transition-colors py-1 relative hover:after:w-full after:w-0 after:h-[2px] after:bg-amber-600 after:absolute after:bottom-0 after:left-0 after:transition-all">
              Dental Treatments
            </a>
            <a href="#doctor" className="hover:text-amber-700 transition-colors py-1 relative hover:after:w-full after:w-0 after:h-[2px] after:bg-amber-600 after:absolute after:bottom-0 after:left-0 after:transition-all">
              About {formatNavDoctorLabel(siteConfig.doctorName)}
            </a>
            <a href="#sanctuary" className="hover:text-amber-700 transition-colors py-1 relative hover:after:w-full after:w-0 after:h-[2px] after:bg-amber-600 after:absolute after:bottom-0 after:left-0 after:transition-all">
              Clinic & Ambience
            </a>
            <a href="#faq" className="hover:text-amber-700 transition-colors py-1 relative hover:after:w-full after:w-0 after:h-[2px] after:bg-amber-600 after:absolute after:bottom-0 after:left-0 after:transition-all">
              Patient FAQ
            </a>
            <a href="#location" className="hover:text-amber-700 transition-colors py-1 relative hover:after:w-full after:w-0 after:h-[2px] after:bg-amber-600 after:absolute after:bottom-0 after:left-0 after:transition-all">
              Location & Hours
            </a>
          </nav>

          {/* Desktop Right CTA Trigger */}
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            <a
              href="#scheduler"
              className="relative px-6 py-3 text-xs font-bold text-white bg-gradient-to-r from-amber-600 via-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 rounded-full shadow-md transition-all duration-300 hover:scale-[1.02] active:scale-95 flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Book Consultation</span>
            </a>
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="lg:hidden">
            <button
              onClick={() => setOpen(!open)}
              className="p-2.5 rounded-xl bg-white border border-stone-200 text-stone-700 hover:text-stone-900 shadow-xs"
              aria-label="Toggle navigation menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {open ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

        </motion.div>
        </motion.div>

      </motion.header>

      {/* Mobile Drawer */}
      {open && (
        <div className="lg:hidden absolute top-[calc(100%+0.5rem)] left-2 right-2 bg-white border border-stone-200 px-6 py-6 space-y-3 text-sm font-semibold shadow-2xl rounded-3xl z-[110]">
          <a
            href="#services"
            onClick={() => setOpen(false)}
            className="block py-2 text-stone-700 hover:text-amber-700 border-b border-stone-100"
          >
            Dental Treatments
          </a>
          <a
            href="#doctor"
            onClick={() => setOpen(false)}
            className="block py-2 text-stone-700 hover:text-amber-700 border-b border-stone-100"
          >
            About {formatNavDoctorLabel(siteConfig.doctorName)}
          </a>
          <a
            href="#sanctuary"
            onClick={() => setOpen(false)}
            className="block py-2 text-stone-700 hover:text-amber-700 border-b border-stone-100"
          >
            Clinic & Ambience
          </a>
          <a
            href="#faq"
            onClick={() => setOpen(false)}
            className="block py-2 text-stone-700 hover:text-amber-700 border-b border-stone-100"
          >
            Patient FAQ
          </a>
          <a
            href="#location"
            onClick={() => setOpen(false)}
            className="block py-2 text-stone-700 hover:text-amber-700 border-b border-stone-100"
          >
            Location & Hours
          </a>

          <div className="pt-4 flex flex-col gap-2.5">
            <a
              href={`tel:${siteConfig.phoneRaw}`}
              className="w-full text-center min-h-[56px] py-4 px-6 text-xs sm:text-sm font-bold text-stone-800 bg-[#F4EFEA] border border-stone-200 rounded-2xl flex items-center justify-center gap-2"
            >
              <Phone className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Direct Call: {siteConfig.phone}</span>
            </a>
            <a
              href={`https://wa.me/${siteConfig.whatsapp}?text=${encodeURIComponent(`Hi ${siteConfig.doctorName}, I would like to reserve a consultation.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full text-center min-h-[56px] py-4 px-6 text-xs sm:text-sm font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>WhatsApp Booking ({siteConfig.phone})</span>
            </a>
            <a
              href="#scheduler"
              onClick={() => setOpen(false)}
              className="w-full text-center min-h-[56px] py-4 px-6 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-amber-600 to-amber-700 rounded-2xl shadow-md flex items-center justify-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              <span>Book Private Consultation Online →</span>
            </a>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
