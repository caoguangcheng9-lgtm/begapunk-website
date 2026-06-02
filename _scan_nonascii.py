import glob, os

root = r'E:\begapunk-site-v2'
files = glob.glob(os.path.join(root, '*.html'))

for fpath in sorted(files):
    with open(fpath, 'rb') as f:
        raw = f.read()
    
    fname = os.path.basename(fpath)
    
    # Find product card areas (pd-card or product-card)
    card_starts = []
    idx = 0
    while True:
        idx = raw.find(b'pd-card', idx)
        if idx < 0:
            break
        card_starts.append(idx)
        idx += 1
    
    if not card_starts:
        continue
    
    non_ascii_count = sum(1 for b in raw if b > 127)
    if non_ascii_count == 0:
        print(f'{fname}: {len(card_starts)} cards, clean')
        continue
    
    print(f'=== {fname} ({len(card_starts)} cards, {non_ascii_count} non-ASCII bytes) ===')
    
    # Show first few non-ASCII bytes with context
    shown = 0
    for i, b in enumerate(raw):
        if b > 127:
            ctx_start = max(0, i-20)
            ctx_end = min(len(raw), i+20)
            ctx = raw[ctx_start:ctx_end]
            safe = ctx.decode('utf-8', 'replace').encode('ascii', 'replace').decode('ascii')
            print(f'  pos {i}: 0x{b:02x}, ...{safe}...')
            shown += 1
            if shown >= 10:
                print('  ...')
                break
    print()