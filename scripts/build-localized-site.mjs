import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import crypto from 'node:crypto';
import { load } from 'cheerio';

const sourceRoot = path.resolve(import.meta.dirname, '..');
const i18nRoot = path.join(sourceRoot, 'i18n');
const config = JSON.parse(await fs.readFile(path.join(i18nRoot, 'config.json'), 'utf8'));
const glossary = JSON.parse(await fs.readFile(path.join(i18nRoot, 'glossary.json'), 'utf8'));
const activeLanguageCodes = new Set(config.activeLanguageCodes || config.languages.map((language) => language.code));
const activeLanguages = config.languages.filter((language) => activeLanguageCodes.has(language.code));
const mode = process.argv[process.argv.indexOf('--mode') + 1] || 'extract';
const catalogPath = path.join(i18nRoot, 'source-catalog.json');
const cacheRoot = process.env.I18N_CACHE_ROOT
  ? path.resolve(process.env.I18N_CACHE_ROOT)
  : path.join(i18nRoot, 'cache');
const outputRoot = process.env.I18N_OUTPUT_ROOT
  ? path.resolve(process.env.I18N_OUTPUT_ROOT)
  : sourceRoot;
const excludedSelector = config.excludedSelectors.join(',');
const translatableMetaSelectors = [
  'meta[name="description"]',
  'meta[property="og:title"]',
  'meta[property="og:description"]',
  'meta[name="twitter:title"]',
  'meta[name="twitter:description"]',
];

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
    records.push({ type: 'html', element, source });
    markCovered(element);
  };

  const addTextNode = (node) => {
    if (coveredTextNodes.has(node)) return;
    const parent = $(node).parent();
    if (parent.closest(excludedSelector).length) return;
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

async function loadPages() {
  const pages = [];
  for (const pageName of config.pages) {
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
    pages: config.pages,
    entries,
  };
  await fs.writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
  console.log(`Extracted ${entries.length} unique strings from ${config.pages.length} pages.`);
  console.log(`Catalog: ${catalogPath}`);
  return catalog;
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

function localizeRelativeReference(value, pilotPages) {
  if (!value || value.startsWith('#') || value.startsWith('/') || /^(?:[a-z]+:|\/\/)/i.test(value)) return value;
  const match = value.match(/^([^?#]*)([?#].*)?$/);
  const pathname = match?.[1] || value;
  const suffix = match?.[2] || '';
  if (!pathname) return value;
  const normalized = pathname.replace(/^\.\//, '');
  if (pilotPages.has(normalized)) return `${normalized}${suffix}`;
  return `../${normalized}${suffix}`;
}

function updateJsonLd($, languageCode, pageName) {
  const englishUrl = pageUrl(config.sourceLanguage.code, pageName);
  const localizedUrl = pageUrl(languageCode, pageName);
  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      const data = JSON.parse($(element).html());
      const visit = (value) => {
        if (Array.isArray(value)) return value.map(visit);
        if (!value || typeof value !== 'object') return value === englishUrl ? localizedUrl : value;
        for (const [key, child] of Object.entries(value)) value[key] = visit(child);
        return value;
      };
      const localized = visit(data);
      if (!Array.isArray(localized) && localized && typeof localized === 'object') localized.inLanguage = languageCode;
      $(element).text(JSON.stringify(localized));
    } catch {
      // Existing JSON-LD validity is handled by the release verifier.
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
  const switcher = `<div class="i18n-switcher" data-no-translate><label class="sr-only" for="language-${currentLanguage}">Language</label><select id="language-${currentLanguage}" aria-label="Language" onchange="if(this.value)window.location.href=this.value">${options}</select></div>`;
  const mobileToggle = $('.mobile-toggle').first();
  if (mobileToggle.length) mobileToggle.before(switcher);
  else $('.header-inner').first().append(switcher);
}

function applyTranslations(page, language, catalog, cache) {
  const { $, records, pageName } = page;
  const idBySource = new Map(catalog.entries.map((entry) => [entry.source, entry.id]));
  for (const record of records) {
    const id = idBySource.get(record.source);
    const translated = cache.translations[id];
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
  updateJsonLd($, language.code, pageName);
  return $.html().replace(/[ \t]+$/gm, '');
}

async function writeLocalizedSearchIndex(language, outputDirectory) {
  const searchIndex = JSON.parse(await fs.readFile(path.join(sourceRoot, 'search-index.json'), 'utf8'));
  const localizedItems = [];
  for (const item of searchIndex) {
    if (!config.pages.includes(item.url)) {
      localizedItems.push(item);
      continue;
    }
    const html = await fs.readFile(path.join(outputDirectory, item.url), 'utf8');
    const $ = load(html, { decodeEntities: false });
    const content = $('body').clone();
    content.find('script,style,header,nav,footer,.cookie-banner,.i18n-switcher').remove();
    localizedItems.push({
      ...item,
      title: $('title').text().trim() || item.title,
      description: $('meta[name="description"]').attr('content')?.trim() || item.description,
      h1: $('h1').first().text().replace(/\s+/g, ' ').trim() || item.h1,
      h2s: $('h2').map((_, element) => $(element).text().replace(/\s+/g, ' ').trim()).get().filter(Boolean),
      body: content.text().replace(/\s+/g, ' ').trim(),
    });
  }
  await fs.writeFile(
    path.join(outputDirectory, 'search-index.json'),
    `${JSON.stringify(localizedItems, null, 2)}\n`,
    'utf8',
  );
}

async function buildLocalizedPages(catalog) {
  const pages = await loadPages();
  for (const language of activeLanguages) {
    const cachePath = path.join(cacheRoot, `${language.code}.json`);
    const cache = JSON.parse(await fs.readFile(cachePath, 'utf8'));
    const missingCount = catalog.entries.filter((entry) => !cache.translations[entry.id]).length;
    if (missingCount) throw new Error(`${language.code}: ${missingCount} translations are missing.`);
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
    console.log(`${language.code}: built ${pages.length} localized pages.`);
  }
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
  return `<div class="i18n-switcher" data-no-translate><label class="sr-only" for="language-${currentLanguage}">Language</label><select id="language-${currentLanguage}" aria-label="Language" onchange="if(this.value)window.location.href=this.value">${options}</select></div>`;
}

async function integrateEnglishPages() {
  for (const pageName of config.pages) {
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
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, html, 'utf8');
  }
}

async function writeInternationalSitemap() {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [];
  for (const language of [config.sourceLanguage, ...activeLanguages]) {
    for (const pageName of config.pages) {
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
  for (const language of activeLanguages) {
    for (const pageName of config.pages) {
      await fs.access(path.join(outputRoot, language.code, pageName));
    }
  }
  await integrateEnglishPages();
  await writeInternationalSitemap();
  console.log(`Integrated hreflang and language switching into ${config.pages.length} English pages.`);
  console.log(`Generated sitemap-i18n.xml for ${(activeLanguages.length + 1) * config.pages.length} URLs.`);
}

const pages = await loadPages();
let catalog;
try {
  catalog = JSON.parse(await fs.readFile(catalogPath, 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

if (mode === 'extract') {
  await extractCatalog(pages);
} else if (mode === 'translate') {
  catalog ||= await extractCatalog(pages);
  await translateCatalog(catalog);
} else if (mode === 'build') {
  if (!catalog) throw new Error('Run the extract step before building localized pages.');
  await buildLocalizedPages(catalog);
} else if (mode === 'integrate') {
  await integrateLocalizedSite();
} else {
  throw new Error(`Unsupported mode: ${mode}`);
}
