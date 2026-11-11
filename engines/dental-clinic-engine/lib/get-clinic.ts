import fs from 'fs';
import path from 'path';
import {
  ClinicSchema,
  ClaimsFileSchema,
  ServicesFileSchema,
  FaqsFileSchema,
  ModernTemplateConfigSchema,
  PremiumTemplateConfigSchema,
  WarmTemplateConfigSchema,
  type Clinic,
  type ClaimsFile,
  type ServicesFile,
  type FaqsFile,
  type Doctor,
  type DailySchedule,
} from '@/data/schema/clinic';
import { adaptToModern, ModernViewModel } from './adapters/modern';
import { adaptToPremium, PremiumViewModel } from './adapters/premium';
import { adaptToWarm, WarmViewModel } from './adapters/warm';
import { fetchClinicPackageFromNeon, NeonClinicPackageRow } from './neon-db';

const dataDirectory = path.join(process.cwd(), 'data', 'clinics');

export type TemplateType = 'modern' | 'premium' | 'warm';

export type TemplateViewModel<T extends TemplateType> = T extends 'modern'
  ? ModernViewModel
  : T extends 'premium'
  ? PremiumViewModel
  : WarmViewModel;

// -------------------------------------------------------------
// Neon / backend payload normalisation
// -------------------------------------------------------------
// The backend can return either:
//   - nested:  { clinic: {...}, claims: {...}, services: {...}, faqs: {...}, templates: {...} }
//   - flat:    the clinic object itself (clinicName, phone, hours, doctor, ...)
// Everything missing is filled with neutral defaults built from the clinic's own
// details, so ClinicSchema / ClaimsFileSchema / ServicesFileSchema / FaqsFileSchema
// and the template schemas parse without throwing.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIME_RANGE = /(\d{1,2}:\d{2}\s?[AP]M)\s*-\s*(\d{1,2}:\d{2}\s?[AP]M)/i;

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

// Turns a free-text hours string such as "Mon-Sat 10:00 AM - 08:30 PM"
// into the seven-day array that ClinicHoursSchema expects.
function buildScheduleFromText(text: string): DailySchedule[] {
  const range = text.match(TIME_RANGE);
  const open = range ? range[1].toUpperCase() : '10:00 AM';
  const close = range ? range[2].toUpperCase() : '08:00 PM';
  const openAllWeek = /mon\s*-\s*sun|daily|all\s*days/i.test(text);

  return WEEK_DAYS.map((day) => {
    const isClosed = day === 'Sunday' && !openAllWeek;
    return {
      day,
      open: isClosed ? '' : open,
      close: isClosed ? '' : close,
      isClosed,
      status: isClosed ? 'Closed' : 'Open',
    };
  });
}

function normalizeHours(rawHours: AnyRecord | undefined): Clinic['hours'] {
  const hours = rawHours ?? {};

  // Already in the nested format: keep it as-is.
  if (Array.isArray(hours.schedule)) {
    return {
      verified: Boolean(hours.verified),
      notes: hours.notes,
      schedule: hours.schedule,
    };
  }

  // Flat format: schedule is a string (or the text lives in notes).
  const text =
    typeof hours.schedule === 'string'
      ? hours.schedule
      : typeof hours.notes === 'string'
      ? hours.notes
      : '';

  return {
    verified: Boolean(hours.verified),
    notes: text || undefined,
    schedule: buildScheduleFromText(text),
  };
}

function normalizeDoctor(raw: AnyRecord | undefined, fallbackName: string, fallbackFee?: string): Doctor {
  const d = raw ?? {};
  return {
    name: d.name || fallbackName,
    title: d.title || 'Dental Surgeon',
    qualifications: d.qualifications || '',
    experience: d.experience || '',
    consultationFee: d.consultationFee || fallbackFee,
    philosophy: d.philosophy,
    credentials: Array.isArray(d.credentials) ? d.credentials : undefined,
  };
}

