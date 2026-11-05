'use client';

import { useState } from "react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import Link from "next/link";
import { Phone, MessageSquare, Star } from "lucide-react";
import { ModernViewModel } from "@/lib/adapters/modern";
import { formatNavDoctorLabel } from "@/components/shared/theme";

export default function Navbar({ siteConfig }: { siteConfig: ModernViewModel }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 50);
  });

  return (
    <>
      {/* Top Architectural Announcement Banner */}
      <div className={`bg-charcoal-900 text-white text-[11px] sm:text-xs py-1.5 px-2 sm:px-4 tracking-wide w-full relative z-[110]`}>
        <div className="max-w-[96%] xl:max-w-[95%] 2xl:max-w-[1440px] mx-auto flex items-center justify-center md:justify-between">
          <div className="flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-gold-400 shrink-0" />
            <span className="font-medium text-slate-200 truncate">
              {siteConfig.shortName && siteConfig.shortName.trim().toLowerCase() !== siteConfig.leadDoctor.trim().toLowerCase() && (
                <span className="hidden md:inline">{siteConfig.shortName} • </span>
              )}
              <strong className="text-gold-300">{siteConfig.leadDoctor}</strong>
              <span className="hidden md:inline"> • {siteConfig.area || ""}</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-4 text-slate-300 text-[11px]">
            <span>
              {siteConfig.hours?.verified
                ? (Array.isArray(siteConfig.clinicHours) && siteConfig.clinicHours[0]
                  ? `${siteConfig.clinicHours[0].day}: ${siteConfig.clinicHours[0].time}`
                  : 'Call to confirm timings')
                : 'Call to confirm timings'}
            </span>
            <span className="text-gold-400 font-semibold flex items-center gap-1">
              <Star className="w-3 h-3 fill-gold-400 text-gold-400" />
              <span>{siteConfig.rating} ({siteConfig.reviewCount} Reviews)</span>
            </span>
          </div>
        </div>
      </div>

      <div className="sticky top-0 z-[100] w-full">
      <motion.header
        layout
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className={`mx-auto ${isScrolled ? 'w-[calc(100%-2rem)] mt-2 sm:mt-4 rounded-full shadow-2xl backdrop-blur-xl border border-slate-200/50 bg-white/95' : 'w-full mt-0 bg-white/95 backdrop-blur-md border-b border-slate-200'}`}
        style={{
          transitionProperty: 'background-color, box-shadow, border-color, border-radius',
          transitionDuration: '400ms',
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'hidden'
        }}
      >
        {/* Main Navigation Bar */}
        <motion.div layout className="max-w-[96%] xl:max-w-[95%] 2xl:max-w-[1440px] mx-auto px-2 sm:px-4 lg:px-6 flex items-center justify-between" animate={{ height: isScrolled ? 60 : 72 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group min-w-0 max-w-[70%] sm:max-w-none">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-charcoal-900 text-gold-400 flex items-center justify-center font-serif text-xl sm:text-2xl font-bold border border-gold-500/40 shadow-card-soft group-hover:scale-105 transition-transform shrink-0">
            {(siteConfig.clinicName || "D")[0]}
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="font-sans font-extrabold text-sm sm:text-base lg:text-lg tracking-tight text-charcoal-900 truncate">
                {siteConfig.shortName || siteConfig.clinicName}
              </span>
            </div>
            <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-500 truncate">
              {siteConfig.area || ""}
            </span>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold text-charcoal-800">
          <a href="#services" className="hover:text-gold-600 transition-colors">
            Treatments
          </a>
          <a href="#spectrum" className="hover:text-gold-600 transition-colors">
            Restorative Care
          </a>
          <a href="#aligner-journey" className="hover:text-gold-600 transition-colors">
            Aligners
          </a>
          <a href="#doctor" className="hover:text-gold-600 transition-colors">
            About {formatNavDoctorLabel(siteConfig.doctorName)}
          </a>
          <a href="#reviews" className="hover:text-gold-600 transition-colors">
            Reviews ({siteConfig.reviewCount})
          </a>
        </nav>

        {/* Right CTA Actions */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href={`tel:${siteConfig.phoneRaw}`}
            className="text-xs font-bold text-charcoal-800 px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-gold-400 hover:bg-slate-50 transition-all flex items-center gap-1.5"
          >
            <Phone className="w-3.5 h-3.5 text-charcoal-700" />
            <span>{siteConfig.phone}</span>
          </a>
          <a
            href={`https://wa.me/${siteConfig.whatsapp}?text=${encodeURIComponent(
              `Hi ${siteConfig.doctorName}, I would like to book a Dental Consultation at ${siteConfig.clinicName}.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-charcoal-900 bg-gold-400 hover:bg-gold-300 shadow-sm transition-all flex items-center gap-1.5"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>WhatsApp Booking</span>
          </a>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex lg:hidden items-center gap-2">
          <a
            href={`https://wa.me/${siteConfig.whatsapp}?text=${encodeURIComponent(
              `Hi ${siteConfig.doctorName}, I would like to book a Consultation at ${siteConfig.clinicName}.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden px-3 py-2 rounded-lg text-xs font-bold text-charcoal-900 bg-gold-400"
          >
            Book
          </a>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-charcoal-800 hover:bg-slate-100 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </motion.div>

      </motion.header>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden absolute top-[calc(100%+0.5rem)] left-2 right-2 bg-white border border-slate-200 px-5 py-4 space-y-3 shadow-2xl rounded-2xl z-[110]">
          <div className="flex flex-col space-y-2.5 text-sm font-semibold text-charcoal-800">
            <a
              href="#services"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-gold-600 transition-colors"
            >
              Dental Treatments
            </a>
            <a
              href="#spectrum"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-gold-600 transition-colors"
            >
              Restorative & Cosmetic Care
            </a>
            <a
              href="#aligner-journey"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-gold-600 transition-colors"
            >
              Clear Aligners Timeline
            </a>
            <a
              href="#doctor"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-gold-600 transition-colors"
            >
              About {formatNavDoctorLabel(siteConfig.doctorName)}
            </a>
            <a
              href="#reviews"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-gold-600 transition-colors"
            >
              Reviews ({siteConfig.reviewCount})
            </a>
          </div>
          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            <a
              href={`tel:${siteConfig.phoneRaw}`}
              className="w-full py-2.5 text-center text-xs font-bold text-charcoal-900 bg-slate-100 rounded-xl"
            >
              Call {siteConfig.phone}
            </a>
            <a
              href={`https://wa.me/${siteConfig.whatsapp}?text=${encodeURIComponent(
                `Hi ${siteConfig.doctorName}, I would like to book an appointment at ${siteConfig.clinicName}.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 text-center text-xs font-bold text-charcoal-900 bg-gold-400 rounded-xl"
            >
              Schedule on WhatsApp
            </a>
          </div>
        </div>
      )}
      </div>
    </>
  );
}

