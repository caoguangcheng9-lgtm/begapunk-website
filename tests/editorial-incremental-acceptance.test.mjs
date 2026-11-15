import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {rawSha256,gitLfBytes,validateBoundIncrement,readPinnedRecord,verifyOwnerArtifact,verifyEditorialIncrement,readApprovalFile} from '../scripts/lib/owner-incremental-acceptance.mjs';
import {OWNER_INCREMENTAL_DECISIONS,INCREMENTAL_PROPOSALS} from '../scripts/lib/owner-incremental-trust.mjs';
import {assertSocialIncrement,SOCIAL_INCREMENT_SCOPE} from '../scripts/lib/approval-social-delta.mjs';
import {createArtifactSnapshot,applyMechanicalOnlySnapshots,assertIncrementalSnapshotTransition} from '../scripts/lib/editorial-artifact-snapshot.mjs';
import {OFFICIAL_SOCIAL_CHANNELS} from '../scripts/lib/official-social-channels.mjs';

// Entirely fictional content/path/authorization. No real candidate is approved
// or registered, even in an isolated file. The production decision list is empty.
const relative='de/approval-fixture.html';
const urls=OFFICIAL_SOCIAL_CHANNELS.map(c=>c.url);
const svg='<svg class="footer-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 3h4v4H3Z"/></svg>';
const ig='<svg class="footer-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.75"/></svg>';
function html(updated=false){
 const channels=updated?OFFICIAL_SOCIAL_CHANNELS:OFFICIAL_SOCIAL_CHANNELS.slice(0,4);
 const links=channels.map((c,i)=>`<li><a href="${!updated&&i===0?'https://www.linkedin.com/company/144021127/':c.url}" target="_blank" rel="noopener noreferrer" aria-label="Begapunk auf ${c.platform}">${i===4?ig:svg}</a></li>`).join('\n');
 const graph={'@context':'https://schema.org','@graph':[{'@type':'Organization','@id':'https://www.begapunk.com/#organization',name:'SYNTHETIC TEST ONLY',sameAs:updated?urls:urls.slice(0,4)},{'@type':'Person',name:'SYNTHETIC PERSON',sameAs:['https://example.invalid/person']},{'@type':'LocalBusiness',telephone:'SYNTHETIC',sameAs:['https://example.invalid/local']} ]};
 return Buffer.from(`<!doctype html>\n<html lang="de"><head><title>SYNTHETIC TEST ONLY</title><link rel="stylesheet" href="../css/style.css?v=${updated?'20261114-footer-social5':'20261108-footer-info1'}"><script type="application/ld+json">${JSON.stringify(graph)}</script></head><body><p>Pressure: 1 MPa; Price: USD 99; Warranty: 12 months</p><footer id="siteFooter"><ul class="footer-social-links">${links}</ul></footer></body></html>\n`.replaceAll('\n','\r\n'));
}
const encode=v=>Buffer.from(JSON.stringify(v)+'\n');
const seal=bytes=>({path:'audit/approvals/incremental/SYNTHETIC-TEST-ONLY.json',algorithm:'sha256-lf-text-v1',sha256:rawSha256(gitLfBytes(bytes))});
function fixture(after=html(true)) {
 const before=html(),p={path:relative,historicalApprovalSha256:rawSha256(before),historicalRawSha256:rawSha256(before),historicalGitLfSha256:rawSha256(gitLfBytes(before)),historicalRawBase64:before.toString('base64'),candidateLocalRawSha256:rawSha256(after),candidateGitLfSha256:rawSha256(gitLfBytes(after)),
 releaseArtifact:{byteContract:'git-lf-exact-copy',expectedRawSha256:rawSha256(gitLfBytes(after)),actualRawSha256:null,status:'NOT_BUILT'},allowedScope:SOCIAL_INCREMENT_SCOPE,
 protection:{nonSocialBody:'UNCHANGED',otherJsonLd:'UNCHANGED',semanticReviewRequired:true,organizations:1},beforeSnapshot:createArtifactSnapshot(relative,before),afterSnapshot:createArtifactSnapshot(relative,after),ownerApprovalStatus:'PENDING_OWNER_APPROVAL'};
 const proposal={schemaVersion:1,status:'PENDING_OWNER_APPROVAL',ownerEvidence:null,deploymentAuthorized:false,previousRecordSha256:null,baseline:[],retainedEvidence:[],pages:[p]},proposalBytes=encode(proposal),proposalPin=seal(proposalBytes);
 const decision={decision:'OWNER_APPROVED_INCREMENTAL_CONTENT',authorizationReference:'SYNTHETIC-UNIT-TEST-NOT-A-REAL-OWNER',proposalSha256:proposalPin.sha256,deploymentAuthorized:false},evidenceBytes=encode(decision);
 const record={...proposal,status:'APPROVED',previousRecordSha256:proposalPin.sha256,ownerEvidence:{decision:decision.decision,authorizationReference:decision.authorizationReference,path:'audit/approvals/incremental/SYNTHETIC-OWNER.json',sha256:rawSha256(evidenceBytes)}},recordBytes=encode(record);
 const pin={...seal(recordBytes),proposalSha256:proposalPin.sha256,ownerEvidencePath:record.ownerEvidence.path,ownerEvidenceSha256:record.ownerEvidence.sha256};
 return {recordBytes,pin,proposalBytes,proposalPin,evidenceBytes,relative,currentBytes:after,expectedHistoricalSha256:rawSha256(before),governedArtifact:p.beforeSnapshot};
}
test('synthetic independently pinned owner decision accepts bounded increment without deployment permission',async()=>{
 const result=await validateBoundIncrement(fixture());assert.equal(result.approval,'OWNER_APPROVED_INCREMENTAL_CONTENT');assert.equal(result.deploymentAuthorized,false);
});
test('Windows raw CRLF and Linux LF candidates bind different exact hashes',async()=>{
 const f=fixture();assert.notEqual(rawSha256(f.currentBytes),rawSha256(gitLfBytes(f.currentBytes)));
 await validateBoundIncrement(f);await validateBoundIncrement({...f,currentBytes:gitLfBytes(f.currentBytes)});
 await assert.rejects(validateBoundIncrement({...f,currentBytes:Buffer.from(f.currentBytes.toString().replace('\r\n','\n'))}),/raw\/release byte/);
});
test('release artifact must use declared Git LF raw bytes, never local CRLF hash',async()=>{
 const f=fixture();await validateBoundIncrement({...f,layer:'release',currentBytes:gitLfBytes(f.currentBytes)});
 await assert.rejects(validateBoundIncrement({...f,layer:'release'}),/raw\/release byte/);
 await assert.rejects(validateBoundIncrement({...f,layer:'UNKNOWN'}),/Unknown byte/);
});
test('UTF-8 BOM is retained and malformed UTF-8 is rejected',()=>{
 const b=Buffer.concat([Buffer.from([239,187,191]),Buffer.from('a\r\n')]);assert.equal(gitLfBytes(b).toString('hex'),'efbbbf610a');assert.throws(()=>gitLfBytes(Buffer.from([255])));
});
for(const key of ['status','ownerEvidence','deploymentAuthorized','pages','previousRecordSha256','baseline','retainedEvidence'])test(`tampering decision field ${key} cannot reuse its pin`,async()=>{
 const f=fixture(),r=JSON.parse(f.recordBytes);r[key]=null;await assert.rejects(validateBoundIncrement({...f,recordBytes:encode(r)}),/digest mismatch/);
});
test('pending remains rejected even when its technical digest is trusted',async()=>{
 const f=fixture(),r=JSON.parse(f.recordBytes);r.status='PENDING_OWNER_APPROVAL';const recordBytes=encode(r);await assert.rejects(validateBoundIncrement({...f,recordBytes,pin:{...f.pin,...seal(recordBytes)}}),/PENDING/);
});
test('changing only proposal status cannot invent authorization',async()=>{
 const f=fixture(),r=JSON.parse(f.proposalBytes);r.status='APPROVED';assert.throws(()=>readPinnedRecord(encode(r),f.proposalPin),/digest mismatch/);
});
test('owner evidence bytes/reference cannot be substituted',async()=>{
 const f=fixture();await assert.rejects(validateBoundIncrement({...f,evidenceBytes:Buffer.from('{}')}),/evidence digest/);
 await assert.rejects(validateBoundIncrement({...f,pin:{...f.pin,ownerEvidencePath:'audit/other.json'}}),/evidence digest/);
});
for(const [label,changes] of [
 ['path',{relative:'de/other.html'}],['traversal',{relative:'../de/approval-fixture.html'}],['historical raw hash',{expectedHistoricalSha256:'0'.repeat(64)}],
 ['governed semantic hash',{governedArtifact:{path:relative,semanticSha256:'0'.repeat(64),mechanicalSha256:'0'.repeat(64)}}],['governed path',{governedArtifact:{...fixture().governedArtifact,path:'de/other.html'}}],
 ['append-only chain',{pin:{...fixture().pin,proposalSha256:'0'.repeat(64)}}],
])test(`reject mismatched ${label}`,async()=>{await assert.rejects(validateBoundIncrement({...fixture(),...changes}));});
for(const [label,mutate] of [
 ['engineering parameter',s=>s.replace('1 MPa','9 MPa')],['quotation',s=>s.replace('USD 99','USD 1')],['warranty',s=>s.replace('12 months','99 months')],['body',s=>s.replace('</body>','<p>Unapproved</p></body>')],
 ['Organization legalName',s=>s.replace('"name":"SYNTHETIC TEST ONLY"','"legalName":"OTHER ENTITY","name":"SYNTHETIC TEST ONLY"')],
 ['Organization ID',s=>s.replace('#organization','#other')],['Person',s=>s.replace('example.invalid/person','example.invalid/other')],['LocalBusiness',s=>s.replace('example.invalid/local','example.invalid/other')],
 ['Instagram label',s=>s.replace('auf Instagram','auf Facebook')],['hidden Footer content',s=>s.replace('</ul>','<li><a>Unapproved</a></li></ul>')],['SVG script',s=>s.replace('</svg></a></li></ul>','<script>alert(1)</script></svg></a></li></ul>')],
 ['CSS version',s=>s.replace('20261114-footer-social5','unapproved')],['script attribute',s=>s.replace('type="application/ld+json"','nonce="NEW" type="application/ld+json"')],
])test(`even recomputed test-only pins cannot authorize out-of-scope ${label}`,async()=>{
 const after=Buffer.from(mutate(html(true).toString()));assert.notDeepEqual(after,html(true));
 await assert.rejects(validateBoundIncrement(fixture(after))); // rebind hashes to test scope, not merely hash mismatch
});
test('existing mechanical-only mechanism still rejects semantic changes',()=>{
 const f=fixture(),p=JSON.parse(f.proposalBytes).pages[0];assert.notEqual(p.beforeSnapshot.semanticSha256,p.afterSnapshot.semanticSha256);
 assert.throws(()=>applyMechanicalOnlySnapshots([p.beforeSnapshot],[p.afterSnapshot]));
});
test('both snapshot paths must bind the page even when their content hashes match',()=>{
 const p=JSON.parse(fixture().proposalBytes).pages[0];
 for(const key of ['beforeSnapshot','afterSnapshot']){
  const changed=structuredClone(p);changed[key].path='de/wrong-path.html';
  assert.throws(()=>assertIncrementalSnapshotTransition(relative,html(),html(true),changed,p.beforeSnapshot),/does not bind/);
 }
});
test('all 236 retained governance baselines and 97 historical approval hashes are provable; all remain pending',async()=>{
 // Future genuine decisions may be appended; they must never overwrite the
 // pending proposal, and fictional fixture decisions must never be registered.
 assert.ok(OWNER_INCREMENTAL_DECISIONS.every(p=>!INCREMENTAL_PROPOSALS.some(q=>p.path===q.path)&&!p.path.includes('SYNTHETIC')));
 const root=path.resolve(import.meta.dirname,'..'),pin=INCREMENTAL_PROPOSALS[0],record=readPinnedRecord(await readFile(path.join(root,pin.path)),pin);
 assert.equal(record.status,'PENDING_OWNER_APPROVAL');assert.equal(record.ownerEvidence,null);assert.equal(record.pages.length,236);assert.equal(record.pages.filter(p=>p.historicalApprovalSha256).length,97);
 const governed=JSON.parse(await readFile(path.join(root,'audit/localization/current-localized-artifacts.json'),'utf8'));
 for(const p of record.pages){
  assert.equal(p.ownerApprovalStatus,'PENDING_OWNER_APPROVAL');const bytes=Buffer.from(p.historicalRawBase64,'base64');assert.equal(rawSha256(bytes),p.historicalRawSha256);
  if(p.historicalApprovalSha256)assert.equal(rawSha256(bytes),p.historicalApprovalSha256);
  const a=governed.artifacts.find(a=>a.path===p.path);const s=createArtifactSnapshot(p.path,bytes);assert.equal(s.semanticSha256,a.semanticSha256);assert.equal(s.mechanicalSha256,a.mechanicalSha256);
 }
});
test('production governance wrapper rejects an unapproved synthetic page regardless of env status',async()=>{
 const temp=await mkdtemp(path.join(os.tmpdir(),'begapunk-9a-synthetic-'));
 try{await assert.rejects(verifyEditorialIncrement(temp,relative,fixture().governedArtifact,html(true)),/PENDING_OWNER_APPROVAL|ENOENT/);}
 finally{assert.equal(path.dirname(temp),path.resolve(os.tmpdir()));assert.ok(path.basename(temp).startsWith('begapunk-9a-synthetic-'));await rm(temp,{recursive:true,force:true});}
});
test('path boundary rejects escaped evidence files and unapproved file bytes',async()=>{
 const temp=await mkdtemp(path.join(os.tmpdir(),'begapunk-9a-synthetic-'));
  try{await assert.rejects(readApprovalFile(temp,'../outside.json'),/Unsafe/);await mkdir(path.join(temp,'de'));await writeFile(path.join(temp,relative),html(true));await assert.rejects(verifyOwnerArtifact(temp,relative,rawSha256(html())),/Approved page hash changed.*ENOENT/);}
 finally{assert.equal(path.dirname(temp),path.resolve(os.tmpdir()));assert.ok(path.basename(temp).startsWith('begapunk-9a-synthetic-'));await rm(temp,{recursive:true,force:true});}
});

