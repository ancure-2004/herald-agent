import urllib.request
import re

for template, url in [
    ('modern', 'http://localhost:3000/modern/complete-dental-care-by-dr-latika'),
    ('premium', 'http://localhost:3000/premium/dr-buttan-s-dental-care'),
    ('warm', 'http://localhost:3000/warm/dr-pratibha-dental-and-aesthetic-clinic')
]:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as resp:
        html = resp.read().decode('utf-8')
    
    # Check services section
    if template == 'modern':
        m = re.search(r'<section id="spectrum"[\s\S]*?</section>', html)
        section = m.group(0) if m else ''
        cards = len(re.findall(r'group rounded-3xl', section))
    elif template == 'premium':
        m = re.search(r'<section id="services"[\s\S]*?</section>', html)
        section = m.group(0) if m else ''
        cards = len(re.findall(r'rounded-3xl bg-white border border-stone-200', section))
    else: # warm
        m = re.search(r'<section id="cosmetic-suite"[\s\S]*?</section>', html)
        section = m.group(0) if m else ''
        cards = len(re.findall(r'group bg-white rounded-3xl', section))
        
    # Check FAQ section
    m_faq = re.search(r'<section id="faq"[\s\S]*?</section>', html)
    faq_section = m_faq.group(0) if m_faq else ''
    # FAQ questions in SharedFaq have button with toggle
    faq_items = len(re.findall(r'<button[^>]*class="[^"]*w-full[^"]*text-left[^"]*"', faq_section))
    
    # Scheduler treatment options
    m_sched = re.search(r'<section id="scheduler"[\s\S]*?</section>', html)
    sched_section = m_sched.group(0) if m_sched else ''
    sched_services = len(re.findall(r'Standard Visit|recoveryTime', sched_section)) + len(re.findall(r'1\. Select Treatment:[\s\S]*?2\. Select Preferred Time:', sched_section))
    
    print(f"{template.upper()}:")
    print(f"  Dedicated Service Cards in section: {cards}")
    print(f"  FAQ Question Buttons in #faq: {faq_items}")
