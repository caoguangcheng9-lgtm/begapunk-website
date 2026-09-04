import { promises as fs } from 'node:fs';
import path from 'node:path';
import { load } from 'cheerio';
import { discoveryExcludedPageSet } from './discovery-exclusions.mjs';

const root = path.resolve(import.meta.dirname, '..');
const config = JSON.parse(await fs.readFile(path.join(root, 'i18n', 'config.json'), 'utf8'));
const discoveryExcludedPages = discoveryExcludedPageSet(config);
const sitemapExcludedPages = new Set([...(config.sitemapExcludedPages || []), ...discoveryExcludedPages]);
const activeLanguageCodes = new Set(config.activeLanguageCodes || []);
const activeLanguages = config.languages.filter((language) => activeLanguageCodes.has(language.code));
const partialLanguagePages = new Map(
  Object.entries(config.partialLanguagePages || {}).map(([languageCode, pages]) => [languageCode, new Set(pages)]),
);
const partialLanguages = config.languages.filter((language) => partialLanguagePages.has(language.code));
const partialLanguageAssets = new Map(Object.entries(config.partialLanguageAssets || {}));
const failures = [];

function pageUrl(languageCode, pageName) {
  const suffix = pageName === 'index.html' ? '' : pageName;
  return languageCode === config.sourceLanguage.code
    ? `${config.siteUrl}/${suffix}`
    : `${config.siteUrl}/${languageCode}/${suffix}`;
}

function sitemapLastmods(source) {
  const lastmods = new Map();
  for (const match of source.matchAll(/<url>\s*([\s\S]*?)<\/url>/gi)) {
    const block = match[1];
    const loc = block.match(/<loc>\s*([^<]+?)\s*<\/loc>/i)?.[1];
    const lastmod = block.match(/<lastmod>\s*([^<]+?)\s*<\/lastmod>/i)?.[1];
    if (loc && lastmod) lastmods.set(loc, lastmod);
  }
  return lastmods;
}

function switcherReference(currentLanguageCode, targetLanguageCode, pageName) {
  const isHomepage = pageName === 'index.html';
  if (currentLanguageCode === config.sourceLanguage.code) {
    return targetLanguageCode === config.sourceLanguage.code
      ? (isHomepage ? './' : pageName)
      : (isHomepage ? `${targetLanguageCode}/` : `${targetLanguageCode}/${pageName}`);
  }
  if (targetLanguageCode === config.sourceLanguage.code) return isHomepage ? '../' : `../${pageName}`;
  if (targetLanguageCode === currentLanguageCode) return isHomepage ? './' : pageName;
  return isHomepage ? `../${targetLanguageCode}/` : `../${targetLanguageCode}/${pageName}`;
}

function languagesForPage(pageName) {
  return [
    config.sourceLanguage,
    ...activeLanguages,
    ...partialLanguages.filter((language) => partialLanguagePages.get(language.code).has(pageName)),
  ];
}

async function readHtml(languageCode, pageName) {
  const fileName = languageCode === config.sourceLanguage.code
    ? path.join(root, pageName)
    : path.join(root, languageCode, pageName);
  try {
    return load(await fs.readFile(fileName, 'utf8'), { decodeEntities: false });
  } catch (error) {
    failures.push(`${languageCode}/${pageName}: cannot read page (${error.message}).`);
    return null;
  }
}

const i18nLastmods = sitemapLastmods(await fs.readFile(path.join(root, 'sitemap-i18n.xml'), 'utf8'));

