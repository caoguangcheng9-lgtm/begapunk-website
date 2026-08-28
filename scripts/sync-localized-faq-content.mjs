import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { load } from 'cheerio';

const sourceRoot = path.resolve(import.meta.dirname, '..');
const i18nRoot = path.join(sourceRoot, 'i18n');
const checkOnly = process.argv.includes('--check');
const config = JSON.parse(await fs.readFile(path.join(i18nRoot, 'config.json'), 'utf8'));
const languageCodes = ['de', 'ja', 'ru'];
const questionIds = [
  ...Array.from({ length: 17 }, (_, index) => `faq-${String(index + 1).padStart(2, '0')}`),
  ...Array.from({ length: 10 }, (_, index) => `faq-${String(index + 19).padStart(2, '0')}`),
];
const sectionIds = [
  'faq-basics',
  'faq-selection',
  'faq-customization',
  'faq-installation',
  'faq-testing',
  'faq-commercial',
];
const relatedFaqIds = ['faq-04', 'faq-05', 'faq-08', 'faq-13', 'faq-14', 'faq-15', 'faq-22', 'faq-27'];
const skipLinkText = {
  de: 'Zum Hauptinhalt springen',
  ja: '本文へスキップ',
  ru: 'Перейти к основному содержанию',
};

function lineEnding(source) {
  return source.includes('\r\n') ? '\r\n' : '\n';
}

function withSourceEol(value, source) {
  const eol = lineEnding(source);
  return value.replace(/\r\n|\r|\n/g, eol);
}

