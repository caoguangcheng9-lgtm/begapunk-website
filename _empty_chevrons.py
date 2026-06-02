import os, glob

root = r'E:\begapunk-site-v2'
files = glob.glob(os.path.join(root, '*.html'))

fixed = 0
total = 0
for fpath in sorted(files):
    with open(fpath, 'rb') as f:
        raw = f.read()
    
    original = raw
    # Replace <span class="chevron">&#9660;</span> with <span class="chevron"></span>
    raw = raw.replace(b'<span class="chevron">&#9660;</span>', b'<span class="chevron"></span>')
    
    count = (len(original) - len(raw)) // 20  # approx 20 chars diff per replacement
    if raw != original:
        with open(fpath, 'wb') as f:
            f.write(raw)
        print(os.path.basename(fpath) + ': ' + str(count) + ' chevrons emptied')
        fixed += 1
        total += count

print()
print('Files fixed: ' + str(fixed))
print('Total chevrons emptied: ' + str(total))

# Verify
print()
print('=== Verification ===')
for fpath in sorted(files):
    with open(fpath, 'rb') as f:
        raw = f.read()
    
    bad = raw.count(b'<span class="chevron">&#9660;</span>')
    good = raw.count(b'<span class="chevron"></span>')
    if bad > 0 or good > 0:
        print(os.path.basename(fpath) + ': bad=' + str(bad) + ', good=' + str(good))
