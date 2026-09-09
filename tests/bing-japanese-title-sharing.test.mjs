import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { load } from 'cheerio';

const root = new URL('../', import.meta.url);
const read = (name) => readFileSync(new URL(name, root), 'utf8');
const seo = JSON.parse(read('i18n/seo/ja.json'));
const pages = [
  'blog-rotary-joint-materials.html',
  'blog-rotary-joint-selection.html',
  'blog-rotary-union-seal-types.html',
];

for (const page of pages) {
  test(`${page}: descriptive Japanese title stays consistent`, () => {
    const $ = load(read(`ja/${page}`));
    const title = seo[page].title;
    assert.ok(title.includes('ロータリージョイント'));
    assert.ok(title.endsWith(' | Begapunk'));
    assert.equal($('title').length, 1);
    assert.equal($('title').text(), title);
    assert.equal($('meta[property="og:title"]').attr('content'), title);
    assert.equal($('meta[name="twitter:title"]').attr('content'), title);
    assert.equal($('meta[name="description"]').attr('content'), seo[page].description);
    assert.equal($('h1').text(), seo[page].h1);
    assert.equal($('link[rel="canonical"]').attr('href'), `https://www.begapunk.com/ja/${page}`);
    const records = JSON.parse(read('ja/search-index.json'));
    assert.equal(records.find((record) => record.url === page).title, title);
    assert.ok(read('ja/llms.txt').includes(`[${title}](https://www.begapunk.com/ja/${page})`));
  });
}


for (const page of ['blog-rotary-joint-selection.html', 'blog-rotary-union-seal-types.html']) {
  test(`${page}: share links encode the current Japanese title and canonical URL`, () => {
    const $ = load(read(`ja/${page}`));
    const canonical = $('link[rel="canonical"]').attr('href');
    const title = $('title').text();
    for (const platform of ['twitter', 'whatsapp']) {
      const button = $(`.social-share a.share-${platform}`);
      assert.equal(button.length, 1);
      assert.equal(button.attr('target'), '_blank');
      assert.match(button.attr('rel'), /noopener/);
      assert.equal(button.attr('aria-label'), platform === 'twitter' ? 'Xでシェア' : 'WhatsAppでシェア');
      const share = new URL(button.attr('href'));
      assert.equal(share.origin, platform === 'twitter' ? 'https://twitter.com' : 'https://api.whatsapp.com');
      assert.equal(share.pathname, platform === 'twitter' ? '/intent/tweet' : '/send');
      assert.equal(share.searchParams.get('text'), platform === 'twitter' ? title : `${title} - ${canonical}`);
      if (platform === 'twitter') assert.equal(share.searchParams.get('url'), canonical);
    }
  });
}
