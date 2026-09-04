import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { load } from 'cheerio';
import { discoveryExcludedPageSet, filterDiscoverySearchRecords } from './discovery-exclusions.mjs';
import {
  assertDrawingBackedProductRecordCoverage,
  drawingBackedProductKeywords,
} from './lib/drawing-backed-product-facts.mjs';

const root = path.resolve(import.meta.dirname, '..');
const config = JSON.parse(await fs.readFile(path.join(root, 'i18n', 'config.json'), 'utf8'));
const discoveryExcludedPages = discoveryExcludedPageSet(config);
const checkOnly = process.argv.includes('--check');
const locales = [
  { code: config.sourceLanguage.code, directory: root },
  ...(config.activeLanguageCodes || []).map((code) => ({ code, directory: path.join(root, code) })),
];
const failures = [];
let changedFiles = 0;
const retiredProductRoutes = new Map([
  ['BP-2P-95-0001.html', { id: 'BP-2P-95-0005', url: 'BP-2P-95-0005.html' }],
]);
const requiredPageRecords = [];
const retiredPageRoutes = new Set(['replacement.html']);
const pneumaticChuckCaseRoute = 'case-bp-2p-95-pneumatic-chuck-integration.html';
const pneumaticChuckCaseKeywords = {
  en: ['BP-2P-95-0005', 'pneumatic chuck', 'compressed air', 'rotary union integration'],
  de: ['BP-2P-95-0005', 'pneumatisches Spannfutter', 'Druckluft', 'Drehdurchführung im Spannfutter'],
  fr: ['BP-2P-95-0005', 'mandrin pneumatique', 'air comprimé', 'intégration du raccord tournant'],
  ja: ['BP-2P-95-0005', 'エアチャック', '空圧式チャック', '圧縮空気', 'ロータリージョイント組込み'],
  ru: ['BP-2P-95-0005', 'пневматический патрон', 'сжатый воздух', 'установка вращающегося соединения'],
};
const dustyEnvironmentBoundaryKeyword = {
  en: 'BP-2P-95-0005 2-passage model; drawing does not specify dust protection',
  de: 'BP-2P-95-0005 Zweikanalmodell; Zeichnung enthält keine Angabe zum Staubschutz',
  fr: 'BP-2P-95-0005, modèle à deux circuits ; le plan ne mentionne aucune protection contre la poussière',
  ja: 'BP-2P-95-0005 2流路モデル、図面に防じん仕様の記載なし',
  ru: 'BP-2P-95-0005 двухканальная модель; на чертеже защита от пыли не указана',
};

for (const locale of locales) {
  if (!pneumaticChuckCaseKeywords[locale.code]) {
    throw new Error(`${locale.code}: pneumatic-chuck search keywords are not configured.`);
  }
  if (!dustyEnvironmentBoundaryKeyword[locale.code]) {
    throw new Error(`${locale.code}: dusty-environment search boundary is not configured.`);
  }
}

