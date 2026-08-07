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
const seoByLanguage = new Map();
for (const language of activeLanguages) {
  const seoPath = path.join(sourceRoot, 'i18n', 'seo', `${language.code}.json`);
  seoByLanguage.set(language.code, JSON.parse(await fs.readFile(seoPath, 'utf8')));
}
const failures = [];
const suspiciousRepeatedTokenPattern = /(?:\bX\s+){5,}\bX\b/;
const suspiciousRepeatedSymbolPattern = /(?:★\s*){5,}|(?:⚙\s*){3,}|(?:✉\s*){2,}|(?:\b\d+\s+[-–—]\s+){5,}/u;
const suspiciousPlaceholderPattern = /__(?:PH|TR|Ф|ТР)?[A-ZА-ЯЁ]{4,8}__|\b(?:PH|TR)AAA[A-Z]\b|\b(?:Ф|ТР)ААА[А-ЯЁ]\b/u;
const suspiciousRussianMachineTranslationPattern = /Корабли|Тяжел(?:ый|ая|ое) долг|Протоптан|Стальная сталь|Ротари|совместн(?:ый|ое) каталог|Следующая статья/iu;
const suspiciousVisibleEnglishPattern = /\b(?:Threaded|Heavy Duty|Rotary Joint|Rotary Union|Ships in|Flange Mount|Download PDF|Details|Previous|Next)\b/i;
const suspiciousLocalizedPhrases = {
  de: /Erzeugnisse|Sonderanfrage|uns benachrichtigen|Multi-Kanal|multi-Kanal|through-Bohrung|Through-Bohrung|Air Kanäle|air Kanäle|Rutschring|Kanal Ausführung|Re-Leitungsführung|Automatisierungstabelle/,
  ja: /据え付け品|電子工学|密集した|回転式移動|空気電気|気圧電気|チャネルカウント|工具細工|真空のコップ|洗剤材料|見直しる|送って下さい|物質的な条件|製造業装置/,
  ru: /Пользователь RFQ|[Пп]ользовательский дизайн|[Мм]ногопропуск|[Мм]ногопроход|роторн(?:ая|ые|ых|ой) таблиц|кажд(?:ый|ую) оснастка|несколько оснастка|весь ротационное|один ротационное|соединение должен|радиальный клиренс|счет станции|счетчик сигналов/,
};
const expectedTeamInitials = ['GC', 'LW', 'SZ'];
const expectedTeamNames = ['GuangCheng Cao', 'Li Wei', 'Sarah Zhang'];
const expectedFounderJobTitle = {
  de: 'Gründer und Ingenieur',
  ja: '創業者・技術責任者',
  ru: 'Основатель и инженер',
};
const expectedOrganizationSlogan = {
  de: 'Spezialist für pneumatische Drehdurchführungen',
  ja: '空圧用ロータリージョイント専門メーカー',
  ru: 'Специалист по пневматическим вращающимся соединениям',
};
const untranslatedStructuredPropertyNames = new Set([
  'Protection rating', 'Pneumatic passages', 'Electrical circuits', 'Electrical contact material',
  'Insulation resistance', 'Surface treatment', 'Hollow bore diameter',
]);
const suspiciousStructuredEnglishPattern = /\b(?:Pneumatic rotary joint|air rotary union|air swivel|rotary joint|inlet|outlet|Threaded mount|Flange mount|Deep groove ball bearing|hours \(rated conditions\)|Zero leakage|pressure tested|Approx\.|Heavy duty|dust-proof structure|hollow bore|mounting holes|Typical applications)\b/i;

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
  const languageCode = owner.split('/')[0];
  if (suspiciousLocalizedPhrases[languageCode]?.test(value)) {
    failures.push(`${owner}: known unnatural localized phrase detected.`);
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

function compactText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function schemaTypes(node) {
  const type = node?.['@type'];
  return new Set((Array.isArray(type) ? type : [type]).filter(Boolean));
}

function schemaNodes(value, found = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => schemaNodes(item, found));
  } else if (value && typeof value === 'object') {
    if (value['@type']) found.push(value);
    Object.values(value).forEach((item) => schemaNodes(item, found));
  }
  return found;
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
    if (language.code !== config.sourceLanguage.code) {
      const seo = seoByLanguage.get(language.code)?.[pageName];
      if (!seo) {
        failures.push(`${language.code}/${pageName}: curated SEO entry is missing.`);
      } else {
        const actual = {
          title: compactText($('title').first().text()),
          description: compactText($('meta[name="description"]').first().attr('content')),
          h1: compactText($('h1').first().text()),
          ogTitle: compactText($('meta[property="og:title"]').first().attr('content')),
          ogDescription: compactText($('meta[property="og:description"]').first().attr('content')),
          twitterTitle: compactText($('meta[name="twitter:title"]').first().attr('content')),
          twitterDescription: compactText($('meta[name="twitter:description"]').first().attr('content')),
        };
        for (const field of ['title', 'description', 'h1']) {
          if (actual[field] !== seo[field]) failures.push(`${language.code}/${pageName}: ${field} does not match curated SEO data.`);
        }
        if (actual.ogTitle !== seo.title || actual.twitterTitle !== seo.title) failures.push(`${language.code}/${pageName}: social title is not localized.`);
        if (actual.ogDescription !== seo.description || actual.twitterDescription !== seo.description) failures.push(`${language.code}/${pageName}: social description is not localized.`);
        if ($('meta[name="keywords"]').length) failures.push(`${language.code}/${pageName}: inherited meta keywords should be removed.`);
      }
    }
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
      const channelModels = $('li').map((_, element) => $(element).text().trim()).get().filter((value) => /^[12]流路：/.test(value));
      if (channelHeading !== '1. 実際の空圧・媒体回路から流路数を決める') failures.push(`${language.code}/${pageName}: channel-count heading is incorrect.`);
      if (channelModels.length !== 2 || !channelModels[0].startsWith('1流路：') || !channelModels[1].startsWith('2流路：')) failures.push(`${language.code}/${pageName}: channel model labels are incorrect.`);
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
        const payload = JSON.parse($(element).html());
        if (language.code !== config.sourceLanguage.code) {
          const contentTypes = new Set(['Article', 'BlogPosting', 'TechArticle', 'WebPage', 'WebSite', 'Product', 'FAQPage', 'HowTo']);
          for (const node of schemaNodes(payload)) {
            const types = schemaTypes(node);
            if ([...types].some((type) => contentTypes.has(type)) && node.inLanguage !== language.code) {
              failures.push(`${language.code}/${pageName}: ${[...types].join('/')} JSON-LD lacks the correct inLanguage.`);
            }
            if (types.has('Organization')) {
              const founders = Array.isArray(node.founder) ? node.founder : (node.founder ? [node.founder] : []);
              if (founders.some((founder) => founder.jobTitle !== expectedFounderJobTitle[language.code])) {
                failures.push(`${language.code}/${pageName}: Organization founder job title is not localized.`);
              }
              if (node.slogan && node.slogan !== expectedOrganizationSlogan[language.code]) {
                failures.push(`${language.code}/${pageName}: Organization slogan is not localized.`);
              }
            }
            if (types.has('Product') && Array.isArray(node.additionalProperty)) {
              for (const property of node.additionalProperty) {
                if (untranslatedStructuredPropertyNames.has(property?.name)) {
                  failures.push(`${language.code}/${pageName}: Product JSON-LD property name is not localized (${property.name}).`);
                }
                if (suspiciousStructuredEnglishPattern.test(String(property?.value || ''))) {
                  failures.push(`${language.code}/${pageName}: Product JSON-LD property value contains untranslated English (${property.name}).`);
                }
              }
            }
            if (types.has('BreadcrumbList') && Array.isArray(node.itemListElement) && node.itemListElement.length) {
              for (const item of node.itemListElement) {
                if (!item?.item || typeof item.item !== 'string') continue;
                try {
                  const itemUrl = new URL(item.item);
                  if (itemUrl.origin === new URL(config.siteUrl).origin) {
                    const itemPage = itemUrl.pathname.split('/').filter(Boolean).at(-1) || 'index.html';
                    if (config.pages.includes(itemPage) && item.item !== pageUrl(language.code, itemPage)) {
                      failures.push(`${language.code}/${pageName}: BreadcrumbList contains a cross-language URL (${item.item}).`);
                    }
                  }
                } catch {
                  failures.push(`${language.code}/${pageName}: BreadcrumbList contains an invalid URL (${item.item}).`);
                }
              }
              const current = node.itemListElement[node.itemListElement.length - 1];
              if (compactText(current?.name) !== seoByLanguage.get(language.code)?.[pageName]?.h1 || current?.item !== pageUrl(language.code, pageName)) {
                failures.push(`${language.code}/${pageName}: BreadcrumbList current page is not localized.`);
              }
            }
            if (types.has('FAQPage')) {
              const visibleFaq = $('.faq-item, .app-faq-item').map((__, item) => ({
                question: compactText($(item).find('.faq-question, h3').first().clone().find('svg, i, .faq-icon, .faq-toggle').remove().end().text()),
                answer: compactText($(item).find('.faq-answer, p').first().text()),
              })).get().filter((item) => item.question && item.answer);
              const schemaFaq = Array.isArray(node.mainEntity) ? node.mainEntity : [];
              if (schemaFaq.length !== visibleFaq.length) {
                failures.push(`${language.code}/${pageName}: FAQ JSON-LD count does not match visible FAQ content.`);
              } else {
                visibleFaq.forEach((item, index) => {
                  if (compactText(schemaFaq[index]?.name) !== item.question || compactText(schemaFaq[index]?.acceptedAnswer?.text) !== item.answer) {
                    failures.push(`${language.code}/${pageName}: FAQ JSON-LD item ${index + 1} does not match visible localized content.`);
                  }
                });
              }
            }
          }
        }
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

