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
} from '@/data/schema/clinic';
import { adaptToModern, ModernViewModel } from './adapters/modern';
import { adaptToPremium, PremiumViewModel } from './adapters/premium';
import { adaptToWarm, WarmViewModel } from './adapters/warm';
import { fetchClinicPackageFromNeon } from './neon-db';

const dataDirectory = path.join(process.cwd(), 'data', 'clinics');

export type TemplateType = 'modern' | 'premium' | 'warm';

export type TemplateViewModel<T extends TemplateType> = T extends 'modern'
  ? ModernViewModel
  : T extends 'premium'
  ? PremiumViewModel
  : WarmViewModel;

export async function getClinic<T extends TemplateType>(
  slug: string,
  template: T
): Promise<TemplateViewModel<T>> {
  // 1. First check Neon Postgres packages table for dynamic zero-redeploy clinics
  const neonPkg = await fetchClinicPackageFromNeon(slug);
  if (
    neonPkg &&
    neonPkg.clinic_payload &&
    neonPkg.clinic_payload.clinic &&
    neonPkg.clinic_payload.claims &&
    neonPkg.clinic_payload.services &&
    neonPkg.clinic_payload.faqs &&
    neonPkg.clinic_payload.templates
  ) {
    const payload = neonPkg.clinic_payload;
    const clinic = ClinicSchema.parse(payload.clinic);
    const claims = ClaimsFileSchema.parse(payload.claims);
    const services = ServicesFileSchema.parse(payload.services);
    const faqs = FaqsFileSchema.parse(payload.faqs);
    const templateRaw = payload.templates[template] || {};

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
    throw new Error(`Clinic not found in Neon Postgres or local data/clinics for slug: ${slug}`);
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
