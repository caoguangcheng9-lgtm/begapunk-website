import { readFile, realpath, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { INCREMENTAL_PROPOSALS, OWNER_INCREMENTAL_DECISIONS } from './owner-incremental-trust.mjs';

export const rawSha256=b=>createHash('sha256').update(b).digest('hex');
export const gitLfBytes=b=>Buffer.from(new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(b).replace(/\r\n?/g,'\n'),'utf8');
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const requireThat=(condition,message)=>{if(!condition)throw new Error(message);};
const digest=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const pagePath=s=>typeof s==='string'&&/^(de|fr|ja|ru)\/[A-Za-z0-9_-]+\.html$/.test(s);
const safe=s=>typeof s==='string'&&/^[A-Za-z0-9_./-]+$/.test(s)&&!path.isAbsolute(s)&&!s.split('/').some(x=>!x||x==='.'||x==='..');
export async function readApprovalFile(root,relative) {
  requireThat(safe(relative),'Unsafe approval path');
  const base=await realpath(root),full=path.join(base,relative),resolved=await realpath(full),rel=path.relative(base,resolved),stat=await lstat(full);
  requireThat(rel&&!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel)&&stat.isFile()&&!stat.isSymbolicLink(),'Approval path escapes repository or is not a regular file');
  return readFile(full);
}
const json=b=>JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(b));
export function readPinnedRecord(bytes,pin) {
  requireThat(digest(pin?.sha256)&&pin.algorithm==='sha256-lf-text-v1'&&rawSha256(gitLfBytes(bytes))===pin.sha256,'Incremental record digest mismatch');
  const record=json(bytes);
  requireThat(record.schemaVersion===1&&record.deploymentAuthorized===false,'Invalid incremental schema/deployment authority');
  requireThat(Array.isArray(record.pages)&&record.pages.length>0&&new Set(record.pages.map(p=>p.path)).size===record.pages.length&&record.pages.every(p=>pagePath(p.path)),'Invalid/duplicate incremental page paths');
  return record;
}
async function proposals(root) {
  const result=[];
  for(const pin of INCREMENTAL_PROPOSALS) {
    try{const record=readPinnedRecord(await readApprovalFile(root,pin.path),pin);requireThat(record.status==='PENDING_OWNER_APPROVAL'&&record.ownerEvidence===null,'Retained proposal status changed');result.push({pin,record});}
    catch(e){throw e;}
  }
  return result;
}
function historicalBytes(p) {
  const raw=Buffer.from(p.historicalRawBase64,'base64');
  requireThat(raw.toString('base64')===p.historicalRawBase64&&rawSha256(raw)===p.historicalRawSha256,'Historical raw byte proof mismatch');
  requireThat(rawSha256(gitLfBytes(raw))===p.historicalGitLfSha256,'Historical LF byte proof mismatch');return raw;
}
// A normalized historical checkout is accepted only by reconstructing the
// original pinned raw evidence, never by treating an LF hash as a raw hash.
export async function readRetainedApprovalBytes(root,relative,expectedSha256) {
  const current=await readApprovalFile(root,relative);
  if(rawSha256(current)===expectedSha256)return current;
  for(const {record} of await proposals(root)) {
    const proof=record.retainedEvidence?.find(p=>p.path===relative&&p.historicalRawSha256===expectedSha256);
    if(proof){const raw=historicalBytes(proof);requireThat(current.equals(gitLfBytes(raw)),'Retained approval evidence bytes changed');return raw;}
  }
  throw new Error(`Retained approval evidence hash mismatch: ${relative}`);
}
// Pure verifier used by fixture tests. Production wrappers below obtain pins
// solely from the reviewed source registry, never from this record or CLI/env.
export async function validateBoundIncrement({recordBytes,pin,proposalBytes,proposalPin,evidenceBytes,relative,currentBytes,expectedHistoricalSha256,governedArtifact,layer='source'}) {
  const record=readPinnedRecord(recordBytes,pin),proposal=readPinnedRecord(proposalBytes,proposalPin);
  requireThat(record.status==='APPROVED'&&record.ownerEvidence?.decision==='OWNER_APPROVED_INCREMENTAL_CONTENT','Owner incremental approval is PENDING or missing');
  requireThat(proposal.status==='PENDING_OWNER_APPROVAL'&&proposal.ownerEvidence===null,'Original proposal must be retained pending');
  requireThat(record.previousRecordSha256===proposalPin.sha256&&pin.proposalSha256===proposalPin.sha256,'Append-only proposal binding mismatch');
  requireThat(eq(record.pages,proposal.pages)&&eq(record.retainedEvidence,proposal.retainedEvidence)&&eq(record.baseline,proposal.baseline),'Decision changed the reviewed proposal');
  const evidence=record.ownerEvidence;
  requireThat(evidence.path===pin.ownerEvidencePath&&evidence.sha256===pin.ownerEvidenceSha256&&digest(evidence.sha256)&&rawSha256(gitLfBytes(evidenceBytes))===evidence.sha256,'Owner evidence digest mismatch');
  requireThat(typeof evidence.authorizationReference==='string'&&evidence.authorizationReference.trim().length>0,'Missing owner authorization reference');
  const decision=json(evidenceBytes);
  requireThat(decision.decision==='OWNER_APPROVED_INCREMENTAL_CONTENT'&&decision.proposalSha256===proposalPin.sha256&&decision.authorizationReference===evidence.authorizationReference&&decision.deploymentAuthorized===false,'Owner evidence does not authorize this exact proposal');
  const p=record.pages.find(p=>p.path===relative);requireThat(p&&pagePath(relative),'Incremental approval path mismatch');
  requireThat(p.ownerApprovalStatus==='PENDING_OWNER_APPROVAL','Proposal page history rewritten');
  requireThat(digest(p.candidateLocalRawSha256)&&digest(p.candidateGitLfSha256)&&p.releaseArtifact.actualRawSha256===null&&p.releaseArtifact.status==='NOT_BUILT'&&p.releaseArtifact.expectedRawSha256===p.candidateGitLfSha256&&p.releaseArtifact.byteContract==='git-lf-exact-copy','Invalid byte-layer contract');
  const raw=rawSha256(currentBytes),lf=rawSha256(gitLfBytes(currentBytes));
  requireThat(lf===p.candidateGitLfSha256,'Candidate LF digest mismatch');
  requireThat(layer==='source'||layer==='release','Unknown byte layer');
  requireThat(layer==='release'?raw===p.releaseArtifact.expectedRawSha256:(raw===p.candidateLocalRawSha256||raw===p.candidateGitLfSha256),'Candidate raw/release byte digest mismatch');
  if(expectedHistoricalSha256!==undefined)requireThat(p.historicalApprovalSha256===expectedHistoricalSha256&&p.historicalRawSha256===expectedHistoricalSha256,'Historical approval path/hash mismatch');
  const before=historicalBytes(p);
  const {assertSocialIncrement,SOCIAL_INCREMENT_SCOPE}=await import('./approval-social-delta.mjs');
  requireThat(eq(p.allowedScope,SOCIAL_INCREMENT_SCOPE),'Unapproved increment scope');
  const result=assertSocialIncrement(before,currentBytes,relative);
  requireThat(eq(p.protection,result),'Protection evidence mismatch');
  const {assertIncrementalSnapshotTransition}=await import('./editorial-artifact-snapshot.mjs');
  assertIncrementalSnapshotTransition(relative,before,currentBytes,p,governedArtifact);
  return {path:relative,approval:'OWNER_APPROVED_INCREMENTAL_CONTENT',byteLayer:layer,rawSha256:raw,gitLfSha256:lf,deploymentAuthorized:false};
}
async function approvedPage(root,relative,currentBytes,expectedHistoricalSha256,governedArtifact,layer) {
  requireThat(OWNER_INCREMENTAL_DECISIONS.length>0,`PENDING_OWNER_APPROVAL: ${relative}; no independently pinned owner decision`);
  const pending=await proposals(root);
  for(const pin of OWNER_INCREMENTAL_DECISIONS) {
    const proposal=pending.find(p=>p.pin.sha256===pin.proposalSha256);requireThat(proposal,'Pinned proposal missing');
    if(!proposal.record.pages.some(p=>p.path===relative))continue;
    return validateBoundIncrement({recordBytes:await readApprovalFile(root,pin.path),pin,proposalBytes:await readApprovalFile(root,proposal.pin.path),proposalPin:proposal.pin,evidenceBytes:await readApprovalFile(root,pin.ownerEvidencePath),relative,currentBytes,expectedHistoricalSha256,governedArtifact,layer});
  }
  throw new Error(`PENDING_OWNER_APPROVAL: ${relative}; no independently pinned owner decision`);
}
export async function verifyOwnerArtifact(root,relative,expectedSha256) {
  const current=await readApprovalFile(root,relative);
  if(rawSha256(current)===expectedSha256)return {approval:'HISTORICAL_RAW'};
  try {
    for(const {record} of await proposals(root)) {
      const p=record.pages.find(p=>p.path===relative&&p.historicalApprovalSha256===expectedSha256);
      if(p){const raw=historicalBytes(p);requireThat(rawSha256(raw)===expectedSha256,'Historical approval hash mismatch');if(current.equals(gitLfBytes(raw)))return {approval:'HISTORICAL_GIT_LF_WITH_RAW_PROOF'};}
    }
    return await approvedPage(root,relative,current,expectedSha256);
  } catch(e){throw new Error(`Approved page hash changed: ${relative}; ${e.message}`);}
}
export async function verifyEditorialIncrement(root,relative,artifact,currentBytes) {
  return approvedPage(root,relative,currentBytes,undefined,artifact);
}
export async function verifyIncrementalReleaseArtifact(root,relative,releaseBytes) {
  const matches=(await proposals(root)).flatMap(({record})=>record.pages).filter(p=>p.path===relative);
  if(matches.length===0)return {path:relative,approval:'NOT_AN_INCREMENTAL_PAGE'};
  for(const p of matches)if(releaseBytes.equals(gitLfBytes(historicalBytes(p))))return {path:relative,approval:'HISTORICAL_GIT_LF_RELEASE'};
  return approvedPage(root,relative,releaseBytes,undefined,undefined,'release');
}
