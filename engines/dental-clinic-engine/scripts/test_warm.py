import urllib.request

req = urllib.request.Request('http://localhost:3000/warm/dr-pratibha-dental-and-aesthetic-clinic', headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as resp:
    html = resp.read().decode('utf-8')

idx = html.find('id="comfort-protocol"')
print('section id="comfort-protocol" index:', idx)
if idx != -1:
    print(html[idx:idx+2500])
else:
    print("NOT FOUND!")
