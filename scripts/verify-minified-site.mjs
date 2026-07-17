import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { minify as minifyJs } from 'terser';

const sourceRoot = path.resolve(import.meta.dirname, '..');

function readInputArgument() {
  const index = process.argv.indexOf('--input');
  if (index === -1 || !process.argv[index + 1]) {
    throw new Error('Usage: npm run build:minify:verify -- --input <release-site-directory>');
  }
  return path.resolve(process.argv[index + 1]);
}

const siteRoot = readInputArgument();
const failures = [];
const stats = {
  htmlFiles: 0,
  jsonLdBlocks: 0,
  localReferences: 0,
  searchIndexes: 0,
  cssFiles: 0,
  jsFiles: 0,
};

function fail(message) {
  failures.push(message);
}

async function listFiles(directory, extension) {
  return (await fs.readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && (!extension || entry.name.endsWith(extension)))
    .map((entry) => entry.name)
    .sort();
}

async function listHtmlFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
    .map((entry) => entry.name);
  for (const entry of entries.filter((item) => item.isDirectory())) {
    const childDirectory = path.join(directory, entry.name);
    const childFiles = (await fs.readdir(childDirectory, { withFileTypes: true }))
      .filter((item) => item.isFile() && item.name.endsWith('.html'))
      .map((item) => path.join(entry.name, item.name));
    if (childFiles.some((file) => path.basename(file) === 'index.html')) files.push(...childFiles);
  }
  return files.sort();
}

function countMatches(text, expression) {
  return [...text.matchAll(expression)].length;
}

function fieldNames(text) {
  const names = [];
  const fieldExpression = /<(?:input|select|textarea)\b[^>]*\bname=(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi;
  for (const match of text.matchAll(fieldExpression)) {
    names.push(match[1] || match[2] || match[3]);
  }
  return [...new Set(names)].sort();
}

const structuralChecks = [
  ['title', /<title\b/gi],
  ['canonical', /<link\b[^>]*\brel=(?:"canonical"|'canonical'|canonical)/gi],
  ['heading-one', /<h1\b/gi],
  ['anchor', /<a\b/gi],
  ['image', /<img\b/gi],
  ['form', /<form\b/gi],
  ['script', /<script\b/gi],
];

function extractReferences(text) {
  const references = [];
  const markupOnly = text
    .replace(/<script\b([^>]*)>[\s\S]*?<\/script>/gi, '<script$1></script>')
    .replace(/<style\b([^>]*)>[\s\S]*?<\/style>/gi, '<style$1></style>');
  const attributeExpression = /(?:^|\s)(?:href|src|poster|action)=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  for (const match of markupOnly.matchAll(attributeExpression)) {
    references.push(match[1] || match[2] || match[3] || '');
  }
  const srcsetExpression = /\bsrcset=(?:"([^"]*)"|'([^']*)')/gi;
  for (const match of markupOnly.matchAll(srcsetExpression)) {
    const value = match[1] || match[2] || '';
    for (const candidate of value.split(',')) {
      references.push(candidate.trim().split(/\s+/)[0]);
    }
  }
  return references;
}

function localTarget(reference, fromDirectory) {
  if (!reference || reference.startsWith('#')) return null;
  if (/^(?:data:|mailto:|tel:|javascript:)/i.test(reference)) return null;

  let pathname = reference.replaceAll('&amp;', '&');
  if (/^https?:\/\//i.test(pathname)) {
    const url = new URL(pathname);
    if (!['begapunk.com', 'www.begapunk.com'].includes(url.hostname.toLowerCase())) return null;
    pathname = url.pathname;
  } else {
    pathname = pathname.split('#')[0].split('?')[0];
  }

  if (!pathname) return null;
  try {
    pathname = decodeURIComponent(pathname);
  } catch {
    fail(`Invalid URL encoding: ${reference}`);
    return null;
  }

  const target = pathname.startsWith('/')
    ? path.join(siteRoot, pathname.slice(1))
    : path.resolve(fromDirectory, pathname);
  return pathname.endsWith('/') ? path.join(target, 'index.html') : target;
}

async function verifyReference(reference, fromDirectory, owner) {
  const target = localTarget(reference, fromDirectory);
  if (!target) return;
  stats.localReferences += 1;
  const relative = path.relative(siteRoot, target);
  if (relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) {
    fail(`${owner}: local reference escapes release root: ${reference}`);
    return;
  }
  try {
    const item = await fs.stat(target);
    if (!item.isFile()) fail(`${owner}: reference is not a file: ${reference}`);
  } catch {
    fail(`${owner}: missing local reference: ${reference}`);
  }
}

