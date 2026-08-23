import { promises as fs } from 'node:fs';
import path from 'node:path';
import { load } from 'cheerio';

const root = path.resolve(import.meta.dirname, '..');
const config = JSON.parse(await fs.readFile(path.join(root, 'i18n', 'config.json'), 'utf8'));
const failures = [];

const locales = {
  en: {
    prefix: '',
    warrantyName: 'Warranty period',
    warrantyValue: '1 year',
    termsWarranty: 'The warranty period for all Begapunk products is one year. The warranty start date, coverage, exclusions, evidence requirements, and remedies are established by the formal quotation, accepted order, and any written warranty document supplied for the order.',
    selectionBoundaries: [
      'Maximum pressure and speed are selection limits; combined continuous operation depends on the medium, temperature, mounting, and duty cycle.',
      'Send the application requirements and request the current model-specific file before selecting or ordering this model.',
    ],
    caseEvidence: 'Photo note: These customer-authorized workshop photographs document the installation state shown. Operating parameters and acceptance requirements are confirmed for the order and approved drawing.',
    authorization: /published with the customer(?:'s|’s) authorization/i,
    installation: /documents? the installation/i,
    life: /service life/i,
    performance: /product performance/i,
  },
  de: {
    prefix: 'de',
    warrantyName: 'Garantiezeitraum',
    warrantyValue: '1 Jahr',
    termsWarranty: 'Der Garantiezeitraum für alle Begapunk-Produkte beträgt ein Jahr. Garantiebeginn, Deckungsumfang, Ausschlüsse, Nachweisanforderungen und Abhilfemaßnahmen richten sich nach dem formellen Angebot, dem angenommenen Auftrag und etwaigen schriftlichen Garantieunterlagen für den jeweiligen Auftrag.',
    selectionBoundaries: [
      'Maximaldruck und Maximaldrehzahl sind Auswahlgrenzen; der kombinierte Dauerbetrieb hängt von Medium, Temperatur, Montage und Lastprofil ab.',
      'Anwendungsanforderungen senden und vor Auswahl oder Bestellung die aktuelle modellspezifische Datei anfordern.',
    ],
    caseEvidence: 'Fotohinweis: Diese mit Genehmigung des Kunden veröffentlichten Werkstattfotos dokumentieren den dargestellten Einbauzustand. Betriebsparameter und Abnahmeanforderungen werden für den Auftrag und in der freigegebenen Zeichnung bestätigt.',
    authorization: /(?:mit (?:Genehmigung|Zustimmung|Autorisierung) des Kunden|vom Kunden[^.!?]{0,50}(?:genehmigt|autorisiert))/i,
    installation: /dokumentiert[^.!?]{0,50}(?:Installation|Einbau)|(?:Installation|Einbau)[^.!?]{0,50}dokumentiert/i,
    life: /(?:Lebensdauer|Nutzungsdauer)/i,
    performance: /(?:Produktleistung|Leistungsmerkmale|Gesamtleistung)/i,
  },
  ja: {
    prefix: 'ja',
    warrantyName: '保証期間',
    warrantyValue: '1年',
    termsWarranty: 'Begapunkの全製品の保証期間は1年間です。保証開始日、保証範囲、免責事項、必要な証拠および救済措置は、正式な見積書、受諾済み注文書、および当該注文に関する書面の保証文書に従います。',
    selectionBoundaries: [
      '最高圧力と最高回転数は選定上限です。組合せ連続運転は、流体、温度、取付け、デューティによって異なります。',
      '用途条件をお知らせのうえ、選定・発注前に現在の型式専用ファイルをご依頼ください。',
    ],
    caseEvidence: '写真に関する注記：これらのお客様の許可を得た工場写真は、掲載した組込み状態を記録しています。運転条件および受入基準は、注文書と承認図面で確認します。',
    authorization: /顧客[^。]{0,50}(?:許可|承認)/,
    installation: /(?:設置|取付)[^。]{0,50}(?:記録|示し)|(?:記録|示し)[^。]{0,50}(?:設置|取付)/,
    life: /寿命/,
    performance: /性能/,
  },
  ru: {
    prefix: 'ru',
    warrantyName: 'Гарантийный срок',
    warrantyValue: '1 год',
    termsWarranty: 'Гарантийный срок на всю продукцию Begapunk составляет один год. Дата начала гарантии, объем покрытия, исключения, требования к подтверждающим материалам и способы урегулирования определяются официальным коммерческим предложением, принятым заказом и письменным гарантийным документом для соответствующего заказа.',
    selectionBoundaries: [
      'Максимальные давление и скорость являются пределами выбора; совместная непрерывная работа зависит от среды, температуры, монтажа и рабочего цикла.',
      'Сообщите условия применения и запросите актуальный файл конкретной модели до выбора или заказа.',
    ],
    caseEvidence: 'Примечание к фотографиям: Эти цеховые фотографии, опубликованные с разрешения заказчика, фиксируют показанное состояние установки. Рабочие параметры и критерии приёмки подтверждаются в заказе и согласованном чертеже.',
    authorization: /(?:разрешен|согласован|авторизац)[^.!?]{0,60}заказчик|заказчик[^.!?]{0,60}(?:разрешен|согласован|авторизац)/i,
    installation: /(?:документирует|подтверждает|показывает)[^.!?]{0,60}установ|установ[^.!?]{0,60}(?:документирует|подтверждает|показывает)/i,
    life: /срок[^.!?]{0,20}служб/i,
    performance: /(?:характеристик|производительност)/i,
  },
};

const expectedBusiness = {
  streetAddress: '88 Yugong Road, Zonghan Industrial Park',
  addressLocality: 'Ningbo',
  addressRegion: 'Zhejiang',
  postalCode: '315300',
  addressCountry: 'CN',
  latitude: 29.8683,
  longitude: 121.544,
  openingHours: 'Mo-Fr 08:30-17:30',
};

const productPages = config.pages.filter((pageName) => /^BP-[\w-]+\.html$/.test(pageName));
const casePages = [
  'case-bp-2p-95-pneumatic-chuck-integration.html',
  'case-bp-3p-s06-sensor-monitored-chuck.html',
];

function fail(message) {
  failures.push(message);
}

function compact(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

function relativeFile(locale, pageName) {
  return locale.prefix ? path.join(locale.prefix, pageName) : pageName;
}

async function read(relativePath) {
  try {
    return await fs.readFile(path.join(root, relativePath), 'utf8');
  } catch (error) {
    fail(`${relativePath}: cannot be read (${error.message}).`);
    return '';
  }
}

function walkJson(value, visitor) {
  if (Array.isArray(value)) {
    value.forEach((item) => walkJson(item, visitor));
    return;
  }
  if (!value || typeof value !== 'object') return;
  visitor(value);
  Object.values(value).forEach((item) => walkJson(item, visitor));
}

function parseJsonLd($, relativePath) {
  const nodes = [];
  $('script[type="application/ld+json"]').each((_, element) => {
    const raw = $(element).html();
    if (!raw) return;
    try {
      const value = JSON.parse(raw);
      walkJson(value, (node) => nodes.push(node));
    } catch (error) {
      fail(`${relativePath}: invalid JSON-LD (${error.message}).`);
    }
  });
  return nodes;
}

function visiblePageText($) {
  const body = $('body').clone();
  body.find('script, style, noscript, template, header, nav, footer').remove();
  return compact(body.text());
}

function containsText(haystack, needle) {
  return compact(haystack).toLocaleLowerCase().includes(compact(needle).toLocaleLowerCase());
}

function checkOrganizationFacts($, relativePath, locale) {
  const nodes = parseJsonLd($, relativePath);
  const organizations = nodes.filter((node) => node['@type'] === 'Organization'
    && node['@id'] === 'https://www.begapunk.com/#organization');
  if (organizations.length !== 1) {
    fail(`${relativePath}: expected exactly one canonical Organization JSON-LD node, found ${organizations.length}.`);
    return;
  }
  const organization = organizations[0];
  if (String(organization.foundingDate) !== '2022') {
    fail(`${relativePath}: Organization foundingDate must be exactly 2022.`);
  }
  if (!organization.founder || organization.founder['@type'] !== 'Person') {
    fail(`${relativePath}: Organization founder must be a Person.`);
  } else if (Object.hasOwn(organization.founder, 'description')) {
    fail(`${relativePath}: the founder JSON-LD must not publish a biographical description.`);
  }
}

function checkLocalBusiness(node, relativePath, sourceName) {
  if (!node) {
    fail(`${relativePath}: missing canonical LocalBusiness in ${sourceName}.`);
    return;
  }
  for (const [key, expected] of Object.entries(expectedBusiness)) {
    let actual;
    if (key === 'latitude' || key === 'longitude') actual = node.geo?.[key];
    else if (key === 'openingHours') actual = node.openingHours;
    else actual = node.address?.[key];
    if (actual !== expected) {
      fail(`${relativePath}: LocalBusiness ${key} must be exactly ${JSON.stringify(expected)}, found ${JSON.stringify(actual)}.`);
    }
  }
}

async function collectFiles(directory, predicate) {
  const results = [];
  let entries = [];
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return results;
  }
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) results.push(...await collectFiles(absolute, predicate));
    else if (predicate(entry.name)) results.push(absolute);
  }
  return results;
}

