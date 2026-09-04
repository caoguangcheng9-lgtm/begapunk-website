import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  drawingBackedCanonicalField,
  drawingBackedUiContract,
  drawingBackedPublicStep,
} from './lib/drawing-backed-product-facts.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FACTS_PATH = path.join(ROOT, 'data', 'product-drawing-facts.json');
const SITE_CONFIG = JSON.parse(await fs.readFile(path.join(ROOT, 'i18n', 'config.json'), 'utf8'));
const SOURCE_LOCALE = SITE_CONFIG.sourceLanguage?.code;
const ACTIVE_LOCALES = Object.freeze([...new Set([SOURCE_LOCALE, ...(SITE_CONFIG.activeLanguageCodes || [])])]);
const LOCALES = Object.freeze(Object.fromEntries(ACTIVE_LOCALES.map((locale) => [
  locale,
  Object.freeze({ prefix: locale === SOURCE_LOCALE ? '' : locale }),
])));
const EXPECTED_MODEL_COUNT = 16;
const EXPECTED_PAGE_COUNT = EXPECTED_MODEL_COUNT * Object.keys(LOCALES).length;
const PORT_CATEGORY_MODELS = new Set(['BP-1P-0003', 'BP-2P-08-0001']);
const IDENTITY_PENDING_MODELS = new Set();
// Owner-confirmed capability. The public page must still distinguish the
// drawing-listed pneumatic configuration from the custom hydraulic variant.
const OWNER_CONFIRMED_CUSTOM_HYDRAULIC_MODELS = new Set(['BP-2P-130-0001']);
const PORT_ANOMALY_MODEL = 'BP-3P-0006';

const args = process.argv.slice(2);
if (args.length > 1 || (args[0] && !['--check', '--write'].includes(args[0]))) {
  throw new Error('Usage: node scripts/sync-drawing-backed-product-pages.mjs [--check|--write]');
}
const mode = args[0] === '--write' ? 'write' : 'check';

const WARRANTY_EXPECTATIONS = Object.freeze({
  en: Object.freeze({ label: 'Warranty period', value: '1 year from shipment' }),
  de: Object.freeze({ label: 'Garantiezeitraum', value: '1 Jahr ab Versand' }),
  fr: Object.freeze({ label: 'Durée de garantie', value: "1 an à compter de l'expédition" }),
  ja: Object.freeze({ label: '保証期間', value: '出荷日から1年' }),
  ru: Object.freeze({ label: 'Гарантийный срок', value: '1 год с даты отгрузки' }),
});

const CAD_EXPECTATIONS = Object.freeze({
  en: Object.freeze({ label: '3D CAD model', value: 'STEP AP214 download available for fit check (simplified body)', mediaName: (model) => `${model} STEP AP214 (simplified, fit check)` }),
  de: Object.freeze({ label: '3D-CAD-Modell', value: 'STEP-AP214-Datei zur Einbauprüfung verfügbar (vereinfachter Körper)', mediaName: (model) => `${model} – STEP AP214 (vereinfacht, zur Einbauprüfung)` }),
  fr: Object.freeze({ label: 'Modèle CAO 3D', value: 'Fichier STEP AP214 disponible pour le contrôle d’intégration (corps simplifié)', mediaName: (model) => `${model} — STEP AP214 (corps simplifié, contrôle d’intégration)` }),
  ja: Object.freeze({ label: '3D CADモデル', value: '取付確認用STEP AP214ファイルをダウンロード可能（簡略化ボディ）', mediaName: (model) => `${model} STEP AP214（簡略化ボディ、取付確認用）` }),
  ru: Object.freeze({ label: '3D-модель CAD', value: 'Файл STEP AP214 доступен для проверки компоновки (упрощённый корпус)', mediaName: (model) => `${model} — STEP AP214 (упрощённый корпус, для проверки компоновки)` }),
});
const CAD_PROPERTY_LABELS = new Set(['3D CAD model', '3D CAD modèle', ...Object.values(CAD_EXPECTATIONS).map(({ label }) => label)]);
const PRODUCT_CATEGORY_EXPECTATIONS = Object.freeze({
  en: 'Pneumatic rotary union',
  de: 'Pneumatische Drehdurchführung',
  fr: 'Raccord tournant pneumatique',
  ja: '空圧用ロータリージョイント',
  ru: 'Пневматическое вращающееся соединение',
});

const KEY_PORT_LABELS = Object.freeze({
  en: 'Ports',
  de: 'Anschlüsse',
  fr: 'Orifices',
  ja: 'ポート',
  ru: 'Порты',
});

const rawFacts = await fs.readFile(FACTS_PATH, 'utf8');
const factContract = JSON.parse(rawFacts);
validateFactContract(factContract);

const modelEntries = Object.entries(factContract.products).sort(([a], [b]) => a.localeCompare(b));
const pagePlans = [];

for (const [model, product] of modelEntries) {
  for (const [locale, localeConfig] of Object.entries(LOCALES)) {
    const relativePath = localeConfig.prefix ? `${localeConfig.prefix}/${model}.html` : `${model}.html`;
    const filePath = path.join(ROOT, ...relativePath.split('/'));
    const before = await fs.readFile(filePath, 'utf8');
    const localized = buildLocalizedContract(locale, model, product);
    const beforeContract = buildPageTargets(before, relativePath, locale, model, product, localized);

    // Freeze every non-target byte before any transformation. This protects layout,
    // navigation, CTA, downloads, comparison, sharing, and the one-year warranty.
    const frozenBefore = freezeProtectedSurface(before, beforeContract, relativePath, locale, model, product);
    const after = applyTargets(before, beforeContract.targets, relativePath);
    const afterContract = buildPageTargets(after, relativePath, locale, model, product, localized);
    const frozenAfter = freezeProtectedSurface(after, afterContract, relativePath, locale, model, product);
    assertProtectedSurfaceUnchanged(frozenBefore, frozenAfter, relativePath);
    assertTargetContract(after, afterContract, relativePath, locale, model, product);

    const changes = beforeContract.targets.filter((target) => target.current !== target.desired);
    const residuals = collectResidualDrawingRisks(after, afterContract.targets, locale, model, product);
    pagePlans.push({
      relativePath,
      filePath,
      before,
      after,
      changed: after !== before,
      changes,
      residuals,
      status: product.status,
      locale,
      firstViewEstimate: estimateFirstViewLines(locale, localized, beforeContract.keySpec.finalKeys),
    });
  }
}

