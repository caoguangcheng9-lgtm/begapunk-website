import fs from 'node:fs';import path from 'node:path';
import {applyProductDiscovery} from './lib/product-discovery-facts.mjs';
const root=path.resolve(import.meta.dirname,'..'),write=process.argv.includes('--write');let changes=0;
for(const locale of ['en','de','fr','ja','ru'])for(const page of ['faq.html','terms.html','products.html','product-comparison.html','application-automation-rotary-tables.html','application-cnc-pneumatic-clamping.html']){
 const rel=(locale==='en'?'':locale+'/')+page,file=path.join(root,rel),before=fs.readFileSync(file,'utf8'),after=applyProductDiscovery(before,locale,page);
 if(after!==before){changes++;if(write)fs.writeFileSync(file,after);else console.error(`Outdated: ${rel}`);}
}
console.log(`Product discovery references: ${changes} ${write?'updated':'outdated'}.`);if(changes&&!write)process.exitCode=1;
