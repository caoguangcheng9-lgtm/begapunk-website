import os, glob, re

root = r'E:\begapunk-site-v2'
files = glob.glob(os.path.join(root, '*.html'))

total_fixed = 0

for fpath in sorted(files):
    with open(fpath, 'rb') as f:
        raw = f.read()
    
    original = raw
    
    # Find and replace all HTML comments containing non-ASCII bytes
    # These are damaged GBK-encoded Chinese comments
    def clean_comment(match):
        comment = match.group(1)
        # If comment has any bytes > 127, check if it's garbled
        has_high = any(b > 127 for b in comment)
        if has_high:
            # Try to decode - if it fails or contains replacement chars, it's garbled
            try:
                decoded = comment.decode('utf-8')
                if '\ufffd' in decoded or '?' in decoded:
                    return b'<!-- SECTION -->'
                return match.group(0)  # keep valid UTF-8
            except:
                return b'<!-- SECTION -->'
        return match.group(0)  # keep ASCII-only comments
    
    cleaned = re.sub(rb'<!--(.*?)-->', clean_comment, raw, flags=re.DOTALL)
    
    if cleaned != original:
        diff = len(original) - len(cleaned)
        with open(fpath, 'wb') as f:
            f.write(cleaned)
        print(os.path.basename(fpath) + ': cleaned garbled comments (size diff=' + str(diff) + ')')
        total_fixed += 1

print()
print('Files cleaned: ' + str(total_fixed))

# Verify no garbled comments remain
print()
print('=== Verification ===')
for fpath in sorted(files):
    with open(fpath, 'rb') as f:
        raw = f.read()
    
    comments = re.findall(rb'<!--(.*?)-->', raw, re.DOTALL)
    bad = []
    for c in comments:
        try:
            decoded = c.decode('utf-8')
            if '\ufffd' in decoded:
                bad.append(c[:40])
        except:
            bad.append(c[:40])
    
    if bad:
        print(os.path.basename(fpath) + ' STILL HAS GARBLED: ' + str(len(bad)))

print('Verification complete')
