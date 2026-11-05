'use client';

import { Phone, MessageSquare, Calendar } from 'lucide-react';
import { BaseClinicViewModel, TemplateTheme, THEME_STYLES } from './theme';

interface SharedStickyBarProps {
  siteConfig: BaseClinicViewModel;
  theme?: TemplateTheme;
}

export default function SharedStickyBar({ siteConfig, theme = 'modern' }: SharedStickyBarProps) {
  const styles = THEME_STYLES[theme];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 py-2 px-3 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 shadow-xl pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      <div className="grid grid-cols-3 gap-2 max-w-md mx-auto">
        <a
          href={`tel:${siteConfig.phoneRaw}`}
          className="flex flex-col items-center justify-center py-1.5 px-1 min-h-[40px] rounded-xl bg-slate-900 text-slate-200 border border-slate-800 active:bg-slate-800 transition-colors"
        >
          <Phone className="w-4 h-4 text-slate-300" />
          <span className="text-[9px] font-bold mt-0.5 tracking-wider uppercase">Call</span>
        </a>
        <a
          href={`https://wa.me/${siteConfig.whatsapp}?text=${encodeURIComponent(
            `Hi ${siteConfig.doctorName}, I would like to book a consultation at ${siteConfig.clinicName}.`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center py-1.5 px-1 min-h-[40px] rounded-xl bg-emerald-700 text-white shadow-xs active:bg-emerald-800 transition-colors"
        >
          <MessageSquare className="w-4 h-4 text-white" />
          <span className="text-[9px] font-bold mt-0.5 tracking-wider uppercase">WhatsApp</span>
        </a>
        <a
          href="#scheduler"
          className={`flex flex-col items-center justify-center py-1.5 px-1 min-h-[40px] rounded-xl ${styles.accentBg} ${theme === 'modern' ? 'text-charcoal-900' : 'text-white'} active:opacity-90 transition-opacity`}
        >
          <Calendar className="w-4 h-4" />
          <span className="text-[9px] font-bold mt-0.5 tracking-wider uppercase">Book Slot</span>
        </a>
      </div>
    </div>
  );
}
