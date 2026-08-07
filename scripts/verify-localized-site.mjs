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
const laserCaseForbiddenClaims = {
  en: /\boxygen\b|\bnitrogen\b|\bcoolant\b|(?:process|assist)[- ]gas|\b\d+(?:\.\d+)?\s*(?:MPa|bar|RPM)\b/i,
  de: /Sauerstoff|Stickstoff|Kühlmittel|Prozessgas|Schneidgas|\b\d+(?:[,.]\d+)?\s*(?:MPa|bar|min⁻¹|U\/min)\b/iu,
  ja: /酸素|窒素|冷却液|クーラント|プロセスガス|アシストガス|\d+(?:\.\d+)?\s*(?:MPa|bar|min⁻¹|回転\/分)/u,
  ru: /кислород|азот|охлаждающ|СОЖ|технологическ(?:ий|ого) газ|вспомогательн(?:ый|ого) газ|\b\d+(?:[,.]\d+)?\s*(?:МПа|бар|об\/мин)\b/iu,
};
const laserPhotoModelBoundary = {
  en: /has not been individually identified as either model/i,
  de: /eindeutige Zuordnung[^.]{0,160}(?:liegt nicht vor|nicht vorliegt)/iu,
  ja: /各写真[^。]{0,120}(?:個別特定|個別に特定)[^。]{0,80}(?:していません|したものではありません)/u,
  ru: /соответстви[ея][^.]{0,180}(?:конкретной модели|отдельн)[^.]{0,120}не установлено/iu,
};
const laserSameCategoryBoundary = {
  en: /same application category[^.]{0,180}not presented as two views of the same machine/i,
  de: /selben Anwendungskategorie[^.]{0,180}nicht als zwei Ansichten derselben Maschine/iu,
  ja: /同じ用途区分[^。]{0,180}同一装置[^。]{0,100}別角度[^。]{0,100}位置付けていません/u,
  ru: /(?:одной категории применения[\s\S]{0,320}не представлены как два (?:вида|ракурса) одной и той же машины|не представлены как два (?:вида|ракурса) одного и того же оборудования[\s\S]{0,320}одной категории применения)/iu,
};
const productPhotoModelBoundary = {
  en: /has not been individually identified as this model/i,
  de: /nicht einzeln als dieses Modell identifiziert/iu,
  ja: /本型式に個別特定したものではありません/u,
  ru: /модель изделия[^.]{0,120}отдельно не идентифицирована/iu,
};
const permittedLaserCaseSafetyBoundary = {
  en: /The confirmed scope for the two standard models is the rear chuck's compressed-air circuits; process or assist-gas transfer is not included\./i,
  de: /$^/,
  ja: /$^/,
  ru: /$^/,
};
const productApplicationForbiddenClaims = {
  en: /\boxygen\b|\bnitrogen\b|\bcoolant\b|(?:process|assist)[- ]gas|(?:clamp|unclamp|purge)\s+(?:port|passage|channel)|(?:port|passage|channel)[^.]{0,40}(?:clamp|unclamp|purge)/i,
  de: /Sauerstoff|Stickstoff|Kühlmittel|Prozessgas|Schneidgas|(?:Spannen|Lösen|Abblasen|Spülluft)[^.]{0,50}(?:Anschluss|Kanal)|(?:Anschluss|Kanal)[^.]{0,50}(?:Spannen|Lösen|Abblasen|Spülluft)/iu,
  ja: /酸素|窒素|冷却液|クーラント|プロセスガス|アシストガス|(?:クランプ|アンクランプ|パージ|吹き飛ばし)[^。]{0,50}(?:ポート|流路)|(?:ポート|流路)[^。]{0,50}(?:クランプ|アンクランプ|パージ|吹き飛ばし)/u,
  ru: /кислород|азот|охлаждающ|СОЖ|технологическ(?:ий|ого) газ|вспомогательн(?:ый|ого) газ|(?:зажим|разжим|продувк)[^.]{0,60}(?:порт|канал)|(?:порт|канал)[^.]{0,60}(?:зажим|разжим|продувк)/iu,
};
const laserApplicationMediaClaims = {
  en: /\boxygen\b|\bnitrogen\b|\bcoolant\b|(?:process|assist)[- ]gas/i,
  de: /Sauerstoff|Stickstoff|Kühlmittel|Prozessgas|Schneidgas/iu,
  ja: /酸素|窒素|冷却液|クーラント|プロセスガス|アシストガス/u,
  ru: /кислород|азот|охлаждающ|СОЖ|технологическ(?:ий|ого) газ|вспомогательн(?:ый|ого) газ/iu,
};
const permittedNegativeMediaClaim = {
  en: /does not establish suitability|outside the verified scope|requires a separately|\bNo\./i,
  de: /keine Freigabe|außerhalb des bestätigten Einsatzbereichs|erfordert ein getrennt|\bNein\./iu,
  ja: /適合を示すものではありません|確認済み用途には含まれません|確認済み範囲外|別系統[^。]{0,80}必要/u,
  ru: /не является подтверждением|не входит в подтверждённую область|требуется отдельно|\bНет\./iu,
};
const laserApplicationNumericClaims = /(?:\b\d+(?:[.,]\d+)?\s*(?:MPa|МПа|bar|бар|RPM|rpm|об\/мин|min⁻¹|L\/min|л\/мин)\b|30\s*%|ISO\s*4414|(?:orifice|bore|孔径|オリフィス|диаметр прохода)[^.;。]{0,40}\d+\s*mm)/iu;
const staleLaserApplicationModels = /BP-2P-0001|BP-3P-0006|BP-2P-130-0001/i;
const expectedLaserApplicationHeadings = {
  en: 'Pneumatic Rotary Unions for Laser Tube Cutting Rear Chucks',
  de: 'Pneumatische Drehdurchführungen für hintere Spannfutter von Laser-Rohrschneidmaschinen',
  ja: 'レーザー管切断機の後方チャック用空圧ロータリジョイント',
  ru: 'Пневматические ротационные соединения для задних патронов станков лазерной резки труб',
};
const rearChuckTerms = {
  en: /rear[- ]chuck/i,
  de: /hinter(?:en|e[msn]?) Spannfutter/iu,
  ja: /後方チャック/u,
  ru: /задн(?:его|ем|ий|их)[^.]{0,40}патрон/iu,
};
const laserMachineTerms = {
  en: /laser tube cutting/i,
  de: /Laser-Rohrschneidmaschinen/iu,
  ja: /レーザー管切断機/u,
  ru: /лазерной резки труб/iu,
};
const caseCenterSearchForbiddenClaims = {
  en: /\boxygen\b|\bnitrogen\b|\bcoolant\b|assist[- ]gas|Laser cutting & packaging/i,
  de: /Sauerstoff|Stickstoff|Kühlmittel|Schneidgas|Begapunk-Prüfrichtung|Portrichtung/iu,
  ja: /酸素|窒素|冷却液|クーラント|アシストガス|現場写真|空圧供給/u,
  ru: /кислород|азот|охлаждающ|СОЖ|Лазерная трубка режет|\bгорный\b|фланцевый рисунок/iu,
};
const localizedCaseCenterEnglishLabels = [
  'Selection item', 'Typical question', 'Begapunk direction', 'Input required',
  'Why it matters', 'Check', 'Required confirmation',
];
const caseCenterCssVersion = 'v=20260807-laser-models';
const caseDetailCssVersion = 'v=20260807-case-integration2';
for (const language of verifiedLanguages) {
  const languageRoot = language.code === config.sourceLanguage.code ? localizedRoot : path.join(localizedRoot, language.code);
  try {
    const caseCenter = await fs.readFile(path.join(languageRoot, 'case-studies.html'), 'utf8');
    const product = await fs.readFile(path.join(languageRoot, 'BP-2P-95-0001.html'), 'utf8');
    const detail = await fs.readFile(path.join(languageRoot, applicationCasePage), 'utf8');
    const laserApplicationPageName = 'application-laser-tube-cutting.html';
    const laserApplication = await fs.readFile(path.join(languageRoot, laserApplicationPageName), 'utf8');
    const verifiedProductPageNames = ['BP-3P-0004.html', 'BP-2P-08-0001.html'];
    const verifiedProductSources = new Map(await Promise.all(verifiedProductPageNames.map(async (pageName) => [
      pageName,
      await fs.readFile(path.join(languageRoot, pageName), 'utf8'),
    ])));
    if (!caseCenter.includes(`href="${applicationCasePage}"`)) failures.push(`${language.code}/case-studies.html: application case link is missing.`);
    if (!product.includes(`href="${applicationCasePage}"`)) failures.push(`${language.code}/BP-2P-95-0001.html: application case link is missing.`);
    if (!detail.includes('href="BP-2P-95-0001.html"')) failures.push(`${language.code}/${applicationCasePage}: product backlink is missing.`);
    const $center = load(caseCenter, { decodeEntities: false });
    const $product = load(product, { decodeEntities: false });
    const $detail = load(detail, { decodeEntities: false });
    const $laserApplication = load(laserApplication, { decodeEntities: false });
    if ($center('#real-application-cases').length !== 1 || $center('#engineering-selection-examples').length !== 1) {
      failures.push(`${language.code}/case-studies.html: real cases and selection examples are not separated.`);
    }
    if (caseCenter.indexOf('id="real-application-cases"') > caseCenter.indexOf('id="engineering-selection-examples"')) {
      failures.push(`${language.code}/case-studies.html: the real application case category is not first.`);
    }
    const realCases = $center('.case-block.real-case');
    if (realCases.length !== 2) failures.push(`${language.code}/case-studies.html: expected exactly two photo-supported real cases.`);
    if (realCases.eq(0).attr('id') !== 'bp-2p-95-pneumatic-chuck' || realCases.eq(1).attr('id') !== 'laser-tube-rear-chuck') {
      failures.push(`${language.code}/case-studies.html: real case ordering must be BP-2P-95 first and laser rear chuck second.`);
    }
    const ordering = [
      caseCenter.indexOf('id="real-application-cases"'),
      caseCenter.indexOf('id="bp-2p-95-pneumatic-chuck"'),
      caseCenter.indexOf('id="laser-tube-rear-chuck"'),
      caseCenter.indexOf('class="case-intro"'),
      caseCenter.indexOf('id="engineering-selection-examples"'),
    ];
    if (ordering.some((position) => position < 0) || ordering.some((position, index) => index > 0 && position <= ordering[index - 1])) {
      failures.push(`${language.code}/case-studies.html: required real-cases, how-to, and selection-example order is incorrect.`);
    }
    if ($center('#offshore').length !== 1 || $center('#cnc').length !== 1 || $center('#laser').length) {
      failures.push(`${language.code}/case-studies.html: engineering examples must contain only offshore and CNC entries.`);
    }
    const $laserCase = $center('#laser-tube-rear-chuck');
    const laserText = compactText($laserCase.text());
    if ($laserCase.length !== 1) {
      failures.push(`${language.code}/case-studies.html: model-neutral laser rear-chuck case is missing.`);
    } else {
      const expectedLaserImages = [
        'laser-tube-rear-chuck-rotary-union-overview.webp',
        'laser-tube-rear-chuck-rotary-union-mounting-detail.webp',
      ];
      for (const imageName of expectedLaserImages) {
        const matches = $laserCase.find(`img[src$="${imageName}"]`);
        if (matches.length !== 1) failures.push(`${language.code}/case-studies.html: ${imageName} must appear exactly once in the laser case.`);
        if (matches.attr('loading') !== 'lazy') failures.push(`${language.code}/case-studies.html: ${imageName} must be lazy-loaded.`);
      }
      const modelLinks = $laserCase.find('a[href^="BP-"]').map((_, element) => $center(element).attr('href')).get();
      const expectedModelLinks = ['BP-3P-0004.html', 'BP-2P-08-0001.html'];
      const uniqueModelLinks = [...new Set(modelLinks)];
      if (uniqueModelLinks.length !== expectedModelLinks.length || expectedModelLinks.some((href) => !uniqueModelLinks.includes(href))) {
        failures.push(`${language.code}/case-studies.html: laser case must link only to the two factory-confirmed application models.`);
      }
      if ($laserCase.find('figure a[href^="BP-"], .case-image a[href^="BP-"]').length) {
        failures.push(`${language.code}/case-studies.html: a photograph must not be linked to a specific product model.`);
      }
      const imageContext = compactText($laserCase.find('figure, figcaption, .case-image').text());
      if (/\bBP-[A-Z0-9-]+\b/i.test(imageContext)) {
        failures.push(`${language.code}/case-studies.html: photograph captions must remain model-neutral.`);
      }
      if (!laserText.includes('BP-3P-0004') || !laserText.includes('BP-2P-08-0001') || !laserPhotoModelBoundary[language.code]?.test(laserText)) {
        failures.push(`${language.code}/case-studies.html: confirmed application models or the photograph-identification boundary is missing.`);
      }
      if (!laserSameCategoryBoundary[language.code]?.test(laserText)) {
        failures.push(`${language.code}/case-studies.html: the same-category and not-the-same-machine evidence boundary is missing.`);
      }
      const laserClaimText = laserText.replace(permittedLaserCaseSafetyBoundary[language.code], '');
      if (laserCaseForbiddenClaims[language.code]?.test(laserClaimText) || staleLaserApplicationModels.test(laserClaimText)) {
        failures.push(`${language.code}/case-studies.html: unsupported laser-case model, media, numeric specification, or performance claim detected.`);
      }
      if ($laserCase.find('.case-image.case-thumbnail').length !== 1 || $laserCase.find('.case-image.laser-case-detail').length !== 1) {
        failures.push(`${language.code}/case-studies.html: laser case must use one 4:3 overview and one contained detail image.`);
      }
    }
    const engineeringImages = [$center('#offshore img').attr('src'), $center('#cnc img').attr('src')];
    if (!/BP-2P-130-0001-1\.webp$/.test(engineeringImages[0] || '') || !/BP-2P-30-0001-1\.webp$/.test(engineeringImages[1] || '')) {
      failures.push(`${language.code}/case-studies.html: engineering examples must use the approved product reference images.`);
    }
    const verifiedApplicationCards = $center('.verified-application-products .product-card');
    const verifiedApplicationHrefs = verifiedApplicationCards.map((_, element) => $center(element).attr('data-href')).get();
    const selectionExampleCards = $center('.selection-example-products .product-card');
    const selectionExampleHrefs = selectionExampleCards.map((_, element) => $center(element).attr('data-href')).get();
    if (verifiedApplicationCards.length !== 3 || verifiedApplicationHrefs.join('|') !== 'BP-2P-95-0001.html|BP-3P-0004.html|BP-2P-08-0001.html') {
      failures.push(`${language.code}/case-studies.html: verified-application products must contain BP-2P-95, BP-3P-0004 and BP-2P-08-0001 in that order.`);
    }
    if (selectionExampleCards.length !== 2 || selectionExampleHrefs.join('|') !== 'BP-2P-130-0001.html|BP-2P-30-0001.html') {
      failures.push(`${language.code}/case-studies.html: selection-example products must contain BP-2P-130-0001 and BP-2P-30-0001.`);
    }
    if ($center('.case-products-grid .product-card[data-href="BP-2P-0001.html"]').length) {
      failures.push(`${language.code}/case-studies.html: BP-2P-0001 must not remain in the related-product groups.`);
    }
    if ($center('#legacy-case-studies-styles').length) failures.push(`${language.code}/case-studies.html: disabled legacy style block must be removed.`);
    if ($center('.faq-item[onclick]').length || $center('.faq-question').length !== 4) {
      failures.push(`${language.code}/case-studies.html: FAQ must use four accessible buttons without inline item click handlers.`);
    }
    const faqIds = new Set();
    $center('.faq-question').each((_, element) => {
      const button = $center(element);
      const buttonId = button.attr('id');
      const answerId = button.attr('aria-controls');
      const answer = answerId ? $center(`#${answerId}`) : $center();
      if (element.tagName !== 'button' || button.attr('type') !== 'button' || button.attr('aria-expanded') !== 'false' || !buttonId || !answerId) {
        failures.push(`${language.code}/case-studies.html: FAQ button accessibility attributes are incomplete.`);
      } else if (faqIds.has(buttonId) || faqIds.has(answerId) || answer.length !== 1 || !answer.is('[hidden]') || answer.attr('role') !== 'region' || answer.attr('aria-labelledby') !== buttonId) {
        failures.push(`${language.code}/case-studies.html: FAQ ids, region semantics, labels, or initial hidden state are incomplete for ${answerId}.`);
      }
      faqIds.add(buttonId);
      faqIds.add(answerId);
    });
    if (language.code !== config.sourceLanguage.code) {
      for (const label of localizedCaseCenterEnglishLabels) {
        if ($center(`[data-label="${label}"]`).length) failures.push(`${language.code}/case-studies.html: English mobile table label "${label}" detected.`);
      }
    }
    if (!$center(`link[href*="case-studies.css?${caseCenterCssVersion}"]`).length) failures.push(`${language.code}/case-studies.html: case-study CSS cache version is stale.`);
    if (!$detail(`link[href*="case-studies.css?${caseDetailCssVersion}"]`).length || !$detail(`link[href*="application-case.css?${caseDetailCssVersion}"]`).length) {
      failures.push(`${language.code}/${applicationCasePage}: case CSS cache version is stale.`);
    }
    if (language.code === 'en') {
      const structuredText = $center('script[type="application/ld+json"]').text();
      if (!structuredText.includes('"name": "Case Studies"')) failures.push('en/case-studies.html: JSON-LD breadcrumb must use Case Studies.');
    }
    try {
      const searchIndex = JSON.parse(await fs.readFile(path.join(languageRoot, 'search-index.json'), 'utf8'));
      const centerRecord = searchIndex.find((entry) => entry.url === 'case-studies.html');
      if (!centerRecord) failures.push(`${language.code}/search-index.json: case-studies record is missing.`);
      else if (caseCenterSearchForbiddenClaims[language.code]?.test(
        JSON.stringify(centerRecord).replace(permittedLaserCaseSafetyBoundary[language.code], ''),
      )) {
        failures.push(`${language.code}/search-index.json: stale or unsupported case-center wording detected.`);
      } else if (!JSON.stringify(centerRecord).includes('BP-3P-0004') || !JSON.stringify(centerRecord).includes('BP-2P-08-0001')) {
        failures.push(`${language.code}/search-index.json: case-studies record does not include both confirmed laser rear-chuck models.`);
      }
      const laserApplicationRecord = searchIndex.find((entry) => entry.url === 'application-laser-tube-cutting.html');
      if (!laserApplicationRecord) {
        failures.push(`${language.code}/search-index.json: laser application record is missing.`);
      } else {
        const recordText = JSON.stringify(laserApplicationRecord);
        if (laserApplicationRecord.h1 !== expectedLaserApplicationHeadings[language.code]) {
          failures.push(`${language.code}/search-index.json: laser application H1 is not synchronized.`);
        }
        if (!recordText.includes('BP-3P-0004') || !recordText.includes('BP-2P-08-0001') || staleLaserApplicationModels.test(recordText)) {
          failures.push(`${language.code}/search-index.json: laser application model coverage is missing or stale.`);
        }
        if (laserApplicationMediaClaims[language.code]?.test(laserApplicationRecord.description || '')) {
          failures.push(`${language.code}/search-index.json: laser application description contains unsupported medium wording.`);
        }
      }
      for (const pageName of ['BP-3P-0004.html', 'BP-2P-08-0001.html']) {
        const productRecord = searchIndex.find((entry) => entry.url === pageName);
        if (!productRecord || !rearChuckTerms[language.code]?.test(JSON.stringify(productRecord))) {
          failures.push(`${language.code}/search-index.json: ${pageName} does not expose the verified rear-chuck application.`);
        }
      }
    } catch (error) {
      failures.push(`${language.code}/search-index.json: case-center claim verification failed (${error.message}).`);
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

    const laserApplicationH1 = compactText($laserApplication('h1').first().text());
    if (laserApplicationH1 !== expectedLaserApplicationHeadings[language.code]) {
      failures.push(`${language.code}/${laserApplicationPageName}: H1 does not match the approved rear-chuck positioning.`);
    }
    const verifiedModels = $laserApplication('#verified-laser-rear-chuck-models');
    const verifiedModelLinks = verifiedModels.find('a[href^="BP-"]').map((_, element) => $laserApplication(element).attr('href')).get();
    if (verifiedModels.length !== 1 || verifiedModelLinks.join('|') !== 'BP-3P-0004.html|BP-2P-08-0001.html') {
      failures.push(`${language.code}/${laserApplicationPageName}: the confirmed-model section must link only BP-3P-0004 and BP-2P-08-0001.`);
    }
    const safetyBoundary = $laserApplication('#process-gas-safety-boundary');
    if (safetyBoundary.length !== 1 || safetyBoundary.find('a[href^="BP-"]').length || /BP-3P-0004|BP-2P-08-0001/i.test(safetyBoundary.text())) {
      failures.push(`${language.code}/${laserApplicationPageName}: the separate process-gas boundary is missing or recommends a standard model.`);
    }
    if (!$laserApplication('a[href="case-studies.html#laser-tube-rear-chuck"]').length) {
      failures.push(`${language.code}/${laserApplicationPageName}: real laser rear-chuck case link is missing.`);
    }
    const metadataText = [
      $laserApplication('meta[name="description"]').attr('content'),
      $laserApplication('meta[property="og:description"]').attr('content'),
      $laserApplication('meta[name="twitter:description"]').attr('content'),
    ].filter(Boolean).join(' ');
    if (laserApplicationMediaClaims[language.code]?.test(metadataText)) {
      failures.push(`${language.code}/${laserApplicationPageName}: metadata still mixes process gas or coolant with the pneumatic rear-chuck scope.`);
    }
    const applicationMain = $laserApplication('body').clone();
    applicationMain.find('header, nav, footer, script, style, .cookie-banner, .i18n-switcher').remove();
    applicationMain.find('#process-gas-safety-boundary').remove();
    applicationMain.find('.app-faq-item').each((_, element) => {
      const faq = $laserApplication(element);
      const faqText = compactText(faq.text());
      if (!laserApplicationMediaClaims[language.code]?.test(faqText)) return;
      if (!permittedNegativeMediaClaim[language.code]?.test(faqText)) failures.push(`${language.code}/${laserApplicationPageName}: FAQ contains an affirmative process-gas or coolant claim.`);
      faq.remove();
    });
    const applicationMainText = compactText(applicationMain.text());
    if (laserApplicationMediaClaims[language.code]?.test(applicationMainText)) {
      failures.push(`${language.code}/${laserApplicationPageName}: process-gas or coolant wording appears outside the separate safety boundary.`);
    }
    if (staleLaserApplicationModels.test(laserApplication)) {
      failures.push(`${language.code}/${laserApplicationPageName}: a stale direct-recommendation model remains.`);
    }
    if (laserApplicationNumericClaims.test(applicationMainText)) {
      failures.push(`${language.code}/${laserApplicationPageName}: an unsupported numeric pressure, speed, derating, flow, or orifice conclusion remains.`);
    }

    for (const pageName of verifiedProductPageNames) {
      const productSource = verifiedProductSources.get(pageName);
      const $verifiedProduct = load(productSource, { decodeEntities: false });
      const applicationEntry = $verifiedProduct('[data-verified-application="laser-rear-chuck"]');
      const applicationEntryText = compactText(applicationEntry.text());
      if (applicationEntry.length !== 1) {
        failures.push(`${language.code}/${pageName}: verified laser rear-chuck application entry is missing or duplicated.`);
        continue;
      }
      if (applicationEntry.find('a[href="case-studies.html#laser-tube-rear-chuck"]').length !== 1
          || applicationEntry.find('a[href="application-laser-tube-cutting.html"]').length !== 1) {
        failures.push(`${language.code}/${pageName}: verified application entry must link to the case center and application guide.`);
      }
      if (productApplicationForbiddenClaims[language.code]?.test(applicationEntryText)) {
        failures.push(`${language.code}/${pageName}: verified application entry contains an unsupported medium or port-function claim.`);
      }
      if (!productPhotoModelBoundary[language.code]?.test(applicationEntryText)) {
        failures.push(`${language.code}/${pageName}: photograph-to-model identification boundary is missing from the verified application entry.`);
      }
      const structuredText = $verifiedProduct('script[type="application/ld+json"]').text();
      if (!structuredText.includes('2026-08-07')
          || !laserMachineTerms[language.code]?.test(structuredText)
          || !rearChuckTerms[language.code]?.test(structuredText)) {
        failures.push(`${language.code}/${pageName}: structured data date or verified laser application description is not synchronized.`);
      }
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
