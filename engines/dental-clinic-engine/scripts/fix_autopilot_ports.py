import os
import re

base_dir = r"C:\Developing\firstmate\projects\Side hustle (Building Website)\dispatch-cockpit"

# 1. ig_autopilot.mjs
ig_path = os.path.join(base_dir, "ig_autopilot.mjs")
with open(ig_path, "r", encoding="utf-8") as f:
    ig_text = f.read()

ig_text = ig_text.replace("http://127.0.0.1:5000", "${COCKPIT_BASE}")
if "const COCKPIT_BASE" not in ig_text:
    ig_text = ig_text.replace(
        "const VERIFIED_HANDLES_FILE = path.join(__dirname, 'ig_verified_handles.json');",
        "const VERIFIED_HANDLES_FILE = path.join(__dirname, 'ig_verified_handles.json');\nconst COCKPIT_PORT = process.env.PORT || 8765;\nconst COCKPIT_BASE = `http://127.0.0.1:${COCKPIT_PORT}`;"
    )
with open(ig_path, "w", encoding="utf-8") as f:
    f.write(ig_text)
print("Updated ig_autopilot.mjs")

# 2. wa_autopilot.mjs
wa_path = os.path.join(base_dir, "wa_autopilot.mjs")
with open(wa_path, "r", encoding="utf-8") as f:
    wa_text = f.read()

wa_text = wa_text.replace("http://127.0.0.1:5000", "${COCKPIT_BASE}")
if "const COCKPIT_BASE" not in wa_text:
    wa_text = wa_text.replace(
        'const WA_SESSION_DIR = path.join(__dirname, ".wa_session");',
        'const WA_SESSION_DIR = path.join(__dirname, ".wa_session");\nconst COCKPIT_PORT = process.env.PORT || 8765;\nconst COCKPIT_BASE = `http://127.0.0.1:${COCKPIT_PORT}`;'
    )
with open(wa_path, "w", encoding="utf-8") as f:
    f.write(wa_text)
print("Updated wa_autopilot.mjs")

# 3. email_autopilot.py
em_path = os.path.join(base_dir, "email_autopilot.py")
with open(em_path, "r", encoding="utf-8") as f:
    em_text = f.read()

em_text = em_text.replace('"http://127.0.0.1:5000/api/batch"', 'f"{COCKPIT_BASE}/api/batch"')
em_text = em_text.replace('"http://127.0.0.1:5000/api/mark-sent"', 'f"{COCKPIT_BASE}/api/mark-sent"')
if "COCKPIT_BASE =" not in em_text:
    em_text = em_text.replace(
        "BASE_DIR = os.path.dirname(os.path.abspath(__file__))",
        'BASE_DIR = os.path.dirname(os.path.abspath(__file__))\nCOCKPIT_PORT = os.environ.get("PORT", "8765")\nCOCKPIT_BASE = f"http://127.0.0.1:{COCKPIT_PORT}"'
    )
with open(em_path, "w", encoding="utf-8") as f:
    f.write(em_text)
print("Updated email_autopilot.py")
