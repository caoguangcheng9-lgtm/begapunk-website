import crypto from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const SITEMAP_LASTMOD_STATE = 'i18n/sitemap-lastmod-state.json';

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

function validIsoDate(value) {
  if (!isoDatePattern.test(value || '')) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function buildDate(value = process.env.SITEMAP_LASTMOD_DATE || new Date().toISOString().slice(0, 10)) {
  if (!validIsoDate(value)) {
    throw new Error(`SITEMAP_LASTMOD_DATE must be a real ISO calendar date (YYYY-MM-DD); received ${value || 'empty'}.`);
  }
  return value;
}

function pageUrl(config, languageCode, pageName) {
  const suffix = pageName === 'index.html' ? '' : pageName;
  return languageCode === config.sourceLanguage.code
    ? `${config.siteUrl}/${suffix}`
    : `${config.siteUrl}/${languageCode}/${suffix}`;
}

function pageFile(contentRoot, config, languageCode, pageName) {
  return languageCode === config.sourceLanguage.code
    ? path.join(contentRoot, pageName)
    : path.join(contentRoot, languageCode, pageName);
}

function contentDigest(source) {
  return crypto.createHash('sha256')
    .update(String(source).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n'))
    .digest('hex');
}

function sitemapBlock(url, lastmod, alternates) {
  return `  <url>\n    <loc>${url}</loc>\n    <lastmod>${lastmod}</lastmod>\n${alternates}\n  </url>`;
}

function sitemapDocument(blocks) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${blocks.join('\n')}\n</urlset>\n`;
}

export function parseSitemapLastmodState(source) {
  if (!source) return { schemaVersion: 1, pages: {} };
  const parsed = typeof source === 'string' ? JSON.parse(source) : source;
  if (parsed?.schemaVersion !== 1 || !parsed.pages || typeof parsed.pages !== 'object' || Array.isArray(parsed.pages)) {
    throw new Error('i18n sitemap lastmod state must use schemaVersion 1 and a pages object.');
  }
  for (const [url, entry] of Object.entries(parsed.pages)) {
    if (!url.startsWith('https://')
      || !/^[a-f0-9]{64}$/.test(entry?.contentSha256 || '')
      || !validIsoDate(entry?.lastmod)) {
      throw new Error(`Invalid i18n sitemap lastmod state entry: ${url}`);
    }
  }
  return parsed;
}

export function serializeSitemapLastmodState(state) {
  return `${JSON.stringify(state, null, 2)}\n`;
}

export async function renderInternationalSitemaps({
  contentRoot,
  config,
  previousState = { schemaVersion: 1, pages: {} },
  currentDate,
}) {
  const dateForChangedContent = buildDate(currentDate);
  const activeLanguageCodes = new Set(config.activeLanguageCodes || config.languages.map(({ code }) => code));
  const activeLanguages = config.languages.filter(({ code }) => activeLanguageCodes.has(code));
  const partialLanguagePages = new Map(
    Object.entries(config.partialLanguagePages || {}).map(([languageCode, pages]) => [languageCode, new Set(pages)]),
  );
  const partialLanguages = config.languages.filter(({ code }) => partialLanguagePages.has(code));
  const discoveryExcludedPages = new Set(config.discoveryExcludedPages || []);
  const excludedPages = new Set([...(config.sitemapExcludedPages || []), ...discoveryExcludedPages]);
  const fullLanguages = [config.sourceLanguage, ...activeLanguages];
  const fullPages = config.pages.filter((pageName) => !excludedPages.has(pageName));
  const nextState = { schemaVersion: 1, pages: {} };

  const languagesForPage = (pageName) => [
    ...fullLanguages,
    ...partialLanguages.filter(({ code }) => partialLanguagePages.get(code)?.has(pageName)),
  ];
  const lastmodFor = async (languageCode, pageName) => {
    const url = pageUrl(config, languageCode, pageName);
    const digest = contentDigest(await readFile(pageFile(contentRoot, config, languageCode, pageName), 'utf8'));
    const prior = previousState.pages?.[url];
    const lastmod = prior?.contentSha256 === digest && validIsoDate(prior.lastmod)
      ? prior.lastmod
      : dateForChangedContent;
    nextState.pages[url] = { contentSha256: digest, lastmod };
    return { url, lastmod };
  };
  const alternatesFor = (pageName) => languagesForPage(pageName)
    .map(({ code }) => `    <xhtml:link rel="alternate" hreflang="${code}" href="${pageUrl(config, code, pageName)}" />`)
    .concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${pageUrl(config, config.sourceLanguage.code, pageName)}" />`)
    .join('\n');

  const mainBlocks = [];
  for (const language of fullLanguages) {
    for (const pageName of fullPages) {
      const { url, lastmod } = await lastmodFor(language.code, pageName);
      mainBlocks.push(sitemapBlock(url, lastmod, alternatesFor(pageName)));
    }
  }

  const sitemaps = new Map([['sitemap-i18n.xml', sitemapDocument(mainBlocks)]]);
  for (const language of partialLanguages) {
    const blocks = [];
    for (const pageName of partialLanguagePages.get(language.code)) {
      if (excludedPages.has(pageName)) continue;
      const { url, lastmod } = await lastmodFor(language.code, pageName);
      blocks.push(sitemapBlock(url, lastmod, alternatesFor(pageName)));
    }
    sitemaps.set(`sitemap-${language.code}.xml`, sitemapDocument(blocks));
  }

  return { sitemaps, state: nextState };
}
