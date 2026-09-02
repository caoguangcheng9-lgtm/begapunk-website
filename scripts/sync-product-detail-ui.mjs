import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import { drawingBackedUiContract, drawingBackedPublicStep } from './lib/drawing-backed-product-facts.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODE = process.argv[2] || '';
const EXPECTED_MODEL_COUNT = 16;
const EXPECTED_PAGE_COUNT = 64;
const EXPECTED_STYLE_HASH = '7D81DA13137D9D1435ABCABF962E8E46C20DB03F6B52F8BA45F2E71E9EAAF9FB';
const EXPECTED_SHARED_CSS_HASH = 'AE6C0B5B1635D80BE23A1705F50AB53A354CD02BCA705194DE3E8BEAEF26F818';
const EXPECTED_SHARED_JS_HASH = 'C3881432F1C303A918E38752AC66A23973896E90C45F616F7EA0F5C464ABEA59';
const PRODUCT_STYLE_VERSION = '20260828-product-compat2';
const PRODUCT_SCRIPT_VERSION = '20260822-product-faq1';
const LOCALE_PREFIXES = ['', 'de', 'ja', 'ru'];
const PANEL_NAMES = ['specs', 'compat', 'install', 'downloads'];
const JUMP_LINKS = Object.freeze([
  Object.freeze({ key: 'specs', href: '#panel-specs' }),
  Object.freeze({ key: 'compat', href: '#panel-compat' }),
  Object.freeze({ key: 'install', href: '#panel-install' }),
  Object.freeze({ key: 'downloads', href: '#panel-downloads' }),
  Object.freeze({ key: 'faq', href: '#faq' }),
]);
const KEY_SPEC_LABEL_KEYS = Object.freeze([
  'performance', 'body', 'seal', 'passages', 'mount', 'media', 'leadTime', 'ports', 'protection', 'channels', 'price', 'moq', 'warranty', 'delivery', 'quality',
]);
const EXPECTED_MODEL_KEY_SPEC_KEYS = Object.freeze({
  'BP-1P-0003': Object.freeze(['performance', 'body', 'passages', 'ports', 'media', 'leadTime']),
  'BP-1P-0006': Object.freeze(['performance', 'ports', 'body', 'passages', 'media', 'leadTime']),
  'BP-2P-0001': Object.freeze(['performance', 'body', 'passages', 'mount', 'media', 'leadTime']),
  'BP-2P-0002': Object.freeze(['performance', 'ports', 'body', 'passages', 'media', 'leadTime']),
  'BP-2P-08-0001': Object.freeze(['passages', 'price', 'leadTime', 'warranty', 'delivery', 'quality']),
  'BP-2P-130-0001': Object.freeze(['performance', 'body', 'passages', 'mount', 'media', 'leadTime']),
  'BP-2P-16-0001': Object.freeze(['performance', 'body', 'passages', 'mount', 'media', 'leadTime']),
  'BP-2P-30-0001': Object.freeze(['performance', 'body', 'passages', 'mount', 'media', 'leadTime']),
  'BP-2P-50-0001': Object.freeze(['performance', 'protection', 'passages', 'mount', 'media', 'leadTime']),
  'BP-2P-95-0005': Object.freeze(['passages', 'price', 'leadTime', 'warranty', 'delivery', 'quality']),
  'BP-3P-0004': Object.freeze(['passages', 'price', 'leadTime', 'warranty', 'delivery', 'quality']),
  'BP-3P-0006': Object.freeze(['performance', 'ports', 'body', 'passages', 'media', 'leadTime']),
  'BP-3P-0007': Object.freeze(['passages', 'price', 'leadTime', 'warranty', 'delivery', 'quality']),
  'BP-3P-S06-0001': Object.freeze(['channels', 'performance', 'body', 'seal', 'mount', 'leadTime']),
  'BP-4P-30-0001': Object.freeze(['performance', 'body', 'passages', 'mount', 'media', 'leadTime']),
  'BP-8P-0001': Object.freeze(['performance', 'body', 'passages', 'mount', 'media', 'leadTime']),
});
const MANUAL_COPY_PATH = path.join(ROOT, 'i18n', 'manual', 'product-detail-ui.json');
const EXPECTED_UI_COPY = Object.freeze({
  en: Object.freeze({
    skipLink: 'Skip to main content',
    productInformationLabel: 'Product information',
    modelLabel: 'Model',
    productImagesLabel: 'Product images',
    onThisPageLabel: 'On this page',
    jumpToLabel: 'Jump to:',
    shareMenuLabel: 'Share',
    keyProductParametersLabel: 'Key product parameters',
    primaryActionLabel: 'Get a Quote',
    secondaryActionLabel: 'Download 3D Model (.step)',
    stepDownloadLabel: 'Download 3D Model (.step)',
    leadTimeValue: 'About 20 calendar days after payment',
  }),
  de: Object.freeze({
    skipLink: 'Zum Hauptinhalt springen',
    productInformationLabel: 'Produktinformationen',
    modelLabel: 'Modell',
    productImagesLabel: 'Produktbilder',
    onThisPageLabel: 'Auf dieser Seite',
    jumpToLabel: 'Direkt zu:',
    shareMenuLabel: 'Teilen',
    keyProductParametersLabel: 'Wichtige Produktparameter',
    primaryActionLabel: 'Angebot anfordern',
    secondaryActionLabel: 'STEP-Datei anfordern',
    stepDownloadLabel: '3D-Modell (.step) herunterladen',
    leadTimeValue: 'Etwa 20 Kalendertage nach Zahlungseingang',
  }),
  ja: Object.freeze({
    skipLink: 'メインコンテンツへ移動',
    productInformationLabel: '製品情報',
    modelLabel: '型式',
    productImagesLabel: '製品画像',
    onThisPageLabel: 'このページ内',
    jumpToLabel: '移動先：',
    shareMenuLabel: 'シェア',
    keyProductParametersLabel: '主要製品仕様',
    primaryActionLabel: '見積もりを依頼',
    secondaryActionLabel: 'STEPデータを依頼',
    stepDownloadLabel: '3Dモデル（.step）をダウンロード',
    leadTimeValue: '入金後、約20暦日',
  }),
  ru: Object.freeze({
    skipLink: 'Перейти к основному содержанию',
    productInformationLabel: 'Информация о продукте',
    modelLabel: 'Модель',
    productImagesLabel: 'Изображения продукта',
    onThisPageLabel: 'На этой странице',
    jumpToLabel: 'Перейти к:',
    shareMenuLabel: 'Поделиться',
    keyProductParametersLabel: 'Основные параметры изделия',
    primaryActionLabel: 'Запросить предложение',
    secondaryActionLabel: 'Запросить файл STEP',
    stepDownloadLabel: 'Скачать 3D-модель (.step)',
    leadTimeValue: 'Около 20 календарных дней после оплаты',
  }),
});
const SHARE_CHANNELS = Object.freeze([
  Object.freeze({ key: 'linkedin', legacyClass: 'share-linkedin', label: 'LinkedIn' }),
  Object.freeze({ key: 'x', legacyClass: 'share-twitter', label: 'X' }),
  Object.freeze({ key: 'facebook', legacyClass: 'share-facebook', label: 'Facebook' }),
  Object.freeze({ key: 'whatsapp', legacyClass: 'share-whatsapp', label: 'WhatsApp' }),
]);

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

