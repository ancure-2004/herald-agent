export type TemplateTheme = 'modern' | 'premium' | 'warm';

export interface BaseClinicViewModel {
  slug: string;
  clinicName: string;
  shortName: string;
  doctorName: string;
  leadDoctor?: string;
  qualifications: string;
  experience?: string;
  area: string;
  address: string;
  landmark: string;
  phone: string;
  phoneRaw: string;
  whatsapp: string;
  rating: string;
  reviewCount: string;
  consultationFee?: string;
  mapEmbedUrl: string;
  directionsUrl: string;
  googleReviewsUrl: string;
  hours: {
    verified: boolean;
    notes?: string;
    schedule: Array<{
      day: string;
      open: string;
      close: string;
      isClosed: boolean;
      status?: string;
    }>;
  };
  clinicHours: Array<{ day: string; time: string; status: string }>;
  morningSlots?: string[];
  eveningSlots?: string[];
  services?: Array<{ id: string; title: string; name?: string; recoveryTime?: string }>;
  faqs?: Array<{ category: string; question: string; answer: string }>;
}

export const THEME_STYLES: Record<
  TemplateTheme,
  {
    accentText: string;
    accentBg: string;
    accentHoverBg: string;
    accentBorder: string;
    accentBadge: string;
    accentFill: string;
    sectionBg: string;
    cardBg: string;
    primaryButton: string;
    secondaryButton: string;
  }
> = {
  modern: {
    accentText: 'text-amber-600',
    accentBg: 'bg-gold-400',
    accentHoverBg: 'hover:bg-gold-300',
    accentBorder: 'border-gold-400',
    accentBadge: 'bg-amber-50 text-amber-900 border-amber-200',
    accentFill: 'fill-gold-400 text-gold-400',
    sectionBg: 'bg-slate-50',
    cardBg: 'bg-white',
    primaryButton: 'bg-gold-400 hover:bg-gold-300 text-charcoal-950 font-bold shadow-sm',
    secondaryButton: 'bg-charcoal-900 hover:bg-charcoal-800 text-white font-bold',
  },
  premium: {
    accentText: 'text-amber-800',
    accentBg: 'bg-amber-700',
    accentHoverBg: 'hover:bg-amber-800',
    accentBorder: 'border-amber-700',
    accentBadge: 'bg-amber-50 text-amber-900 border-amber-200',
    accentFill: 'fill-amber-700 text-amber-700',
    sectionBg: 'bg-[#FAF8F5]',
    cardBg: 'bg-white',
    primaryButton: 'bg-amber-700 hover:bg-amber-800 text-white font-bold',
    secondaryButton: 'bg-stone-900 hover:bg-stone-800 text-white font-bold',
  },
  warm: {
    accentText: 'text-rose-600',
    accentBg: 'bg-rose-600',
    accentHoverBg: 'hover:bg-rose-700',
    accentBorder: 'border-rose-600',
    accentBadge: 'bg-rose-50 text-rose-700 border-rose-200',
    accentFill: 'fill-rose-500 text-rose-500',
    sectionBg: 'bg-[#FAF8F5]',
    cardBg: 'bg-white',
    primaryButton: 'bg-plum-900 hover:bg-plum-950 text-white font-bold shadow-xs',
    secondaryButton: 'bg-rose-50 hover:bg-rose-100 text-plum-950 font-bold border border-rose-200',
  },
};

export function formatNavDoctorLabel(doctorName?: string): string {
  if (!doctorName) return 'Doctor';
  const name = doctorName.trim();
  const lower = name.toLowerCase();
  if (lower.includes('team')) {
    return 'Our Team';
  }
  if (
    ['specialities', 'speciality', 'clinic', 'centre', 'center', 'hospital', 'studio', 'dentistry', 'care'].some(
      (term) => lower.includes(term)
    )
  ) {
    return 'Doctor';
  }
  if (
    ['lead', 'chief', 'resident', 'practitioner', 'surgeon', 'director'].some((term) =>
      lower.includes(term)
    )
  ) {
    return 'Doctor';
  }
  const parts = name.split(/\s+/);
  if (['dr', 'dr.', 'dr'].includes(parts[0].toLowerCase())) {
    if (parts.length >= 2) {
      const cleanFirst = parts[1].replace(/[,&]/g, '').trim();
      return cleanFirst ? `Dr. ${cleanFirst}` : 'Doctor';
    }
    return 'Doctor';
  }
  return `Dr. ${parts[0].replace(/[,&]/g, '').trim()}`;
}
