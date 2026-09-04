import { promises as fs } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const write = process.argv.includes('--write');
const config = JSON.parse(await fs.readFile(path.join(root, 'i18n', 'config.json'), 'utf8'));
const partialContacts = Object.entries(config.partialLanguagePages || {})
  .filter(([, pages]) => pages.includes('contact.html'))
  .map(([languageCode]) => `${languageCode}/contact.html`);

function findBehaviorScript(source, label) {
  const pattern = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  const matches = [...source.matchAll(pattern)]
    .filter((match) => match[1].includes('REQUEST_CODE_MAP'));
  if (matches.length !== 1) {
    throw new Error(`${label}: expected one inline RFQ behavior script, found ${matches.length}.`);
  }
  const match = matches[0];
  const contentOffset = match[0].indexOf(match[1]);
  return {
    content: match[1],
    start: match.index + contentOffset,
    end: match.index + contentOffset + match[1].length,
  };
}

const sourceHtml = await fs.readFile(path.join(root, 'contact.html'), 'utf8');
const sourceBehavior = findBehaviorScript(sourceHtml, 'contact.html').content;
const drift = [];

for (const relativePath of partialContacts) {
  const fileName = path.join(root, ...relativePath.split('/'));
  const current = await fs.readFile(fileName, 'utf8');
  const targetBehavior = findBehaviorScript(current, relativePath);
  if (targetBehavior.content === sourceBehavior) continue;
  drift.push(relativePath);
  if (write) {
    const expected = current.slice(0, targetBehavior.start)
      + sourceBehavior
      + current.slice(targetBehavior.end);
    await fs.writeFile(fileName, expected, 'utf8');
  }
}

if (drift.length && !write) {
  console.error(`Partial Contact behavior drift: ${drift.join(', ')}.`);
  process.exit(1);
}

console.log(`Partial Contact behavior ${write ? 'synchronized' : 'verified'}: ${drift.length} changed page(s).`);
