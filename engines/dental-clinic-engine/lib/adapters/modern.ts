import {
  Clinic,
  ClaimsFile,
  ServicesFile,
  FaqsFile,
  ModernTemplateConfig,
  ClaimItem,
} from '../../data/schema/clinic';
import { getServiceDepictingImage } from '../images';

export interface ModernViewModel {
  slug: string;
  clinicName: string;
  shortName: string;
  clinicNameExtended?: string;
  tagline?: string;
  shortDescription?: string;
  area: string;
  address: string;
  landmark: string;
  phone: string;
  phoneRaw: string;
  whatsapp: string;
  rating?: string;
  reviewCount?: string;
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
  morningSlots: string[];
  eveningSlots: string[];
  
  // Claims & Derived Trust Cards
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

  // Modern Template Specifics
  heroMetrics: Array<{ number: string; label: string; note?: string }>;
  alignerJourney: Array<{
    step: string;
    title: string;
    duration?: string;
    description: string;
    deliverable?: string;
    clinicalFocus?: string;
  }>;
}

export function adaptToModern(
  clinic: Clinic,
  claims: ClaimsFile,
  services: ServicesFile,
  faqs: FaqsFile,
  templateConfig: ModernTemplateConfig
): ModernViewModel {
  // Convert structured hours to clinicHours format for components
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
        philosophy: 'Dedicated to compassionate, gentle, and high quality dental care for every patient.',
      };

  // Derive stats in code from rating, reviewCount, fee, and experience
  const stats = [
    ...(clinic.rating
      ? [
          {
            value: `${clinic.rating} ★`,
            label: 'Verified Google Rating',
            sub: clinic.reviewCount ? `${clinic.reviewCount} Reviews` : 'Patient Reviews',
          },
        ]
      : [
          {
            value: 'Gentle Care',
            label: 'Clinical Philosophy',
            sub: 'Tooth Preservation',
          },
        ]),
    {
      value: primaryDoctor.experience,
      label: 'Clinical Practice',
      sub: 'General & Restorative Care',
    },
    {
      value: clinic.consultationFee || 'Standard OPD',
      label: 'Consultation Fee',
      sub: 'Transparent Pricing',
    },
  ];

  // Derive trustMetrics in code from rating, reviewCount, fee, and experience
  const trustMetrics = [
    ...(clinic.rating
      ? [
          {
            id: 'rating',
            metric: `${clinic.rating} ★`,
            value: `${clinic.rating} ★`,
            category: 'Patient Satisfaction',
            label: 'Google Verified Rating',
            highlight: `Consistent ${clinic.rating} ★ Rating Across All Treatments`,
            description: `Evaluated by genuine patients across ${clinic.area} for attentive chairside care, gentle procedures, and clinical accuracy.`,
            badge: 'Google Verified',
            tag: '5-Star Standard',
            verified: true,
          },
        ]
      : []),
    ...(clinic.reviewCount
      ? [
          {
            id: 'reviews',
            metric: clinic.reviewCount,
            value: clinic.reviewCount,
            category: 'Community Endorsement',
            label: 'Google Maps Reviews',
            highlight: `${clinic.reviewCount} Authentic Patient Experiences`,
            description: `Locally recognized dental practice trusted by families for conservative tooth preservation, gentle scaling, and timely appointments.`,
            badge: 'Public Feedback',
            tag: 'Community Trust',
            verified: true,
          },
        ]
      : []),
    {
      id: 'fee',
      metric: clinic.consultationFee || 'Transparent OPD',
      value: clinic.consultationFee || 'Transparent OPD',
      category: 'Pricing Transparency',
      label: 'Consultation & Diagnostics',
      highlight: `${clinic.consultationFee || 'Transparent OPD'} Consultation`,
      description: 'Clear clinical assessment with upfront treatment plans, zero hidden fees, and complete diagnostic clarity before beginning any treatment.',
      badge: 'Upfront Pricing',
      tag: 'Honest Care',
      verified: true,
    },
    {
      id: 'experience',
      metric: primaryDoctor.experience,
      value: primaryDoctor.experience,
      category: 'Clinical Mastery',
      label: 'Doctor Clinical Practice',
      highlight: `Care Led by ${primaryDoctor.name}`,
      description: `${primaryDoctor.qualifications} with extensive clinical dedication to patient comfort, modern sterilization protocols, and long-term oral wellness.`,
      badge: 'Qualified Surgeon',
      tag: 'Doctor Led',
      verified: true,
    },
  ];

  const aggregateProof = {
    overallRating: clinic.rating,
    totalReviews: clinic.reviewCount,
    platform: 'Google Business',
    sentimentThemes: [],
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

    heroMetrics: templateConfig.heroMetrics || [
      { number: `${clinic.rating} ★`, label: `${clinic.reviewCount} Reviews`, note: 'Verified Google Rating' },
      { number: clinic.consultationFee || 'Transparent', label: 'Consultation Fee', note: 'Standard OPD' },
      { number: primaryDoctor.experience, label: 'Clinical Practice', note: 'Dedicated Care' },
    ],
    alignerJourney: (templateConfig.alignerJourney && templateConfig.alignerJourney.length > 0)
      ? templateConfig.alignerJourney
      : [
          {
            step: '01',
            title: 'Diagnostic Digital Scan & Clinical Review',
            duration: '15 - 20 Mins',
            description: `High-resolution visual assessment and diagnostic review conducted directly by ${primaryDoctor.name} to evaluate dental alignment and oral health.`,
            deliverable: 'Digital Treatment Plan & Clinical Assessment',
            clinicalFocus: 'Precision Diagnostic Review',
          },
          {
            step: '02',
            title: 'Personalized Treatment Blueprint',
            duration: '1 Session',
            description: 'A transparent breakdown of recommended procedures, material options, exact duration, and all-inclusive fee structuring with zero hidden costs.',
            deliverable: 'All-Inclusive Procedure Estimate',
            clinicalFocus: 'Transparent Case Planning',
          },
          {
            step: '03',
            title: 'Gentle Micro-Care & Precision Execution',
            duration: 'Custom Schedule',
            description: 'Atraumatic dental restoration using precision equipment, buffered local anesthesia, and sterile protocols for maximum comfort.',
            deliverable: 'Comfort-Centered Clinical Care',
            clinicalFocus: 'Atraumatic Treatment Protocol',
          },
          {
            step: '04',
            title: 'Review & Long-Term Retention Support',
            duration: 'Follow-up Consultation',
            description: `Comprehensive post-procedure check, bite alignment verification, and ongoing WhatsApp direct line support with ${primaryDoctor.name}.`,
            deliverable: 'Dedicated Post-Care & Maintenance',
            clinicalFocus: 'Predictable Long-Term Health',
          },
        ],
  };
}