// Current public source only. Audit evidence, built releases, tooling, and the protected
// catalog project are intentionally outside this verifier's scan scope.
const claimFiles = [];
for (const entry of await fs.readdir(root, { withFileTypes: true })) {
  if (entry.isFile() && /^(?:.+\.html|search-index\.json|llms\.txt)$/i.test(entry.name)) {
    claimFiles.push(path.join(root, entry.name));
  }
}
for (const language of ['de', 'ja', 'ru']) {
  claimFiles.push(...await collectFiles(path.join(root, language), (name) => /\.(?:html|json|txt)$/i.test(name)));
}
claimFiles.push(...await collectFiles(path.join(root, 'i18n'), (name) => /\.json$/i.test(name)));

const globalForbidden = [
  { label: 'retired founder-history claim from 2006', pattern: /\b2006\b|2006年/i },
  { label: 'unsupported 200,000/200K production-volume claim', pattern: /\b(?:200(?:,|\s)?000\+?|200K\+?)\b/i },
  { label: 'unsupported 20+ years claim', pattern: /\b20\+\s*years?\b|\b20\+\s*Jahre\b|20年以上|\b20\+\s*лет\b/i },
  { label: 'controlled-laboratory validation claim', pattern: /controlled\s+laboratory\s+conditions|kontrollierten?\s+Laborbedingungen|管理された(?:試験|実験)(?:条件|環境)|контролируем(?:ых|ые)\s+лабораторн(?:ых|ые)\s+услов/i },
];

