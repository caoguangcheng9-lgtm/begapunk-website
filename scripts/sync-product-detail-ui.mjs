import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODE = process.argv[2] || '';
const EXPECTED_MODEL_COUNT = 16;
const EXPECTED_PAGE_COUNT = 64;
const EXPECTED_STYLE_HASH = '7D81DA13137D9D1435ABCABF962E8E46C20DB03F6B52F8BA45F2E71E9EAAF9FB';
const EXPECTED_SHARED_CSS_HASH = '1742E09D412EA898C37A0F438CBFEEDEFBC6DBB02DE5537613108F9BF314B785';
const EXPECTED_SHARED_JS_HASH = '1478FE8C38A0383C2364F959C068D2D7D16A99B27FFA47ECBCD57F2D50A0CEB6';
const RESOURCE_VERSION = '20260816-product-detail1';
const LOCALE_PREFIXES = ['', 'de', 'ja', 'ru'];
const PANEL_NAMES = ['specs', 'compat', 'install', 'downloads'];
const MANUAL_COPY_PATH = path.join(ROOT, 'i18n', 'manual', 'product-detail-ui.json');
const EXPECTED_UI_COPY = Object.freeze({
  en: Object.freeze({
    skipLink: 'Skip to main content',
    productInformationLabel: 'Product information',
    productImagesLabel: 'Product images',
  }),
  de: Object.freeze({
    skipLink: 'Zum Hauptinhalt springen',
    productInformationLabel: 'Produktinformationen',
    productImagesLabel: 'Produktbilder',
  }),
  ja: Object.freeze({
    skipLink: 'メインコンテンツへ移動',
    productInformationLabel: '製品情報',
    productImagesLabel: '製品画像',
  }),
  ru: Object.freeze({
    skipLink: 'Перейти к основному содержанию',
    productInformationLabel: 'Информация о продукте',
    productImagesLabel: 'Изображения продукта',
  }),
});

const legacyFunctionBlocks = [
  `// Tab Switch
function switchTab(btn, panelId) {
 document.querySelectorAll('.pd-tab').forEach(t => t.classList.remove('active'));
 document.querySelectorAll('.pd-panel').forEach(p => p.classList.remove('active'));
 btn.classList.add('active');
 document.getElementById('panel-' + panelId).classList.add('active');
}`,
  `// Thumbnail Image Switch
function switchImage(thumb) {
 document.getElementById('main-img').src = thumb.src;
 document.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
 thumb.classList.add('active');
}`,
  `// FAQ Toggle
function toggleFAQ(btn) {
 const item = btn.parentElement;
 item.classList.toggle('open');
}`,
];

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex').toUpperCase();
}

function normalizedEol(value) {
  return String(value).replace(/\r\n|\r|\n/g, '\n');
}

