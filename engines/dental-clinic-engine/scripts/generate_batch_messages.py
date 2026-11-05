import os
import re
import json
import argparse
from pathlib import Path
import openpyxl

ENGINE_DIR = Path(__file__).resolve().parent.parent
DATA_CLINICS = ENGINE_DIR / "data" / "clinics"

def get_channel_and_contact(tracker_path, clinic_name, slug):
    if not tracker_path.exists():
        return "WhatsApp", None

    wb = openpyxl.load_workbook(tracker_path)
    ws = wb["Lead Pipeline"]
    
    name_clean = re.sub(r'[^a-z0-9]', '', str(clinic_name).lower())
    slug_clean = re.sub(r'[^a-z0-9]', '', slug.lower())
    
    for r in range(2, ws.max_row + 1):
        c_val = ws.cell(row=r, column=1).value
        if c_val:
            c_clean = re.sub(r'[^a-z0-9]', '', str(c_val).lower())
            if c_clean in name_clean or name_clean in c_clean or c_clean in slug_clean or slug_clean in c_clean:
                channel_raw = str(ws.cell(row=r, column=6).value or "").strip()
                contact = str(ws.cell(row=r, column=5).value or "").strip()
                
                # Pick primary channel
                ch_upper = channel_raw.upper()
                if "INSTAGRAM" in ch_upper or ch_upper == "IG":
                    return "Instagram", contact
                elif "EMAIL" in ch_upper or "MAIL" in ch_upper:
                    return "Email", contact
                else:
                    return "WhatsApp", contact
                    
    return "WhatsApp", None

def get_clean_salutation(doc_name):
    if not doc_name or doc_name in ['Doctor', 'Lead Dental Surgeon', 'Lead Dental Specialist', 'Lead Surgeon', 'Resident Dental Director']:
        return "Doctor Ji"
    d = doc_name.strip()
    if not d.endswith('Ji'):
        d = f"{d} Ji"
    return d

def generate_instagram_md(c):
    doc_salutation = get_clean_salutation(c['doc'])
    ig_link = c.get('contact') or 'https://instagram.com/'
    if ig_link in ['not found', '-', '']:
        ig_link = 'https://instagram.com/'
    return f"""# Outreach Message - Client {c['id']}: {c['name']}

**Assigned Channel:** Instagram Only  
**Locality:** {c['loc']}  
**Instagram Profile:** {ig_link}  
**Phone:** {c['phone']}  
**Proof Stack:** {c['rating']}★ ({c['revs']} reviews)  
**Featured Template:** {c['tpl_cap']}  
**Video Walkthrough:** Clinic-{c['id']}.mp4  

---

## Instagram Outreach Sequence

### 1. Single Text DM Invite (Send First)
```
Namaste {doc_salutation}

Google par {c['name']} ki {c['rating']}/5 rating aur {c['revs']} patient reviews dekh kar kaafi accha laga.

Humne aapke clinic ke liye 3 alag visual styles mein ek modern website ready ki hai. Sample design ka live preview link ye raha:
https://dental-clinic-engine.vercel.app/{c['tpl']}/{c['slug']}

Baqi do designs bhi live hain. Aapko ye design kaisa laga?
```

### 2. Instagram Reply Kit (Human Follow-Up Upon Response)
**Video Walkthrough File:** Clinic-{c['id']}.mp4  
**Follow-Up Caption:**
```
Ye {c['name']} ke live sample ka screen recording preview hai.

Aapke clinic ke 3 styles yahan dekh sakte hain:
• Modern: https://dental-clinic-engine.vercel.app/modern/{c['slug']}
• Premium: https://dental-clinic-engine.vercel.app/premium/{c['slug']}
• Warm: https://dental-clinic-engine.vercel.app/warm/{c['slug']}

Aapke clinic brand ke liye kaun sa design sabse accha rahega?
```
**Design Links:**
- Modern: https://dental-clinic-engine.vercel.app/modern/{c['slug']}
- Premium: https://dental-clinic-engine.vercel.app/premium/{c['slug']}
- Warm: https://dental-clinic-engine.vercel.app/warm/{c['slug']}
"""