function normalizeClinic(raw: AnyRecord, row: NeonClinicPackageRow): Clinic {
  const slug: string = raw.slug || row.slug;
  const clinicName: string = raw.clinicName || raw.name || row.name;
  const locality: string = raw.locality || '';
  const city: string = raw.city || 'Delhi NCR';
  const phone: string = raw.phone || row.primary_phone || '';
  const digits = digitsOnly(phone);
  // "919811776655" -> local "09811776655" (matches the nested sample's phoneRaw style)
  const localDigits = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;

  const area: string = raw.area || [locality, city].filter(Boolean).join(', ');
  const address: string =
    raw.address || [locality, city, 'India'].filter(Boolean).join(', ');
  const mapQuery = encodeURIComponent(`${clinicName} ${area}`.trim());

  const fee: string | undefined = raw.consultationFee || raw.doctor?.consultationFee;
  const doctor = normalizeDoctor(raw.doctor, row.doctor_name || clinicName, fee);
  const doctors: Doctor[] =
    Array.isArray(raw.doctors) && raw.doctors.length
      ? raw.doctors.map((d: AnyRecord) => normalizeDoctor(d, doctor.name, fee))
      : [doctor];

  const hours = normalizeHours(raw.hours);

  return {
    slug,
    clinicName,
    shortName: raw.shortName || clinicName,
    clinicNameExtended: raw.clinicNameExtended,
    tagline: raw.tagline,
    shortDescription: raw.shortDescription || `Dental care at ${clinicName} in ${area}.`,
    area,
    address,
    landmark: raw.landmark || `Located in ${area}`,
    phone,
    phoneRaw: raw.phoneRaw || (localDigits ? `0${localDigits}` : ''),
    whatsapp: raw.whatsapp || digits,
    rating: raw.rating,
    reviewCount: raw.reviewCount,
    consultationFee: fee,
    mapEmbedUrl:
      raw.mapEmbedUrl ||
      `https://maps.google.com/maps?q=${mapQuery}&t=&z=16&ie=UTF8&iwloc=&output=embed`,
    directionsUrl: raw.directionsUrl || `https://maps.google.com/?q=${mapQuery}`,
    googleReviewsUrl: raw.googleReviewsUrl || `https://maps.google.com/?q=${mapQuery}`,
    hours,
    doctor,
    doctors,
    morningSlots: raw.morningSlots,
    eveningSlots: raw.eveningSlots,
  };
}

// Defaults only use facts from the payload or generic procedure wording.
// No ratings, review counts, years of experience or other unverified claims are invented.
function defaultClaims(clinic: Clinic): ClaimsFile {
  return {
    claims: [
      {
        id: 'claim-location',
        text: `Located in ${clinic.area}`,
        status: 'VERIFIED',
        source: 'Clinic profile',
      },
      {
        id: 'claim-hours',
        text: clinic.hours.notes || 'Clinic hours available on request',
        status: clinic.hours.verified ? 'VERIFIED' : 'NEEDS_CLIENT_INPUT',
        source: 'Clinic profile',
      },
      {
        id: 'claim-gentle-care',
        text: 'Gentle local numbing and unhurried clinical care',
        status: 'SAFE_TO_GENERATE',
        source: 'Standard Clinical Procedure',
      },
    ],
  };
}

// Placeholder services. Replace with the clinic's real service list before publishing.
function defaultServices(): ServicesFile {
  return {
    services: [
      {
        id: 'consultation-checkup',
        title: 'Dental Check-up & Consultation',
        category: 'Preventive Care',
        description: 'A full oral examination with a clear explanation of your options.',
        recoveryTime: 'Immediate',
      },
      {
        id: 'scaling-polishing',
        title: 'Scaling & Teeth Polishing',
        category: 'Preventive Care',
        description: 'Removal of plaque and tartar followed by gentle polishing.',
        recoveryTime: 'Immediate',
      },
      {
        id: 'root-canal-therapy',
        title: 'Root Canal Treatment',
        category: 'Endodontics',
        description: 'Treatment of infected or painful teeth while preserving the natural tooth.',
        painScore: 'Painless with Local Numbing',
      },
      {
        id: 'dental-fillings',
        title: 'Tooth-Coloured Fillings',
        category: 'Restorative',
        description: 'Repair of decayed or damaged teeth with natural-looking filling material.',
      },
      {
        id: 'tooth-extraction',
        title: 'Tooth Extraction',
        category: 'Oral Surgery',
        description: 'Gentle removal of teeth that cannot be saved, with careful aftercare guidance.',
        painScore: 'Painless with Local Numbing',
      },
    ],
  };
}

