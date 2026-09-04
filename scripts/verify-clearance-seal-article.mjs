import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { load } from 'cheerio';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const pageName = 'blog-non-contact-clearance-seal-rotary-union.html';
const publicOrigin = 'https://www.begapunk.com';
const config = JSON.parse(await readFile(path.join(root, 'i18n', 'config.json'), 'utf8'));
const failures = [];

const routes = {
  en: pageName,
  de: `de/${pageName}`,
  fr: `fr/${pageName}`,
  ja: `ja/${pageName}`,
  ru: `ru/${pageName}`,
};

const pages = [
  {
    code: 'en',
    file: path.join(root, pageName),
    canonical: `${publicOrigin}/${pageName}`,
    fact: '0.003 mm one-side radial clearance',
    caution: '“Non-contact” does not mean “zero leakage.”',
  },
  {
    code: 'de',
    file: path.join(root, 'de', pageName),
    canonical: `${publicOrigin}/${routes.de}`,
    fact: 'einseitiger Radialspalt von 0,003 mm',
    caution: '„Berührungslos“ bedeutet nicht „leckagefrei“.',
  },
  {
    code: 'fr',
    file: path.join(root, 'fr', pageName),
    canonical: `${publicOrigin}/${routes.fr}`,
    fact: 'jeu radial unilatéral de 0,003 mm',
    caution: '« Sans contact » ne signifie pas « zéro fuite ».',
  },
  {
    code: 'ja',
    file: path.join(root, 'ja', pageName),
    canonical: `${publicOrigin}/${routes.ja}`,
    fact: '片側ラジアルすきま0.003 mm',
    caution: '「非接触」は「漏れゼロ」を意味しません。',
  },
  {
    code: 'ru',
    file: path.join(root, 'ru', pageName),
    canonical: `${publicOrigin}/${routes.ru}`,
    fact: 'односторонним радиальным зазором 0,003 мм',
    caution: '«Бесконтактное» не означает «без утечек».',
  },
];

const forbiddenEnglishArticleText = [
  'Direct answer:',
  'What the diagram shows',
  'How the medium flows',
  'What does a 0.003 mm one-side radial clearance mean?',
  'Information needed before engineering selection',
  'Frequently asked questions',
];

function normalize(value = '') {
  return value.replace(/\s+/g, ' ').trim();
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function schemaHasType(node, type) {
  return Array.isArray(node?.['@type']) ? node['@type'].includes(type) : node?.['@type'] === type;
}

function collectSchemaNodes(value, output = [], seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return output;
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((item) => collectSchemaNodes(item, output, seen));
    return output;
  }
  if (value['@type']) output.push(value);
  Object.values(value).forEach((item) => collectSchemaNodes(item, output, seen));
  return output;
}

function parseSchemas($, label) {
  const nodes = [];
  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      collectSchemaNodes(JSON.parse($(element).text()), nodes);
    } catch (error) {
      failures.push(`${label}: invalid JSON-LD (${error.message})`);
    }
  });
  return nodes;
}

function publicUrl(code) {
  return `${publicOrigin}/${routes[code]}`;
}