def generate_email_md(c):
    doc_salutation = get_clean_salutation(c['doc'])
    email_addr = c.get('contact') or 'example@gmail.com'
    if email_addr in ['not found', '-', '']:
        email_addr = 'example@gmail.com'
    return f"""# Outreach Message - Client {c['id']}: {c['name']}

**Assigned Channel:** Email Only  
**Locality:** {c['loc']}  
**Email:** {email_addr}  
**Phone:** {c['phone']}  
**Proof Stack:** {c['rating']}★ ({c['revs']} reviews)  
**Featured Template:** {c['tpl_cap']}  
**Video Walkthrough:** Clinic-{c['id']}.mp4  

---

## Email Outreach Format

**Subject:** Sample Website Designs for {c['name']}  

**Body:**
```
Namaste {doc_salutation},

Google par {c['name']} ({c['loc']}) ki {c['rating']}★ rating aur {c['revs']} patient reviews dekh kar kaafi accha laga.

Humne aapke clinic ke liye 3 distinct visual styles mein interactive website layouts ready kiye hain, jisme mobile-first booking, verified services aur patient proof beautifully arranged hain:

• Design 1 (Modern Precision): https://dental-clinic-engine.vercel.app/modern/{c['slug']}
• Design 2 (Premium Boutique): https://dental-clinic-engine.vercel.app/premium/{c['slug']}
• Design 3 (Warm Family Care): https://dental-clinic-engine.vercel.app/warm/{c['slug']}

Saath mein 45-second screen recording walkthrough attach kiya hai: Clinic-{c['id']}.mp4

Inme se jo bhi aesthetic aapke practice ke liye best fit ho, hum wahi finalize kar denge. Aapko inme se kaun sa design sabse pasand aaya?

Warm regards,
Ankur Tyagi
Web Architect & Healthcare UI Designer
Delhi NCR | +91 95823 90243

If you prefer not to receive updates regarding website designs, please reply 'opt-out' and we will remove your contact immediately.
```
"""

