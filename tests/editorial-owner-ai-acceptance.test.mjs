import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, cp, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { verifyOwnerAiContentAcceptance } from '../scripts/verify-owner-ai-content-acceptance.mjs';
import { reviewedSubsetSnapshots } from '../scripts/lib/editorial-reviewed-subset.mjs';
import { compareArtifactSnapshots } from '../scripts/lib/editorial-artifact-snapshot.mjs';
import { validateReleaseAuthorization } from '../scripts/verify-release-authorization.mjs';

const root = path.resolve(import.meta.dirname, '..');
const dir = 'audit/approvals/2026-11-13-ai-content';
const receipt = JSON.parse(await readFile(path.join(root, dir, 'owner-acceptance.json'), 'utf8'));
const clone = () => structuredClone(receipt);

test('exact owner receipt accepts 80 AI pages but grants no deployment/17-page approval', async () => {
  assert.deepEqual(await verifyOwnerAiContentAcceptance(root), {
    acceptedPageCount:80, approvalType:'OWNER_ACCEPTED_AI_REVIEWED_CONTENT', deploymentAuthorized:false, additional17OwnerApproved:false
  });
});
test('missing evidence is rejected', async () => {
  const r=clone(); r.evidence.pop(); await assert.rejects(verifyOwnerAiContentAcceptance(root,r),/Missing or unexpected/);
});
test('missing evidence file is rejected', async () => {
  const temporary=await mkdtemp(path.join(os.tmpdir(),'begapunk-receipt-negative-'));
  try { await assert.rejects(verifyOwnerAiContentAcceptance(temporary,clone()),/ENOENT/); }
  finally { await rm(temporary,{recursive:true,force:true}); }
});
test('extra historical page cannot inherit owner approval', async () => {
  const r=clone();r.artifacts.push({path:'ja/about.html',sha256:'0'.repeat(64)});
  await assert.rejects(verifyOwnerAiContentAcceptance(root,r),/scope must exactly/);
});
test('substituting an unapproved page while keeping count 80 is rejected', async () => {
  const r=clone();r.artifacts[0].path='ja/about.html';
  await assert.rejects(verifyOwnerAiContentAcceptance(root,r),/scope must exactly/);
});
test('changed page bytes are rejected without altering repository content', async () => {
  const temporary=await mkdtemp(path.join(os.tmpdir(),'begapunk-receipt-negative-'));
  try {
    await mkdir(path.join(temporary,'audit/approvals'),{recursive:true});
    await cp(path.join(root,dir),path.join(temporary,dir),{recursive:true});
    // LF checkouts reconstruct pinned historical evidence from the retained proposal.
    await cp(path.join(root,'audit/approvals/incremental'),path.join(temporary,'audit/approvals/incremental'),{recursive:true});
    const first=receipt.artifacts[0].path;
    await mkdir(path.dirname(path.join(temporary,first)),{recursive:true});
    await writeFile(path.join(temporary,first),'<p>Changed candidate content</p>');
    await assert.rejects(verifyOwnerAiContentAcceptance(temporary,clone()),/Approved page hash changed/);
  } finally { await rm(temporary,{recursive:true,force:true}); }
});
test('content approval cannot become deployment permission', async () => {
  const r=clone(); r.deploymentAuthorized=true;
  await assert.rejects(verifyOwnerAiContentAcceptance(root,r),/cannot authorize deployment/);
  assert.ok(validateReleaseAuthorization(receipt).failures.length>0);
});
test('AI cannot become native human review or additional 17 approval', async () => {
  for(const key of ['nativeSpeakerReviewPerformed','additional17OwnerApproved']) {
    const r=clone();r[key]=true;await assert.rejects(verifyOwnerAiContentAcceptance(root,r),/cannot authorize/);
  }
});
test('review evidence and package cannot be substituted', async () => {
  const r=clone();r.aiPackage.sha256='0'.repeat(64);await assert.rejects(verifyOwnerAiContentAcceptance(root,r),/package binding/);
  const r2=clone();r2.evidence[0].sha256='0'.repeat(64);await assert.rejects(verifyOwnerAiContentAcceptance(root,r2),/Evidence hash/);
});
test('partial capture preserves all unreviewed evidence and leaves their real mismatch visible', () => {
  const before=[{path:'de/a.html',semanticSha256:'a',mechanicalSha256:'a',provenance:'old-a'},
    {path:'de/b.html',semanticSha256:'b',mechanicalSha256:'b',provenance:'old-b'}];
  const actual=before.map(x=>({...x,semanticSha256:x.semanticSha256+'new',mechanicalSha256:x.mechanicalSha256+'new'}));
  const registered=reviewedSubsetSnapshots(before,actual,['de/a.html']);
  assert.deepEqual(registered[1],before[1]);
  assert.deepEqual(compareArtifactSnapshots(registered,actual).semanticChangedPaths,['de/b.html']);
  for(const paths of [[],['de/a.html','de/a.html'],['de/unknown.html']])
    assert.throws(()=>reviewedSubsetSnapshots(before,actual,paths));
  assert.throws(()=>reviewedSubsetSnapshots(before,before,['de/a.html']),/actual semantic change/);
  assert.throws(()=>reviewedSubsetSnapshots(before,actual.slice(0,1),['de/a.html']),/add or remove/);
});
