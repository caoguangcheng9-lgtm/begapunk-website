import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const checkOnly = process.argv.includes('--check');
const languages = ['de', 'ja', 'ru'];

const unsafeOrphanPatterns = [
  /\bfree\b[^\n]{0,120}\b(?:STEP|IGES|CAD|3D files?)\b/i,
  /\b(?:STEP|IGES|CAD|3D files?)\b[^\n]{0,120}\bfree\b/i,
  /\bfree 3D STEP file with every inquiry\b/i,
  /\b60% of warranty claims\b/i,
  /\b60% lower cost\b/i,
  /\b40[–-]60% weight\b/i,
  /\bFDA-compatible\b/i,
  /\bFDA seals?\b/i,
  /\bthe \$15 savings cost \$200\b/i,
  /\btested under controlled laboratory conditions\b/i,
];

const catalog = JSON.parse(await fs.readFile(path.join(root, 'i18n', 'source-catalog.json'), 'utf8'));
const activeSources = new Set(catalog.entries.map((entry) => entry.source));
const findings = [];

for (const language of languages) {
  const filePath = path.join(root, 'i18n', 'overrides', `${language}.json`);
  const before = await fs.readFile(filePath, 'utf8');
  const current = JSON.parse(before);
  const removable = Object.entries(current)
    .filter(([source, translation]) => !activeSources.has(source)
      && unsafeOrphanPatterns.some((pattern) => pattern.test(source) || pattern.test(String(translation))))
    .map(([source]) => source);

  for (const source of removable) findings.push({ language, source });
  if (checkOnly || !removable.length) continue;

  for (const source of removable) delete current[source];
  await fs.writeFile(filePath, `${JSON.stringify(current, null, 2)}\n`, 'utf8');
}

if (checkOnly && findings.length) {
  const details = findings.map(({ language, source }) => `- ${language}: ${source}`).join('\n');
  throw new Error(`Found ${findings.length} known-unsafe orphan override(s):\n${details}`);
}

console.log(checkOnly
  ? 'No known-unsafe orphan overrides remain.'
  : `Removed ${findings.length} known-unsafe orphan override(s).`);
