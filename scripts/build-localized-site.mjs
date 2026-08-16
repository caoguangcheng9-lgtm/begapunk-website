import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import crypto from 'node:crypto';
import { load } from 'cheerio';
import { discoveryExcludedPageSet, patchDiscoveryRobotsMeta } from './discovery-exclusions.mjs';

const sourceRoot = path.resolve(import.meta.dirname, '..');
const i18nRoot = path.join(sourceRoot, 'i18n');
const config = JSON.parse(await fs.readFile(path.join(i18nRoot, 'config.json'), 'utf8'));
const discoveryExcludedPages = discoveryExcludedPageSet(config);
const llmsExcludedPages = new Set([...(config.sitemapExcludedPages || []), ...discoveryExcludedPages]);
const translationManagedPages = config.translationManagedPages || config.pages;
const manualLocalizedPages = config.manualLocalizedPages || [];
const canonicalOrganizationId = `${config.siteUrl}/#organization`;
const canonicalFounderId = `${config.siteUrl}/#founder-g-c-cao`;
const canonicalLocalBusinessId = `${config.siteUrl}/#localbusiness`;
const canonicalBrandName = 'Begapunk';
const canonicalLegalName = 'Ningbo Begapunk Pneumatic Components Co., Ltd.';
const canonicalFoundingDate = '2022';
const canonicalBrandSameAs = [
  'https://www.youtube.com/@BEGAPUNKRotaryJointsTV',
  'https://www.facebook.com/profile.php?id=61591616523667',
  'https://x.com/Begapunk728',
];
const canonicalFounderSameAs = ['https://www.linkedin.com/in/guangcheng-cao/'];
const languageSwitcherLabels = {
  en: 'Language',
  de: 'Sprache',
  es: 'Idioma',
  it: 'Lingua',
  ja: '言語',
  pl: 'Język',
  ru: 'Язык',
};
const configuredPages = new Set(config.pages);
const translationPageSet = new Set(translationManagedPages);
const manualPageSet = new Set(manualLocalizedPages);
if (configuredPages.size !== config.pages.length
  || translationPageSet.size !== translationManagedPages.length
  || manualPageSet.size !== manualLocalizedPages.length) {
  throw new Error('i18n page groups must not contain duplicate page names.');
}
for (const pageName of manualPageSet) {
  if (translationPageSet.has(pageName)) throw new Error(`${pageName}: page cannot be both translation-managed and manually localized.`);
}
const groupedPages = new Set([...translationManagedPages, ...manualLocalizedPages]);
if (groupedPages.size !== configuredPages.size
  || [...configuredPages].some((pageName) => !groupedPages.has(pageName))) {
  throw new Error('translationManagedPages and manualLocalizedPages must be a complete, non-overlapping partition of config.pages.');
}
const glossary = JSON.parse(await fs.readFile(path.join(i18nRoot, 'glossary.json'), 'utf8'));
const activeLanguageCodes = new Set(config.activeLanguageCodes || config.languages.map((language) => language.code));
const activeLanguages = config.languages.filter((language) => activeLanguageCodes.has(language.code));
const mode = process.argv[process.argv.indexOf('--mode') + 1] || 'extract';
const catalogPath = path.join(i18nRoot, 'source-catalog.json');
const contactRfqCopyPath = path.join(i18nRoot, 'manual', 'contact-rfq-copy.json');
const contactRfqContract = JSON.parse(await fs.readFile(contactRfqCopyPath, 'utf8'));
const productDetailUiCopyPath = path.join(i18nRoot, 'manual', 'product-detail-ui.json');
const productDetailUiContract = JSON.parse(await fs.readFile(productDetailUiCopyPath, 'utf8'));
const productDetailPagePattern = /^BP-[A-Za-z0-9-]+\.html$/;
const productDetailPageNames = translationManagedPages.filter((pageName) => productDetailPagePattern.test(pageName));
const PRODUCT_UI_SKIP_SELECTOR = 'body.page-product-detail > a.skip-link[data-search-exclude][href="#main-content"]';
const PRODUCT_UI_IMAGES_SELECTOR = 'body.page-product-detail .pd-gallery[role="region"]';
const PRODUCT_UI_INFO_SELECTOR = 'body.page-product-detail .pd-info[role="region"]';
const cacheRoot = process.env.I18N_CACHE_ROOT
  ? path.resolve(process.env.I18N_CACHE_ROOT)
  : path.join(i18nRoot, 'cache');
const outputRoot = process.env.I18N_OUTPUT_ROOT
  ? path.resolve(process.env.I18N_OUTPUT_ROOT)
  : sourceRoot;

async function canonicalPathThroughNearestAncestor(targetPath) {
  let current = path.resolve(targetPath);
  const suffix = [];
  for (;;) {
    try {
      const canonical = await fs.realpath(current);
      return path.join(canonical, ...suffix);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      const parent = path.dirname(current);
      if (parent === current) throw error;
      suffix.unshift(path.basename(current));
      current = parent;
    }
  }
}

async function assertExternalOutputRoot(operation) {
  const canonicalSource = await fs.realpath(sourceRoot);
  const canonicalOutput = await canonicalPathThroughNearestAncestor(outputRoot);
  const relative = path.relative(canonicalSource, canonicalOutput);
  const isOutsideSource = path.isAbsolute(relative)
    || relative === '..'
    || relative.startsWith(`..${path.sep}`);
  const isInsideSource = !isOutsideSource;
  if (isInsideSource) {
    throw new Error(
      `${operation} refuses to write inside the source repository. Set I18N_OUTPUT_ROOT to an external directory.`,
    );
  }
}
const overridesByLanguage = new Map();
const editorialOverridesByLanguage = new Map();
const seoByLanguage = new Map();
for (const language of activeLanguages) {
  const overridePath = path.join(i18nRoot, 'overrides', `${language.code}.json`);
  try {
    overridesByLanguage.set(language.code, JSON.parse(await fs.readFile(overridePath, 'utf8')));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    overridesByLanguage.set(language.code, {});
  }
  const editorialPath = path.join(i18nRoot, 'editorial', `${language.code}.json`);
  try {
    editorialOverridesByLanguage.set(language.code, JSON.parse(await fs.readFile(editorialPath, 'utf8')));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    editorialOverridesByLanguage.set(language.code, {});
  }
  const seoPath = path.join(i18nRoot, 'seo', `${language.code}.json`);
  try {
    seoByLanguage.set(language.code, JSON.parse(await fs.readFile(seoPath, 'utf8')));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    seoByLanguage.set(language.code, {});
  }
}
const excludedSelector = config.excludedSelectors.join(',');
const translatableMetaSelectors = [
  'meta[name="description"]',
  'meta[property="og:title"]',
  'meta[property="og:description"]',
  'meta[name="twitter:title"]',
  'meta[name="twitter:description"]',
];
const contactRfqNestedKeys = Object.freeze({
  requestLabels: ['quote', '3d_step', 'application_review', 'seal_review', 'verified_drawing', 'technical_consultation', 'general_inquiry'],
  requestTemplates: ['quote', '3d_step', 'application_review', 'seal_review', 'verified_drawing', 'technical_consultation', 'general_inquiry'],
  contextLabels: ['request', 'model', 'product', 'application', 'source'],
  requiredFields: ['fullname', 'email', 'company', 'country', 'product', 'requirements'],
});
const contactRfqScalarKeys = Object.freeze([
  'contextSeparator',
  'required',
  'invalidEmail',
  'emailSuggestion',
  'invalidFileType',
  'fileTooLarge',
  'noFile',
  'sending',
  'success',
  'serviceUnavailable',
  'invalidResponse',
  'networkFailure',
  'stepButton',
]);
const contactRfqPlaceholderContract = Object.freeze({
  required: ['field'],
  emailSuggestion: ['domain'],
  invalidFileType: ['ext'],
  fileTooLarge: ['size'],
});

function sameKeys(actual, expected) {
  return [...actual].sort().join('\0') === [...expected].sort().join('\0');
}

function placeholdersIn(value) {
  return [...String(value).matchAll(/\{([a-z]+)\}/g)].map((match) => match[1]).sort();
}

function assertContactRfqCopy(copy, label) {
  if (!copy || typeof copy !== 'object' || Array.isArray(copy)) {
    throw new Error(`${label}: RFQ copy must be an object.`);
  }
  const expectedTopLevelKeys = [...Object.keys(contactRfqNestedKeys), ...contactRfqScalarKeys];
  if (!sameKeys(Object.keys(copy), expectedTopLevelKeys)) {
    throw new Error(`${label}: RFQ copy keys do not match the approved contract.`);
  }
  for (const [group, expectedKeys] of Object.entries(contactRfqNestedKeys)) {
    if (!copy[group] || typeof copy[group] !== 'object' || Array.isArray(copy[group])) {
      throw new Error(`${label}: ${group} must be an object.`);
    }
    if (!sameKeys(Object.keys(copy[group]), expectedKeys)) {
      throw new Error(`${label}: ${group} keys do not match the approved contract.`);
    }
    for (const key of expectedKeys) {
      if (typeof copy[group][key] !== 'string' || !copy[group][key]) {
        throw new Error(`${label}: ${group}.${key} must be a non-empty string.`);
      }
    }
  }
  for (const key of contactRfqScalarKeys) {
    if (typeof copy[key] !== 'string' || !copy[key]) {
      throw new Error(`${label}: ${key} must be a non-empty string.`);
    }
    const expectedPlaceholders = contactRfqPlaceholderContract[key] || [];
    if (!sameKeys(placeholdersIn(copy[key]), expectedPlaceholders)) {
      throw new Error(`${label}: ${key} placeholders do not match the approved contract.`);
    }
  }
}

function serializeContactRfqCopy(copy) {
  return JSON.stringify(copy)
    .replaceAll('<', '\\u003c')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
}

function contactRfqBlock($, label) {
  const blocks = $('script#contact-rfq-copy[type="application/json"]');
  if (blocks.length !== 1) {
    throw new Error(`${label}: expected exactly one Contact RFQ JSON data block.`);
  }
  return blocks.first();
}

function parseContactRfqBlock($, label) {
  const block = contactRfqBlock($, label);
  let copy;
  try {
    copy = JSON.parse(block.html() || '');
  } catch {
    throw new Error(`${label}: Contact RFQ JSON data block is invalid.`);
  }
  assertContactRfqCopy(copy, label);
  return copy;
}

function applyContactRfqCopy($, languageCode, pageName) {
  if (pageName !== 'contact.html') return;
  const copy = languageCode === config.sourceLanguage.code
    ? parseContactRfqBlock($, `${languageCode}/${pageName}`)
    : contactRfqContract.copies?.[languageCode];
  assertContactRfqCopy(copy, `${languageCode}/${pageName}`);
  contactRfqBlock($, `${languageCode}/${pageName}`).text(serializeContactRfqCopy(copy));
}

function assertContactRfqManualContract() {
  if (contactRfqContract.schemaVersion !== 1) {
    throw new Error('Contact RFQ manual contract schemaVersion must be 1.');
  }
  if (contactRfqContract.review?.method !== 'AI-assisted target-market line-by-line localization review') {
    throw new Error('Contact RFQ manual contract review method is missing or unsupported.');
  }
  if (contactRfqContract.review?.independentNativeSpeakerReview !== false) {
    throw new Error('Contact RFQ manual contract must not claim independent native-speaker review.');
  }
  const targetLanguageCodes = activeLanguages.map((language) => language.code);
  if (!sameKeys(Object.keys(contactRfqContract.copies || {}), targetLanguageCodes)) {
    throw new Error('Contact RFQ manual copies must exactly cover the active target languages.');
  }
  for (const languageCode of targetLanguageCodes) {
    const copy = contactRfqContract.copies[languageCode];
    assertContactRfqCopy(copy, `manual/${languageCode}`);
    const expectedSeparator = languageCode === 'ja' ? '：' : ': ';
    if (copy.contextSeparator !== expectedSeparator) {
      throw new Error(`manual/${languageCode}: contextSeparator must be ${JSON.stringify(expectedSeparator)}.`);
    }
  }
  const unsafeProbe = '</script>\u2028\u2029';
  const serializedProbe = serializeContactRfqCopy({ value: unsafeProbe });
  if (serializedProbe.includes('<') || serializedProbe.includes('\u2028') || serializedProbe.includes('\u2029')) {
    throw new Error('Contact RFQ JSON serializer did not escape script-sensitive characters.');
  }
  if (JSON.parse(serializedProbe).value !== unsafeProbe) {
    throw new Error('Contact RFQ JSON serializer did not preserve the original value.');
  }
}

assertContactRfqManualContract();

function assertProductDetailUiManualContract() {
  if (productDetailUiContract.schemaVersion !== 1) {
    throw new Error('Product-detail UI manual contract schemaVersion must be 1.');
  }
  if (productDetailUiContract.review?.method !== 'AI-assisted target-market line-by-line localization review') {
    throw new Error('Product-detail UI manual contract review method is missing or unsupported.');
  }
  if (productDetailUiContract.review?.independentNativeSpeakerReview !== false) {
    throw new Error('Product-detail UI manual contract must not claim independent native-speaker review.');
  }
  const expectedLanguageCodes = [config.sourceLanguage.code, ...activeLanguages.map((language) => language.code)];
  if (!sameKeys(Object.keys(productDetailUiContract.locales || {}), expectedLanguageCodes)) {
    throw new Error('Product-detail UI manual copies must exactly cover the source and active target languages.');
  }
  const expectedKeys = ['productImagesLabel', 'productInformationLabel', 'skipLink'];
  for (const languageCode of expectedLanguageCodes) {
    const copy = productDetailUiContract.locales[languageCode];
    if (!copy || typeof copy !== 'object' || Array.isArray(copy)
      || !sameKeys(Object.keys(copy), expectedKeys)) {
      throw new Error(`${languageCode}: product-detail UI copy keys do not match the approved contract.`);
    }
    for (const key of expectedKeys) {
      if (typeof copy[key] !== 'string' || !copy[key].trim()) {
        throw new Error(`${languageCode}: product-detail UI ${key} must be a non-empty string.`);
      }
    }
  }
  if (productDetailPageNames.length !== 16) {
    throw new Error(`Expected 16 translation-managed product-detail pages; found ${productDetailPageNames.length}.`);
  }
}

function applyProductDetailUiCopy($, languageCode, pageName) {
  if (!productDetailPagePattern.test(pageName)) return;
  const copy = productDetailUiContract.locales[languageCode];
  if (!copy) throw new Error(`${languageCode}/${pageName}: product-detail UI copy is missing.`);
  const scopes = [
    [PRODUCT_UI_SKIP_SELECTOR, 'skip link', (node) => node.text(copy.skipLink)],
    [PRODUCT_UI_IMAGES_SELECTOR, 'product images region', (node) => node.attr('aria-label', copy.productImagesLabel)],
    [PRODUCT_UI_INFO_SELECTOR, 'product information region', (node) => node.attr('aria-label', copy.productInformationLabel)],
  ];
  for (const [selector, label, apply] of scopes) {
    const nodes = $(selector);
    if (nodes.length !== 1) {
      throw new Error(`${languageCode}/${pageName}: expected one ${label}; found ${nodes.length}.`);
    }
    apply(nodes.first());
  }
}

assertProductDetailUiManualContract();

function pageUrl(languageCode, pageName) {
  const suffix = pageName === 'index.html' ? '' : pageName;
  if (languageCode === config.sourceLanguage.code) {
    return `${config.siteUrl}/${suffix}`;
  }
  return `${config.siteUrl}/${languageCode}/${suffix}`;
}

function switcherReference(currentLanguageCode, targetLanguageCode, pageName) {
  if (currentLanguageCode === config.sourceLanguage.code) {
    return targetLanguageCode === config.sourceLanguage.code
      ? pageName
      : `${targetLanguageCode}/${pageName}`;
  }
  if (targetLanguageCode === config.sourceLanguage.code) return `../${pageName}`;
  if (targetLanguageCode === currentLanguageCode) return pageName;
  return `../${targetLanguageCode}/${pageName}`;
}

function shouldTranslate(value) {
  const text = value.trim();
  return text.length > 0 && /[A-Za-z]/.test(text) && !/^[-+]?\d[\d\s.,%°/:-]*$/.test(text);
}

function collectRecords($) {
  const records = [];
  const coveredTextNodes = new WeakSet();
  const primarySelector = 'title,p,h1,h2,h3,h4,h5,h6,li,td,th,label,button,summary,option,figcaption,legend';

  const markCovered = (element) => {
    $(element).find('*').addBack().contents().each((_, node) => {
      if (node.type === 'text') coveredTextNodes.add(node);
    });
  };

  const addHtmlElement = (element) => {
    if ($(element).closest(excludedSelector).length) return;
    if ($(element).is(PRODUCT_UI_SKIP_SELECTOR)) {
      markCovered(element);
      return;
    }
    const source = ($(element).html() || '').trim();
    if (!shouldTranslate($(element).text())) return;
    records.push({ type: 'html', element, source });
    markCovered(element);
  };

  const addTextNode = (node) => {
    if (coveredTextNodes.has(node)) return;
    const parent = $(node).parent();
    if (parent.closest(excludedSelector).length) return;
    if (parent.is(PRODUCT_UI_SKIP_SELECTOR)) return;
    const original = node.data || '';
    const trimmed = original.trim();
    if (!shouldTranslate(trimmed)) return;
    records.push({ type: 'text', node, original, source: trimmed });
  };

  $(primarySelector).each((_, element) => {
    const ancestor = $(element).parents(primarySelector).first();
    if (!ancestor.length) addHtmlElement(element);
  });

  $('body a, body span').each((_, element) => {
    if ($(element).parents(primarySelector).length) return;
    if ($(element).parents('a,span').length) return;
    addHtmlElement(element);
  });

  $('body *').addBack('body').contents().each((_, node) => {
    if (node.type === 'text') addTextNode(node);
  });

  for (const attribute of config.translatedAttributes) {
    $(`[${attribute}]`).each((_, element) => {
      if ($(element).closest(excludedSelector).length) return;
      if (attribute === 'aria-label'
        && ($(element).is(PRODUCT_UI_IMAGES_SELECTOR) || $(element).is(PRODUCT_UI_INFO_SELECTOR))) return;
      const source = ($(element).attr(attribute) || '').trim();
      if (shouldTranslate(source)) records.push({ type: 'attribute', element, attribute, source });
    });
  }

  $('input[type="submit"][value], input[type="button"][value]').each((_, element) => {
    const source = ($(element).attr('value') || '').trim();
    if (shouldTranslate(source)) records.push({ type: 'attribute', element, attribute: 'value', source });
  });

  for (const selector of translatableMetaSelectors) {
    $(selector).each((_, element) => {
      const source = ($(element).attr('content') || '').trim();
      if (shouldTranslate(source)) records.push({ type: 'attribute', element, attribute: 'content', source });
    });
  }
  return records;
}

async function loadPages(pageNames = translationManagedPages) {
  const pages = [];
  for (const pageName of pageNames) {
    const filePath = path.join(sourceRoot, pageName);
    const html = await fs.readFile(filePath, 'utf8');
    const $ = load(html, { decodeEntities: false });
    pages.push({ pageName, html, $, records: collectRecords($) });
  }
  return pages;
}

function catalogFromPages(pages) {
  const sources = new Map();
  for (const page of pages) {
    for (const record of page.records) {
      if (!sources.has(record.source)) sources.set(record.source, new Set());
      sources.get(record.source).add(page.pageName);
    }
  }
  return [...sources.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([source, pagesUsingText]) => ({
      id: crypto.createHash('sha256').update(source).digest('hex').slice(0, 16),
      source,
      pages: [...pagesUsingText].sort(),
    }));
}

async function extractCatalog(pages) {
  const entries = catalogFromPages(pages);
  const catalog = {
    sourceLanguage: config.sourceLanguage.code,
    generatedAt: new Date().toISOString(),
    pages: translationManagedPages,
    entries,
  };
  await fs.writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
  console.log(`Extracted ${entries.length} unique strings from ${translationManagedPages.length} translation-managed pages.`);
  console.log(`Catalog: ${catalogPath}`);
  return catalog;
}

