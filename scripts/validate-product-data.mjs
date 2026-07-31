import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const siteOrigin = 'https://www.begapunk.com';
const locales = [
  { code: 'en', directory: '' },
  { code: 'de', directory: 'de' },
  { code: 'ja', directory: 'ja' },
  { code: 'ru', directory: 'ru' },
];
const failures = [];

function publicPath(locale, fileName) {
  return locale.directory ? `${locale.directory}/${fileName}` : fileName;
}

function publicUrl(locale, fileName) {
  return `${siteOrigin}/${publicPath(locale, fileName)}`;
}

async function readHtml(locale, fileName) {
  const relative = publicPath(locale, fileName);
  try {
    return load(await readFile(path.join(repoRoot, relative), 'utf8'));
  } catch (error) {
    failures.push(`${relative}: unable to read page (${error.message})`);
    return null;
  }
}

function collectJsonLd($, relative) {
  const nodes = [];
  $('script[type="application/ld+json"]').each((index, element) => {
    try {
      const value = JSON.parse($(element).html() || '');
      nodes.push(value);
      if (Array.isArray(value?.['@graph'])) nodes.push(...value['@graph']);
    } catch (error) {
      failures.push(`${relative}: invalid JSON-LD block ${index + 1} (${error.message})`);
    }
  });
  return nodes;
}

function validateDetailPage($, locale, fileName, model) {
  const relative = publicPath(locale, fileName);
  const expectedUrl = publicUrl(locale, fileName);
  const expectedProductId = `${siteOrigin}/${fileName}#product`;
  const title = $('title').first().text().trim();
  const h1 = $('h1').first().text().replace(/\s+/g, ' ').trim();
  const canonical = $('link[rel="canonical"]').attr('href');
  const ogUrl = $('meta[property="og:url"]').attr('content');

  if (!title.includes(model)) failures.push(`${relative}: title does not contain ${model}`);
  if (!h1.includes(model)) failures.push(`${relative}: H1 does not contain ${model}`);
  if (canonical !== expectedUrl) failures.push(`${relative}: canonical URL mismatch (${canonical || 'missing'})`);
  if (ogUrl !== expectedUrl) failures.push(`${relative}: og:url mismatch (${ogUrl || 'missing'})`);

  const productNodes = collectJsonLd($, relative).filter((node) => node?.['@type'] === 'Product');
  if (productNodes.length !== 1) {
    failures.push(`${relative}: expected exactly one Product JSON-LD node, found ${productNodes.length}`);
    return;
  }

  const product = productNodes[0];
  if (product.sku !== model) failures.push(`${relative}: Product.sku mismatch (${product.sku || 'missing'})`);
  if (product.mpn !== model) failures.push(`${relative}: Product.mpn mismatch (${product.mpn || 'missing'})`);
  if (product.url !== expectedUrl) failures.push(`${relative}: Product.url mismatch (${product.url || 'missing'})`);
  if (product['@id'] !== expectedProductId) failures.push(`${relative}: Product @id mismatch (${product['@id'] || 'missing'})`);
  if (typeof product.name !== 'string' || !product.name.includes(model)) failures.push(`${relative}: Product.name does not contain ${model}`);

  const skuProperty = Array.isArray(product.additionalProperty)
    ? product.additionalProperty.find((property) => property?.value === model)
    : null;
  if (!skuProperty || skuProperty.value !== model) failures.push(`${relative}: Product additionalProperty SKU mismatch`);

  const visibleModelRows = $('tr').filter((_, row) => {
    const label = $(row).find('th').first().text().replace(/\s+/g, ' ').trim();
    const value = $(row).find('td').first().text().replace(/\s+/g, ' ').trim();
    return Boolean(label) && value === model;
  });
  if (visibleModelRows.length < 1) {
    failures.push(`${relative}: visible SKU does not match ${model}`);
  }
}

