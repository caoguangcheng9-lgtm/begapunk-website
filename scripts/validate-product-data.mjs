import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { load } from 'cheerio';
import {
  drawingBackedProductKeywords,
  drawingBackedProductLinkLabel,
  drawingBackedProductMetadata,
  drawingBackedProductSummary,
  drawingBackedUiContract,
} from './lib/drawing-backed-product-facts.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const siteOrigin = 'https://www.begapunk.com';
const drawingManifest = JSON.parse(await readFile(path.join(repoRoot, 'data/product-drawing-facts.json'), 'utf8'));
const locales = [
  { code: 'en', directory: '' },
  { code: 'de', directory: 'de' },
  { code: 'ja', directory: 'ja' },
  { code: 'ru', directory: 'ru' },
];
const failures = [];
const catalogFilterCodes = [
  'all',
  '1-channel',
  '2-channel',
  '3-channel',
  '4-channel-plus',
  'custom',
];
const catalogFilterCounts = {
  'products.html': [8, 1, 5, 1, 1, 0],
  'products-p2.html': [8, 1, 3, 2, 1, 1],
};
const drawingBackedModel = 'BP-2P-50-0001';
const drawingBackedPolicyByLocale = {
  en: {
    cardText: 'Protective Shroud & Labyrinth',
    catalogFragments: ['2-in-2-out', 'Standard Medium: Air', 'Stator 4 × M5 / Rotor 6 × M5', 'Max 1 MPa', 'Max 100 RPM', 'AL6061', 'PTFE Seal + O-Ring'],
    comparisonFragments: ['2 passages', '2-in-2-out', '1 MPa', '100 RPM', '4 × M5 × 10 mm', '6 × M5 × 8 mm', 'AL6061', 'Air service'],
    nonAirTerms: /\b(?:water|coolant|liquid|non-air)\b/i,
    nonAirQualification: /\b(?:written (?:compatibility )?confirmation|must not|do not direct|not (?:recommended|approved|intended)|outside|consult|requires? (?:a )?(?:separate )?(?:written |engineering )?(?:confirmation|review)|before operation)\b/i,
  },
  de: {
    cardText: 'Schutzhaube & Labyrinth',
    catalogFragments: ['2 Eingänge / 2 Ausgänge', 'Standardmedium: Luft', 'Stator 4 × M5 / Rotor 6 × M5', 'max. 1 MPa', 'Max. 100 min⁻¹', 'AL6061', 'PTFE-Dichtung + O-Ring'],
    comparisonFragments: ['2 Kanäle', '2 Einlässe / 2 Auslässe', '1 MPa', '100 min⁻¹', '4 × M5 × 10 mm', '6 × M5 × 8 mm', 'AL6061', 'Luftbetrieb'],
    nonAirTerms: /\b(?:Wasser|Kühlmittel|Flüssigkeit|Nicht-Luft-Medium)\b/iu,
    nonAirQualification: /\b(?:schriftliche Kompatibilitätsbestätigung|nicht vorgesehen|nicht angegeben|nicht direkt|Waschstrahl nicht|keine geeignete|außerhalb|vor der Inbetriebnahme|vor jeder Flüssigkeitszufuhr|konsultieren)\b/iu,
  },
  ja: {
    cardText: '保護カバー・ラビリンス構造',
    catalogFragments: ['2入力・2出力', '標準使用流体：空気', '固定側4 × M5／回転側6 × M5', '最高 1 MPa', '最高100 min⁻¹', 'AL6061', 'PTFEシール＋Oリング'],
    comparisonFragments: ['2流路', '2入口／2出口', '1 MPa', '100 min⁻¹', '固定側4 × M5 × 10 mm', '回転側6 × M5 × 8 mm', 'AL6061', '空気用途'],
    nonAirTerms: /(?:水|クーラント|液体|空気以外)/u,
    nonAirQualification: /(?:書面|想定していません|おそれがあります|向けないでください|標準(?:仕様|定格)外|運転前|仕様決定前|事前に.*確認|相談)/u,
  },
  ru: {
    cardText: 'Защитный кожух и лабиринт',
    catalogFragments: ['2 входа / 2 выхода', 'Стандартная среда: воздух', 'Статор 4 × M5 / ротор 6 × M5', 'Макс. 1 МПа', 'Макс. 100 об/мин', 'AL6061', 'Уплотнение ПТФЭ + O-кольцо'],
    comparisonFragments: ['2 канала', '2 входа / 2 выхода', '1 МПа', '100 об/мин', 'статор 4 × M5 × 10 мм', 'ротор 6 × M5 × 8 мм', 'AL6061', 'Воздушная среда'],
    nonAirTerms: /\b(?:вод[аы]|СОЖ|жидк\w*|кроме воздуха)\b/iu,
    nonAirQualification: /\b(?:письменн\w+ подтвержден\w+|не предусмотр\w+|не заявля\w+|вне стандарт\w+|до начала эксплуатации|до подачи|требуется.*подтвержден\w+)\b/iu,
  },
};
const drawingBackedForbiddenPatterns = [
  { label: 'IP65 claim', pattern: /\bIP65\b/i },
  { label: 'FKM claim', pattern: /\bFKM\b/i },
];
const drawingBackedTargetForbiddenByLocale = {
  en: [
    { label: 'unverified dust-seal claim', pattern: /\bdust seal(?:s)?\b/i },
    { label: 'dust-proof equivalence claim', pattern: /\bdust[- ]proof\b/i },
    { label: 'fixed maintenance or seal-replacement interval', pattern: /\b(?:weekly|monthly|every\s+\d+\s+(?:week|month)s?|\d+\s*[–—-]\s*\d+\s+months|20-minute\s+seal\s+change)\b/i },
    { label: 'stale unverified-weight fallback', pattern: /(?:\b(?:confirm|verify|request|check|determine)\b[^.!?\n]{0,120}\bweight\b|\bweight\b[^.!?\n]{0,120}\b(?:confirm|verify|request|check|determine)\b)/i },
  ],
  de: [
    { label: 'absolute dust-protected product-type claim', pattern: /\bstaubgeschützte[nrms]?\s+(?:Drehdurchführung|Ausführung)\b/iu },
    { label: 'fixed maintenance or seal-replacement interval', pattern: /\b(?:wöchentlich|monatlich|alle\s+\d+\s+(?:Wochen|Monate)|\d+\s*[–—-]\s*\d+\s+Monate)\b/iu },
    { label: 'unapproved non-air operating implication', pattern: /\bWasser- oder Kühlmittelbetrieb\b/iu },
    { label: 'stale unverified-weight fallback', pattern: /(?:(?:Gewicht|Masse)[^.!?\n]{0,120}(?:bestätigen|prüfen|klären|anfragen)|(?:bestätigen|prüfen|klären|anfragen)[^.!?\n]{0,120}(?:Gewicht|Masse))/iu },
  ],
  ja: [
    { label: 'absolute dust-protected product-type claim', pattern: /(?:防じんロータリージョイント|防じん型)/u },
    { label: 'fixed maintenance or seal-replacement interval', pattern: /(?:毎週|毎月|\d+\s*(?:か|ヶ)?月ごと|\d+\s*[～〜–—-]\s*\d+\s*(?:か|ヶ)?月)/u },
    { label: 'unapproved non-air operating implication', pattern: /粉じん環境での水・クーラント使用/u },
    { label: 'stale unverified-weight fallback', pattern: /(?:質量|重量)[^。！？\n]{0,100}(?:確認|照会)/u },
  ],
  ru: [
    { label: 'absolute dust-protected product-type claim', pattern: /пылезащищ[ёе]нн(?:ое|ая|ую|ый|ые)\s+(?:вращающееся соединение|соединение|версия|исполнение)/iu },
    { label: 'fixed maintenance or seal-replacement interval', pattern: /\b(?:еженедельно|ежемесячно|кажд(?:ую|ые)\s+\d*\s*(?:недел|месяц)\w*|\d+\s*[–—-]\s*\d+\s+месяц\w*)\b/iu },
    { label: 'unapproved non-air operating implication', pattern: /Вода или СОЖ в запылённой среде/iu },
    { label: 'stale unverified-weight fallback', pattern: /(?:(?:уточн|подтверд|провер|запрос)\p{L}*(?:\s+\S+){0,3}\s+(?:масс|вес)\p{L}*|(?:масс|вес)\p{L}*(?:\s+\S+){0,3}\s+(?:уточн|подтверд|провер|запрос)\p{L}*)/iu },
  ],
};
const drawingBackedAssociationSelectors = [
  'tr',
  'li',
  '.product-card',
  '.product-card-large',
  '.app-related-product',
  '.compat-item',
  '.faq-item',
  '.app-faq-item',
  '.related-card',
  '.comparison-card',
  'script[type="application/ld+json"]',
].join(',');