async function pruneTranslationCaches(catalog) {
  const validIds = new Set(catalog.entries.map((entry) => entry.id));
  for (const language of activeLanguages) {
    const cachePath = path.join(cacheRoot, `${language.code}.json`);
    let cache;
    try {
      cache = JSON.parse(await fs.readFile(cachePath, 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }
    const translations = cache.translations || {};
    let removed = 0;
    for (const id of Object.keys(translations)) {
      if (!validIds.has(id)) {
        delete translations[id];
        removed += 1;
      }
    }
    if (removed) {
      cache.translations = translations;
      await fs.writeFile(cachePath, `${JSON.stringify(cache, null, 2)}\n`, 'utf8');
    }
    console.log(`${language.code}: pruned ${removed} orphaned translation-cache entr${removed === 1 ? 'y' : 'ies'}.`);
  }
}

function protectTerms(source, languageCode) {
  const replacements = [];
  const terms = [
    ...Object.entries(glossary.preferredTerms[languageCode] || {}).map(([from, to]) => ({ from, to })),
    ...glossary.protectedTerms.map((term) => ({ from: term, to: term })),
  ].sort((a, b) => b.from.length - a.from.length);

  const prepared = source.split(/(<[^>]+>)/g).map((part) => {
    if (part.startsWith('<') && part.endsWith('>')) return part;
    let text = part;
    for (const term of terms) {
      const pattern = new RegExp(term.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      text = text.replace(pattern, () => {
        const token = `__BEGAPUNK_TERM_${replacements.length}__`;
        replacements.push({ token, value: term.to });
        return token;
      });
    }
    return text;
  }).join('');

  return {
    prepared,
    restore(translated) {
      let result = translated;
      for (const replacement of replacements) {
        result = result.replaceAll(replacement.token, replacement.value);
      }
      return decodeEntities(result);
    },
  };
}

function decodeEntities(value) {
  return value
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function normalizeJapaneseOutput(html) {
  const replacements = [
    ['びんの詰物及びおおう', 'ボトル充填・キャッピング'],
    ['びんの詰物およびおおう', 'ボトル充填・キャッピング'],
    ['詰物', '充填'],
    ['おおう', 'キャッピング'],
    ['締め金で止めること', 'クランプ'],
    ['締め金', 'クランプ'],
    ['回転式接合箇所', 'ロータリージョイント'],
    ['中空中空径', '中空穴'],
    ['空中空径', '中空穴'],
    ['空 中空径', '中空穴'],
    ['空中マニホールド', 'エアマニホールド'],
    ['据え付け品', '治具'],
    ['デッサン', '図面'],
    ['インストール', '取付'],
    ['プロシージャ', '手順'],
    ['物質的な', '材質上の'],
    ['物質的', '材質'],
    ['マウントタイプ', '取付方式'],
    ['純重量', '質量'],
    ['提案されたモデル', '推奨機種'],
    ['選択の焦点', '選定時の確認事項'],
    ['共通の機能', '代表的な機能'],
    ['機械類', '機械'],
    ['土台', '取付'],
    ['メディア', '使用流体'],
    ['義務周期', 'デューティサイクル'],
    ['義務', '使用条件'],
    ['derate', '定格を下げる'],
    ['流路 の', '流路の'],
    ['用途 の', '用途の'],
    ['最大の圧力', '最高使用圧力'],
    ['最高の圧力', '最高使用圧力'],
    ['最大の速度', '最高使用回転数'],
    ['最高の速度', '最高使用回転数'],
    ['最高のRPM', '最高使用回転数'],
    ['ニンポー', '寧波'],
    ['ライト オイル', '低粘度油'],
    ['冷却剤', 'クーラント'],
    ['1-in-1-out', '1流路'],
    ['2-in-2-out', '2流路'],
    ['3-in-3-out', '3流路'],
    ['4-in-4-out', '4流路'],
    ['8-in-8-out', '8流路'],
    ['1-in-6-out', '1入力6出力'],
    ['2-in-3-out', '2入力3出力'],
    ['2-in-4-out', '2入力4出力'],
    ['4-in-4out', '4流路'],
    ['images/optimized/2流路-Rotary-joint.webp', 'images/optimized/2-in-2-out-Rotary-joint.webp'],
    ['images/optimized/3流路-M8-rotary-joint-3.webp', 'images/optimized/3-in-3-out-M8-rotary-joint-3.webp'],
    ['カスタムロータリージョイント', '特注ロータリージョイント'],
    ['カスタム ロータリージョイント', '特注ロータリージョイント'],
    ['カスタム RFQ', '特注品・見積依頼'],
    ['誰がこれのためにいるのか:', '対象読者：'],
    ['オートメーション エンジニア', '自動化設備技術者'],
    ['メンテナンス マネージャー', '保全担当者'],
    ['レーザーの管の切断', 'レーザー管切断'],
    ['管の打抜き機', 'レーザー管切断機'],
    ['援助のガス', 'アシストガス'],
    ['助けのガス', 'アシストガス'],
    ['索引のテーブル', 'インデックステーブル'],
    ['シーリング頭部', 'シールヘッド'],
    ['使用条件の周期', '運転サイクル'],
    ['コンクルージョン', 'まとめ'],
    ['Specs', '仕様'],
    ['Spec', '仕様'],
    ['Mistake', '失敗例'],
    ['Undersizing', '径不足'],
    ['Distroy', '損傷させる'],
    ['Pinout', 'ピン配列'],
    ['セレクション', '選定'],
    ['カスタム の', '特注品の'],
    ['適用範囲が広いホース', 'フレキシブルホース'],
    ['堅い管', '硬質配管'],
    ['肯定的な圧力', '正圧'],
    ['唇シール', 'リップシール'],
    ['O-Rings', 'Oリング'],
    ['ポジシァヨナー', 'ポジショナー'],
    ['電子工学及び電池のテストの治具', '電子部品・バッテリー試験治具'],
    ['電子工学', '電子機器'],
    ['据え付け品', '治具'],
    ['密集した', 'コンパクトな'],
    ['回転式点検場所', '回転検査装置'],
    ['回転式移動', '回転部への供給'],
    ['空気そして真空', '空気と真空'],
    ['空気電気', '空圧・電気'],
    ['気圧電気', '空圧・電気'],
    ['チャネルカウント', '流路数'],
    ['信号カウント', '信号数'],
    ['流路の計算', '流路数'],
    ['予備チャネル', '予備流路'],
    ['マシンビルダー', '機械メーカー'],
    ['工具細工', '治具'],
    ['真空のコップ', '真空吸着パッド'],
    ['細胞の処理', 'セル搬送'],
    ['電池の巻上げ', '電池材料の巻取り'],
    ['洗剤材料', '清浄性に配慮した材質'],
    ['物質的な条件', '材質条件'],
    ['製造業装置', '製造装置'],
    ['空気吹き出し', 'エアブロー'],
    ['空気の締め金で止めること', '空圧クランプ'],
    ['空気グリッパー', '空圧グリッパー'],
    ['見直しる', '検討する'],
    ['送って下さい', 'お送りください'],
    ['下さい', 'ください'],
    ['堅い治具の封筒', '狭い治具スペース'],
    ['土台スペース', '取付スペース'],
    ['土台:', '取付:'],
    ['織物及び印刷', '繊維・印刷'],
    ['RPM', 'min⁻¹'],
    ['rpm', 'min⁻¹'],
    ['Max pressure', '最高使用圧力'],
    ['max pressure', '最高使用圧力'],
    ['Max speed', '最高使用回転数'],
    ['max speed', '最高使用回転数'],
    ['?78.9', 'φ78.9'],
    ['?64', 'φ64'],
    ['?6 mm', 'φ6 mm'],
  ];
  let normalized = html;
  for (const [from, to] of replacements) normalized = normalized.replaceAll(from, to);
  normalized = normalized
    .replaceAll('の特長', '')
    .replace(/最高の(\d+(?:\.\d+)?\s*MPa)/g, '最高使用圧力$1')
    .replace(/最高の(\d[\d,]*(?:\.\d+)?\s*RPM)/g, '最高使用回転数$1')
    .replace(/(\d+(?:\.\d+)?\s*MPa)最高/g, '最高使用圧力$1')
    .replace(/(\d[\d,]*(?:\.\d+)?\s*RPM)最高/g, '最高使用回転数$1')
    .replace(/最大の使用圧力/g, '最高使用圧力')
    .replace(/圧力を変形させ/g, '圧力を下げ')
    .replace(/速度を変形させ/g, '回転数を下げ')
    .replace(/ボディ変形/g, '本体形状')
    .replace(/(\d+\s*mm|G1\/\d+) の変形/g, '$1仕様')
    .replace(/クリーンルームの変形/g, 'クリーンルーム仕様')
    .replace(/([1-9])。\s*(?:\1。|。)\s*/g, '$1. ')
    .replace(/([1-9])。\s*/g, '$1. ')
    .replace(/\s+対\.\s+/g, 'と')
    .replace(/(BP-[A-Z0-9-]+)の特長/g, '$1')
    .replace(/sales@begapunk\.comの特長/g, 'sales@begapunk.com')
    .replace(/(機種比較|カスタム RFQ|空気圧工具|用途|製品情報)の特長/g, '$1');
  return localizeJapaneseStructuredData(normalized);
}

function localizeJapaneseStructuredData(html) {
  const $ = load(html, { decodeEntities: false });
  const pageHeading = $('h1').first().text().replace(/\s+/g, ' ').trim();
  const pageDescription = $('meta[name="description"]').attr('content')?.trim();
  const propertyNames = new Map([
    ['Product type', '製品種別'],
    ['SKU', '型式'],
    ['Passages', '流路数'],
    ['Orifice size', 'オリフィス径'],
    ['Maximum pressure', '最高使用圧力'],
    ['Maximum speed', '最高使用回転数'],
    ['Compatible media', '使用可能流体'],
    ['Body material', '本体材質'],
    ['Seal type', 'シール方式'],
    ['Bearing type', '軸受方式'],
    ['Thread type', 'ねじ規格'],
    ['Rotor connection', '回転側接続'],
    ['Stator connection', '固定側接続'],
    ['Mounting type', '取付方式'],
    ['Operating temperature', '使用温度範囲'],
    ['Net weight', '質量'],
    ['Approx. Weight', '質量'],
    ['Dimensions', '外形寸法'],
    ['Bore diameter', '中空穴径'],
    ['Idle torque', '無負荷トルク'],
    ['Running torque', '回転トルク'],
    ['Service life', '参考寿命'],
    ['Leakage', '漏れ'],
    ['Certifications', '認証'],
    ['Warranty', '保証期間'],
    ['Duty type', '使用条件'],
    ['Typical applications', '主な用途'],
  ]);
  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      const payload = JSON.parse($(element).html());
      const nodes = Array.isArray(payload?.['@graph']) ? payload['@graph'] : [payload];
      for (const node of nodes) {
        if (node?.['@type'] === 'BreadcrumbList' && Array.isArray(node.itemListElement)) {
          for (const item of node.itemListElement) {
            if (item?.position === 1) item.name = 'ホーム';
            if (item?.position === 2) item.name = String(item?.item || '').endsWith('/applications.html') ? '用途別情報' : '製品一覧';
          }
        }
        if (node?.['@type'] !== 'Product') continue;
        if (pageHeading) node.name = pageHeading;
        if (pageDescription) node.description = pageDescription;
        node.category = '空圧ロータリージョイント（回転継手）';
        if (Array.isArray(node.additionalProperty)) {
          for (const property of node.additionalProperty) {
            if (propertyNames.has(property?.name)) property.name = propertyNames.get(property.name);
          }
        }
      }
      $(element).text(JSON.stringify(payload));
    } catch {
      // Verification reports malformed JSON-LD; leave the original block intact for diagnosis.
    }
  });
  return $.html();
}

function normalizeGermanOutput(html) {
  const replacements = [
    ['1-in-1-out', '1-Kanal'],
    ['2-in-2-out', '2-Kanal'],
    ['3-in-3-out', '3-Kanal'],
    ['4-in-4-out', '4-Kanal'],
    ['4-in-4out', '4-Kanal'],
    ['8-in-8-out', '8-Kanal'],
    ['1-in-6-out', '1-zu-6'],
    ['2-in-3-out', '2-zu-3'],
    ['2-in-4-out', '2-zu-4'],
    ['images/optimized/2-Kanal-Rotary-joint.webp', 'images/optimized/2-in-2-out-Rotary-joint.webp'],
    ['images/optimized/3-Kanal-M8-rotary-joint-3.webp', 'images/optimized/3-in-3-out-M8-rotary-joint-3.webp'],
    ['RPM', 'min⁻¹'],
    ['rpm', 'min⁻¹'],
    ['Max pressure', 'maximaler Betriebsdruck'],
    ['max pressure', 'maximaler Betriebsdruck'],
    ['Max speed', 'maximale Drehzahl'],
    ['max speed', 'maximale Drehzahl'],
    ['Max ', 'max. '],
    ['Mistake', 'Fehler'],
    ['Triple-Kanal', '3-Kanal'],
    ['PTFE Composite', 'PTFE-Verbund'],
    ['Common Auslöser', 'Typische Gründe'],
    ['Rigid Rohrleitungen', 'starre Rohrleitungen'],
    ['Multi-Kanal', 'Mehrkanal'],
    ['multi-Kanal', 'Mehrkanal'],
    ['Multikanal-', 'Mehrkanal-'],
    ['Rundschalt-Drehscheibe', 'Rundschalttisch'],
    ['through-Bohrung', 'Durchgangsbohrung'],
    ['Through-Bohrung', 'Durchgangsbohrung'],
    ['Air Kanäle', 'Luftkanäle'],
    ['air Kanäle', 'Luftkanäle'],
    ['Rutschring', 'Schleifring'],
    ['Kanal Ausführung', 'Kanalauslegung'],
    ['5-Kanal-Joint', '5-Kanal-Drehdurchführung'],
    ['4-Kanal-Gelenks', '4-Kanal-Drehdurchführung'],
    ['gesamten Gelenks', 'gesamten Drehdurchführung'],
    ['Karte jede pneumatische Funktion', 'Ordnen Sie jede pneumatische Funktion zu'],
    ['Re-Leitungsführungsschläuche', 'erneute Verlegung der Schläuche'],
    ['Automatisierungstabelle', 'Automatisierungs-Rundtisch'],
    ['direkt mit dem Joint', 'direkt mit der Drehdurchführung'],
    ['Kompatible Maschinentypen & Applikationseignung', 'Geeignete Maschinentypen und Anwendungen'],
    ['Verbundene Produkte', 'Ähnliche Produkte'],
    ['Starten Sie Ihr kundenspezifisch Projekt', 'Kundenspezifisches Projekt anfragen'],
    ['kundenspezifisch Bestellungen & Lieferung', 'Kundenspezifische Ausführungen und Lieferung'],
    ['kundenspezifisch Projekt', 'kundenspezifisches Projekt'],
    ['Automation Rundtisch', 'Automatisierungs-Rundtisch'],
    ['Harsche Umweltauswahl', 'Auswahl für raue Umgebungen'],
    ['Electronics & Battery Test', 'Elektronik- und Batterietests'],
    ['Füllen und Capping Fragen', 'Fragen zu Füll- und Verschließanlagen'],
    ['Vergleichen Sie Modelle online oder Herunterladen den Produktkatalog 2026', 'Modelle online vergleichen oder Produktkatalog 2026 herunterladen'],
    ['Fabrik & Qualität', 'Fertigung und Qualität'],
    ['Kompatible Maschinentypen &amp; Applikationseignung', 'Geeignete Maschinentypen und Anwendungen'],
    ['Wie wir eine Drehdurchführung machen', 'Wie wir Drehdurchführungen fertigen'],
    ['Unternehmen Timeline', 'Unternehmensgeschichte'],
    ['Empfohlene Startpunkte', 'Empfohlene Modelle'],
    ['Automatisierungstabelle Checkliste', 'Auswahlcheckliste für Automatisierungs-Rundtische'],
    ['Automatisierungs-Rundtisch Parameter', 'Parameter für Automatisierungs-Rundtische'],
    ['3 Fehler, die die Automatisierung beschädigen können Rundtisch Drehdurchführungen', '3 Fehler, die Drehdurchführungen an Automatisierungs-Rundtischen beschädigen können'],
    ['Montage und Wartung für die Automatisierung Rundtisch Drehdurchführungen', 'Montage und Wartung von Drehdurchführungen an Automatisierungs-Rundtischen'],
    ['Flaschenbefüllung und -verschluss Drehdurchführungsparameter', 'Parameter für Drehdurchführungen an Füll- und Verschließmaschinen'],
    ['3 Fehler, die das Füllen und Verschließen von Drehdurchführungen beschädigen können', '3 Fehler bei Drehdurchführungen an Füll- und Verschließmaschinen'],
    ['Montage und Wartung zum Befüllen und Verschließen von Drehdurchführungen', 'Montage und Wartung an Füll- und Verschließmaschinen'],
    ['CNC-Vorrichtung Checkliste', 'Auswahlcheckliste für CNC-Spannvorrichtungen'],
    ['CNC-Pneumatische Klemm-Drehdurchführungsparameter', 'Parameter für Drehdurchführungen an CNC-Spannvorrichtungen'],
    ['Elektronik &amp; Batterie Test Drehdurchführung Fragen', 'Fragen zu Drehdurchführungen für Elektronik- und Batterietests'],
    ['Laserrohrschneiden Drehdurchführungsparameter', 'Parameter für Drehdurchführungen an Laserrohrschneidmaschinen'],
    ['Montage und Wartung für Laserschneiden Drehdurchführungen', 'Montage und Wartung an Laserrohrschneidmaschinen'],
    ['Verpackungsmaschinen Drehdurchführungsparameter', 'Parameter für Drehdurchführungen an Verpackungsmaschinen'],
    ['Montage und Wartung für die Verpackung Drehdurchführungen', 'Montage und Wartung an Verpackungsmaschinen'],
    ['Roboter EOAT Auswahl Checkliste', 'Auswahlcheckliste für Roboter-EOAT'],
    ['Roboter EOAT Drehdurchführung Anforderungen', 'Anforderungen an Drehdurchführungen für Roboter-EOAT'],
    ['staubgeschützt Drehdurchführungsparameter', 'Parameter für staubgeschützte Drehdurchführungen'],
    ['Quick Reference: Material Performance Table', 'Schnellübersicht: Werkstoffvergleich'],
    ['4. Kosten vs. Lifetime: Reale Zahlen', '4. Kosten und Lebensdauer: Praxiswerte'],
    ['1. O-Ring Dichtungen', '1. O-Ring-Dichtungen'],
    ['3. federunterstütztes kohlenstoffgefülltes PTFE Dichtungen', '3. Federunterstützte PTFE-Dichtungen mit Kohlenstofffüllung'],
    ['Wann zu ersetzen vs. Wann zu reparieren', 'Wann ersetzen, wann reparieren?'],
    ['Fabrikanschrift', 'Werksanschrift'],
    ['kundenspezifisch Bestellungen &amp; Lieferung', 'Sonderausführungen und Lieferung'],
    ['3. Cookies &amp; Tracking Technologien', '3. Cookies und Tracking-Technologien'],
    ['4. Data Sharing', '4. Weitergabe von Daten'],
    ['5. Vorratsdatenspeicherung', '5. Speicherdauer'],
    ['8. Privatsphäre der Kinder', '8. Datenschutz für Kinder'],
    ['10. uns benachrichtigen', '10. Kontakt'],
    ['?230', 'Ø230'],
    ['?78.9', 'Ø78,9'],
    ['?78,9', 'Ø78,9'],
    ['?64', 'Ø64'],
    ['?6 mm', 'Ø6 mm'],
  ];
  let normalized = html;
  for (const [from, to] of replacements) normalized = normalized.replaceAll(from, to);
  normalized = normalized
    .replace(/(BP-[A-Z0-9-]+) vs\. Andere Begapunk Modelle/g, '$1 im Vergleich zu anderen Begapunk Modellen')
    .replace(/3 Fehler, die (.+?) zerstören/g, '3 Fehler, die $1 beschädigen können')
    .replaceAll('3 Fehler, die die Automatisierung beschädigen können Rundtisch Drehdurchführungen', '3 Fehler bei Drehdurchführungen an Automatisierungs-Rundtischen')
    .replaceAll('3 Fehler, die das Füllen und Verschließen von Drehdurchführungen beschädigen können', '3 Fehler bei Drehdurchführungen an Füll- und Verschließmaschinen')
    .replaceAll('3 Fehler, die die Verpackung von Drehdurchführungen beschädigen können', '3 Fehler bei Drehdurchführungen an Verpackungsmaschinen')
    .replaceAll('CNC-Vorrichtung Drehdurchführung', 'Drehdurchführung für CNC-Spannvorrichtungen')
    .replaceAll('Pneumatische Werkzeugauswahl Checkliste', 'Auswahlcheckliste für Pneumatikwerkzeuge')
    .replaceAll('Pneumatisches Werkzeug Druckluft-Drehdurchführung Anforderungen', 'Anforderungen an Drehdurchführungen für Pneumatikwerkzeuge')
    .replaceAll('Pneumatisches Werkzeug Druckluft-Drehdurchführung Fragen', 'Fragen zu Drehdurchführungen für Pneumatikwerkzeuge')
    .replaceAll('kundenspezifisch ', 'Sonder-')
    .replaceAll('Blow-off', 'Abblasen')
    .replaceAll('Envelope', 'Bauraum')
    .replaceAll('Drehdurchführung für Druckmaschinen &amp; Converter', 'Drehdurchführung für Druck- und Verarbeitungsmaschinen')
    .replaceAll('<span class="icon notranslate" translate="no">5</span> Start Checkliste', '<span class="icon notranslate" translate="no">5</span> Prüfung vor der Inbetriebnahme');
  return localizeStructuredDataWithOptions(normalized, {
    homeLabel: 'Startseite',
    productsLabel: 'Produkte',
    applicationsLabel: 'Anwendungen',
    category: 'Pneumatische Drehdurchführung',
    propertyNames: {
      'Product type': 'Produkttyp', SKU: 'Artikelnummer', Passages: 'Kanalzahl',
      'Orifice size': 'Durchgang', 'Maximum pressure': 'Maximaler Betriebsdruck',
      'Maximum speed': 'Maximale Drehzahl', 'Compatible media': 'Betriebsmedien',
      'Body material': 'Gehäusewerkstoff', 'Seal type': 'Dichtung',
      'Bearing type': 'Lagerung', 'Thread type': 'Gewinde',
      'Rotor connection': 'Rotoranschluss', 'Stator connection': 'Gehäuseanschluss',
      'Mounting type': 'Montageart', 'Operating temperature': 'Betriebstemperatur',
      'Net weight': 'Gewicht', 'Approx. Weight': 'Gewicht', Dimensions: 'Abmessungen',
      'Bore diameter': 'Durchgangsbohrung', 'Idle torque': 'Leerlaufdrehmoment',
      'Running torque': 'Drehmoment', 'Service life': 'Richtwert Lebensdauer',
      Leakage: 'Leckage', Certifications: 'Zertifizierungen', Warranty: 'Garantie',
      'Duty type': 'Betriebsart', 'Typical applications': 'Typische Anwendungen',
    },
  });
}

function normalizeRussianOutput(html) {
  const replacements = [
    ['1-in-1-out', '1 канал'],
    ['2-in-2-out', '2 канала'],
    ['3-in-3-out', '3 канала'],
    ['4-in-4-out', '4 канала'],
    ['4-in-4out', '4 канала'],
    ['8-in-8-out', '8 каналов'],
    ['1-in-6-out', '1 вход / 6 выходов'],
    ['2-in-3-out', '2 входа / 3 выхода'],
    ['2-in-4-out', '2 входа / 4 выхода'],
    ['images/optimized/2 канала-Rotary-joint.webp', 'images/optimized/2-in-2-out-Rotary-joint.webp'],
    ['images/optimized/3 канала-M8-rotary-joint-3.webp', 'images/optimized/3-in-3-out-M8-rotary-joint-3.webp'],
    ['RPM', 'об/мин'],
    ['rpm', 'об/мин'],
    ['MPa', 'МПа'],
    ['Max pressure', 'максимальное рабочее давление'],
    ['max pressure', 'максимальное рабочее давление'],
    ['Max speed', 'максимальная скорость вращения'],
    ['max speed', 'максимальная скорость вращения'],
    ['Макс ', 'макс. '],
    ['Max ', 'макс. '],
    ['Ротационное соединение Specs', 'Характеристики ротационного соединения'],
    ['ротационное соединение Specs', 'характеристики ротационного соединения'],
    ['Specs', 'характеристики'],
    ['Mistake', 'Ошибка'],
    ['Air Swivel', 'поворотное пневмосоединение'],
    ['воздушный поворот', 'поворотное пневмосоединение'],
    ['пневматических воздушных плющ', 'поворотного пневмосоединения'],
    ['Пневматический инструмент поворотное пневмосоединение Вопросы', 'Вопросы о поворотных соединениях для пневмоинструмента'],
    ['облегчение деформации', 'разгрузка натяжения'],
    ['пломбы', 'уплотнения'],
    ['носители', 'рабочие среды'],
    ['конверт', 'габарит'],
    ['Тяжелый 2-х проходной ротационное соединение', 'Усиленное двухканальное ротационное соединение'],
    ['Приложение Fit', 'Область применения'],
    ['приложения Fit', 'области применения'],
    ['Связанные продукты', 'Похожие модели'],
    ['Компания Timeline', 'История компании'],
    ['Начните свой пользовательский проект', 'Обсудить индивидуальный проект'],
    ['Пользовательские заказы и доставка', 'Индивидуальные исполнения и поставка'],
    ['пользовательский обзор', 'индивидуальный анализ'],
    ['Рекомендуемые начальные точки', 'Рекомендуемые модели'],
    ['ротационное соединениестол ротационное соединение', 'ротационных соединений для поворотных столов'],
    ['пневматический ротационное соединение', 'пневматическое ротационное соединение'],
    ['индивидуальный пневматическое ротационное соединение', 'индивидуальное пневматическое ротационное соединение'],
    ['Робот EOAT Ротационное соединение', 'Ротационное соединение для робота EOAT'],
    ['Монтаж и техническое обслуживание ротационное соединение', 'Монтаж и обслуживание ротационных соединений'],
    ['Печатная техника Ротационное соединение Вопросы', 'Вопросы о ротационных соединениях для печатного оборудования'],
    ['Вакуумная упаковка ротационное соединение Вопросы', 'Вопросы о ротационных соединениях для вакуумной упаковки'],
    ['Сварочные позиционеры Ротационное соединение Вопросы', 'Вопросы о ротационных соединениях для сварочных позиционеров'],
    ['Когда заменить vs. Когда ремонтировать', 'Когда заменять, а когда ремонтировать'],
    ['Стоимость vs. Время жизни', 'Стоимость и срок службы'],
    ['Материалы для уплотнение и жилищные материалы', 'Материалы уплотнений и корпуса'],
    ['Весочувствительные приложения', 'Применения с ограничением по массе'],
    ['уплотнение для губ', 'Манжетные уплотнения'],
    ['Весенние энергетические углеродные PTFE-уплотнение', 'Подпружиненные PTFE-уплотнения с углеродным наполнителем'],
    ['Как выбрать правильный тип уплотнение', 'Как выбрать подходящий тип уплотнения'],
    ['Установка на проточенную гору', 'Монтаж резьбового соединения'],
    ['Small Models', 'компактные модели'],
    ['роторные таблицы', 'поворотные столы'],
    ['роторных таблиц', 'поворотных столов'],
    ['роторной таблицы', 'поворотного стола'],
    ['роторная таблица', 'поворотный стол'],
    ['роторного стола автоматизации', 'автоматизированного поворотного стола'],
    ['таблицы индексации', 'индексные столы'],
    ['таблица индексации', 'индексный стол'],
    ['многопропускной', 'многоканальный'],
    ['многопроходный', 'многоканальный'],
    ['Многопропускной', 'Многоканальный'],
    ['Многопроходный', 'Многоканальный'],
    ['Многопропуск', 'Многоканал'],
    ['многопропуск', 'многоканал'],
    ['Многопроход', 'Многоканал'],
    ['многопроход', 'многоканал'],
    ['каждый оснастка', 'каждый элемент оснастки'],
    ['каждую оснастка', 'каждый элемент оснастки'],
    ['несколько оснастка', 'несколько элементов оснастки'],
    ['весь ротационное соединение', 'всё ротационное соединение'],
    ['один ротационное соединение', 'одно ротационное соединение'],
    ['ротационное соединение должен', 'ротационное соединение должно'],
    ['ротационное соединение может быть выбран', 'ротационное соединение можно выбрать'],
    ['пользовательский дизайн', 'специальное исполнение'],
    ['Пользовательский дизайн', 'Специальное исполнение'],
    ['пользовательский макет', 'специальную компоновку'],
    ['счет станции', 'число станций'],
    ['счетчик сигналов', 'число сигналов'],
    ['радиальный клиренс', 'радиальный зазор'],
    ['Критический:', 'Важно:'],
    ['Общие ошибки установки и их подписи', 'Типичные ошибки монтажа и их признаки'],
    ['Построено на реальных требованиях к машине', 'На основе реальных требований оборудования'],
    ['Где используются Begapunk Air Ротационные соединения', 'Где применяются пневматические ротационные соединения Begapunk'],
    ['Тип приложения для семейства продуктов', 'Соответствие областей применения сериям продукции'],
    ['Продолжайте процесс выбора', 'Следующий этап подбора'],
    ['Фабрика и качество', 'Производство и контроль качества'],
    ['Ты не нашел свой ответ?', 'Не нашли ответ на свой вопрос?'],
    ['1 Связь', '1 Подключения'],
    ['2 антиротационный', '2 Защита от проворачивания'],
    ['5 Стартап контрольный список', '5 Проверка перед первым запуском'],
    ['Ценообразование и цитаты', 'Цены и коммерческие предложения'],
    ['Доставка и доставка', 'Отгрузка и доставка'],
    ['Возврат и возврат', 'Возврат товара и денежных средств'],
    ['Управляющий закон', 'Применимое право'],
    ['Изменения в терминах', 'Изменение условий'],
    ['11. Контакт', '11. Контакты'],
    ['Cookies и технологии отслеживания', 'Файлы cookie и технологии отслеживания'],
    ['макс. Спид', 'Максимальная скорость'],
    ['#####1. Тест на статическое давление (без вращения)', '1. Статическое испытание давлением (без вращения)'],
    ['####2. Тест на низкоскоростное вращение', '2. Испытание при низкой скорости вращения'],
    ['####3. Полная операция', '3. Работа при номинальных условиях'],
    ['####Ключевое понимание', 'Ключевой вывод'],
    ['Обсуждение Begapunk Ротационные соединения &amp; Ротационные соединения', 'Поиск по ротационным соединениям Begapunk'],
    ['печатного и габаритингового оборудования', 'печатного и конвертингово оборудования'],
    ['Как сделать ротационное соединение', 'Как мы производим ротационные соединения'],
    ['Заполнение бутылок и захват параметров ротационное соединение', 'Параметры соединений для машин розлива и укупорки'],
    ['3 ошибки, которые могут повредить заполнение и захват ротационное соединение', '3 ошибки при выборе соединений для линий розлива и укупорки'],
    ['Заполнение и заполнение вопросов', 'Вопросы о соединениях для машин розлива и укупорки'],
    ['Параметры пневматического зажима ротационное соединение с ЧПУ', 'Параметры соединений для пневматических зажимов станков с ЧПУ'],
    ['Упаковочные машины Ротационное соединение Parameters', 'Параметры соединений для упаковочных машин'],
    ['пневматические воздушные плюшки', 'поворотные соединения для пневмоинструмента'],
    ['Ошибка 5: Использование неправильного метода утепления струй', 'Ошибка 5: Неправильная герметизация резьбы'],
    ['Установка контрольный список', 'Контрольный список монтажа'],
    ['Где появляется утечка, говорит вам о проблеме', 'Место утечки указывает на причину'],
    ['Быстрая ссылка: таблица производительности материалов', 'Краткое сравнение материалов'],
    ['Выводы', 'Вывод'],
    ['Предварительный контрольный список установки: три вещи, которые вы должны проверить', 'Проверьте три пункта перед монтажом'],
    ['Установка анти-ротационных кронштейнов', 'Монтаж кронштейна защиты от проворачивания'],
    ['1 Связь', '1. Подключение'],
    ['2 антиротационный', '2. Защита от проворачивания'],
    ['4 смазка', '4. Смазка'],
    ['5 Стартап контрольный список', '5. Проверка перед первым запуском'],
    ['6 техническое обслуживание', '6. Техническое обслуживание'],
    ['?230', 'Ø230'],
    ['?78.9', 'Ø78,9'],
    ['?78,9', 'Ø78,9'],
    ['?64', 'Ø64'],
    ['?6 mm', 'Ø6 мм'],
  ];
  let normalized = html;
  for (const [from, to] of replacements) normalized = normalized.replaceAll(from, to);
  normalized = normalized
    .replace(/(BP-[A-Z0-9-]+) против\. Другие модели Begapunk/g, '$1: сравнение с другими моделями Begapunk')
    .replace(/3 ошибки, которые (?:уничтожают|разрушают) (.+?)(?=<|\n)/g, '3 ошибки, которые могут повредить $1')
    .replace(/Нужен (ротационное соединение|поворотное пневмосоединение)/g, 'Нужно $1')
    .replaceAll('конвертингово оборудования', 'конвертингового оборудования')
    .replaceAll('3 ошибки, которые могут повредить заполнение и захват ротационное соединение', '3 ошибки при выборе соединений для линий розлива и укупорки')
    .replaceAll('поворотного ротационное соединение крепления с ЧПУ', 'ротационного соединения для зажимной оснастки станка с ЧПУ')
    .replaceAll('Строительство или замена упаковочного станка ротационное соединение?', 'Проектируете или заменяете соединение для упаковочной машины?')
    .replaceAll('<span class="icon notranslate" translate="no">1</span> Связь', '<span class="icon notranslate" translate="no">1</span> Подключение')
    .replaceAll('<span class="icon notranslate" translate="no">2</span> антиротационный', '<span class="icon notranslate" translate="no">2</span> Защита от проворачивания')
    .replaceAll('<span class="icon notranslate" translate="no">4</span> смазка', '<span class="icon notranslate" translate="no">4</span> Смазка')
    .replaceAll('<span class="icon notranslate" translate="no">5</span> Стартап контрольный список', '<span class="icon notranslate" translate="no">5</span> Проверка перед первым запуском')
    .replaceAll('<span class="icon notranslate" translate="no">6</span> техническое обслуживание', '<span class="icon notranslate" translate="no">6</span> Техническое обслуживание')
    .replaceAll('соединение должен', 'соединение должно');
  return localizeStructuredDataWithOptions(normalized, {
    homeLabel: 'Главная',
    productsLabel: 'Продукция',
    applicationsLabel: 'Применение',
    category: 'Пневматическое ротационное соединение',
    propertyNames: {
      'Product type': 'Тип изделия', SKU: 'Артикул', Passages: 'Количество каналов',
      'Orifice size': 'Диаметр прохода', 'Maximum pressure': 'Максимальное рабочее давление',
      'Maximum speed': 'Максимальная скорость вращения', 'Compatible media': 'Рабочая среда',
      'Body material': 'Материал корпуса', 'Seal type': 'Тип уплотнения',
      'Bearing type': 'Тип подшипника', 'Thread type': 'Резьба',
      'Rotor connection': 'Подключение ротора', 'Stator connection': 'Подключение статора',
      'Mounting type': 'Тип крепления', 'Operating temperature': 'Рабочая температура',
      'Net weight': 'Масса', 'Approx. Weight': 'Масса', Dimensions: 'Габариты',
      'Bore diameter': 'Диаметр проходного отверстия', 'Idle torque': 'Момент холостого хода',
      'Running torque': 'Крутящий момент', 'Service life': 'Расчётный срок службы',
      Leakage: 'Утечка', Certifications: 'Сертификация', Warranty: 'Гарантия',
      'Duty type': 'Режим работы', 'Typical applications': 'Типичные области применения',
    },
  });
}

function localizeStructuredDataWithOptions(html, options) {
  const $ = load(html, { decodeEntities: false });
  const pageHeading = $('h1').first().text().replace(/\s+/g, ' ').trim();
  const pageDescription = $('meta[name="description"]').attr('content')?.trim();
  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      const payload = JSON.parse($(element).html());
      const nodes = Array.isArray(payload?.['@graph']) ? payload['@graph'] : [payload];
      for (const node of nodes) {
        if (node?.['@type'] === 'BreadcrumbList' && Array.isArray(node.itemListElement)) {
          for (const item of node.itemListElement) {
            if (item?.position === 1) item.name = options.homeLabel;
            if (item?.position === 2) {
              item.name = String(item?.item || '').endsWith('/applications.html')
                ? options.applicationsLabel
                : options.productsLabel;
            }
          }
        }
        if (node?.['@type'] !== 'Product') continue;
        if (pageHeading) node.name = pageHeading;
        if (pageDescription) node.description = pageDescription;
        node.category = options.category;
        if (Array.isArray(node.additionalProperty)) {
          for (const property of node.additionalProperty) {
            if (options.propertyNames[property?.name]) property.name = options.propertyNames[property.name];
          }
        }
      }
      $(element).text(JSON.stringify(payload));
    } catch {
      // Verification reports malformed JSON-LD; leave the original block intact for diagnosis.
    }
  });
  return $.html();
}

