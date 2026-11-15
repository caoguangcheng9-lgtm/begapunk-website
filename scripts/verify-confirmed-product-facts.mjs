import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import crypto from 'node:crypto';
import {load} from 'cheerio';
import {policyCopy,productPolicy,assertOwnerProductPolicy} from './lib/owner-product-policy.mjs';
import {assertBp10ProductContract} from './lib/bp10-product-contract.mjs';
const root=path.resolve(import.meta.dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const config=JSON.parse(read('i18n/config.json')),facts=JSON.parse(read('data/product-drawing-facts.json'));
const models=config.pages.filter(p=>/^BP-[\w-]+\.html$/.test(p)).map(p=>p.slice(0,-5));
const locales=['en','de','fr','ja','ru'];let pages=0,jsonBlocks=0;
const notes=[];
for(const locale of locales)for(const model of models){
 const prefix=locale==='en'?'':locale+'/',rel=prefix+model+'.html',html=read(rel),$=load(html),c=policyCopy(locale);
 assertOwnerProductPolicy(html,locale,model);assert.equal($('html').attr('lang'),locale);
 assert.equal($('link[rel="canonical"]').attr('href'),'https://www.begapunk.com/'+rel);
 const graph=[];$('script[type="application/ld+json"]').each((_,n)=>{const j=JSON.parse($(n).text());jsonBlocks++;graph.push(...(j['@graph']||[j]));});
 const products=graph.filter(n=>n['@type']==='Product');assert.equal(products.length,1);const p=products[0];
 assert.ok(!('inLanguage' in p)&&!('associatedMedia' in p),'Product property applicability');
 assert.ok(p.additionalProperty.some(x=>x.propertyID==='begapunk-policy-quality'&&x.value===c.quality));
 if(productPolicy.paymentModels.includes(model)){assert.equal(p.offers,undefined);assert.ok($('main').text().includes(c.payment));}
 else assert.ok(!$('[data-owner-product-policy]').text().includes(c.payment),'Payment must not spread to other models');
 if(model!=='BP-10P-0001')assert.ok(!html.includes('MoS₂'),'BP10 coating leaked into another model');
 const text=$('main').text();
 if(['BP-2P-0002','BP-3P-0006'].includes(model)){
  assert.equal($('[data-drawing-fact="weight"]').length,0,'Unverified weight row must be absent');
  assert.ok(!p.additionalProperty.some(x=>/^(Weight|Gewicht|Masse|質量|Масса)$/u.test(x.name)),'Unverified weight JSON-LD must be absent');
 }assert.ok(!/30 days|7 days|30天|7天|leakage threshold|ISO 9001 certified/i.test($('[data-owner-product-policy]').text()));
 if(model==='BP-2P-0002'){
  assert.match($('[data-drawing-fact="speed"]').text(),/200/);assert.ok(!/300/.test($('[data-drawing-fact="speed"]').text()));
  assert.match($('[data-drawing-fact="temperature"]').text(),/100/);assert.match($('[data-drawing-fact="ports"]').text(),/PCD 16 mm/);
  assert.match($('[data-drawing-fact="ports"]').text(),/G1\/4[\s\S]*10/);assert.match($('[data-drawing-fact="mount"]').text(),/M6/);
  assert.ok(text.includes(c.topology));assert.ok(!/2-in-3-out|2-Inlet\/3-Outlet/i.test(html));
 }
 if(model==='BP-3P-0006'){assert.match($('[data-drawing-fact="ports"]').text(),/G1\/4/);assert.ok(!/G4\/1/.test(html));}
 if(model==='BP-10P-0001'){
  assertBp10ProductContract($,locale,rel);assert.ok(text.includes(c.seal)&&text.includes(c.weight));
  assert.ok(!/intermitt|間欠|прерывист/iu.test(text));
 }
 const price=productPolicy.prices[model];if(price){assert.ok(text.includes(c.bulk.replace('{price}',price)));assert.ok(text.includes(c.fob));assert.ok(text.includes(c.lead));assert.ok(text.includes(model==='BP-2P-08-0001'?c.stockConfirm:c.stock));}
 const faq=graph.find(n=>n['@type']==='FAQPage');if(faq){
  const visible=$('.faq-item').toArray().map(n=>[$(n).find('summary').text().replace(/\s+/g,' ').trim(),$(n).find('.faq-answer').text().replace(/\s+/g,' ').trim()]);
  assert.deepEqual(faq.mainEntity.map(n=>[n.name,n.acceptedAnswer.text]),visible);
 }
 for(const a of $('a[href*="downloads/"]').toArray()){
  const href=$(a).attr('href').split(/[?#]/)[0];if(/^https?:/.test(href))continue;
  assert.ok(fs.existsSync(path.resolve(root,prefix,href)),`${rel}: missing download ${href}`);
 }
 notes.push({locale,model,result:'PASS',jsonLd:'PASS',ownerPolicy:'PASS',commercial:productPolicy.paymentModels.includes(model)?'PASS':'NOT_APPLICABLE'});pages++;
}
assert.equal(facts.products['BP-2P-0002'].drawingFacts.maximumSpeed.value,200);
assert.equal(facts.products['BP-2P-0002'].drawingFacts.temperatureRange.maximum,100);
assert.equal(facts.products['BP-2P-0002'].drawingFacts.ports.annotations[1].pcdMm,16);
assert.equal(facts.products['BP-2P-0002'].drawingFacts.ports.annotations[2].depthMm,10);
assert.ok(facts.products['BP-3P-0006'].drawingFacts.ports.annotations.every(p=>p.thread==='G1/4'));
for(const [m,v] of Object.entries(JSON.parse(read('data/public-downloads.json')).drawingVersions)){
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'downloads',m+'.pdf'))).digest('hex'),v.sha256);
}
for(const locale of locales){
 const prefix=locale==='en'?'':locale+'/',c=policyCopy(locale);
 for(const page of ['products.html','faq.html','terms.html']){
  const $=load(read(prefix+page)),note=$('[data-commercial-scope]');
  assert.equal(note.length,1,`${prefix+page}: commercial precedence block`);
  assert.equal(note.find('h2').text(),c.commercialScopeHeading);
  assert.equal(note.find('p').text(),c.commercialScope);
 }
 const catalog=load(read(prefix+'products.html')),compare=load(read(prefix+'product-comparison.html'));
 assert.equal(catalog('a[href*="Begapunk-Rotary-Joint-Catalog-2026.pdf"]').length,0);
 const article=load(read(prefix+'blog-prevent-air-hose-twisting.html'));
 assert.ok(!/intermitt|Taktbetrieb|間欠|прерывист/iu.test(article('.product-example').text()));
 const bp2=catalog('[data-href="BP-2P-0002.html"]');assert.ok(bp2.text().includes('200')&&!bp2.text().includes('300'));
 for(const $ of [catalog,compare])assert.ok(!/intermitt|間欠|прерывист/iu.test($('[data-href="BP-10P-0001.html"],tr:has(a[href="BP-10P-0001.html"])').text()));
 assert.ok(read(prefix+'llms.txt').includes('200'));assert.ok(!/BP-10P-0001[^\n]*intermitt/iu.test(read(prefix+'llms.txt')));
 assert.ok(load(read(prefix+'terms.html'))('main').text().includes(c.warrantyShort));
}
console.log(JSON.stringify({result:'PASS',pages,jsonBlocks,localeRows:notes},null,2));
