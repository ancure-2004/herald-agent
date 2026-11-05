'use client';

import { useState } from 'react';
import { Clock, Sun, Moon, ArrowRight, Phone, MessageCircle } from 'lucide-react';
import { BaseClinicViewModel, TemplateTheme, THEME_STYLES } from './theme';

interface SharedSchedulerProps {
  siteConfig: BaseClinicViewModel;
  theme?: TemplateTheme;
}

export default function SharedScheduler({ siteConfig, theme = 'modern' }: SharedSchedulerProps) {
  const isHoursVerified = siteConfig.hours?.verified === true;
  const services = siteConfig.services || [];
  const defaultProcedure = services[0]?.title || services[0]?.name || 'Dental Consultation';

  const [selectedCare, setSelectedCare] = useState(defaultProcedure);
  const [selectedSession, setSelectedSession] = useState<'morning' | 'evening'>('morning');
  const [selectedTime, setSelectedTime] = useState('11:00 AM');

  const morningSlots = siteConfig.morningSlots || ['10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM'];
  const eveningSlots = siteConfig.eveningSlots || ['05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM'];

  const styles = THEME_STYLES[theme];

  const waText = encodeURIComponent(
    `Hi ${siteConfig.doctorName}, I would like to book an appointment for ${selectedCare} at ${siteConfig.clinicName} (${selectedSession === 'morning' ? 'Morning' : 'Evening'}: ${selectedTime}).`
  );

  return (
    <section id="scheduler" className={`py-16 sm:py-20 ${styles.sectionBg} border-b border-slate-200`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-8">
          
          {/* Header */}
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className={`text-xs font-bold ${styles.accentText} uppercase tracking-wider block`}>
              Appointment Request
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900">
              Schedule Your Consultation
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-normal">
              Direct confirmation with {siteConfig.doctorName}&apos;s desk at {siteConfig.shortName}.
            </p>
          </div>

          {/* Treatment Selection Grid */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-800 block">
              1. Select Treatment:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {services.map((s, idx) => {
                const procTitle = s.title || s.name || `Treatment ${idx + 1}`;
                const procDuration = s.recoveryTime || 'Standard Visit';
                const isSelected = selectedCare === procTitle;
                return (
                  <button
                    key={s.id || idx}
                    type="button"
                    onClick={() => setSelectedCare(procTitle)}
                    className={`p-3.5 rounded-2xl text-left border transition-colors flex flex-col justify-between ${
                      isSelected
                        ? `${styles.accentBg} ${theme === 'modern' ? 'text-charcoal-900' : 'text-white'} ${styles.accentBorder} shadow-xs`
                        : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-bold leading-tight mb-1">
                      {procTitle}
                    </div>
                    <div
                      className={`text-[11px] flex items-center gap-1.5 ${
                        isSelected ? (theme === 'modern' ? 'text-charcoal-800 font-medium' : 'text-white/90 font-medium') : 'text-slate-500'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>{procDuration}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hours Verification Handling */}
          {isHoursVerified ? (
            <>
              {/* Session Window */}
              <div className="space-y-3 pt-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-800 block">
                  2. Select Preferred Time:
                </label>
                
                {/* Session Tabs */}
                <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSession('morning');
                      setSelectedTime(morningSlots[0] || '10:00 AM');
                    }}
                    className={`py-2.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                      selectedSession === 'morning'
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span>Morning</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSession('evening');
                      setSelectedTime(eveningSlots[0] || '05:00 PM');
                    }}
                    className={`py-2.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                      selectedSession === 'evening'
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Moon className="w-4 h-4 text-slate-600" />
                    <span>Evening</span>
                  </button>
                </div>

                {/* Time Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {(selectedSession === 'morning' ? morningSlots : eveningSlots).map((slot) => {
                    const isSelected = selectedTime === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedTime(slot)}
                        className={`py-2.5 text-xs font-bold text-center rounded-xl border transition-all ${
                          isSelected
                            ? `${styles.primaryButton} shadow-xs`
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action CTA */}
              <div className="pt-2">
                <a
                  href={`https://wa.me/${siteConfig.whatsapp}?text=${waText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full py-3.5 px-4 rounded-xl text-sm font-bold ${styles.primaryButton} transition-all flex items-center justify-center gap-2 shadow-xs text-center`}
                >
                  <span>Request {selectedTime} on WhatsApp ({selectedCare})</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </>
          ) : (
            <div className="space-y-4 pt-2 border-t border-slate-200">
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
                <div className="text-base font-bold text-slate-900">
                  Call to confirm timings
                </div>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                  Consultation timings for {selectedCare} are confirmed directly with {siteConfig.doctorName}&apos;s desk.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <a
                    href={`tel:${siteConfig.phoneRaw}`}
                    className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs ${styles.secondaryButton} transition-all flex items-center justify-center gap-2`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call {siteConfig.phone}</span>
                  </a>
                  <a
                    href={`https://wa.me/${siteConfig.whatsapp}?text=${encodeURIComponent(
                      `Hi ${siteConfig.doctorName}, I would like to confirm consultation timings for ${selectedCare} at ${siteConfig.clinicName}.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-700 hover:bg-emerald-800 text-white transition-all flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp Timing Confirmation</span>
                  </a>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </section>
  );
}