async function translateBatch(apiKey, languageCode, sources) {
  const protectedItems = sources.map((source) => protectTerms(source, languageCode));
  const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      q: protectedItems.map((item) => item.prepared),
      source: config.sourceLanguage.code,
      target: languageCode,
      format: 'html',
      model: 'nmt',
    }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google Cloud Translation request failed (${response.status}): ${body.slice(0, 500)}`);
  }
  const payload = await response.json();
  const translations = payload?.data?.translations || [];
  if (translations.length !== sources.length) {
    throw new Error(`Expected ${sources.length} translations for ${languageCode}, received ${translations.length}.`);
  }
  return translations.map((translation, index) => protectedItems[index].restore(translation.translatedText));
}

function makeBatches(entries) {
  const batches = [];
  let current = [];
  let characters = 0;
  for (const entry of entries) {
    if (current.length >= 100 || characters + entry.source.length > 20000) {
      batches.push(current);
      current = [];
      characters = 0;
    }
    current.push(entry);
    characters += entry.source.length;
  }
  if (current.length) batches.push(current);
  return batches;
}

async function translateCatalog(catalog) {
  const apiKey = process.env.GOOGLE_CLOUD_TRANSLATION_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_CLOUD_TRANSLATION_API_KEY is not set. The key must be supplied through the process environment.');
  }
  await fs.mkdir(cacheRoot, { recursive: true });
  for (const language of activeLanguages) {
    const cachePath = path.join(cacheRoot, `${language.code}.json`);
    let cache = { language: language.code, generatedAt: null, translations: {} };
    try {
      cache = JSON.parse(await fs.readFile(cachePath, 'utf8'));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    const missing = catalog.entries.filter((entry) => !cache.translations[entry.id]);
    const batches = makeBatches(missing);
    for (let index = 0; index < batches.length; index += 1) {
      const batch = batches[index];
      console.log(`${language.code}: translating batch ${index + 1}/${batches.length} (${batch.length} strings)`);
      const translated = await translateBatch(apiKey, language.code, batch.map((entry) => entry.source));
      translated.forEach((value, itemIndex) => {
        cache.translations[batch[itemIndex].id] = value;
      });
      cache.generatedAt = new Date().toISOString();
      await fs.writeFile(cachePath, `${JSON.stringify(cache, null, 2)}\n`, 'utf8');
    }
    console.log(`${language.code}: ${Object.keys(cache.translations).length}/${catalog.entries.length} strings cached.`);
  }
}

function assertCatalogPageContract(catalog, operation) {
  if (!catalog) throw new Error(`Run the extract step before ${operation}.`);
  if (JSON.stringify(catalog.pages) !== JSON.stringify(translationManagedPages)) {
    throw new Error(`source-catalog pages must exactly match translationManagedPages before ${operation}.`);
  }
}

function localizeRelativeReference(value, pilotPages) {
  if (!value || value.startsWith('#') || value.startsWith('/') || /^(?:[a-z]+:|\/\/)/i.test(value)) return value;
  const match = value.match(/^([^?#]*)([?#].*)?$/);
  const pathname = match?.[1] || value;
  const suffix = match?.[2] || '';
  if (!pathname) return value;
  const normalized = pathname.replace(/^\.\//, '');
  if (normalized.startsWith('../')) {
    const rootRelative = normalized.slice(3);
    if (rootRelative.startsWith('../')) {
      throw new Error(`Nested parent-relative reference is not allowed in localized output: ${value}`);
    }
    if (pilotPages.has(rootRelative)) return `${rootRelative}${suffix}`;
    return `../${rootRelative}${suffix}`;
  }
  if (pilotPages.has(normalized)) return `${normalized}${suffix}`;
  return `../${normalized}${suffix}`;
}

function compactText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function schemaTypes(node) {
  const type = node?.['@type'];
  return new Set((Array.isArray(type) ? type : [type]).filter(Boolean));
}

function visibleFaqEntities($) {
  return $('.faq-item, .app-faq-item').map((_, item) => {
    const questionNode = $(item).find('.faq-question, h3').first().clone();
    questionNode.find('svg, i, .faq-icon, .faq-toggle, .arrow').remove();
    const question = compactText(questionNode.text());
    const answer = compactText($(item).find('.faq-answer, p').first().text());
    if (!question || !answer) return null;
    return {
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    };
  }).get().filter(Boolean);
}

function applySeoMetadata($, languageCode, pageName) {
  const seo = seoByLanguage.get(languageCode)?.[pageName];
  if (!seo?.title || !seo?.description || !seo?.h1) {
    throw new Error(`${languageCode}/${pageName}: missing curated SEO title, description or H1.`);
  }
  $('title').first().text(seo.title);
  const setMeta = (selector, attributes, content) => {
    let element = $(selector).first();
    if (!element.length) {
      element = $('<meta>');
      for (const [name, value] of Object.entries(attributes)) element.attr(name, value);
      $('head').append(element);
    }
    element.attr('content', content);
  };
  setMeta('meta[name="description"]', { name: 'description' }, seo.description);
  $('h1').first().text(seo.h1);
  setMeta('meta[property="og:title"]', { property: 'og:title' }, seo.title);
  setMeta('meta[property="og:description"]', { property: 'og:description' }, seo.description);
  setMeta('meta[name="twitter:title"]', { name: 'twitter:title' }, seo.title);
  setMeta('meta[name="twitter:description"]', { name: 'twitter:description' }, seo.description);
  // Google ignores meta keywords. Removing the inherited English keyword list
  // avoids mixed-language metadata and unsupported certification phrases.
  $('meta[name="keywords"]').remove();
}

const schemaLocaleByLanguage = {
  de: {
    founderJobTitle: 'Gründer und Ingenieur',
    factoryName: 'Begapunk Fertigung',
    slogan: 'Spezialist für pneumatische Drehdurchführungen',
    knowsAbout: ['Pneumatische Drehdurchführungen', 'Mehrkanal-Drehdurchführungen', 'Industrielle Automatisierung', 'CNC-Maschinen', 'Laserschneidmaschinen', 'Verpackungsmaschinen'],
  },
  ja: {
    founderJobTitle: '創業者・技術責任者',
    factoryName: 'Begapunk 生産拠点',
    slogan: '空圧用ロータリージョイント専門メーカー',
    knowsAbout: ['空圧用ロータリージョイント', '多流路・多ポートロータリージョイント', '特注回転継手', '産業自動化', 'CNC工作機械', 'レーザー切断機', '包装機械'],
  },
  ru: {
    founderJobTitle: 'Основатель и инженер',
    factoryName: 'Производство Begapunk',
    slogan: 'Специалист по пневматическим вращающимся соединениям',
    knowsAbout: ['Пневматические вращающиеся соединения', 'Пневматические ротационные соединения', 'Многоканальные вращающиеся коллекторы', 'Специальные вращающиеся соединения', 'Промышленная автоматизация', 'Станки с ЧПУ', 'Лазерные станки', 'Упаковочное оборудование'],
  },
};

const structuredPropertyNames = {
  de: {
    'Protection rating': 'Schutzart', 'Pneumatic passages': 'Pneumatische Kanäle',
    'Electrical circuits': 'Elektrische Stromkreise', 'Electrical contact material': 'Kontaktwerkstoff',
    'Insulation resistance': 'Isolationswiderstand', 'Surface treatment': 'Oberflächenbehandlung',
    'Hollow bore diameter': 'Durchmesser der Durchgangsbohrung',
  },
  ja: {
    'Protection rating': '保護等級', 'Pneumatic passages': '空圧流路数',
    'Electrical circuits': '電気回路数', 'Electrical contact material': '電気接点材質',
    'Insulation resistance': '絶縁抵抗', 'Surface treatment': '表面処理',
    'Hollow bore diameter': '中空穴径',
  },
  ru: {
    'Protection rating': 'Степень защиты', 'Pneumatic passages': 'Пневматические каналы',
    'Electrical circuits': 'Электрические цепи', 'Electrical contact material': 'Материал электрических контактов',
    'Insulation resistance': 'Сопротивление изоляции', 'Surface treatment': 'Обработка поверхности',
    'Hollow bore diameter': 'Диаметр сквозного отверстия',
  },
};

const structuredWarrantyTerms = {
  de: { name: 'Garantiebedingungen', value: 'Im Angebot/Auftrag bestätigt' },
  ja: { name: '保証条件', value: '見積書・注文書で確認' },
  ru: { name: 'Условия гарантии', value: 'Указаны в коммерческом предложении/заказе' },
};

const structuredApplicationValues = {
  de: {
    'BP-1P-0003.html': 'Handgeführte Pneumatikwerkzeuge, kleine Drehtische, Schlauch-Entdrallung, Etikettier- und Verschließstationen',
    'BP-1P-0006.html': 'Montagestationen, Drehtische, Pneumatikverteiler, Dosierköpfe, Schweißpositionierer und Prüftische',
    'BP-2P-0001.html': 'Verpackungsdrehtische, Schweißpositionierer, Rundschalttische, Abfüllstationen und Zweikanal-Spannvorrichtungen',
    'BP-2P-0002.html': 'CNC-Rundachsen, Roboterschweißtische, pneumatische Rundschalttische, Bildverarbeitung und kundenspezifische Automation',
    'BP-2P-08-0001.html': 'Kleine Elektronik-Drehtische, kompakte Dosier-, Prüf-, Montage- und Verpackungsstationen',
    'BP-2P-130-0001.html': 'Hydraulische Rundschalttische, Hochdruck-Spannsysteme, schwere Schweißpositionierer und CNC-Rundachsen',
    'BP-2P-16-0001.html': 'CNC-Rundschalttische, Schweißpositionierer, Verpackungsdrehtische, pneumatische Spann- und Prüfvorrichtungen',
    'BP-2P-30-0001.html': 'Verpackungsdrehtische, Schweißstationen, pneumatische Spannvorrichtungen, Sprühsysteme und Automatisierungsdrehtische',
    'BP-2P-50-0001.html': 'Stahlwerke, Gießereien, staubige Verpackungslinien, Schweißpositionierer und Rundschalttische in rauer Umgebung',
    'BP-2P-95-0001.html': 'Pneumatische Spannvorrichtungen, Drehvorrichtungen sowie Mehrfachverteilung von Luft, Kühlmittel und leichten Flüssigkeiten',
    'BP-3P-0004.html': 'Dreistationen-Spannvorrichtungen, Rundschalttische, Verpackungs-, Schweiß-, Abfüll- und Prüfanlagen',
    'BP-3P-0006.html': 'Mittelgroße Dreikanal-Spannvorrichtungen, Rundschalttische, Verpackungsmaschinen, Schweißtische und Prüfanlagen',
    'BP-3P-0007.html': 'Kompakte Dreikanal-Vorrichtungen, kleine Rundschalttische, Verpackungsköpfe, Schweißpositionierer und Roboter-EOAT',
    'BP-3P-S06-0001.html': 'Automatisierungsdrehtische, Verpackungsmaschinen, CNC-Spanntechnik, Schweißpositionierer und pneumatisch-elektrische Rundtische',
    'BP-4P-30-0001.html': 'Mehrstations-Drehtische, Systeme mit Kabeldurchführung, Vierstations-Spannvorrichtungen, Schweiß- und Verpackungsanlagen',
    'BP-8P-0001.html': 'Hochdichte Mehrkanalsysteme, Achtstations-Spannvorrichtungen, große Rundschalttische, Verpackungs-, Schweiß- und Prüfanlagen',
  },
  ja: {
    'BP-1P-0003.html': '手持ち空圧工具、小型回転テーブル、ホースのねじれ防止、ラベリング機、ボトルキャッピング装置',
    'BP-1P-0006.html': '組立設備、回転テーブル、エアマニホールド、塗布ヘッド、溶接ポジショナー、検査テーブル',
    'BP-2P-0001.html': '包装用回転テーブル、溶接ポジショナー、2ステーション割出テーブル、充填設備、2流路空圧治具',
    'BP-2P-0002.html': 'CNC第4・第5軸、ロボット溶接テーブル、空圧割出テーブル、画像検査、特注自動化設備',
    'BP-2P-08-0001.html': '小型電子機器用回転テーブル、コンパクトな塗布・検査・組立・包装設備',
    'BP-2P-130-0001.html': '油圧割出テーブル、高圧油圧クランプ、重量物用溶接ポジショナー、大型CNC回転軸',
    'BP-2P-16-0001.html': 'CNC割出テーブル、溶接ポジショナー、包装用回転テーブル、空圧クランプ治具、回転検査装置',
    'BP-2P-30-0001.html': '包装用回転テーブル、溶接設備、空圧クランプ治具、回転スプレー装置、自動化用回転テーブル',
    'BP-2P-50-0001.html': '製鉄所、鋳造設備、粉じんの多い包装ライン、溶接ポジショナー、大型空圧割出テーブル',
    'BP-2P-95-0001.html': '空圧クランプ、回転治具、複数箇所へのエア分配、クーラントおよび低粘度流体の分配',
    'BP-3P-0004.html': '3ステーション空圧クランプ、3流路割出テーブル、包装・溶接・充填・検査設備',
    'BP-3P-0006.html': '中型3流路クランプ治具、割出テーブル、包装機、溶接テーブル、充填・検査設備',
    'BP-3P-0007.html': '小型3流路空圧治具、コンパクトな割出テーブル、包装ヘッド、溶接ポジショナー、ロボットEOAT',
    'BP-3P-S06-0001.html': '自動化用回転テーブル、包装機、CNC空圧クランプ、溶接ポジショナー、空圧・電気複合回転装置',
    'BP-4P-30-0001.html': '多ステーション回転テーブル、ケーブル貫通空圧システム、4ステーションクランプ、溶接・包装設備',
    'BP-8P-0001.html': '高密度多ポート空圧システム、8ステーションクランプ、大型割出テーブル、包装・溶接・検査設備',
  },
  ru: {
    'BP-1P-0003.html': 'Ручной пневмоинструмент, малые поворотные столы, защита шланга от скручивания, этикетировочные и укупорочные машины',
    'BP-1P-0006.html': 'Сборочные станции, поворотные столы, пневмоколлекторы, дозирующие головки, сварочные позиционеры и контрольные стенды',
    'BP-2P-0001.html': 'Упаковочные поворотные столы, сварочные позиционеры, двухпозиционные индексные столы, линии розлива и двухканальные зажимные приспособления',
    'BP-2P-0002.html': 'Поворотные оси станков с ЧПУ, роботизированная сварка, пневматические индексные столы, машинное зрение и специальная автоматизация',
    'BP-2P-08-0001.html': 'Компактные поворотные столы и малогабаритные дозирующие, контрольные, сборочные и упаковочные установки',
    'BP-2P-130-0001.html': 'Гидравлические индексные столы, системы зажима высокого давления, тяжёлые сварочные позиционеры и поворотные оси ЧПУ',
    'BP-2P-16-0001.html': 'Индексные столы ЧПУ, сварочные позиционеры, упаковочные поворотные столы, пневматические зажимные и контрольные приспособления',
    'BP-2P-30-0001.html': 'Упаковочные поворотные столы, сварочные станции, пневматические зажимы, распылительные установки и автоматизированные столы',
    'BP-2P-50-0001.html': 'Металлургические и литейные производства, запылённые упаковочные линии, сварочные позиционеры и индексные столы',
    'BP-2P-95-0001.html': 'Пневматический зажим, поворотные приспособления и распределение воздуха, СОЖ и маловязких жидкостей',
    'BP-3P-0004.html': 'Трёхпозиционные пневмозажимы, индексные столы, упаковочные, сварочные, разливочные и контрольные установки',
    'BP-3P-0006.html': 'Средние трёхканальные зажимные приспособления, индексные столы, упаковочные машины, сварочные столы и контрольные установки',
    'BP-3P-0007.html': 'Компактные трёхканальные приспособления, малые индексные столы, упаковочные головки, сварочные позиционеры и оснастка роботов',
    'BP-3P-S06-0001.html': 'Автоматизированные поворотные столы, упаковочные машины, зажимы ЧПУ, сварочные позиционеры и пневмоэлектрические системы',
    'BP-4P-30-0001.html': 'Многопозиционные поворотные столы, системы с проходом кабеля, четырёхпозиционные зажимы, сварочные и упаковочные установки',
    'BP-8P-0001.html': 'Многоканальные пневмосистемы высокой плотности, восьмипозиционные зажимы, большие индексные столы, упаковочные, сварочные и контрольные установки',
  },
};

const conservativeProductPropertyValues = {
  de: {
    Produkttyp: 'Pneumatische Drehdurchführung für staubige Umgebungen mit Schutzhaube und Labyrinth.',
    Betriebsmedien: 'Luft. Andere Medien erfordern eine schriftliche Kompatibilitätsbestätigung für die Betriebsbedingungen.',
    Dichtung: 'PTFE-Dichtung mit O-Ring.',
    Schutzart: 'Schutzhauben- und Labyrinthkonstruktion für staubige Umgebungen.',
    Montageart: 'Statorseite: 4 × M5, Gewindetiefe 10 mm; Rotorseite: 6 × M5, Gewindetiefe 8 mm. Vor der Bearbeitung vollständige Einbaumaße anhand der mitgelieferten Zeichnung bestätigen.',
  },
  ja: {
    製品種別: '粉じん環境向け保護カバー・ラビリンス構造の空圧ロータリージョイント。',
    使用可能流体: '標準使用流体：空気。その他の流体は、使用条件に対する適合性を書面で確認する必要があります。',
    シール方式: 'PTFEシール＋Oリング。',
    保護等級: '粉じん環境向けの保護カバー・ラビリンス構造。',
    取付方式: '固定側：4 × M5、ねじ深さ10 mm；回転側：6 × M5、ねじ深さ8 mm。加工前に、支給図面で取付寸法全体をご確認ください。',
  },
  ru: {
    'Тип изделия': 'Пневматическое вращающееся соединение с защитным кожухом и лабиринтом для запылённых условий.',
    'Рабочая среда': 'Стандартная рабочая среда: воздух. Для других сред требуется письменное подтверждение совместимости с рабочими условиями.',
    'Тип уплотнения': 'Уплотнение из ПТФЭ с O-кольцом.',
    'Степень защиты': 'Защитный кожух и лабиринт для запылённых условий.',
    'Тип крепления': 'Сторона статора: 4 × M5, глубина резьбы 10 мм; сторона ротора: 6 × M5, глубина резьбы 8 мм. До механической обработки сверьте все монтажные размеры с предоставленным чертежом.',
  },
};

const pageSpecificProductPropertyValues = {
  de: {
    'BP-2P-130-0001.html': {
      Montageart: 'Flanschbefestigung mit zwei Lochkreisen; freigegebene Zeichnung beachten.',
    },
  },
  ja: {
    'BP-2P-130-0001.html': {
      取付方式: '2つのボルト円配置によるフランジ取付；承認図面を参照してください。',
    },
  },
  ru: {
    'BP-2P-130-0001.html': {
      'Тип крепления': 'Фланцевое крепление с двумя окружностями отверстий; см. согласованный чертёж.',
    },
  },
};

const localizedWeightPropertyNames = new Set(['Net weight', 'Weight', 'Gewicht', 'Nettogewicht', '質量', '製品質量', 'Масса', 'Масса нетто']);

function inflectRussianCount(count, singular, paucal, plural) {
  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 14) return plural;
  if (mod10 === 1) return singular;
  if (mod10 >= 2 && mod10 <= 4) return paucal;
  return plural;
}

function localizePassageValue(value, languageCode) {
  return value.replace(/(\d+) inlet\s*\/\s*(\d+) outlet(?:\s*\(([^)]+)\))?/gi, (_, inletText, outletText, detail = '') => {
    const inlet = Number(inletText);
    const outlet = Number(outletText);
    if (languageCode === 'de') {
      const base = `${inlet} ${inlet === 1 ? 'Eingang' : 'Eingänge'} / ${outlet} ${outlet === 1 ? 'Ausgang' : 'Ausgänge'}`;
      const details = detail
        .replace(/single passage/gi, 'einkanalig').replace(/dual passage/gi, 'zweikanalig')
        .replace(/triple passage/gi, 'dreikanalig').replace(/quad passage/gi, 'vierkanalig')
        .replace(/single inlet, six outlets/gi, 'ein Eingang, sechs Ausgänge')
        .replace(/dual inlet, triple outlet/gi, 'zwei Eingänge, drei Ausgänge')
        .replace(/(\d+)mm bore/gi, '$1 mm Durchgang').replace(/8 passages/gi, 'acht Kanäle');
      return details ? `${base} (${details})` : base;
    }
    if (languageCode === 'ja') {
      const base = `${inlet}入力／${outlet}出力`;
      const details = detail
        .replace(/single passage/gi, '1流路').replace(/dual passage/gi, '2流路')
        .replace(/triple passage/gi, '3流路').replace(/quad passage/gi, '4流路')
        .replace(/single inlet, six outlets/gi, '1入力6出力').replace(/dual inlet, triple outlet/gi, '2入力3出力')
        .replace(/(\d+)mm bore/gi, '中空穴径$1 mm').replace(/8 passages/gi, '8流路');
      return details ? `${base}（${details}）` : base;
    }
    const inletWord = inflectRussianCount(inlet, 'вход', 'входа', 'входов');
    const outletWord = inflectRussianCount(outlet, 'выход', 'выхода', 'выходов');
    const base = `${inlet} ${inletWord} / ${outlet} ${outletWord}`;
    const details = detail
      .replace(/single passage/gi, 'одноканальное исполнение').replace(/dual passage/gi, 'двухканальное исполнение')
      .replace(/triple passage/gi, 'трёхканальное исполнение').replace(/quad passage/gi, 'четырёхканальное исполнение')
      .replace(/single inlet, six outlets/gi, 'один вход, шесть выходов').replace(/dual inlet, triple outlet/gi, 'два входа, три выхода')
      .replace(/(\d+)mm bore/gi, 'проходное отверстие $1 мм').replace(/8 passages/gi, 'восемь каналов');
    return details ? `${base} (${details})` : base;
  });
}

function localizeStructuredValue(rawValue, languageCode) {
  let value = localizePassageValue(String(rawValue), languageCode)
    .replaceAll('&Oslash;', 'Ø').replaceAll('&le;', '≤').replaceAll('&ge;', '≥').replaceAll('&middot;', '·');
  const replacements = {
    de: [
      ['Pneumatic-electric rotary joint', 'Pneumatisch-elektrische Drehdurchführung'],
      ['Pneumatic rotary joint', 'Pneumatische Drehdurchführung'], ['air rotary union with slip ring', 'Luft-Drehdurchführung mit Schleifring'],
      ['air rotary union', 'Luft-Drehdurchführung'], ['air swivel', 'Druckluft-Drehgelenk'],
      ['manifold rotary joint', 'Verteiler-Drehdurchführung'], ['dual passage rotary joint', 'Zweikanal-Drehdurchführung'],
      ['dual inlet rotary joint', 'Drehdurchführung mit zwei Eingängen'], ['heavy duty rotary joint', 'Schwerlast-Drehdurchführung'],
      ['dust-proof rotary joint', 'staubgeschützte Drehdurchführung'], ['high pressure rotary union', 'Hochdruck-Drehdurchführung'],
      ['triple passage rotary joint', 'Dreikanal-Drehdurchführung'], ['hollow bore rotary joint', 'Drehdurchführung mit Durchgangsbohrung'],
      ['multi-channel rotary joint', 'Mehrkanal-Drehdurchführung'],
      ['Air, water, water-soluble coolant, light hydraulic oil', 'Luft, Wasser, wassermischbares Kühlmittel, leichtes Hydrauliköl'],
      ['Air, water, coolant, light hydraulic oil', 'Luft, Wasser, Kühlmittel, leichtes Hydrauliköl'],
      ['Air, water, oil, coolant, light hydraulic oil', 'Luft, Wasser, Öl, Kühlmittel, leichtes Hydrauliköl'],
      ['Air, water, coolant, hydraulic oil', 'Luft, Wasser, Kühlmittel, Hydrauliköl'],
      ['ISO VG 32 max', 'max. ISO VG 32'], ['45# Steel', 'Stahl 45#'],
      ['AL6061 Aluminum Alloy, anodized', 'Aluminiumlegierung AL6061, eloxiert'],
      ['AL6061 aluminum alloy, anodized', 'Aluminiumlegierung AL6061, eloxiert'],
      ['AL6061 aluminum alloy', 'Aluminiumlegierung AL6061'], ['Aluminum Alloy 6061', 'Aluminiumlegierung 6061'],
      ['PTFE composite seal with FKM O-ring backup', 'PTFE-Verbunddichtung mit zusätzlichem FKM-O-Ring'],
      ['PTFE composite seal with FKM O-ring', 'PTFE-Verbunddichtung mit FKM-O-Ring'],
      ['PTFE (Teflon) composite seal with FKM O-ring backup', 'PTFE-Verbunddichtung mit zusätzlichem FKM-O-Ring'],
      ['PTFE (Teflon) Composite Seal', 'PTFE-Verbunddichtung'], ['PTFE composite seal', 'PTFE-Verbunddichtung'],
      ['PTFE + Graphite Composite / PEEK', 'PTFE-Graphit-Verbund / PEEK'],
      ['PTFE Composite + Si3N4 Ceramic Seal', 'PTFE-Verbund- und Si3N4-Keramikdichtung'],
      ['Deep Groove Ball Bearing', 'Rillenkugellager'], ['Deep groove ball bearing', 'Rillenkugellager'],
      ['Threaded mount', 'Gewindemontage'], ['threaded mount', 'Gewindemontage'], ['Flange mount', 'Flanschmontage'],
      ['G1/8 threaded', 'G1/8-Gewinde'], ['BSP parallel', 'BSPP (zylindrisch)'], [' or ', ' oder '],
      ['mounting holes', 'Befestigungsbohrungen'], ['bolt pattern', 'Lochkreis'], ['rotor /', 'Rotor /'], ['stator', 'Stator'],
      [' with ', ' mit '], [' per ISO ', ' nach ISO '], [' rotor ', ' Rotor-'],
      ['rotating side', 'Rotorseite'], ['fixed side', 'Statorseite'], ['through-hole', 'Durchgangsbohrung'],
      ['dust-proof structure', 'staubgeschützte Ausführung'], ['hollow bore', 'Durchgangsbohrung'],
      ['PTFE-Verbund + Si3N4 Ceramic Seal', 'PTFE-Verbund- und Si3N4-Keramikdichtung'],
      ['Gold-plated copper alloy', 'Vergoldete Kupferlegierung'], ['circuits', 'Stromkreise'], ['per circuit', 'je Stromkreis'],
      ['2A max', 'max. 2 A'], ['<=500 MOhm', '≤500 MΩ'], ['at 500V DC', 'bei 500 V DC'],
      ['Anodized (Aluminum)', 'Eloxiert (Aluminium)'], ['Diameter', 'Durchmesser'],
      ['hours (rated conditions)', 'Stunden (unter Nennbedingungen)'], ['rated conditions', 'Nennbedingungen'],
      ['Confirmed by model-specific inspection plan', 'Nach modellbezogenem Prüfplan zu bestätigen'],
      ['Approx.', 'ca.'], ['Months', 'Monate'], ['months', 'Monate'], ['Heavy duty', 'Schwerlastausführung'], ['distribution', 'Verteilung'],
    ],
    ja: [
      ['Pneumatic-electric rotary joint', '空圧・電気複合ロータリージョイント'],
      ['Pneumatic rotary joint', '空圧用ロータリージョイント'], ['air rotary union with slip ring', 'スリップリング一体型エアロータリーユニオン'],
      ['air rotary union', 'エアロータリーユニオン'], ['air swivel', 'エアスイベル'],
      ['manifold rotary joint', '分配型ロータリージョイント'], ['dual passage rotary joint', '2流路ロータリージョイント'],
      ['dual inlet rotary joint', '2入力ロータリージョイント'], ['heavy duty rotary joint', '高荷重用ロータリージョイント'],
      ['dust-proof rotary joint', '防じんロータリージョイント'], ['high pressure rotary union', '高圧用ロータリーユニオン'],
      ['triple passage rotary joint', '3流路ロータリージョイント'], ['hollow bore rotary joint', '中空穴付きロータリージョイント'],
      ['multi-channel rotary joint', '多流路・多ポートロータリージョイント'],
      ['Air, water, water-soluble coolant, light hydraulic oil', '空気、水、水溶性クーラント、低粘度作動油'],
      ['Air, water, coolant, light hydraulic oil', '空気、水、クーラント、低粘度作動油'],
      ['Air, water, oil, coolant, light hydraulic oil', '空気、水、油、クーラント、低粘度作動油'],
      ['Air, water, coolant, hydraulic oil', '空気、水、クーラント、作動油'],
      ['ISO VG 32 max', 'ISO VG 32以下'], ['45# Steel', '45#鋼'],
      ['AL6061 Aluminum Alloy, anodized', 'AL6061アルミニウム合金（アルマイト処理）'],
      ['AL6061 aluminum alloy, anodized', 'AL6061アルミニウム合金（アルマイト処理）'],
      ['AL6061 aluminum alloy', 'AL6061アルミニウム合金'], ['Aluminum Alloy 6061', '6061アルミニウム合金'],
      ['PTFE composite seal with FKM O-ring backup', 'PTFE複合シール＋FKM Oリング'],
      ['PTFE composite seal with FKM O-ring', 'PTFE複合シール＋FKM Oリング'],
      ['PTFE (Teflon) composite seal with FKM O-ring backup', 'PTFE複合シール＋FKM Oリング'],
      ['PTFE (Teflon) Composite Seal', 'PTFE複合シール'], ['PTFE composite seal', 'PTFE複合シール'],
      ['PTFE + Graphite Composite / PEEK', 'PTFE・グラファイト複合材／PEEK'],
      ['PTFE Composite + Si3N4 Ceramic Seal', 'PTFE複合シール＋Si3N4セラミックシール'],
      ['Deep Groove Ball Bearing', '深溝玉軸受'], ['Deep groove ball bearing', '深溝玉軸受'],
      ['Threaded mount', 'ねじ取付'], ['threaded mount', 'ねじ取付'], ['Flange mount', 'フランジ取付'],
      ['G1/8 threaded', 'G1/8ねじ取付'], ['BSP parallel', 'BSPP平行ねじ'], [' or ', 'または'],
      ['mounting holes', '取付穴'], ['bolt pattern', 'ボルト穴配置'], ['rotor /', '回転側／'], ['stator', '固定側'],
      [' with ', '、'], [' per ISO ', '、ISO '], [' rotor ', ' 回転側'],
      ['rotating side', '回転側'], ['fixed side', '固定側'], ['through-hole', '貫通穴'],
      ['dust-proof structure', '防じん構造'], ['hollow bore', '中空穴'],
      ['Gold-plated copper alloy', '金めっき銅合金'], ['circuits', '回路'], ['per circuit', '各回路'],
      ['2A max', '最大2 A'], ['<=500 MOhm', '500 MΩ以下'], ['at 500V DC', 'DC 500 V印加時'],
      ['Anodized (Aluminum)', 'アルマイト処理（アルミニウム）'], ['Diameter', '外径'],
      ['hours (rated conditions)', '時間（定格条件）'], ['rated conditions', '定格条件'],
      ['Confirmed by model-specific inspection plan', '型式ごとの検査計画で確認'],
      ['Approx.', '約'], ['Months', 'か月'], ['months', 'か月'], ['Heavy duty', '高荷重仕様'], ['distribution', '分配'],
    ],
    ru: [
      ['Pneumatic-electric rotary joint', 'Пневмоэлектрическое вращающееся соединение'],
      ['Pneumatic rotary joint', 'Пневматическое вращающееся соединение'], ['air rotary union with slip ring', 'вращающееся пневмосоединение с контактным кольцом'],
      ['air rotary union', 'вращающееся пневмосоединение'], ['air swivel', 'поворотное пневмосоединение'],
      ['manifold rotary joint', 'вращающийся распределительный коллектор'], ['dual passage rotary joint', 'двухканальное вращающееся соединение'],
      ['dual inlet rotary joint', 'вращающееся соединение с двумя входами'], ['heavy duty rotary joint', 'вращающееся соединение для тяжёлых условий'],
      ['dust-proof rotary joint', 'пылезащищённое вращающееся соединение'], ['high pressure rotary union', 'вращающееся соединение высокого давления'],
      ['triple passage rotary joint', 'трёхканальное вращающееся соединение'], ['hollow bore rotary joint', 'вращающееся соединение со сквозным отверстием'],
      ['multi-channel rotary joint', 'многоканальный вращающийся коллектор'],
      ['Air, water, water-soluble coolant, light hydraulic oil', 'Воздух, вода, водорастворимая СОЖ, маловязкое гидравлическое масло'],
      ['Air, water, coolant, light hydraulic oil', 'Воздух, вода, СОЖ, маловязкое гидравлическое масло'],
      ['Air, water, oil, coolant, light hydraulic oil', 'Воздух, вода, масло, СОЖ, маловязкое гидравлическое масло'],
      ['Air, water, coolant, hydraulic oil', 'Воздух, вода, СОЖ, гидравлическое масло'],
      ['ISO VG 32 max', 'не выше ISO VG 32'], ['45# Steel', 'Сталь 45#'],
      ['AL6061 Aluminum Alloy, anodized', 'Алюминиевый сплав AL6061, анодированный'],
      ['AL6061 aluminum alloy, anodized', 'Алюминиевый сплав AL6061, анодированный'],
      ['AL6061 aluminum alloy', 'Алюминиевый сплав AL6061'], ['Aluminum Alloy 6061', 'Алюминиевый сплав 6061'],
      ['PTFE composite seal with FKM O-ring backup', 'Композитное уплотнение из ПТФЭ с дополнительным кольцом FKM'],
      ['PTFE composite seal with FKM O-ring', 'Композитное уплотнение из ПТФЭ с кольцом FKM'],
      ['PTFE (Teflon) composite seal with FKM O-ring backup', 'Композитное уплотнение из ПТФЭ с дополнительным кольцом FKM'],
      ['PTFE (Teflon) Composite Seal', 'Композитное уплотнение из ПТФЭ'], ['PTFE composite seal', 'Композитное уплотнение из ПТФЭ'],
      ['PTFE + Graphite Composite / PEEK', 'Композит ПТФЭ с графитом / PEEK'],
      ['PTFE Composite + Si3N4 Ceramic Seal', 'Композитное уплотнение из ПТФЭ и керамическое уплотнение Si3N4'],
      ['Deep Groove Ball Bearing', 'Радиальный шариковый подшипник'], ['Deep groove ball bearing', 'Радиальный шариковый подшипник'],
      ['Threaded mount', 'Резьбовое крепление'], ['threaded mount', 'резьбовое крепление'], ['Flange mount', 'Фланцевое крепление'],
      ['G1/8 threaded', 'Резьбовое крепление G1/8'], ['BSP parallel', 'цилиндрическая резьба BSPP'], [' or ', ' или '],
      ['mounting holes', 'крепёжными отверстиями'], ['bolt pattern', 'схема крепёжных отверстий'], ['rotor /', 'ротор /'], ['stator', 'статор'],
      [' with ', ' с '], [' per ISO ', ' по ISO '], [' rotor ', ' со стороны ротора '],
      ['rotating side', 'со стороны ротора'], ['fixed side', 'со стороны статора'], ['through-hole', 'сквозное отверстие'],
      ['dust-proof structure', 'пылезащищённая конструкция'], ['hollow bore', 'сквозное отверстие'],
      ['Gold-plated copper alloy', 'Позолоченный медный сплав'], ['circuits', 'цепей'], ['per circuit', 'на цепь'],
      ['2A max', 'макс. 2 А'], ['<=500 MOhm', '≤500 МОм'], ['at 500V DC', 'при 500 В пост. тока'],
      ['Anodized (Aluminum)', 'Анодирование (алюминий)'], ['Diameter', 'Диаметр'],
      ['hours (rated conditions)', 'часов (при номинальных условиях)'], ['rated conditions', 'номинальные условия'],
      ['Confirmed by model-specific inspection plan', 'Подтверждается планом контроля для модели'],
      ['Approx.', 'Около'], ['Months', 'месяцев'], ['months', 'месяцев'], ['Heavy duty', 'Для тяжёлых условий'], ['distribution', 'распределение'],
    ],
  };
  for (const [from, to] of replacements[languageCode] || []) value = value.replaceAll(from, to);
  if (languageCode === 'de') {
    value = value
      .replaceAll('BSPP (zylindrisch) (BSPP)', 'BSPP (zylindrisch)')
      .replace(/\b(\d+)\.(\d+)\b/g, '$1,$2')
      .replace(/\b(\d+),(\d{3})\b/g, '$1.$2')
      .replace(/Ø(\d+)mm/g, 'Ø$1 mm')
      .replace(/\b(\d+(?:,\d+)?) x (\d+(?:,\d+)?)\b/g, '$1 × $2');
  } else if (languageCode === 'ja') {
    value = value
      .replaceAll('BSPP平行ねじ (BSPP)', 'BSPP平行ねじ')
      .replaceAll(' (', '（').replaceAll(')', '）')
      .replaceAll(', ', '、').replaceAll(' / ', '／')
      .replace(/Ø(\d+)mm/g, 'Ø$1 mm');
  } else if (languageCode === 'ru') {
    value = value
      .replaceAll('цилиндрическая резьба BSPP (BSPP)', 'цилиндрическая резьба BSPP')
      .replace(/\b(\d+),(\d{3})\b/g, '$1 $2')
      .replace(/\b(\d+)\.(\d+)\b/g, '$1,$2')
      .replace(/\bbar\b/g, 'бар').replace(/\bkg\b/g, 'кг').replace(/\bmm\b/g, 'мм')
      .replace(/Ø(\d+)мм/g, 'Ø$1 мм');
  }
  return value.replace(/\s+/g, ' ').trim();
}

function localizeProductProperty(property, languageCode, pageName) {
  if (!property || typeof property !== 'object') return;
  const nameMap = structuredPropertyNames[languageCode] || {};
  const warranty = structuredWarrantyTerms[languageCode];
  if (property.name === 'Warranty terms' && warranty) {
    property.name = warranty.name;
    property.value = warranty.value;
    return;
  }
  const isApplications = property.name === 'Typical applications'
    || ['Typische Anwendungen', '主な用途', 'Типичные области применения'].includes(property.name);
  if (nameMap[property.name]) property.name = nameMap[property.name];
  const conservativeValue = pageName === 'BP-2P-50-0001.html'
    ? conservativeProductPropertyValues[languageCode]?.[property.name]
    : undefined;
  if (conservativeValue) {
    property.value = conservativeValue;
    return;
  }
  const pageSpecificValue = pageSpecificProductPropertyValues[languageCode]?.[pageName]?.[property.name];
  if (pageSpecificValue) {
    property.value = pageSpecificValue;
    return;
  }
  if (isApplications && structuredApplicationValues[languageCode]?.[pageName]) {
    property.value = structuredApplicationValues[languageCode][pageName];
  } else if (property.value !== undefined && property.value !== null) {
    property.value = localizeStructuredValue(property.value, languageCode);
  }
}

function normalizeOrganizationIdentity(value, schemaLocale = {}, seo = {}, site = {}) {
  value['@id'] = canonicalOrganizationId;
  value.url = `${config.siteUrl}/`;
  value.name = canonicalBrandName;
  value.legalName = canonicalLegalName;
  value.foundingDate = canonicalFoundingDate;
  delete value.alternateName;
  value.sameAs = canonicalBrandSameAs;
  const localizedDescription = site.organizationDescription || site.description || seo.description;
  if (value.description && localizedDescription) value.description = localizedDescription;
  if (value.slogan && schemaLocale.slogan) value.slogan = schemaLocale.slogan;
  if (value.founder) {
    const normalizeFounder = (founder) => {
      const { description: _removedFounderDescription, ...founderWithoutDescription } = founder;
      return {
        ...founderWithoutDescription,
        '@type': 'Person',
        '@id': canonicalFounderId,
        ...(schemaLocale.founderJobTitle ? { jobTitle: schemaLocale.founderJobTitle } : {}),
        sameAs: canonicalFounderSameAs,
      };
    };
    value.founder = Array.isArray(value.founder)
      ? value.founder.map(normalizeFounder)
      : normalizeFounder(value.founder);
  }
  if (schemaLocale.knowsAbout) value.knowsAbout = schemaLocale.knowsAbout;
}

function normalizeLocalBusinessIdentity(value) {
  // Preserve source-owned location and contact properties. Only identity and
  // entity-link fields are canonicalized here.
  value['@id'] = canonicalLocalBusinessId;
  value.url = `${config.siteUrl}/`;
  value.name = canonicalBrandName;
  value.legalName = canonicalLegalName;
  delete value.alternateName;
  value.sameAs = canonicalBrandSameAs;
  value.parentOrganization = { '@id': canonicalOrganizationId };
}

function normalizeEntityIdentities(value, schemaLocale = {}, seo = {}, site = {}) {
  if (Array.isArray(value)) return value.map((item) => normalizeEntityIdentities(item, schemaLocale, seo, site));
  if (!value || typeof value !== 'object') return value;
  for (const [key, child] of Object.entries(value)) {
    value[key] = normalizeEntityIdentities(child, schemaLocale, seo, site);
  }
  const types = schemaTypes(value);
  if (types.has('Organization')) normalizeOrganizationIdentity(value, schemaLocale, seo, site);
  if (types.has('LocalBusiness')) normalizeLocalBusinessIdentity(value);
  return value;
}

function normalizeEntityIdentitiesInMarkup(html) {
  return html.replace(
    /(<script\b[^>]*type=["']application\/ld\+json["'][^>]*>)([\s\S]*?)(<\/script>)/gi,
    (match, opening, json, closing) => {
      try {
        const payload = JSON.parse(json);
        return `${opening}${JSON.stringify(normalizeEntityIdentities(payload))}${closing}`;
      } catch {
        return match;
      }
    },
  );
}

function updateJsonLd($, languageCode, pageName, strict = false) {
  const englishUrl = pageUrl(config.sourceLanguage.code, pageName);
  const localizedUrl = pageUrl(languageCode, pageName);
  const seo = seoByLanguage.get(languageCode)?.[pageName];
  const site = seoByLanguage.get(languageCode)?._site || {};
  const schemaLocale = schemaLocaleByLanguage[languageCode] || {};
  const faqEntities = visibleFaqEntities($);
  const applicationBreadcrumbLabels = {
    de: 'Anwendungen',
    ja: '用途別情報',
    ru: 'Применение',
  };
  const contentTypes = new Set(['Article', 'Blog', 'BlogPosting', 'TechArticle', 'WebPage', 'WebSite', 'Product', 'FAQPage', 'HowTo', 'CollectionPage']);
  const localizedCollectionAbout = {
    de: [
      'Drehdurchführungen für Druckluft',
      'Pneumatische Drehdurchführungen',
      'Industrieautomation',
      'Verpackungsmaschinen',
      'Pneumatische Spanntechnik',
      'Roboter-Endeffektoren',
      'Vakuumverpackungsmaschinen',
      'Druckluftwerkzeuge',
      'Hintere Spannfutter von Laser-Rohrschneidmaschinen',
    ],
    ja: [
      '空圧用ロータリジョイント',
      '空圧式ロータリジョイント',
      '産業オートメーション',
      '包装機械',
      '空圧式クランプ',
      'ロボットエンドエフェクタ',
      '真空包装機',
      '空圧工具',
      'レーザー切管機の後方チャック',
    ],
    ru: [
      'Пневматические ротационные соединения',
      'Поворотные соединения для сжатого воздуха',
      'Промышленная автоматизация',
      'Упаковочное оборудование',
      'Пневматический зажим',
      'Концевые органы роботов',
      'Вакуумные упаковочные машины',
      'Пневматический инструмент',
      'Задние патроны станков лазерной резки труб',
    ],
  };
  const bottleCappingCreativeWork = {
    de: {
      name: 'BP-2P-16-0001 in einer Kunden-Produktionsmaschine zum Verschließen von Flaschen',
      description: 'Ein vom Kunden freigegebener Produktionsnachweis bestätigt zwei getrennte Druckluftkanäle, über die ein pneumatischer 3-Finger-Zentrischgreifer Druckluft zum Schließen und Öffnen erhält. Der Greifer hält und dreht den Flaschenverschluss. Die Identität des Kunden wird nicht genannt; Anschlussbelegung, Betriebsbedingungen und Maschinenschnittstelle bleiben anlagenspezifisch.',
    },
    ja: {
      name: 'お客様のボトルキャッピング生産設備に組み込まれたBP-2P-16-0001',
      description: 'お客様から公開許可を得た生産実績として、独立した2流路を介して、ボトルキャップを把持・回転させる3爪エアチャックに把持・開放用圧縮空気を供給することを確認しています。お客様名は非公開で、ポート機能、使用条件、装置取合いは実機ごとの確認が必要です。',
    },
    ru: {
      name: 'BP-2P-16-0001 на производственной укупорочной машине заказчика',
      description: 'Разрешённая заказчиком к публикации производственная фотография подтверждает подачу сжатого воздуха по двум независимым каналам для зажима и разжима трёхкулачкового пневматического захвата, который удерживает и вращает крышку. Название заказчика не раскрывается; назначение портов, рабочие условия и интерфейс машины зависят от конкретной установки.',
    },
  };
  const bottleCappingAlternativeCreativeWork = {
    de: {
      name: 'Eignung der BP-2P-08-0001 für einen pneumatischen 3-Finger-Zentrischgreifer für Flaschenverschlüsse',
      description: 'Der Projektinhaber bestätigt, dass BP-2P-08-0001 für diese Zweikanal-Druckluftanwendung beim Verschließen von Flaschen ausgewählt werden kann. Das vom Kunden freigegebene Produktionsfoto zeigt BP-2P-16-0001 und nicht BP-2P-08-0001. Kanalzahl, Einbauschnittstelle, Druck, Drehzahl, Abmessungen und freigegebene Zeichnung sind anwendungsspezifisch zu bestätigen.',
    },
    ja: {
      name: 'ボトルキャップ用3爪エアチャックに対するBP-2P-08-0001の適用範囲',
      description: 'Begapunkは、BP-2P-08-0001をこの2流路の圧縮空気式キャッピング用途で選定できることを確認しています。ただし、お客様から公開許可を得た生産設備の写真で確認されている製品はBP-2P-16-0001であり、BP-2P-08-0001ではありません。流路数、取付インターフェース、圧力、回転数、寸法、承認図面は用途ごとに確認が必要です。',
    },
    ru: {
      name: 'Применимость BP-2P-08-0001 для трёхкулачкового пневматического захвата крышек',
      description: 'Begapunk подтверждает, что BP-2P-08-0001 можно выбрать для укупорочной установки с двумя независимыми каналами подачи сжатого воздуха. На разрешённой заказчиком производственной фотографии идентифицирована BP-2P-16-0001, а не BP-2P-08-0001. Число каналов, монтажный интерфейс, давление, частоту вращения, размеры и утверждённый чертёж необходимо подтвердить для конкретного применения.',
    },
  };
  const cncSawFixtureCreativeWork = {
    de: {
      name: 'BP-2P-130-0001 in einer kundenspezifischen CNC-Spannvorrichtung einer Kreissägemaschine',
      description: 'Ein vom Kunden freigegebener Produktionsnachweis bestätigt BP-2P-130-0001 an der Rückseite einer kundenspezifischen CNC-Spannvorrichtung einer Kreissägemaschine. Zwei getrennte Druckluftkanäle übernehmen das Spannen und Lösen. Für vergleichbare Anwendungen sind Anschlussbelegung, Druck, Drehzahl, Betriebszyklus und Einbauschnittstelle anhand der Vorrichtungszeichnung und freigegebener Produktdaten technisch abzustimmen.',
    },
    ja: {
      name: 'CNC丸鋸盤用特注クランプ治具に組み込まれたBP-2P-130-0001',
      description: 'お客様から公開許可を得た生産設備の映像により、CNC丸鋸盤用特注クランプ治具の後端に組み込まれたBP-2P-130-0001を確認しています。独立した2つの圧縮空気流路でクランプ／アンクランプを行います。同様の設備では、治具図面と承認済み製品データに基づき、ポート配置、圧力、回転数、運転サイクル、取合いを確認します。',
    },
    ru: {
      name: 'BP-2P-130-0001 в нестандартном зажимном приспособлении круглопильного станка с ЧПУ',
      description: 'Разрешённое заказчиком производственное подтверждение показывает BP-2P-130-0001 в задней части нестандартного зажимного приспособления круглопильного станка с ЧПУ. Два независимых канала сжатого воздуха используются для зажима и разжима. Для аналогичного оборудования назначение портов, давление, частота вращения, режим работы и монтажное сопряжение согласуются по чертежу приспособления и утверждённым данным изделия.',
    },
  };
  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      const data = JSON.parse($(element).html());
      const pruneHiddenFaq = (value) => {
        if (Array.isArray(value)) return value.map(pruneHiddenFaq).filter((item) => item !== null);
        if (!value || typeof value !== 'object') return value;
        if (schemaTypes(value).has('FAQPage') && !faqEntities.length) return null;
        for (const [key, child] of Object.entries(value)) value[key] = pruneHiddenFaq(child);
        return value;
      };
      const visit = (value) => {
        if (Array.isArray(value)) return value.map(visit);
        if (!value || typeof value !== 'object') return value === englishUrl ? localizedUrl : value;
        for (const [key, child] of Object.entries(value)) value[key] = visit(child);
        const types = schemaTypes(value);
        if ([...types].some((type) => contentTypes.has(type))) value.inLanguage = languageCode;
        if (types.has('CreativeWork') && String(value['@id'] || '').endsWith('#bottle-capping-production-application')) {
          const localizedCreativeWork = bottleCappingCreativeWork[languageCode];
          if (!localizedCreativeWork) throw new Error(`Missing bottle-capping CreativeWork localization for ${languageCode}.`);
          value['@id'] = `${localizedUrl}#bottle-capping-production-application`;
          value.url = `${localizedUrl}#panel-compat`;
          value.name = localizedCreativeWork.name;
          value.description = localizedCreativeWork.description;
          value.inLanguage = languageCode;
        }
        if (types.has('CreativeWork') && String(value['@id'] || '').endsWith('#bottle-capping-application-fit')) {
          const localizedCreativeWork = bottleCappingAlternativeCreativeWork[languageCode];
          if (!localizedCreativeWork) throw new Error(`Missing alternative bottle-capping CreativeWork localization for ${languageCode}.`);
          value['@id'] = `${localizedUrl}#bottle-capping-application-fit`;
          value.url = `${localizedUrl}#panel-compat`;
          value.name = localizedCreativeWork.name;
          value.description = localizedCreativeWork.description;
          value.inLanguage = languageCode;
        }
        if (types.has('CreativeWork') && String(value['@id'] || '').endsWith('#bp-2p-130-cnc-saw-fixture-evidence')) {
          const localizedCreativeWork = cncSawFixtureCreativeWork[languageCode];
          if (!localizedCreativeWork) throw new Error(`Missing CNC saw-fixture CreativeWork localization for ${languageCode}.`);
          const localizedApplicationUrl = pageUrl(languageCode, 'application-cnc-pneumatic-clamping.html');
          value['@id'] = `${localizedApplicationUrl}#bp-2p-130-cnc-saw-fixture-evidence`;
          value.url = `${localizedApplicationUrl}#verified-bp-2p-130-cnc-saw-fixture`;
          value.name = localizedCreativeWork.name;
          value.description = localizedCreativeWork.description;
          value.image = `${config.siteUrl}/images/applications/cnc-pneumatic-clamping/bp-2p-130-custom-cnc-circular-saw-fixture-rear-view.jpg`;
          value.inLanguage = languageCode;
        }
        if (types.has('Blog')) {
          value['@id'] = `${localizedUrl}#blog`;
          value.name = seo.h1;
          value.url = localizedUrl;
          value.description = seo.description;
        }
        let linkedBlogPostPage = null;
        if (types.has('BlogPosting') && pageName === 'blog.html' && typeof value.url === 'string') {
          try {
            const postUrl = new URL(value.url);
            const siteOrigin = new URL(config.siteUrl).origin;
            const candidate = postUrl.pathname.split('/').filter(Boolean).at(-1);
            if (postUrl.origin === siteOrigin && candidate?.startsWith('blog-') && configuredPages.has(candidate)) {
              linkedBlogPostPage = candidate;
            }
          } catch {
            // Leave malformed BlogPosting URLs for the localized-site validator to report.
          }
          if (!linkedBlogPostPage) throw new Error(`${languageCode}/blog.html: BlogPosting URL does not resolve to a configured article page.`);
          const linkedSeo = seoByLanguage.get(languageCode)?.[linkedBlogPostPage];
          if (!linkedSeo?.h1 || !linkedSeo?.description) {
            throw new Error(`${languageCode}/${linkedBlogPostPage}: curated BlogPosting SEO is incomplete.`);
          }
          value.headline = linkedSeo.h1;
          value.description = linkedSeo.description;
          value.url = pageUrl(languageCode, linkedBlogPostPage);
          value.inLanguage = languageCode;
        }
        if (types.has('Product')) {
          value.name = seo.h1;
          value.description = seo.description;
          if (Array.isArray(value.additionalProperty)) {
            if (pageName === 'BP-2P-50-0001.html') {
              value.additionalProperty = value.additionalProperty.filter(
                (property) => !localizedWeightPropertyNames.has(property?.name),
              );
            }
            for (const property of value.additionalProperty) localizeProductProperty(property, languageCode, pageName);
          }
        }
        if (types.has('WebPage')) {
          value.name = seo.title;
          value.description = seo.description;
        }
        if (types.has('CollectionPage')) {
          value.name = seo.h1;
          value.description = seo.description;
          value.url = localizedUrl;
          if (localizedCollectionAbout[languageCode]) value.about = localizedCollectionAbout[languageCode];
        }
        if ((types.has('Article') || types.has('BlogPosting') || types.has('TechArticle')) && !linkedBlogPostPage) {
          value.headline = seo.h1;
          value.description = seo.description;
        }
        if (types.has('WebSite')) {
          value.name = site.heading || 'Begapunk';
          value.description = site.description || seo.description;
        }
        if (types.has('Organization')) {
          normalizeOrganizationIdentity(value, schemaLocale, seo, site);
        }
        if (types.has('LocalBusiness')) normalizeLocalBusinessIdentity(value);
        if (types.has('BreadcrumbList') && Array.isArray(value.itemListElement) && value.itemListElement.length) {
          for (const item of value.itemListElement) {
            if (!item || typeof item !== 'object' || typeof item.item !== 'string') continue;
            try {
              const itemUrl = new URL(item.item);
              if (itemUrl.origin !== new URL(config.siteUrl).origin) continue;
              const itemPage = itemUrl.pathname.split('/').filter(Boolean).at(-1) || 'index.html';
              if (config.pages.includes(itemPage)) {
                item.item = pageUrl(languageCode, itemPage);
                if (item?.position === 2 && itemPage === 'applications.html') {
                  item.name = applicationBreadcrumbLabels[languageCode] || item.name;
                }
              }
            } catch {
              // Keep malformed or non-URL breadcrumb values for the validator to report.
            }
          }
          const current = value.itemListElement[value.itemListElement.length - 1];
          if (current && typeof current === 'object') {
            current.name = seo.h1;
            current.item = localizedUrl;
          }
        }
        if (types.has('FAQPage') && faqEntities.length) value.mainEntity = faqEntities;
        return value;
      };
      const localized = visit(pruneHiddenFaq(data));
      if (localized === null) {
        $(element).remove();
        return;
      }
      $(element).text(JSON.stringify(localized));
    } catch (error) {
      if (strict) {
        throw new Error(`${languageCode}/${pageName}: JSON-LD localization failed: ${error.message}`, { cause: error });
      }
      // Existing JSON-LD validity is handled by the release verifier in non-strict maintenance modes.
    }
  });
}

