import { promises as fs } from 'node:fs';
import path from 'node:path';
import { load } from 'cheerio';

const sourceRoot = path.resolve(import.meta.dirname, '..');
const config = JSON.parse(await fs.readFile(path.join(sourceRoot, 'i18n', 'config.json'), 'utf8'));
const activeLanguageCodes = new Set(config.activeLanguageCodes || config.languages.map((language) => language.code));
const activeLanguages = config.languages.filter((language) => activeLanguageCodes.has(language.code));
const localizedRoot = process.env.I18N_OUTPUT_ROOT
  ? path.resolve(process.env.I18N_OUTPUT_ROOT)
  : sourceRoot;
const failures = [];
const suspiciousRepeatedTokenPattern = /(?:\bX\s+){5,}\bX\b/;
const suspiciousRepeatedSymbolPattern = /(?:★\s*){5,}|(?:⚙\s*){3,}|(?:✉\s*){2,}|(?:\b\d+\s+[-–—]\s+){5,}/u;
const suspiciousPlaceholderPattern = /__(?:PH|TR|Ф|ТР)?[A-ZА-ЯЁ]{4,8}__|\b(?:PH|TR)AAA[A-Z]\b|\b(?:Ф|ТР)ААА[А-ЯЁ]\b/u;
const suspiciousRussianMachineTranslationPattern = /Корабли|Тяжел(?:ый|ая|ое) долг|Протоптан|Стальная сталь|Ротари|совместн(?:ый|ое) каталог|Следующая статья/iu;
const suspiciousVisibleEnglishPattern = /\b(?:Threaded|Heavy Duty|Rotary Joint|Rotary Union|Ships in|Flange Mount|Download PDF|Details|Previous|Next)\b/i;
const expectedTeamInitials = ['GC', 'LW', 'SZ'];
const expectedTeamNames = ['GuangCheng Cao', 'Li Wei', 'Sarah Zhang'];

function verifyGeneratedText(value, owner) {
  if (value.includes('\uFFFD')) {
    failures.push(`${owner}: Unicode replacement character detected.`);
  }
  if (suspiciousRepeatedTokenPattern.test(value)) {
    failures.push(`${owner}: suspicious repeated X tokens detected.`);
  }
  if (suspiciousRepeatedSymbolPattern.test(value)) {
    failures.push(`${owner}: suspicious repeated symbols detected.`);
  }
  if (suspiciousPlaceholderPattern.test(value)) {
    failures.push(`${owner}: damaged translation placeholder detected.`);
  }
  if (suspiciousRussianMachineTranslationPattern.test(value)) {
    failures.push(`${owner}: known Russian machine-translation artifact detected.`);
  }
}

async function targetExists(target, relativeFromOutput) {
  try {
    const item = await fs.stat(target);
    if (item.isFile()) return true;
  } catch {
    // Fall through to the shared source-asset check.
  }
  try {
    const sourceTarget = path.join(sourceRoot, relativeFromOutput);
    const item = await fs.stat(sourceTarget);
    return item.isFile();
  } catch {
    return false;
  }
}

async function verifyLocalReference(value, ownerPath) {
  if (!value || value.startsWith('#') || /^(?:data:|mailto:|tel:|javascript:|https?:|\/\/)/i.test(value)) return;
  const pathname = value.split('#')[0].split('?')[0];
  if (!pathname) return;
  const target = pathname.startsWith('/')
    ? path.join(localizedRoot, pathname.slice(1))
    : path.resolve(path.dirname(ownerPath), pathname);
  const resolved = pathname.endsWith('/') ? path.join(target, 'index.html') : target;
  let relativeFromOutput = path.relative(localizedRoot, resolved);
  while (relativeFromOutput.startsWith(`..${path.sep}`)) relativeFromOutput = relativeFromOutput.slice(3);
  if (!await targetExists(resolved, relativeFromOutput)) {
    failures.push(`${path.relative(localizedRoot, ownerPath)}: missing local reference ${value}.`);
  }
}

