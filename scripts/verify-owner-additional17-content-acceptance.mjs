import {verifyOwnerArtifact,readRetainedApprovalBytes} from './lib/owner-incremental-acceptance.mjs';
import {readFile, realpath, lstat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {verifyOwnerAiContentAcceptance} from './verify-owner-ai-content-acceptance.mjs';

// Independent, owner-authorized cohort. Pins bind the retained evidence bytes,
// not a person's identity/signature and never a production release permission.
const DIR='audit/approvals/2026-11-14-additional-17';
const PACKAGE={name:'BEGAPUNK_FINAL_CONTENT_GATE_PASS.zip',sha256:'efeab9267f9d8f77b1e35f3034d993152cf177df6c73c92c2cf1ff21e1e41cfc'};
const PINS={
 'OWNER_17_DECISION_SOURCE.md':'84c21744d993baea365a83d446e3c48285cfd98d1f892688fd9dc11b7512bbec',
 'ORIGINAL_FINAL_17_PAGE_AI_REVIEW.md':'a187a0f6331b5a294f30740e631eb944ffc04945377b7bc1304e0b26c0571ca4',
 'ORIGINAL_FINAL_17_AI_REVIEW.json':'a69cbc69c912241ff1364147c860f7f84963ffc4899592bd0c476083d6d615a1',
 'OWNER_17_RECEIPT_DRAFT.json':'10cbc4dcbb6a845ad01d8d654613b6fff4ab6768056ffa6ad92941ac10b4b1d3',
};
const LOCALES={de:4,fr:4,ja:5,ru:4};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=message=>{throw new Error(message);};
const plain=v=>v!==null && typeof v==='object' && !Array.isArray(v);
const keys=(v,expected,label)=>{
 if(!plain(v)||JSON.stringify(Object.keys(v).sort())!==JSON.stringify([...expected].sort()))fail(`${label}: missing or unexpected fields.`);
};
const safe=p=>typeof p==='string' && /^[a-zA-Z0-9_./-]+$/.test(p) && !path.isAbsolute(p)
 && !p.split('/').some(x=>!x||x==='.'||x==='..') && !p.includes('\\') && !p.includes(':');
const sha=value=>typeof value==='string' && /^[a-f0-9]{64}$/.test(value);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const normalize=rows=>rows.map(({path,sha256})=>({path,sha256})).sort((a,b)=>a.path.localeCompare(b.path));
function timestamp(value,label){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    || !Number.isFinite(Date.parse(value)) || Date.parse(value)>Date.now()+300000)fail(`Invalid/future ${label}.`);
 return Date.parse(value);
}

