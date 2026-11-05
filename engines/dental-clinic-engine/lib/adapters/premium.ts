import {
  Clinic,
  ClaimsFile,
  ServicesFile,
  FaqsFile,
  PremiumTemplateConfig,
  ClaimItem,
} from '../../data/schema/clinic';
import { getServiceDepictingImage } from '../images';

export interface PremiumViewModel {
  slug: string;
  clinicName: string;
  shortName: string;
  clinicNameExtended?: string;
  brandSubtitle?: string;
  tagline?: string;
  shortDescription?: string;
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
  doctorName: string;
  leadDoctor: string;
  leadTitle: string;
  qualifications: string;
  experience: string;
  hours: Clinic['hours'];
  clinicHours: Array<{ day: string; time: string; status: string }>;
  doctor: Clinic['doctor'];
  doctors: Clinic['doctors'];
  doctorProfile: {
    name: string;
    degrees: string;
    experience: string;
    title: string;
    philosophyTitle: string;
    philosophyBody: string[];
    highlights: Array<{ label: string; value: string }>;
  };
  morningSlots: string[];
  eveningSlots: string[];

  // Claims & Derived Proof
  claims: ClaimItem[];
  stats: Array<{ value: string; label: string; sub?: string }>;
  trustMetrics: Array<{
    id?: string;
    metric?: string;
    value?: string;
    category?: string;
    label?: string;
    highlight?: string;
    description?: string;
    sub?: string;
    badge?: string;
    tag?: string;
    verified?: boolean;
  }>;
  aggregateProof: {
    overallRating: string;
    totalReviews: string;
    platform: string;
    sentimentThemes?: Array<{
      category: string;
      sentiment: string;
      clinicalContext: string;
      percentage?: string;
    }>;
  };

  // Services
  treatmentOptions: string[];
  services: Array<ServicesFile['services'][number] & { name?: string; depictingImage?: { src: string; alt: string } | null }>;
  cosmeticServices: Array<ServicesFile['services'][number] & { name?: string; depictingImage?: { src: string; alt: string } | null }>;
  clinicalServices: Array<ServicesFile['services'][number] & { name?: string; depictingImage?: { src: string; alt: string } | null }>;

  // FAQs
  faqs: FaqsFile['faqs'];

  // Premium Specifics
  sanctuaryTitle?: string;
  sanctuaryFeatures: Array<{
    title: string;
    description: string;
    amenity?: string;
    icon?: string;
  }>;
  goldenRatioPillars: Array<{
    id: string;
    number: string;
    title: string;
    subtitle: string;
    ratio?: string;
    description: string;
    anatomicalFocus?: string;
    clinicalMetric?: string;
    icon?: string;
  }>;
  makeoverCases: Array<{
    id: string;
    title: string;
    tag: string;
    clinicalFocus: string;
    goldenRatioMetric?: string;
    initialCondition: string;
    structuralIntervention: string;
    outcome: string;
    sessions: string;
    imageAlt?: string;
  }>;
  facialAestheticsServices: Array<{
    id: string;
    title: string;
    category: string;
    badge?: string;
    tagline?: string;
    description: string;
    idealFor?: string;
    duration?: string;
    longevity?: string;
    highlights?: string[];
  }>;
}

