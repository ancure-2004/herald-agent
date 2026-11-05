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
} from '../data/schema/clinic';

const targetSlug = 'dr-care-cosmo';
const clinicDir = path.join(process.cwd(), 'data', 'clinics', targetSlug);

console.log(`Starting migration for clinic: ${targetSlug}`);

// Read existing layered files
const layer1 = JSON.parse(fs.readFileSync(path.join(clinicDir, 'layer1-common.json'), 'utf8'));
const layer2 = JSON.parse(fs.readFileSync(path.join(clinicDir, 'layer2-services.json'), 'utf8'));
const modernL3 = JSON.parse(fs.readFileSync(path.join(clinicDir, 'layer3-templates', 'modern.json'), 'utf8'));
const premiumL3 = JSON.parse(fs.readFileSync(path.join(clinicDir, 'layer3-templates', 'premium.json'), 'utf8'));
const warmL3 = JSON.parse(fs.readFileSync(path.join(clinicDir, 'layer3-templates', 'warm.json'), 'utf8'));

const droppedItems: string[] = [];

// 1. Prepare clinic.json
// Drop phoneAlt
if (layer1.phoneAlt) {
  droppedItems.push(`Dropped phoneAlt: ${layer1.phoneAlt} (only primary phone + WhatsApp retained)`);
}

// Clean tagline and shortDescription of unverified "Conscious Sedation"
const cleanedTagline = (layer1.tagline || '').replace(/Conscious Sedation\.?\s*/gi, '').trim();
const cleanedShortDesc = (layer1.shortDescription || '').replace(/sedation/gi, 'comfort-focused care');

// Format hours with verified = false, structured schedule, and notes
const structuredSchedule = [
  { day: 'Monday', open: '10:00 AM', close: '08:00 PM', isClosed: false, status: 'Open' },
  { day: 'Tuesday', open: '10:00 AM', close: '08:00 PM', isClosed: false, status: 'Open' },
  { day: 'Wednesday', open: '10:00 AM', close: '08:00 PM', isClosed: false, status: 'Open' },
  { day: 'Thursday', open: '10:00 AM', close: '08:00 PM', isClosed: false, status: 'Open' },
  { day: 'Friday', open: '10:00 AM', close: '08:00 PM', isClosed: false, status: 'Open' },
  { day: 'Saturday', open: '10:00 AM', close: '08:00 PM', isClosed: false, status: 'Open' },
  { day: 'Sunday', open: '', close: '', isClosed: true, status: 'Closed' },
];

const hoursObj = {
  verified: false,
  notes: 'Schedule listed as Mon-Sat 10am-8pm on Google Maps, with candidate evening split Mon-Fri 5-9pm / Sat-Sun 9am-9pm awaiting direct clinic confirmation.',
  schedule: structuredSchedule,
};

const clinicData = {
  slug: layer1.slug || targetSlug,
  clinicName: layer1.clinicName,
  shortName: layer1.shortName,
  clinicNameExtended: layer1.clinicNameExtended,
  tagline: cleanedTagline,
  shortDescription: cleanedShortDesc,
  area: layer1.area,
  address: layer1.address,
  landmark: layer1.landmark,
  phone: layer1.phone,
  phoneRaw: layer1.phoneRaw,
  whatsapp: layer1.whatsapp,
  rating: layer1.rating,
  reviewCount: layer1.reviewCount,
  consultationFee: layer1.consultationFee,
  mapEmbedUrl: layer1.mapEmbedUrl,
  directionsUrl: layer1.directionsUrl,
  googleReviewsUrl: layer1.googleReviewsUrl,
  doctorName: layer1.doctorName,
  leadDoctor: layer1.leadDoctor,
  leadTitle: layer1.leadTitle,
  qualifications: layer1.qualifications,
  experience: layer1.experience,
  hours: hoursObj,
  doctor: layer1.doctor || {
    name: layer1.doctorName,
    title: layer1.leadTitle,
    qualifications: layer1.qualifications,
    experience: layer1.experience,
    consultationFee: layer1.consultationFee,
  },
  morningSlots: layer1.morningSlots,
  eveningSlots: layer1.eveningSlots,
};