if (pagePlans.length !== EXPECTED_PAGE_COUNT) {
  throw new Error(`Expected ${EXPECTED_PAGE_COUNT} localized product pages; planned ${pagePlans.length}.`);
}

// No page is written until every in-memory transformation and protection assertion passes.
if (mode === 'write') {
  for (const plan of pagePlans) {
    if (plan.changed) await fs.writeFile(plan.filePath, plan.after, 'utf8');
  }
}

printReport(pagePlans, mode);
if (mode === 'check' && pagePlans.some((plan) => plan.changed)) process.exit(1);

function validateFactContract(contract) {
  if (contract?.schemaVersion !== 1 || !contract?.sourcePolicy || !contract?.products) {
    throw new Error('Drawing fact contract must use schemaVersion 1 and contain sourcePolicy/products.');
  }
  const entries = Object.entries(contract.products);
  if (entries.length !== EXPECTED_MODEL_COUNT) {
    throw new Error(`Expected ${EXPECTED_MODEL_COUNT} drawing fact products; found ${entries.length}.`);
  }
  const pendingFromPolicy = new Set(contract.sourcePolicy.identityPendingModels || []);
  if (!setEquals(pendingFromPolicy, IDENTITY_PENDING_MODELS)) {
    throw new Error('Identity-pending policy does not match the approved pending-model set.');
  }
  for (const [model, product] of entries) {
    if (product.websiteModel !== model || !product.drawing || !product.drawingFacts) {
      throw new Error(`${model}: incomplete or mismatched drawing fact record.`);
    }
    if (!['verified-drawing', 'identity-pending'].includes(product.status)) {
      throw new Error(`${model}: unsupported drawing status ${product.status}.`);
    }
    if (product.status === 'verified-drawing' && product.drawing.titleBlockModel !== model) {
      throw new Error(`${model}: verified drawing title block does not match the website model.`);
    }
    if (product.status === 'identity-pending' && !IDENTITY_PENDING_MODELS.has(model)) {
      throw new Error(`${model}: unexpected identity-pending product.`);
    }
    const facts = product.drawingFacts;
    if (!Array.isArray(facts.media) || !facts.maximumPressure || !facts.maximumSpeed
      || !facts.bodyMaterial || !facts.temperatureRange || !facts.weight
      || !Array.isArray(facts.sealMaterials) || !facts.envelope || !facts.mounting || !facts.ports) {
      throw new Error(`${model}: drawingFacts is missing a required field.`);
    }
    if (product.status === 'verified-drawing'
      && ['drawing-audit-only'].includes(facts.mounting.status)) {
      throw new Error(`${model}: verified model cannot use audit-only mounting facts.`);
    }
    if (product.status === 'identity-pending'
      && (facts.mounting.status !== 'drawing-audit-only'
        || facts.envelope.status !== 'drawing-audit-only')) {
      throw new Error(`${model}: quarantined dimensions and mounting must remain drawing-audit-only.`);
    }
  }
  const anomaly = contract.products[PORT_ANOMALY_MODEL]?.drawingFacts?.ports;
  if (anomaly?.status !== 'anomaly-unresolved'
    || anomaly.annotations?.some((annotation) => annotation.thread !== 'G4/1')) {
    throw new Error(`${PORT_ANOMALY_MODEL}: unresolved raw G4/1 port contract changed unexpectedly.`);
  }
}

function buildLocalizedContract(locale, model, product) {
  const localized = drawingBackedUiContract(locale, model);
  if (!localized) throw new Error(`${model}/${locale}: shared drawing-backed UI contract is missing.`);
  const expectedStatus = product.status === 'identity-pending' ? 'identity-pending' : 'verified-drawing';
  if (localized.status !== expectedStatus) {
    throw new Error(`${model}/${locale}: shared drawing-backed UI status does not match the manifest.`);
  }
  return localized;
}

function buildPageTargets(source, relativePath, locale, model, product, localized) {
  const productJson = locateProductJson(source, relativePath, model);
  const desiredProduct = buildDesiredProduct(productJson.value, localized, locale, model, product);
  const targets = [{
    label: 'product-jsonld',
    surface: 'Product JSON-LD',
    start: productJson.start,
    end: productJson.end,
    current: source.slice(productJson.start, productJson.end),
    desired: JSON.stringify(desiredProduct),
  }];

  const keySpec = locateKeySpecTargets(source, relativePath, locale, model, localized);
  targets.push(...keySpec.targets);
  const specTable = locateSpecificationTargets(source, relativePath, locale, model, product, localized);
  targets.push(...specTable.targets);
  validateTargets(source, targets, relativePath);

  return {
    targets,
    productValue: productJson.value,
    desiredProduct,
    keySpec,
    specTable,
  };
}

