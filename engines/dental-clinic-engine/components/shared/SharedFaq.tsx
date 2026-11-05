'use client';

import { useState } from 'react';
import { ChevronDown, MessageSquare } from 'lucide-react';
import { BaseClinicViewModel, TemplateTheme, THEME_STYLES } from './theme';

interface SharedFaqProps {
  siteConfig: BaseClinicViewModel;
  theme?: TemplateTheme;
}

export default function SharedFaq({ siteConfig, theme = 'modern' }: SharedFaqProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const faqs = siteConfig.faqs || [];
  const styles = THEME_STYLES[theme];

  if (faqs.length === 0) return null;

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className={`py-16 sm:py-20 ${styles.sectionBg} border-b border-slate-200`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Section Header */}
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className={`text-xs font-bold ${styles.accentText} uppercase tracking-wider block`}>
            Common Questions
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-normal">
            Clear information about consultation, procedure safety, and appointments.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-2xs transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleFAQ(index)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${styles.accentBadge} uppercase tracking-wider`}>
                      {faq.category}
                    </span>
                    <span className="font-serif text-sm sm:text-base font-bold text-slate-900 leading-snug">
                      {faq.question}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transform transition-transform duration-200 ${
                      isOpen ? `rotate-180 ${styles.accentText}` : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-4 pb-5 sm:px-5 sm:pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed font-normal border-t border-slate-100 pt-3 bg-white">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Ask Doctor direct CTA */}
        <div className="text-center p-5 rounded-2xl bg-white border border-slate-200 space-y-2 shadow-2xs">
          <p className="text-xs text-slate-700 font-medium">
            Have a specific clinical question not covered above?
          </p>
          <a
            href={`https://wa.me/${siteConfig.whatsapp}?text=${encodeURIComponent(
              `Hi ${siteConfig.doctorName}, I have a question regarding treatments at ${siteConfig.clinicName}.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center justify-center gap-2 text-xs sm:text-sm font-bold ${styles.primaryButton} px-5 py-2.5 rounded-xl shadow-xs transition-all text-center`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Ask {siteConfig.doctorName} on WhatsApp</span>
          </a>
        </div>

      </div>
    </section>
  );
}
