import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { load } from 'cheerio';
import { readProtectedHoseState, assertProtectedHoseOutput } from '../scripts/lib/protected-hose-article-output.mjs';
import { SITE_STYLE_VERSION } from '../scripts/lib/site-asset-versions.mjs';
const root=path.resolve(import.meta.dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const config=JSON.parse(read('i18n/config.json'));
for(const lang of ['en',...config.activeLanguageCodes])test(lang+': every shared style URL is versioned and exists',()=>{
 for(const name of config.pages) {
  const rel=(lang==='en'?'':lang+'/')+name,$=load(read(rel));
  const links=$('link[rel="stylesheet"]').filter((_,el)=>/css\/style\.css/.test($(el).attr('href')||''));
  assert.equal(links.length,1,rel);
  const href=links.attr('href');assert.equal(href,(lang==='en'?'':'../')+'css/style.css?v='+SITE_STYLE_VERSION);
  assert.ok(fs.statSync(path.resolve(root,path.dirname(rel),href.split('?')[0])).isFile());
 }
});
function mutateSchema(html,change) {
 const $=load(html,{sourceCodeLocationInfo:true});const tag=$('script[type="application/ld+json"]').get(0);
 const data=JSON.parse($(tag).html());change(data);const p=tag.sourceCodeLocation;
 return html.slice(0,p.startTag.endOffset)+JSON.stringify(data)+html.slice(p.endTag.startOffset);
}
for(const lang of ['en',...config.activeLanguageCodes]) {
 const rel=(lang==='en'?'':lang+'/')+'blog-prevent-air-hose-twisting.html',html=read(rel);
 test(lang+': protected author retains legal identity, breadcrumbs and original ID state',()=>{
  const state=readProtectedHoseState(html);
  for(const key of ['legalName','alternateName','foundingDate','identifier'])assert.ok(state.author[key]);
  assert.equal(Object.hasOwn(state.author,'@id'),false);
  assert.equal(state.author.sameAs.length,5);
  assert.doesNotThrow(()=>assertProtectedHoseOutput(html,html,rel));
 });
 for(const key of ['legalName','alternateName','foundingDate','identifier'])test(lang+': rejects deletion of '+key,()=>{
  const changed=mutateSchema(html,data=>delete data['@graph'][0].author[key]);
  assert.throws(()=>assertProtectedHoseOutput(html,changed,rel),/Non-social Schema/);
 });
 test(lang+': rejects obsolete four-account author and breadcrumb rewrite',()=>{
  assert.throws(()=>assertProtectedHoseOutput(html,mutateSchema(html,d=>d['@graph'][0].author.sameAs.pop()),rel));
  assert.throws(()=>assertProtectedHoseOutput(html,mutateSchema(html,d=>d['@graph'][1].itemListElement[1].name='Unapproved label'),rel));
  assert.throws(()=>assertProtectedHoseOutput(html,html.replace('</main>','<p>Unapproved body</p></main>'),rel));
 });
}