for (const absolute of claimFiles) {
  const source = await fs.readFile(absolute, 'utf8');
  const relativePath = path.relative(root, absolute);
  for (const { label, pattern } of globalForbidden) {
    if (pattern.test(source)) fail(`${relativePath}: contains ${label}.`);
  }
}

const commercialPages = ['terms.html', 'faq.html', ...productPages];
const commercialForbidden = [
  { label: 'fixed quotation-validity period', pattern: /\bquotation[^.!?]{0,80}\bvalid\s+for\s+30\s+days\b|Angebot[^.!?]{0,80}30\s*Tage[^.!?]{0,30}gültig|見積[^。]{0,80}30日[^。]{0,30}有効|предложени[^.!?]{0,80}действительн[^.!?]{0,30}30\s*дн/i },
  { label: 'fixed three-week production lead time', pattern: /\b3\s*weeks?\b|\b3\s*Wochen\b|3週間|\b3\s*недел/i },
  { label: 'fixed 5-10 day shipping time', pattern: /\b5\s*[-–—]\s*10\s*(?:business\s*)?days?\b|\b5\s*[-–—]\s*10\s*(?:Werk)?tage\b|5\s*[-–—]\s*10営業日|\b5\s*[-–—]\s*10\s*(?:рабочих\s*)?дн/i },
  { label: 'fixed deposit/balance split', pattern: /\b60\s*%[^.!?]{0,80}\bdeposit\b|\b40\s*%[^.!?]{0,80}\bbalance\b|\b60\s*%[^.!?]{0,80}(?:Anzahlung|депозит)|60\s*%[^。]{0,80}(?:前金|着手金)/i },
  { label: 'fixed PayPal order-value cutoff', pattern: /PayPal[^.!?。]{0,80}(?:under|below|less\s+than)\s*(?:USD\s*)?\$?\s*500|PayPal[^.!?。]{0,80}(?:unter|weniger\s+als)\s*500|PayPal[^。]{0,80}500(?:米ドル|ドル)未満|PayPal[^.!?]{0,80}(?:менее|до)\s*500/i },
  { label: 'default EXW Incoterm', pattern: /(?:default|standard)\s+(?:shipping\s+)?(?:term|Incoterm)[^.!?]{0,30}\bEXW\b|Standard-Lieferbedingung[^.!?]{0,30}\bEXW\b|標準の取引条件[^。]{0,30}EXW|Стандартное\s+условие\s+поставки[^.!?]{0,30}\bEXW\b/i },
  { label: 'automatic immediate replacement', pattern: /\bimmediate\s+replacement\b|sofortig(?:er|e|en)\s+Ersatz|即時交換|немедленн(?:ая|ую)\s+замен/i },
  { label: 'no-return replacement promise', pattern: /\b(?:no|without)\s+return\s+(?:is\s+)?required\b|Rücksendung\s+nicht\s+erforderlich|返品不要|без\s+возврат/i },
  { label: 'fixed 30-day full-refund promise', pattern: /\b30[-\s]?day[^.!?]{0,80}\bfull\s+refund\b|\b30\s*Tage[^.!?]{0,80}(?:volle|vollständige)\s+Erstattung|30日[^。]{0,80}全額返金|\b30\s*дн[^.!?]{0,80}полн[^.!?]{0,30}возврат/i },
];

