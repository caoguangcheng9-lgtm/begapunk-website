import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  drawingBackedProductLinkLabel,
  drawingBackedProductModels,
  drawingBackedProductSummary,
} from './lib/drawing-backed-product-facts.mjs';

const repoRoot = path.resolve(import.meta.dirname, '..');
const manifestPath = path.join(repoRoot, 'data', 'product-drawing-facts.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const siteOrigin = 'https://www.begapunk.com';
const retiredProductModels = new Map([
  ['BP-2P-95-0001', 'BP-2P-95-0005'],
]);

const fileSpecs = Object.freeze([
  { locale: 'en', relativePath: 'llms.txt', webPrefix: '' },
  { locale: 'de', relativePath: 'de/llms.txt', webPrefix: '/de' },
  { locale: 'ja', relativePath: 'ja/llms.txt', webPrefix: '/ja' },
  { locale: 'ru', relativePath: 'ru/llms.txt', webPrefix: '/ru' },
]);

function usageError(message) {
  throw new Error(`${message}\nUsage: node scripts/sync-drawing-backed-llms.mjs [--check | --write]`);
}

function parseMode(argv) {
  const unknown = argv.filter((arg) => arg !== '--check' && arg !== '--write');
  if (unknown.length) usageError(`Unknown argument(s): ${unknown.join(', ')}`);
  if (argv.includes('--check') && argv.includes('--write')) {
    usageError('Choose either --check or --write, not both.');
  }
  return argv.includes('--write') ? 'write' : 'check';
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function productUrl(spec, model) {
  return `${siteOrigin}${spec.webPrefix}/${model}.html`;
}

function exactProductLinePattern(spec, model) {
  const escapedUrl = escapeRegExp(productUrl(spec, model));
  return new RegExp(`^(- \\[[^\\r\\n]*\\]\\(${escapedUrl}\\):[^\\r\\n]*)(\\r\\n|\\n|$)`, 'gm');
}

function allProductLinesPattern(spec) {
  const escapedPrefix = escapeRegExp(`${siteOrigin}${spec.webPrefix}/`);
  return new RegExp(
    `^(- \\[[^\\r\\n]*\\]\\(${escapedPrefix}(BP-[A-Z0-9-]+)\\.html\\):[^\\r\\n]*)(\\r\\n|\\n|$)`,
    'gm',
  );
}

function expectedProductLine(spec, model) {
  const label = drawingBackedProductLinkLabel(spec.locale, model);
  const summary = drawingBackedProductSummary(spec.locale, model);
  if (!label || !summary) throw new Error(`${spec.locale}/${model}: missing drawing-backed llms copy.`);
  if (/[\r\n]/.test(label) || /[\r\n]/.test(summary)) {
    throw new Error(`${spec.locale}/${model}: generated llms copy must stay on one line.`);
  }
  return `- [${label}](${productUrl(spec, model)}): ${summary}`;
}

function extractProductLines(content, spec, context) {
  const records = [];
  for (const match of content.matchAll(allProductLinesPattern(spec))) {
    records.push({ line: match[1], model: match[2] });
  }
  if (records.length !== 16) {
    throw new Error(`${context}: expected exactly 16 ${spec.locale} product entries, found ${records.length}.`);
  }
  const counts = new Map(drawingBackedProductModels.map((model) => [model, 0]));
  for (const record of records) {
    if (!counts.has(record.model)) {
      throw new Error(`${context}: unexpected product URL for ${record.model}.`);
    }
    counts.set(record.model, counts.get(record.model) + 1);
  }
  const missing = [...counts].filter(([, count]) => count === 0).map(([model]) => model);
  const duplicates = [...counts].filter(([, count]) => count > 1).map(([model]) => model);
  if (missing.length || duplicates.length) {
    throw new Error(
      `${context}: product coverage mismatch; missing=${missing.join(',') || 'none'}; duplicates=${duplicates.join(',') || 'none'}.`,
    );
  }
  return records;
}

function replaceProductLine(content, spec, model, expectedLine, context) {
  const pattern = exactProductLinePattern(spec, model);
  const matches = [...content.matchAll(pattern)];
  if (matches.length !== 1) {
    throw new Error(`${context}: expected one canonical entry for ${model}, found ${matches.length}.`);
  }
  return content.replace(pattern, (_whole, _oldLine, lineEnding) => `${expectedLine}${lineEnding}`);
}

function maskProductLines(content, spec) {
  return content.replace(
    allProductLinesPattern(spec),
    (_whole, _line, model, lineEnding) => `@@DRAWING-BACKED-LLMS:${retiredProductModels.get(model) || model}@@${lineEnding}`,
  );
}

function migrateRetiredProductLines(content, spec, context) {
  let output = content;
  const migratedModels = [];
  for (const [retiredModel, canonicalModel] of retiredProductModels) {
    const retiredPattern = exactProductLinePattern(spec, retiredModel);
    const canonicalPattern = exactProductLinePattern(spec, canonicalModel);
    const retiredMatches = [...output.matchAll(retiredPattern)];
    const canonicalMatches = [...output.matchAll(canonicalPattern)];
    if (!retiredMatches.length) continue;
    if (retiredMatches.length !== 1 || canonicalMatches.length) {
      throw new Error(`${context}: cannot safely migrate ${retiredModel} to ${canonicalModel}.`);
    }
    const expectedLine = expectedProductLine(spec, canonicalModel);
    output = output.replace(retiredPattern, (_whole, _oldLine, lineEnding) => `${expectedLine}${lineEnding}`);
    migratedModels.push(canonicalModel);
  }
  return { output, migratedModels };
}

function assertBoundaryCopy(spec, expectedByModel) {
  const get = (model) => expectedByModel.get(model) || '';
  for (const model of drawingBackedProductModels) {
    const line = get(model).toLocaleLowerCase(spec.locale);
    for (const claim of manifest.products[model]?.prohibitedWebClaims || []) {
      for (const legacyText of claim.match || []) {
        if (line.includes(String(legacyText).toLocaleLowerCase(spec.locale))) {
          throw new Error(`${spec.locale}/${model}: generated llms copy contains prohibited legacy text from ${claim.id}.`);
        }
      }
    }
  }

  if (/G4\/1|G1\/4/u.test(get('BP-3P-0006'))) {
    throw new Error(`${spec.locale}/BP-3P-0006: unresolved port annotation must remain pending.`);
  }

  const technicalClaim = /\b(?:MPa|RPM)\b|min⁻¹|U\/min|МПа|об\/мин|Ø|G1\//iu;
  for (const model of ['BP-2P-30-0001']) {
    if (technicalClaim.test(get(model))) {
      throw new Error(`${spec.locale}/${model}: quarantined drawing identity cannot publish engineering facts.`);
    }
  }

  const s06 = get('BP-3P-S06-0001');
  const requiredLeadText = {
    en: /3-passage[\s\S]*6 electrical leads shown/iu,
    de: /3 Kan[aä]len[\s\S]*6 elektrische Leitungen dargestellt/iu,
    ja: /3流路[\s\S]*電気リード6本/u,
    ru: /3-канальн[а-я]*[\s\S]*показано 6 электрических выводов/iu,
  };
  const prohibitedCircuitText = /6-circuit|six electrical circuits|sechs Stromkreise|6 Stromkreise|電気6回路|6回路|шесть электрических цепей|6 электрических цепей/iu;
  if (!requiredLeadText[spec.locale].test(s06) || prohibitedCircuitText.test(s06)) {
    throw new Error(`${spec.locale}/BP-3P-S06-0001: use three pneumatic passages and six shown leads; do not infer circuits or ratings.`);
  }
}

function transformFile(source, spec) {
  const context = spec.relativePath;
  const migration = migrateRetiredProductLines(source, spec, context);
  const sourceRecords = extractProductLines(migration.output, spec, context);
  const sourceByModel = new Map(sourceRecords.map((record) => [record.model, record.line]));
  const expectedByModel = new Map(
    drawingBackedProductModels.map((model) => [model, expectedProductLine(spec, model)]),
  );
  assertBoundaryCopy(spec, expectedByModel);

  let output = migration.output;
  for (const model of drawingBackedProductModels) {
    output = replaceProductLine(output, spec, model, expectedByModel.get(model), context);
  }

  const outputRecords = extractProductLines(output, spec, `${context} (generated)`);
  const outputByModel = new Map(outputRecords.map((record) => [record.model, record.line]));
  for (const model of drawingBackedProductModels) {
    if (outputByModel.get(model) !== expectedByModel.get(model)) {
      throw new Error(`${context}: generated entry for ${model} is not exact or its link is incorrect.`);
    }
  }
  if (maskProductLines(source, spec) !== maskProductLines(output, spec)) {
    throw new Error(`${context}: a non-product byte changed during llms synchronization.`);
  }

  let idempotent = output;
  for (const model of drawingBackedProductModels) {
    idempotent = replaceProductLine(idempotent, spec, model, expectedByModel.get(model), `${context} (idempotency)`);
  }
  if (idempotent !== output) throw new Error(`${context}: llms synchronization is not idempotent.`);

  const changedModels = drawingBackedProductModels.filter(
    (model) => sourceByModel.get(model) !== expectedByModel.get(model),
  );
  for (const model of migration.migratedModels) {
    if (!changedModels.includes(model)) changedModels.push(model);
  }
  return { output, changedModels };
}

function assertManifestContract() {
  if (manifest.schemaVersion !== 1 || !manifest.products) {
    throw new Error('Unsupported data/product-drawing-facts.json schema.');
  }
  const manifestModels = Object.keys(manifest.products).sort();
  if (manifestModels.length !== 16 || manifestModels.join('\n') !== drawingBackedProductModels.join('\n')) {
    throw new Error('The drawing manifest and shared localized-fact module must expose the same 16 products.');
  }
  const bp1p0006Ports = manifest.products['BP-1P-0006']?.drawingFacts?.ports;
  if (bp1p0006Ports?.status !== 'verified'
    || !bp1p0006Ports.annotations?.some((port) => port.count === 8 && port.thread === 'G1/8' && port.role === 'outlet')) {
    throw new Error('BP-1P-0006 must preserve the owner-confirmed eight-outlet drawing fact.');
  }
  if (manifest.products['BP-3P-0006']?.drawingFacts?.ports?.status !== 'anomaly-unresolved') {
    throw new Error('BP-3P-0006 port specification must remain unresolved.');
  }
  for (const model of ['BP-2P-30-0001']) {
    if (manifest.products[model]?.status !== manifest.sourcePolicy?.quarantineStatus) {
      throw new Error(`${model}: drawing identity must remain quarantined.`);
    }
  }
}

const mode = parseMode(process.argv.slice(2));
assertManifestContract();

const results = fileSpecs.map((spec) => {
  const absolutePath = path.join(repoRoot, ...spec.relativePath.split('/'));
  const source = readFileSync(absolutePath, 'utf8');
  return { ...spec, absolutePath, source, ...transformFile(source, spec) };
});

const totalChanged = results.reduce((sum, result) => sum + result.changedModels.length, 0);
if (mode === 'write') {
  for (const result of results) {
    if (result.source !== result.output) writeFileSync(result.absolutePath, result.output, 'utf8');
    console.log(`${result.relativePath}: ${result.changedModels.length ? `updated ${result.changedModels.length}` : 'already synchronized'} product entries.`);
  }
  console.log(`Drawing-backed llms synchronization complete: ${totalChanged} of 64 product entries updated.`);
} else if (totalChanged) {
  for (const result of results) {
    console.error(
      `${result.relativePath}: ${result.changedModels.length}/16 product entries require synchronization${result.changedModels.length ? ` (${result.changedModels.join(', ')})` : ''}.`,
    );
  }
  console.error(`Drawing-backed llms check failed: ${totalChanged} of 64 product entries differ. Run with --write to synchronize them.`);
  process.exitCode = 1;
} else {
  console.log('Drawing-backed llms check passed: all 64 localized product entries are synchronized.');
}
