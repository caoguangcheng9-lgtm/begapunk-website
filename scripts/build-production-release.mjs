import { createHash } from 'node:crypto';
import { readdir, readFile, rm, mkdir, cp, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createPublicDownloadsManifest,
  loadPublicDownloadAllowlist,
  PUBLIC_DOWNLOADS_MANIFEST,
} from './lib/public-downloads.mjs';

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = path.join(sourceRoot, 'dist', 'production');

if (!outputRoot.startsWith(`${sourceRoot}${path.sep}`)) {
  throw new Error(`Refusing to clean an output path outside the repository: ${outputRoot}`);
}

const rootEntries = await readdir(sourceRoot, { withFileTypes: true });
const rootFiles = rootEntries
  .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
  .map((entry) => entry.name);

const explicitFiles = [
  '.htaccess',
  'robots.txt',
  'sitemap.xml',
  'sitemap-i18n.xml',
  'llms.txt',
  'search-index.json',
  'send_inquiry.php',
];

const publicDirectories = [
  'css',
  'js',
  'fonts',
  'images',
  'videos',
  'PHPMailer',
  'de',
  'ja',
  'ru',
];

function toReleasePath(fileName) {
  return path.relative(sourceRoot, fileName).split(path.sep).join('/');
}

function isExcludedReleasePath(fileName) {
  const relative = toReleasePath(fileName);
  if (!relative || relative === '.') return false;
  if (relative === '..' || relative.startsWith('../')) {
    throw new Error(`Refusing to evaluate a public path outside the repository: ${fileName}`);
  }

  const lower = relative.toLowerCase();
  return lower.endsWith('.bak')
    || lower.endsWith('.backup');
}

const excludedDuringBuild = new Set();

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });

for (const fileName of [...rootFiles, ...explicitFiles]) {
  await cp(path.join(sourceRoot, fileName), path.join(outputRoot, fileName));
}

for (const directoryName of publicDirectories) {
  await cp(path.join(sourceRoot, directoryName), path.join(outputRoot, directoryName), {
    recursive: true,
    filter: (source) => {
      if (!isExcludedReleasePath(source)) return true;
      excludedDuringBuild.add(toReleasePath(source));
      return false;
    },
  });
}

const sourceDownloadsRoot = path.join(sourceRoot, 'downloads');
const releaseDownloadsRoot = path.join(outputRoot, 'downloads');
const publicDownloadFiles = await loadPublicDownloadAllowlist(sourceRoot);
const expectedDownloadsManifest = await createPublicDownloadsManifest(sourceDownloadsRoot, publicDownloadFiles);
const sourceDownloadsManifest = (await readFile(path.join(sourceDownloadsRoot, PUBLIC_DOWNLOADS_MANIFEST), 'utf8'))
  .replaceAll('\r\n', '\n');
if (sourceDownloadsManifest !== expectedDownloadsManifest) {
  throw new Error(`${PUBLIC_DOWNLOADS_MANIFEST} is stale. Run npm run downloads:manifest before building the release.`);
}

await mkdir(releaseDownloadsRoot, { recursive: true });
for (const fileName of [...publicDownloadFiles, PUBLIC_DOWNLOADS_MANIFEST]) {
  await cp(path.join(sourceDownloadsRoot, fileName), path.join(releaseDownloadsRoot, fileName));
}

const sourceDownloadEntries = await readdir(sourceDownloadsRoot, { withFileTypes: true });
const approvedSourceDownloads = new Set([...publicDownloadFiles, PUBLIC_DOWNLOADS_MANIFEST]);
const nonPublicSourceDownloads = sourceDownloadEntries
  .filter((entry) => entry.isFile() && !approvedSourceDownloads.has(entry.name))
  .map((entry) => entry.name);

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

const releaseFiles = (await walk(outputRoot))
  .filter((fileName) => path.basename(fileName) !== 'manifest.sha256')
  .sort((left, right) => left.localeCompare(right, 'en'));

const forbiddenCopies = releaseFiles.filter((fileName) => {
  const relative = path.relative(outputRoot, fileName).split(path.sep).join('/').toLowerCase();
  return relative.endsWith('.bak')
    || relative.endsWith('.backup');
});
if (forbiddenCopies.length) {
  throw new Error(`Forbidden backup files survived the copy filter: ${forbiddenCopies.join(', ')}`);
}

const expectedReleaseDownloads = new Set(
  [...publicDownloadFiles, PUBLIC_DOWNLOADS_MANIFEST].map((fileName) => `downloads/${fileName}`),
);
const actualReleaseDownloads = releaseFiles
  .map((fileName) => path.relative(outputRoot, fileName).split(path.sep).join('/'))
  .filter((fileName) => fileName.startsWith('downloads/'));
const unexpectedReleaseDownloads = actualReleaseDownloads.filter((fileName) => !expectedReleaseDownloads.has(fileName));
const missingReleaseDownloads = [...expectedReleaseDownloads].filter((fileName) => !actualReleaseDownloads.includes(fileName));
if (unexpectedReleaseDownloads.length || missingReleaseDownloads.length) {
  throw new Error(`Release download boundary mismatch. Unexpected: ${unexpectedReleaseDownloads.join(', ') || 'none'}; missing: ${missingReleaseDownloads.join(', ') || 'none'}.`);
}

const manifestLines = [];
for (const fileName of releaseFiles) {
  const digest = createHash('sha256').update(await readFile(fileName)).digest('hex');
  const relative = path.relative(outputRoot, fileName).split(path.sep).join('/');
  manifestLines.push(`${digest}  ${relative}`);
}

await writeFile(path.join(outputRoot, 'manifest.sha256'), `${manifestLines.join('\n')}\n`, 'utf8');

console.log(`Production release built: ${releaseFiles.length} files in ${outputRoot}`);
console.log(`Published ${publicDownloadFiles.length} approved PDF download(s); excluded ${nonPublicSourceDownloads.length} non-public source download file(s).`);
console.log(`Excluded ${excludedDuringBuild.size} backup path(s) from other public directories.`);
