import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { load } from 'cheerio';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const i18nDir = path.join(rootDir, 'i18n');
const config = JSON.parse(fs.readFileSync(path.join(i18nDir, 'config.json'), 'utf8'));
const catalog = JSON.parse(fs.readFileSync(path.join(i18nDir, 'source-catalog.json'), 'utf8'));
const writeChanges = process.argv.includes('--write');
const pageArgument = process.argv.find((argument) => argument.startsWith('--page='));
const requestedPage = pageArgument?.slice('--page='.length);
if (requestedPage && !config.translationManagedPages.includes(requestedPage)) {
  throw new Error(`Unknown translation-managed page: ${requestedPage}`);
}
const pageNames = requestedPage ? [requestedPage] : config.translationManagedPages;
const activeLanguages = config.languages.filter((language) => config.activeLanguageCodes.includes(language.code));
const excludedSelector = config.excludedSelectors.join(',');
const metaSelectors = [
  'meta[name="description"]',
  'meta[property="og:title"]',
  'meta[property="og:description"]',
  'meta[name="twitter:title"]',
  'meta[name="twitter:description"]',
];
const idBySource = new Map(catalog.entries.map((entry) => [entry.source, entry.id]));

function shouldTranslate(value) {
  const text = value.trim();
  return text.length > 0 && /[A-Za-z]/.test(text) && !/^[-+]?\d[\d\s.,%°/:-]*$/.test(text);
}

function collectRecords($) {
  const records = [];
  const coveredTextNodes = new WeakSet();
  const primarySelector = 'title,p,h1,h2,h3,h4,h5,h6,li,td,th,label,button,option,figcaption,legend';
  const markCovered = (element) => {
    $(element).find('*').addBack().contents().each((_, node) => {
      if (node.type === 'text') coveredTextNodes.add(node);
    });
  };
  const addHtmlElement = (element) => {
    if ($(element).closest(excludedSelector).length) return;
    const source = ($(element).html() || '').trim();
    if (!shouldTranslate($(element).text())) return;
    records.push({ type: 'html', node: element, source });
    markCovered(element);
  };
  const addTextNode = (node) => {
    if (coveredTextNodes.has(node)) return;
    if ($(node).parent().closest(excludedSelector).length) return;
    const original = node.data || '';
    const source = original.trim();
    if (shouldTranslate(source)) records.push({ type: 'text', node, source });
  };
  $(primarySelector).each((_, element) => {
    if (!$(element).parents(primarySelector).first().length) addHtmlElement(element);
  });
  $('body a, body span').each((_, element) => {
    if ($(element).parents(primarySelector).length || $(element).parents('a,span').length) return;
    addHtmlElement(element);
  });
  $('body *').addBack('body').contents().each((_, node) => {
    if (node.type === 'text') addTextNode(node);
  });
  for (const attribute of config.translatedAttributes) {
    $(`[${attribute}]`).each((_, element) => {
      if ($(element).closest(excludedSelector).length) return;
      const source = ($(element).attr(attribute) || '').trim();
      if (shouldTranslate(source)) records.push({ type: 'attribute', node: element, attribute, source });
    });
  }
  $('input[type="submit"][value], input[type="button"][value]').each((_, element) => {
    const source = ($(element).attr('value') || '').trim();
    if (shouldTranslate(source)) records.push({ type: 'attribute', node: element, attribute: 'value', source });
  });
  for (const selector of metaSelectors) {
    $(selector).each((_, element) => {
      const source = ($(element).attr('content') || '').trim();
      if (shouldTranslate(source)) records.push({ type: 'attribute', node: element, attribute: 'content', source });
    });
  }
  return records;
}

function elementSelector(node) {
  const parts = [];
  let current = node.type === 'text' ? node.parent : node;
  while (current?.type === 'tag') {
    const id = current.attribs?.id;
    if (id && /^[A-Za-z][\w:-]*$/.test(id)) {
      parts.unshift(`${current.name}#${id}`);
      break;
    }
    const siblings = (current.parent?.children || []).filter(
      (sibling) => sibling.type === 'tag' && sibling.name === current.name,
    );
    const position = siblings.indexOf(current) + 1;
    parts.unshift(`${current.name}${siblings.length > 1 ? `:nth-of-type(${position})` : ''}`);
    current = current.parent;
  }
  return parts.join(' > ');
}

