import os
import json
import re
from pathlib import Path

clinics_dir = Path("C:/Developing/firstmate/projects/Dental-Clinic-Engine/data/clinics")

def clean_concise_name(name):
    n = re.sub(r'\(.*?\)', '', name)
    n = re.split(r'[-–—|:]', n)[0].strip()
    n = re.sub(r'\s+by\s+Dr\..*$', '', n, flags=re.IGNORECASE).strip()
    n = re.sub(r'\s+near\s+.*$', '', n, flags=re.IGNORECASE).strip()
    return n

def condense_short_name(name: str) -> str:
    cleaned = clean_concise_name(name)
    if len(cleaned) <= 20:
        return cleaned

    # 1. Split on connectors: '&', 'and', 'with', 'plus', '+', '/'
    parts = re.split(r'\s+(?:and|&|\+|plus|with|\/)\s+', cleaned, flags=re.IGNORECASE)
    if len(parts) > 1 and len(parts[0].strip()) <= 20 and len(parts[0].strip()) >= 5:
        return parts[0].strip()

    # 2. Strip redundant words from the end/middle if too long
    condensed = cleaned
    patterns_to_strip = [
        r'\s+(?:and|&)\s+Implant\s+(?:Centre|Center|Clinic)$',
        r'\s+(?:and|&)\s+Aesthetic\s+(?:Centre|Center|Clinic)$',
        r'\s+Implant\s+(?:Centre|Center|Clinic)$',
        r'\s+Aesthetic\s+(?:Centre|Center|Clinic)$',
        r'\s+Multispeciality\s+Dental\s+Clinic$',
        r'\s+Multi-speciality\s+Dental\s+Clinic$',
        r'\s+Multispeciality\s+Clinic$',
        r'\s+Multispeciality\s+',
        r'\s+Dental\s+Clinic$',
        r'\s+Dental\s+Centre$',
        r'\s+Dental\s+Center$',
        r'\s+Dental\s+Care$',
        r'\s+Clinic$',
        r'\s+Centre$',
        r'\s+Center$',
    ]
    for pat in patterns_to_strip:
        condensed = re.sub(pat, '', condensed, flags=re.IGNORECASE).strip()
        if len(condensed) <= 20:
            return condensed

    # 3. If still > 20, take whole words up to 20 chars
    words = condensed.split()
    accum = []
    for w in words:
        candidate = ' '.join(accum + [w])
        if len(candidate) <= 20:
            accum.append(w)
        else:
            break
    if accum:
        return ' '.join(accum)

    return condensed[:20].strip()

def main():
    updated_count = 0
    still_over = 0
    for clinic_folder in sorted(clinics_dir.iterdir()):
        if not clinic_folder.is_dir():
            continue
        c_json = clinic_folder / 'clinic.json'
        if not c_json.exists():
            continue
        try:
            data = json.loads(c_json.read_text(encoding='utf-8'))
            cur_short = data.get('shortName', '')
            if len(cur_short) > 20:
                new_short = condense_short_name(cur_short)
                data['shortName'] = new_short
                c_json.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
                updated_count += 1
                if len(new_short) > 20:
                    still_over += 1
                print(f"[{clinic_folder.name}] ({len(cur_short)} -> {len(new_short)}): '{cur_short}' -> '{new_short}'")
        except Exception as e:
            print(f"Error processing {clinic_folder.name}: {e}")

    print(f"\nTotal clinics updated: {updated_count}, still over 20: {still_over}")

if __name__ == '__main__':
    main()