const sourceHtmlFiles = await listHtmlFiles(sourceRoot);
const outputHtmlFiles = await listHtmlFiles(siteRoot);
if (JSON.stringify(sourceHtmlFiles) !== JSON.stringify(outputHtmlFiles)) {
  fail('The HTML file set differs between source and release.');
}

for (const name of outputHtmlFiles) {
  stats.htmlFiles += 1;
  const source = await fs.readFile(path.join(sourceRoot, name), 'utf8');
  const output = await fs.readFile(path.join(siteRoot, name), 'utf8');

  if (!/^<!doctype html>/i.test(output)) fail(`${name}: missing HTML doctype.`);
  if (Buffer.byteLength(output) >= Buffer.byteLength(source)) fail(`${name}: output was not reduced.`);

  for (const [label, expression] of structuralChecks) {
    const sourceCount = countMatches(source, expression);
    const outputCount = countMatches(output, expression);
    if (sourceCount !== outputCount) {
      fail(`${name}: ${label} count changed from ${sourceCount} to ${outputCount}.`);
    }
  }

  if (JSON.stringify(fieldNames(source)) !== JSON.stringify(fieldNames(output))) {
    fail(`${name}: form field names changed.`);
  }

  const jsonLdExpression = /<script\b[^>]*\btype=(?:"application\/ld\+json"|'application\/ld\+json')[^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of output.matchAll(jsonLdExpression)) {
    stats.jsonLdBlocks += 1;
    try {
      JSON.parse(match[1]);
    } catch (error) {
      fail(`${name}: invalid JSON-LD (${error.message}).`);
    }
  }

  for (const reference of extractReferences(output)) {
    await verifyReference(reference, path.dirname(path.join(siteRoot, name)), name);
  }
}

const localizedDirectories = [...new Set(
  sourceHtmlFiles
    .map((relativePath) => path.dirname(relativePath))
    .filter((directory) => directory !== '.'),
)];
for (const directory of ['.', ...localizedDirectories]) {
  const relativePath = path.join(directory, 'search-index.json');
  try {
    const sourceIndex = JSON.parse(await fs.readFile(path.join(sourceRoot, relativePath), 'utf8'));
    const outputIndex = JSON.parse(await fs.readFile(path.join(siteRoot, relativePath), 'utf8'));
    stats.searchIndexes += 1;
    if (!Array.isArray(sourceIndex) || !sourceIndex.length) fail(`${relativePath}: source search index is empty.`);
    if (JSON.stringify(sourceIndex) !== JSON.stringify(outputIndex)) fail(`${relativePath}: search index content changed.`);
  } catch (error) {
    fail(`${relativePath}: search index is missing or invalid (${error.message}).`);
  }
}

const cssDirectory = path.join(siteRoot, 'css');
for (const name of await listFiles(cssDirectory, '.css')) {
  stats.cssFiles += 1;
  const css = await fs.readFile(path.join(cssDirectory, name), 'utf8');
  for (const match of css.matchAll(/url\((?:"([^"]+)"|'([^']+)'|([^\)]+))\)/gi)) {
    const reference = (match[1] || match[2] || match[3] || '').trim();
    await verifyReference(reference, cssDirectory, `css/${name}`);
  }
}

const jsDirectory = path.join(siteRoot, 'js');
for (const name of await listFiles(jsDirectory, '.js')) {
  stats.jsFiles += 1;
  const javascript = await fs.readFile(path.join(jsDirectory, name), 'utf8');
  try {
    await minifyJs(javascript, { compress: false, mangle: false });
  } catch (error) {
    fail(`js/${name}: JavaScript parse error (${error.message}).`);
  }
}

const forbiddenReleaseEntries = [
  '.env',
  '.env.example',
  '.git',
  'audit',
  'catalog-project',
  'node_modules',
  'package.json',
  'package-lock.json',
  'PROJECT_HANDOFF.md',
  'scripts',
];
for (const name of forbiddenReleaseEntries) {
  try {
    await fs.access(path.join(siteRoot, name));
    fail(`Forbidden release entry found: ${name}`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

if (failures.length) {
  console.error(`Minified release verification failed with ${failures.length} issue(s):`);
  for (const message of failures) console.error(`- ${message}`);
  process.exitCode = 1;
} else {
  console.log('Minified release verification passed.');
  console.log(JSON.stringify(stats, null, 2));
}
