import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(await readFile(path.join(repoRoot, 'i18n', 'config.json'), 'utf8'));
const sourceDirectories = ['', ...(config.activeLanguageCodes || [])];
const mode = process.argv.includes('--write') ? 'write' : process.argv.includes('--check') ? 'check' : null;

if (!mode) {
  throw new Error('Choose --write to add missing landmarks or --check to verify them.');
}

function countMatches(value, expression) {
  return [...value.matchAll(expression)].length;
}

function validateMain(value, relative) {
  const mainOpenMatches = [...value.matchAll(/<main\b[^>]*>/giu)];
  const mainCloseMatches = [...value.matchAll(/<\/main>/giu)];
  if (mainOpenMatches.length !== 1 || mainCloseMatches.length !== 1) {
    throw new Error(`${relative}: expected exactly one <main> landmark`);
  }

  const headerCloseIndex = value.search(/<\/header>/iu);
  const footerOpenIndex = value.search(/<footer\b/iu);
  const mainOpenIndex = mainOpenMatches[0].index;
  const mainCloseIndex = mainCloseMatches[0].index;
  if ((headerCloseIndex < 0) !== (footerOpenIndex < 0)) {
    throw new Error(`${relative}: site header and footer boundaries are inconsistent`);
  }
  if (headerCloseIndex >= 0
    && !(headerCloseIndex < mainOpenIndex && mainOpenIndex < mainCloseIndex && mainCloseIndex < footerOpenIndex)) {
    throw new Error(`${relative}: <main> must sit between the site header and footer`);
  }

  if (countMatches(value, /<h1\b/giu) !== 1) {
    throw new Error(`${relative}: expected exactly one <h1>`);
  }
}

function addMain(value, relative) {
  if (/<main\b/iu.test(value)) return value;

  const eol = value.includes('\r\n') ? '\r\n' : '\n';
  const headerClose = /<\/header>[\t ]*(?:\r?\n)?/iu.exec(value);
  if (!headerClose) throw new Error(`${relative}: cannot locate the site header boundary`);

  const contentStart = headerClose.index + headerClose[0].length;
  const footerOpenIndex = value.slice(contentStart).search(/<footer\b/iu);
  if (footerOpenIndex < 0) throw new Error(`${relative}: cannot locate the site footer boundary`);

  const absoluteFooterIndex = contentStart + footerOpenIndex;
  const beforeFooter = value.slice(0, absoluteFooterIndex);
  const footerAndAfter = value.slice(absoluteFooterIndex);
  const mainOpen = `${value.slice(0, headerClose.index)}${headerClose[0].trimEnd()}${eol}<main id="main-content">${eol}`;
  const pageContent = value.slice(contentStart, absoluteFooterIndex);
  const closingSeparator = pageContent.endsWith(eol) ? '' : eol;
  const next = `${mainOpen}${pageContent}${closingSeparator}</main>${eol}${footerAndAfter}`;

  if (beforeFooter.length === 0) throw new Error(`${relative}: empty main-content boundary`);
  validateMain(next, relative);
  return next;
}

const plans = [];
for (const directory of sourceDirectories) {
  const absoluteDirectory = path.join(repoRoot, directory);
  const fileNames = (await readdir(absoluteDirectory)).filter((fileName) => fileName.endsWith('.html')).sort();
  for (const fileName of fileNames) {
    const relative = directory ? `${directory}/${fileName}` : fileName;
    const absolutePath = path.join(absoluteDirectory, fileName);
    const original = await readFile(absolutePath, 'utf8');
    const next = addMain(original, relative);
    validateMain(next, relative);
    plans.push({ relative, absolutePath, original, next });
  }
}

const changed = plans.filter(({ original, next }) => original !== next);
if (mode === 'check' && changed.length) {
  console.error(`Main landmark verification failed: ${changed.length} page(s) need synchronization.`);
  for (const item of changed) console.error(`- ${item.relative}`);
  process.exit(1);
}

if (mode === 'write') {
  for (const item of changed) await writeFile(item.absolutePath, item.next, 'utf8');
}

console.log(mode === 'write'
  ? `Main landmarks synchronized across ${plans.length} public HTML pages; ${changed.length} page(s) updated.`
  : `Main landmarks verified across ${plans.length} public HTML pages; all pages match the rule.`);
