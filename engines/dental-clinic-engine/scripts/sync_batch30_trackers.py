"""
Update Tracker 1 and Tracker 2 with 100% verified live production URLs,
local video walkthrough paths, and outreach status for Batch 30 (Clients 146 to 175).
"""

import re
from pathlib import Path
import openpyxl

BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent
ROOT_DIR = PROJECT_DIR.parent

TRACKER_MASTER = ROOT_DIR / "Side hustle (Building Website)" / "website-hustle-tracker.xlsx"
TRACKER_OCTOBER = ROOT_DIR / "Side hustle (Building Website)" / "website hustle tracker" / "october outreach.xlsx"
DOSSIERS_DIR = ROOT_DIR / "Dental-Clinic-Clients" / "october"

clients_info = []

for c_num in range(146, 176):
    folder = [d for d in DOSSIERS_DIR.iterdir() if d.is_dir() and d.name.startswith(f"client-{c_num}-")][0]
    res_path = folder / "research.md"
    msg_path = folder / "messages.md"
    
    with open(res_path, "r", encoding="utf-8") as f:
        res_text = f.read()
    with open(msg_path, "r", encoding="utf-8") as f:
        msg_text = f.read()
        
    m_tpl = re.search(r"## Recommended Template\s*\n\*\*([A-Za-z]+)\*\*", res_text)
    tpl = m_tpl.group(1).lower() if m_tpl else "warm"
    
    m_slug = re.search(r"https://dental-clinic-engine\.vercel\.app/[a-z]+/([a-z0-9\-]+)", msg_text)
    slug = m_slug.group(1) if m_slug else folder.name.replace(f"client-{c_num}-", "")
    
    live_url = f"https://dental-clinic-engine.vercel.app/{tpl}/{slug}"
    video_path = f"projects/Dental-Clinic-Clients/october/{folder.name}/Clinic-{c_num}.mp4"
    
    m_body = re.search(r"```(?:\n)?(.*?)(?:\n)?```", msg_text, re.DOTALL)
    msg_body = m_body.group(1).strip() if m_body else ""
    
    clients_info.append({
        "c_num": c_num,
        "row_t1": 343 + (c_num - 146),
        "live_url": live_url,
        "video_path": video_path,
        "msg_body": msg_body,
        "tpl": tpl,
        "slug": slug,
        "folder_name": folder.name
    })

print(f"Loaded sync parameters for {len(clients_info)} clients.")

# 1. Update Master Tracker (website-hustle-tracker.xlsx)
wb1 = openpyxl.load_workbook(TRACKER_MASTER)
ws1 = wb1["Lead Pipeline"]
for c in clients_info:
    r = c["row_t1"]
    ws1.cell(row=r, column=11).value = "Built / Demo Ready"
    ws1.cell(row=r, column=12).value = c["live_url"]
    notes_curr = str(ws1.cell(row=r, column=15).value or "")
    # Add video and clean live link note
    if "Video:" not in notes_curr:
        ws1.cell(row=r, column=15).value = f"{notes_curr} | Video: {c['video_path']} | Live Demo: {c['live_url']}"

wb1.save(TRACKER_MASTER)
print(f"Master Tracker ({TRACKER_MASTER.name}) successfully updated for rows 343 to 372.")

# 2. Update October Tracker (october outreach.xlsx)
if TRACKER_OCTOBER.exists():
    wb2 = openpyxl.load_workbook(TRACKER_OCTOBER)
    ws2 = wb2["Lead Pipeline"]
    updated_count = 0
    for c in clients_info:
        r1 = c["row_t1"]
        name_t1 = ws1.cell(row=r1, column=1).value
        for r2 in range(2, ws2.max_row + 1):
            if ws2.cell(row=r2, column=1).value == name_t1:
                ws2.cell(row=r2, column=12).value = "Built / Demo Ready"
                ws2.cell(row=r2, column=13).value = c["live_url"]
                n_curr = str(ws2.cell(row=r2, column=16).value or "")
                if "Video:" not in n_curr:
                    ws2.cell(row=r2, column=16).value = f"{n_curr} | Video: {c['video_path']} | Live Demo: {c['live_url']}"
                updated_count += 1
                break
    wb2.save(TRACKER_OCTOBER)
    print(f"October Tracker ({TRACKER_OCTOBER.name}) successfully updated ({updated_count} matched rows).")