function countOccurrences(source, value) {
  return source.split(value).length - 1;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeText(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function escapeAttribute(value) {
  return escapeText(value).replaceAll('"', '&quot;');
}

function replaceLiteralOnce(source, search, replacement, label) {
  const count = countOccurrences(source, search);
  if (count !== 1) throw new Error(`${label}: expected one literal match; found ${count}.`);
  return source.replace(search, replacement);
}

function replaceRegexExact(source, pattern, replacement, expected, label) {
  let count = 0;
  const next = source.replace(pattern, (...args) => {
    count += 1;
    return typeof replacement === 'function' ? replacement(...args) : replacement;
  });
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches; found ${count}.`);
  return next;
}

function regexForLegacyFunction(block) {
  const pattern = escapeRegex(block).replaceAll('\n', '\\r?\\n');
  return new RegExp(`${pattern}\\r?\\n?`, 'g');
}

function localeForFile(relativePath) {
  const prefix = relativePath.includes('/') ? relativePath.split('/')[0] : '';
  return prefix || 'en';
}

function resourcePrefix(relativePath) {
  return relativePath.includes('/') ? '../' : '';
}

function validateManualCopy(contract) {
  if (contract?.schemaVersion !== 1) throw new Error('Product-detail UI schemaVersion must be 1.');
  if (contract?.review?.method !== 'AI-assisted target-market line-by-line localization review') {
    throw new Error('Product-detail UI review method is missing or unsupported.');
  }
  if (contract?.review?.independentNativeSpeakerReview !== false) {
    throw new Error('Product-detail UI data must not claim independent native-speaker review.');
  }
  const localeKeys = Object.keys(contract.locales || {}).sort();
  if (localeKeys.join(',') !== ['de', 'en', 'ja', 'ru'].join(',')) {
    throw new Error('Product-detail UI locales must be exactly EN, DE, JA, and RU.');
  }
  const expectedKeys = ['productImagesLabel', 'productInformationLabel', 'skipLink'];
  for (const locale of localeKeys) {
    const copy = contract.locales[locale];
    if (Object.keys(copy || {}).sort().join(',') !== expectedKeys.join(',')) {
      throw new Error(`${locale}: product-detail UI keys do not match the contract.`);
    }
    for (const key of expectedKeys) {
      if (typeof copy[key] !== 'string' || !copy[key].trim()) {
        throw new Error(`${locale}.${key} must be a non-empty string.`);
      }
      if (copy[key] !== EXPECTED_UI_COPY[locale][key]) {
        throw new Error(`${locale}.${key} does not match the approved localization.`);
      }
    }
  }
}

function executableInlineSource($) {
  const scripts = $('script:not([src])').toArray().filter((element) => {
    const type = String($(element).attr('type') || '').toLowerCase();
    return !type || type === 'text/javascript' || type === 'application/javascript' || type === 'module';
  });
  if (scripts.length !== 1) return null;
  return $(scripts[0]).html() || '';
}

function withoutLegacyFunctions(source) {
  let next = String(source);
  for (const block of legacyFunctionBlocks) next = next.replace(regexForLegacyFunction(block), '');
  return normalizedEol(next).trim();
}

function protectedHeroMarkup($) {
  const heroes = $('section.pd-hero');
  if (heroes.length !== 1) throw new Error(`Expected one product hero; found ${heroes.length}.`);
  const hero = heroes.first().clone();
  hero.find('.pd-gallery,.pd-info').removeAttr('role').removeAttr('aria-label');
  hero.find('a.thumb-link').each((_, element) => {
    const link = $(element);
    link.replaceWith(link.html() || '');
  });
  hero.find('.thumbnail-row img').removeAttr('class').removeAttr('onclick');
  return $.html(hero[0]);
}

function rawRange(source, start, end, label) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  if (startIndex < 0 || endIndex < 0) throw new Error(`Cannot freeze ${label}; boundary is missing.`);
  return source.slice(startIndex, endIndex + end.length);
}

function frozenSnapshot(source) {
  const $ = load(source, { decodeEntities: false });
  const metadata = [];
  $('title,meta,link[rel="canonical"],link[rel="alternate"]').each((_, element) => {
    metadata.push($.html(element));
  });
  const jsonLd = [];
  $('script[type="application/ld+json"]').each((_, element) => jsonLd.push($(element).html() || ''));
  const existingLinks = [];
  $('a').each((_, element) => {
    const link = $(element);
    if (link.is('.skip-link,.pd-tab,.thumb-link') || link.closest('.thumbnail-row').length) return;
    existingLinks.push({
      href: link.attr('href') || '',
      target: link.attr('target') || '',
      rel: link.attr('rel') || '',
      download: link.attr('download') ?? null,
      class: link.attr('class') || '',
      html: link.html() || '',
    });
  });
  const images = [];
  $('img').each((_, element) => {
    const image = $(element);
    images.push({
      src: image.attr('src') || '',
      alt: image.attr('alt') || '',
      width: image.attr('width') || '',
      height: image.attr('height') || '',
      loading: image.attr('loading') || '',
    });
  });
  const inlineStyles = [];
  $('[style]').each((_, element) => inlineStyles.push({
    tag: element.tagName,
    class: $(element).attr('class') || '',
    style: $(element).attr('style') || '',
  }));
  const content = $('body').clone();
  content.find('script,style,header,footer,.floating-cta,.skip-link').remove();
  const visibleTextNodes = [];
  content.find('*').addBack().contents().each((_, node) => {
    if (node.type !== 'text') return;
    const value = normalizedEol(node.data || '').trim();
    if (value) visibleTextNodes.push(value);
  });
  const behavior = executableInlineSource($);
  return {
    metadata,
    jsonLd,
    hero: protectedHeroMarkup($),
    rawHeader: rawRange(source, '<header class="header">', '</header>', 'header'),
    rawHero: rawRange(source, '<section class="pd-hero">', '</section>', 'hero'),
    rawFooter: rawRange(source, '<footer class="footer" id="siteFooter">', '</footer>', 'footer'),
    rawFloatingCta: rawRange(
      source,
      '<!-- ===== FLOATING CTA ===== -->',
      '<!-- ===== JS ===== -->',
      'floating CTA',
    ),
    header: $.html($('header').first()) || '',
    footer: $.html($('footer').first()) || '',
    floatingCta: $.html($('.floating-cta').first()) || '',
    existingLinks,
    images,
    inlineStyles,
    visibleTextNodes,
    behaviorRemainder: behavior === null ? null : withoutLegacyFunctions(behavior),
  };
}

function assertFrozenSnapshot(before, after, relativePath) {
  for (const key of Object.keys(before)) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      throw new Error(`${relativePath}: protected ${key} changed during product UI transformation.`);
    }
  }
}

function assertLegacyStructure(source, relativePath) {
  const $ = load(source, { decodeEntities: false });
  const tabs = $('.pd-tabs > button.pd-tab');
  const panels = $('.pd-panel');
  const faqs = $('div.faq-item');
  const thumbs = $('.thumbnail-row > img.thumb');
  if (tabs.length !== 4 || panels.length !== 4 || faqs.length !== 5 || thumbs.length !== 3) {
    throw new Error(
      `${relativePath}: legacy structure must be 4 tabs / 4 panels / 5 FAQs / 3 thumbnails; `
      + `found ${tabs.length}/${panels.length}/${faqs.length}/${thumbs.length}.`,
    );
  }
  if ($('.pd-tabs').length !== 1 || $('.pd-tab').length !== 4
    || $('.thumbnail-row').length !== 1 || $('.thumb').length !== 3) {
    throw new Error(`${relativePath}: legacy product controls are not unique.`);
  }
  if ($('#main-img').length !== 1) throw new Error(`${relativePath}: expected one #main-img.`);
  PANEL_NAMES.forEach((name, index) => {
    const tab = tabs.eq(index);
    if (tab.attr('onclick') !== `switchTab(this,'${name}')`) {
      throw new Error(`${relativePath}: legacy tab ${name} does not match its approved handler.`);
    }
    if ($(`#panel-${name}`).length !== 1) {
      throw new Error(`${relativePath}: expected one #panel-${name}.`);
    }
  });
  faqs.each((_, element) => {
    const item = $(element);
    if (item.children('button.faq-question[onclick="toggleFAQ(this)"]').length !== 1
      || item.children('.faq-answer').length !== 1) {
      throw new Error(`${relativePath}: legacy FAQ structure is incomplete.`);
    }
  });
  thumbs.each((_, element) => {
    if ($(element).attr('onclick') !== 'switchImage(this)') {
      throw new Error(`${relativePath}: legacy thumbnail handler is missing.`);
    }
  });
  if ($('main').length !== 0 || $('a.skip-link').length !== 0) {
    throw new Error(`${relativePath}: legacy page unexpectedly contains main or skip-link markup.`);
  }
  for (const name of ['switchTab', 'toggleFAQ', 'switchImage']) {
    const count = countOccurrences(source, `function ${name}(`);
    if (count !== 1) throw new Error(`${relativePath}: expected one legacy ${name} function; found ${count}.`);
  }
  const styleBlocks = source.match(/<style>[\s\S]*?<\/style>/g) || [];
  if (styleBlocks.length !== 1) {
    throw new Error(`${relativePath}: expected one product inline style block; found ${styleBlocks.length}.`);
  }
  if (sha256(normalizedEol(styleBlocks[0])) !== EXPECTED_STYLE_HASH) {
    throw new Error(`${relativePath}: product inline style content does not match the approved normalized hash.`);
  }
}

function validateFinalStructure(source, relativePath, copy) {
  const $ = load(source, { decodeEntities: false });
  const prefix = resourcePrefix(relativePath);
  const tabs = $('.pd-tabs > a.pd-tab');
  const panels = $('.pd-panel');
  const faqs = $('details.faq-item');
  const summaries = faqs.children('summary.faq-question');
  const thumbLinks = $('.thumbnail-row > a.thumb-link');
  const skip = $('body > a.skip-link[data-search-exclude][href="#main-content"]');
  const main = $('main#main-content[tabindex="-1"]');
  const errors = [];

  if (!$('body').hasClass('page-product-detail')) errors.push('body class');
  if (skip.length !== 1 || skip.text() !== copy.skipLink) errors.push('skip link');
  if (main.length !== 1) errors.push('main');
  if (main.find('section.pd-hero').length !== 1 || main.find('.pd-panel').length !== 4) errors.push('main scope');
  if (main.find('footer,.floating-cta,header').length !== 0) errors.push('main boundary');
  if ($('header').closest('main').length || $('footer').closest('main').length || $('.floating-cta').closest('main').length) {
    errors.push('header/footer/CTA boundary');
  }
  const galleries = $('.pd-gallery[role="region"]');
  const informationRegions = $('.pd-info[role="region"]');
  if (galleries.length !== 1 || galleries.attr('aria-label') !== copy.productImagesLabel) errors.push('image region label');
  if (informationRegions.length !== 1 || informationRegions.attr('aria-label') !== copy.productInformationLabel) errors.push('information region label');
  if ($('#main-img').length !== 1) errors.push('main image');
  if ($('.pd-tabs').length !== 1 || $('.pd-tab').length !== 4 || tabs.length !== 4 || panels.length !== 4) {
    errors.push('tab/panel count');
  }
  PANEL_NAMES.forEach((name, index) => {
    const tab = tabs.eq(index);
    const panel = panels.eq(index);
    if (tab.attr('href') !== `#panel-${name}` || panel.attr('id') !== `panel-${name}`) errors.push(`tab ${name}`);
    if ($(`[id="panel-${name}"]`).length !== 1) errors.push(`duplicate panel ${name}`);
    if (tab.attr('onclick') !== undefined || tab.attr('role') !== undefined
      || tab.attr('aria-selected') !== undefined) errors.push(`source tab state ${name}`);
    if (panel.attr('hidden') !== undefined || panel.attr('role') !== undefined
      || panel.hasClass('active')) errors.push(`source panel state ${name}`);
  });
  if (faqs.length !== 5 || summaries.length !== 5 || $('.faq-item').length !== 5
    || $('.faq-question').length !== 5 || $('div.faq-item').length !== 0) errors.push('FAQ count');
  faqs.each((_, element) => {
    const item = $(element);
    const summary = item.children('summary.faq-question');
    if (item.attr('open') === undefined || item.children('.faq-answer').length !== 1
      || summary.length !== 1 || summary.attr('onclick') !== undefined
      || summary.attr('aria-expanded') !== undefined) errors.push('FAQ source state');
  });
  if ($('.thumbnail-row').length !== 1 || thumbLinks.length !== 3 || $('.thumb-link').length !== 3
    || $('.thumb').length !== 3 || thumbLinks.filter('[aria-current="true"]').length !== 1) {
    errors.push('thumbnail count/state');
  }
  thumbLinks.each((_, element) => {
    const link = $(element);
    const image = link.children('img.thumb');
    if (image.length !== 1 || link.attr('href') !== image.attr('src')
      || link.attr('onclick') !== undefined || image.attr('onclick') !== undefined) {
      errors.push('thumbnail fallback');
    }
  });
  for (const name of ['switchTab', 'toggleFAQ', 'switchImage']) {
    if (source.includes(`function ${name}(`)) errors.push(`legacy ${name}`);
  }
  if ($('[onclick*="switchTab"],[onclick*="toggleFAQ"],[onclick*="switchImage"]').length) errors.push('legacy onclick');
  if ($('style').length !== 0) errors.push('inline style block');
  if ($(`link[href="${prefix}css/product-detail.css?v=${RESOURCE_VERSION}"]`).length !== 1) errors.push('product CSS resource');
  const productScripts = $(`script[src="${prefix}js/product-detail.js?v=${RESOURCE_VERSION}"][defer]`);
  if (productScripts.length !== 1) errors.push('product JS resource');
  if (!$('body').children().first().is('a.skip-link[data-search-exclude][href="#main-content"]')) {
    errors.push('skip-link order');
  }

  if (errors.length) throw new Error(`${relativePath}: final product UI contract failed: ${[...new Set(errors)].join(', ')}.`);
}

function transformLegacyPage(source, relativePath, contract) {
  assertLegacyStructure(source, relativePath);
  const protectedBefore = frozenSnapshot(source);
  const locale = localeForFile(relativePath);
  const copy = contract.locales[locale];
  const prefix = resourcePrefix(relativePath);
  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  const styleBlocks = source.match(/<style>[\s\S]*?<\/style>/g);
  let next = source;

  const globalCss = `<link rel="stylesheet" href="${prefix}css/style.css?v=20260815-mobile-lang1">`;
  const productCss = `<link rel="stylesheet" href="${prefix}css/product-detail.css?v=${RESOURCE_VERSION}">`;
  next = replaceLiteralOnce(next, globalCss, `${globalCss}${eol} ${productCss}`, `${relativePath} CSS resource`);
  next = replaceLiteralOnce(next, styleBlocks[0], '', `${relativePath} inline CSS removal`);

  next = replaceLiteralOnce(
    next,
    '<body>',
    `<body class="page-product-detail">${eol}<a class="skip-link" href="#main-content" data-search-exclude>${escapeText(copy.skipLink)}</a>`,
    `${relativePath} body and skip link`,
  );
  next = replaceLiteralOnce(
    next,
    '<!-- ===== BREADCRUMB ===== -->',
    `<!-- ===== BREADCRUMB ===== -->${eol}<main id="main-content" tabindex="-1">`,
    `${relativePath} main start`,
  );
  next = replaceLiteralOnce(
    next,
    '<!-- ===== FOOTER ===== -->',
    `</main>${eol}<!-- ===== FOOTER ===== -->`,
    `${relativePath} main end`,
  );
  next = replaceLiteralOnce(
    next,
    '<div class="pd-gallery">',
    `<div class="pd-gallery" role="region" aria-label="${escapeAttribute(copy.productImagesLabel)}">`,
    `${relativePath} image region`,
  );
  next = replaceLiteralOnce(
    next,
    '<div class="pd-info">',
    `<div class="pd-info" role="region" aria-label="${escapeAttribute(copy.productInformationLabel)}">`,
    `${relativePath} information region`,
  );

  next = replaceRegexExact(
    next,
    /<button class="pd-tab(?: active)?" onclick="switchTab\(this,'(specs|compat|install|downloads)'\)">([\s\S]*?)<\/button>/g,
    (_, name, content) => `<a class="pd-tab" href="#panel-${name}">${content}</a>`,
    4,
    `${relativePath} tabs`,
  );
  next = replaceLiteralOnce(
    next,
    '<div class="pd-panel active" id="panel-specs">',
    '<div class="pd-panel" id="panel-specs">',
    `${relativePath} source panel state`,
  );

  next = replaceRegexExact(
    next,
    /<div class="faq-item">([\s\S]*?)<button class="faq-question" onclick="toggleFAQ\(this\)">([\s\S]*?)<\/button>([\s\S]*?)<div class="faq-answer">([\s\S]*?)<\/div>(\s*)<\/div>/g,
    (_, beforeQuestion, question, beforeAnswer, answer, trailing) => (
      `<details class="faq-item" open>${beforeQuestion}<summary class="faq-question">${question}</summary>`
      + `${beforeAnswer}<div class="faq-answer">${answer}</div>${trailing}</details>`
    ),
    5,
    `${relativePath} FAQs`,
  );

  let thumbnailIndex = 0;
  next = replaceRegexExact(
    next,
    /<img class="thumb(?: active)?"([^>]*?) onclick="switchImage\(this\)"([^>]*?)>/g,
    (tag, before, after) => {
      const cleanedImage = `<img class="thumb"${before}${after}>`;
      const srcMatch = cleanedImage.match(/\bsrc="([^"]+)"/);
      if (!srcMatch) throw new Error(`${relativePath}: thumbnail source is missing.`);
      const current = thumbnailIndex === 0 ? ' aria-current="true"' : '';
      thumbnailIndex += 1;
      return `<a class="thumb-link" href="${srcMatch[1]}"${current}>${cleanedImage}</a>`;
    },
    3,
    `${relativePath} thumbnails`,
  );

  for (const block of legacyFunctionBlocks) {
    next = replaceRegexExact(next, regexForLegacyFunction(block), '', 1, `${relativePath} legacy function`);
  }

  const navScript = `<script defer="" src="${prefix}js/site-navigation.js?v=20260808-nav1"></script>`;
  const productScript = `<script defer src="${prefix}js/product-detail.js?v=${RESOURCE_VERSION}"></script>`;
  next = replaceLiteralOnce(next, navScript, `${productScript}${eol}${navScript}`, `${relativePath} JS resource`);

  validateFinalStructure(next, relativePath, copy);
  assertFrozenSnapshot(protectedBefore, frozenSnapshot(next), relativePath);
  return next;
}

async function discoverPages() {
  const rootNames = (await fs.readdir(ROOT))
    .filter((name) => /^BP-[A-Za-z0-9-]+\.html$/.test(name))
    .sort((left, right) => left.localeCompare(right));
  if (rootNames.length !== EXPECTED_MODEL_COUNT) {
    throw new Error(`Expected ${EXPECTED_MODEL_COUNT} root product pages; found ${rootNames.length}.`);
  }
  const pages = [];
  for (const prefix of LOCALE_PREFIXES) {
    for (const name of rootNames) pages.push(prefix ? `${prefix}/${name}` : name);
  }
  if (pages.length !== EXPECTED_PAGE_COUNT) throw new Error(`Expected ${EXPECTED_PAGE_COUNT} product pages.`);
  return pages;
}

async function validateSharedAssets(sampleSource) {
  const styleBlocks = sampleSource.match(/<style>[\s\S]*?<\/style>/g) || [];
  const sharedCss = normalizedEol(await fs.readFile(path.join(ROOT, 'css', 'product-detail.css'), 'utf8'));
  if (sha256(sharedCss) !== EXPECTED_SHARED_CSS_HASH) {
    throw new Error('Shared product-detail.css does not match the approved full contract hash.');
  }
  const ownedCssMarker = '\n\n.page-product-detail .skip-link';
  const markerIndex = sharedCss.indexOf(ownedCssMarker);
  if (markerIndex < 0) throw new Error('Shared product-detail.css is missing its owned-style boundary.');
  const migratedCss = sharedCss.slice(0, markerIndex).trim();
  const migratedStyleHash = sha256(`<style>\n${migratedCss}\n</style>`);
  if (migratedStyleHash !== EXPECTED_STYLE_HASH) {
    throw new Error('Shared product-detail.css does not begin with the approved migrated CSS block.');
  }
  if (styleBlocks.length > 1
    || (styleBlocks.length === 1 && sha256(normalizedEol(styleBlocks[0])) !== EXPECTED_STYLE_HASH)) {
    throw new Error('The product inline CSS baseline does not match the approved normalized hash.');
  }
  if (styleBlocks.length === 0 && !sampleSource.includes('page-product-detail')) {
    throw new Error('The product page has neither the legacy CSS block nor the synchronized UI marker.');
  }
  const sharedJs = await fs.readFile(path.join(ROOT, 'js', 'product-detail.js'), 'utf8');
  if (sha256(normalizedEol(sharedJs)) !== EXPECTED_SHARED_JS_HASH) {
    throw new Error('Shared product-detail.js does not match the approved full contract hash.');
  }
}

async function main() {
  if (!['--check', '--write'].includes(MODE) || process.argv.length !== 3) {
    console.error('Usage: node scripts/sync-product-detail-ui.mjs --check|--write');
    process.exitCode = 1;
    return;
  }
  const contract = JSON.parse(await fs.readFile(MANUAL_COPY_PATH, 'utf8'));
  validateManualCopy(contract);
  const pages = await discoverPages();
  const firstSource = await fs.readFile(path.join(ROOT, pages[0]), 'utf8');
  await validateSharedAssets(firstSource);
  const pending = [];
  for (const relativePath of pages) {
    const absolutePath = path.join(ROOT, ...relativePath.split('/'));
    const source = await fs.readFile(absolutePath, 'utf8');
    const copy = contract.locales[localeForFile(relativePath)];
    const hasFinalMarker = source.includes('page-product-detail')
      || source.includes('product-detail.css?v=')
      || source.includes('product-detail.js?v=')
      || source.includes('class="skip-link"');
    const next = hasFinalMarker
      ? (validateFinalStructure(source, relativePath, copy), source)
      : transformLegacyPage(source, relativePath, contract);
    if (next !== source) pending.push({ relativePath, absolutePath, next });
  }

  console.log(`Product detail UI plan: ${pending.length} page(s) require synchronization.`);
  if (MODE === '--check') {
    if (pending.length) {
      for (const item of pending) console.error(`- ${item.relativePath}`);
      process.exitCode = 1;
    } else {
      console.log(`Product detail UI verified: ${pages.length} pages; no writes performed.`);
    }
    return;
  }

  for (const item of pending) await fs.writeFile(item.absolutePath, item.next, 'utf8');
  console.log(`Product detail UI synchronized: ${pending.length} page(s) written.`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
