import {readFile,appendFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {loadComposite,requireCompositeOwner,validateKnownCompositeObservation,validateObservedFiles,normalReleasePrefix,assertNormalReleaseOutsideKnownComposite,git,must} from './lib/legacy-composite-baseline.mjs';
export async function verifyActiveBaseline(root,observation,{candidate,baseline,expectedManifest,expectedRelease}={}){
 if(expectedManifest!==undefined)must(observation.manifestSha256===expectedManifest,'Rollback manifest does not match captured approval');
 if(expectedRelease!==undefined)must(observation.releaseId===expectedRelease,'Rollback release identity changed');
 const ancestor=(a,b)=>spawnSync('git',['merge-base','--is-ancestor',a,b],{cwd:root}).status===0;
 const loaded=await loadComposite(root);let result;
 if(observation.releaseId===loaded.proposal.releaseId){
  result=validateKnownCompositeObservation(loaded.proposal,observation,candidate,ancestor);must(baseline===result.gitBase,'Protected Git base differs from registered composite');await requireCompositeOwner(root,loaded);
 }else{
  assertNormalReleaseOutsideKnownComposite(loaded.proposal,observation,baseline);
  validateObservedFiles(observation);const prefix=normalReleasePrefix(observation.releaseId);const commit=git(root,['rev-parse','--verify',`${prefix}^{commit}`]).toString().trim();
  must(commit===baseline&&candidate!==baseline&&ancestor(baseline,candidate),'Active Git commit / protected base mismatch');result={identityKind:'GIT_COMMIT',activeCommit:commit,gitBase:commit,releaseId:observation.releaseId,manifestSha256:observation.manifestSha256};
 }
 return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [file,candidate,baseline,expectedRelease,expectedManifest]=process.argv.slice(2);must(file&&candidate&&baseline&&Boolean(expectedRelease)===Boolean(expectedManifest),'Usage: verify-active-release-baseline observation.json candidateSHA baselineSHA [expectedRelease expectedManifest]');
 const result=await verifyActiveBaseline(process.cwd(),JSON.parse(await readFile(file,'utf8')),{candidate,baseline,expectedRelease,expectedManifest});
 if(process.env.GITHUB_ENV)await appendFile(process.env.GITHUB_ENV,`VERIFIED_ACTIVE_RELEASE_ID=${result.releaseId}\nVERIFIED_ACTIVE_MANIFEST_SHA256=${result.manifestSha256}\n`);
 console.log(JSON.stringify(result));
}