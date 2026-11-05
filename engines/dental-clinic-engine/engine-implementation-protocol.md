# Dental Clinic Engine - Implementation Protocol

This protocol defines the structural gold standard for onboarding any new clinic into the engine. All data scaffolded into `data/clinics/<slug>/` must adhere strictly to these volume and padding rules, modeled directly from the "Dr Care Cosmo" baseline.

## 1. System Architecture & Component Structure

The **Dental Clinic Engine** (`projects/Dental-Clinic-Engine`) is a unified Next.js multi-template web app. A single structured dataset for any given clinic powers three distinct responsive templates with zero code changes:

```
projects/Dental-Clinic-Engine/
├── app/
│   ├── page.tsx                     # Engine landing dashboard (lists all onboarded clinics & direct links)
│   ├── layout.tsx                   # Global root HTML/body layout and font definitions
│   ├── globals.css                  # Tailored Tailwind CSS variables and base tokens
│   ├── modern/[slug]/page.tsx       # Tech-forward, high-precision aesthetic template route
│   ├── premium/[slug]/page.tsx      # Boutique luxury, tranquil sanctuary aesthetic template route
│   └── warm/[slug]/page.tsx         # Gentle family-friendly, anxiety-free comfort template route
├── components/
│   ├── modern/                      # Modern template UI components (Hero, Metrics, Tech Services, Process)
│   ├── premium/                     # Premium template UI components (Sanctuary, Golden Ratio, Doctor Spotlight)
│   ├── warm/                        # Warm template UI components (Comfort Phases, BPS Dentures, Trust Pillars)
│   └── shared/                      # Reusable components (Navbar, Footer, ContactModal, MapEmbed, WhatsAppCTA)
├── data/
│   ├── schema/
│   │   └── clinic.ts                # Canonical Zod schemas defining all TypeScript types and validation rules
│   └── clinics/
│       └── <slug>/                  # Individual client data folder containing the 7 canonical JSON files
├── lib/                             # Data loading utilities (`getClinic(slug)`, `getAllClinics()`)
├── public/                          # Static assets, hero images, and screenshots
└── scripts/
    ├── add-clinic.ts                # Scaffolding CLI to initialize a new client's JSON files
    └── validate.ts                  # Zod validation and forbidden claim audit script (`npm run validate`)
```

---

## 2. Upstream Research Protocol & Intelligence Location

