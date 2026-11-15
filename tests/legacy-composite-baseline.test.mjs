import test from 'node:test';
import assert from 'node:assert/strict';
import {sha,validateCompositeProposal,validateCompositeDecision,validateKnownCompositeObservation,normalReleasePrefix,assertNormalReleaseOutsideKnownComposite,requireCompositeOwner} from '../scripts/lib/legacy-composite-baseline.mjs';
const json=x=>Buffer.from(JSON.stringify(x));const clone=x=>structuredClone(x);
function fixture(){
 const base='a'.repeat(40),candidate='b'.repeat(40),release='20261111-000000-ads-inquiry-test';const old={},now={},blobs={};
 for(let i=0;i<809;i++){const p=`file-${String(i).padStart(3,'0')}.html`;blobs[p]=Buffer.from(`TEST ONLY before ${i}`);old[p]=sha(blobs[p]);now[p]=i<6?sha(Buffer.from(`TEST ONLY after ${i}`)):old[p];}
 const generated='testkey.txt',g=Buffer.from('testkey');old[generated]=now[generated]=sha(g);
 const manifest=rows=>Buffer.from(Object.keys(rows).sort().map(p=>`${rows[p]}  ${p}\n`).join(''));
 const before=manifest(old),after=manifest(now),patch=Object.keys(old).filter(p=>old[p]!==now[p]).map(file=>({file,before_sha256:old[file],after_sha256:now[file]}));
 const entries=Object.keys(now).sort().map(path=>({path,sha256:now[path]}));const sources={patch:json(patch),beforeManifest:before,afterManifest:after,plan:json({release_id:release,before_manifest:sha(before),after_manifest:sha(after)}),postflight:json({release:`/www/begapunk/releases/${release}`,manifest_sha256:sha(after),manifest_entries:810,six_after_matches:true,symlinks:[]}),ownerHistoricalReport:Buffer.from(`FICTIONAL TEST OWNER REPORT ${release} ${sha(after)}`)};
 sources.historicalEvidenceIndex=json({files:Object.entries({beforeManifest:'before-manifest.sha256',afterManifest:'after-manifest.sha256',plan:'release-plan.json',postflight:'postflight-inventory.json'}).map(([key,file])=>({file,sha256:sha(sources[key])}))});
 const proposal={schemaVersion:1,kind:'KNOWN_LEGACY_COMPOSITE_BASELINE',status:'PENDING_OWNER_APPROVAL',ownerEvidence:null,deploymentAuthorized:false,fileCount:810,gitBase:base,releaseId:release,manifestRawSha256:sha(after),entries,hotfixes:patch,generatedFile:{path:generated,rawSha256:sha(g),rawBase64:g.toString('base64')},retainedEvidence:Object.fromEntries(Object.entries(sources).map(([k,b])=>[k,{rawSha256:sha(b),rawBase64:b.toString('base64')}]))};
 const builder=Buffer.from("await writeFile(path.join(outputRoot, `${indexNowKey}.txt`), indexNowKey, 'utf8');");blobs['scripts/build-production-release.mjs']=builder;proposal.generatedFile.generationEvidence={commit:base,path:'scripts/build-production-release.mjs',rawSha256:sha(builder)};
 const recorded=json({activeStable:true,manifestUnchangedDuringRead:true,manifestFileChecks:810,manifestFailures:[],activeTargetBefore:`/www/begapunk/releases/${release}`,activeTargetAfter:`/www/begapunk/releases/${release}`,manifestSha256:sha(after),manifestEntries:entries});proposal.retainedEvidence.productionObservation={rawBase64:recorded.toString('base64'),rawSha256:sha(recorded)};
 const bytes=json(proposal),pin={sha256:sha(bytes)};
 const observation={releaseId:release,activeStable:true,manifestRawBase64:after.toString('base64'),manifestSha256:sha(after),files:clone(entries),regularPaths:[...entries.map(x=>x.path),'manifest.sha256'],unsafePaths:[],runtimeLinks:[]};
 const evidence={decision:'OWNER_APPROVED_COMPOSITE_BASELINE_FACTS',proposalSha256:pin.sha256,authorizationReference:'FICTIONAL_TEST_ONLY',deploymentAuthorized:false,approvedAt:'2020-01-01T00:00:00Z'};const evidenceBytes=json(evidence);
 const decision={status:'APPROVED',decision:evidence.decision,deploymentAuthorized:false,proposalSha256:pin.sha256,previousRecordSha256:pin.sha256,releaseId:release,gitBase:base,manifestRawSha256:sha(after),ownerEvidencePath:'test-only-evidence.json',ownerEvidenceSha256:sha(evidenceBytes),authorizationReference:evidence.authorizationReference};const decisionBytes=json(decision);const decisionPin={sha256:sha(decisionBytes),proposalSha256:pin.sha256,ownerEvidencePath:decision.ownerEvidencePath,ownerEvidenceSha256:sha(evidenceBytes)};
 return {proposal,pin,bytes,observation,candidate,gitBytes:(ref,p)=>{assert.equal(ref,base);return blobs[p];},ancestor:(a,b)=>a===base&&b===candidate,decisionBytes,decisionPin,evidenceBytes};
}
test('fictional exact 810-file composite and separately pinned owner decision pass',()=>{const f=fixture();validateCompositeProposal(f.bytes,f.pin,f.gitBytes);validateKnownCompositeObservation(f.proposal,f.observation,f.candidate,f.ancestor);validateCompositeDecision(f);});
for(const [name,change]of [
 ['one hotfix byte',f=>f.observation.files[0].sha256='0'.repeat(64)],
 ['manifest byte',f=>f.observation.manifestRawBase64=Buffer.from('invalid').toString('base64')],
 ['unknown seventh file',f=>f.observation.regularPaths.push('seventh.html')],
 ['missing file',f=>f.observation.files.pop()],
 ['duplicate file',f=>f.observation.files[1]=f.observation.files[0]],
 ['forged directory Git suffix',f=>f.observation.releaseId='20261111-000000-ads-inquiry-aaaaaaaaaaaa'],
 ['unknown legacy',f=>f.observation.releaseId+='-unknown'],
 ['active moved',f=>f.observation.activeStable=false],
 ['wrong Git ancestry',f=>f.ancestor=()=>false],
 ['unsafe symlink',f=>f.observation.runtimeLinks=[{path:'.env',target:'/etc/passwd',exists:true}]],
 ['rollback manifest differs',f=>f.proposal.manifestRawSha256='c'.repeat(64)]
])test(`reject ${name}`,()=>{const f=fixture();change(f);assert.throws(()=>validateKnownCompositeObservation(f.proposal,f.observation,f.candidate,f.ancestor));});
test('asset-hash legacy id cannot masquerade as normal Git release',()=>assert.throws(()=>normalReleasePrefix('20261111-102512-ads-inquiry-27b58d92dbd3')));
test('normal Git release format preserved',()=>assert.equal(normalReleasePrefix('20261109-053030-b624739c9b6a-r2'),'b624739c9b6a'));
test('proposal field tamper is rejected',()=>{const f=fixture();f.proposal.gitBase='f'.repeat(40);assert.throws(()=>validateCompositeProposal(json(f.proposal),f.pin,f.gitBytes));});
test('historical raw evidence tamper rejected even with a fictional re-pin',()=>{const f=fixture();f.proposal.retainedEvidence.patch.rawBase64=Buffer.from('[]').toString('base64');const b=json(f.proposal);assert.throws(()=>validateCompositeProposal(b,{sha256:sha(b)},f.gitBytes));});
test('unapproved or tampered decision rejected',()=>{const f=fixture();let d=JSON.parse(f.decisionBytes);d.status='PENDING_OWNER_APPROVAL';const b=json(d);assert.throws(()=>validateCompositeDecision({...f,decisionBytes:b,decisionPin:{...f.decisionPin,sha256:sha(b)}}));assert.throws(()=>validateCompositeDecision({...f,evidenceBytes:json({})}));});
test('real registry refuses approval even with environment and valid fictional proposal',async()=>{process.env.COMPOSITE_APPROVED='true';try{await assert.rejects(requireCompositeOwner(process.cwd(),fixture()),/PENDING_OWNER_APPROVAL/);}finally{delete process.env.COMPOSITE_APPROVED;}});
test('wrong original Git base rejected even with fictional re-pin',()=>{const f=fixture();f.proposal.gitBase='f'.repeat(40);const b=json(f.proposal);assert.throws(()=>validateCompositeProposal(b,{sha256:sha(b)},f.gitBytes));});
test('historical IndexNow generator tamper rejected with fictional re-pin',()=>{const f=fixture();f.proposal.generatedFile.generationEvidence.rawSha256='0'.repeat(64);const b=json(f.proposal);assert.throws(()=>validateCompositeProposal(b,{sha256:sha(b)},f.gitBytes));});
test('retained production observation must cover all 810 files',()=>{const f=fixture();const x=f.proposal.retainedEvidence.productionObservation;const o=JSON.parse(Buffer.from(x.rawBase64,'base64'));o.manifestFileChecks=809;const b=json(o);x.rawBase64=b.toString('base64');x.rawSha256=sha(b);const proposal=json(f.proposal);assert.throws(()=>validateCompositeProposal(proposal,{sha256:sha(proposal)},f.gitBytes));});

test('renaming a known composite to a Git-shaped release cannot bypass owner approval',()=>{const f=fixture();f.observation.releaseId='20261111-102512-'+f.proposal.gitBase.slice(0,12);assert.throws(()=>assertNormalReleaseOutsideKnownComposite(f.proposal,f.observation,f.proposal.gitBase));f.observation.manifestSha256='0'.repeat(64);assert.throws(()=>assertNormalReleaseOutsideKnownComposite(f.proposal,f.observation,f.proposal.gitBase));});
test('future normal Git identity is outside the one-release migration exception',()=>{const f=fixture();f.observation.manifestSha256='f'.repeat(64);assert.doesNotThrow(()=>assertNormalReleaseOutsideKnownComposite(f.proposal,f.observation,f.candidate));});