function normalizedShareHref(value) {
  return String(value || '').replaceAll('&amp;', '&').replaceAll('&#x26;', '&');
}

function localizedProductUrl(relativePath) {
  return `https://www.begapunk.com/${relativePath.replaceAll('\\', '/')}`;
}

function localizedShareHref(channel, href, relativePath) {
  const parsed = new URL(href);
  const productUrl = localizedProductUrl(relativePath);
  if (channel === 'linkedin') parsed.searchParams.set('url', productUrl);
  else if (channel === 'x') parsed.searchParams.set('url', productUrl);
  else if (channel === 'facebook') parsed.searchParams.set('u', productUrl);
  else if (channel === 'whatsapp') {
    const existing = String(parsed.searchParams.get('text') || '')
      .replace(/https:\/\/www\.begapunk\.com\/[^\s]+\.html/giu, '')
      .replace(/\s+-\s*$/u, '')
      .trim();
    parsed.searchParams.set('text', existing ? `${existing} - ${productUrl}` : productUrl);
  } else throw new Error(`${relativePath}: unsupported share channel ${channel}.`);
  return parsed.toString();
}

function modelForFile(relativePath) {
  return path.basename(relativePath, '.html');
}

function keySpecKeysForModel(contract, model, relativePath) {
  const keys = contract.modelKeySpecKeys?.[model];
  if (!Array.isArray(keys) || keys.length < 6) {
    throw new Error(`${relativePath}: approved key-spec category contract is missing or too short.`);
  }
  return keys;
}

function shareOptionsFromDocument($, relativePath) {
  const canonical = $('a.pd-share-option');
  if (canonical.length) {
    if (canonical.length !== SHARE_CHANNELS.length) {
      throw new Error(`${relativePath}: expected ${SHARE_CHANNELS.length} canonical share links; found ${canonical.length}.`);
    }
    return SHARE_CHANNELS.map((channel, index) => {
      const anchor = canonical.eq(index);
      if (anchor.attr('data-share-channel') !== channel.key) {
        throw new Error(`${relativePath}: canonical ${channel.label} share link is out of order.`);
      }
      const href = localizedShareHref(channel.key, normalizedShareHref(anchor.attr('href')), relativePath);
      if (!href) throw new Error(`${relativePath}: canonical ${channel.label} share href is empty.`);
      return { ...channel, href };
    });
  }

  return SHARE_CHANNELS.map((channel) => {
    const anchor = $(`a.${channel.legacyClass}`);
    if (anchor.length !== 1) {
      throw new Error(`${relativePath}: expected one legacy ${channel.label} share link; found ${anchor.length}.`);
    }
    const href = localizedShareHref(channel.key, normalizedShareHref(anchor.attr('href')), relativePath);
    if (!href) throw new Error(`${relativePath}: legacy ${channel.label} share href is empty.`);
    return { ...channel, href };
  });
}

function compactShareMenuMarkup(options, copy, eol) {
  return [
    '   <details class="pd-share-menu" data-search-exclude>',
    `    <summary class="pd-share-trigger">${escapeText(copy.shareMenuLabel)}</summary>`,
    '    <div class="pd-share-options">',
    ...options.map((option) => (
      `     <a class="pd-share-option notranslate" data-share-channel="${option.key}" href="${escapeAttribute(option.href)}" target="_blank" rel="noopener noreferrer" translate="no">${option.label}</a>`
    )),
    '    </div>',
    '   </details>',
  ].join(eol);
}