// Validate clinicData with Zod
ClinicSchema.parse(clinicData);

// 2. Prepare claims.json with strict schema
const claimsData = {
  claims: [
    {
      id: 'claim-google-rating',
      text: `${layer1.rating || '5.0'} ★ Google Verified Rating`,
      status: 'VERIFIED' as const,
      source: 'Google Business Profile',
    },
    {
      id: 'claim-google-reviews',
      text: `${layer1.reviewCount || '32+'} authentic Google patient reviews`,
      status: 'VERIFIED' as const,
      source: 'Google Business Profile',
    },
    {
      id: 'claim-consultation-fee',
      text: `${layer1.consultationFee || '₹200'} standard initial OPD consultation fee`,
      status: 'VERIFIED' as const,
      source: 'Clinic Fee Schedule',
    },
    {
      id: 'claim-doctor-experience',
      text: `${layer1.doctor?.experience || layer1.experience || '10+ Years'} dedicated clinical practice`,
      status: 'VERIFIED' as const,
      source: 'Doctor Registration Credentials',
    },
    {
      id: 'claim-gentle-care',
      text: 'Topical pre-numbing and gentle atraumatic extractions',
      status: 'SAFE_TO_GENERATE' as const,
      source: 'Standard Clinical Procedure',
    },
    {
      id: 'claim-hygiene',
      text: 'Strict multi-tier sterilization protocols',
      status: 'SAFE_TO_GENERATE' as const,
      source: 'Standard Clinical Procedure',
    },
  ],
};

ClaimsFileSchema.parse(claimsData);

// 3. Prepare services.json (single services array, no alias fields)
const cleanedServices = (layer2.services || []).map((s: Record<string, unknown>) => ({
  id: String(s.id),
  title: String(s.title || s.name),
  category: String(s.category),
  badge: s.badge ? String(s.badge) : undefined,
  description: String(s.description || s.desc || '').replace(/conscious sedation/gi, 'gentle local numbing').replace(/sedation/gi, 'comfort care'),
  keyBenefits: Array.isArray(s.keyBenefits || s.benefits) ? ((s.keyBenefits || s.benefits) as unknown[]).map((b) => String(b).replace(/sedation/gi, 'comfort care')) : [],
  painScore: typeof s.painScore === 'number' ? s.painScore : undefined,
  recoveryTime: s.recoveryTime ? String(s.recoveryTime) : s.duration ? String(s.duration) : undefined,
  idealFor: s.idealFor ? String(s.idealFor) : undefined,
  image: s.image ? String(s.image) : undefined,
}));

const servicesData = {
  services: cleanedServices,
};

ServicesFileSchema.parse(servicesData);

// 4. Prepare faqs.json
// Clean faqs of sedation claims
const cleanedFaqs = (layer2.faqs || []).map((f: Record<string, unknown>) => {
  if (f.category === 'Sedation') {
    return {
      category: 'Patient Comfort',
      question: String(f.question),
      answer: String(f.answer).replace(/sedation/gi, 'comfort-focused care'),
    };
  }
  return {
    category: String(f.category),
    question: String(f.question),
    answer: String(f.answer).replace(/sedation/gi, 'comfort care'),
  };
});

const faqsData = {
  faqs: cleanedFaqs,
};

FaqsFileSchema.parse(faqsData);

// 5. Prepare templates/{modern,premium,warm}.json
// Drop aligner journey from dr-care-cosmo modern template
droppedItems.push(`Dropped unverified aligner journey from dr-care-cosmo modern template`);
const modernData = {
  heroMetrics: modernL3.heroMetrics,
  // alignerJourney omitted / empty
};
ModernTemplateConfigSchema.parse(modernData);

