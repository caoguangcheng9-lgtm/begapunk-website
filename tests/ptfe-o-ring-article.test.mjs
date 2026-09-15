import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { test } from 'node:test';
import { load } from 'cheerio';
import sharp from 'sharp';

const root = new URL('../', import.meta.url);
const route = 'blog-ptfe-coated-o-rings.html';
const origin = 'https://www.begapunk.com/';
const read = (file) => readFileSync(new URL(file, root), 'utf8');
const $ = load(read(route));

test('English article metadata and schema agree, with five real translations', () => {
  assert.equal($('html').attr('lang'), 'en');
  assert.equal($('h1').length, 1);
  assert.equal($('title').length, 1);
  assert.equal($('link[rel="canonical"]').length, 1);
  assert.equal($('link[rel="canonical"]').attr('href'), origin + route);
  assert.equal($('meta[property="og:title"]').attr('content'), $('title').text());
  assert.equal($('meta[name="twitter:title"]').attr('content'), $('title').text());
  assert.deepEqual($('link[hreflang]').map((i, e) => $(e).attr('hreflang')).get(), ['en', 'de', 'fr', 'ja', 'ru', 'x-default']);
  const article = $('script[type="application/ld+json"]').toArray().map(e => JSON.parse($(e).text())).find(s => s['@type'] === 'TechArticle');
  assert.equal(article.headline, $('h1').text());
  assert.equal(article.mainEntityOfPage['@id'], origin + route);
});

test('optional scope, three photo stages and supplier measurement data stay explicit', () => {
  assert.match($('main').text(), /optional configuration/);
  assert.match($('main').text(), /not supplied as standard on every model/);
  assert.equal($('.ptfe-process-card').length, 3);
  assert.deepEqual($('.ptfe-results tbody td').map((i, e) => $(e).text()).get(), ['10.02 µm', '7.99 µm', '7.96 µm']);
  assert.match($('.ptfe-report-photo figcaption').text(), /provided by the supplier/);
  assert.doesNotMatch($('main').text(), /FKM|Glyd Ring|certified|guaranteed|all chemicals/i);
});

test('local assets, navigation targets and fragments resolve', () => {
  const ids = $('[id]').map((i, e) => $(e).attr('id')).get();
  assert.equal(ids.length, new Set(ids).size);
  for (const el of $('[href], [src], option[value]').toArray()) {
    const ref = $(el).attr('href') || $(el).attr('src') || $(el).attr('value');
    if (!ref || /^(https?:|mailto:|tel:|data:)/.test(ref)) continue;
    const url = new URL(ref, origin + route);
    const file = url.pathname.endsWith('/') ? url.pathname.slice(1) + 'index.html' : url.pathname.slice(1);
    assert.ok(existsSync(new URL(file, root)), 'Missing local file: ' + ref);
    if (url.hash && file.endsWith('.html')) {
      const target = load(read(file));
      assert.ok(target('[id]').toArray().some(e => target(e).attr('id') === decodeURIComponent(url.hash.slice(1))), 'Missing fragment: ' + ref);
    }
  }
});

test('article images have accurate dimensions and stripped private metadata', async () => {
  for (const el of $('main img').toArray()) {
    const image = $(el);
    const metadata = await sharp(readFileSync(new URL(image.attr('src'), root))).metadata();
    assert.equal(Number(image.attr('width')), metadata.width);
    assert.equal(Number(image.attr('height')), metadata.height);
    assert.ok(image.attr('alt'));
    assert.equal(metadata.exif, undefined);
    assert.equal(metadata.xmp, undefined);
    for (const candidate of (image.attr('srcset') || '').split(',').filter(Boolean)) {
      assert.ok(existsSync(new URL(candidate.trim().split(/\s+/)[0], root)));
    }
  }
});

test('blog card, Blog schema and English search record link to the article', () => {
  const blog = load(read('blog.html'));
  const link = blog('.blog-card h3 a[href="' + route + '"]');
  assert.equal(link.length, 1);
  assert.equal(link.text(), $('h1').text());
  assert.match(link.attr('style'), /display:block/);
  const schema = JSON.parse(blog('script[type="application/ld+json"]').first().text());
  assert.equal(schema.blogPost.filter(p => p.url === origin + route).length, 1);
  const records = JSON.parse(read('search-index.json')).filter(r => r.url === route);
  assert.equal(records.length, 1);
  assert.equal(records[0].title, $('title').text());
  assert.equal(records[0].h1, $('h1').text());
});

test('inquiry call to action preserves source and existing form route', () => {
  const url = new URL($('.ptfe-review .btn').attr('href'), origin);
  assert.equal(url.pathname, '/contact.html');
  assert.equal(url.searchParams.get('inquiry_type'), 'technical-consultation');
  assert.equal(url.searchParams.get('source'), route);
  assert.equal(url.hash, '#quoteForm');
});

