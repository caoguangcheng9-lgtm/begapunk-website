import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,mkdir,cp,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import {verifyOwnerAdditional17ContentAcceptance} from '../scripts/verify-owner-additional17-content-acceptance.mjs';
import {validateTrustedAuditPolicyContract} from '../scripts/lib/audit-policy-contracts.mjs';

const root=path.resolve(import.meta.dirname,'..'),dir='audit/approvals/2026-11-14-additional-17';
const receipt=JSON.parse(await readFile(path.join(root,dir,'owner-acceptance.json'),'utf8'));
const old=JSON.parse(await readFile(path.join(root,'audit/approvals/2026-11-13-ai-content/owner-acceptance.json'),'utf8'));
const pkg=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));
const policy=JSON.parse(await readFile(path.join(root,'audit/policy/release-audit-v2.json'),'utf8'));
const expectedCommands={
 'owner:content:80:verify':'node scripts/verify-owner-ai-content-acceptance.mjs',
 'owner:content:17:verify':'node scripts/verify-owner-additional17-content-acceptance.mjs',
 'owner:content:self-test':'node --test tests/editorial-owner-ai-acceptance.test.mjs tests/editorial-owner-additional17-acceptance.test.mjs tests/editorial-incremental-acceptance.test.mjs',
 'editorial:release:verify':'node scripts/verify-editorial-release-status.mjs',
};
function assertIntegration(p,q){
 assert.deepEqual(validateTrustedAuditPolicyContract(q),[],'governed policy contract');
 for(const [key,command] of Object.entries(expectedCommands))assert.equal(p.scripts[key],command,'exact fail-closed command: '+key);
 for(const phase of ['pr','release']){
  const names=q.phases[phase].gateSets.filter(n=>n!=='nonWindows');
  const gates=names.flatMap(n=>q.gateSets[n]).concat(q.phases[phase].additionalGates);
  for(const key of Object.keys(expectedCommands)){
   assert.equal(gates.filter(x=>x===key).length,1,phase+' mandatory '+key);
   assert.ok(gates.indexOf(key)<gates.indexOf('deploy:build'),phase+' approval before artifact build');
  }
 }
 assert.equal(p.scripts['deploy:prepare'],'node scripts/run-release-audit.mjs release');
}
async function fixture(fn){
 // Keep CLI fixtures under tests so their copied verifier modules resolve the
 // existing test dependencies, including a future genuinely approved increment.
 const base=path.join(root,'tests'),temp=await mkdtemp(path.join(base,'begapunk-add17-negative-'));
 try{
  for(const d of [dir,'audit/approvals/2026-11-13-ai-content'])await cp(path.join(root,d),path.join(temp,d),{recursive:true});
  await cp(path.join(root,'audit/approvals/incremental'),path.join(temp,'audit/approvals/incremental'),{recursive:true});
  for(const p of [...receipt.artifacts,...old.artifacts].map(x=>x.path).concat(['scripts/verify-owner-additional17-content-acceptance.mjs','scripts/verify-owner-ai-content-acceptance.mjs','scripts/lib/owner-incremental-acceptance.mjs','scripts/lib/owner-incremental-trust.mjs','scripts/lib/approval-social-delta.mjs','scripts/lib/editorial-artifact-snapshot.mjs','scripts/lib/official-social-channels.mjs','data/llms-identity.json'])){
   await mkdir(path.dirname(path.join(temp,p)),{recursive:true});await cp(path.join(root,p),path.join(temp,p));
  }
  await fn(temp,structuredClone(receipt));
 }finally{
  assert.equal(path.dirname(path.resolve(temp)),base);assert.ok(path.basename(temp).startsWith('begapunk-add17-negative-'));
  await rm(temp,{recursive:true,force:true});
 }
}
const negative=(name,mutate,pattern)=>test(name,()=>fixture(async(temp,r)=>{
 await mutate(r,temp);
 await writeFile(path.join(temp,dir,'owner-acceptance.json'),JSON.stringify(r));
 await assert.rejects(verifyOwnerAdditional17ContentAcceptance(temp),pattern);
 const cli=spawnSync(process.execPath,[path.join(temp,'scripts/verify-owner-additional17-content-acceptance.mjs')],{encoding:'utf8',windowsHide:true});
 assert.equal(cli.status,1,cli.stdout+cli.stderr);assert.match(cli.stderr,pattern);
}));

