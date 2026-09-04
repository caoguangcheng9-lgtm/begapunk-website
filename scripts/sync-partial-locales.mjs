import { promises as fs } from 'node:fs';
import path from 'node:path';
import { discoveryExcludedPageSet } from './discovery-exclusions.mjs';

const root = path.resolve(import.meta.dirname, '..');
const config = JSON.parse(await fs.readFile(path.join(root, 'i18n', 'config.json'), 'utf8'));
const discoveryExcludedPages = discoveryExcludedPageSet(config);
const write = process.argv.includes('--write');
const activeLanguageCodes = new Set(config.activeLanguageCodes || []);
const activeLanguages = config.languages.filter((language) => activeLanguageCodes.has(language.code));
const partialLanguagePages = new Map(
  Object.entries(config.partialLanguagePages || {}).map(([languageCode, pages]) => [
    languageCode,
    new Set(pages),
  ]),
);
const partialLanguages = config.languages.filter((language) => partialLanguagePages.has(language.code));
const languageLabels = {
  en: 'Language',
  de: 'Sprache',
  fr: 'Langue',
  ja: '言語',
  ru: 'Язык',
};
const languageChangeHandler = 'if(this.value)window.location.href=window.BegapunkLanguageUrl?window.BegapunkLanguageUrl(this.value):this.value';

function pageUrl(languageCode, pageName) {
  const suffix = pageName === 'index.html' ? '' : pageName;
  return languageCode === config.sourceLanguage.code
    ? `${config.siteUrl}/${suffix}`
    : `${config.siteUrl}/${languageCode}/${suffix}`;
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
  const partials = partialLanguages.filter((language) => partialLanguagePages.get(language.code).has(pageName));
  return [config.sourceLanguage, ...activeLanguages, ...partials];
}

function alternateMarkup(pageName) {
  return languagesForPage(pageName)
    .map((language) => `<link rel="alternate" hreflang="${language.code}" href="${pageUrl(language.code, pageName)}">`)
    .concat(`<link rel="alternate" hreflang="x-default" href="${pageUrl(config.sourceLanguage.code, pageName)}">`)
    .join('\n');
}

function switcherMarkup(currentLanguageCode, pageName) {
  const options = languagesForPage(pageName).map((language) => {
    const selected = language.code === currentLanguageCode ? ' selected' : '';
    return `<option value="${switcherReference(currentLanguageCode, language.code, pageName)}"${selected}>${language.label}</option>`;
  }).join('');
  const label = languageLabels[currentLanguageCode] || languageLabels.en;
  return `<div class="i18n-switcher" data-no-translate><label class="sr-only" for="language-${currentLanguageCode}">${label}</label><select id="language-${currentLanguageCode}" aria-label="${label}" onchange="${languageChangeHandler}">${options}</select></div>`;
}

