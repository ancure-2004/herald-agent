import { z } from "zod";

// -------------------------------------------------------------
// 1. Clinic Core Schema (clinic.json)
// -------------------------------------------------------------

export const DailyScheduleSchema = z.object({
  day: z.string(),
  open: z.string(),
  close: z.string(),
  isClosed: z.boolean(),
  status: z.string().optional(),
});

export const ClinicHoursSchema = z.object({
  verified: z.boolean(),
  notes: z.string().optional(),
  schedule: z.array(DailyScheduleSchema),
});

export const DoctorSchema = z.object({
  name: z.string(),
  title: z.string(),
  qualifications: z.string(),
  experience: z.string(),
  consultationFee: z.string().optional(),
  philosophy: z.string().optional(),
  credentials: z.array(z.string()).optional(),
});

export const ClinicSchema = z.object({
  slug: z.string(),
  clinicName: z.string(),
  shortName: z.string(),
  clinicNameExtended: z.string().optional(),
  tagline: z.string().optional(),
  shortDescription: z.string().optional(),
  area: z.string(),
  address: z.string(),
  landmark: z.string(),
  phone: z.string(),
  phoneRaw: z.string(),
  whatsapp: z.string(),
  rating: z.string().optional(),
  reviewCount: z.string().optional(),
  consultationFee: z.string().optional(),
  mapEmbedUrl: z.string(),
  directionsUrl: z.string(),
  googleReviewsUrl: z.string(),
  hours: ClinicHoursSchema,
  doctor: DoctorSchema.optional(),
  doctors: z.array(DoctorSchema).default([]),
  morningSlots: z.array(z.string()).optional(),
  eveningSlots: z.array(z.string()).optional(),
});

export type DailySchedule = z.infer<typeof DailyScheduleSchema>;
export type ClinicHours = z.infer<typeof ClinicHoursSchema>;
export type Doctor = z.infer<typeof DoctorSchema>;
export type Clinic = z.infer<typeof ClinicSchema>;

// -------------------------------------------------------------
// 2. Claims File Schema (claims.json)
// -------------------------------------------------------------

export const ClaimStatusSchema = z.enum([
  "VERIFIED",
  "SAFE_TO_GENERATE",
  "NEEDS_CLIENT_INPUT",
]);

export const ClaimItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  status: ClaimStatusSchema,
  source: z.string(),
});

export const ClaimsFileSchema = z.object({
  claims: z.array(ClaimItemSchema),
});

export type ClaimStatus = z.infer<typeof ClaimStatusSchema>;
export type ClaimItem = z.infer<typeof ClaimItemSchema>;
export type ClaimsFile = z.infer<typeof ClaimsFileSchema>;

// -------------------------------------------------------------
// 3. Services File Schema (services.json)
// -------------------------------------------------------------

export const ServiceItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.string(),
  badge: z.string().optional(),
  description: z.string(),
  keyBenefits: z.array(z.string()).optional(),
  painScore: z.string().optional(),
  recoveryTime: z.string().optional(),
  idealFor: z.string().optional(),
  image: z.string().optional(),
});

export const ServicesFileSchema = z.object({
  services: z.array(ServiceItemSchema),
});

export type ServiceItem = z.infer<typeof ServiceItemSchema>;
export type ServicesFile = z.infer<typeof ServicesFileSchema>;

// -------------------------------------------------------------
// 4. FAQs File Schema (faqs.json)
// -------------------------------------------------------------

export const FaqItemSchema = z.object({
  category: z.string(),
  question: z.string(),
  answer: z.string(),
});

export const FaqsFileSchema = z.object({
  faqs: z.array(FaqItemSchema),
});

export type FaqItem = z.infer<typeof FaqItemSchema>;
export type FaqsFile = z.infer<typeof FaqsFileSchema>;

// -------------------------------------------------------------
// 5. Template Config Schemas (templates/{modern,premium,warm}.json)
// -------------------------------------------------------------

export const HeroMetricSchema = z.object({
  number: z.string(),
  label: z.string(),
  note: z.string().optional(),
});

export const AlignerJourneyStepSchema = z.object({
  step: z.string(),
  title: z.string(),
  duration: z.string().optional(),
  description: z.string(),
  deliverable: z.string().optional(),
  clinicalFocus: z.string().optional(),
});

export const ModernTemplateConfigSchema = z.object({
  heroMetrics: z.array(HeroMetricSchema).optional(),
  alignerJourney: z.array(AlignerJourneyStepSchema).optional(),
});

export const SanctuaryFeatureSchema = z.object({
  title: z.string(),
  description: z.string(),
  amenity: z.string().optional(),
  icon: z.string().optional(),
});

export const GoldenRatioPillarSchema = z.object({
  id: z.string(),
  number: z.string(),
  title: z.string(),
  subtitle: z.string(),
  ratio: z.string().optional(),
  description: z.string(),
  anatomicalFocus: z.string().optional(),
  clinicalMetric: z.string().optional(),
  icon: z.string().optional(),
});

export const MakeoverCaseSchema = z.object({
  id: z.string(),
  title: z.string(),
  tag: z.string(),
  clinicalFocus: z.string(),
  goldenRatioMetric: z.string().optional(),
  initialCondition: z.string(),
  structuralIntervention: z.string(),
  outcome: z.string(),
  sessions: z.string(),
  imageAlt: z.string().optional(),
});

export const FacialAestheticsServiceSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.string(),
  badge: z.string().optional(),
  tagline: z.string().optional(),
  description: z.string(),
  idealFor: z.string().optional(),
  duration: z.string().optional(),
  longevity: z.string().optional(),
  highlights: z.array(z.string()).optional(),
});

export const PremiumTemplateConfigSchema = z.object({
  sanctuaryTitle: z.string().optional(),
  sanctuaryFeatures: z.array(SanctuaryFeatureSchema).optional(),
  goldenRatioPillars: z.array(GoldenRatioPillarSchema).optional(),
  makeoverCases: z.array(MakeoverCaseSchema).optional(),
  facialAestheticsServices: z.array(FacialAestheticsServiceSchema).optional(),
});

export const ComfortPhaseSchema = z.object({
  step: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
  description: z.string(),
  duration: z.string().optional(),
  sensoryNote: z.string().optional(),
  keySafeguard: z.string().optional(),
});

export const DentureComparisonSchema = z.object({
  feature: z.string(),
  conventional: z.string(),
  bpsPrecision: z.string(),
  benefit: z.string(),
});

export const WarmTemplateConfigSchema = z.object({
  comfortPhases: z.array(ComfortPhaseSchema).optional(),
  dentureComparison: z.array(DentureComparisonSchema).optional(),
});

export const TemplateConfigSchema = z.union([
  ModernTemplateConfigSchema,
  PremiumTemplateConfigSchema,
  WarmTemplateConfigSchema,
]);

export type ModernTemplateConfig = z.infer<typeof ModernTemplateConfigSchema>;
export type PremiumTemplateConfig = z.infer<typeof PremiumTemplateConfigSchema>;
export type WarmTemplateConfig = z.infer<typeof WarmTemplateConfigSchema>;
export type TemplateConfig = z.infer<typeof TemplateConfigSchema>;