function injectAlternateLinks($, currentLanguage, pageName) {
  $('link[rel="alternate"][hreflang]').remove();
  const canonical = $('link[rel="canonical"]').first();
  const links = [config.sourceLanguage, ...activeLanguages]
    .map((language) => `<link rel="alternate" hreflang="${language.code}" href="${pageUrl(language.code, pageName)}">`)
    .concat(`<link rel="alternate" hreflang="x-default" href="${pageUrl(config.sourceLanguage.code, pageName)}">`)
    .join('\n');
  canonical.before(`${links}\n`);
  canonical.attr('href', pageUrl(currentLanguage, pageName));
}

function injectLanguageSwitcher($, currentLanguage, pageName) {
  $('.i18n-switcher').remove();
  const languages = [config.sourceLanguage, ...activeLanguages];
  const options = languages.map((language) => {
    const selected = language.code === currentLanguage ? ' selected' : '';
    return `<option value="${switcherReference(currentLanguage, language.code, pageName)}"${selected}>${language.label}</option>`;
  }).join('');
  const accessibleLabel = languageSwitcherLabels[currentLanguage] || languageSwitcherLabels.en;
  const switcher = `<div class="i18n-switcher" data-no-translate><label class="sr-only" for="language-${currentLanguage}">${accessibleLabel}</label><select id="language-${currentLanguage}" aria-label="${accessibleLabel}" onchange="if(this.value)window.location.href=this.value">${options}</select></div>`;
  const mobileToggle = $('.mobile-toggle').first();
  if (mobileToggle.length) mobileToggle.before(switcher);
  else $('.header-inner').first().append(switcher);
}

