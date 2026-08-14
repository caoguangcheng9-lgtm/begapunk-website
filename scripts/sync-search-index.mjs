import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { load } from 'cheerio';
import { discoveryExcludedPageSet, filterDiscoverySearchRecords } from './discovery-exclusions.mjs';

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
const conservativeIpKeywordByLocale = {
  en: 'no certified IP rating claimed',
  de: 'keine zertifizierte IP-Schutzart angegeben',
  ja: '認証済みIP保護等級の表示なし',
  ru: 'сертифицированная степень защиты IP не заявляется',
};

function compact(value = '') {
  return value.replace(/\s+/g, ' ').trim();
}

function serializeJsonWithSourceEol(value, source) {
  const lineEnding = source.includes('\r\n') ? '\r\n' : '\n';
  return `${JSON.stringify(value, null, 2).replace(/\n/g, lineEnding)}${lineEnding}`;
}

function normalizedKeywords(localeCode, record) {
  if (record.id !== 'BP-2P-50-0001' || !Array.isArray(record.keywords)) return record.keywords;
  const excluded = compact(conservativeIpKeywordByLocale[localeCode]).toLocaleLowerCase();
  return record.keywords.filter((keyword) => compact(keyword).toLocaleLowerCase() !== excluded);
}

async function synchronizedRecord(locale, record) {
  const filePath = path.join(locale.directory, record.url);
  const html = await fs.readFile(filePath, 'utf8');
  const $ = load(html, { decodeEntities: false });
  const content = $('body').clone();
  content.find('script,style,header,nav,footer,.cookie-banner,.i18n-switcher').remove();
  return {
    ...record,
    title: compact($('title').first().text()) || record.title,
    description: compact($('meta[name="description"]').attr('content')) || record.description,
    h1: compact($('h1').first().text()) || record.h1,
    h2s: $('h2').map((_, element) => compact($(element).text())).get().filter(Boolean),
    body: compact(content.text()),
    ...(record.id === 'BP-2P-50-0001' ? { keywords: normalizedKeywords(locale.code, record) } : {}),
  };
}

for (const locale of locales) {
  const indexPath = path.join(locale.directory, 'search-index.json');
  const before = await fs.readFile(indexPath, 'utf8');
  const current = JSON.parse(before);
  const synchronized = [];
  for (const record of filterDiscoverySearchRecords(current, discoveryExcludedPages)) {
    if (!config.pages.includes(record.url)) {
      synchronized.push(record);
      continue;
    }
    synchronized.push(await synchronizedRecord(locale, record));
  }
  const next = serializeJsonWithSourceEol(synchronized, before);
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