function patchHtml(html, currentLanguageCode, pageName) {
  let next = html.replace(/[ \t]*<link\s+rel=["']alternate["']\s+hreflang=["'][^"']+["'][^>]*>\r?\n?/gi, '');
  const alternates = alternateMarkup(pageName);
  if (!/<link\s+rel=["']canonical["']/i.test(next)) {
    throw new Error(`${currentLanguageCode}/${pageName}: canonical link is missing.`);
  }
  next = next.replace(/^([ \t]*)(<link\s+rel=["']canonical["'][^>]*>)/im, (_, indentation, canonical) => {
    const indentedAlternates = alternates
      .split('\n')
      .map((line) => `${indentation}${line}`)
      .join('\n');
    return `${indentedAlternates}\n${indentation}${canonical}`;
  });
  const switcher = switcherMarkup(currentLanguageCode, pageName);
  if (!/<div class=["']i18n-switcher["'][\s\S]*?<\/div>/i.test(next)) {
    throw new Error(`${currentLanguageCode}/${pageName}: language switcher is missing.`);
  }
  return next.replace(/<div class=["']i18n-switcher["'][\s\S]*?<\/div>/i, switcher);
}

function pageNameFromUrl(url) {
  const pathname = new URL(url).pathname;
  return pathname.endsWith('/') ? 'index.html' : path.posix.basename(pathname);
}

function sitemapAlternates(pageName) {
  return languagesForPage(pageName)
    .map((language) => `    <xhtml:link rel="alternate" hreflang="${language.code}" href="${pageUrl(language.code, pageName)}" />`)
    .concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${pageUrl(config.sourceLanguage.code, pageName)}" />`)
    .join('\n');
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

async function readOptionalFile(fileName) {
  try {
    return await fs.readFile(fileName, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return '';
    throw error;
  }
}

function firstLastmod(lastmodMaps, url) {
  for (const lastmods of lastmodMaps) {
    const value = lastmods.get(url);
    if (value) return value;
  }
  return null;
}

function inheritedLastmod(languageCode, pageName, primaryLastmodMaps, fallbackLastmodMaps = []) {
  const localizedUrl = pageUrl(languageCode, pageName);
  const sourceUrl = pageUrl(config.sourceLanguage.code, pageName);
  return firstLastmod(primaryLastmodMaps, localizedUrl)
    || firstLastmod(primaryLastmodMaps, sourceUrl)
    || firstLastmod(fallbackLastmodMaps, localizedUrl)
    || firstLastmod(fallbackLastmodMaps, sourceUrl);
}

function sitemapUrlBlock(languageCode, pageName, primaryLastmodMaps, fallbackLastmodMaps = []) {
  const lastmod = inheritedLastmod(languageCode, pageName, primaryLastmodMaps, fallbackLastmodMaps);
  const lastmodMarkup = lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : '';
  return `  <url>\n    <loc>${pageUrl(languageCode, pageName)}</loc>\n${lastmodMarkup}${sitemapAlternates(pageName)}\n  </url>`;
}

async function syncFile(fileName, expected) {
  let current = '';
  try {
    current = await fs.readFile(fileName, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (current === expected) return false;
  if (write) {
    await fs.mkdir(path.dirname(fileName), { recursive: true });
    await fs.writeFile(fileName, expected, 'utf8');
  }
  return true;
}

let changed = 0;
const partialPageNames = new Set([...partialLanguagePages.values()].flatMap((pages) => [...pages]));
for (const pageName of partialPageNames) {
  for (const language of languagesForPage(pageName)) {
    const fileName = language.code === config.sourceLanguage.code
      ? path.join(root, pageName)
      : path.join(root, language.code, pageName);
    const current = await fs.readFile(fileName, 'utf8');
    const expected = patchHtml(current, language.code, pageName);
    if (current !== expected) {
      changed += 1;
      if (write) await fs.writeFile(fileName, expected, 'utf8');
    }
  }
}

const i18nSitemapPath = path.join(root, 'sitemap-i18n.xml');
const i18nSitemap = await fs.readFile(i18nSitemapPath, 'utf8');
const i18nLastmods = sitemapLastmods(i18nSitemap);
const expectedI18nSitemap = i18nSitemap.replace(/  <url>[\s\S]*?<\/url>/g, (block) => {
  const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1];
  if (!loc) return block;
  const pageName = pageNameFromUrl(loc);
  if (!partialPageNames.has(pageName)) return block;
  const stripped = block.replace(/\n\s*<xhtml:link\b[^>]*\/>/g, '');
  return stripped.replace(/(\n\s*<\/url>)/, `\n${sitemapAlternates(pageName)}$1`);
});
if (await syncFile(i18nSitemapPath, expectedI18nSitemap)) changed += 1;

const excludedPages = new Set([...(config.sitemapExcludedPages || []), ...discoveryExcludedPages]);
for (const language of partialLanguages) {
  const partialSitemapPath = path.join(root, `sitemap-${language.code}.xml`);
  const existingPartialLastmods = sitemapLastmods(await readOptionalFile(partialSitemapPath));
  const urls = [...partialLanguagePages.get(language.code)]
    .filter((pageName) => !excludedPages.has(pageName))
    .map((pageName) => sitemapUrlBlock(language.code, pageName, [i18nLastmods], [existingPartialLastmods]));
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`;
  if (await syncFile(partialSitemapPath, sitemap)) changed += 1;
}

// A language promoted from a partial funnel to a full site must not leave a
// second locale-only sitemap behind.  Treat those files and robots declarations
// as managed stale state so the promotion is atomic and repeatable.
const partialLanguageCodes = new Set(partialLanguages.map((language) => language.code));
for (const language of config.languages) {
  if (partialLanguageCodes.has(language.code)) continue;
  const staleSitemapPath = path.join(root, `sitemap-${language.code}.xml`);
  try {
    await fs.access(staleSitemapPath);
    changed += 1;
    if (write) await fs.unlink(staleSitemapPath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

const robotsPath = path.join(root, 'robots.txt');
const robotsSource = await fs.readFile(robotsPath, 'utf8');
const stalePartialSitemapPattern = new RegExp(
  `^Sitemap:\\s*${config.siteUrl.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}/sitemap-(${config.languages.map((language) => language.code).join('|')})\\.xml\\s*\\r?\\n?`,
  'gmi',
);
const expectedRobots = robotsSource.replace(stalePartialSitemapPattern, (line, languageCode) => (
  partialLanguageCodes.has(languageCode) ? line : ''
));
if (await syncFile(robotsPath, expectedRobots)) changed += 1;

if (changed && !write) {
  console.error(`Partial locale synchronization required: ${changed} file(s) differ. Run npm run partial-locales:sync.`);
  process.exit(1);
}

console.log(`Partial locale synchronization ${write ? 'completed' : 'verified'}: ${changed} file(s) ${write ? 'updated' : 'differ'}.`);