const searchClientSource = await fs.readFile(path.join(root, 'js', 'search.js'), 'utf8');
if (!/item\.url\s*===\s*['"]index\.html['"]\s*\?\s*['"]\.\/['"]\s*:\s*item\.url/.test(searchClientSource)
  || !/escapeHtml\(resultUrl\)/.test(searchClientSource)) {
  failures.push('js/search.js must render the homepage search record as ./ instead of the redirecting index.html alias.');
}

function compact(value = '') {
  return value.replace(/\s+/g, ' ').trim();
}

function retireLegacyProductReferences(localeCode, record) {
  const keywords = (record.keywords || []).map((keyword) => {
    if (keyword === 'BP-2P-95-0001') return 'BP-2P-95-0005';
    if (keyword.includes('BP-2P-95-0001')) return dustyEnvironmentBoundaryKeyword[localeCode];
    return keyword;
  });
  const tags = (record.tags || []).map((tag) => tag.replaceAll('BP-2P-95-0001', 'BP-2P-95-0005'));
  return {
    ...record,
    ...(record.keywords ? { keywords } : {}),
    ...(record.tags ? { tags } : {}),
  };
}

async function synchronizedRecord(locale, record) {
  const legacySafeRecord = retireLegacyProductReferences(locale.code, record);
  const filePath = path.join(locale.directory, record.url);
  const html = await fs.readFile(filePath, 'utf8');
  const $ = load(html, { decodeEntities: false });
  const content = $('body').clone();
  content.find('script,style,header,nav,footer,.cookie-banner,.i18n-switcher').remove();
  content.find('a.skip-link[data-search-exclude][href="#main-content"]').remove();
  content.find('.pd-share-menu[data-search-exclude], .pd-share-footer[data-search-exclude]').remove();
  const drawingKeywords = drawingBackedProductKeywords(locale.code, legacySafeRecord.id);
  const caseKeywords = record.url === pneumaticChuckCaseRoute
    ? pneumaticChuckCaseKeywords[locale.code]
    : null;
  const synchronizedTags = record.url === pneumaticChuckCaseRoute
    ? (record.tags || []).map((tag) => tag === 'BP-2P-95-0001' ? 'BP-2P-95-0005' : tag)
    : legacySafeRecord.tags;
  return {
    ...legacySafeRecord,
    title: compact($('title').first().text()) || legacySafeRecord.title,
    description: compact($('meta[name="description"]').attr('content')) || legacySafeRecord.description,
    h1: compact($('h1').first().text()) || legacySafeRecord.h1,
    h2s: $('h2').map((_, element) => compact($(element).text())).get().filter(Boolean),
    body: compact(content.text()),
    ...(drawingKeywords ? { keywords: drawingKeywords } : caseKeywords ? { keywords: caseKeywords } : legacySafeRecord.keywords ? { keywords: legacySafeRecord.keywords } : {}),
    ...(synchronizedTags ? { tags: synchronizedTags } : {}),
  };
}

for (const locale of locales) {
  const indexPath = path.join(locale.directory, 'search-index.json');
  const current = JSON.parse(await fs.readFile(indexPath, 'utf8'));
  const migrated = current.map((record) => {
    const replacement = retiredProductRoutes.get(record.url);
    return replacement ? { ...record, ...replacement } : record;
  });
  for (const requiredRecord of requiredPageRecords) {
    if (!migrated.some((record) => record.url === requiredRecord.url)) migrated.push(requiredRecord);
  }
  const visibleRecords = filterDiscoverySearchRecords(
    migrated.filter((record) => !retiredPageRoutes.has(record.url)),
    discoveryExcludedPages,
  );
  assertDrawingBackedProductRecordCoverage(visibleRecords, `${locale.code}/search-index.json`);
  const synchronized = [];
  for (const record of visibleRecords) {
    if (!config.pages.includes(record.url)) {
      const drawingKeywords = drawingBackedProductKeywords(locale.code, record.id);
      const legacySafeRecord = retireLegacyProductReferences(locale.code, record);
      synchronized.push(drawingKeywords ? { ...legacySafeRecord, keywords: drawingKeywords } : legacySafeRecord);
      continue;
    }
    synchronized.push(await synchronizedRecord(locale, record));
  }
  const next = `${JSON.stringify(synchronized, null, 2)}\n`;
  const before = await fs.readFile(indexPath, 'utf8');
  if (before === next) continue;
  changedFiles += 1;
  if (checkOnly) failures.push(`${locale.code}/search-index.json is not synchronized with current HTML.`);
  else await fs.writeFile(indexPath, next, 'utf8');
}

if (failures.length) {
  console.error(`Search-index verification failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(checkOnly
  ? `Search indexes match current HTML for ${locales.length} languages.`
  : `Synchronized ${changedFiles} of ${locales.length} search-index files.`);
