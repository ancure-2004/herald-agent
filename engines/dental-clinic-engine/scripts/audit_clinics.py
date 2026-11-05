import os
import json
import re

CLINICS_DIR = os.path.join(os.getcwd(), 'data', 'clinics')
slugs = sorted([d for d in os.listdir(CLINICS_DIR) if os.path.isdir(os.path.join(CLINICS_DIR, d))])

print(f"Total clinics found: {len(slugs)}")

all_valid = True
results = []

for slug in slugs:
    c_dir = os.path.join(CLINICS_DIR, slug)
    
    # 1. clinic.json
    with open(os.path.join(c_dir, 'clinic.json'), 'r', encoding='utf-8') as f:
        clinic = json.load(f)
        
    # 2. services.json
    with open(os.path.join(c_dir, 'services.json'), 'r', encoding='utf-8') as f:
        services_data = json.load(f)
        services = services_data.get('services', [])
        
    # 3. faqs.json
    with open(os.path.join(c_dir, 'faqs.json'), 'r', encoding='utf-8') as f:
        faqs_data = json.load(f)
        faqs = faqs_data.get('faqs', [])
        
    # 4. templates
    modern_path = os.path.join(c_dir, 'templates', 'modern.json')
    premium_path = os.path.join(c_dir, 'templates', 'premium.json')
    warm_path = os.path.join(c_dir, 'templates', 'warm.json')
    
    has_modern = os.path.exists(modern_path)
    has_premium = os.path.exists(premium_path)
    has_warm = os.path.exists(warm_path)
    
    doctor = clinic.get('doctor', {})
    doc_name = doctor.get('name', '')
    doc_qual = doctor.get('qualifications', '')
    doc_exp = doctor.get('experience', '')
    doc_creds = doctor.get('credentials', [])
    
    phone = clinic.get('phone', '')
    phone_raw = clinic.get('phoneRaw', '')
    whatsapp = clinic.get('whatsapp', '')
    g_reviews = clinic.get('googleReviewsUrl', '')
    directions = clinic.get('directionsUrl', '')
    map_embed = clinic.get('mapEmbedUrl', '')
    
    # Validation checks
    s_count = len(services)
    f_count = len(faqs)
    
    issues = []
    if s_count != 6:
        issues.append(f"Services count is {s_count} (expected 6)")
    if f_count != 6:
        issues.append(f"FAQs count is {f_count} (expected 6)")
    if not doc_name:
        issues.append("Missing doctor name")
    if not doc_qual:
        issues.append("Missing doctor qualifications")
    if not doc_creds:
        issues.append("Missing doctor credentials")
    if not phone or not phone_raw:
        issues.append("Missing phone")
    if not whatsapp:
        issues.append("Missing whatsapp")
    if not g_reviews or not g_reviews.startswith('http'):
        issues.append("Missing/invalid googleReviewsUrl")
    if not directions or not directions.startswith('http'):
        issues.append("Missing/invalid directionsUrl")
        
    results.append({
        'slug': slug,
        'clinicName': clinic.get('clinicName'),
        'services': s_count,
        'faqs': f_count,
        'doctor': doc_name,
        'qualifications': doc_qual,
        'experience': doc_exp,
        'credentialsCount': len(doc_creds),
        'phone': phone,
        'phoneRaw': phone_raw,
        'whatsapp': whatsapp,
        'googleReviewsUrl': g_reviews,
        'has_modern': has_modern,
        'has_premium': has_premium,
        'has_warm': has_warm,
        'issues': issues
    })

print(f"\n--- AUDIT SUMMARY across {len(slugs)} Clinics ---")
clinics_with_issues = [r for r in results if r['issues']]
if not clinics_with_issues:
    print("ALL 100% of clinics passed data integrity checks:")
    print("  - Exactly 6 services per clinic")
    print("  - Exactly 6 FAQs per clinic")
    print("  - Verified doctor credentials present")
    print("  - Clean contact actions (phone, phoneRaw, WhatsApp, Google Reviews URL, Directions URL)")
else:
    print(f"Found issues in {len(clinics_with_issues)} clinics:")
    for r in clinics_with_issues:
        print(f"  [{r['slug']}]: {', '.join(r['issues'])}")

print("\nSample Clinic Details:")
for r in results[:5]:
    print(f"  {r['slug']}: Doc='{r['doctor']}' ({r['qualifications']}), Services={r['services']}, FAQs={r['faqs']}, Creds={r['credentialsCount']}, Phone={r['phone']}, WA={r['whatsapp']}")
