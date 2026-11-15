import test from 'node:test';import assert from 'node:assert/strict';
import {createArtifactSnapshot,mechanicalSha256}from'../scripts/lib/editorial-artifact-snapshot.mjs';
import {validateHistoryChain}from'../scripts/lib/editorial-history-chain.mjs';
const clone=x=>structuredClone(x);
function fixture(){
 const paths=['de/example.html','fr/example.html'],bytes=new Map(),records=new Map(),nodes=[];
 for(let n=0;n<3;n++){
  const updatedAt=`2020-01-0${n+1}T02:00:00Z`,artifacts=[];
  for(const path of paths){const b=Buffer.from(`<html><head><link href="style.css?v=${n?2:1}" rel="stylesheet"></head><body><p>${n===2?'OWNER APPROVED TEST CONTENT':'OLD TEST CONTENT'}</p></body></html>`);bytes.set(`${n}:${path}`,b);let a=createArtifactSnapshot(path,b);
   if(n){const before=nodes[n-1].artifacts.find(x=>x.path===path),semantic=n===2,record=`audit/localization/test-${n}-${path.slice(0,2)}.md`,recordedAt=`2020-01-0${n+1}T01:00:00Z`;const transition={path,beforeMechanicalSha256:before.mechanicalSha256,afterMechanicalSha256:a.mechanicalSha256,...(semantic?{beforeSemanticSha256:before.semanticSha256,afterSemanticSha256:a.semanticSha256}:{})};const source=Buffer.from(`${semantic?'reviewedAt':'changedAt'}: ${recordedAt}\nsemanticReviewPerformed: ${semantic}\nnativeSpeakerReviewPerformed: false\n${semantic?'reviewedArtifactTransitions':'changedArtifactTransitions'}: ${JSON.stringify([transition])}\nreviewedArtifactPaths: ${JSON.stringify([path])}\nblockingIssues: []\n`);records.set(record,source);a.mechanicalProvenance={kind:semantic?'semantic-review-artifact-capture':'mechanical-only-refresh',record,recordSha256:mechanicalSha256(source),recordedAt,baselineManifestUpdatedAt:nodes[n-1].updatedAt,beforeMechanicalSha256:before.mechanicalSha256,afterMechanicalSha256:a.mechanicalSha256};if(semantic)a.semanticProvenance={...a.mechanicalProvenance,kind:'ai-assisted-reviewed-semantic-change',semanticReviewPerformed:true,nativeSpeakerReviewPerformed:false,beforeSemanticSha256:before.semanticSha256,afterSemanticSha256:a.semanticSha256};}
   artifacts.push(a);
  }nodes.push({id:n,updatedAt,artifacts});
 }
 return {nodes,readBytes:(n,p)=>bytes.get(`${nodes[n].id}:${p}`),readEvidence:(n,p)=>records.get(p),ownerSemanticAllowed:()=>true,records};
}
test('legitimate multi-step history passes without inventing A-to-C',async()=>{const r=await validateHistoryChain(fixture());assert.equal(r.steps,4);assert.equal(r.semanticSteps,2);});
test('legitimate single-step mechanical history remains valid',async()=>{const f=fixture();f.nodes.pop();assert.equal((await validateHistoryChain(f)).steps,2);});
for(const [name,mutate]of [
 ['missing intermediate step',f=>f.nodes.splice(1,1)],
 ['intermediate SHA changed',f=>f.nodes[1].artifacts[0].mechanicalSha256='0'.repeat(64)],
 ['exchanged cross-page paths',f=>f.nodes[1].artifacts[0].path='fr/example.html'],
 ['cross-page review evidence',f=>{f.nodes[2].artifacts[0].mechanicalProvenance.record='audit/localization/test-2-fr.md';}],
 ['mechanical hides semantic change',f=>f.nodes[2].artifacts[0].mechanicalProvenance.kind='mechanical-only-refresh'],
 ['wrong baseline bytes',f=>f.nodes[0].artifacts[0].semanticSha256='0'.repeat(64)],
 ['missing owner semantic approval',f=>f.ownerSemanticAllowed=()=>false],
 ['deleted evidence',f=>f.records.delete('audit/localization/test-1-de.md')],
 ['evidence tampered',f=>f.records.set('audit/localization/test-1-de.md',Buffer.from('forged'))],
 ['steps reordered',f=>f.nodes.reverse()]
])test(`history refuses ${name}`,async()=>{const f=fixture();mutate(f);await assert.rejects(validateHistoryChain(f));});