for (const partialLanguage of partialLanguages) {
  for (const asset of partialLanguageAssets.get(partialLanguage.code) || []) {
    try {
      const details = await fs.stat(path.join(root, partialLanguage.code, asset));
      if (!details.isFile()) failures.push(`${partialLanguage.code}/${asset}: partial-language asset is not a file.`);
    } catch (error) {
      failures.push(`${partialLanguage.code}/${asset}: cannot read partial-language asset (${error.message}).`);
    }
  }
  for (const pageName of partialLanguagePages.get(partialLanguage.code)) {
    for (const language of languagesForPage(pageName)) {
      const $ = await readHtml(language.code, pageName);
      if (!$) continue;
      const label = `${language.code}/${pageName}`;
      if ($('html').attr('lang') !== language.code) failures.push(`${label}: html lang is incorrect.`);
      if (!$('title').first().text().trim()) failures.push(`${label}: title is missing.`);
      if (!$('meta[name="description"]').attr('content')?.trim()) failures.push(`${label}: meta description is missing.`);
      if ($('h1').length !== 1 || !$('h1').first().text().trim()) failures.push(`${label}: expected one non-empty H1.`);
      if ($('link[rel="canonical"]').attr('href') !== pageUrl(language.code, pageName)) {
        failures.push(`${label}: canonical URL is incorrect.`);
      }

      const expectedLanguages = languagesForPage(pageName);
      const alternates = new Map(
        $('link[rel="alternate"][hreflang]').map((_, element) => [
          [$(element).attr('hreflang'), $(element).attr('href')],
        ]).get(),
      );
      for (const candidate of expectedLanguages) {
        if (alternates.get(candidate.code) !== pageUrl(candidate.code, pageName)) {
          failures.push(`${label}: ${candidate.code} hreflang is missing or incorrect.`);
        }
      }
      if (alternates.get('x-default') !== pageUrl(config.sourceLanguage.code, pageName)) {
        failures.push(`${label}: x-default hreflang is missing or incorrect.`);
      }

      const options = new Map(
        $('.i18n-switcher option[value]').map((_, element) => [
          [$(element).text().trim(), $(element).attr('value')],
        ]).get(),
      );
      for (const candidate of expectedLanguages) {
        if (options.get(candidate.label) !== switcherReference(language.code, candidate.code, pageName)) {
          failures.push(`${label}: ${candidate.code} language-switcher target is missing or incorrect.`);
        }
      }
    }

    const $partial = await readHtml(partialLanguage.code, pageName);
    if (!$partial) continue;
    const visibleText = $partial('body').text().replace(/\s+/g, ' ').trim();
    if (['index.html', 'products.html', 'product-comparison.html'].includes(pageName)
      && !/raccords?\s+tournants?\s+pneumatiques?/i.test(visibleText)) {
      failures.push(`${partialLanguage.code}/${pageName}: primary French pneumatic rotary-union term is missing.`);
    }
    if (pageName === 'index.html' && !/air\s+comprim[ée]/i.test(visibleText)) {
      failures.push(`${partialLanguage.code}/${pageName}: compressed-air qualification is missing.`);
    }
    if ($partial('script[src^="../js/analytics.js?v="]').length !== 1) {
      failures.push(`${partialLanguage.code}/${pageName}: shared consent and analytics script is missing.`);
    }
    if ($partial('script[src*="consent-fr.js"]').length) {
      failures.push(`${partialLanguage.code}/${pageName}: duplicate French consent override must not be loaded.`);
    }
    if (pageName === 'contact.html') {
      if (!$partial('body.contact-rfq-page').length) {
        failures.push(`${partialLanguage.code}/${pageName}: RFQ page body class is missing.`);
      }
      if ($partial('link[rel="stylesheet"][href^="../css/contact-rfq.css?v="]').length !== 1) {
        failures.push(`${partialLanguage.code}/${pageName}: shared RFQ stylesheet is missing.`);
      }
      const form = $partial('form#quoteForm[action="/send_inquiry.php"]');
      if (form.length !== 1) failures.push(`${partialLanguage.code}/${pageName}: RFQ form action is missing.`);
      if (form.find('input[name="source_language"]').attr('value') !== partialLanguage.code) {
        failures.push(`${partialLanguage.code}/${pageName}: source_language must be ${partialLanguage.code}.`);
      }
      if (form.find('input[name="redirect"]').attr('value') !== `${config.siteUrl}/${partialLanguage.code}/thank-you.html`) {
        failures.push(`${partialLanguage.code}/${pageName}: localized thank-you redirect is incorrect.`);
      }
      for (const requiredName of ['email', 'requirements']) {
        if (form.find(`[name="${requiredName}"][required]`).length !== 1) {
          failures.push(`${partialLanguage.code}/${pageName}: required ${requiredName} field is missing.`);
        }
      }
      for (const attributionName of [
        'gclid',
        'gbraid',
        'wbraid',
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_term',
        'utm_content',
        'first_landing_page',
        'initial_referrer',
      ]) {
        if (form.find(`input[type="hidden"][name="${attributionName}"]`).length !== 1) {
          failures.push(`${partialLanguage.code}/${pageName}: hidden ${attributionName} attribution field is missing.`);
        }
      }
    }
    if (partialLanguage.code === 'fr' && pageName === 'privacy.html') {
      if (!/Google Analytics 4/i.test(visibleText)
        || !/efficacit[ée]\s+publicitaire/i.test(visibleText)
        || !/personnalisation\s+publicitaire[^.]{0,160}(?:désactivée|reste\s+désactivée)/i.test(visibleText)) {
        failures.push('fr/privacy.html: Consent Mode v2 measurement scope or personalization boundary is incomplete.');
      }
    }
    if (pageName === 'thank-you.html' && !/noindex/i.test($partial('meta[name="robots"]').attr('content') || '')) {
      failures.push(`${partialLanguage.code}/${pageName}: thank-you page must be noindex.`);
    }
  }

  const sitemapName = `sitemap-${partialLanguage.code}.xml`;
  try {
    const sitemap = await fs.readFile(path.join(root, sitemapName), 'utf8');
    const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
    const partialLastmods = sitemapLastmods(sitemap);
    const expectedLocations = [...partialLanguagePages.get(partialLanguage.code)]
      .filter((pageName) => !sitemapExcludedPages.has(pageName))
      .map((pageName) => pageUrl(partialLanguage.code, pageName));
    if (JSON.stringify(locations) !== JSON.stringify(expectedLocations)) {
      failures.push(`${sitemapName}: localized URL set or order is incorrect.`);
    }
    for (const pageName of partialLanguagePages.get(partialLanguage.code)) {
      if (sitemapExcludedPages.has(pageName)) continue;
      const localizedUrl = pageUrl(partialLanguage.code, pageName);
      const sourceUrl = pageUrl(config.sourceLanguage.code, pageName);
      const expectedLastmod = i18nLastmods.get(localizedUrl) || i18nLastmods.get(sourceUrl);
      if (expectedLastmod && partialLastmods.get(localizedUrl) !== expectedLastmod) {
        failures.push(`${sitemapName}: ${localizedUrl} must inherit lastmod ${expectedLastmod} from sitemap-i18n.xml.`);
      }
    }
  } catch (error) {
    failures.push(`${sitemapName}: cannot read partial sitemap (${error.message}).`);
  }
}