function defaultFaqs(clinic: Clinic): FaqsFile {
  return {
    faqs: [
      {
        category: 'Consultation',
        question: `How do I book an appointment at ${clinic.clinicName}?`,
        answer: `Call ${clinic.phone} or message us on WhatsApp to book a visit.`,
      },
      {
        category: 'General',
        question: 'What are the clinic hours?',
        answer: `Our listed hours are: ${clinic.hours.notes || 'please call the clinic to confirm timings'}.`,
      },
      {
        category: 'Comfort & Care',
        question: 'Will my treatment be painful?',
        answer:
          'Most procedures are performed under local anaesthesia. Tell your dentist about any anxiety so they can plan your visit at a comfortable pace.',
      },
    ],
  };
}

function defaultTemplates(clinic: Clinic): Record<TemplateType, AnyRecord> {
  return {
    modern: {
      heroMetrics: [
        {
          number: clinic.doctor?.name ?? clinic.clinicName,
          label: 'Lead Dentist',
          note: clinic.doctor?.qualifications || undefined,
        },
      ],
      alignerJourney: [],
    },
    premium: {
      sanctuaryTitle: `${clinic.area} Dental Care`,
      sanctuaryFeatures: [
        {
          title: 'Calm Treatment Rooms',
          description: 'Unhurried appointments in a comfortable, private treatment space.',
          icon: '✨',
        },
      ],
    },
    warm: {
      comfortPhases: [
        {
          step: '01',
          title: 'Unhurried Consultation',
          description: 'Your dentist listens to your concerns and explains your options clearly.',
          duration: '10 - 15 Mins',
        },
        {
          step: '02',
          title: 'Gentle Numbing',
          description: 'Topical numbing is applied before any local anaesthetic so you feel as little as possible.',
          duration: '5 Mins',
        },
        {
          step: '03',
          title: 'Careful Treatment',
          description: 'Treatment proceeds at your pace with frequent check-ins.',
          duration: 'Varies by procedure',
        },
      ],
      dentureComparison: [],
    },
  };
}

// Accepts nested or flat payloads and returns a complete, schema-ready bundle.
function normalizeNeonPayload(row: NeonClinicPackageRow) {
  const payload = row.clinic_payload as AnyRecord;

  // Nested format keeps the clinic under payload.clinic; flat format IS the clinic.
  const rawClinic: AnyRecord =
    payload.clinic && typeof payload.clinic === 'object' ? payload.clinic : payload;

  const clinic = normalizeClinic(rawClinic, row);
  const defaults = defaultTemplates(clinic);
  const payloadTemplates: AnyRecord = payload.templates ?? {};

  return {
    clinic,
    claims: (payload.claims ?? defaultClaims(clinic)) as ClaimsFile,
    services: (payload.services ?? defaultServices()) as ServicesFile,
    faqs: (payload.faqs ?? defaultFaqs(clinic)) as FaqsFile,
    templates: {
      modern: { ...defaults.modern, ...(payloadTemplates.modern ?? {}) },
      premium: { ...defaults.premium, ...(payloadTemplates.premium ?? {}) },
      warm: { ...defaults.warm, ...(payloadTemplates.warm ?? {}) },
    } as Record<TemplateType, AnyRecord>,
  };
}