function buildDesiredProduct(currentProduct, localized, locale, model, product) {
  const desired = JSON.parse(JSON.stringify(currentProduct));
  desired.description = localized.structuredDescription;
  if (localized.productName) desired.name = localized.productName;
  if (PRODUCT_CATEGORY_EXPECTATIONS[locale]) desired.category = PRODUCT_CATEGORY_EXPECTATIONS[locale];
  if (!Array.isArray(desired.additionalProperty)) {
    throw new Error(`${model}/${locale}: Product JSON-LD has no additionalProperty array.`);
  }

  findWarrantyProperty(currentProduct, locale, `${model}/${locale}`);
  for (const field of localized.requiredJsonFields) {
    const matches = desired.additionalProperty.filter((item) => drawingBackedCanonicalField(item?.name) === field);
    if (matches.length !== 1) {
      throw new Error(`${model}/${locale}: expected one Product JSON-LD property for ${field}; found ${matches.length}.`);
    }
    matches[0].name = localized.jsonPropertyNames[field];
    matches[0].value = localized.fields[field];
  }
  if (localized.hybridInterfacePropertyName) {
    const matches = desired.additionalProperty.filter((item) => item?.name === localized.hybridInterfacePropertyName);
    if (matches.length !== 1) {
      throw new Error(`${model}/${locale}: expected one hybrid Product JSON-LD property; found ${matches.length}.`);
    }
    matches[0].value = localized.keyValues.channels;
  }
  if (drawingBackedPublicStep(locale, model)) {
    const cad = CAD_EXPECTATIONS[locale];
    if (!cad) throw new Error(`${model}/${locale}: localized CAD schema copy is missing.`);
    desired.additionalProperty = desired.additionalProperty.filter((item) => !CAD_PROPERTY_LABELS.has(item?.name));
    desired.additionalProperty.push({
      '@type': 'PropertyValue',
      name: cad.label,
      value: cad.value,
    });
    desired.associatedMedia = {
      '@type': 'MediaObject',
      name: cad.mediaName(model),
      contentUrl: `https://www.begapunk.com/downloads/${model}.step`,
      encodingFormat: 'application/step',
    };
  }
  assertWarrantyPropertyPreserved(currentProduct, desired, locale, `${model}/${locale}`);
  return desired;
}

function locateProductJson(source, relativePath, model) {
  const scripts = [];
  const scriptPattern = /<script\b[^>]*\btype=(['"])application\/ld\+json\1[^>]*>([\s\S]*?)<\/script\s*>/gi;
  for (const match of source.matchAll(scriptPattern)) {
    const content = match[2];
    const contentOffset = match.index + match[0].indexOf(content);
    for (const span of jsonObjectSpans(content)) {
      const rawObject = content.slice(span.start, span.end);
      if (!rawObject.includes('Product') || !rawObject.includes(model)) continue;
      let value;
      try {
        value = JSON.parse(rawObject);
      } catch {
        continue;
      }
      const types = Array.isArray(value?.['@type']) ? value['@type'] : [value?.['@type']];
      if (types.includes('Product') && value.sku === model) {
        scripts.push({
          start: contentOffset + span.start,
          end: contentOffset + span.end,
          value,
        });
      }
    }
  }
  if (scripts.length !== 1) {
    throw new Error(`${relativePath}: expected exactly one Product JSON-LD object; found ${scripts.length}.`);
  }
  return scripts[0];
}

function jsonObjectSpans(text) {
  const stack = [];
  const spans = [];
  let inString = false;
  let escaped = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') {
      inString = true;
      continue;
    }
    if (character === '{') stack.push(index);
    else if (character === '}') {
      const start = stack.pop();
      if (start === undefined) throw new Error('Malformed JSON-LD object nesting.');
      spans.push({ start, end: index + 1 });
    }
  }
  if (inString || stack.length) throw new Error('Malformed JSON-LD string or object nesting.');
  return spans.sort((a, b) => (a.end - a.start) - (b.end - b.start));
}

