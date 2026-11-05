import fs from 'fs';
import path from 'path';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query: string): Promise<string> =>
  new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log('--- Add New Clinic (Strict Scaffolding) ---');
  const clinicName = await question('Clinic Name: ');
  const defaultSlug = clinicName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const slugInput = await question(`Slug [${defaultSlug}]: `);
  const slug = slugInput.trim() || defaultSlug;
  const defaultShort = clinicName.length > 20 ? clinicName.slice(0, 20).trim() : clinicName;
  let shortName = (await question(`Short Name (Navbar Logo, MAX 20 chars) [${defaultShort}]: `)).trim() || defaultShort;
  if (shortName.length > 20) {
    console.warn(`[WARNING] shortName '${shortName}' is ${shortName.length} chars (exceeds 20). Trimming to 20.`);
    shortName = shortName.slice(0, 20).trim();
  }
  const area = await question('Area (e.g. Laxmi Nagar, Delhi): ');
  const address = await question('Full Address: ');
  const landmark = await question('Landmark: ');
  const phone = await question('Phone Number (e.g. +91 98765 43210): ');
  const phoneRaw = phone.replace(/[^0-9]/g, '');
  const whatsapp = await question(`WhatsApp (numbers only) [${phoneRaw}]: `) || phoneRaw;
  const doctorName = await question('Doctor Name: ');
  const qualifications = await question('Doctor Qualifications: ');
  const experience = await question('Doctor Experience (e.g. 10+ Years): ');

  rl.close();

  const clinicDir = path.join(process.cwd(), 'data', 'clinics', slug);
  const templatesDir = path.join(clinicDir, 'templates');

  if (!fs.existsSync(templatesDir)) {
    fs.mkdirSync(templatesDir, { recursive: true });
  }

  // 1. clinic.json - Invent nothing. Unknown fields marked as NEEDS_CLIENT_INPUT
  const clinicData = {
    slug,
    clinicName,
    shortName,
    area,
    address,
    landmark,
    phone,
    phoneRaw,
    whatsapp,
    rating: 'NEEDS_CLIENT_INPUT',
    reviewCount: 'NEEDS_CLIENT_INPUT',
    consultationFee: 'NEEDS_CLIENT_INPUT',
    mapEmbedUrl: `https://maps.google.com/maps?q=${encodeURIComponent(clinicName + ' ' + area)}&t=&z=16&ie=UTF8&iwloc=&output=embed`,
    directionsUrl: `https://maps.google.com/?q=${encodeURIComponent(clinicName + ' ' + area)}`,
    googleReviewsUrl: `https://maps.google.com/?q=${encodeURIComponent(clinicName + ' ' + area)}`,
    hours: {
      verified: false,
      notes: 'NEEDS_CLIENT_INPUT',
      schedule: [],
    },
    doctor: {
      name: doctorName,
      title: 'Lead Dental Surgeon & Practitioner',
      qualifications,
      experience,
    },
  };

  // 2. claims.json - Single placeholder requiring client verification
  const claimsData = {
    claims: [
      {
        id: 'claim-1',
        text: 'NEEDS_CLIENT_INPUT',
        status: 'NEEDS_CLIENT_INPUT',
        source: 'NEEDS_CLIENT_INPUT',
      },
    ],
  };

  // 3. services.json - Placeholder service requiring real client service definition
  const servicesData = {
    services: [
      {
        id: 'service-1',
        title: 'NEEDS_CLIENT_INPUT',
        category: 'NEEDS_CLIENT_INPUT',
        description: 'NEEDS_CLIENT_INPUT',
      },
    ],
  };

  // 4. faqs.json - Placeholder FAQ requiring clinic-specific input
  const faqsData = {
    faqs: [
      {
        category: 'General',
        question: 'NEEDS_CLIENT_INPUT',
        answer: 'NEEDS_CLIENT_INPUT',
      },
    ],
  };

  // 5. templates/modern.json
  const modernData = {};

  // 6. templates/premium.json
  const premiumData = {};

  // 7. templates/warm.json
  const warmData = {};

  // 8. public/clinics/<slug>/manifest.json
  const publicClinicDir = path.join(process.cwd(), 'public', 'clinics', slug);
  if (!fs.existsSync(publicClinicDir)) {
    fs.mkdirSync(publicClinicDir, { recursive: true });
  }
  const manifestData = {
    clinicSlug: slug,
    images: [],
  };
  fs.writeFileSync(path.join(publicClinicDir, 'manifest.json'), JSON.stringify(manifestData, null, 2), 'utf8');

  fs.writeFileSync(path.join(clinicDir, 'clinic.json'), JSON.stringify(clinicData, null, 2), 'utf8');
  fs.writeFileSync(path.join(clinicDir, 'claims.json'), JSON.stringify(claimsData, null, 2), 'utf8');
  fs.writeFileSync(path.join(clinicDir, 'services.json'), JSON.stringify(servicesData, null, 2), 'utf8');
  fs.writeFileSync(path.join(clinicDir, 'faqs.json'), JSON.stringify(faqsData, null, 2), 'utf8');
  fs.writeFileSync(path.join(templatesDir, 'modern.json'), JSON.stringify(modernData, null, 2), 'utf8');
  fs.writeFileSync(path.join(templatesDir, 'premium.json'), JSON.stringify(premiumData, null, 2), 'utf8');
  fs.writeFileSync(path.join(templatesDir, 'warm.json'), JSON.stringify(warmData, null, 2), 'utf8');

  console.log(`\nSuccessfully created scaffolded clinic dataset at: ${clinicDir}`);
  console.log('NOTE: Unknown fields have been set to NEEDS_CLIENT_INPUT.');
  console.log('The clinic will fail `npm run validate` until all placeholder fields are populated with verified data.');
  console.log('Files generated:');
  console.log('- clinic.json');
  console.log('- claims.json');
  console.log('- services.json');
  console.log('- faqs.json');
  console.log('- templates/modern.json');
  console.log('- templates/premium.json');
  console.log('- templates/warm.json');
  console.log(`- public/clinics/${slug}/manifest.json`);
}

main().catch(console.error);