async function validateCatalog(locale, models) {
  const references = [];
  for (const catalogName of ['products.html', 'products-p2.html']) {
    const $ = await readHtml(locale, catalogName);
    if (!$) continue;
    $('.product-card-large[data-href]').each((_, element) => {
      const card = $(element);
      const href = card.attr('data-href') || '';
      references.push(href);
      const detailLinks = card.find(`a[href="${href}"]`).length;
      if (detailLinks !== 1) failures.push(`${publicPath(locale, catalogName)}: ${href} card must have one matching detail link`);
      const model = path.basename(href, '.html');
      if (!card.text().includes(model)) failures.push(`${publicPath(locale, catalogName)}: ${href} card text does not contain its model`);
    });
  }

  const counts = new Map();
  for (const reference of references) counts.set(reference, (counts.get(reference) || 0) + 1);
  for (const model of models) {
    const fileName = `${model}.html`;
    if (counts.get(fileName) !== 1) failures.push(`${locale.code} catalogs: ${fileName} must appear exactly once (found ${counts.get(fileName) || 0})`);
  }
  for (const reference of counts.keys()) {
    if (!models.has(path.basename(reference, '.html'))) failures.push(`${locale.code} catalogs: unexpected product reference ${reference}`);
  }
}

async function validateSearchIndex(locale, models) {
  const relative = publicPath(locale, 'search-index.json');
  let index;
  try {
    index = JSON.parse(await readFile(path.join(repoRoot, relative), 'utf8'));
  } catch (error) {
    failures.push(`${relative}: unable to parse search index (${error.message})`);
    return;
  }
  const products = index.filter((item) => item?.category === 'product');
  for (const model of models) {
    const records = products.filter((item) => item.id === model);
    if (records.length !== 1) {
      failures.push(`${relative}: ${model} must have exactly one product record (found ${records.length})`);
      continue;
    }
    const record = records[0];
    if (record.url !== `${model}.html`) failures.push(`${relative}: ${model} URL mismatch (${record.url || 'missing'})`);
    if (!String(record.title || '').includes(model)) failures.push(`${relative}: ${model} title mismatch`);
    if (!String(record.h1 || '').includes(model)) failures.push(`${relative}: ${model} H1 mismatch`);
  }
  for (const record of products) {
    if (!models.has(record.id)) failures.push(`${relative}: unexpected product record ${record.id || '(missing id)'}`);
  }
}

const rootFiles = await readdir(repoRoot);
const productFiles = rootFiles.filter((fileName) => /^BP-[A-Z0-9-]+\.html$/i.test(fileName)).sort();
const models = new Set(productFiles.map((fileName) => path.basename(fileName, '.html')));
if (!models.size) failures.push('No product detail pages were found.');

for (const locale of locales) {
  for (const fileName of productFiles) {
    const model = path.basename(fileName, '.html');
    const $ = await readHtml(locale, fileName);
    if ($) validateDetailPage($, locale, fileName, model);
  }
  await validateCatalog(locale, models);
  await validateSearchIndex(locale, models);
}

const sitemapSources = {
  primary: await readFile(path.join(repoRoot, 'sitemap.xml'), 'utf8'),
  localized: await readFile(path.join(repoRoot, 'sitemap-i18n.xml'), 'utf8'),
};
for (const model of models) {
  const englishUrl = `${siteOrigin}/${model}.html`;
  const englishLocPattern = new RegExp(`<loc>\\s*${englishUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*</loc>`, 'g');
  if ((sitemapSources.primary.match(englishLocPattern) || []).length !== 1) {
    failures.push(`sitemap.xml: ${englishUrl} must appear in exactly one loc element`);
  }
  for (const locale of locales.slice(1)) {
    const localizedUrl = `${siteOrigin}/${locale.code}/${model}.html`;
    const localizedLocPattern = new RegExp(`<loc>\\s*${localizedUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*</loc>`, 'g');
    if ((sitemapSources.localized.match(localizedLocPattern) || []).length !== 1) {
      failures.push(`sitemap-i18n.xml: ${localizedUrl} must appear in exactly one loc element`);
    }
  }
}

for (const required of ['products.html', 'products-p2.html', 'search-index.json']) {
  await access(path.join(repoRoot, required)).catch((error) => failures.push(`${required}: missing (${error.message})`));
}

if (failures.length) {
  console.error(`Product data validation failed with ${failures.length} issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Product data validation passed: ${models.size} models across ${locales.length} languages, catalogs, search indexes, JSON-LD, and sitemaps.`);