function jumpNavMarkup(copy, eol) {
  const links = [];
  JUMP_LINKS.forEach((item, index) => {
    if (index) links.push('   <span class="pd-separator" aria-hidden="true">·</span>');
    links.push(`   <a href="${item.href}">${escapeText(copy.jumpLinks[item.key])}</a>`);
  });
  return [
    `  <nav class="pd-jump-nav" aria-label="${escapeAttribute(copy.onThisPageLabel)}">`,
    `   <span class="pd-jump-label">${escapeText(copy.jumpToLabel)}</span>`,
    ...links,
    '  </nav>',
  ].join(eol);
}

function keySpecsMarkup(keys, values, copy, eol) {
  if (keys.length !== values.length) {
    throw new Error(`Key-spec markup requires matching keys and values; found ${keys.length}/${values.length}.`);
  }
  const valueMarkup = (value) => {
    const parts = String(value).split('\n');
    if (parts.length <= 1) return escapeText(parts[0]);
    return parts.map((part, index) => {
      const span = `<span style="display:block">${escapeText(part)}</span>`;
      return index === parts.length - 1
        ? span
        : `${span}<span style="display:block;border-top:1px solid #e7e9ed;margin:7px 0;"></span> `;
    }).join('');
  };
  return [
    `  <dl class="pd-key-specs" aria-label="${escapeAttribute(copy.keyProductParametersLabel)}">`,
    ...keys.map((key, index) => (
      `   <div class="pd-key-spec" data-spec-key="${key}"><dt>${escapeText(copy.keySpecLabels[key])}</dt><dd>${valueMarkup(values[index])}</dd></div>`
    )),
    '  </dl>',
  ].join(eol);
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
  if (contract?.schemaVersion !== 5) throw new Error('Product-detail UI schemaVersion must be 5.');
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

  const expectedModels = Object.keys(EXPECTED_MODEL_KEY_SPEC_KEYS).sort();
  const actualModels = Object.keys(contract.modelKeySpecKeys || {}).sort();
  if (actualModels.join(',') !== expectedModels.join(',')) {
    throw new Error('Product-detail UI modelKeySpecKeys must exactly cover the 16 approved models.');
  }
  for (const model of expectedModels) {
    const actual = contract.modelKeySpecKeys[model];
    const expected = EXPECTED_MODEL_KEY_SPEC_KEYS[model];
    if (!Array.isArray(actual) || actual.length !== expected.length || actual.join(',') !== expected.join(',')) {
      throw new Error(`${model}: key-spec category order does not match the approved model contract.`);
    }
  }

  const expectedKeys = [
    'jumpLinks',
    'jumpToLabel',
    'keyProductParametersLabel',
    'keySpecLabels',
    'keySpecPropertyNames',
    'keySpecValueOverrides',
    'leadTimeValue',
    'modelLabel',
    'onThisPageLabel',
    'primaryActionLabel',
    'productImagesLabel',
    'productInformationLabel',
    'secondaryActionLabel',
    'shareMenuLabel',
    'skipLink',
    'stepDownloadLabel',
  ].sort();
  const scalarKeys = Object.keys(EXPECTED_UI_COPY.en);
  for (const locale of localeKeys) {
    const copy = contract.locales[locale];
    if (Object.keys(copy || {}).sort().join(',') !== expectedKeys.join(',')) {
      throw new Error(`${locale}: product-detail UI keys do not match the contract.`);
    }
    for (const key of scalarKeys) {
      if (typeof copy[key] !== 'string' || !copy[key].trim()) {
        throw new Error(`${locale}.${key} must be a non-empty string.`);
      }
      if (copy[key] !== EXPECTED_UI_COPY[locale][key]) {
        throw new Error(`${locale}.${key} does not match the approved localization.`);
      }
    }

    const jumpKeys = Object.keys(copy.jumpLinks || {}).sort();
    const expectedJumpKeys = JUMP_LINKS.map((item) => item.key).sort();
    if (jumpKeys.join(',') !== expectedJumpKeys.join(',')) {
      throw new Error(`${locale}.jumpLinks must exactly cover the five approved jump targets.`);
    }
    for (const key of jumpKeys) {
      if (typeof copy.jumpLinks[key] !== 'string' || !copy.jumpLinks[key].trim()) {
        throw new Error(`${locale}.jumpLinks.${key} must be a non-empty string.`);
      }
    }

    const labelKeys = Object.keys(copy.keySpecLabels || {}).sort();
    if (labelKeys.join(',') !== [...KEY_SPEC_LABEL_KEYS].sort().join(',')) {
      throw new Error(`${locale}.keySpecLabels must exactly cover the ten approved categories.`);
    }
    for (const key of labelKeys) {
      if (typeof copy.keySpecLabels[key] !== 'string' || !copy.keySpecLabels[key].trim()) {
        throw new Error(`${locale}.keySpecLabels.${key} must be a non-empty string.`);
      }
    }

    const propertyKeys = Object.keys(copy.keySpecPropertyNames || {}).sort();
    if (propertyKeys.join(',') !== ['media', 'mount'].join(',')) {
      throw new Error(`${locale}.keySpecPropertyNames must exactly cover media and mount.`);
    }
    for (const key of propertyKeys) {
      if (typeof copy.keySpecPropertyNames[key] !== 'string' || !copy.keySpecPropertyNames[key].trim()) {
        throw new Error(`${locale}.keySpecPropertyNames.${key} must be a non-empty string.`);
      }
    }

    const overrides = copy.keySpecValueOverrides || {};
    for (const model of Object.keys(overrides)) {
      for (const key of Object.keys(overrides[model] || {})) {
        const value = overrides[model][key];
        const allowed = (model === 'BP-2P-50-0001' && key === 'media')
          || ['price', 'moq', 'warranty', 'delivery', 'passages', 'quality'].includes(key);
        if (!allowed || typeof value !== 'string' || !value.trim()) {
          throw new Error(`${locale}.keySpecValueOverrides contains an unsupported or empty override (${model}.${key}).`);
        }
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

function validateFinalStructure(source, relativePath, copy, contract) {
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
  const detailGrid = $('.pd-grid');
  if (detailGrid.length !== 1
    || detailGrid.children('.pd-gallery').first().get(0) !== galleries.get(0)
    || detailGrid.children('.pd-info').first().get(0) !== informationRegions.get(0)) {
    errors.push('image/information source order');
  }
  const legacyQuickLinks = informationRegions.children('div[style]').filter((_, element) => (
    String($(element).attr('style') || '').includes('display:flex')
    && $(element).find('a[href^="#panel-"]').length > 0
  ));
  if (legacyQuickLinks.length !== 0) errors.push('retired shortcut links');

  const jumpNav = informationRegions.children('nav.pd-jump-nav');
  const jumpLabel = jumpNav.children('.pd-jump-label');
  const jumpAnchors = jumpNav.children('a');
  const jumpSeparators = jumpNav.children('.pd-separator[aria-hidden="true"]');
  if (jumpNav.length !== 1
    || jumpNav.attr('aria-label') !== copy.onThisPageLabel
    || jumpLabel.length !== 1
    || jumpLabel.text().trim() !== copy.jumpToLabel
    || jumpAnchors.length !== JUMP_LINKS.length
    || jumpSeparators.length !== JUMP_LINKS.length - 1) {
    errors.push('first-view jump navigation');
  } else {
    JUMP_LINKS.forEach((item, index) => {
      if (jumpAnchors.eq(index).attr('href') !== item.href
        || jumpAnchors.eq(index).text().trim() !== copy.jumpLinks[item.key]) {
        errors.push(`jump link ${item.key}`);
      }
    });
  }

  const primaryActions = informationRegions.children('.pd-actions');
  const primaryActionLinks = primaryActions.children('a');
  const hasPublicStep = drawingBackedPublicStep(localeForFile(relativePath), modelForFile(relativePath));
  let primaryValid = primaryActions.length === 1
    && String(primaryActionLinks.eq(0).attr('href') || '').includes('request=quote')
    && primaryActionLinks.eq(0).hasClass('btn-primary')
    && primaryActionLinks.eq(0).text().trim() === copy.primaryActionLabel;
  if (hasPublicStep) {
    primaryValid = primaryValid
      && primaryActionLinks.length === 1;
  } else {
    primaryValid = primaryValid
      && primaryActionLinks.length === 2
      && String(primaryActionLinks.eq(1).attr('href') || '').includes('request=3d-step')
      && primaryActionLinks.eq(1).hasClass('btn-secondary')
      && primaryActionLinks.eq(1).text().trim() === copy.secondaryActionLabel;
  }
  if (!primaryValid) {
    errors.push('primary action hierarchy');
  }
  const utilityRegion = informationRegions.children('.pd-utility-links');
  const utilityLinks = utilityRegion.children('a.pd-utility-link');
  const utilitySeparators = utilityRegion.children('.pd-separator[aria-hidden="true"]');
  const supportingHref = utilityLinks.eq(0).attr('href') || '';
  const supportingActionIsPdf = /\.pdf(?:$|[?#])/i.test(supportingHref)
    && utilityLinks.eq(0).attr('download') !== undefined;
  const supportingActionIsVerifiedDrawing = supportingHref.includes('request=verified-drawing');
  let utilityValid = utilityRegion.length === 1
    && (supportingActionIsPdf || supportingActionIsVerifiedDrawing)
    && utilityRegion.find('a[href="product-comparison.html"]').length === 0;
  if (hasPublicStep) {
    const stepHref = utilityLinks.eq(1).attr('href') || '';
    const stepActionIsStep = /\.step(?:[^a-z0-9]|$)/i.test(stepHref)
      && utilityLinks.eq(1).attr('download') !== undefined
      && utilityLinks.eq(1).text().trim() === copy.stepDownloadLabel;
    utilityValid = utilityValid
      && utilityRegion.children().length === 5
      && utilityLinks.length === 2
      && utilitySeparators.length === 2
      && stepActionIsStep;
  } else {
    utilityValid = utilityValid
      && utilityRegion.children().length === 3
      && utilityLinks.length === 1
      && utilitySeparators.length === 1;
  }
  if (!utilityValid) {
    errors.push('utility action hierarchy');
  }

  const model = modelForFile(relativePath);
  const expectedSpecKeys = keySpecKeysForModel(contract, model, relativePath);
  const drawingContract = drawingBackedUiContract(localeForFile(relativePath), model);
  const keySpecs = informationRegions.children('dl.pd-key-specs');
  const keySpecItems = keySpecs.children('div.pd-key-spec');
  if (keySpecs.length !== 1
    || keySpecs.attr('aria-label') !== copy.keyProductParametersLabel
    || keySpecItems.length !== expectedSpecKeys.length) {
    errors.push(`${expectedSpecKeys.length} key product parameters`);
  } else {
    keySpecItems.each((index, element) => {
      const item = $(element);
      const key = expectedSpecKeys[index];
      if (item.attr('data-spec-key') !== key
        || item.children('dt').length !== 1
        || item.children('dt').text().trim() !== copy.keySpecLabels[key]
        || item.children('dd').length !== 1
        || !item.children('dd').text().trim()) {
        errors.push(`key product parameter ${index + 1}`);
      }
      const overrideKeys = ['passages', 'price', 'moq', 'warranty', 'delivery', 'quality'];
      const expectedValue = overrideKeys.includes(key) && copy.keySpecValueOverrides?.[model]?.[key]
        ? copy.keySpecValueOverrides[model][key]
        : (key === 'leadTime' ? copy.leadTimeValue : drawingContract?.keyValues?.[key]);
      if (expectedValue && item.children('dd').text().replace(/\s+/g, ' ').trim() !== expectedValue.replace(/\s+/g, ' ').trim()) {
        errors.push(`key product parameter ${key} value`);
      }
    });
  }
  if ($('.pd-highlights,.pd-hl').length !== 0) errors.push('retired first-view highlights');
  if ($('.pd-price-note').length !== 0) errors.push('retired first-view price note');
  if ($('.social-share-wrap,.social-share,.share-btn,.pd-share-link').length !== 0) {
    errors.push('retired social-share controls');
  }
  if ($('.pd-share-footer').length !== 0) errors.push('retired footer share controls');
  const shareMenu = utilityRegion.children('details.pd-share-menu[data-search-exclude]');
  const shareTrigger = shareMenu.children('summary.pd-share-trigger');
  const shareOptions = shareMenu.children('.pd-share-options').children('a.pd-share-option');
  if (shareMenu.length !== 1 || shareMenu.attr('open') !== undefined
    || shareTrigger.length !== 1 || shareTrigger.text().trim() !== copy.shareMenuLabel
    || shareOptions.length !== SHARE_CHANNELS.length) {
    errors.push('first-view share menu structure');
  } else {
    const expectedProductUrl = localizedProductUrl(relativePath);
    SHARE_CHANNELS.forEach((channel, index) => {
      const option = shareOptions.eq(index);
      const href = normalizedShareHref(option.attr('href'));
      const relTokens = String(option.attr('rel') || '').split(/\s+/);
      let parsed;
      try {
        parsed = new URL(href);
      } catch {
        errors.push(`share ${channel.key} URL`);
        return;
      }
      if (option.attr('data-share-channel') !== channel.key
        || option.text().trim() !== channel.label
        || option.attr('target') !== '_blank'
        || !relTokens.includes('noopener')
        || !relTokens.includes('noreferrer')
        || option.attr('translate') !== 'no'
        || !option.hasClass('notranslate')
        || option.attr('aria-label') !== undefined) {
        errors.push(`share ${channel.key} attributes`);
      }
      if (channel.key === 'linkedin'
        && (parsed.hostname !== 'www.linkedin.com'
          || parsed.pathname !== '/sharing/share-offsite/'
          || parsed.searchParams.get('url') !== expectedProductUrl)) {
        errors.push('share linkedin destination');
      }
      if (channel.key === 'x'
        && (parsed.hostname !== 'twitter.com'
          || parsed.pathname !== '/intent/tweet'
          || parsed.searchParams.get('url') !== expectedProductUrl
          || !parsed.searchParams.get('text'))) {
        errors.push('share x destination');
      }
      if (channel.key === 'facebook'
        && (parsed.hostname !== 'www.facebook.com'
          || parsed.pathname !== '/sharer/sharer.php'
          || parsed.searchParams.get('u') !== expectedProductUrl)) {
        errors.push('share facebook destination');
      }
      if (channel.key === 'whatsapp'
        && (parsed.hostname !== 'api.whatsapp.com'
          || parsed.pathname !== '/send'
          || !String(parsed.searchParams.get('text') || '').includes(expectedProductUrl))) {
        errors.push('share whatsapp destination');
      }
    });
  }
  if ($('[class*="pd-pilot-"],body.page-product-detail-pilot').length !== 0
    || $('link[href*="product-detail-first-view-pilot.css"]').length !== 0) {
    errors.push('retired pilot markers');
  }
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
  faqs.each((index, element) => {
    const item = $(element);
    const summary = item.children('summary.faq-question');
    const shouldBeOpen = index === 0;
    if ((item.attr('open') !== undefined) !== shouldBeOpen || item.children('.faq-answer').length !== 1
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
  if ($(`link[href="${prefix}css/product-detail.css?v=${PRODUCT_STYLE_VERSION}"]`).length !== 1) errors.push('product CSS resource');
  const productScripts = $(`script[src="${prefix}js/product-detail.js?v=${PRODUCT_SCRIPT_VERSION}"][defer]`);
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

  const globalCss = `<link rel="stylesheet" href="${prefix}css/style.css?v=20260817-cls1">`;
  const productCss = `<link rel="stylesheet" href="${prefix}css/product-detail.css?v=${PRODUCT_STYLE_VERSION}">`;
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

  let faqIndex = 0;
  next = replaceRegexExact(
    next,
    /<div class="faq-item">([\s\S]*?)<button class="faq-question" onclick="toggleFAQ\(this\)">([\s\S]*?)<\/button>([\s\S]*?)<div class="faq-answer">([\s\S]*?)<\/div>(\s*)<\/div>/g,
    (_, beforeQuestion, question, beforeAnswer, answer, trailing) => {
      const open = faqIndex === 0 ? ' open' : '';
      faqIndex += 1;
      return `<details class="faq-item"${open}>${beforeQuestion}<summary class="faq-question">${question}</summary>`
        + `${beforeAnswer}<div class="faq-answer">${answer}</div>${trailing}</details>`;
    },
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
  const productScript = `<script defer src="${prefix}js/product-detail.js?v=${PRODUCT_SCRIPT_VERSION}"></script>`;
  next = replaceLiteralOnce(next, navScript, `${productScript}${eol}${navScript}`, `${relativePath} JS resource`);

  assertFrozenSnapshot(protectedBefore, frozenSnapshot(next), relativePath);
  return next;
}

function firstViewProtectedSnapshot(source) {
  const $ = load(source, { decodeEntities: false });
  $('link[rel="stylesheet"][href*="css/product-detail.css?v="]').attr('href', '__PRODUCT_DETAIL_CSS__');
  $('script[src*="js/product-detail.js?v="]').attr('src', '__PRODUCT_DETAIL_JS__');
  $('link[rel="stylesheet"][href*="product-detail-first-view-pilot.css"]').remove();
  $('body').removeClass('page-product-detail-pilot');
  const information = $('.pd-info');
  information.children('div[style]').filter((_, element) => (
    String($(element).attr('style') || '').includes('display:flex')
    && $(element).find('a[href^="#panel-"]').length > 0
  )).remove();
  information.children(
    '.pd-price-note,.pd-actions,.pd-utility-links,.social-share-wrap,.pd-highlights,.pd-key-specs,nav.pd-jump-nav,nav.pd-pilot-jump',
  ).remove();
  information.children('.pd-sku').text('__MODEL_LABEL__');
  $('style').filter((_, element) => (
    /#panel-compat\s+\.compat-grid/u.test($(element).text())
    && /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/u.test($(element).text())
  )).remove();
  $('.pd-share-footer').remove();
  $('.pd-technical-note').removeClass('pd-technical-note');
  return normalizedEol($.html()).replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
}

function anchorHref(anchor) {
  return anchor.match(/\bhref="([^"]+)"/)?.[1] || '';
}

function asUtilityLink(anchor, relativePath) {
  if (countOccurrences(anchor, 'class="pd-utility-link"') === 1) return anchor;
  if (countOccurrences(anchor, 'class="btn btn-secondary"') === 1) {
    return anchor.replace('class="btn btn-secondary"', 'class="pd-utility-link"');
  }
  throw new Error(`${relativePath}: supporting action is not an approved secondary button or utility link.`);
}

function withoutDecorativeActionEmoji(anchor) {
  return anchor.replace(/>(\s*)(?:🔧|📄)\s*/u, '>$1');
}

function withActionLabel(anchor, label) {
  return anchor.replace(/>[^<>]*<\/a>$/u, `>${escapeText(label)}</a>`);
}

function actionSetsFromDocument($, relativePath) {
  const locale = localeForFile(relativePath);
  const model = modelForFile(relativePath);
  const hasPublicStep = drawingBackedPublicStep(locale, model);
  const information = $('.pd-info');
  const actionRegion = information.children('.pd-actions');
  if (actionRegion.length !== 1) {
    throw new Error(`${relativePath}: expected one product action block; found ${actionRegion.length}.`);
  }
  const actionAnchors = actionRegion.children('a').toArray().map((element) => $.html(element));
  let primary;
  let utility;
  if (hasPublicStep && [1, 2].includes(actionAnchors.length)) {
    const utilityRegion = information.children('.pd-utility-links');
    const utilityAnchors = utilityRegion.children('a.pd-utility-link').toArray().map((element) => $.html(element));
    if (utilityRegion.length !== 1 || ![1, 2].includes(utilityAnchors.length)) {
      throw new Error(`${relativePath}: expected one or two drawing utilities for the public STEP model; found ${utilityAnchors.length}.`);
    }
    primary = actionAnchors.slice(0, 1);
    utility = utilityAnchors;
  } else if (actionAnchors.length === 4) {
    primary = actionAnchors.slice(0, 2);
    const legacyUtilities = actionAnchors.slice(2);
    if (anchorHref(legacyUtilities[1]) !== 'product-comparison.html') {
      throw new Error(`${relativePath}: legacy supporting actions do not end with product comparison.`);
    }
    utility = legacyUtilities.slice(0, 1);
  } else if (actionAnchors.length === 2) {
    const utilityRegion = information.children('.pd-utility-links');
    const utilityAnchors = utilityRegion.children('a.pd-utility-link').toArray().map((element) => $.html(element));
    if (utilityRegion.length !== 1 || ![1, 2].includes(utilityAnchors.length)) {
      throw new Error(`${relativePath}: expected one drawing utility, optionally followed by legacy comparison; found ${utilityAnchors.length}.`);
    }
    if (utilityAnchors.length === 2 && anchorHref(utilityAnchors[1]) !== 'product-comparison.html') {
      throw new Error(`${relativePath}: the second legacy utility must be product comparison.`);
    }
    primary = actionAnchors;
    utility = utilityAnchors.slice(0, 1);
  } else {
    throw new Error(`${relativePath}: expected two or four product actions; found ${actionAnchors.length}.`);
  }

  primary = primary.map(withoutDecorativeActionEmoji);
  utility = utility.map((anchor) => asUtilityLink(withoutDecorativeActionEmoji(anchor), relativePath));
  if (!anchorHref(primary[0]).includes('request=quote')
    || (!hasPublicStep && !anchorHref(primary[1]).includes('request=3d-step'))
    || (!/\.pdf(?:$|[?#])/i.test(anchorHref(utility[0]))
      && !anchorHref(utility[0]).includes('request=verified-drawing'))) {
    throw new Error(`${relativePath}: product actions do not match quote / STEP / PDF-or-drawing order.`);
  }
  return { primary, utility };
}

function visibleKeySpecText($, element) {
  const clone = $(element).clone();
  clone.find('.icon').remove();
  return clone.text().replace(/^\s*✓\s*/u, '').replace(/\s+/g, ' ').trim();
}

function visibleProductPropertyValue($, propertyName, relativePath) {
  const matches = $('#panel-specs tr').filter((_, element) => (
    $(element).children('th').length === 1
    && $(element).children('th').text().replace(/\s+/g, ' ').trim() === propertyName
  ));
  if (matches.length !== 1 || matches.children('td').length !== 1) {
    throw new Error(`${relativePath}: expected one visible product property ${JSON.stringify(propertyName)}; found ${matches.length}.`);
  }
  const value = matches.children('td').text().replace(/\s+/g, ' ').trim();
  if (!value) throw new Error(`${relativePath}: visible product property ${JSON.stringify(propertyName)} is empty.`);
  return value;
}

function supplementalKeySpecValue($, model, key, copy, relativePath) {
  const override = copy.keySpecValueOverrides?.[model]?.[key];
  if (typeof override === 'string' && override.trim()) return override.trim();
  const propertyName = copy.keySpecPropertyNames?.[key];
  if (!propertyName) {
    throw new Error(`${relativePath}: no approved source property is configured for supplemental key spec ${key}.`);
  }
  return visibleProductPropertyValue($, propertyName, relativePath);
}

function keySpecValuesFromDocument($, relativePath, contract, copy) {
  const model = modelForFile(relativePath);
  const locale = localeForFile(relativePath);
  const keys = keySpecKeysForModel(contract, model, relativePath);
  const drawingContract = drawingBackedUiContract(locale, model);
  if (!drawingContract) throw new Error(`${relativePath}: drawing-backed first-view contract is missing.`);
  const finalItems = $('.pd-info > .pd-key-specs > .pd-key-spec');
  const existingValues = new Map();
  if (finalItems.length) {
    if (finalItems.length !== keys.length) {
      throw new Error(`${relativePath}: expected ${keys.length} existing semantic key specs; found ${finalItems.length}.`);
    }
    finalItems.each((_, element) => {
      const item = $(element);
      const key = item.attr('data-spec-key');
      const value = item.children('dd').text().replace(/\s+/g, ' ').trim();
      if (!key || !value) throw new Error(`${relativePath}: an existing semantic key-spec key or value is empty.`);
      existingValues.set(key, value);
    });
  }

  const highlights = $('.pd-info > .pd-highlights > .pd-hl');
  if (!finalItems.length && ![4, 6].includes(highlights.length)) {
    throw new Error(`${relativePath}: expected four candidate or six original highlights; found ${highlights.length}.`);
  }
  const legacyValues = highlights.map((_, element) => visibleKeySpecText($, element)).get();
  if (legacyValues.some((value) => !value)) throw new Error(`${relativePath}: a legacy key-spec value is empty.`);

  return keys.map((key, index) => {
    if (key === 'leadTime') return copy.leadTimeValue;
    const commercialOverrideKeys = ['passages', 'price', 'moq', 'warranty', 'delivery', 'quality'];
    const override = commercialOverrideKeys.includes(key)
      ? copy.keySpecValueOverrides?.[model]?.[key]
      : undefined;
    if (override && override.trim()) return override.trim();
    if (Object.hasOwn(drawingContract.keyValues, key)) return drawingContract.keyValues[key];
    if (existingValues.has(key)) return existingValues.get(key);
    if (legacyValues[index]) return legacyValues[index];
    return supplementalKeySpecValue($, model, key, copy, relativePath);
  });
}

function replaceGovernedFirstView(source, markup, relativePath, eol) {
  const modelMatches = [...source.matchAll(/<div\b[^>]*class=(['"])[^'"]*\bpd-sku\b[^'"]*\1[^>]*>[\s\S]*?<\/div>/gi)];
  if (modelMatches.length !== 1) {
    throw new Error(`${relativePath}: expected one first-view model boundary; found ${modelMatches.length}.`);
  }
  const contentStart = modelMatches[0].index + modelMatches[0][0].length;
  const informationEndPattern = /\r?\n[ \t]*<\/div>\r?\n(?:[ \t]*<\/div>)?[ \t]*<\/section>/;
  const informationEnd = source.slice(contentStart).search(informationEndPattern);
  if (informationEnd < 0) throw new Error(`${relativePath}: product-information closing boundary is missing.`);
  return source.slice(0, contentStart)
    + eol
    + markup
    + source.slice(contentStart + informationEnd);
}

function removeRetiredCompatGridInlineStyle(source, relativePath) {
  const pattern = /^[ \t]*<style>\s*@media\s*\(min-width:\s*769px\)\s*\{\s*#panel-compat\s+\.compat-grid\s*\{\s*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);\s*\}\s*\}\s*<\/style>\r?\n?/gmi;
  const matches = source.match(pattern) || [];
  if (matches.length > 1) throw new Error(`${relativePath}: duplicate retired compatibility-grid inline styles.`);
  return matches.length ? source.replace(pattern, '') : source;
}

function transformFirstView(source, relativePath, contract) {
  const protectedBefore = firstViewProtectedSnapshot(source);
  const locale = localeForFile(relativePath);
  const copy = contract.locales[locale];
  const model = modelForFile(relativePath);
  const hasPublicStep = drawingBackedPublicStep(locale, model);
  const keys = keySpecKeysForModel(contract, model, relativePath);
  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  const $ = load(source, { decodeEntities: false });
  const actions = actionSetsFromDocument($, relativePath);
  const shareOptions = shareOptionsFromDocument($, relativePath);
  const keySpecValues = keySpecValuesFromDocument($, relativePath, contract, copy);
  let next = removeRetiredCompatGridInlineStyle(source, relativePath);

  next = replaceRegexExact(
    next,
    /(<div\b[^>]*class=(['"])[^'"]*\bpd-sku\b[^'"]*\2[^>]*>)[\s\S]*?(<\/div>)/gi,
    (_, start, _quote, end) => `${start}${escapeText(copy.modelLabel)}: ${escapeText(model)}${end}`,
    1,
    `${relativePath} product model label`,
  );

  next = replaceRegexExact(
    next,
    /(<link rel="stylesheet" href="(?:\.\.\/)?css\/product-detail\.css)\?v=[^"]+(">)/g,
    (_, start, end) => `${start}?v=${PRODUCT_STYLE_VERSION}${end}`,
    1,
    `${relativePath} product CSS cache key`,
  );
  next = replaceRegexExact(
    next,
    /(<script defer(?:="")? src="(?:\.\.\/)?js\/product-detail\.js)\?v=[^"]+("><\/script>)/g,
    (_, start, end) => `${start}?v=${PRODUCT_SCRIPT_VERSION}${end}`,
    1,
    `${relativePath} product JS cache key`,
  );

  const pilotStyleCount = (next.match(/^[ \t]*<link rel="stylesheet" href="(?:\.\.\/)?css\/product-detail-first-view-pilot\.css\?v=[^"]+">\r?\n?/gm) || []).length;
  if (pilotStyleCount > 1) throw new Error(`${relativePath}: multiple pilot stylesheet links were found.`);
  if (pilotStyleCount) {
    next = replaceRegexExact(
      next,
      /^[ \t]*<link rel="stylesheet" href="(?:\.\.\/)?css\/product-detail-first-view-pilot\.css\?v=[^"]+">\r?\n?/gm,
      '',
      1,
      `${relativePath} retired pilot stylesheet`,
    );
  }
  const pilotBodyClassCount = countOccurrences(next, ' page-product-detail-pilot');
  if (pilotBodyClassCount > 1) throw new Error(`${relativePath}: duplicate pilot body classes were found.`);
  if (pilotBodyClassCount) next = next.replace(' page-product-detail-pilot', '');

  const governedMarkup = [
    jumpNavMarkup(copy, eol),
    '  <div class="pd-actions">',
    `   ${withActionLabel(actions.primary[0], copy.primaryActionLabel)}`,
    ...(!hasPublicStep
      ? [`   ${withActionLabel(actions.primary[1], copy.secondaryActionLabel)}`]
      : []),
    '  </div>',
    '  <div class="pd-utility-links">',
    `   ${actions.utility[0]}`,
    '   <span class="pd-separator" aria-hidden="true">·</span>',
    ...(hasPublicStep ? [
      `   <a href="${resourcePrefix(relativePath)}downloads/${model}.step" class="pd-utility-link" download="">${copy.stepDownloadLabel}</a>`,
      '   <span class="pd-separator" aria-hidden="true">·</span>',
    ] : []),
    compactShareMenuMarkup(shareOptions, copy, eol),
    '  </div>',
    keySpecsMarkup(keys, keySpecValues, copy, eol),
  ].join(eol);
  next = replaceGovernedFirstView(next, governedMarkup, relativePath, eol);

  const footerSharePattern = /^[ \t]*<div class="pd-share-footer"(?: data-search-exclude)?>[\s\S]*?<\/details>\r?\n[ \t]*<\/div>\r?\n?/gm;
  const footerShareCount = (next.match(footerSharePattern) || []).length;
  if (footerShareCount > 1) throw new Error(`${relativePath}: multiple footer share controls were found.`);
  if (footerShareCount) {
    next = replaceRegexExact(next, footerSharePattern, '', 1, `${relativePath} retired footer share control`);
  }

  validateFinalStructure(next, relativePath, copy, contract);
  const protectedAfter = firstViewProtectedSnapshot(next);
  if (protectedAfter !== protectedBefore) {
    let differenceIndex = 0;
    const sharedLength = Math.min(protectedBefore.length, protectedAfter.length);
    while (differenceIndex < sharedLength && protectedBefore[differenceIndex] === protectedAfter[differenceIndex]) {
      differenceIndex += 1;
    }
    throw new Error(
      `${relativePath}: content outside the governed first-view regions changed at normalized index ${differenceIndex}; `
      + `before=${JSON.stringify(protectedBefore.slice(differenceIndex, differenceIndex + 120))}; `
      + `after=${JSON.stringify(protectedAfter.slice(differenceIndex, differenceIndex + 120))}.`,
    );
  }
  return next;
}

function normalizeFirstViewWhitespace(source) {
  return source.replace(
    /(<div\b[^>]*class=(['"])[^'"]*\bpd-sku\b[^'"]*\2[^>]*>[\s\S]*?<\/div>\r?\n)(?:[ \t]*\r?\n)+([ \t]*<nav class="pd-jump-nav")/g,
    '$1$3',
  );
}

async function discoverPages() {
  const facts = JSON.parse(await fs.readFile(path.join(ROOT, 'data', 'product-drawing-facts.json'), 'utf8'));
  const rootNames = Object.keys(facts.products || {})
    .map((model) => `${model}.html`)
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
    let next = hasFinalMarker ? source : transformLegacyPage(source, relativePath, contract);
    // Rebuild the governed first-view block on every run so approved copy changes
    // migrate existing canonical pages as well as legacy pages. The transform
    // freezes every byte outside the governed block and is idempotent.
    next = transformFirstView(next, relativePath, contract);
    next = normalizeFirstViewWhitespace(next);
    validateFinalStructure(next, relativePath, copy, contract);
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