function pageUrl(languageCode, pageName) {
  const suffix = pageName === 'index.html' ? '' : pageName;
  if (languageCode === config.sourceLanguage.code) return `${config.siteUrl}/${suffix}`;
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

const verifiedLanguages = [config.sourceLanguage, ...activeLanguages];
for (const language of verifiedLanguages) {
  for (const pageName of config.pages) {
    const filePath = language.code === config.sourceLanguage.code
      ? path.join(localizedRoot, pageName)
      : path.join(localizedRoot, language.code, pageName);
    let html;
    try {
      html = await fs.readFile(filePath, 'utf8');
    } catch {
      failures.push(`${language.code}/${pageName}: file is missing.`);
      continue;
    }
    verifyGeneratedText(html, `${language.code}/${pageName}`);
    const $ = load(html, { decodeEntities: false });
    if (language.code === 'ru') {
      const visibleBody = $('body').clone();
      visibleBody.find('script,style,noscript,.notranslate,[translate="no"]').remove();
      if (suspiciousVisibleEnglishPattern.test(visibleBody.text())) {
        failures.push(`${language.code}/${pageName}: visible high-risk English residue detected.`);
      }
      for (const attribute of config.translatedAttributes || []) {
        $(`[${attribute}]`).each((_, element) => {
          const value = $(element).attr(attribute) || '';
          if (suspiciousVisibleEnglishPattern.test(value)) {
            failures.push(`${language.code}/${pageName}: high-risk English residue in ${attribute}.`);
          }
        });
      }
    }
    if (pageName === 'about.html') {
      const teamInitials = $('.team-avatar').map((_, element) => $(element).text().trim()).get();
      const teamNames = $('.team-card h3').map((_, element) => $(element).text().trim()).get();
      if (teamInitials.join('|') !== expectedTeamInitials.join('|')) failures.push(`${language.code}/${pageName}: team initials were changed by localization.`);
      if (teamNames.join('|') !== expectedTeamNames.join('|')) failures.push(`${language.code}/${pageName}: team names were changed by localization.`);
    }
    if (pageName === 'faq.html') {
      const categoryIcons = $('.faq-category .icon').map((_, element) => $(element).text().trim()).get();
      const arrows = $('.faq-question .arrow').map((_, element) => $(element).text().trim()).get();
      if (categoryIcons.join('|') !== '?|★|✉|⚙') failures.push(`${language.code}/${pageName}: FAQ category icons were changed by localization.`);
      if (arrows.some((value) => value !== '▼')) failures.push(`${language.code}/${pageName}: FAQ arrows were changed by localization.`);
    }
    if (language.code === 'ja' && pageName === 'blog-rotary-joint-selection.html') {
      const channelHeading = $('h2').map((_, element) => $(element).text().trim()).get().find((value) => value.includes('流路数'));
      const channelModels = $('strong').map((_, element) => $(element).text().trim()).get().filter((value) => value.includes('-in-'));
      if (channelHeading !== '1. 流路数：空気圧回路に合わせ、希望だけで選ばない') failures.push(`${language.code}/${pageName}: channel-count heading is incorrect.`);
      if (channelModels.some((value) => !/^\d+-in-\d+-out$/.test(value))) failures.push(`${language.code}/${pageName}: channel model labels contain translated noise.`);
    }
    if (language.code !== config.sourceLanguage.code) {
      for (const selector of config.browserNoTranslateSelectors || []) {
        $(selector).each((_, element) => {
          const classes = ($(element).attr('class') || '').split(/\s+/);
          if ($(element).attr('translate') !== 'no' || !classes.includes('notranslate')) {
            failures.push(`${language.code}/${pageName}: ${selector} is not protected from browser translation.`);
          }
        });
      }
    }
    if ((html.match(/<!doctype html>/gi) || []).length !== 1) failures.push(`${language.code}/${pageName}: expected one HTML doctype.`);
    if ($('html').attr('lang') !== language.code) failures.push(`${language.code}/${pageName}: incorrect html lang.`);
    if ($('link[rel="canonical"]').attr('href') !== pageUrl(language.code, pageName)) failures.push(`${language.code}/${pageName}: incorrect canonical.`);
    const alternates = new Map($('link[rel="alternate"][hreflang]').map((_, element) => [[$(element).attr('hreflang'), $(element).attr('href')]]).get());
    for (const candidate of [config.sourceLanguage, ...activeLanguages]) {
      if (alternates.get(candidate.code) !== pageUrl(candidate.code, pageName)) failures.push(`${language.code}/${pageName}: incorrect ${candidate.code} hreflang.`);
    }
    if (alternates.get('x-default') !== pageUrl(config.sourceLanguage.code, pageName)) failures.push(`${language.code}/${pageName}: incorrect x-default hreflang.`);
    if (!$('.i18n-switcher select').length) failures.push(`${language.code}/${pageName}: language switcher is missing.`);
    const switcherOptions = new Map($('.i18n-switcher option[value]').map((_, element) => [[$(element).text().trim(), $(element).attr('value')]]).get());
    for (const candidate of verifiedLanguages) {
      const expected = switcherReference(language.code, candidate.code, pageName);
      if (switcherOptions.get(candidate.label) !== expected) failures.push(`${language.code}/${pageName}: incorrect ${candidate.code} switcher target.`);
    }
    $('form#quoteForm, form[action*="send_inquiry.php"]').each((_, form) => {
      if ($(form).find('input[name="source_language"]').attr('value') !== language.code) failures.push(`${language.code}/${pageName}: source_language is missing or incorrect.`);
      const redirect = $(form).find('input[name="redirect"]').attr('value');
      if (redirect && redirect !== pageUrl(language.code, 'thank-you.html')) failures.push(`${language.code}/${pageName}: localized form redirect is incorrect.`);
    });
    $('script[type="application/ld+json"]').each((_, element) => {
      try {
        JSON.parse($(element).html());
      } catch (error) {
        failures.push(`${language.code}/${pageName}: invalid JSON-LD (${error.message}).`);
      }
    });
    for (const element of $('[href], [src], [poster], [action]').toArray()) {
      for (const attribute of ['href', 'src', 'poster', 'action']) {
        await verifyLocalReference($(element).attr(attribute), filePath);
      }
    }
    for (const option of $('.i18n-switcher option[value]').toArray()) {
      await verifyLocalReference($(option).attr('value'), filePath);
    }
  }
}

for (const language of activeLanguages) {
  const searchIndexPath = path.join(localizedRoot, language.code, 'search-index.json');
  try {
    const searchIndexSource = await fs.readFile(searchIndexPath, 'utf8');
    verifyGeneratedText(searchIndexSource, `${language.code}/search-index.json`);
    const searchIndex = JSON.parse(searchIndexSource);
    if (!Array.isArray(searchIndex) || !searchIndex.length) failures.push(`${language.code}/search-index.json: index is empty.`);
  } catch (error) {
    failures.push(`${language.code}/search-index.json: missing or invalid (${error.message}).`);
  }
}

try {
  const sitemapSource = await fs.readFile(path.join(localizedRoot, 'sitemap-i18n.xml'), 'utf8');
  const sitemapUrls = [...sitemapSource.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  const excludedPages = new Set(config.sitemapExcludedPages || []);
  const sitemapPages = config.pages.filter((pageName) => !excludedPages.has(pageName));
  const expectedSitemapUrls = [config.sourceLanguage, ...activeLanguages]
    .flatMap((language) => sitemapPages.map((pageName) => pageUrl(language.code, pageName)));
  if (sitemapUrls.length !== expectedSitemapUrls.length) failures.push(`sitemap-i18n.xml: expected ${expectedSitemapUrls.length} URLs, found ${sitemapUrls.length}.`);
  for (const expectedUrl of expectedSitemapUrls) {
    if (!sitemapUrls.includes(expectedUrl)) failures.push(`sitemap-i18n.xml: missing ${expectedUrl}.`);
  }
  for (const language of [config.sourceLanguage, ...activeLanguages]) {
    for (const pageName of excludedPages) {
      const excludedUrl = pageUrl(language.code, pageName);
      if (sitemapSource.includes(excludedUrl)) failures.push(`sitemap-i18n.xml: excluded URL is present (${excludedUrl}).`);
    }
  }
} catch (error) {
  failures.push(`sitemap-i18n.xml: missing or invalid (${error.message}).`);
}

if (failures.length) {
  console.error(`Localized site verification failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`Localized site verification passed for ${verifiedLanguages.length * config.pages.length} pages.`);
}