function locateKeySpecTargets(source, relativePath, locale, model, localized) {
  const opening = findSingleOpeningTagByClass(source, 'dl', 'pd-key-specs', relativePath);
  const closingStart = source.indexOf('</dl>', opening.end);
  if (closingStart < 0) throw new Error(`${relativePath}: pd-key-specs closing tag not found.`);
  const innerStart = opening.end;
  const inner = source.slice(innerStart, closingStart);
  const itemPattern = /<div\b[^>]*class=(['"])[^'"]*\bpd-key-spec\b[^'"]*\1[^>]*>[\s\S]*?<\/div>/gi;
  const items = [];
  for (const match of inner.matchAll(itemPattern)) {
    const raw = match[0];
    const keyMatch = /\bdata-spec-key=(['"])([^'"]+)\1/i.exec(raw);
    const dtMatch = /<dt\b[^>]*>([\s\S]*?)<\/dt>/i.exec(raw);
    const ddMatch = /<dd\b[^>]*>([\s\S]*?)<\/dd>/i.exec(raw);
    if (!keyMatch || !dtMatch || !ddMatch) {
      throw new Error(`${relativePath}: malformed pd-key-spec item.`);
    }
    const absolute = innerStart + match.index;
    const keyValueOffset = keyMatch.index + keyMatch[0].indexOf(keyMatch[2]);
    const dtValueOffset = dtMatch.index + dtMatch[0].indexOf(dtMatch[1]);
    const ddValueOffset = ddMatch.index + ddMatch[0].indexOf(ddMatch[1]);
    items.push({
      key: keyMatch[2],
      dt: dtMatch[1],
      dd: ddMatch[1],
      keyStart: absolute + keyValueOffset,
      keyEnd: absolute + keyValueOffset + keyMatch[2].length,
      dtStart: absolute + dtValueOffset,
      dtEnd: absolute + dtValueOffset + dtMatch[1].length,
      ddStart: absolute + ddValueOffset,
      ddEnd: absolute + ddValueOffset + ddMatch[1].length,
    });
  }
  if (items.length < 6) {
    throw new Error(`${relativePath}: expected at least six pd-key-spec items; found ${items.length}.`);
  }
  if (new Set(items.map((item) => item.key)).size !== items.length) {
    throw new Error(`${relativePath}: duplicate pd-key-spec category.`);
  }

  const targets = [];
  const finalKeys = [];
  const portCategoryOverride = PORT_CATEGORY_MODELS.has(model);
  let categoryOverrideCount = 0;
  for (const item of items) {
    let desiredKey = item.key;
    if (portCategoryOverride && ['mount', 'ports'].includes(item.key)) {
      desiredKey = 'ports';
      categoryOverrideCount += 1;
      targets.push({
        label: 'key-category-name',
        surface: 'pd-key-specs',
        start: item.keyStart,
        end: item.keyEnd,
        current: item.key,
        desired: desiredKey,
      });
      targets.push({
        label: 'key-category-label',
        surface: 'pd-key-specs',
        start: item.dtStart,
        end: item.dtEnd,
        current: item.dt,
        desired: KEY_PORT_LABELS[locale],
      });
    }
    finalKeys.push(desiredKey);
    if (Object.hasOwn(localized.keyValues, desiredKey)) {
      targets.push({
        label: `key-${desiredKey}-value`,
        surface: 'pd-key-specs',
        start: item.ddStart,
        end: item.ddEnd,
        current: item.dd,
        desired: escapeHtmlText(localized.keyValues[desiredKey]),
      });
    }
  }
  const commercialGridModels = new Set(['BP-3P-0004', 'BP-2P-08-0001', 'BP-2P-95-0005', 'BP-3P-0007']);
  if (portCategoryOverride && categoryOverrideCount !== 1 && !commercialGridModels.has(model)) {
    throw new Error(`${relativePath}: expected one current mount/ports category for port-semantic migration.`);
  }
  if (new Set(finalKeys).size < 6) {
    throw new Error(`${relativePath}: final pd-key-spec categories are not unique.`);
  }
  const requiredKeys = model === 'BP-3P-S06-0001'
    ? ['channels', 'performance', 'seal', 'leadTime']
    : new Set(['BP-3P-0004', 'BP-2P-08-0001', 'BP-2P-95-0005', 'BP-3P-0007']).has(model)
      ? ['passages', 'leadTime']
      : ['performance', 'passages', 'leadTime'];
  for (const required of requiredKeys) {
    if (!finalKeys.includes(required)) throw new Error(`${relativePath}: missing key category ${required}.`);
  }
  if (model !== 'BP-3P-S06-0001' && finalKeys.includes('seal')) {
    throw new Error(`${relativePath}: ordinary-model first view must move seal to the specifications table.`);
  }
  if (portCategoryOverride && !finalKeys.includes('ports') && !new Set(['BP-3P-0004', 'BP-2P-08-0001', 'BP-2P-95-0005', 'BP-3P-0007']).has(model)) {
    throw new Error(`${relativePath}: port-semantic category was not created.`);
  }
  return { items, finalKeys, targets };
}

function locateSpecificationTargets(source, relativePath, locale, model, product, localized) {
  const panelAnchor = findSingleId(source, 'panel-specs', relativePath);
  const nextPanel = source.indexOf('id="panel-compat"', panelAnchor);
  if (nextPanel < 0) throw new Error(`${relativePath}: panel-compat boundary not found after panel-specs.`);
  const panel = source.slice(panelAnchor, nextPanel);
  const rowPattern = /<tr\b[^>]*>\s*<th\b[^>]*>([\s\S]*?)<\/th>\s*<td\b[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi;
  const rows = [];
  for (const match of panel.matchAll(rowPattern)) {
    const label = match[1];
    const value = match[2];
    const field = canonicalField(label);
    const absolute = panelAnchor + match.index;
    const valueOffset = match[0].indexOf(value);
    const managedMatch = /\bdata-drawing-fact=(['"])([^'"]+)\1/i.exec(match[0]);
    rows.push({
      field,
      label,
      value,
      raw: match[0],
      start: absolute,
      end: absolute + match[0].length,
      valueStart: absolute + valueOffset,
      valueEnd: absolute + valueOffset + value.length,
      managedField: managedMatch?.[2] || null,
    });
  }

  const warrantyRows = rows.filter((row) => row.field === 'warranty');
  if (warrantyRows.length !== 1) {
    throw new Error(`${relativePath}: expected one visible warranty row; found ${warrantyRows.length}.`);
  }
  const warrantyRow = warrantyRows[0];
  const seenTargetFields = new Set();
  for (const row of rows) {
    if (!row.field || row.field === 'warranty') continue;
    if (seenTargetFields.has(row.field)) {
      throw new Error(`${relativePath}: duplicate ${row.field} row in specifications panel.`);
    }
    seenTargetFields.add(row.field);
  }

  const required = [];
  if (product.status === 'verified-drawing') {
    required.push('pressure', 'speed', 'body', 'seal', 'media', 'temperature', 'weight', 'dimensions');
    if (product.drawingFacts.throughBore?.status === 'verified') required.push('bore');
    if (product.drawingFacts.mounting.status === 'verified') required.push('mount');
    if (product.drawingFacts.ports.status === 'anomaly-unresolved'
      || product.drawingFacts.ports.status === 'annotation-conflict'
      || product.drawingFacts.ports.status.startsWith('verified')) required.push('ports');
  }
  const existingManagedFields = rows
    .filter((row) => row.managedField)
    .map((row) => row.managedField);
  for (const field of existingManagedFields) {
    if (canonicalField(localized.jsonPropertyNames[field]) !== field) {
      throw new Error(`${relativePath}: managed drawing row has an unknown field ${field}.`);
    }
  }
  const missingRequired = required.filter((field) => !seenTargetFields.has(field));
  const managedFields = existingManagedFields.length ? existingManagedFields : missingRequired;
  const requiredOrder = [
    'pressure', 'speed', 'body', 'seal', 'media', 'temperature', 'weight',
    'dimensions', 'bore', 'mount', 'ports',
  ];
  managedFields.sort((left, right) => requiredOrder.indexOf(left) - requiredOrder.indexOf(right));

  const targets = [];
  const managedSet = new Set(managedFields);
  for (const row of rows) {
    if (!row.field || !Object.hasOwn(localized.fields, row.field) || managedSet.has(row.field)) continue;
    targets.push({
      label: `spec-${row.field}-value`,
      surface: 'specification rows',
      start: row.valueStart,
      end: row.valueEnd,
      current: row.value,
      desired: escapeHtmlText(localized.fields[row.field]),
    });
  }

  if (managedFields.length) {
    const markedRows = rows.filter((row) => row.managedField);
    const blockStart = markedRows.length ? Math.min(...markedRows.map((row) => row.start)) : warrantyRow.start;
    const blockEnd = warrantyRow.start;
    if (markedRows.length) {
      const lastMarkedEnd = Math.max(...markedRows.map((row) => row.end));
      if (rows.some((row) => row.start > lastMarkedEnd && row.start < warrantyRow.start && !row.managedField)) {
        throw new Error(`${relativePath}: managed drawing rows are not contiguous before warranty.`);
      }
    }
    const lineStart = source.lastIndexOf('\n', warrantyRow.start - 1) + 1;
    const indent = source.slice(lineStart, warrantyRow.start);
    const eol = source.includes('\r\n') ? '\r\n' : '\n';
    const desiredRows = managedFields.map((field) => (
      `<tr data-drawing-fact="${field}"><th>${escapeHtmlText(localized.jsonPropertyNames[field])}</th>`
      + `<td>${escapeHtmlText(localized.fields[field])}</td></tr>`
    )).join(`${eol}${indent}`);
    targets.push({
      label: 'spec-managed-drawing-rows',
      surface: 'specification rows',
      start: blockStart,
      end: blockEnd,
      current: source.slice(blockStart, blockEnd),
      desired: `${desiredRows}${eol}${indent}`,
    });
  }

  const finalFields = new Set([...seenTargetFields, ...managedFields]);
  for (const field of required) {
    if (!finalFields.has(field)) throw new Error(`${relativePath}: specifications panel cannot provide ${field}.`);
  }
  return { rows, warrantyRow, targets };
}

function freezeProtectedSurface(source, contract, relativePath, locale, model, product) {
  if (/\bpd-price-note\b/i.test(source)) {
    throw new Error(`${relativePath}: retired pd-price-note remains in the first view.`);
  }
  const jumpNavigation = exactMatch(source, /<nav\b[^>]*class=(['"])[^'"]*\bpd-jump-nav\b[^'"]*\1[^>]*>[\s\S]*?<\/nav>/i, `${relativePath}: jump navigation`);
  const actions = exactMatch(source, /<div\b[^>]*class=(['"])[^'"]*\bpd-actions\b[^'"]*\1[^>]*>[\s\S]*?<\/div>/i, `${relativePath}: CTA actions`);
  const utility = exactMatch(source, /<div\b[^>]*class=(['"])[^'"]*\bpd-utility-links\b[^'"]*\1[^>]*>[\s\S]*?(?=<dl\b[^>]*class=(['"])[^'"]*\bpd-key-specs\b)/i, `${relativePath}: download/share utility`);
  const hasPublicStep = drawingBackedPublicStep(locale, model);
  if (!actions.includes('request=quote')) throw new Error(`${relativePath}: CTA actions lack request=quote.`);
  if (!hasPublicStep && !actions.includes('request=3d-step')) {
    throw new Error(`${relativePath}: CTA actions lack request=3d-step.`);
  }
  if (hasPublicStep && !/\.step(?:[^a-z0-9]|$)/i.test(utility)) {
    throw new Error(`${relativePath}: public STEP model must expose a STEP download in the utility links.`);
  }
  if (utility.includes('product-comparison.html')) {
    throw new Error(`${relativePath}: retired first-view compare-models link remains.`);
  }
  for (const channel of ['linkedin', 'x', 'facebook', 'whatsapp']) {
    if (!utility.includes(`data-share-channel="${channel}"`)) {
      throw new Error(`${relativePath}: share channel ${channel} is missing.`);
    }
  }
  for (const target of ['#panel-specs', '#panel-compat', '#panel-install', '#panel-downloads', '#faq']) {
    if (!jumpNavigation.includes(`href="${target}"`)) {
      throw new Error(`${relativePath}: jump navigation lacks ${target}.`);
    }
  }

  const warranty = WARRANTY_EXPECTATIONS[locale];
  const visibleWarranty = contract.specTable.warrantyRow;
  if (normalizeLabel(visibleWarranty.label) !== normalizeLabel(warranty.label)
    || normalizeVisibleText(visibleWarranty.value) !== warranty.value) {
    throw new Error(`${relativePath}: visible one-year warranty does not match the locale contract.`);
  }
  const warrantyProperty = findWarrantyProperty(contract.productValue, locale, relativePath);
  if (warrantyProperty.name !== warranty.label || String(warrantyProperty.value) !== warranty.value) {
    throw new Error(`${relativePath}: Product JSON-LD one-year warranty does not match the locale contract.`);
  }

  if (product.status === 'identity-pending') {
    if (!utility.includes('request=verified-drawing')) {
      throw new Error(`${relativePath}: identity-pending drawing request isolation is missing.`);
    }
    const directDrawingPattern = new RegExp(`<a\\b[^>]*href=(['"])[^'"]*${escapeRegExp(model)}\\.pdf(?:[?#][^'"]*)?\\1`, 'i');
    if (directDrawingPattern.test(source)) {
      throw new Error(`${relativePath}: identity-pending model exposes a direct PDF link.`);
    }
  }

  return {
    maskedSource: maskTargets(source, contract.targets),
    jumpNavigation,
    actions,
    utility,
    visibleWarranty: visibleWarranty.raw,
    structuredWarranty: JSON.stringify(warrantyProperty),
    eolSignature: newlineSignature(source),
    targetLabels: contract.targets.map((target) => target.label).sort(),
  };
}

function assertProtectedSurfaceUnchanged(before, after, relativePath) {
  for (const field of [
    'maskedSource', 'jumpNavigation', 'actions', 'utility', 'visibleWarranty',
    'structuredWarranty', 'eolSignature',
  ]) {
    if (before[field] !== after[field]) {
      throw new Error(`${relativePath}: protected ${field} changed during drawing synchronization.`);
    }
  }
  if (JSON.stringify(before.targetLabels) !== JSON.stringify(after.targetLabels)) {
    throw new Error(`${relativePath}: target range contract changed after transformation.`);
  }
}

function assertTargetContract(after, contract, relativePath, locale, model, product) {
  for (const target of contract.targets) {
    if (target.current !== target.desired) {
      throw new Error(`${relativePath}: target ${target.label} did not converge after transformation.`);
    }
  }
  if (product.status === 'identity-pending') {
    const targetText = contract.targets.map((target) => target.desired).join('\n');
    const facts = product.drawingFacts;
    const forbidden = [
      `${facts.maximumPressure.value} ${facts.maximumPressure.unit}`,
      `${facts.maximumSpeed.value} ${facts.maximumSpeed.unit}`,
      facts.bodyMaterial,
      ...facts.sealMaterials,
      ...facts.ports.annotations.flatMap((annotation) => [annotation.thread, annotation.raw]),
    ].filter((value) => String(value).length >= 3);
    for (const value of forbidden) {
      if (targetText.toLocaleLowerCase().includes(String(value).toLocaleLowerCase())) {
        throw new Error(`${relativePath}: quarantined drawing fact leaked into a target surface: ${value}.`);
      }
    }
  }
  if (model === PORT_ANOMALY_MODEL) {
    const targetText = contract.targets.map((target) => target.desired).join('\n');
    if (/G1\/4|G4\/1/i.test(targetText)) {
      throw new Error(`${relativePath}: unresolved port annotation was normalized or published.`);
    }
    if (!contract.keySpec.finalKeys.includes('ports')) {
      throw new Error(`${relativePath}: unresolved port boundary is absent from first-view key specs.`);
    }
  }
  if (PORT_CATEGORY_MODELS.has(model) && !new Set(['BP-3P-0004', 'BP-2P-08-0001', 'BP-2P-95-0005', 'BP-3P-0007']).has(model)) {
    if (contract.keySpec.finalKeys.includes('mount') || !contract.keySpec.finalKeys.includes('ports')) {
      throw new Error(`${relativePath}: first-view category must use ports rather than mount.`);
    }
  }
}

function mainOnlySearchSurface(source) {
  const startMatch = /<main\b[^>]*>/i.exec(source);
  const endIndex = startMatch ? source.indexOf('</main>', startMatch.index + startMatch[0].length) : -1;
  if (!startMatch || endIndex < 0) throw new Error('Product page main-content boundary is missing.');
  const end = endIndex + '</main>'.length;
  const mask = (value) => value.replace(/[^\r\n]/g, ' ');
  return mask(source.slice(0, startMatch.index))
    + source.slice(startMatch.index, end)
    + mask(source.slice(end));
}

function collectResidualDrawingRisks(source, targets, locale, model, product) {
  // This report exists to find stale product claims in the customer-facing body.
  // Mask the head, scripts and footer so SVG path data (for example `M5.4` or
  // `2A`) cannot be mistaken for a mounting thread or electrical rating.
  let searchable = mainOnlySearchSurface(blankTargets(source, targets));
  const faqStart = searchable.indexOf('<!-- ===== FAQ ===== -->');
  const faqEnd = faqStart >= 0 ? searchable.indexOf('<!-- ===== RELATED RESOURCES ===== -->', faqStart) : -1;
  if (faqStart >= 0 && faqEnd > faqStart) {
    searchable = searchable.slice(0, faqStart)
      + searchable.slice(faqStart, faqEnd).replace(/[^\r\n]/g, ' ')
      + searchable.slice(faqEnd);
  }
  const risks = residualRiskTerms(locale, model, product);
  const lineStarts = buildLineStarts(searchable);
  const findings = [];
  for (const risk of risks) {
    const haystack = searchable.toLocaleLowerCase();
    const needle = risk.term.toLocaleLowerCase();
    if (!needle) continue;
    const indexes = [];
    const useUnicodeWordBoundaries = locale !== 'ja' && /^\p{L}[\s\S]*\p{L}$/u.test(needle);
    if (useUnicodeWordBoundaries) {
      const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(risk.term)}(?![\\p{L}\\p{N}])`, 'giu');
      for (const match of searchable.matchAll(pattern)) indexes.push(match.index);
    } else {
      let cursor = 0;
      while (cursor < haystack.length) {
        const index = haystack.indexOf(needle, cursor);
        if (index < 0) break;
        indexes.push(index);
        cursor = index + Math.max(needle.length, 1);
      }
    }
    if (!indexes.length) continue;
    const lines = [...new Set(indexes.map((index) => lineNumberAt(lineStarts, index)))];
    findings.push({ kind: risk.kind, term: risk.term, count: indexes.length, lines });
  }
  return findings;
}

function residualRiskTerms(locale, model, product) {
  const terms = [];
  const add = (kind, values) => {
    for (const value of values) {
      if (typeof value === 'string' && value.trim()) terms.push({ kind, term: value.trim() });
    }
  };
  for (const claim of product.prohibitedWebClaims || []) add(`contract:${claim.id}`, claim.match || []);
  if (product.status === 'identity-pending') {
    const facts = product.drawingFacts;
    const speedUnit = localizedPhrase(locale, {
      en: 'RPM', de: 'min⁻¹', fr: 'tr/min', ja: 'min⁻¹', ru: 'об/мин',
    });
    add('identity-pending:unverified-rating', [
      locale === 'ru' ? `${facts.maximumPressure.value} МПа` : `${facts.maximumPressure.value} MPa`,
      `${facts.maximumSpeed.value} ${speedUnit}`,
      '6061', 'PTFE', 'G1/8',
    ]);
    return deduplicateRisks(terms);
  }

  if (product.drawingFacts.media.length === 1 && product.drawingFacts.media[0] === 'air') {
    const customHydraulic = OWNER_CONFIRMED_CUSTOM_HYDRAULIC_MODELS.has(model);
    add('media:beyond-drawing', localizedPhrase(locale, customHydraulic ? {
      en: ['water', 'coolant'],
      de: ['Wasser', 'Kühlmittel', 'Kühler'],
      fr: ['eau', 'liquide de refroidissement'],
      ja: ['水', 'クーラント'],
      ru: ['вода', 'водораствор', 'охладител'],
    } : {
      en: ['water', 'coolant', 'hydraulic oil'],
      de: ['Wasser', 'Kühlmittel', 'Kühler', 'Hydrauliköl'],
      fr: ['eau', 'liquide de refroidissement', 'huile hydraulique'],
      ja: ['水', 'クーラント', '油圧オイル'],
      ru: ['вода', 'водораствор', 'охладител', 'гидравлическое масло'],
    }));
  }
  add('seal:beyond-drawing', localizedPhrase(locale, {
    en: ['FKM', 'Viton', 'Graphite', 'PEEK'],
    de: ['FKM', 'Viton', 'Graphit', 'PEEK'],
    fr: ['FKM', 'Viton', 'graphite', 'PEEK'],
    ja: ['FKM', 'Viton', 'グラファイト', 'PEEK'],
    ru: ['FKM', 'Viton', 'графит', 'PEEK'],
  }));
  if (product.drawingFacts.bodyMaterial === 'Aluminum Alloy 6061') {
    add('body:beyond-drawing', localizedPhrase(locale, {
      en: ['steel body', '+ Steel'],
      de: ['Stahlkörper', '+ Stahl'],
      fr: ['corps en acier', '+ acier'],
      ja: ['鋼製ボディ', '+鋼'],
      ru: ['стальной корпус', '+ сталь'],
    }));
  }
  return deduplicateRisks(terms);
}

function deduplicateRisks(risks) {
  const result = [];
  const seen = new Set();
  for (const risk of risks) {
    const key = `${risk.kind}\u0000${risk.term.toLocaleLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(risk);
  }
  return result;
}

function printReport(plans, selectedMode) {
  const changed = plans.filter((plan) => plan.changed);
  const verified = plans.filter((plan) => plan.status === 'verified-drawing').length;
  const quarantined = plans.length - verified;
  const verb = selectedMode === 'write' ? 'Wrote' : 'Checked';
  console.log(`${verb} ${plans.length} localized product pages (${verified} verified-drawing; ${quarantined} identity-pending).`);
  console.log(`${changed.length} page(s) ${selectedMode === 'write' ? 'were updated' : 'require drawing-backed synchronization'}.`);
  for (const plan of changed) {
    const surfaces = [...new Set(plan.changes.map((change) => change.surface))];
    console.log(`- ${plan.relativePath}: ${surfaces.join(', ')} (${plan.changes.length} exact range change(s))`);
  }

  const residualPages = plans.filter((plan) => plan.residuals.length);
  const residualCount = residualPages.reduce(
    (total, plan) => total + plan.residuals.reduce((pageTotal, item) => pageTotal + item.count, 0),
    0,
  );
  console.log(`Residual non-target drawing-risk report: ${residualCount} occurrence(s) across ${residualPages.length} page(s).`);
  console.log('These findings are report-only; deep body copy is outside this synchronizer\'s write scope.');
  for (const plan of residualPages) {
    const details = plan.residuals.map((item) => (
      `${item.kind}="${item.term}" x${item.count} [lines ${item.lines.join(',')}]`
    ));
    console.log(`- ${plan.relativePath}: ${details.join('; ')}`);
  }
  console.log('Estimated first-view copy after synchronization (current desktop text width):');
  for (const locale of Object.keys(LOCALES)) {
    const localePlans = plans.filter((plan) => plan.locale === locale);
    const maxKey = Math.max(...localePlans.map((plan) => plan.firstViewEstimate.longestKeyValueLines));
    console.log(`- ${locale}: longest key value up to ~${maxKey} line(s)`);
  }
  if (selectedMode === 'check' && changed.length) {
    console.log('Check failed as expected while target ranges differ. Re-run with --write only after explicit approval.');
  }
}

function canonicalField(label) {
  return drawingBackedCanonicalField(label);
}

function normalizeLabel(value) {
  return normalizeVisibleText(value).toLocaleLowerCase();
}

function normalizeVisibleText(value) {
  return decodeHtmlEntities(String(value).replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ');
}

function escapeHtmlText(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function findSingleOpeningTagByClass(source, tagName, className, relativePath) {
  const pattern = new RegExp(`<${tagName}\\b[^>]*\\bclass=(['"])([^'"]*)\\1[^>]*>`, 'gi');
  const matches = [...source.matchAll(pattern)].filter((match) => (
    match[2].split(/\s+/).includes(className)
  ));
  if (matches.length !== 1) {
    throw new Error(`${relativePath}: expected one ${tagName}.${className}; found ${matches.length}.`);
  }
  return { start: matches[0].index, end: matches[0].index + matches[0][0].length, raw: matches[0][0] };
}

function findSingleId(source, id, relativePath) {
  const pattern = new RegExp(`\\bid=(['"])${escapeRegExp(id)}\\1`, 'g');
  const matches = [...source.matchAll(pattern)];
  if (matches.length !== 1) throw new Error(`${relativePath}: expected one #${id}; found ${matches.length}.`);
  return matches[0].index;
}

function exactMatch(source, pattern, label) {
  const matches = [...source.matchAll(new RegExp(pattern.source, `${pattern.flags.replace('g', '')}g`))];
  if (matches.length !== 1) throw new Error(`${label}: expected one exact protected fragment; found ${matches.length}.`);
  return matches[0][0];
}

function findWarrantyProperty(product, locale, relativePath) {
  const properties = product?.additionalProperty;
  if (!Array.isArray(properties)) throw new Error(`${relativePath}: Product additionalProperty is missing.`);
  const matches = properties.filter((property) => canonicalField(property?.name) === 'warranty');
  if (matches.length !== 1) throw new Error(`${relativePath}: expected one structured warranty; found ${matches.length}.`);
  const expected = WARRANTY_EXPECTATIONS[locale];
  if (matches[0].name !== expected.label || String(matches[0].value) !== expected.value) {
    throw new Error(`${relativePath}: unexpected structured warranty content.`);
  }
  return matches[0];
}

function assertWarrantyPropertyPreserved(before, after, locale, label) {
  const beforeWarranty = findWarrantyProperty(before, locale, `${label}:before`);
  const afterWarranty = findWarrantyProperty(after, locale, `${label}:after`);
  if (JSON.stringify(beforeWarranty) !== JSON.stringify(afterWarranty)) {
    throw new Error(`${label}: Product warranty changed while updating drawing facts.`);
  }
}

function validateTargets(source, targets, relativePath) {
  const labels = new Set();
  const ordered = [...targets].sort((a, b) => a.start - b.start || a.end - b.end);
  let previousEnd = -1;
  for (const target of ordered) {
    if (!Number.isInteger(target.start) || !Number.isInteger(target.end)
      || target.start < 0 || target.end < target.start || target.end > source.length) {
      throw new Error(`${relativePath}: invalid target range ${target.label}.`);
    }
    if (target.start < previousEnd) throw new Error(`${relativePath}: overlapping target range ${target.label}.`);
    if (labels.has(target.label)) throw new Error(`${relativePath}: duplicate target label ${target.label}.`);
    if (source.slice(target.start, target.end) !== target.current) {
      throw new Error(`${relativePath}: target current bytes do not match ${target.label}.`);
    }
    labels.add(target.label);
    previousEnd = target.end;
  }
}

function applyTargets(source, targets, relativePath) {
  validateTargets(source, targets, relativePath);
  let result = source;
  for (const target of [...targets].sort((a, b) => b.start - a.start)) {
    result = `${result.slice(0, target.start)}${target.desired}${result.slice(target.end)}`;
  }
  return result;
}

function maskTargets(source, targets) {
  let result = source;
  for (const target of [...targets].sort((a, b) => b.start - a.start)) {
    result = `${result.slice(0, target.start)}[[DRAWING_TARGET:${target.label}]]${result.slice(target.end)}`;
  }
  return result;
}

function blankTargets(source, targets) {
  let result = source;
  for (const target of [...targets].sort((a, b) => b.start - a.start)) {
    const blank = source.slice(target.start, target.end).replace(/[^\r\n]/g, ' ');
    result = `${result.slice(0, target.start)}${blank}${result.slice(target.end)}`;
  }
  return result;
}

function newlineSignature(source) {
  const crlf = (source.match(/\r\n/g) || []).length;
  const loneLf = (source.match(/(?<!\r)\n/g) || []).length;
  const loneCr = (source.match(/\r(?!\n)/g) || []).length;
  const styles = [crlf ? 'CRLF' : null, loneLf ? 'LF' : null, loneCr ? 'CR' : null].filter(Boolean);
  return JSON.stringify({ styles, finalNewline: /(?:\r\n|\n|\r)$/.test(source) });
}

function buildLineStarts(source) {
  const starts = [0];
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === '\n') starts.push(index + 1);
  }
  return starts;
}

function lineNumberAt(starts, index) {
  let low = 0;
  let high = starts.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (starts[middle] <= index) low = middle + 1;
    else high = middle - 1;
  }
  return high + 1;
}

function localizedPhrase(locale, values) {
  if (!Object.hasOwn(values, locale)) throw new Error(`Missing localized phrase for ${locale}.`);
  return values[locale];
}

function estimateFirstViewLines(locale, localized, finalKeys) {
  const keyCapacity = locale === 'ja' ? 32 : ['de', 'fr', 'ru'].includes(locale) ? 30 : 34;
  const keyValues = finalKeys
    .filter((key) => Object.hasOwn(localized.keyValues, key))
    .map((key) => localized.keyValues[key]);
  return {
    longestKeyValueLines: Math.max(1, ...keyValues.map((value) => Math.ceil(displayUnits(value) / keyCapacity))),
  };
}

function displayUnits(value) {
  let units = 0;
  for (const character of value) {
    units += /[\u1100-\u11ff\u2e80-\u9fff\uac00-\ud7af\uff01-\uff60]/u.test(character) ? 2 : 1;
  }
  return units;
}

function setEquals(left, right) {
  return left.size === right.size && [...left].every((value) => right.has(value));
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