function applyTranslations(page, language, catalog, cache) {
  const { $, records, pageName } = page;
  const idBySource = new Map(catalog.entries.map((entry) => [entry.source, entry.id]));
  const overrides = overridesByLanguage.get(language.code) || {};
  const editorialOverrides = editorialOverridesByLanguage.get(language.code) || {};
  const sharedEditorialOverrides = editorialOverrides['*'] || {};
  const pageEditorialOverrides = editorialOverrides[pageName] || {};
  const preservedBrowserContent = (config.browserNoTranslateSelectors || []).map((selector) => ({
    selector,
    values: $(selector).map((_, element) => $(element).html()).get(),
  }));
  for (const record of records) {
    const id = idBySource.get(record.source);
    const translated = resolveTranslation({
      id,
      source: record.source,
      pageEditorialOverrides,
      sharedEditorialOverrides,
      overrides,
      cache,
    });
    if (!translated) throw new Error(`${language.code}/${pageName}: missing translation for ${record.source}`);
    if (record.type === 'html') {
      $(record.element).html(translated);
    } else if (record.type === 'text') {
      const leading = record.original.match(/^\s*/)?.[0] || '';
      const trailing = record.original.match(/\s*$/)?.[0] || '';
      record.node.data = `${leading}${translated}${trailing}`;
    } else {
      $(record.element).attr(record.attribute, translated);
    }
  }

  for (const { selector, values } of preservedBrowserContent) {
    $(selector).each((index, element) => {
      if (values[index] !== undefined) $(element).html(values[index]);
      $(element).attr('translate', 'no').addClass('notranslate');
    });
  }

  applySeoMetadata($, language.code, pageName);

  $('html').attr('lang', language.code);
  const localizedUrl = pageUrl(language.code, pageName);
  injectAlternateLinks($, language.code, pageName);
  injectLanguageSwitcher($, language.code, pageName);
  $('meta[property="og:url"]').attr('content', localizedUrl);
  if (!$('meta[property="og:url"]').length) $('head').append(`<meta property="og:url" content="${localizedUrl}">`);
  $('meta[property="og:locale"]').attr('content', language.locale);
  if (!$('meta[property="og:locale"]').length) $('head').append(`<meta property="og:locale" content="${language.locale}">`);

  const pilotPages = new Set(config.pages);
  $('[href], [src], [poster], [action]').each((_, element) => {
    for (const attribute of ['href', 'src', 'poster', 'action']) {
      const value = $(element).attr(attribute);
      if (value) $(element).attr(attribute, localizeRelativeReference(value, pilotPages));
    }
  });
  $('[srcset]').each((_, element) => {
    const localized = ($(element).attr('srcset') || '').split(',').map((candidate) => {
      const parts = candidate.trim().split(/\s+/);
      parts[0] = localizeRelativeReference(parts[0], pilotPages);
      return parts.join(' ');
    }).join(', ');
    $(element).attr('srcset', localized);
  });

  $('input[name="redirect"][value]').each((_, element) => {
    const value = $(element).attr('value');
    try {
      const redirectUrl = new URL(value);
      const redirectPage = redirectUrl.pathname.split('/').filter(Boolean).at(-1) || 'index.html';
      if (redirectUrl.origin === new URL(config.siteUrl).origin && pilotPages.has(redirectPage)) {
        $(element).attr('value', pageUrl(language.code, redirectPage));
      }
    } catch {
      // Leave non-URL form values unchanged.
    }
  });

  $('form input[name="source_language"]').remove();
  $('form#quoteForm, form[action*="send_inquiry.php"]').each((_, form) => {
    $(form).prepend(`<input type="hidden" name="source_language" value="${language.code}">`);
  });
  applyContactRfqCopy($, language.code, pageName);
  let localized = $.html().replace(/[ \t]+$/gm, '');
  if (language.code === 'ja') localized = normalizeJapaneseOutput(localized);
  if (language.code === 'de') localized = normalizeGermanOutput(localized);
  if (language.code === 'ru') localized = normalizeRussianOutput(localized);
  const finalized = load(localized, { decodeEntities: false });
  applyProductDetailUiCopy(finalized, language.code, pageName);
  applySeoMetadata(finalized, language.code, pageName);
  updateJsonLd(finalized, language.code, pageName, true);
  return patchDiscoveryRobotsMeta(
    finalized.html().replace(/[ \t]+$/gm, ''),
    discoveryExcludedPages.has(pageName),
  );
}