function publicPath(locale, fileName) {
  return locale.directory ? `${locale.directory}/${fileName}` : fileName;
}

function publicUrl(locale, fileName) {
  return `${siteOrigin}/${publicPath(locale, fileName)}`;
}

function targetClaimViolations(source, localeCode, targetAssociated = true) {
  if (!targetAssociated) return [];
  return [
    ...drawingBackedForbiddenPatterns,
    ...(drawingBackedTargetForbiddenByLocale[localeCode] || []),
  ].filter(({ pattern }) => pattern.test(source));
}

function runDrawingBackedValidatorCases() {
  const cases = [
    { locale: 'en', text: 'Inspect dust seal weekly and replace it every 3–4 months.', expected: true },
    { locale: 'de', text: 'BP-2P-50-0001 ist eine staubgeschützte Drehdurchführung.', expected: true },
    { locale: 'ja', text: 'BP-2P-50-0001 防じんロータリージョイント', expected: true },
    { locale: 'ru', text: 'BP-2P-50-0001 — пылезащищённое вращающееся соединение.', expected: true },
    { locale: 'de', text: 'Wasser- oder Kühlmittelbetrieb in staubiger Umgebung', expected: true },
    { locale: 'ja', text: '粉じん環境での水・クーラント使用', expected: true },
    { locale: 'ru', text: 'Вода или СОЖ в запылённой среде', expected: true },
    {
      locale: 'en',
      text: 'A general article compares dust seal designs without referring to the target model.',
      targetAssociated: false,
      expected: false,
    },
    {
      locale: 'en',
      text: 'Protective shroud and labyrinth for dusty environments; no certified IP rating is claimed.',
      expected: false,
    },
    {
      locale: 'en',
      text: 'Direct pressure washing can force water past protective features. Do not direct the wash jet at the shroud or labyrinth.',
      expected: false,
    },
    { locale: 'en', text: 'Net weight: 2.3 kg (2,300 g).', expected: false },
    { locale: 'en', text: 'Confirm weight for the supplied configuration.', expected: true },
    { locale: 'de', text: 'Gewicht der gelieferten Konfiguration bestätigen.', expected: true },
    { locale: 'ja', text: '納入仕様の質量をご確認ください。', expected: true },
    { locale: 'ru', text: 'Уточните массу поставляемой конфигурации.', expected: true },
  ];
  for (const testCase of cases) {
    const actual = targetClaimViolations(
      testCase.text,
      testCase.locale,
      testCase.targetAssociated ?? true,
    ).length > 0;
    if (actual !== testCase.expected) {
      failures.push(`Drawing-backed validator regression case failed for ${testCase.locale}: ${testCase.text}`);
    }
  }
}

