import fs from 'node:fs';
import path from 'node:path';
import {applyProductPolicy,assertOwnerProductPolicy} from './lib/owner-product-policy.mjs';
const root=path.resolve(import.meta.dirname,'..');
const config=JSON.parse(fs.readFileSync(path.join(root,'i18n/config.json'),'utf8'));
const models=config.pages.filter(p=>/^BP-[\w-]+\.html$/.test(p));
const write=process.argv.includes('--write');let changed=0;
for(const locale of ['en',...config.activeLanguageCodes])for(const page of models){
 const rel=locale==='en'?page:`${locale}/${page}`,file=path.join(root,rel),before=fs.readFileSync(file,'utf8');
 const after=applyProductPolicy(before,locale,page.slice(0,-5));assertOwnerProductPolicy(after,locale,page.slice(0,-5));
 if(after!==before){changed++;if(write)fs.writeFileSync(file,after);else console.error(`Outdated: ${rel}`);}
}
console.log(`Owner product policy: ${models.length*5} pages; ${changed} ${write?'updated':'outdated'}.`);
if(changed&&!write)process.exitCode=1;