function resolveTranslation({
  id,
  source,
  pageEditorialOverrides,
  sharedEditorialOverrides,
  overrides,
  cache,
}) {
  return pageEditorialOverrides[id]
    || pageEditorialOverrides[source]
    || sharedEditorialOverrides[id]
    || sharedEditorialOverrides[source]
    || overrides[source]
    || cache.translations?.[id];
}

async function loadTranslationCaches() {
  const caches = new Map();
  for (const language of activeLanguages) {
    const cachePath = path.join(cacheRoot, `${language.code}.json`);
    caches.set(language.code, JSON.parse(await fs.readFile(cachePath, 'utf8')));
  }
  return caches;
}

function assertCompleteTranslationCoverage(pages, catalog, caches) {
  const idBySource = new Map(catalog.entries.map((entry) => [entry.source, entry.id]));
  const missing = [];
  for (const language of activeLanguages) {
    const cache = caches.get(language.code);
    const overrides = overridesByLanguage.get(language.code) || {};
    const editorialOverrides = editorialOverridesByLanguage.get(language.code) || {};
    const sharedEditorialOverrides = editorialOverrides['*'] || {};
    for (const page of pages) {
      const seo = seoByLanguage.get(language.code)?.[page.pageName];
      if (!seo?.title || !seo?.description || !seo?.h1) {
        missing.push(`${language.code}/${page.pageName}: curated SEO title, description or H1`);
      }
      const pageEditorialOverrides = editorialOverrides[page.pageName] || {};
      const seenSources = new Set();
      for (const record of page.records) {
        if (seenSources.has(record.source)) continue;
        seenSources.add(record.source);
        const id = idBySource.get(record.source);
        if (!id) {
          missing.push(`${language.code}/${page.pageName}: source is absent from source-catalog.json: ${record.source}`);
          continue;
        }
        const translated = resolveTranslation({
          id,
          source: record.source,
          pageEditorialOverrides,
          sharedEditorialOverrides,
          overrides,
          cache,
        });
        if (!translated) missing.push(`${language.code}/${page.pageName}: ${record.source}`);
      }
    }
  }
  if (!missing.length) return;
  const previewLimit = 200;
  const preview = missing.slice(0, previewLimit).map((item) => `- ${item}`).join('\n');
  const remainder = missing.length > previewLimit
    ? `\n- ... ${missing.length - previewLimit} additional missing item(s)`
    : '';
  throw new Error(
    `Localized build preflight found ${missing.length} missing translation or SEO item(s). No HTML was written.\n${preview}${remainder}`,
  );
}