// Drop makeover cases, 78% golden ratio claims, and unverified facial aesthetics services from premium template
droppedItems.push(`Dropped unverified makeoverCases from dr-care-cosmo premium template`);
droppedItems.push(`Dropped unverified goldenRatioPillars (78% golden ratio / phi claims) from dr-care-cosmo premium template`);
droppedItems.push(`Dropped unverified facialAestheticsServices from dr-care-cosmo premium template`);

const premiumData = {
  sanctuaryTitle: 'East Delhi Practice Sanctuary',
  sanctuaryFeatures: (premiumL3.sanctuaryFeatures || []).map((sf: Record<string, unknown>) => ({
    title: String(sf.title),
    description: String(sf.description || sf.desc),
    amenity: sf.amenity ? String(sf.amenity) : undefined,
    icon: sf.icon ? String(sf.icon) : undefined,
  })),
};
PremiumTemplateConfigSchema.parse(premiumData);

// Drop 70% chewing claims from warm template dentureComparison and rename sedationPhases to comfortPhases
droppedItems.push(`Dropped unverified "up to 70% chewing strength reduction" claim from dentureComparison`);
const cleanedDentureComparison = (warmL3.dentureComparison || []).map((dc: Record<string, unknown>) => ({
  ...dc,
  conventional: String(dc.conventional).replace(/up to 70% chewing strength reduction/gi, 'significant chewing strength limitation'),
}));

droppedItems.push(`Renamed sedationPhases to comfortPhases and removed unverified twilight/conscious sedation claims`);
const cleanedComfortPhases = (warmL3.sedationPhases || []).map((sp: Record<string, unknown>) => ({
  step: String(sp.step),
  title: String(sp.title).replace(/sedation/gi, 'comfort'),
  subtitle: sp.subtitle ? String(sp.subtitle) : undefined,
  description: String(sp.description).replace(/sedation/gi, 'comfort care'),
  duration: sp.duration ? String(sp.duration) : undefined,
  sensoryNote: sp.sensoryNote ? String(sp.sensoryNote) : undefined,
  keySafeguard: sp.keySafeguard ? String(sp.keySafeguard) : undefined,
}));

const warmData = {
  comfortPhases: cleanedComfortPhases,
  dentureComparison: cleanedDentureComparison,
};
WarmTemplateConfigSchema.parse(warmData);

// Write output files
fs.writeFileSync(path.join(clinicDir, 'clinic.json'), JSON.stringify(clinicData, null, 2), 'utf8');
fs.writeFileSync(path.join(clinicDir, 'claims.json'), JSON.stringify(claimsData, null, 2), 'utf8');
fs.writeFileSync(path.join(clinicDir, 'services.json'), JSON.stringify(servicesData, null, 2), 'utf8');
fs.writeFileSync(path.join(clinicDir, 'faqs.json'), JSON.stringify(faqsData, null, 2), 'utf8');

const templatesDir = path.join(clinicDir, 'templates');
if (!fs.existsSync(templatesDir)) {
  fs.mkdirSync(templatesDir, { recursive: true });
}

fs.writeFileSync(path.join(templatesDir, 'modern.json'), JSON.stringify(modernData, null, 2), 'utf8');
fs.writeFileSync(path.join(templatesDir, 'premium.json'), JSON.stringify(premiumData, null, 2), 'utf8');
fs.writeFileSync(path.join(templatesDir, 'warm.json'), JSON.stringify(warmData, null, 2), 'utf8');

console.log('\n--- MIGRATION COMPLETE ---');
console.log('Successfully wrote:');
console.log(`- ${path.join(clinicDir, 'clinic.json')}`);
console.log(`- ${path.join(clinicDir, 'claims.json')}`);
console.log(`- ${path.join(clinicDir, 'services.json')}`);
console.log(`- ${path.join(clinicDir, 'faqs.json')}`);
console.log(`- ${path.join(templatesDir, 'modern.json')}`);
console.log(`- ${path.join(templatesDir, 'premium.json')}`);
console.log(`- ${path.join(templatesDir, 'warm.json')}`);

console.log('\n--- DROPPED CONTENT SUMMARY ---');
droppedItems.forEach((item, idx) => console.log(`${idx + 1}. ${item}`));
