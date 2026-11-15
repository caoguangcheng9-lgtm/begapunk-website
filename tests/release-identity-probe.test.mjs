import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const probe=fileURLToPath(new URL('../ops/read-release-identity.py',import.meta.url));
for(const mode of ['valid','changed','extra','missing','traversal','duplicate','file-symlink','manifest-symlink']) {
 test(`read-only identity probe: ${mode}`,{skip:process.platform==='win32'&&mode.includes('symlink')},()=>{
 const program=String.raw`import importlib.util,tempfile,pathlib,hashlib,json,sys
spec=importlib.util.spec_from_file_location('probe',sys.argv[1]);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
mode=sys.argv[2]
with tempfile.TemporaryDirectory() as d:
 root=pathlib.Path(d)/'release';root.mkdir();body=b'approved';digest=hashlib.sha256(body).hexdigest()
 (root/'page.html').write_bytes(body);manifest=digest+'  page.html\n';(root/'manifest.sha256').write_text(manifest)
 if mode=='changed':(root/'page.html').write_bytes(b'not approved')
 if mode=='extra':(root/'extra.txt').write_bytes(b'unknown')
 if mode=='missing':(root/'page.html').unlink()
 if mode=='traversal':(root/'manifest.sha256').write_text(digest+'  ../outside\n')
 if mode=='duplicate':(root/'manifest.sha256').write_text(manifest+manifest)
 if mode=='file-symlink':
  outside=pathlib.Path(d)/'outside';outside.write_bytes(body);(root/'page.html').unlink();(root/'page.html').symlink_to(outside)
 if mode=='manifest-symlink':
  outside=pathlib.Path(d)/'outside-manifest';outside.write_text(manifest);(root/'manifest.sha256').unlink();(root/'manifest.sha256').symlink_to(outside)
 try:
  result=m.inspect_release(root)
 except ValueError:
  assert mode in ['missing','traversal','duplicate','file-symlink','manifest-symlink'];sys.exit(0)
 assert mode in ['valid','changed','extra']
 assert (result['files'][0]['sha256']==digest)==(mode!='changed')
 assert ('extra.txt' in result['regularPaths'])==(mode=='extra')
 assert sorted(p.name for p in root.iterdir())==sorted(result['regularPaths'])
`;
 const result=spawnSync(process.platform==='win32'?'python':'python3',['-B','-c',program,probe,mode],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr||String(result.error));
 });
}
