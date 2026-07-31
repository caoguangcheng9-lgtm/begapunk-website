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
const conservativeModel = 'BP-2P-50-0001';
const conservativePolicyByLocale = {
  en: {
    mediaName: 'Compatible media',
    mediaValue: 'Air. Other media require written compatibility confirmation for the operating conditions.',
    sealName: 'Seal type',
    sealValue: 'PTFE seal with O-ring',
    protectionName: 'Protection rating',
    protectionValue: 'Protective-shroud and labyrinth design for dusty environments; no certified IP rating is currently claimed.',
    mountingName: 'Mounting type',
    mountingValue: 'Stator side: 4 × M5, thread depth 10 mm; rotor side: 6 × M5, thread depth 8 mm. Confirm the complete mounting dimensions against the supplied drawing before machining.',
    weightText: 'Confirm weight for the supplied configuration.',
    cardText: 'No Certified IP Rating Claimed',
    comparisonText: 'Stator 4 × M5 × 10 mm; rotor 6 × M5 × 8 mm',
    llmsText: 'no certified IP rating is claimed',
    searchText: 'no certified IP rating is currently claimed',
    mountingFragments: ['4 × M5', '10 mm', '6 × M5', '8 mm'],
  },
  de: {
    mediaName: 'Betriebsmedien',
    mediaValue: 'Luft. Andere Medien erfordern eine schriftliche Kompatibilitätsbestätigung für die Betriebsbedingungen.',
    sealName: 'Dichtung',
    sealValue: 'PTFE-Dichtung mit O-Ring.',
    protectionName: 'Schutzart',
    protectionValue: 'Schutzhauben- und Labyrinthkonstruktion für staubige Umgebungen; derzeit wird keine zertifizierte IP-Schutzart angegeben.',
    mountingName: 'Montageart',
    mountingValue: 'Statorseite: 4 × M5, Gewindetiefe 10 mm; Rotorseite: 6 × M5, Gewindetiefe 8 mm. Vor der Bearbeitung vollständige Einbaumaße anhand der mitgelieferten Zeichnung bestätigen.',
    weightText: 'Gewicht der gelieferten Konfiguration bestätigen.',
    cardText: 'Keine zertifizierte IP-Schutzart angegeben',
    comparisonText: 'Stator 4 × M5 × 10 mm; Rotor 6 × M5 × 8 mm',
    llmsText: 'keine zertifizierte IP-Schutzart angegeben',
    searchText: 'keine zertifizierte IP-Schutzart',
    mountingFragments: ['4 × M5', '10 mm', '6 × M5', '8 mm'],
  },
  ja: {
    mediaName: '使用可能流体',
    mediaValue: '標準使用流体：空気。その他の流体は、使用条件に対する適合性を書面で確認する必要があります。',
    sealName: 'シール方式',
    sealValue: 'PTFEシール＋Oリング。',
    protectionName: '保護等級',
    protectionValue: '粉じん環境向けの保護カバー・ラビリンス構造。現時点で認証済みIP保護等級は表示していません。',
    mountingName: '取付方式',
    mountingValue: '固定側：4 × M5、ねじ深さ10 mm；回転側：6 × M5、ねじ深さ8 mm。加工前に、支給図面で取付寸法全体をご確認ください。',
    weightText: '納入仕様の質量をご確認ください。',
    cardText: '認証済みIP保護等級の表示なし',
    comparisonText: '固定側4 × M5 × 10 mm／回転側6 × M5 × 8 mm',
    llmsText: '認証済みIP保護等級',
    searchText: '認証済みIP保護等級',
    mountingFragments: ['4 × M5', '10 mm', '6 × M5', '8 mm'],
  },
  ru: {
    mediaName: 'Рабочая среда',
    mediaValue: 'Стандартная рабочая среда: воздух. Для других сред требуется письменное подтверждение совместимости с рабочими условиями.',
    sealName: 'Тип уплотнения',
    sealValue: 'Уплотнение из ПТФЭ с O-кольцом.',
    protectionName: 'Степень защиты',
    protectionValue: 'Защитный кожух и лабиринт для запылённых условий; сертифицированная степень защиты IP в настоящее время не заявляется.',
    mountingName: 'Тип крепления',
    mountingValue: 'Сторона статора: 4 × M5, глубина резьбы 10 мм; сторона ротора: 6 × M5, глубина резьбы 8 мм. До механической обработки сверьте все монтажные размеры с предоставленным чертежом.',
    weightText: 'Уточните массу поставляемой конфигурации.',
    cardText: 'Сертифицированная степень IP не заявляется',
    comparisonText: 'статор 4 × M5 × 10 мм; ротор 6 × M5 × 8 мм',
    llmsText: 'сертифицированная степень защиты IP не заявляется',
    searchText: 'сертифицированная степень защиты IP',
    mountingFragments: ['4 × M5', '10 мм', '6 × M5', '8 мм'],
  },
};
const conservativeForbiddenPatterns = [
  { label: 'specific public weight', pattern: /\b(?:4[.,]26\s*kg|4[.,\s]?260\s*g|2[.,]3\s*kg|2300\s*g)\b/i },
  { label: 'IP65 claim', pattern: /\bIP65\b/i },
  { label: 'FKM claim', pattern: /\bFKM\b/i },
];
const conservativeAssociatedForbiddenPatterns = [
  ...conservativeForbiddenPatterns,
  { label: 'dust-proof equivalence claim', pattern: /\bdust[- ]proof\b/i },
  { label: 'unverified dust-seal claim', pattern: /\bdust seal\b/i },
];
const conservativeAssociationSelectors = [
  'tr',
  'li',
  '.product-card',
  '.product-card-large',
  '.app-related-product',
  '.compat-item',
  '.faq-item',
  '.app-faq-item',
  '.related-card',
  '.comparison-card',
  'script[type="application/ld+json"]',
].join(',');

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