const copy = JSON.parse(read('i18n/manual/ptfe-o-ring-article.json'));
test('article family is enrolled in discovery and release source inventories', () => {
  const config=JSON.parse(read('i18n/config.json'));
  assert.ok(config.pages.includes(route));
  assert.ok(config.manualLocalizedPages.includes(route));
  const assets=JSON.parse(read('audit/policy/public-directory-inventory.json')).files;
  assert.ok(assets.includes('css/ptfe-o-ring-article.css'));
  for(const el of $('main img').toArray())assert.ok(assets.includes($(el).attr('src')));
  const sitemap=read('sitemap-i18n.xml');
  for(const code of ['en','de','fr','ja','ru']) {
    const prefix=code==='en'?'':code+'/';
    assert.ok(sitemap.includes(origin+prefix+route));
    assert.ok(read(prefix+'llms.txt').includes(origin+prefix+route));
    if(code!=='en') {
      const overrides=JSON.parse(read('i18n/overrides/'+code+'.json'));
      assert.equal(overrides['Seal Options'],copy.translations[code][6]);
    }
  }
});
for (const code of ['de', 'fr', 'ja', 'ru']) {
  test(`${code}: localized copy, evidence and metadata match the reviewed translation`, () => {
    const p = load(read(code + '/' + route));
    const translated = i => copy.translations[code][i] ?? copy.source[i];
    assert.equal(p('html').attr('lang'), code);
    assert.equal(p('h1').text(), translated(7));
    assert.equal(p('title').text(), translated(0));
    assert.equal(p('meta[name="description"]').attr('content'), translated(57));
    assert.ok(p('main').text().includes(translated(9)), 'Optional/nonstandard scope');
    assert.ok(p('main').text().includes(translated(51)), 'Selection inputs');
    assert.equal(p('.ptfe-report-photo figcaption').text(), translated(48));
    assert.equal(p('.ptfe-process-card').length, 3);
    assert.deepEqual(p('.ptfe-results tbody td').map((i,e)=>p(e).text()).get().map(v=>v.replace(',','.')), ['10.02 µm','7.99 µm','7.96 µm']);
    assert.equal(p('link[rel="canonical"]').attr('href'), origin+code+'/'+route);
    const schemas=p('script[type="application/ld+json"]').toArray().map(e=>JSON.parse(p(e).text()));
    const article=schemas.find(s=>s['@type']==='TechArticle');
    assert.equal(article.inLanguage,code);
    assert.equal(article.headline,p('h1').text());
    assert.equal(article.description,p('meta[name="description"]').attr('content'));
    assert.equal(article.mainEntityOfPage['@id'],origin+code+'/'+route);
    assert.deepEqual(p('link[hreflang]').map((i,e)=>p(e).attr('hreflang')).get(),['en','de','fr','ja','ru','x-default']);
    assert.equal(p('main img').last().attr('src'),'../images/knowledge/ptfe-o-rings/supplier-thickness-report.png');
    const englishSentences=copy.source.filter(s=>s.length>35 && /[a-z]{4}/i.test(s));
    for(const source of englishSentences) assert.ok(!p('main').text().includes(source),'Untranslated English: '+source);
  });
  test(`${code}: links, language switch, blog and search route to the localized content`, () => {
    const p=load(read(code+'/'+route));
    for(const el of p('[href],[src],option[value]').toArray()) {
      const ref=p(el).attr('href')||p(el).attr('src')||p(el).attr('value');
      if(!ref || /^(https?:|mailto:|tel:|data:)/.test(ref))continue;
      const u=new URL(ref,origin+code+'/'+route);
      const file=u.pathname.slice(1)+(u.pathname.endsWith('/')?'index.html':'');
      assert.ok(existsSync(new URL(file,root)), 'Missing '+file);
      if(u.hash && file.endsWith('.html')) {const target=load(read(file));assert.ok(target('[id]').toArray().some(e=>target(e).attr('id')===u.hash.slice(1)),'Missing fragment '+ref);}
    }
    assert.equal(p('.i18n-switcher option').length,5);
    for(const e of p('.i18n-switcher option').toArray())assert.ok(p(e).attr('value').endsWith(route));
    const cta=new URL(p('.ptfe-review .btn').attr('href'),origin+code+'/'+route);
    assert.equal(cta.pathname,'/'+code+'/contact.html');
    assert.equal(cta.searchParams.get('source'),code+'/'+route);
    assert.equal(cta.searchParams.get('inquiry_type'),'technical-consultation');
    const blog=load(read(code+'/blog.html'));
    assert.equal(blog('.blog-card h3 a[href="'+route+'"]').text(),p('h1').text());
    const schema=JSON.parse(blog('script[type="application/ld+json"]').first().text());
    assert.equal(schema.blogPost.filter(s=>s.url===origin+code+'/'+route).length,1);
    const records=JSON.parse(read(code+'/search-index.json')).filter(r=>r.url===route);
    assert.equal(records.length,1);assert.equal(records[0].title,p('title').text());
    assert.ok(records[0].body.includes(p('h1').text()));
  });
}
