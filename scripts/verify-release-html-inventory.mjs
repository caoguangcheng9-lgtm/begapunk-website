import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { load } from 'cheerio';

const repositoryRoot = path.resolve(import.meta.dirname, '..');
const releaseRoot = path.resolve(process.argv[2] || path.join(repositoryRoot, 'dist', 'production'));
const [config, inventory] = await Promise.all([
  readFile(path.join(repositoryRoot, 'i18n', 'config.json'), 'utf8').then(JSON.parse),
  readFile(path.join(repositoryRoot, 'audit', 'policy', 'release-html-inventory.json'), 'utf8').then(JSON.parse),
]);
const failures = [];

async function listHtml(directory, prefix = '') {
  const paths = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolute = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      failures.push(`HTML inventory encountered a forbidden symlink: ${relative}`);
    } else if (entry.isDirectory()) {
      paths.push(...await listHtml(absolute, relative));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) {
      paths.push(relative);
    }
  }
  return paths;
}

if (inventory.schemaVersion !== 1) failures.push('release-html-inventory.json schemaVersion must be 1.');
if (inventory.canonicalPageSource !== 'i18n/config.json#pages') failures.push('Unexpected canonicalPageSource.');
if (inventory.languageSource !== 'i18n/config.json#sourceLanguage+activeLanguageCodes') failures.push('Unexpected languageSource.');

const languagePrefixes = ['', ...config.activeLanguageCodes.map((language) => `${language}/`)];
const canonicalPaths = languagePrefixes.flatMap((prefix) => config.pages.map((page) => `${prefix}${page}`));
const redirectPaths = inventory.redirectFiles || [];
const expectedPaths = [...canonicalPaths, ...redirectPaths].sort();
const duplicateExpected = expectedPaths.filter((value, index) => expectedPaths.indexOf(value) !== index);
if (duplicateExpected.length) failures.push(`Inventory classifications overlap: ${[...new Set(duplicateExpected)].join(', ')}`);

const actualPaths = (await listHtml(releaseRoot)).sort();
const actualSet = new Set(actualPaths);
const expectedSet = new Set(expectedPaths);
const missing = expectedPaths.filter((value) => !actualSet.has(value));
const unexpected = actualPaths.filter((value) => !expectedSet.has(value));
if (missing.length) failures.push(`Declared HTML paths missing from release: ${missing.join(', ')}`);
if (unexpected.length) failures.push(`Undeclared HTML paths in release: ${unexpected.join(', ')}`);

const noindexPages = new Set(inventory.noindexPages || []);
const errorPages = new Set(inventory.errorPages || []);
for (const page of [...noindexPages, ...errorPages]) {
  if (!config.pages.includes(page)) failures.push(`Non-indexable classification references unknown canonical page: ${page}`);
}
for (const relative of canonicalPaths) {
  if (!actualSet.has(relative)) continue;
  const pageName = path.posix.basename(relative);
  const $ = load(await readFile(path.join(releaseRoot, ...relative.split('/')), 'utf8'));
  const robots = $('meta[name="robots"]').map((_, element) => $(element).attr('content') || '').get();
  const isNonIndexable = noindexPages.has(pageName) || errorPages.has(pageName);
  const hasNoindex = robots.some((value) => /(?:^|,)\s*noindex\s*(?:,|$)/iu.test(value));
  if (isNonIndexable && !hasNoindex) failures.push(`${relative}: declared non-indexable but missing noindex.`);
  if (!isNonIndexable && hasNoindex) failures.push(`${relative}: declared indexable but contains noindex.`);
}

if (failures.length) {
  console.error(`Release HTML inventory verification failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Release HTML inventory verified: ${canonicalPaths.length} canonical language pages and ${redirectPaths.length} declared compatibility redirects; no undeclared HTML files.`);
