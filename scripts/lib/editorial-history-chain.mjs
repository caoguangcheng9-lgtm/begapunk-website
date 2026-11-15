import {createArtifactSnapshot,assertReviewedBaselineTransition,mechanicalSha256} from './editorial-artifact-snapshot.mjs';
import {loadComposite,requireCompositeOwner,git,sha,must} from './legacy-composite-baseline.mjs';
import {readApprovalFile,readRetainedApprovalBytes,gitLfBytes} from './owner-incremental-acceptance.mjs';
import {INCREMENTAL_PROPOSALS} from './owner-incremental-trust.mjs';
import {verifyOwnerAdditional17ContentAcceptance} from '../verify-owner-additional17-content-acceptance.mjs';
function field(source,name){const matches=[...source.matchAll(new RegExp(`^${name}: (.*)$`,'gm'))];must(matches.length===1,`Missing/duplicate evidence field: ${name}`);return matches[0][1].trim();}
export async function validateHistoryChain({nodes,readBytes,readEvidence,ownerSemanticAllowed}){
 must(nodes.length>=2,'Missing historical step');const paths=nodes[0].artifacts.map(a=>a.path);must(new Set(paths).size===paths.length,'Duplicate baseline paths');let steps=0,semanticSteps=0;
 const snapshots=new Map();
 for(let n=0;n<nodes.length;n++){
  const node=nodes[n];must(Number.isFinite(Date.parse(node.updatedAt))&&(n===0||Date.parse(node.updatedAt)>Date.parse(nodes[n-1].updatedAt)),'Historical step order invalid');
  must(JSON.stringify(node.artifacts.map(a=>a.path).sort())===JSON.stringify([...paths].sort()),'Cross-page/missing historical scope');
  for(const a of node.artifacts){
   const bytes=await readBytes(n,a.path);const actual=createArtifactSnapshot(a.path,bytes);
   must(actual.semanticSha256===a.semanticSha256&&actual.mechanicalSha256===a.mechanicalSha256,`Historical node bytes mismatch: ${a.path}`);snapshots.set(`${n}:${a.path}`,actual);
   if(n===0)continue;const before=snapshots.get(`${n-1}:${a.path}`);if(before.mechanicalSha256===a.mechanicalSha256&&before.semanticSha256===a.semanticSha256)continue;
   assertReviewedBaselineTransition(before,a,nodes[n-1].updatedAt);
   const semantic=before.semanticSha256!==a.semanticSha256,p=a.mechanicalProvenance;must(p&&p.baselineManifestUpdatedAt===nodes[n-1].updatedAt,'Missing intermediate snapshot');
   const raw=await readEvidence(n,p.record);must(mechanicalSha256(raw)===p.recordSha256,'Historical evidence digest mismatch');const source=raw.toString('utf8').replace(/\r\n?/g,'\n');
   const kind=semantic?'reviewedArtifactTransitions':'changedArtifactTransitions';
   must((semantic&&p.kind==='semantic-review-artifact-capture')||(!semantic&&p.kind==='mechanical-only-refresh'),'Mechanical step hides semantic review or invalid capture kind');
   const transitions=JSON.parse(field(source,kind));must(Array.isArray(transitions)&&new Set(transitions.map(x=>x.path)).size===transitions.length,'Duplicate transition paths');const t=transitions.find(x=>x.path===a.path);must(t&&t.beforeMechanicalSha256===before.mechanicalSha256&&t.afterMechanicalSha256===a.mechanicalSha256,'Cross-page/intermediate SHA mismatch');
   must(field(source,semantic?'reviewedAt':'changedAt')===p.recordedAt&&Date.parse(p.recordedAt)<=Date.parse(node.updatedAt),'Evidence order/time mismatch');
   must(field(source,'semanticReviewPerformed')===(semantic?'true':'false')&&field(source,'nativeSpeakerReviewPerformed')==='false','Invalid review claim');
   if(semantic){
    const sp=a.semanticProvenance;must(sp.record===p.record&&sp.recordSha256===p.recordSha256&&t.beforeSemanticSha256===before.semanticSha256&&t.afterSemanticSha256===a.semanticSha256,'Semantic transition proof mismatch');
    must(JSON.parse(field(source,'reviewedArtifactPaths')).includes(a.path)&&JSON.parse(field(source,'blockingIssues')).length===0,'Semantic review scope/blocking issue');
    must(await ownerSemanticAllowed({path:a.path,node:n,record:p.record,source,before,after:a,bytes}),'Missing original owner semantic approval');semanticSteps++;
   } else must(before.semanticSha256===a.semanticSha256,'Mechanical change includes semantics');
   steps++;
  }
 }
 return {paths:paths.length,steps,semanticSteps,finalArtifacts:nodes.at(-1).artifacts};
}
export async function inspectKnownHistory(root,baseline,currentManifest){
 const loaded=await loadComposite(root),p=loaded.proposal;must(baseline===p.gitBase,'Wrong production history base');
 const head=git(root,['rev-parse','HEAD']).toString().trim();git(root,['merge-base','--is-ancestor',baseline,head]);
 const nodes=p.governanceChain.map((ref,i)=>{git(root,['merge-base','--is-ancestor',ref.commit,head]);if(i)git(root,['merge-base','--is-ancestor',p.governanceChain[i-1].commit,ref.commit]);const b=git(root,['show',`${ref.commit}:audit/localization/current-localized-artifacts.json`]);must(sha(b)===ref.manifestRawSha256,'Pinned historical Git snapshot changed');return JSON.parse(b);});
 must(JSON.stringify(nodes.at(-1))===JSON.stringify(currentManifest),'Final governed snapshot differs from known history');
 const incPin=INCREMENTAL_PROPOSALS.find(x=>x.sha256===p.incrementalProposalSha256);must(incPin,'Existing 236 proposal missing');const incBytes=await readApprovalFile(root,incPin.path);must(sha(gitLfBytes(incBytes))===incPin.sha256,'236 retained proposal changed');const inc=JSON.parse(incBytes),pages=new Map(inc.pages.map(x=>[x.path,x]));
 // Reuse both existing cohort verifiers; their raw-byte and evidence checks remain mandatory.
 await verifyOwnerAdditional17ContentAcceptance(root);
 const owned=new Map();for(const dir of ['2026-11-13-ai-content','2026-11-14-additional-17']){const receipt=JSON.parse(await readApprovalFile(root,`audit/approvals/${dir}/owner-acceptance.json`));for(const a of receipt.artifacts)owned.set(a.path,a.sha256);}
 const warrantyEvidence=await readRetainedApprovalBytes(root,'audit/approvals/2026-11-14-additional-17/OWNER_17_DECISION_SOURCE.md','84c21744d993baea365a83d446e3c48285cfd98d1f892688fd9dc11b7512bbec');
 const approvedWarranty=warrantyEvidence.toString().includes('authorizes only the warranty-start corrections in de/about.html, fr/about.html and ru/about.html');
 const historicalBytes=new Map();
 const nodeBytes=(n,file)=>{const key=n+':'+file;if(historicalBytes.has(key))return historicalBytes.get(key);const artifact=nodes[n].artifacts.find(a=>a.path===file),prior=n?nodes[n-1].artifacts.find(a=>a.path===file):null;let bytes;if(prior&&prior.semanticSha256===artifact.semanticSha256&&prior.mechanicalSha256===artifact.mechanicalSha256)bytes=nodeBytes(n-1,file);else if(n<nodes.length-1)bytes=git(root,['show',p.governanceChain[n].commit+':'+file]);else{const page=pages.get(file);must(page,'Retained history path missing');bytes=Buffer.from(page.historicalRawBase64,'base64');must(sha(bytes)===page.historicalRawSha256,'Retained historical raw bytes changed');}historicalBytes.set(key,bytes);return bytes;};
 const result=await validateHistoryChain({nodes,
  readBytes:nodeBytes,
  readEvidence:(n,file)=>{must(/^audit\/localization\/[A-Za-z0-9_.-]+\.md$/.test(file),'Unsafe historical evidence path');return git(root,['show',`${p.governanceChain[n].commit}:${file}`]);},
  ownerSemanticAllowed:({path:file,node,record,source,bytes})=>{
   if(node<nodes.length-1)return field(source,'reviewedByRole')==='site-owner';
   if(owned.has(file))return sha(bytes)===owned.get(file);
   return approvedWarranty&&/^(de|fr|ru)\/about\.html$/.test(file)&&record==='audit/localization/2026-11-14-about-warranty-de-fr-ru-ai-review.md';
  }});
 let repairedDirectBindings=0;for(const a of nodes.at(-1).artifacts){try{assertReviewedBaselineTransition(nodes[0].artifacts.find(x=>x.path===a.path),a,nodes[0].updatedAt);}catch{repairedDirectBindings++;}}
 return {...result,repairedDirectBindings,loaded};
}
export async function approvedKnownHistory(root,baseline,currentManifest){const result=await inspectKnownHistory(root,baseline,currentManifest);await requireCompositeOwner(root,result.loaded);return result;}