function propertyValue(product, name) {
  return product.additionalProperty?.find((property) => property?.name === name)?.value;
}

async function validateConservativePublicPolicy(locale) {
  const expected = conservativePolicyByLocale[locale.code];
  const detailFile = `${conservativeModel}.html`;
  const detailRelative = publicPath(locale, detailFile);
  const $ = await readHtml(locale, detailFile);
  if (!$) return;

  const detailSource = $.html();
  const visibleText = $('body').text().replace(/\s+/g, ' ').trim();
  for (const { label, pattern } of conservativeForbiddenPatterns) {
    if (pattern.test(detailSource)) failures.push(`${detailRelative}: conservative policy forbids ${label}`);
  }
  if (!visibleText.includes(expected.weightText)) failures.push(`${detailRelative}: conservative weight wording is missing`);
  for (const fragment of expected.mountingFragments) {
    if (!visibleText.includes(fragment)) failures.push(`${detailRelative}: mounting text is missing ${fragment}`);
  }

  const product = collectJsonLd($, detailRelative).find((node) => node?.['@type'] === 'Product');
  if (!product) return;
  for (const [nameKey, valueKey] of [
    ['mediaName', 'mediaValue'],
    ['sealName', 'sealValue'],
    ['protectionName', 'protectionValue'],
    ['mountingName', 'mountingValue'],
  ]) {
    const actual = propertyValue(product, expected[nameKey]);
    if (actual !== expected[valueKey]) {
      failures.push(`${detailRelative}: Product JSON-LD ${expected[nameKey]} does not match conservative policy`);
    }
  }
  const weightNames = new Set(['Net weight', 'Weight', 'Gewicht', 'Nettogewicht', '質量', '製品質量', 'Масса', 'Масса нетто']);
  if (product.additionalProperty?.some((property) => weightNames.has(property?.name))) {
    failures.push(`${detailRelative}: Product JSON-LD must omit the weight property`);
  }

  const catalog = await readHtml(locale, 'products.html');
  const card = catalog?.(`.product-card-large[data-href="${detailFile}"]`);
  if (!card?.length || !card.text().replace(/\s+/g, ' ').includes(expected.cardText)) {
    failures.push(`${publicPath(locale, 'products.html')}: ${conservativeModel} card does not expose the conservative protection wording`);
  }
  for (const { label, pattern } of conservativeForbiddenPatterns) {
    if (pattern.test(card?.html() || '')) failures.push(`${publicPath(locale, 'products.html')}: ${conservativeModel} card contains forbidden ${label}`);
  }

  const comparison = await readHtml(locale, 'product-comparison.html');
  const row = comparison?.('tr').filter((_, element) => comparison(element).text().includes(conservativeModel)).first();
  if (!row?.length || !row.text().replace(/\s+/g, ' ').toLocaleLowerCase().includes(expected.comparisonText.toLocaleLowerCase())) {
    failures.push(`${publicPath(locale, 'product-comparison.html')}: ${conservativeModel} mounting summary is incomplete`);
  }
  for (const { label, pattern } of conservativeForbiddenPatterns) {
    if (pattern.test(row?.html() || '')) failures.push(`${publicPath(locale, 'product-comparison.html')}: ${conservativeModel} row contains forbidden ${label}`);
  }

  const searchRelative = publicPath(locale, 'search-index.json');
  const searchIndex = JSON.parse(await readFile(path.join(repoRoot, searchRelative), 'utf8'));
  const searchRecord = searchIndex.find((entry) => entry?.id === conservativeModel);
  const searchSource = JSON.stringify(searchRecord || {});
  for (const { label, pattern } of conservativeForbiddenPatterns) {
    if (pattern.test(searchSource)) failures.push(`${searchRelative}: ${conservativeModel} record contains forbidden ${label}`);
  }
  if (!searchSource.toLocaleLowerCase().includes(expected.searchText.toLocaleLowerCase())) {
    failures.push(`${searchRelative}: ${conservativeModel} conservative protection wording is missing`);
  }

  const llmsRelative = publicPath(locale, 'llms.txt');
  const llmsSource = await readFile(path.join(repoRoot, llmsRelative), 'utf8');
  const llmsLine = llmsSource.split(/\r?\n/).find((line) => line.includes(`${detailFile})`)) || '';
  if (!llmsLine.toLocaleLowerCase().includes(expected.llmsText.toLocaleLowerCase())) {
    failures.push(`${llmsRelative}: ${conservativeModel} conservative entry is missing`);
  }
  for (const { label, pattern } of conservativeForbiddenPatterns) {
    if (pattern.test(llmsLine)) failures.push(`${llmsRelative}: ${conservativeModel} entry contains forbidden ${label}`);
  }

  const localeDirectory = path.join(repoRoot, locale.directory);
  const publicHtmlFiles = (await readdir(localeDirectory)).filter((fileName) => fileName.endsWith('.html'));
  for (const fileName of publicHtmlFiles) {
    const relative = publicPath(locale, fileName);
    const source = await readFile(path.join(localeDirectory, fileName), 'utf8');
    if (!source.includes(conservativeModel)) continue;
    const publicPage = load(source);
    publicPage(conservativeAssociationSelectors).each((_, element) => {
      const associatedText = publicPage(element).text().replace(/\s+/g, ' ').trim();
      if (!associatedText.includes(conservativeModel)) return;
      for (const { label, pattern } of conservativeAssociatedForbiddenPatterns) {
        if (pattern.test(associatedText)) {
          failures.push(`${relative}: ${conservativeModel} associated public block contains forbidden ${label}`);
        }
      }
    });
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
  await validateConservativePublicPolicy(locale);
}

const conservativeDecision = JSON.parse(await readFile(
  path.join(repoRoot, 'audit/product-truth-decisions/BP-2P-50-0001-decision-template.json'),
  'utf8',
));
if (conservativeDecision.decision !== 'conservative-public-policy') {
  failures.push(`${conservativeModel}: conservative policy validator requires a recorded laocao decision`);
}
if (conservativeDecision.approved_engineering_source !== 'not-established'
  || conservativeDecision.engineering_verification !== 'manual-review-required') {
  failures.push(`${conservativeModel}: engineering approval must remain not-established and manual-review-required`);
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