Before a clinic reaches implementation, its raw facts are researched and verified:
- **Primary Research Protocol**: [`projects/Dental-Clinic-Clients/research-protocol.md`](file:///C:/Developing/firstmate/projects/Dental-Clinic-Clients/research-protocol.md) (and its mirror [`projects/Side hustle (Building Website)/research-protocol.md`](file:///C:/Developing/firstmate/projects/Side%20hustle%20(Building%20Website)/research-protocol.md)).
- **Canonical Field Checklist**: [`projects/Side hustle (Building Website)/lead-scraper/research-checklist.json`](file:///C:/Developing/firstmate/projects/Side%20hustle%20(Building%20Website)/lead-scraper/research-checklist.json).
- **Client Research Dossiers**: Stored at `projects/Dental-Clinic-Clients/client-<N>-<CleanName>/research.md`.
- **Master Lead Tracker**: `projects/Side hustle (Building Website)/lead-scraper/website-hustle-tracker.xlsx`.
- **Implementation Skill**: [`.agents/skills/start-implementation/SKILL.md`](file:///C:/Developing/firstmate/.agents/skills/start-implementation/SKILL.md).
- **Research Skill**: [`.agents/skills/dental-client-research/SKILL.md`](file:///C:/Developing/firstmate/.agents/skills/dental-client-research/SKILL.md).

> **Crucial Protocol Boundary**: `research.md` contains **RAW VERIFIED FACTS ONLY**. It does NOT pad to 6 services, fake ₹300 consultation fees, or invent missing Google Maps hours. The implementation phase alone (`engine-implementation-protocol.md`) is responsible for padding grids to the gold standard volume.

---

## 3. Client Data Structure (`data/clinics/<slug>/`)

Each client lives in its own dedicated directory under `projects/Dental-Clinic-Engine/data/clinics/<slug>/` and consists of exactly 7 JSON files:

```
data/clinics/<slug>/
├── clinic.json             # Core identity, contact coordinates, doctor credentials, timings
├── claims.json             # Provenance-backed claims, trust metrics, rating badges, audit sources
├── services.json           # Exactly 6 clinical services with badges, 2-line descriptions, key benefits
├── faqs.json               # Exactly 6 patient FAQs covering comfort, fees, appointments, hygiene
└── templates/
    ├── modern.json         # Hero metric badges & interactive aligner journey steps
    ├── premium.json        # Practice sanctuary amenities & aesthetic treatment highlights
    └── warm.json           # 4-step comfort phases & precision denture comparison table
```

### Detailed File Schemas & Gold Standard Requirements:

1. **`clinic.json`**:
   - `slug`: URL slug (e.g., `dr-care-cosmo`).
   - `clinicName`: Full brand name (e.g., `"Dr Care Cosmo Dental Clinic"`).
   - `shortName`: Short display name used in the top navbar and logo (**STRICT MAX 20 CHARACTERS**). Names exceeding 20 characters break desktop/mobile navbar layouts. The agent/generator must intelligently condense verbose clinic names to their core brand (e.g., *"Bhagwati Dental Care and Implant Centre"* -> *"Bhagwati Dental Care"* <= 20 chars). Do not include trailing descriptors ("& Implant Centre", "Multispeciality Dental Clinic") or doctor names in `shortName`. Locality remains separately underneath it.
   - `tagline`: One concise clinical value proposition.
   - `shortDescription`: ~2-line summary mentioning locality, lead doctor, and core services.
   - `area`, `address`, `landmark`: Full street address coordinates.
   - `phone`, `phoneRaw`, `whatsapp`: International standard phone numbers (`whatsapp` includes country code `91` without `+`).
   - `rating`, `reviewCount`: Verified Google rating (e.g., `"5.0"`, `"32+"`).
   - `consultationFee`: Specific verified fee or `"Transparent OPD"`.
   - `mapEmbedUrl`, `directionsUrl`, `googleReviewsUrl`: Clean Google Maps links.
   - `hours`: 7-day schedule with `verified: true`. If real hours are missing, provide clean standard timings (Mon-Sat 10:00 AM - 08:00 PM, Sun Closed).
   - `doctor`: `{ name, title, qualifications, experience, consultationFee, philosophy, credentials: [] }`.
   - `morningSlots`, `eveningSlots`: 6 standard slot chips each.

2. **`claims.json`**:
   - Array of `{ id, text, status: "VERIFIED" | "SAFE_TO_GENERATE" | "NEEDS_CLIENT_INPUT", source }`.
   - Used for trust badges and verifier passes.

3. **`services.json`**:
   - Array of **exactly 6 services**.
   - Each contains `{ id, title, category, badge, description, keyBenefits: [4 items], painScore, recoveryTime, idealFor, image }`.
   - Descriptions must match the **2-line volume rule** (~20-25 words).

4. **`faqs.json`**:
   - Array of **exactly 6 FAQs**.
   - Each contains `{ category, question, answer }`. Answers must be ~2-3 lines of reassuring educational text (~180-250 characters).

5. **`templates/modern.json`**:
   - `heroMetrics`: Array of **exactly 3 metrics** (e.g. Rating + Reviews, Consultation Fee / OPD, Clinical Experience) formatted in a balanced 3-card trust bar.
   - `alignerJourney`: 4-step clear aligner / treatment process.

6. **`templates/premium.json`**:
   - `sanctuaryTitle`: Practice sanctuary title.
   - `sanctuaryFeatures`: 4 boutique sanctuary features with title, description, amenity, and icon.

7. **`templates/warm.json`**:
   - `comfortPhases`: 4 comfort steps (Assessment, Topical Pre-Numb, Gentle Care, Post-Care).
   - `dentureComparison`: 4-5 comparative rows for denture precision / gentle treatments.

---

## 4. The Core Philosophy
- **Lush & Premium**: Pitch websites cannot have sparse cards, broken grids, or missing text. The agent MUST generate high-quality generic clinical copy to fill missing gaps.
- **Anti-Hallucination**: While generating generic padding (e.g., "Advanced Painless Care") is required, hallucinating **specific facts** (e.g., "₹300 fee", "Dr. Smith has 15 years experience", "4.9 Google Rating") is strictly forbidden. 

## 5. Structural Requirements Matrix

| Component / Layer | Gold Standard Requirement | Padding & Fallback Rules | Anti-Hallucination Guardrails |
| :--- | :--- | :--- | :--- |
| **Services**<br>(`services.json`) | **Exactly 6 services**. Each with `id`, `title`, `category`, `badge`, `description`, `4 keyBenefits`. | If <6 services: Pad with standard generics (e.g., Scaling & Polishing, Rotary RCT, Composite Restorations).<br>If >6: Cap at top 6. | Never claim unverified specialized surgery or advanced implantology unless explicitly sourced. |
| **Service Descriptions** | 2-line text volume (~20-25 words). | If real descriptions are short, generate clinical benefit copy matching this 2-line volume. | Keep descriptions focused on patient benefits, not heavy machinery names. |
| **Operating Hours**<br>(`clinic.json`) | Active 7-day timetable with `hours.verified: true` and active morning/evening slot chips. | If Google Maps timings are missing, generate clean generic timings (e.g., Mon-Sat 10:00 AM - 08:00 PM, Sun Closed) with standard slot arrays. | Do not invent non-existent doctor holiday schedules or emergency on-call claims. |
| **FAQs**<br>(`faqs.json`) | **Exactly 6 FAQs** covering: Comfort, Procedures, Dentures, Consultation process, Anxiety, Sterilization. | If fewer FAQs are found, pad with reassuring educational answers (~2-3 lines each, ~180-250 characters). | Never invent specific fees in FAQs unless verified (use "transparent OPD consultation" instead). |
| **Modern Template Metrics**<br>(`modern.json`) | **Exactly 3 trust metrics** in a clean 3-card scorecard bar (Rating + Reviews, Consultation Fee/Standard OPD, Doctor Clinical Practice). | Metrics: 1. Google Rating + Review Count, 2. Consultation Fee / Transparent OPD, 3. Doctor Clinical Practice.<br>Capped strictly at 3 for optimal 3-column desktop and clean mobile card stacking. | If fee or rating is missing, use "Transparent OPD" or "Verified Patient Practice". NEVER fake "4.9★" or counts. |
| **Warm Template Reviews**<br>(`warm.json`) | Exactly 6 trust pillars completing a balanced 3x2 grid. | Grid: Rating, Review Count, Transparent Consultation, Doctor Experience, Autoclave Sterilization Standards, Gentle Comfort Protocol. | Keep facts grounded in verified profile data and standard hygiene protocols. |
| **Doctor Profile & Philosophy** | Doctor Name, Qualifications, Experience, and Philosophy quote. | If experience year is unverified, state "Experienced Clinical Practice". If fee is unverified, label as "Standard OPD". | Zero hallucination: NEVER invent a "₹300 consultation fee", fake degrees, or imaginary council registrations. |

## 6. Past Mistakes to Prevent in Future Implementations

The following issues were identified across previous client builds and visual audits; all future implementations must actively prevent them:

1. **Clinic Name Bloat (Keep Names Concise & Navbar Logo <= 20 Chars)**:
   - **Mistake**: Using overly verbose names like `"Bhagwati Dental Care and Implant Centre"` or `"Complete Dental Care by Dr. Latika & Implant Centre"`. Names over 20 characters mess up the top navbar, wrap onto 3-4 lines on mobile headers, compress desktop navigation links, and look unpolished.
   - **Prevention Rule**: The agent/generator must intelligently condense `shortName` (used in the navbar logo) so it **NEVER exceeds 20 characters**.
     - Example: If the full clinic name is *"Bhagwati Dental Care and Implant Centre"*, take only *"Bhagwati Dental Care"* (<= 20 chars).
     - Trim trailing clinic descriptors (`"and Implant Centre"`, `"& Implant Clinic"`, `"Multispeciality Dental Care"`), hospital suffixes, and doctor prefixes.
     - The full clinic name stays preserved in `clinicName`, locality remains displayed underneath in the navbar, and doctor credentials stay in `doctor.name`.

2. **Hero Metric Grid Overcrowding (Modern Template)**:
   - **Mistake**: Having 4 to 6 metric cards in the Modern hero bar. On desktop, 4 cards cause cramped columns; on mobile, 4-6 cards push key content far below the fold.
   - **Prevention Rule**: Strictly enforce **exactly 3 cards** in `templates/modern.json` (`heroMetrics`).

3. **Mobile CTA Below Fold / Truncation**:
   - **Mistake**: Placing hero action buttons below large graphic containers or truncating button labels on 360-390px mobile screens.
   - **Prevention Rule**: Hero action buttons must remain immediately accessible and never hide under text truncation classes (`truncate` / `overflow-hidden` without wrapping).

4. **Anchor Link / Section Mismatches**:
   - **Mistake**: Navigation bars having links to sections that are not mounted in the page (e.g. `#sanctuary` link in Premium Navbar when `<ParkViewSanctuary>` was omitted from the page body).
   - **Prevention Rule**: Every anchor link in `Navbar.tsx` must correspond to a mounted, rendered `<section id="...">` in all three template pages.

5. **Color Contrast & Readability**:
   - **Mistake**: Light button text on soft pastel backgrounds or dark text on dark badges causing low contrast ratios.
   - **Prevention Rule**: All CTA buttons and sticky mobile bars must maintain WCAG AA/AAA compliance with high contrast (e.g. pure white text on solid primary brand backgrounds).

6. **Pediatric Clinic Inconsistencies**:
   - **Mistake**: Showing geriatric/denture comparison tables on pediatric dental practices, or showing toddler stock photos on adult implant clinic profiles.
   - **Prevention Rule**: Check clinic specialty before enabling specialty modules. Denture comparison modules must be excluded or conditionally bypassed for pediatric clinics.

## 7. Data Generation Examples
**Example: Padding a Service**
- *Raw Data*: "Root Canal"
- *Generated Output*: 
  - Title: Root Canal Therapy
  - Description: "Experience pain-free root canal therapy using advanced rotary endodontics. We focus on preserving your natural smile while ensuring maximum comfort." (Matches the 2-line volume rule).
  - Key Benefits: ["Painless Procedure", "Preserves Natural Tooth", "Advanced Rotary Tech", "Quick Recovery"]

**Example: Handling Missing Fees**
- *Raw Data*: (No fee listed on Practo or Google)
- *Generated Output*: Do not write "₹500". Write "Standard OPD Consultation" or "Transparent Pricing".
