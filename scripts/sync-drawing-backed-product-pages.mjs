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
const LOCALES = Object.freeze({
  en: Object.freeze({ prefix: '' }),
  de: Object.freeze({ prefix: 'de' }),
  ja: Object.freeze({ prefix: 'ja' }),
  ru: Object.freeze({ prefix: 'ru' }),
});
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
  ja: Object.freeze({ label: '保証期間', value: '出荷日から1年' }),
  ru: Object.freeze({ label: 'Гарантийный срок', value: '1 год с даты отгрузки' }),
});

const KEY_PORT_LABELS = Object.freeze({
  en: 'Ports',
  de: 'Anschlüsse',
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

// No page is written until all 64 in-memory transformations and protection assertions pass.
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
  if (!Array.isArray(desired.additionalProperty)) {
    throw new Error(`${model}/${locale}: Product JSON-LD has no additionalProperty array.`);
  }

  findWarrantyProperty(currentProduct, locale, `${model}/${locale}`);
  if (drawingBackedPublicStep(locale, model)) {
    const hasCad = desired.additionalProperty.some((item) => item && item.name === '3D CAD model');
    if (!hasCad) {
      desired.additionalProperty.push({
        '@type': 'PropertyValue',
        name: '3D CAD model',
        value: 'STEP AP214 download available for fit check (simplified body)',
      });
    }
    desired.associatedMedia = {
      '@type': 'MediaObject',
      name: `${model} STEP AP214 (simplified, fit check)`,
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
    add('identity-pending:unverified-rating', [
      locale === 'ru' ? `${facts.maximumPressure.value} МПа` : `${facts.maximumPressure.value} MPa`,
      locale === 'en' ? `${facts.maximumSpeed.value} RPM`
        : locale === 'de' || locale === 'ja' ? `${facts.maximumSpeed.value} min⁻¹`
          : `${facts.maximumSpeed.value} об/мин`,
      '6061', 'PTFE', 'G1/8',
    ]);
    return deduplicateRisks(terms);
  }

  if (product.drawingFacts.media.length === 1 && product.drawingFacts.media[0] === 'air') {
    const customHydraulic = OWNER_CONFIRMED_CUSTOM_HYDRAULIC_MODELS.has(model);
    add('media:beyond-drawing', localizedPhrase(locale, customHydraulic ? {
      en: ['water', 'coolant'],
      de: ['Wasser', 'Kühlmittel', 'Kühler'],
      ja: ['水', 'クーラント'],
      ru: ['вода', 'водораствор', 'охладител'],
    } : {
      en: ['water', 'coolant', 'hydraulic oil'],
      de: ['Wasser', 'Kühlmittel', 'Kühler', 'Hydrauliköl'],
      ja: ['水', 'クーラント', '油圧オイル'],
      ru: ['вода', 'водораствор', 'охладител', 'гидравлическое масло'],
    }));
  }
  add('seal:beyond-drawing', localizedPhrase(locale, {
    en: ['FKM', 'Viton', 'Graphite', 'PEEK'],
    de: ['FKM', 'Viton', 'Graphit', 'PEEK'],
    ja: ['FKM', 'Viton', 'グラファイト', 'PEEK'],
    ru: ['FKM', 'Viton', 'графит', 'PEEK'],
  }));
  if (product.drawingFacts.bodyMaterial === 'Aluminum Alloy 6061') {
    add('body:beyond-drawing', localizedPhrase(locale, {
      en: ['steel body', '+ Steel'],
      de: ['Stahlkörper', '+ Stahl'],
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

function formatPressure(locale, pressure) {
  const unit = locale === 'ru' ? 'МПа' : pressure.unit;
  return `${formatNumber(locale, pressure.value)} ${unit}`;
}

function formatSpeed(locale, speed) {
  const unit = locale === 'en' ? 'RPM' : locale === 'ru' ? 'об/мин' : 'min⁻¹';
  return `${formatNumber(locale, speed.value)} ${unit}`;
}

function formatBody(locale, material) {
  const isSteel = material === 'Steel 45#';
  return localizedPhrase(locale, isSteel ? {
    en: 'Grade 45 carbon steel',
    de: 'Stahl 45#',
    ja: '45#鋼',
    ru: 'Сталь 45#',
  } : {
    en: '6061 aluminum alloy',
    de: 'Aluminiumlegierung 6061',
    ja: '6061アルミニウム合金',
    ru: 'Алюминиевый сплав 6061',
  });
}

function formatSeal(locale, materials) {
  if (materials.length !== 2 || materials[0] !== 'PTFE' || materials[1] !== 'O-ring') {
    throw new Error(`Unexpected drawing seal contract: ${materials.join(', ')}`);
  }
  return localizedPhrase(locale, {
    en: 'PTFE + O-ring',
    de: 'PTFE + O-Ring',
    ja: 'PTFE＋Oリング',
    ru: 'ПТФЭ + O-кольцо',
  });
}

function formatMedia(locale, media) {
  const supported = media.join(',');
  if (!['air', 'air,oil,water'].includes(supported)) {
    throw new Error(`Unexpected drawing media contract: ${supported}`);
  }
  if (supported === 'air') {
    return localizedPhrase(locale, {
      en: 'Drawing-listed medium: air',
      de: 'In der Zeichnung genanntes Medium: Luft',
      ja: '図面記載流体：空気',
      ru: 'Среда по чертежу: воздух',
    });
  }
  return localizedPhrase(locale, {
    en: 'Drawing-listed media: air, oil, and water',
    de: 'In der Zeichnung genannte Medien: Luft, Öl und Wasser',
    ja: '図面記載流体：空気・油・水',
    ru: 'Среды по чертежу: воздух, масло и вода',
  });
}

function formatTemperature(locale, range) {
  const minimum = formatSignedNumber(locale, range.minimum, false);
  const maximum = formatSignedNumber(locale, range.maximum, true);
  return localizedPhrase(locale, {
    en: `${minimum} to ${maximum} °C`,
    de: `${minimum} bis ${maximum} °C`,
    ja: `${minimum}～${maximum} °C`,
    ru: `от ${minimum} до ${maximum} °C`,
  });
}

function formatWeight(locale, weight) {
  if (weight.unit !== 'g') throw new Error(`Unexpected weight unit: ${weight.unit}`);
  const grams = Number(weight.value);
  const kilograms = trimDecimal(grams / 1000, 3);
  if (locale === 'en') return `${kilograms} kg (${formatIntegerWithSeparator(grams, ',')} g)`;
  if (locale === 'de') return `${kilograms.replace('.', ',')} kg (${formatIntegerWithSeparator(grams, '.')} g)`;
  if (locale === 'ja') return `${kilograms} kg（${formatIntegerWithSeparator(grams, ',')} g）`;
  return `${kilograms.replace('.', ',')} кг (${formatIntegerWithSeparator(grams, ' ')} г)`;
}

function formatPorts(locale, model, ports) {
  if (ports.status === 'anomaly-unresolved') {
    return localizedPhrase(locale, {
      en: 'Port thread is confirmed from the current model-specific drawing before fitting selection',
      de: 'Das Anschlussgewinde wird vor der Auswahl von Verschraubungen anhand der aktuellen modellspezifischen Zeichnung bestätigt',
      ja: 'ポートねじは継手選定前に最新の型式専用図面で確認します',
      ru: 'Резьба портов подтверждается по актуальному чертежу конкретной модели до выбора фитингов',
    });
  }
  if (!Array.isArray(ports.annotations) || !ports.annotations.length) {
    throw new Error(`${model}: verified port contract has no annotations.`);
  }
  const roleText = {
    en: {
      'media-inlet': 'media inlet', inlet: 'inlet', 'media-outlet': 'media outlet', outlet: 'outlet',
      'side-a': 'side A', 'side-b': 'side B', 'face-a': 'face A', 'face-b': 'face B',
      'side-group': 'side port group', 'end-face-group': 'end-face port group',
      'opposite-face': 'opposite-face port', 'air-port-group': 'air-port group',
      'air-outlet': 'air outlet', 'release-port': 'release port', 'clamp-port': 'clamp port',
    },
    de: {
      'media-inlet': 'Medieneingang', inlet: 'Eingang', 'media-outlet': 'Medienausgang', outlet: 'Ausgang',
      'side-a': 'Seite A', 'side-b': 'Seite B', 'face-a': 'Stirnseite A', 'face-b': 'Stirnseite B',
      'side-group': 'seitliche Anschlussgruppe', 'end-face-group': 'stirnseitige Anschlussgruppe',
      'opposite-face': 'Anschluss auf der Gegenseite', 'air-port-group': 'Luftanschlussgruppe',
      'air-outlet': 'Luftausgang', 'release-port': 'Löseanschluss', 'clamp-port': 'Klemmanschluss',
    },
    ja: {
      'media-inlet': '流体入口', inlet: '入口', 'media-outlet': '流体出口', outlet: '出口',
      'side-a': 'A側', 'side-b': 'B側', 'face-a': 'A面', 'face-b': 'B面',
      'side-group': '側面ポート群', 'end-face-group': '端面ポート群',
      'opposite-face': '反対側ポート', 'air-port-group': '空気ポート群',
      'air-outlet': '空気出口', 'release-port': '解除ポート', 'clamp-port': 'クランプポート',
    },
    ru: {
      'media-inlet': 'вход среды', inlet: 'вход', 'media-outlet': 'выход среды', outlet: 'выход',
      'side-a': 'сторона A', 'side-b': 'сторона B', 'face-a': 'торец A', 'face-b': 'торец B',
      'side-group': 'группа боковых портов', 'end-face-group': 'группа торцевых портов',
      'opposite-face': 'порт на противоположном торце', 'air-port-group': 'группа воздушных портов',
      'air-outlet': 'выход воздуха', 'release-port': 'порт разжима', 'clamp-port': 'порт зажима',
    },
  }[locale];
  const parts = ports.annotations.map((annotation) => {
    const role = roleText[annotation.role];
    if (!role) throw new Error(`${model}: unsupported port role ${annotation.role}.`);
    const interfaceSize = annotation.thread
      ? formatThread(locale, annotation.thread)
      : `Ø${formatNumber(locale, annotation.diameterMm)} ${locale === 'ru' ? 'мм' : 'mm'}`;
    const depth = annotation.depthMm === undefined
      ? ''
      : localizedPhrase(locale, {
        en: `, depth ${formatNumber(locale, annotation.depthMm)} mm`,
        de: `, Tiefe ${formatNumber(locale, annotation.depthMm)} mm`,
        ja: `、深さ${formatNumber(locale, annotation.depthMm)} mm`,
        ru: `, глубина ${formatNumber(locale, annotation.depthMm)} мм`,
      });
    return `${annotation.count} × ${interfaceSize}${depth} ${role}`;
  });
  let result = parts.join(' · ');
  if (ports.status === 'verified-threads-only') {
    result += localizedPhrase(locale, {
      en: '; port functions are assigned in the confirmed drawing before production',
      de: '; Anschlussfunktionen werden in der bestätigten Zeichnung vor der Fertigung zugeordnet',
      ja: '（ポート機能は確定図面で生産前に割り当てます）',
      ru: '; функции портов назначаются в подтверждённом чертеже до производства',
    });
  }
  if (ports.status === 'verified-outlets-only') {
    result += localizedPhrase(locale, {
      en: '; the air inlet is assigned in the confirmed drawing before production',
      de: '; der Lufteingang wird in der bestätigten Zeichnung vor der Fertigung zugeordnet',
      ja: '（空気入口は確定図面で生産前に割り当てます）',
      ru: '; вход воздуха назначается в подтверждённом чертеже до производства',
    });
  }
  return result;
}

function formatPortsKey(locale, model, ports) {
  if (ports.status === 'anomaly-unresolved') return formatPorts(locale, model, ports);
  const compactRoles = {
    en: {
      'media-inlet': 'media in', inlet: 'in', 'media-outlet': 'media out', outlet: 'out',
      'side-a': 'side A', 'side-b': 'side B', 'face-a': 'face A', 'face-b': 'face B',
      'side-group': 'side', 'end-face-group': 'end face', 'opposite-face': 'opposite face',
      'air-port-group': 'air', 'air-outlet': 'air out', 'release-port': 'release', 'clamp-port': 'clamp',
    },
    de: {
      'media-inlet': 'Medieneingang', inlet: 'ein', 'media-outlet': 'Medienausgang', outlet: 'aus',
      'side-a': 'Seite A', 'side-b': 'Seite B', 'face-a': 'Stirnseite A', 'face-b': 'Stirnseite B',
      'side-group': 'seitlich', 'end-face-group': 'stirnseitig', 'opposite-face': 'Gegenseite',
      'air-port-group': 'Luft', 'air-outlet': 'Luft aus', 'release-port': 'Lösen', 'clamp-port': 'Klemmen',
    },
    ja: {
      'media-inlet': '流体入口', inlet: '入口', 'media-outlet': '流体出口', outlet: '出口',
      'side-a': 'A側', 'side-b': 'B側', 'face-a': 'A面', 'face-b': 'B面',
      'side-group': '側面', 'end-face-group': '端面', 'opposite-face': '反対面',
      'air-port-group': '空気', 'air-outlet': '空気出口', 'release-port': '解除', 'clamp-port': 'クランプ',
    },
    ru: {
      'media-inlet': 'вход среды', inlet: 'вход', 'media-outlet': 'выход среды', outlet: 'выход',
      'side-a': 'сторона A', 'side-b': 'сторона B', 'face-a': 'торец A', 'face-b': 'торец B',
      'side-group': 'сбоку', 'end-face-group': 'на торце', 'opposite-face': 'противоположный торец',
      'air-port-group': 'воздух', 'air-outlet': 'выход воздуха', 'release-port': 'разжим', 'clamp-port': 'зажим',
    },
  }[locale];
  const parts = ports.annotations.map((annotation) => {
    const size = annotation.thread
      ? formatThread(locale, annotation.thread)
      : `Ø${formatNumber(locale, annotation.diameterMm)} ${locale === 'ru' ? 'мм' : 'mm'}`;
    const depth = annotation.depthMm === undefined
      ? ''
      : localizedPhrase(locale, {
        en: `×${formatNumber(locale, annotation.depthMm)} mm deep`,
        de: `, ${formatNumber(locale, annotation.depthMm)} mm tief`,
        ja: `、深さ${formatNumber(locale, annotation.depthMm)} mm`,
        ru: `, глуб. ${formatNumber(locale, annotation.depthMm)} мм`,
      });
    return `${annotation.count}×${size}${depth} ${compactRoles[annotation.role]}`;
  });
  let result = parts.join(' · ');
  if (ports.status === 'verified-threads-only') {
    result += localizedPhrase(locale, {
      en: '; assignment open', de: '; Zuordnung offen', ja: '（割当未確定）', ru: '; назначение не указано',
    });
  }
  return result;
}

function formatMounting(locale, model, mounting) {
  if (mounting.status === 'not-separately-specified') {
    return localizedPhrase(locale, {
      en: 'No separate mounting feature specified; media ports are not mounting holes',
      de: 'Keine separate Montageangabe; Medienanschlüsse sind keine Montagebohrungen',
      ja: '独立した取付部の記載なし（流体ポートは取付穴ではありません）',
      ru: 'Отдельный монтажный элемент не указан; порты среды не являются монтажными отверстиями',
    });
  }
  if (mounting.status !== 'verified' || !Array.isArray(mounting.features) || !mounting.features.length) {
    throw new Error(`${model}: mounting facts are not publishable.`);
  }
  return mounting.features.map((feature) => formatMountingFeature(locale, feature)).join(' · ');
}

function formatMountingKey(locale, model, mounting) {
  if (mounting.status === 'not-separately-specified') {
    return localizedPhrase(locale, {
      en: 'No separate mount specified', de: 'Keine separate Montageangabe',
      ja: '独立した取付部の記載なし', ru: 'Отдельное крепление не указано',
    });
  }
  if (mounting.status !== 'verified') throw new Error(`${model}: mounting key is not publishable.`);
  return mounting.features.map((feature) => {
    const side = localizedMountingSide(locale, feature.side);
    const size = feature.thread
      || `Ø${formatNumber(locale, feature.diameterMm)} ${locale === 'ru' ? 'мм' : 'mm'}`;
    const depth = feature.depthMm === undefined
      ? ''
      : localizedPhrase(locale, {
        en: `, ${formatNumber(locale, feature.depthMm)} mm deep`,
        de: `, ${formatNumber(locale, feature.depthMm)} mm tief`,
        ja: `、深さ${formatNumber(locale, feature.depthMm)} mm`,
        ru: `, глуб. ${formatNumber(locale, feature.depthMm)} мм`,
      });
    return `${side} ${feature.count}×${size}${depth}`;
  }).join(' · ');
}

function formatMountingSide(locale, model, mounting, requestedSide) {
  if (mounting.status === 'not-separately-specified') return formatMounting(locale, model, mounting);
  const exact = mounting.features.filter((feature) => feature.side === requestedSide);
  if (exact.length) return exact.map((feature) => formatMountingFeature(locale, feature)).join(' · ');
  return localizedPhrase(locale, {
    en: 'See the approved drawing; the rotor/stator assignment is confirmed in the approved drawing before production',
    de: 'Siehe freigegebene Zeichnung; die Zuordnung der Stirnseiten zu Rotor und Stator wird in der freigegebenen Zeichnung vor der Fertigung bestätigt',
    ja: '承認図面を参照してください。ロータ／ステータの対応は承認図面で生産前に確定します',
    ru: 'См. согласованный чертёж: соответствие торцов ротору и статору подтверждается в согласованном чертеже до производства',
  });
}

function formatMountingFeature(locale, feature) {
  const side = localizedMountingSide(locale, feature.side);
  let size;
  if (feature.thread) size = feature.thread;
  else if (feature.diameterMm !== undefined) {
    size = `Ø${formatNumber(locale, feature.diameterMm)} ${locale === 'ru' ? 'мм' : 'mm'}`;
  }
  else throw new Error(`Mounting feature on ${feature.side} has no thread or diameter.`);
  const depth = feature.depthMm === undefined
    ? ''
    : localizedPhrase(locale, {
      en: `, depth ${formatNumber(locale, feature.depthMm)} mm`,
      de: `, Tiefe ${formatNumber(locale, feature.depthMm)} mm`,
      ja: `、深さ${formatNumber(locale, feature.depthMm)} mm`,
      ru: `, глубина ${formatNumber(locale, feature.depthMm)} мм`,
    });
  const featureType = feature.feature
    ? localizedMountingFeatureType(locale, feature.feature)
    : '';
  return `${side}: ${feature.count} × ${size}${depth}${featureType}`;
}

function localizedMountingSide(locale, side) {
  const labels = {
    en: { stator: 'stator', rotor: 'rotor', 'face-a': 'face A', 'face-b': 'face B', body: 'body' },
    de: { stator: 'Stator', rotor: 'Rotor', 'face-a': 'Stirnseite A', 'face-b': 'Stirnseite B', body: 'Gehäuse' },
    ja: { stator: 'ステータ側', rotor: 'ロータ側', 'face-a': 'A面', 'face-b': 'B面', body: '本体' },
    ru: { stator: 'статор', rotor: 'ротор', 'face-a': 'торец A', 'face-b': 'торец B', body: 'корпус' },
  }[locale];
  if (!labels[side]) throw new Error(`Unsupported mounting side: ${side}`);
  return labels[side];
}

function localizedMountingFeatureType(locale, feature) {
  const labels = {
    'through-hole': { en: ' through-hole', de: ' Durchgangsbohrung', ja: ' 貫通穴', ru: ' сквозное отверстие' },
    hole: { en: ' hole', de: ' Bohrung', ja: ' 穴', ru: ' отверстие' },
    'anti-rotation': { en: ' anti-rotation', de: ' Verdrehsicherung', ja: ' 回り止め', ru: ' против проворачивания' },
    'anti-rotation-set-screw': { en: ' anti-rotation set-screw', de: ' Gewindestift zur Verdrehsicherung', ja: ' 回り止め止めねじ', ru: ' установочный винт против проворачивания' },
  }[feature];
  if (!labels) throw new Error(`Unsupported mounting feature type: ${feature}`);
  return labels[locale];
}

function formatEnvelope(locale, envelope) {
  if (envelope.status === 'drawing-audit-only') {
    throw new Error('Audit-only envelope must not be formatted for publication.');
  }
  const length = formatNumber(locale, envelope.overallLengthMm);
  if (envelope.shape === 'cylindrical') {
    const diameter = formatNumber(locale, envelope.maximumDiameterMm);
    return localizedPhrase(locale, {
      en: `Maximum Ø${diameter} × ${length} mm overall`,
      de: `Max. Ø${diameter} × ${length} mm Gesamtlänge`,
      ja: `最大Ø${diameter} × 全長${length} mm`,
      ru: `Макс. Ø${diameter} × общая длина ${length} мм`,
    });
  }
  if (envelope.shape === 'hex-body') {
    const width = formatNumber(locale, envelope.maximumWidthMm);
    return localizedPhrase(locale, {
      en: `Maximum width ${width} × ${length} mm overall`,
      de: `Max. Breite ${width} × ${length} mm Gesamtlänge`,
      ja: `最大幅${width} × 全長${length} mm`,
      ru: `Макс. ширина ${width} × общая длина ${length} мм`,
    });
  }
  throw new Error(`Unsupported envelope shape: ${envelope.shape}`);
}

function formatEnvelopeDiameter(locale, envelope) {
  if (envelope.shape !== 'cylindrical' || envelope.status === 'drawing-audit-only') {
    return formatEnvelope(locale, envelope);
  }
  const diameter = formatNumber(locale, envelope.maximumDiameterMm);
  return localizedPhrase(locale, {
    en: `Maximum Ø${diameter} mm`,
    de: `Max. Ø${diameter} mm`,
    ja: `最大Ø${diameter} mm`,
    ru: `Макс. Ø${diameter} мм`,
  });
}

function formatThroughBore(locale, bore) {
  const diameter = formatNumber(locale, bore.diameterMm);
  return localizedPhrase(locale, {
    en: `Ø${diameter} mm through bore`,
    de: `Durchgangsbohrung Ø${diameter} mm`,
    ja: `貫通穴Ø${diameter} mm`,
    ru: `Сквозное отверстие Ø${diameter} мм`,
  });
}

function detailedLimit(locale, kind, value) {
  if (kind === 'pressure') {
    return localizedPhrase(locale, {
      en: `${value} (drawing maximum; confirm the allowable continuous-duty value for the approved configuration and operating conditions)`,
      de: `${value} (Höchstwert laut Zeichnung; zulässigen Dauerbetriebswert für die freigegebene Ausführung und Betriebsbedingungen bestätigen)`,
      ja: `${value}（図面上限。承認仕様と運転条件に対する連続運転許容値を確認）`,
      ru: `${value} (максимум по чертежу; допустимое значение для непрерывной работы подтвердить для согласованного исполнения и условий эксплуатации)`,
    });
  }
  return localizedPhrase(locale, {
    en: `${value} (drawing maximum; confirm the allowable continuous-duty value for the approved configuration and operating conditions)`,
    de: `${value} (Höchstwert laut Zeichnung; zulässigen Dauerbetriebswert für die freigegebene Ausführung und Betriebsbedingungen bestätigen)`,
    ja: `${value}（図面上限。承認仕様と運転条件に対する連続運転許容値を確認）`,
    ru: `${value} (максимум по чертежу; допустимое значение для непрерывной работы подтвердить для согласованного исполнения и условий эксплуатации)`,
  });
}

function performanceText(locale, pressure, speed) {
  return localizedPhrase(locale, {
    en: `Drawing max: ${pressure} · ${speed}`,
    de: `Zeichnungsmaxima: ${pressure} · ${speed}`,
    ja: `図面上限：${pressure}・${speed}`,
    ru: `Максимумы по чертежу: ${pressure} · ${speed}`,
  });
}

function verifiedPriceNote(locale, model, values) {
  const { pressure, speed, media } = values;
  return localizedPhrase(locale, {
    en: `${model} drawing maxima: ${pressure} pressure, ${speed} speed; ${lowercaseInitial(media)}. Confirm continuous-duty limits against the approved order drawing.`,
    de: `${model}-Zeichnung: ${pressure} Maximaldruck, ${speed} Maximaldrehzahl; ${lowercaseInitial(media)}. Dauerbetriebswerte anhand der freigegebenen Auftragszeichnung bestätigen.`,
    ja: `${model}図面上限：圧力${pressure}、回転数${speed}、${media}。連続運転許容値は承認済み注文図面で確認してください。`,
    ru: `Чертёж ${model}: максимум ${pressure} и ${speed}; ${lowercaseInitial(media)}. Допустимые значения для непрерывной работы подтвердите по согласованному чертежу заказа.`,
  });
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

function lowercaseInitial(value) {
  if (!value) return value;
  return `${value[0].toLocaleLowerCase()}${value.slice(1)}`;
}

function estimateFirstViewLines(locale, localized, finalKeys) {
  const keyCapacity = locale === 'ja' ? 32 : locale === 'de' || locale === 'ru' ? 30 : 34;
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

function formatNumber(locale, value) {
  const text = String(value);
  return ['de', 'ru'].includes(locale) ? text.replace('.', ',') : text;
}

function formatThread(locale, value) {
  const text = String(value).replace(/x/giu, '×');
  return ['de', 'ru'].includes(locale) ? text.replace(/\.(?=\d)/gu, ',') : text;
}

function formatSignedNumber(locale, value, showPositive) {
  const absolute = formatNumber(locale, Math.abs(value));
  if (value < 0) return `−${absolute}`;
  if (showPositive && value > 0) return `+${absolute}`;
  return absolute;
}

function trimDecimal(value, digits) {
  return value.toFixed(digits).replace(/\.0+$|(?<=\.[0-9]*?)0+$/g, '').replace(/\.$/, '');
}

function formatIntegerWithSeparator(value, separator) {
  return String(Math.trunc(value)).replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

function setEquals(left, right) {
  return left.size === right.size && [...left].every((value) => right.has(value));
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