function validateDrawingBackedSourceContract() {
  const product = drawingManifest.products?.[drawingBackedModel];
  const facts = product?.drawingFacts;
  const actual = {
    schemaVersion: drawingManifest.schemaVersion,
    status: product?.status,
    websiteModel: product?.websiteModel,
    drawingPath: product?.drawing?.path,
    titleBlockModel: product?.drawing?.titleBlockModel,
    media: facts?.media,
    maximumPressure: facts?.maximumPressure,
    maximumSpeed: facts?.maximumSpeed,
    bodyMaterial: facts?.bodyMaterial,
    weight: facts?.weight,
    sealMaterials: facts?.sealMaterials,
    mountingStatus: facts?.mounting?.status,
    mounting: facts?.mounting?.features?.map(({ side, count, thread, depthMm }) => ({ side, count, thread, depthMm })),
    portStatus: facts?.ports?.status,
    ports: facts?.ports?.annotations?.map(({ role, count, thread }) => ({ role, count, thread })),
  };
  const expected = {
    schemaVersion: 1,
    status: drawingManifest.sourcePolicy?.verifiedStatus,
    websiteModel: drawingBackedModel,
    drawingPath: 'downloads/BP-2P-50-0001.pdf',
    titleBlockModel: drawingBackedModel,
    media: ['air'],
    maximumPressure: { value: 1, unit: 'MPa' },
    maximumSpeed: { value: 100, unit: 'RPM' },
    bodyMaterial: 'Aluminum Alloy 6061',
    weight: { value: 2300, unit: 'g' },
    sealMaterials: ['PTFE', 'O-ring'],
    mountingStatus: 'verified',
    mounting: [
      { side: 'stator', count: 4, thread: 'M5', depthMm: 10 },
      { side: 'rotor', count: 6, thread: 'M5', depthMm: 8 },
    ],
    portStatus: 'verified',
    ports: [
      { role: 'inlet', count: 2, thread: 'G1/8' },
      { role: 'outlet', count: 2, thread: 'G1/8' },
    ],
  };
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    failures.push(`${drawingBackedModel}: data/product-drawing-facts.json no longer matches the verified drawing-first contract`);
  }
}

