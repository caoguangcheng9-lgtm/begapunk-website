import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import {
  loadPublicDownloadAllowlist,
  parsePublicDownloadsManifest,
} from './lib/public-downloads.mjs';

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const releaseRoot = path.resolve(process.argv[2] || 'dist/production');
const siteOrigin = 'https://www.begapunk.com';
const failures = [];

async function walk(directory) {
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

function toPublicPath(absolute) {
  return path.relative(releaseRoot, absolute).replaceAll('\\', '/');
}

function pageUrl(publicPath) {
  return `${siteOrigin}/${publicPath}`;
}

function normalizedLabel($, element) {
  return String($(element).attr('aria-label') || $(element).attr('title') || $(element).text() || '')
    .replace(/\s+/g, ' ')
    .trim();
}

const allFiles = await walk(releaseRoot);
const releasePaths = new Set(allFiles.map(toPublicPath));
const foldedReleasePaths = new Map();
for (const publicPath of releasePaths) {
  const folded = publicPath.normalize('NFC').toLowerCase();
  if (foldedReleasePaths.has(folded)) {
    failures.push(`Release contains a case-insensitive or Unicode-normalized collision: ${foldedReleasePaths.get(folded)} and ${publicPath}`);
  } else {
    foldedReleasePaths.set(folded, publicPath);
  }
}

const htmlFiles = allFiles.filter((file) => file.toLowerCase().endsWith('.html'));
const documents = new Map();
const anchorsByPage = new Map();
for (const htmlFile of htmlFiles) {
  const publicPath = toPublicPath(htmlFile);
  const $ = load(await fs.readFile(htmlFile, 'utf8'), { decodeEntities: false });
  documents.set(publicPath, $);
  const anchors = new Set();
  $('[id], a[name]').each((_, element) => {
    for (const value of [$(element).attr('id'), $(element).is('a') ? $(element).attr('name') : null]) {
      if (!value) continue;
      if (anchors.has(value)) failures.push(`${publicPath}: duplicate link target (${value})`);
      anchors.add(value);
    }
  });
  anchorsByPage.set(publicPath, anchors);
}

function resolveInternal(reference, ownerPath) {
  const value = String(reference || '').trim();
  if (!value || /^(?:mailto:|tel:|data:|blob:|javascript:)/i.test(value)) return null;
  let url;
  try {
    url = new URL(value, pageUrl(ownerPath));
  } catch (error) {
    failures.push(`${ownerPath}: malformed link (${value}; ${error.message})`);
    return null;
  }
  if (!['http:', 'https:'].includes(url.protocol)) return null;
  if (url.hostname === 'www.begapunk.com' && url.origin !== siteOrigin) {
    failures.push(`${ownerPath}: first-party link must use canonical HTTPS origin (${value})`);
    return null;
  }
  if (url.origin !== siteOrigin) return null;

  let pathname;
  let fragment;
  try {
    pathname = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    fragment = url.hash ? decodeURIComponent(url.hash.slice(1)) : '';
  } catch (error) {
    failures.push(`${ownerPath}: invalid URL encoding (${value}; ${error.message})`);
    return null;
  }
  if (!pathname || pathname.endsWith('/')) pathname += 'index.html';
  pathname = path.posix.normalize(pathname);
  if (pathname === '..' || pathname.startsWith('../') || path.posix.isAbsolute(pathname)) {
    failures.push(`${ownerPath}: link escapes the release root (${value})`);
    return null;
  }

  if (!releasePaths.has(pathname)) {
    const foldedMatch = foldedReleasePaths.get(pathname.normalize('NFC').toLowerCase());
    failures.push(foldedMatch
      ? `${ownerPath}: path case or Unicode normalization mismatch (${value}; release has ${foldedMatch})`
      : `${ownerPath}: missing internal link target (${value})`);
    return null;
  }
  if (fragment && pathname.toLowerCase().endsWith('.html') && !anchorsByPage.get(pathname)?.has(fragment)) {
    failures.push(`${ownerPath}: missing fragment target (${value})`);
  }
  return pathname;
}

const approvedFiles = await loadPublicDownloadAllowlist(sourceRoot);
const approved = new Set(approvedFiles);
const linkCounts = new Map(approvedFiles.map((file) => [file, 0]));
const downloadAttributeCounts = new Map(approvedFiles.map((file) => [file, 0]));
let internalLinkCount = 0;

for (const [ownerPath, $] of documents) {
  $('a[href]').each((_, element) => {
    const href = $(element).attr('href') || '';
    if (!href.trim() || href.trim() === '#') {
      failures.push(`${ownerPath}: empty or placeholder link (${href || 'empty href'})`);
      return;
    }
    const target = resolveInternal(href, ownerPath);
    if (!target) return;
    internalLinkCount += 1;
    const extension = path.posix.extname(target).toLowerCase();
    const isDownloadFile = ['.pdf', '.step', '.stp'].includes(extension);
    const hasDownloadAttribute = $(element).is('[download]');
    if (hasDownloadAttribute && !isDownloadFile) {
      failures.push(`${ownerPath}: download attribute points to a non-download target (${href})`);
    }
    if (!isDownloadFile) return;

    const downloadName = target.startsWith('downloads/') && path.posix.dirname(target) === 'downloads'
      ? path.posix.basename(target)
      : '';
    if (!downloadName || !approved.has(downloadName)) {
      failures.push(`${ownerPath}: download link is outside the approved public-download allowlist (${href})`);
      return;
    }
    linkCounts.set(downloadName, linkCounts.get(downloadName) + 1);
    if (hasDownloadAttribute) downloadAttributeCounts.set(downloadName, downloadAttributeCounts.get(downloadName) + 1);
    if (!normalizedLabel($, element)) failures.push(`${ownerPath}: download link has no accessible label (${href})`);
  });
}

const manifestPath = path.join(releaseRoot, 'downloads', 'public-downloads.sha256');
let manifestRecords = new Map();
try {
  manifestRecords = parsePublicDownloadsManifest(await fs.readFile(manifestPath, 'utf8'), 'downloads/public-downloads.sha256');
} catch (error) {
  failures.push(error.message);
}

for (const fileName of approvedFiles) {
  const publicPath = `downloads/${fileName}`;
  const absolute = path.join(releaseRoot, 'downloads', fileName);
  if (!releasePaths.has(publicPath)) {
    failures.push(`${publicPath}: approved download is absent from the release`);
    continue;
  }
  if (!linkCounts.get(fileName)) failures.push(`${publicPath}: approved download has no public HTML link`);
  if (!downloadAttributeCounts.get(fileName)) failures.push(`${publicPath}: approved download has no link using the download attribute`);

  const buffer = await fs.readFile(absolute);
  if (buffer.length < 64) failures.push(`${publicPath}: download is empty or implausibly small (${buffer.length} bytes)`);
  const extension = path.extname(fileName).toLowerCase();
  if (extension === '.pdf') {
    if (!buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))) failures.push(`${publicPath}: invalid PDF header`);
    if (!buffer.subarray(Math.max(0, buffer.length - 4096)).includes(Buffer.from('%%EOF'))) failures.push(`${publicPath}: missing PDF end marker`);
  } else {
    const source = buffer.toString('utf8');
    if (!source.startsWith('ISO-10303-21;')) failures.push(`${publicPath}: invalid STEP header`);
    if (!source.includes('END-ISO-10303-21;')) failures.push(`${publicPath}: missing STEP end marker`);
  }
  const digest = createHash('sha256').update(buffer).digest('hex');
  if (manifestRecords.get(fileName) !== digest) failures.push(`${publicPath}: SHA-256 does not match the public-download manifest`);
}

for (const fileName of manifestRecords.keys()) {
  if (!approved.has(fileName)) failures.push(`downloads/public-downloads.sha256: unapproved entry (${fileName})`);
}

if (failures.length) {
  console.error(`Release link and download verification failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Release links and downloads verified: ${htmlFiles.length} HTML pages, ${internalLinkCount} internal link occurrences, ${approvedFiles.length} linked and integrity-checked downloads.`);