const excludedPages = new Set(config.sitemapExcludedPages || []);
const discoverablePages = config.pages.filter((pageName) => !excludedPages.has(pageName));

for (const language of verifiedLanguages) {
  const searchIndexPath = language.code === config.sourceLanguage.code
    ? path.join(localizedRoot, 'search-index.json')
    : path.join(localizedRoot, language.code, 'search-index.json');
  const searchOwner = language.code === config.sourceLanguage.code
    ? 'search-index.json'
    : `${language.code}/search-index.json`;
  try {
    const searchIndexSource = await fs.readFile(searchIndexPath, 'utf8');
    verifyGeneratedText(searchIndexSource, searchOwner);
    const searchIndex = JSON.parse(searchIndexSource);
    if (!Array.isArray(searchIndex) || !searchIndex.length) {
      failures.push(`${searchOwner}: index is empty.`);
    } else {
      const urls = searchIndex.map((record) => record?.url).filter(Boolean);
      const duplicateUrls = [...new Set(urls.filter((url, index) => urls.indexOf(url) !== index))];
      if (urls.length !== discoverablePages.length) failures.push(`${searchOwner}: expected ${discoverablePages.length} records, found ${urls.length}.`);
      duplicateUrls.forEach((url) => failures.push(`${searchOwner}: duplicate URL ${url}.`));
      discoverablePages.forEach((pageName) => {
        if (!urls.includes(pageName)) failures.push(`${searchOwner}: missing ${pageName}.`);
      });
      urls.filter((url) => !discoverablePages.includes(url)).forEach((url) => failures.push(`${searchOwner}: unexpected URL ${url}.`));
    }
  } catch (error) {
    failures.push(`${searchOwner}: missing or invalid (${error.message}).`);
  }
  if (language.code === config.sourceLanguage.code) continue;
  const llmsPath = path.join(localizedRoot, language.code, 'llms.txt');
  try {
    const llmsSource = await fs.readFile(llmsPath, 'utf8');
    verifyGeneratedText(llmsSource, `${language.code}/llms.txt`);
    for (const pageName of config.pages) {
      const expectedUrl = pageUrl(language.code, pageName);
      if (!llmsSource.includes(expectedUrl)) failures.push(`${language.code}/llms.txt: missing ${expectedUrl}.`);
    }
  } catch (error) {
    failures.push(`${language.code}/llms.txt: missing or invalid (${error.message}).`);
  }
}

