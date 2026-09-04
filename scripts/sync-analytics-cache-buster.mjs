import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const write = process.argv.includes('--write');
const config = JSON.parse(await fs.readFile(path.join(root, 'i18n', 'config.json'), 'utf8'));
const analyticsSource = await fs.readFile(path.join(root, 'js', 'analytics.js'));
const version = createHash('sha256').update(analyticsSource).digest('hex').slice(0, 12);
const localeCodes = new Set([
  ...(config.activeLanguageCodes || []),
  ...Object.keys(config.partialLanguagePages || {}),
]);
const directories = [root, ...[...localeCodes].map((code) => path.join(root, code))];
const referencePattern = /((?:\.\.\/)?js\/analytics\.js\?v=)[^"'<>&\s]+/g;
const staleFiles = [];
let referenceCount = 0;

for (const directory of directories) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
    const fileName = path.join(directory, entry.name);
    const current = await fs.readFile(fileName, 'utf8');
    let matches = 0;
    const expected = current.replace(referencePattern, (match, prefix) => {
      matches += 1;
      return `${prefix}${version}`;
    });
    referenceCount += matches;
    if (current === expected) continue;
    staleFiles.push(path.relative(root, fileName).split(path.sep).join('/'));
    if (write) await fs.writeFile(fileName, expected, 'utf8');
  }
}

if (!referenceCount) {
  console.error('No versioned analytics.js references were found.');
  process.exit(1);
}

if (staleFiles.length && !write) {
  console.error(`Analytics cache-buster drift: ${staleFiles.length} file(s) must use v=${version}.`);
  staleFiles.slice(0, 20).forEach((fileName) => console.error(`- ${fileName}`));
  if (staleFiles.length > 20) console.error(`- …and ${staleFiles.length - 20} more`);
  process.exit(1);
}

console.log(`Analytics cache-buster ${write ? 'synchronized' : 'verified'}: ${referenceCount} reference(s), v=${version}.`);