for (const [language, locale] of Object.entries(locales)) {
  for (const pageName of commercialPages) {
    const relativePath = relativeFile(locale, pageName);
    const source = await read(relativePath);
    for (const { label, pattern } of commercialForbidden) {
      if (pattern.test(source)) fail(`${relativePath}: contains ${label}.`);
    }
  }

  const termsPath = relativeFile(locale, 'terms.html');
  const termsSource = await read(termsPath);
  if (termsSource) {
    const $ = load(termsSource, { decodeEntities: false });
    const matchingWarrantyTerms = $('li').filter((_, item) => compact($(item).text()) === locale.termsWarranty);
    if (matchingWarrantyTerms.length !== 1) {
      fail(`${termsPath}: expected one exact one-year warranty policy statement, found ${matchingWarrantyTerms.length}.`);
    }
  }

  for (const pageName of productPages) {
    const relativePath = relativeFile(locale, pageName);
    const source = await read(relativePath);
    if (!source) continue;
    const $ = load(source, { decodeEntities: false });
    const matchingRows = $('table.spec-table tr').filter((_, row) => {
      const name = compact($(row).find('th').first().text());
      const value = compact($(row).find('td').first().text());
      return name === locale.warrantyName && value === locale.warrantyValue;
    });
    if (matchingRows.length !== 1) {
      fail(`${relativePath}: expected one visible warranty row ${JSON.stringify(locale.warrantyName)} = ${JSON.stringify(locale.warrantyValue)}, found ${matchingRows.length}.`);
    }

    const products = parseJsonLd($, relativePath).filter((node) => node['@type'] === 'Product');
    if (products.length !== 1) {
      fail(`${relativePath}: expected exactly one Product JSON-LD node, found ${products.length}.`);
    } else {
      const warranties = Array.isArray(products[0].additionalProperty)
        ? products[0].additionalProperty.filter((property) => compact(property?.name) === locale.warrantyName
          && compact(property?.value) === locale.warrantyValue)
        : [];
      if (warranties.length !== 1) {
        fail(`${relativePath}: Product JSON-LD must contain one matching warranty name/value pair, found ${warranties.length}.`);
      }
    }

    const pageText = visiblePageText($);
    const hasSelectionBoundary = locale.selectionBoundaries.some((boundary) => containsText(pageText, boundary));
    if (!hasSelectionBoundary) {
      fail(`${relativePath}: missing the customer-facing operating-limit or model-file selection boundary.`);
    }
  }

  for (const casePage of casePages) {
    const localizedCase = relativeFile(locale, casePage);
    const caseSource = await read(localizedCase);
    if (caseSource) {
      const $ = load(caseSource, { decodeEntities: false });
      const notes = $('.tech-note');
      const exactNotes = notes.filter((_, element) => compact($(element).text()) === compact(locale.caseEvidence));
      if (notes.length !== 1 || exactNotes.length !== 1) {
        fail(`${localizedCase}: expected exactly one concise customer-authorized photo note, found ${notes.length} note(s) and ${exactNotes.length} exact match(es).`);
      }
    }
  }

  for (const pageName of ['index.html', 'about.html']) {
    const relativePath = relativeFile(locale, pageName);
    const source = await read(relativePath);
    if (!source) continue;
    const $ = load(source, { decodeEntities: false });
    checkOrganizationFacts($, relativePath, locale);
    if (pageName === 'about.html') {
      const text = visiblePageText($);
      if (!/\b2022\b/.test(text)) fail(`${relativePath}: visible company history must state establishment in 2022.`);
      if (/\b2006\b|2006年/.test(text)) fail(`${relativePath}: visible company copy must not publish the retired founder-history claim.`);
      const businesses = parseJsonLd($, relativePath).filter((node) => node['@type'] === 'LocalBusiness'
        && node['@id'] === 'https://www.begapunk.com/#localbusiness');
      if (businesses.length !== 1) fail(`${relativePath}: expected exactly one canonical LocalBusiness, found ${businesses.length}.`);
      else checkLocalBusiness(businesses[0], relativePath, 'about-page JSON-LD');
    }
  }

  const contactPath = relativeFile(locale, 'contact.html');
  const contactSource = await read(contactPath);
  if (contactSource) {
    const $ = load(contactSource, { decodeEntities: false });
    const businesses = parseJsonLd($, contactPath).filter((node) => node['@type'] === 'LocalBusiness'
      && node['@id'] === 'https://www.begapunk.com/#localbusiness');
    if (businesses.length !== 1) fail(`${contactPath}: expected exactly one canonical LocalBusiness, found ${businesses.length}.`);
    else checkLocalBusiness(businesses[0], contactPath, 'contact-page JSON-LD');
  }
}

if (productPages.length !== 16) {
  fail(`i18n/config.json: expected exactly 16 product pages, found ${productPages.length}.`);
}

if (failures.length) {
  console.error(`Owner-confirmed facts verification failed with ${failures.length} issue(s):`);
  failures.forEach((message, index) => console.error(`${index + 1}. ${message}`));
  process.exitCode = 1;
} else {
  console.log(`Owner-confirmed facts verified: ${productPages.length} products × ${Object.keys(locales).length} languages, 2022 company history, commercial boundaries, case-photo authorization, and LocalBusiness facts.`);
}