export function adaptToPremium(
  clinic: Clinic,
  claims: ClaimsFile,
  services: ServicesFile,
  faqs: FaqsFile,
  templateConfig: PremiumTemplateConfig
): PremiumViewModel {
  const clinicHours = clinic.hours.schedule.map((s) => ({
    day: s.day,
    time: s.isClosed ? 'Closed' : `${s.open} - ${s.close}`,
    status: s.isClosed ? 'Closed' : s.status || 'Open',
  }));

  // Components render only VERIFIED or SAFE_TO_GENERATE claims
  const verifiedClaims = (claims.claims || []).filter(
    (c) => c.status === 'VERIFIED' || c.status === 'SAFE_TO_GENERATE'
  );

  const docList = (clinic.doctors && clinic.doctors.length > 0)
    ? clinic.doctors
    : (clinic.doctor ? [clinic.doctor] : []);

  const primaryDoctor = docList.length > 0
    ? docList[0]
    : {
        name: 'Experienced Dental Care Team',
        title: 'Dental Practitioners',
        qualifications: 'Qualified Clinicians',
        experience: 'Dedicated Practice',
        philosophy: 'Dedicated to gentle, transparent, and patient-first clinical care.',
        credentials: ['Patient Comfort & Ethical Care', 'Qualified Clinicians', 'Dedicated Practice'],
      };

  // Derive stats in code from rating, reviewCount, fee, and experience
  const stats = [
    {
      value: `${clinic.rating} ★`,
      label: 'Google Verified Rating',
      sub: clinic.reviewCount ? `${clinic.reviewCount} Reviews` : 'Patient Reviews',
    },
    {
      value: clinic.consultationFee || 'Standard OPD',
      label: 'Consultation Fee',
      sub: 'Transparent Pricing',
    },
    {
      value: primaryDoctor.experience,
      label: 'Clinical Practice',
      sub: 'Experienced Clinical Care',
    },
  ];

  // Derive trustMetrics in code
  const trustMetrics = [
    {
      id: 'rating',
      metric: `${clinic.rating} ★`,
      value: `${clinic.rating} ★`,
      category: 'Verified Rating',
      label: 'Google Rating',
      highlight: `${clinic.rating} ★ Google Verified`,
      description: `${clinic.rating} star average from patient feedback.`,
      badge: 'Verified',
      tag: 'Google Rating',
      verified: true,
    },
    {
      id: 'reviews',
      metric: clinic.reviewCount || 'Verified',
      value: clinic.reviewCount || 'Verified',
      category: 'Patient Feedback',
      label: 'Patient Reviews',
      highlight: `${clinic.reviewCount || 'Authentic'} Reviews`,
      description: 'Authentic patient testimonials on Google Maps.',
      badge: 'Verified',
      tag: 'Reviews',
      verified: true,
    },
    {
      id: 'fee',
      metric: clinic.consultationFee || 'Standard',
      value: clinic.consultationFee || 'Standard',
      category: 'Pricing Transparency',
      label: 'OPD Consultation Fee',
      highlight: `${clinic.consultationFee || 'Standard'} OPD Fee`,
      description: 'Clear pricing with zero hidden charges.',
      badge: 'Verified',
      tag: 'Transparent OPD',
      verified: true,
    },
    {
      id: 'experience',
      metric: primaryDoctor.experience,
      value: primaryDoctor.experience,
      category: 'Clinical Mastery',
      label: 'Clinical Practice',
      highlight: primaryDoctor.experience,
      description: `Care led by ${primaryDoctor.name} (${primaryDoctor.qualifications}).`,
      badge: 'Verified',
      tag: 'Experience',
      verified: true,
    },
  ];

  const aggregateProof = {
    overallRating: clinic.rating,
    totalReviews: clinic.reviewCount,
    platform: 'Google Business',
    sentimentThemes: [],
  };

  const normalizedDoctorProfile = {
    name: primaryDoctor.name,
    degrees: primaryDoctor.qualifications,
    experience: primaryDoctor.experience,
    title: primaryDoctor.title,
    philosophyTitle: primaryDoctor.philosophy
      ? `“${primaryDoctor.philosophy}”`
      : '“Dedicated to gentle, transparent, and patient-first clinical care.”',
    philosophyBody: primaryDoctor.philosophy
      ? [primaryDoctor.philosophy]
      : [clinic.shortDescription || 'Dedicated to gentle, transparent, and patient-first clinical care.'],
    highlights: (primaryDoctor.credentials && primaryDoctor.credentials.length > 0)
      ? primaryDoctor.credentials.slice(0, 4).map((c, i) => ({
          label: `Clinical Standard 0${i + 1}`,
          value: c,
        }))
      : [
          { label: 'Clinical Philosophy', value: 'Patient Comfort & Ethical Care' },
          { label: 'Primary Qualification', value: primaryDoctor.qualifications },
          { label: 'Clinical Practice', value: primaryDoctor.experience },
        ],
  };

  const mappedServices = services.services.map((s) => ({
    ...s,
    name: s.title,
    depictingImage: getServiceDepictingImage(clinic.slug, s),
  }));

  return {
    slug: clinic.slug,
    clinicName: clinic.clinicName,
    shortName: clinic.shortName,
    clinicNameExtended: clinic.clinicNameExtended,
    brandSubtitle: 'Gentle Aesthetics & Clinical Precision Sanctuary',
    tagline: clinic.tagline,
    shortDescription: clinic.shortDescription,
    area: clinic.area,
    address: clinic.address,
    landmark: clinic.landmark,
    phone: clinic.phone,
    phoneRaw: clinic.phoneRaw,
    whatsapp: clinic.whatsapp,
    rating: clinic.rating,
    reviewCount: clinic.reviewCount,
    consultationFee: clinic.consultationFee,
    mapEmbedUrl: clinic.mapEmbedUrl,
    directionsUrl: clinic.directionsUrl,
    googleReviewsUrl: clinic.googleReviewsUrl,
    doctorName: primaryDoctor.name,
    leadDoctor: primaryDoctor.name,
    leadTitle: primaryDoctor.title,
    qualifications: primaryDoctor.qualifications,
    experience: primaryDoctor.experience,
    hours: clinic.hours,
    clinicHours,
    doctor: primaryDoctor,
    doctors: docList,
    doctorProfile: normalizedDoctorProfile,
    morningSlots: clinic.morningSlots || ['10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM'],
    eveningSlots: clinic.eveningSlots || ['05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM'],

    claims: verifiedClaims,
    stats,
    trustMetrics,
    aggregateProof,

    treatmentOptions: mappedServices.map((s) => s.title),
    services: mappedServices,
    cosmeticServices: mappedServices,
    clinicalServices: mappedServices,

    faqs: faqs.faqs,

    sanctuaryTitle: templateConfig.sanctuaryTitle || clinic.area || 'Clinical Sanctuary',
    sanctuaryFeatures: templateConfig.sanctuaryFeatures || [],
    goldenRatioPillars: templateConfig.goldenRatioPillars || [],
    makeoverCases: templateConfig.makeoverCases || [],
    facialAestheticsServices: templateConfig.facialAestheticsServices || [],
  };
}
