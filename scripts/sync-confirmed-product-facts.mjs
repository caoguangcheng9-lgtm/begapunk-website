import {spawnSync} from 'node:child_process';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const write=process.argv.includes('--write');
if(process.argv.slice(2).some(a=>!['--write','--check'].includes(a)))throw new Error('Use --write or --check');
// Each generator has a bounded, reviewed write surface. No deployment/build cleanup.
const jobs=[
 ['sync-owner-product-policy.mjs',write?'--write':'--check'],
 ['sync-drawing-backed-product-pages.mjs',write?'--write':'--check'],
 ['sync-drawing-backed-product-content.mjs',write?'--write':'--check'],
 ['sync-bp10-localizations.mjs',write?'--write':'--check'],
 ['sync-owner-product-policy.mjs',write?'--write':'--check'],
 ['sync-product-faq-schema.mjs',...(write?[]:['--check'])],
 ['sync-product-discovery-facts.mjs',write?'--write':'--check'],
 ['sync-drawing-backed-llms.mjs',write?'--write':'--check'],
 ['sync-search-index.mjs',...(write?[]:['--check'])],
 ['generate-public-downloads-manifest.mjs',...(write?[]:['--check'])],
];
for(const [script,...args] of jobs){
 const r=spawnSync(process.execPath,[path.join(root,'scripts',script),...args],{cwd:root,stdio:'inherit'});
 if(r.error)throw r.error;if(r.status!==0)process.exit(r.status||1);
}
