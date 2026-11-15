import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {readApprovalFile,gitLfBytes} from './owner-incremental-acceptance.mjs';
import {LEGACY_COMPOSITE_PROPOSALS,OWNER_COMPOSITE_BASELINE_DECISIONS} from './owner-incremental-trust.mjs';
export const sha=b=>createHash('sha256').update(b).digest('hex');
export const must=(ok,message)=>{if(!ok)throw new Error(message);};
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const safe=p=>typeof p==='string'&&/^[A-Za-z0-9_.\/-]+$/.test(p)&&!p.split('/').some(x=>!x||x==='.'||x==='..')&&!p.startsWith('/');
export function git(root,args){const r=spawnSync('git',args,{cwd:root,maxBuffer:64*1024*1024});must(r.status===0,`Git evidence unavailable: ${args.slice(0,2).join(' ')}`);return r.stdout;}
export function parseManifest(bytes){
 const rows=bytes.toString('utf8').split('\n');if(rows.at(-1)==='')rows.pop();const seen=new Set();
 return rows.map(line=>{const m=/^([0-9a-f]{64})  ([A-Za-z0-9_.\/-]+)$/.exec(line);must(m&&safe(m[2])&&m[2]!=='manifest.sha256'&&!seen.has(m[2]),'Invalid/duplicate manifest path');seen.add(m[2]);return {path:m[2],sha256:m[1]};});
}
export function retained(p,key){const x=p.retainedEvidence[key];must(x&&typeof x.rawBase64==='string','Missing historical evidence');const b=Buffer.from(x.rawBase64,'base64');must(b.toString('base64')===x.rawBase64&&sha(b)===x.rawSha256,'Historical raw evidence digest mismatch');return b;}
export function validateCompositeProposal(bytes,pin,gitBytes){
 must(sha(gitLfBytes(bytes))===pin.sha256,'Composite proposal digest mismatch');const p=JSON.parse(bytes);
 must(p.schemaVersion===1&&p.kind==='KNOWN_LEGACY_COMPOSITE_BASELINE'&&p.status==='PENDING_OWNER_APPROVAL'&&p.ownerEvidence===null&&p.deploymentAuthorized===false,'Original pending proposal was altered');
 must(p.fileCount===810&&p.hotfixes.length===6&&p.entries.length===810,'Composite scope must remain 810 / six');
 for(const k of Object.keys(p.retainedEvidence))retained(p,k);
 const historicalIndex=JSON.parse(retained(p,'historicalEvidenceIndex'));
 for(const [key,name]of Object.entries({beforeManifest:'before-manifest.sha256',afterManifest:'after-manifest.sha256',plan:'release-plan.json',postflight:'postflight-inventory.json'})){const matches=historicalIndex.files.filter(x=>x.file===name);must(matches.length===1&&matches[0].sha256===sha(retained(p,key)),'Original historical evidence index mismatch');}
 const observation=JSON.parse(retained(p,'productionObservation'));must(observation.activeStable===true&&observation.manifestUnchangedDuringRead===true&&observation.manifestFileChecks===810&&observation.manifestFailures.length===0&&observation.activeTargetBefore===`/www/begapunk/releases/${p.releaseId}`&&observation.activeTargetAfter===observation.activeTargetBefore&&observation.manifestSha256===p.manifestRawSha256&&equal(observation.manifestEntries,p.entries),'Recorded production observation mismatch');
 const before=retained(p,'beforeManifest'),after=retained(p,'afterManifest');
 must(sha(after)===p.manifestRawSha256&&equal(parseManifest(after),p.entries),'Composite manifest / list mismatch');
 const old=new Map(parseManifest(before).map(x=>[x.path,x.sha256])),now=new Map(p.entries.map(x=>[x.path,x.sha256]));
 must(old.size===810&&[...old.keys()].every(k=>now.has(k)),'Historical file inventory changed');
 const patch=JSON.parse(retained(p,'patch')),plan=JSON.parse(retained(p,'plan')),post=JSON.parse(retained(p,'postflight'));
 must(equal(patch,p.hotfixes)&&new Set(patch.map(x=>x.file)).size===6,'Patch scope/evidence mismatch');
 must(plan.release_id===p.releaseId&&plan.after_manifest===p.manifestRawSha256&&plan.before_manifest===sha(before),'Release plan binding mismatch');
 must(post.release===`/www/begapunk/releases/${p.releaseId}`&&post.manifest_sha256===p.manifestRawSha256&&post.manifest_entries===810&&post.six_after_matches===true,'Historical postflight mismatch');
 const report=retained(p,'ownerHistoricalReport').toString('utf8');must(report.includes(p.releaseId)&&report.includes(p.manifestRawSha256),'Missing historical owner acceptance report');
 const changed=[...old].filter(([k,v])=>v!==now.get(k)).map(([k])=>k).sort();must(equal(changed,patch.map(x=>x.file).sort()),'Unknown seventh hotfix or missing patch');
 const generated=p.generatedFile;must(generated&&old.get(generated.path)===generated.rawSha256&&now.get(generated.path)===generated.rawSha256,'Generated IndexNow identity changed');
 const generation=generated.generationEvidence;must(generation&&generation.commit===p.gitBase&&generation.path==='scripts/build-production-release.mjs','Missing original IndexNow generator');const builder=gitBytes(generation.commit,generation.path);must(sha(builder)===generation.rawSha256&&builder.toString().includes("await writeFile(path.join(outputRoot, `${indexNowKey}.txt`), indexNowKey, 'utf8');"),'IndexNow historical generator mismatch');
 const generatedBytes=Buffer.from(generated.rawBase64,'base64');must(sha(generatedBytes)===generated.rawSha256&&generatedBytes.toString().trim()===generated.path.replace(/\.txt$/,''),'IndexNow generation proof mismatch');
 for(const row of p.entries){if(row.path===generated.path)continue;const fix=patch.find(x=>x.file===row.path);const original=sha(gitBytes(p.gitBase,row.path));must(original===(fix?fix.before_sha256:row.sha256),`Git base byte mismatch: ${row.path}`);if(fix)must(fix.before_sha256===old.get(row.path)&&fix.after_sha256===row.sha256,`Hotfix byte binding mismatch: ${row.path}`);}
 return p;
}
export function validateCompositeDecision({proposal,pin,decisionBytes,decisionPin,evidenceBytes}){
 must(decisionPin&&sha(gitLfBytes(decisionBytes))===decisionPin.sha256,'PENDING_OWNER_APPROVAL: no pinned composite decision');const d=JSON.parse(decisionBytes),e=JSON.parse(evidenceBytes);
 must(d.status==='APPROVED'&&d.decision==='OWNER_APPROVED_COMPOSITE_BASELINE_FACTS'&&d.deploymentAuthorized===false,'Missing explicit composite owner approval');
 must(d.proposalSha256===pin.sha256&&decisionPin.proposalSha256===pin.sha256&&d.previousRecordSha256===pin.sha256,'Append-only composite decision mismatch');
 must(d.releaseId===proposal.releaseId&&d.gitBase===proposal.gitBase&&d.manifestRawSha256===proposal.manifestRawSha256,'Approved composite identity mismatch');
 must(d.ownerEvidencePath===decisionPin.ownerEvidencePath&&d.ownerEvidenceSha256===decisionPin.ownerEvidenceSha256&&sha(gitLfBytes(evidenceBytes))===d.ownerEvidenceSha256,'Composite owner evidence digest mismatch');
 must(typeof d.authorizationReference==='string'&&d.authorizationReference.length>=8&&e.authorizationReference===d.authorizationReference&&e.proposalSha256===pin.sha256&&e.decision===d.decision&&e.deploymentAuthorized===false,'Owner did not authorize this exact composite proposal');
 must(Number.isFinite(Date.parse(e.approvedAt))&&Date.parse(e.approvedAt)<=Date.now(),'Invalid owner decision time');return d;
}
export async function loadComposite(root){
 must(LEGACY_COMPOSITE_PROPOSALS.length===1,'Known composite proposal registry missing');const pin=LEGACY_COMPOSITE_PROPOSALS[0];
 const p=validateCompositeProposal(await readApprovalFile(root,pin.path),pin,(ref,file)=>git(root,['show',`${ref}:${file}`]));return {proposal:p,pin};
}
export async function requireCompositeOwner(root,loaded){
 const pin=OWNER_COMPOSITE_BASELINE_DECISIONS.find(x=>x.proposalSha256===loaded.pin.sha256);must(pin,'PENDING_OWNER_APPROVAL: explicit composite baseline recognition required');
 return validateCompositeDecision({proposal:loaded.proposal,pin:loaded.pin,decisionBytes:await readApprovalFile(root,pin.path),decisionPin:pin,evidenceBytes:await readApprovalFile(root,pin.ownerEvidencePath)});
}
export function validateObservedFiles(observation){
 must(observation.activeStable===true&&typeof observation.releaseId==='string','Active release changed during observation');
 const raw=Buffer.from(observation.manifestRawBase64||'','base64');must(raw.toString('base64')===observation.manifestRawBase64&&sha(raw)===observation.manifestSha256,'Observed manifest digest mismatch');
 must(Array.isArray(observation.runtimeLinks)&&observation.runtimeLinks.every(x=>x.exists===true&&((x.path==='.well-known'&&x.target==='/www/begapunk/shared/.well-known')||(/^WW_verify_[A-Za-z0-9]+[.]txt$/.test(x.path)&&x.target==='/www/begapunk/shared/'+x.path))),'Unsafe shared symlink');
 const entries=parseManifest(raw),actual=observation.files;must(Array.isArray(actual)&&actual.length===entries.length&&new Set(actual.map(x=>x.path)).size===actual.length,'Observed file coverage mismatch');
 const map=new Map(actual.map(x=>[x.path,x.sha256]));for(const f of entries)must(map.get(f.path)===f.sha256,`Live file changed: ${f.path}`);
 must(equal([...observation.regularPaths].sort(),[...entries.map(x=>x.path),'manifest.sha256'].sort()),'Extra/missing release file');
 must(Array.isArray(observation.unsafePaths)&&observation.unsafePaths.length===0,'Unsafe production path');return entries;
}
export function validateKnownCompositeObservation(proposal,observation,candidate,isAncestor){
 const entries=validateObservedFiles(observation);const expectedLinks=JSON.parse(retained(proposal,'postflight')).symlinks.map(x=>({path:x.path,target:x.target,exists:x.exists}));must(equal([...observation.runtimeLinks].sort((a,b)=>a.path.localeCompare(b.path)),expectedLinks.sort((a,b)=>a.path.localeCompare(b.path))),'Legacy shared bindings changed');must(observation.releaseId===proposal.releaseId,'Unknown legacy release');
 must(observation.manifestSha256===proposal.manifestRawSha256&&equal(entries,proposal.entries),'Legacy manifest not approved');
 must(/^[0-9a-f]{40}$/.test(candidate)&&candidate!==proposal.gitBase&&isAncestor(proposal.gitBase,candidate),'Wrong/non-ancestor Git base');
 return {identityKind:'KNOWN_LEGACY_COMPOSITE',releaseId:proposal.releaseId,gitBase:proposal.gitBase,activeCommit:null,manifestSha256:proposal.manifestRawSha256};
}
export function normalReleasePrefix(id){const m=/^\d{8}-\d{6}-([0-9a-f]{12})(?:-r[0-9]+)?$/.exec(id);must(m,'Unknown legacy release; asset hash is not a Git identity');return m[1];}
// The known composite cannot evade its approval by adopting a Git-looking name.
export function assertNormalReleaseOutsideKnownComposite(proposal,observation,baseline){
 must(baseline!==proposal.gitBase&&observation.manifestSha256!==proposal.manifestRawSha256,'Known composite base/manifest requires the exact registered release identity');
}
