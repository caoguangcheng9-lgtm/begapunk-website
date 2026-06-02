with open(r'E:\begapunk-site-v2\BP-1P-0003.html', 'rb') as f:
    raw = f.read()

# Find header section
h_start = raw.find(b'<header')
h_end = raw.find(b'</header>')
header = raw[h_start:h_end+9]

# Find all non-ASCII bytes in header and show context
print('=== Non-ASCII bytes in BP-1P-0003.html header ===')
for i, b in enumerate(header):
    if b > 127:
        ctx_start = max(0, i-30)
        ctx_end = min(len(header), i+30)
        ctx = header[ctx_start:ctx_end]
        safe = ctx.decode('utf-8', 'replace').encode('ascii', 'replace').decode('ascii')
        print(f'  byte 0x{b:02x} at header pos {i}: ...{safe}...')

# Also check: is there any text between nav items that looks garbled?
print()
print('=== All text segments in header nav ===')
import re
nav_start = header.find(b'<nav')
nav_end = header.find(b'</nav>')
nav = header[nav_start:nav_end+6] if nav_start >= 0 and nav_end >= 0 else header

texts = re.findall(rb'>([^<]{1,80})<', nav)
for t in texts:
    dec = t.decode('utf-8', 'replace')
    safe = dec.encode('ascii', 'replace').decode('ascii')
    if '?' in safe or '??' in safe:
        print(f'  GARBLED: {repr(t)}')
    elif dec.strip():
        print(f'  OK: {safe[:60]}')
