# Dental Clinic Engine

A high-performance Next.js engine that generates three distinctive, patient-focused dental practice websites from a single canonical clinic data model.

---

## 🏛️ Architecture Overview

The engine enforces strict separation between canonical clinic data and visual presentation. Each clinic dataset automatically powers three responsive templates:

1. **Modern (`/modern/[slug]`)**: Tech-forward, high-precision aesthetic layout with crisp typography, dark slate accents, and interactive step guides.
2. **Premium (`/premium/[slug]`)**: Boutique, warm luxury aesthetic with stone/gold palette, tranquil practice ambiance showcase, and bespoke consultation scheduling.
3. **Warm (`/warm/[slug]`)**: Reassuring, family-friendly practice layout with gentle care protocols, prosthetic guides, and empathetic bedside communication.

```
data/clinics/<slug>/
├── clinic.json          # Core clinic identity, verified hours, doctor bio, contact & map
├── claims.json          # Verified claims, trust metrics, rating aggregations & stats
├── services.json        # Treatment catalog, category groupings & clinical details
├── faqs.json            # Patient FAQs grouped by category
└── templates/
    ├── modern.json      # Modern-specific copy, hero metrics & aligner steps
    ├── premium.json     # Premium-specific copy & sanctuary highlights
    └── warm.json        # Warm-specific copy, comfort phases & denture comparison
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Add a New Clinic
Scaffold a new clinic with strict Zod-compliant starter structures:
```bash
npx tsx scripts/add-clinic.ts my-clinic-slug
```
This creates `data/clinics/my-clinic-slug/` populated with structured JSON files ready for clinic data.

### 3. Run Development Server
```bash
npm run dev
```
Visit `http://localhost:3000` to select a clinic and preview across all three design templates.

---

## 🛡️ Validation & Quality Checks

Run the automated data integrity and claim verifier:
```bash
npm run validate
```

The validator (`scripts/validate.ts`) enforces strict data and engine integrity:
- **Zod Schema Compliance**: Validates all JSON files (`clinic.json`, `claims.json`, `services.json`, `faqs.json`, `templates/{modern,premium,warm}.json`) against strict Zod schemas with required fields and no alias properties.
- **Claims Verification**: Requires every claim in `claims.json` to have a valid `status` (`VERIFIED`, `SAFE_TO_GENERATE`, `NEEDS_CLIENT_INPUT`) and non-empty `source`.
- **Scaffolding Gate**: Detects `NEEDS_CLIENT_INPUT` placeholders and empty arrays, failing validation until all clinic fields are completed.
- **Image Manifest Integrity**: Validates `public/clinics/<slug>/manifest.json` entries (`fileName`, `depicts`, `alt`, `isStock`), strictly forbidding stock photos from claiming to depict the clinic or doctor.
- **Forbidden Medical Claims in Code**: Fails if unverified marketing claims ("100%", "Class-B", "hospital-grade", "guarantee") or legacy placeholders appear in `components/`, `lib/`, or `app/`.
- **Dynamic Review Counts**: Fails if hardcoded review counts or star rating strings appear in components; review counts must come dynamically from `siteConfig.reviewCount`.
- **Hours Integrity**: Fails on hardcoded session timing strings (e.g. "Morning 9-1", "Evening 5-9", "Mon-Sun") in components, ensuring components show "Call to confirm timings" whenever `hours.verified` is false.

---

## 📦 Production Build

Compile and generate static HTML for all clinics and templates:
```bash
npm run build
```

Verify TypeScript types without emitting:
```bash
npx tsc --noEmit
```

---

## 📂 Project Structure

```
├── app/
│   ├── page.tsx                  # Root landing page & clinic template switcher
│   ├── modern/[slug]/page.tsx    # Modern template route
│   ├── premium/[slug]/page.tsx   # Premium template route
│   └── warm/[slug]/page.tsx      # Warm template route
├── components/
│   ├── modern/                   # Modern template UI components
│   ├── premium/                  # Premium template UI components
│   └── warm/                     # Warm template UI components
├── data/
│   ├── clinics/                  # Canonical clinic data directories
│   └── schema/
│       └── clinic.ts             # Zod schemas & TypeScript type definitions
├── lib/
│   ├── adapters/                 # Template-specific view model adapters
│   │   ├── modern.ts
│   │   ├── premium.ts
│   │   └── warm.ts
│   └── get-clinic.ts             # Type-safe clinic loader with Zod validation
└── scripts/
    ├── add-clinic.ts             # Scaffolder for new clinics
    ├── migrate-clinic.ts         # Migration helper for legacy clinic data
    └── validate.ts               # Schema & unverified claim validator
```