test('production wrappers accept only a sealed fictional fixture and reject its later tampering',async()=>{
 const root=path.resolve(import.meta.dirname,'..'),temp=await mkdtemp(path.join(root,'tests','.incremental-fixture-'));
 try {
  const f=fixture(),proposalPath='audit/approvals/incremental/SYNTHETIC-PENDING.json',decisionPath='audit/approvals/incremental/SYNTHETIC-DECISION.json';
  const pp={...f.proposalPin,path:proposalPath},dp={...f.pin,path:decisionPath};
  const files=new Map([[proposalPath,f.proposalBytes],[decisionPath,f.recordBytes],[dp.ownerEvidencePath,f.evidenceBytes],[relative,f.currentBytes]]);
  for(const name of ['owner-incremental-acceptance.mjs','approval-social-delta.mjs','editorial-artifact-snapshot.mjs','official-social-channels.mjs'])files.set('scripts/lib/'+name,await readFile(path.join(root,'scripts/lib',name)));
  files.set('data/llms-identity.json',await readFile(path.join(root,'data/llms-identity.json')));
  files.set('scripts/lib/owner-incremental-trust.mjs',Buffer.from(`export const INCREMENTAL_PROPOSALS=${JSON.stringify([pp])}; export const OWNER_INCREMENTAL_DECISIONS=${JSON.stringify([dp])};`));
  for(const [rel,bytes] of files){await mkdir(path.dirname(path.join(temp,rel)),{recursive:true});await writeFile(path.join(temp,rel),bytes);}
  const code=`import {readFile} from 'node:fs/promises';import {verifyOwnerArtifact,verifyEditorialIncrement,verifyIncrementalReleaseArtifact,gitLfBytes} from './scripts/lib/owner-incremental-acceptance.mjs'; const root=process.cwd();const p=${JSON.stringify(relative)};const b=await readFile(p);await verifyOwnerArtifact(root,p,${JSON.stringify(f.expectedHistoricalSha256)});await verifyEditorialIncrement(root,p,${JSON.stringify(f.governedArtifact)},b);await verifyIncrementalReleaseArtifact(root,p,gitLfBytes(b));`;
  const run=()=>spawnSync(process.execPath,['--input-type=module','-e',code],{cwd:temp,encoding:'utf8',windowsHide:true,env:{...process.env,OWNER_INCREMENTAL_APPROVED:'true'}});
  let child=run();assert.equal(child.status,0,child.stderr);
  const altered=JSON.parse(f.recordBytes);altered.pages[0].protection.nonSocialBody='FORGED';await writeFile(path.join(temp,decisionPath),encode(altered));
  child=run();assert.equal(child.status,1);assert.match(child.stderr,/digest mismatch/);
  await writeFile(path.join(temp,decisionPath),f.recordBytes);await rm(path.join(temp,proposalPath));child=run();assert.equal(child.status,1);assert.match(child.stderr,/ENOENT/);
 } finally {
  assert.equal(path.dirname(temp),path.join(root,'tests'));assert.ok(path.basename(temp).startsWith('.incremental-fixture-'));await rm(temp,{recursive:true,force:true});
 }
});
