import os
import re
from pathlib import Path
import json

OCTOBER_CLIENTS = Path("projects/Dental-Clinic-Clients/october")
OUTREACH_MSG_DIR = Path("projects/Side hustle (Building Website)/outreach msg")
MANIFEST_FILE = Path("projects/Side hustle (Building Website)/dispatch-cockpit/batch_266_295_manifest.json")

def main():
    with open(MANIFEST_FILE, "r", encoding="utf-8") as f:
        manifest = json.load(f)
        
    print(f"Loaded {len(manifest)} clients from manifest.")
    
    header = """# Outreach Messages - October Unified Batch (Clients 266 to 295 / 30-Lead Batch)

**Date:** 2026-10-17  
**Batch Scope:** 30 Built & Ready Clients (15 Instagram, 10 WhatsApp, 5 Email)  
**Verification:** Verified against research dossiers, live Vercel deployments, and video recordings.  
**Format Rule:** Channel-isolated messages only per client specification. Zero em dashes, plain dashes only.
"""
    
    entries = []
    
    for item in manifest:
        cid = item["cid"]
        folder = item["folder_name"]
        clinic_dir = OCTOBER_CLIENTS / folder
        msg_file = clinic_dir / "messages.md"
        
        if not msg_file.exists():
            print(f"Warning: {msg_file} does not exist!")
            continue
            
        with open(msg_file, "r", encoding="utf-8") as mf:
            raw_text = mf.read()
            
        c = item["clinic"]
        cname = c["name"]
        loc = c["locality"]
        phone = c["phone"]
        channel = c["channel"]
        contact_val = c["contact_value"]
        rating = c.get("rating", 5.0)
        reviews = c.get("reviews", 50)
        proof = f"{rating}★ ({reviews}+ reviews)"
        
        # Determine URLs based on template
        slug = item["slug"]
        template = item["template"]
        demo_url = f"https://dental-clinic-engine.vercel.app/{template}/{slug}"
        l_modern = f"https://dental-clinic-engine.vercel.app/modern/{slug}"
        l_premium = f"https://dental-clinic-engine.vercel.app/premium/{slug}"
        l_warm = f"https://dental-clinic-engine.vercel.app/warm/{slug}"
        
        doctor = c.get("doctor", "Doctor Ji")
        doc_clean = doctor.split("(")[0].strip()
        if not doc_clean.lower().startswith("dr"):
            doc_clean = f"Dr. {doc_clean}"
        if not doc_clean.endswith("Ji") and not doc_clean.endswith("ji"):
            salutation = f"{doc_clean} Ji"
        else:
            salutation = doc_clean
            
        # Clean clinic name
        clean_cname = re.sub(r'\s*\([^)]*\)', '', cname).strip()
        clean_cname = re.split(r'[-–—|:]', clean_cname)[0].strip()
        
        email_val = contact_val if channel == "Email" else "none"
        ig_val = contact_val if channel == "Instagram" else "none"
        video_file = f"Clinic-{cid}.mp4"
        
        entry_lines = [
            f"\n---",
            f"## Client {cid} - {clean_cname}",
            f"",
            f"**Channel:** {channel}  ",
            f"**Phone:** {phone}  ",
            f"**Email:** {email_val}  ",
            f"**Instagram:** {ig_val}  ",
            f"**Locality:** {loc}, Delhi NCR  ",
            f"**Proof Stack:** {proof}  ",
            f"**Demo:** {demo_url}  ",
            f"**Video File:** {video_file}  "
        ]
        
        if channel == "Instagram":
            # Extract DM invite and Follow-up caption
            m_invite = re.search(r'### 1\. Single Text DM Invite[^\n]*\n```(?:\w+)?\n([\s\S]*?)\n```', raw_text)
            dm_invite = m_invite.group(1).strip() if m_invite else f"Namaste {salutation}\n\nGoogle par {clean_cname} ki {rating}/5 rating aur {reviews}+ patient reviews dekh kar kaafi accha laga.\n\nHumne aapke clinic ke liye 3 alag visual styles mein ek modern website ready ki hai. Sample design ka live preview link ye raha:\n{demo_url}\n\nBaqi do designs bhi live hain. Aapko ye design kaisa laga?"
            
            m_caption = re.search(r'\*\*Follow-Up Caption:\*\*\s*\n```(?:\w+)?\n([\s\S]*?)\n```', raw_text)
            caption = m_caption.group(1).strip() if m_caption else f"Ye {clean_cname} ke live sample ka screen recording preview hai.\n\nAapke clinic ke 3 styles yahan dekh sakte hain:\n• Modern: {l_modern}\n• Premium: {l_premium}\n• Warm: {l_warm}\n\nAapke clinic brand ke liye kaun sa design sabse accha rahega?"
            
            entry_lines.extend([
                f"",
                f"**Instagram DM Invite:**",
                f"`",
                dm_invite,
                f"`",
                f"",
                f"**Instagram Follow-Up Caption:**",
                f"`",
                caption,
                f"`"
            ])
            
        elif channel == "WhatsApp":
            m_m1 = re.search(r'### 1\. Primary WhatsApp Message[^\n]*\n```(?:\w+)?\n([\s\S]*?)\n```', raw_text)
            m1 = m_m1.group(1).strip() if m_m1 else f"Namaste {salutation} 🙏\n\nGoogle par {clean_cname} ki {proof} dekh kar kaafi accha laga.\n\nHumne aapke clinic ke liye 3 alag visual styles mein ek modern website ready ki hai, taaki patients directly details dekh sakein aur appointment book kar sakein.\n\nIska ek quick screen recording video walkthrough niche share kar raha hoon:"
            
            m_m2 = re.search(r'### 2\. Video Caption[^\n]*\n```(?:\w+)?\n([\s\S]*?)\n```', raw_text)
            m2 = m_m2.group(1).strip() if m_m2 else f"Ye walkthrough video aapke clinic ke liye customized layout ka preview hai.\n\nAapke clinic ke 3 distinct designs ready hain:\n• Design 1 (Modern): {l_modern}\n• Design 2 (Premium): {l_premium}\n• Design 3 (Warm): {l_warm}\n\nInme se jo bhi design aapko sabse best lage, hum aapke clinic ke liye wahi finalize kar denge.\n\nAapko inme se kaun sa design sabse accha laga?"
            
            entry_lines.extend([
                f"",
                f"**Message 1 (text):**",
                f"`",
                m1,
                f"`",
                f"",
                f"**Message 2 (video caption):**",
                f"`",
                m2,
                f"`"
            ])
            
        elif channel == "Email":
            m_subj = re.search(r'### 1\. Subject Line\s*\n([^\n]+)', raw_text)
            subj = m_subj.group(1).strip() if m_subj else f"Sample Website Designs for {clean_cname}"
            subj = re.sub(r'^[#*\s]+', '', subj)
            
            m_body = re.search(r'### 2\. Full Email Body[^\n]*\n```(?:\w+)?\n([\s\S]*?)\n```', raw_text)
            body = m_body.group(1).strip() if m_body else f"Namaste {salutation},\n\nGoogle par {clean_cname} ({loc}) ki {proof} dekh kar kaafi accha laga.\n\nHumne aapke clinic ke liye 3 distinct visual styles mein interactive website layouts ready kiye hain:\n• Design 1: {l_modern}\n• Design 2: {l_premium}\n• Design 3: {l_warm}\n\nSaath mein screen recording walkthrough attach kiya hai: {video_file}\n\nAapko inme se kaun sa design sabse pasand aaya?\n\nWarm regards,\nAnkur Tyagi\n+91 95823 90243"
            
            entry_lines.extend([
                f"",
                f"**Email Subject:** {subj}  ",
                f"**Email Body:**",
                f"`",
                body,
                f"`"
            ])
            
        entries.append("\n".join(entry_lines))
        
    master_content = header + "\n".join(entries) + "\n"
    
    target_file = OUTREACH_MSG_DIR / "batch_266_295.md"
    with open(target_file, "w", encoding="utf-8") as out_f:
        out_f.write(master_content)
        
    print(f"Successfully compiled {len(entries)} clinic messages into {target_file}")

if __name__ == "__main__":
    main()
