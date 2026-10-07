import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { load } from 'cheerio';
import { assertBp10ProductContract } from '../scripts/lib/bp10-product-contract.mjs';
import { renderInternationalSitemaps } from '../scripts/lib/sitemap-i18n.mjs';

const root = path.resolve(import.meta.dirname, '..');
const route = 'BP-10P-0001.html';
const url = `https://www.begapunk.com/${route}`;
const read = (file) => readFile(path.join(root, file), 'utf8');

test('BP10 trust contract rejects wrong duty cycle, seal, port count and RFQ attribution', async () => {
  const source = await read(route);
  assertBp10ProductContract(load(source), 'en', route);
  for (const [before, after] of [
    ['100 RPM — intermittent rotation', '100 RPM — continuous rotation'],
    ['<td>O-ring</td>', '<td>PTFE</td>'],
    ['20 × G1/8: 10 inlet + 10 outlet', '20 × G1/8: 1 inlet + 19 outlet'],
    ['&amp;source=BP-10P-0001.html', '&amp;source=BP-8P-0001.html'],
  ]) {
    assert.ok(source.includes(before), `Mutation target missing: ${before}`);
    assert.throws(() => assertBp10ProductContract(load(source.replaceAll(before, after)), 'en', route));
  }
});

test('BP10 is discoverable once in the catalog, comparison and both sitemaps', async () => {
  const catalog = load(await read('products.html'));
  const card = catalog(`[data-href="${route}"]`);
  assert.equal(card.length, 1);
  assert.equal(card.attr('data-channel'), '4-channel+');
  assert.match(card.text(), /100 RPM · intermittent/);
  const list = JSON.parse(catalog('script[type="application/ld+json"]').first().text());
  assert.equal(list.numberOfItems, catalog('.product-card-large').length);
  assert.equal(list.itemListElement.filter((item) => item.url === url).length, 1);
  const comparison = load(await read('product-comparison.html'));
  const row = comparison(`tr:has(a[href="${route}"])`);
  assert.equal(row.length, 1);
  assert.match(row.text(), /100 RPM \(intermittent\)/);
  for (const file of ['sitemap.xml', 'sitemap-i18n.xml']) {
    const xml = load(await read(file), { xmlMode: true });
    assert.equal(xml('loc').toArray().filter((el) => xml(el).text() === url).length, 1);
    assert.equal(xml('url').length, xml('loc').length);
    assert.ok(!xml.text().includes('${1}'));
  }
});

test('BP10 facts and multilingual discovery stay consistent', async () => {
  const $ = load(await read(route));
  const product = JSON.parse($('script[type="application/ld+json"]').text())['@graph'].find((item) => item['@type'] === 'Product');
  const rows = $('.spec-table tr').toArray().map((el) => [$(el).find('th').text(), $(el).find('td').text()]);
  assert.deepEqual(product.additionalProperty.map((p) => [p.name, p.value]), rows);
  assert.match(product.description, /100 RPM for intermittent rotation/);
  assert.match(product.description, /O-ring/);
  const records = JSON.parse(await read('search-index.json')).filter((r) => r.url === route);
  assert.equal(records.length, 1);
  assert.match(records[0].body, /100 RPM/);
  for (const lang of ['de','fr','ja','ru']) {
    assert.equal(JSON.parse(await read(`${lang}/search-index.json`)).filter((r) => r.url === route).length, 1);
    assert.ok((await read('sitemap-i18n.xml')).includes(`/${lang}/${route}`));
    const local = load(await read(`${lang}/${route}`));
    assert.equal(local('html').attr('lang'), lang);
    assert.equal(local('link[rel="canonical"]').attr('href'), `https://www.begapunk.com/${lang}/${route}`);
    assert.equal(local('link[hreflang]').length, 6);
    assert.equal(local('.i18n-switcher option').length, 5);
    const graph=JSON.parse(local('script[type="application/ld+json"]').text())['@graph'];
    const facts=graph.find(o=>o['@type']==='Product');
    assert.deepEqual(facts.additionalProperty.map(p=>[p.name,p.value]),local('.spec-table tr').toArray().map(e=>[local(e).find('th').text(),local(e).find('td').text()]));
    assert.equal(facts.additionalProperty.length,17);
    assert.equal(graph.find(o=>o['@type']==='FAQPage').mainEntity.length,5);
    assert.equal(local('a[href="../downloads/BP-10P-0001.step"]').length,2);
    assert.equal(local('track').attr('srclang'),'en');
    assert.ok(!/PTFE|FKM/.test(local('main').text()));
    const catalog=load(await read(`${lang}/products.html`));
    assert.equal(catalog(`[data-href="${route}"]`).length,1);
    assert.equal(catalog('.product-card-large').length,17);
    const comparison=load(await read(`${lang}/product-comparison.html`));
    assert.equal(comparison(`tr:has(a[href="${route}"])`).length,1);
    for(const file of ['application-automation-rotary-tables.html','application-cnc-pneumatic-clamping.html']) {
      const app=load(await read(`${lang}/${file}`));
      assert.equal(app(`main a[href="${route}"]`).length,1);
    }
    for(const element of local('main a[href^="contact.html?"]').toArray()) {
      const link=new URL(local(element).attr('href'),`https://www.begapunk.com/${lang}/`);
      assert.equal(link.searchParams.get('model'),'BP-10P-0001');
      assert.equal(link.searchParams.get('source'),`${lang}/${route}`);
    }
  }
  for (const file of ['application-automation-rotary-tables.html', 'application-cnc-pneumatic-clamping.html']) {
    const page = load(await read(file));
    assert.equal(page(`main a[href="${route}"]`).length, 1);
  }
  assert.ok(!(await read('sitemap-i18n.xml')).includes('zh-review'));
  assert.ok(!JSON.parse(await read('search-index.json')).some((r) => r.url.includes('zh-review')));
});

test('source-only sitemap needs no translated file and preserves unchanged lastmod', async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'bp10-sitemap-'));
  try {
    await mkdir(path.join(temp, 'de'));
    for (const file of ['index.html','de/index.html',route]) await writeFile(path.join(temp,file),'<h1>fixture</h1>');
    const config = {siteUrl:'https://example.com',sourceLanguage:{code:'en'},languages:[{code:'de'}],activeLanguageCodes:['de'],pages:['index.html'],sourceOnlyPages:[route]};
    const first = await renderInternationalSitemaps({contentRoot:temp,config,currentDate:'2026-10-07'});
    assert.ok(first.sitemaps.get('sitemap-i18n.xml').includes(`https://example.com/${route}`));
    assert.ok(!first.sitemaps.get('sitemap-i18n.xml').includes(`/de/${route}`));
    const next = await renderInternationalSitemaps({contentRoot:temp,config,previousState:first.state,currentDate:'2026-10-08'});
    assert.equal(next.state.pages[`https://example.com/${route}`].lastmod,'2026-10-07');
    await assert.rejects(renderInternationalSitemaps({contentRoot:temp,config:{...config,sourceOnlyPages:['index.html']}}),/sourceOnlyPages/);
  } finally {
    assert.equal(path.dirname(path.resolve(temp)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(temp).startsWith('bp10-sitemap-'));
    await rm(temp,{recursive:true,force:true});
  }
});