const robots = await fs.readFile(path.join(root, 'robots.txt'), 'utf8');
for (const language of partialLanguages) {
  const expected = `Sitemap: ${config.siteUrl}/sitemap-${language.code}.xml`;
  if (!robots.includes(expected)) failures.push(`robots.txt: missing ${expected}.`);
}

const allowedPartialSitemaps = new Set(partialLanguages.map(({ code }) => `sitemap-${code}.xml`));
const localizedSitemapFiles = (await fs.readdir(root))
  .filter((fileName) => /^sitemap-[a-z]{2}\.xml$/i.test(fileName));
for (const sitemapName of localizedSitemapFiles) {
  if (!allowedPartialSitemaps.has(sitemapName)) {
    failures.push(`${sitemapName}: stale partial-locale sitemap exists for a non-partial language.`);
  }
}

const declaredPartialSitemaps = [...robots.matchAll(/^Sitemap:\s*\S+\/(sitemap-[a-z]{2}\.xml)\s*$/gim)]
  .map((match) => match[1]);
for (const sitemapName of declaredPartialSitemaps) {
  if (!allowedPartialSitemaps.has(sitemapName)) {
    failures.push(`robots.txt: stale partial-locale sitemap declaration (${sitemapName}).`);
  }
}
for (const sitemapName of allowedPartialSitemaps) {
  if (!declaredPartialSitemaps.includes(sitemapName)) {
    failures.push(`robots.txt: missing exact partial-locale sitemap declaration (${sitemapName}).`);
  }
}

if (failures.length) {
  console.error(`Partial locale verification failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Partial locale verification passed for ${partialLanguages.length} language(s) and ${[...partialLanguagePages.values()].reduce((total, pages) => total + pages.size, 0)} localized page(s).`);