try {
  const rootLlms = await fs.readFile(path.join(localizedRoot, 'llms.txt'), 'utf8');
  for (const pageName of discoverablePages) {
    const expectedUrl = pageUrl(config.sourceLanguage.code, pageName);
    if (!rootLlms.includes(expectedUrl)) failures.push(`llms.txt: missing ${expectedUrl}.`);
  }
  for (const language of activeLanguages) {
    const localizedLlmsUrl = `${config.siteUrl}/${language.code}/llms.txt`;
    if (!rootLlms.includes(localizedLlmsUrl)) failures.push(`llms.txt: missing localized AI index link ${localizedLlmsUrl}.`);
  }
} catch (error) {
  failures.push(`llms.txt: missing or invalid (${error.message}).`);
}

try {
  const sitemapSource = await fs.readFile(path.join(localizedRoot, 'sitemap.xml'), 'utf8');
  const sitemapUrls = [...sitemapSource.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  const expectedSitemapUrls = discoverablePages.map((pageName) => pageUrl(config.sourceLanguage.code, pageName));
  if (sitemapUrls.length !== expectedSitemapUrls.length) failures.push(`sitemap.xml: expected ${expectedSitemapUrls.length} URLs, found ${sitemapUrls.length}.`);
  expectedSitemapUrls.forEach((url) => {
    if (!sitemapUrls.includes(url)) failures.push(`sitemap.xml: missing ${url}.`);
  });
  sitemapUrls.filter((url) => !expectedSitemapUrls.includes(url)).forEach((url) => failures.push(`sitemap.xml: unexpected ${url}.`));
} catch (error) {
  failures.push(`sitemap.xml: missing or invalid (${error.message}).`);
}

const applicationCasePage = 'case-bp-2p-95-pneumatic-chuck-integration.html';
const unsupportedApplicationCaseClaims = {
  en: /workshop assembly and commissioning|separate compressed-air paths/i,
  de: /Werkstattmontage und Inbetriebnahme|Getrennte Druckluftkreise/i,
  ja: /組立・試運転|独立した空圧回路/,
  ru: /Сборка и пусконаладка|несколько независимых[^.]{0,80}канал/iu,
};
for (const language of verifiedLanguages) {
  const languageRoot = language.code === config.sourceLanguage.code ? localizedRoot : path.join(localizedRoot, language.code);
  try {
    const caseCenter = await fs.readFile(path.join(languageRoot, 'case-studies.html'), 'utf8');
    const product = await fs.readFile(path.join(languageRoot, 'BP-2P-95-0001.html'), 'utf8');
    const detail = await fs.readFile(path.join(languageRoot, applicationCasePage), 'utf8');
    if (!caseCenter.includes(`href="${applicationCasePage}"`)) failures.push(`${language.code}/case-studies.html: application case link is missing.`);
    if (!product.includes(`href="${applicationCasePage}"`)) failures.push(`${language.code}/BP-2P-95-0001.html: application case link is missing.`);
    if (!detail.includes('href="BP-2P-95-0001.html"')) failures.push(`${language.code}/${applicationCasePage}: product backlink is missing.`);
    const $center = load(caseCenter, { decodeEntities: false });
    const $product = load(product, { decodeEntities: false });
    const $detail = load(detail, { decodeEntities: false });
    if ($center('#real-application-cases').length !== 1 || $center('#engineering-selection-examples').length !== 1) {
      failures.push(`${language.code}/case-studies.html: real cases and selection examples are not separated.`);
    }
    if (caseCenter.indexOf('id="real-application-cases"') > caseCenter.indexOf('id="engineering-selection-examples"')) {
      failures.push(`${language.code}/case-studies.html: the real application case category is not first.`);
    }
    if ($product('.app-related-products .app-related-product').first().attr('href') !== applicationCasePage) {
      failures.push(`${language.code}/BP-2P-95-0001.html: the application case is not the first related resource.`);
    }
    for (const selector of ['.cs-hero', '.case-row', '.case-image', '.case-text', '.case-spec-table', '.tech-note', '.cta-section']) {
      if (!$detail(selector).length) failures.push(`${language.code}/${applicationCasePage}: required standard component ${selector} is missing.`);
    }
    if ($detail('.nav-dropdown').length !== 4) failures.push(`${language.code}/${applicationCasePage}: expected four standard navigation dropdowns.`);
    if ($detail('.footer-grid > .footer-brand').length !== 1 || $detail('.footer-grid > div:has(.footer-title)').length !== 4) {
      failures.push(`${language.code}/${applicationCasePage}: standard five-column footer is missing.`);
    }
    if ($detail('.floating-cta .floating-btn.quote').length !== 1 || $detail('.floating-cta .floating-btn.whatsapp').length !== 1) {
      failures.push(`${language.code}/${applicationCasePage}: standard floating quote/WhatsApp actions are missing.`);
    }
    const caseImages = $detail('main .case-image img');
    const detailImages = caseImages.filter((_, element) => /bp-2p-95-pneumatic-connection-detail\.(?:webp|jpg)$/i.test($detail(element).attr('src') || ''));
    const overviewImages = caseImages.filter((_, element) => /bp-2p-95-chuck-assembly-overview\.(?:webp|jpg)$/i.test($detail(element).attr('src') || ''));
    if (detailImages.length !== 1 || overviewImages.length !== 1) failures.push(`${language.code}/${applicationCasePage}: each case photograph must appear exactly once.`);
    caseImages.each((_, element) => {
      if ($detail(element).attr('loading') !== 'lazy') failures.push(`${language.code}/${applicationCasePage}: every case photograph must be lazy-loaded.`);
    });
    if (!/bp-2p-95-pneumatic-connection-detail/i.test($detail('.case-row').first().find('.case-image img').attr('src') || '')) {
      failures.push(`${language.code}/${applicationCasePage}: connection detail is not the primary evidence image.`);
    }
    const visibleDetail = compactText($detail('main').text());
    if (unsupportedApplicationCaseClaims[language.code]?.test(visibleDetail)) {
      failures.push(`${language.code}/${applicationCasePage}: unsupported commissioning or independent-circuit claim detected.`);
    }
  } catch (error) {
    failures.push(`${language.code}/${applicationCasePage}: three-way link verification failed (${error.message}).`);
  }
}

try {
  const sitemapSource = await fs.readFile(path.join(localizedRoot, 'sitemap-i18n.xml'), 'utf8');
  const sitemapUrls = [...sitemapSource.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  const sitemapPages = discoverablePages;
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
  console.log(`BP-2P-95 application-case coverage passed for ${verifiedLanguages.length} localized detail pages, case-center links, product-page links, search indexes, canonical/hreflang sets, JSON-LD language values, and both sitemap sources.`);
}
