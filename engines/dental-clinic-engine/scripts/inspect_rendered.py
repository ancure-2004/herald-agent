import urllib.request
import re

def inspect_page(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as resp:
        return resp.read().decode('utf-8')

# 1. Modern Page inspection
url_modern = 'http://localhost:3000/modern/complete-dental-care-by-dr-latika'
html_modern = inspect_page(url_modern)

print('=== MODERN TEMPLATE AUDIT ===')
# Hero metrics cards in Modern
hero_metrics = re.findall(r'border-slate-200/90 shadow-2xs hover:border-gold-400', html_modern)
print(f'Hero metric cards count in Modern: {len(hero_metrics)}')

# Review wall trust cards
review_trust_cards = re.findall(r'shadow-card-soft hover:shadow-luxury hover:border-gold-400', html_modern)
print(f'Review wall trust cards count in Modern: {len(review_trust_cards)}')

# CTAs placement in hero
cta_reserve = 'Reserve Smile Consultation' in html_modern
cta_whatsapp = 'Quick WhatsApp Chat' in html_modern
print(f'Hero CTAs: Reserve={cta_reserve}, WhatsApp={cta_whatsapp}')

# Text wrapping checks
print(f"Hero metrics container classes: 'grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3.5 py-2'")
print(f"Contains 'break-words' on metric labels: {'break-words' in html_modern}")

# 2. Premium Page inspection
url_premium = 'http://localhost:3000/premium/dr-buttan-s-dental-care'
html_premium = inspect_page(url_premium)
print('\n=== PREMIUM TEMPLATE AUDIT ===')
# Stat cards
stat_cards = re.findall(r'bg-white border border-stone-200/80 shadow-xs space-y-0\.5', html_premium)
print(f'Hero stat cards count in Premium: {len(stat_cards)}')
has_mobile_stat_grid = 'grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 pt-2 max-w-lg' in html_premium
print(f'Mobile stat card grid wrapping class present: {has_mobile_stat_grid}')

# Sanctuary section
sanctuary_id = 'id="sanctuary"' in html_premium
nav_sanctuary = 'href="#sanctuary"' in html_premium
print(f'Sanctuary section (id="sanctuary") present: {sanctuary_id}')
print(f'Navbar href="#sanctuary" link present: {nav_sanctuary}')

# Doctor spotlight
doc_section = 'id="doctor"' in html_premium
doc_name_in_spotlight = 'Dr. Buttan' in html_premium
doc_creds = 'Clinical Standard' in html_premium
print(f'Doctor spotlight present: {doc_section}, Lead doctor rendered: {doc_name_in_spotlight}')

# Google review link destinations
google_links = re.findall(r'href="(https://[^"]*google[^"]*|https://maps\.google[^"]*)"', html_premium)
print(f'Google review link destinations count: {len(google_links)}')
for gl in google_links[:4]:
    print(f'  Link: {gl}')

# 3. Warm Page inspection
url_warm = 'http://localhost:3000/warm/dr-pratibha-dental-and-aesthetic-clinic'
html_warm = inspect_page(url_warm)
print('\n=== WARM TEMPLATE AUDIT ===')
# Comfort phases (4 steps)
phases = re.findall(r'PHASE\s+(\d+)', html_warm)
print(f'Comfort phases count: {len(phases)} (Phases: {phases})')
has_4_phases = len(phases) == 4
print(f'Exactly 4 phases verified: {has_4_phases}')

# Denture comparison table behavior
has_denture_section = 'id="denture-comfort"' in html_warm
has_desktop_table = 'hidden lg:block' in html_warm and '<table' in html_warm
has_mobile_cards = 'lg:hidden divide-y divide-rose-100' in html_warm
print(f'Denture section present: {has_denture_section}')
print(f'Desktop table view (hidden lg:block): {has_desktop_table}')
print(f'Mobile card view (lg:hidden): {has_mobile_cards}')

# Button color contrast in scheduler & sticky bar
scheduler_present = 'id="scheduler"' in html_warm
print(f'Scheduler present: {scheduler_present}')
sticky_bar_present = 'Fixed' in html_warm or 'bottom-0' in html_warm or 'Book Slot' in html_warm or 'Book Appointment' in html_warm or 'tel:' in html_warm
print(f'Sticky bar elements present: {sticky_bar_present}')
