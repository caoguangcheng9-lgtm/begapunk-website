import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { load } from 'cheerio';
import { drawingBackedProductMetadata } from '../scripts/lib/drawing-backed-product-facts.mjs';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const records = JSON.parse(read('audit/localization/2026-09-09-bing-long-title-changes.json'));

test('the approved Bing list contains 22 unique pages', () => {
  assert.equal(records.length, 22);
  assert.equal(new Set(records.map((r) => r.path)).size, 22);
});

for (const record of records) {
  test(`${record.path}: concise title, unchanged visible content and synchronized sources`, () => {
    const $ = load(read(record.path));
    assert.equal($('title').length, 1);
    assert.equal($('title').text(), record.title);
    assert.ok(record.title.length <= 70 && record.title.length < record.oldTitle.length);
    for (const selector of ['meta[property="og:title"]', 'meta[name="twitter:title"]']) {
      assert.equal($(selector).length, 1);
      assert.equal($(selector).attr('content'), record.title);
    }
    assert.equal($('h1').text(), record.h1);
    assert.equal($('meta[name="description"]').attr('content'), record.description);
    // Ignore only outer document whitespace, which HTML parsing moves into body.
    assert.equal(createHash('sha256').update($('body').html().trim()).digest('hex'), record.bodySha256);
    assert.equal($('link[rel="canonical"]').attr('href'), `https://www.begapunk.com/${record.path}`);
    $('script[type="application/ld+json"]').each((_, el) => JSON.parse($(el).text()));
    const parts = record.path.split('/');
    const page = parts.at(-1);
    const locale = parts.length === 2 ? parts[0] : 'en';
    const prefix = locale === 'en' ? '' : `${locale}/`;
    const search = JSON.parse(read(`${prefix}search-index.json`));
    assert.equal(search.find((r) => r.url === page).title, record.title);
    if (locale !== 'en') {
      assert.equal(JSON.parse(read(`i18n/seo/${locale}.json`))[page].title, record.title);
    }
    if (page.startsWith('BP-')) {
      const metadata = drawingBackedProductMetadata(locale, page.replace('.html', ''));
      assert.equal(metadata.title, record.title);
      assert.equal(metadata.h1, record.h1);
    }
  });
}

test('unlisted product metadata keeps its established title contract', () => {
  for (const [locale, model] of [['en', 'BP-1P-0003'], ['de', 'BP-3P-S06-0001'], ['ja', 'BP-1P-0006'], ['ru', 'BP-2P-95-0005'], ['fr', 'BP-1P-0003']]) {
    const metadata = drawingBackedProductMetadata(locale, model);
    assert.equal(metadata.title, `${metadata.h1} | Begapunk`);
  }
});