async function readHtml(locale, fileName) {
  const relative = publicPath(locale, fileName);
  try {
    return load(await readFile(path.join(repoRoot, relative), 'utf8'));
  } catch (error) {
    failures.push(`${relative}: unable to read page (${error.message})`);
    return null;
  }
}

function collectJsonLd($, relative) {
  const nodes = [];
  $('script[type="application/ld+json"]').each((index, element) => {
    try {
      const value = JSON.parse($(element).html() || '');
      nodes.push(value);
      if (Array.isArray(value?.['@graph'])) nodes.push(...value['@graph']);
    } catch (error) {
      failures.push(`${relative}: invalid JSON-LD block ${index + 1} (${error.message})`);
    }
  });
  return nodes;
}

function validateDetailPage($, locale, fileName, model) {
  const relative = publicPath(locale, fileName);
  const expectedUrl = publicUrl(locale, fileName);
  const expectedProductId = `${siteOrigin}/${fileName}#product`;
  const title = $('title').first().text().trim();
  const h1 = $('h1').first().text().replace(/\s+/g, ' ').trim();
  const canonical = $('link[rel="canonical"]').attr('href');
  const ogUrl = $('meta[property="og:url"]').attr('content');

  if (!title.includes(model)) failures.push(`${relative}: title does not contain ${model}`);
  if (!h1.includes(model)) failures.push(`${relative}: H1 does not contain ${model}`);
  if (canonical !== expectedUrl) failures.push(`${relative}: canonical URL mismatch (${canonical || 'missing'})`);
  if (ogUrl !== expectedUrl) failures.push(`${relative}: og:url mismatch (${ogUrl || 'missing'})`);

  const productNodes = collectJsonLd($, relative).filter((node) => node?.['@type'] === 'Product');
  if (productNodes.length !== 1) {
    failures.push(`${relative}: expected exactly one Product JSON-LD node, found ${productNodes.length}`);
    return;
  }

  const product = productNodes[0];
  if (product.sku !== model) failures.push(`${relative}: Product.sku mismatch (${product.sku || 'missing'})`);
  if (product.mpn !== model) failures.push(`${relative}: Product.mpn mismatch (${product.mpn || 'missing'})`);
  if (product.url !== expectedUrl) failures.push(`${relative}: Product.url mismatch (${product.url || 'missing'})`);
  if (product['@id'] !== expectedProductId) failures.push(`${relative}: Product @id mismatch (${product['@id'] || 'missing'})`);
  if (typeof product.name !== 'string' || !product.name.includes(model)) failures.push(`${relative}: Product.name does not contain ${model}`);

  const skuProperty = Array.isArray(product.additionalProperty)
    ? product.additionalProperty.find((property) => property?.value === model)
    : null;
  if (!skuProperty || skuProperty.value !== model) failures.push(`${relative}: Product additionalProperty SKU mismatch`);

  const visibleModelRows = $('tr').filter((_, row) => {
    const label = $(row).find('th').first().text().replace(/\s+/g, ' ').trim();
    const value = $(row).find('td').first().text().replace(/\s+/g, ' ').trim();
    return Boolean(label) && value === model;
  });
  if (visibleModelRows.length < 1) {
    failures.push(`${relative}: visible SKU does not match ${model}`);
  }
}

