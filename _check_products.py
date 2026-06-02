with open(r'E:\begapunk-site-v2\products.html', 'rb') as f:
    raw = f.read()

# Find product card area
idx = raw.find(b'BP-2P-08-0001')
if idx >= 0:
    ctx = raw[max(0,idx-50):idx+150]
    print('=== Raw bytes around BP-2P-08-0001 ===')
    print(repr(ctx))
    print()
    print('Hex:', ctx.hex())
    print()
    
    # Try decode
    try:
        dec = ctx.decode('utf-8')
        print('UTF-8 decode:', repr(dec))
    except Exception as e:
        print('UTF-8 FAIL:', e)
        dec = ctx.decode('utf-8', 'replace')
        print('With replace:', repr(dec))
