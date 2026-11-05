import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import {
  ClinicSchema,
  ClaimsFileSchema,
  ServicesFileSchema,
  FaqsFileSchema,
  ModernTemplateConfigSchema,
  PremiumTemplateConfigSchema,
  WarmTemplateConfigSchema,
} from '../data/schema/clinic';

const ENGINE_FORBIDDEN_STRINGS = [
  'WHITE Dental',
  'Smile And Faces',
  'Sedation Suite',
  'Twilight Sedation',
  'Conscious Sedation',
  '1.618',
  'Golden Ratio',
  'Perioral',
  'Class-B',
  'hospital-grade',
  'Hospital-Grade',
  'Hospital-grade',
  'guarantee',
  'Guarantee',
  'guaranteed',
  'Guaranteed',
  'guaranteeing',
];

const FORBIDDEN_HOURS_PATTERNS = [
  /Morning\s+9\s*-\s*1/i,
  /Evening\s+5\s*-\s*9/i,
  /WhatsApp\s+Available\s+Mon-Sun/i,
  /Open\s+Mon(?:day)?\s*-\s*Sun(?:day)?/i,
];

const HARDCODED_REVIEW_COUNT_PATTERN = /\b\d{2,}\+?\s*(?:verified\s+|google\s+|patient\s+)?reviews\b/i;

const SCAN_DIRECTORIES = ['components', 'lib', 'app'];

function getAllFiles(dir: string, extensions: string[]): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(filePath, extensions));
    } else {
      if (extensions.some((ext) => filePath.endsWith(ext))) {
        results.push(filePath);
      }
    }
  }
  return results;
}