async function renderLocalizedSearchIndex(language, outputDirectory) {
  const searchIndex = JSON.parse(await fs.readFile(path.join(sourceRoot, 'search-index.json'), 'utf8'));
  const conservativeSearchKeywords = {
    de: [
      'BP-2P-50-0001', '2 Kanäle', 'Standardmedium Luft', 'PTFE-Dichtung mit O-Ring',
      'Schutzhaube und Labyrinth',
      'Stator 4 × M5 Gewindetiefe 10 mm', 'Rotor 6 × M5 Gewindetiefe 8 mm',
      'Gewicht der gelieferten Konfiguration bestätigen',
    ],
    ja: [
      'BP-2P-50-0001', '2流路', '標準使用流体 空気', 'PTFEシール Oリング',
      '保護カバー ラビリンス',
      '固定側 4 × M5 ねじ深さ10 mm', '回転側 6 × M5 ねじ深さ8 mm',
      '納入仕様の質量を確認',
    ],
    ru: [
      'BP-2P-50-0001', '2 канала', 'стандартная среда воздух', 'уплотнение ПТФЭ с O-кольцом',
      'защитный кожух и лабиринт',
      'статор 4 × M5 глубина резьбы 10 мм', 'ротор 6 × M5 глубина резьбы 8 мм',
      'уточнить массу поставляемой конфигурации',
    ],
  };
  const manufacturingQualityKeywords = {
    de: ['Statorbearbeitung', '4-Achs-Dreh-Fräs-Bearbeitung', 'Aluminium 6061', 'Aluminium 7075', 'Farbeloxieren', 'Fertigungsablauf', 'harteloxierter Rotor', 'farbeloxiertes Statorgehäuse', 'Schichtdicke', 'O-Ring-Abdichtung', '51,7 µm'],
    ja: ['ステータ加工', '4軸複合旋盤加工', '6061アルミ合金', '7075アルミ合金', 'カラーアルマイト', '製造工程', '硬質アルマイト処理ロータ', 'カラーアルマイト処理ステータハウジング', 'アルマイト皮膜厚さ', 'Oリングシール', '51.7 μm'],
    ru: ['обработка статора', '4-осевая токарно-фрезерная обработка', 'алюминий 6061', 'алюминий 7075', 'цветное анодирование', 'процесс изготовления', 'ротор с твёрдым анодированием', 'корпус статора с цветным анодированием', 'толщина анодного покрытия', 'уплотнение O-ring', '51,7 мкм'],
  };
  const productionInspectionKeywords = {
    de: ['100%-Dichtheitsprüfung', 'kanalweise Dichtheitsprüfung', 'Druckhaltephase', 'Druckluft 1,0 MPa', 'NG-Sperrprozess'],
    ja: ['全数漏れ検査', '各回路漏れ検査', '保圧工程', '圧縮空気 1.0 MPa', '不適合品管理'],
    ru: ['100%-ный контроль герметичности', 'поканальная проверка', 'выдержка под давлением', 'сжатый воздух 1,0 МПа', 'изоляция изделий NG'],
  };
  const applicationCaseKeywords = {
    de: {
      'case-bp-2p-95-pneumatic-chuck-integration.html': ['BP-2P-95-0001', 'pneumatisches Spannfutter', 'Druckluft', 'Drehdurchführung im Spannfutter'],
      'case-bp-3p-s06-sensor-monitored-chuck.html': ['BP-3P-S06-0001', 'sensorüberwachtes pneumatisches Spannfutter', 'pneumatisches Spannfutter', 'Sensorsignalübertragung'],
    },
    ja: {
      'case-bp-2p-95-pneumatic-chuck-integration.html': ['BP-2P-95-0001', 'エアチャック', '空圧式チャック', '圧縮空気', 'ロータリージョイント組込み'],
      'case-bp-3p-s06-sensor-monitored-chuck.html': ['BP-3P-S06-0001', '外部センサ信号伝送', 'エアチャック', '空圧回路', '電気信号伝送'],
    },
    ru: {
      'case-bp-2p-95-pneumatic-chuck-integration.html': ['BP-2P-95-0001', 'пневматический патрон', 'сжатый воздух', 'установка вращающегося соединения'],
      'case-bp-3p-s06-sensor-monitored-chuck.html': ['BP-3P-S06-0001', 'пневматический патрон с контролем по датчикам', 'пневматический патрон', 'передача сигналов датчиков'],
    },
  };
  const localizedItems = [];
  for (const item of searchIndex) {
    if (discoveryExcludedPages.has(item.url)) continue;
    if (!config.pages.includes(item.url)) {
      localizedItems.push(item);
      continue;
    }
    const html = await fs.readFile(path.join(outputDirectory, item.url), 'utf8');
    const $ = load(html, { decodeEntities: false });
    const content = $('body').clone();
    content.find('script,style,header,nav,footer,.cookie-banner,.i18n-switcher').remove();
    content.find('a.skip-link[data-search-exclude][href="#main-content"]').remove();
    localizedItems.push({
      ...item,
      title: $('title').text().trim() || item.title,
      description: $('meta[name="description"]').attr('content')?.trim() || item.description,
      h1: $('h1').first().text().replace(/\s+/g, ' ').trim() || item.h1,
      h2s: $('h2').map((_, element) => $(element).text().replace(/\s+/g, ' ').trim()).get().filter(Boolean),
      body: content.text().replace(/\s+/g, ' ').trim(),
      ...(item.url === 'BP-2P-50-0001.html'
        ? { keywords: conservativeSearchKeywords[language.code] }
        : item.url === 'manufacturing-quality.html'
          ? { keywords: manufacturingQualityKeywords[language.code] }
        : item.url === 'production-inspection-testing.html'
          ? { keywords: productionInspectionKeywords[language.code] }
        : applicationCaseKeywords[language.code]?.[item.url]
          ? { keywords: applicationCaseKeywords[language.code][item.url] }
        : {}),
    });
  }
  return localizedItems;
}

async function writeLocalizedSearchIndex(language, outputDirectory) {
  const localizedItems = await renderLocalizedSearchIndex(language, outputDirectory);
  await fs.writeFile(path.join(outputDirectory, 'search-index.json'), `${JSON.stringify(localizedItems, null, 2)}\n`, 'utf8');
}

const llmsLabels = {
  de: {
    summary: 'Technischer Seitenindex für pneumatische Drehdurchführungen von Begapunk. Die Auswahl erfolgt nach Medium, Betriebsdruck, Drehzahl, Kanalzahl, Anschluss und Einbausituation.',
    sections: { products: 'Produkte', applications: 'Anwendungen', articles: 'Technische Beiträge', other: 'Unternehmen und Service' },
  },
  ja: {
    summary: 'Begapunkの空圧用ロータリージョイントに関する技術ページ索引です。使用流体、圧力、回転数、流路数・ポート数、接続、取付条件から選定してください。',
    sections: { products: '製品', applications: '用途別ガイド', articles: '技術記事', other: '会社・サポート' },
  },
  ru: {
    summary: 'Технический указатель страниц Begapunk о пневматических вращающихся и ротационных соединениях. При подборе учитывайте среду, давление, частоту вращения, число каналов, присоединение и монтаж.',
    sections: { products: 'Продукция', applications: 'Области применения', articles: 'Технические статьи', other: 'Компания и поддержка' },
  },
};

const conservativeLlmsDescription = {
  de: 'Zweikanal-Drehdurchführung BP-2P-50-0001 für Luft mit Schutzhaube und Labyrinth für staubige Umgebungen. Keine zertifizierte IP-Schutzart angegeben.',
  ja: '空気用2流路ロータリージョイントBP-2P-50-0001。粉じん環境向けの保護カバー・ラビリンス構造です。認証済みIP保護等級の表示はありません。',
  ru: 'Двухканальное соединение BP-2P-50-0001 для воздуха с защитным кожухом и лабиринтом для запылённых условий. Сертифицированная степень защиты IP не заявляется.',
};
const cncSawFixtureLlmsDescription = {
  de: 'Auswahlhilfe mit einer vom Kunden freigegebenen Produktionsanwendung der BP-2P-130-0001 an einer langsam laufenden kundenspezifischen CNC-Spannvorrichtung einer Kreissägemaschine; zwei getrennte Druckluftkanäle dienen zum Spannen und Lösen.',
  ja: 'お客様から公開許可を得た実生産事例を含む選定ガイドです。低速のCNC丸鋸盤用特注クランプ治具にBP-2P-130-0001を組み込み、独立した2つの圧縮空気流路でクランプ／アンクランプを行います。',
  ru: 'Руководство по подбору с разрешённым заказчиком производственным примером BP-2P-130-0001 в низкооборотном нестандартном зажимном приспособлении круглопильного станка с ЧПУ; два независимых канала сжатого воздуха используются для зажима и разжима.',
};

function llmsGroup(pageName) {
  if (/^BP-/.test(pageName) || ['products.html', 'products-p2.html', 'product-comparison.html'].includes(pageName)) return 'products';
  if (pageName === 'applications.html' || pageName.startsWith('application-') || pageName.startsWith('case-')) return 'applications';
  if (pageName === 'blog.html' || pageName.startsWith('blog-')) return 'articles';
  return 'other';
}

function renderLocalizedLlms(language) {
  const seo = seoByLanguage.get(language.code);
  const labels = llmsLabels[language.code];
  if (!seo || !labels) throw new Error(`${language.code}: localized llms configuration is missing.`);
  const grouped = new Map(['products', 'applications', 'articles', 'other'].map((group) => [group, []]));
  for (const pageName of config.pages) {
    if (llmsExcludedPages.has(pageName)) continue;
    const entry = seo[pageName];
    if (!entry) throw new Error(`${language.code}/${pageName}: cannot add missing SEO entry to llms.txt.`);
    const description = pageName === 'BP-2P-50-0001.html'
      ? conservativeLlmsDescription[language.code]
      : pageName === 'application-cnc-pneumatic-clamping.html'
        ? cncSawFixtureLlmsDescription[language.code]
        : entry.description;
    grouped.get(llmsGroup(pageName)).push(`- [${entry.title}](${pageUrl(language.code, pageName)}): ${description}`);
  }
  const sections = [...grouped.entries()].map(([group, lines]) => `## ${labels.sections[group]}\n\n${lines.join('\n')}`).join('\n\n');
  return `# ${seo._site.heading}\n\n> ${labels.summary}\n\n- [Multilingual sitemap](${config.siteUrl}/sitemap-i18n.xml)\n- [English AI index](${config.siteUrl}/llms.txt)\n\n${sections}\n`;
}

async function writeLocalizedLlms(language, outputDirectory) {
  await fs.writeFile(path.join(outputDirectory, 'llms.txt'), renderLocalizedLlms(language), 'utf8');
}

async function buildLocalizedPages(catalog) {
  await assertExternalOutputRoot('Localized page build');
  const pages = await loadPages(translationManagedPages);
  const caches = await loadTranslationCaches();
  assertCompleteTranslationCoverage(pages, catalog, caches);
  for (const language of activeLanguages) {
    const cache = caches.get(language.code);
    const outputDirectory = path.join(outputRoot, language.code);
    await fs.mkdir(outputDirectory, { recursive: true });
    for (const sourcePage of pages) {
      const html = await fs.readFile(path.join(sourceRoot, sourcePage.pageName), 'utf8');
      const $ = load(html, { decodeEntities: false });
      const page = { pageName: sourcePage.pageName, $, records: collectRecords($) };
      const localized = applyTranslations(page, language, catalog, cache);
      await fs.writeFile(path.join(outputDirectory, page.pageName), localized, 'utf8');
    }
    await writeLocalizedSearchIndex(language, outputDirectory);
    await writeLocalizedLlms(language, outputDirectory);
    console.log(`${language.code}: built ${pages.length} localized pages.`);
  }
}

async function verifyContactGeneration(catalog) {
  const normalizeScopeMarkup = (value) => String(value).replace(/\r\n?/g, '\n').trim();
  const scopeHash = (value) => crypto.createHash('sha256').update(value).digest('hex').toUpperCase();
  const stringLeafCount = (value) => {
    if (typeof value === 'string') return value ? 1 : 0;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return 0;
    return Object.values(value).reduce((total, child) => total + stringLeafCount(child), 0);
  };
  const deeplyEqual = (left, right) => {
    if (Object.is(left, right)) return true;
    if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
    if (Array.isArray(left) || Array.isArray(right)) {
      return Array.isArray(left)
        && Array.isArray(right)
        && left.length === right.length
        && left.every((value, index) => deeplyEqual(value, right[index]));
    }
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    return sameKeys(leftKeys, rightKeys)
      && leftKeys.every((key) => deeplyEqual(left[key], right[key]));
  };
  const canonicalJson = (value) => JSON.stringify((function sortValue(input) {
    if (Array.isArray(input)) return input.map(sortValue);
    if (!input || typeof input !== 'object') return input;
    return Object.fromEntries(
      Object.keys(input).sort().map((key) => [key, sortValue(input[key])]),
    );
  }(value)));
  const domScopes = Object.freeze([
    ['section.bp-rfq-hero', 'section.bp-rfq-hero'],
    ['main.bp-rfq-main', 'main.bp-rfq-main'],
    ['section.bp-rfq-details', 'section.bp-rfq-details'],
    ['form#quoteForm', 'form#quoteForm'],
  ]);
  const jsonScope = 'script#contact-rfq-copy[type="application/json"]';
  const behaviorScope = 'RFQ behavior script';
  const mismatches = [];

  const uniqueNode = ($, selector, fileLabel, side, scopeLabel = selector) => {
    const nodes = $(selector);
    if (nodes.length !== 1) {
      mismatches.push(
        `${fileLabel} [${scopeLabel}] ${side}: expected exactly one node; found ${nodes.length}`,
      );
      return null;
    }
    return nodes.first();
  };

  const executableContactScript = ($, fileLabel, side) => {
    const candidates = $('script').toArray().filter((node) => {
      const element = $(node);
      if (element.is('[src]')) return false;
      const type = String(element.attr('type') || '').trim().toLowerCase();
      const executable = !type
        || type === 'module'
        || /^(?:text|application)\/(?:java|ecma)script(?:;|$)/.test(type);
      const source = element.html() || '';
      return executable
        && source.includes('const rfqCopyData')
        && source.includes('REQUEST_CODE_MAP');
    });
    if (candidates.length !== 1) {
      mismatches.push(
        `${fileLabel} [${behaviorScope}] ${side}: expected exactly one executable inline script; found ${candidates.length}`,
      );
      return null;
    }
    return $(candidates[0]);
  };

  const inspectDocument = ($, fileLabel, side, languageCode) => {
    const scopes = new Map();
    for (const [scopeLabel, selector] of domScopes) {
      const node = uniqueNode($, selector, fileLabel, side, scopeLabel);
      if (node) scopes.set(scopeLabel, normalizeScopeMarkup($.html(node[0])));
    }

    const jsonNode = uniqueNode($, jsonScope, fileLabel, side, jsonScope);
    let jsonCopy = null;
    if (jsonNode) {
      const rawJson = jsonNode.html() || '';
      try {
        jsonCopy = JSON.parse(rawJson);
        assertContactRfqCopy(jsonCopy, `${fileLabel} ${side}`);
        if (stringLeafCount(jsonCopy) !== 38) {
          mismatches.push(`${fileLabel} [${jsonScope}] ${side}: expected 38 non-empty string leaves.`);
        }
        const expectedSeparator = languageCode === 'ja' ? '：' : ': ';
        if (jsonCopy.contextSeparator !== expectedSeparator) {
          mismatches.push(
            `${fileLabel} [${jsonScope}] ${side}: contextSeparator must be ${JSON.stringify(expectedSeparator)}.`,
          );
        }
        if (rawJson.includes('<') || rawJson.includes('\u2028') || rawJson.includes('\u2029')) {
          mismatches.push(
            `${fileLabel} [${jsonScope}] ${side}: script-sensitive characters are not safely escaped.`,
          );
        }
        const safelySerialized = serializeContactRfqCopy(jsonCopy);
        if (safelySerialized.includes('<')
          || safelySerialized.includes('\u2028')
          || safelySerialized.includes('\u2029')
          || !deeplyEqual(JSON.parse(safelySerialized), jsonCopy)) {
          mismatches.push(
            `${fileLabel} [${jsonScope}] ${side}: safe serialization contract failed.`,
          );
        }
        scopes.set(jsonScope, canonicalJson(jsonCopy));
      } catch (error) {
        mismatches.push(`${fileLabel} [${jsonScope}] ${side}: ${error.message}`);
      }
    }

    const behaviorNode = executableContactScript($, fileLabel, side);
    if (behaviorNode) {
      scopes.set(behaviorScope, normalizeScopeMarkup(behaviorNode.html() || ''));
    }
    return { scopes, jsonCopy };
  };

  const compareScope = (languageCode, scopeLabel, generatedValue, currentValue, report) => {
    if (generatedValue === undefined || currentValue === undefined) return;
    const generatedHash = scopeHash(generatedValue);
    const currentHash = scopeHash(currentValue);
    if (generatedValue !== currentValue) {
      mismatches.push(
        `${languageCode}/contact.html [${scopeLabel}]: generated SHA-256 ${generatedHash} `
        + `does not match current SHA-256 ${currentHash}`,
      );
      return;
    }
    report.push({
      language: languageCode,
      file: `${languageCode}/contact.html`,
      scope: scopeLabel,
      sha256: generatedHash,
    });
  };

  const [sourcePage] = await loadPages(['contact.html']);
  const sourceInspection = inspectDocument(sourcePage.$, 'contact.html', 'source', config.sourceLanguage.code);
  const sourceCopy = sourceInspection.jsonCopy;
  if (sourceCopy && sourceCopy.contextSeparator !== ': ') {
    mismatches.push(`contact.html [${jsonScope}] source: contextSeparator must be ": ".`);
  }
  const caches = await loadTranslationCaches();
  assertCompleteTranslationCoverage([sourcePage], catalog, caches);
  const comparisons = [];
  for (const language of activeLanguages) {
    const html = await fs.readFile(path.join(sourceRoot, 'contact.html'), 'utf8');
    const $ = load(html, { decodeEntities: false });
    const page = { pageName: 'contact.html', $, records: collectRecords($) };
    const localized = applyTranslations(page, language, catalog, caches.get(language.code));
    const current = await fs.readFile(
      path.join(sourceRoot, language.code, 'contact.html'),
      'utf8',
    );
    const generatedInspection = inspectDocument(
      load(localized, { decodeEntities: false }),
      `${language.code}/contact.html`,
      'generated',
      language.code,
    );
    const currentInspection = inspectDocument(
      load(current, { decodeEntities: false }),
      `${language.code}/contact.html`,
      'current',
      language.code,
    );
    if (generatedInspection.jsonCopy && currentInspection.jsonCopy
      && !deeplyEqual(generatedInspection.jsonCopy, currentInspection.jsonCopy)) {
      mismatches.push(
        `${language.code}/contact.html [${jsonScope}]: generated and current JSON are not deeply equal.`,
      );
    }
    for (const [scopeLabel] of domScopes) {
      compareScope(
        language.code,
        scopeLabel,
        generatedInspection.scopes.get(scopeLabel),
        currentInspection.scopes.get(scopeLabel),
        comparisons,
      );
    }
    compareScope(
      language.code,
      jsonScope,
      generatedInspection.scopes.get(jsonScope),
      currentInspection.scopes.get(jsonScope),
      comparisons,
    );
    compareScope(
      language.code,
      behaviorScope,
      generatedInspection.scopes.get(behaviorScope),
      currentInspection.scopes.get(behaviorScope),
      comparisons,
    );
  }
  if (mismatches.length) {
    throw new Error(`Contact-owned region mismatch. No file was written.\n- ${mismatches.join('\n- ')}`);
  }
  console.log(JSON.stringify({
    result: 'Contact-owned regions verified',
    targetLanguageCount: activeLanguages.length,
    wroteFiles: false,
    comparisons,
  }));
}

