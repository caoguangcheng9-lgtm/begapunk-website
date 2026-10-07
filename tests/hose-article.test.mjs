import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {load} from 'cheerio';
const root=path.resolve(import.meta.dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const route='blog-prevent-air-hose-twisting.html';
const langs=['en','de','fr','ja','ru'];
const duty={en:/intermittent rotation/,de:/intermittierende Rotation/,fr:/rotation intermittente/,ja:/間欠回転/,ru:/прерывистое вращение/};
test('hose article preserves facts, translations, metadata and working local paths',()=>{
 for(const lang of langs){
  const prefix=lang==='en'?'':lang+'/',file=prefix+route,$=load(read(file));
  assert.equal($('html').attr('lang'),lang);assert.equal($('h1').length,1);
  assert.equal($('.ta-faq details').length,5);assert.equal($('.review-note').length,0);
  assert.equal($('meta[name="robots"]').length,0);assert.equal($('link[hreflang]').length,6);
  assert.equal($('.i18n-switcher option').length,5);
  assert.equal($('link[rel="canonical"]').attr('href'),`https://www.begapunk.com/${prefix}${route}`);
  assert.match($('.product-example').text(),duty[lang]);assert.match($('.product-example').text(),/100/);
  assert.match($('.product-example').text(),/20 × G1\/8|G1\/8 × 20/);
  assert.ok(!/BP-10P-0001-zh-review|source=output|中文审阅/.test(read(file)));
  assert.equal($('track').attr('srclang'),'en');
  const graph=JSON.parse($('script[type="application/ld+json"]').text())['@graph'];
  assert.equal(graph[0].inLanguage,lang);
  assert.deepEqual(graph.find(e=>e['@type']==='FAQPage').mainEntity.map(e=>[e.name,e.acceptedAnswer.text]),$('.ta-faq details').toArray().map(e=>[$(e).find('summary').text(),$(e).find('p').text()]));
  for(const e of $('.motion-table tbody tr').toArray())assert.deepEqual($(e).find('td').toArray().map(td=>$(td).attr('data-label')),$('.motion-table thead th').toArray().slice(1).map(th=>$(th).text()));
  for(const el of $('[href],[src],[poster]').toArray())for(const attr of ['href','src','poster']){
   const value=$(el).attr(attr);if(!value||/^(https?:|mailto:|tel:|data:)/.test(value))continue;
   if(value.startsWith('#')){assert.equal($(value).length,1,`${file}: missing ${value}`);continue;}
   const local=decodeURIComponent(value.split(/[?#]/)[0]);assert.ok(fs.existsSync(path.resolve(root,prefix,local)),`${file}: missing ${value}`);
  }
  const inquiry=new URL($('.ta-cta a').attr('href'),'https://www.begapunk.com/'+prefix);
  assert.equal(inquiry.searchParams.get('source'),prefix+route);
  assert.equal(inquiry.searchParams.get('request'),'application-review');
  assert.equal(inquiry.searchParams.get('application'),JSON.parse(read(`i18n/manual/hose-article-${lang}.json`))[2]);
 }
});
test('hose article is discoverable from each language and Chinese review stays private',()=>{
 const sitemap=read('sitemap-i18n.xml');
 for(const lang of langs){const prefix=lang==='en'?'':lang+'/';
  const blog=load(read(prefix+'blog.html'));assert.equal(blog(`.blog-card:has(a[href="${route}"])`).length,1);
  assert.equal(JSON.parse(blog('script[type="application/ld+json"]').first().text()).blogPost.filter(p=>p.url===`https://www.begapunk.com/${prefix}${route}`).length,1);
  for(const f of ['BP-10P-0001.html','application-automation-rotary-tables.html']){const $=load(read(prefix+f));assert.equal($(`main a[href="${route}"]`).length,1);}
  assert.equal(JSON.parse(read(prefix+'search-index.json')).filter(r=>r.url===route).length,1);
  assert.ok(read(prefix+'llms.txt').includes(`/${prefix}${route}`));assert.ok(sitemap.includes(`/${prefix}${route}`));
 }
 assert.ok(read('sitemap.xml').includes('/'+route));assert.ok(!sitemap.includes('zh-review'));
 const review=load(read('output/blog-prevent-air-hose-twisting-zh-review.html'));
 assert.match(review('meta[name="robots"]').attr('content'),/noindex/);
 assert.equal(review('script[src*="analytics"]').length,0);
});
