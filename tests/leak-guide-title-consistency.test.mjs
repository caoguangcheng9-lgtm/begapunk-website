import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { load } from 'cheerio';

const root = new URL('../', import.meta.url);
const read = (file) => readFileSync(new URL(file, root), 'utf8');
const page = 'blog-rotary-joint-leaking.html';
const titles = {
  "en": "Leaking Rotary Union? 5-Step Troubleshooting | Begapunk",
  "de": "Drehdurchführung undicht? Fehlersuche in 5 Schritten",
  "fr": "Raccord tournant qui fuit ? Diagnostic en 5 étapes",
  "ja": "ロータリージョイントの漏れ：5段階の点検ガイド",
  "ru": "Утечка в ротационном соединении: 5 шагов диагностики"
};
const headings = {
  "en": "Leaking Rotary Union? A Five-Step Troubleshooting Guide",
  "de": "Drehdurchführung undicht? Fehlersuche in 5 Schritten",
  "fr": "Raccord tournant qui fuit ? Diagnostic en 5 étapes",
  "ja": "ロータリージョイントの漏れ：5段階の点検ガイド",
  "ru": "Утечка в ротационном соединении: 5 шагов диагностики"
};
for (const lang of Object.keys(titles)) {
  const prefix = lang === 'en' ? '' : lang + '/';
  test(lang + ': five-step article title matches metadata and actual steps', () => {
    const $ = load(read(prefix + page));
    assert.equal($('title').text(), titles[lang]);
    assert.equal($('h1').length, 1);
    assert.equal($('h1').text(), headings[lang]);
    assert.equal($('meta[property="og:title"]').attr('content'), titles[lang]);
    assert.equal($('meta[name="twitter:title"]').attr('content'), titles[lang]);
    assert.equal($('main ol > li').length, 5);
    assert.equal($('link[rel="canonical"]').attr('href'), 'https://www.begapunk.com/' + prefix + page);
    const article = $('script[type="application/ld+json"]').toArray()
      .map((element) => JSON.parse($(element).text())).find((item) => item['@type'] === 'TechArticle');
    assert.equal(article.headline, headings[lang]);
    const search = JSON.parse(read(prefix + 'search-index.json')).find((item) => item.url === page);
    assert.equal(search.title, titles[lang]);
    if (lang !== 'en') {
      const seo = JSON.parse(read('i18n/seo/' + lang + '.json'))[page];
      assert.equal(seo.title, titles[lang]);
      assert.equal(seo.h1, headings[lang]);
      assert.ok(read(prefix + 'llms.txt').includes('[' + titles[lang] + '](https://www.begapunk.com/' + prefix + page + ')'));
      const overrides = JSON.parse(read('i18n/overrides/' + lang + '.json'));
      assert.equal(overrides[titles.en], titles[lang]);
      assert.equal(overrides[headings.en], headings[lang]);
    }
  });
  test(lang + ': home and related article describe a guide, not a flowchart', () => {
    const home = load(read(prefix + 'index.html'));
    const homeLink = home('a[href="' + page + '"]');
    assert.ok(homeLink.length > 0);
    assert.ok(homeLink.text().includes(lang === 'en' ? 'five-step troubleshooting guide' : headings[lang]));
    const related = load(read(prefix + 'blog-rotary-joint-installation-mistakes.html'));
    const card = related('a[href="' + page + '"]').closest('.related-card');
    assert.ok(card.length > 0);
    assert.ok(card.text().includes(lang === 'en' ? 'A Five-Step Troubleshooting Guide' : headings[lang]));
  });
}
