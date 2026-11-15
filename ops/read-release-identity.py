"""Read-only artifact identity probe; receives no credentials and writes no files."""
import argparse, base64, hashlib, json, os, pathlib, re, stat

def inspect_release(root):
    root = pathlib.Path(root).resolve(strict=True)
    manifest = root / 'manifest.sha256'
    if manifest.is_symlink() or not manifest.is_file(): raise ValueError('Unsafe manifest')
    raw = manifest.read_bytes(); files = []; paths = []; unsafe = []; links = []
    for directory, dirs, names in os.walk(str(root), followlinks=False):
        for name in list(dirs) + names:
            p = pathlib.Path(directory) / name; relative = p.relative_to(root).as_posix(); mode = p.lstat().st_mode
            if stat.S_ISLNK(mode):
                links.append({'path': relative, 'target': os.readlink(str(p)), 'exists': p.exists()})
                if name in dirs: dirs.remove(name)
            elif stat.S_ISREG(mode):
                paths.append(relative)
            elif not stat.S_ISDIR(mode): unsafe.append(relative)
    seen = set()
    for line in raw.decode('utf8').splitlines():
        m = re.fullmatch(r'([0-9a-f]{64})  ([A-Za-z0-9_./-]+)', line)
        if not m: raise ValueError('Invalid manifest syntax')
        name = m.group(2); rel = pathlib.PurePosixPath(name)
        if rel.is_absolute() or '..' in rel.parts or name in seen or name == 'manifest.sha256': raise ValueError('Unsafe/duplicate manifest path')
        seen.add(name); p = root.joinpath(*rel.parts)
        if name not in paths or p.is_symlink() or root not in p.resolve().parents: raise ValueError('Missing/escaping release file')
        h = hashlib.sha256()
        with p.open('rb') as f:
            for block in iter(lambda: f.read(1024*1024), b''): h.update(block)
        files.append({'path': name, 'sha256': h.hexdigest()})
    if manifest.read_bytes() != raw: raise ValueError('Manifest changed during read')
    return {'releaseId':root.name,'manifestRawBase64':base64.b64encode(raw).decode(),'manifestSha256':hashlib.sha256(raw).hexdigest(),'files':files,'regularPaths':paths,'unsafePaths':unsafe,'runtimeLinks':links}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--release');args=parser.parse_args()
    current=pathlib.Path('/www/begapunk/current');active=current.resolve(strict=True)
    if args.release and not re.fullmatch(r'[A-Za-z0-9._-]{6,100}',args.release):raise ValueError('Invalid release id')
    target=(pathlib.Path('/www/begapunk/releases')/args.release).resolve(strict=True) if args.release else active
    if target.parent!=pathlib.Path('/www/begapunk/releases'):raise ValueError('Release escaped boundary')
    report=inspect_release(target);report['activeStable']=current.resolve(strict=True)==active
    if not report['activeStable']:raise ValueError('Current changed during observation')
    print(json.dumps(report))

if __name__=='__main__':main()