def generate_whatsapp_md(c):
    doc_salutation = get_clean_salutation(c['doc'])
    return f"""# Outreach Message - Client {c['id']}: {c['name']}

**Assigned Channel:** WhatsApp Only  
**Locality:** {c['loc']}  
**Phone:** {c['phone']}  
**Proof Stack:** {c['rating']}★ ({c['revs']} reviews)  
**Featured Template:** {c['tpl_cap']}  
**Video Walkthrough:** Clinic-{c['id']}.mp4  

---

## WhatsApp Outreach Sequence

### Message 1 (Text Hook)
```
Namaste {doc_salutation} 🙏

Google par {c['name']} ki {c['rating']}★ rating aur {c['revs']} patient reviews dekh kar kaafi accha laga.

Humne aapke clinic ke liye 3 alag visual styles mein ek modern website ready ki hai, taaki patients directly details dekh sakein aur appointment book kar sakein.

Iska ek quick screen recording video walkthrough niche share kar raha hoon:
```

### Message 2 (Video Caption)
```
Ye walkthrough video aapke clinic ke liye customized layout ka preview hai.

Aapke clinic ke 3 distinct designs ready hain:
• Design 1 (Modern): https://dental-clinic-engine.vercel.app/modern/{c['slug']}
• Design 2 (Premium): https://dental-clinic-engine.vercel.app/premium/{c['slug']}
• Design 3 (Warm): https://dental-clinic-engine.vercel.app/warm/{c['slug']}

Inme se jo bhi design aapko sabse best lage, hum aapke clinic ke liye wahi finalize kar denge.

Aapko inme se kaun sa design sabse accha laga?
```
"""

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--month", type=str, default="october", help="Month folder")
    parser.add_argument("--start", type=int, required=True, help="Start client number")
    parser.add_argument("--end", type=int, required=True, help="End client number")
    args = parser.parse_args()

    DOSSIERS_ROOT = ENGINE_DIR.parent / "Dental-Clinic-Clients" / args.month
    TRACKER_PATH = ENGINE_DIR.parent / "Side hustle (Building Website)" / "website hustle tracker" / f"{args.month} outreach.xlsx"
    
    print(f"Generating Outreach Messages for Clients {args.start} to {args.end}...")
    
    client_dirs = sorted([d for d in DOSSIERS_ROOT.iterdir() if d.is_dir() and d.name.startswith("client-")],
                         key=lambda p: int(re.match(r'client-(\d+)-', p.name).group(1)) if re.match(r'client-(\d+)-', p.name) else 0)
    
    target_dirs = [d for d in client_dirs if args.start <= int(re.match(r'client-(\d+)-', d.name).group(1)) <= args.end]
    
    for client_dir in target_dirs:
        m = re.match(r'client-(\d+)-', client_dir.name)
        cid = int(m.group(1))
        
        research_file = client_dir / "research.md"
        if not research_file.exists():
            continue
            
        text = research_file.read_text(encoding="utf-8")
        raw_clean_name = re.search(r'- Clean name:\s*(.*)', text).group(1).strip()
        slug_base = re.sub(r'[^a-z0-9]+', '-', raw_clean_name.lower()).strip('-')
        slug = re.sub(r'-+', '-', slug_base)
        
        clinic_json_path = DATA_CLINICS / slug / "clinic.json"
        
        if clinic_json_path.exists():
            with open(clinic_json_path, 'r', encoding='utf-8') as f:
                c_data = json.load(f)
                clinic_name = c_data.get('clinicName', raw_clean_name)
                doc_name = c_data.get('doctor', {}).get('name', 'Doctor')
                rating = c_data.get('rating', '4.9')
                revs = str(c_data.get('reviewCount', '50+')).replace('+', '') + '+'
                loc = c_data.get('area', 'Delhi NCR')
                phone = c_data.get('phone', '+91 99999 99999')
        else:
            clinic_name = raw_clean_name
            doc_match = re.search(r'Lead Doctor:\s*([^(\n]+)', text)
            doc_name = doc_match.group(1).strip() if doc_match else 'Doctor'
            rating_match = re.search(r'Rating\s+([0-9.]+),\s*(\d+)\s+reviews', text)
            if rating_match:
                rating = rating_match.group(1).strip()
                revs = rating_match.group(2).strip() + '+'
            else:
                rating = '4.9'
                revs = '50+'
            area_match = re.search(r'- Area/Locality:\s*(.*)', text)
            loc = area_match.group(1).strip() if area_match else 'Delhi NCR'
            phone_match = re.search(r'- Phone:\s*([0-9\+\s\-]+)', text)
            phone = phone_match.group(1).strip() if phone_match else '+91 99999 99999'

        tpl = "modern"
        tpl_match = re.search(r'## Recommended Template\s*\n\*\*([A-Za-z]+)\*\*', text)
        if tpl_match:
            tpl = tpl_match.group(1).strip().lower()
            
        # Prioritize verified channel & contact directly from research.md
        ch_match = re.search(r'Primary Outreach Channel:\s*(.*)', text)
        val_match = re.search(r'- Contact Value:\s*(.*)', text)
        contact_val = val_match.group(1).strip() if val_match else None

        if ch_match:
            raw_ch = ch_match.group(1).strip().upper()
            if "INSTAGRAM" in raw_ch or raw_ch == "IG":
                channel = "Instagram"
                contact = contact_val or (re.search(r'-?\s*Instagram:\s*(.*)', text).group(1).strip() if re.search(r'-?\s*Instagram:\s*(.*)', text) else None)
            elif "EMAIL" in raw_ch or "MAIL" in raw_ch:
                channel = "Email"
                contact = contact_val or (re.search(r'-?\s*Email:\s*(.*)', text).group(1).strip() if re.search(r'-?\s*Email:\s*(.*)', text) else None)
            else:
                channel = "WhatsApp"
                contact = contact_val or phone
        else:
            channel, contact = get_channel_and_contact(TRACKER_PATH, clinic_name, slug)

        # Refine doc_name if generic
        if doc_name in ['Doctor', 'Lead Dental Surgeon', 'Lead Dental Specialist', 'Lead Surgeon', 'Resident Dental Director', '']:
            doc_match = re.search(r'Lead Doctor:\s*([^(\n]+)', text)
            if doc_match:
                p_doc = doc_match.group(1).strip()
                if p_doc and p_doc not in ['Doctor', 'Lead Dental Surgeon', 'Lead Dental Specialist', 'Lead Surgeon', 'Resident Dental Director']:
                    doc_name = p_doc
                else:
                    doc_name = "Doctor"
            else:
                doc_name = "Doctor"
        
        c = {
            'id': cid,
            'slug': slug,
            'name': clinic_name,
            'doc': doc_name,
            'rating': rating,
            'revs': revs,
            'loc': loc,
            'phone': phone,
            'tpl': tpl,
            'tpl_cap': tpl.capitalize(),
            'channel': channel,
            'contact': contact
        }
        
        if channel == 'Instagram':
            content = generate_instagram_md(c)
        elif channel == 'Email':
            content = generate_email_md(c)
        else:
            content = generate_whatsapp_md(c)
            
        out_path = client_dir / "messages.md"
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"[Generated] Client {cid} ({channel}) -> {out_path}")

if __name__ == "__main__":
    main()
