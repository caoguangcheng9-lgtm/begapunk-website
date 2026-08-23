import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { load } from 'cheerio';
import {
  loadPublicDownloadAllowlist,
  parsePublicDownloadsManifest,
} from './lib/public-downloads.mjs';

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const releaseRoot = path.resolve(process.argv[2] || 'dist/production');
const failures = [];
const approvedPublicDownloadFiles = await loadPublicDownloadAllowlist(sourceRoot);
const approvedPublicDownloads = new Set(approvedPublicDownloadFiles);

function toReleasePath(fileName) {
  return path.relative(releaseRoot, fileName).split(path.sep).join('/');
}

function isForbiddenReleasePath(relativePath) {
  const lower = relativePath.toLowerCase();
  return lower.endsWith('.bak')
    || lower.endsWith('.backup');
}

async function exists(relativePath) {
  try {
    await stat(path.join(releaseRoot, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    if (entry.isFile()) files.push(absolute);
  }
  return files;
}

const requiredFiles = [
  'index.html',
  '404.html',
  'products.html',
  'contact.html',
  'send_inquiry.php',
  'css/style.css',
  'js/analytics.js',
  'robots.txt',
  'sitemap.xml',
  'sitemap-i18n.xml',
  'manifest.sha256',
  'downloads/public-downloads.sha256',
  'de/index.html',
  'ja/index.html',
  'ru/index.html',
];

for (const fileName of requiredFiles) {
  if (!await exists(fileName)) failures.push(`Missing required release file: ${fileName}`);
}

for (const forbidden of ['.env', '.git', 'audit', 'catalog-project', 'i18n', 'scripts', 'package.json']) {
  if (await exists(forbidden)) failures.push(`Forbidden source or secret content in release: ${forbidden}`);
}

const allFiles = await walk(releaseRoot);
const htmlFiles = allFiles.filter((fileName) => fileName.endsWith('.html'));

for (const fileName of allFiles) {
  const relative = toReleasePath(fileName);
  if (isForbiddenReleasePath(relative)) {
    failures.push(`Forbidden backup, draft, or quarantined download in release: ${relative}`);
  }
}

async function validatePublicDownloadsManifest() {
  const manifestRelative = 'downloads/public-downloads.sha256';
  if (!await exists(manifestRelative)) return 0;

  const downloadsRoot = path.join(releaseRoot, 'downloads');
  const manifestPath = path.join(releaseRoot, manifestRelative);
  let manifestSource;
  let downloadFiles;
  try {
    manifestSource = await readFile(manifestPath, 'utf8');
    downloadFiles = (await walk(downloadsRoot))
      .filter((fileName) => path.resolve(fileName) !== path.resolve(manifestPath));
  } catch (error) {
    failures.push(`${manifestRelative}: unable to read downloads manifest or directory (${error.message})`);
    return 0;
  }

  const actualByName = new Map();
  const actualByFoldedName = new Map();
  for (const fileName of downloadFiles) {
    const relative = path.relative(downloadsRoot, fileName).split(path.sep).join('/');
    const folded = relative.normalize('NFC').toLowerCase();
    if (actualByFoldedName.has(folded)) {
      failures.push(`${manifestRelative}: case-insensitive or Unicode-normalized file collision (${actualByFoldedName.get(folded)} and ${relative})`);
    }
    actualByName.set(relative, fileName);
    actualByFoldedName.set(folded, relative);
  }

  let records;
  try {
    records = parsePublicDownloadsManifest(manifestSource, manifestRelative);
  } catch (error) {
    failures.push(error.message);
    return actualByName.size;
  }

  for (const entryName of records.keys()) {
    if (!approvedPublicDownloads.has(entryName)) {
      failures.push(`${manifestRelative}: manifest contains a download outside the approved allowlist (${entryName})`);
    }
  }
  for (const entryName of approvedPublicDownloadFiles) {
    if (!records.has(entryName)) {
      failures.push(`${manifestRelative}: approved download is missing from the manifest (${entryName})`);
    }
  }

  for (const [entryName] of records) {
    if (!actualByName.has(entryName)) {
      failures.push(`${manifestRelative}: manifest lists a missing or excluded download (${entryName})`);
    }
  }

  for (const [entryName, fileName] of actualByName) {
    if (!records.has(entryName)) {
      failures.push(`${manifestRelative}: release download is not listed (${entryName})`);
      continue;
    }
    const actualDigest = createHash('sha256').update(await readFile(fileName)).digest('hex');
    if (actualDigest !== records.get(entryName)) {
      failures.push(`${manifestRelative}: SHA-256 mismatch (${entryName})`);
    }
  }

  return actualByName.size;
}

const validatedDownloadCount = await validatePublicDownloadsManifest();

function normalizeReference(value) {
  return value.split('#')[0].split('?')[0].trim();
}

async function verifyReference(reference, owner) {
  const normalized = normalizeReference(reference);
  if (!normalized || /^(?:https?:|mailto:|tel:|data:|blob:|javascript:|#)/i.test(normalized)) return;
  const ownerDir = path.dirname(owner);
  let target = normalized.startsWith('/')
    ? path.join(releaseRoot, normalized.slice(1))
    : path.resolve(ownerDir, normalized);
  if (normalized.endsWith('/')) target = path.join(target, 'index.html');
  if (!target.startsWith(releaseRoot)) {
    failures.push(`${path.relative(releaseRoot, owner)}: reference escapes release root (${reference})`);
    return;
  }
  try {
    await stat(target);
  } catch {
    failures.push(`${path.relative(releaseRoot, owner)}: missing local reference (${reference})`);
  }
}

for (const htmlFile of htmlFiles) {
  const relative = path.relative(releaseRoot, htmlFile).split(path.sep).join('/');
  const source = await readFile(htmlFile, 'utf8');
  if (!/^\s*<!doctype html>/i.test(source)) failures.push(`${relative}: missing HTML doctype`);
  const $ = load(source);
  if (!$('html').length || !$('head').length || !$('body').length) failures.push(`${relative}: incomplete HTML document`);
  if (!$('title').first().text().trim()) failures.push(`${relative}: missing title`);
  if (!$('meta[charset]').length) failures.push(`${relative}: missing charset declaration`);
  if (!$('h1').length) failures.push(`${relative}: missing H1`);

  $('script[type="application/ld+json"]').each((index, element) => {
    try {
      JSON.parse($(element).html() || '');
    } catch (error) {
      failures.push(`${relative}: invalid JSON-LD block ${index + 1} (${error.message})`);
    }
  });

  $('script:not([src])').each((index, element) => {
    const type = ($(element).attr('type') || '').toLowerCase();
    if (type && !['text/javascript', 'application/javascript', 'module'].includes(type)) return;
    const script = $(element).html() || '';
    if (!script.trim() || type === 'module') return;
    try {
      new vm.Script(script, { filename: `${relative}:inline-${index + 1}` });
    } catch (error) {
      failures.push(`${relative}: invalid inline JavaScript block ${index + 1} (${error.message})`);
    }
  });

  const references = [
    ...$('a[href]').map((_, element) => $(element).attr('href')).get(),
    ...$('img[src],script[src],source[src]').map((_, element) => $(element).attr('src')).get(),
    ...$('link[href]').map((_, element) => $(element).attr('href')).get(),
    ...$('[poster]').map((_, element) => $(element).attr('poster')).get(),
    ...$('[action]').map((_, element) => $(element).attr('action')).get(),
  ].filter(Boolean);
  $('[srcset]').each((_, element) => {
    for (const candidate of ($(element).attr('srcset') || '').split(',')) {
      references.push(candidate.trim().split(/\s+/)[0]);
    }
  });
  for (const reference of references) await verifyReference(reference, htmlFile);
}

for (const jsFile of allFiles.filter((fileName) => /\.m?js$/i.test(fileName))) {
  const result = spawnSync(process.execPath, ['--check', jsFile], { encoding: 'utf8' });
  if (result.status !== 0) failures.push(`${path.relative(releaseRoot, jsFile)}: JavaScript syntax check failed (${result.stderr.trim()})`);
}

for (const sitemapName of ['sitemap.xml', 'sitemap-i18n.xml']) {
  if (!await exists(sitemapName)) continue;
  const source = await readFile(path.join(releaseRoot, sitemapName), 'utf8');
  const locations = [...source.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());
  if (!locations.length) failures.push(`${sitemapName}: no URL entries found`);
  if (new Set(locations).size !== locations.length) failures.push(`${sitemapName}: duplicate URL entries found`);
  for (const location of locations) {
    if (!location.startsWith('https://www.begapunk.com/')) {
      failures.push(`${sitemapName}: unexpected URL origin (${location})`);
      continue;
    }
    let pathname = new URL(location).pathname.replace(/^\//, '');
    if (!pathname || pathname.endsWith('/')) pathname += 'index.html';
    if (!await exists(pathname)) failures.push(`${sitemapName}: URL has no release file (${location})`);
  }
}

if (await exists('robots.txt')) {
  const robots = await readFile(path.join(releaseRoot, 'robots.txt'), 'utf8');
  if (!/^User-agent:/im.test(robots)) failures.push('robots.txt: missing User-agent directive');
  if (!/^Sitemap:\s*https:\/\/www\.begapunk\.com\/sitemap\.xml/im.test(robots)) failures.push('robots.txt: primary sitemap is not declared');
}

if (failures.length) {
  console.error(`Deployment validation failed with ${failures.length} issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Deployment validation passed: ${htmlFiles.length} HTML files, ${allFiles.length} total release files, and ${validatedDownloadCount} verified public downloads.`);