function serializeJson(value, source) {
  return withSourceEol(`${JSON.stringify(value, null, 2)}\n`, source);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function protectRegionalEnglishTerms(value) {
  return escapeHtml(value).replace(
    /\b(rotary joint|rotary union|swivel joint)\b/gi,
    '<span class="notranslate" translate="no">$1</span>',
  );
}

function compactText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertExactIds(actual, expected, label) {
  assert(JSON.stringify(actual) === JSON.stringify(expected), `${label}: expected ${expected.join(', ')}.`);
}

function assertContains(value, patterns, label) {
  for (const pattern of patterns) {
    assert(pattern.test(value), `${label}: required fact boundary is missing (${pattern}).`);
  }
}

function validateLocalization(data, languageCode) {
  const acceptedLanguageTags = languageCode === 'ja' ? new Set(['ja', 'ja-JP']) : new Set([languageCode]);
  assert(acceptedLanguageTags.has(data?.language), `${languageCode}: language code is incorrect.`);
  for (const key of ['title', 'description', 'h1', 'heroIntro', 'jumpTitle', 'jumpAria']) {
    assert(compactText(data?.meta?.[key]), `${languageCode}: meta.${key} is required.`);
  }
  assertExactIds((data.sections || []).map((section) => section.id), sectionIds, `${languageCode}: sections`);
  for (const section of data.sections) {
    assert(compactText(section.navLabel), `${languageCode}/${section.id}: navLabel is required.`);
    assert(compactText(section.heading), `${languageCode}/${section.id}: heading is required.`);
  }
  assertExactIds((data.questions || []).map((question) => question.id), questionIds, `${languageCode}: questions`);
  for (const question of data.questions) {
    assert(compactText(question.question), `${languageCode}/${question.id}: question is required.`);
    assert(compactText(question.answer), `${languageCode}/${question.id}: answer is required.`);
  }
  assertExactIds((data.relatedLinks || []).map((link) => link.faqId), relatedFaqIds, `${languageCode}: related links`);
  for (const link of data.relatedLinks) {
    assert(compactText(link.text) && compactText(link.href), `${languageCode}/${link.faqId}: related link is incomplete.`);
  }
  assert(data.relatedLinks.find((link) => link.faqId === 'faq-14')?.href.includes(`source=${languageCode}/faq.html`), `${languageCode}: FAQ 14 must preserve the localized source path.`);
  assert(data.relatedLinks.find((link) => link.faqId === 'faq-27')?.href.includes(`source=${languageCode}/faq.html`), `${languageCode}: FAQ 27 must preserve the localized source path.`);
  for (const key of ['heading', 'body', 'button']) {
    assert(compactText(data?.cta?.[key]), `${languageCode}: cta.${key} is required.`);
  }
  assert(data?.review?.method === 'AI-assisted target-market line-by-line localization review', `${languageCode}: review method must state the approved AI-assisted process.`);
  assert(data.review.nativeHumanSignoff === false, `${languageCode}: native-human sign-off must remain false.`);
  assert(Array.isArray(data.review.unresolvedIssues) && data.review.unresolvedIssues.length === 0, `${languageCode}: unresolved localization issues remain.`);
  assert(Array.isArray(data.review.officialTerminologySources) && data.review.officialTerminologySources.length >= 3, `${languageCode}: at least three official terminology sources are required.`);

  const answers = new Map(data.questions.map((item) => [item.id, item.answer]));
  const factPatterns = {
    de: {
      'faq-07': [/gleichzeitig|simultan/i, /Angebot/i],
      'faq-10': [/Druckluft/i, /Wasser/i, /Kühlschmierstoff|Kühlmittel/i, /Hydrauliköl/i],
      'faq-11': [/Partikelfilter/i, /Wasserabscheider/i, /(?:Druckluftöler|Nebelöler)/i, /verschleißfeste Dichtungsausführung/i],
      'faq-22': [/1,0 MPa/i, /eine Sekunde/i, /vier Sekunden/i, /nicht|weder/i],
      'faq-23': [/offen/i, /drucklos/i, /Nachweisgrenze|Erkennungsschwelle/i],
      'faq-24': [/individuelle Rückverfolgbarkeitsnummer/i, /Prüfbericht/i, /vor der Bestellung/i],
      'faq-25': [/ein Jahr ab Versanddatum/i, /Angebot/i, /Auftrag/i, /schriftlich/i],
      'faq-26': [/eine Einheit/i, /20 Kalendertage/i, /30 Kalendertage/i],
      'faq-28': [/nicht.*Marketing|weder.*Marketing/i, /nicht.*(?:veröffentlicht|öffentlichen|Darstellung)|noch.*(?:veröffentlicht|öffentlichen|Darstellung)/i],
    },
    ja: {
      'faq-07': [/同時/, /見積/],
      'faq-10': [/圧縮空気/, /水/, /水溶性.*クーラント/, /作動油/],
      'faq-11': [/エアフィルタ/, /ウォータセパレータ/, /ルブリケータ/, /耐摩耗.*シール仕様/],
      'faq-22': [/1\.0 MPa/, /約1秒/, /約4秒/, /ものではありません/],
      'faq-23': [/大気開放/, /無加圧/, /検出しきい値/],
      'faq-24': [/個体別トレーサビリティ番号/, /検査記録/, /注文前/],
      'faq-25': [/出荷日から1年間/, /見積書/, /受注内容|注文書/, /書面/],
      'faq-26': [/1個/, /約20暦日/, /30暦日以内/],
      'faq-28': [/マーケティング/, /一般公開|公開/],
    },
    ru: {
      'faq-07': [/одновременн/i, /предложен|рассчита|разработ/i],
      'faq-10': [/сжат/i, /вод/i, /водорастворим/i, /гидравлическ/i],
      'faq-11': [/фильтр.*частиц/i, /влагоотделител/i, /маслораспылител/i, /износостойк.*уплотнен/i],
      'faq-22': [/1,0 МПа/i, /одн.*секунд/i, /четыр.*секунд/i, /не подтвержд/i],
      'faq-23': [/открыт/i, /без давления/i, /порог.*обнаруж/i],
      'faq-24': [/индивидуальн.*номер прослеживаемости/i, /протокол.*контрол/i, /до заказа/i],
      'faq-25': [/один год.*дат.*отгруз/i, /предложен/i, /заказ/i, /письмен/i],
      'faq-26': [/одно изделие/i, /20 календарных дней/i, /30 календарных дней/i],
      'faq-28': [/не используем.*маркетинг/i, /не публикуем.*открыт/i],
    },
  };
  for (const [faqId, patterns] of Object.entries(factPatterns[languageCode])) {
    assertContains(answers.get(faqId), patterns, `${languageCode}/${faqId}`);
  }
}

function extractRequired(source, pattern, label) {
  const match = source.match(pattern);
  assert(match, `English FAQ source is missing ${label}.`);
  return match[0];
}

function buildLocalizedMain(sourceMain, data) {
  const $ = load(sourceMain, { decodeEntities: false }, false);
  const main = $('main#main-content');
  assert(main.length === 1, 'English FAQ must contain exactly one main#main-content.');

  main.find('#faq-page-title').text(data.meta.h1);
  main.find('.faq-hero p').first().text(data.meta.heroIntro);
  main.find('.faq-jump-nav').attr('aria-label', data.meta.jumpAria);
  main.find('.faq-jump-title').text(data.meta.jumpTitle);

  for (const section of data.sections) {
    const sectionRoot = main.find(`#${section.id}`);
    assert(sectionRoot.length === 1, `English FAQ is missing ${section.id}.`);
    main.find(`.faq-jump-list a[href="#${section.id}"]`).text(section.navLabel);
    const heading = sectionRoot.find('.faq-category').first();
    const icon = heading.find('.icon').first();
    icon.addClass('notranslate').attr('translate', 'no');
    heading.contents().filter((_, node) => node.type === 'text').remove();
    heading.append(` ${escapeHtml(section.heading)}`);
  }

  const relatedByFaqId = new Map(data.relatedLinks.map((link) => [link.faqId, link]));
  for (const question of data.questions) {
    const item = main.find(`#${question.id}`);
    assert(item.length === 1, `English FAQ is missing ${question.id}.`);
    const button = item.find('.faq-question').first();
    if (question.id === 'faq-02') {
      button.find('span').first().html(protectRegionalEnglishTerms(question.question));
    } else {
      button.find('span').first().text(question.question);
    }
    button.find('.arrow').addClass('notranslate').attr('translate', 'no');
    const answer = item.find('.faq-answer').first();
    if (question.id === 'faq-02') {
      answer.html(`<p>${protectRegionalEnglishTerms(question.answer)}</p>`);
    } else {
      answer.empty().append($('<p></p>').text(question.answer));
    }
    const related = relatedByFaqId.get(question.id);
    const relatedNode = item.find('.faq-related-link a').first();
    if (related) {
      assert(relatedNode.length === 1, `${question.id}: English FAQ related-link placeholder is missing.`);
      relatedNode.attr('href', related.href).text(related.text);
    } else {
      assert(relatedNode.length === 0, `${question.id}: unexpected English FAQ related link.`);
    }
  }

  main.find('.faq-cta h2').text(data.cta.heading);
  main.find('.faq-cta p').text(data.cta.body);
  const ctaLink = data.relatedLinks.find((link) => link.faqId === 'faq-27');
  main.find('.faq-cta a').attr('href', ctaLink.href).text(data.cta.button);
  return $.html(main);
}

function replaceMetaContent(html, selectorPattern, content, label) {
  let replaced = 0;
  const next = html.replace(selectorPattern, (full, prefix, suffix) => {
    replaced += 1;
    return `${prefix}${escapeHtml(content)}${suffix}`;
  });
  assert(replaced === 1, `${label}: expected exactly one metadata field; found ${replaced}.`);
  return next;
}

function replaceFaqJsonLd(html, data, languageCode) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: data.questions.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
    inLanguage: languageCode,
  };
  let replacements = 0;
  const next = html.replace(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi, (full, payload) => {
    try {
      const parsed = JSON.parse(payload);
      if (parsed?.['@type'] !== 'FAQPage') return full;
      replacements += 1;
      return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
    } catch {
      return full;
    }
  });
  assert(replacements === 1, `${languageCode}/faq.html: expected exactly one FAQPage JSON-LD block; found ${replacements}.`);
  return next;
}