async function validate() {
  console.log('🔍 Running Dental Clinic Engine Validator...\n');
  let errorsCount = 0;

  // 1. Validate Clinic Schemas and Data Consistency
  const clinicsDir = path.join(process.cwd(), 'data', 'clinics');
  if (!fs.existsSync(clinicsDir)) {
    console.error('❌ data/clinics directory not found!');
    process.exit(1);
  }

  const clinicSlugs = fs
    .readdirSync(clinicsDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  if (clinicSlugs.length === 0) {
    console.warn('⚠️ No clinics found in data/clinics.');
  }

  for (const slug of clinicSlugs) {
    console.log(`📋 Validating clinic: [${slug}]`);
    const clinicFolder = path.join(clinicsDir, slug);

    const filesToValidate: { file: string; schema: z.ZodType; name: string }[] = [
      { file: path.join(clinicFolder, 'clinic.json'), schema: ClinicSchema, name: 'clinic.json' },
      { file: path.join(clinicFolder, 'claims.json'), schema: ClaimsFileSchema, name: 'claims.json' },
      { file: path.join(clinicFolder, 'services.json'), schema: ServicesFileSchema, name: 'services.json' },
      { file: path.join(clinicFolder, 'faqs.json'), schema: FaqsFileSchema, name: 'faqs.json' },
      {
        file: path.join(clinicFolder, 'templates', 'modern.json'),
        schema: ModernTemplateConfigSchema,
        name: 'templates/modern.json',
      },
      {
        file: path.join(clinicFolder, 'templates', 'premium.json'),
        schema: PremiumTemplateConfigSchema,
        name: 'templates/premium.json',
      },
      {
        file: path.join(clinicFolder, 'templates', 'warm.json'),
        schema: WarmTemplateConfigSchema,
        name: 'templates/warm.json',
      },
    ];

    const clinicNeedsInput: string[] = [];

    const checkForNeedsInput = (val: unknown, pathStr: string = '') => {
      if (typeof val === 'string') {
        if (val.includes('NEEDS_CLIENT_INPUT')) {
          clinicNeedsInput.push(pathStr);
        }
      } else if (Array.isArray(val)) {
        if (val.length === 0 && (pathStr === 'services.json:services' || pathStr === 'faqs.json:faqs' || pathStr === 'clinic.json:hours.schedule')) {
          clinicNeedsInput.push(`${pathStr} (empty array)`);
        }
        val.forEach((item, index) => checkForNeedsInput(item, `${pathStr}[${index}]`));
      } else if (val !== null && typeof val === 'object') {
        for (const [key, propVal] of Object.entries(val as Record<string, unknown>)) {
          checkForNeedsInput(propVal, pathStr ? `${pathStr}.${key}` : key);
        }
      }
    };

    for (const item of filesToValidate) {
      if (!fs.existsSync(item.file)) {
        console.error(`  ❌ Missing required file: ${item.name}`);
        errorsCount++;
        continue;
      }

      try {
        const raw = fs.readFileSync(item.file, 'utf-8');
        const parsedJson = JSON.parse(raw);
        const result = item.schema.safeParse(parsedJson);

        if (!result.success) {
          console.error(`  ❌ Schema validation failed for ${item.name}:`);
          console.error(JSON.stringify(result.error.issues, null, 2));
          errorsCount++;
        } else {
          console.log(`  ✓ ${item.name} schema valid`);
        }

        // Validate claims status and source
        if (item.name === 'claims.json' && Array.isArray((parsedJson as { claims?: unknown[] }).claims)) {
          const claimsList = (parsedJson as { claims: Array<{ id?: string; text?: string; status?: string; source?: string }> }).claims;
          for (let i = 0; i < claimsList.length; i++) {
            const claim = claimsList[i];
            const claimId = claim.id || `claim[${i}]`;
            if (!claim.status || !['VERIFIED', 'SAFE_TO_GENERATE', 'NEEDS_CLIENT_INPUT'].includes(claim.status)) {
              console.error(`  ❌ Claim "${claimId}" is missing a valid status (must be VERIFIED, SAFE_TO_GENERATE, or NEEDS_CLIENT_INPUT)`);
              errorsCount++;
            }
            if (!claim.source || typeof claim.source !== 'string' || claim.source.trim().length === 0) {
              console.error(`  ❌ Claim "${claimId}" is missing required source`);
              errorsCount++;
            }
          }
        }

        // Validate minimum 6 services
        if (item.name === 'services.json') {
          const servicesList = (parsedJson as { services?: unknown[] }).services || [];
          if (servicesList.length < 6) {
            console.error(`  ❌ Clinic [${slug}] has only ${servicesList.length} services in services.json (minimum required is 6).`);
            errorsCount++;
          }
        }

        // Validate minimum 6 FAQs
        if (item.name === 'faqs.json') {
          const faqsList = (parsedJson as { faqs?: unknown[] }).faqs || [];
          if (faqsList.length < 6) {
            console.error(`  ❌ Clinic [${slug}] has only ${faqsList.length} FAQs in faqs.json (minimum required is 6).`);
            errorsCount++;
          }
        }

        checkForNeedsInput(parsedJson, item.name);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`  ❌ Failed to parse ${item.name}: ${message}`);
        errorsCount++;
      }
    }

    if (clinicNeedsInput.length > 0) {
      console.error(`  ❌ Clinic [${slug}] has ${clinicNeedsInput.length} unpopulated field(s) requiring client input (NEEDS_CLIENT_INPUT):`);
      for (const field of clinicNeedsInput) {
        console.error(`     - ${field}`);
      }
      errorsCount += clinicNeedsInput.length;
    }

    // Validate per-clinic image manifest (Optional for lightweight demos)
    const manifestPath = path.join(process.cwd(), 'public', 'clinics', slug, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      try {
        const manifestRaw = fs.readFileSync(manifestPath, 'utf-8');
        const manifest = JSON.parse(manifestRaw);
        if (manifest.clinicSlug && Array.isArray(manifest.images)) {
          console.log(`  ✓ public/clinics/${slug}/manifest.json valid (${manifest.images.length} images cataloged)`);
        }
      } catch (err: unknown) {
        // Non-blocking for demos
      }
    }
  }

  // 2. Scan Engine Codebase (components, lib, app) for Forbidden Claims & Hardcoded Values
  console.log('\n🔎 Scanning engine codebase for forbidden hardcoded claims, unverified hours, and hardcoded review counts...');
  let forbiddenMatches = 0;

  for (const dir of SCAN_DIRECTORIES) {
    const fullDirPath = path.join(process.cwd(), dir);
    const files = getAllFiles(fullDirPath, ['.ts', '.tsx']);

    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const relPath = path.relative(process.cwd(), filePath);

      lines.forEach((line, lineIdx) => {
        // A. Forbidden marketing / clinical claims in code
        for (const forbidden of ENGINE_FORBIDDEN_STRINGS) {
          if (line.includes(forbidden)) {
            console.error(`  ❌ Found forbidden claim string "${forbidden}" in ${relPath}:${lineIdx + 1}`);
            forbiddenMatches++;
            errorsCount++;
          }
        }

        // B. Absolute "100%" medical marketing claims (excluding CSS dimensions / calc)
        if (
          line.includes('100%') &&
          !line.includes('calc(100%') &&
          !line.includes("width: '100%'") &&
          !line.includes("height: '100%'")
        ) {
          console.error(`  ❌ Found unverified "100%" medical claim in ${relPath}:${lineIdx + 1}: "${line.trim()}"`);
          forbiddenMatches++;
          errorsCount++;
        }

        // C. Hardcoded review counts in components / app
        if (HARDCODED_REVIEW_COUNT_PATTERN.test(line)) {
          console.error(`  ❌ Found hardcoded review count in ${relPath}:${lineIdx + 1}: "${line.trim()}". Review counts must be dynamic via siteConfig.reviewCount.`);
          forbiddenMatches++;
          errorsCount++;
        }

        // D. Hardcoded hours text / session timings
        for (const pattern of FORBIDDEN_HOURS_PATTERNS) {
          if (pattern.test(line)) {
            console.error(`  ❌ Found hardcoded hours/session string in ${relPath}:${lineIdx + 1}: "${line.trim()}". Hours must be derived from siteConfig.hours.`);
            forbiddenMatches++;
            errorsCount++;
          }
        }
      });
    }
  }

  if (forbiddenMatches === 0) {
    console.log('  ✓ No forbidden hardcoded claims, hours text, or hardcoded review counts found.');
  }

  // Summary
  console.log('\n----------------------------------------');
  if (errorsCount > 0) {
    console.error(`❌ Validation failed with ${errorsCount} error(s).`);
    process.exit(1);
  } else {
    console.log('✅ All validation checks passed successfully!');
    process.exit(0);
  }
}

validate().catch((err) => {
  console.error('Fatal error during validation:', err);
  process.exit(1);
});