export async function getClinic<T extends TemplateType>(
  slug: string,
  template: T
): Promise<TemplateViewModel<T>> {
  // 1. First check the backend (local Postgres) for dynamic zero-redeploy clinics
  const neonPkg = await fetchClinicPackageFromNeon(slug);
  if (neonPkg && neonPkg.clinic_payload) {
    const bundle = normalizeNeonPayload(neonPkg);

    const clinic = ClinicSchema.parse(bundle.clinic);
    const claims = ClaimsFileSchema.parse(bundle.claims);
    const services = ServicesFileSchema.parse(bundle.services);
    const faqs = FaqsFileSchema.parse(bundle.faqs);
    const templateRaw = bundle.templates[template];

    if (template === 'modern') {
      const modernConfig = ModernTemplateConfigSchema.parse(templateRaw);
      return adaptToModern(clinic, claims, services, faqs, modernConfig) as TemplateViewModel<T>;
    }
    if (template === 'premium') {
      const premiumConfig = PremiumTemplateConfigSchema.parse(templateRaw);
      return adaptToPremium(clinic, claims, services, faqs, premiumConfig) as TemplateViewModel<T>;
    }
    const warmConfig = WarmTemplateConfigSchema.parse(templateRaw);
    return adaptToWarm(clinic, claims, services, faqs, warmConfig) as TemplateViewModel<T>;
  }

  // 2. Fallback to static disk JSON files under data/clinics/<slug>/
  const clinicDir = path.join(dataDirectory, slug);

  if (!fs.existsSync(clinicDir) || !fs.statSync(clinicDir).isDirectory()) {
    throw new Error(`Clinic not found in backend or local data/clinics for slug: ${slug}`);
  }

  const clinicPath = path.join(clinicDir, 'clinic.json');
  if (!fs.existsSync(clinicPath)) {
    throw new Error(`Missing clinic.json for clinic: ${slug}`);
  }
  const clinicRaw = JSON.parse(fs.readFileSync(clinicPath, 'utf8'));
  const clinic = ClinicSchema.parse(clinicRaw);

  const claimsPath = path.join(clinicDir, 'claims.json');
  const claimsRaw = fs.existsSync(claimsPath)
    ? JSON.parse(fs.readFileSync(claimsPath, 'utf8'))
    : {};
  const claims = ClaimsFileSchema.parse(claimsRaw);

  const servicesPath = path.join(clinicDir, 'services.json');
  const servicesRaw = fs.existsSync(servicesPath)
    ? JSON.parse(fs.readFileSync(servicesPath, 'utf8'))
    : { services: [] };
  const services = ServicesFileSchema.parse(servicesRaw);

  const faqsPath = path.join(clinicDir, 'faqs.json');
  const faqsRaw = fs.existsSync(faqsPath)
    ? JSON.parse(fs.readFileSync(faqsPath, 'utf8'))
    : { faqs: [] };
  const faqs = FaqsFileSchema.parse(faqsRaw);

  const templatePath = path.join(clinicDir, 'templates', `${template}.json`);
  const templateRaw = fs.existsSync(templatePath)
    ? JSON.parse(fs.readFileSync(templatePath, 'utf8'))
    : {};

  if (template === 'modern') {
    const modernConfig = ModernTemplateConfigSchema.parse(templateRaw);
    return adaptToModern(clinic, claims, services, faqs, modernConfig) as TemplateViewModel<T>;
  }

  if (template === 'premium') {
    const premiumConfig = PremiumTemplateConfigSchema.parse(templateRaw);
    return adaptToPremium(clinic, claims, services, faqs, premiumConfig) as TemplateViewModel<T>;
  }

  const warmConfig = WarmTemplateConfigSchema.parse(templateRaw);
  return adaptToWarm(clinic, claims, services, faqs, warmConfig) as TemplateViewModel<T>;
}

export async function getAllClinicSlugs(): Promise<string[]> {
  try {
    if (!fs.existsSync(dataDirectory)) {
      return [];
    }
    const entries = fs.readdirSync(dataDirectory, { withFileTypes: true });

    return entries
      .filter((entry) => {
        if (!entry.isDirectory()) return false;
        if (entry.name === 'sample-clinic') return false;
        const clinicJson = path.join(dataDirectory, entry.name, 'clinic.json');
        return fs.existsSync(clinicJson);
      })
      .map((entry) => entry.name);
  } catch (error) {
    console.error('Error reading clinic directory:', error);
    return [];
  }
}