function buildLocalizedHtml({ sourceHtml, targetHtml, data, languageCode }) {
  const sourceMain = extractRequired(sourceHtml, /<main\s+id=["']main-content["'][\s\S]*?<\/main>/i, 'main content');
  const sourceStyle = extractRequired(sourceHtml, /<style\s+id=["']faq-knowledge-center-styles["']>[\s\S]*?<\/style>/i, 'knowledge-center styles');
  const localizedMain = buildLocalizedMain(sourceMain, data);
  let html = targetHtml;

  html = html.replace(/\s*<a\s+class=["']faq-skip-link["'][\s\S]*?<\/a>\s*/i, '\n');
  html = html.replace(/<body([^>]*)>/i, `<body$1>\n\n<a class="faq-skip-link" href="#main-content">${escapeHtml(skipLinkText[languageCode])}</a>`);

  if (/<main\s+id=["']main-content["']/i.test(html)) {
    html = html.replace(/<main\s+id=["']main-content["'][\s\S]*?<\/main>/i, localizedMain);
  } else {
    const oldContentPattern = /<!--\s*=====\s*HERO\s*=====\s*-->[\s\S]*?(?=<!--\s*=====\s*FOOTER\s*=====\s*-->)/i;
    assert(oldContentPattern.test(html), `${languageCode}/faq.html: old FAQ content boundary was not found.`);
    html = html.replace(oldContentPattern, `${localizedMain}\n\n`);
  }

  if (/<style\s+id=["']faq-knowledge-center-styles["']/i.test(html)) {
    html = html.replace(/<style\s+id=["']faq-knowledge-center-styles["']>[\s\S]*?<\/style>/i, sourceStyle);
  } else {
    const stylesheetPattern = /(<link\s+rel=["']stylesheet["'][^>]*>)/i;
    assert(stylesheetPattern.test(html), `${languageCode}/faq.html: stylesheet link was not found.`);
    html = html.replace(stylesheetPattern, `$1\n\n${sourceStyle}`);
  }

  html = html.replace(/function\s+toggleFAQ\s*\(btn\)\s*\{[\s\S]*?\n\s*\}/g, '');
  html = html.replace(/\s*<script\s+(?:defer(?:=["']["'])?\s+)?src=["']\.\.\/js\/faq\.js[^"']*["']><\/script>\s*/gi, '\n');
  const navigationScriptPattern = /(<script\s+defer(?:=["']["'])?\s+src=["']\.\.\/js\/site-navigation\.js[^"']*["']><\/script>)/i;
  assert(navigationScriptPattern.test(html), `${languageCode}/faq.html: site-navigation script was not found.`);
  html = html.replace(navigationScriptPattern, `<script src="../js/faq.js?v=20260815-faq1"></script>\n$1`);

  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(data.meta.title)}</title>`);
  html = replaceMetaContent(html, /(<meta\s+name=["']description["']\s+content=["'])[^"']*(["'][^>]*>)/i, data.meta.description, `${languageCode}: description`);
  html = replaceMetaContent(html, /(<meta\s+property=["']og:title["']\s+content=["'])[^"']*(["'][^>]*>)/i, data.meta.title, `${languageCode}: og:title`);
  html = replaceMetaContent(html, /(<meta\s+property=["']og:description["']\s+content=["'])[^"']*(["'][^>]*>)/i, data.meta.description, `${languageCode}: og:description`);
  html = replaceMetaContent(html, /(<meta\s+name=["']twitter:title["']\s+content=["'])[^"']*(["'][^>]*>)/i, data.meta.title, `${languageCode}: twitter:title`);
  html = replaceMetaContent(html, /(<meta\s+name=["']twitter:description["']\s+content=["'])[^"']*(["'][^>]*>)/i, data.meta.description, `${languageCode}: twitter:description`);
  html = replaceFaqJsonLd(html, data, languageCode);
  return withSourceEol(html, targetHtml);
}

function buildSearchRecord(html, existing) {
  const $ = load(html, { decodeEntities: false });
  const content = $('body').clone();
  content.find('script,style,header,nav,footer,.cookie-banner,.i18n-switcher').remove();
  return {
    ...existing,
    title: compactText($('title').text()) || existing.title,
    description: compactText($('meta[name="description"]').attr('content')) || existing.description,
    h1: compactText($('h1').first().text()) || existing.h1,
    h2s: $('h2').map((_, element) => compactText($(element).text())).get().filter(Boolean),
    body: compactText(content.text()),
  };
}

async function desiredMetadataFiles(languageCode, data, desiredHtml) {
  const changes = [];
  const seoPath = path.join(i18nRoot, 'seo', `${languageCode}.json`);
  const seoSource = await fs.readFile(seoPath, 'utf8');
  const seo = JSON.parse(seoSource);
  seo['faq.html'] = { title: data.meta.title, description: data.meta.description, h1: data.meta.h1 };
  changes.push({ path: seoPath, before: seoSource, after: serializeJson(seo, seoSource) });

  const searchPath = path.join(sourceRoot, languageCode, 'search-index.json');
  const searchSource = await fs.readFile(searchPath, 'utf8');
  const search = JSON.parse(searchSource);
  const searchIndex = search.findIndex((item) => item.url === 'faq.html');
  assert(searchIndex >= 0, `${languageCode}/search-index.json: faq.html is missing.`);
  search[searchIndex] = buildSearchRecord(desiredHtml, search[searchIndex]);
  changes.push({ path: searchPath, before: searchSource, after: serializeJson(search, searchSource) });

  const llmsPath = path.join(sourceRoot, languageCode, 'llms.txt');
  const llmsSource = await fs.readFile(llmsPath, 'utf8');
  const faqUrl = `${config.siteUrl}/${languageCode}/faq.html`;
  const desiredLine = `- [${data.meta.title}](${faqUrl}): ${data.meta.description}`;
  let matches = 0;
  const llmsNext = llmsSource.replace(/^.*\(https:\/\/www\.begapunk\.com\/(?:de|ja|ru)\/faq\.html\):.*$/gm, (line) => {
    matches += 1;
    return line.includes(`/${languageCode}/faq.html`) ? desiredLine : line;
  });
  assert(matches === 1, `${languageCode}/llms.txt: expected exactly one FAQ entry; found ${matches}.`);
  changes.push({ path: llmsPath, before: llmsSource, after: withSourceEol(llmsNext, llmsSource) });
  return changes;
}

async function desiredOwnershipFiles() {
  const changes = [];
  const catalogPath = path.join(i18nRoot, 'source-catalog.json');
  const catalogSource = await fs.readFile(catalogPath, 'utf8');
  const catalog = JSON.parse(catalogSource);
  const droppedIds = [];
  const entries = [];
  for (const entry of catalog.entries || []) {
    const pages = (entry.pages || []).filter((pageName) => pageName !== 'faq.html');
    if (!pages.length) {
      droppedIds.push(entry.id);
      continue;
    }
    entries.push({ ...entry, pages });
  }
  const nextCatalog = { ...catalog, pages: config.translationManagedPages, entries };
  changes.push({ path: catalogPath, before: catalogSource, after: serializeJson(nextCatalog, catalogSource) });

  for (const languageCode of languageCodes) {
    const cachePath = path.join(i18nRoot, 'cache', `${languageCode}.json`);
    const cacheSource = await fs.readFile(cachePath, 'utf8');
    const cache = JSON.parse(cacheSource);
    for (const id of droppedIds) delete cache.translations?.[id];
    changes.push({ path: cachePath, before: cacheSource, after: serializeJson(cache, cacheSource) });

    const editorialPath = path.join(i18nRoot, 'editorial', `${languageCode}.json`);
    const editorialSource = await fs.readFile(editorialPath, 'utf8');
    const editorial = JSON.parse(editorialSource);
    delete editorial['faq.html'];
    changes.push({ path: editorialPath, before: editorialSource, after: serializeJson(editorial, editorialSource) });
  }
  return changes;
}

const sourceHtml = await fs.readFile(path.join(sourceRoot, 'faq.html'), 'utf8');
const source$ = load(sourceHtml, { decodeEntities: false });
assert(source$('main#main-content').length === 1, 'faq.html: exactly one main landmark is required.');
assertExactIds(source$('.faq-item[id]').map((_, item) => source$(item).attr('id')).get(), questionIds, 'faq.html: question IDs');
assertExactIds(source$('.faq-section[id]').map((_, item) => source$(item).attr('id')).get(), sectionIds, 'faq.html: section IDs');
assert(source$('.faq-related-link').length === 8, 'faq.html: exactly eight contextual internal links are required.');
const sourceFaqScript = source$('script[src="js/faq.js?v=20260815-faq1"]');
assert(sourceFaqScript.length === 1, 'faq.html: the shared progressive-enhancement script is missing.');
assert(sourceFaqScript.attr('defer') === undefined, 'faq.html: the FAQ enhancement script must execute at the end of parsing before first paint.');

const planned = [];
for (const languageCode of languageCodes) {
  const dataPath = path.join(i18nRoot, 'manual', `faq-${languageCode}.json`);
  const data = JSON.parse(await fs.readFile(dataPath, 'utf8'));
  validateLocalization(data, languageCode);
  const targetPath = path.join(sourceRoot, languageCode, 'faq.html');
  const targetHtml = await fs.readFile(targetPath, 'utf8');
  const desiredHtml = buildLocalizedHtml({ sourceHtml, targetHtml, data, languageCode });
  planned.push({ path: targetPath, before: targetHtml, after: desiredHtml });
  planned.push(...await desiredMetadataFiles(languageCode, data, desiredHtml));
}
planned.push(...await desiredOwnershipFiles());

const drift = planned.filter((item) => item.before !== item.after);
if (checkOnly) {
  if (drift.length) {
    console.error(`Localized FAQ verification failed: ${drift.length} file(s) require synchronization.`);
    for (const item of drift) console.error(`- ${path.relative(sourceRoot, item.path)}`);
    process.exitCode = 1;
  } else {
    console.log('Localized FAQ verification passed: 27 questions x 3 target-market languages, 8 contextual links, and machine-readable records are synchronized.');
  }
} else {
  for (const item of drift) await fs.writeFile(item.path, item.after, 'utf8');
  console.log(`Localized FAQ synchronization complete: ${drift.length} file(s) updated.`);
}