function runCatalogFilterScript(filterSource, relative, channels, expectedCounts) {
  class FakeClassList {
    constructor(initial = []) {
      this.values = new Set(initial);
    }

    contains(value) {
      return this.values.has(value);
    }

    toggle(value, force) {
      if (force) this.values.add(value);
      else this.values.delete(value);
      return Boolean(force);
    }
  }

  const buttons = catalogFilterCodes.map((filter, index) => ({
    dataset: { filter },
    textContent: `display-label-${catalogFilterCodes.length - index}`,
    attributes: { 'aria-pressed': index === 0 ? 'true' : 'false' },
    classList: new FakeClassList(index === 0 ? ['active'] : []),
    listeners: {},
    addEventListener(type, listener) {
      this.listeners[type] = listener;
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
  }));
  const cards = channels.map((channel) => ({ dataset: { channel }, style: { display: '' } }));
  const pagination = { style: { display: '' } };
  const document = {
    querySelectorAll(selector) {
      if (selector === '.filter-btn') return buttons;
      if (selector === '.product-card-large') return cards;
      return [];
    },
    querySelector(selector) {
      return selector === '.pagination' ? pagination : null;
    },
  };

  try {
    vm.runInNewContext(filterSource, { document }, { timeout: 500 });
  } catch (error) {
    failures.push(`${relative}: filter script could not run in the contract harness (${error.message})`);
    return;
  }

  for (const [index, button] of buttons.entries()) {
    if (typeof button.listeners.click !== 'function') {
      failures.push(`${relative}: filter ${catalogFilterCodes[index]} has no click handler`);
      continue;
    }
    button.listeners.click();
    const visibleCount = cards.filter((card) => card.style.display !== 'none').length;
    if (visibleCount !== expectedCounts[index]) {
      failures.push(`${relative}: filter ${catalogFilterCodes[index]} shows ${visibleCount} cards; expected ${expectedCounts[index]}`);
    }
    const activeButtons = buttons.filter((candidate) => candidate.classList.contains('active'));
    const pressedButtons = buttons.filter((candidate) => candidate.attributes['aria-pressed'] === 'true');
    if (activeButtons.length !== 1 || activeButtons[0] !== button) {
      failures.push(`${relative}: filter ${catalogFilterCodes[index]} must be the only active button after click`);
    }
    if (pressedButtons.length !== 1 || pressedButtons[0] !== button) {
      failures.push(`${relative}: filter ${catalogFilterCodes[index]} must be the only aria-pressed=true button after click`);
    }
    const expectedPagination = catalogFilterCodes[index] === 'all' ? '' : 'none';
    if (pagination.style.display !== expectedPagination) {
      failures.push(`${relative}: filter ${catalogFilterCodes[index]} sets pagination display to ${pagination.style.display || '(empty)'}; expected ${expectedPagination || '(empty)'}`);
    }
  }

  const snapshot = JSON.stringify({
    buttons: buttons.map((button) => ({
      active: button.classList.contains('active'),
      pressed: button.attributes['aria-pressed'],
    })),
    cards: cards.map((card) => card.style.display),
    pagination: pagination.style.display,
  });
  const lastButton = buttons.at(-1);
  lastButton.dataset.filter = 'unexpected-filter';
  lastButton.listeners.click();
  const afterUnknown = JSON.stringify({
    buttons: buttons.map((button) => ({
      active: button.classList.contains('active'),
      pressed: button.attributes['aria-pressed'],
    })),
    cards: cards.map((card) => card.style.display),
    pagination: pagination.style.display,
  });
  if (afterUnknown !== snapshot) {
    failures.push(`${relative}: unknown filter codes must leave the catalog state unchanged`);
  }
}

function validateCatalogFilter($, locale, catalogName) {
  const relative = publicPath(locale, catalogName);
  const expectedCounts = catalogFilterCounts[catalogName];
  const buttons = $('.filter-btn').toArray();
  if (buttons.length !== catalogFilterCodes.length) {
    failures.push(`${relative}: expected ${catalogFilterCodes.length} filter buttons, found ${buttons.length}`);
  }
  buttons.forEach((button, index) => {
    const element = $(button);
    const expectedFilter = catalogFilterCodes[index];
    if (element.attr('type') !== 'button') failures.push(`${relative}: filter button ${index + 1} must use type=button`);
    if (element.attr('data-filter') !== expectedFilter) failures.push(`${relative}: filter button ${index + 1} must use data-filter=${expectedFilter}`);
    const expectedPressed = index === 0 ? 'true' : 'false';
    if (element.attr('aria-pressed') !== expectedPressed) failures.push(`${relative}: filter button ${index + 1} must start with aria-pressed=${expectedPressed}`);
    if (element.hasClass('active') !== (index === 0)) failures.push(`${relative}: only the All filter may start active`);
  });

  const cards = $('.product-card-large').toArray();
  if (cards.length !== expectedCounts[0]) failures.push(`${relative}: expected ${expectedCounts[0]} catalog cards, found ${cards.length}`);
  const channels = cards.map((card) => $(card).attr('data-channel') || '');
  cards.forEach((card, index) => {
    const element = $(card);
    const style = element.attr('style') || '';
    if (element.attr('hidden') !== undefined
        || element.attr('aria-hidden') === 'true'
        || /(?:^|;)\s*display\s*:\s*none\b/i.test(style)) {
      failures.push(`${relative}: card ${index + 1} must remain visible without JavaScript`);
    }
  });

  const pagination = $('.pagination');
  if (pagination.length !== 1) failures.push(`${relative}: expected one pagination element, found ${pagination.length}`);
  if (pagination.attr('hidden') !== undefined || /(?:^|;)\s*display\s*:\s*none\b/i.test(pagination.attr('style') || '')) {
    failures.push(`${relative}: pagination must be visible before JavaScript runs`);
  }

  const filterScripts = $('script:not([src])').toArray()
    .map((script) => $(script).html() || '')
    .filter((source) => source.includes('FILTER BAR (data-channel based)'));
  if (filterScripts.length !== 1) {
    failures.push(`${relative}: expected one inline catalog filter script, found ${filterScripts.length}`);
    return;
  }
  const filterSource = filterScripts[0].slice(filterScripts[0].indexOf('// ===== FILTER BAR'));
  if (!/\bbtn\s*\.\s*dataset\s*\.\s*filter\b/.test(filterSource)) {
    failures.push(`${relative}: filter script must read btn.dataset.filter`);
  }
  if (/\b(?:textContent|innerText)\b/.test(filterSource)
      || /getAttribute\s*\(\s*['"]data-filter['"]\s*\)/.test(filterSource)) {
    failures.push(`${relative}: filter script must not derive machine categories from visible button text or alternate attribute reads`);
  }
  runCatalogFilterScript(filterSource, relative, channels, expectedCounts);
  runCatalogFilterScript(filterSource, `${relative} synthetic channel contract`, [
    '4-channel+',
    '6-channel',
    '8-channel',
    '2-channel',
    '2-channel-extra',
  ], [5, 0, 1, 0, 3, 0]);
}

async function validateCatalog(locale, models) {
  const references = [];
  for (const catalogName of ['products.html', 'products-p2.html']) {
    const $ = await readHtml(locale, catalogName);
    if (!$) continue;
    validateCatalogFilter($, locale, catalogName);
    $('.product-card-large[data-href]').each((_, element) => {
      const card = $(element);
      const href = card.attr('data-href') || '';
      references.push(href);
      const detailLinks = card.find(`a[href="${href}"]`).length;
      if (detailLinks !== 1) failures.push(`${publicPath(locale, catalogName)}: ${href} card must have one matching detail link`);
      const model = path.basename(href, '.html');
      if (!card.text().includes(model)) failures.push(`${publicPath(locale, catalogName)}: ${href} card text does not contain its model`);
    });
  }

  const counts = new Map();
  for (const reference of references) counts.set(reference, (counts.get(reference) || 0) + 1);
  for (const model of models) {
    const fileName = `${model}.html`;
    if (counts.get(fileName) !== 1) failures.push(`${locale.code} catalogs: ${fileName} must appear exactly once (found ${counts.get(fileName) || 0})`);
  }
  for (const reference of counts.keys()) {
    if (!models.has(path.basename(reference, '.html'))) failures.push(`${locale.code} catalogs: unexpected product reference ${reference}`);
  }
}

async function validateSearchIndex(locale, models) {
  const relative = publicPath(locale, 'search-index.json');
  let index;
  try {
    index = JSON.parse(await readFile(path.join(repoRoot, relative), 'utf8'));
  } catch (error) {
    failures.push(`${relative}: unable to parse search index (${error.message})`);
    return;
  }
  const products = index.filter((item) => item?.category === 'product');
  for (const model of models) {
    const records = products.filter((item) => item.id === model);
    if (records.length !== 1) {
      failures.push(`${relative}: ${model} must have exactly one product record (found ${records.length})`);
      continue;
    }
    const record = records[0];
    if (record.url !== `${model}.html`) failures.push(`${relative}: ${model} URL mismatch (${record.url || 'missing'})`);
    if (!String(record.title || '').includes(model)) failures.push(`${relative}: ${model} title mismatch`);
    if (!String(record.h1 || '').includes(model)) failures.push(`${relative}: ${model} H1 mismatch`);
  }
  for (const record of products) {
    if (!models.has(record.id)) failures.push(`${relative}: unexpected product record ${record.id || '(missing id)'}`);
  }
}

async function validateDrawingBackedPublicPolicy(locale) {
  const expected = drawingBackedPolicyByLocale[locale.code];
  const contract = drawingBackedUiContract(locale.code, drawingBackedModel);
  const detailFile = `${drawingBackedModel}.html`;
  const detailRelative = publicPath(locale, detailFile);
  const $ = await readHtml(locale, detailFile);
  if (!$) return;
  if (contract?.status !== drawingManifest.sourcePolicy?.verifiedStatus) {
    failures.push(`${detailRelative}: shared localized contract is not drawing-verified`);
    return;
  }

  const detailSource = $.html();
  const visibleText = $('body').text().replace(/\s+/g, ' ').trim();
  for (const { label } of targetClaimViolations(detailSource, locale.code)) {
    failures.push(`${detailRelative}: drawing-backed policy forbids ${label}`);
  }
  for (const field of contract.requiredJsonFields) {
    if (!visibleText.includes(contract.fields[field])) {
      failures.push(`${detailRelative}: visible product data is missing drawing-backed ${field} value (${contract.fields[field]})`);
    }
  }
  for (const field of ['performance', 'seal', 'mount', 'media']) {
    const actual = $(`.pd-key-spec[data-spec-key="${field}"] dd`).first().text().replace(/\s+/g, ' ').trim();
    if (actual !== contract.keyValues[field]) {
      failures.push(`${detailRelative}: key specification ${field} does not match the drawing-backed localized contract`);
    }
  }

  const product = collectJsonLd($, detailRelative).find((node) => node?.['@type'] === 'Product');
  if (!product) return;
  if (product.description !== contract.structuredDescription) {
    failures.push(`${detailRelative}: Product JSON-LD description does not match the drawing-backed localized contract`);
  }
  for (const field of contract.requiredJsonFields) {
    const propertyName = contract.jsonPropertyNames[field];
    const matchingProperties = product.additionalProperty?.filter((property) => property?.name === propertyName) || [];
    if (matchingProperties.length !== 1 || matchingProperties[0].value !== contract.fields[field]) {
      failures.push(`${detailRelative}: Product JSON-LD ${propertyName} does not match drawing-backed ${field}`);
    }
  }

  const reviewedNonAirBlocks = new Set();
  $('tr, li, .compat-item, .faq-item, .app-detail-card, p').each((_, element) => {
    const blockText = $(element).text().replace(/\s+/g, ' ').trim();
    if (!blockText || reviewedNonAirBlocks.has(blockText)) return;
    reviewedNonAirBlocks.add(blockText);
    if (expected.nonAirTerms.test(blockText) && !expected.nonAirQualification.test(blockText)) {
      failures.push(`${detailRelative}: non-air medium appears without written-confirmation or prohibition wording (${blockText.slice(0, 120)})`);
    }
  });

  const catalog = await readHtml(locale, 'products.html');
  const card = catalog?.(`.product-card-large[data-href="${detailFile}"]`);
  const cardText = card?.text().replace(/\s+/g, ' ').trim() || '';
  if (!card?.length || !cardText.includes(expected.cardText)) {
    failures.push(`${publicPath(locale, 'products.html')}: ${drawingBackedModel} card does not expose the protective-shroud and labyrinth design`);
  }
  for (const fragment of expected.catalogFragments) {
    if (!cardText.toLocaleLowerCase(locale.code).includes(fragment.toLocaleLowerCase(locale.code))) {
      failures.push(`${publicPath(locale, 'products.html')}: ${drawingBackedModel} drawing-backed card is missing ${fragment}`);
    }
  }
  for (const { label } of targetClaimViolations(card?.html() || '', locale.code)) {
    failures.push(`${publicPath(locale, 'products.html')}: ${drawingBackedModel} card contains forbidden ${label}`);
  }

  const comparison = await readHtml(locale, 'product-comparison.html');
  const row = comparison?.('tr').filter((_, element) => comparison(element).text().includes(drawingBackedModel)).first();
  const comparisonText = row?.text().replace(/\s+/g, ' ').trim() || '';
  if (!row?.length) {
    failures.push(`${publicPath(locale, 'product-comparison.html')}: ${drawingBackedModel} row is missing`);
  } else {
    for (const fragment of expected.comparisonFragments) {
      if (!comparisonText.toLocaleLowerCase(locale.code).includes(fragment.toLocaleLowerCase(locale.code))) {
        failures.push(`${publicPath(locale, 'product-comparison.html')}: ${drawingBackedModel} drawing-backed summary is missing ${fragment}`);
      }
    }
  }
  for (const { label } of targetClaimViolations(row?.html() || '', locale.code)) {
    failures.push(`${publicPath(locale, 'product-comparison.html')}: ${drawingBackedModel} row contains forbidden ${label}`);
  }

  const searchRelative = publicPath(locale, 'search-index.json');
  const searchIndex = JSON.parse(await readFile(path.join(repoRoot, searchRelative), 'utf8'));
  const searchRecord = searchIndex.find((entry) => entry?.id === drawingBackedModel);
  const searchSource = JSON.stringify(searchRecord || {});
  for (const { label } of targetClaimViolations(searchSource, locale.code)) {
    failures.push(`${searchRelative}: ${drawingBackedModel} record contains forbidden ${label}`);
  }
  const expectedSearchDescription = drawingBackedProductMetadata(locale.code, drawingBackedModel).description;
  const expectedSearchKeywords = drawingBackedProductKeywords(locale.code, drawingBackedModel);
  if (searchRecord?.description !== expectedSearchDescription) {
    failures.push(`${searchRelative}: ${drawingBackedModel} description is not drawing-backed`);
  }
  if (JSON.stringify(searchRecord?.keywords) !== JSON.stringify(expectedSearchKeywords)) {
    failures.push(`${searchRelative}: ${drawingBackedModel} keywords are not drawing-backed`);
  }

  const llmsRelative = publicPath(locale, 'llms.txt');
  const llmsSource = await readFile(path.join(repoRoot, llmsRelative), 'utf8');
  const llmsLine = llmsSource.split(/\r?\n/).find((line) => line.includes(`${detailFile})`)) || '';
  const expectedLlmsLine = `- [${drawingBackedProductLinkLabel(locale.code, drawingBackedModel)}](${publicUrl(locale, detailFile)}): ${drawingBackedProductSummary(locale.code, drawingBackedModel)}`;
  if (llmsLine !== expectedLlmsLine) {
    failures.push(`${llmsRelative}: ${drawingBackedModel} entry is not drawing-backed`);
  }
  for (const { label } of targetClaimViolations(llmsLine, locale.code)) {
    failures.push(`${llmsRelative}: ${drawingBackedModel} entry contains forbidden ${label}`);
  }

  const localeDirectory = path.join(repoRoot, locale.directory);
  const publicHtmlFiles = (await readdir(localeDirectory)).filter((fileName) => fileName.endsWith('.html'));
  for (const fileName of publicHtmlFiles) {
    const relative = publicPath(locale, fileName);
    if (relative === detailRelative) continue;
    const source = await readFile(path.join(localeDirectory, fileName), 'utf8');
    if (!source.includes(drawingBackedModel)) continue;
    const publicPage = load(source);
    publicPage(drawingBackedAssociationSelectors).each((_, element) => {
      const associatedText = publicPage(element).text().replace(/\s+/g, ' ').trim();
      if (!associatedText.includes(drawingBackedModel)) return;
      for (const { label } of targetClaimViolations(associatedText, locale.code)) {
        failures.push(`${relative}: ${drawingBackedModel} associated public block contains forbidden ${label}`);
      }
    });
  }
}

const productFiles = Object.keys(drawingManifest.products || {}).map((model) => `${model}.html`).sort();
const models = new Set(productFiles.map((fileName) => path.basename(fileName, '.html')));
if (!models.size) failures.push('No product detail pages were found.');

runDrawingBackedValidatorCases();
validateDrawingBackedSourceContract();

for (const locale of locales) {
  for (const fileName of productFiles) {
    const model = path.basename(fileName, '.html');
    const $ = await readHtml(locale, fileName);
    if ($) validateDetailPage($, locale, fileName, model);
  }
  await validateCatalog(locale, models);
  await validateSearchIndex(locale, models);
  await validateDrawingBackedPublicPolicy(locale);
}

const sitemapSources = {
  primary: await readFile(path.join(repoRoot, 'sitemap.xml'), 'utf8'),
  localized: await readFile(path.join(repoRoot, 'sitemap-i18n.xml'), 'utf8'),
};
for (const model of models) {
  const englishUrl = `${siteOrigin}/${model}.html`;
  const englishLocPattern = new RegExp(`<loc>\\s*${englishUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*</loc>`, 'g');
  if ((sitemapSources.primary.match(englishLocPattern) || []).length !== 1) {
    failures.push(`sitemap.xml: ${englishUrl} must appear in exactly one loc element`);
  }
  for (const locale of locales.slice(1)) {
    const localizedUrl = `${siteOrigin}/${locale.code}/${model}.html`;
    const localizedLocPattern = new RegExp(`<loc>\\s*${localizedUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*</loc>`, 'g');
    if ((sitemapSources.localized.match(localizedLocPattern) || []).length !== 1) {
      failures.push(`sitemap-i18n.xml: ${localizedUrl} must appear in exactly one loc element`);
    }
  }
}

for (const required of ['products.html', 'products-p2.html', 'search-index.json']) {
  await access(path.join(repoRoot, required)).catch((error) => failures.push(`${required}: missing (${error.message})`));
}

if (failures.length) {
  console.error(`Product data validation failed with ${failures.length} issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Product data validation passed: ${models.size} models across ${locales.length} languages, catalogs, search indexes, JSON-LD, and sitemaps.`);