function localTarget(raw, pageFile) {
  const value = raw.trim();
  if (!value || /^(?:https?:|mailto:|tel:|data:|javascript:|#)/i.test(value)) return null;
  const clean = decodeURIComponent(value.split(/[?#]/, 1)[0]);
  if (!clean) return null;
  if (clean.startsWith('/')) return path.resolve(root, clean.replace(/^\/+/, '').replace(/\//g, path.sep));
  return path.resolve(path.dirname(pageFile), clean.replace(/\//g, path.sep));
}

async function validatePage(page) {
  const html = await readFile(page.file, 'utf8');
  const $ = load(html);
  const label = `${page.code}/${pageName}`;

  assert($('html').attr('lang') === page.code, `${label}: incorrect html lang`);
  assert($('base').length === 0, `${label}: production page must not depend on a base element`);
  assert(!$('meta[name="robots"]').attr('content')?.toLowerCase().includes('noindex'), `${label}: production candidate remains noindex`);
  assert($('.ta-draft-notice').length === 0 && !/local (?:english|french|german|japanese|russian)|lokaler .*prüfstand|banc d'essai local|локальный .*проект/i.test(html), `${label}: draft notice remains`);
  assert($('link[rel="canonical"]').attr('href') === page.canonical, `${label}: canonical differs`);
  assert($('main').length === 1, `${label}: expected one main element`);
  assert($('h1').length === 1, `${label}: expected one H1`);
  assert($('[style]').length === 0, `${label}: inline style attribute found`);
  assert(normalize($('body').text()).includes(page.fact), `${label}: one-side radial-clearance fact missing`);
  assert(normalize($('body').text()).includes(page.caution), `${label}: non-zero-leakage limitation missing`);

  const expectedAlternates = [...Object.keys(routes), 'x-default'].map((code) => ({
    code,
    href: code === 'x-default' ? publicUrl('en') : publicUrl(code),
  }));
  const alternates = $('link[rel="alternate"][hreflang]');
  assert(alternates.length === expectedAlternates.length, `${label}: expected ${expectedAlternates.length} hreflang links`);
  for (const expected of expectedAlternates) {
    assert(alternates.filter(`[hreflang="${expected.code}"][href="${expected.href}"]`).length === 1, `${label}: ${expected.code} hreflang differs`);
  }

  const selector = $('.i18n-switcher select');
  const options = selector.find('option');
  const selectorValues = Object.keys(routes).map((targetCode) => {
    if (page.code === 'en') return routes[targetCode];
    if (targetCode === 'en') return `../${routes.en}`;
    if (targetCode === page.code) return pageName;
    return `../${routes[targetCode]}`;
  });
  assert(selector.length === 1 && options.length === Object.keys(routes).length, `${label}: language selector structure differs`);
  assert(JSON.stringify(options.map((_, node) => $(node).attr('value')).get()) === JSON.stringify(selectorValues), `${label}: language selector routes differ`);
  assert(options.filter('[selected]').length === 1 && options.filter('[selected]').index() === Object.keys(routes).indexOf(page.code), `${label}: selected language differs`);

  if (page.code !== 'en') {
    const articleText = normalize($('.ta-content').text()).toLowerCase();
    forbiddenEnglishArticleText.forEach((phrase) => assert(!articleText.includes(phrase.toLowerCase()), `${label}: English article residue: ${phrase}`));
    if (page.code === 'fr') assert(!/[\u0400-\u04ff]/u.test(articleText), `${label}: Russian fallback residue found in French article`);
  }

  const schemaNodes = parseSchemas($, label);
  for (const type of ['TechArticle', 'BreadcrumbList', 'FAQPage']) {
    assert(schemaNodes.filter((node) => schemaHasType(node, type)).length === 1, `${label}: expected exactly one ${type} node`);
  }
  const article = schemaNodes.find((node) => schemaHasType(node, 'TechArticle'));
  assert(article?.inLanguage === page.code, `${label}: TechArticle language differs`);
  assert(article?.datePublished === '2026-08-19', `${label}: TechArticle datePublished differs`);
  assert(article?.dateModified === '2026-08-19', `${label}: TechArticle dateModified differs`);
  assert(article?.mainEntityOfPage?.['@id'] === page.canonical, `${label}: TechArticle mainEntityOfPage differs`);

  const visibleFaqs = $('.ta-faq details').map((_, element) => ({
    question: normalize($(element).find('summary').text()),
    answer: normalize($(element).find('p').text()),
  })).get();
  const faqPage = schemaNodes.find((node) => schemaHasType(node, 'FAQPage'));
  const schemaFaqs = (faqPage?.mainEntity ?? []).map((item) => ({
    question: normalize(item.name),
    answer: normalize(item.acceptedAnswer?.text),
  }));
  assert(visibleFaqs.length === 5 && schemaFaqs.length === 5, `${label}: expected five visible and schema FAQs`);
  assert(JSON.stringify(visibleFaqs) === JSON.stringify(schemaFaqs), `${label}: visible FAQs differ from FAQPage JSON-LD`);

  const refs = [];
  $('[src], [href], form[action], option[value]').each((_, element) => {
    for (const attribute of ['src', 'href', 'action', 'value']) {
      const value = $(element).attr(attribute);
      if (value) refs.push(value);
    }
  });
  $('[srcset]').each((_, element) => {
    ($(element).attr('srcset') ?? '').split(',').forEach((candidate) => refs.push(candidate.trim().split(/\s+/, 1)[0]));
  });
  const targets = new Map();
  refs.forEach((ref) => {
    const target = localTarget(ref, page.file);
    if (target) targets.set(target, ref);
  });
  await Promise.all([...targets].map(async ([target, ref]) => {
    try {
      await access(target);
    } catch {
      failures.push(`${label}: missing local target for ${ref}`);
    }
  }));
}

const expectedLanguageCodes = [config.sourceLanguage.code, ...(config.activeLanguageCodes || [])];
assert(JSON.stringify(Object.keys(routes)) === JSON.stringify(expectedLanguageCodes), 'Article route contracts must exactly follow the configured active-language order');
assert(JSON.stringify(pages.map(({ code }) => code)) === JSON.stringify(expectedLanguageCodes), 'Article page contracts must exactly follow the configured active-language order');
await Promise.all(pages.map(validatePage));

assert(config.pages.includes(pageName), `i18n/config.json: ${pageName} missing from pages`);
assert(config.manualLocalizedPages.includes(pageName), `i18n/config.json: ${pageName} missing from manualLocalizedPages`);
assert(!config.translationManagedPages.includes(pageName), `i18n/config.json: curated page must not enter generic translation writes`);
assert(!config.discoveryExcludedPages.includes(pageName), `i18n/config.json: production candidate remains discovery-excluded`);
assert(!config.sitemapExcludedPages.includes(pageName), `i18n/config.json: production candidate remains sitemap-excluded`);

for (const page of pages) {
  const pageHtml = await readFile(page.file, 'utf8');
  const pageDocument = load(pageHtml);
  const pageTitle = normalize(pageDocument('title').text());
  const pageDescription = normalize(pageDocument('meta[name="description"]').attr('content'));
  const pageH1 = normalize(pageDocument('h1').text());
  const prefix = page.code === 'en' ? '' : `${page.code}/`;

  const hubFile = path.join(root, prefix, 'blog.html');
  const $hub = load(await readFile(hubFile, 'utf8'));
  assert($hub(`.blog-card a[href="${pageName}"]`).length >= 1, `${page.code}/blog.html: visible article card missing`);
  assert($hub('.blog-card').length === 4, `${page.code}/blog.html: expected four published guide cards`);
  const hubSchemas = parseSchemas($hub, `${page.code}/blog.html`);
  const hubPosts = hubSchemas.filter((node) => schemaHasType(node, 'BlogPosting') && node.url === page.canonical);
  assert(hubPosts.length === 1, `${page.code}/blog.html: BlogPosting for article missing or duplicated`);
  assert(normalize(hubPosts[0]?.headline) === pageH1, `${page.code}/blog.html: BlogPosting headline differs from article H1`);
  assert(normalize(hubPosts[0]?.description) === pageDescription, `${page.code}/blog.html: BlogPosting description differs from article metadata`);

  const sealFile = path.join(root, prefix, 'blog-rotary-union-seal-types.html');
  const $seal = load(await readFile(sealFile, 'utf8'));
  assert($seal(`.related-card a[href="${pageName}"]`).length === 1, `${page.code}/blog-rotary-union-seal-types.html: reciprocal related link missing`);

  const searchIndex = JSON.parse(await readFile(path.join(root, prefix, 'search-index.json'), 'utf8'));
  const records = searchIndex.filter((record) => record.url === pageName);
  assert(records.length === 1, `${page.code}/search-index.json: article record missing or duplicated`);
  assert(normalize(records[0]?.title) === pageTitle, `${page.code}/search-index.json: title differs`);
  assert(normalize(records[0]?.description) === pageDescription, `${page.code}/search-index.json: description differs`);
  assert(normalize(records[0]?.h1) === pageH1, `${page.code}/search-index.json: H1 differs`);
  assert(normalize(records[0]?.body).includes(page.fact), `${page.code}/search-index.json: one-side clearance fact missing`);
  assert(Array.isArray(records[0]?.keywords) && records[0].keywords.length >= 3, `${page.code}/search-index.json: target-market keywords missing`);

  const llms = await readFile(path.join(root, prefix, 'llms.txt'), 'utf8');
  assert(llms.split(page.canonical).length - 1 === 1, `${page.code}/llms.txt: article URL missing or duplicated`);
}

const sitemap = await readFile(path.join(root, 'sitemap.xml'), 'utf8');
assert(sitemap.split(publicUrl('en')).length - 1 === 1, 'sitemap.xml: English article URL missing or duplicated');
const internationalSitemap = await readFile(path.join(root, 'sitemap-i18n.xml'), 'utf8');
for (const page of pages) {
  assert(internationalSitemap.match(new RegExp(`<loc>${publicUrl(page.code).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</loc>`, 'g'))?.length === 1, `sitemap-i18n.xml: ${page.code} article loc missing or duplicated`);
  assert(internationalSitemap.match(new RegExp(`hreflang="${page.code}" href="${publicUrl(page.code).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g'))?.length === pages.length, `sitemap-i18n.xml: ${page.code} alternate count differs`);
}

const imageFiles = [
  ['images/knowledge/clearance-seal/rotary-union-clearance-seal-explainer-en.png', 'png', 1440, 960],
  ['images/knowledge/clearance-seal/rotary-union-clearance-seal-explainer-en.webp', 'webp', 1440, 960],
  ['images/knowledge/clearance-seal/rotary-union-clearance-seal-explainer-fr.png', 'png', 1536, 1024],
  ['images/knowledge/clearance-seal/rotary-union-clearance-seal-explainer-fr.webp', 'webp', 1536, 1024],
];
for (const [relativePath, expectedFormat, expectedWidth, expectedHeight] of imageFiles) {
  const metadata = await sharp(path.join(root, relativePath)).metadata();
  assert(metadata.format === expectedFormat, `${relativePath}: expected ${expectedFormat}, got ${metadata.format}`);
  assert(metadata.width === expectedWidth && metadata.height === expectedHeight, `${relativePath}: expected ${expectedWidth}x${expectedHeight}`);
}

if (failures.length) {
  console.error(`Clearance-seal article verification failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Clearance-seal article verification passed: ${pages.length} pages, facts, FAQ/Schema, hub links, search, AI indexes, sitemaps, and assets are synchronized.`);