export async function verifyOwnerAdditional17ContentAcceptance(root,receiptOverride){
 const canonicalRoot=await realpath(root);
 const readSafe=async relative=>{
  if(!safe(relative))fail(`Unsafe relative path: ${relative}`);
  const full=path.join(root,relative),resolved=await realpath(full),rel=path.relative(canonicalRoot,resolved);
  if(!rel||rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel))fail(`Path escapes repository: ${relative}`);
  const stat=await lstat(full);if(!stat.isFile()||stat.isSymbolicLink())fail(`Expected regular evidence/page file: ${relative}`);
  return readFile(full);
 };
 const receipt=receiptOverride??JSON.parse((await readSafe(`${DIR}/owner-acceptance.json`)).toString('utf8'));
 keys(receipt,['schemaVersion','cohortId','draftOnly','registrationStatus','approvalType','decisionDate','recordedAt','registeredAt','decisionSource','reviewMethod','nativeSpeakerReviewPerformed','deploymentAuthorized','acceptedPageCount','localeCounts','acceptedEvidencePackage','registrationEvidencePackage','evidence','artifacts'],'Receipt');
 if(receipt.schemaVersion!==1||receipt.cohortId!=='2026-11-14-additional-17'||receipt.draftOnly!==false||receipt.registrationStatus!=='REGISTERED')fail('Receipt is not a registered independent 17-page cohort.');
 if(receipt.approvalType!=='OWNER_ACCEPTED_AI_REVIEWED_CONTENT'||receipt.reviewMethod!=='AI_REVIEWED'||receipt.nativeSpeakerReviewPerformed!==false||receipt.deploymentAuthorized!==false)fail('AI content acceptance cannot become human/native review or deployment authorization.');
 if(receipt.decisionDate!=='2026-11-14')fail('Stale/substituted owner approval date.');
 if(receipt.acceptedPageCount!==17||!plain(receipt.localeCounts)||!same(Object.entries(receipt.localeCounts).sort(),Object.entries(LOCALES).sort()))fail('Approval count/locale distribution must be 17 and 4/4/5/4.');
 keys(receipt.registrationEvidencePackage,['name','sha256'],'Registration package');
 if(!same(receipt.registrationEvidencePackage,PACKAGE))fail('Registration evidence package binding mismatch.');
 keys(receipt.acceptedEvidencePackage,['name','sha256'],'Accepted package');
 const observed=timestamp(receipt.recordedAt,'decision recording time'),registered=timestamp(receipt.registeredAt,'registration time');
 if(new Date(registered).toISOString()!==receipt.registeredAt)fail('Registration time must be a real canonical UTC timestamp.');
 if(registered<observed)fail('Registration must not precede the observed owner decision.');
 const expected=Object.entries(PINS).map(([name,sha256])=>({path:`${DIR}/${name}`,sha256}));
 if(!Array.isArray(receipt.evidence)||receipt.evidence.length!==expected.length)fail('Missing/unexpected approval evidence.');
 for(const e of receipt.evidence){keys(e,['path','sha256'],'Evidence');if(!safe(e.path)||!sha(e.sha256))fail('Unsafe evidence path or digest.');}
 if(!same(normalize(receipt.evidence),normalize(expected)))fail('Pinned evidence paths/hashes do not match.');
 const evidence={};
 for(const [name,pinned] of Object.entries(PINS)){
  await readSafe(`${DIR}/${name}`);
  let bytes;try{bytes=await readRetainedApprovalBytes(root,`${DIR}/${name}`,pinned);}catch(e){fail(`Evidence bytes changed: ${name}; ${e.message}`);}
  if(hash(bytes)!==pinned)fail(`Evidence bytes changed: ${name}`);evidence[name]=bytes.toString('utf8');
 }
 const draft=JSON.parse(evidence['OWNER_17_RECEIPT_DRAFT.json']),review=JSON.parse(evidence['ORIGINAL_FINAL_17_AI_REVIEW.json']);
 return verifyBoundEvidence();
 async function verifyBoundEvidence(){
  if(receipt.recordedAt!==draft.recordedAt||receipt.decisionSource!==draft.decisionSource||!receipt.decisionSource.includes('conversation'))fail('Owner decision source/observed time must retain the original capture.');
  if(!same(receipt.acceptedEvidencePackage,draft.acceptedEvidencePackage))fail('Accepted original review package changed.');
  if(!evidence['OWNER_17_DECISION_SOURCE.md'].includes('OWNER_ACCEPTED_AI_REVIEWED_CONTENT')||!evidence['OWNER_17_DECISION_SOURCE.md'].includes('2026-11-14'))fail('Owner decision evidence missing.');
  if(!Array.isArray(review.reviews)||review.reviews.length!==17||review.ownerApproval!=='PENDING_OWNER_DECISION'||!review.method.startsWith('AI_REVIEWED;'))fail('Original AI history must remain AI-reviewed, with its historical pending decision intact.');
  if(timestamp(review.reviewedAt,'original review time')>observed)fail('Owner decision evidence predates AI review.');
  for(const x of review.reviews){
   if(x.result!=='PASS'||x.nativeSpeakerReviewPerformed!==false||!x.reviewMethod?.startsWith('AI_REVIEWED:')||x.ownerApproval!=='PENDING_OWNER_DECISION'||x.issue!=='')fail(`Invalid original AI result: ${x.path}`);
   if(timestamp(x.reviewedAt,'page review time')>observed)fail('Owner decision predates page review.');
   if(!evidence['ORIGINAL_FINAL_17_PAGE_AI_REVIEW.md'].includes(x.path)||!evidence['ORIGINAL_FINAL_17_PAGE_AI_REVIEW.md'].includes(x.sha256))fail('Original report does not bind reviewed page.');
  }
  if(!Array.isArray(receipt.artifacts)||receipt.artifacts.length!==17||new Set(receipt.artifacts.map(x=>x.path)).size!==17)fail('Approval scope must contain exactly 17 unique pages.');
  const counts={de:0,fr:0,ja:0,ru:0};
  for(const x of receipt.artifacts){
   keys(x,['path','sha256'],'Artifact');
   if(!safe(x.path)||!sha(x.sha256)||!/^(de|fr|ja|ru)\/[^/]+\.html$/.test(x.path))fail('Unsafe/invalid artifact path or digest.');
   if(/^(de|fr|ru)\/about\.html$/.test(x.path))fail('The three later About repairs cannot inherit this approval.');
   counts[x.path.split('/')[0]]++;
  }
  if(!same(counts,LOCALES))fail('Artifact locale distribution must be 4/4/5/4.');
  if(!same(normalize(receipt.artifacts),normalize(review.reviews))||!same(normalize(receipt.artifacts),normalize(draft.artifacts)))fail('Approval scope must exactly match the original 17 paths and SHA-256 values.');
  // Verify the unchanged old cohort before trusting its disjoint scope.
  await verifyOwnerAiContentAcceptance(root);
  const old=JSON.parse((await readSafe('audit/approvals/2026-11-13-ai-content/owner-acceptance.json')).toString('utf8'));
  const oldPaths=new Set(old.artifacts.map(x=>x.path));
  if(receipt.artifacts.some(x=>oldPaths.has(x.path)))fail('17-page and 80-page cohorts overlap.');
  for(const x of receipt.artifacts){await readSafe(x.path);await verifyOwnerArtifact(root,x.path,x.sha256);}
  return {acceptedPageCount:17,approvalType:receipt.approvalType,registrationStatus:'REGISTERED',localeCounts:counts,nativeSpeakerReviewPerformed:false,deploymentAuthorized:false,original80Verified:true,cohortsDisjoint:true};
 }
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 try{console.log(JSON.stringify(await verifyOwnerAdditional17ContentAcceptance(path.resolve(import.meta.dirname,'..'))));}
 catch(error){console.error(error.message);process.exitCode=1;}
}
