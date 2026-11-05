import os
import re
import json
import argparse
from pathlib import Path

ENGINE_DIR = Path(__file__).resolve().parent.parent

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--month", type=str, default="october", help="Month folder")
    parser.add_argument("--start", type=int, required=True, help="Start client number")
    parser.add_argument("--end", type=int, required=True, help="End client number")
    args = parser.parse_args()

    DOSSIERS_ROOT = ENGINE_DIR.parent / "Dental-Clinic-Clients" / args.month
    
    client_dirs = sorted([d for d in DOSSIERS_ROOT.iterdir() if d.is_dir() and d.name.startswith("client-")],
                         key=lambda p: int(re.match(r'client-(\d+)-', p.name).group(1)) if re.match(r'client-(\d+)-', p.name) else 0)
    
    target_dirs = [d for d in client_dirs if args.start <= int(re.match(r'client-(\d+)-', d.name).group(1)) <= args.end]
    
    batch_data = []
    
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
        
        tpl = "modern"
        tpl_match = re.search(r'## Recommended Template\s*\n\*\*([A-Za-z]+)\*\*', text)
        if tpl_match:
            tpl = tpl_match.group(1).strip().lower()
            
        batch_data.append({
            "name": f"Clinic-{cid}",
            "url": f"https://dental-clinic-engine.vercel.app/{tpl}/{slug}"
        })
        
    batch_file = ENGINE_DIR.parent / "Side hustle (Building Website)" / "dental-batch-recorder" / "batch.json"
    
    with open(batch_file, "w", encoding="utf-8") as f:
        json.dump(batch_data, f, indent=2)
        
    print(f"Successfully populated {len(batch_data)} clinics into {batch_file}")

if __name__ == "__main__":
    main()