test('positive: the exact independent 17-page receipt validates with no deployment or native approval',async()=>{
 assert.deepEqual(await verifyOwnerAdditional17ContentAcceptance(root),{acceptedPageCount:17,approvalType:'OWNER_ACCEPTED_AI_REVIEWED_CONTENT',registrationStatus:'REGISTERED',localeCounts:{de:4,fr:4,ja:5,ru:4},nativeSpeakerReviewPerformed:false,deploymentAuthorized:false,original80Verified:true,cohortsDisjoint:true});
});
test('positive: both owner cohorts, both negative suites and editorial snapshots are mandatory before release build',()=>assertIntegration(pkg,policy));
negative('delete one artifact approval record',r=>r.artifacts.pop(),/exactly 17 unique/);
negative('reduce the cohort to 16 including the declared count',r=>{r.artifacts.pop();r.acceptedPageCount=16;},/count\/locale/);
negative('append an unauthorized 18th page',r=>r.artifacts.push({path:'de/index.html',sha256:'0'.repeat(64)}),/exactly 17 unique/);
negative('replace a page while retaining 17 and locale counts',r=>{r.artifacts[0].path='de/index.html';},/exactly match the original 17/);
negative('change locale distribution while retaining 17',r=>{r.artifacts[0].path='ja/index.html';},/locale distribution/);
for(const l of ['de','fr','ru'])negative('exclude later '+l+' About warranty repair',r=>{r.artifacts.find(a=>a.path.startsWith(l+'/')).path=l+'/about.html';},/later About repairs/);
negative('reject overlap with an original 80-page product',r=>{r.artifacts[0].path='de/BP-10P-0001.html';},/exactly match the original 17/);
negative('modify actual page bytes in isolated fixture',async(r,temp)=>writeFile(path.join(temp,r.artifacts[0].path),'<p>Changed candidate</p>'),/Approved page hash changed/);
negative('remove approval evidence entry',r=>r.evidence.pop(),/Missing\/unexpected approval evidence/);
negative('remove actual owner decision evidence file',async(r,temp)=>rm(path.join(temp,dir,'OWNER_17_DECISION_SOURCE.md')),/ENOENT/);
negative('tamper original AI evidence bytes',async(r,temp)=>writeFile(path.join(temp,dir,'ORIGINAL_FINAL_17_AI_REVIEW.json'),'{}'),/Evidence bytes changed/);
negative('substitute evidence digest',r=>{r.evidence[0].sha256='0'.repeat(64);},/Pinned evidence/);
negative('substitute evidence package',r=>{r.registrationEvidencePackage.sha256='0'.repeat(64);},/package binding/);
negative('falsely claim native human review',r=>{r.nativeSpeakerReviewPerformed=true;},/cannot become human/);
negative('falsely label AI review HUMAN_REVIEWED',r=>{r.reviewMethod='HUMAN_REVIEWED';},/cannot become human/);
negative('turn content acceptance into deployment authority',r=>{r.deploymentAuthorized=true;},/deployment authorization/);
negative('reject stale historical approval date',r=>{r.decisionDate='2026-11-13';},/Stale\/substituted/);
negative('reject registration preceding original review and owner decision',r=>{r.registeredAt='2026-11-13T00:00:00.000Z';},/must not precede/);
negative('reject future registration timestamp',r=>{r.registeredAt='2099-01-01T00:00:00.000Z';},/Invalid\/future/);
negative('reject normalized invalid calendar date',r=>{r.registeredAt='2026-02-30T00:00:00.000Z';},/real canonical UTC timestamp/);
negative('reject changed recorded decision time',r=>{r.recordedAt='2026-11-14T01:00:00.000Z';},/retain the original capture/);
negative('reject unregistered draft',r=>{r.draftOnly=true;r.registrationStatus='DRAFT';},/not a registered/);
negative('reject missing required receipt field',r=>{delete r.decisionSource;},/missing or unexpected fields/);
negative('reject duplicate path replacing one of 17',r=>{r.artifacts[1]=r.artifacts[0];},/exactly 17 unique/);
for(const unsafe of ['../de/about.html','/de/about.html','de\\about.html','C:/de/about.html','de/%2e%2e/about.html'])negative('reject unsafe artifact path '+unsafe,r=>{r.artifacts[0].path=unsafe;},/Unsafe\/invalid/);
negative('reject unsafe evidence path',r=>{r.evidence[0].path='../OWNER_17_DECISION_SOURCE.md';},/Unsafe evidence/);
negative('reject missing original 80 evidence',async(r,temp)=>rm(path.join(temp,'audit/approvals/2026-11-13-ai-content/OWNER_STATEMENT.md')),/ENOENT/);
test('missing receipt returns nonzero',()=>fixture(async temp=>{
 await rm(path.join(temp,dir,'owner-acceptance.json'));
 const cli=spawnSync(process.execPath,[path.join(temp,'scripts/verify-owner-additional17-content-acceptance.mjs')],{encoding:'utf8',windowsHide:true});assert.equal(cli.status,1);assert.match(cli.stderr,/ENOENT/);
}));
test('integration rejects removal, platform-only placement and unused placement of every content gate',()=>{
 for(const key of Object.keys(expectedCommands))for(const mode of ['remove','nonWindows','unused']){
  const q=structuredClone(policy);q.gateSets.source=q.gateSets.source.filter(x=>x!==key);
  if(mode==='nonWindows')q.gateSets.nonWindows.push(key);
  if(mode==='unused')q.gateSets.unused=[key];
  assert.throws(()=>assertIntegration(pkg,q));
 }
});
test('integration rejects no-op or failure-swallowing commands without running deployment',()=>{
 for(const key of Object.keys(expectedCommands))for(const value of ['echo approval passed',expectedCommands[key]+' || exit 0']){
  const p=structuredClone(pkg);p.scripts[key]=value;assert.throws(()=>assertIntegration(p,policy));
 }
});