function localizedNode(localized$, record) {
  const selector = elementSelector(record.node);
  const element = localized$(selector).first().get(0);
  if (!element) return null;
  if (record.type !== 'text') return element;
  const englishTextSiblings = (record.node.parent?.children || []).filter((node) => node.type === 'text');
  const textPosition = englishTextSiblings.indexOf(record.node);
  const localizedTextSiblings = (element.children || []).filter((node) => node.type === 'text');
  return localizedTextSiblings[textPosition] || null;
}

function localizedValue($, record, target) {
  if (record.type === 'html') return ($(target).html() || '').trim();
  if (record.type === 'text') return (target.data || '').trim();
  return ($(target).attr(record.attribute) || '').trim();
}

function effectiveTranslation(editorial, overrides, cache, pageName, source, id) {
  const page = editorial[pageName] || {};
  const shared = editorial['*'] || {};
  return page[id] || page[source] || shared[id] || shared[source] || overrides[source] || cache.translations?.[id];
}

let totalAdded = 0;
const failures = [];

for (const language of activeLanguages) {
  const editorialPath = path.join(i18nDir, 'editorial', `${language.code}.json`);
  const overrides = JSON.parse(fs.readFileSync(path.join(i18nDir, 'overrides', `${language.code}.json`), 'utf8'));
  const cache = JSON.parse(fs.readFileSync(path.join(i18nDir, 'cache', `${language.code}.json`), 'utf8'));
  const editorial = JSON.parse(fs.readFileSync(editorialPath, 'utf8'));
  const cachePath = path.join(i18nDir, 'cache', `${language.code}.json`);
  const harvested = new Map();
  let languageAdded = 0;

  for (const pageName of pageNames) {
    const english$ = load(fs.readFileSync(path.join(rootDir, pageName), 'utf8'), { decodeEntities: false });
    const localized$ = load(fs.readFileSync(path.join(rootDir, language.code, pageName), 'utf8'), { decodeEntities: false });
    const candidates = new Map();

    for (const record of collectRecords(english$)) {
      const id = idBySource.get(record.source) || crypto.createHash('sha256').update(record.source).digest('hex').slice(0, 16);
      if (effectiveTranslation(editorial, overrides, cache, pageName, record.source, id)) continue;
      const target = localizedNode(localized$, record);
      if (!target || target.type !== record.node.type || (record.node.name && target.name !== record.node.name)) {
        failures.push(`${language.code}/${pageName}: DOM path mismatch for ${record.source.slice(0, 100)}`);
        continue;
      }
      const value = localizedValue(localized$, record, target);
      if (!value) {
        failures.push(`${language.code}/${pageName}: empty localized value for ${record.source.slice(0, 100)}`);
        continue;
      }
      if (candidates.has(id) && candidates.get(id) !== value) {
        // One source ID must resolve to one value. Preserve the first visible translation.
        continue;
      }
      candidates.set(id, value);
    }

    if (candidates.size) {
      for (const [id, value] of candidates) {
        if (!harvested.has(id)) harvested.set(id, []);
        harvested.get(id).push({ pageName, value });
      }
      languageAdded += candidates.size;
    }
  }

  let cacheAdded = 0;
  let editorialAdded = 0;
  for (const [id, uses] of harvested) {
    const values = new Set(uses.map(({ value }) => value));
    if (values.size === 1) {
      cache.translations ||= {};
      cache.translations[id] = uses[0].value;
      cacheAdded += 1;
    } else {
      for (const { pageName, value } of uses) {
        editorial[pageName] ||= {};
        editorial[pageName][id] = value;
        editorialAdded += 1;
      }
    }
  }

  if (writeChanges && !failures.length && languageAdded) {
    fs.writeFileSync(cachePath, `${JSON.stringify(cache, null, 2)}\n`, 'utf8');
    fs.writeFileSync(editorialPath, `${JSON.stringify(editorial, null, 2)}\n`, 'utf8');
  }
  totalAdded += languageAdded;
  console.log(`${language.code}: ${languageAdded} missing uses (${cacheAdded} shared IDs, ${editorialAdded} page-specific values) ${writeChanges ? 'harvested' : 'available to harvest'}.`);
}

if (failures.length) {
  console.error(`Localization harvest stopped with ${failures.length} structural issue(s):`);
  for (const failure of failures.slice(0, 80)) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Localization harvest ${writeChanges ? 'wrote' : 'found'} ${totalAdded} page-specific translations.`);