function inspectProductDetailUi($, languageCode, pageName, side) {
  const label = `${languageCode}/${pageName} ${side}`;
  const copy = productDetailUiContract.locales[languageCode];
  const uniqueNode = (selector, scope) => {
    const nodes = $(selector);
    if (nodes.length !== 1) {
      throw new Error(`${label}: expected one ${scope}; found ${nodes.length}.`);
    }
    return nodes.first();
  };
  if (!$('body').hasClass('page-product-detail')) {
    throw new Error(`${label}: page-product-detail body class is missing.`);
  }
  const skip = uniqueNode(PRODUCT_UI_SKIP_SELECTOR, 'skip link');
  const imagesRegion = uniqueNode(PRODUCT_UI_IMAGES_SELECTOR, 'product images region');
  const informationRegion = uniqueNode(PRODUCT_UI_INFO_SELECTOR, 'product information region');
  const main = uniqueNode('main#main-content[tabindex="-1"]', 'main content');
  const tabs = main.find('.pd-tabs > a.pd-tab');
  const panels = main.find('.pd-panel');
  const details = main.find('details.faq-item');
  const summaries = details.children('summary.faq-question');
  const thumbnails = main.find('.thumbnail-row > a.thumb-link');
  if (tabs.length !== 4 || panels.length !== 4 || details.length !== 5
    || summaries.length !== 5 || thumbnails.length !== 3) {
    throw new Error(
      `${label}: expected 4 tabs / 4 panels / 5 FAQs / 5 summaries / 3 thumbnails; `
      + `found ${tabs.length}/${panels.length}/${details.length}/${summaries.length}/${thumbnails.length}.`,
    );
  }
  const controlled = {
    skipLink: skip.text(),
    productImagesLabel: imagesRegion.attr('aria-label') || '',
    productInformationLabel: informationRegion.attr('aria-label') || '',
  };
  for (const [key, expected] of Object.entries(copy)) {
    if (controlled[key] !== expected) {
      throw new Error(`${label}: ${key} does not match the approved manual copy.`);
    }
  }
  const textWithoutIcons = (collection) => collection.map((_, element) => {
    const node = $(element).clone();
    node.find('.icon,.arrow').remove();
    return compactText(node.text());
  }).get();
  return {
    controlled,
    tabTexts: textWithoutIcons(tabs),
    summaryTexts: textWithoutIcons(summaries),
    counts: {
      tabs: tabs.length,
      panels: panels.length,
      details: details.length,
      summaries: summaries.length,
      thumbnails: thumbnails.length,
    },
  };
}

async function verifyProductUiGeneration(catalog) {
  const sourcePages = await loadPages(productDetailPageNames);
  const caches = await loadTranslationCaches();
  assertCompleteTranslationCoverage(sourcePages, catalog, caches);
  const sourceCounts = { tabs: 0, panels: 0, details: 0, summaries: 0, thumbnails: 0 };
  for (const sourcePage of sourcePages) {
    const inspection = inspectProductDetailUi(
      sourcePage.$,
      config.sourceLanguage.code,
      sourcePage.pageName,
      'source',
    );
    for (const key of Object.keys(sourceCounts)) sourceCounts[key] += inspection.counts[key];
  }

  const generatedCounts = { tabs: 0, panels: 0, details: 0, summaries: 0, thumbnails: 0 };
  let generatedPageCount = 0;
  let controlledComparisonCount = 0;
  for (const language of activeLanguages) {
    for (const pageName of productDetailPageNames) {
      const html = await fs.readFile(path.join(sourceRoot, pageName), 'utf8');
      const $ = load(html, { decodeEntities: false });
      const page = { pageName, $, records: collectRecords($) };
      const localized = applyTranslations(page, language, catalog, caches.get(language.code));
      const generatedInspection = inspectProductDetailUi(
        load(localized, { decodeEntities: false }),
        language.code,
        pageName,
        'generated',
      );
      const currentHtml = await fs.readFile(path.join(sourceRoot, language.code, pageName), 'utf8');
      const currentInspection = inspectProductDetailUi(
        load(currentHtml, { decodeEntities: false }),
        language.code,
        pageName,
        'current',
      );
      if (JSON.stringify(generatedInspection.controlled) !== JSON.stringify(currentInspection.controlled)) {
        throw new Error(`${language.code}/${pageName}: generated and current manual UI copy differ.`);
      }
      if (JSON.stringify(generatedInspection.tabTexts) !== JSON.stringify(currentInspection.tabTexts)) {
        throw new Error(`${language.code}/${pageName}: generated and current tab labels differ.`);
      }
      if (JSON.stringify(generatedInspection.summaryTexts) !== JSON.stringify(currentInspection.summaryTexts)) {
        throw new Error(`${language.code}/${pageName}: generated and current FAQ summary labels differ.`);
      }
      for (const key of Object.keys(generatedCounts)) generatedCounts[key] += generatedInspection.counts[key];
      generatedPageCount += 1;
      controlledComparisonCount += Object.keys(generatedInspection.controlled).length;
    }
  }
  console.log(JSON.stringify({
    result: 'Product-detail UI generation verified',
    sourcePageCount: sourcePages.length,
    targetLanguageCount: activeLanguages.length,
    generatedPageCount,
    controlledComparisonCount,
    sourceCounts,
    generatedCounts,
    wroteFiles: false,
  }));
}

async function refreshLocalizedMetadata() {
  await assertExternalOutputRoot('Localized metadata refresh');
  for (const language of activeLanguages) {
    const outputDirectory = path.join(outputRoot, language.code);
    for (const pageName of translationManagedPages) {
      const filePath = path.join(outputDirectory, pageName);
      const html = await fs.readFile(filePath, 'utf8');
      const $ = load(html, { decodeEntities: false });
      applySeoMetadata($, language.code, pageName);
      updateJsonLd($, language.code, pageName, true);
      const refreshed = patchDiscoveryRobotsMeta(
        $.html().replace(/[ \t]+$/gm, ''),
        discoveryExcludedPages.has(pageName),
      );
      await fs.writeFile(filePath, refreshed, 'utf8');
    }
    await writeLocalizedSearchIndex(language, outputDirectory);
    await writeLocalizedLlms(language, outputDirectory);
    console.log(`${language.code}: refreshed metadata and structured data for ${translationManagedPages.length} translation-managed pages; manual localized pages were not rewritten.`);
  }
}

function canonicalJson(value) {
  const sortValue = (input) => {
    if (Array.isArray(input)) return input.map(sortValue);
    if (!input || typeof input !== 'object') return input;
    return Object.fromEntries(
      Object.keys(input).sort().map((key) => [key, sortValue(input[key])]),
    );
  };
  return JSON.stringify(sortValue(value));
}

function inspectLocalizedMetadata($, languageCode, pageName, phase) {
  const uniqueText = (selector, label) => {
    const nodes = $(selector);
    if (nodes.length !== 1) {
      throw new Error(`${languageCode}/${pageName} [${phase}/${label}]: expected one node, found ${nodes.length}.`);
    }
    return compactText(nodes.first().text());
  };
  const uniqueContent = (selector, label) => {
    const nodes = $(selector);
    if (nodes.length !== 1) {
      throw new Error(`${languageCode}/${pageName} [${phase}/${label}]: expected one node, found ${nodes.length}.`);
    }
    return nodes.first().attr('content') || '';
  };
  const jsonLd = $('script[type="application/ld+json"]').map((index, element) => {
    try {
      return canonicalJson(JSON.parse($(element).html() || ''));
    } catch (error) {
      throw new Error(`${languageCode}/${pageName} [${phase}/json-ld-${index + 1}]: ${error.message}`);
    }
  }).get();
  const robotsNodes = $('meta[name="robots"]');
  if (robotsNodes.length > 1) {
    throw new Error(`${languageCode}/${pageName} [${phase}/robots]: expected at most one node, found ${robotsNodes.length}.`);
  }
  return {
    title: uniqueText('title', 'title'),
    description: uniqueContent('meta[name="description"]', 'description'),
    h1: uniqueText('h1', 'h1'),
    h1Html: $('h1').first().html()?.trim() || '',
    ogTitle: uniqueContent('meta[property="og:title"]', 'og-title'),
    ogDescription: uniqueContent('meta[property="og:description"]', 'og-description'),
    twitterTitle: uniqueContent('meta[name="twitter:title"]', 'twitter-title'),
    twitterDescription: uniqueContent('meta[name="twitter:description"]', 'twitter-description'),
    keywordCount: $('meta[name="keywords"]').length,
    robots: robotsNodes.first().attr('content') || '',
    robotsManagedBy: robotsNodes.first().attr('data-discovery-exclusion') || '',
    jsonLd,
  };
}

async function verifyLocalizedMetadata() {
  const failures = [];
  let checkedPages = 0;
  let checkedSearchIndexes = 0;
  let checkedLlmsIndexes = 0;
  for (const language of activeLanguages) {
    for (const pageName of translationManagedPages) {
      const filePath = path.join(sourceRoot, language.code, pageName);
      const html = await fs.readFile(filePath, 'utf8');
      const current = inspectLocalizedMetadata(
        load(html, { decodeEntities: false }),
        language.code,
        pageName,
        'current',
      );
      const expected$ = load(html, { decodeEntities: false });
      applySeoMetadata(expected$, language.code, pageName);
      updateJsonLd(expected$, language.code, pageName, true);
      const expectedHtml = patchDiscoveryRobotsMeta(
        expected$.html(),
        discoveryExcludedPages.has(pageName),
      );
      const expected = inspectLocalizedMetadata(
        load(expectedHtml, { decodeEntities: false }),
        language.code,
        pageName,
        'expected',
      );
      if (JSON.stringify(current) !== JSON.stringify(expected)) {
        const changedScopes = Object.keys(current).filter(
          (key) => JSON.stringify(current[key]) !== JSON.stringify(expected[key]),
        );
        failures.push(`${language.code}/${pageName}: ${changedScopes.join(', ')}`);
      }
      checkedPages += 1;
    }
    const languageDirectory = path.join(sourceRoot, language.code);
    const currentSearchIndex = JSON.parse(await fs.readFile(path.join(languageDirectory, 'search-index.json'), 'utf8'));
    const expectedSearchIndex = await renderLocalizedSearchIndex(language, languageDirectory);
    if (canonicalJson(currentSearchIndex) !== canonicalJson(expectedSearchIndex)) {
      failures.push(`${language.code}/search-index.json: generated semantic content differs.`);
    }
    checkedSearchIndexes += 1;
    const currentLlms = (await fs.readFile(path.join(languageDirectory, 'llms.txt'), 'utf8')).replace(/\r\n?/g, '\n');
    const expectedLlms = renderLocalizedLlms(language).replace(/\r\n?/g, '\n');
    if (currentLlms !== expectedLlms) failures.push(`${language.code}/llms.txt: generated content differs.`);
    checkedLlmsIndexes += 1;
  }
  if (failures.length) {
    throw new Error(`Localized metadata verification failed (${failures.length}):\n${failures.join('\n')}`);
  }
  console.log(JSON.stringify({
    result: 'Localized metadata and structured data verified',
    checkedPages,
    targetLanguageCount: activeLanguages.length,
    translationManagedPageCount: translationManagedPages.length,
    checkedSearchIndexes,
    checkedLlmsIndexes,
    wroteFiles: false,
  }));
}

function alternateMarkup(pageName) {
  return [config.sourceLanguage, ...activeLanguages]
    .map((language) => `<link rel="alternate" hreflang="${language.code}" href="${pageUrl(language.code, pageName)}">`)
    .concat(`<link rel="alternate" hreflang="x-default" href="${pageUrl(config.sourceLanguage.code, pageName)}">`)
    .join('\n');
}

function switcherMarkup(currentLanguage, pageName) {
  const options = [config.sourceLanguage, ...activeLanguages].map((language) => {
    const selected = language.code === currentLanguage ? ' selected' : '';
    return `<option value="${switcherReference(currentLanguage, language.code, pageName)}"${selected}>${language.label}</option>`;
  }).join('');
  const accessibleLabel = languageSwitcherLabels[currentLanguage] || languageSwitcherLabels.en;
  return `<div class="i18n-switcher" data-no-translate><label class="sr-only" for="language-${currentLanguage}">${accessibleLabel}</label><select id="language-${currentLanguage}" aria-label="${accessibleLabel}" onchange="if(this.value)window.location.href=this.value">${options}</select></div>`;
}

async function integrateEnglishPages() {
  for (const pageName of translationManagedPages) {
    const sourcePath = path.join(sourceRoot, pageName);
    const filePath = path.join(outputRoot, pageName);
    let html = await fs.readFile(sourcePath, 'utf8');
    html = html.replace(/<link\s+rel=["']alternate["']\s+hreflang=["'][^"']+["'][^>]*>\s*/gi, '');
    const alternates = alternateMarkup(pageName);
    if (!/<link\s+rel=["']canonical["']/i.test(html)) throw new Error(`${pageName}: canonical link is missing.`);
    html = html.replace(/(<link\s+rel=["']canonical["'][^>]*>)/i, `${alternates}\n$1`);
    html = html.replace(/<div class=["']i18n-switcher["'][\s\S]*?<\/div>\s*/i, '');
    const switcher = switcherMarkup(config.sourceLanguage.code, pageName);
    if (!/<button\s+class=["']mobile-toggle["']/i.test(html)) throw new Error(`${pageName}: mobile navigation toggle is missing.`);
    html = html.replace(/(<button\s+class=["']mobile-toggle["'])/i, `${switcher}\n   $1`);
    html = html.replace(/<input\s+type=["']hidden["']\s+name=["']source_language["'][^>]*>\s*/gi, '');
    const inquiryFormPattern = /(<form\b(?=[^>]*(?:\bid=["']quoteForm["']|\baction=["'][^"']*send_inquiry\.php[^"']*["']))[^>]*>)/i;
    if (inquiryFormPattern.test(html)) {
      html = html.replace(inquiryFormPattern, `$1\n<input type="hidden" name="source_language" value="${config.sourceLanguage.code}">`);
    }
    html = normalizeEntityIdentitiesInMarkup(html);
    html = patchDiscoveryRobotsMeta(html, discoveryExcludedPages.has(pageName));
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, html, 'utf8');
  }
}

async function writeInternationalSitemap() {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [];
  const excludedPages = new Set([...(config.sitemapExcludedPages || []), ...discoveryExcludedPages]);
  const sitemapPages = config.pages.filter((pageName) => !excludedPages.has(pageName));
  for (const language of [config.sourceLanguage, ...activeLanguages]) {
    for (const pageName of sitemapPages) {
      const alternates = [config.sourceLanguage, ...activeLanguages]
        .map((candidate) => `    <xhtml:link rel="alternate" hreflang="${candidate.code}" href="${pageUrl(candidate.code, pageName)}" />`)
        .concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${pageUrl(config.sourceLanguage.code, pageName)}" />`)
        .join('\n');
      urls.push(`  <url>\n    <loc>${pageUrl(language.code, pageName)}</loc>\n    <lastmod>${today}</lastmod>\n${alternates}\n  </url>`);
    }
  }
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`;
  await fs.writeFile(path.join(outputRoot, 'sitemap-i18n.xml'), sitemap, 'utf8');

  const robotsPath = path.join(outputRoot, 'robots.txt');
  let robots = await fs.readFile(path.join(sourceRoot, 'robots.txt'), 'utf8');
  const sitemapLine = `Sitemap: ${config.siteUrl}/sitemap-i18n.xml`;
  if (!robots.includes(sitemapLine)) robots = `${robots.trimEnd()}\n${sitemapLine}\n`;
  await fs.writeFile(robotsPath, robots, 'utf8');
}

async function integrateLocalizedSite() {
  await assertExternalOutputRoot('Localized site integration');
  for (const language of activeLanguages) {
    for (const pageName of config.pages) {
      await fs.access(path.join(outputRoot, language.code, pageName));
    }
  }
  await integrateEnglishPages();
  await writeInternationalSitemap();
  console.log(`Integrated hreflang and language switching into ${translationManagedPages.length} translation-managed English pages; ${manualLocalizedPages.length} manual English pages were not rewritten.`);
  const sitemapPageCount = config.pages.length - new Set([
    ...(config.sitemapExcludedPages || []),
    ...discoveryExcludedPages,
  ]).size;
  console.log(`Generated sitemap-i18n.xml for ${(activeLanguages.length + 1) * sitemapPageCount} URLs.`);
}

let catalog;
try {
  catalog = JSON.parse(await fs.readFile(catalogPath, 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

if (mode === 'verify-contact') {
  assertCatalogPageContract(catalog, 'verifying Contact RFQ generation');
  await verifyContactGeneration(catalog);
} else if (mode === 'verify-product-ui-generation') {
  assertCatalogPageContract(catalog, 'verifying product-detail UI generation');
  await verifyProductUiGeneration(catalog);
} else if (mode === 'verify-metadata') {
  await verifyLocalizedMetadata();
} else {
  const pages = await loadPages();
  if (mode === 'extract') {
  catalog = await extractCatalog(pages);
  await pruneTranslationCaches(catalog);
  } else if (mode === 'translate') {
    assertCatalogPageContract(catalog, 'translating');
    await translateCatalog(catalog);
  } else if (mode === 'build') {
    assertCatalogPageContract(catalog, 'building localized pages');
    await buildLocalizedPages(catalog);
  } else if (mode === 'refresh-metadata') {
    await refreshLocalizedMetadata();
  } else if (mode === 'integrate') {
    await integrateLocalizedSite();
  } else {
    throw new Error(`Unsupported mode: ${mode}`);
  }
}
